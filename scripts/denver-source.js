const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { normalizePrice } = require("../docs/price-utils");
const { cleanValue, normalizeText } = require("../docs/multisource");
const { dishTypeFor, ingredientTagsFor, normalizedDishName } = require("./local-enrichment");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const OUTPUT_PATH = path.join(DATA_DIR, "enrichment", "external-sources", "denver_menu_collection.json");
const BASE_URL = "https://digital.denverlibrary.org";
const SOURCE_ID = "denver_menu_collection";
const SOURCE_KEY = "denver";
const COLLECTION_TITLE = "Denver Public Library Digital Collections";
const VERSION = 1;
const SEARCH_PAGE_SIZE_ESTIMATE = 24;

const REJECT_TITLE_PATTERNS = [
  /\bchristian association\b/i,
  /\bcredit menu association\b/i,
  /\bretail credit\b/i,
  /\bstreet guide\b/i,
  /\breading the menu\b/i,
  /\bsmeloff\b/i,
  /\bmenuhin\b/i,
];

const CUISINE_PATTERNS = [
  ["american", /\bamerican\b|\bburger\b|\bdiner\b|\bsteak\b/i],
  ["bar", /\bbar\b|\blounge\b|\bcocktails?\b|\bdrinks?\b|\bmoscow mule\b/i],
  ["cafe", /\bcafe\b|\bcoffee\b/i],
  ["french", /\bfrench\b|\bhotel de paris\b/i],
  ["italian", /\bitalian\b|\bpizza\b|\bvero\b|\bcentral market\b/i],
  ["spanish", /\bbarcelona\b|\btapas\b|\bspanish\b/i],
  ["wine", /\bwine\b/i],
];

const DISH_HINT_PATTERNS = [
  ["bar menu", /\bbar\b|\blounge\b|\bcocktails?\b|\bdrinks?\b|\bmoscow mule\b/i],
  ["breakfast options", /\bbreakfast\b|\bbrunch\b/i],
  ["coffee options", /\bcoffee\b|\bespresso\b/i],
  ["dessert options", /\bdesserts?\b|\bpastry\b/i],
  ["dinner options", /\bdinner\b/i],
  ["fish and seafood options", /\bseafood\b|\bfish\b|\boyster\b|\bclam\b|\bcrab\b|\bshrimp\b/i],
  ["grocery items", /\bgrocery list\b|\bgroceries\b/i],
  ["hotel dining", /\bhotel\b|\binn\b/i],
  ["lunch options", /\blunch(?:eon)?\b/i],
  ["sandwiches", /\bsandwich(?:es)?\b/i],
  ["steak", /\bsteaks?\b|\bsteakhouse\b/i],
  ["takeout options", /\btakeout\b|\btake out\b|\btake-away\b/i],
  ["tapas", /\btapas\b|\bbarcelona\b/i],
  ["wine list", /\bwine\b/i],
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
  return decodeHtml(String(value || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")");
}

function absoluteUrl(value) {
  const raw = decodeHtml(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${BASE_URL}/${raw.replace(/^\/+/, "")}`;
}

function metaContent(html, property) {
  const pattern = new RegExp(`<meta\\s+[^>]*(?:property|name)=["']${property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`, "i");
  const tag = html.match(pattern)?.[0] || "";
  const content = tag.match(/\bcontent=(["'])(.*?)\1/i)?.[2];
  return decodeHtml(content || "");
}

function parseNumber(value) {
  const number = Number(cleanValue(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseMetadataSpans(html) {
  const fields = {};
  const spans = [...String(html || "").matchAll(/<span class=["']metadata["'][^>]*>\s*<span class=["']titlelabel["'][^>]*>([\s\S]*?)<\/span>([\s\S]*?)(?=<\/span>\s*(?:<span class=["']metadata["']|<\/div>|$))/gi)];
  for (const match of spans) {
    const label = stripTags(match[1]).replace(/:$/, "").toLowerCase();
    const value = stripTags(match[2]);
    if (!label || !value) continue;
    fields[label] = fields[label] ? `${fields[label]}; ${value}` : value;
  }
  return fields;
}

function parseFormat(html) {
  return stripTags(String(html).match(/<div class=["']portlet-header["']>\s*Format:\s*([\s\S]*?)<\/div>/i)?.[1] || "");
}

function parseSearchResults(html) {
  const blocks = String(html || "").split(/<div class=["']list_item["'][^>]*>/i).slice(1);
  return blocks
    .map((block) => {
      const sourceRecordId = cleanValue(block.match(/name=["']multiSelect\[\]["']\s+value=["']([^"']+)["']/i)?.[1]);
      const href = decodeHtml(block.match(/<a\s+href=["']([^"']*\/nodes\/view\/\d+[^"']*)["'][^>]*class=["']sr2title/i)?.[1] || "");
      const hrefId = href.match(/\/nodes\/view\/(\d+)/)?.[1] || "";
      const title = stripTags(block.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1] || block.match(/title=["']([^"']+)["']/i)?.[1] || "");
      const metadata = parseMetadataSpans(block);
      const thumbnailUrl = absoluteUrl(block.match(/<img\s+src=["']([^"']*\/assets\/nodeimg\/[^"']+)["']/i)?.[1] || "");
      return {
        sourceRecordId: sourceRecordId || hrefId,
        title,
        itemUrl: href ? absoluteUrl(href.split("?")[0]) : hrefId ? `${BASE_URL}/nodes/view/${hrefId}` : "",
        thumbnailUrl,
        format: metadata.format || "",
        callNumber: metadata["call number"] || "",
        creator: metadata.creator || "",
        dateText: metadata.date || "",
      };
    })
    .filter((item) => item.sourceRecordId && item.title);
}

function isRejectedTitle(title) {
  return REJECT_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

function isLikelyMenuRecord(record) {
  const text = [record.title, record.format, record.workType, record.typeOfMaterial, record.subjects?.join(" "), record.descriptionSummary].map(cleanValue).join(" ");
  if (isRejectedTitle(text)) return false;
  const normalized = normalizeText(text);
  if (!/\bmenus?\b/.test(normalized)) return false;
  if (/\b(type of material menus|subject restaurants|drink menu|dinner menu|lunch menu|takeout menu|window menu)\b/.test(normalized)) return true;
  return /\b(menu hotel|hotel .* menu|restaurant|lounge|bar|wine|dining|photograph|document pdf)\b/.test(normalized);
}

function parseDateRange(value, fallbackText = "") {
  const text = [value, cleanValue(value) ? "" : fallbackText].map(cleanValue).filter(Boolean).join(" ");
  const displayText = cleanValue(value);
  if (!text) return { dateText: "", year: null, lowerYear: null, upperYear: null, pointYear: null, decade: "unknown", confidence: "X" };

  const between = text.match(/\bbetween\b[\s\S]*?\b((?:18|19|20)\d{2})\b[\s\S]*?\band\b[\s\S]*?\b((?:18|19|20)\d{2})\b/i);
  if (between) return dateRangeResult(displayText || text, Number(between[1]), Number(between[2]));

  const range = text.match(/\b((?:18|19|20)\d{2})\s*[-/]\s*((?:18|19|20)\d{2})\b/);
  if (range) return dateRangeResult(displayText || range[0], Number(range[1]), Number(range[2]));

  const circa = text.match(/\b(?:circa|ca\.?|c\.)\s*((?:18|19|20)\d{2})\b/i);
  if (circa) {
    const year = Number(circa[1]);
    return {
      dateText: displayText || circa[0],
      year,
      lowerYear: year - 2,
      upperYear: year + 2,
      pointYear: year,
      decade: `${Math.floor(year / 10) * 10}s`,
      confidence: "C",
    };
  }

  const monthDayYear = text.match(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2},?\s+((?:18|19|20)\d{2})\b/i);
  if (monthDayYear) {
    const year = Number(monthDayYear[1]);
    return datePointResult(displayText || monthDayYear[0], year, "A");
  }

  const year = text.match(/\b(18|19|20)\d{2}\b/);
  if (year) return datePointResult(displayText || year[0], Number(year[0]), "B");

  return { dateText: displayText, year: null, lowerYear: null, upperYear: null, pointYear: null, decade: "unknown", confidence: "X" };
}

function dateRangeResult(dateText, firstYear, secondYear) {
  const lowerYear = Math.min(firstYear, secondYear);
  const upperYear = Math.max(firstYear, secondYear);
  const pointYear = Math.round((lowerYear + upperYear) / 2);
  return {
    dateText,
    year: lowerYear === upperYear ? lowerYear : null,
    lowerYear,
    upperYear,
    pointYear,
    decade: `${Math.floor(pointYear / 10) * 10}s`,
    confidence: upperYear - lowerYear <= 10 ? "C" : "D",
  };
}

function datePointResult(dateText, year, confidence) {
  return { dateText, year, lowerYear: year, upperYear: year, pointYear: year, decade: `${Math.floor(year / 10) * 10}s`, confidence };
}

function splitTerms(value) {
  return cleanValue(value)
    .split(";")
    .map((term) => cleanValue(term.replace(/\.$/, "")))
    .filter(Boolean);
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
  if (/\bhandwritten\b/.test(normalized)) tags.push("handwritten");
  if (/\bwindow menu\b/.test(normalized)) tags.push("window display");
  if (/\btakeout\b|\btake out\b/.test(normalized)) tags.push("takeout");
  if (/\bclosure sign\b|\bcovid\b|\b2020\b/.test(normalized)) tags.push("pandemic era");
  if (/\bblack and white\b|\bphotographic print\b|\bfilm negative\b/.test(normalized)) tags.push("black and white photograph");
  if (/\bpdf\b|\bdocument\b/.test(normalized)) tags.push("document");
  return [...new Set(tags)].sort();
}

function transportModeFor(text) {
  const normalized = normalizeText(text);
  if (/\bhotel\b|\binn\b/.test(normalized)) return "hotel";
  return "restaurant";
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
    id: stableId("denverdish", [record.menuId, normalizedName]),
    menuId: record.menuId,
    sourceId: SOURCE_ID,
    sourceKey: SOURCE_KEY,
    rawName: cleanValue(rawName),
    normalizedName,
    canonicalDishId: `dish:${normalizedName.replace(/\s+/g, "-").slice(0, 96)}`,
    sectionName: "metadata description",
    dishType: dishTypeFor(rawName),
    ingredientTags: tags,
    extractionMethod: "denver_metadata_keyword",
    confidence: 0.48,
    provenance: {
      sourceFile: "enrichment/external-sources/denver_menu_collection.json",
      sourceRecordId: record.sourceRecordId,
      sourceUrl: record.sourceUrl,
    },
  };
}

function priceSegmentsFor(text) {
  const segments = [];
  const matches = [...cleanValue(text).matchAll(/\$[0-9]+(?:\.[0-9]{1,2})?/g)];
  for (const [index, match] of matches.entries()) {
    segments.push({
      rawName: index ? `metadata price ${index + 1}` : "metadata price",
      rawPriceText: match[0],
    });
  }
  return segments.slice(0, 8);
}

function priceObservationFor(record, segment, references = {}) {
  const amount = Number(cleanValue(segment.rawPriceText).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount)) return null;
  const normalizedName = normalizedDishName(segment.rawName);
  const priceRecord = {
    id: stableId("denverprice", [record.menuId, normalizedName, segment.rawPriceText]),
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
    extractionMethod: "denver_metadata_description_price",
    provenance: {
      sourceFile: "enrichment/external-sources/denver_menu_collection.json",
      sourceRecordId: record.sourceRecordId,
      sourceUrl: record.sourceUrl,
    },
  };
  priceRecord.normalized = normalizePrice(priceRecord, references);
  return priceRecord;
}

function inferVenue(title, fields = {}) {
  const creator = cleanValue(fields.creator);
  let venue = cleanValue(title)
    .replace(/^menu,\s*/i, "")
    .replace(/\s+closure sign and menu\b/i, "")
    .replace(/\s+handwritten window menu\b/i, "")
    .replace(/\s+takeout menu(?:,?\s*and grocery list)?\b/i, "")
    .replace(/\s+menu(?:\s+and grocery list)?\b/i, "")
    .replace(/\s+drink menu\b/i, "")
    .replace(/\s+window menu\b/i, "")
    .replace(/\s+and grocery list\b/i, "")
    .trim();
  if (!venue || normalizeText(venue) === "menu") venue = creator;
  return venue || cleanValue(title) || "Untitled Denver menu";
}

function normalizeGeographicArea(value) {
  const text = cleanValue(value);
  if (!text) return "";
  if (/five points/i.test(text) && /denver/i.test(text)) return "Five Points, Denver, Colorado";
  if (/denver/i.test(text)) return "Denver, Colorado";
  if (/georgetown/i.test(text)) return "Georgetown, Colorado";
  return text.replace(/\(Colo\.\)/gi, "Colorado").replace(/--.*$/g, "");
}

function imageFeaturesFor(record, html) {
  const ogImage = metaContent(html, "og:image");
  const sourceImageUrl = /\/theme\/denverlibrary\/img\/logo\./i.test(ogImage) ? "" : ogImage;
  const width = parseNumber(metaContent(html, "og:image:width")) || parseNumber(String(html).match(/\sid=["']hero\d+["'][^>]*\sw=["']([^"']+)["']/i)?.[1]);
  const height = parseNumber(metaContent(html, "og:image:height")) || parseNumber(String(html).match(/\sid=["']hero\d+["'][^>]*\sh=["']([^"']+)["']/i)?.[1]);
  const pdfUrl = absoluteUrl(String(html).match(/<iframe[^>]+src=["']([^"']*\/assets\/displaypdf\/[^"']+)["']/i)?.[1] || "");
  if (!sourceImageUrl && !pdfUrl && !width && !height) return [];
  const orientation = width && height ? (width > height ? "landscape" : width < height ? "portrait" : "square") : "unknown";
  return [
    {
      id: stableId("denverimage", [record.menuId, sourceImageUrl || pdfUrl, width, height]),
      menuId: record.menuId,
      sourceId: SOURCE_ID,
      sourceKey: SOURCE_KEY,
      featureType: sourceImageUrl ? "recollect_image_metadata" : "recollect_pdf_metadata",
      scalar: {
        width,
        height,
        aspectRatio: width && height ? Number((width / height).toFixed(4)) : null,
        orientation,
        pageCount: 1,
        hasImageUri: Boolean(sourceImageUrl),
        hasIiifInfo: false,
      },
      sourceImageUrl,
      pdfUrl,
      modelName: "denver_recollect_metadata",
      confidence: width && height ? 0.74 : 0.56,
      provenance: {
        sourceFile: "enrichment/external-sources/denver_menu_collection.json",
        sourceRecordId: record.sourceRecordId,
      },
    },
  ];
}

function normalizeItem(html, searchItem = {}, references = {}) {
  const sourceRecordId = cleanValue(searchItem.sourceRecordId || String(html).match(/<span id=["']nodeID["'][^>]*>(\d+)<\/span>/i)?.[1]);
  if (!sourceRecordId) return null;
  const fields = parseMetadataSpans(html);
  const title = metaContent(html, "og:title") || stripTags(String(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) || searchItem.title || "Untitled Denver menu";
  const format = parseFormat(html) || searchItem.format;
  const description = fields.summary || metaContent(html, "og:description");
  const dateText = fields.date || searchItem.dateText;
  const parsedDate = parseDateRange(dateText);
  const subjectTerms = splitTerms(fields.subject);
  const typeOfMaterial = fields["type of material"] || "";
  const geographicArea = fields["geographic area"] || "";
  const notes = fields.notes || "";
  const creator = fields.creator || searchItem.creator || "";
  const rightsStatement = fields["rights statement"] || "";
  const contextText = [title, creator, description, notes, format, typeOfMaterial, subjectTerms.join(" "), geographicArea].join(" ");
  const menuId = `${SOURCE_KEY}:${sourceRecordId}`;
  const venueText = inferVenue(title, { creator });
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
    workType: format || "menu",
    collectionTitle: COLLECTION_TITLE,
    itemUrl: `${BASE_URL}/nodes/view/${sourceRecordId}`,
    sourceUrl: `${BASE_URL}/nodes/view/${sourceRecordId}`,
    sourceApiUrl: "",
    iiifManifestUrl: "",
    iiifInfoUri: "",
    imageUri: metaContent(html, "og:image"),
    thumbnailUrl: searchItem.thumbnailUrl || "",
    venueText,
    placeText: normalizeGeographicArea(geographicArea) || "Denver, Colorado",
    address: "",
    country: "United States",
    transportMode: transportModeFor(contextText),
    subjects: subjectTerms.slice(0, 16),
    subjectTerms: subjectTerms.slice(0, 16),
    creator,
    typeOfMaterial,
    cuisineTags: cuisineTagsFor(contextText),
    formatTags: [format, typeOfMaterial].filter(Boolean).map((term) => normalizeText(term)).filter(Boolean).slice(0, 8),
    styleTags: styleTagsFor(contextText),
    ingredientTags: ingredientTagsFor(contextText),
    descriptionSummary: cleanValue(description).slice(0, 420),
    notes: cleanValue(notes).slice(0, 240),
    rightsStatement,
    pageCount: 1,
    pageIds: [],
    confidence: confidenceForDate(parsedDate.confidence),
    provenance: {
      sourceFile: "enrichment/external-sources/denver_menu_collection.json",
      sourceRecordId,
      sourceUrl: `${BASE_URL}/nodes/view/${sourceRecordId}`,
      rightsNote: rightsStatement || "Derived metadata only; no raw image, OCR, transcript, or downloaded asset copied into static graph artifacts.",
    },
  };
  if (!isLikelyMenuRecord(baseRecord)) return null;
  const dishMentions = dishSegmentsFor(contextText).map((segment) => dishMentionFor(baseRecord, segment, contextText)).filter(Boolean);
  const priceObservations = priceSegmentsFor([description, notes, title].join(" ")).map((segment) => priceObservationFor(baseRecord, segment, references)).filter(Boolean);
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
    imageFeatures: imageFeaturesFor(baseRecord, html),
  };
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MenuGraph bounded Denver metadata connector; derived metadata only",
      },
    });
    if (!response.ok) throw new Error(`Denver request returned HTTP ${response.status} for ${url}`);
    return response.text();
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

async function buildDenverSource(options = {}) {
  const startedAt = new Date().toISOString();
  const limit = Math.min(200, Math.max(1, options.limit || 100));
  const timeoutMs = options.timeoutMs || 30000;
  const searchUrl = `${BASE_URL}/nodes/search_result?keywords=menu&type=all&viewtype=grid&page=1`;
  const references = options.references || {
    cpi: await readJson("reference/cpi-us.json", []),
    fx: await readJson("reference/fx.json", {}),
    cpiCountry: await readJson("reference/cpi-country.json", {}),
  };
  const searchItemsById = new Map();
  const maxPages = Math.max(1, Math.min(12, options.maxPages || Math.ceil(limit / SEARCH_PAGE_SIZE_ESTIMATE) + 2));
  for (let page = 1; page <= maxPages && searchItemsById.size < limit; page += 1) {
    const html = options.searchPages?.[page] || (await fetchText(`${BASE_URL}/nodes/search_result?keywords=menu&type=all&viewtype=grid&page=${page}`, timeoutMs));
    const pageItems = parseSearchResults(html).filter((item) => isLikelyMenuRecord(item));
    if (!pageItems.length && page > 1) break;
    for (const item of pageItems) {
      if (!searchItemsById.has(item.sourceRecordId)) searchItemsById.set(item.sourceRecordId, item);
      if (searchItemsById.size >= limit) break;
    }
  }

  const records = [];
  for (const searchItem of searchItemsById.values()) {
    const html = options.itemsById?.[searchItem.sourceRecordId] || (await fetchText(`${BASE_URL}/nodes/view/${encodeURIComponent(searchItem.sourceRecordId)}`, timeoutMs));
    const record = normalizeItem(html, searchItem, references);
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
    collectionUrl: BASE_URL,
    sourceApiUrl: searchUrl,
    summary: {
      total: records.length,
      searchedCandidates: searchItemsById.size,
      dishMentions: dishMentions.length,
      priceObservations: priceObservations.length,
      withDates: records.filter((record) => record.lowerYear || record.upperYear || record.year).length,
      withIiif: 0,
      withVenues: records.filter((record) => record.venueText).length,
      withAddress: 0,
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
    limit: Math.min(200, Math.max(1, Number(argValue(args, "limit", "100")) || 100)),
    timeoutMs: Math.max(5000, Number(argValue(args, "timeout-ms", "30000")) || 30000),
    maxPages: Math.max(1, Math.min(12, Number(argValue(args, "max-pages", "0")) || 0)) || undefined,
    dryRun: hasFlag(args, "dry-run"),
  };
}

async function main() {
  const output = await buildDenverSource(optionsFromArgs());
  console.log(
    [
      `Wrote ${output.summary.total.toLocaleString()} Denver external menu records`,
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
  buildDenverSource,
  cuisineTagsFor,
  dishSegmentsFor,
  isLikelyMenuRecord,
  normalizeItem,
  optionsFromArgs,
  parseDateRange,
  parseMetadataSpans,
  parseSearchResults,
  priceSegmentsFor,
  styleTagsFor,
  transportModeFor,
};
