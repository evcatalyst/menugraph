const fs = require("fs/promises");
const path = require("path");
const { buildGraphOverlay } = require("./build-graph-overlay");
const { assessExternalImages } = require("./external-image-assessment");
const { buildLaplSource } = require("./lapl-source");
const { buildLocalEnrichment, optionsFromArgs } = require("./local-enrichment");
const { buildMilwaukeeSource } = require("./milwaukee-source");
const { buildNolaSource } = require("./nola-source");
const { buildNorthwesternSource } = require("./northwestern-source");
const { buildSeattleSource } = require("./seattle-source");
const { buildUhSource } = require("./uh-source");
const { buildUwSource } = require("./uw-source");
const { buildDenverSource } = require("./denver-source");
const { buildCornellSource } = require("./cornell-source");
const { enrichExternalMetadata } = require("./enrich-external-metadata");
const { buildOcrTriageQueue } = require("./build-ocr-triage-queue");
const { buildLocalVisionOcrEnrichment } = require("./local-vision-ocr-enrichment");
const { retagEnrichment } = require("./retag-enrichment");
const { buildEnrichmentCoverageReport } = require("./build-enrichment-coverage-report");
const { buildRecipeBridge } = require("./build-recipe-bridge");
const { buildEnrichmentRunPlan } = require("./build-enrichment-run-plan");
const { buildAssimilationPlan } = require("./build-assimilation-plan");
const { buildSourceProbes } = require("./build-source-probes");
const { readRecipeBridgePayload } = require("./enrichment-shards");
const {
  DEFAULT_MIN_FREE_MB,
  assertStoragePreflight,
  optionsFromArgs: storagePreflightOptionsFromArgs,
} = require("./storage-preflight");

const ROOT_DIR = path.join(__dirname, "..");
const CACHE_DIR = path.join(ROOT_DIR, ".cache", "enrichment");
const STATUS_PATH = path.join(CACHE_DIR, "overnight-status.json");
const STORAGE_LABEL = "overnight enrichment";
const STORAGE_LIGHT_MIN_FREE_MB = 128;
const STORAGE_LIGHT_EXTERNAL_IMAGE_LIMIT = 1200;
const STORAGE_LIGHT_EXTERNAL_IMAGE_CONCURRENCY = 6;
const STORAGE_LIGHT_EXTERNAL_IMAGE_TIMEOUT_MS = 8000;
const DEFAULT_ARGS = [
  "--fetch-cia-text",
  "--skip-transcript-cache",
  "--probe-sources",
  "--unknown-only",
  "--limit=1200",
  "--image-limit=200",
  "--time-budget-min=480",
  "--public-dish-limit=60000",
  "--external-sources",
  "--lapl-limit=500",
  "--northwestern-limit=160",
  "--uh-limit=100",
  "--milwaukee-limit=100",
  "--uw-limit=300",
  "--nola-limit=100",
  "--seattle-limit=300",
  "--denver-limit=100",
  "--cornell-limit=800",
];

function timestamp() {
  return new Date().toISOString();
}

async function writeStatus(payload) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(
    STATUS_PATH,
    `${JSON.stringify(
      {
        updatedAt: timestamp(),
        ...payload,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

function currentRecipeBridgeLimit(recipeBridge, key, fallback) {
  const current = Number(recipeBridge?.summary?.[key] || 0);
  return Number.isFinite(current) && current > 0 ? current : fallback;
}

function argValue(args, name, fallback = null) {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

function isStorageLight(args) {
  return hasFlag(args, "storage-light") || hasFlag(args, "metadata-only");
}

function storagePreflightForArgs(args, label = STORAGE_LABEL) {
  return storagePreflightOptionsFromArgs(args, {
    targetDir: ROOT_DIR,
    minFreeMb: isStorageLight(args) ? STORAGE_LIGHT_MIN_FREE_MB : DEFAULT_MIN_FREE_MB,
    label,
  });
}

function sourceLimit(args, name, fallback) {
  return Math.max(0, Number(argValue(args, name, String(fallback))) || 0);
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function currentEnrichmentSummary() {
  const status = await readJson(path.join(ROOT_DIR, "docs", "data", "enrichment-status.json"), { summary: {} });
  return status.summary || {};
}

async function runExternalSources(args) {
  if (hasFlag(args, "skip-external-sources")) {
    return { skipped: true, sources: [] };
  }

  const timeoutMs = Math.max(5000, Number(argValue(args, "external-timeout-ms", "30000")) || 30000);
  const dryRun = hasFlag(args, "dry-run");
  const sources = [
    {
      sourceId: "lapl_menu_collection",
      limit: sourceLimit(args, "lapl-limit", 100),
      run: (limit) => buildLaplSource({ limit, timeoutMs, dryRun }),
    },
    {
      sourceId: "northwestern_transport_menus",
      limit: sourceLimit(args, "northwestern-limit", 160),
      run: (limit) => buildNorthwesternSource({ limit, query: "menu transportation dining", timeoutMs, dryRun }),
    },
    {
      sourceId: "uh_1850s_1860s_menus",
      limit: sourceLimit(args, "uh-limit", 100),
      run: (limit) => buildUhSource({ limit, timeoutMs, dryRun }),
    },
    {
      sourceId: "milwaukee_historic_menus",
      limit: sourceLimit(args, "milwaukee-limit", 100),
      run: (limit) => buildMilwaukeeSource({ limit, timeoutMs, dryRun }),
    },
    {
      sourceId: "uw_menus_collection",
      limit: sourceLimit(args, "uw-limit", 300),
      run: (limit) => buildUwSource({ limit, timeoutMs, dryRun }),
    },
    {
      sourceId: "nola_menu_collection",
      limit: sourceLimit(args, "nola-limit", 100),
      run: (limit) => buildNolaSource({ limit, timeoutMs, dryRun }),
    },
    {
      sourceId: "seattle_room_menu_collection",
      limit: sourceLimit(args, "seattle-limit", 300),
      run: (limit) => buildSeattleSource({ limit, timeoutMs, dryRun }),
    },
    {
      sourceId: "denver_menu_collection",
      limit: sourceLimit(args, "denver-limit", 100),
      run: (limit) => buildDenverSource({ limit, timeoutMs, dryRun }),
    },
    {
      sourceId: "cornell_nestle_menu_collection",
      limit: sourceLimit(args, "cornell-limit", 800),
      run: (limit) => buildCornellSource({ limit, timeoutMs, dryRun }),
    },
  ];

  const results = [];
  for (const source of sources) {
    if (!source.limit) {
      results.push({ sourceId: source.sourceId, skipped: true, reason: "limit=0" });
      continue;
    }
    await writeStatus({
      status: "running",
      phase: "external-sources",
      pid: process.pid,
      args,
      currentSource: source.sourceId,
      externalSources: results,
    });
    console.log(`[${timestamp()}] Refreshing external source ${source.sourceId} with limit=${source.limit}`);
    try {
      const output = await source.run(source.limit);
      results.push({
        sourceId: source.sourceId,
        status: "ok",
        summary: output.summary,
        generatedAt: output.generatedAt,
      });
      console.log(`[${timestamp()}] External source complete ${source.sourceId}: ${JSON.stringify(output.summary)}`);
    } catch (error) {
      results.push({
        sourceId: source.sourceId,
        status: "error",
        error: error.message,
      });
      console.error(`[${timestamp()}] External source failed ${source.sourceId}: ${error.stack || error.message}`);
    }
  }
  return { skipped: false, sources: results };
}

async function runExternalImageAssessment(args) {
  if (hasFlag(args, "skip-external-image-assessment")) {
    return { skipped: true };
  }
  const storageLight = isStorageLight(args);
  const defaultTimeout = storageLight ? String(STORAGE_LIGHT_EXTERNAL_IMAGE_TIMEOUT_MS) : argValue(args, "external-timeout-ms", "15000");
  const timeoutMs = Math.max(3000, Number(argValue(args, "external-image-timeout-ms", defaultTimeout)) || 15000);
  const dryRun = hasFlag(args, "dry-run");
  const defaultLimit = storageLight ? String(STORAGE_LIGHT_EXTERNAL_IMAGE_LIMIT) : "0";
  const defaultConcurrency = storageLight ? String(STORAGE_LIGHT_EXTERNAL_IMAGE_CONCURRENCY) : "6";
  const limit = Math.max(0, Number(argValue(args, "external-image-limit", defaultLimit)) || 0);
  const concurrency = Math.max(1, Math.min(16, Number(argValue(args, "external-image-concurrency", defaultConcurrency)) || 1));
  console.log(
    `[${timestamp()}] Assessing external IIIF image metadata${limit ? ` with limit=${limit}` : ""} concurrency=${concurrency} timeout=${timeoutMs}ms`
  );
  return assessExternalImages({
    timeoutMs,
    dryRun,
    limit,
    concurrency,
    sources: [],
    refresh: hasFlag(args, "refresh-external-images"),
    onProgress: (message) => console.log(`[${timestamp()}] ${message}`),
  });
}

async function runLocalOcrEnrichment(args) {
  if (!hasFlag(args, "run-local-ocr")) {
    return {
      skipped: true,
      reason: "Pass --run-local-ocr with --local-ocr-limit to fetch bounded images and run macOS Vision OCR.",
    };
  }

  const limit = Math.max(1, Number(argValue(args, "local-ocr-limit", "25")) || 25);
  const options = {
    limit,
    batch: argValue(args, "local-ocr-batch", "phase1"),
    source: argValue(args, "local-ocr-source", "all"),
    tier: argValue(args, "local-ocr-tier", "all"),
    pagesPerMenu: Math.max(1, Number(argValue(args, "local-ocr-pages-per-menu", "1")) || 1),
    imageWidth: Math.max(800, Number(argValue(args, "local-ocr-image-width", "1400")) || 1400),
    requestTimeoutMs: Math.max(5000, Number(argValue(args, "local-ocr-timeout-ms", argValue(args, "external-timeout-ms", "30000"))) || 30000),
    ocrTimeoutMs: Math.max(10000, Number(argValue(args, "local-ocr-engine-timeout-ms", "90000")) || 90000),
    maxDishMentionsPerMenu: Math.max(10, Number(argValue(args, "local-ocr-max-dish-mentions", "120")) || 120),
    refresh: hasFlag(args, "local-ocr-refresh"),
    refreshImages: hasFlag(args, "local-ocr-refresh-images"),
    continuePartial: hasFlag(args, "local-ocr-continue-partial"),
    retryRetryable: hasFlag(args, "local-ocr-retry-retryable"),
    keepImages: hasFlag(args, "local-ocr-keep-images"),
    dryRun: hasFlag(args, "dry-run"),
    storagePreflight: storagePreflightOptionsFromArgs(args, {
      targetDir: ROOT_DIR,
      minFreeMb: DEFAULT_MIN_FREE_MB,
      label: "local Vision OCR enrichment",
    }),
    onProgress: (message) => console.log(`[${timestamp()}] ${message}`),
  };
  console.log(`[${timestamp()}] Running local Vision OCR enrichment with limit=${limit}`);
  return buildLocalVisionOcrEnrichment(options);
}

function recipeLimitForStorageMode(args, existingRecipeBridge, key, fallback) {
  const current = currentRecipeBridgeLimit(existingRecipeBridge, key, fallback);
  if (!isStorageLight(args) || hasFlag(args, "allow-recipe-growth")) {
    const argName = key === "clusters" ? "recipe-cluster-limit" : "recipe-dish-link-limit";
    return Math.max(current, Number(argValue(args, argName, "0")) || 0);
  }
  return current;
}

async function runStorageLightPipeline(args, storageCheck) {
  console.log(
    `[${timestamp()}] Storage-light preflight ok: ${storageCheck.availableFormatted} available; ${storageCheck.minFreeFormatted} required`
  );
  const enrichmentSummary = await currentEnrichmentSummary();
  await writeStatus({
    status: "running",
    phase: "storage-light-start",
    pid: process.pid,
    args,
    storagePreflight: storageCheck,
    enrichmentSummary,
    notes: "Storage-light mode skips local transcript fetching, OCR, and image-byte downloads.",
  });

  const externalSources = await runExternalSources(args);

  await writeStatus({
    status: "running",
    phase: "external-image-assessment",
    pid: process.pid,
    args,
    storagePreflight: storageCheck,
    enrichmentSummary,
    externalSources,
  });

  const externalImageAssessment = await runExternalImageAssessment(args);

  await writeStatus({
    status: "running",
    phase: "external-metadata-enrichment",
    pid: process.pid,
    args,
    storagePreflight: storageCheck,
    enrichmentSummary,
    externalSources,
    externalImageAssessment,
  });

  const externalMetadata = await enrichExternalMetadata({ dryRun: hasFlag(args, "dry-run") });
  console.log(`[${timestamp()}] External metadata enrichment complete: ${JSON.stringify(externalMetadata.summary)}`);

  const retagged = await retagEnrichment({ dryRun: hasFlag(args, "dry-run") });
  console.log(`[${timestamp()}] Retag enrichment complete: ${JSON.stringify({ taxonomyVersion: retagged.taxonomyVersion, externalSources: retagged.externalSources.length })}`);

  await writeStatus({
    status: "running",
    phase: "ocr-triage",
    pid: process.pid,
    args,
    storagePreflight: storageCheck,
    enrichmentSummary,
    externalSources,
    externalImageAssessment,
    externalMetadata: externalMetadata.summary,
    retagged,
  });

  const ocrTriage = await buildOcrTriageQueue({
    dryRun: hasFlag(args, "dry-run"),
    recordLimit: Number(argValue(args, "ocr-triage-limit", "7000")) || 7000,
    earlyLimit: Number(argValue(args, "ocr-triage-early-limit", "200")) || 200,
    pagesPerMenu: Number(argValue(args, "ocr-triage-pages-per-menu", "2")) || 2,
    externalCostPerImageUsd: Number(argValue(args, "external-cost-per-image", "0")) || null,
  });
  console.log(`[${timestamp()}] OCR triage complete: ${JSON.stringify(ocrTriage.summary)}`);

  const localOcr = {
    skipped: true,
    reason: "Storage-light mode skips local OCR and image-byte downloads.",
  };

  const existingRecipeBridge = await readRecipeBridgePayload(path.join(ROOT_DIR, "docs", "data", "enrichment", "recipe-bridge.json"), { summary: {} });
  const recipeClusterLimit = recipeLimitForStorageMode(args, existingRecipeBridge, "clusters", 500);
  const recipeDishLinkLimit = recipeLimitForStorageMode(args, existingRecipeBridge, "dishLinks", 1600);
  const recipeBridge = await buildRecipeBridge({
    dryRun: hasFlag(args, "dry-run"),
    clusterLimit: recipeClusterLimit,
    dishLinkLimit: recipeDishLinkLimit,
  });
  console.log(`[${timestamp()}] Recipe bridge complete: ${JSON.stringify(recipeBridge.summary)}`);

  const sourceProbes = await buildSourceProbes({ dryRun: hasFlag(args, "dry-run") });
  console.log(`[${timestamp()}] Source probes complete: ${JSON.stringify(sourceProbes.summary)}`);

  const coverageReport = await buildEnrichmentCoverageReport({ dryRun: hasFlag(args, "dry-run") });
  console.log(`[${timestamp()}] Coverage report complete: ${JSON.stringify(coverageReport.summary)}`);

  const runPlan = await buildEnrichmentRunPlan({
    dryRun: hasFlag(args, "dry-run"),
    externalCostPerImageUsd: Number(argValue(args, "external-cost-per-image", "0.01")) || 0.01,
  });
  console.log(`[${timestamp()}] Run plan complete: ${JSON.stringify(runPlan.summary)}`);

  const assimilationPlan = await buildAssimilationPlan({ dryRun: hasFlag(args, "dry-run") });
  console.log(`[${timestamp()}] Assimilation plan complete: ${JSON.stringify(assimilationPlan.summary)}`);

  const graph = await buildGraphOverlay();
  console.log(`[${timestamp()}] Graph rebuild complete: ${JSON.stringify(graph.manifest.summary)}`);

  await writeStatus({
    status: "complete",
    phase: "storage-light-complete",
    pid: process.pid,
    args,
    finishedAt: timestamp(),
    storagePreflight: storageCheck,
    enrichmentSummary,
    externalSources,
    externalImageAssessment,
    externalMetadata: externalMetadata.summary,
    retagged,
    ocrTriage: ocrTriage.summary,
    localOcr,
    recipeBridge: recipeBridge.summary,
    sourceProbes: sourceProbes.summary,
    coverageReport: coverageReport.summary,
    runPlan: runPlan.summary,
    assimilationPlan: assimilationPlan.summary,
    graphSummary: graph.manifest.summary,
  });
}

async function main() {
  const args = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_ARGS;
  const storageCheck = assertStoragePreflight(storagePreflightForArgs(args));
  if (isStorageLight(args)) {
    await runStorageLightPipeline(args, storageCheck);
    return;
  }
  const options = optionsFromArgs(args);
  options.onProgress = (message) => {
    console.log(`[${timestamp()}] ${message}`);
    writeStatus({
      status: "running",
      phase: "local-enrichment",
      pid: process.pid,
      args,
      lastProgress: message,
      progressAt: timestamp(),
    }).catch(() => {});
  };

  await writeStatus({
    status: "running",
    phase: "local-enrichment",
    pid: process.pid,
    args,
    storagePreflight: storageCheck,
  });

  console.log(
    `[${timestamp()}] Storage preflight ok: ${storageCheck.availableFormatted} available; ${storageCheck.minFreeFormatted} required`
  );
  console.log(`[${timestamp()}] Starting local enrichment job with args: ${args.join(" ")}`);
  const enrichment = await buildLocalEnrichment(options);
  console.log(`[${timestamp()}] Local enrichment complete: ${JSON.stringify(enrichment.status.summary)}`);

  await writeStatus({
    status: "running",
    phase: "external-sources",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
  });

  const externalSources = await runExternalSources(args);

  await writeStatus({
    status: "running",
    phase: "external-image-assessment",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
    externalSources,
  });

  const externalImageAssessment = await runExternalImageAssessment(args);

  await writeStatus({
    status: "running",
    phase: "external-metadata-enrichment",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
    externalSources,
    externalImageAssessment,
  });

  const externalMetadata = await enrichExternalMetadata({ dryRun: hasFlag(args, "dry-run") });
  console.log(`[${timestamp()}] External metadata enrichment complete: ${JSON.stringify(externalMetadata.summary)}`);

  await writeStatus({
    status: "running",
    phase: "retag-enrichment",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
    externalSources,
    externalImageAssessment,
    externalMetadata: externalMetadata.summary,
  });

  const retagged = await retagEnrichment({ dryRun: hasFlag(args, "dry-run") });
  console.log(`[${timestamp()}] Retag enrichment complete: ${JSON.stringify({ taxonomyVersion: retagged.taxonomyVersion, externalSources: retagged.externalSources.length })}`);

  await writeStatus({
    status: "running",
    phase: "ocr-triage",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
    externalSources,
    externalImageAssessment,
    externalMetadata: externalMetadata.summary,
    retagged,
  });

  const ocrTriage = await buildOcrTriageQueue({
    dryRun: hasFlag(args, "dry-run"),
    recordLimit: Number(argValue(args, "ocr-triage-limit", "5000")) || 5000,
    earlyLimit: Number(argValue(args, "ocr-triage-early-limit", "100")) || 100,
    pagesPerMenu: Number(argValue(args, "ocr-triage-pages-per-menu", "2")) || 2,
    externalCostPerImageUsd: Number(argValue(args, "external-cost-per-image", "0")) || null,
  });
  console.log(`[${timestamp()}] OCR triage complete: ${JSON.stringify(ocrTriage.summary)}`);

  await writeStatus({
    status: "running",
    phase: "local-vision-ocr",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
    externalSources,
    externalImageAssessment,
    externalMetadata: externalMetadata.summary,
    retagged,
    ocrTriage: ocrTriage.summary,
  });

  const localOcr = await runLocalOcrEnrichment(args);
  if (localOcr.skipped) {
    console.log(`[${timestamp()}] Local Vision OCR skipped: ${localOcr.reason}`);
  } else {
    console.log(`[${timestamp()}] Local Vision OCR complete: ${JSON.stringify(localOcr.summary)}`);
  }

  const postOcrRetagged = localOcr.skipped ? retagged : await retagEnrichment({ dryRun: hasFlag(args, "dry-run") });
  if (!localOcr.skipped) {
    console.log(
      `[${timestamp()}] Post-OCR retag complete: ${JSON.stringify({ taxonomyVersion: postOcrRetagged.taxonomyVersion, externalSources: postOcrRetagged.externalSources.length })}`
    );
  }

  await writeStatus({
    status: "running",
    phase: "recipe-bridge",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
    externalSources,
    externalImageAssessment,
    externalMetadata: externalMetadata.summary,
    retagged: postOcrRetagged,
    ocrTriage: ocrTriage.summary,
    localOcr: localOcr.summary || localOcr,
  });

  const existingRecipeBridge = await readRecipeBridgePayload(path.join(ROOT_DIR, "docs", "data", "enrichment", "recipe-bridge.json"), { summary: {} });
  const recipeClusterLimit = Math.max(
    currentRecipeBridgeLimit(existingRecipeBridge, "clusters", 500),
    Number(argValue(args, "recipe-cluster-limit", "0")) || 0
  );
  const recipeDishLinkLimit = Math.max(
    currentRecipeBridgeLimit(existingRecipeBridge, "dishLinks", 1600),
    Number(argValue(args, "recipe-dish-link-limit", "0")) || 0
  );
  const recipeBridge = await buildRecipeBridge({
    dryRun: hasFlag(args, "dry-run"),
    clusterLimit: recipeClusterLimit,
    dishLinkLimit: recipeDishLinkLimit,
  });
  console.log(`[${timestamp()}] Recipe bridge complete: ${JSON.stringify(recipeBridge.summary)}`);

  const sourceProbes = await buildSourceProbes({ dryRun: hasFlag(args, "dry-run") });
  console.log(`[${timestamp()}] Source probes complete: ${JSON.stringify(sourceProbes.summary)}`);

  await writeStatus({
    status: "running",
    phase: "coverage-report",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
    externalSources,
    externalImageAssessment,
    externalMetadata: externalMetadata.summary,
    retagged: postOcrRetagged,
    ocrTriage: ocrTriage.summary,
    localOcr: localOcr.summary || localOcr,
    recipeBridge: recipeBridge.summary,
    sourceProbes: sourceProbes.summary,
  });

  const coverageReport = await buildEnrichmentCoverageReport({ dryRun: hasFlag(args, "dry-run") });
  console.log(`[${timestamp()}] Coverage report complete: ${JSON.stringify(coverageReport.summary)}`);

  await writeStatus({
    status: "running",
    phase: "run-plan",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
    externalSources,
    externalImageAssessment,
    externalMetadata: externalMetadata.summary,
    retagged: postOcrRetagged,
    ocrTriage: ocrTriage.summary,
    localOcr: localOcr.summary || localOcr,
    recipeBridge: recipeBridge.summary,
    sourceProbes: sourceProbes.summary,
    coverageReport: coverageReport.summary,
  });

  const runPlan = await buildEnrichmentRunPlan({
    dryRun: hasFlag(args, "dry-run"),
    externalCostPerImageUsd: Number(argValue(args, "external-cost-per-image", "0.01")) || 0.01,
  });
  console.log(`[${timestamp()}] Run plan complete: ${JSON.stringify(runPlan.summary)}`);

  const assimilationPlan = await buildAssimilationPlan({ dryRun: hasFlag(args, "dry-run") });
  console.log(`[${timestamp()}] Assimilation plan complete: ${JSON.stringify(assimilationPlan.summary)}`);

  await writeStatus({
    status: "running",
    phase: "graph-build",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
    externalSources,
    externalImageAssessment,
    externalMetadata: externalMetadata.summary,
    retagged: postOcrRetagged,
    ocrTriage: ocrTriage.summary,
    localOcr: localOcr.summary || localOcr,
    recipeBridge: recipeBridge.summary,
    sourceProbes: sourceProbes.summary,
    coverageReport: coverageReport.summary,
    runPlan: runPlan.summary,
    assimilationPlan: assimilationPlan.summary,
  });

  const graph = await buildGraphOverlay();
  console.log(`[${timestamp()}] Graph rebuild complete: ${JSON.stringify(graph.manifest.summary)}`);

  await writeStatus({
    status: "complete",
    phase: "complete",
    pid: process.pid,
    args,
    finishedAt: timestamp(),
    enrichmentSummary: enrichment.status.summary,
    externalSources,
    externalImageAssessment,
    externalMetadata: externalMetadata.summary,
    retagged: postOcrRetagged,
    ocrTriage: ocrTriage.summary,
    localOcr: localOcr.summary || localOcr,
    recipeBridge: recipeBridge.summary,
    sourceProbes: sourceProbes.summary,
    coverageReport: coverageReport.summary,
    runPlan: runPlan.summary,
    assimilationPlan: assimilationPlan.summary,
    graphSummary: graph.manifest.summary,
  });
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error(`[${timestamp()}] Overnight enrichment failed: ${error.stack || error.message}`);
    await writeStatus({
      status: "error",
      phase: "failed",
      pid: process.pid,
      error: error.message,
      storagePreflight: error.storagePreflight || null,
      stack: error.stack,
    }).catch(() => {});
    process.exitCode = 1;
  });
}

module.exports = {
  STORAGE_LIGHT_MIN_FREE_MB,
  STORAGE_LIGHT_EXTERNAL_IMAGE_LIMIT,
  STORAGE_LIGHT_EXTERNAL_IMAGE_CONCURRENCY,
  STORAGE_LIGHT_EXTERNAL_IMAGE_TIMEOUT_MS,
  isStorageLight,
  recipeLimitForStorageMode,
  runStorageLightPipeline,
  storagePreflightForArgs,
};
