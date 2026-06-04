const fs = require("fs/promises");
const path = require("path");
const { cleanValue } = require("../docs/multisource");
const {
  DEFAULT_MIN_FREE_MB,
  storagePreflight,
} = require("./storage-preflight");
const { readRecipeBridgePayload } = require("./enrichment-shards");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const ENRICHMENT_DIR = path.join(DATA_DIR, "enrichment");
const GRAPH_GAPS_PATH = path.join(DATA_DIR, "graph", "evidence", "by-type", "enrichmentgaps.json");
const OUTPUT_PATH = path.join(ENRICHMENT_DIR, "run-plan.json");
const VERSION = 1;

const DEFAULT_EXTERNAL_COST_PER_IMAGE_USD = 0.01;
const DEFAULT_LOCAL_MINUTES_PER_IMAGE = 0.75;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_SAMPLE_LIMIT = 16;

const SOURCE_COMMANDS = {
  cornell_nestle_menu_collection: "npm run enrich:cornell -- --limit=2500",
  denver_menu_collection: "npm run enrich:denver -- --limit=200",
  lapl_menu_collection: "npm run enrich:lapl -- --limit=500",
  milwaukee_historic_menus: "npm run enrich:milwaukee -- --limit=100",
  nola_menu_collection: "npm run enrich:nola -- --limit=100",
  northwestern_transport_menus: "npm run enrich:northwestern -- --limit=500",
  seattle_room_menu_collection: "npm run enrich:seattle -- --limit=603",
  uh_1850s_1860s_menus: "npm run enrich:uh -- --limit=100",
  uw_menus_collection: "npm run enrich:uw -- --limit=300",
};

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

function candidateStatus(candidate) {
  return cleanValue(candidate.processing?.status || "pending");
}

function pendingImages(candidate) {
  const processing = candidate.processing || {};
  if (candidateStatus(candidate) === "processed") return 0;
  if (Number.isFinite(Number(processing.pendingImages))) return Math.max(0, Number(processing.pendingImages));
  const estimatedImages = Number(candidate.estimatedImages);
  if (Number.isFinite(estimatedImages)) return Math.max(0, estimatedImages);
  if (cleanValue(candidate.route) === "metadata_only_no_image" || cleanValue(candidate.localTier) === "metadata_only") return 0;
  return Math.max(1, Number(candidate.pageCount || 1) || 1);
}

function compactCandidate(candidate) {
  return {
    id: cleanValue(candidate.id),
    menuId: cleanValue(candidate.menuId),
    sourceId: cleanValue(candidate.sourceId),
    sourceKey: cleanValue(candidate.sourceKey),
    title: cleanValue(candidate.title).slice(0, 140),
    priorityRank: number(candidate.priorityRank, null),
    priorityScore: round(candidate.priorityScore, 2),
    valueScore: round(candidate.valueScore, 2),
    difficultyScore: round(candidate.difficultyScore, 2),
    localTier: cleanValue(candidate.localTier),
    route: cleanValue(candidate.route),
    status: candidateStatus(candidate),
    pendingImages: pendingImages(candidate),
    missingEvidence: candidate.missingEvidence || {},
  };
}

function candidateSort(a, b) {
  return (
    number(a.priorityRank, 999999) - number(b.priorityRank, 999999) ||
    number(b.priorityScore, 0) - number(a.priorityScore, 0) ||
    cleanValue(a.id).localeCompare(cleanValue(b.id))
  );
}

function countBy(records, getter) {
  const counts = new Map();
  for (const record of records || []) {
    const key = cleanValue(getter(record) || "unknown") || "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function countMany(records, getter) {
  const counts = new Map();
  for (const record of records || []) {
    const values = Array.isArray(getter(record)) ? getter(record) : [getter(record)];
    for (const value of values) {
      const key = cleanValue(value || "unknown") || "unknown";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function sumImages(records) {
  return (records || []).reduce((sum, record) => sum + pendingImages(record), 0);
}

function costEstimate(images, costPerImageUsd) {
  const imageCount = Math.max(0, Number(images || 0));
  const unit = Math.max(0, Number(costPerImageUsd || 0));
  return {
    images: imageCount,
    costPerImageUsd: unit,
    estimatedCostUsd: round(imageCount * unit, 4),
  };
}

function recordList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.records)) return payload.records;
  if (payload?.records && typeof payload.records === "object") return Object.values(payload.records);
  return [];
}

function graphGapImages(gap) {
  return Math.max(1, Number(gap.estimatedImages || 1) || 1);
}

function graphGapSort(a, b) {
  const bandRank = { critical: 5, high: 4, medium: 3, low: 2, monitor: 1 };
  return (
    number(bandRank[cleanValue(b.priorityBand)], 0) - number(bandRank[cleanValue(a.priorityBand)], 0) ||
    number(b.priorityScore, 0) - number(a.priorityScore, 0) ||
    graphGapImages(b) - graphGapImages(a) ||
    cleanValue(a.id).localeCompare(cleanValue(b.id))
  );
}

function compactGraphGap(gap) {
  return {
    id: cleanValue(gap.id),
    menuId: cleanValue(gap.menuId),
    sourceId: cleanValue(gap.sourceId),
    sourceKey: cleanValue(gap.sourceKey),
    title: cleanValue(gap.title).slice(0, 140),
    year: Number.isFinite(Number(gap.year)) ? Number(gap.year) : null,
    decade: cleanValue(gap.decade),
    missing: Array.isArray(gap.missing) ? gap.missing.map(cleanValue).filter(Boolean).slice(0, 8) : [],
    priorityScore: round(gap.priorityScore, 2),
    priorityBand: cleanValue(gap.priorityBand),
    recommendedAction: cleanValue(gap.recommendedAction),
    route: cleanValue(gap.route),
    localTier: cleanValue(gap.localTier),
    estimatedImages: graphGapImages(gap),
    candidateId: cleanValue(gap.candidateId),
    confidence: round(gap.confidence, 3),
    provenance: {
      sourceFile: cleanValue(gap.provenance?.sourceFile || "graph/evidence/by-type/enrichmentgaps.json"),
      method: cleanValue(gap.provenance?.method || "graph_gap_queue"),
    },
  };
}

function graphGapCommand(batch) {
  if (!batch.candidateIds.length) return "";
  return [
    "npm run enrich:ocr:local --",
    `--limit=${batch.candidateIds.length}`,
    "--batch=all",
    "--tier=all",
    `--source=${batch.sourceKey || "all"}`,
    "--pages-per-menu=1",
    `--candidate-ids=${batch.candidateIds.join(",")}`,
  ].join(" ");
}

function graphGapBatch(id, label, gaps, options = {}) {
  const batchSize = Math.max(1, Number(options.batchSize || DEFAULT_BATCH_SIZE) || DEFAULT_BATCH_SIZE);
  const selected = [...(gaps || [])].sort(graphGapSort).slice(0, batchSize);
  const candidateIds = selected.map((gap) => cleanValue(gap.candidateId)).filter(Boolean);
  const imageCount = selected.reduce((sum, gap) => sum + graphGapImages(gap), 0);
  const batch = {
    id,
    label,
    route: "local_ocr",
    mode: "graph_gap_queue",
    sourceKey: cleanValue(options.sourceKey || "all"),
    candidateCount: selected.length,
    poolGaps: (gaps || []).length,
    linkedCandidateIds: candidateIds.length,
    imageCount,
    estimatedRuntimeMinutes: round(imageCount * Number(options.localMinutesPerImage || DEFAULT_LOCAL_MINUTES_PER_IMAGE), 1),
    runnable: Boolean(options.storageOk && selected.length && candidateIds.length),
    blockedReason: !options.storageOk ? "low_disk_preflight" : candidateIds.length ? "" : "missing_candidate_ids",
    candidateIds,
    sampleGaps: selected.slice(0, options.sampleLimit || DEFAULT_SAMPLE_LIMIT).map(compactGraphGap),
  };
  batch.command = graphGapCommand(batch);
  return batch;
}

function graphGapQueuePlan(graphEnrichmentGaps = {}, options = {}) {
  const records = recordList(graphEnrichmentGaps);
  const menuGaps = records.filter((record) => cleanValue(record.type) === "menu_enrichment_gap");
  const sourceSummaries = records.filter((record) => cleanValue(record.type) === "source_enrichment_gap_summary");
  const localOcrGaps = menuGaps
    .filter((gap) => cleanValue(gap.route || "") === "local_ocr")
    .filter((gap) => cleanValue(gap.candidateId));
  const actionableCandidateIds = options.actionableCandidateIds instanceof Set ? options.actionableCandidateIds : null;
  const actionableLocalOcrGaps = actionableCandidateIds
    ? localOcrGaps.filter((gap) => actionableCandidateIds.has(cleanValue(gap.candidateId)))
    : localOcrGaps;
  const metadataGaps = menuGaps.filter((gap) => cleanValue(gap.recommendedAction) === "metadata_dish_hint_pass");
  const sourceImageRouteReviewGaps = menuGaps.filter((gap) => cleanValue(gap.recommendedAction) === "source_image_route_review");
  const sourceGroups = new Map();
  for (const gap of actionableLocalOcrGaps) {
    const key = cleanValue(gap.sourceKey || gap.sourceId || "unknown");
    if (!sourceGroups.has(key)) sourceGroups.set(key, []);
    sourceGroups.get(key).push(gap);
  }
  const sourceBatches = [...sourceGroups.entries()]
    .map(([sourceKey, gaps]) => ({
      sourceKey,
      priorityScore: gaps.reduce((sum, gap) => sum + number(gap.priorityScore, 0), 0),
      gaps,
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.sourceKey.localeCompare(b.sourceKey))
    .slice(0, 5)
    .map((group) => graphGapBatch(
      `graph_gap_${group.sourceKey.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
      `Graph-prioritized OCR gaps for ${group.sourceKey}`,
      group.gaps,
      { ...options, sourceKey: group.sourceKey }
    ));
  const topBatch = graphGapBatch("graph_gap_top_priority", "Top graph-prioritized OCR gaps", actionableLocalOcrGaps, options);
  const localBatches = [topBatch, ...sourceBatches].filter((batch) => batch.candidateCount || batch.poolGaps);
  return {
    summary: {
      records: records.length,
      menuGaps: menuGaps.length,
      sourceSummaries: sourceSummaries.length,
      localOcrGaps: localOcrGaps.length,
      actionableLocalOcrGaps: actionableLocalOcrGaps.length,
      metadataGaps: metadataGaps.length,
      sourceImageRouteReviewGaps: sourceImageRouteReviewGaps.length,
      estimatedImages: localOcrGaps.reduce((sum, gap) => sum + graphGapImages(gap), 0),
      actionableEstimatedImages: actionableLocalOcrGaps.reduce((sum, gap) => sum + graphGapImages(gap), 0),
      runnable: Boolean(options.storageOk && actionableLocalOcrGaps.length),
      blockedReason: !options.storageOk ? "low_disk_preflight" : actionableLocalOcrGaps.length ? "" : "no_actionable_pending_candidates",
      topMissing: countMany(menuGaps, (gap) => gap.missing || []),
      topActions: countBy(menuGaps, (gap) => gap.recommendedAction),
      topSources: countBy(menuGaps, (gap) => gap.sourceId || gap.sourceKey),
      sampleGaps: [...menuGaps].sort(graphGapSort).slice(0, options.sampleLimit || DEFAULT_SAMPLE_LIMIT).map(compactGraphGap),
      sourceSummaries: sourceSummaries
        .slice()
        .sort((a, b) => number(b.priorityScore, 0) - number(a.priorityScore, 0))
        .slice(0, options.sampleLimit || DEFAULT_SAMPLE_LIMIT)
        .map((row) => ({
          id: cleanValue(row.id),
          sourceId: cleanValue(row.sourceId),
          sourceKey: cleanValue(row.sourceKey),
          menuCount: number(row.menuCount, 0),
          missingDishMenus: number(row.missingDishMenus, 0),
          missingPriceMenus: number(row.missingPriceMenus, 0),
          missingIngredientMenus: number(row.missingIngredientMenus, 0),
          ocrCandidateMenus: number(row.ocrCandidateMenus, 0),
          priorityScore: round(row.priorityScore, 2),
          topActions: row.topActions || {},
        })),
    },
    localBatches,
  };
}

function batchCommand(batch) {
  const parts = [
    "npm run enrich:ocr:local --",
    `--limit=${batch.candidateCount}`,
    `--batch=${batch.priorityBatch || "backlog"}`,
    `--tier=${batch.localTier || "easy"}`,
    `--source=${batch.sourceKey || "all"}`,
    "--pages-per-menu=1",
  ];
  if (batch.mode === "continue_partial") parts.push("--continue-partial");
  if (batch.mode === "retry_retryable") parts.push("--retry-retryable");
  return parts.join(" ");
}

function localBatch(id, label, candidates, options = {}) {
  const sorted = [...(candidates || [])].sort(candidateSort);
  const batchSize = Math.max(1, Number(options.batchSize || DEFAULT_BATCH_SIZE) || DEFAULT_BATCH_SIZE);
  const selected = sorted.slice(0, batchSize);
  const imageCount = sumImages(selected);
  const batch = {
    id,
    label,
    route: "local_ocr",
    mode: options.mode || "new_pending",
    priorityBatch: options.priorityBatch || "backlog",
    sourceKey: options.sourceKey || "all",
    localTier: options.localTier || "easy",
    candidateCount: selected.length,
    poolCandidates: sorted.length,
    imageCount,
    estimatedRuntimeMinutes: round(imageCount * Number(options.localMinutesPerImage || DEFAULT_LOCAL_MINUTES_PER_IMAGE), 1),
    runnable: Boolean(options.storageOk && selected.length),
    blockedReason: options.storageOk ? "" : "low_disk_preflight",
    command: "",
    sampleCandidates: selected.slice(0, options.sampleLimit || DEFAULT_SAMPLE_LIMIT).map(compactCandidate),
  };
  batch.command = batchCommand(batch);
  return batch;
}

function sourceTargetBatchesFromQueue(ocrQueue = {}, queueRecords = [], options = {}) {
  const runs = ocrQueue.summary?.progressiveRunPlan?.runs || ocrQueue.progressiveRunPlan?.runs || [];
  const byId = new Map(queueRecords.map((candidate) => [cleanValue(candidate.id), candidate]));
  return runs
    .filter((run) => /^source_price_gap_/.test(cleanValue(run.label)))
    .map((run) => {
      const topIds = (run.topCandidateIds || []).map(cleanValue).filter(Boolean);
      return {
        id: cleanValue(run.label),
        label: cleanValue(run.label).replace(/_/g, " "),
        route: "local_ocr",
        mode: "source_targeted_price_gap",
        sourceKey: cleanValue(run.sourceKey || ""),
        sourceId: cleanValue(run.sourceId || run.sourceKey || ""),
        candidateCount: number(run.candidates, 0),
        imageCount: number(run.estimatedImages, 0),
        estimatedRuntimeMinutes: round(number(run.estimatedImages, 0) * Number(options.localMinutesPerImage || DEFAULT_LOCAL_MINUTES_PER_IMAGE), 1),
        runnable: Boolean(options.storageOk && number(run.candidates, 0)),
        blockedReason: options.storageOk ? "" : "low_disk_preflight",
        command: cleanValue(run.command),
        priorityBasis: run.priorityBasis || {},
        sampleCandidates: topIds
          .map((id) => byId.get(id))
          .filter(Boolean)
          .slice(0, options.sampleLimit || DEFAULT_SAMPLE_LIMIT)
          .map(compactCandidate),
      };
    });
}

function sourceRefreshRows(coverageRows = []) {
  const interestingActions = new Set([
    "expand_source_limit",
    "metadata_dish_hint_pass",
    "source_route_review",
    "source_probe_or_ingest",
    "iiif_image_assessment",
  ]);
  return coverageRows
    .filter((row) => row.sourceType === "menu")
    .map((row) => {
      const actionIds = (row.nextActions || []).map((item) => item.id).filter((id) => interestingActions.has(id));
      const commandableAction = actionIds.some((id) => ["expand_source_limit", "metadata_dish_hint_pass", "source_probe_or_ingest"].includes(id));
      return {
        sourceId: cleanValue(row.sourceId),
        label: cleanValue(row.label || row.sourceId),
        rowCount: number(row.rowCount, 0),
        dishCoverage: number(row.dishCoverage, 0),
        priceCoverage: number(row.priceCoverage, 0),
        imageCoverage: number(row.imageCoverage, 0),
        primaryNextAction: cleanValue(row.primaryNextAction || actionIds[0] || "monitor"),
        nextActions: actionIds,
        priority: round(
            (1 - number(row.priceCoverage, 0)) * 3 +
            (1 - number(row.dishCoverage, 0)) * 2 +
            (1 - number(row.imageCoverage, 0)) +
            (row.primaryNextAction === "source_probe_or_ingest" || row.primaryNextAction === "source_route_review" ? 2 : 0),
          2
        ),
        command: commandableAction ? SOURCE_COMMANDS[row.sourceId] || "" : "",
      };
    })
    .filter((row) => row.nextActions.length || row.primaryNextAction === "source_probe_or_ingest")
    .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label));
}

function recipeBridgePlan(recipeBridge = {}, coverageRows = [], options = {}) {
  const recipeRows = coverageRows.filter((row) => row.sourceType === "recipe_or_food_history");
  const currentClusters = number(recipeBridge.summary?.clusters || (recipeBridge.clusters || []).length, 0);
  const currentDishLinks = number(recipeBridge.summary?.dishLinks || (recipeBridge.dishLinks || []).length, 0);
  const totalCandidateClusters = number(recipeBridge.summary?.totalCandidateClusters, 0);
  const requestedClusters = Number(options.recipeClusterLimit || 0) || 0;
  const requestedDishLinks = Number(options.recipeDishLinkLimit || 0) || 0;
  const nextClusterLimit = totalCandidateClusters && currentClusters < totalCandidateClusters
    ? Math.min(totalCandidateClusters, Math.max(currentClusters * 2, currentClusters + 10000, 1000))
    : currentClusters || 1000;
  const targetClusterLimit = Math.max(currentClusters, requestedClusters || nextClusterLimit);
  const targetDishLinkLimit = Math.max(currentDishLinks, requestedDishLinks || targetClusterLimit);
  return {
    id: "recipe_bridge_expansion",
    label: "Expand rights-aware recipe bridge candidates",
    currentClusters,
    currentDishLinks,
    totalCandidateClusters,
    remainingCandidateClusters: Math.max(0, totalCandidateClusters - currentClusters),
    sourceCandidates: recipeBridge.summary?.sourceCandidates || {},
    targetClusterLimit,
    targetDishLinkLimit,
    sourceRows: recipeRows.map((row) => ({
      sourceId: row.sourceId,
      label: row.label,
      recipeBridgeClusters: number(row.recipeBridgeClusters, 0),
      primaryNextAction: row.primaryNextAction,
    })),
    command: `npm run enrich:recipe-bridge -- --cluster-limit=${targetClusterLimit} --dish-link-limit=${targetDishLinkLimit}`,
  };
}

function metadataOnlyQueuePlan(queueRecords = [], options = {}) {
  const metadataOnly = queueRecords
    .filter((candidate) => cleanValue(candidate.route) === "metadata_only_no_image")
    .sort(candidateSort);
  const pending = metadataOnly.filter((candidate) => ["pending", "partial"].includes(candidateStatus(candidate)));
  const review = metadataOnly.filter((candidate) => candidateStatus(candidate) === "metadata_only_review");
  const bySource = countBy(pending, (candidate) => candidate.sourceId || candidate.sourceKey);
  const reviewBySource = countBy(review, (candidate) => candidate.sourceId || candidate.sourceKey);
  const sourceCommands = Object.entries(bySource).map(([sourceId, candidates]) => ({
    sourceId,
    candidates,
    command: SOURCE_COMMANDS[sourceId] || "npm run enrich:external-metadata",
  }));
  return {
    id: "metadata_only_queue",
    label: "Metadata-only enrichment queue",
    status: pending.length ? "ready" : review.length ? "source_route_review" : "empty",
    candidates: pending.length,
    reviewCandidates: review.length,
    pendingImages: 0,
    bySource,
    reviewBySource,
    sourceCommands,
    sampleCandidates: pending.slice(0, options.sampleLimit || DEFAULT_SAMPLE_LIMIT).map(compactCandidate),
    sampleReviewCandidates: review.slice(0, options.sampleLimit || DEFAULT_SAMPLE_LIMIT).map(compactCandidate),
    followUpCommands: [
      "npm run enrich:external-metadata",
      "npm run enrich:retag",
      "npm run enrich:recipe-bridge",
      "npm run enrich:coverage",
      "npm run enrich:run-plan",
      "npm run build:graph",
    ],
  };
}

function externalReviewPlan(queueRecords = [], failureRecords = [], options = {}) {
  const allowed = queueRecords
    .filter((candidate) => candidate.routingPolicy?.externalAllowed)
    .sort(candidateSort);
  const difficultReview = queueRecords
    .filter((candidate) => !candidate.routingPolicy?.externalAllowed && ["difficult", "medium"].includes(cleanValue(candidate.localTier)) && candidateStatus(candidate) !== "processed")
    .sort(candidateSort)
    .slice(0, 100);
  const nonRetryableFailures = failureRecords
    .filter((record) => record && record.retryable === false)
    .slice(0, 100)
    .map((record) => ({
      id: cleanValue(record.id),
      candidateId: cleanValue(record.candidateId),
      menuId: cleanValue(record.menuId),
      sourceId: cleanValue(record.sourceId),
      errorClass: cleanValue(record.errorClass),
      nextAction: cleanValue(record.nextAction),
    }));
  const pilotImages = Math.min(Number(options.externalPilotImages || 250) || 250, sumImages(allowed));
  return {
    id: "external_review_pilot",
    label: "Rights-gated external LLM/image review pilot",
    status: allowed.length ? "ready_after_budget_approval" : "blocked_until_rights_review",
    allowedCandidates: allowed.length,
    allowedImages: sumImages(allowed),
    difficultReviewCandidates: difficultReview.length,
    nonRetryableFailures: nonRetryableFailures.length,
    estimatedPilotCost: costEstimate(pilotImages, options.externalCostPerImageUsd),
    sampleAllowedCandidates: allowed.slice(0, options.sampleLimit || DEFAULT_SAMPLE_LIMIT).map(compactCandidate),
    sampleDifficultCandidates: difficultReview.slice(0, options.sampleLimit || DEFAULT_SAMPLE_LIMIT).map(compactCandidate),
    sampleFailures: nonRetryableFailures.slice(0, options.sampleLimit || DEFAULT_SAMPLE_LIMIT),
    command: allowed.length ? "external review runner not enabled until provider, budget, and rights policy are approved" : "",
  };
}

function buildRunPlanPayload(inputs = {}, options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const queueRecords = inputs.ocrQueue?.records || inputs.ocrQueue || [];
  const failureRecords = inputs.ocrFailures?.records || inputs.ocrFailures || [];
  const coverageRows = inputs.coverageReport?.records || inputs.coverageRows || [];
  const recipeBridge = inputs.recipeBridge || {};
  const storage = inputs.storagePreflight || storagePreflight({
    targetDir: ROOT_DIR,
    minFreeMb: options.minFreeMb ?? DEFAULT_MIN_FREE_MB,
    label: "enrichment run planning",
  });
  const externalCostPerImageUsd = Number(options.externalCostPerImageUsd || DEFAULT_EXTERNAL_COST_PER_IMAGE_USD) || DEFAULT_EXTERNAL_COST_PER_IMAGE_USD;
  const localMinutesPerImage = Number(options.localMinutesPerImage || DEFAULT_LOCAL_MINUTES_PER_IMAGE) || DEFAULT_LOCAL_MINUTES_PER_IMAGE;
  const sampleLimit = Number(options.sampleLimit || DEFAULT_SAMPLE_LIMIT) || DEFAULT_SAMPLE_LIMIT;
  const batchSize = Number(options.batchSize || DEFAULT_BATCH_SIZE) || DEFAULT_BATCH_SIZE;

  const pending = queueRecords.filter((candidate) => ["pending", "partial"].includes(candidateStatus(candidate)));
  const pendingLocal = pending.filter((candidate) => cleanValue(candidate.route || "local_ocr") === "local_ocr");
  const pendingEasy = pendingLocal.filter((candidate) => cleanValue(candidate.localTier || "easy") === "easy");
  const pendingMedium = pendingLocal.filter((candidate) => cleanValue(candidate.localTier) === "medium");
  const partial = queueRecords.filter((candidate) => candidateStatus(candidate) === "partial" && pendingImages(candidate) > 0);
  const retryableFailures = failureRecords.filter((record) => record.retryable === true);
  const retryableIds = new Set(retryableFailures.map((record) => cleanValue(record.candidateId)).filter(Boolean));
  const retryableCandidates = queueRecords.filter((candidate) => retryableIds.has(cleanValue(candidate.id)));
  const pendingCandidateIds = new Set(
    queueRecords
      .filter((candidate) => candidateStatus(candidate) === "pending")
      .map((candidate) => cleanValue(candidate.id))
      .filter(Boolean)
  );

  const batchOptions = { batchSize, sampleLimit, localMinutesPerImage, storageOk: storage.ok };
  const sourceTargetBatches = sourceTargetBatchesFromQueue(inputs.ocrQueue || {}, queueRecords, {
    sampleLimit,
    localMinutesPerImage,
    storageOk: storage.ok,
  });
  const graphGapQueue = graphGapQueuePlan(inputs.graphEnrichmentGaps || {}, {
    batchSize,
    sampleLimit,
    localMinutesPerImage,
    storageOk: storage.ok,
    actionableCandidateIds: pendingCandidateIds,
  });
  const localBatches = [
    localBatch("local_easy_backlog_50", "Next 50 easy local OCR candidates", pendingEasy, {
      ...batchOptions,
      priorityBatch: "backlog",
      localTier: "easy",
      mode: "new_pending",
    }),
    localBatch("local_medium_review_50", "Next 50 medium local OCR candidates", pendingMedium, {
      ...batchOptions,
      priorityBatch: "all",
      localTier: "medium",
      mode: "new_pending",
    }),
    localBatch("local_continue_partial", "Continue partial local OCR candidates", partial, {
      ...batchOptions,
      priorityBatch: "all",
      localTier: "all",
      mode: "continue_partial",
    }),
    localBatch("local_retry_retryable", "Retry transient local OCR failures", retryableCandidates, {
      ...batchOptions,
      priorityBatch: "all",
      localTier: "all",
      mode: "retry_retryable",
    }),
  ].filter((batch) => batch.poolCandidates || batch.candidateCount);

  const sourceRefresh = sourceRefreshRows(coverageRows);
  const externalReview = externalReviewPlan(queueRecords, failureRecords, {
    externalCostPerImageUsd,
    externalPilotImages: options.externalPilotImages,
    sampleLimit,
  });
  const metadataOnlyQueue = metadataOnlyQueuePlan(queueRecords, { sampleLimit });
  const recipePlan = recipeBridgePlan(recipeBridge, coverageRows, options);

  const pendingImagesTotal = sumImages(pending);
  const localImagesTotal = sumImages(pendingLocal);
  const graphGapBatchReady = graphGapQueue.localBatches.some((batch) => batch.candidateCount);
  const sourceRefreshWithCommands = sourceRefresh.filter((row) => row.command).length;
  const sourceRouteReviewNeeded = Boolean(
    metadataOnlyQueue.reviewCandidates ||
      sourceRefresh.some((row) => ["source_route_review", "iiif_image_assessment"].includes(cleanValue(row.primaryNextAction)))
  );
  const summary = {
    totalCandidates: queueRecords.length,
    processedCandidates: queueRecords.filter((candidate) => candidateStatus(candidate) === "processed").length,
    pendingCandidates: pending.length,
    pendingImages: pendingImagesTotal,
    localRunnableCandidates: pendingLocal.length,
    localRunnableImages: localImagesTotal,
    retryableFailureCandidates: retryableCandidates.length,
    failedReviewCandidates: queueRecords.filter((candidate) => candidateStatus(candidate) === "failed_review").length,
    externalAllowedCandidates: externalReview.allowedCandidates,
    externalAllowedImages: externalReview.allowedImages,
    metadataOnlyCandidates: metadataOnlyQueue.candidates,
    metadataOnlyReviewCandidates: metadataOnlyQueue.reviewCandidates,
    estimatedFullExternalCost: costEstimate(pendingImagesTotal, externalCostPerImageUsd),
    estimatedLocalRuntimeMinutes: round(localImagesTotal * localMinutesPerImage, 1),
    storageOk: Boolean(storage.ok),
    storageAvailableFormatted: storage.availableFormatted,
    storageRequiredFormatted: storage.minFreeFormatted,
    nextAction: storage.ok
      ? graphGapBatchReady
        ? "run_graph_gap_queue_batch"
        : sourceTargetBatches.length
          ? "run_source_targeted_ocr_batch"
          : pendingLocal.length
            ? "run_local_ocr_batch"
            : metadataOnlyQueue.candidates || sourceRefreshWithCommands
              ? "run_metadata_refresh"
              : sourceRouteReviewNeeded
                ? "source_route_review"
                : "monitor"
      : "free_disk_before_ocr",
    graphGapQueue: {
      records: graphGapQueue.summary.records,
      menuGaps: graphGapQueue.summary.menuGaps,
      localOcrGaps: graphGapQueue.summary.localOcrGaps,
      actionableLocalOcrGaps: graphGapQueue.summary.actionableLocalOcrGaps,
      metadataGaps: graphGapQueue.summary.metadataGaps,
      sourceImageRouteReviewGaps: graphGapQueue.summary.sourceImageRouteReviewGaps,
      estimatedImages: graphGapQueue.summary.estimatedImages,
      actionableEstimatedImages: graphGapQueue.summary.actionableEstimatedImages,
      runnable: graphGapQueue.summary.runnable,
      blockedReason: graphGapQueue.summary.blockedReason,
      topMissing: graphGapQueue.summary.topMissing,
      topActions: graphGapQueue.summary.topActions,
      topSources: graphGapQueue.summary.topSources,
    },
    sourceTargetBatches: sourceTargetBatches.slice(0, 6).map((batch) => ({
      id: batch.id,
      sourceKey: batch.sourceKey,
      sourceId: batch.sourceId,
      candidateCount: batch.candidateCount,
      imageCount: batch.imageCount,
      runnable: batch.runnable,
      observedProcessed: number(batch.priorityBasis?.observedProcessed, 0),
      observedDishMentions: number(batch.priorityBasis?.observedDishMentions, 0),
      observedPriceObservations: number(batch.priorityBasis?.observedPriceObservations, 0),
      observedYieldMultiplier: number(batch.priorityBasis?.observedYieldMultiplier, 0),
    })),
    byStatus: countBy(queueRecords, candidateStatus),
    byTier: countBy(queueRecords, (candidate) => candidate.localTier),
    byRoute: countBy(queueRecords, (candidate) => candidate.route),
    bySource: countBy(queueRecords, (candidate) => candidate.sourceId),
    metadataOnlyBySource: metadataOnlyQueue.bySource,
    metadataOnlyReviewBySource: metadataOnlyQueue.reviewBySource,
  };

  return {
    version: VERSION,
    generatedAt,
    processor: {
      name: "enrichment_run_planner",
      version: "0.1.0",
      localOnly: true,
      storesImageBlobs: false,
      storesFullOcrDump: false,
      storesExternalLlmPayloads: false,
    },
    assumptions: {
      minFreeMb: options.minFreeMb ?? DEFAULT_MIN_FREE_MB,
      batchSize,
      localMinutesPerImage,
      externalCostPerImageUsd,
      externalPayloadPolicy: "candidate metadata only; image/OCR payloads require explicit rights and budget approval",
    },
    storagePreflight: storage,
    summary,
    sourceTargetBatches,
    graphGapQueue,
    localBatches,
    sourceRefresh: {
      summary: {
        sources: sourceRefresh.length,
        withCommands: sourceRefresh.filter((row) => row.command).length,
        topActions: countBy(sourceRefresh.flatMap((row) => row.nextActions.map((action) => ({ action }))), (row) => row.action),
      },
      sources: sourceRefresh.slice(0, 40),
    },
    metadataOnlyQueue,
    recipeBridge: recipePlan,
    externalReview,
    recommendedSequence: [
      {
        step: "free_disk",
        status: storage.ok ? "ok" : "required",
        detail: storage.ok ? "Storage preflight passes for bounded enrichment." : `${storage.availableFormatted} available; ${storage.minFreeFormatted} required before OCR/image batches.`,
      },
      {
        step: "metadata_refresh",
        status: sourceRefreshWithCommands ? "ready" : sourceRouteReviewNeeded ? "source_route_review" : "monitor",
        detail: sourceRefreshWithCommands
          ? "Run metadata-only source connectors first; this adds dish/date/venue/image-route hints with low storage impact."
          : "No metadata connector command remains; review source/image routes or rights manually.",
      },
      {
        step: "metadata_only_queue",
        status: metadataOnlyQueue.candidates ? "ready" : metadataOnlyQueue.reviewCandidates ? "source_route_review" : "empty",
        detail: metadataOnlyQueue.candidates
          ? `${metadataOnlyQueue.candidates.toLocaleString()} pending metadata-only candidate(s), 0 pending image(s).`
          : `${metadataOnlyQueue.reviewCandidates.toLocaleString()} metadata-only no-image candidate(s) require source-route review.`,
      },
      {
        step: "graph_gap_queue",
        status: storage.ok && graphGapQueue.summary.actionableLocalOcrGaps ? "ready" : storage.ok ? "empty" : "blocked_low_disk",
        detail: `${graphGapQueue.summary.actionableLocalOcrGaps.toLocaleString()} pending graph-prioritized OCR gap(s), ${graphGapQueue.summary.actionableEstimatedImages.toLocaleString()} estimated image(s).`,
      },
      {
        step: "local_ocr",
        status: storage.ok && pendingLocal.length ? "ready" : storage.ok ? "empty" : "blocked_low_disk",
        detail: `${pendingLocal.length.toLocaleString()} local candidate(s), ${localImagesTotal.toLocaleString()} pending image(s).`,
      },
      {
        step: "recipe_bridge",
        status: "ready",
        detail: `${recipePlan.totalCandidateClusters.toLocaleString()} candidate cluster(s) available for rights-aware recipe/source linking.`,
      },
      {
        step: "external_review",
        status: externalReview.status,
        detail: externalReview.allowedCandidates
          ? `${externalReview.allowedCandidates.toLocaleString()} externally allowed candidate(s).`
          : "No candidate is marked externally allowed; keep LLM/image routing behind rights review.",
      },
      {
        step: "rebuild_static_graph",
        status: "ready",
        detail: "After any enrichment write, rebuild coverage, recipe bridge, and graph overlay.",
      },
    ],
  };
}

async function buildEnrichmentRunPlan(options = {}) {
  const [ocrQueue, ocrFailures, coverageReport, recipeBridge, graphEnrichmentGaps] = await Promise.all([
    readJson(path.join(ENRICHMENT_DIR, "ocr-triage-queue.json"), { records: [] }),
    readJson(path.join(ENRICHMENT_DIR, "ocr-failures.json"), { records: [] }),
    readJson(path.join(ENRICHMENT_DIR, "coverage-report.json"), { records: [], summary: {} }),
    readRecipeBridgePayload(path.join(ENRICHMENT_DIR, "recipe-bridge.json"), { clusters: [], dishLinks: [], summary: {} }),
    readJson(GRAPH_GAPS_PATH, { records: [] }),
  ]);
  const payload = buildRunPlanPayload({ ocrQueue, ocrFailures, coverageReport, recipeBridge, graphEnrichmentGaps }, options);
  if (!options.dryRun) await writeJson(options.outputPath || OUTPUT_PATH, payload);
  return payload;
}

function optionsFromArgs(args = process.argv.slice(2)) {
  return {
    dryRun: hasFlag(args, "dry-run"),
    outputPath: argValue(args, "output", OUTPUT_PATH),
    minFreeMb: Number(argValue(args, "min-free-mb", String(DEFAULT_MIN_FREE_MB))) || DEFAULT_MIN_FREE_MB,
    batchSize: Number(argValue(args, "batch-size", String(DEFAULT_BATCH_SIZE))) || DEFAULT_BATCH_SIZE,
    sampleLimit: Number(argValue(args, "sample-limit", String(DEFAULT_SAMPLE_LIMIT))) || DEFAULT_SAMPLE_LIMIT,
    localMinutesPerImage: Number(argValue(args, "local-minutes-per-image", String(DEFAULT_LOCAL_MINUTES_PER_IMAGE))) || DEFAULT_LOCAL_MINUTES_PER_IMAGE,
    externalCostPerImageUsd: Number(argValue(args, "external-cost-per-image", String(DEFAULT_EXTERNAL_COST_PER_IMAGE_USD))) || DEFAULT_EXTERNAL_COST_PER_IMAGE_USD,
    externalPilotImages: Number(argValue(args, "external-pilot-images", "250")) || 250,
  };
}

async function main() {
  const payload = await buildEnrichmentRunPlan(optionsFromArgs());
  console.log(
    [
      `Wrote enrichment run plan with ${payload.summary.pendingCandidates.toLocaleString()} pending candidate(s)`,
      `${payload.summary.pendingImages.toLocaleString()} pending image(s)`,
      `next action: ${payload.summary.nextAction}`,
    ].join(", ")
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_EXTERNAL_COST_PER_IMAGE_USD,
  buildEnrichmentRunPlan,
  buildRunPlanPayload,
  candidateStatus,
  compactCandidate,
  compactGraphGap,
  costEstimate,
  graphGapQueuePlan,
  metadataOnlyQueuePlan,
  optionsFromArgs,
  pendingImages,
  sourceRefreshRows,
};
