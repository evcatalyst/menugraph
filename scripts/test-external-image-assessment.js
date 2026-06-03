const assert = require("assert");
const {
  assessmentUrlsFor,
  dimensionsFromIiifPayload,
  mergeImageFeature,
  optionsFromArgs,
  orientationFor,
} = require("./external-image-assessment");

function run() {
  assert.strictEqual(orientationFor(1200, 800), "landscape");
  assert.strictEqual(orientationFor(800, 1200), "portrait");
  assert.strictEqual(orientationFor(1000, 970), "square");

  const infoDims = dimensionsFromIiifPayload({ width: 2400, height: 3200, type: "ImageService3" }, "https://example.test/info.json");
  assert.deepStrictEqual(
    {
      width: infoDims.width,
      height: infoDims.height,
      aspectRatio: infoDims.aspectRatio,
      orientation: infoDims.orientation,
      sourceKind: infoDims.sourceKind,
    },
    { width: 2400, height: 3200, aspectRatio: 0.75, orientation: "portrait", sourceKind: "iiif_info" }
  );

  const v3Dims = dimensionsFromIiifPayload({
    items: [
      {
        width: 3200,
        height: 1800,
        items: [{ items: [{ body: { format: "image/jpeg" } }] }],
      },
    ],
  });
  assert.strictEqual(v3Dims.orientation, "landscape");
  assert.strictEqual(v3Dims.sourceKind, "iiif_manifest");

  const v2Dims = dimensionsFromIiifPayload({
    sequences: [
      {
        canvases: [
          {
            width: 1000,
            height: 1500,
            images: [{ resource: { format: "image/jp2" } }],
          },
        ],
      },
    ],
  });
  assert.strictEqual(v2Dims.mediaType, "image/jp2");
  assert.strictEqual(v2Dims.orientation, "portrait");

  const record = {
    id: "milwaukee:204",
    menuId: "milwaukee:204",
    sourceId: "milwaukee_historic_menus",
    sourceKey: "milwaukee",
    sourceRecordId: "204",
    pageCount: 2,
    imageUri: "https://example.test/image.jpg",
    iiifInfoUri: "https://example.test/info.json",
    provenance: { sourceFile: "fixture.json" },
    imageFeatures: [
      {
        id: "existing-image",
        menuId: "milwaukee:204",
        scalar: { pageCount: 2, hasImageUri: true, hasIiifInfo: true },
      },
    ],
  };
  const features = mergeImageFeature(record, infoDims, "https://example.test/info.json");
  assert.strictEqual(features.length, 1);
  assert.strictEqual(features[0].id, "existing-image");
  assert.strictEqual(features[0].featureType, "iiif_metadata_assessed");
  assert.strictEqual(features[0].scalar.width, 2400);
  assert.strictEqual(features[0].scalar.pageCount, 2);
  assert.strictEqual(features[0].provenance.assessmentSourceKind, "iiif_info");

  const compoundRecord = {
    id: "uw:866",
    menuId: "uw:866",
    sourceId: "uw_menus_collection",
    sourceKey: "uw",
    sourceRecordId: "866",
    pageIds: ["862", "863", "864", "865", "999"],
    iiifInfoUri: "https://digitalcollections.lib.washington.edu/iiif/2/menus:866/info.json",
    imageFeatures: [
      {
        id: "uw-image",
        menuId: "uw:866",
        iiifInfoUri: "https://digitalcollections.lib.washington.edu/iiif/2/menus:866/info.json",
        scalar: { pageCount: 4, hasIiifInfo: true },
      },
    ],
  };
  assert.deepStrictEqual(assessmentUrlsFor(compoundRecord), [
    "https://digitalcollections.lib.washington.edu/iiif/2/menus:866/info.json",
    "https://digitalcollections.lib.washington.edu/iiif/2/menus:862/info.json",
    "https://digitalcollections.lib.washington.edu/iiif/2/menus:863/info.json",
    "https://digitalcollections.lib.washington.edu/iiif/2/menus:864/info.json",
    "https://digitalcollections.lib.washington.edu/iiif/2/menus:865/info.json",
  ]);
  const fallbackFeatures = mergeImageFeature(compoundRecord, infoDims, "https://digitalcollections.lib.washington.edu/iiif/2/menus:862/info.json");
  assert.strictEqual(fallbackFeatures[0].id, "uw-image");
  assert.strictEqual(fallbackFeatures[0].iiifInfoUri, "https://digitalcollections.lib.washington.edu/iiif/2/menus:862/info.json");
  assert.strictEqual(fallbackFeatures[0].scalar.pageCount, 4);

  const options = optionsFromArgs(["--source=milwaukee_historic_menus,lapl_menu_collection", "--limit=20", "--timeout-ms=9000", "--concurrency=4", "--refresh", "--dry-run"]);
  assert.deepStrictEqual(options.sources, ["milwaukee_historic_menus", "lapl_menu_collection"]);
  assert.strictEqual(options.limit, 20);
  assert.strictEqual(options.timeoutMs, 9000);
  assert.strictEqual(options.concurrency, 4);
  assert.strictEqual(options.refresh, true);
  assert.strictEqual(options.dryRun, true);

  console.log("external image assessment tests passed");
}

run();
