const assert = require("assert");
const {
  cuisineTagsFor,
  dishSegmentsFor,
  isLikelyMenuRecord,
  normalizeItem,
  optionsFromArgs,
  parseDateRange,
  parseMetadataSpans,
  parseSearchResults,
  priceSegmentsFor,
  styleTagsFor,
  transportModeFor,
} = require("./denver-source");

const searchHtml = `
<div class="list_item">
  <input type="checkbox" name="multiSelect[]" value="1026570">
  <a href="https://digital.denverlibrary.org/nodes/view/1026570?keywords=menu" class="sr2title" title="Menu, Hotel de Paris"><h4><span>Menu</span>, Hotel de Paris</h4></a>
  <img src="/assets/nodeimg/1026570/220/square:1/version:abc" title="Menu, Hotel de Paris">
  <div class="list_metadata"><span class="metadata"><span class="titlelabel">Format: </span>Photograph</span><span class="metadata"><span class="titlelabel">Call Number: </span>X-11441</span><span class="metadata"><span class="titlelabel">Date: </span><span title="Between 1st January 1880 and 31st December 1890">1880-1890</span></span></div>
</div>
<div class="list_item">
  <input type="checkbox" name="multiSelect[]" value="1015688">
  <a href="https://digital.denverlibrary.org/nodes/view/1015688?keywords=menu" class="sr2title" title="The Rossonian Lounge menu"><h4>The Rossonian Lounge <span>menu</span></h4></a>
  <img src="/assets/nodeimg/1015688/220/square:1/version:def" title="The Rossonian Lounge menu">
  <div class="list_metadata"><span class="metadata"><span class="titlelabel">Format: </span>Document (PDF)</span><span class="metadata"><span class="titlelabel">Creator: </span>The Rossonian</span><span class="metadata"><span class="titlelabel">Date: </span>circa 1950</span></div>
</div>
<div class="list_item">
  <input type="checkbox" name="multiSelect[]" value="999">
  <a href="https://digital.denverlibrary.org/nodes/view/999?keywords=menu" class="sr2title" title="Young menu Christian association"><h4>Young menu Christian association</h4></a>
  <div class="list_metadata"><span class="metadata"><span class="titlelabel">Format: </span>Photograph</span></div>
</div>`;

const hotelHtml = `
<html><head>
  <meta property="og:title" content="Menu, Hotel de Paris" />
  <meta property="og:description" content="Call Number: X-11441 | Date: 1880-1890 | Read the full record details for Photograph: Menu, Hotel de Paris" />
  <meta property="og:image" content="https://digital.denverlibrary.org/assets/display/2130343-max?u=6af07" />
  <meta property="og:image:width" content="4000" />
  <meta property="og:image:height" content="3042" />
</head><body>
  <span id="nodeID">1026570</span>
  <div class="portlet-header">Format: Photograph</div>
  <h1>Menu, Hotel de Paris</h1>
  <div class="portlet-content">
    <span class="metadata"><span class="titlelabel">Call Number</span>X-11441</span>
    <span class="metadata"><span class="titlelabel">Date</span><span title="Between 1st January 1880 and 31st December 1890">1880-1890</span></span>
    <span class="metadata"><span class="titlelabel">Summary</span>Reproduction of a Hotel de Paris menu from Georgetown, Clear Creek County.</span>
    <span class="metadata"><span class="titlelabel">Subject</span>Menus; Restaurants</span>
    <span class="metadata"><span class="titlelabel">Geographic Area</span>Georgetown (Colo.)--19th century</span>
    <span class="metadata"><span class="titlelabel">Type of Material</span>Menus</span>
  </div>
  <div class="portlet-content"><span class="metadata"><span class="titlelabel">Rights Statement</span>http://rightsstatements.org/vocab/CNE/1.0/</span></div>
  <img src="/assets/display/2130343-max" class="hero current" id="hero2130343" w="4000" h="3042" />
</body></html>`;

const rossonianHtml = `
<html><head>
  <meta property="og:title" content="The Rossonian Lounge menu" />
  <meta property="og:description" content="Call Number: ARL69-2022-63 | Creator: The Rossonian | Date: circa 1950 | Read the full record details for Document (PDF): The Rossonian Lounge menu" />
  <meta property="og:image" content="https://digital.denverlibrary.org/theme/denverlibrary/img/logo.png" />
</head><body>
  <span id="nodeID">1015688</span>
  <div class="portlet-header">Format: Document (PDF)</div>
  <h1>The Rossonian Lounge menu</h1>
  <div class="portlet-content">
    <span class="metadata"><span class="titlelabel">Creator</span>The Rossonian</span>
    <span class="metadata"><span class="titlelabel">Date</span><span title="">circa 1950</span></span>
    <span class="metadata"><span class="titlelabel">Summary</span>Drink menu from The Rossonian Lounge.</span>
    <span class="metadata"><span class="titlelabel">Subject</span>Restaurants; Menus</span>
    <span class="metadata"><span class="titlelabel">Geographic Area</span>Five Points (Denver, Colo.)</span>
    <span class="metadata"><span class="titlelabel">Type of Material</span>Menus</span>
    <span class="metadata"><span class="titlelabel">Notes</span>Sticky note for moscow mule attached to front of document.</span>
  </div>
  <iframe id="pdf-viewer" src="/pdf/4.0.189/web/viewer.html?file=/assets/displaypdf/1015688#zoom=auto"></iframe>
</body></html>`;

function run() {
  const searchItems = parseSearchResults(searchHtml);
  assert.strictEqual(searchItems.length, 3);
  assert.strictEqual(searchItems[0].sourceRecordId, "1026570");
  assert.strictEqual(searchItems[0].title, "Menu, Hotel de Paris");
  assert.strictEqual(searchItems[0].dateText, "1880-1890");
  assert(searchItems[0].thumbnailUrl.includes("/assets/nodeimg/1026570/"));

  assert.strictEqual(isLikelyMenuRecord(searchItems[0]), true);
  assert.strictEqual(isLikelyMenuRecord(searchItems[1]), true);
  assert.strictEqual(isLikelyMenuRecord(searchItems[2]), false);

  const fields = parseMetadataSpans(hotelHtml);
  assert.strictEqual(fields.summary, "Reproduction of a Hotel de Paris menu from Georgetown, Clear Creek County.");
  assert.strictEqual(fields["type of material"], "Menus");

  const range = parseDateRange("1880-1890");
  assert.strictEqual(range.lowerYear, 1880);
  assert.strictEqual(range.upperYear, 1890);
  assert.strictEqual(range.confidence, "C");

  const circa = parseDateRange("circa 1950");
  assert.strictEqual(circa.year, 1950);
  assert.strictEqual(circa.lowerYear, 1948);
  assert.strictEqual(circa.upperYear, 1952);
  assert.strictEqual(circa.confidence, "C");

  const exact = parseDateRange("Apr 18, 2020");
  assert.strictEqual(exact.year, 2020);
  assert.strictEqual(exact.confidence, "A");

  assert.deepStrictEqual(cuisineTagsFor("Barcelona Wine Bar has cocktails and Italian pizza"), ["bar", "italian", "spanish", "wine"]);
  assert(dishSegmentsFor("Drink menu from The Rossonian Lounge with moscow mule").includes("bar menu"));
  assert(dishSegmentsFor("Barcelona Wine Bar menu").includes("wine list"));
  assert(styleTagsFor("Work and Class Handwritten Window Menu from 2020").includes("handwritten"));
  assert.strictEqual(transportModeFor("Hotel de Paris menu"), "hotel");
  assert.deepStrictEqual(priceSegmentsFor("Sandwiches were $1.25 and cocktails $0.65."), [
    { rawName: "metadata price", rawPriceText: "$1.25" },
    { rawName: "metadata price 2", rawPriceText: "$0.65" },
  ]);

  const hotel = normalizeItem(hotelHtml, searchItems[0], { cpi: [], fx: {}, cpiCountry: {} });
  assert.strictEqual(hotel.id, "denver:1026570");
  assert.strictEqual(hotel.sourceId, "denver_menu_collection");
  assert.strictEqual(hotel.sourceKey, "denver");
  assert.strictEqual(hotel.venueText, "Hotel de Paris");
  assert.strictEqual(hotel.placeText, "Georgetown, Colorado");
  assert.strictEqual(hotel.transportMode, "hotel");
  assert.strictEqual(hotel.lowerYear, 1880);
  assert.strictEqual(hotel.upperYear, 1890);
  assert.strictEqual(hotel.imageFeatures.length, 1);
  assert.strictEqual(hotel.imageFeatures[0].scalar.width, 4000);
  assert.strictEqual(hotel.imageFeatures[0].scalar.height, 3042);
  assert(hotel.dishHints.some((dish) => dish.rawName === "hotel dining"));

  const rossonian = normalizeItem(rossonianHtml, searchItems[1], { cpi: [], fx: {}, cpiCountry: {} });
  assert.strictEqual(rossonian.id, "denver:1015688");
  assert.strictEqual(rossonian.venueText, "The Rossonian Lounge");
  assert.strictEqual(rossonian.placeText, "Five Points, Denver, Colorado");
  assert.strictEqual(rossonian.year, 1950);
  assert(rossonian.dishHints.some((dish) => dish.rawName === "bar menu"));
  assert.strictEqual(rossonian.imageFeatures[0].featureType, "recollect_pdf_metadata");

  const options = optionsFromArgs(["--limit=9999", "--timeout-ms=12000", "--max-pages=5", "--dry-run"]);
  assert.strictEqual(options.limit, 200);
  assert.strictEqual(options.timeoutMs, 12000);
  assert.strictEqual(options.maxPages, 5);
  assert.strictEqual(options.dryRun, true);

  console.log("denver source tests passed");
}

run();
