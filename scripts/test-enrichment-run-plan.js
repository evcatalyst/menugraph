const assert = require("assert");
const {
  buildRunPlanPayload,
  candidateStatus,
  costEstimate,
  graphGapQueuePlan,
  metadataOnlyQueuePlan,
  optionsFromArgs,
  pendingImages,
  sourceRefreshRows,
} = require("./build-enrichment-run-plan");

assert.strictEqual(candidateStatus({}), "pending");
assert.strictEqual(candidateStatus({ processing: { status: "partial" } }), "partial");
assert.strictEqual(pendingImages({ estimatedImages: 3 }), 3);
assert.strictEqual(pendingImages({ route: "metadata_only_no_image", estimatedImages: 0 }), 0);
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
  {
    sourceId: "tulane_louisiana_menu_collection",
    label: "Tulane",
    sourceType: "menu",
    rowCount: 0,
    dishCoverage: 0,
    priceCoverage: 0,
    imageCoverage: 0,
    primaryNextAction: "source_route_review",
    nextActions: [{ id: "source_route_review" }],
  },
  {
    sourceId: "cornell_nestle_menu_collection",
    label: "Cornell",
    sourceType: "menu",
    rowCount: 765,
    dishCoverage: 0.9,
    priceCoverage: 0.9,
    imageCoverage: 0.2,
    primaryNextAction: "iiif_image_assessment",
    nextActions: [{ id: "iiif_image_assessment" }],
  },
]);
assert.strictEqual(refreshRows.length, 3);
assert.strictEqual(refreshRows[0].sourceId, "tulane_louisiana_menu_collection");
assert.strictEqual(refreshRows[0].command, "");
assert.strictEqual(refreshRows[1].sourceId, "denver_menu_collection");
assert(refreshRows[1].command.includes("enrich:denver"));
assert.strictEqual(refreshRows[2].sourceId, "cornell_nestle_menu_collection");
assert.strictEqual(refreshRows[2].command, "");

const payload = buildRunPlanPayload(
  {
    ocrQueue: {
      summary: {
        progressiveRunPlan: {
          runs: [
            {
              label: "source_price_gap_cia",
              candidates: 1,
              estimatedImages: 2,
              topCandidateIds: ["ocrtriage:1"],
              command: "npm run enrich:ocr:local -- --limit=25 --batch=all --source=cia --tier=easy --pages-per-menu=1",
              sourceKey: "cia",
              sourceId: "cia_menu_collection",
              priorityBasis: {
                observedProcessed: 20,
                observedDishMentions: 60,
                observedPriceObservations: 20,
                observedYieldMultiplier: 1.25,
              },
            },
            {
              label: "source_price_gap_lapl",
              candidates: 1,
              estimatedImages: 1,
              topCandidateIds: ["ocrtriage:3"],
              command: "npm run enrich:ocr:local -- --limit=25 --batch=all --source=lapl --tier=easy --pages-per-menu=1",
              sourceKey: "lapl",
              sourceId: "lapl_menu_collection",
              priorityBasis: {
                observedProcessed: 10,
                observedDishMentions: 250,
                observedPriceObservations: 100,
                observedYieldMultiplier: 1.25,
              },
            },
          ],
        },
      },
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
        {
          id: "ocrtriage:4",
          menuId: "cornell:1",
          sourceId: "cornell_nestle_menu_collection",
          sourceKey: "cornell",
          title: "Metadata-only menu",
          route: "metadata_only_no_image",
          localTier: "metadata_only",
          estimatedImages: 0,
          priorityRank: 4,
          processing: { status: "pending", pendingImages: 0 },
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
    graphEnrichmentGaps: {
      records: {
        "gap:source:cia": {
          id: "gap:source:cia",
          type: "source_enrichment_gap_summary",
          sourceId: "cia_menu_collection",
          sourceKey: "cia",
          menuCount: 100,
          missingDishMenus: 60,
          missingPriceMenus: 80,
          missingIngredientMenus: 70,
          ocrCandidateMenus: 1,
          priorityScore: 600,
          topActions: { free_disk_then_local_ocr: 1 },
        },
        "gap:menu:cia-1": {
          id: "gap:menu:cia-1",
          type: "menu_enrichment_gap",
          menuId: "cia:1",
          sourceId: "cia_menu_collection",
          sourceKey: "cia",
          title: "Sample menu",
          missing: ["dish", "price", "ingredient"],
          priorityScore: 92,
          priorityBand: "critical",
          recommendedAction: "free_disk_then_local_ocr",
          route: "local_ocr",
          localTier: "easy",
          estimatedImages: 2,
          candidateId: "ocrtriage:1",
          confidence: 0.82,
          provenance: { sourceFile: "graph/menu-overlays", method: "test_gap_rollup" },
        },
        "gap:menu:lapl-1": {
          id: "gap:menu:lapl-1",
          type: "menu_enrichment_gap",
          menuId: "lapl:1",
          sourceId: "lapl_menu_collection",
          sourceKey: "lapl",
          title: "Metadata menu",
          missing: ["ingredient"],
          priorityScore: 35,
          priorityBand: "medium",
          recommendedAction: "metadata_dish_hint_pass",
          route: "metadata_only",
          estimatedImages: 1,
        },
      },
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

assert.strictEqual(payload.summary.totalCandidates, 4);
assert.strictEqual(payload.summary.pendingCandidates, 3);
assert.strictEqual(payload.summary.pendingImages, 3);
assert.strictEqual(payload.summary.metadataOnlyCandidates, 1);
assert.strictEqual(payload.summary.metadataOnlyBySource.cornell_nestle_menu_collection, 1);
assert.strictEqual(payload.summary.storageOk, false);
assert.strictEqual(payload.summary.nextAction, "free_disk_before_ocr");
assert.strictEqual(payload.localBatches[0].blockedReason, "low_disk_preflight");
assert.strictEqual(payload.sourceTargetBatches.length, 2);
assert.strictEqual(payload.sourceTargetBatches[0].sourceKey, "lapl");
assert.strictEqual(payload.sourceTargetBatches[0].sampleCandidates[0].id, "ocrtriage:3");
assert.strictEqual(payload.sourceTargetBatches[0].blockedReason, "low_disk_preflight");
assert.strictEqual(payload.summary.sourceTargetBatches[0].observedPriceObservations, 100);
assert(payload.summary.sourceTargetBatches[0].yieldScore > payload.summary.sourceTargetBatches[1].yieldScore);
assert.strictEqual(payload.externalReview.allowedCandidates, 1);
assert.strictEqual(payload.externalReview.estimatedPilotCost.estimatedCostUsd, 0.02);
assert.strictEqual(payload.recipeBridge.targetClusterLimit, 100);
assert(payload.recipeBridge.command.includes("--cluster-limit=100"));
assert.strictEqual(payload.summary.graphGapQueue.menuGaps, 2);
assert.strictEqual(payload.summary.graphGapQueue.localOcrGaps, 1);
assert.strictEqual(payload.summary.graphGapQueue.actionableLocalOcrGaps, 1);
assert.strictEqual(payload.summary.graphGapQueue.blockedReason, "low_disk_preflight");
assert.strictEqual(payload.summary.graphGapQueue.topMissing.price, 1);
assert.strictEqual(payload.graphGapQueue.localBatches[0].runnable, false);
assert(payload.graphGapQueue.localBatches[0].command.includes("--candidate-ids=ocrtriage:1"));
assert.strictEqual(payload.graphGapQueue.summary.sampleGaps[0].provenance.method, "test_gap_rollup");
assert(payload.recommendedSequence.some((step) => step.step === "graph_gap_queue" && step.status === "blocked_low_disk"));
assert(payload.recommendedSequence.some((step) => step.step === "metadata_only_queue" && step.status === "ready"));
assert.strictEqual(payload.metadataOnlyQueue.pendingImages, 0);
assert.strictEqual(payload.metadataOnlyQueue.sourceCommands[0].command, "npm run enrich:cornell -- --limit=2500");
assert.strictEqual(payload.recommendedSequence[0].status, "required");
assert(!JSON.stringify(payload).includes("data:image/"), "run plan must not contain image blobs");

const metadataPlan = metadataOnlyQueuePlan(
  [
    {
      id: "ocrtriage:meta",
      sourceId: "cornell_nestle_menu_collection",
      sourceKey: "cornell",
      route: "metadata_only_no_image",
      localTier: "metadata_only",
      estimatedImages: 0,
      processing: { status: "pending", pendingImages: 0 },
    },
  ],
  { sampleLimit: 1 }
);
assert.strictEqual(metadataPlan.candidates, 1);
assert.strictEqual(metadataPlan.pendingImages, 0);

const metadataReviewPlan = metadataOnlyQueuePlan(
  [
    {
      id: "ocrtriage:meta-review",
      sourceId: "cornell_nestle_menu_collection",
      sourceKey: "cornell",
      route: "metadata_only_no_image",
      localTier: "metadata_only",
      estimatedImages: 0,
      processing: { status: "metadata_only_review", pendingImages: 0 },
    },
  ],
  { sampleLimit: 1 }
);
assert.strictEqual(metadataReviewPlan.status, "source_route_review");
assert.strictEqual(metadataReviewPlan.candidates, 0);
assert.strictEqual(metadataReviewPlan.reviewCandidates, 1);
assert.strictEqual(metadataReviewPlan.reviewBySource.cornell_nestle_menu_collection, 1);

const graphQueue = graphGapQueuePlan(
  {
    records: [
      {
        id: "gap:menu:cia-2",
        type: "menu_enrichment_gap",
        menuId: "cia:2",
        sourceId: "cia_menu_collection",
        sourceKey: "cia",
        title: "Runnable graph gap",
        missing: ["price"],
        priorityScore: 100,
        priorityBand: "critical",
        recommendedAction: "run_local_ocr",
        route: "local_ocr",
        estimatedImages: 1,
        candidateId: "ocrtriage:2",
      },
    ],
  },
  { storageOk: true, batchSize: 10, sampleLimit: 4 }
);
assert.strictEqual(graphQueue.summary.runnable, true);
assert.strictEqual(graphQueue.summary.actionableLocalOcrGaps, 1);
assert.strictEqual(graphQueue.localBatches[0].runnable, true);
assert(graphQueue.localBatches[0].command.includes("--candidate-ids=ocrtriage:2"));

const filteredGraphQueue = graphGapQueuePlan(
  {
    records: [
      {
        id: "gap:menu:cia-processed",
        type: "menu_enrichment_gap",
        menuId: "cia:processed",
        sourceId: "cia_menu_collection",
        sourceKey: "cia",
        title: "Already attempted graph gap",
        missing: ["price"],
        priorityScore: 100,
        priorityBand: "critical",
        recommendedAction: "run_local_ocr",
        route: "local_ocr",
        estimatedImages: 1,
        candidateId: "ocrtriage:processed",
      },
      {
        id: "gap:menu:cia-pending",
        type: "menu_enrichment_gap",
        menuId: "cia:pending",
        sourceId: "cia_menu_collection",
        sourceKey: "cia",
        title: "Pending graph gap",
        missing: ["price"],
        priorityScore: 20,
        priorityBand: "high",
        recommendedAction: "run_local_ocr",
        route: "local_ocr",
        estimatedImages: 1,
        candidateId: "ocrtriage:pending",
      },
    ],
  },
  { storageOk: true, batchSize: 10, actionableCandidateIds: new Set(["ocrtriage:pending"]) }
);
assert.strictEqual(filteredGraphQueue.summary.localOcrGaps, 2);
assert.strictEqual(filteredGraphQueue.summary.actionableLocalOcrGaps, 1);
assert(filteredGraphQueue.localBatches[0].command.includes("--candidate-ids=ocrtriage:pending"));
assert(!filteredGraphQueue.localBatches[0].command.includes("ocrtriage:processed"));

const args = optionsFromArgs(["--dry-run", "--batch-size=25", "--external-cost-per-image=0.03", "--output=/tmp/run-plan.json"]);
assert.strictEqual(args.dryRun, true);
assert.strictEqual(args.batchSize, 25);
assert.strictEqual(args.externalCostPerImageUsd, 0.03);
assert.strictEqual(args.outputPath, "/tmp/run-plan.json");

console.log("enrichment run plan tests passed");
