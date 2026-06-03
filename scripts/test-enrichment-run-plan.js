const assert = require("assert");
const {
  buildRunPlanPayload,
  candidateStatus,
  costEstimate,
  optionsFromArgs,
  pendingImages,
  sourceRefreshRows,
} = require("./build-enrichment-run-plan");

assert.strictEqual(candidateStatus({}), "pending");
assert.strictEqual(candidateStatus({ processing: { status: "partial" } }), "partial");
assert.strictEqual(pendingImages({ estimatedImages: 3 }), 3);
assert.strictEqual(pendingImages({ processing: { status: "processed" }, estimatedImages: 3 }), 0);
assert.deepStrictEqual(costEstimate(25, 0.02), { images: 25, costPerImageUsd: 0.02, estimatedCostUsd: 0.5 });

const refreshRows = sourceRefreshRows([
  {
    sourceId: "denver_menu_collection",
    label: "Denver",
    sourceType: "menu",
    rowCount: 10,
    dishCoverage: 0.8,
    priceCoverage: 0.1,
    imageCoverage: 1,
    primaryNextAction: "metadata_dish_hint_pass",
    nextActions: [{ id: "metadata_dish_hint_pass" }],
  },
  {
    sourceId: "seattle_room_menu_collection",
    label: "Seattle",
    sourceType: "menu",
    rowCount: 603,
    dishCoverage: 0.9,
    priceCoverage: 0.5,
    imageCoverage: 1,
    primaryNextAction: "monitor",
    nextActions: [],
  },
]);
assert.strictEqual(refreshRows.length, 1);
assert.strictEqual(refreshRows[0].sourceId, "denver_menu_collection");
assert(refreshRows[0].command.includes("enrich:denver"));

const payload = buildRunPlanPayload(
  {
    ocrQueue: {
      records: [
        {
          id: "ocrtriage:1",
          menuId: "cia:1",
          sourceId: "cia_menu_collection",
          sourceKey: "cia",
          title: "Sample menu",
          route: "local_ocr",
          localTier: "easy",
          estimatedImages: 2,
          priorityRank: 2,
          priorityScore: 80,
          processing: { status: "pending" },
          missingEvidence: { dish: true, price: true },
        },
        {
          id: "ocrtriage:2",
          menuId: "cia:2",
          sourceId: "cia_menu_collection",
          sourceKey: "cia",
          title: "Processed menu",
          route: "local_ocr",
          localTier: "medium",
          estimatedImages: 1,
          priorityRank: 1,
          processing: { status: "processed" },
        },
        {
          id: "ocrtriage:3",
          menuId: "lapl:1",
          sourceId: "lapl_menu_collection",
          sourceKey: "lapl",
          title: "External allowed sample",
          route: "local_ocr",
          localTier: "medium",
          estimatedImages: 1,
          priorityRank: 3,
          routingPolicy: { externalAllowed: true },
          processing: { status: "pending" },
        },
      ],
    },
    ocrFailures: {
      records: [{ id: "fail:1", candidateId: "ocrtriage:1", menuId: "cia:1", sourceId: "cia_menu_collection", retryable: true }],
    },
    coverageReport: {
      records: refreshRows,
    },
    recipeBridge: {
      summary: { clusters: 5, totalCandidateClusters: 100, sourceCandidates: { the_sifter: 5 } },
      clusters: [],
    },
    storagePreflight: {
      ok: false,
      skipped: false,
      availableFormatted: "400 MB",
      minFreeFormatted: "1.0 GB",
    },
  },
  {
    generatedAt: "2026-06-03T00:00:00.000Z",
    batchSize: 10,
    externalCostPerImageUsd: 0.02,
    localMinutesPerImage: 1,
  }
);

assert.strictEqual(payload.summary.totalCandidates, 3);
assert.strictEqual(payload.summary.pendingCandidates, 2);
assert.strictEqual(payload.summary.pendingImages, 3);
assert.strictEqual(payload.summary.storageOk, false);
assert.strictEqual(payload.summary.nextAction, "free_disk_before_ocr");
assert.strictEqual(payload.localBatches[0].blockedReason, "low_disk_preflight");
assert.strictEqual(payload.externalReview.allowedCandidates, 1);
assert.strictEqual(payload.externalReview.estimatedPilotCost.estimatedCostUsd, 0.02);
assert.strictEqual(payload.recipeBridge.targetClusterLimit, 100);
assert(payload.recipeBridge.command.includes("--cluster-limit=100"));
assert.strictEqual(payload.recommendedSequence[0].status, "required");
assert(!JSON.stringify(payload).includes("data:image/"), "run plan must not contain image blobs");

const args = optionsFromArgs(["--dry-run", "--batch-size=25", "--external-cost-per-image=0.03", "--output=/tmp/run-plan.json"]);
assert.strictEqual(args.dryRun, true);
assert.strictEqual(args.batchSize, 25);
assert.strictEqual(args.externalCostPerImageUsd, 0.03);
assert.strictEqual(args.outputPath, "/tmp/run-plan.json");

console.log("enrichment run plan tests passed");
