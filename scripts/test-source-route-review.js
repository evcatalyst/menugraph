const assert = require("assert");
const {
  buildReviewPayload,
  compactCandidate,
  coverageReviewTypes,
  optionsFromArgs,
  recordList,
  statusFor,
} = require("./build-source-route-review");

assert.deepStrictEqual(recordList({ records: { a: { id: "a" }, b: { id: "b" } } }).map((row) => row.id), ["a", "b"]);

assert.deepStrictEqual(
  coverageReviewTypes({
    primaryNextAction: "iiif_image_assessment",
    nextActions: [{ id: "source_image_route_review" }],
    ocrFailures: 2,
  }).sort(),
  ["iiif_image_assessment", "source_image_route_review"]
);

const compact = compactCandidate({
  id: "ocrtriage:1",
  menuId: "cornell:1",
  sourceId: "cornell_nestle_menu_collection",
  sourceKey: "cornell",
  title: "A".repeat(200),
  route: "metadata_only_no_image",
  localTier: "metadata_only",
  priorityScore: 49.129,
  processing: { status: "metadata_only_review" },
  rawOcrText: "should not be copied",
  provenance: { sourceFile: "enrichment/external-sources/cornell.json", sourceRecordId: "1" },
});
assert.strictEqual(compact.title.length, 140);
assert.strictEqual(compact.status, "metadata_only_review");
assert.strictEqual(compact.rawOcrText, undefined);

assert.strictEqual(statusFor({ reviewTypes: new Set(["source_route_review"]) }), "needs_source_route_decision");
assert.strictEqual(statusFor({ reviewTypes: new Set(["source_image_route_review"]) }), "needs_image_route_review");
assert.strictEqual(statusFor({ reviewTypes: new Set(["iiif_image_assessment"]) }), "needs_iiif_assessment");

const payload = buildReviewPayload(
  {
    storagePreflight: { ok: true, availableFormatted: "3.4 GB", minFreeFormatted: "1.0 GB" },
    coverageReport: {
      records: [
        {
          sourceId: "cornell_nestle_menu_collection",
          sourceKey: "cornell",
          label: "Cornell",
          sourceType: "menu",
          rowCount: 10,
          dishCoverage: 0.4,
          priceCoverage: 0.1,
          ingredientCoverage: 0.2,
          imageCoverage: 0,
          ocrCandidates: 4,
          ocrProcessedMenus: 0,
          ocrFailures: 0,
          primaryNextAction: "iiif_image_assessment",
          nextActions: [{ id: "iiif_image_assessment", label: "Assess IIIF", priority: 5.9, reason: "thin coverage" }],
        },
        {
          sourceId: "tulane_louisiana_menu_collection",
          sourceKey: "tulane",
          label: "Tulane",
          sourceType: "menu",
          rowCount: 0,
          primaryNextAction: "source_route_review",
          nextActions: [{ id: "source_route_review", label: "Review route", priority: 6.8, reason: "no bulk route" }],
        },
      ],
    },
    sourceProbes: {
      records: [
        {
          sourceId: "tulane_louisiana_menu_collection",
          sourceKey: "tulane",
          label: "Tulane",
          sourceType: "menu",
          recommendedNextAction: "source_route_review",
          routeStatus: "needs_metadata_route_review",
          routeBlocker: "Stable bulk route is not verified.",
          sourceUrl: "https://example.test/tulane",
          accessMethod: "public pages",
        },
      ],
    },
    ocrQueue: {
      records: [
        {
          id: "ocrtriage:cornell:1",
          menuId: "cornell:1",
          sourceId: "cornell_nestle_menu_collection",
          sourceKey: "cornell",
          title: "Alice's",
          route: "metadata_only_no_image",
          localTier: "metadata_only",
          priorityScore: 49,
          processing: { status: "metadata_only_review" },
        },
        {
          id: "ocrtriage:cia:1",
          menuId: "cia:1",
          sourceId: "cia_menu_collection",
          sourceKey: "cia",
          title: "Failed CIA",
          route: "local_ocr",
          localTier: "medium",
          priorityScore: 20,
          processing: { status: "failed_review" },
        },
      ],
    },
    ocrFailures: {
      records: [
        {
          id: "failure:cia:1",
          candidateId: "ocrtriage:cia:1",
          menuId: "cia:1",
          sourceId: "cia_menu_collection",
          sourceKey: "cia",
          errorClass: "access_denied",
          retryable: false,
          nextAction: "review_route",
        },
      ],
    },
    graphEnrichmentGaps: {
      records: {
        "gap:menu:cia:1": {
          id: "gap:menu:cia:1",
          type: "menu_enrichment_gap",
          menuId: "cia:1",
          sourceId: "cia_menu_collection",
          sourceKey: "cia",
          title: "Failed CIA",
          missing: ["price", "image"],
          recommendedAction: "source_image_route_review",
          priorityScore: 21,
        },
      },
    },
    runPlan: {
      sourceRefresh: {
        sources: [{ sourceId: "cornell_nestle_menu_collection", primaryNextAction: "iiif_image_assessment" }],
      },
    },
  },
  { generatedAt: "2026-06-04T00:00:00.000Z", sampleLimit: 2 }
);

assert.strictEqual(payload.summary.sources, 3);
assert.strictEqual(payload.summary.metadataOnlyReviewCandidates, 1);
assert.strictEqual(payload.summary.failedReviewCandidates, 1);
assert.strictEqual(payload.summary.nonRetryableFailures, 1);
assert.strictEqual(payload.summary.sourceRouteSources, 1);
assert.strictEqual(payload.summary.iiifReviewSources, 1);
assert.strictEqual(payload.summary.imageRouteReviewSources, 1);
assert.strictEqual(payload.summary.recommendedNext, "review_source_routes");

const cornell = payload.records.find((row) => row.sourceId === "cornell_nestle_menu_collection");
assert(cornell.reviewTypes.includes("metadata_only_no_image"));
assert(cornell.reviewTypes.includes("iiif_image_assessment"));
assert.strictEqual(cornell.sampleCandidates.length, 1);
assert(cornell.requiredDecisions.some((item) => /image\/IIIF routes/i.test(item)));

const tulane = payload.records.find((row) => row.sourceId === "tulane_louisiana_menu_collection");
assert.strictEqual(tulane.status, "needs_source_route_decision");
assert.strictEqual(tulane.sourceProbe.routeBlocker, "Stable bulk route is not verified.");

const cia = payload.records.find((row) => row.sourceId === "cia_menu_collection");
assert.strictEqual(cia.status, "needs_image_route_review");
assert.strictEqual(cia.sampleFailures.length, 2);
assert(cia.blockers.includes("access_denied"));

const serialized = JSON.stringify(payload);
assert(!/rawOcrText/.test(serialized));
assert(!/imageBytes|base64|embedding/.test(serialized));

const options = optionsFromArgs(["--dry-run", "--output=/tmp/source-route-review.json", "--sample-limit=5"]);
assert.strictEqual(options.dryRun, true);
assert.strictEqual(options.outputPath, "/tmp/source-route-review.json");
assert.strictEqual(options.sampleLimit, 5);

console.log("source route review tests passed");
