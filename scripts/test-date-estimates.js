const assert = require("assert");
const {
  buildDateEstimateSnapshot,
  estimateMenuDate,
  extractExplicitDatesFromText,
  validateEstimateSnapshot,
} = require("../docs/date-estimates");

function baseMenu(overrides = {}) {
  return {
    id: overrides.id || 1,
    uid: overrides.uid,
    title: "Test menu",
    date: "",
    year: null,
    decade: "unknown",
    restaurant: "Test Restaurant (New York, N.Y.)",
    city: "New York",
    state: "New York",
    country: "United States",
    donor: "Test Donor",
    source: "Menu Collection; Test Donor; menu 41-100",
    types: ["A la Carte Menus"],
    ...overrides,
  };
}

function findByMethod(record, method) {
  return record.evidence.find((item) => item.method === method);
}

function testDateParsing() {
  const text = [
    "Dinner served April 25, 1876.",
    "Revised March 1985.",
    "Thanksgiving 1962.",
    "Copyright 1983.",
    "Handwritten note: opened 12/4/78.",
  ].join(" ");
  const parsed = extractExplicitDatesFromText(text, "test OCR", { strong: true });
  assert(parsed.some((item) => item.year === 1876 && item.effect.includes("explicit date")), "full date should parse");
  assert(parsed.some((item) => item.year === 1985 && item.effect.includes("month-year")), "month-year should parse");
  assert(parsed.some((item) => item.year === 1962 && item.effect.includes("contextual")), "holiday year should parse");
  assert(parsed.some((item) => item.year === 1983 && item.effect.includes("contextual")), "copyright year should parse");
  assert(parsed.some((item) => item.notBefore === 1978 && item.effect.includes("not before")), "opened note should be a lower bound");
}

function testKnownDateDecadeFix() {
  const menu = baseMenu({ id: 2, date: "1938-11-24", year: 1938, decade: "unknown" });
  const original = JSON.stringify(menu);
  const snapshot = buildDateEstimateSnapshot({ menus: [menu] });
  const record = snapshot.records[0];
  assert.strictEqual(record.menuId, 2);
  assert.strictEqual(record.estimatedCenterYear, 1938);
  assert.strictEqual(record.estimatedDecade, "1930s");
  assert.strictEqual(record.confidence, "A");
  assert(record.methods.includes("metadata_date"));
  assert.strictEqual(JSON.stringify(menu), original, "source metadata must not be mutated");
}

function testHardBounds() {
  const dateClues = require("../docs/data/reference/date-clues.json");
  const zip = estimateMenuDate(baseMenu({ id: 3 }), { text: "Address: New York, NY 10021", dateClues });
  assert.strictEqual(zip.estimatedNotBefore, "1963-01-01");
  assert(findByMethod(zip, "postal_format"), "ZIP should add postal evidence");

  const zip4 = estimateMenuDate(baseMenu({ id: 4 }), { text: "New York, NY 10021-1234", dateClues });
  assert.strictEqual(zip4.estimatedNotBefore, "1983-01-01");

  const exchange = estimateMenuDate(baseMenu({ id: 5 }), { text: "Telephone BUtterfield 8-4550", dateClues });
  assert.strictEqual(exchange.estimatedNotBefore, "1940-01-01");
  assert.strictEqual(exchange.estimatedNotAfter, "1975-12-31");
  assert(findByMethod(exchange, "phone_format"), "exchange phone should add phone evidence");

  const cards = [
    ["Visa", "1976-01-01"],
    ["Master Charge", "1969-01-01"],
    ["MasterCard", "1979-01-01"],
    ["Diners Club", "1950-01-01"],
    ["American Express", "1958-01-01"],
  ];
  for (const [label, expected] of cards) {
    const record = estimateMenuDate(baseMenu({ id: `card-${label}` }), { text: `We accept ${label}.`, dateClues });
    assert.strictEqual(record.estimatedNotBefore, expected, `${label} lower bound`);
    assert(findByMethod(record, "payment_marker"), `${label} should add payment evidence`);
  }
}

function testRestaurantAndSiblingInference() {
  const restaurantRanges = require("../docs/data/reference/restaurant-ranges.json");
  const menus = [
    baseMenu({ id: 10, restaurant: "Le Pavillon (Restaurant : New York, N.Y.)", title: "Le Pavillon, menu" }),
    baseMenu({ id: 11, restaurant: "Lutece (Restaurant : New York, N.Y.)", title: "Lutece menu" }),
    baseMenu({ id: 12, restaurant: "Escoffier Room (Rabelais Bar & Cafe : Hyde Park, N.Y.)", title: "Escoffier Room menu" }),
    baseMenu({ id: 13, restaurant: "Sibling Cafe (New York, N.Y.)", title: "Sibling unknown menu" }),
    baseMenu({ id: 14, restaurant: "Sibling Cafe (New York, N.Y.)", title: "Sibling dated menu", date: "1968", year: 1968, decade: "1960s" }),
    baseMenu({ id: 15, restaurant: "Sibling Cafe (New York, N.Y.)", title: "Sibling dated menu", date: "1972", year: 1972, decade: "1970s" }),
  ];
  const snapshot = buildDateEstimateSnapshot({ menus, restaurantRanges });
  const byId = new Map(snapshot.records.map((record) => [String(record.menuId), record]));

  assert(byId.get("10").methods.includes("restaurant_history"), "Le Pavillon should use curated restaurant history");
  assert.strictEqual(byId.get("10").estimatedNotBefore, "1941-01-01");
  assert.strictEqual(byId.get("11").estimatedNotBefore, "1961-01-01");
  assert(byId.get("12").methods.includes("restaurant_history"), "CIA Hyde Park venues should use institutional range");
  assert(byId.get("13").methods.includes("same_restaurant_sibling"), "same restaurant dated siblings should infer a prior");
  assert.strictEqual(byId.get("13").estimatedNotBefore, "1968-01-01");
  assert.strictEqual(byId.get("13").estimatedNotAfter, "1972-12-31");
}

function testSchemaValidation() {
  const menus = [
    baseMenu({ id: 20, source: "Menu Collection; Test Donor; menu 99-001" }),
    baseMenu({ id: 21, date: "1950", year: 1950, decade: "1950s", source: "Menu Collection; Test Donor; menu 99-002" }),
    baseMenu({ id: 22, date: "1952", year: 1952, decade: "1950s", source: "Menu Collection; Test Donor; menu 99-003" }),
    baseMenu({ id: 23, date: "1954", year: 1954, decade: "1950s", source: "Menu Collection; Test Donor; menu 99-004" }),
    baseMenu({ id: 24, date: "1956", year: 1956, decade: "1950s", source: "Menu Collection; Test Donor; menu 99-005" }),
  ];
  const snapshot = buildDateEstimateSnapshot({ menus });
  assert.strictEqual(validateEstimateSnapshot(snapshot).length, 0);
  const clusterRecord = snapshot.records.find((record) => String(record.menuId) === "20");
  assert(clusterRecord.methods.includes("donor_cluster"), "donor/menu-number cluster should provide a low-risk prior");
}

testDateParsing();
testKnownDateDecadeFix();
testHardBounds();
testRestaurantAndSiblingInference();
testSchemaValidation();

console.log("date-estimates tests passed");
