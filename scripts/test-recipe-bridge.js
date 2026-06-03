const assert = require("assert");
const {
  buildRecipeBridge,
  clusterScore,
  sourceCandidatesForCluster,
  techniqueTagsFor,
  optionsFromArgs,
} = require("./build-recipe-bridge");

assert.deepStrictEqual(techniqueTagsFor("Broiled Lobster with Sauce Bearnaise").sort(), ["broiled", "sauce"]);

const historicalCandidates = sourceCandidatesForCluster({
  firstSeenYear: 1898,
  observedDishMentionCount: 8,
  priceObservationCount: 3,
  ingredientTags: ["lobster", "butter"],
  dishType: "seafood",
  sourceKeys: new Set(["cia", "nypl"]),
});
assert(historicalCandidates.some((candidate) => candidate.sourceId === "the_sifter"), "historical clusters should target The Sifter");
assert(historicalCandidates.some((candidate) => candidate.sourceId === "recipe1m_plus"), "recipe clusters should target Recipe1M+");
assert(historicalCandidates.some((candidate) => candidate.sourceId === "epicurious_kaggle"), "ingredient-rich clusters should target nutrition proxy sources");

assert(
  clusterScore({
    observedDishMentionCount: 10,
    priceObservationCount: 4,
    menuIds: new Set(["a", "b"]),
    sourceKeys: new Set(["cia", "nypl"]),
    ingredientTags: ["beef", "wine"],
    firstSeenYear: 1880,
    dishType: "meat",
  }) >
    clusterScore({
      observedDishMentionCount: 2,
      priceObservationCount: 0,
      menuIds: new Set(["a"]),
      sourceKeys: new Set(["nypl"]),
      ingredientTags: [],
      firstSeenYear: 1970,
      dishType: "dish",
    }),
  "historical, ingredient-rich, price-linked clusters should rank higher"
);

const options = optionsFromArgs(["--cluster-limit=25", "--dish-link-limit=40", "--dry-run"]);
assert.strictEqual(options.clusterLimit, 25);
assert.strictEqual(options.dishLinkLimit, 40);
assert.strictEqual(options.dryRun, true);

buildRecipeBridge({ dryRun: true, clusterLimit: 25, dishLinkLimit: 40 })
  .then((payload) => {
    assert(payload.summary.clusters > 0, "dry-run bridge should produce clusters from current enrichment data");
    assert(payload.summary.dishLinks > 0, "dry-run bridge should produce dish links");
    assert(payload.sources.some((source) => source.sourceId === "the_sifter"), "bridge should expose recipe/history target sources");
    assert(payload.clusters.every((cluster) => cluster.rightsCategory === "derived_metadata_only"), "bridge must remain derived metadata only");
    console.log("recipe bridge tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
