const assert = require("assert");
const {
  MAX_LIMIT,
  normalizeHit,
  optionsFromArgs,
  parseDateRange,
  representativeDishSegments,
  transportModeFor,
} = require("./northwestern-source");

const sampleHit = {
  id: "7d6a2343-6dd2-4799-a25d-b1cce1df3b21",
  title: "Penn Central Transportation Company Menu, Sandwich menu, 1970",
  date_created: ["1970"],
  work_type: "Image",
  thumbnail: "https://api.dc.library.northwestern.edu/api/v2/works/7d6a2343-6dd2-4799-a25d-b1cce1df3b21/thumbnail",
  iiif_manifest: "https://api.dc.library.northwestern.edu/api/v2/works/7d6a2343-6dd2-4799-a25d-b1cce1df3b21?as=iiif",
  description: [
    "Items on menu: Snacks; Cocktails; Beverage list; Other. Meals served: Snacks; Cocktails. Representative dishes: Triple Decker Club Sandwich with Turkey, Bacon, Lettuce and Mayonnaise, Potato Frills, Pickle Chips and two slices of Tomato ($2.00)",
  ],
  location: [{ label: "Philadelphia" }],
  subject: [
    { label: "United States", role: "Geographical" },
    { label: "Penn Central Transportation Company", variants: ["Penn Central (Firm)"] },
    { label: "Railroads--Dining-car service", variants: ["Dining-car service (Railroads)", "Food service"] },
    { label: "Menus" },
  ],
  collection: {
    id: "d3a8e587-cc58-4cb0-aea2-65465d42ec3e",
    title: "Ira Silverman Railroad Menu Collection",
  },
};

function run() {
  const exact = parseDateRange("1970");
  assert.strictEqual(exact.year, 1970);
  assert.strictEqual(exact.confidence, "A");
  assert.strictEqual(exact.decade, "1970s");

  const range = parseDateRange("1970 to 1975");
  assert.strictEqual(range.lowerYear, 1970);
  assert.strictEqual(range.upperYear, 1975);
  assert.strictEqual(range.pointYear, 1973);
  assert.strictEqual(range.confidence, "B");

  assert.strictEqual(transportModeFor("Railroads--Dining-car service"), "railroad");
  assert.strictEqual(transportModeFor("International Business Class Los Angeles Tokyo"), "airline");

  const segments = representativeDishSegments(sampleHit.description);
  assert.strictEqual(segments.length, 1);
  assert.strictEqual(segments[0].rawPriceText, "$2.00");
  assert(segments[0].rawName.includes("Triple Decker Club Sandwich"));

  const record = normalizeHit(sampleHit, {});
  assert.strictEqual(record.id, "northwestern:7d6a2343-6dd2-4799-a25d-b1cce1df3b21");
  assert.strictEqual(record.sourceId, "northwestern_transport_menus");
  assert.strictEqual(record.transportMode, "railroad");
  assert.strictEqual(record.year, 1970);
  assert.strictEqual(record.dishMentions.length, 1);
  assert.strictEqual(record.priceObservations.length, 1);
  assert(record.ingredientTags.includes("bacon"));
  assert(record.ingredientTags.includes("tomato"));
  assert.strictEqual(record.priceObservations[0].amount, 2);
  assert.strictEqual(record.priceObservations[0].currency, "USD");

  const expandedOptions = optionsFromArgs(["--limit=1000", "--query=railroad menu", "--timeout-ms=12000", "--dry-run"]);
  assert.strictEqual(expandedOptions.limit, 1000);
  assert.strictEqual(expandedOptions.query, "railroad menu");
  assert.strictEqual(expandedOptions.timeoutMs, 12000);
  assert.strictEqual(expandedOptions.dryRun, true);

  const cappedOptions = optionsFromArgs(["--limit=9999"]);
  assert.strictEqual(cappedOptions.limit, MAX_LIMIT);

  console.log("northwestern source tests passed");
}

run();
