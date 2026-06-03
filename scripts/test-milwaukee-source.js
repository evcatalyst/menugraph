const assert = require("assert");
const {
  cuisineTagsFor,
  dishSegmentsFor,
  normalizeItem,
  optionsFromArgs,
  parseDateRange,
  styleTagsFor,
  transportModeFor,
} = require("./milwaukee-source");

const searchItem = {
  collectionAlias: "histmenu",
  itemId: "204",
  filetype: "cpd",
  thumbnailUri: "/api/singleitem/collection/histmenu/id/204/thumbnail",
  itemLink: "/compoundobject/collection/histmenu/id/204",
  metadataFields: [
    { field: "title", value: "Dine-in menu for Divino" },
    { field: "subjec", value: "Menus; Restaurants--Wisconsin--Milwaukee" },
    { field: "descri", value: "Food options include items such as pizzas and pastas." },
    { field: "cdmcoll", value: "Historic Menu" },
  ],
  title: "Dine-in menu for Divino",
};

const item = {
  contentType: "application/octet-stream",
  itemId: "204",
  fields: [
    { key: "title", label: "Title", value: "Dine-in menu for Divino" },
    { key: "restau", label: "Restaurant Name", value: "Divino Wine and Dine" },
    {
      key: "descri",
      label: "Description",
      value: "The menu includes multiple pages. Food options include items such as pizzas and pastas. Divino closed on January 31, 2020, and Tavolino opened in its place.",
    },
    { key: "cuisin", label: "Cuisine", value: "Italian" },
    { key: "subjec", label: "Subject", value: "Menus; Restaurants--Wisconsin--Milwaukee" },
    { key: "addres", label: "Address", value: "2315 N. Murray Ave." },
    { key: "city", label: "City", value: "Milwaukee" },
    { key: "state", label: "State", value: "Wisconsin" },
    { key: "decade", label: "Decade", value: "2010-2019" },
    { key: "format", label: "Physical item type", value: "Menus" },
    { key: "rights", label: "Rights", value: "Source item rights note." },
  ],
  thumbnailUri: "/api/singleitem/collection/histmenu/id/204/thumbnail",
  imageUri: "https://content.mpl.org/iiif/2/histmenu:204/full/full/0/default.jpg",
  iiifInfoUri: "/iiif/2/histmenu:204/info.json",
  objectInfo: {
    page: [
      { pagetitle: "menu046-1", pagefile: "308.jp2", pageptr: "199" },
      { pagetitle: "menu046-2", pagefile: "309.jp2", pageptr: "200" },
    ],
    type: "Document",
  },
};

function run() {
  const decade = parseDateRange("1960-1969");
  assert.strictEqual(decade.lowerYear, 1960);
  assert.strictEqual(decade.upperYear, 1969);
  assert.strictEqual(decade.pointYear, 1965);
  assert.strictEqual(decade.confidence, "C");

  const splitRange = parseDateRange("1930-1939; 1980-1989");
  assert.strictEqual(splitRange.lowerYear, 1930);
  assert.strictEqual(splitRange.upperYear, 1989);
  assert.strictEqual(splitRange.confidence, "D");

  assert.deepStrictEqual(cuisineTagsFor("Italian pizzas and pastas"), ["italian"]);
  assert(styleTagsFor("The menu is a trifold brochure with a map and insert.").includes("trifold"));
  assert.strictEqual(transportModeFor("Hotel Wisconsin restaurant menu"), "hotel");
  assert.deepStrictEqual(dishSegmentsFor({ description: "Food options include pizzas, pastas, lunch, desserts, and alcoholic drinks.", cuisine: "Italian" }), [
    "alcoholic drinks",
    "dessert options",
    "lunch options",
    "pasta",
    "pizza",
  ]);

  const record = normalizeItem(item, searchItem);
  assert.strictEqual(record.id, "milwaukee:204");
  assert.strictEqual(record.sourceId, "milwaukee_historic_menus");
  assert.strictEqual(record.venueText, "Divino Wine and Dine");
  assert.strictEqual(record.placeText, "Milwaukee, Wisconsin");
  assert.strictEqual(record.address, "2315 N. Murray Ave.");
  assert.strictEqual(record.decade, "2010s");
  assert.strictEqual(record.dateConfidence, "C");
  assert(record.cuisineTags.includes("italian"));
  assert(record.dishHints.some((dish) => dish.rawName === "pizza"));
  assert(record.dishHints.some((dish) => dish.rawName === "pasta"));
  assert.strictEqual(record.priceObservations.length, 0);
  assert.strictEqual(record.imageFeatures.length, 1);
  assert.strictEqual(record.imageFeatures[0].scalar.pageCount, 2);

  const options = optionsFromArgs(["--limit=9999", "--timeout-ms=12000", "--dry-run"]);
  assert.strictEqual(options.limit, 200);
  assert.strictEqual(options.timeoutMs, 12000);
  assert.strictEqual(options.dryRun, true);

  console.log("milwaukee source tests passed");
}

run();
