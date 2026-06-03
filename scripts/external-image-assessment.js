const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { cleanValue } = require("../docs/multisource");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const ENRICHMENT_DIR = path.join(DATA_DIR, "enrichment");
const SOURCE_DIR = path.join(ENRICHMENT_DIR, "external-sources");
const CACHE_DIR = path.join(ROOT_DIR, ".cache", "enrichment", "iiif-info");
const VERSION = 1;

function argValue(args, name, fallback = null) {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

function stableId(prefix, parts) {
  return `${prefix}:${crypto.createHash("sha1").update(parts.map((part) => cleanValue(part)).join("|")).digest("hex").slice(0, 16)}`;
}

function cacheKey(url) {
  return crypto.createHash("sha1").update(cleanValue(url)).digest("hex");
}

function sourcePrefix(record) {
  return cleanValue(record.sourceKey || record.sourceId || "external").replace(/[^a-z0-9_-]+/gi, "").toLowerCase() || "external";
}

function orientationFor(width, height) {
  if (!width || !height) return "unknown";
  const ratio = width / height;
  if (Math.abs(ratio - 1) <= 0.08) return "square";
  return ratio > 1 ? "landscape" : "portrait";
}

function dimensionsFromInfoJson(payload) {
  const width = Number(payload?.width);
  const height = Number(payload?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const mediaType = cleanValue(payload?.type || payload?.["@type"]).includes("ImageService") ? "image/jpeg" : cleanValue(payload?.format || "image/jpeg");
  return {
    width,
    height,
    mediaType,
    sourceKind: "iiif_info",
  };
}

function dimensionsFromManifest(payload) {
  const canvases =
    payload?.items ||
    payload?.sequences?.flatMap((sequence) => sequence.canvases || []) ||
    payload?.canvases ||
    [];
  const firstCanvas = canvases.find((canvas) => Number(canvas?.width) > 0 && Number(canvas?.height) > 0);
  if (!firstCanvas) return null;
  const width = Number(firstCanvas.width);
  const height = Number(firstCanvas.height);
  const body =
    firstCanvas.items?.[0]?.items?.[0]?.body ||
    firstCanvas.images?.[0]?.resource ||
    firstCanvas.thumbnail?.[0] ||
    firstCanvas.thumbnail ||
    {};
  return {
    width,
    height,
    mediaType: cleanValue(body.format || body.type || body["@type"] || "image/jpeg"),
    sourceKind: "iiif_manifest",
  };
}

function dimensionsFromIiifPayload(payload, url = "") {
  const direct = dimensionsFromInfoJson(payload);
  const manifest = direct ? null : dimensionsFromManifest(payload);
  const dims = direct || manifest;
  if (!dims) return null;
  const aspectRatio = Number((dims.width / dims.height).toFixed(3));
  return {
    width: dims.width,
    height: dims.height,
    aspectRatio,
    orientation: orientationFor(dims.width, dims.height),
    mediaType: dims.mediaType || "image/jpeg",
    sourceKind: dims.sourceKind,
    assessmentUrl: cleanValue(url),
  };
}

function assessmentUrlFor(record, feature = {}) {
  const sourceFeature = feature || {};
  return cleanValue(sourceFeature.iiifInfoUri || record.iiifInfoUri || record.iiifManifestUrl);
}

function mergeImageFeature(record, dimensions, url) {
  const features = Array.isArray(record.imageFeatures) ? record.imageFeatures : [];
  const existing =
    features.find((feature) => cleanValue(feature.iiifInfoUri) === url || cleanValue(feature.iiifManifestUrl) === url) ||
    features[0] ||
    null;
  const id =
    cleanValue(existing?.id) ||
    stableId(`${sourcePrefix(record)}image`, [record.menuId || record.id, record.sourceRecordId, url]);
  const scalar = {
    ...(existing?.scalar || {}),
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio: dimensions.aspectRatio,
    orientation: dimensions.orientation,
    mediaType: dimensions.mediaType,
    pageCount: existing?.scalar?.pageCount ?? record.pageCount ?? null,
    hasImageUri: Boolean(existing?.scalar?.hasImageUri || record.imageUri || existing?.sourceImageUrl),
    hasIiifInfo: Boolean(existing?.scalar?.hasIiifInfo || record.iiifInfoUri || cleanValue(existing?.iiifInfoUri)),
    hasIiifManifest: Boolean(record.iiifManifestUrl || existing?.iiifManifestUrl),
  };
  const next = {
    ...(existing || {}),
    id,
    menuId: cleanValue(existing?.menuId || record.menuId || record.id),
    sourceId: cleanValue(existing?.sourceId || record.sourceId),
    sourceKey: cleanValue(existing?.sourceKey || record.sourceKey),
    featureType: "iiif_metadata_assessed",
    scalar,
    sourceImageUrl: cleanValue(existing?.sourceImageUrl || record.imageUri || record.thumbnailUrl),
    iiifInfoUri: cleanValue(existing?.iiifInfoUri || record.iiifInfoUri),
    iiifManifestUrl: cleanValue(existing?.iiifManifestUrl || record.iiifManifestUrl),
    modelName: "external_iiif_metadata_assessment",
    modelVersion: "0.1.0",
    confidence: 0.88,
    provenance: {
      ...(existing?.provenance || {}),
      sourceFile: existing?.provenance?.sourceFile || record.provenance?.sourceFile,
      sourceRecordId: cleanValue(record.sourceRecordId),
      assessmentUrl: cleanValue(url),
      assessmentSourceKind: dimensions.sourceKind,
      rightsNote: "Derived IIIF metadata only; no image pixels, OCR text, or thumbnails copied.",
    },
  };
  if (!existing) return [next, ...features];
  return features.map((feature) => (feature === existing ? next : feature));
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

async function sourceFiles() {
  const files = [];
  const legacy = path.join(ENRICHMENT_DIR, "external-menu-records.json");
  if (await readJson(legacy, null)) files.push(legacy);
  let names = [];
  try {
    names = await fs.readdir(SOURCE_DIR);
  } catch (error) {
    names = [];
  }
  for (const name of names.filter((item) => item.endsWith(".json")).sort()) {
    files.push(path.join(SOURCE_DIR, name));
  }
  return files;
}

async function fetchJsonCached(url, options, stats) {
  const key = cacheKey(url);
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  if (!options.refresh) {
    const cached = await readJson(cachePath, null);
    if (cached) {
      stats.cacheHits += 1;
      return cached;
    }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MenuGraph lightweight IIIF metadata assessor; no image pixel download",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    stats.fetched += 1;
    if (!options.dryRun) await writeJson(cachePath, payload);
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function assessPayload(payload, sourceFile, options, stats) {
  const sourceFilter = new Set(options.sources);
  let changed = false;
  const candidates = [];
  for (const record of payload.records || []) {
    if (options.limit && candidates.length >= options.limit) break;
    if (sourceFilter.size && !sourceFilter.has(cleanValue(record.sourceId || record.sourceKey))) continue;
    const firstFeature = Array.isArray(record.imageFeatures) ? record.imageFeatures[0] : null;
    const url = assessmentUrlFor(record, firstFeature);
    if (!url) continue;
    candidates.push({ record, url });
  }

  let nextIndex = 0;
  async function worker() {
    while (nextIndex < candidates.length) {
      const { record, url } = candidates[nextIndex++];
      stats.recordsExamined += 1;
      try {
        const iiifPayload = await fetchJsonCached(url, options, stats);
        const dimensions = dimensionsFromIiifPayload(iiifPayload, url);
        if (!dimensions) {
          stats.noDimensions += 1;
          continue;
        }
        record.imageFeatures = mergeImageFeature(record, dimensions, url).slice(0, 3);
        changed = true;
        stats.featuresUpdated += 1;
        const key = cleanValue(record.sourceId || record.sourceKey || "external");
        stats.bySource[key] = (stats.bySource[key] || 0) + 1;
      } catch (error) {
        stats.errors.push({
          sourceFile: path.relative(DATA_DIR, sourceFile),
          menuId: cleanValue(record.menuId || record.id),
          url,
          error: error.message,
        });
      }
      if (options.onProgress && stats.recordsExamined % 50 === 0) {
        options.onProgress(`external image assessment ${stats.recordsExamined} records, ${stats.featuresUpdated} features updated`);
      }
    }
  }
  const concurrency = Math.max(1, Math.min(Number(options.concurrency || 1), candidates.length || 1));
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return changed;
}

async function assessExternalImages(options = {}) {
  const startedAt = new Date().toISOString();
  const stats = {
    filesProcessed: 0,
    recordsExamined: 0,
    featuresUpdated: 0,
    fetched: 0,
    cacheHits: 0,
    noDimensions: 0,
    bySource: {},
    errors: [],
  };
  const files = options.files || (await sourceFiles());
  for (const filePath of files) {
    const payload = await readJson(filePath, null);
    if (!payload?.records?.length) continue;
    const changed = await assessPayload(payload, filePath, options, stats);
    if (changed && !options.dryRun) {
      payload.imageAssessment = {
        version: VERSION,
        assessedAt: new Date().toISOString(),
        method: "iiif_info_or_manifest_metadata",
        note: "No image pixels, thumbnails, OCR, or embedding vectors copied.",
      };
      payload.summary = {
        ...(payload.summary || {}),
        imageFeatures: (payload.records || []).reduce((sum, record) => sum + (record.imageFeatures || []).length, 0),
        imageFeaturesWithDimensions: (payload.records || []).filter((record) =>
          (record.imageFeatures || []).some((feature) => Number(feature.scalar?.width) > 0 && Number(feature.scalar?.height) > 0)
        ).length,
      };
      await writeJson(filePath, payload);
    }
    stats.filesProcessed += 1;
  }
  return {
    version: VERSION,
    startedAt,
    finishedAt: new Date().toISOString(),
    summary: stats,
  };
}

function optionsFromArgs(args = process.argv.slice(2)) {
  const sourceArg = cleanValue(argValue(args, "source", ""));
  return {
    timeoutMs: Math.max(3000, Number(argValue(args, "timeout-ms", "15000")) || 15000),
    limit: Math.max(0, Number(argValue(args, "limit", "0")) || 0),
    concurrency: Math.max(1, Math.min(16, Number(argValue(args, "concurrency", "6")) || 6)),
    sources: sourceArg ? sourceArg.split(",").map(cleanValue).filter(Boolean) : [],
    refresh: hasFlag(args, "refresh"),
    dryRun: hasFlag(args, "dry-run"),
    onProgress: hasFlag(args, "quiet") ? null : (message) => console.log(`[external-images] ${message}`),
  };
}

async function main() {
  const output = await assessExternalImages(optionsFromArgs());
  console.log(JSON.stringify(output.summary, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  assessExternalImages,
  dimensionsFromIiifPayload,
  mergeImageFeature,
  optionsFromArgs,
  orientationFor,
};
