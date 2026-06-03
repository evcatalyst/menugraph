const assert = require("assert");
const {
  descriptionServiceSegments,
  deriveVenueText,
  normalizeItem,
  optionsFromArgs,
  parseCollectionRows,
  parseDateRange,
  transportModeFor,
} = require("./uh-source");

const listingHtml = `
<table>
  <tr id="document_v692t686f">
    <td><a class="media-left" href="/concern/texts/v692t686f?locale=en"><img src="/downloads/abc123?file=thumbnail" /></a></td>
    <td><a id="src_copy_link_v692t686f" href="/concern/texts/v692t686f?locale=en">La Pierre House, May 29, 1857</a></td>
    <td class="date">1857-05-29</td>
  </tr>
  <tr id="document_0c483k10j">
    <td><a class="media-left" href="/concern/texts/0c483k10j?locale=en"><img src="/downloads/def456?file=thumbnail" /></a></td>
    <td><a id="src_copy_link_0c483k10j" href="/concern/texts/0c483k10j?locale=en">Scrapbook of hotel and restaurant menus</a></td>
    <td class="date">18XX</td>
  </tr>
</table>`;

const itemJson = {
  id: "v692t686f",
  title: ["La Pierre House, May 29, 1857"],
  date: ["1857-05-29"],
  place: ["Philadelphia, Pennsylvania"],
  genre: ["menus"],
  description: ['Bill of fare for the "Dinner to Committee on Kane Obsequies", held at La Pierre House. Proprietor: Ward & Brother.'],
  subject: ["Hotels", "Food"],
  rights_statement: ["https://creativecommons.org/publicdomain/mark/1.0/"],
  digital_object_ark: "ark:/84475/do9931qj53c",
};

function run() {
  const rows = parseCollectionRows(listingHtml);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].id, "v692t686f");
  assert.strictEqual(rows[0].title, "La Pierre House, May 29, 1857");
  assert.strictEqual(rows[0].dateText, "1857-05-29");
  assert.strictEqual(rows[0].thumbnailUrl, "https://digitalcollections.lib.uh.edu/downloads/abc123?file=thumbnail");

  const exact = parseDateRange("1857-05-29");
  assert.strictEqual(exact.year, 1857);
  assert.strictEqual(exact.confidence, "A");
  assert.strictEqual(exact.decade, "1850s");

  const decadeRange = parseDateRange("185X/186X");
  assert.strictEqual(decadeRange.lowerYear, 1850);
  assert.strictEqual(decadeRange.upperYear, 1869);
  assert.strictEqual(decadeRange.confidence, "C");

  const century = parseDateRange("18XX");
  assert.strictEqual(century.lowerYear, 1800);
  assert.strictEqual(century.upperYear, 1899);
  assert.strictEqual(century.confidence, "D");

  assert.strictEqual(deriveVenueText("La Pierre House, May 29, 1857"), "La Pierre House");
  assert.strictEqual(deriveVenueText("Scrapbook of hotel and restaurant menus"), "");
  assert.strictEqual(transportModeFor("U.S.M. steamship Columbia bill of fare"), "ship");
  assert.strictEqual(transportModeFor("Delmonico restaurant dinner"), "restaurant");
  assert.deepStrictEqual(
    descriptionServiceSegments({
      title: "Louisville Hotel, March 15, 1857",
      description: ["Table d' Hote and wine list for Louisville Hotel."],
      subjects: ["Hotels", "Food"],
    }),
    ["wine list", "table d'hote"]
  );

  const record = normalizeItem(itemJson, rows[0]);
  assert.strictEqual(record.id, "uh:v692t686f");
  assert.strictEqual(record.sourceId, "uh_1850s_1860s_menus");
  assert.strictEqual(record.year, 1857);
  assert.strictEqual(record.dateConfidence, "A");
  assert.strictEqual(record.venueText, "La Pierre House");
  assert.strictEqual(record.placeText, "Philadelphia, Pennsylvania");
  assert.strictEqual(record.transportMode, "hotel");
  assert.strictEqual(record.iiifManifestUrl, "https://digitalcollections.lib.uh.edu/concern/texts/v692t686f/manifest");
  assert.strictEqual(record.rightsStatement, "https://creativecommons.org/publicdomain/mark/1.0/");
  assert.deepStrictEqual(record.priceObservations, []);
  assert.strictEqual(record.dishMentions.length, 1);
  assert.strictEqual(record.dishMentions[0].rawName, "dinner options");
  assert.strictEqual(record.dishMentions[0].extractionMethod, "uh_metadata_service_keyword");
  assert.strictEqual(record.dishMentions[0].confidence, 0.44);

  const options = optionsFromArgs(["--limit=9999", "--timeout-ms=12000", "--dry-run"]);
  assert.strictEqual(options.limit, 100);
  assert.strictEqual(options.timeoutMs, 12000);
  assert.strictEqual(options.dryRun, true);

  console.log("uh source tests passed");
}

run();
