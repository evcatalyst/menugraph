const assert = require("assert");
const {
  compactSample,
  optionsFromArgs,
  probeForSource,
  sourceKeyForSource,
  sourceTypeFor,
  statusFor,
  summarize,
  summarizeExternal,
  summarizeStaticMenus,
} = require("./build-source-probes");

assert.strictEqual(sourceKeyForSource({ id: "lapl_menu_collection" }), "lapl");
assert.strictEqual(sourceKeyForSource({ id: "recipe1m_plus" }), "");
assert.strictEqual(sourceTypeFor("the_sifter"), "recipe_or_food_history");
assert.strictEqual(sourceTypeFor("dotlas_structured_menus"), "commercial_modern_menu");
assert.strictEqual(sourceTypeFor("cia_menu_collection"), "menu");

assert.strictEqual(statusFor({ staticSummary: { rows: 2 }, sourceType: "menu" }), "static_rows");
assert.strictEqual(statusFor({ externalSummary: { rows: 2 }, sourceType: "menu" }), "external_rows");
assert.strictEqual(statusFor({ recipeBridgeClusters: 5, sourceType: "recipe_or_food_history" }), "recipe_bridge_targets");
assert.strictEqual(statusFor({ priorProbe: { status: "error" }, sourceType: "menu" }), "probe_error");
assert.strictEqual(statusFor({ sourceType: "commercial_modern_menu" }), "license_required");

const sample = compactSample({
  title: "Dinner Menu",
  year: 1912,
  menuId: "nypl:1",
  itemUrl: "https://example.test/menu/1",
});
assert.deepStrictEqual(sample, {
  title: "Dinner Menu",
  date: "1912",
  menuId: "nypl:1",
  itemUrl: "https://example.test/menu/1",
});

const staticSummary = summarizeStaticMenus([
  { uid: "cia:1", sourceKey: "cia", title: "Unknown Dinner", decade: "unknown", topDishes: ["Steak"] },
  { uid: "nypl:2", sourceKey: "nypl", title: "Known Lunch", year: 1920, itemCount: 10, priceCount: 4 },
]);
assert.strictEqual(staticSummary.get("cia_menu_collection").rows, 1);
assert.strictEqual(staticSummary.get("cia_menu_collection").dishRows, 1);
assert.strictEqual(staticSummary.get("nypl_wotm").datedRows, 1);
assert.strictEqual(staticSummary.get("nypl_wotm").priceRows, 1);

const externalSummary = summarizeExternal([
  {
    sourceId: "lapl_menu_collection",
    menuId: "lapl:1",
    title: "Cafe Menu",
    year: 1972,
    dishMentions: [{ rawName: "Taco" }],
    priceObservations: [{ rawPrice: "$1.25" }],
    iiifManifestUrl: "https://example.test/iiif",
  },
]);
assert.strictEqual(externalSummary.get("lapl_menu_collection").rows, 1);
assert.strictEqual(externalSummary.get("lapl_menu_collection").dishMentions, 1);
assert.strictEqual(externalSummary.get("lapl_menu_collection").priceObservations, 1);
assert.strictEqual(externalSummary.get("lapl_menu_collection").imageRoutes, 1);

const probe = probeForSource(
  { id: "the_sifter", label: "The Sifter" },
  {
    generatedAt: "2026-01-01T00:00:00.000Z",
    staticBySource: new Map(),
    externalBySource: new Map(),
    priorProbeBySource: new Map(),
    recipeSourceCandidates: { the_sifter: 123 },
  }
);
assert.strictEqual(probe.status, "recipe_bridge_targets");
assert.strictEqual(probe.recipeBridgeClusters, 123);
assert.strictEqual(probe.sourceType, "recipe_or_food_history");
assert(/no full recipe text/i.test(probe.notes));

const summary = summarize([
  { status: "static_rows", sourceType: "menu", ingestedRows: 2, staticRows: 2, externalRows: 0, recipeBridgeClusters: 0 },
  { status: "recipe_bridge_targets", sourceType: "recipe_or_food_history", ingestedRows: 0, staticRows: 0, externalRows: 0, recipeBridgeClusters: 5 },
]);
assert.strictEqual(summary.total, 2);
assert.strictEqual(summary.byStatus.static_rows, 1);
assert.strictEqual(summary.recipeBridgeClusters, 5);

const options = optionsFromArgs(["--dry-run", "--output=/tmp/source-probes.json", "--prior=/tmp/prior.json"]);
assert.strictEqual(options.dryRun, true);
assert.strictEqual(options.outputPath, "/tmp/source-probes.json");
assert.strictEqual(options.priorPath, "/tmp/prior.json");

console.log("source probe tests passed");
