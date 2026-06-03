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
assert.strictEqual(hardExternal.estimatedImages, 3);
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
const pendingPlan = progressiveRunPlan([
  { ...easyUnknown, priorityBatch: "phase1", priorityRank: 1, processing: processedEasy },
  { ...hardExternal, priorityBatch: "backlog", priorityRank: 2, processing: failedHard },
]);
assert.strictEqual(pendingPlan.runs.find((run) => run.label === "phase1_easy_local").candidates, 0);

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
