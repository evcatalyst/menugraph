const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { cleanValue, normalizeText } = require("../docs/multisource");
const { dishTypeFor, ingredientTagsFor, normalizedDishName } = require("./local-enrichment");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const OUTPUT_PATH = path.join(DATA_DIR, "enrichment", "external-sources", "nola_menu_collection.json");
const BASE_URL = "https://archives-nolalibrary.contentdm.oclc.org";
const DIGITAL_BASE = `${BASE_URL}/digital`;
const COLLECTION_ALIAS = "p16880coll68";
const SOURCE_ID = "nola_menu_collection";
const SOURCE_KEY = "nola";
const COLLECTION_TITLE = "New Orleans Public Library Menu Collection";
const VERSION = 1;

const CUISINE_PATTERNS = [
  ["cajun", /\bcajun\b/i],
  ["chinese", /\bchinese\b/i],
  ["creole", /\bcreole\b|\bnew orleans\b|\bfrench quarter\b|\bvieux carre\b/i],
  ["french", /\bfrench\b|\bantoine'?s\b|\barnaud'?s\b|\bgalatoire'?s\b|\btujague'?s\b/i],
  ["german", /\bgerman\b|\bkolb'?s\b/i],
  ["latin", /\blatin\b/i],
  ["seafood", /\bseafood\b|\bfisherman'?s wharf\b|\bfish\b|\boyster\b|\bshrimp\b/i],
];

const DISH_HINT_PATTERNS = [
  ["a la carte options", /\ba la carte\b/i],
  ["bar menu", /\bbar\b|\bcocktail lounge\b/i],
  ["breakfast options", /\bbreakfast\b/i],
  ["coffee house options", /\bcoffee house\b/i],
  ["cocktails", /\bcocktails?\b|\bdrink list\b|\bdrink suggestions\b/i],
  ["dinner options", /\bdinner\b/i],
  ["fish and seafood options", /\bseafood\b|\bfisherman'?s wharf\b|\bfish\b|\boyster\b|\bshrimp\b/i],
  ["fried chicken options", /\bpopeyes?\b/i],
  ["lunch options", /\blunch(?:eon)?\b/i],
  ["po-boys", /\bpo-?boys?\b/i],
  ["sandwiches", /\bsandwich(?:es)?\b/i],
  ["specials", /\bspecials?\b/i],
  ["tea room options", /\btea room\b/i],
  ["yogurt", /\byogurt\b/i],
];

const MONTH_PATTERN =
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;

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

function absoluteDigitalUrl(value) {
  const raw = cleanValue(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/iiif")) return `${BASE_URL}${raw}`;
  if (raw.startsWith("/api") || raw.startsWith("/compoundobject") || raw.startsWith("/singleitem")) return `${DIGITAL_BASE}${raw}`;
  return `${DIGITAL_BASE}/${raw.replace(/^\/+/, "")}`;
}

function fieldEntries(item) {
  return [...(item?.fields || []), ...(item?.metadataFields || [])];
}

function fieldMap(item) {
  const map = {};
  for (const field of fieldEntries(item)) {
    const key = cleanValue(field.key || field.field || field.label).toLowerCase();
    if (!key) continue;
    map[key] = cleanValue(field.value);
  }
  return map;
}

function firstField(item, keys) {
  const map = fieldMap(item);
  for (const key of keys) {
    const value = map[String(key).toLowerCase()];
    if (value) return value;
  }
  return "";
}

function splitTerms(value) {
  return cleanValue(value)
    .split(";")
    .map((term) => cleanValue(term.replace(/\.$/, "")))
    .filter(Boolean);
}

function objectPages(item) {
  const pages = item?.objectInfo?.page;
  if (Array.isArray(pages)) return pages;
  if (pages && typeof pages === "object") return [pages];
  return [];
}

function parseDateRange(...parts) {
  const primaryDisplay = cleanValue(parts[0]);
  const text = parts.map(cleanValue).filter(Boolean).join(" ");
  if (!text) return { dateText: "", year: null, lowerYear: null, upperYear: null, pointYear: null, decade: "unknown", confidence: "X" };

  const iso = text.match(/\b((?:18|19|20)\d{2})-\d{2}-\d{2}\b/);
  if (iso) {
    const year = Number(iso[1]);
    return { dateText: primaryDisplay || iso[0], year, lowerYear: year, upperYear: year, pointYear: year, decade: `${Math.floor(year / 10) * 10}s`, confidence: "A" };
  }

  const monthDayYear = text.match(
    /\b((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2},?\s+((?:18|19|20)\d{2}))\b/i
  );
  if (monthDayYear) {
    const year = Number(monthDayYear[2]);
    return {
      dateText: primaryDisplay || cleanValue(monthDayYear[1]),
      year,
      lowerYear: year,
      upperYear: year,
      pointYear: year,
      decade: `${Math.floor(year / 10) * 10}s`,
      confidence: "A",
    };
  }

  const yearMatches = [...text.matchAll(/\b(18|19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  if (!yearMatches.length) return { dateText: primaryDisplay, year: null, lowerYear: null, upperYear: null, pointYear: null, decade: "unknown", confidence: "X" };
  const lowerYear = Math.min(...yearMatches);
  const upperYear = Math.max(...yearMatches);
  const pointYear = Math.round((lowerYear + upperYear) / 2);
  const exact = lowerYear === upperYear;
  const hasMonthDay = MONTH_PATTERN.test(text) && /\b\d{1,2}\b/.test(text);
  return {
    dateText: primaryDisplay || String(pointYear),
    year: exact ? lowerYear : null,
    lowerYear,
    upperYear,
    pointYear,
    decade: `${Math.floor(pointYear / 10) * 10}s`,
    confidence: exact && hasMonthDay ? "A" : exact ? "B" : upperYear - lowerYear <= 10 ? "C" : "D",
  };
}

function cuisineTagsFor(text) {
  const tags = [];
  for (const [tag, pattern] of CUISINE_PATTERNS) {
    if (pattern.test(text)) tags.push(tag);
  }
  return [...new Set(tags)].sort();
}

function transportModeFor(text) {
  const normalized = normalizeText(text);
  if (/\b(ship|s s|steamship|cruise|nassau)\b/.test(normalized)) return "ship";
  if (/\b(railroad|train|panama limited)\b/.test(normalized)) return "railroad";
  if (/\b(hotel|inn)\b/.test(normalized)) return "hotel";
  return "restaurant";
}

function placeTextFor(value, subjects) {
  const text = [value, subjects.join(" ")].join(" ");
  const place = cleanValue(value.match(/\(([^)]+)\)/)?.[1] || "");
  if (/alexandria/i.test(place)) return "Alexandria, Louisiana";
  if (/gretna/i.test(place)) return "Gretna, Louisiana";
  if (/henderson/i.test(place)) return "Henderson, Louisiana";
  if (/metairie/i.test(place)) return "Metairie, Louisiana";
  if (/new orleans/i.test(text)) return "New Orleans, Louisiana";
  if (/\bla\.?\b|\blouisiana\b/i.test(text)) return "Louisiana";
  return "";
}

function venueTextFor(value, title) {
  const raw = cleanValue(value) || cleanValue(title).replace(/,\s*(?:menu|breakfast menu|lunch menu|drink list|drink suggestions).*$/i, "");
  return cleanValue(raw.replace(/\s*\([^)]*\)\s*$/g, ""));
}

function confidenceForDate(confidence) {
  if (confidence === "A") return 0.9;
  if (confidence === "B") return 0.78;
  if (confidence === "C") return 0.58;
  if (confidence === "D") return 0.34;
  return 0.18;
}

function dishSegmentsFor(text) {
  const segments = [];
  for (const [label, pattern] of DISH_HINT_PATTERNS) {
    if (pattern.test(text)) segments.push(label);
  }
  return [...new Set(segments)].slice(0, 8);
}

function dishMentionFor(record, rawName, contextText) {
  const normalizedName = normalizedDishName(rawName);
  if (!normalizedName) return null;
  const tags = [...new Set([...ingredientTagsFor(rawName), ...ingredientTagsFor(contextText)])].sort();
  return {
    id: stableId("noladish", [record.menuId, normalizedName]),
    menuId: record.menuId,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    rawName: cleanValue(rawName),
    normalizedName,
    canonicalDishId: `dish:${normalizedName.replace(/\s+/g, "-").slice(0, 96)}`,
    sectionName: "metadata title",
    dishType: dishTypeFor(rawName),
    ingredientTags: tags,
    extractionMethod: "nola_metadata_keyword",
    confidence: 0.46,
    provenance: {
      sourceFile: "enrichment/external-sources/nola_menu_collection.json",
      sourceRecordId: record.sourceRecordId,
      sourceApiUrl: record.sourceApiUrl,
    },
  };
}

function imageFeaturesFor(record, item) {
  const pages = objectPages(item);
  const imageUri = cleanValue(item?.imageUri);
  const iiifInfoUri = absoluteDigitalUrl(item?.iiifInfoUri);
  if (!imageUri && !iiifInfoUri && !pages.length) return [];
  return [
    {
      id: stableId("nolaimage", [record.menuId, imageUri, iiifInfoUri, pages.length]),
      menuId: record.menuId,
      sourceId: SOURCE_ID,
      sourceKey: SOURCE_KEY,
      featureType: "iiif_metadata",
      scalar: {
        pageCount: pages.length || 1,
        hasImageUri: Boolean(imageUri),
        hasIiifInfo: Boolean(iiifInfoUri),
      },
      sourceImageUrl: imageUri,
      iiifInfoUri,
      modelName: "nola_contentdm_metadata",
      confidence: 0.72,
      provenance: {
        sourceFile: "enrichment/external-sources/nola_menu_collection.json",
        sourceRecordId: record.sourceRecordId,
      },
    },
  ];
}

function normalizeItem(item, searchItem = {}) {
  const sourceRecordId = cleanValue(item?.itemId || searchItem.itemId);
  if (!sourceRecordId) return null;
  const title = firstField(item, ["title"]) || cleanValue(item.title || searchItem.title) || "Untitled New Orleans menu";
  const restaurant = firstField(item, ["restau", "restaurant"]);
  const dateText = firstField(item, ["date"]);
  const parsedDate = parseDateRange(dateText, title);
  const subjects = splitTerms(firstField(item, ["subjec", "subject"]));
  const rightsStatement = firstField(item, ["rights"]);
  const contactNote = firstField(item, ["contac", "contact", "image request"]);
  const contextText = [title, restaurant, subjects.join(" ")].join(" ");
  const menuId = `${SOURCE_KEY}:${sourceRecordId}`;
  const pages = objectPages(item);
  const sourceApiUrl = `${DIGITAL_BASE}/api/singleitem/collection/${COLLECTION_ALIAS}/id/${sourceRecordId}`;
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
    workType: cleanValue(item?.contentType || searchItem.filetype || "menu"),
    collectionTitle: COLLECTION_TITLE,
    itemUrl: absoluteDigitalUrl(searchItem.itemLink || `/compoundobject/collection/${COLLECTION_ALIAS}/id/${sourceRecordId}`),
    iiifManifestUrl: "",
    iiifInfoUri: absoluteDigitalUrl(item?.iiifInfoUri),
    imageUri: cleanValue(item?.imageUri),
    thumbnailUrl: absoluteDigitalUrl(item?.thumbnailUri || searchItem.thumbnailUri),
    sourceUrl: absoluteDigitalUrl(searchItem.itemLink || `/compoundobject/collection/${COLLECTION_ALIAS}/id/${sourceRecordId}`),
    sourceApiUrl,
    venueText: venueTextFor(restaurant, title),
    placeText: placeTextFor(restaurant, subjects),
    country: "United States",
    transportMode: transportModeFor(contextText),
    subjects: subjects.slice(0, 16),
    subjectTerms: subjects.slice(0, 16),
    cuisineTags: cuisineTagsFor(contextText),
    formatTags: ["menus"],
    styleTags: [],
    ingredientTags: ingredientTagsFor(contextText),
    descriptionSummary: cleanValue(subjects.join("; ")).slice(0, 420),
    rightsStatement,
    contactNote,
    pageCount: pages.length || 1,
    pageIds: pages.slice(0, 8).map((page) => cleanValue(page.pageptr)).filter(Boolean),
    confidence: confidenceForDate(parsedDate.confidence),
    provenance: {
      sourceFile: "enrichment/external-sources/nola_menu_collection.json",
      sourceRecordId,
      sourceApiUrl,
      rightsNote: rightsStatement || "Derived metadata only; no raw image, OCR, transcript, or IIIF payload copied into static graph artifacts.",
    },
    priceObservations: [],
  };
  const dishMentions = dishSegmentsFor(contextText).map((segment) => dishMentionFor(baseRecord, segment, contextText)).filter(Boolean);
  const ingredientTags = [...new Set([...(baseRecord.ingredientTags || []), ...dishMentions.flatMap((dish) => dish.ingredientTags || [])])].sort();
  return {
    ...baseRecord,
    dishMentions,
    dishHints: dishMentions.map((dish) => ({
      rawName: dish.rawName,
      normalizedName: dish.normalizedName,
      dishType: dish.dishType,
      ingredientTags: dish.ingredientTags,
      confidence: dish.confidence,
    })),
    ingredientTags,
    imageFeatures: imageFeaturesFor(baseRecord, item),
  };
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MenuGraph bounded NOLA metadata connector; derived metadata only",
      },
    });
    if (!response.ok) throw new Error(`NOLA request returned HTTP ${response.status} for ${url}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function countBy(records, getter) {
  const counts = new Map();
  for (const record of records || []) {
    const key = getter(record) || "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

async function buildNolaSource(options = {}) {
  const startedAt = new Date().toISOString();
  const maxRecords = Math.min(100, Math.max(1, options.limit || 100));
  const searchUrl = `${DIGITAL_BASE}/api/search/collection/${COLLECTION_ALIAS}/maxRecords/${maxRecords}`;
  const searchPayload = options.searchPayload || (await fetchJson(searchUrl, options.timeoutMs));
  const searchItems = (searchPayload.items || []).slice(0, options.limit || maxRecords);
  const records = [];
  for (const searchItem of searchItems) {
    const id = cleanValue(searchItem.itemId);
    if (!id) continue;
    const item =
      options.itemsById?.[id] ||
      (await fetchJson(`${DIGITAL_BASE}/api/singleitem/collection/${COLLECTION_ALIAS}/id/${encodeURIComponent(id)}`, options.timeoutMs));
    const record = normalizeItem({ ...item, itemId: id }, searchItem);
    if (record) records.push(record);
  }
  const generatedAt = new Date().toISOString();
  const dishMentions = records.flatMap((record) => record.dishMentions || []);
  const output = {
    version: VERSION,
    generatedAt,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    collectionUrl: `${DIGITAL_BASE}/collection/${COLLECTION_ALIAS}`,
    sourceApiUrl: searchUrl,
    summary: {
      total: records.length,
      totalHits: searchPayload.totalResults ?? null,
      dishMentions: dishMentions.length,
      priceObservations: 0,
      withDates: records.filter((record) => record.lowerYear || record.upperYear || record.year).length,
      withIiif: records.filter((record) => record.imageUri || record.iiifInfoUri).length,
      withVenues: records.filter((record) => record.venueText).length,
      imageFeatures: records.reduce((sum, record) => sum + (record.imageFeatures || []).length, 0),
      transportModes: countBy(records, (record) => record.transportMode),
      dateConfidence: countBy(records, (record) => record.dateConfidence),
      cuisineTags: countBy(records.flatMap((record) => record.cuisineTags.map((tag) => ({ tag }))), (record) => record.tag),
      ingredientTags: countBy(records.flatMap((record) => record.ingredientTags.map((tag) => ({ tag }))), (record) => record.tag),
      startedAt,
      finishedAt: generatedAt,
    },
    records,
  };
  if (!options.dryRun) await writeJson(OUTPUT_PATH, output);
  return output;
}

function optionsFromArgs(args = process.argv.slice(2)) {
  return {
    limit: Math.min(100, Math.max(1, Number(argValue(args, "limit", "100")) || 100)),
    timeoutMs: Math.max(5000, Number(argValue(args, "timeout-ms", "30000")) || 30000),
    dryRun: hasFlag(args, "dry-run"),
  };
}

async function main() {
  const output = await buildNolaSource(optionsFromArgs());
  console.log(
    [
      `Wrote ${output.summary.total.toLocaleString()} NOLA external menu records`,
      `${output.summary.dishMentions.toLocaleString()} metadata dish hints`,
      `${output.summary.imageFeatures.toLocaleString()} image metadata features`,
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
  buildNolaSource,
  cuisineTagsFor,
  dishSegmentsFor,
  normalizeItem,
  optionsFromArgs,
  parseDateRange,
  placeTextFor,
  transportModeFor,
  venueTextFor,
};
