const assert = require("assert");
const {
  buildOcrFailureReport,
  classifyOcrError,
  dedupeExtractionRecords,
  imageUrlsForRecord,
  imageUrlsForIiifManifestPayload,
  iiifServiceImageUrl,
  menuLike,
  optionsFromArgs,
  resizedIiifImageUrlFromInfo,
  selectOcrCandidates,
  textSpansFromOcr,
} = require("./local-vision-ocr-enrichment");

const laplPageUrl = resizedIiifImageUrlFromInfo("https://tessa2.lapl.org/iiif/2/menus:1247/info.json", "1245", 1200);
assert.strictEqual(laplPageUrl, "https://tessa2.lapl.org/iiif/2/menus:1245/full/1200,/0/default.jpg");

const laplUrls = imageUrlsForRecord(
  {
    sourceKey: "lapl",
    iiifInfoUri: "https://tessa2.lapl.org/iiif/2/menus:1247/info.json",
    pageIds: ["1245", "1246", "1247"],
  },
  { imageWidth: 1000, pagesPerMenu: 2 }
);
assert.deepStrictEqual(laplUrls, [
  "https://tessa2.lapl.org/iiif/2/menus:1245/full/1000,/0/default.jpg",
  "https://tessa2.lapl.org/iiif/2/menus:1246/full/1000,/0/default.jpg",
]);

const ciaUrls = imageUrlsForRecord(
  {
    sourceKey: "cia",
    imageUrl: "https://ciadigitalcollections.culinary.edu/digital/api/singleitem/image/p16940coll1/14159/default.jpg",
  },
  { imageWidth: 1000, pagesPerMenu: 2 }
);
assert.deepStrictEqual(ciaUrls, ["https://ciadigitalcollections.culinary.edu/digital/api/singleitem/image/p16940coll1/14159/default.jpg"]);

const uhFallbackUrls = imageUrlsForRecord(
  {
    sourceKey: "uh",
    thumbnailUrl: "https://digitalcollections.lib.uh.edu/downloads/f7623d15f?file=thumbnail",
    imageFeatures: [
      {
        sourceImageUrl: "https://digitalcollections.lib.uh.edu/downloads/f7623d15f?file=thumbnail",
      },
    ],
  },
  { imageWidth: 1000, pagesPerMenu: 1 }
);
assert.deepStrictEqual(uhFallbackUrls, ["https://digitalcollections.lib.uh.edu/downloads/f7623d15f?file=thumbnail"]);

assert.strictEqual(
  iiifServiceImageUrl(
    { "@id": "https://media.lib.uh.edu/images/q237hs53h%2Ffiles%2F647aa5e8-589e-489f-b203-4efdd8905103" },
    "",
    1200
  ),
  "https://media.lib.uh.edu/images/q237hs53h%2Ffiles%2F647aa5e8-589e-489f-b203-4efdd8905103/full/1200,/0/default.jpg"
);

const uhManifestUrls = imageUrlsForIiifManifestPayload(
  {
    "@type": "sc:Manifest",
    sequences: [
      {
        canvases: [
          {
            "@type": "sc:Canvas",
            width: 640,
            height: 480,
            images: [
              {
                resource: {
                  "@type": "dctypes:Image",
                  "@id": "https://media.lib.uh.edu/images/q237hs53h%2Ffiles%2F647aa5e8-589e-489f-b203-4efdd8905103/full/600,/0/default.jpg",
                  service: {
                    "@id": "https://media.lib.uh.edu/images/q237hs53h%2Ffiles%2F647aa5e8-589e-489f-b203-4efdd8905103",
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  },
  { imageWidth: 1000, pagesPerMenu: 1 }
);
assert.deepStrictEqual(uhManifestUrls, [
  "https://media.lib.uh.edu/images/q237hs53h%2Ffiles%2F647aa5e8-589e-489f-b203-4efdd8905103/full/1000,/0/default.jpg",
]);

const v3ManifestUrls = imageUrlsForIiifManifestPayload(
  {
    type: "Manifest",
    items: [
      {
        type: "Canvas",
        items: [
          {
            items: [
              {
                body: [
                  {
                    type: "Image",
                    id: "https://example.org/iiif/image-id/full/max/0/default.jpg",
                    service: [{ id: "https://example.org/iiif/image-id", type: "ImageService2" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { imageWidth: 900, pagesPerMenu: 1 }
);
assert.deepStrictEqual(v3ManifestUrls, ["https://example.org/iiif/image-id/full/900,/0/default.jpg"]);

const menu = menuLike(
  { menuId: "lapl:1247", sourceKey: "lapl", sourceRecordId: "1247", title: "A. Sabella's Capri Room" },
  { placeText: "San Francisco, California", pointYear: 1954, country: "United States" }
);
assert.strictEqual(menu.id, "lapl:1247");
assert.strictEqual(menu.city, "San Francisco");
assert.strictEqual(menu.state, "California");
assert.strictEqual(menu.country, "United States");
assert.strictEqual(menu.year, 1954);

const spans = textSpansFromOcr({
  menuId: "cia:1",
  candidateId: "ocrtriage:1",
  pageIndex: 1,
  evidenceLines: new Set([2, 4]),
  lines: [
    { text: "Decorative cover text", confidence: 0.91, bbox: { x: 0.1, y: 0.8, width: 0.2, height: 0.03 } },
    { text: "Clam chowder .35", confidence: 0.82, bbox: { x: 0.1, y: 0.7, width: 0.3, height: 0.03 } },
    { text: "Telephone Main 1212", confidence: 0.77, bbox: { x: 0.1, y: 0.6, width: 0.25, height: 0.03 } },
    { text: "Roast beef $1.25", confidence: 0.88, bbox: { x: 0.1, y: 0.5, width: 0.3, height: 0.03 } },
  ],
});
assert.strictEqual(spans.length, 2);
assert.deepStrictEqual(
  spans.map((span) => span.text),
  ["Clam chowder .35", "Roast beef $1.25"]
);
assert(spans.every((span) => span.publicSafe), "only public-safe evidence spans should be emitted");

const options = optionsFromArgs(["--limit=3", "--source=cia", "--tier=easy", "--pages-per-menu=1", "--image-width=1200", "--dry-run"]);
assert.strictEqual(options.limit, 3);
assert.strictEqual(options.source, "cia");
assert.strictEqual(options.tier, "easy");
assert.strictEqual(options.pagesPerMenu, 1);
assert.strictEqual(options.imageWidth, 1200);
assert.strictEqual(options.dryRun, true);

const retryOptions = optionsFromArgs(["--limit=10", "--retry-errors", "--batch=all"]);
assert.strictEqual(retryOptions.retryErrors, true);
assert.deepStrictEqual(
  selectOcrCandidates(
    [
      { id: "ocrtriage:a", priorityRank: 3, priorityBatch: "phase1", sourceKey: "cia", sourceId: "cia_menu_collection", localTier: "easy" },
      { id: "ocrtriage:b", priorityRank: 2, priorityBatch: "phase1", sourceKey: "lapl", sourceId: "lapl_menu_collection", localTier: "easy" },
      { id: "ocrtriage:c", priorityRank: 1, priorityBatch: "phase1", sourceKey: "cia", sourceId: "cia_menu_collection", localTier: "easy" },
    ],
    [
      { status: "ok", candidateId: "ocrtriage:a", pageNumber: 1 },
      { status: "error", candidateId: "ocrtriage:b", pageNumber: 1 },
    ],
    retryOptions
  ).map((candidate) => candidate.id),
  ["ocrtriage:b"],
  "retry-errors should select only candidates with previous error records"
);

assert.deepStrictEqual(
  selectOcrCandidates(
    [
      { id: "ocrtriage:a", priorityRank: 1, priorityBatch: "phase1", sourceKey: "uw", sourceId: "uw_menus_collection", localTier: "easy" },
      { id: "ocrtriage:b", priorityRank: 2, priorityBatch: "phase1", sourceKey: "uw", sourceId: "uw_menus_collection", localTier: "easy" },
    ],
    [
      { status: "error", candidateId: "ocrtriage:a", pageNumber: 1 },
      { status: "error", candidateId: "ocrtriage:b", pageNumber: 1 },
    ],
    {
      ...retryOptions,
      retryErrors: false,
      retryRetryable: true,
      retryCandidateIds: new Set(["ocrtriage:b"]),
    }
  ).map((candidate) => candidate.id),
  ["ocrtriage:b"],
  "retry-retryable should select only candidates classified as retryable"
);

assert.deepStrictEqual(classifyOcrError("HTTP 403"), {
  errorClass: "access_denied",
  retryable: false,
  nextAction: "source_access_review",
});
assert.deepStrictEqual(classifyOcrError("socket hang up"), {
  errorClass: "transient_network",
  retryable: true,
  nextAction: "retry_local",
});

const failureReport = buildOcrFailureReport({
  generatedAt: "2026-06-03T00:00:00.000Z",
  queueRecords: [
    {
      id: "ocrtriage:b",
      title: "Sample Menu",
      sourceId: "lapl_menu_collection",
      localTier: "difficult",
      route: "external_llm_review",
      priorityRank: 42,
      priorityBatch: "phase1",
      valueScore: 8,
      difficultyScore: 6,
    },
  ],
  records: [
    {
      status: "error",
      candidateId: "ocrtriage:b",
      menuId: "lapl:1",
      sourceId: "lapl_menu_collection",
      sourceKey: "lapl",
      sourceRecordId: "1",
      pageNumber: 1,
      imageHash: "abc",
      errorMessage: "HTTP 501",
    },
    {
      status: "error",
      candidateId: "ocrtriage:c",
      menuId: "cia:2",
      sourceId: "cia_menu_collection",
      sourceKey: "cia",
      sourceRecordId: "2",
      pageNumber: 1,
      imageHash: "def",
      errorMessage: "socket hang up",
    },
  ],
});
assert.strictEqual(failureReport.summary.total, 2);
assert.strictEqual(failureReport.summary.retryable, 1);
assert.strictEqual(failureReport.summary.byClass.unsupported_image_endpoint, 1);
assert.strictEqual(failureReport.summary.byClass.transient_network, 1);
assert.strictEqual(failureReport.records[0].nextAction, "retry_local");
assert(!JSON.stringify(failureReport).includes("data:image/"), "failure report must not include image blobs");

const deduped = dedupeExtractionRecords([
  { id: "old-error", status: "error", candidateId: "ocrtriage:1", pageNumber: 1, imageHash: "a" },
  { id: "old-ok", status: "ok", candidateId: "ocrtriage:2", pageNumber: 1, imageHash: "b" },
  { id: "new-ok", status: "ok", candidateId: "ocrtriage:2", pageNumber: 1, imageHash: "c" },
  { id: "recovered-ok", status: "ok", candidateId: "ocrtriage:1", pageNumber: 1, imageHash: "d" },
]);
assert.deepStrictEqual(
  deduped.map((record) => record.id),
  ["new-ok", "recovered-ok"]
);

const dedupedFailures = dedupeExtractionRecords([
  { id: "old-error", status: "error", candidateId: "ocrtriage:3", pageNumber: 1, imageHash: "a" },
  { id: "new-error", status: "error", candidateId: "ocrtriage:3", pageNumber: 1, imageHash: "b" },
]);
assert.deepStrictEqual(
  dedupedFailures.map((record) => record.id),
  ["new-error"],
  "latest failure should replace older failure for the same candidate page"
);

console.log("local Vision OCR enrichment tests passed");
