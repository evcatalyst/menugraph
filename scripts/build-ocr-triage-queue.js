const crypto = require("crypto");
const { spawnSync } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const { cleanValue, recordUid } = require("../docs/multisource");
const { readEnrichmentPayload } = require("./enrichment-shards");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const ENRICHMENT_DIR = path.join(DATA_DIR, "enrichment");
const EXTERNAL_SOURCE_DIR = path.join(ENRICHMENT_DIR, "external-sources");
const OUTPUT_PATH = path.join(ENRICHMENT_DIR, "ocr-triage-queue.json");
const OCR_EXTRACTIONS_PATH = path.join(ENRICHMENT_DIR, "ocr-extractions.json");
const OCR_FAILURES_PATH = path.join(ENRICHMENT_DIR, "ocr-failures.json");
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

function localOcrEngine() {
  if (spawnSync("sh", ["-lc", "command -v tesseract >/dev/null 2>&1"], { stdio: "ignore" }).status === 0) return "tesseract";
  const swiftVision =
    process.platform === "darwin" &&
    spawnSync("sh", ["-lc", "test -x /usr/bin/swift && test -d /System/Library/Frameworks/Vision.framework"], { stdio: "ignore" }).status === 0;
  return swiftVision ? "macos_vision" : null;
}

function localOcrAvailable() {
  return Boolean(localOcrEngine());
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function splitList(value = "") {
  return cleanValue(value)
    .split(",")
    .map(cleanValue)
    .filter(Boolean);
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

function actionableImageCountFor(record, scalar = {}, options = {}) {
  if (!hasImageReference(record)) return 0;
  const pagesPerMenu = Math.max(1, Number(options.pagesPerMenu || DEFAULT_PAGES_PER_MENU) || DEFAULT_PAGES_PER_MENU);
  const pages = pageCountFor(record, scalar);
  const sourceKey = cleanValue(record.sourceKey || "");

  // CIA records can resolve multi-page CONTENTdm metadata at OCR runtime even if
  // the static record only stores a representative image URL.
  if (sourceKey === "cia") return Math.min(pages, pagesPerMenu);

  const pageIds = asArray(record.pageIds).map(cleanValue).filter(Boolean);
  if (pageIds.length) return Math.min(pageIds.length, pagesPerMenu);

  if (record.iiifManifestUrl) return Math.min(pages, pagesPerMenu);

  const imageFeatures = asArray(record.imageFeatures);
  const featureManifest = imageFeatures.find((feature) => cleanValue(feature?.iiifManifestUrl));
  if (featureManifest) return Math.min(pages, pagesPerMenu);
  if (imageFeatures.length > 1) return Math.min(imageFeatures.length, pagesPerMenu);

  // A single image URL, thumbnail, imageUri, or IIIF info.json only gives the
  // local OCR runner one fetchable image unless page IDs or a manifest are present.
  return 1;
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
  const estimatedImages = actionableImageCountFor(record, scalar, options);
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
  const pending = candidates.filter((record) => !record.processing || ["pending", "partial", "retryable_failed"].includes(record.processing.status));
  const externalCostPerImageUsd = Number(options.externalCostPerImageUsd || 0) || null;
  const externalImages = pending
    .filter((record) => /external|rights_review/.test(record.route))
    .reduce((sum, record) => sum + Number(record.processing?.pendingImages ?? record.estimatedImages ?? 0), 0);
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
    processing: processingSummary(candidates),
    progressiveRunPlan: progressiveRunPlan(candidates, options),
  };
}

function processingSummary(candidates) {
  const countBy = (rows, getter) =>
    Object.fromEntries(
      [...rows.reduce((counts, record) => {
        const key = cleanValue(getter(record) || "unknown");
        counts.set(key, (counts.get(key) || 0) + 1);
        return counts;
      }, new Map()).entries()].sort((a, b) => a[0].localeCompare(b[0]))
    );
  const pending = candidates.filter((record) => !record.processing || ["pending", "partial", "retryable_failed"].includes(record.processing.status));
  const completed = candidates.filter((record) => record.processing?.status === "processed");
  const failed = candidates.filter((record) => ["failed_review", "retryable_failed"].includes(record.processing?.status));
  return {
    byStatus: countBy(candidates, (record) => record.processing?.status || "pending"),
    pendingCandidates: pending.length,
    pendingEstimatedImages: pending.reduce((sum, record) => sum + Number(record.processing?.pendingImages ?? record.estimatedImages ?? 0), 0),
    processedCandidates: completed.length,
    failedCandidates: failed.length,
    retryableFailures: failed.filter((record) => record.processing?.retryableFailure).length,
    pendingBySource: countBy(pending, (record) => record.sourceId || record.sourceKey),
    pendingByTier: countBy(pending, (record) => record.localTier),
    pendingByRoute: countBy(pending, (record) => record.route),
    pendingByBatch: countBy(pending, (record) => record.priorityBatch),
  };
}

function estimateKeepImagesMb(records, limit, mbPerImage = 0.75) {
  const images = records.slice(0, limit).reduce((sum, record) => sum + Number(record.processing?.pendingImages ?? record.estimatedImages ?? 0), 0);
  return Number((images * mbPerImage).toFixed(1));
}

function runSlice(rows, label, args, limit = 25) {
  const selected = rows.slice(0, limit);
  return {
    label,
    candidates: selected.length,
    estimatedImages: selected.reduce((sum, record) => sum + Number(record.processing?.pendingImages ?? record.estimatedImages ?? 0), 0),
    topCandidateIds: selected.slice(0, 8).map((record) => record.id),
    command: `npm run enrich:ocr:local -- ${args.join(" ")}`,
  };
}

function countRows(rows, getter) {
  return Object.fromEntries(
    [...rows.reduce((counts, record) => {
      const key = cleanValue(getter(record) || "unknown");
      counts.set(key, (counts.get(key) || 0) + 1);
      return counts;
    }, new Map()).entries()].sort((a, b) => a[0].localeCompare(b[0]))
  );
}

function progressiveRunPlan(candidates, options = {}) {
  const pending = candidates
    .filter((record) => !record.processing || ["pending", "partial", "retryable_failed"].includes(record.processing.status))
    .sort((a, b) => Number(a.priorityRank || 999999) - Number(b.priorityRank || 999999));
  const firstPass = pending.filter((record) => !record.processing || record.processing.status === "pending");
  const partialLocal = pending.filter((record) => record.route === "local_ocr" && record.processing?.status === "partial" && Number(record.processing?.pendingImages || 0) > 0);
  const phase1Easy = firstPass.filter((record) => record.route === "local_ocr" && record.priorityBatch === "phase1" && record.localTier === "easy");
  const phase1Medium = firstPass.filter((record) => record.route === "local_ocr" && record.priorityBatch === "phase1" && record.localTier === "medium");
  const backlogLocal = firstPass.filter((record) => record.route === "local_ocr" && record.priorityBatch !== "phase1");
  const retryable = pending.filter((record) => record.processing?.status === "retryable_failed");
  const metadataOnly = pending.filter((record) => record.route === "metadata_only_no_image");
  const externalReview = pending.filter((record) => /external|rights_review/.test(record.route));
  const retryableRun = runSlice(retryable, "retryable_local_failures", ["--limit=25", "--batch=all", "--retry-retryable", "--pages-per-menu=2"], 25);
  retryableRun.estimatedImages = retryable
    .slice(0, 25)
    .reduce((sum, record) => sum + Number(record.processing?.retryableFailedPages || record.processing?.failedPages || 0), 0);
  return {
    localFirst: true,
    rawPayloadPolicy: "no_raw_ocr_no_image_blobs_no_vectors",
    defaultImageCachePolicy: "temporary_images_deleted_after_each_page_unless_keep_images_is_set",
    storageEstimate: {
      defaultPeakTempMb: 2,
      keepImagesMbPerImageAssumption: 0.75,
      keepImagesIfLimit25Mb: estimateKeepImagesMb(pending, 25),
      keepImagesIfLimit100Mb: estimateKeepImagesMb(pending, 100),
      note: "The local OCR runner is sequential and deletes cached page images by default, so peak disk use stays low unless --keep-images is used.",
    },
    runs: [
      runSlice(phase1Easy, "phase1_easy_local", ["--limit=25", "--batch=phase1", "--tier=easy", "--pages-per-menu=1"], 25),
      runSlice(phase1Medium, "phase1_medium_local", ["--limit=25", "--batch=phase1", "--tier=medium", "--pages-per-menu=1"], 25),
      runSlice(partialLocal, "continue_partial_second_pages", ["--limit=25", "--batch=all", "--continue-partial", "--pages-per-menu=2"], 25),
      runSlice(backlogLocal, "backlog_local", ["--limit=50", "--batch=all", "--tier=all", "--pages-per-menu=1"], 50),
      retryableRun,
    ],
    nonOcrActions: [
      {
        label: "metadata_only_no_image",
        candidates: metadataOnly.length,
        bySource: countRows(metadataOnly, (record) => record.sourceId || record.sourceKey),
        action: "Use source-specific metadata parsers and title/description rules; do not route to OCR unless an image route is later discovered.",
        followUpCommands: ["npm run enrich:cornell", "npm run enrich:recipe-bridge", "npm run enrich:coverage", "npm run build:graph"],
      },
      {
        label: "rights_review_before_external_vlm",
        candidates: externalReview.length,
        estimatedImages: externalReview.reduce((sum, record) => sum + Number(record.processing?.pendingImages ?? record.estimatedImages ?? 0), 0),
        topCandidateIds: externalReview.slice(0, 8).map((record) => record.id),
        action: "Perform source rights review before sending sanitized page images or crops to Grok or another external VLM.",
      },
    ],
    planningAssumptions: {
      pagesPerMenu: Number(options.pagesPerMenu || DEFAULT_PAGES_PER_MENU),
      externalCostPerImageUsd: Number(options.externalCostPerImageUsd || 0) || null,
    },
  };
}

function buildProcessingIndex(extractionRecords = [], failureRecords = []) {
  const index = new Map();
  const ensure = (candidateId) => {
    const id = cleanValue(candidateId);
    if (!id) return null;
    if (!index.has(id)) {
      index.set(id, {
        attemptedPages: 0,
        processedPages: 0,
        failedPages: 0,
        dishMentions: 0,
        priceObservations: 0,
        retryableFailure: false,
        retryableFailedPages: 0,
        failureClasses: {},
        nextAction: "",
      });
    }
    return index.get(id);
  };
  for (const record of extractionRecords || []) {
    const state = ensure(record.candidateId);
    if (!state) continue;
    state.attemptedPages += 1;
    if (record.status === "error") state.failedPages += 1;
    else state.processedPages += 1;
    state.dishMentions += Array.isArray(record.dishMentionIds) ? record.dishMentionIds.length : 0;
    state.priceObservations += Array.isArray(record.priceObservationIds) ? record.priceObservationIds.length : 0;
  }
  for (const record of failureRecords || []) {
    const state = ensure(record.candidateId);
    if (!state) continue;
    state.retryableFailure = state.retryableFailure || Boolean(record.retryable);
    if (record.retryable) state.retryableFailedPages += 1;
    const failureClass = cleanValue(record.errorClass || "unknown_error");
    state.failureClasses[failureClass] = (state.failureClasses[failureClass] || 0) + 1;
    state.nextAction = cleanValue(record.nextAction || state.nextAction);
  }
  return index;
}

function processingForCandidate(candidate, processingIndex, pagesPerMenu = DEFAULT_PAGES_PER_MENU) {
  const targetImages = Math.max(0, Number(candidate.estimatedImages || Math.min(candidate.pageCount || pagesPerMenu, pagesPerMenu)) || 0);
  const state = processingIndex.get(cleanValue(candidate.id));
  if (!state) {
    return {
      status: "pending",
      attemptedPages: 0,
      processedPages: 0,
      failedPages: 0,
      pendingImages: targetImages,
      dishMentions: 0,
      priceObservations: 0,
      retryableFailure: false,
      retryableFailedPages: 0,
    };
  }
  const coveredImages = state.processedPages + state.failedPages;
  const pendingImages = Math.max(0, targetImages - coveredImages);
  let status = "pending";
  if (targetImages > 0 && coveredImages >= targetImages && state.retryableFailure) status = "retryable_failed";
  else if (targetImages > 0 && coveredImages >= targetImages && state.processedPages > 0) status = "processed";
  else if (targetImages > 0 && coveredImages >= targetImages) status = "failed_review";
  else if (state.processedPages > 0) status = "partial";
  else if (state.failedPages > 0 && state.retryableFailure) status = "retryable_failed";
  else if (state.failedPages > 0) status = "failed_review";
  return {
    status,
    attemptedPages: state.attemptedPages,
    processedPages: state.processedPages,
    failedPages: state.failedPages,
    pendingImages,
    dishMentions: state.dishMentions,
    priceObservations: state.priceObservations,
    retryableFailure: Boolean(state.retryableFailure),
    retryableFailedPages: state.retryableFailedPages,
    failureClasses: state.failureClasses,
    nextAction: cleanValue(state.nextAction),
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
  const seen = new Set();
  let files = [];
  try {
    files = (await fs.readdir(EXTERNAL_SOURCE_DIR)).filter((name) => name.endsWith(".json")).sort();
  } catch (error) {
    files = [];
  }
  const records = [];
  const legacy = await readJson(path.join(ENRICHMENT_DIR, "external-menu-records.json"), { records: [] });
  for (const record of legacy.records || []) {
    const key = [record.sourceId, record.menuId || record.id || record.sourceRecordId].map(cleanValue).join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    records.push({
      ...record,
      provenance: {
        ...(record.provenance || {}),
        sourceFile: record.provenance?.sourceFile || "enrichment/external-menu-records.json",
      },
    });
  }
  for (const file of files) {
    const payload = await readJson(path.join(EXTERNAL_SOURCE_DIR, file), { records: [] });
    for (const record of payload.records || []) {
      const key = [record.sourceId, record.menuId || record.id || record.sourceRecordId].map(cleanValue).join("|");
      if (seen.has(key)) continue;
      seen.add(key);
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

function sourceMatches(candidate, sourceFilter) {
  if (!sourceFilter.size) return true;
  return sourceFilter.has(cleanValue(candidate.sourceId)) || sourceFilter.has(cleanValue(candidate.sourceKey));
}

function dedupeCandidates(records) {
  const seen = new Set();
  const output = [];
  for (const record of records || []) {
    const id = cleanValue(record.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    output.push(record);
  }
  return output;
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
  const sourceFilter = new Set(splitList(options.source || options.sources || ""));
  const excludeAttempted = Boolean(options.excludeAttempted);
  const [previousOcr, previousFailures] = await Promise.all([
    readEnrichmentPayload(OCR_EXTRACTIONS_PATH, { records: [] }),
    readJson(OCR_FAILURES_PATH, { records: [] }),
  ]);
  const attempted = excludeAttempted ? new Set((previousOcr.records || []).map((record) => cleanValue(record.candidateId)).filter(Boolean)) : new Set();
  const processingIndex = buildProcessingIndex(previousOcr.records || [], previousFailures.records || []);
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
    .filter((candidate) => sourceMatches(candidate, sourceFilter))
    .filter((candidate) => !attempted.has(candidate.id))
    .filter((candidate) => candidate.priorityScore > 0 || candidate.localTier !== "metadata_only")
    .sort((a, b) => b.priorityScore - a.priorityScore || b.valueScore - a.valueScore || a.difficultyScore - b.difficultyScore || a.title.localeCompare(b.title));
  const selectedRecords = markEarlyBatch(rawCandidates.slice(0, recordLimit), earlyLimit);
  const existing = options.appendExisting ? await readJson(options.outputPath || OUTPUT_PATH, { records: [] }) : { records: [] };
  const records = (options.appendExisting ? dedupeCandidates([...(existing.records || []), ...selectedRecords]) : selectedRecords).map((record) => ({
    ...record,
    processing: processingForCandidate(record, processingIndex, pagesPerMenu),
  }));
  const payload = {
    version: VERSION,
    generatedAt,
    processor: {
      name: "ocr_triage_queue_builder",
      version: "0.1.0",
      localOcrAvailable: Boolean(localOcr),
      localOcrEngine: localOcr ? localOcrEngine() || "local_ocr" : null,
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
      selectedCandidates: selectedRecords.length,
      recordLimit,
      sourceFilter: [...sourceFilter],
      appendExisting: Boolean(options.appendExisting),
      excludeAttempted,
      ...summarize(records, { externalCostPerImageUsd: options.externalCostPerImageUsd, pagesPerMenu }),
    },
    records,
  };
  if (!options.dryRun) await writeJson(options.outputPath || OUTPUT_PATH, payload);
  return payload;
}

function optionsFromArgs(args) {
  return {
    dryRun: hasFlag(args, "dry-run"),
    recordLimit: Number(argValue(args, "record-limit", DEFAULT_RECORD_LIMIT)),
    earlyLimit: Number(argValue(args, "early-limit", DEFAULT_EARLY_LIMIT)),
    pagesPerMenu: Number(argValue(args, "pages-per-menu", DEFAULT_PAGES_PER_MENU)),
    source: argValue(args, "source", argValue(args, "sources", "")),
    appendExisting: hasFlag(args, "append-existing"),
    excludeAttempted: hasFlag(args, "exclude-attempted"),
    outputPath: argValue(args, "output", OUTPUT_PATH),
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
  dedupeCandidates,
  difficultyScoreFor,
  expectedYield,
  localOcrAvailable,
  localOcrEngine,
  optionsFromArgs,
  processingForCandidate,
  processingSummary,
  progressiveRunPlan,
  routeForCandidate,
  summarize,
  tierForDifficulty,
  buildProcessingIndex,
};
