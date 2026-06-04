const assert = require("assert");
const { enrichExternalRecord, metadataDishCandidates, metadataPriceLines, metadataPriceObservations } = require("./enrich-external-metadata");

const record = {
  id: "sample:1",
  menuId: "sample:1",
  sourceId: "sample_source",
  sourceKey: "sample",
  sourceRecordId: "1",
  title: "Harbor House seafood dinner menu",
  descriptionSummary: "Menu offers Special Table D'Hote oyster dinners for $1.25; Wine list; Seafood; Restaurants--Sample City",
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

const cuisineCandidates = metadataDishCandidates(
  {
    id: "sample:3",
    menuId: "sample:3",
    sourceId: "sample_source",
    sourceKey: "sample",
    title: "Auberge Du Coucou",
    descriptionSummary: "Assorted International Menus",
    cuisineTags: ["french", "belgian"],
    dishMentions: [],
    priceObservations: [],
    ingredientTags: [],
  },
  { ingredientLimit: 2 }
);
assert(cuisineCandidates.some((candidate) => candidate.rawName === "french dishes"));
assert(cuisineCandidates.some((candidate) => candidate.rawName === "belgian dishes"));

const foodSignalCandidates = metadataDishCandidates(
  {
    id: "sample:4",
    menuId: "sample:4",
    sourceId: "sample_source",
    sourceKey: "sample",
    title: "Bagel Express children's menu",
    descriptionSummary: "Bagels--Washington (State)--Seattle",
    subjectTerms: ["Bagels--Washington (State)--Seattle"],
    dishMentions: [],
    priceObservations: [],
    ingredientTags: [],
  },
  { ingredientLimit: 2 }
);
assert(foodSignalCandidates.some((candidate) => candidate.rawName === "bagel dishes"));
assert(foodSignalCandidates.some((candidate) => candidate.rawName === "children's meals"));

const cuisineSubjectCandidates = metadataDishCandidates(
  {
    id: "sample:4b",
    menuId: "sample:4b",
    sourceId: "sample_source",
    sourceKey: "sample",
    title: "Kokeb Restaurant and India House menus",
    descriptionSummary: "Opened as one of Seattle's first Ethiopian restaurants. Restaurants; East Indian restaurants; Cooking Greek",
    subjectTerms: ["East Indian restaurants", "Cooking Greek"],
    dishMentions: [],
    priceObservations: [],
    ingredientTags: [],
  },
  { ingredientLimit: 2 }
);
assert(cuisineSubjectCandidates.some((candidate) => candidate.rawName === "ethiopian dishes"));
assert(cuisineSubjectCandidates.some((candidate) => candidate.rawName === "indian dishes"));
assert(cuisineSubjectCandidates.some((candidate) => candidate.rawName === "greek dishes"));

const prices = metadataPriceObservations(record, { cpiUs: {} }, [], "sample.json");
assert.strictEqual(prices.length, 1);
assert.strictEqual(prices[0].rawPrice, "$1.25");
assert.strictEqual(prices[0].sourceId, "sample_source");
assert.strictEqual(prices[0].extractionMethod, "external_metadata_price_regex");

const metadataPriceExamples = {
  id: "sample:5",
  menuId: "sample:5",
  sourceId: "sample_source",
  sourceKey: "sample",
  sourceRecordId: "5",
  title: "Farrell's Ice Cream Parlour",
  descriptionSummary:
    "Illustrated newspaper-style menu with Woodland Park Zoo sundae, $6.50. It featured a variety of hamburgers, each named after a state and ranging in price from 60 cents to 50 dollars. Menu offers Special Table D'Hote dinners for $1.25.",
  notes: "Supper Dance in Ballroom every Saturday evening, 9 to 12 Tickle's Eight-piece Empress Orchestra $1.00 each, including Supper",
  country: "United States",
  year: 1970,
  dishMentions: [],
  priceObservations: [],
};
const metadataLines = metadataPriceLines(metadataPriceExamples);
assert(metadataLines.some((line) => line.includes("Woodland Park Zoo sundae $6.50")));
assert(metadataLines.some((line) => line.includes("hamburgers price range minimum 60 cents")));
assert(metadataLines.some((line) => line.includes("hamburgers price range maximum $50")));
assert(metadataLines.some((line) => line.includes("Special Table D'Hote dinners $1.25")));
assert(metadataLines.some((line) => line.includes("Supper Dance including supper $1.00")));

const metadataPrices = metadataPriceObservations(metadataPriceExamples, { cpiUs: {} }, [], "sample.json");
assert(metadataPrices.some((price) => price.rawName === "Woodland Park Zoo sundae" && price.amount === 6.5));
assert(metadataPrices.some((price) => price.rawName === "hamburgers price range minimum" && price.amount === 0.6));
assert(metadataPrices.some((price) => price.rawName === "hamburgers price range maximum" && price.amount === 50));
assert(metadataPrices.some((price) => /Special Table D'Hote dinners/.test(price.rawName) && price.amount === 1.25));
assert(metadataPrices.some((price) => price.rawName === "Supper Dance including supper" && price.amount === 1));

const nonMenuMoneyLines = metadataPriceLines({
  id: "sample:6",
  menuId: "sample:6",
  sourceId: "sample_source",
  sourceKey: "sample",
  descriptionSummary:
    "A Seattle Times article reported a robbery at the Railway Exchange Coffee Shop in 1946. The cash register had been broken into and $200 had been taken. McAlpin sold the property to a Canadian real estate company in May 2015 for 4.5 million dollars.",
});
assert.strictEqual(nonMenuMoneyLines.length, 0);

const dedupedMetadataPriceRecord = enrichExternalRecord(
  {
    id: "sample:7",
    menuId: "sample:7",
    sourceId: "sample_source",
    sourceKey: "sample",
    sourceRecordId: "7",
    title: "Coupon menu",
    descriptionSummary: "Menu contains $0.50 discount coupon",
    country: "United States",
    year: 1980,
    dishMentions: [],
    priceObservations: [
      {
        id: "old-price",
        rawName: "Menu contains",
        normalizedName: "menu contains",
        rawPrice: "$0.50",
        amount: 0.5,
        extractionMethod: "external_metadata_price_regex",
      },
    ],
  },
  {
    fileName: "sample.json",
    generatedAt: "2026-06-03T00:00:00.000Z",
    references: { cpiUs: {} },
    contextEvents: [],
    options: { ingredientLimit: 2 },
  }
);
assert.strictEqual(dedupedMetadataPriceRecord.priceObservations.length, 1);
assert.strictEqual(dedupedMetadataPriceRecord.priceObservations[0].rawName, "coupon discount");

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
