const fs = require("fs/promises");
const path = require("path");
const { cleanValue } = require("../docs/multisource");
const { storagePreflight, DEFAULT_MIN_FREE_MB } = require("./storage-preflight");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const ENRICHMENT_DIR = path.join(DATA_DIR, "enrichment");
const OUTPUT_PATH = path.join(ENRICHMENT_DIR, "assimilation-plan.json");
const VERSION = 1;

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

function round(value, digits = 3) {
  return Number(number(value).toFixed(digits));
}

function pct(value) {
  return round(value, 3);
}

function topItems(object, limit = 8) {
  return Object.entries(object || {})
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0) || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count: Number(count || 0) }));
}

function coverageGap(row) {
  const rowCount = number(row.rowCount, 0);
  const dishMenus = number(row.dishMenus, 0);
  const priceMenus = number(row.priceMenus, 0);
  const sampledPriceMenus = number(row.sampledPriceMenus, priceMenus);
  const sourceStructuredPriceMenus = number(row.sourceStructuredPriceMenus, 0);
  const sourceStructuredPriceItems = number(row.sourceStructuredPriceItems, 0);
  const ingredientMenus = number(row.ingredientMenus, 0);
  const imageMenus = number(row.imageMenus, 0);
  const missingDishMenus = Math.max(0, rowCount - dishMenus);
  const missingPriceMenus = Math.max(0, rowCount - priceMenus);
  const missingIngredientMenus = Math.max(0, rowCount - ingredientMenus);
  const missingImageMenus = Math.max(0, rowCount - imageMenus);
  const ocrCandidates = number(row.ocrCandidates, 0);
  const ocrFailures = number(row.ocrFailures, 0);
  const impactScore = round(
    missingPriceMenus * 3.2 +
      missingDishMenus * 2.1 +
      missingIngredientMenus * 1.4 +
      missingImageMenus * 0.6 +
      ocrCandidates * 1.8 +
      ocrFailures * 5,
    2
  );
  return {
    sourceId: cleanValue(row.sourceId),
    sourceKey: cleanValue(row.sourceKey),
    label: cleanValue(row.label || row.sourceId),
    sourceType: cleanValue(row.sourceType),
    rowCount,
    dateCoverage: pct(row.dateCoverage),
    dishCoverage: pct(row.dishCoverage),
    priceCoverage: pct(row.priceCoverage),
    ingredientCoverage: pct(row.ingredientCoverage),
    imageCoverage: pct(row.imageCoverage),
    missingDishMenus,
    missingPriceMenus,
    sampledPriceMenus,
    sourceStructuredPriceMenus,
    sourceStructuredPriceItems,
    missingIngredientMenus,
    missingImageMenus,
    ocrCandidates,
    ocrFailures,
    coverageScore: pct(row.coverageScore),
    primaryNextAction: cleanValue(row.primaryNextAction || "monitor"),
    topIngredientTags: topItems(row.topIngredientTags, 6),
    topDishTypes: topItems(row.topDishTypes, 6),
    impactScore,
  };
}

function summarizeGaps(gaps = []) {
  const menuGaps = gaps.filter((gap) => gap.sourceType === "menu");
  return {
    sources: gaps.length,
    menuSources: menuGaps.length,
    missingDishMenus: menuGaps.reduce((sum, gap) => sum + gap.missingDishMenus, 0),
    missingPriceMenus: menuGaps.reduce((sum, gap) => sum + gap.missingPriceMenus, 0),
    missingIngredientMenus: menuGaps.reduce((sum, gap) => sum + gap.missingIngredientMenus, 0),
    ocrCandidates: menuGaps.reduce((sum, gap) => sum + gap.ocrCandidates, 0),
    ocrFailures: menuGaps.reduce((sum, gap) => sum + gap.ocrFailures, 0),
    topGapSources: menuGaps
      .slice()
      .sort((a, b) => b.impactScore - a.impactScore || a.label.localeCompare(b.label))
      .slice(0, 8)
      .map((gap) => ({
        sourceId: gap.sourceId,
        label: gap.label,
        impactScore: gap.impactScore,
        missingDishMenus: gap.missingDishMenus,
        missingPriceMenus: gap.missingPriceMenus,
        sampledPriceMenus: gap.sampledPriceMenus,
        sourceStructuredPriceMenus: gap.sourceStructuredPriceMenus,
        missingIngredientMenus: gap.missingIngredientMenus,
        primaryNextAction: gap.primaryNextAction,
      })),
  };
}

function commandList(items = [], limit = 6) {
  return items
    .map((item) => cleanValue(item.command))
    .filter(Boolean)
    .filter((command, index, all) => all.indexOf(command) === index)
    .slice(0, limit);
}

function workstreams({ gaps, coverageReport, runPlan, recipeBridge, sourceRouteReview, storage }) {
  const menuGaps = gaps.filter((gap) => gap.sourceType === "menu");
  const sourceRefresh = runPlan.sourceRefresh?.sources || [];
  const localBatches = runPlan.localBatches || [];
  const graphGapQueue = runPlan.graphGapQueue || {};
  const graphGapBatches = graphGapQueue.localBatches || [];
  const metadataOnlyQueue = runPlan.metadataOnlyQueue || {};
  const runnableLocalBatches = localBatches.filter((batch) => batch.runnable);
  const hasRunnableLocalOcr = number(runPlan.summary?.localRunnableImages, 0) > 0 || runnableLocalBatches.length > 0;
  const sourceRefreshCommands = commandList(sourceRefresh);
  const metadataOnlyReviewCandidates = number(metadataOnlyQueue.reviewCandidates || runPlan.summary?.metadataOnlyReviewCandidates, 0);
  const sourceRouteSummary = sourceRouteReview?.summary || {};
  const sourceRouteRecords = sourceRouteReview?.records || [];
  const sourceRouteReviewNeeded = Boolean(
    metadataOnlyReviewCandidates ||
      number(sourceRouteSummary.sources, 0) ||
      sourceRefresh.some((row) => ["source_route_review", "iiif_image_assessment"].includes(cleanValue(row.primaryNextAction)))
  );
  const recipeSummary = recipeBridge.summary || {};
  const currentClusters = number(recipeSummary.clusters, 0);
  const totalCandidateClusters = number(recipeSummary.totalCandidateClusters, 0);
  const targetClusters = number(runPlan.recipeBridge?.targetClusterLimit, currentClusters);
  const nextActions = coverageReport.prioritizedActions || [];
  const metadataSources = menuGaps
    .filter((gap) => gap.primaryNextAction === "metadata_dish_hint_pass" || gap.dishCoverage < 0.7 || gap.ingredientCoverage < 0.7)
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 10);
  const priceSources = menuGaps
    .filter((gap) => gap.priceCoverage < 0.5)
    .sort((a, b) => b.missingPriceMenus - a.missingPriceMenus || b.impactScore - a.impactScore)
    .slice(0, 10);
  const imageSources = menuGaps
    .filter((gap) => gap.ocrCandidates || gap.ocrFailures || gap.imageCoverage < 0.5)
    .sort((a, b) => b.ocrFailures - a.ocrFailures || b.ocrCandidates - a.ocrCandidates || b.impactScore - a.impactScore)
    .slice(0, 10);

  return [
    {
      id: "source_route_review_queue",
      label: "Resolve source and image route review queue",
      status: number(sourceRouteSummary.sources, 0) ? "ready" : sourceRouteReviewNeeded ? "source_route_review" : "monitor",
      priority: number(sourceRouteSummary.sources, 0) ? 7.9 : sourceRouteReviewNeeded ? 6.7 : 3,
      impact: {
        sources: number(sourceRouteSummary.sources, 0),
        metadataOnlyReviewCandidates: number(sourceRouteSummary.metadataOnlyReviewCandidates, metadataOnlyReviewCandidates),
        sourceRouteSources: number(sourceRouteSummary.sourceRouteSources, 0),
        iiifReviewSources: number(sourceRouteSummary.iiifReviewSources, 0),
        imageRouteReviewSources: number(sourceRouteSummary.imageRouteReviewSources, 0),
      },
      reason: "This queue turns exhausted local OCR/no-image states into explicit route, rights, and IIIF decisions before another enrichment pass.",
      commands: ["npm run enrich:source-route-review", "npm run enrich:coverage", "npm run enrich:run-plan", "npm run enrich:assimilation-plan", "npm run build:graph"],
      sourceIds: sourceRouteRecords.map((row) => row.sourceId).filter(Boolean).slice(0, 12),
    },
    {
      id: "free_disk_for_local_ocr",
      label: "Free disk for local OCR/image assessment",
      status: storage.ok ? "ready" : "blocked_low_disk",
      priority: storage.ok ? 5 : 10,
      impact: {
        pendingImages: number(runPlan.summary?.pendingImages, 0),
        localRunnableImages: number(runPlan.summary?.localRunnableImages, 0),
        estimatedLocalRuntimeMinutes: number(runPlan.summary?.estimatedLocalRuntimeMinutes, 0),
      },
      reason: storage.ok
        ? hasRunnableLocalOcr
          ? "Storage preflight passes; run bounded local OCR batches."
          : "Storage preflight passes, but the current local OCR queue has no runnable images."
        : `${storage.availableFormatted || runPlan.summary?.storageAvailableFormatted || "unknown"} available; ${storage.minFreeFormatted || runPlan.summary?.storageRequiredFormatted || "1.0 GB"} required before OCR.`,
      commands: ["npm run enrich:cache:prune", ...runnableLocalBatches.map((batch) => batch.command).slice(0, 3)],
      sourceIds: imageSources.map((gap) => gap.sourceId),
    },
    {
      id: "graph_gap_queue_ocr",
      label: "Run graph-prioritized OCR gap queue",
      status: number(graphGapQueue.summary?.actionableLocalOcrGaps ?? graphGapQueue.summary?.localOcrGaps, 0) ? (storage.ok ? "ready_for_ocr" : "blocked_low_disk") : "monitor",
      priority: number(graphGapQueue.summary?.actionableLocalOcrGaps ?? graphGapQueue.summary?.localOcrGaps, 0) ? 8.2 : 3,
      impact: {
        menuGaps: number(graphGapQueue.summary?.menuGaps, 0),
        localOcrGaps: number(graphGapQueue.summary?.localOcrGaps, 0),
        actionableLocalOcrGaps: number(graphGapQueue.summary?.actionableLocalOcrGaps ?? graphGapQueue.summary?.localOcrGaps, 0),
        estimatedImages: number(graphGapQueue.summary?.estimatedImages, 0),
        actionableEstimatedImages: number(graphGapQueue.summary?.actionableEstimatedImages ?? graphGapQueue.summary?.estimatedImages, 0),
        metadataGaps: number(graphGapQueue.summary?.metadataGaps, 0),
        topMissing: graphGapQueue.summary?.topMissing || {},
      },
      reason: "Use the static graph overlay to pick exact high-value menus, then run the existing local OCR pipeline with candidate IDs.",
      commands: graphGapBatches.map((batch) => batch.command).filter(Boolean).slice(0, 6),
      sourceIds: Object.keys(graphGapQueue.summary?.topSources || {}).slice(0, 12),
    },
    {
      id: "metadata_source_refresh",
      label: "Refresh and retag metadata-only source evidence",
      status: sourceRefreshCommands.length ? "ready" : sourceRouteReviewNeeded ? "source_route_review" : "monitor",
      priority: sourceRefreshCommands.length ? 8 : sourceRouteReviewNeeded ? 6.5 : 4,
      impact: {
        sources: sourceRefresh.length,
        commands: sourceRefreshCommands.length,
        prioritizedActions: nextActions.length,
      },
      reason: sourceRefreshCommands.length
        ? "Metadata refresh is the cheapest path while disk blocks OCR; it can improve dates, venues, image routes, dish hints, and source coverage."
        : "No connector command remains for these source gaps; review item image routes, rights, or source availability.",
      commands: sourceRefreshCommands.length
        ? [...sourceRefreshCommands, "npm run enrich:external-metadata", "npm run enrich:retag", "npm run enrich:coverage", "npm run enrich:run-plan", "npm run build:graph"]
        : [],
      sourceIds: sourceRefresh.map((row) => row.sourceId).slice(0, 12),
    },
    {
      id: "metadata_only_queue",
      label: "Process metadata-only no-image records",
      status: number(metadataOnlyQueue.candidates, 0) ? "ready" : metadataOnlyReviewCandidates ? "source_route_review" : "monitor",
      priority: number(metadataOnlyQueue.candidates, 0) ? 8.1 : metadataOnlyReviewCandidates ? 6.6 : 3,
      impact: {
        candidates: number(metadataOnlyQueue.candidates, 0),
        reviewCandidates: metadataOnlyReviewCandidates,
        pendingImages: number(metadataOnlyQueue.pendingImages, 0),
        sources: new Set([...Object.keys(metadataOnlyQueue.bySource || {}), ...Object.keys(metadataOnlyQueue.reviewBySource || {})]).size,
      },
      reason: metadataOnlyReviewCandidates
        ? "Metadata-only records have no image route and no executable OCR work; move them to source-route or collection-rights review."
        : "These records can add dish, venue, date, and ingredient hints without image downloads or OCR storage.",
      commands: commandList(metadataOnlyQueue.sourceCommands || []).concat(metadataOnlyQueue.followUpCommands || []).filter((command, index, all) => command && all.indexOf(command) === index).slice(0, 8),
      sourceIds: [...new Set([...Object.keys(metadataOnlyQueue.bySource || {}), ...Object.keys(metadataOnlyQueue.reviewBySource || {})])].slice(0, 12),
    },
    {
      id: "metadata_dish_ingredient_gap_pass",
      label: "Close dish and ingredient metadata gaps",
      status: metadataSources.length ? "ready" : "monitor",
      priority: metadataSources.length ? 7.6 : 3,
      impact: {
        missingDishMenus: metadataSources.reduce((sum, gap) => sum + gap.missingDishMenus, 0),
        missingIngredientMenus: metadataSources.reduce((sum, gap) => sum + gap.missingIngredientMenus, 0),
      },
      reason: "Prioritize sources where dish/ingredient coverage is weak before spending on external LLM review.",
      commands: ["npm run enrich:external-metadata", "npm run enrich:retag", "npm run enrich:recipe-bridge", "npm run enrich:coverage", "npm run build:graph"],
      sourceIds: metadataSources.map((gap) => gap.sourceId),
    },
    {
      id: "price_gap_pass",
      label: "Prioritize price extraction gaps",
      status: priceSources.length ? (storage.ok ? (hasRunnableLocalOcr ? "ready_for_ocr" : "monitor") : "blocked_low_disk") : "monitor",
      priority: priceSources.length && hasRunnableLocalOcr ? 7.2 : 3,
      impact: {
        missingPriceMenus: priceSources.reduce((sum, gap) => sum + gap.missingPriceMenus, 0),
        currentPriceMenus: menuGaps.reduce((sum, gap) => sum + Math.max(0, gap.rowCount - gap.missingPriceMenus), 0),
      },
      reason: hasRunnableLocalOcr
        ? "Price coverage is the main blocker for robust temporal price analytics and date estimation signals."
        : "Price coverage is still a major gap, but the current local OCR queue has no runnable images.",
      commands: hasRunnableLocalOcr ? localBatches.map((batch) => batch.command).slice(0, 4) : [],
      sourceIds: priceSources.map((gap) => gap.sourceId),
    },
    {
      id: "recipe_bridge_expansion",
      label: "Expand recipe/ingredient bridge toward full candidate set",
      status: currentClusters < totalCandidateClusters ? "ready" : "complete",
      priority: currentClusters < totalCandidateClusters ? 6.8 : 1,
      impact: {
        currentClusters,
        targetClusters,
        totalCandidateClusters,
        remainingCandidateClusters: Math.max(0, totalCandidateClusters - currentClusters),
        sourceCandidates: recipeSummary.sourceCandidates || {},
      },
      reason: "Recipe bridge remains derived metadata only and is the cheapest way to deepen ingredient and modern-recipe context.",
      commands: [runPlan.recipeBridge?.command || `npm run enrich:recipe-bridge -- --cluster-limit=${targetClusters} --dish-link-limit=${targetClusters}`, "npm run enrich:coverage", "npm run build:graph"],
      sourceIds: Object.keys(recipeSummary.sourceCandidates || {}),
    },
    {
      id: "external_llm_review",
      label: "Route difficult images to external LLMs only after rights review",
      status: runPlan.externalReview?.status || "blocked_until_rights_review",
      priority: runPlan.externalReview?.allowedCandidates ? 5.5 : 2.5,
      impact: {
        allowedCandidates: number(runPlan.externalReview?.allowedCandidates, 0),
        allowedImages: number(runPlan.externalReview?.allowedImages, 0),
        estimatedPilotCostUsd: number(runPlan.externalReview?.estimatedPilotCost?.estimatedCostUsd, 0),
      },
      reason: "External LLM/image routing should remain a triage lane, not the default path, until rights and budget are explicit.",
      commands: runPlan.externalReview?.command ? [runPlan.externalReview.command] : [],
      sourceIds: [],
    },
  ].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

function phases(streams, runPlan) {
  return [
    {
      id: "now_low_storage",
      label: "Now: storage-light assimilation",
      status: "ready",
      workstreamIds: streams
        .filter((stream) => ["source_route_review_queue", "metadata_source_refresh", "metadata_only_queue", "metadata_dish_ingredient_gap_pass", "recipe_bridge_expansion"].includes(stream.id))
        .map((stream) => stream.id),
      commands: [
        "npm run enrich:coverage",
        "npm run enrich:source-route-review",
        "npm run enrich:external-metadata",
        ...(runPlan.metadataOnlyQueue?.sourceCommands || []).map((row) => row.command),
        runPlan.recipeBridge?.command,
        "npm run enrich:retag",
        "npm run enrich:run-plan",
        "npm run build:graph",
      ].filter(Boolean),
    },
    {
      id: "after_disk_free",
      label: "After disk free: local OCR/image assessment",
      status: runPlan.summary?.storageOk ? "ready" : "blocked_low_disk",
      workstreamIds: ["free_disk_for_local_ocr", "graph_gap_queue_ocr", "price_gap_pass"],
      commands: [...(runPlan.graphGapQueue?.localBatches || []), ...(runPlan.localBatches || [])]
        .map((batch) => batch.command)
        .filter(Boolean)
        .slice(0, 6),
    },
    {
      id: "after_rights_review",
      label: "After rights review: external LLM triage",
      status: runPlan.externalReview?.status || "blocked_until_rights_review",
      workstreamIds: ["external_llm_review"],
      commands: runPlan.externalReview?.command ? [runPlan.externalReview.command] : [],
    },
  ];
}

function buildAssimilationPlanPayload(inputs = {}, options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const coverageReport = inputs.coverageReport || {};
  const runPlan = inputs.runPlan || {};
  const recipeBridge = inputs.recipeBridge || {};
  const sourceRouteReview = inputs.sourceRouteReview || {};
  const storage = inputs.storagePreflight || storagePreflight({
    targetDir: ROOT_DIR,
    minFreeMb: options.minFreeMb ?? DEFAULT_MIN_FREE_MB,
    label: "assimilation planning",
  });
  const gaps = (coverageReport.records || []).map(coverageGap);
  const gapSummary = summarizeGaps(gaps);
  const streams = workstreams({ gaps, coverageReport, runPlan, recipeBridge, sourceRouteReview, storage });
  const streamById = Object.fromEntries(streams.map((stream) => [stream.id, stream]));
  const planPhases = phases(streams, runPlan);
  const recommendedNext = storage.ok
    ? streamById.graph_gap_queue_ocr?.status === "ready_for_ocr"
      ? "run_graph_gap_queue_batch"
      : streamById.price_gap_pass?.status === "ready_for_ocr"
      ? "run_local_ocr_price_batch"
      : streamById.metadata_source_refresh?.status === "ready" || streamById.metadata_only_queue?.status === "ready"
        ? "run_metadata_refresh"
      : streamById.source_route_review_queue?.status === "ready" ||
          streamById.source_route_review_queue?.status === "source_route_review" ||
          streamById.metadata_source_refresh?.status === "source_route_review" ||
          streamById.metadata_only_queue?.status === "source_route_review"
      ? "source_route_review"
      : "monitor"
    : "storage_light_metadata_and_recipe_assimilation";

  return {
    version: VERSION,
    generatedAt,
    processor: {
      name: "assimilation_plan",
      version: "0.1.0",
      localOnly: true,
      storesRawOcr: false,
      storesImageBlobs: false,
      storesExternalLlmPayloads: false,
    },
    objective: "Move MenuGraph toward comprehensive price, dish, ingredient, image-assessment, and recipe-context coverage while preserving provenance and static graph constraints.",
    summary: {
      recommendedNext,
      storageOk: Boolean(storage.ok),
      storageAvailableFormatted: storage.availableFormatted || runPlan.summary?.storageAvailableFormatted || "",
      storageRequiredFormatted: storage.minFreeFormatted || runPlan.summary?.storageRequiredFormatted || "",
      workstreams: streams.length,
      readyWorkstreams: streams.filter((stream) => stream.status === "ready" || stream.status === "ready_for_ocr").length,
      blockedWorkstreams: streams.filter((stream) => String(stream.status).startsWith("blocked")).length,
      gaps: gapSummary,
      recipeBridge: {
        currentClusters: number(recipeBridge.summary?.clusters, 0),
        totalCandidateClusters: number(recipeBridge.summary?.totalCandidateClusters, 0),
        targetClusterLimit: number(runPlan.recipeBridge?.targetClusterLimit, 0),
        sourceCandidates: recipeBridge.summary?.sourceCandidates || {},
      },
      ocr: {
        pendingImages: number(runPlan.summary?.pendingImages, 0),
        localRunnableImages: number(runPlan.summary?.localRunnableImages, 0),
        estimatedLocalRuntimeMinutes: number(runPlan.summary?.estimatedLocalRuntimeMinutes, 0),
        estimatedFullExternalCost: runPlan.summary?.estimatedFullExternalCost || {},
      },
      metadataOnlyQueue: {
        candidates: number(runPlan.metadataOnlyQueue?.candidates || runPlan.summary?.metadataOnlyCandidates, 0),
        reviewCandidates: number(runPlan.metadataOnlyQueue?.reviewCandidates || runPlan.summary?.metadataOnlyReviewCandidates, 0),
        pendingImages: number(runPlan.metadataOnlyQueue?.pendingImages, 0),
        bySource: runPlan.metadataOnlyQueue?.bySource || runPlan.summary?.metadataOnlyBySource || {},
        reviewBySource: runPlan.metadataOnlyQueue?.reviewBySource || runPlan.summary?.metadataOnlyReviewBySource || {},
      },
      sourceRouteReview: {
        sources: number(sourceRouteReview.summary?.sources, 0),
        metadataOnlyReviewCandidates: number(sourceRouteReview.summary?.metadataOnlyReviewCandidates, 0),
        failedReviewCandidates: number(sourceRouteReview.summary?.failedReviewCandidates, 0),
        sourceRouteSources: number(sourceRouteReview.summary?.sourceRouteSources, 0),
        iiifReviewSources: number(sourceRouteReview.summary?.iiifReviewSources, 0),
        imageRouteReviewSources: number(sourceRouteReview.summary?.imageRouteReviewSources, 0),
        recommendedNext: cleanValue(sourceRouteReview.summary?.recommendedNext),
      },
      graphGapQueue: {
        menuGaps: number(runPlan.graphGapQueue?.summary?.menuGaps || runPlan.summary?.graphGapQueue?.menuGaps, 0),
        localOcrGaps: number(runPlan.graphGapQueue?.summary?.localOcrGaps || runPlan.summary?.graphGapQueue?.localOcrGaps, 0),
        actionableLocalOcrGaps: number(runPlan.graphGapQueue?.summary?.actionableLocalOcrGaps || runPlan.summary?.graphGapQueue?.actionableLocalOcrGaps, 0),
        metadataGaps: number(runPlan.graphGapQueue?.summary?.metadataGaps || runPlan.summary?.graphGapQueue?.metadataGaps, 0),
        estimatedImages: number(runPlan.graphGapQueue?.summary?.estimatedImages || runPlan.summary?.graphGapQueue?.estimatedImages, 0),
        actionableEstimatedImages: number(runPlan.graphGapQueue?.summary?.actionableEstimatedImages || runPlan.summary?.graphGapQueue?.actionableEstimatedImages, 0),
        blockedReason: cleanValue(runPlan.graphGapQueue?.summary?.blockedReason || runPlan.summary?.graphGapQueue?.blockedReason),
      },
    },
    gaps: gaps
      .filter((gap) => gap.sourceType === "menu")
      .sort((a, b) => b.impactScore - a.impactScore || a.label.localeCompare(b.label))
      .slice(0, options.gapLimit || 24),
    workstreams: streams,
    phases: planPhases,
    graphRebuildCommands: ["npm run enrich:coverage", "npm run enrich:run-plan", "npm run enrich:assimilation-plan", "npm run build:graph"],
  };
}

async function buildAssimilationPlan(options = {}) {
  const [coverageReport, runPlan, recipeBridge, sourceRouteReview] = await Promise.all([
    readJson(path.join(ENRICHMENT_DIR, "coverage-report.json"), { records: [], summary: {} }),
    readJson(path.join(ENRICHMENT_DIR, "run-plan.json"), { summary: {} }),
    readJson(path.join(ENRICHMENT_DIR, "recipe-bridge.json"), { summary: {} }),
    readJson(path.join(ENRICHMENT_DIR, "source-route-review.json"), { records: [], summary: {} }),
  ]);
  const payload = buildAssimilationPlanPayload({ coverageReport, runPlan, recipeBridge, sourceRouteReview }, options);
  if (!options.dryRun) await writeJson(options.outputPath || OUTPUT_PATH, payload);
  return payload;
}

function optionsFromArgs(args = process.argv.slice(2)) {
  return {
    dryRun: hasFlag(args, "dry-run"),
    outputPath: argValue(args, "output", OUTPUT_PATH),
    minFreeMb: Number(argValue(args, "min-free-mb", String(DEFAULT_MIN_FREE_MB))) || DEFAULT_MIN_FREE_MB,
    gapLimit: Number(argValue(args, "gap-limit", "24")) || 24,
  };
}

async function main() {
  const payload = await buildAssimilationPlan(optionsFromArgs());
  console.log(
    [
      `Wrote assimilation plan with ${payload.summary.workstreams} workstream(s)`,
      `${payload.summary.gaps.missingPriceMenus.toLocaleString()} source/menu price gap(s)`,
      `next: ${payload.summary.recommendedNext}`,
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
  VERSION,
  buildAssimilationPlan,
  buildAssimilationPlanPayload,
  coverageGap,
  optionsFromArgs,
  summarizeGaps,
  workstreams,
};
