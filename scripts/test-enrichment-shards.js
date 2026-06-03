const assert = require("assert");
const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const { readEnrichmentPayload, writeEnrichmentPayload } = require("./enrichment-shards");

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
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
  console.log("enrichment shard tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
