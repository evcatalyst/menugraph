const assert = require("assert");
const {
  actionsForSource,
  numberRatio,
  optionsFromArgs,
  sourceIdForKey,
  sourceRows,
  summarizeRows,
} = require("./build-enrichment-coverage-report");

assert.strictEqual(sourceIdForKey("cia"), "cia_menu_collection");
assert.strictEqual(sourceIdForKey("nypl"), "nypl_wotm");
assert.strictEqual(sourceIdForKey("lapl"), "lapl_menu_collection");
assert.strictEqual(sourceIdForKey("northwestern"), "northwestern_transport_menus");
assert.strictEqual(sourceIdForKey("tulane"), "tulane_louisiana_menu_collection");
assert.strictEqual(sourceIdForKey("unlv"), "unlv_menus_art_of_dining");
assert.strictEqual(numberRatio(3, 10), 0.3);
assert.strictEqual(numberRatio(99, 10), 1);
assert.strictEqual(numberRatio(1, 0), 0);

const thinPriceActions = actionsForSource(
  {
    sourceId: "lapl_menu_collection",
    sourceType: "menu",
    rowCount: 100,
    priceCoverage: 0.02,
    dishCoverage: 0.4,
    imageCoverage: 0.9,
    ocrFailures: 2,
  },
  { publicItemCount: 500 }
);
assert.deepStrictEqual(
  thinPriceActions.map((item) => item.id),
  ["source_image_route_review", "local_ocr_price_pass", "metadata_dish_hint_pass", "expand_source_limit"]
);

const recipeActions = actionsForSource({
  sourceId: "the_sifter",
  sourceType: "recipe_or_food_history",
  recipeBridgeClusters: 0,
  rowCount: 0,
  priceCoverage: 0,
  dishCoverage: 0,
  imageCoverage: 0,
  ocrFailures: 0,
});
assert.strictEqual(recipeActions[0].id, "recipe_bridge_sampling");

const bridgedRecipeActions = actionsForSource({
  sourceId: "the_sifter",
  sourceType: "recipe_or_food_history",
  recipeBridgeClusters: 50,
  rowCount: 0,
  priceCoverage: 0,
  dishCoverage: 0,
  imageCoverage: 0,
  ocrFailures: 0,
});
assert.strictEqual(bridgedRecipeActions[0].id, "recipe_bridge_expansion");

const rows = sourceRows(
  new Map([
    [
      "lapl_menu_collection",
      {
        sourceId: "lapl_menu_collection",
        sourceKey: "lapl",
        label: "LAPL",
        sourceType: "menu",
        staticMenuIds: new Set(),
        externalMenuIds: new Set(["lapl:1", "lapl:2"]),
        dateMenuIds: new Set(["lapl:1"]),
        dishMenuIds: new Set(["lapl:1"]),
        priceMenuIds: new Set(),
        sourcePriceMenuIds: new Set(["lapl:2"]),
        ingredientMenuIds: new Set(["lapl:1"]),
        imageMenuIds: new Set(["lapl:1", "lapl:2"]),
        ocrCandidateIds: new Set(["ocr:1"]),
        ocrProcessedMenuIds: new Set(["lapl:1"]),
        ocrFailureMenuIds: new Set(["lapl:2"]),
        recipeClusterIds: new Set(),
        counts: {
          dishMentions: 3,
          priceObservations: 0,
          sourcePriceItems: 12,
          sourceItemRows: 20,
          imageFeatures: 2,
          ocrPagesProcessed: 1,
          ocrPagesFailed: 1,
          ocrTextLines: 40,
          recipeClusterCandidates: 0,
        },
        ingredientTags: new Map([["coffee", 2]]),
        dishTypes: new Map([["beverage", 1]]),
        transportModes: new Map([["restaurant", 2]]),
        failureClasses: new Map([["access_denied", 1]]),
      },
    ],
    [
      "recipe1m_plus",
      {
        sourceId: "recipe1m_plus",
        sourceKey: "",
        label: "Recipe1M+",
        sourceType: "recipe_or_food_history",
        staticMenuIds: new Set(),
        externalMenuIds: new Set(),
        dateMenuIds: new Set(),
        dishMenuIds: new Set(),
        priceMenuIds: new Set(),
        ingredientMenuIds: new Set(),
        imageMenuIds: new Set(),
        ocrCandidateIds: new Set(),
        ocrProcessedMenuIds: new Set(),
        ocrFailureMenuIds: new Set(),
        recipeClusterIds: new Set(["recipecluster:coffee"]),
        counts: { dishMentions: 0, priceObservations: 0, imageFeatures: 0, ocrPagesProcessed: 0, ocrPagesFailed: 0, ocrTextLines: 0, recipeClusterCandidates: 1 },
        ingredientTags: new Map(),
        dishTypes: new Map(),
        transportModes: new Map(),
        failureClasses: new Map(),
      },
    ],
  ]),
  { records: [{ sourceId: "lapl_menu_collection", publicItemCount: 10 }] }
);

const lapl = rows.find((row) => row.sourceId === "lapl_menu_collection");
assert.strictEqual(lapl.status, "external_graph_rows");
assert.strictEqual(lapl.rowCount, 2);
assert.strictEqual(lapl.imageCoverage, 1);
assert.strictEqual(lapl.priceCoverage, 0.5);
assert.strictEqual(lapl.sampledPriceMenus, 0);
assert.strictEqual(lapl.sourceStructuredPriceMenus, 1);
assert.strictEqual(lapl.sourceStructuredPriceItems, 12);
assert.strictEqual(lapl.failureClasses.access_denied, 1);
assert(lapl.nextActions.some((item) => item.id === "source_image_route_review"));

const summary = summarizeRows(rows);
assert.strictEqual(summary.sources, 2);
assert.strictEqual(summary.rowLevelSources, 1);
assert.strictEqual(summary.ocrFailures, 1);
assert.strictEqual(summary.recipeBridgeClusters, 1);
assert.strictEqual(summary.byStatus.external_graph_rows, 1);
assert.strictEqual(summary.byStatus.recipe_bridge_targets, 1);

const options = optionsFromArgs(["--dry-run", "--output=/tmp/report.json"]);
assert.strictEqual(options.dryRun, true);
assert.strictEqual(options.outputPath, "/tmp/report.json");

console.log("enrichment coverage report tests passed");
