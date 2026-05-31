const assert = require("assert");
const { buildPriceSnapshot, extractPricesFromText, normalizePrice } = require("../docs/price-utils");

const usMenu = {
  id: 1,
  title: "Lunch menu",
  country: "United States",
  city: "New York",
  state: "New York",
  year: 1935,
  decade: "1930s",
  types: ["A la carte menus"],
  itemUrl: "https://example.test/menu/1",
};

const ukMenu = {
  id: 2,
  title: "Tea room",
  country: "United Kingdom",
  year: 1920,
  decade: "1920s",
  types: ["Set menus"],
  itemUrl: "https://example.test/menu/2",
};

const franceMenu = {
  id: 3,
  title: "Diner",
  country: "France",
  year: 1950,
  decade: "1950s",
  types: ["Set menus"],
  itemUrl: "https://example.test/menu/3",
};

const prices = extractPricesFromText("Clam chowder $0.35\nCoffee 5 cents\nStreet address 1935", usMenu);
assert.strictEqual(prices.length, 2);
assert.strictEqual(prices[0].currency, "USD");
assert.strictEqual(prices[0].amount, 0.35);
assert.strictEqual(prices[1].amount, 0.05);
assert.strictEqual(prices[1].scale, "explicit-cents");

const cents = extractPricesFromText("SIRLOIN STEAK 50\nCoffee .50\nPie 0.50\nChicken 50 cents\nNEW YORK 52.70", usMenu);
assert.strictEqual(cents.length, 4);
assert.strictEqual(cents[0].amount, 0.5);
assert.strictEqual(cents[0].scale, "inferred-cents");
assert.strictEqual(cents[1].amount, 0.5);
assert.strictEqual(cents[1].scale, "decimal-dollars");
assert.strictEqual(cents[2].amount, 0.5);
assert.strictEqual(cents[3].amount, 0.5);

const nonMenuNumbers = extractPricesFromText("NEW YORK 44\nKANSAS CITY 37\nMENU du 13 Mai 1883.", usMenu);
assert.strictEqual(nonMenuNumbers.length, 0);

const explicitDollar = extractPricesFromText("Celebration dinner $50.00", usMenu);
assert.strictEqual(explicitDollar.length, 1);
assert.strictEqual(explicitDollar[0].amount, 50);
assert.strictEqual(explicitDollar[0].scale, "explicit-currency");

const mixedRow = extractPricesFromText("Baby Mackerels in Oil 50 Baby Mackerels au Vin Blanc 1.00", usMenu);
assert.strictEqual(mixedRow.length, 2);
assert.strictEqual(mixedRow[0].item, "Baby Mackerels in Oil");
assert.strictEqual(mixedRow[0].amount, 0.5);
assert.strictEqual(mixedRow[0].scale, "inferred-cents");
assert.strictEqual(mixedRow[1].item, "Baby Mackerels au Vin Blanc");
assert.strictEqual(mixedRow[1].amount, 1);

const sterling = extractPricesFromText("Tea and cake 1/6\nRoast beef 2s 6d", ukMenu);
assert.strictEqual(sterling.length, 2);
assert.strictEqual(sterling[0].currency, "GBP");
assert.strictEqual(sterling[0].amount, 0.075);
assert.strictEqual(sterling[1].amount, 0.125);

const francs = extractPricesFromText("Consomme Fr. 2,50", franceMenu);
assert.strictEqual(francs.length, 1);
assert.strictEqual(francs[0].currency, "FRF");
assert.strictEqual(francs[0].amount, 2.5);

const references = {
  cpiUs: {
    annual: { 1935: 13.7, 2026: 333 },
    latestReferenceDate: "2026-04",
  },
  cpiCountry: {
    countries: {
      GBR: { annual: { 1920: 10, 2024: 140 } },
    },
  },
};

const normalized = normalizePrice(prices[0], references);
assert.strictEqual(normalized.method, "BLS CPI-U");
assert(normalized.todayUsd > 8);
assert(normalized.todayHigh > normalized.todayLow);

const local = normalizePrice(sterling[0], references);
assert.strictEqual(local.method, "World Bank local CPI");
assert.strictEqual(local.todayUsd, null);
assert(local.localToday > sterling[0].amount);

const snapshot = buildPriceSnapshot({
  menus: [usMenu],
  textsById: { 1: "Oysters $0.40" },
  references,
  contextEvents: [],
  generatedAt: "2026-05-30T00:00:00.000Z",
});
assert.strictEqual(snapshot.records.length, 1);
assert.strictEqual(snapshot.summary.total, 1);
assert.strictEqual(snapshot.records[0].normalized.method, "BLS CPI-U");
