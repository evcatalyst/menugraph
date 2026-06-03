const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { cleanValue, normalizeText } = require("../docs/multisource");
const { dishTypeFor, ingredientTagsFor, normalizedDishName } = require("./local-enrichment");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const OUTPUT_PATH = path.join(DATA_DIR, "enrichment", "external-sources", "lapl_menu_collection.json");
const BASE_URL = "https://tessa2.lapl.org";
const DIGITAL_BASE = `${BASE_URL}/digital`;
const COLLECTION_ALIAS = "menus";
const SOURCE_ID = "lapl_menu_collection";
const SOURCE_KEY = "lapl";
const COLLECTION_TITLE = "Los Angeles Public Library Menu Collection";
const VERSION = 1;

const STATE_ALIASES = {
  "calif": "California",
  "ill": "Illinois",
  "mass": "Massachusetts",
  "nev": "Nevada",
  "ny": "New York",
  "n.y": "New York",
  "pa": "Pennsylvania",
};

const CUISINE_PATTERNS = [
  ["american", /\bcooking,\s*american\b|\bamerican cooking\b/i],
  ["asian american", /\basian american cooking\b/i],
  ["chinese", /\bcooking,\s*chinese\b|\bchinese\b/i],
  ["ethiopian", /\bethiopian\b/i],
  ["french", /\bfrench\b/i],
  ["italian", /\bitalian\b|ristorante/i],
  ["japanese", /\bjapanese\b|sushi|teriyaki|teppan/i],
  ["mexican", /\bmexican\b/i],
  ["seafood", /\bseafood\b|\bfish\b|\blobster\b|\boyster\b/i],
];

const DISH_HINT_PATTERNS = [
  ["alcoholic drinks", /\balcoholic drinks?\b|\bcocktails?\b|\bbar\b|\blounge\b/i],
  ["breakfast options", /\bbreakfast\b/i],
  ["dessert options", /\bdesserts?\b|\bpastr(?:y|ies)\b|\bbakery\b/i],
  ["dinner options", /\bdinners?\b/i],
  ["fish and seafood options", /\bseafood\b|\bfish\b|\blobster\b|\boysters?\b|\bclams?\b|\bsole\b|\bsalmon\b|\bshrimp\b/i],
  ["lunch options", /\blunch(?:eon|es)?\b/i],
  ["pasta", /\bpastas?\b|\bspaghetti\b|\bravioli\b/i],
  ["pizza", /\bpizzas?\b|\bpizzeria\b/i],
  ["sandwiches", /\bsandwich(?:es)?\b|\bdelicatessen\b|\bdeli\b/i],
  ["steak", /\bsteaks?\b|\bsteakhouse\b/i],
  ["sushi", /\bsushi\b/i],
  ["wine list", /\bwine list\b|\bwines?\b/i],
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

function absoluteDigitalUrl(value) {
  const raw = cleanValue(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/api") || raw.startsWith("/compoundobject") || raw.startsWith("/singleitem")) return `${DIGITAL_BASE}${raw}`;
  if (raw.startsWith("/iiif")) return `${BASE_URL}${raw}`;
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

function normalizePlace(value) {
  const raw = cleanValue(value).replace(/\s+/g, " ").replace(/\.+$/g, "");
  if (!raw) return "";
  const match = raw.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (!match) return raw;
  const city = cleanValue(match[1]).replace(/\s*,\s*$/, "");
  const stateKey = cleanValue(match[2]).replace(/\.+$/g, "").toLowerCase();
  const state = STATE_ALIASES[stateKey] || STATE_ALIASES[stateKey.replace(/\./g, "")] || cleanValue(match[2]).replace(/\.+$/g, "");
  return [city, state].filter(Boolean).join(", ");
}

function parseDateRange(value) {
  const text = cleanValue(value);
  if (!text) return { dateText: "", year: null, lowerYear: null, upperYear: null, pointYear: null, decade: "unknown", confidence: "X" };

  const post = text.match(/\bpost[-\s]*(\d{4})\b/i);
  if (post) {
    const year = Number(post[1]);
    return { dateText: text, year: null, lowerYear: year, upperYear: null, pointYear: year, decade: `${Math.floor(year / 10) * 10}s`, confidence: "C" };
  }

  const pre = text.match(/\bpre[-\s]*(\d{4})\b/i);
  if (pre) {
    const year = Number(pre[1]);
    return { dateText: text, year: null, lowerYear: null, upperYear: year, pointYear: year, decade: `${Math.floor(year / 10) * 10}s`, confidence: "C" };
  }

  const circa = /\bcirca\b|\bca\.\b|\bc\.\b/i.test(text);
  const years = [...text.matchAll(/\b(18|19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  if (!years.length) return { dateText: text, year: null, lowerYear: null, upperYear: null, pointYear: null, decade: "unknown", confidence: "X" };

  if (circa && years.length === 1) {
    const year = years[0];
    return {
      dateText: text,
      year: null,
      lowerYear: year - 5,
      upperYear: year + 5,
      pointYear: year,
      decade: `${Math.floor(year / 10) * 10}s`,
      confidence: "C",
    };
  }

  const lowerYear = Math.min(...years);
  const upperYear = Math.max(...years);
  const pointYear = lowerYear === upperYear ? lowerYear : Math.round((lowerYear + upperYear) / 2);
  return {
    dateText: text,
    year: lowerYear === upperYear ? lowerYear : null,
    lowerYear,
    upperYear,
    pointYear,
    decade: `${Math.floor(pointYear / 10) * 10}s`,
    confidence: lowerYear === upperYear ? "B" : upperYear - lowerYear <= 20 ? "C" : "D",
  };
}

function transportModeFor(text) {
  const normalized = normalizeText(text);
  if (/\b(airline|airlines|airport|flight)\b/.test(normalized)) return "airline";
  if (/\b(cruise|princess cruises|ship|steamship|ocean liner)\b/.test(normalized)) return "ship";
  if (/\b(railroad|railway|union pacific|dining car)\b/.test(normalized)) return "railroad";
  if (/\b(hotel|inn|marriott|flamingo|caesars palace|stardust)\b/.test(normalized)) return "hotel";
  if (/\b(restaurant|cafe|grill|cantina|ristorante|sushi|teriyaki|dhaba|lounge)\b/.test(normalized)) return "restaurant";
  return "restaurant";
}

function cuisineTagsFor(text) {
  const tags = [];
  for (const [tag, pattern] of CUISINE_PATTERNS) {
    if (pattern.test(text)) tags.push(tag);
  }
  return [...new Set(tags)].sort();
}

function styleTagsFor({ title, format, physicalDescription, notes }) {
  const text = normalizeText([title, format, physicalDescription, notes].join(" "));
  const tags = [];
  if (/\bminiature\b/.test(text)) tags.push("miniature menu");
  if (/\bsouvenir\b/.test(text)) tags.push("souvenir menu");
  if (/\bwine list\b/.test(text)) tags.push("wine list");
  if (/\bproofs?\b|\bprinting\b/.test(text)) tags.push("printing proof");
  if (/\bspiral bound\b/.test(text)) tags.push("spiral bound");
  if (/\blaminated\b/.test(text)) tags.push("laminated");
  if (/\bplacemat\b/.test(text)) tags.push("placemat");
  return [...new Set(tags)].sort();
}

function objectPages(item) {
  const pages = item?.objectInfo?.page;
  if (Array.isArray(pages)) return pages;
  if (pages && typeof pages === "object") return [pages];
  return [];
}

function confidenceForDate(dateConfidence) {
  if (dateConfidence === "A") return 0.9;
  if (dateConfidence === "B") return 0.78;
  if (dateConfidence === "C") return 0.58;
  if (dateConfidence === "D") return 0.34;
  return 0.18;
}

function imageFeaturesFor(record, item) {
  const pageCount = objectPages(item).length;
  const imageUri = cleanValue(item?.imageUri);
  const iiifInfoUri = absoluteDigitalUrl(item?.iiifInfoUri);
  if (!imageUri && !iiifInfoUri && !pageCount) return [];
  return [
    {
      id: stableId("laplimage", [record.menuId, imageUri, iiifInfoUri, pageCount]),
      menuId: record.menuId,
      sourceId: SOURCE_ID,
      sourceKey: SOURCE_KEY,
      featureType: "iiif_metadata",
      scalar: {
        pageCount: pageCount || 1,
        hasImageUri: Boolean(imageUri),
        hasIiifInfo: Boolean(iiifInfoUri),
      },
      sourceImageUrl: imageUri,
      iiifInfoUri,
      modelName: "lapl_contentdm_metadata",
      confidence: 0.72,
      provenance: {
        sourceFile: "enrichment/external-sources/lapl_menu_collection.json",
        sourceRecordId: record.sourceRecordId,
      },
    },
  ];
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
    id: stableId("lapldish", [record.menuId, normalizedName]),
    menuId: record.menuId,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    rawName: cleanValue(rawName),
    normalizedName,
    canonicalDishId: `dish:${normalizedName.replace(/\s+/g, "-").slice(0, 96)}`,
    sectionName: "metadata description",
    dishType: dishTypeFor(rawName),
    ingredientTags: tags,
    extractionMethod: "lapl_metadata_keyword",
    confidence: 0.46,
    provenance: {
      sourceFile: "enrichment/external-sources/lapl_menu_collection.json",
      sourceRecordId: record.sourceRecordId,
      sourceApiUrl: record.sourceApiUrl,
    },
  };
}

function normalizeItem(item, searchItem = {}) {
  const sourceRecordId = cleanValue(item?.itemId || searchItem.itemId || item?.item_id);
  if (!sourceRecordId) return null;
  const title = firstField(item, ["title", "name"]) || cleanValue(item.title || searchItem.title) || "Untitled LAPL menu";
  const dateText = firstField(item, ["date"]) || firstField(searchItem, ["date"]);
  const parsedDate = parseDateRange(dateText);
  const subjectTerms = splitTerms(firstField(item, ["subjec", "subject"]));
  const formatTerms = splitTerms(firstField(item, ["format"]));
  const physicalDescription = firstField(item, ["source", "physical description"]);
  const address = firstField(item, ["covera", "street address"]);
  const city = normalizePlace(firstField(item, ["city"]));
  const notes = firstField(item, ["notes"]);
  const rightsStatement = firstField(item, ["rights"]);
  const printCompany = firstField(item, ["publis", "printing company"]);
  const orderNumber = firstField(item, ["record", "order number"]);
  const contextText = [title, subjectTerms.join(" "), formatTerms.join(" "), physicalDescription, notes].join(" ");
  const menuId = `${SOURCE_KEY}:${sourceRecordId}`;
  const pages = objectPages(item);
  const baseRecord = {
    id: menuId,
    menuId,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    sourceRecordId,
    orderNumber,
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
    itemUrl: absoluteDigitalUrl(searchItem.itemLink || `/collection/${COLLECTION_ALIAS}/id/${sourceRecordId}`),
    iiifManifestUrl: "",
    iiifInfoUri: absoluteDigitalUrl(item?.iiifInfoUri),
    imageUri: cleanValue(item?.imageUri),
    thumbnailUrl: absoluteDigitalUrl(item?.thumbnailUri || searchItem.thumbnailUri),
    sourceUrl: absoluteDigitalUrl(searchItem.itemLink || `/collection/${COLLECTION_ALIAS}/id/${sourceRecordId}`),
    sourceApiUrl: `${DIGITAL_BASE}/api/singleitem/collection/${COLLECTION_ALIAS}/id/${sourceRecordId}`,
    venueText: title,
    placeText: city,
    address,
    phoneText: cleanValue((notes.match(/\bphone:\s*([^;]+)/i) || [])[1]),
    country: city ? "United States" : "",
    transportMode: transportModeFor(contextText),
    subjects: subjectTerms.slice(0, 16),
    subjectTerms: subjectTerms.slice(0, 16),
    cuisineTags: cuisineTagsFor(contextText),
    formatTags: formatTerms.map((term) => term.toLowerCase()).slice(0, 8),
    styleTags: styleTagsFor({ title, format: formatTerms.join("; "), physicalDescription, notes }),
    ingredientTags: ingredientTagsFor(contextText),
    physicalDescription,
    printCompany,
    notes: cleanValue(notes).slice(0, 220),
    descriptionSummary: cleanValue([subjectTerms.join("; "), physicalDescription, notes].filter(Boolean).join(" | ")).slice(0, 420),
    rightsStatement,
    pageCount: pages.length || (item?.objectInfo?.message ? 1 : null),
    pageIds: pages.slice(0, 8).map((page) => cleanValue(page.pageptr)).filter(Boolean),
    confidence: confidenceForDate(parsedDate.confidence),
    provenance: {
      sourceFile: "enrichment/external-sources/lapl_menu_collection.json",
      sourceRecordId,
      sourceApiUrl: `${DIGITAL_BASE}/api/singleitem/collection/${COLLECTION_ALIAS}/id/${sourceRecordId}`,
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
        "User-Agent": "MenuGraph bounded LAPL metadata connector; derived metadata only",
      },
    });
    if (!response.ok) throw new Error(`LAPL request returned HTTP ${response.status} for ${url}`);
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

async function buildLaplSource(options = {}) {
  const startedAt = new Date().toISOString();
  const maxRecords = Math.min(500, Math.max(1, options.limit));
  const searchUrl = `${DIGITAL_BASE}/api/search/collection/${COLLECTION_ALIAS}/field/all/maxRecords/${maxRecords}`;
  const searchPayload = options.searchPayload || (await fetchJson(searchUrl, options.timeoutMs));
  const searchItems = (searchPayload.items || []).slice(0, options.limit);
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
    collectionUrl: "https://tessa.lapl.org/c10",
    sourceApiUrl: searchUrl,
    summary: {
      total: records.length,
      totalHits: searchPayload.totalResults ?? null,
      dishMentions: dishMentions.length,
      priceObservations: 0,
      withDates: records.filter((record) => record.lowerYear || record.upperYear || record.year).length,
      withIiif: records.filter((record) => record.imageUri || record.iiifInfoUri).length,
      withVenues: records.filter((record) => record.venueText).length,
      withAddress: records.filter((record) => record.address).length,
      withPhone: records.filter((record) => record.phoneText).length,
      withDishHints: records.filter((record) => record.dishHints.length).length,
      imageFeatures: records.reduce((sum, record) => sum + (record.imageFeatures || []).length, 0),
      transportModes: countBy(records, (record) => record.transportMode),
      dateConfidence: countBy(records, (record) => record.dateConfidence),
      cuisineTags: countBy(records.flatMap((record) => record.cuisineTags.map((tag) => ({ tag }))), (record) => record.tag),
      styleTags: countBy(records.flatMap((record) => record.styleTags.map((tag) => ({ tag }))), (record) => record.tag),
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
    limit: Math.min(500, Math.max(1, Number(argValue(args, "limit", "100")) || 100)),
    timeoutMs: Math.max(5000, Number(argValue(args, "timeout-ms", "30000")) || 30000),
    dryRun: hasFlag(args, "dry-run"),
  };
}

async function main() {
  const output = await buildLaplSource(optionsFromArgs());
  console.log(
    [
      `Wrote ${output.summary.total.toLocaleString()} LAPL external menu records`,
      `${output.summary.withDates.toLocaleString()} dated records`,
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
  buildLaplSource,
  cuisineTagsFor,
  dishSegmentsFor,
  normalizeItem,
  normalizePlace,
  optionsFromArgs,
  parseDateRange,
  styleTagsFor,
  transportModeFor,
};
