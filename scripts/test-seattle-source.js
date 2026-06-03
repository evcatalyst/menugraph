const assert = require("assert");
const {
  cuisineTagsFor,
  dishSegmentsFor,
  normalizeItem,
  optionsFromArgs,
  parseDateRange,
  priceSegmentsFor,
  styleTagsFor,
  transportModeFor,
} = require("./seattle-source");

const searchItem = {
  collectionAlias: "p16118coll5",
  itemId: "856",
  filetype: "cpd",
  thumbnailUri: "/api/singleitem/collection/p16118coll5/id/856/thumbnail",
  itemLink: "/compoundobject/collection/p16118coll5/id/856",
  metadataFields: [
    { field: "title", value: "Dahlia Lounge lunch menu, September 21, 1990" },
    { field: "descri", value: "The menu combined foreign influences with local traditions." },
    { field: "cuisin", value: "" },
    { field: "date", value: "1990-09-21" },
  ],
  title: "Dahlia Lounge lunch menu, September 21, 1990",
};

const item = {
  contentType: "application/octet-stream",
  itemId: "856",
  fields: [
    { key: "title", label: "Title", value: "Dahlia Lounge lunch menu, September 21, 1990" },
    { key: "identi", label: "Identifier", value: "spl_menu_00222" },
    { key: "restau", label: "Restaurant Name", value: "Dahlia Lounge" },
    {
      key: "descri",
      label: "Description",
      value:
        "Eagerly awaited at the time, Tom Douglas' Dahlia Lounge opened on Friday, November 17, 1989. The menu combined foreign influences with local traditions.",
    },
    { key: "subjec", label: "Subject (LCSH)", value: "Menus; Menu Design--Northwest, Pacific; Restaurants--Northwest, Pacific; Menu Design--Washington (State)--Seattle" },
    { key: "addres", label: "Address", value: "1904 Fourth Ave, Seattle, WA 98101" },
    { key: "neighb", label: "Neighborhood", value: "Belltown; Downtown" },
    { key: "date", label: "Date", value: "1990-09-21" },
    { key: "decade", label: "Decade", value: "199u" },
    { key: "notes", label: "Notes", value: "Date written on menu recto." },
    { key: "format", label: "File Format", value: "img/jp2" },
    { key: "rights", label: "Rights and Reproduction", value: "Items in this collection are made available for educational, academic and personal use." },
  ],
  thumbnailUri: "/api/singleitem/collection/p16118coll5/id/856/thumbnail",
  imageUri: "https://spl.contentdm.oclc.org/iiif/2/p16118coll5:856/full/full/0/default.jpg",
  iiifInfoUri: "/iiif/2/p16118coll5:856/info.json",
  objectInfo: {
    node: {
      nodetitle: "Dahlia Lounge Lunch Menu",
      page: { pagetitle: "Menu", pagefile: "856.jp2", pageptr: "855" },
    },
    type: "Monograph",
  },
};

function run() {
  const exact = parseDateRange("1990-09-21");
  assert.strictEqual(exact.year, 1990);
  assert.strictEqual(exact.confidence, "A");

  const month = parseDateRange("1994-05");
  assert.strictEqual(month.year, 1994);
  assert.strictEqual(month.confidence, "B");

  const decade = parseDateRange("198u");
  assert.strictEqual(decade.lowerYear, 1980);
  assert.strictEqual(decade.upperYear, 1989);
  assert.strictEqual(decade.confidence, "C");

  assert.deepStrictEqual(cuisineTagsFor("Italian pizza seafood steakhouse coffee shop"), ["cafe", "italian", "seafood", "steakhouse"]);
  assert(dishSegmentsFor("Cascadia tasting menu served miniburgers and cheese menu").includes("tasting menu"));
  assert(dishSegmentsFor("Ivar's seafood lunch menu").includes("fish and seafood options"));
  assert(styleTagsFor("Double-sided tasting menu for Thanksgiving").includes("double-sided"));
  assert.strictEqual(transportModeFor("Hyatt House hotel menu"), "hotel");

  const prices = priceSegmentsFor("This menu has prices listed from $6.25-$8.75, so it is possible this particular menu is from the late 1970s.", "Greenwood Inn Thanksgiving Dinner Menu");
  assert.deepStrictEqual(prices, [
    { rawName: "Thanksgiving dinner price range low", rawPriceText: "$6.25" },
    { rawName: "Thanksgiving dinner price range high", rawPriceText: "$8.75" },
  ]);

  const record = normalizeItem(item, searchItem, { cpi: [], fx: {}, cpiCountry: {} });
  assert.strictEqual(record.id, "seattle:856");
  assert.strictEqual(record.sourceId, "seattle_room_menu_collection");
  assert.strictEqual(record.sourceKey, "seattle");
  assert.strictEqual(record.venueText, "Dahlia Lounge");
  assert.strictEqual(record.placeText, "Seattle, Washington, Belltown, Downtown");
  assert.strictEqual(record.address, "1904 Fourth Ave, Seattle, WA 98101");
  assert.strictEqual(record.year, 1990);
  assert.strictEqual(record.dateConfidence, "A");
  assert.strictEqual(record.transportMode, "restaurant");
  assert(record.dishHints.some((dish) => dish.rawName === "lunch options"));
  assert.strictEqual(record.imageFeatures.length, 1);
  assert.strictEqual(record.imageFeatures[0].iiifInfoUri, "https://spl.contentdm.oclc.org/iiif/2/p16118coll5:856/info.json");
  assert.strictEqual(record.imageFeatures[0].scalar.pageCount, 1);

  const options = optionsFromArgs(["--limit=9999", "--timeout-ms=12000", "--dry-run"]);
  assert.strictEqual(options.limit, 603);
  assert.strictEqual(options.timeoutMs, 12000);
  assert.strictEqual(options.dryRun, true);

  console.log("seattle source tests passed");
}

run();
