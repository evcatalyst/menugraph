const assert = require("assert");
const {
  buildMatchEvidence,
  normalizeCiaMenu,
  normalizeVenueName,
  normalizeNyplMenu,
  tokenSet,
} = require("../docs/multisource");

assert.strictEqual(normalizeVenueName("Delmonico's (Restaurant : New York, N.Y.)"), "delmonicos");
assert.deepStrictEqual([...tokenSet("Delmonico's (Restaurant : New York, N.Y.)")], ["delmonicos"]);

const cia = normalizeCiaMenu({
  id: 1458,
  pointer: 1458,
  title: "Delmonicos, menu",
  restaurant: "Delmonico's (Restaurant : New York, N.Y.)",
  date: "1910-04-20",
  year: 1910,
  city: "New York",
  state: "New York",
  country: "United States",
  types: ["Set menus"],
});

const delmonico = normalizeNyplMenu(
  {
    id: 24535,
    location: "Delmonicos",
    event: "MENU",
    venue: "RESTAURANT",
    place: "NEW YORK, NY",
    date: "1900-02-26",
  },
  {}
);

const genericNewYork = normalizeNyplMenu(
  {
    id: 1,
    location: "New York Hotel",
    event: "BREAKFAST",
    venue: "HOTEL",
    place: "NEW YORK, NY",
    date: "1900-02-26",
  },
  {}
);

const { matchMap } = buildMatchEvidence([cia], [delmonico, genericNewYork], 4);
assert.strictEqual(matchMap["cia:1458"][0].uid, "nypl:24535");
assert(matchMap["cia:1458"].every((match) => match.uid !== "nypl:1"));

console.log("multisource tests passed");
