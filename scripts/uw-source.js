const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { normalizePrice } = require("../docs/price-utils");
const { cleanValue, normalizeText } = require("../docs/multisource");
const { dishTypeFor, ingredientTagsFor, normalizedDishName } = require("./local-enrichment");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const OUTPUT_PATH = path.join(DATA_DIR, "enrichment", "external-sources", "uw_menus_collection.json");
const BASE_URL = "https://digitalcollections.lib.washington.edu";
const DIGITAL_BASE = `${BASE_URL}/digital`;
const COLLECTION_ALIAS = "menus";
const SOURCE_ID = "uw_menus_collection";
const SOURCE_KEY = "uw";
const COLLECTION_TITLE = "University of Washington Menus Collection";
const VERSION = 1;

const MONTHS = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const CUISINE_PATTERNS = [
  ["american", /\bamerican\b/i],
  ["asian", /\basian\b|\bchinese\b|\bjapanese\b|\bthai\b|\bvietnamese\b|\bkorean\b/i],
  ["barbecue", /\bbar-?b-?q\b|\bbarbecue\b|\bbbq\b/i],
  ["french", /\bfrench\b|\bcampagne\b/i],
  ["italian", /\bitalian\b|\bpizza\b|\bpasta\b/i],
  ["seafood", /\bseafood\b|\bsalmon\b|\bhalibut\b|\bclam\b|\boyster\b|\bcrab\b|\bfish\b/i],
  ["vegetarian", /\bvegetarian\b|\bcafe flora\b/i],
];

const DISH_HINT_PATTERNS = [
  ["bar menu", /\bbar menu\b/i],
  ["cocktails", /\bcocktails?\b/i],
  ["dinner options", /\bdinner\b/i],
  ["lunch options", /\blunch(?:eon)?\b/i],
  ["breakfast options", /\bbreakfast\b/i],
  ["wine list", /\bwine list\b|\bwines?\b/i],
  ["dessert options", /\bdesserts?\b/i],
  ["seafood options", /\bseafood\b|\bsalmon\b|\bhalibut\b|\bclam\b|\boyster\b|\bcrab\b|\bfish\b/i],
  ["ship dining", /\bsteamship\b|\bsteamer\b|\bship\b|\bcruise\b/i],
  ["hotel dining", /\bhotels?\b/i],
  ["ethnic restaurant menu", /\bethnic restaurants?\b/i],
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

function parseDateRange(value) {
  const text = cleanValue(value).replace(/\?+$/g, "");
  if (!text) return { dateText: "", year: null, lowerYear: null, upperYear: null, pointYear: null, decade: "unknown", confidence: "X" };

  const between = text.match(/\bbetween\s+((?:18|19|20)\d{2})\s+and\s+((?:18|19|20)\d{2})\b/i);
  if (between) {
    const lowerYear = Number(between[1]);
    const upperYear = Number(between[2]);
    const pointYear = Math.round((lowerYear + upperYear) / 2);
    return {
      dateText: text,
      year: null,
      lowerYear,
      upperYear,
      pointYear,
      decade: `${Math.floor(pointYear / 10) * 10}s`,
      confidence: upperYear - lowerYear <= 10 ? "C" : "D",
    };
  }

  const range = text.match(/\b((?:18|19|20)\d{2})\s*[-/]\s*((?:18|19|20)\d{2})\b/);
  if (range) {
    const lowerYear = Number(range[1]);
    const upperYear = Number(range[2]);
    const pointYear = Math.round((lowerYear + upperYear) / 2);
    return {
      dateText: text,
      year: lowerYear === upperYear ? lowerYear : null,
      lowerYear,
      upperYear,
      pointYear,
      decade: `${Math.floor(pointYear / 10) * 10}s`,
      confidence: upperYear - lowerYear <= 10 ? "C" : "D",
    };
  }

  const monthYear = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(?:(\d{1,2}),?\s+)?((?:18|19|20)\d{2})\b/i
  );
  if (monthYear) {
    const year = Number(monthYear[3]);
    return {
      dateText: text,
      year,
      lowerYear: year,
      upperYear: year,
      pointYear: year,
      decade: `${Math.floor(year / 10) * 10}s`,
      confidence: monthYear[2] ? "A" : "B",
    };
  }

  const years = [...text.matchAll(/\b(18|19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  if (!years.length) return { dateText: text, year: null, lowerYear: null, upperYear: null, pointYear: null, decade: "unknown", confidence: "X" };
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
    confidence: lowerYear === upperYear ? "B" : upperYear - lowerYear <= 10 ? "C" : "D",
  };
}

function parsePlace(value) {
  const raw = cleanValue(value);
  if (!raw) return "";
  const parts = raw.split("--").map(cleanValue).filter(Boolean);
  const country = parts[0]?.replace(/\s*\([^)]*\)/g, "") || "";
  const state = parts[1]?.replace(/\s*\([^)]*\)/g, "") || "";
  const city = parts[2]?.replace(/\s*\([^)]*\)/g, "") || "";
  if (/^United States$/i.test(country)) {
    const stateLabel = /^Washington$/i.test(state) ? "Washington" : state;
    return [city, stateLabel, "United States"].filter(Boolean).join(", ");
  }
  return [city, state, country].filter(Boolean).join(", ") || raw.replace(/--/g, ", ");
}

function venueFromSubjects(subjects) {
  return (
    subjects.find(
      (term) =>
        term &&
        !/^menus?$/i.test(term) &&
        !/^restaurants?--/i.test(term) &&
        !/^bars?\s*\(/i.test(term) &&
        !/^ethnic restaurants?--/i.test(term) &&
        !/^hotels?$/i.test(term)
    ) || ""
  );
}

function deriveVenueText({ title, subjects }) {
  const subjectVenue = venueFromSubjects(subjects);
  if (subjectVenue) return subjectVenue.replace(/\s*\([^)]*\)/g, "").replace(/\s*:\s*Seattle,\s*Wash\./i, "").trim();
  return cleanValue(title)
    .replace(/\b(?:cocktail|dinner|lunch|luncheon|breakfast|bar|wine list)\s+menu\b.*$/i, "")
    .replace(/\bmenu\b.*$/i, "")
    .replace(/\bbetween\s+(?:18|19|20)\d{2}\s+and\s+(?:18|19|20)\d{2}\b.*$/i, "")
    .replace(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(?:\d{1,2},?\s+)?(?:18|19|20)\d{2}\b.*$/i, "")
    .replace(/,\s*$/g, "")
    .trim();
}

function transportModeFor(text) {
  const normalized = normalizeText(text);
  if (/\b(steamship|steam ship|steamer|ship|cruise|s s |princess|yukon|inside passage|alaska line)\b/.test(normalized)) return "ship";
  if (/\b(railroad|railway|train|dining car)\b/.test(normalized)) return "railroad";
  if (/\b(airline|airlines|airways|flight)\b/.test(normalized)) return "airline";
  if (/\b(hotel|inn)\b/.test(normalized)) return "hotel";
  if (/\b(bar|cocktail|cafe|restaurant|dinner|lunch|wine list)\b/.test(normalized)) return "restaurant";
  return "restaurant";
}

function cuisineTagsFor(text) {
  const tags = [];
  for (const [tag, pattern] of CUISINE_PATTERNS) {
    if (pattern.test(text)) tags.push(tag);
  }
  return [...new Set(tags)].sort();
}

function styleTagsFor(text) {
  const normalized = normalizeText(text);
  const tags = [];
  if (/\billustrated menus?\b|\betching\b|\bline drawing\b|\bcover image\b/.test(normalized)) tags.push("illustrated menu");
  if (/\bnovelty menus?\b/.test(normalized)) tags.push("novelty menu");
  if (/\bspecial occasions?\b/.test(normalized)) tags.push("special occasion");
  if (/\bdepression era\b/.test(normalized)) tags.push("depression era");
  if (/\bthe fifties\b|\bthe sixties\b|\bthe seventies\b|\bthe eighties\b|\bthe nineties\b/.test(normalized)) tags.push("decade category");
  if (/\bwine list\b/.test(normalized)) tags.push("wine list");
  if (/\bbar menu\b|\bcocktail menu\b/.test(normalized)) tags.push("bar menu");
  return [...new Set(tags)].sort();
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
    id: stableId("uwdish", [record.menuId, normalizedName]),
    menuId: record.menuId,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    rawName: cleanValue(rawName),
    normalizedName,
    canonicalDishId: `dish:${normalizedName.replace(/\s+/g, "-").slice(0, 96)}`,
    sectionName: "metadata description",
    dishType: dishTypeFor(rawName),
    ingredientTags: tags,
    extractionMethod: "uw_metadata_keyword",
    confidence: 0.46,
    provenance: {
      sourceFile: "enrichment/external-sources/uw_menus_collection.json",
      sourceRecordId: record.sourceRecordId,
      sourceApiUrl: record.sourceApiUrl,
    },
  };
}

function priceSegmentsFor(description) {
  const text = cleanValue(description);
  const segments = [];
  const priced = /([^.;:\n]{3,96}?)\s*\((\$[0-9]+(?:\.[0-9]{1,2})?)\)/g;
  let match = priced.exec(text);
  while (match) {
    const rawName = cleanValue(match[1].replace(/^(including|with|and)\s+/i, ""));
    if (rawName && !/reproduction|permission|order/i.test(rawName)) segments.push({ rawName, rawPriceText: match[2] });
    match = priced.exec(text);
  }
  return segments.slice(0, 8);
}

function priceObservationFor(record, segment, references = {}) {
  const amount = Number(cleanValue(segment.rawPriceText).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount)) return null;
  const normalizedName = normalizedDishName(segment.rawName);
  const priceRecord = {
    id: stableId("uwprice", [record.menuId, normalizedName, segment.rawPriceText]),
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
    confidence: "low",
    scale: "external-description-usd",
    dishType: dishTypeFor(segment.rawName),
    ingredientTags: ingredientTagsFor(segment.rawName),
    extractionMethod: "uw_metadata_description_price",
    provenance: {
      sourceFile: "enrichment/external-sources/uw_menus_collection.json",
      sourceRecordId: record.sourceRecordId,
      sourceApiUrl: record.sourceApiUrl,
    },
  };
  priceRecord.normalized = normalizePrice(priceRecord, references);
  return priceRecord;
}

function confidenceForDate(confidence) {
  if (confidence === "A") return 0.9;
  if (confidence === "B") return 0.78;
  if (confidence === "C") return 0.58;
  if (confidence === "D") return 0.34;
  return 0.18;
}

function imageFeaturesFor(record, item) {
  const pages = objectPages(item);
  const imageUri = cleanValue(item?.imageUri);
  const iiifInfoUri = absoluteDigitalUrl(item?.iiifInfoUri);
  if (!imageUri && !iiifInfoUri && !pages.length) return [];
  return [
    {
      id: stableId("uwimage", [record.menuId, imageUri, iiifInfoUri, pages.length]),
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
      modelName: "uw_contentdm_metadata",
      confidence: 0.72,
      provenance: {
        sourceFile: "enrichment/external-sources/uw_menus_collection.json",
        sourceRecordId: record.sourceRecordId,
      },
    },
  ];
}

function normalizeItem(item, searchItem = {}, references = {}) {
  const sourceRecordId = cleanValue(item?.itemId || searchItem.itemId);
  if (!sourceRecordId) return null;
  const title = firstField(item, ["title"]) || cleanValue(item.title || searchItem.title) || "Untitled UW menu";
  const dateText = firstField(item, ["date"]) || title;
  const parsedDate = parseDateRange(dateText);
  const description = firstField(item, ["descri", "notes"]);
  const genreTerms = splitTerms(firstField(item, ["genre", "category"]));
  const subjectTerms = splitTerms(firstField(item, ["subjec", "subjects"]));
  const objectType = firstField(item, ["objeca", "object type"]);
  const physicalDescription = firstField(item, ["object", "physical description"]);
  const collectionNumber = firstField(item, ["order", "digital id number"]);
  const coverage = firstField(item, ["covera", "location"]);
  const placeText = parsePlace(coverage);
  const contextText = [title, dateText, description, genreTerms.join(" "), subjectTerms.join(" "), objectType, physicalDescription].join(" ");
  const menuId = `${SOURCE_KEY}:${sourceRecordId}`;
  const baseRecord = {
    id: menuId,
    menuId,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    sourceRecordId,
    orderNumber: collectionNumber,
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
    venueText: deriveVenueText({ title, subjects: subjectTerms }),
    placeText,
    country: placeText.includes("United States") ? "United States" : "",
    transportMode: transportModeFor(contextText),
    subjects: subjectTerms.slice(0, 16),
    subjectTerms: subjectTerms.slice(0, 16),
    genreTags: genreTerms.map((term) => term.toLowerCase()).slice(0, 10),
    cuisineTags: cuisineTagsFor(contextText),
    styleTags: styleTagsFor(contextText),
    ingredientTags: ingredientTagsFor(contextText),
    descriptionSummary: cleanValue(description).slice(0, 420),
    physicalDescription,
    objectType,
    pageCount: objectPages(item).length || 1,
    pageIds: objectPages(item).slice(0, 8).map((page) => cleanValue(page.pageptr)).filter(Boolean),
    confidence: confidenceForDate(parsedDate.confidence),
    provenance: {
      sourceFile: "enrichment/external-sources/uw_menus_collection.json",
      sourceRecordId,
      sourceApiUrl: `${DIGITAL_BASE}/api/singleitem/collection/${COLLECTION_ALIAS}/id/${sourceRecordId}`,
      rightsNote: "Derived metadata only; no raw image, OCR, transcript, or IIIF payload copied into static graph artifacts.",
    },
  };
  const dishMentions = dishSegmentsFor(contextText).map((segment) => dishMentionFor(baseRecord, segment, contextText)).filter(Boolean);
  const priceObservations = priceSegmentsFor(description).map((segment) => priceObservationFor(baseRecord, segment, references)).filter(Boolean);
  const ingredientTags = [
    ...new Set([
      ...(baseRecord.ingredientTags || []),
      ...dishMentions.flatMap((dish) => dish.ingredientTags || []),
      ...priceObservations.flatMap((price) => price.ingredientTags || []),
    ]),
  ].sort();
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
    priceObservations,
    ingredientTags,
    imageFeatures: imageFeaturesFor(baseRecord, item),
  };
}

async function readJson(relativePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, relativePath), "utf8"));
  } catch (error) {
    return fallback;
  }
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MenuGraph bounded UW metadata connector; derived metadata only",
      },
    });
    if (!response.ok) throw new Error(`UW request returned HTTP ${response.status} for ${url}`);
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

async function buildUwSource(options = {}) {
  const startedAt = new Date().toISOString();
  const maxRecords = Math.min(500, Math.max(1, options.limit || 300));
  const searchUrl = `${DIGITAL_BASE}/api/search/collection/${COLLECTION_ALIAS}/field/all/maxRecords/${maxRecords}`;
  const [cpiUs, cpiCountry] = await Promise.all([readJson("reference/cpi-us.json", {}), readJson("reference/cpi-country.json", {})]);
  const references = { cpiUs, cpiCountry };
  const searchPayload = options.searchPayload || (await fetchJson(searchUrl, options.timeoutMs));
  const searchItems = (searchPayload.items || []).slice(0, options.limit || maxRecords);
  const records = [];
  for (const searchItem of searchItems) {
    const id = cleanValue(searchItem.itemId);
    if (!id) continue;
    const item =
      options.itemsById?.[id] ||
      (await fetchJson(`${DIGITAL_BASE}/api/singleitem/collection/${COLLECTION_ALIAS}/id/${encodeURIComponent(id)}`, options.timeoutMs));
    const record = normalizeItem({ ...item, itemId: id }, searchItem, references);
    if (record) records.push(record);
  }
  const generatedAt = new Date().toISOString();
  const dishMentions = records.flatMap((record) => record.dishMentions || []);
  const priceObservations = records.flatMap((record) => record.priceObservations || []);
  const output = {
    version: VERSION,
    generatedAt,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    collectionUrl: "https://digitalcollections.lib.washington.edu/digital/collection/menus",
    sourceApiUrl: searchUrl,
    summary: {
      total: records.length,
      totalHits: searchPayload.totalResults ?? null,
      dishMentions: dishMentions.length,
      priceObservations: priceObservations.length,
      withDates: records.filter((record) => record.lowerYear || record.upperYear || record.year).length,
      withIiif: records.filter((record) => record.imageUri || record.iiifInfoUri).length,
      withVenues: records.filter((record) => record.venueText).length,
      withPlaces: records.filter((record) => record.placeText).length,
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
    limit: Math.min(500, Math.max(1, Number(argValue(args, "limit", "300")) || 300)),
    timeoutMs: Math.max(5000, Number(argValue(args, "timeout-ms", "30000")) || 30000),
    dryRun: hasFlag(args, "dry-run"),
  };
}

async function main() {
  const output = await buildUwSource(optionsFromArgs());
  console.log(
    [
      `Wrote ${output.summary.total.toLocaleString()} UW external menu records`,
      `${output.summary.dishMentions.toLocaleString()} metadata dish hints`,
      `${output.summary.priceObservations.toLocaleString()} metadata price observations`,
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
  buildUwSource,
  cuisineTagsFor,
  dishSegmentsFor,
  normalizeItem,
  optionsFromArgs,
  parseDateRange,
  parsePlace,
  styleTagsFor,
  transportModeFor,
};
