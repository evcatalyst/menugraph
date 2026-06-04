const assert = require("assert");
const { enrichExternalRecord, metadataDishCandidates, metadataPriceObservations } = require("./enrich-external-metadata");

const record = {
  id: "sample:1",
  menuId: "sample:1",
  sourceId: "sample_source",
  sourceKey: "sample",
  sourceRecordId: "1",
  title: "Harbor House seafood dinner menu",
  descriptionSummary: "Representative dishes: Oyster stew ($1.25); Wine list; Seafood; Restaurants--Sample City",
  notes: "No images copied.",
  country: "United States",
  year: 1935,
  subjectTerms: ["Seafood", "Dinners"],
  cuisineTags: ["seafood"],
  ingredientTags: ["oyster", "wine"],
  dishMentions: [],
  priceObservations: [],
};

const candidates = metadataDishCandidates(record, { ingredientLimit: 2 });
assert(candidates.some((candidate) => candidate.rawName === "seafood options"));
assert(candidates.some((candidate) => candidate.rawName === "wine list"));

const samePassIngredientCandidates = metadataDishCandidates(
  {
    id: "sample:2",
    menuId: "sample:2",
    sourceId: "sample_source",
    sourceKey: "sample",
    title: "Café Centro",
    descriptionSummary: "Apple orchard cafe menu",
    dishMentions: [],
    priceObservations: [],
    ingredientTags: [],
  },
  { ingredientLimit: 2 }
);
assert(samePassIngredientCandidates.some((candidate) => candidate.rawName === "coffee service"));
assert(samePassIngredientCandidates.some((candidate) => candidate.rawName === "apple dishes"));

const prices = metadataPriceObservations(record, { cpiUs: {} }, [], "sample.json");
assert.strictEqual(prices.length, 1);
assert.strictEqual(prices[0].rawPrice, "$1.25");
assert.strictEqual(prices[0].sourceId, "sample_source");
assert.strictEqual(prices[0].extractionMethod, "external_metadata_price_regex");

const enriched = enrichExternalRecord(record, {
  fileName: "sample.json",
  generatedAt: "2026-06-03T00:00:00.000Z",
  references: { cpiUs: {} },
  contextEvents: [],
  options: { ingredientLimit: 2 },
});

assert(enriched.dishMentions.length >= 3);
assert.strictEqual(enriched.priceObservations.length, 1);
assert(enriched.ingredientTags.includes("oyster"));
assert(enriched.ingredientTags.includes("wine"));
assert.strictEqual(enriched.metadataEnrichment.dishMentionsAdded, enriched.dishMentions.length);
assert.strictEqual(enriched.metadataEnrichment.priceObservationsAdded, 1);
assert(enriched.dishHints.every((hint) => hint.normalizedName));

const noDuplicate = enrichExternalRecord(enriched, {
  fileName: "sample.json",
  generatedAt: "2026-06-03T00:00:00.000Z",
  references: { cpiUs: {} },
  contextEvents: [],
  options: { ingredientLimit: 2 },
});

assert.strictEqual(noDuplicate.dishMentions.length, enriched.dishMentions.length);
assert.strictEqual(noDuplicate.priceObservations.length, enriched.priceObservations.length);

console.log("external metadata enrichment tests passed");
