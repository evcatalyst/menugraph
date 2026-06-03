const crypto = require("crypto");
const { spawnSync } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const { cleanValue, recordUid } = require("../docs/multisource");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const ENRICHMENT_DIR = path.join(DATA_DIR, "enrichment");
const EXTERNAL_SOURCE_DIR = path.join(ENRICHMENT_DIR, "external-sources");
const OUTPUT_PATH = path.join(ENRICHMENT_DIR, "ocr-triage-queue.json");
const VERSION = 1;
const DEFAULT_RECORD_LIMIT = 5000;
const DEFAULT_EARLY_LIMIT = 100;
const DEFAULT_PAGES_PER_MENU = 2;

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

function localOcrAvailable() {
  return spawnSync("sh", ["-lc", "command -v tesseract >/dev/null 2>&1"], { stdio: "ignore" }).status === 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function sourceIdForMenu(menu) {
  if (menu.sourceId) return cleanValue(menu.sourceId);
  const sourceKey = cleanValue(menu.sourceKey || "cia");
  if (sourceKey === "cia") return "cia_menu_collection";
  if (sourceKey === "nypl") return "nypl_wotm";
  return sourceKey;
}

function scalarForImage(record, imageFeatureByMenu = new Map()) {
  const direct = asArray(record.imageFeatures).find((feature) => feature?.scalar)?.scalar;
  if (direct) return direct;
  return imageFeatureByMenu.get(cleanValue(record.menuId || record.uid || record.id))?.scalar || {};
}

function pageCountFor(record, scalar = {}) {
  const value = Number(record.pageCount || scalar.pageCount || asArray(record.pageIds).length || 1);
  return Number.isFinite(value) && value > 0 ? Math.min(99, Math.ceil(value)) : 1;
}

function hasImageReference(record) {
  return Boolean(record.imageUrl || record.imageUri || record.thumbnailUrl || record.iiifInfoUri || record.iiifManifestUrl || asArray(record.imageFeatures).length);
}

function dateIsUncertain(record) {
  const confidence = cleanValue(record.dateConfidence || record.sourceConfidence).toUpperCase();
  return !record.year || cleanValue(record.decade).toLowerCase() === "unknown" || confidence === "D" || confidence === "X";
}

function hasDishEvidence(record) {
  return Boolean(
    Number(record.itemCount || record.dishCount || 0) ||
      asArray(record.topDishes).length ||
      asArray(record.dishMentions).length ||
      asArray(record.dishHints).length
  );
}

function hasPriceEvidence(record) {
  return Boolean(Number(record.priceCount || record.priceObservationCount || 0) || asArray(record.priceObservations).length);
}

function hasIngredientEvidence(record) {
  return Boolean(asArray(record.ingredientTags).length);
}

function metadataText(record) {
  return [
    record.title,
    record.restaurant,
    record.venueText,
    record.dateText,
    record.descriptionSummary,
    record.notes,
    record.physicalDescription,
    asArray(record.subjects).join("; "),
    asArray(record.subjectTerms).join("; "),
    asArray(record.cuisineTags).join("; "),
    asArray(record.styleTags).join("; "),
  ]
    .map(cleanValue)
    .filter(Boolean)
    .join(" | ");
}

function hasPriceSignal(record) {
  return /\$\s*\d|\b\d+\s*(?:cents?|cts\.?|¢)\b|\b(price list|prices?|prix)\b/i.test(metadataText(record));
}

function dimensionsDifficulty(scalar = {}) {
  const width = Number(scalar.width || 0);
  const height = Number(scalar.height || 0);
  if (!width || !height) return 24;
  const minSide = Math.min(width, height);
  const ratio = width / height;
  let score = 0;
  if (minSide < 900) score += 12;
  if (ratio < 0.38 || ratio > 2.65) score += 10;
  if (width * height > 24_000_000) score += 4;
  return score;
}

function expectedYield(record) {
  return {
    date: dateIsUncertain(record) ? 1 : 0,
    dish: hasDishEvidence(record) ? 0.35 : 1,
    price: hasPriceEvidence(record) ? 0.2 : hasPriceSignal(record) ? 1 : 0.75,
    ingredient: hasIngredientEvidence(record) ? 0.35 : 0.8,
    visualStyle: hasImageReference(record) ? 0.65 : 0,
  };
}

function valueScoreFor(record) {
  const sourceKey = cleanValue(record.sourceKey || "external");
  const year = Number(record.year || record.pointYear || record.lowerYear || 0);
  const yieldScores = expectedYield(record);
  let score = 0;
  if (sourceKey === "cia" && dateIsUncertain(record)) score += 28;
  if (sourceKey !== "nypl") score += 8;
  if (!hasDishEvidence(record)) score += 14;
  if (!hasPriceEvidence(record)) score += 18;
  if (!hasIngredientEvidence(record)) score += 8;
  if (dateIsUncertain(record)) score += 8;
  if (hasPriceSignal(record)) score += 9;
  if (year && year < 1900) score += 12;
  if (/\b(ship|airline|railroad|hotel)\b/i.test(cleanValue(record.transportMode || record.types))) score += 5;
  score += Math.round((yieldScores.dish + yieldScores.price + yieldScores.ingredient + yieldScores.date) * 6);
  return score;
}

function difficultyScoreFor(record, scalar = {}) {
  if (!hasImageReference(record)) return 80;
  const pages = pageCountFor(record, scalar);
  let score = dimensionsDifficulty(scalar);
  if (pages > 2) score += Math.min(28, (pages - 2) * 5);
  if (asArray(record.pageIds).length > 8) score += 8;
  if (!record.year && !record.pointYear && !record.lowerYear) score += 3;
  return score;
}

function tierForDifficulty(difficultyScore, hasImage = true) {
  if (!hasImage) return "metadata_only";
  if (difficultyScore <= 24) return "easy";
  if (difficultyScore <= 48) return "medium";
  return "hard";
}

function routeForCandidate({ tier, localOcr, grokSafe }) {
  if (tier === "metadata_only") return "metadata_only_no_image";
  if (localOcr && tier !== "hard") return "local_ocr";
  if (!localOcr && tier !== "hard") return "install_local_ocr";
  return grokSafe ? "external_vlm_candidate" : "rights_review_before_external_vlm";
}

function candidateForRecord(record, options = {}) {
  const imageFeatureByMenu = options.imageFeatureByMenu || new Map();
  const scalar = scalarForImage(record, imageFeatureByMenu);
  const hasImage = hasImageReference(record);
  const difficultyScore = difficultyScoreFor(record, scalar);
  const tier = tierForDifficulty(difficultyScore, hasImage);
  const localOcr = Boolean(options.localOcrAvailable);
  const grokSafe = Boolean(record.grokSafe || options.grokSafeSources?.has?.(sourceIdForMenu(record)));
  const pages = pageCountFor(record, scalar);
  const valueScore = valueScoreFor(record);
  const priorityScore = Number(Math.max(0, valueScore - difficultyScore * 0.35).toFixed(2));
  const estimatedImages = hasImage ? Math.min(pages, options.pagesPerMenu || DEFAULT_PAGES_PER_MENU) : 0;
  const menuId = cleanValue(record.menuId || record.uid || recordUid(record));
  const sourceId = sourceIdForMenu(record);
  const sourceKey = cleanValue(record.sourceKey || (menuId.includes(":") ? menuId.split(":")[0] : sourceId));
  return {
    id: stableId("ocrtriage", [menuId, sourceId, record.sourceRecordId || record.id || record.pointer]),
    menuId,
    sourceId,
    sourceKey,
    sourceRecordId: cleanValue(record.sourceRecordId || record.pointer || record.id),
    title: cleanValue(record.title),
    year: record.year || record.pointYear || record.lowerYear || null,
    decade: cleanValue(record.decade || "unknown"),
    pageCount: pages,
    estimatedImages,
    localTier: tier,
    route: routeForCandidate({ tier, localOcr, grokSafe }),
    priorityScore,
    valueScore,
    difficultyScore,
    expectedYield: expectedYield(record),
    missingEvidence: {
      date: dateIsUncertain(record),
      dish: !hasDishEvidence(record),
      price: !hasPriceEvidence(record),
      ingredient: !hasIngredientEvidence(record),
    },
    imageAssessment: {
      hasImage,
      hasDimensions: Boolean(Number(scalar.width || 0) && Number(scalar.height || 0)),
      width: Number(scalar.width || 0) || null,
      height: Number(scalar.height || 0) || null,
      orientation: cleanValue(scalar.orientation || "unknown"),
    },
    routingPolicy: {
      localFirst: true,
      externalAllowed: grokSafe,
      externalPayload: grokSafe ? "sanitized_image_or_crop_after_rights_review" : "blocked_until_rights_review",
    },
    provenance: {
      sourceFile: cleanValue(record.provenance?.sourceFile || record.sourceFile || "menus.json"),
      sourceRecordId: cleanValue(record.sourceRecordId || record.pointer || record.id),
    },
  };
}

function summarize(candidates, options = {}) {
  const countBy = (rows, getter) =>
    Object.fromEntries(
      [...rows.reduce((counts, record) => {
        const key = cleanValue(getter(record) || "unknown");
        counts.set(key, (counts.get(key) || 0) + 1);
        return counts;
      }, new Map()).entries()].sort((a, b) => a[0].localeCompare(b[0]))
    );
  const early = candidates.filter((record) => record.priorityBatch === "phase1");
  const externalCostPerImageUsd = Number(options.externalCostPerImageUsd || 0) || null;
  const externalImages = candidates
    .filter((record) => /external|rights_review/.test(record.route))
    .reduce((sum, record) => sum + Number(record.estimatedImages || 0), 0);
  return {
    total: candidates.length,
    estimatedImages: candidates.reduce((sum, record) => sum + Number(record.estimatedImages || 0), 0),
    bySource: countBy(candidates, (record) => record.sourceId || record.sourceKey),
    byTier: countBy(candidates, (record) => record.localTier),
    byRoute: countBy(candidates, (record) => record.route),
    earlyBatch: {
      candidates: early.length,
      estimatedImages: early.reduce((sum, record) => sum + Number(record.estimatedImages || 0), 0),
      bySource: countBy(early, (record) => record.sourceId || record.sourceKey),
      byRoute: countBy(early, (record) => record.route),
    },
    externalCostEstimate: {
      externalImages,
      perImageUsd: externalCostPerImageUsd,
      estimatedUsd: externalCostPerImageUsd ? Number((externalImages * externalCostPerImageUsd).toFixed(2)) : null,
      note: externalCostPerImageUsd ? "Configurable planning estimate; verify current provider pricing before routing." : "Set --external-cost-per-image for a planning estimate; external routing is rights-gated by default.",
    },
  };
}

async function readJson(filePath, fallback = {}) {
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

async function readExternalRecords() {
  let files = [];
  try {
    files = (await fs.readdir(EXTERNAL_SOURCE_DIR)).filter((name) => name.endsWith(".json")).sort();
  } catch (error) {
    files = [];
  }
  const records = [];
  for (const file of files) {
    const payload = await readJson(path.join(EXTERNAL_SOURCE_DIR, file), { records: [] });
    for (const record of payload.records || []) {
      records.push({
        ...record,
        provenance: {
          ...(record.provenance || {}),
          sourceFile: record.provenance?.sourceFile || `enrichment/external-sources/${file}`,
        },
      });
    }
  }
  return records;
}

function shouldQueueMenu(menu) {
  const sourceKey = cleanValue(menu.sourceKey || "cia");
  if (!hasImageReference(menu)) return false;
  if (sourceKey === "nypl") return dateIsUncertain(menu) && !hasDishEvidence(menu) && !hasPriceEvidence(menu);
  if (sourceKey === "cia") return dateIsUncertain(menu) || !hasDishEvidence(menu) || !hasPriceEvidence(menu);
  return true;
}

function markEarlyBatch(candidates, earlyLimit) {
  const bySource = new Map();
  for (const candidate of candidates) {
    const key = cleanValue(candidate.sourceId || candidate.sourceKey || "unknown");
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key).push(candidate);
  }
  const earlyIds = new Set();
  const perSourceFloor = Math.max(2, Math.min(8, Math.floor(earlyLimit / Math.max(1, bySource.size * 2))));
  for (const [, rows] of [...bySource.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    for (const candidate of rows.slice(0, perSourceFloor)) {
      if (earlyIds.size >= earlyLimit) break;
      earlyIds.add(candidate.id);
    }
  }
  for (const candidate of candidates) {
    if (earlyIds.size >= earlyLimit) break;
    earlyIds.add(candidate.id);
  }
  return candidates.map((candidate, index) => ({
    ...candidate,
    priorityRank: index + 1,
    priorityBatch: earlyIds.has(candidate.id) ? "phase1" : index < earlyLimit * 5 ? "phase2" : "backlog",
  }));
}

async function buildOcrTriageQueue(options = {}) {
  const generatedAt = new Date().toISOString();
  const recordLimit = Math.max(1, Number(options.recordLimit || DEFAULT_RECORD_LIMIT));
  const earlyLimit = Math.max(1, Number(options.earlyLimit || DEFAULT_EARLY_LIMIT));
  const pagesPerMenu = Math.max(1, Number(options.pagesPerMenu || DEFAULT_PAGES_PER_MENU));
  const localOcr = options.localOcrAvailable ?? localOcrAvailable();
  const menusPayload = await readJson(path.join(DATA_DIR, "menus.json"), { menus: [] });
  const imagePayload = await readJson(path.join(ENRICHMENT_DIR, "image-features.json"), { records: [] });
  const imageFeatureByMenu = new Map((imagePayload.records || []).map((record) => [cleanValue(record.menuId), record]));
  const externalRecords = await readExternalRecords();
  const menuRecords = (menusPayload.menus || []).filter(shouldQueueMenu).map((menu) => ({
    ...menu,
    menuId: recordUid(menu),
    sourceId: sourceIdForMenu(menu),
    provenance: { sourceFile: "menus.json", sourceRecordId: cleanValue(menu.sourceRecordId || menu.pointer || menu.id) },
  }));
  const rawCandidates = [...externalRecords, ...menuRecords]
    .map((record) => candidateForRecord(record, { imageFeatureByMenu, localOcrAvailable: localOcr, pagesPerMenu }))
    .filter((candidate) => candidate.priorityScore > 0 || candidate.localTier !== "metadata_only")
    .sort((a, b) => b.priorityScore - a.priorityScore || b.valueScore - a.valueScore || a.difficultyScore - b.difficultyScore || a.title.localeCompare(b.title));
  const records = markEarlyBatch(rawCandidates.slice(0, recordLimit), earlyLimit);
  const payload = {
    version: VERSION,
    generatedAt,
    processor: {
      name: "ocr_triage_queue_builder",
      version: "0.1.0",
      localOcrAvailable: Boolean(localOcr),
      localOcrEngine: localOcr ? "tesseract" : null,
    },
    policy: {
      localFirst: true,
      storesRawOcr: false,
      storesImageBlobs: false,
      storesEmbeddingVectors: false,
      pagesPerMenu,
      note: "Compact routing artifact only; source images and raw OCR remain outside static graph JSON.",
    },
    summary: {
      allCandidates: rawCandidates.length,
      recordLimit,
      ...summarize(records, { externalCostPerImageUsd: options.externalCostPerImageUsd }),
    },
    records,
  };
  if (!options.dryRun) await writeJson(OUTPUT_PATH, payload);
  return payload;
}

function optionsFromArgs(args) {
  return {
    dryRun: hasFlag(args, "dry-run"),
    recordLimit: Number(argValue(args, "record-limit", DEFAULT_RECORD_LIMIT)),
    earlyLimit: Number(argValue(args, "early-limit", DEFAULT_EARLY_LIMIT)),
    pagesPerMenu: Number(argValue(args, "pages-per-menu", DEFAULT_PAGES_PER_MENU)),
    externalCostPerImageUsd: Number(argValue(args, "external-cost-per-image", "0")) || null,
  };
}

if (require.main === module) {
  buildOcrTriageQueue(optionsFromArgs(process.argv.slice(2)))
    .then((payload) => {
      console.log(JSON.stringify(payload.summary, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  VERSION,
  buildOcrTriageQueue,
  candidateForRecord,
  difficultyScoreFor,
  expectedYield,
  routeForCandidate,
  summarize,
  tierForDifficulty,
};
