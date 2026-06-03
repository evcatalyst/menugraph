const assert = require("assert");
const {
  candidateForRecord,
  routeForCandidate,
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

const summary = summarize([
  { ...easyUnknown, priorityBatch: "phase1" },
  { ...hardExternal, priorityBatch: "backlog" },
]);
assert.strictEqual(summary.total, 2);
assert.strictEqual(summary.earlyBatch.candidates, 1);
assert.strictEqual(summary.byRoute.local_ocr, 1);
assert.strictEqual(summary.byRoute.rights_review_before_external_vlm, 1);

console.log("ocr triage queue tests passed");
