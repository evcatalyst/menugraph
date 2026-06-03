const assert = require("assert");
const {
  cuisineTagsFor,
  normalizeItem,
  normalizePlace,
  optionsFromArgs,
  parseDateRange,
  styleTagsFor,
  transportModeFor,
} = require("./lapl-source");

const searchItem = {
  collectionAlias: "menus",
  itemId: "1247",
  filetype: "cpd",
  thumbnailUri: "/api/singleitem/collection/menus/id/1247/thumbnail",
  itemLink: "/compoundobject/collection/menus/id/1247",
  metadataFields: [
    { field: "title", value: "A. Sabella's Capri Room, souvenir miniature menu" },
    { field: "date", value: "Circa 1954" },
    { field: "city", value: "San Francisco (Calif.). " },
    { field: "source", value: "13 x 22 cm." },
  ],
  title: "A. Sabella's Capri Room, souvenir miniature menu",
};

const item = {
  contentType: "application/octet-stream",
  itemId: "1247",
  fields: [
    { key: "record", label: "Order Number", value: "MENU-000266" },
    { key: "title", label: "Name", value: "A. Sabella's Capri Room, souvenir miniature menu" },
    { key: "publis", label: "Printing Company", value: "Lord Menu Company (Los Angeles, Calif.)" },
    { key: "date", label: "Date", value: "Circa 1954" },
    { key: "source", label: "Physical Description", value: "13 x 22 cm." },
    { key: "covera", label: "Street Address", value: "2809 Taylor Street" },
    { key: "city", label: "City", value: "San Francisco (Calif.). " },
    { key: "notes", label: "Notes", value: "Phone: GRaystone 4-8770" },
    {
      key: "subjec",
      label: "Subject",
      value: "Menus--California--San Francisco.; Seafood.; Cooking, American.; Restaurants-California--San Francisco.; San Francisco (Calif.). ",
    },
    { key: "format", label: "Format", value: "Menus" },
    { key: "rights", label: "Rights", value: "Research use rights note." },
  ],
  thumbnailUri: "/api/singleitem/collection/menus/id/1247/thumbnail",
  imageUri: "https://tessa2.lapl.org//iiif/2/menus:1247/full/full/0/default.jpg",
  iiifInfoUri: "/iiif/2/menus:1247/info.json",
  objectInfo: {
    page: [
      { pagetitle: "A. Sabella's-Capri Room", pagefile: "1386.jp2", pageptr: "1245" },
      { pagetitle: "A. Sabella's-Capri Room", pagefile: "1387.jp2", pageptr: "1246" },
    ],
    type: "Document",
  },
};

function run() {
  const circa = parseDateRange("Circa 1954");
  assert.strictEqual(circa.lowerYear, 1949);
  assert.strictEqual(circa.upperYear, 1959);
  assert.strictEqual(circa.pointYear, 1954);
  assert.strictEqual(circa.confidence, "C");

  const exactYear = parseDateRange("2008");
  assert.strictEqual(exactYear.year, 2008);
  assert.strictEqual(exactYear.confidence, "B");

  const range = parseDateRange("1967-1982");
  assert.strictEqual(range.lowerYear, 1967);
  assert.strictEqual(range.upperYear, 1982);
  assert.strictEqual(range.confidence, "C");

  const post = parseDateRange("Post-1984");
  assert.strictEqual(post.lowerYear, 1984);
  assert.strictEqual(post.upperYear, null);
  assert.strictEqual(post.confidence, "C");

  assert.strictEqual(normalizePlace("San Francisco (Calif.). "), "San Francisco, California");
  assert.strictEqual(transportModeFor("Princess Cruises menu"), "ship");
  assert.strictEqual(transportModeFor("Union Pacific dining car menu"), "railroad");
  assert.deepStrictEqual(cuisineTagsFor("Seafood. Cooking, American."), ["american", "seafood"]);
  assert(styleTagsFor({ title: "souvenir miniature menu", format: "Menus", physicalDescription: "", notes: "" }).includes("miniature menu"));

  const record = normalizeItem(item, searchItem);
  assert.strictEqual(record.id, "lapl:1247");
  assert.strictEqual(record.sourceId, "lapl_menu_collection");
  assert.strictEqual(record.venueText, "A. Sabella's Capri Room, souvenir miniature menu");
  assert.strictEqual(record.placeText, "San Francisco, California");
  assert.strictEqual(record.address, "2809 Taylor Street");
  assert.strictEqual(record.phoneText, "GRaystone 4-8770");
  assert.strictEqual(record.pageCount, 2);
  assert(record.cuisineTags.includes("american"));
  assert(record.cuisineTags.includes("seafood"));
  assert(record.styleTags.includes("miniature menu"));
  assert(record.imageFeatures.length === 1);
  assert.strictEqual(record.imageFeatures[0].scalar.pageCount, 2);
  assert.deepStrictEqual(record.priceObservations, []);

  const options = optionsFromArgs(["--limit=9999", "--timeout-ms=12000", "--dry-run"]);
  assert.strictEqual(options.limit, 500);
  assert.strictEqual(options.timeoutMs, 12000);
  assert.strictEqual(options.dryRun, true);

  console.log("lapl source tests passed");
}

run();
