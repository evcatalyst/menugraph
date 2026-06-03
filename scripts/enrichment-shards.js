const fs = require("fs/promises");
const path = require("path");

const DEFAULT_MAX_SHARD_BYTES = 8 * 1024 * 1024;

async function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function byteLength(payload) {
  return Buffer.byteLength(JSON.stringify(payload), "utf8");
}

function shardDirectoryFor(filePath) {
  return path.join(path.dirname(filePath), "shards", path.basename(filePath, ".json"));
}

function shardFileName(index) {
  return `part-${String(index + 1).padStart(4, "0")}.json`;
}

async function readEnrichmentPayload(filePath, fallback = {}) {
  const payload = await readJson(filePath, fallback);
  if (!payload?.sharded || !Array.isArray(payload.shards)) return payload;

  const records = [];
  for (const shard of payload.shards) {
    const shardPath = path.resolve(path.dirname(filePath), shard.file);
    const shardPayload = await readJson(shardPath, { records: [] });
    records.push(...(shardPayload.records || []));
  }

  return {
    ...payload,
    records,
  };
}

function splitRecordsIntoShards(payload, options = {}) {
  const maxShardBytes = Math.max(1024, Number(options.maxShardBytes || DEFAULT_MAX_SHARD_BYTES));
  const records = payload.records || [];
  const shards = [];
  let current = [];
  let currentBytes = 0;

  const makeShardPayload = (items, index) => ({
    version: payload.version,
    generatedAt: payload.generatedAt,
    parent: path.basename(options.filePath || "enrichment.json"),
    shardIndex: index,
    summary: {
      records: items.length,
    },
    records: items,
  });

  const emptyShardBytes = (index) => byteLength(makeShardPayload([], index));
  currentBytes = emptyShardBytes(0);

  const flush = () => {
    shards.push(makeShardPayload(current, shards.length));
    current = [];
    currentBytes = emptyShardBytes(shards.length);
  };

  for (const record of records) {
    const recordBytes = byteLength(record);
    const nextBytes = currentBytes + recordBytes + (current.length ? 1 : 0);
    if (current.length && nextBytes > maxShardBytes) {
      flush();
    }
    current.push(record);
    currentBytes += recordBytes + (current.length > 1 ? 1 : 0);
  }
  if (current.length) {
    flush();
  } else if (!records.length) {
    shards.push(makeShardPayload([], 0));
  }
  return shards;
}

async function writeEnrichmentPayload(filePath, payload, options = {}) {
  const shard = Boolean(options.shard);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  if (!shard) {
    await fs.writeFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
    return { sharded: false, bytes: byteLength(payload), shards: [] };
  }

  const shardDir = shardDirectoryFor(filePath);
  await fs.rm(shardDir, { recursive: true, force: true });
  await fs.mkdir(shardDir, { recursive: true });

  const shardPayloads = splitRecordsIntoShards(payload, { ...options, filePath });
  const shardSummaries = [];
  for (const [index, shardPayload] of shardPayloads.entries()) {
    const fileName = shardFileName(index);
    const shardPath = path.join(shardDir, fileName);
    const contents = `${JSON.stringify(shardPayload)}\n`;
    await fs.writeFile(shardPath, contents, "utf8");
    shardSummaries.push({
      file: path.join("shards", path.basename(filePath, ".json"), fileName),
      records: shardPayload.records.length,
      bytes: Buffer.byteLength(contents, "utf8"),
    });
  }

  const manifest = {
    ...payload,
    sharded: true,
    shardKey: "records",
    records: [],
    shards: shardSummaries,
  };
  const manifestContents = `${JSON.stringify(manifest)}\n`;
  await fs.writeFile(filePath, manifestContents, "utf8");
  return {
    sharded: true,
    bytes: Buffer.byteLength(manifestContents, "utf8"),
    shards: shardSummaries,
  };
}

module.exports = {
  DEFAULT_MAX_SHARD_BYTES,
  readEnrichmentPayload,
  splitRecordsIntoShards,
  writeEnrichmentPayload,
};
