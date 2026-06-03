const assert = require("assert");
const {
  dedupeExtractionRecords,
  imageUrlsForRecord,
  imageUrlsForIiifManifestPayload,
  iiifServiceImageUrl,
  menuLike,
  optionsFromArgs,
  resizedIiifImageUrlFromInfo,
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

console.log("local Vision OCR enrichment tests passed");
