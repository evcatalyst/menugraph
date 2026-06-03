const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { cleanValue, normalizeText } = require("../docs/multisource");
const { dishTypeFor, ingredientTagsFor, normalizedDishName } = require("./local-enrichment");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const OUTPUT_PATH = path.join(DATA_DIR, "enrichment", "external-sources", "uh_1850s_1860s_menus.json");
const BASE_URL = "https://digitalcollections.lib.uh.edu";
const COLLECTION_URL = `${BASE_URL}/collections/g158bj49n?locale=en&per_page=100`;
const SOURCE_ID = "uh_1850s_1860s_menus";
const SOURCE_KEY = "uh";
const COLLECTION_TITLE = "1850s and 1860s Hotel and Restaurant Menus";
const VERSION = 1;

const MONTH_PATTERN =
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;

const EARLY_DISH_PATTERNS = [
  /\bgreen turtle soup\b/i,
  /\bturtle soup\b/i,
  /\bclam chowder\b/i,
  /\broast beef\b/i,
  /\broast turkey\b/i,
  /\boysters?\b/i,
  /\bterrapin\b/i,
  /\bcanvasback duck\b/i,
  /\bvenison\b/i,
  /\bchampagne\b/i,
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
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " "));
}

function absoluteUrl(value) {
  const raw = cleanValue(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `${BASE_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function values(value) {
  if (Array.isArray(value)) return value.map(cleanValue).filter(Boolean);
  const single = cleanValue(value);
  return single ? [single] : [];
}

function firstValue(value) {
  return values(value)[0] || "";
}

function parseCollectionRows(html) {
  const rows = [];
  const rowPattern = /<tr[^>]+id="document_([^"]+)"[\s\S]*?<\/tr>/g;
  let match = rowPattern.exec(html);
  while (match) {
    const rowHtml = match[0];
    const idFromRow = cleanValue(match[1]);
    const hrefMatch = rowHtml.match(/<a[^>]+href="([^"]*\/concern\/texts\/[^"]+)"/);
    const href = decodeHtml(hrefMatch?.[1] || "");
    const idFromHref = href.match(/\/concern\/texts\/([^/?#]+)/)?.[1] || "";
    const titleMatch =
      rowHtml.match(/id="src_copy_link_[^"]*"[^>]*>([\s\S]*?)<\/a>/) ||
      rowHtml.match(/<a[^>]+href="[^"]*\/concern\/texts\/[^"]+"[^>]*>([\s\S]*?)<\/a>/);
    const dateMatch = rowHtml.match(/<td[^>]+class="[^"]*\bdate\b[^"]*"[^>]*>([\s\S]*?)<\/td>/);
    const thumbMatch = rowHtml.match(/<img[^>]+src="([^"]+)"/);
    const id = cleanValue(idFromHref || idFromRow);
    if (id) {
      rows.push({
        id,
        href: absoluteUrl(href || `/concern/texts/${id}?locale=en`),
        title: stripTags(titleMatch?.[1] || ""),
        dateText: stripTags(dateMatch?.[1] || ""),
        thumbnailUrl: absoluteUrl(decodeHtml(thumbMatch?.[1] || "")),
      });
    }
    match = rowPattern.exec(html);
  }
  return rows;
}

function parseDateRange(...parts) {
  const text = parts.map(cleanValue).filter(Boolean).join(" ");
  const displayText = cleanValue(parts.find((part) => cleanValue(part)) || "");
  const iso = text.match(/\b((?:18|19|20)\d{2})-\d{2}-\d{2}\b/);
  if (iso) {
    const year = Number(iso[1]);
    return { dateText: displayText || iso[0], year, lowerYear: year, upperYear: year, pointYear: year, decade: `${Math.floor(year / 10) * 10}s`, confidence: "A" };
  }

  const decadeMatches = [...text.matchAll(/\b((?:18|19|20)\d)X\b/gi)].map((item) => Number(item[1]) * 10);
  const centuryMatches = [...text.matchAll(/\b((?:18|19|20))XX\b/gi)].map((item) => Number(item[1]) * 100);
  if (decadeMatches.length || centuryMatches.length) {
    const ranges = [
      ...decadeMatches.map((lowerYear) => [lowerYear, lowerYear + 9]),
      ...centuryMatches.map((lowerYear) => [lowerYear, lowerYear + 99]),
    ];
    const lowerYear = Math.min(...ranges.map((range) => range[0]));
    const upperYear = Math.max(...ranges.map((range) => range[1]));
    const pointYear = Math.round((lowerYear + upperYear) / 2);
    return {
      dateText: displayText || `${lowerYear}-${upperYear}`,
      year: null,
      lowerYear,
      upperYear,
      pointYear,
      decade: `${Math.floor(pointYear / 10) * 10}s`,
      confidence: upperYear - lowerYear <= 19 ? "C" : "D",
    };
  }

  const years = [...text.matchAll(/\b(18|19|20)\d{2}\b/g)].map((item) => Number(item[0]));
  if (!years.length) {
    return { dateText: displayText, year: null, lowerYear: null, upperYear: null, pointYear: null, decade: "unknown", confidence: "X" };
  }
  const lowerYear = Math.min(...years);
  const upperYear = Math.max(...years);
  const pointYear = lowerYear === upperYear ? lowerYear : Math.round((lowerYear + upperYear) / 2);
  const hasMonthDay = MONTH_PATTERN.test(text) && /\b\d{1,2}\b/.test(text);
  return {
    dateText: displayText || String(pointYear),
    year: lowerYear === upperYear ? lowerYear : null,
    lowerYear,
    upperYear,
    pointYear,
    decade: `${Math.floor(pointYear / 10) * 10}s`,
    confidence: lowerYear === upperYear && hasMonthDay ? "A" : lowerYear === upperYear ? "B" : upperYear - lowerYear <= 10 ? "B" : "C",
  };
}

function deriveVenueText(title) {
  const withoutDate = cleanValue(title)
    .replace(/,\s*(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\s*$/i, "")
    .replace(/,\s*(?:18|19|20)\d{2}-\d{2}-\d{2}\s*$/i, "")
    .replace(/,\s*(?:18|19|20)\d{2}\s*$/i, "");
  const prefix = cleanValue(withoutDate.split(",")[0]);
  if (!prefix || /^scrapbook\b/i.test(prefix)) return "";
  return prefix;
}

function transportModeFor(text) {
  const normalized = normalizeText(text);
  if (/\b(steamship|steam ship|steamer|steam boat|steamboat|ship|u s m|usm|columbia|james adger)\b/.test(normalized)) return "ship";
  if (/\b(hotel|house|hall|mansion|inn)\b/.test(normalized)) return "hotel";
  if (/\b(restaurant|delmonico|cafe|dining room)\b/.test(normalized)) return "restaurant";
  return "historical_menu";
}

function descriptionDishSegments({ title, description, subjects }) {
  const text = [title, ...values(description), ...values(subjects)].join(" ");
  const segments = [];
  for (const pattern of EARLY_DISH_PATTERNS) {
    const match = text.match(pattern);
    if (match) segments.push(cleanValue(match[0]));
  }
  return [...new Set(segments)].slice(0, 6);
}

function dishMentionFor(record, rawName) {
  const normalizedName = normalizedDishName(rawName);
  if (!normalizedName) return null;
  return {
    id: stableId("uhdish", [record.menuId, normalizedName]),
    menuId: record.menuId,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    rawName: cleanValue(rawName),
    normalizedName,
    canonicalDishId: `dish:${normalizedName.replace(/\s+/g, "-").slice(0, 96)}`,
    sectionName: "metadata description",
    dishType: dishTypeFor(rawName),
    ingredientTags: ingredientTagsFor(rawName),
    extractionMethod: "uh_metadata_keyword",
    confidence: 0.52,
    provenance: {
      sourceFile: "enrichment/external-sources/uh_1850s_1860s_menus.json",
      sourceRecordId: record.sourceRecordId,
      sourceApiUrl: `${BASE_URL}/concern/texts/${record.sourceRecordId}?locale=en&format=json`,
    },
  };
}

function confidenceForDate(dateConfidence) {
  if (dateConfidence === "A") return 0.9;
  if (dateConfidence === "B") return 0.78;
  if (dateConfidence === "C") return 0.58;
  if (dateConfidence === "D") return 0.34;
  return 0.18;
}

function normalizeItem(item, row = {}) {
  const sourceRecordId = cleanValue(item?.id || row.id);
  if (!sourceRecordId) return null;
  const title = firstValue(item?.title) || cleanValue(row.title) || "Untitled UH menu";
  const dateText = firstValue(item?.date) || cleanValue(row.dateText);
  const parsedDate = parseDateRange(dateText, title);
  const subjects = values(item?.subject);
  const description = values(item?.description);
  const placeText = firstValue(item?.place);
  const rightsStatement = firstValue(item?.rights_statement);
  const menuId = `${SOURCE_KEY}:${sourceRecordId}`;
  const contextText = [title, dateText, placeText, subjects.join(" "), description.join(" ")].join(" ");
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
    workType: "Text",
    collectionTitle: COLLECTION_TITLE,
    itemUrl: `${BASE_URL}/concern/texts/${sourceRecordId}?locale=en`,
    iiifManifestUrl: `${BASE_URL}/concern/texts/${sourceRecordId}/manifest`,
    thumbnailUrl: cleanValue(row.thumbnailUrl),
    sourceUrl: `${BASE_URL}/concern/texts/${sourceRecordId}?locale=en`,
    sourceApiUrl: `${BASE_URL}/concern/texts/${sourceRecordId}?locale=en&format=json`,
    venueText: deriveVenueText(title),
    placeText,
    country: /,\s*(?:alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|illinois|louisiana|massachusetts|new york|pennsylvania|south carolina|texas|washington|wisconsin)\b/i.test(placeText)
      ? "United States"
      : "",
    transportMode: transportModeFor(contextText),
    subjects: subjects.slice(0, 12),
    descriptionSummary: cleanValue(description.join(" ")).slice(0, 420),
    rightsStatement,
    ark: cleanValue(item?.digital_object_ark || item?.arkivo_checksum),
    confidence: confidenceForDate(parsedDate.confidence),
    provenance: {
      sourceFile: "enrichment/external-sources/uh_1850s_1860s_menus.json",
      sourceRecordId,
      sourceApiUrl: `${BASE_URL}/concern/texts/${sourceRecordId}?locale=en&format=json`,
      rightsNote: rightsStatement || "Derived metadata only; no raw image, OCR, transcript, or IIIF payload copied into static graph artifacts.",
    },
  };
  const dishMentions = descriptionDishSegments({ title, description, subjects }).map((rawName) => dishMentionFor(baseRecord, rawName)).filter(Boolean);
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
    priceObservations: [],
    dishMentions,
  };
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MenuGraph bounded UH metadata connector; derived metadata only",
      },
    });
    if (!response.ok) throw new Error(`UH request returned HTTP ${response.status} for ${url}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, timeoutMs) {
  return JSON.parse(await fetchText(url, timeoutMs));
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

async function buildUhSource(options = {}) {
  const startedAt = new Date().toISOString();
  const listingHtml = options.listingHtml || (await fetchText(COLLECTION_URL, options.timeoutMs));
  const rows = parseCollectionRows(listingHtml).slice(0, options.limit);
  const records = [];
  for (const row of rows) {
    const item = options.itemsById?.[row.id] || (await fetchJson(`${BASE_URL}/concern/texts/${row.id}?locale=en&format=json`, options.timeoutMs));
    const record = normalizeItem(item, row);
    if (record) records.push(record);
  }
  const generatedAt = new Date().toISOString();
  const dishMentions = records.flatMap((record) => record.dishMentions || []);
  const output = {
    version: VERSION,
    generatedAt,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    collectionUrl: COLLECTION_URL,
    summary: {
      total: records.length,
      listedItems: parseCollectionRows(listingHtml).length,
      dishMentions: dishMentions.length,
      priceObservations: 0,
      withDates: records.filter((record) => record.lowerYear).length,
      withIiif: records.filter((record) => record.iiifManifestUrl).length,
      withVenues: records.filter((record) => record.venueText).length,
      transportModes: countBy(records, (record) => record.transportMode),
      dateConfidence: countBy(records, (record) => record.dateConfidence),
      ingredientTags: countBy(dishMentions.flatMap((record) => record.ingredientTags.map((tag) => ({ tag }))), (record) => record.tag),
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
  const output = await buildUhSource(optionsFromArgs());
  console.log(
    [
      `Wrote ${output.summary.total.toLocaleString()} UH external menu records`,
      `${output.summary.withDates.toLocaleString()} dated records`,
      `${output.summary.withVenues.toLocaleString()} venue hints`,
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
  buildUhSource,
  deriveVenueText,
  normalizeItem,
  optionsFromArgs,
  parseCollectionRows,
  parseDateRange,
  transportModeFor,
};
