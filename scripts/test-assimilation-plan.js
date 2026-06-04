const assert = require("assert");
const {
  buildAssimilationPlanPayload,
  coverageGap,
  optionsFromArgs,
  summarizeGaps,
} = require("./build-assimilation-plan");

const gap = coverageGap({
  sourceId: "cia_menu_collection",
  sourceKey: "cia",
  label: "CIA",
  sourceType: "menu",
  rowCount: 100,
  dishMenus: 40,
  priceMenus: 20,
  ingredientMenus: 30,
  imageMenus: 10,
  ocrCandidates: 50,
  ocrFailures: 2,
  dishCoverage: 0.4,
  priceCoverage: 0.2,
  ingredientCoverage: 0.3,
  imageCoverage: 0.1,
  primaryNextAction: "metadata_dish_hint_pass",
  topIngredientTags: { oyster: 5 },
});
assert.strictEqual(gap.missingDishMenus, 60);
assert.strictEqual(gap.missingPriceMenus, 80);
assert.strictEqual(gap.missingIngredientMenus, 70);
assert(gap.impactScore > 0);

const gapSummary = summarizeGaps([gap]);
assert.strictEqual(gapSummary.missingPriceMenus, 80);
assert.strictEqual(gapSummary.topGapSources[0].sourceId, "cia_menu_collection");

const payload = buildAssimilationPlanPayload(
  {
    coverageReport: {
      records: [
        {
          sourceId: "cia_menu_collection",
          sourceKey: "cia",
          label: "CIA",
          sourceType: "menu",
          rowCount: 100,
          dishMenus: 40,
          priceMenus: 20,
          ingredientMenus: 30,
          imageMenus: 10,
          ocrCandidates: 50,
          ocrFailures: 2,
          dishCoverage: 0.4,
          priceCoverage: 0.2,
          ingredientCoverage: 0.3,
          imageCoverage: 0.1,
          primaryNextAction: "metadata_dish_hint_pass",
        },
      ],
      prioritizedActions: [{ id: "metadata_dish_hint_pass" }],
    },
    runPlan: {
      summary: {
        storageOk: false,
        pendingImages: 50,
        localRunnableImages: 50,
        estimatedLocalRuntimeMinutes: 37.5,
        estimatedFullExternalCost: { estimatedCostUsd: 0.5 },
      },
      sourceRefresh: {
        sources: [{ sourceId: "cia_menu_collection", command: "npm run enrich:local" }],
      },
      metadataOnlyQueue: {
        candidates: 3,
        pendingImages: 0,
        bySource: { cornell_nestle_menu_collection: 3 },
        sourceCommands: [{ sourceId: "cornell_nestle_menu_collection", command: "npm run enrich:cornell -- --limit=2500" }],
        followUpCommands: ["npm run enrich:retag", "npm run build:graph"],
      },
      localBatches: [{ command: "npm run enrich:ocr:local -- --limit=50", runnable: false }],
      graphGapQueue: {
        summary: {
          menuGaps: 2,
          localOcrGaps: 1,
          actionableLocalOcrGaps: 1,
          metadataGaps: 1,
          estimatedImages: 2,
          actionableEstimatedImages: 2,
          topMissing: { price: 1, dish: 1 },
          topSources: { cia_menu_collection: 1 },
          blockedReason: "low_disk_preflight",
        },
        localBatches: [
          {
            id: "graph_gap_top_priority",
            command: "npm run enrich:ocr:local -- --limit=1 --batch=all --tier=all --candidate-ids=ocrtriage:1",
            runnable: false,
          },
        ],
      },
      recipeBridge: {
        targetClusterLimit: 40000,
        command: "npm run enrich:recipe-bridge -- --cluster-limit=40000 --dish-link-limit=40000",
      },
      externalReview: {
        status: "blocked_until_rights_review",
        allowedCandidates: 0,
        allowedImages: 0,
        estimatedPilotCost: { estimatedCostUsd: 0 },
      },
    },
    recipeBridge: {
      summary: {
        clusters: 20000,
        totalCandidateClusters: 87437,
        sourceCandidates: { the_sifter: 19031 },
      },
    },
    storagePreflight: {
      ok: false,
      availableFormatted: "500 MB",
      minFreeFormatted: "1.0 GB",
    },
  },
  { generatedAt: "2026-06-03T00:00:00.000Z" }
);

assert.strictEqual(payload.summary.recommendedNext, "storage_light_metadata_and_recipe_assimilation");
assert.strictEqual(payload.summary.storageOk, false);
assert.strictEqual(payload.summary.graphGapQueue.localOcrGaps, 1);
assert.strictEqual(payload.summary.graphGapQueue.actionableLocalOcrGaps, 1);
assert.strictEqual(payload.summary.metadataOnlyQueue.candidates, 3);
assert.strictEqual(payload.summary.metadataOnlyQueue.pendingImages, 0);
assert(payload.workstreams.some((stream) => stream.id === "metadata_source_refresh" && stream.status === "ready"));
assert(payload.workstreams.some((stream) => stream.id === "metadata_only_queue" && stream.status === "ready" && stream.impact.pendingImages === 0));
assert(payload.workstreams.some((stream) => stream.id === "metadata_only_queue" && stream.commands.includes("npm run enrich:cornell -- --limit=2500")));
assert(payload.workstreams.some((stream) => stream.id === "price_gap_pass" && stream.status === "blocked_low_disk"));
assert(payload.workstreams.some((stream) => stream.id === "graph_gap_queue_ocr" && stream.status === "blocked_low_disk"));
assert(payload.workstreams.some((stream) => stream.id === "graph_gap_queue_ocr" && stream.commands[0].includes("--candidate-ids=ocrtriage:1")));
assert(payload.workstreams.some((stream) => stream.id === "recipe_bridge_expansion" && stream.impact.targetClusters === 40000));
assert(payload.phases.some((phase) => phase.id === "now_low_storage" && phase.commands.includes("npm run enrich:retag")));
assert(payload.phases.some((phase) => phase.id === "after_disk_free" && phase.commands[0].includes("--candidate-ids=ocrtriage:1")));
assert(!JSON.stringify(payload).includes("data:image/"), "assimilation plan must not contain image blobs");

const exhaustedLocalPayload = buildAssimilationPlanPayload(
  {
    coverageReport: {
      records: [
        {
          sourceId: "cia_menu_collection",
          sourceKey: "cia",
          label: "CIA",
          sourceType: "menu",
          rowCount: 100,
          dishMenus: 90,
          priceMenus: 20,
          ingredientMenus: 80,
          imageMenus: 90,
          ocrCandidates: 100,
          ocrFailures: 0,
          dishCoverage: 0.9,
          priceCoverage: 0.2,
          ingredientCoverage: 0.8,
          imageCoverage: 0.9,
          primaryNextAction: "source_image_route_review",
        },
      ],
      prioritizedActions: [{ id: "source_image_route_review" }],
    },
    runPlan: {
      summary: {
        storageOk: true,
        pendingImages: 0,
        localRunnableImages: 0,
        estimatedLocalRuntimeMinutes: 0,
        metadataOnlyCandidates: 4,
      },
      metadataOnlyQueue: {
        candidates: 4,
        pendingImages: 0,
        bySource: { cornell_nestle_menu_collection: 4 },
        sourceCommands: [{ command: "npm run enrich:cornell -- --limit=2500" }],
      },
      localBatches: [],
      graphGapQueue: { summary: { actionableLocalOcrGaps: 0 } },
    },
    recipeBridge: { summary: { clusters: 10, totalCandidateClusters: 10 } },
    storagePreflight: { ok: true, availableFormatted: "3.5 GB", minFreeFormatted: "1.0 GB" },
  },
  { generatedAt: "2026-06-03T00:00:00.000Z" }
);

assert.strictEqual(exhaustedLocalPayload.summary.recommendedNext, "run_metadata_refresh");
assert(exhaustedLocalPayload.workstreams.some((stream) => stream.id === "price_gap_pass" && stream.status === "monitor"));

const sourceRouteReviewPayload = buildAssimilationPlanPayload(
  {
    coverageReport: {
      records: [
        {
          sourceId: "cornell_nestle_menu_collection",
          sourceKey: "cornell",
          label: "Cornell",
          sourceType: "menu",
          rowCount: 10,
          dishMenus: 2,
          priceMenus: 1,
          ingredientMenus: 1,
          imageMenus: 0,
          ocrCandidates: 10,
          ocrFailures: 0,
          dishCoverage: 0.2,
          priceCoverage: 0.1,
          ingredientCoverage: 0.1,
          imageCoverage: 0,
          primaryNextAction: "iiif_image_assessment",
        },
      ],
      prioritizedActions: [{ id: "iiif_image_assessment" }],
    },
    runPlan: {
      summary: {
        storageOk: true,
        pendingImages: 0,
        localRunnableImages: 0,
        estimatedLocalRuntimeMinutes: 0,
        metadataOnlyCandidates: 0,
        metadataOnlyReviewCandidates: 4,
      },
      metadataOnlyQueue: {
        candidates: 0,
        reviewCandidates: 4,
        pendingImages: 0,
        bySource: {},
        reviewBySource: { cornell_nestle_menu_collection: 4 },
      },
      localBatches: [],
      sourceRefresh: {
        sources: [
          {
            sourceId: "cornell_nestle_menu_collection",
            primaryNextAction: "iiif_image_assessment",
            command: "",
          },
        ],
      },
      graphGapQueue: { summary: { actionableLocalOcrGaps: 0 } },
    },
    recipeBridge: { summary: { clusters: 10, totalCandidateClusters: 10 } },
    sourceRouteReview: {
      summary: {
        sources: 1,
        metadataOnlyReviewCandidates: 4,
        failedReviewCandidates: 0,
        sourceRouteSources: 0,
        iiifReviewSources: 1,
        imageRouteReviewSources: 0,
        recommendedNext: "review_source_routes",
      },
      records: [{ sourceId: "cornell_nestle_menu_collection" }],
    },
    storagePreflight: { ok: true, availableFormatted: "3.5 GB", minFreeFormatted: "1.0 GB" },
  },
  { generatedAt: "2026-06-03T00:00:00.000Z" }
);

assert.strictEqual(sourceRouteReviewPayload.summary.recommendedNext, "source_route_review");
assert.strictEqual(sourceRouteReviewPayload.summary.metadataOnlyQueue.reviewCandidates, 4);
assert.strictEqual(sourceRouteReviewPayload.summary.sourceRouteReview.sources, 1);
assert.strictEqual(sourceRouteReviewPayload.summary.sourceRouteReview.iiifReviewSources, 1);
assert(sourceRouteReviewPayload.workstreams.some((stream) => stream.id === "source_route_review_queue" && stream.status === "ready"));
assert(sourceRouteReviewPayload.workstreams.some((stream) => stream.id === "metadata_only_queue" && stream.status === "source_route_review"));

const args = optionsFromArgs(["--dry-run", "--gap-limit=12", "--output=/tmp/assimilation.json"]);
assert.strictEqual(args.dryRun, true);
assert.strictEqual(args.gapLimit, 12);
assert.strictEqual(args.outputPath, "/tmp/assimilation.json");

console.log("assimilation plan tests passed");
