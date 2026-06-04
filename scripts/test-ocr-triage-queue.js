const assert = require("assert");
const {
  buildProcessingIndex,
  candidateForRecord,
  dedupeCandidates,
  optionsFromArgs,
  processingForCandidate,
  routeForCandidate,
  progressiveRunPlan,
  summarize,
  tierForDifficulty,
} = require("./build-ocr-triage-queue");

const easyUnknown = candidateForRecord(
  {
    menuId: "cia:100",
    sourceKey: "cia",
    sourceRecordId: "100",
    title: "Unknown dinner menu",
    decade: "unknown",
    imageUrl: "https://example.test/menu.jpg",
    pageCount: 1,
  },
  {
    localOcrAvailable: true,
    imageFeatureByMenu: new Map([
      [
        "cia:100",
        {
          scalar: {
            width: 1800,
            height: 2400,
            orientation: "portrait",
            pageCount: 1,
          },
        },
      ],
    ]),
  }
);

assert.strictEqual(easyUnknown.localTier, "easy");
assert.strictEqual(easyUnknown.route, "local_ocr");
assert(easyUnknown.missingEvidence.date, "unknown CIA menu should be a date-evidence OCR target");
assert(easyUnknown.missingEvidence.price, "menus without price evidence should stay in the OCR queue");
assert.strictEqual(easyUnknown.estimatedImages, 1);

const nyplFirstPageOnly = candidateForRecord(
  {
    menuId: "nypl:27102",
    sourceKey: "nypl",
    sourceRecordId: "27102",
    title: "NYPL first page only",
    imageUrl: "https://images.nypl.org/index.php?id=3884830&t=w",
    pageCount: 4,
    firstPage: { image_id: "3884830" },
  },
  { localOcrAvailable: true, pagesPerMenu: 2 }
);

assert.strictEqual(nyplFirstPageOnly.estimatedImages, 1, "NYPL first-page-only records should not stay partial after one OCR page");

const iiifManifestMultiPage = candidateForRecord(
  {
    menuId: "northwestern:test",
    sourceId: "northwestern_transport_menus",
    sourceKey: "northwestern",
    sourceRecordId: "test",
    title: "IIIF manifest menu",
    iiifManifestUrl: "https://example.test/manifest.json",
    pageCount: 4,
  },
  { localOcrAvailable: true, pagesPerMenu: 2 }
);

assert.strictEqual(iiifManifestMultiPage.estimatedImages, 2, "IIIF manifest records can still estimate multiple actionable pages");

const hardExternal = candidateForRecord(
  {
    menuId: "lapl:200",
    sourceId: "lapl_menu_collection",
    sourceKey: "lapl",
    sourceRecordId: "200",
    title: "Large folded menu",
    pageCount: 12,
    iiifInfoUri: "https://example.test/info.json",
  },
  { localOcrAvailable: false, pagesPerMenu: 3 }
);

assert.strictEqual(hardExternal.localTier, "hard");
assert.strictEqual(hardExternal.route, "rights_review_before_external_vlm");
assert.strictEqual(hardExternal.estimatedImages, 1);
assert(!hardExternal.routingPolicy.externalAllowed, "external routing must be blocked until rights review by default");

assert.strictEqual(tierForDifficulty(0, false), "metadata_only");
assert.strictEqual(routeForCandidate({ tier: "easy", localOcr: false, grokSafe: false }), "install_local_ocr");

assert.deepStrictEqual(
  dedupeCandidates([
    { id: "ocrtriage:1", title: "Existing" },
    { id: "ocrtriage:1", title: "Duplicate" },
    { id: "ocrtriage:2", title: "New" },
  ]).map((record) => record.title),
  ["Existing", "New"],
  "queue append should preserve the first candidate for a stable id"
);

const summary = summarize([
  { ...easyUnknown, priorityBatch: "phase1" },
  { ...hardExternal, priorityBatch: "backlog" },
]);
assert.strictEqual(summary.total, 2);
assert.strictEqual(summary.earlyBatch.candidates, 1);
assert.strictEqual(summary.byRoute.local_ocr, 1);
assert.strictEqual(summary.byRoute.rights_review_before_external_vlm, 1);
assert.strictEqual(summary.processing.pendingCandidates, 2);
assert.strictEqual(summary.progressiveRunPlan.storageEstimate.defaultPeakTempMb, 2);
assert(summary.progressiveRunPlan.runs.some((run) => run.label === "phase1_easy_local" && run.command.includes("--tier=easy")));

const processingIndex = buildProcessingIndex(
  [
    {
      candidateId: easyUnknown.id,
      status: "ok",
      dishMentionIds: ["dish:1", "dish:2"],
      priceObservationIds: ["price:1"],
    },
    {
      candidateId: hardExternal.id,
      status: "error",
    },
  ],
  [
    {
      candidateId: hardExternal.id,
      retryable: false,
      errorClass: "access_denied",
      nextAction: "source_access_review",
    },
  ]
);
const processedEasy = processingForCandidate(easyUnknown, processingIndex, 2);
assert.strictEqual(processedEasy.status, "processed");
assert.strictEqual(processedEasy.dishMentions, 2);
assert.strictEqual(processedEasy.priceObservations, 1);
const failedHard = processingForCandidate(hardExternal, processingIndex, 3);
assert.strictEqual(failedHard.status, "failed_review");
assert.strictEqual(failedHard.failureClasses.access_denied, 1);
const retryProcessingIndex = buildProcessingIndex(
  [{ candidateId: "ocrtriage:retry", status: "error" }],
  [{ candidateId: "ocrtriage:retry", retryable: true, errorClass: "transient_network", nextAction: "retry_local" }]
);
const retryableFailed = processingForCandidate({ ...easyUnknown, id: "ocrtriage:retry", estimatedImages: 1 }, retryProcessingIndex, 1);
assert.strictEqual(retryableFailed.status, "retryable_failed");
assert.strictEqual(retryableFailed.retryableFailedPages, 1);
const mixedProcessingIndex = buildProcessingIndex(
  [
    { candidateId: "ocrtriage:mixed", status: "ok", dishMentionIds: ["dish:1"], priceObservationIds: [] },
    { candidateId: "ocrtriage:mixed", status: "error" },
  ],
  [{ candidateId: "ocrtriage:mixed", retryable: false, errorClass: "access_denied", nextAction: "source_access_review" }]
);
const mixedProcessed = processingForCandidate({ ...easyUnknown, id: "ocrtriage:mixed", estimatedImages: 2 }, mixedProcessingIndex, 2);
assert.strictEqual(mixedProcessed.status, "processed");
assert.strictEqual(mixedProcessed.pendingImages, 0);
const pendingPlan = progressiveRunPlan([
  { ...easyUnknown, priorityBatch: "phase1", priorityRank: 1, processing: processedEasy },
  {
    ...easyUnknown,
    id: "ocrtriage:partial",
    priorityBatch: "phase1",
    priorityRank: 2,
    processing: { status: "partial", pendingImages: 1 },
  },
  { ...hardExternal, priorityBatch: "backlog", priorityRank: 2, processing: failedHard },
  { ...easyUnknown, id: "ocrtriage:retry", priorityBatch: "backlog", priorityRank: 3, processing: retryableFailed },
]);
assert.strictEqual(pendingPlan.runs.find((run) => run.label === "phase1_easy_local").candidates, 0);
assert.strictEqual(pendingPlan.runs.find((run) => run.label === "continue_partial_second_pages").candidates, 1);
assert(pendingPlan.runs.find((run) => run.label === "continue_partial_second_pages").command.includes("--continue-partial"));
assert.strictEqual(pendingPlan.runs.find((run) => run.label === "retryable_local_failures").estimatedImages, 1);
assert(pendingPlan.runs.find((run) => run.label === "retryable_local_failures").command.includes("--pages-per-menu=2"));

const targetedPlan = progressiveRunPlan([
  ...Array.from({ length: 20 }, (_, index) => ({
    ...easyUnknown,
    id: `ocrtriage:processed-${index}`,
    priorityBatch: "backlog",
    priorityRank: index + 1,
    processing: { status: "processed", dishMentions: 3, priceObservations: 1 },
  })),
  {
    ...easyUnknown,
    id: "ocrtriage:cia-backlog",
    priorityBatch: "backlog",
    priorityRank: 25,
    processing: { status: "pending" },
  },
]);
const targetedCiaRun = targetedPlan.runs.find((run) => run.label === "source_price_gap_cia");
assert(targetedCiaRun, "yield-aware source-targeted runs should be included for pending local OCR price gaps");
assert(targetedCiaRun.command.includes("--source=cia"));
assert.strictEqual(targetedCiaRun.priorityBasis.observedProcessed, 20);
assert(targetedCiaRun.priorityBasis.observedYieldMultiplier > 0.25);

const options = optionsFromArgs([
  "--source=milwaukee_historic_menus,uw_menus_collection",
  "--record-limit=250",
  "--early-limit=25",
  "--pages-per-menu=1",
  "--append-existing",
  "--exclude-attempted",
  "--output=/tmp/ocr-targeted.json",
]);
assert.strictEqual(options.source, "milwaukee_historic_menus,uw_menus_collection");
assert.strictEqual(options.recordLimit, 250);
assert.strictEqual(options.earlyLimit, 25);
assert.strictEqual(options.pagesPerMenu, 1);
assert.strictEqual(options.appendExisting, true);
assert.strictEqual(options.excludeAttempted, true);
assert.strictEqual(options.outputPath, "/tmp/ocr-targeted.json");

console.log("ocr triage queue tests passed");
