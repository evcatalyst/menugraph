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
      localBatches: [{ command: "npm run enrich:ocr:local -- --limit=50", runnable: false }],
      graphGapQueue: {
        summary: {
          menuGaps: 2,
          localOcrGaps: 1,
          metadataGaps: 1,
          estimatedImages: 2,
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
assert(payload.workstreams.some((stream) => stream.id === "metadata_source_refresh" && stream.status === "ready"));
assert(payload.workstreams.some((stream) => stream.id === "price_gap_pass" && stream.status === "blocked_low_disk"));
assert(payload.workstreams.some((stream) => stream.id === "graph_gap_queue_ocr" && stream.status === "blocked_low_disk"));
assert(payload.workstreams.some((stream) => stream.id === "graph_gap_queue_ocr" && stream.commands[0].includes("--candidate-ids=ocrtriage:1")));
assert(payload.workstreams.some((stream) => stream.id === "recipe_bridge_expansion" && stream.impact.targetClusters === 40000));
assert(payload.phases.some((phase) => phase.id === "now_low_storage" && phase.commands.includes("npm run enrich:retag")));
assert(payload.phases.some((phase) => phase.id === "after_disk_free" && phase.commands[0].includes("--candidate-ids=ocrtriage:1")));
assert(!JSON.stringify(payload).includes("data:image/"), "assimilation plan must not contain image blobs");

const args = optionsFromArgs(["--dry-run", "--gap-limit=12", "--output=/tmp/assimilation.json"]);
assert.strictEqual(args.dryRun, true);
assert.strictEqual(args.gapLimit, 12);
assert.strictEqual(args.outputPath, "/tmp/assimilation.json");

console.log("assimilation plan tests passed");
