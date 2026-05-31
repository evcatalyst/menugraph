const assert = require("assert");
const { buildDateEstimateSnapshot, estimateDateForMenu } = require("../docs/date-utils");

const references = {
  dateClues: {
    lowerBounds: [
      {
        id: "visa",
        label: "Visa accepted",
        patterns: ["\\bVisa\\b"],
        notBefore: 1976,
        confidence: "B",
        method: "payment-clue",
      },
    ],
  },
  restaurantRanges: [
    {
      restaurant: "Le Pavillon",
      city: "New York",
      state: "New York",
      country: "United States",
      notBefore: 1941,
      notAfter: 1972,
      confidence: "B",
    },
    {
      restaurant: "Gage & Tollner",
      city: "Brooklyn",
      state: "New York",
      country: "United States",
      notBefore: 1879,
      notAfter: 2004,
      confidence: "C",
      weight: 0.8,
    },
  ],
};

const sourceYear = estimateDateForMenu({
  id: 1,
  title: "Dinner menu",
  date: "1956-04-10",
  year: 1956,
  decade: "unknown",
  restaurant: "Example Room",
  city: "New York",
  state: "New York",
  country: "United States",
});
assert.strictEqual(sourceYear.confidence, "A");
assert.strictEqual(sourceYear.estimatedDecade, "1950s");
assert.strictEqual(sourceYear.dateBasis, "source");

const catalogDecade = buildDateEstimateSnapshot({
  menus: [
    {
      id: 2,
      title: "Lutece, menu",
      date: "",
      year: null,
      decade: "1960s",
      restaurant: "Lutece (Restaurant : New York, N.Y.)",
      city: "New York",
      state: "New York",
      country: "United States",
      source: "menu 2-108",
    },
  ],
  references,
}).records[0];
assert.strictEqual(catalogDecade.confidence, "B");
assert.strictEqual(catalogDecade.estimatedNotBefore, 1960);
assert.strictEqual(catalogDecade.estimatedDecade, "1960s");

const siblingSnapshot = buildDateEstimateSnapshot({
  menus: [
    {
      id: 3,
      title: "Cafe Sample, dinner menu",
      date: "1950",
      year: 1950,
      decade: "1950s",
      restaurant: "Cafe Sample (New York, N.Y.)",
      city: "New York",
      state: "New York",
      country: "United States",
      source: "menu 9-1",
    },
    {
      id: 4,
      title: "Cafe Sample, luncheon menu",
      date: "1960",
      year: 1960,
      decade: "1960s",
      restaurant: "Cafe Sample (New York, N.Y.)",
      city: "New York",
      state: "New York",
      country: "United States",
      source: "menu 9-2",
    },
    {
      id: 5,
      title: "Cafe Sample, menu",
      date: "",
      year: null,
      decade: "unknown",
      restaurant: "Cafe Sample (New York, N.Y.)",
      city: "New York",
      state: "New York",
      country: "United States",
      source: "menu 9-3",
    },
  ],
  references,
});
const sibling = siblingSnapshot.records.find((record) => record.menuId === 5);
assert.strictEqual(sibling.confidence, "B");
assert.strictEqual(sibling.estimatedNotBefore, 1950);
assert.strictEqual(sibling.estimatedNotAfter, 1960);
assert(sibling.methods.includes("same-restaurant-siblings"));

const lePavillon = buildDateEstimateSnapshot({
  menus: [
    {
      id: 6,
      title: "Le Pavillon, lunch menu",
      date: "",
      year: null,
      decade: "unknown",
      restaurant: "Le Pavillon (Restaurant : New York, N.Y.)",
      city: "New York",
      state: "New York",
      country: "United States",
      source: "menu 1-100",
    },
  ],
  references,
}).records[0];
assert.strictEqual(lePavillon.confidence, "B");
assert.strictEqual(lePavillon.estimatedNotBefore, 1941);
assert.strictEqual(lePavillon.estimatedNotAfter, 1972);
assert.strictEqual(lePavillon.estimatedDecade, "1950s");

const zipPlus4 = buildDateEstimateSnapshot({
  menus: [
    {
      id: 7,
      title: "Dinner menu, NY 10022-1234",
      date: "",
      year: null,
      decade: "unknown",
      restaurant: "Modern Sample",
      city: "New York",
      state: "New York",
      country: "United States",
      source: "menu 10-1",
    },
  ],
  references,
}).records[0];
assert.strictEqual(zipPlus4.estimatedNotBefore, 1983);
assert.strictEqual(zipPlus4.confidence, "D");
assert.strictEqual(zipPlus4.estimatedDecade, null);

const conflict = buildDateEstimateSnapshot({
  menus: [
    {
      id: 8,
      title: "Le Pavillon, dinner menu, Visa accepted",
      date: "",
      year: null,
      decade: "unknown",
      restaurant: "Le Pavillon (Restaurant : New York, N.Y.)",
      city: "New York",
      state: "New York",
      country: "United States",
      source: "menu 1-101",
    },
  ],
  references,
}).records[0];
assert.strictEqual(conflict.confidence, "X");
assert.strictEqual(conflict.reviewStatus, "needs_review");

const broad = buildDateEstimateSnapshot({
  menus: [
    {
      id: 9,
      title: "Gage & Tollner, menu",
      date: "",
      year: null,
      decade: "unknown",
      restaurant: "Gage & Tollner (Brooklyn, N.Y.)",
      city: "Brooklyn",
      state: "New York",
      country: "United States",
      source: "menu 1-102",
    },
  ],
  references,
}).records[0];
assert.strictEqual(broad.estimatedNotBefore, 1879);
assert.strictEqual(broad.estimatedNotAfter, 2004);
assert.strictEqual(broad.estimatedDecade, null);
