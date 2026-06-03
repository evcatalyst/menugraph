const assert = require("assert");
const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const {
  readEnrichmentPayload,
  readRecipeBridgePayload,
  writeEnrichmentPayload,
  writeRecipeBridgePayload,
} = require("./enrichment-shards");

async function run() {
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "menugraph-shards-"));
  try {
    const filePath = path.join(tempDir, "dish-mentions.json");
    const records = Array.from({ length: 25 }, (_, index) => ({
      id: `dish:${index}`,
      menuId: `menu:${Math.floor(index / 3)}`,
      rawName: `Dish ${index}`,
      notes: "x".repeat(120),
    }));
    const payload = {
      version: 1,
      generatedAt: "2026-06-03T00:00:00.000Z",
      summary: { total: records.length },
      records,
    };
    const result = await writeEnrichmentPayload(filePath, payload, { shard: true, maxShardBytes: 1400 });
    assert(result.sharded, "payload should be sharded");
    assert(result.shards.length > 1, "fixture should split into multiple shards");
    assert(result.shards.every((shard) => shard.bytes <= 1600), "shards should stay near the configured byte target");

    const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
    assert.strictEqual(manifest.sharded, true);
    assert.deepStrictEqual(manifest.records, [], "manifest should not duplicate records");
    assert.strictEqual(manifest.summary.total, records.length);

    const reloaded = await readEnrichmentPayload(filePath, { records: [] });
    assert.strictEqual(reloaded.records.length, records.length);
    assert.deepStrictEqual(reloaded.records.map((record) => record.id), records.map((record) => record.id));

    const recipePath = path.join(tempDir, "recipe-bridge.json");
    const recipePayload = {
      version: 1,
      generatedAt: "2026-06-03T00:00:00.000Z",
      summary: { clusters: 12, dishLinks: 12 },
      sources: [{ sourceId: "the_sifter" }],
      ingredientIndex: { oyster: 4 },
      clusters: Array.from({ length: 12 }, (_, index) => ({
        id: `recipecluster:${index}`,
        canonicalDishId: `dish:${index}`,
        canonicalName: `Dish ${index}`,
        menuIds: [`cia:${index}`],
        notes: "x".repeat(160),
      })),
      dishLinks: Array.from({ length: 12 }, (_, index) => ({
        id: `recipelink:${index}`,
        canonicalDishId: `dish:${index}`,
        recipeClusterId: `recipecluster:${index}`,
        relationType: "historical_menu_dish_to_recipe_cluster",
        confidence: 0.7,
      })),
    };
    const recipeResult = await writeRecipeBridgePayload(recipePath, recipePayload, { shard: true, maxShardBytes: 1500 });
    assert(recipeResult.sharded, "recipe bridge should be sharded");
    assert(recipeResult.clusterShards.length > 1, "recipe fixture should split cluster shards");
    assert(recipeResult.dishLinkShards.length > 1, "recipe fixture should split link shards");

    const recipeManifest = JSON.parse(fs.readFileSync(recipePath, "utf8"));
    assert.strictEqual(recipeManifest.shardKey, "recipe_bridge");
    assert.deepStrictEqual(recipeManifest.clusters, [], "recipe manifest should not duplicate clusters");
    assert.deepStrictEqual(recipeManifest.dishLinks, [], "recipe manifest should not duplicate dish links");

    const reloadedRecipe = await readRecipeBridgePayload(recipePath, { clusters: [], dishLinks: [] });
    assert.strictEqual(reloadedRecipe.clusters.length, recipePayload.clusters.length);
    assert.strictEqual(reloadedRecipe.dishLinks.length, recipePayload.dishLinks.length);
    assert.deepStrictEqual(reloadedRecipe.clusters.map((cluster) => cluster.id), recipePayload.clusters.map((cluster) => cluster.id));
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
  console.log("enrichment shard tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
