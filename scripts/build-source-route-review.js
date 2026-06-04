const fs = require("fs/promises");
const path = require("path");
const { cleanValue } = require("../docs/multisource");
const { DEFAULT_MIN_FREE_MB, storagePreflight } = require("./storage-preflight");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const ENRICHMENT_DIR = path.join(DATA_DIR, "enrichment");
const GRAPH_GAPS_PATH = path.join(DATA_DIR, "graph", "evidence", "by-type", "enrichmentgaps.json");
const OUTPUT_PATH = path.join(ENRICHMENT_DIR, "source-route-review.json");
const VERSION = 1;
const DEFAULT_SAMPLE_LIMIT = 12;

function argValue(args, name, fallback = null) {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

async function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits = 2) {
  return Number(number(value).toFixed(digits));
}

function recordList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.records)) return payload.records;
  if (payload?.records && typeof payload.records === "object") return Object.values(payload.records);
  return [];
}

function candidateStatus(candidate = {}) {
  return cleanValue(candidate.processing?.status || candidate.status || "pending");
}

function countBy(records, getter) {
  const counts = new Map();
  for (const record of records || []) {
    const key = cleanValue(getter(record) || "unknown") || "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function compactCandidate(candidate = {}) {
  return {
    id: cleanValue(candidate.id),
    menuId: cleanValue(candidate.menuId),
    sourceId: cleanValue(candidate.sourceId),
    sourceKey: cleanValue(candidate.sourceKey),
    title: cleanValue(candidate.title).slice(0, 140),
    route: cleanValue(candidate.route),
    localTier: cleanValue(candidate.localTier),
    status: candidateStatus(candidate),
    priorityScore: round(candidate.priorityScore, 2),
    missingEvidence: candidate.missingEvidence || {},
    provenance: {
      sourceFile: cleanValue(candidate.provenance?.sourceFile || "enrichment/ocr-triage-queue.json"),
      sourceRecordId: cleanValue(candidate.provenance?.sourceRecordId),
    },
  };
}

function compactFailure(record = {}) {
  return {
    id: cleanValue(record.id),
    candidateId: cleanValue(record.candidateId),
    menuId: cleanValue(record.menuId),
    sourceId: cleanValue(record.sourceId),
    sourceKey: cleanValue(record.sourceKey),
    errorClass: cleanValue(record.errorClass),
    nextAction: cleanValue(record.nextAction),
    retryable: Boolean(record.retryable),
  };
}

function compactGap(record = {}) {
  return {
    id: cleanValue(record.id),
    type: cleanValue(record.type),
    menuId: cleanValue(record.menuId),
    sourceId: cleanValue(record.sourceId),
    sourceKey: cleanValue(record.sourceKey),
    title: cleanValue(record.title).slice(0, 140),
    missing: Array.isArray(record.missing) ? record.missing.map(cleanValue).filter(Boolean).slice(0, 8) : [],
    recommendedAction: cleanValue(record.recommendedAction),
    route: cleanValue(record.route),
    localTier: cleanValue(record.localTier),
    candidateId: cleanValue(record.candidateId),
    priorityScore: round(record.priorityScore, 2),
  };
}

function coverageReviewTypes(row = {}) {
  const actions = new Set((row.nextActions || []).map((item) => cleanValue(item.id)).filter(Boolean));
  if (row.primaryNextAction) actions.add(cleanValue(row.primaryNextAction));
  const reviewTypes = [];
  if (actions.has("source_route_review")) reviewTypes.push("source_route_review");
  if (actions.has("iiif_image_assessment")) reviewTypes.push("iiif_image_assessment");
  if (actions.has("source_image_route_review") || number(row.ocrFailures, 0) > 0) reviewTypes.push("source_image_route_review");
  return reviewTypes;
}

function ensureSource(map, sourceId, seed = {}) {
  const id = cleanValue(sourceId) || "unknown_source";
  if (!map.has(id)) {
    map.set(id, {
      sourceId: id,
      sourceKey: cleanValue(seed.sourceKey),
      label: cleanValue(seed.label || id),
      sourceType: cleanValue(seed.sourceType || "menu"),
      reviewTypes: new Set(),
      blockers: new Set(),
      decisions: new Set(),
      nextActions: new Set(),
      metadataCandidates: [],
      failureCandidates: [],
      graphGaps: [],
      metadataCandidateCount: 0,
      failureCandidateCount: 0,
      graphGapCount: 0,
      routeActions: [],
      coverage: null,
      probe: null,
    });
  }
  const row = map.get(id);
  if (seed.sourceKey && !row.sourceKey) row.sourceKey = cleanValue(seed.sourceKey);
  if (seed.label && row.label === id) row.label = cleanValue(seed.label);
  if (seed.sourceType && !row.sourceType) row.sourceType = cleanValue(seed.sourceType);
  return row;
}

function priorityScore(row) {
  const coverage = row.coverage || {};
  const metadataCount = row.metadataCandidateCount;
  const failureCount = row.failureCandidateCount || number(coverage.ocrFailures, 0);
  const graphGapCount = row.graphGapCount;
  const rowCount = number(coverage.rowCount, 0);
  const missingImageWeight = Math.max(0, 1 - number(coverage.imageCoverage, 0)) * Math.min(100, rowCount);
  const missingPriceWeight = Math.max(0, 1 - number(coverage.priceCoverage, 0)) * Math.min(100, rowCount);
  const routeReviewWeight = row.reviewTypes.has("source_route_review") ? 70 : 0;
  return round(routeReviewWeight + metadataCount * 5 + failureCount * 8 + graphGapCount * 1.8 + missingImageWeight * 0.6 + missingPriceWeight * 0.35, 2);
}

function statusFor(row) {
  if (row.reviewTypes.has("source_route_review")) return "needs_source_route_decision";
  if (row.reviewTypes.has("source_image_route_review")) return "needs_image_route_review";
  if (row.reviewTypes.has("iiif_image_assessment")) return "needs_iiif_assessment";
  if (row.reviewTypes.has("metadata_only_no_image")) return "needs_metadata_image_route_review";
  return "monitor";
}

function buildReviewPayload(inputs = {}, options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const sampleLimit = Math.max(1, Number(options.sampleLimit || DEFAULT_SAMPLE_LIMIT) || DEFAULT_SAMPLE_LIMIT);
  const storage = inputs.storagePreflight || storagePreflight({
    targetDir: ROOT_DIR,
    minFreeMb: options.minFreeMb ?? DEFAULT_MIN_FREE_MB,
    label: "source route review planning",
  });
  const coverageRows = recordList(inputs.coverageReport);
  const probeRows = recordList(inputs.sourceProbes);
  const queueRows = recordList(inputs.ocrQueue);
  const failureRows = recordList(inputs.ocrFailures);
  const graphGapRows = recordList(inputs.graphEnrichmentGaps);
  const runPlanSources = inputs.runPlan?.sourceRefresh?.sources || [];
  const bySource = new Map();

  const coverageBySource = new Map(coverageRows.map((row) => [cleanValue(row.sourceId), row]));
  const probeBySource = new Map(probeRows.map((row) => [cleanValue(row.sourceId), row]));

  for (const row of coverageRows) {
    const reviewTypes = coverageReviewTypes(row);
    if (!reviewTypes.length) continue;
    const source = ensureSource(bySource, row.sourceId, row);
    source.coverage = row;
    for (const type of reviewTypes) source.reviewTypes.add(type);
    for (const action of row.nextActions || []) {
      if (reviewTypes.includes(cleanValue(action.id))) source.routeActions.push(action);
    }
  }

  for (const probe of probeRows) {
    if (cleanValue(probe.recommendedNextAction) !== "source_route_review" && !/review/.test(cleanValue(probe.routeStatus))) continue;
    const source = ensureSource(bySource, probe.sourceId, probe);
    source.probe = probe;
    source.reviewTypes.add("source_route_review");
    if (probe.routeBlocker) source.blockers.add(cleanValue(probe.routeBlocker));
  }

  for (const candidate of queueRows) {
    const status = candidateStatus(candidate);
    const route = cleanValue(candidate.route);
    if (status !== "metadata_only_review" && status !== "failed_review") continue;
    const source = ensureSource(bySource, candidate.sourceId || candidate.sourceKey, {
      sourceKey: candidate.sourceKey,
      label: candidate.sourceId,
    });
    if (status === "metadata_only_review" || route === "metadata_only_no_image") {
      source.reviewTypes.add("metadata_only_no_image");
      source.metadataCandidateCount += 1;
      if (source.metadataCandidates.length < sampleLimit) source.metadataCandidates.push(compactCandidate(candidate));
    } else if (status === "failed_review") {
      source.reviewTypes.add("source_image_route_review");
      source.failureCandidateCount += 1;
      if (source.failureCandidates.length < sampleLimit) source.failureCandidates.push(compactCandidate(candidate));
    }
  }

  for (const failure of failureRows) {
    if (!failure || failure.retryable === true) continue;
    const source = ensureSource(bySource, failure.sourceId || failure.sourceKey, {
      sourceKey: failure.sourceKey,
      label: failure.sourceId,
    });
    source.reviewTypes.add("source_image_route_review");
    source.failureCandidateCount += 1;
    if (failure.errorClass) source.blockers.add(cleanValue(failure.errorClass));
    if (source.failureCandidates.length < sampleLimit) source.failureCandidates.push(compactFailure(failure));
  }

  for (const gap of graphGapRows.filter((record) => cleanValue(record.type) === "menu_enrichment_gap")) {
    const action = cleanValue(gap.recommendedAction);
    if (!["source_image_route_review", "iiif_image_assessment", "source_route_review"].includes(action)) continue;
    const source = ensureSource(bySource, gap.sourceId || gap.sourceKey, {
      sourceKey: gap.sourceKey,
      label: gap.sourceId,
    });
    source.reviewTypes.add(action);
    source.graphGapCount += 1;
    if (source.graphGaps.length < sampleLimit) source.graphGaps.push(compactGap(gap));
  }

  for (const row of runPlanSources) {
    if (!["source_route_review", "iiif_image_assessment", "source_image_route_review"].includes(cleanValue(row.primaryNextAction))) continue;
    const source = ensureSource(bySource, row.sourceId, row);
    source.reviewTypes.add(cleanValue(row.primaryNextAction));
  }

  for (const [sourceId, source] of bySource.entries()) {
    source.coverage = source.coverage || coverageBySource.get(sourceId) || null;
    source.probe = source.probe || probeBySource.get(sourceId) || null;
    if (source.reviewTypes.has("metadata_only_no_image")) {
      source.blockers.add("Metadata-only records have no image route in current connector output.");
      source.decisions.add("Confirm whether item-level image/IIIF routes exist or keep records as metadata-only graph rows.");
      source.nextActions.add("review_source_item_pages");
    }
    if (source.reviewTypes.has("source_image_route_review")) {
      source.blockers.add("Local OCR cannot continue until blocked image routes or nonretryable image failures are resolved.");
      source.decisions.add("Map alternate image/IIIF/download route, mark rights block, or exclude from OCR queue.");
      source.nextActions.add("review_blocked_image_routes");
    }
    if (source.reviewTypes.has("iiif_image_assessment")) {
      source.blockers.add("Image metadata coverage is thin or absent for this source.");
      source.decisions.add("Verify IIIF manifest/info URLs, thumbnails, page counts, and dimensions.");
      source.nextActions.add("assess_iiif_or_image_metadata");
    }
    if (source.reviewTypes.has("source_route_review")) {
      source.decisions.add("Confirm stable bulk metadata/API/export route and scraping policy before new ingestion.");
      source.nextActions.add("confirm_source_route_and_rights");
    }
  }

  const records = [...bySource.values()]
    .map((source) => {
      const coverage = source.coverage || {};
      const probe = source.probe || {};
      return {
        id: `sourcereview:${source.sourceId}`,
        type: "source_route_review",
        sourceId: source.sourceId,
        sourceKey: source.sourceKey || cleanValue(coverage.sourceKey || probe.sourceKey),
        label: source.label || cleanValue(coverage.label || probe.label || source.sourceId),
        sourceType: source.sourceType || cleanValue(coverage.sourceType || probe.sourceType || "menu"),
        status: statusFor(source),
        reviewTypes: [...source.reviewTypes].sort(),
        priorityScore: priorityScore(source),
        coverage: {
          rowCount: number(coverage.rowCount, 0),
          dishCoverage: round(coverage.dishCoverage, 3),
          priceCoverage: round(coverage.priceCoverage, 3),
          ingredientCoverage: round(coverage.ingredientCoverage, 3),
          imageCoverage: round(coverage.imageCoverage, 3),
          ocrCandidates: number(coverage.ocrCandidates, 0),
          ocrProcessedMenus: number(coverage.ocrProcessedMenus, 0),
          ocrFailures: number(coverage.ocrFailures, 0),
          primaryNextAction: cleanValue(coverage.primaryNextAction),
        },
        sourceProbe: {
          status: cleanValue(probe.status),
          routeStatus: cleanValue(probe.routeStatus),
          routeBlocker: cleanValue(probe.routeBlocker),
          sourceUrl: cleanValue(probe.sourceUrl),
          accessMethod: cleanValue(probe.accessMethod),
          publicItemCount: probe.publicItemCount ?? null,
        },
        counts: {
          metadataOnlyReviewCandidates: source.metadataCandidateCount,
          failureReviewCandidates: source.failureCandidateCount,
          graphGaps: source.graphGapCount,
          sampleMetadataCandidates: source.metadataCandidates.length,
          sampleFailures: source.failureCandidates.length,
          sampleGraphGaps: source.graphGaps.length,
        },
        blockers: [...source.blockers].sort().slice(0, 8),
        requiredDecisions: [...source.decisions].sort().slice(0, 8),
        nextActions: [...source.nextActions].sort().slice(0, 8),
        routeActions: source.routeActions.slice(0, 4).map((item) => ({
          id: cleanValue(item.id),
          label: cleanValue(item.label),
          priority: round(item.priority, 2),
          reason: cleanValue(item.reason).slice(0, 180),
        })),
        sampleCandidates: source.metadataCandidates.slice(0, sampleLimit),
        sampleFailures: source.failureCandidates.slice(0, sampleLimit),
        sampleGraphGaps: source.graphGaps.slice(0, sampleLimit),
        provenance: {
          sourceFile: "enrichment/coverage-report.json + enrichment/source-probes.json + enrichment/ocr-triage-queue.json + enrichment/ocr-failures.json + graph/evidence/by-type/enrichmentgaps.json",
          method: "deterministic_source_route_review_queue",
        },
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore || a.label.localeCompare(b.label));

  const summary = {
    sources: records.length,
    storageOk: Boolean(storage.ok),
    storageAvailableFormatted: storage.availableFormatted,
    storageRequiredFormatted: storage.minFreeFormatted,
    metadataOnlyReviewCandidates: queueRows.filter((row) => candidateStatus(row) === "metadata_only_review").length,
    failedReviewCandidates: queueRows.filter((row) => candidateStatus(row) === "failed_review").length,
    nonRetryableFailures: failureRows.filter((row) => row && row.retryable === false).length,
    sourceRouteSources: records.filter((row) => row.reviewTypes.includes("source_route_review")).length,
    iiifReviewSources: records.filter((row) => row.reviewTypes.includes("iiif_image_assessment")).length,
    imageRouteReviewSources: records.filter((row) => row.reviewTypes.includes("source_image_route_review")).length,
    byReviewType: countBy(records.flatMap((row) => row.reviewTypes.map((reviewType) => ({ reviewType }))), (row) => row.reviewType),
    bySource: Object.fromEntries(records.map((row) => [row.sourceId, row.priorityScore])),
    recommendedNext: records.length ? "review_source_routes" : "monitor",
  };

  return {
    version: VERSION,
    generatedAt,
    processor: {
      name: "source_route_review_builder",
      version: "0.1.0",
      localOnly: true,
      storesRawOcr: false,
      storesImageBlobs: false,
      storesEmbeddingVectors: false,
      storesExternalLlmPayloads: false,
      storesRecipeText: false,
    },
    objective: "Convert exhausted local OCR/no-image states into source-route review work that can unlock later price, dish, ingredient, and image enrichment.",
    summary,
    recommendedSequence: [
      {
        step: "source_route_review",
        status: summary.sourceRouteSources ? "ready" : "monitor",
        detail: `${summary.sourceRouteSources.toLocaleString()} source(s) need metadata/API/export route decisions.`,
      },
      {
        step: "iiif_image_assessment",
        status: summary.iiifReviewSources ? "ready" : "monitor",
        detail: `${summary.iiifReviewSources.toLocaleString()} source(s) need image metadata or IIIF route assessment.`,
      },
      {
        step: "blocked_image_route_review",
        status: summary.imageRouteReviewSources ? "ready" : "monitor",
        detail: `${summary.imageRouteReviewSources.toLocaleString()} source(s) have OCR/image failure or blocked route evidence.`,
      },
      {
        step: "rebuild_enrichment_queue",
        status: "ready_after_review",
        detail: "After connector/image-route changes, rebuild source probes, coverage, OCR triage, run plan, assimilation plan, and graph.",
      },
    ],
    records,
  };
}

async function buildSourceRouteReview(options = {}) {
  const [coverageReport, sourceProbes, ocrQueue, ocrFailures, graphEnrichmentGaps, runPlan] = await Promise.all([
    readJson(path.join(ENRICHMENT_DIR, "coverage-report.json"), { records: [] }),
    readJson(path.join(ENRICHMENT_DIR, "source-probes.json"), { records: [] }),
    readJson(path.join(ENRICHMENT_DIR, "ocr-triage-queue.json"), { records: [] }),
    readJson(path.join(ENRICHMENT_DIR, "ocr-failures.json"), { records: [] }),
    readJson(GRAPH_GAPS_PATH, { records: [] }),
    readJson(path.join(ENRICHMENT_DIR, "run-plan.json"), { summary: {} }),
  ]);
  const payload = buildReviewPayload({ coverageReport, sourceProbes, ocrQueue, ocrFailures, graphEnrichmentGaps, runPlan }, options);
  if (!options.dryRun) await writeJson(options.outputPath || OUTPUT_PATH, payload);
  return payload;
}

function optionsFromArgs(args = process.argv.slice(2)) {
  return {
    dryRun: hasFlag(args, "dry-run"),
    outputPath: argValue(args, "output", OUTPUT_PATH),
    minFreeMb: Number(argValue(args, "min-free-mb", String(DEFAULT_MIN_FREE_MB))) || DEFAULT_MIN_FREE_MB,
    sampleLimit: Number(argValue(args, "sample-limit", String(DEFAULT_SAMPLE_LIMIT))) || DEFAULT_SAMPLE_LIMIT,
  };
}

if (require.main === module) {
  buildSourceRouteReview(optionsFromArgs())
    .then((payload) => {
      console.log(
        [
          `Wrote source-route review plan with ${payload.summary.sources} source(s)`,
          `${payload.summary.metadataOnlyReviewCandidates.toLocaleString()} metadata-only review candidate(s)`,
          `next: ${payload.summary.recommendedNext}`,
        ].join(", ")
      );
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  VERSION,
  buildReviewPayload,
  buildSourceRouteReview,
  compactCandidate,
  compactFailure,
  compactGap,
  coverageReviewTypes,
  optionsFromArgs,
  priorityScore,
  recordList,
  statusFor,
};
