const path = require("path");
const { readEnrichmentPayload, writeEnrichmentPayload } = require("./enrichment-shards");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");

const TARGETS = [
  "enrichment/dish-mentions.json",
  "enrichment/price-observations.json",
  "enrichment/ocr-extractions.json",
];

function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

async function shardEnrichmentArtifacts(options = {}) {
  const results = [];
  for (const relativePath of options.targets || TARGETS) {
    const filePath = path.join(DATA_DIR, relativePath);
    const payload = await readEnrichmentPayload(filePath, { version: 1, records: [] });
    if (options.dryRun) {
      results.push({
        file: relativePath,
        records: (payload.records || []).length,
        dryRun: true,
      });
      continue;
    }
    const result = await writeEnrichmentPayload(filePath, payload, { shard: true });
    results.push({
      file: relativePath,
      records: (payload.records || []).length,
      manifestBytes: result.bytes,
      shards: result.shards.length,
      maxShardBytes: Math.max(...result.shards.map((shard) => shard.bytes), 0),
    });
  }
  return results;
}

async function main() {
  const results = await shardEnrichmentArtifacts({ dryRun: hasFlag(process.argv.slice(2), "dry-run") });
  console.log(JSON.stringify(results, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  TARGETS,
  shardEnrichmentArtifacts,
};
