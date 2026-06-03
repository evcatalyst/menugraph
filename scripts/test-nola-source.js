const assert = require("assert");
const {
  cuisineTagsFor,
  dishSegmentsFor,
  normalizeItem,
  optionsFromArgs,
  parseDateRange,
  placeTextFor,
  transportModeFor,
  venueTextFor,
} = require("./nola-source");

const searchItem = {
  collectionAlias: "p16880coll68",
  itemId: "84",
  filetype: "cpd",
  thumbnailUri: "/api/singleitem/collection/p16880coll68/id/84/thumbnail",
  itemLink: "/compoundobject/collection/p16880coll68/id/84",
  metadataFields: [
    { field: "title", value: "Hotel Bentley, menu, Saturday, July 3, 1915" },
    { field: "restau", value: "Hotel Bentley (Alexandria, La.)" },
    { field: "subjec", value: "Restaurants; Hotels; Menus" },
  ],
  title: "Hotel Bentley, menu, Saturday, July 3, 1915",
};

const item = {
  contentType: "application/octet-stream",
  itemId: "84",
  fields: [
    { key: "title", label: "Title", value: "Hotel Bentley, menu, Saturday, July 3, 1915" },
    { key: "restau", label: "Restaurant", value: "Hotel Bentley (Alexandria, La.)" },
    { key: "date", label: "Date", value: "1915" },
    { key: "subjec", label: "Subjects", value: "Restaurants; Hotels; Menus" },
    { key: "rights", label: "Permission for Use", value: "Reproduction or reuse requires permission from New Orleans Public Library." },
    { key: "contac", label: "Image Request", value: "See source site for image request instructions." },
  ],
  thumbnailUri: "/api/singleitem/collection/p16880coll68/id/84/thumbnail",
  imageUri: "https://archives-nolalibrary.contentdm.oclc.org/iiif/2/p16880coll68:84/full/full/0/default.jpg",
  iiifInfoUri: "/iiif/2/p16880coll68:84/info.json",
  objectInfo: {
    page: { pagetitle: "hotelbentley", pagefile: "84.jp2", pageptr: "83" },
    type: "Document",
  },
};

function run() {
  const exact = parseDateRange("", "S.S. Nassau Coronation Cruise, Welcome Dinner, Sunday, May 3, 1953, menu");
  assert.strictEqual(exact.year, 1953);
  assert.strictEqual(exact.confidence, "A");
  assert.strictEqual(exact.decade, "1950s");

  const unknown = parseDateRange("", "Galatoire's Restaurant, menu");
  assert.strictEqual(unknown.confidence, "X");
  assert.strictEqual(unknown.dateText, "");

  assert.deepStrictEqual(cuisineTagsFor("Galatoire's French Quarter New Orleans seafood menu"), ["creole", "french", "seafood"]);
  assert.deepStrictEqual(dishSegmentsFor("Brennan's breakfast menu with dinner specials and drink suggestions"), [
    "breakfast options",
    "cocktails",
    "dinner options",
    "specials",
  ]);
  assert.strictEqual(transportModeFor("Panama Limited Train Illinois Central Railroad menu"), "railroad");
  assert.strictEqual(transportModeFor("S.S. Nassau Coronation Cruise Welcome Dinner"), "ship");
  assert.strictEqual(placeTextFor("Hotel Bentley (Alexandria, La.)", ["Restaurants", "Hotels"]), "Alexandria, Louisiana");
  assert.strictEqual(venueTextFor("Hotel Bentley (Alexandria, La.)", ""), "Hotel Bentley");

  const record = normalizeItem(item, searchItem);
  assert.strictEqual(record.id, "nola:84");
  assert.strictEqual(record.sourceId, "nola_menu_collection");
  assert.strictEqual(record.sourceKey, "nola");
  assert.strictEqual(record.venueText, "Hotel Bentley");
  assert.strictEqual(record.placeText, "Alexandria, Louisiana");
  assert.strictEqual(record.year, 1915);
  assert.strictEqual(record.dateConfidence, "A");
  assert.strictEqual(record.transportMode, "hotel");
  assert.deepStrictEqual(record.priceObservations, []);
  assert.strictEqual(record.imageFeatures.length, 1);
  assert.strictEqual(record.imageFeatures[0].iiifInfoUri, "https://archives-nolalibrary.contentdm.oclc.org/iiif/2/p16880coll68:84/info.json");
  assert.strictEqual(record.imageFeatures[0].scalar.pageCount, 1);
  assert.strictEqual(record.rightsStatement, "Reproduction or reuse requires permission from New Orleans Public Library.");

  const breakfast = normalizeItem(
    {
      ...item,
      itemId: "123",
      fields: [
        { key: "title", value: "Brennan's, breakfast menu" },
        { key: "restau", value: "Brennan's (New Orleans, La.)" },
        { key: "subjec", value: "Restaurants--Louisiana--New Orleans; Restaurants; Vieux Carre; French Quarter; Menus" },
      ],
    },
    { ...searchItem, itemId: "123", title: "Brennan's, breakfast menu" }
  );
  assert(breakfast.cuisineTags.includes("creole"));
  assert(breakfast.dishHints.some((dish) => dish.rawName === "breakfast options"));

  const options = optionsFromArgs(["--limit=9999", "--timeout-ms=12000", "--dry-run"]);
  assert.strictEqual(options.limit, 100);
  assert.strictEqual(options.timeoutMs, 12000);
  assert.strictEqual(options.dryRun, true);

  console.log("nola source tests passed");
}

run();
