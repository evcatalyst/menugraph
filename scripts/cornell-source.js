const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { cleanValue, normalizeText } = require("../docs/multisource");
const { extractPricesFromText, normalizePrice, contextForEntry } = require("../docs/price-utils");
const { dishTypeFor, ingredientTagsFor, normalizedDishName } = require("./local-enrichment");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const OUTPUT_PATH = path.join(DATA_DIR, "enrichment", "external-sources", "cornell_nestle_menu_collection.json");
const SOURCE_URL = "https://rmc.library.cornell.edu/EAD/htmldocs/RMM06452.html";
const SOURCE_ID = "cornell_nestle_menu_collection";
const SOURCE_KEY = "cornell";
const COLLECTION_TITLE = "Cornell Nestle/SHA Menu Collection";
const VERSION = 1;

const DISH_HINT_PATTERNS = [
  ["airline menu", /\bairlines?\b|\bsabena\b|\bpan am\b|\btwa\b/i],
  ["banquet dinner", /\bbanquet\b|\bannual dinner\b|\binstallation dinner\b/i],
  ["breakfast options", /\bbreakfast\b/i],
  ["coffee and tea service", /\bcoffee\b|\btea\b/i],
  ["dinner options", /\bdinner\b|\bbill of fare\b/i],
  ["hotel dining", /\bhotel\b|\binn\b|\bmetropole\b|\bsheraton\b|\bst\. regis\b/i],
  ["luncheon options", /\blunch(?:eon)?\b/i],
  ["railroad dining", /\brailroad\b|\brailway\b|\bpullman\b|\bdining car\b/i],
  ["ship dining", /\bsteamship\b|\bship\b|\bcruise\b|\bhurtigruten\b/i],
  ["wine list", /\bwine list\b|\bplats du jour\b/i],
];

const TITLE_FOOD_PATTERNS = [
  ["wine list", /\b(?:carte des vins|wine list|wine menu|wine selection|wine vaults?)\b/i, ["wine"]],
  ["plats du jour", /\bplats du jour\b/i, []],
  ["coffee service", /\b(?:cafe|café|coffee shop|coffee house)\b/i, ["coffee"]],
  ["tea service", /\b(?:tea room|afternoon tea)\b/i, ["tea"]],
  ["brunch menu", /\bbrunch\b/i, []],
  ["supper menu", /\bsupper\b/i, []],
  ["dessert menu", /\b(?:dessert|ice cream|pasticceria)\b/i, ["cream"]],
  ["tempura", /\btempura\b/i, []],
  ["sukiyaki", /\bsukiyaki\b/i, ["beef"]],
  ["oyster bar", /\boyster\b/i, ["oyster"]],
  ["lobster house", /\blobster\b/i, ["lobster"]],
  ["steak house", /\bsteak\b/i, ["beef"]],
  ["roast beef", /\broast beef\b/i, ["beef"]],
  ["fish and chips", /\bfish\s*(?:&|and)\s*chips\b/i, ["fish", "potato"]],
  ["crab restaurant", /\bcrab\b/i, ["crab"]],
  ["apple pie bakery", /\bapple pie\b/i, ["apple"]],
  ["bagel deli", /\bbagel\b/i, ["bread"]],
  ["kosher breakfast", /\bkosher\b.*\bbreakfast\b|\bbreakfast\b.*\bkosher\b/i, []],
];

const CUISINE_PATTERNS = [
  ["american", /\bunited states\b|\bnew york\b|\bcalifornia\b|\bchicago\b|\bwashington\b/i],
  ["argentinian", /\bargentina\b|\bbuenos aires\b/i],
  ["belgian", /\bbelgium\b|\bbrussels\b|\bsabena\b/i],
  ["british", /\bengland\b|\blondon\b|\bbrighton\b|\bdorset\b|\bliverpool\b|\bsussex\b/i],
  ["chinese", /\bchina\b|\bbeijing\b/i],
  ["french", /\bfrance\b|\bparis\b|\bauberge\b/i],
  ["german", /\bgermany\b|\bstadtkeller\b/i],
  ["irish", /\bireland\b|\bdublin\b/i],
  ["italian", /\bitaly\b|\bvenice\b|\bvenezia\b|\btaverna\b/i],
  ["japanese", /\bjapan\b|\btokyo\b|\bsukiyaki\b|\btempura\b/i],
  ["norwegian", /\bnorway\b|\bfjordrestaurant\b|\bhurtigruten\b/i],
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

function decodeHtml(value) {
  return cleanValue(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(value) {
  return decodeHtml(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function cellHtmls(rowHtml) {
  return [...String(rowHtml || "").matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
}

function parseDateRange(value) {
  const displayText = cleanValue(value);
  const text = normalizeText(displayText);
  if (!text || /\b(date unknown|undated|unknown)\b/.test(text)) {
    return { dateText: displayText, year: null, lowerYear: null, upperYear: null, pointYear: null, decade: "unknown", confidence: "X" };
  }

  const circa = text.match(/\b(?:ca|circa|c)\.?\s*((?:18|19|20)\d{2})\b/);
  if (circa) {
    const year = Number(circa[1]);
    return { dateText: displayText, year, lowerYear: year - 2, upperYear: year + 2, pointYear: year, decade: `${Math.floor(year / 10) * 10}s`, confidence: "C" };
  }

  const isoDates = [...text.matchAll(/\b((?:18|19|20)\d{2})-\d{2}-\d{2}\b/g)].map((match) => Number(match[1]));
  if (isoDates.length) {
    const lowerYear = Math.min(...isoDates);
    const upperYear = Math.max(...isoDates);
    const pointYear = Math.round((lowerYear + upperYear) / 2);
    return {
      dateText: displayText,
      year: lowerYear === upperYear ? lowerYear : null,
      lowerYear,
      upperYear,
      pointYear,
      decade: `${Math.floor(pointYear / 10) * 10}s`,
      confidence: lowerYear === upperYear ? "A" : "B",
    };
  }

  const years = [...text.matchAll(/\b(18|19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  if (!years.length) return { dateText: displayText, year: null, lowerYear: null, upperYear: null, pointYear: null, decade: "unknown", confidence: "X" };
  const lowerYear = Math.min(...years);
  const upperYear = Math.max(...years);
  const pointYear = Math.round((lowerYear + upperYear) / 2);
  return {
    dateText: displayText,
    year: lowerYear === upperYear ? lowerYear : null,
    lowerYear,
    upperYear,
    pointYear,
    decade: `${Math.floor(pointYear / 10) * 10}s`,
    confidence: lowerYear === upperYear ? "B" : upperYear - lowerYear <= 10 ? "C" : "D",
  };
}

function confidenceForDate(confidence) {
  if (confidence === "A") return 0.88;
  if (confidence === "B") return 0.74;
  if (confidence === "C") return 0.56;
  if (confidence === "D") return 0.32;
  return 0.16;
}

function tagsFor(text, patterns) {
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

function transportModeFor(text) {
  const normalized = normalizeText(text);
  if (/\bairlines?\b|\bsabena\b|\bflight\b/.test(normalized)) return "airline";
  if (/\brailroad\b|\brailway\b|\bpullman\b|\bdining car\b/.test(normalized)) return "railroad";
  if (/\bsteamship\b|\bship\b|\bcruise\b|\bhurtigruten\b/.test(normalized)) return "ship";
  if (/\bhotel\b|\binn\b|\bmetropole\b|\bsheraton\b|\bst\. regis\b/.test(normalized)) return "hotel";
  return "restaurant";
}

function countryForPlace(placeText) {
  const text = normalizeText(placeText);
  const matches = [
    ["United States", /\bunited states\b|\bnew york\b|\bcalifornia\b|\bchicago\b|\bwashington\b/],
    ["Argentina", /\bargentina\b|\bbuenos aires\b/],
    ["Belgium", /\bbelgium\b|\bbrussels\b/],
    ["China", /\bchina\b|\bbeijing\b/],
    ["England", /\bengland\b|\blondon\b|\bbrighton\b|\bdorset\b|\bliverpool\b|\bsussex\b/],
    ["France", /\bfrance\b|\bparis\b/],
    ["Germany", /\bgermany\b/],
    ["Ireland", /\bireland\b|\bdublin\b/],
    ["Italy", /\bitaly\b|\bvenice\b|\bvenezia\b/],
    ["Japan", /\bjapan\b|\btokyo\b/],
    ["Norway", /\bnorway\b/],
  ];
  return matches.find(([, pattern]) => pattern.test(text))?.[0] || "";
}

function mergeUnique(values) {
  return [...new Set(values.map(cleanValue).filter(Boolean))].sort();
}

function titleFoodLabels(title) {
  return TITLE_FOOD_PATTERNS.filter(([, pattern]) => pattern.test(title)).map(([label, , ingredientTags]) => ({ label, ingredientTags }));
}

function dishMentionFor(record, rawName, contextText, options = {}) {
  const normalizedName = normalizedDishName(rawName);
  if (!normalizedName) return null;
  const tags = mergeUnique([...(options.ingredientTags || []), ...ingredientTagsFor(rawName)]);
  return {
    id: stableId("cornelldish", [record.menuId, normalizedName]),
    menuId: record.menuId,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    rawName: cleanValue(rawName),
    normalizedName,
    canonicalDishId: `dish:${normalizedName.replace(/\s+/g, "-").slice(0, 96)}`,
    sectionName: options.sectionName || "finding aid title",
    dishType: dishTypeFor(rawName),
    ingredientTags: tags,
    extractionMethod: options.extractionMethod || "cornell_finding_aid_keyword",
    confidence: Number(options.confidence || 0.42),
    provenance: {
      sourceFile: "enrichment/external-sources/cornell_nestle_menu_collection.json",
      sourceRecordId: record.sourceRecordId,
      sourceUrl: SOURCE_URL,
    },
  };
}

function priceObservationsFor(record, contextText, references = {}, contextEvents = []) {
  if (!/[£$€¢]/.test(contextText)) return [];
  const parsed = extractPricesFromText(contextText, {
    id: record.menuId,
    title: record.title,
    year: record.year || record.pointYear || null,
    decade: record.decade,
    country: record.country || "unknown",
    itemUrl: SOURCE_URL,
  }).filter((entry) => /[£$€¢]/.test(entry.rawPrice || ""));
  return parsed.map((entry, index) => {
    const item = /\bper person\b/i.test(entry.rawLine || contextText)
      ? "per-person menu price"
      : cleanValue(entry.item).length > 3 && !/persons?/i.test(entry.item)
        ? entry.item
        : "metadata title price";
    const rawName = cleanValue(item);
    const price = {
      id: stableId("cornellprice", [record.menuId, entry.rawPrice, index, rawName]),
      menuId: record.menuId,
      menuUid: record.menuId,
      sourceId: SOURCE_ID,
      sourceKey: SOURCE_KEY,
      item: rawName,
      rawName,
      normalizedName: normalizedDishName(rawName),
      rawPrice: entry.rawPrice,
      rawPriceText: entry.rawPrice,
      amount: entry.amount,
      currency: entry.currency,
      currencyCode: entry.currency,
      year: record.year || record.pointYear || null,
      confidence: entry.confidence === "high" ? "medium" : entry.confidence || "low",
      scale: "cornell-finding-aid-explicit-currency",
      dishType: dishTypeFor(rawName),
      ingredientTags: ingredientTagsFor(rawName),
      extractionMethod: "cornell_finding_aid_title_price",
      provenance: {
        sourceFile: "enrichment/external-sources/cornell_nestle_menu_collection.json",
        sourceRecordId: record.sourceRecordId,
        sourceUrl: SOURCE_URL,
      },
    };
    return {
      ...price,
      normalized: normalizePrice(price, references),
      context: contextForEntry(price, contextEvents),
    };
  });
}

function rawRowsFromHtml(html) {
  const rows = [];
  let currentSeries = "";
  let lastRecord = null;
  const rowHtmls = [...String(html || "").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);
  for (const rowHtml of rowHtmls) {
    const cells = cellHtmls(rowHtml);
    if (cells.length < 3) continue;
    const descriptionHtml = cells[2] || "";
    const description = stripTags(descriptionHtml);
    if (/serieslabel/i.test(descriptionHtml)) {
      currentSeries = description;
      continue;
    }
    const box = stripTags(cells[0] || "");
    const folder = stripTags(cells[1] || "");
    const dateText = stripTags(cells[3] || "");
    if (!box && !folder && description && !dateText && lastRecord) {
      lastRecord.placeText = description;
      continue;
    }
    if (!description || (!box && !folder && !dateText)) continue;
    const row = {
      rowIndex: rows.length + 1,
      box,
      folder,
      description,
      dateText,
      series: currentSeries,
      placeText: "",
    };
    rows.push(row);
    lastRecord = row;
  }
  return rows;
}

function normalizeRow(row, options = {}) {
  const parsedDate = parseDateRange(row.dateText);
  const sourceRecordId = stableId("cornellrow", [row.rowIndex, row.box, row.folder, row.description, row.dateText, row.placeText]).replace(/^cornellrow:/, "");
  const menuId = `${SOURCE_KEY}:${sourceRecordId}`;
  const contextText = [row.description, row.placeText, row.series].map(cleanValue).filter(Boolean).join(" ");
  const genericDishLabels = tagsFor(contextText, DISH_HINT_PATTERNS).map((label) => ({ label, confidence: 0.42, extractionMethod: "cornell_finding_aid_keyword", ingredientTags: [] }));
  const specificDishLabels = titleFoodLabels(row.description).map((item) => ({
    ...item,
    confidence: 0.52,
    extractionMethod: "cornell_finding_aid_title_food_keyword",
  }));
  const baseRecord = {
    id: menuId,
    menuId,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    sourceRecordId,
    title: row.description,
    dateText: parsedDate.dateText,
    year: parsedDate.year,
    lowerYear: parsedDate.lowerYear,
    upperYear: parsedDate.upperYear,
    pointYear: parsedDate.pointYear,
    decade: parsedDate.decade,
    dateConfidence: parsedDate.confidence,
    workType: "finding aid menu metadata",
    collectionTitle: COLLECTION_TITLE,
    itemUrl: SOURCE_URL,
    sourceUrl: SOURCE_URL,
    sourceApiUrl: SOURCE_URL,
    venueText: row.description.replace(/\b(menu|bill of fare|wine list)\b.*$/i, "").replace(/[,:;\s]+$/g, "").slice(0, 160),
    placeText: row.placeText,
    country: countryForPlace(row.placeText),
    transportMode: transportModeFor(contextText),
    subjects: [row.series, "Menus"].filter(Boolean),
    subjectTerms: [row.series, "Menus"].filter(Boolean),
    cuisineTags: [...new Set(tagsFor(contextText, CUISINE_PATTERNS))].sort(),
    formatTags: ["finding aid"],
    styleTags: [],
    ingredientTags: [],
    descriptionSummary: [row.series, row.box, row.folder].filter(Boolean).join("; ").slice(0, 420),
    notes: "Derived from Cornell EAD container-list metadata; no item images, OCR, or full recipe/menu text copied.",
    containerText: [row.box, row.folder].filter(Boolean).join(", "),
    sourceRowIndex: row.rowIndex,
    confidence: confidenceForDate(parsedDate.confidence),
    provenance: {
      sourceFile: "enrichment/external-sources/cornell_nestle_menu_collection.json",
      sourceRecordId,
      sourceUrl: SOURCE_URL,
      rightsNote: "Derived finding-aid metadata only; verify collection use terms before item-level image/OCR harvest.",
    },
  };
  const dishMentions = [...genericDishLabels, ...specificDishLabels]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.label === item.label) === index)
    .map((item) => dishMentionFor(baseRecord, item.label, contextText, item))
    .filter(Boolean);
  const priceObservations = priceObservationsFor(baseRecord, contextText, options.references, options.contextEvents);
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
    priceObservations,
    imageFeatures: [],
    ingredientTags,
  };
}

function recordScore(record) {
  const year = Number(record.year || record.pointYear || record.lowerYear || record.upperYear || 0);
  return (
    (record.dateConfidence === "A" ? 24 : record.dateConfidence === "B" ? 18 : record.dateConfidence === "C" ? 10 : record.dateConfidence === "D" ? 4 : 0) +
    (record.placeText ? 10 : 0) +
    ((record.dishHints || []).length ? 8 : 0) +
    (record.transportMode && record.transportMode !== "restaurant" ? 8 : 0) +
    (year && year < 1900 ? 8 : 0) +
    ((record.cuisineTags || []).length ? 4 : 0)
  );
}

function parseFindingAid(html, options = {}) {
  const rows = rawRowsFromHtml(html);
  const records = rows.map((row) => normalizeRow(row, options));
  const limit = Math.max(1, Number(options.limit || records.length) || records.length);
  return records.sort((a, b) => recordScore(b) - recordScore(a) || cleanValue(a.title).localeCompare(cleanValue(b.title))).slice(0, limit);
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "MenuGraph Cornell finding-aid metadata connector; derived metadata only" },
    });
    if (!response.ok) throw new Error(`Cornell request returned HTTP ${response.status}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

async function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function countBy(records, getter) {
  const counts = new Map();
  for (const record of records || []) {
    const key = getter(record) || "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

async function buildCornellSource(options = {}) {
  const startedAt = new Date().toISOString();
  const limit = Math.min(2500, Math.max(1, Number(options.limit || 800) || 800));
  const html = options.html || (await fetchText(SOURCE_URL, options.timeoutMs || 30000));
  const [cpiUs, cpiCountry, contextEvents] = await Promise.all([
    readJson(path.join(DATA_DIR, "reference", "cpi-us.json"), {}),
    readJson(path.join(DATA_DIR, "reference", "cpi-country.json"), {}),
    readJson(path.join(DATA_DIR, "reference", "context-events.json"), []),
  ]);
  const records = parseFindingAid(html, { limit, references: { cpiUs, cpiCountry }, contextEvents });
  const generatedAt = new Date().toISOString();
  const dishMentions = records.flatMap((record) => record.dishMentions || []);
  const priceObservations = records.flatMap((record) => record.priceObservations || []);
  const output = {
    version: VERSION,
    generatedAt,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    collectionUrl: SOURCE_URL,
    sourceApiUrl: SOURCE_URL,
    summary: {
      total: records.length,
      totalParsedRows: rawRowsFromHtml(html).length,
      dishMentions: dishMentions.length,
      priceObservations: priceObservations.length,
      withDates: records.filter((record) => record.lowerYear || record.upperYear || record.year).length,
      withVenues: records.filter((record) => record.venueText).length,
      withPlaces: records.filter((record) => record.placeText).length,
      withDishHints: records.filter((record) => (record.dishHints || []).length).length,
      imageFeatures: 0,
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
    limit: Math.min(2500, Math.max(1, Number(argValue(args, "limit", "800")) || 800)),
    timeoutMs: Math.max(5000, Number(argValue(args, "timeout-ms", "30000")) || 30000),
    dryRun: hasFlag(args, "dry-run"),
  };
}

async function main() {
  const output = await buildCornellSource(optionsFromArgs());
  console.log(
    [
      `Wrote ${output.summary.total.toLocaleString()} Cornell external menu records`,
      `${output.summary.withDates.toLocaleString()} dated rows`,
      `${output.summary.withPlaces.toLocaleString()} place rows`,
      `${output.summary.dishMentions.toLocaleString()} metadata dish hints`,
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
  buildCornellSource,
  dishMentionFor,
  optionsFromArgs,
  parseDateRange,
  parseFindingAid,
  priceObservationsFor,
  rawRowsFromHtml,
  titleFoodLabels,
  transportModeFor,
};
