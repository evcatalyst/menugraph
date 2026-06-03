const assert = require("assert");
const {
  buildRecipeBridge,
  clusterScore,
  observeExternalMenuRecord,
  optionsFromArgs,
  sourceCandidatesForCluster,
  techniqueTagsFor,
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

const options = optionsFromArgs(["--cluster-limit=25", "--dish-link-limit=40", "--max-shard-bytes=2048", "--dry-run"]);
assert.strictEqual(options.clusterLimit, 25);
assert.strictEqual(options.dishLinkLimit, 40);
assert.strictEqual(options.maxShardBytes, 2048);
assert.strictEqual(options.shard, true);
assert.strictEqual(options.dryRun, true);

assert.strictEqual(optionsFromArgs(["--no-shard"]).shard, false);

const externalClusters = new Map();
const observedExternal = observeExternalMenuRecord(externalClusters, {
  menuId: "cornell:test",
  sourceId: "cornell_nestle_menu_collection",
  sourceKey: "cornell",
  year: 1900,
  dishMentions: [{ rawName: "tempura", normalizedName: "tempura", ingredientTags: [] }],
  priceObservations: [{ rawName: "per-person menu price", amount: 3, rawPrice: "$3", currencyCode: "USD" }],
});
assert.deepStrictEqual(observedExternal, { dishMentions: 1, priceObservations: 1 });
assert.strictEqual(externalClusters.size, 2);

buildRecipeBridge({ dryRun: true, clusterLimit: 25, dishLinkLimit: 40 })
  .then((payload) => {
    assert(payload.summary.clusters > 0, "dry-run bridge should produce clusters from current enrichment data");
    assert(payload.summary.dishLinks > 0, "dry-run bridge should produce dish links");
    assert(payload.summary.externalMenuRecords > 0, "dry-run bridge should include external menu rows");
    assert(payload.summary.externalDishMentions > 0, "dry-run bridge should include external dish evidence");
    assert(payload.sources.some((source) => source.sourceId === "the_sifter"), "bridge should expose recipe/history target sources");
    assert(payload.clusters.every((cluster) => cluster.rightsCategory === "derived_metadata_only"), "bridge must remain derived metadata only");
    console.log("recipe bridge tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
