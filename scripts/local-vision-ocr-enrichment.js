const crypto = require("crypto");
const fs = require("fs/promises");
const http = require("http");
const https = require("https");
const path = require("path");
const { execFile } = require("child_process");
const { cleanValue, recordUid } = require("../docs/multisource");
const { extractPricesFromText, contextForEntry } = require("../docs/price-utils");
const {
  enrichmentPriceObservation,
  ingredientTagsFor,
  textDishMentions,
} = require("./local-enrichment");
const { readEnrichmentPayload, writeEnrichmentPayload } = require("./enrichment-shards");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const ENRICHMENT_DIR = path.join(DATA_DIR, "enrichment");
const CACHE_DIR = path.join(ROOT_DIR, ".cache", "enrichment", "ocr-images");
const SWIFT_HELPER = path.join(__dirname, "vision-ocr.swift");
const OUTPUT_PATH = path.join(ENRICHMENT_DIR, "ocr-extractions.json");
const FAILURE_OUTPUT_PATH = path.join(ENRICHMENT_DIR, "ocr-failures.json");
const CONTENTDM_HOST = "ciadigitalcollections.culinary.edu";
const CIA_COLLECTION = "p16940coll1";
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

function hash(value) {
  return crypto.createHash("sha1").update(cleanValue(value)).digest("hex");
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

async function writeMaybeShardedJson(filePath, payload, options = {}) {
  return writeEnrichmentPayload(filePath, payload, options);
}

function isLikelyNonImagePayload(buffer) {
  if (!buffer || !buffer.length) return true;
  const head = buffer.subarray(0, Math.min(buffer.length, 256)).toString("utf8").trim().toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html") || head.startsWith("{") || head.startsWith("[") || head.includes("<html");
}

function fetchBuffer(url, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "http:" ? http : https;
    const req = client.get(
      parsed,
      {
        timeout: timeoutMs,
        rejectUnauthorized: false,
        headers: { "User-Agent": "MenuGraph local Vision OCR; bounded research image fetch" },
      },
      (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          response.resume();
          fetchBuffer(new URL(response.headers.location, parsed).toString(), timeoutMs).then(resolve, reject);
          return;
        }
        if (response.statusCode >= 400) {
          response.resume();
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on("timeout", () => req.destroy(new Error(`request timed out after ${timeoutMs}ms`)));
    req.on("error", reject);
  });
}

async function fetchImageToCache(url, options) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const filePath = path.join(CACHE_DIR, `${hash(url)}.jpg`);
  if (!options.refreshImages) {
    try {
      const stat = await fs.stat(filePath);
      if (stat.size > 0) {
        const cached = await fs.readFile(filePath);
        if (!isLikelyNonImagePayload(cached)) return { filePath, bytes: stat.size, cacheHit: true };
        await fs.rm(filePath, { force: true });
      }
    } catch (error) {
      // Cache miss.
    }
  }
  const buffer = await fetchBuffer(url, options.requestTimeoutMs);
  if (isLikelyNonImagePayload(buffer)) throw new Error(`image endpoint returned non-image payload for ${url}`);
  await fs.writeFile(filePath, buffer);
  return { filePath, bytes: buffer.length, cacheHit: false };
}

function runVisionOcr(imagePath, options) {
  return new Promise((resolve, reject) => {
    const child = execFile("/usr/bin/swift", [SWIFT_HELPER, imagePath], {
      timeout: options.ocrTimeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${error.message}${stderr ? `: ${stderr}` : ""}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.toString("utf8")));
      } catch (parseError) {
        reject(new Error(`could not parse Vision OCR output: ${parseError.message}`));
      }
    });
    child.on("error", reject);
  });
}

function resizedIiifImageUrlFromInfo(infoUrl, pageId, width = 1400) {
  const raw = cleanValue(infoUrl);
  if (!raw) return "";
  const match = raw.match(/^(.*\/iiif\/2\/[^/:]+:)([^/?#]+)(\/info\.json(?:[?#].*)?)$/i);
  if (!match) return raw.replace(/\/info\.json(?:[?#].*)?$/i, `/full/${width},/0/default.jpg`);
  return `${match[1]}${encodeURIComponent(cleanValue(pageId || match[2]))}/full/${width},/0/default.jpg`;
}

function resizedIiifImageUrl(imageUrl, width = 1400) {
  const raw = cleanValue(imageUrl);
  if (!raw) return "";
  if (/\/full\/full\/0\/default\.jpg/i.test(raw)) return raw.replace(/\/full\/full\/0\/default\.jpg/i, `/full/${width},/0/default.jpg`);
  return raw;
}

function contentdmUrl(pathname) {
  const raw = cleanValue(pathname);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:/i, "https:");
  return `https://${CONTENTDM_HOST}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

function ciaIiifImageUrl(pageId, width = 1400) {
  const id = cleanValue(pageId);
  return id ? `https://${CONTENTDM_HOST}/iiif/2/${CIA_COLLECTION}:${encodeURIComponent(id)}/full/${width},/0/default.jpg` : "";
}

async function fetchJsonLoose(url, timeoutMs = 20000) {
  const buffer = await fetchBuffer(url, timeoutMs);
  return JSON.parse(buffer.toString("utf8"));
}

function firstEntry(value) {
  return Array.isArray(value) ? value.find(Boolean) : value;
}

function iiifServiceImageUrl(service, fallbackImageUrl = "", width = 1400) {
  const firstService = firstEntry(service);
  const serviceId = cleanValue(firstService?.id || firstService?.["@id"]);
  if (serviceId) return `${serviceId.replace(/\/$/, "")}/full/${width},/0/default.jpg`;
  const raw = cleanValue(fallbackImageUrl);
  if (!raw) return "";
  return raw
    .replace(/\/full\/(?:full|\d+,?)\/0\/default\.jpg(?:[?#].*)?$/i, `/full/${width},/0/default.jpg`)
    .replace(/\/full\/(?:full|\d+,?)\/0\/default\.png(?:[?#].*)?$/i, `/full/${width},/0/default.jpg`);
}

function canvasImageBody(canvas) {
  const annotationBody = canvas?.items?.[0]?.items?.[0]?.body;
  return (
    firstEntry(annotationBody) ||
    canvas?.images?.[0]?.resource ||
    canvas?.thumbnail?.[0] ||
    canvas?.thumbnail ||
    null
  );
}

function imageUrlsForIiifManifestPayload(payload, options = {}) {
  const width = options.imageWidth || 1400;
  const limit = Math.max(1, Number(options.pagesPerMenu || 1) || 1);
  const canvases =
    payload?.items ||
    payload?.sequences?.flatMap((sequence) => sequence.canvases || []) ||
    payload?.canvases ||
    [];
  const urls = [];
  for (const canvas of canvases) {
    const body = canvasImageBody(canvas);
    if (!body) continue;
    const imageUrl = iiifServiceImageUrl(body.service, body.id || body["@id"], width);
    if (imageUrl) urls.push(imageUrl);
    if (urls.length >= limit) break;
  }
  return [...new Set(urls)];
}

async function iiifManifestImageUrls(manifestUrl, options) {
  const url = cleanValue(manifestUrl);
  if (!url) return [];
  const payload = await fetchJsonLoose(url, options.requestTimeoutMs);
  return imageUrlsForIiifManifestPayload(payload, options);
}

async function ciaImageUrlsForRecord(record, options) {
  const id = cleanValue(record.sourceRecordId || record.pointer || record.id);
  if (!id) return [];
  const metadata = await fetchJsonLoose(
    `https://${CONTENTDM_HOST}/digital/api/singleitem/collection/${CIA_COLLECTION}/id/${encodeURIComponent(id)}`,
    options.requestTimeoutMs
  );
  const pages = Array.isArray(metadata.objectInfo?.page) ? metadata.objectInfo.page : [];
  const pageIds = pages.map((page) => cleanValue(page.pageptr || page.id)).filter(Boolean);
  if (pageIds.length) return pageIds.slice(0, options.pagesPerMenu).map((pageId) => ciaIiifImageUrl(pageId, options.imageWidth));

  const iiifInfoUri = contentdmUrl(metadata.iiifInfoUri);
  if (iiifInfoUri) return [resizedIiifImageUrlFromInfo(iiifInfoUri, "", options.imageWidth)];
  const imageUri = contentdmUrl(metadata.imageUri || metadata.image_uri);
  if (imageUri) return [resizedIiifImageUrl(imageUri, options.imageWidth)];
  return [];
}

async function resolveImageUrlsForRecord(record, options) {
  if ((record.sourceKey || "") === "cia") {
    try {
      const urls = await ciaImageUrlsForRecord(record, options);
      if (urls.length) return urls;
    } catch (error) {
      options.onProgress?.(`CIA image metadata fallback for ${record.menuId || record.sourceRecordId}: ${error.message}`);
    }
  }
  const manifestUrl = cleanValue(record.iiifManifestUrl || record.imageFeatures?.find?.((feature) => feature?.iiifManifestUrl)?.iiifManifestUrl);
  if (manifestUrl) {
    try {
      const urls = await iiifManifestImageUrls(manifestUrl, options);
      if (urls.length) return urls;
    } catch (error) {
      options.onProgress?.(`IIIF manifest image fallback for ${record.menuId || record.sourceRecordId}: ${error.message}`);
    }
  }
  return imageUrlsForRecord(record, options);
}

function imageUrlsForRecord(record, options) {
  const width = options.imageWidth;
  if ((record.sourceKey || "") === "cia" && record.imageUrl) return [record.imageUrl];
  const pageIds = Array.isArray(record.pageIds) ? record.pageIds.map(cleanValue).filter(Boolean) : [];
  if (record.iiifInfoUri && pageIds.length) {
    return pageIds.slice(0, options.pagesPerMenu).map((pageId) => resizedIiifImageUrlFromInfo(record.iiifInfoUri, pageId, width));
  }
  if (record.iiifInfoUri) return [resizedIiifImageUrlFromInfo(record.iiifInfoUri, "", width)];
  if (record.imageUri) return [resizedIiifImageUrl(record.imageUri, width)];
  if (record.imageUrl) return [resizedIiifImageUrl(record.imageUrl, width)];
  const featureImageUrls = (Array.isArray(record.imageFeatures) ? record.imageFeatures : [])
    .map((feature) => cleanValue(feature.sourceImageUrl || feature.provenance?.sourceImageUrl))
    .filter(Boolean);
  if (featureImageUrls.length) return featureImageUrls.slice(0, options.pagesPerMenu);
  if (record.thumbnailUrl) return [record.thumbnailUrl];
  return [];
}

function cityStateCountry(placeText = "") {
  const parts = cleanValue(placeText).split(",").map(cleanValue).filter(Boolean);
  if (parts.length >= 3) return { city: parts[0], state: parts[1], country: parts.slice(2).join(", ") };
  if (parts.length === 2) return { city: parts[0], state: parts[1], country: "" };
  return { city: parts[0] || "", state: "", country: "" };
}

function menuLike(record, sourceRecord = {}) {
  const place = cityStateCountry(sourceRecord.placeText || sourceRecord.place || "");
  return {
    id: record.menuId,
    uid: record.menuId,
    sourceKey: record.sourceKey,
    sourceRecordId: record.sourceRecordId,
    title: sourceRecord.title || record.title,
    year: sourceRecord.year || sourceRecord.pointYear || record.year || null,
    decade: sourceRecord.decade || record.decade || "unknown",
    country: sourceRecord.country || place.country || "unknown",
    city: sourceRecord.city || place.city || "",
    state: sourceRecord.state || place.state || "",
    types: sourceRecord.types || [],
    itemUrl: sourceRecord.itemUrl || sourceRecord.sourceUrl || "",
    topDishes: [],
  };
}

function evidenceLineNumbers(dishMentions, priceRows) {
  const lines = new Set();
  for (const dish of dishMentions || []) if (dish.lineNumber) lines.add(Number(dish.lineNumber));
  for (const price of priceRows || []) if (Number.isFinite(Number(price.rawLineNumber))) lines.add(Number(price.rawLineNumber));
  return lines;
}

function textSpansFromOcr({ lines, menuId, candidateId, pageIndex, evidenceLines }) {
  return lines
    .map((line, index) => ({
      id: stableId("span", [menuId, candidateId, pageIndex, index + 1, line.text]),
      menuId,
      spanType: "line",
      text: cleanValue(line.text),
      lineNumber: index + 1,
      bbox: line.bbox || null,
      ocrConfidence: Number(Number(line.confidence || 0).toFixed(3)),
      publicSafe: evidenceLines.has(index + 1),
    }))
    .filter((span) => span.publicSafe)
    .slice(0, 80);
}

function dedupeRecords(records, key = "id") {
  const seen = new Set();
  const output = [];
  for (const record of records || []) {
    const id = cleanValue(record?.[key]);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    output.push(record);
  }
  return output;
}

function dedupeExtractionRecords(records) {
  const successByPage = new Set();
  for (const record of records || []) {
    if (record?.status === "error") continue;
    const pageKey = [record?.candidateId, record?.pageNumber].map(cleanValue).join("|");
    if (pageKey !== "|") successByPage.add(pageKey);
  }

  const seen = new Set();
  const output = [];
  for (const record of [...(records || [])].reverse()) {
    const pageKey = [record?.candidateId, record?.pageNumber].map(cleanValue).join("|");
    if (record?.status === "error" && successByPage.has(pageKey)) continue;
    const key = [pageKey, record?.status === "error" ? "error" : "ok"].map(cleanValue).join("|");
    if (!pageKey || pageKey === "|" || seen.has(key)) continue;
    seen.add(key);
    output.push(record);
  }
  return output.reverse();
}

function classifyOcrError(message = "") {
  const text = cleanValue(message).toLowerCase();
  if (/http\s*403/.test(text)) {
    return {
      errorClass: "access_denied",
      retryable: false,
      nextAction: "source_access_review",
    };
  }
  if (/http\s*404/.test(text)) {
    return {
      errorClass: "missing_image",
      retryable: false,
      nextAction: "source_metadata_review",
    };
  }
  if (/http\s*501/.test(text)) {
    return {
      errorClass: "unsupported_image_endpoint",
      retryable: false,
      nextAction: "alternate_image_route",
    };
  }
  if (/timed?\s*out|timeout|socket hang up|econnreset|network|enotfound|eai_again/.test(text)) {
    return {
      errorClass: "transient_network",
      retryable: true,
      nextAction: "retry_local",
    };
  }
  if (/non-image payload|returned non-image|html/.test(text)) {
    return {
      errorClass: "non_image_payload",
      retryable: false,
      nextAction: "source_metadata_review",
    };
  }
  if (/vision|ocr|swift|parse/.test(text)) {
    return {
      errorClass: "local_ocr_failure",
      retryable: true,
      nextAction: "retry_local_or_external_review",
    };
  }
  return {
    errorClass: "unknown_error",
    retryable: true,
    nextAction: "retry_local",
  };
}

function countBy(records, keyFn) {
  const counts = new Map();
  for (const record of records || []) {
    const key = cleanValue(keyFn(record) || "unknown") || "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function selectOcrCandidates(queueRecords, previousRecords, options = {}) {
  const processed = new Set((previousRecords || []).map((record) => cleanValue(record.candidateId)).filter(Boolean));
  const failedCandidateIds = new Set(
    (previousRecords || [])
      .filter((record) => record?.status === "error")
      .map((record) => cleanValue(record.candidateId))
      .filter(Boolean)
  );
  const retryCandidateIds = options.retryCandidateIds instanceof Set ? options.retryCandidateIds : new Set();
  const sourceFilter = cleanValue(options.source || "all");
  const tierFilter = cleanValue(options.tier || "all");
  const batch = cleanValue(options.batch || "phase1");
  const limit = Math.max(1, Number(options.limit || 10) || 10);
  return (queueRecords || [])
    .filter((candidate) =>
      options.retryRetryable
        ? retryCandidateIds.has(candidate.id)
        : options.retryErrors
          ? failedCandidateIds.has(candidate.id)
          : !processed.has(candidate.id) || options.refresh
    )
    .filter((candidate) => sourceFilter === "all" || candidate.sourceKey === sourceFilter || candidate.sourceId === sourceFilter)
    .filter((candidate) => tierFilter === "all" || candidate.localTier === tierFilter)
    .filter((candidate) => batch === "all" || candidate.priorityBatch === batch)
    .sort((a, b) => Number(a.priorityRank || 999999) - Number(b.priorityRank || 999999))
    .slice(0, limit);
}

function buildOcrFailureReport({ records = [], queueRecords = [], generatedAt = new Date().toISOString() } = {}) {
  const candidates = new Map((queueRecords || []).map((record) => [cleanValue(record.id), record]));
  const failures = (records || [])
    .filter((record) => record?.status === "error")
    .map((record) => {
      const candidate = candidates.get(cleanValue(record.candidateId)) || {};
      const classification = classifyOcrError(record.errorMessage);
      return {
        id: stableId("ocrfailure", [record.candidateId, record.pageNumber, record.imageHash, record.errorMessage]),
        candidateId: cleanValue(record.candidateId),
        menuId: cleanValue(record.menuId),
        sourceId: cleanValue(record.sourceId),
        sourceKey: cleanValue(record.sourceKey),
        sourceRecordId: cleanValue(record.sourceRecordId),
        title: cleanValue(record.title || candidate.title),
        pageNumber: Number(record.pageNumber || 0) || null,
        errorClass: classification.errorClass,
        errorMessage: cleanValue(record.errorMessage).slice(0, 320),
        retryable: classification.retryable,
        nextAction: classification.nextAction,
        route: cleanValue(candidate.route),
        localTier: cleanValue(candidate.localTier),
        priorityRank: candidate.priorityRank ?? null,
        priorityBatch: cleanValue(candidate.priorityBatch),
        valueScore: Number(candidate.valueScore || 0),
        difficultyScore: Number(candidate.difficultyScore || 0),
        provenance: {
          sourceFile: "enrichment/ocr-extractions.json",
          candidateSourceFile: cleanValue(candidate.provenance?.sourceFile || "ocr-triage-queue.json"),
          sourceRecordId: cleanValue(record.sourceRecordId),
          publicSafe: true,
        },
      };
    })
    .sort(
      (a, b) =>
        Number(Boolean(b.retryable)) - Number(Boolean(a.retryable)) ||
        Number(a.priorityRank || 999999) - Number(b.priorityRank || 999999) ||
        a.sourceId.localeCompare(b.sourceId) ||
        a.menuId.localeCompare(b.menuId)
    );

  return {
    version: VERSION,
    generatedAt,
    summary: {
      total: failures.length,
      retryable: failures.filter((record) => record.retryable).length,
      notRetryable: failures.filter((record) => !record.retryable).length,
      byClass: countBy(failures, (record) => record.errorClass),
      bySource: countBy(failures, (record) => record.sourceId),
      byNextAction: countBy(failures, (record) => record.nextAction),
    },
    records: failures,
  };
}

async function sourceRecordMap() {
  const menusPayload = await readJson(path.join(DATA_DIR, "menus.json"), { menus: [] });
  const records = new Map();
  for (const menu of menusPayload.menus || []) {
    const uid = recordUid(menu);
    records.set(uid, { ...menu, menuId: uid });
  }
  const legacyExternal = await readJson(path.join(ENRICHMENT_DIR, "external-menu-records.json"), { records: [] });
  for (const record of legacyExternal.records || []) {
    records.set(cleanValue(record.menuId || record.id), record);
  }
  let files = [];
  try {
    files = (await fs.readdir(path.join(ENRICHMENT_DIR, "external-sources"))).filter((name) => name.endsWith(".json"));
  } catch (error) {
    files = [];
  }
  for (const fileName of files) {
    const payload = await readJson(path.join(ENRICHMENT_DIR, "external-sources", fileName), { records: [] });
    for (const record of payload.records || []) records.set(cleanValue(record.menuId || record.id), record);
  }
  return records;
}

async function appendEnrichmentPayload(relativePath, newRecords, summaryExtras = {}) {
  if (!(newRecords || []).length) {
    const existing = await readEnrichmentPayload(path.join(DATA_DIR, relativePath), { version: VERSION, records: [] });
    return (existing.records || []).length;
  }
  const filePath = path.join(DATA_DIR, relativePath);
  const payload = await readEnrichmentPayload(filePath, { version: VERSION, records: [] });
  const records = dedupeRecords([...(payload.records || []), ...newRecords]);
  await writeMaybeShardedJson(filePath, {
    ...payload,
    version: payload.version || VERSION,
    generatedAt: new Date().toISOString(),
    summary: {
      ...(payload.summary || {}),
      total: records.length,
      ...summaryExtras,
    },
    records,
  }, { shard: true });
  return records.length;
}

async function updateStatus(summary) {
  const filePath = path.join(DATA_DIR, "enrichment-status.json");
  const payload = await readJson(filePath, { summary: {} });
  const cumulative = summary.cumulative || {};
  payload.summary = {
    ...(payload.summary || {}),
    ocrProcessedPages: cumulative.pagesProcessed ?? summary.pagesProcessed,
    ocrTextLines: cumulative.textLines ?? summary.textLines,
    ocrTextSpans: cumulative.textSpans ?? summary.textSpans,
    ocrDishMentions: cumulative.dishMentions ?? summary.dishMentions,
    ocrPriceObservations: cumulative.priceObservations ?? summary.priceObservations,
    ocrPagesFailed: cumulative.pagesFailed ?? summary.pagesFailed ?? 0,
    ocrFailures: summary.failureSummary || null,
    ocrLastBatch: {
      candidatesSelected: summary.candidatesSelected,
      pagesAttempted: summary.pagesAttempted,
      pagesProcessed: summary.pagesProcessed,
      pagesFailed: summary.pagesFailed,
      dishMentions: summary.dishMentions,
      priceObservations: summary.priceObservations,
      bySource: summary.bySource || {},
    },
    ocrUpdatedAt: summary.finishedAt,
  };
  await writeJson(filePath, payload);
}

async function buildLocalVisionOcrEnrichment(options = {}) {
  const startedAt = new Date().toISOString();
  const queue = await readJson(path.join(ENRICHMENT_DIR, "ocr-triage-queue.json"), { records: [] });
  const previous = await readEnrichmentPayload(OUTPUT_PATH, { records: [] });
  const previousFailures = await readJson(FAILURE_OUTPUT_PATH, { records: [] });
  const sources = await sourceRecordMap();
  const [cpiUs, cpiCountry, contextEvents] = await Promise.all([
    readJson(path.join(DATA_DIR, "reference", "cpi-us.json"), {}),
    readJson(path.join(DATA_DIR, "reference", "cpi-country.json"), {}),
    readJson(path.join(DATA_DIR, "reference", "context-events.json"), []),
  ]);
  const references = { cpiUs, cpiCountry };
  const retryCandidateIds = new Set(
    (previousFailures.records || [])
      .filter((record) => record.retryable)
      .map((record) => cleanValue(record.candidateId))
      .filter(Boolean)
  );
  const candidates = selectOcrCandidates(queue.records || [], previous.records || [], { ...options, retryCandidateIds });

  const extractionRecords = [];
  const dishMentions = [];
  const priceObservations = [];
  const events = [];
  for (const [candidateIndex, candidate] of candidates.entries()) {
    const sourceRecord = sources.get(candidate.menuId) || {};
    const menu = menuLike(candidate, sourceRecord);
    const urls = (await resolveImageUrlsForRecord({ ...sourceRecord, ...candidate }, options)).slice(0, options.pagesPerMenu);
    if (!urls.length) {
      events.push({ level: "warn", candidateId: candidate.id, menuId: candidate.menuId, message: "no image URL" });
      continue;
    }
    for (const [pageIndex, imageUrl] of urls.entries()) {
      let cached = null;
      try {
        cached = await fetchImageToCache(imageUrl, options);
        const ocr = await runVisionOcr(cached.filePath, options);
        const text = (ocr.lines || []).map((line) => line.text).join("\n");
        const pageDishMentions = textDishMentions(menu, text, options.maxDishMentionsPerMenu).map((record) => ({
          ...record,
          id: stableId("dishmention", [candidate.menuId, candidate.id, pageIndex + 1, record.normalizedName, record.lineNumber || ""]),
          extractionMethod: "local_vision_ocr_dish",
          confidence: Number(Math.min(0.96, Number(record.confidence || 0.5) + 0.04).toFixed(3)),
          provenance: {
            ...(record.provenance || {}),
            sourceFile: "enrichment/ocr-extractions.json",
            sourceRecordId: candidate.sourceRecordId,
            candidateId: candidate.id,
            pageNumber: pageIndex + 1,
            ocrEngine: "macos_vision",
          },
        }));
        const rawPriceRows = extractPricesFromText(text, menu).map((record, index) => ({
          ...record,
          id: stableId("ocrpricebase", [candidate.menuId, candidate.id, pageIndex + 1, record.item, record.rawPrice, index]),
          sourceKey: candidate.sourceKey,
          menuUid: candidate.menuId,
          rawLineNumber: Number(record.id?.split("-").slice(-2, -1)[0]) + 1 || null,
          context: contextForEntry(record, contextEvents),
        }));
        const pagePriceObservations = rawPriceRows.map((record) => {
          const enriched = enrichmentPriceObservation(record, references, contextEvents);
          return {
            ...enriched,
            id: stableId("priceobs", [candidate.menuId, candidate.id, pageIndex + 1, enriched.normalizedName, enriched.rawPriceText]),
            extractionMethod: "local_vision_ocr_price",
            provenance: {
              ...(enriched.provenance || {}),
              sourceFile: "enrichment/ocr-extractions.json",
              sourceRecordId: candidate.sourceRecordId,
              candidateId: candidate.id,
              pageNumber: pageIndex + 1,
              ocrEngine: "macos_vision",
            },
          };
        });
        const evidenceLines = evidenceLineNumbers(pageDishMentions, rawPriceRows);
        const textSpans = textSpansFromOcr({
          lines: ocr.lines || [],
          menuId: candidate.menuId,
          candidateId: candidate.id,
          pageIndex: pageIndex + 1,
          evidenceLines,
        });
        extractionRecords.push({
          id: stableId("ocrextraction", [candidate.menuId, candidate.id, pageIndex + 1, imageUrl]),
          status: "ok",
          candidateId: candidate.id,
          menuId: candidate.menuId,
          sourceId: candidate.sourceId,
          sourceKey: candidate.sourceKey,
          sourceRecordId: candidate.sourceRecordId,
          title: candidate.title,
          pageNumber: pageIndex + 1,
          imageHash: hash(imageUrl),
          imageBytes: cached.bytes,
          ocrEngine: "macos_vision",
          lineCount: (ocr.lines || []).length,
          textSpanCount: textSpans.length,
          dishMentionIds: pageDishMentions.map((record) => record.id),
          priceObservationIds: pagePriceObservations.map((record) => record.id),
          ingredientTags: [...new Set(pageDishMentions.flatMap((record) => record.ingredientTags || []).concat(ingredientTagsFor(text)))].sort().slice(0, 32),
          textSpans,
          confidence: (ocr.lines || []).length ? Number(((ocr.lines || []).reduce((sum, line) => sum + Number(line.confidence || 0), 0) / (ocr.lines || []).length).toFixed(3)) : 0,
          provenance: {
            sourceFile: candidate.provenance?.sourceFile || "ocr-triage-queue.json",
            sourceRecordId: candidate.sourceRecordId,
            rightsNote: "Local OCR derived text spans only; fetched image bytes are not published and are deleted unless --keep-images is set.",
          },
        });
        dishMentions.push(...pageDishMentions);
        priceObservations.push(...pagePriceObservations);
        if (!options.keepImages) await fs.rm(cached.filePath, { force: true });
      } catch (error) {
        events.push({ level: "warn", candidateId: candidate.id, menuId: candidate.menuId, pageNumber: pageIndex + 1, message: error.message });
        extractionRecords.push({
          id: stableId("ocrextraction", [candidate.menuId, candidate.id, pageIndex + 1, "error", imageUrl]),
          status: "error",
          candidateId: candidate.id,
          menuId: candidate.menuId,
          sourceId: candidate.sourceId,
          sourceKey: candidate.sourceKey,
          sourceRecordId: candidate.sourceRecordId,
          title: candidate.title,
          pageNumber: pageIndex + 1,
          imageHash: hash(imageUrl),
          imageBytes: cached?.bytes || null,
          ocrEngine: "macos_vision",
          lineCount: 0,
          textSpanCount: 0,
          dishMentionIds: [],
          priceObservationIds: [],
          ingredientTags: [],
          textSpans: [],
          confidence: 0,
          errorMessage: cleanValue(error.message).slice(0, 320),
          provenance: {
            sourceFile: candidate.provenance?.sourceFile || "ocr-triage-queue.json",
            sourceRecordId: candidate.sourceRecordId,
            rightsNote: "Local OCR attempt failed; no image bytes, raw OCR text, or external LLM payload is published.",
          },
        });
        if (cached?.filePath && !options.keepImages) await fs.rm(cached.filePath, { force: true }).catch(() => {});
      }
    }
    options.onProgress?.(`vision OCR ${candidateIndex + 1}/${candidates.length}`);
  }

  const finishedAt = new Date().toISOString();
  const records = dedupeExtractionRecords([...(previous.records || []), ...extractionRecords]);
  const successfulExtractions = extractionRecords.filter((record) => record.status !== "error");
  const cumulativeSuccessfulExtractions = records.filter((record) => record.status !== "error");
  const failureReport = buildOcrFailureReport({ records, queueRecords: queue.records || [], generatedAt: finishedAt });
  const summary = {
    startedAt,
    finishedAt,
    candidatesSelected: candidates.length,
    pagesAttempted: extractionRecords.length,
    pagesProcessed: successfulExtractions.length,
    pagesFailed: extractionRecords.length - successfulExtractions.length,
    textLines: successfulExtractions.reduce((sum, record) => sum + record.lineCount, 0),
    textSpans: successfulExtractions.reduce((sum, record) => sum + record.textSpanCount, 0),
    dishMentions: dishMentions.length,
    priceObservations: priceObservations.length,
    bySource: Object.fromEntries(
      successfulExtractions.reduce((counts, record) => {
        counts.set(record.sourceId, (counts.get(record.sourceId) || 0) + 1);
        return counts;
      }, new Map())
    ),
    cumulative: {
      pagesAttempted: records.length,
      pagesProcessed: cumulativeSuccessfulExtractions.length,
      pagesFailed: records.length - cumulativeSuccessfulExtractions.length,
      textLines: cumulativeSuccessfulExtractions.reduce((sum, record) => sum + Number(record.lineCount || 0), 0),
      textSpans: cumulativeSuccessfulExtractions.reduce((sum, record) => sum + Number(record.textSpanCount || 0), 0),
      dishMentions: cumulativeSuccessfulExtractions.reduce((sum, record) => sum + (record.dishMentionIds || []).length, 0),
      priceObservations: cumulativeSuccessfulExtractions.reduce((sum, record) => sum + (record.priceObservationIds || []).length, 0),
      bySource: Object.fromEntries(
        cumulativeSuccessfulExtractions.reduce((counts, record) => {
          counts.set(record.sourceId, (counts.get(record.sourceId) || 0) + 1);
          return counts;
        }, new Map())
      ),
    },
    failureSummary: failureReport.summary,
    events,
  };
  const payload = {
    version: VERSION,
    generatedAt: finishedAt,
    processor: {
      name: "local_vision_ocr_enrichment",
      version: "0.1.0",
      localOnly: true,
      storesImageBlobs: false,
      storesFullOcrDump: false,
    },
    summary,
    records,
  };
  if (!options.dryRun) {
    await writeMaybeShardedJson(OUTPUT_PATH, payload, { shard: true });
    await writeJson(FAILURE_OUTPUT_PATH, failureReport);
    await appendEnrichmentPayload("enrichment/dish-mentions.json", dishMentions, { ocrVisionAdded: dishMentions.length });
    await appendEnrichmentPayload("enrichment/price-observations.json", priceObservations, { ocrVisionAdded: priceObservations.length });
    await updateStatus(summary);
  }
  return payload;
}

function optionsFromArgs(args = process.argv.slice(2)) {
  return {
    limit: Math.max(1, Number(argValue(args, "limit", "10")) || 10),
    batch: argValue(args, "batch", "phase1"),
    source: argValue(args, "source", "all"),
    tier: argValue(args, "tier", "all"),
    pagesPerMenu: Math.max(1, Number(argValue(args, "pages-per-menu", "2")) || 2),
    imageWidth: Math.max(800, Number(argValue(args, "image-width", "1400")) || 1400),
    maxDishMentionsPerMenu: Math.max(10, Number(argValue(args, "max-dish-mentions-per-menu", "120")) || 120),
    requestTimeoutMs: Math.max(5000, Number(argValue(args, "timeout-ms", "30000")) || 30000),
    ocrTimeoutMs: Math.max(10000, Number(argValue(args, "ocr-timeout-ms", "90000")) || 90000),
    refresh: hasFlag(args, "refresh"),
    retryErrors: hasFlag(args, "retry-errors"),
    retryRetryable: hasFlag(args, "retry-retryable"),
    refreshImages: hasFlag(args, "refresh-images"),
    keepImages: hasFlag(args, "keep-images"),
    dryRun: hasFlag(args, "dry-run"),
    onProgress: (message) => console.log(message),
  };
}

if (require.main === module) {
  buildLocalVisionOcrEnrichment(optionsFromArgs())
    .then((payload) => console.log(JSON.stringify(payload.summary, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  VERSION,
  buildLocalVisionOcrEnrichment,
  buildOcrFailureReport,
  classifyOcrError,
  imageUrlsForRecord,
  imageUrlsForIiifManifestPayload,
  resolveImageUrlsForRecord,
  ciaImageUrlsForRecord,
  ciaIiifImageUrl,
  dedupeExtractionRecords,
  iiifServiceImageUrl,
  menuLike,
  optionsFromArgs,
  resizedIiifImageUrlFromInfo,
  selectOcrCandidates,
  textSpansFromOcr,
};
