const assert = require("assert");
const {
  optionsFromArgs,
  parseDateRange,
  parseFindingAid,
  priceObservationsFor,
  rawRowsFromHtml,
  titleFoodLabels,
  transportModeFor,
} = require("./cornell-source");

const fixtureHtml = `
<table>
  <tr id="s5"><td></td><td></td><td><div class="serieslabel">Assorted International Menus</div></td><td></td></tr>
  <tr>
    <td nowrap="1"> Box 56</td><td nowrap="1"> Folder 23</td>
    <td><div STYLE="margin-left: 3em; text-indent: -2em;">Sabena: Belgian Airlines</div></td>
    <td nowrap="1">1955-11-18</td>
  </tr>
  <tr><td></td><td></td><td><div class="heading"></div><div STYLE="margin-left: 4em;">Belgium</div></td><td></td></tr>
  <tr>
    <td nowrap="1"> Box 59</td><td nowrap="1"> Folder 17</td>
    <td><div STYLE="margin-left: 3em; text-indent: -2em;">Shelbourne Hotel</div></td>
    <td nowrap="1">1952-01-01-1952-12-31</td>
  </tr>
  <tr><td></td><td></td><td><div STYLE="margin-left: 4em;">Dublin, Ireland</div></td><td></td></tr>
  <tr>
    <td nowrap="1"> Box 56</td><td nowrap="1"> Folder 24</td>
    <td><div STYLE="margin-left: 3em; text-indent: -2em;">Tempura Imperial Hotel</div></td>
    <td nowrap="1">Undated</td>
  </tr>
  <tr><td></td><td></td><td><div STYLE="margin-left: 4em;">Tokyo, Japan</div></td><td></td></tr>
  <tr>
    <td nowrap="1"> Box 60</td><td nowrap="1"> Folder 1</td>
    <td><div STYLE="margin-left: 3em; text-indent: -2em;">Dinner For 10 Persons, $3 Per Person.</div></td>
    <td nowrap="1">1900-01-01</td>
  </tr>
  <tr><td></td><td></td><td><div STYLE="margin-left: 4em;">New York, NY</div></td><td></td></tr>
</table>`;

function run() {
  const exact = parseDateRange("1955-11-18");
  assert.strictEqual(exact.year, 1955);
  assert.strictEqual(exact.confidence, "A");

  const range = parseDateRange("1952-01-01-1952-12-31");
  assert.strictEqual(range.year, 1952);
  assert.strictEqual(range.confidence, "A");

  const circa = parseDateRange("ca. 1990");
  assert.strictEqual(circa.lowerYear, 1988);
  assert.strictEqual(circa.upperYear, 1992);
  assert.strictEqual(circa.confidence, "C");

  assert.strictEqual(parseDateRange("Undated").confidence, "X");
  assert.strictEqual(transportModeFor("Sabena Belgian Airlines dinner menu"), "airline");
  assert.strictEqual(transportModeFor("Royal Brunswick Lodge Ball at Hotel Metropole"), "hotel");

  const rows = rawRowsFromHtml(fixtureHtml);
  assert.strictEqual(rows.length, 4);
  assert.strictEqual(rows[0].series, "Assorted International Menus");
  assert.strictEqual(rows[0].placeText, "Belgium");
  assert.strictEqual(rows[1].placeText, "Dublin, Ireland");

  const records = parseFindingAid(fixtureHtml, { limit: 10 });
  assert.strictEqual(records.length, 4);
  const sabena = records.find((record) => record.title === "Sabena: Belgian Airlines");
  assert(sabena);
  assert.strictEqual(sabena.sourceId, "cornell_nestle_menu_collection");
  assert.strictEqual(sabena.sourceKey, "cornell");
  assert.strictEqual(sabena.transportMode, "airline");
  assert.strictEqual(sabena.country, "Belgium");
  assert(sabena.dishHints.some((dish) => dish.rawName === "airline menu"));

  const tempura = records.find((record) => record.title === "Tempura Imperial Hotel");
  assert(tempura);
  assert.strictEqual(tempura.dateConfidence, "X");
  assert.strictEqual(tempura.placeText, "Tokyo, Japan");
  assert.strictEqual(tempura.transportMode, "hotel");
  assert(tempura.dishHints.some((dish) => dish.rawName === "tempura"));

  const priced = records.find((record) => record.title === "Dinner For 10 Persons, $3 Per Person.");
  assert(priced);
  assert.strictEqual(priced.priceObservations.length, 1);
  assert.strictEqual(priced.priceObservations[0].amount, 3);
  assert.strictEqual(priced.priceObservations[0].currencyCode, "USD");
  assert.strictEqual(priced.priceObservations[0].item, "per-person menu price");

  assert(titleFoodLabels("Ruby Foo's Wine List").some((item) => item.label === "wine list"));
  assert(titleFoodLabels("The Crazy Crab").some((item) => item.label === "crab restaurant"));
  assert(titleFoodLabels("Café Centro").some((item) => item.label === "coffee service"));
  assert(titleFoodLabels("Promenade CafÃ©").some((item) => item.label === "coffee service"));
  assert(titleFoodLabels("The President: Blue Ribbon Transatlantic Flight, Pan America Menu").some((item) => item.label === "airline meal service"));
  assert(titleFoodLabels("Hearns Liquor Christmas Sale Advertisement").some((item) => item.label === "beer and spirits"));
  assert(titleFoodLabels("Piazza Repubblica Ristorante").some((item) => item.label === "italian dining"));
  assert(titleFoodLabels("Brasserie 812").some((item) => item.label === "brasserie dishes"));
  assert.strictEqual(
    priceObservationsFor(
      {
        menuId: "cornell:test",
        title: "Dinner For 10 Persons, $3 Per Person.",
        year: 1900,
        pointYear: 1900,
        decade: "1900s",
        country: "United States",
        sourceRecordId: "test",
      },
      "Dinner For 10 Persons, $3 Per Person."
    )[0].amount,
    3
  );

  const options = optionsFromArgs(["--limit=9999", "--timeout-ms=12000", "--dry-run"]);
  assert.strictEqual(options.limit, 2500);
  assert.strictEqual(options.timeoutMs, 12000);
  assert.strictEqual(options.dryRun, true);

  console.log("cornell source tests passed");
}

run();
