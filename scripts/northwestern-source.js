const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { cleanValue, normalizeText } = require("../docs/multisource");
const { normalizePrice } = require("../docs/price-utils");
const { dishTypeFor, ingredientTagsFor, normalizedDishName } = require("./local-enrichment");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const OUTPUT_PATH = path.join(DATA_DIR, "enrichment", "external-menu-records.json");
const SOURCE_ID = "northwestern_transport_menus";
const SOURCE_KEY = "northwestern";
const API_URL = "https://api.dc.library.northwestern.edu/api/v2/search";
const VERSION = 1;
const DEFAULT_LIMIT = 120;
const MAX_LIMIT = 2000;
const DEFAULT_PAGE_SIZE = 1000;

const SOURCE_FIELDS = [
  "id",
  "title",
  "date_created",
  "work_type",
  "thumbnail",
  "iiif_manifest",
  "description",
  "subject",
  "collection",
  "creator",
  "location",
];

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

function firstValue(value) {
  if (Array.isArray(value)) return cleanValue(value[0]);
  return cleanValue(value);
}

function values(value) {
  if (Array.isArray(value)) return value.map(cleanValue).filter(Boolean);
  const single = cleanValue(value);
  return single ? [single] : [];
}

function hitRecordId(hit) {
  const source = hit?._source || hit || {};
  return cleanValue(source.id || hit?._id);
}

function subjectLabels(subjects = []) {
  return (subjects || [])
    .flatMap((subject) => [subject?.label, subject?.label_with_role, ...(subject?.variants || [])])
    .map(cleanValue)
    .filter(Boolean);
}

function locationLabels(locations = []) {
  return (locations || []).map((location) => cleanValue(location?.label || location)).filter(Boolean);
}

function parseDateRange(...parts) {
  const text = parts.map(cleanValue).filter(Boolean).join(" ");
  const years = [...text.matchAll(/\b(18|19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  if (!years.length) {
    return {
      dateText: cleanValue(parts[0]),
      year: null,
      lowerYear: null,
      upperYear: null,
      decade: "unknown",
      confidence: "X",
    };
  }
  const lowerYear = Math.min(...years);
  const upperYear = Math.max(...years);
  const point = lowerYear === upperYear ? lowerYear : Math.round((lowerYear + upperYear) / 2);
  return {
    dateText: cleanValue(parts[0]) || String(point),
    year: lowerYear === upperYear ? lowerYear : null,
    lowerYear,
    upperYear,
    pointYear: point,
    decade: `${Math.floor(point / 10) * 10}s`,
    confidence: lowerYear === upperYear ? "A" : upperYear - lowerYear <= 10 ? "B" : "C",
  };
}

function transportModeFor(text) {
  const normalized = normalizeText(text);
  if (/\b(airline|airlines|airways|aircraft|flight|business class|tokyo)\b/.test(normalized)) return "airline";
  if (/\b(cruise|ship|steamship|ocean liner|steam ship)\b/.test(normalized)) return "ship";
  if (/\b(railroad|railroads|railway|railways|dining car|penn central|new york central)\b/.test(normalized)) return "railroad";
  return "transport";
}

function organizationFor({ title, subjects, collectionTitle }) {
  const labels = subjectLabels(subjects);
  const organization = labels.find((label) => /\b(company|railroad|railway|airlines?|airways?|transportation|steamship|line)\b/i.test(label));
  if (organization) return organization;
  const titlePrefix = cleanValue(title).split(/\bMenu\b/i)[0].replace(/,\s*$/, "");
  return cleanValue(titlePrefix || collectionTitle);
}

function amountFromPrice(rawPrice) {
  const match = cleanValue(rawPrice).match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  const value = match ? Number(match[1]) : null;
  return Number.isFinite(value) ? value : null;
}

function representativeDishText(description) {
  const text = values(description).join(" ");
  const match = text.match(/\bRepresentative dishes?:\s*(.+)$/i);
  return cleanValue(match ? match[1] : "");
}

function representativeDishSegments(description) {
  const text = representativeDishText(description);
  if (!text) return [];
  const segments = [];
  const priced = /([^.;]+?)\s*\((\$[0-9]+(?:\.[0-9]{1,2})?)\)/g;
  let match = priced.exec(text);
  while (match) {
    const rawName = cleanValue(match[1].replace(/^[.;,\s]+/, ""));
    if (rawName) segments.push({ rawName, rawPriceText: match[2] });
    match = priced.exec(text);
  }
  if (segments.length) return segments;
  return text
    .split(/[.;]/)
    .map(cleanValue)
    .filter(Boolean)
    .slice(0, 8)
    .map((rawName) => ({ rawName, rawPriceText: "" }));
}

function dishMentionFor(record, segment) {
  const normalizedName = normalizedDishName(segment.rawName);
  if (!normalizedName) return null;
  return {
    id: stableId("externaldish", [record.menuId, normalizedName, segment.rawPriceText]),
    menuId: record.menuId,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    rawName: cleanValue(segment.rawName),
    normalizedName,
    canonicalDishId: `dish:${normalizedName.replace(/\s+/g, "-").slice(0, 96)}`,
    sectionName: "representative dishes",
    dishType: dishTypeFor(segment.rawName),
    ingredientTags: ingredientTagsFor(segment.rawName),
    extractionMethod: "northwestern_description",
    confidence: segment.rawPriceText ? 0.82 : 0.68,
    provenance: {
      sourceFile: "enrichment/external-menu-records.json",
      sourceRecordId: record.sourceRecordId,
      sourceApiUrl: API_URL,
    },
  };
}

function priceObservationFor(record, segment, references = {}) {
  if (!segment.rawPriceText) return null;
  const amount = amountFromPrice(segment.rawPriceText);
  if (!Number.isFinite(amount)) return null;
  const normalizedName = normalizedDishName(segment.rawName);
  const priceRecord = {
    id: stableId("externalprice", [record.menuId, normalizedName, segment.rawPriceText]),
    menuId: record.menuId,
    menuUid: record.menuId,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    item: cleanValue(segment.rawName),
    rawName: cleanValue(segment.rawName),
    normalizedName,
    rawPrice: segment.rawPriceText,
    rawPriceText: segment.rawPriceText,
    amount,
    currency: "USD",
    currencyCode: "USD",
    year: record.year || record.pointYear || null,
    confidence: "medium",
    scale: "external-description-usd",
    dishType: dishTypeFor(segment.rawName),
    ingredientTags: ingredientTagsFor(segment.rawName),
    extractionMethod: "northwestern_description_price",
    provenance: {
      sourceFile: "enrichment/external-menu-records.json",
      sourceRecordId: record.sourceRecordId,
      sourceApiUrl: API_URL,
    },
  };
  priceRecord.normalized = normalizePrice(priceRecord, references);
  return priceRecord;
}

function normalizeHit(hit, references = {}) {
  const source = hit?._source || hit || {};
  const sourceRecordId = cleanValue(source.id || hit?._id);
  if (!sourceRecordId) return null;
  const title = cleanValue(source.title) || "Untitled Northwestern menu";
  const collectionTitle = cleanValue(source.collection?.title);
  const dateText = firstValue(source.date_created);
  const parsedDate = parseDateRange(dateText, title);
  const subjects = subjectLabels(source.subject);
  const places = locationLabels(source.location);
  const descriptionText = values(source.description).join(" ");
  const mode = transportModeFor([title, collectionTitle, subjects.join(" "), descriptionText].join(" "));
  const menuId = `${SOURCE_KEY}:${sourceRecordId}`;
  const baseRecord = {
    id: menuId,
    menuId,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    sourceRecordId,
    title,
    dateText: parsedDate.dateText,
    year: parsedDate.year,
    lowerYear: parsedDate.lowerYear,
    upperYear: parsedDate.upperYear,
    pointYear: parsedDate.pointYear,
    decade: parsedDate.decade,
    dateConfidence: parsedDate.confidence,
    workType: cleanValue(source.work_type),
    collectionTitle,
    itemUrl: `https://dc.library.northwestern.edu/items/${sourceRecordId}`,
    iiifManifestUrl: cleanValue(source.iiif_manifest),
    thumbnailUrl: cleanValue(source.thumbnail),
    sourceUrl: `https://dc.library.northwestern.edu/items/${sourceRecordId}`,
    sourceApiUrl: API_URL,
    venueText: organizationFor({ title, subjects: source.subject, collectionTitle }),
    placeText: places.join(", "),
    country: subjects.find((label) => /^United States$/i.test(label)) ? "United States" : "",
    transportMode: mode,
    subjects: subjects.slice(0, 12),
    descriptionSummary: cleanValue(descriptionText).slice(0, 420),
    confidence: parsedDate.confidence === "A" ? 0.86 : parsedDate.confidence === "B" ? 0.74 : 0.58,
    provenance: {
      sourceFile: "enrichment/external-menu-records.json",
      sourceRecordId,
      sourceApiUrl: API_URL,
      rightsNote: "Derived metadata only; no raw image, OCR, or IIIF payload copied into static graph artifacts.",
    },
  };
  const segments = representativeDishSegments(source.description);
  const dishMentions = segments.map((segment) => dishMentionFor(baseRecord, segment)).filter(Boolean);
  const priceObservations = segments.map((segment) => priceObservationFor(baseRecord, segment, references)).filter(Boolean);
  return {
    ...baseRecord,
    dishHints: dishMentions.map((dish) => ({
      rawName: dish.rawName,
      normalizedName: dish.normalizedName,
      dishType: dish.dishType,
      ingredientTags: dish.ingredientTags,
      confidence: dish.confidence,
    })),
    ingredientTags: [...new Set(dishMentions.flatMap((dish) => dish.ingredientTags))].sort(),
    priceObservations,
    dishMentions,
  };
}

function recordKey(record) {
  return cleanValue(record?.sourceRecordId || record?.id || record?.menuId);
}

function dishKey(dish) {
  return normalizedDishName(dish?.normalizedName || dish?.rawName || dish?.canonicalDishId || dish?.id);
}

function priceKey(price) {
  return [
    normalizedDishName(price?.normalizedName || price?.rawName || price?.item),
    cleanValue(price?.rawPrice || price?.rawPriceText),
    cleanValue(price?.currencyCode || price?.currency),
  ].join("|");
}

function mergeUniqueEvidence(existing = [], incoming = [], keyFor) {
  const seen = new Set();
  const merged = [];
  for (const item of [...existing, ...incoming]) {
    const key = keyFor(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

function evidenceScore(record) {
  return (
    (record?.dishMentions || []).length * 2 +
    (record?.priceObservations || []).length * 4 +
    (record?.ingredientTags || []).length +
    (record?.metadataEnrichment ? 6 : 0)
  );
}

function dishHintsFromMentions(dishMentions) {
  return (dishMentions || []).map((dish) => ({
    rawName: dish.rawName,
    normalizedName: dish.normalizedName,
    dishType: dish.dishType,
    ingredientTags: dish.ingredientTags || [],
    confidence: dish.confidence,
  }));
}

function mergeNorthwesternRecord(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const existingScore = evidenceScore(existing);
  const incomingScore = evidenceScore(incoming);
  const base = existingScore > incomingScore ? { ...incoming, ...existing } : { ...existing, ...incoming };
  const dishMentions = mergeUniqueEvidence(existing.dishMentions, incoming.dishMentions, dishKey);
  const priceObservations = mergeUniqueEvidence(existing.priceObservations, incoming.priceObservations, priceKey);
  const imageFeatures = mergeUniqueEvidence(existing.imageFeatures, incoming.imageFeatures, (feature) =>
    cleanValue(feature?.id || feature?.iiifInfoUri || feature?.sourceImageUrl)
  );
  const ingredientTags = [
    ...new Set(
      [
        ...(existing.ingredientTags || []),
        ...(incoming.ingredientTags || []),
        ...dishMentions.flatMap((dish) => dish.ingredientTags || []),
        ...priceObservations.flatMap((price) => price.ingredientTags || []),
      ]
        .map(cleanValue)
        .filter(Boolean)
    ),
  ].sort();

  return {
    ...base,
    dishMentions,
    dishHints: dishHintsFromMentions(dishMentions),
    priceObservations,
    imageFeatures,
    ingredientTags,
    metadataMerge: {
      version: VERSION,
      mergedAt: new Date().toISOString(),
      existingEvidenceScore: existingScore,
      incomingEvidenceScore: incomingScore,
    },
  };
}

function mergeNorthwesternRecords(existingRecords = [], incomingRecords = []) {
  const byKey = new Map();
  const order = [];
  for (const record of incomingRecords) {
    const key = recordKey(record);
    if (!key) continue;
    byKey.set(key, record);
    order.push(key);
  }
  for (const existing of existingRecords) {
    const key = recordKey(existing);
    if (!key) continue;
    if (byKey.has(key)) {
      byKey.set(key, mergeNorthwesternRecord(existing, byKey.get(key)));
    } else {
      byKey.set(key, existing);
      order.push(key);
    }
  }
  return order.map((key) => byKey.get(key)).filter(Boolean);
}

async function readJson(relativePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, relativePath), "utf8"));
  } catch (error) {
    return fallback;
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function pagePlanForLimit(limit, pageSize = DEFAULT_PAGE_SIZE) {
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || DEFAULT_LIMIT));
  const safePageSize = Math.min(safeLimit, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));
  const pages = [];
  for (let offset = 0; offset < safeLimit; offset += safePageSize) {
    pages.push({ offset, size: Math.min(safePageSize, safeLimit - offset) });
  }
  return pages;
}

function hitsForPayload(payload) {
  return payload?.data || payload?.hits?.hits || [];
}

function mergePagedPayloads(payloads, options = {}) {
  const records = [];
  const seen = new Set();
  for (const payload of payloads || []) {
    for (const hit of hitsForPayload(payload)) {
      const id = hitRecordId(hit);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      records.push(hit);
      if (options.limit && records.length >= options.limit) break;
    }
    if (options.limit && records.length >= options.limit) break;
  }
  const first = payloads?.[0] || {};
  return {
    ...first,
    data: records,
    pagination: {
      ...(first.pagination || {}),
      total_hits: Math.max(...(payloads || []).map((payload) => Number(totalHits(payload) || 0)), 0) || totalHits(first),
      page_size: records.length,
      offset: 0,
    },
    paged: Boolean((payloads || []).length > 1),
    pageCount: (payloads || []).length,
  };
}

async function fetchNorthwesternPage(options, page) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const fetchImpl = options.fetch || fetch;
  try {
    const response = await fetchImpl(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MenuGraph bounded metadata connector; derived metadata only",
      },
      body: JSON.stringify({
        _source: SOURCE_FIELDS,
        size: page.size,
        from: page.offset,
        query: { match: { all_text: options.query } },
      }),
    });
    if (!response.ok) throw new Error(`Northwestern API returned HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNorthwesternRecords(options) {
  const pageSize = Math.min(
    Math.max(1, Number(options.pageSize || DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE),
    Math.max(1, Number(options.limit || DEFAULT_LIMIT) || DEFAULT_LIMIT)
  );
  const pages = pagePlanForLimit(options.limit, pageSize);
  if (pages.length === 1) return fetchNorthwesternPage(options, pages[0]);

  const payloads = [];
  let previousUniqueCount = 0;
  for (const page of pages) {
    const payload = await fetchNorthwesternPage(options, page);
    payloads.push(payload);
    const merged = mergePagedPayloads(payloads, { limit: options.limit });
    const uniqueCount = hitsForPayload(merged).length;
    if (!hitsForPayload(payload).length || uniqueCount === previousUniqueCount) break;
    previousUniqueCount = uniqueCount;
    const total = Number(totalHits(payload) || 0);
    if (total && uniqueCount >= Math.min(total, options.limit)) break;
  }
  return mergePagedPayloads(payloads, { limit: options.limit });
}

function totalHits(payload) {
  return payload?.pagination?.total_hits ?? payload?.hits?.total?.value ?? payload?.total ?? null;
}

async function buildNorthwesternSource(options = {}) {
  const startedAt = new Date().toISOString();
  const [cpiUs, cpiCountry] = await Promise.all([
    readJson("reference/cpi-us.json", {}),
    readJson("reference/cpi-country.json", {}),
  ]);
  const references = { cpiUs, cpiCountry };
  const payload = options.payload || (await fetchNorthwesternRecords(options));
  const hits = payload.data || payload.hits?.hits || [];
  const fetchedRecords = hits.map((hit) => normalizeHit(hit, references)).filter(Boolean);
  const existingPayload =
    options.mergeExisting === false
      ? { records: [] }
      : options.existingPayload || (await fs.readFile(OUTPUT_PATH, "utf8").then((text) => JSON.parse(text)).catch(() => ({ records: [] })));
  const existingRecords = existingPayload.records || [];
  const existingKeys = new Set(existingRecords.map(recordKey).filter(Boolean));
  const fetchedKeys = new Set(fetchedRecords.map(recordKey).filter(Boolean));
  const records = options.mergeExisting === false ? fetchedRecords : mergeNorthwesternRecords(existingRecords, fetchedRecords);
  const generatedAt = new Date().toISOString();
  const dishMentions = records.flatMap((record) => record.dishMentions || []);
  const priceObservations = records.flatMap((record) => record.priceObservations || []);
  const output = {
    version: VERSION,
    generatedAt,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    query: options.query,
    sourceApiUrl: API_URL,
    summary: {
      total: records.length,
      totalHits: totalHits(payload),
      dishMentions: dishMentions.length,
      priceObservations: priceObservations.length,
      fetchedRecords: fetchedRecords.length,
      existingRecords: options.mergeExisting === false ? 0 : existingRecords.length,
      duplicateMergedRecords: options.mergeExisting === false ? 0 : [...fetchedKeys].filter((key) => existingKeys.has(key)).length,
      appendedFetchedRecords: options.mergeExisting === false ? fetchedRecords.length : [...fetchedKeys].filter((key) => !existingKeys.has(key)).length,
      withDates: records.filter((record) => record.lowerYear).length,
      withIiif: records.filter((record) => record.iiifManifestUrl).length,
      withDishHints: records.filter((record) => record.dishHints.length).length,
      transportModes: countBy(records, (record) => record.transportMode),
      ingredientTags: countBy(dishMentions.flatMap((record) => record.ingredientTags.map((tag) => ({ tag }))), (record) => record.tag),
      startedAt,
      finishedAt: generatedAt,
    },
    records,
  };
  if (!options.dryRun) await writeJson(OUTPUT_PATH, output);
  return output;
}

function countBy(records, getter) {
  const counts = new Map();
  for (const record of records || []) {
    const key = getter(record) || "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

function optionsFromArgs(args = process.argv.slice(2)) {
  return {
    limit: Math.min(MAX_LIMIT, Math.max(1, Number(argValue(args, "limit", String(DEFAULT_LIMIT))) || DEFAULT_LIMIT)),
    query: cleanValue(argValue(args, "query", "menu transportation dining")),
    pageSize: Math.max(1, Number(argValue(args, "page-size", String(DEFAULT_PAGE_SIZE))) || DEFAULT_PAGE_SIZE),
    timeoutMs: Math.max(5000, Number(argValue(args, "timeout-ms", "30000")) || 30000),
    mergeExisting: !hasFlag(args, "replace"),
    dryRun: hasFlag(args, "dry-run"),
  };
}

async function main() {
  const output = await buildNorthwesternSource(optionsFromArgs());
  console.log(
    [
      `Wrote ${output.summary.total.toLocaleString()} Northwestern external menu records`,
      `${output.summary.dishMentions.toLocaleString()} dish mentions`,
      `${output.summary.priceObservations.toLocaleString()} price observations`,
    ].join(", ")
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildNorthwesternSource,
  DEFAULT_PAGE_SIZE,
  fetchNorthwesternRecords,
  mergePagedPayloads,
  mergeNorthwesternRecord,
  mergeNorthwesternRecords,
  MAX_LIMIT,
  normalizeHit,
  optionsFromArgs,
  pagePlanForLimit,
  parseDateRange,
  representativeDishSegments,
  transportModeFor,
};
