const assert = require("assert");
const {
  cuisineTagsFor,
  dishSegmentsFor,
  normalizeItem,
  optionsFromArgs,
  parseDateRange,
  parsePlace,
  styleTagsFor,
  transportModeFor,
} = require("./uw-source");

const searchItem = {
  collectionAlias: "menus",
  itemId: "188",
  filetype: "cpd",
  thumbnailUri: "/api/singleitem/collection/menus/id/188/thumbnail",
  itemLink: "/compoundobject/collection/menus/id/188",
  metadataFields: [
    { field: "order", value: "MEN002" },
    { field: "source", value: "Historical Menu Collection. PH Coll 617" },
    { field: "title", value: "Alaska Steamship Co., S.S. Yukon, Lunch Menu, July 31, 1939" },
  ],
  title: "Alaska Steamship Co., S.S. Yukon, Lunch Menu, July 31, 1939",
};

const item = {
  contentType: "application/octet-stream",
  itemId: "188",
  fields: [
    { key: "title", label: "Title", value: "Alaska Steamship Co., S.S. Yukon, Lunch Menu, July 31, 1939" },
    { key: "date", label: "Date", value: "July 31, 1939" },
    {
      key: "descri",
      label: "Notes",
      value:
        "One of a set of menus issued for a cruise up the Inside Passage from Seattle to Alaska by the Alaska Steamship Company. Menu cover image is an etching of the lone prospector.",
    },
    { key: "genre", label: "Category", value: "Depression Era (1929-1939) Illustrated Menus, Travel (Ship, Train, etc)." },
    { key: "covera", label: "Location", value: "United States--Alaska" },
    { key: "subjec", label: "Subjects (LCSH)", value: "Menus; Yukon (Steamer); Alaska Steamship Co." },
    { key: "order", label: "Digital ID Number", value: "MEN002" },
    { key: "objeca", label: "Object Type", value: "Menu; image" },
    { key: "object", label: "Physical Description", value: "Letterpress : 5 1/2 x 8 1/2 in." },
  ],
  thumbnailUri: "/api/singleitem/collection/menus/id/188/thumbnail",
  imageUri: "https://digitalcollections.lib.washington.edu//iiif/2/menus:188/full/full/0/default.jpg",
  iiifInfoUri: "/iiif/2/menus:188/info.json",
  objectInfo: {
    page: [
      { pagetitle: "Cover", pagefile: "126.jpg", pageptr: "187" },
      { pagetitle: "Page 2", pagefile: "15.jpg", pageptr: "22" },
      { pagetitle: "Page 3", pagefile: "16.jpg", pageptr: "23" },
      { pagetitle: "Page 4", pagefile: "17.jpg", pageptr: "24" },
    ],
    type: "Document",
  },
};

function run() {
  const exact = parseDateRange("July 31, 1939");
  assert.strictEqual(exact.year, 1939);
  assert.strictEqual(exact.confidence, "A");

  const between = parseDateRange("between 1950 and 1959?");
  assert.strictEqual(between.lowerYear, 1950);
  assert.strictEqual(between.upperYear, 1959);
  assert.strictEqual(between.pointYear, 1955);
  assert.strictEqual(between.confidence, "C");

  const month = parseDateRange("December 1986");
  assert.strictEqual(month.year, 1986);
  assert.strictEqual(month.confidence, "B");

  assert.strictEqual(parsePlace("United States--Washington (State)--Seattle"), "Seattle, Washington, United States");
  assert.strictEqual(parsePlace("United States--Alaska"), "Alaska, United States");
  assert.strictEqual(transportModeFor("Alaska Steamship S.S. Yukon cruise lunch menu"), "ship");
  assert(cuisineTagsFor("Seattle seafood menu with salmon and crab").includes("seafood"));
  assert(styleTagsFor("Depression Era Illustrated Menus with cover image and wine list").includes("illustrated menu"));
  assert.deepStrictEqual(dishSegmentsFor("Cocktail bar menu with lunch, wine list, and seafood."), [
    "bar menu",
    "cocktails",
    "lunch options",
    "wine list",
    "seafood options",
  ]);

  const record = normalizeItem(item, searchItem);
  assert.strictEqual(record.id, "uw:188");
  assert.strictEqual(record.sourceId, "uw_menus_collection");
  assert.strictEqual(record.venueText, "Yukon");
  assert.strictEqual(record.placeText, "Alaska, United States");
  assert.strictEqual(record.dateConfidence, "A");
  assert.strictEqual(record.transportMode, "ship");
  assert(record.styleTags.includes("illustrated menu"));
  assert(record.dishHints.some((dish) => dish.rawName === "lunch options"));
  assert(record.dishHints.some((dish) => dish.rawName === "ship dining"));
  assert(record.imageFeatures.length === 1);
  assert.strictEqual(record.imageFeatures[0].scalar.pageCount, 4);

  const options = optionsFromArgs(["--limit=9999", "--timeout-ms=12000", "--dry-run"]);
  assert.strictEqual(options.limit, 500);
  assert.strictEqual(options.timeoutMs, 12000);
  assert.strictEqual(options.dryRun, true);

  console.log("uw source tests passed");
}

run();
