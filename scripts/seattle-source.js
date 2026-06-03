const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { normalizePrice } = require("../docs/price-utils");
const { cleanValue, normalizeText } = require("../docs/multisource");
const { dishTypeFor, ingredientTagsFor, normalizedDishName } = require("./local-enrichment");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const OUTPUT_PATH = path.join(DATA_DIR, "enrichment", "external-sources", "seattle_room_menu_collection.json");
const BASE_URL = "https://spl.contentdm.oclc.org";
const DIGITAL_BASE = `${BASE_URL}/digital`;
const COLLECTION_ALIAS = "p16118coll5";
const SOURCE_ID = "seattle_room_menu_collection";
const SOURCE_KEY = "seattle";
const COLLECTION_TITLE = "Seattle Room Menu Collection";
const VERSION = 1;

const CUISINE_PATTERNS = [
  ["american", /\bamerican\b|\bburger\b|\bdiner\b/i],
  ["cajun", /\bcajun\b/i],
  ["cafe", /\bcafe\b|\bcoffee shop\b|\bespresso\b/i],
  ["chinese", /\bchinese\b|\bcantonese\b|\bszechuan\b/i],
  ["continental", /\bcontinental\b/i],
  ["creole", /\bcreole\b/i],
  ["deli", /\bdeli\b|\bdelicatessen\b/i],
  ["french", /\bfrench\b|\bbistro\b|\ble gourmand\b/i],
  ["italian", /\bitalian\b|\bpizza\b|\bpizzeria\b|\bspaghetti\b|\btuscan\b/i],
  ["japanese", /\bjapanese\b|\bsushi\b/i],
  ["mexican", /\bmexican\b|\btaco\b/i],
  ["seafood", /\bseafood\b|\bivar'?s\b|\bsalmon\b|\bhalibut\b|\boyster\b|\bclam\b|\bcrab\b|\bfish\b/i],
  ["steakhouse", /\bsteakhouse\b|\bsteaks?\b/i],
];

const DISH_HINT_PATTERNS = [
  ["bar menu", /\bbar menu\b|\bcocktails?\b|\blounge\b/i],
  ["breakfast options", /\bbreakfast\b/i],
  ["burger options", /\bburgers?\b|\bminiburgers?\b/i],
  ["cheese menu", /\bcheese menu\b/i],
  ["coffee shop options", /\bcoffee shop\b|\bespresso\b/i],
  ["deli options", /\bdeli\b|\bdelicatessen\b/i],
  ["dessert options", /\bdesserts?\b|\bpastry\b/i],
  ["dinner options", /\bdinner\b/i],
  ["fish and seafood options", /\bseafood\b|\bivar'?s\b|\bsalmon\b|\bhalibut\b|\boyster\b|\bclam\b|\bcrab\b|\bfish\b/i],
  ["lunch options", /\blunch(?:eon)?\b/i],
  ["pizza", /\bpizza\b|\bpizzeria\b/i],
  ["spaghetti", /\bspaghetti\b/i],
  ["steak", /\bsteaks?\b|\bsteakhouse\b/i],
  ["tasting menu", /\btasting menu\b/i],
  ["thanksgiving dinner", /\bthanksgiving\b/i],
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
  const pages = item?.objectInfo?.page || item?.objectInfo?.node?.page;
  if (Array.isArray(pages)) return pages;
  if (pages && typeof pages === "object") return [pages];
  return [];
}

function parseDateRange(value, title = "") {
  const text = [value, cleanValue(value) ? "" : title].map(cleanValue).filter(Boolean).join(" ");
  const displayText = cleanValue(value);
  if (!text) return { dateText: "", year: null, lowerYear: null, upperYear: null, pointYear: null, decade: "unknown", confidence: "X" };

  const isoDate = text.match(/\b((?:18|19|20)\d{2})-(\d{2})-(\d{2})\b/);
  if (isoDate) {
    const year = Number(isoDate[1]);
    return { dateText: displayText || isoDate[0], year, lowerYear: year, upperYear: year, pointYear: year, decade: `${Math.floor(year / 10) * 10}s`, confidence: "A" };
  }

  const isoMonth = text.match(/\b((?:18|19|20)\d{2})-(\d{2})\b/);
  if (isoMonth) {
    const year = Number(isoMonth[1]);
    return { dateText: displayText || isoMonth[0], year, lowerYear: year, upperYear: year, pointYear: year, decade: `${Math.floor(year / 10) * 10}s`, confidence: "B" };
  }

  const decade = text.match(/\b((?:18|19|20)\d)u\b/i);
  if (decade) {
    const lowerYear = Number(decade[1]) * 10;
    const upperYear = lowerYear + 9;
    return {
      dateText: displayText || `${lowerYear}s`,
      year: null,
      lowerYear,
      upperYear,
      pointYear: lowerYear + 5,
      decade: `${lowerYear}s`,
      confidence: "C",
    };
  }

  const yearMatches = [...text.matchAll(/\b(18|19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  if (!yearMatches.length) return { dateText: displayText, year: null, lowerYear: null, upperYear: null, pointYear: null, decade: "unknown", confidence: "X" };
  const lowerYear = Math.min(...yearMatches);
  const upperYear = Math.max(...yearMatches);
  const pointYear = Math.round((lowerYear + upperYear) / 2);
  return {
    dateText: displayText || String(pointYear),
    year: lowerYear === upperYear ? lowerYear : null,
    lowerYear,
    upperYear,
    pointYear,
    decade: `${Math.floor(pointYear / 10) * 10}s`,
    confidence: lowerYear === upperYear ? "B" : upperYear - lowerYear <= 10 ? "C" : "D",
  };
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
  if (/\bdouble sided\b|\bdouble-sided\b/.test(normalized)) tags.push("double-sided");
  if (/\btasting menu\b/.test(normalized)) tags.push("tasting menu");
  if (/\bthanksgiving\b/.test(normalized)) tags.push("holiday menu");
  if (/\bmenu design\b/.test(normalized)) tags.push("menu design");
  return [...new Set(tags)].sort();
}

function transportModeFor(text) {
  const normalized = normalizeText(text);
  if (/\b(ship|steamship|cruise)\b/.test(normalized)) return "ship";
  if (/\b(train|railroad)\b/.test(normalized)) return "railroad";
  if (/\b(hotel|inn|hyatt house)\b/.test(normalized)) return "hotel";
  return "restaurant";
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
    id: stableId("seattledish", [record.menuId, normalizedName]),
    menuId: record.menuId,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    rawName: cleanValue(rawName),
    normalizedName,
    canonicalDishId: `dish:${normalizedName.replace(/\s+/g, "-").slice(0, 96)}`,
    sectionName: "metadata description",
    dishType: dishTypeFor(rawName),
    ingredientTags: tags,
    extractionMethod: "seattle_metadata_keyword",
    confidence: 0.48,
    provenance: {
      sourceFile: "enrichment/external-sources/seattle_room_menu_collection.json",
      sourceRecordId: record.sourceRecordId,
      sourceApiUrl: record.sourceApiUrl,
    },
  };
}

function priceSegmentsFor(description, title) {
  const text = cleanValue(description);
  const name = /\bthanksgiving\b/i.test(`${title} ${description}`) ? "Thanksgiving dinner price range" : "menu price range";
  const segments = [];
  const range = /\bprices?\s+(?:listed\s+)?(?:from|range(?:d)?\s+from)\s+(\$[0-9]+(?:\.[0-9]{1,2})?)\s*(?:-|to|–)\s*(\$[0-9]+(?:\.[0-9]{1,2})?)/gi;
  let match = range.exec(text);
  while (match) {
    segments.push({ rawName: `${name} low`, rawPriceText: match[1] });
    segments.push({ rawName: `${name} high`, rawPriceText: match[2] });
    match = range.exec(text);
  }
  return segments.slice(0, 6);
}

function priceObservationFor(record, segment, references = {}) {
  const amount = Number(cleanValue(segment.rawPriceText).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount)) return null;
  const normalizedName = normalizedDishName(segment.rawName);
  const priceRecord = {
    id: stableId("seattleprice", [record.menuId, normalizedName, segment.rawPriceText]),
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
    extractionMethod: "seattle_metadata_description_price",
    provenance: {
      sourceFile: "enrichment/external-sources/seattle_room_menu_collection.json",
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
      id: stableId("seattleimage", [record.menuId, imageUri, iiifInfoUri, pages.length]),
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
      modelName: "seattle_contentdm_metadata",
      confidence: 0.72,
      provenance: {
        sourceFile: "enrichment/external-sources/seattle_room_menu_collection.json",
        sourceRecordId: record.sourceRecordId,
      },
    },
  ];
}

function normalizeItem(item, searchItem = {}, references = {}) {
  const sourceRecordId = cleanValue(item?.itemId || searchItem.itemId);
  if (!sourceRecordId) return null;
  const title = firstField(item, ["title"]) || cleanValue(item.title || searchItem.title) || "Untitled Seattle menu";
  const identifier = firstField(item, ["identi", "identifier"]);
  const restaurant = firstField(item, ["restau", "restaurant name"]) || title.replace(/\s+menu\b.*$/i, "");
  const description = firstField(item, ["descri", "description"]);
  const cuisine = firstField(item, ["cuisin", "cuisine"]);
  const dateText = firstField(item, ["date"]);
  const decadeText = firstField(item, ["decade"]);
  const parsedDate = parseDateRange(dateText || decadeText, title);
  const subjectTerms = splitTerms(firstField(item, ["subjec", "subject"]));
  const neighborhoods = splitTerms(firstField(item, ["neighb", "neighborhood"]));
  const address = firstField(item, ["addres", "address"]);
  const notes = firstField(item, ["notes"]);
  const rightsStatement = firstField(item, ["rights"]);
  const format = firstField(item, ["format"]);
  const contextText = [title, restaurant, description, cuisine, subjectTerms.join(" "), neighborhoods.join(" "), notes].join(" ");
  const menuId = `${SOURCE_KEY}:${sourceRecordId}`;
  const sourceApiUrl = `${DIGITAL_BASE}/api/singleitem/collection/${COLLECTION_ALIAS}/id/${sourceRecordId}`;
  const baseRecord = {
    id: menuId,
    menuId,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    sourceRecordId,
    orderNumber: identifier,
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
    venueText: restaurant,
    placeText: ["Seattle", "Washington", ...neighborhoods].filter(Boolean).join(", "),
    address,
    country: "United States",
    transportMode: transportModeFor(contextText),
    subjects: subjectTerms.slice(0, 16),
    subjectTerms: subjectTerms.slice(0, 16),
    neighborhoodTags: neighborhoods.slice(0, 10),
    cuisineTags: cuisineTagsFor([cuisine, contextText].join(" ")),
    formatTags: [format].filter(Boolean).map((term) => term.toLowerCase()).slice(0, 8),
    styleTags: styleTagsFor(contextText),
    ingredientTags: ingredientTagsFor(contextText),
    descriptionSummary: cleanValue(description).slice(0, 420),
    notes: cleanValue(notes).slice(0, 240),
    rightsStatement,
    pageCount: objectPages(item).length || 1,
    pageIds: objectPages(item).slice(0, 8).map((page) => cleanValue(page.pageptr)).filter(Boolean),
    confidence: confidenceForDate(parsedDate.confidence),
    provenance: {
      sourceFile: "enrichment/external-sources/seattle_room_menu_collection.json",
      sourceRecordId,
      sourceApiUrl,
      rightsNote: rightsStatement || "Derived metadata only; no raw image, OCR, transcript, or IIIF payload copied into static graph artifacts.",
    },
  };
  const dishMentions = dishSegmentsFor(contextText).map((segment) => dishMentionFor(baseRecord, segment, contextText)).filter(Boolean);
  const priceObservations = priceSegmentsFor(description, title).map((segment) => priceObservationFor(baseRecord, segment, references)).filter(Boolean);
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

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MenuGraph bounded Seattle metadata connector; derived metadata only",
      },
    });
    if (!response.ok) throw new Error(`Seattle request returned HTTP ${response.status} for ${url}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
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

function countBy(records, getter) {
  const counts = new Map();
  for (const record of records || []) {
    const key = getter(record) || "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

async function buildSeattleSource(options = {}) {
  const startedAt = new Date().toISOString();
  const maxRecords = Math.min(603, Math.max(1, options.limit || 300));
  const searchUrl = `${DIGITAL_BASE}/api/search/collection/${COLLECTION_ALIAS}/field/all/searchterm/menu/maxRecords/${maxRecords}`;
  const searchPayload = options.searchPayload || (await fetchJson(searchUrl, options.timeoutMs));
  const searchItems = (searchPayload.items || []).slice(0, options.limit || maxRecords);
  const references = options.references || {
    cpi: await readJson("reference/cpi-us.json", []),
    fx: await readJson("reference/fx.json", {}),
    cpiCountry: await readJson("reference/cpi-country.json", {}),
  };
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
    collectionUrl: `${DIGITAL_BASE}/collection/${COLLECTION_ALIAS}`,
    sourceApiUrl: searchUrl,
    summary: {
      total: records.length,
      totalHits: searchPayload.totalResults ?? null,
      dishMentions: dishMentions.length,
      priceObservations: priceObservations.length,
      withDates: records.filter((record) => record.lowerYear || record.upperYear || record.year).length,
      withIiif: records.filter((record) => record.imageUri || record.iiifInfoUri).length,
      withVenues: records.filter((record) => record.venueText).length,
      withAddress: records.filter((record) => record.address).length,
      withDishHints: records.filter((record) => (record.dishHints || []).length).length,
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
    limit: Math.min(603, Math.max(1, Number(argValue(args, "limit", "300")) || 300)),
    timeoutMs: Math.max(5000, Number(argValue(args, "timeout-ms", "30000")) || 30000),
    dryRun: hasFlag(args, "dry-run"),
  };
}

async function main() {
  const output = await buildSeattleSource(optionsFromArgs());
  console.log(
    [
      `Wrote ${output.summary.total.toLocaleString()} Seattle external menu records`,
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
  buildSeattleSource,
  cuisineTagsFor,
  dishSegmentsFor,
  normalizeItem,
  optionsFromArgs,
  parseDateRange,
  priceSegmentsFor,
  styleTagsFor,
  transportModeFor,
};
