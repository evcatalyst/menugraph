const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { cleanValue } = require("../docs/multisource");
const { extractPricesFromText, normalizePrice, contextForEntry } = require("../docs/price-utils");
const { dishTypeFor, ingredientTagsFor, normalizedDishName } = require("./local-enrichment");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const ENRICHMENT_DIR = path.join(DATA_DIR, "enrichment");
const EXTERNAL_SOURCE_DIR = path.join(ENRICHMENT_DIR, "external-sources");
const LEGACY_EXTERNAL_PATH = path.join(ENRICHMENT_DIR, "external-menu-records.json");
const VERSION = 1;

const TOPIC_SIGNALS = [
  { pattern: /\bseafood\b|\bfish\b|\boysters?\b|\bclams?\b|\bcrab\b|\blobster\b|\bshrimp\b/i, label: "seafood options", confidence: 0.46 },
  { pattern: /\bsteakhouse\b|\bsteak\b|\bbeef\b/i, label: "steak dishes", confidence: 0.44 },
  { pattern: /\bcocktails?\b|\bbar\b|\bbeverages?\b|\bdrinks?\b/i, label: "cocktails and beverages", confidence: 0.42 },
  { pattern: /\bairlines?\b|\bflight\b|\bjet clipper\b|\bpan america(?:n)?\b|\btwa\b/i, label: "airline meal service", confidence: 0.42 },
  { pattern: /\bwine\b|\bchampagne\b/i, label: "wine list", confidence: 0.44 },
  { pattern: /\bcoffee\b|\bcaf(?:e|a)?\b|\bespresso\b/i, label: "coffee service", confidence: 0.42 },
  { pattern: /\btea\b/i, label: "tea service", confidence: 0.4 },
  { pattern: /\bliquor\b|\bbeer\b|\bale\b|\btavern\b|\bcabaret\b/i, label: "beer and spirits", confidence: 0.4 },
  { pattern: /\bdelicatessen\b|\bdeli\b|\bsandwich(?:es)?\b/i, label: "sandwiches", confidence: 0.42 },
  { pattern: /\bburgers?\b/i, label: "burger dishes", confidence: 0.42 },
  { pattern: /\bpastr(?:y|ies)\b|\bbakery\b|\bpatisserie\b|\bpasticceria\b/i, label: "bakery and pastry", confidence: 0.4 },
  { pattern: /\bcreole\b|\bcajun\b/i, label: "creole dishes", confidence: 0.4 },
  { pattern: /\bbreakfasts?\b|\bbreakfast menu\b/i, label: "breakfast dishes", confidence: 0.34 },
  { pattern: /\blunch(?:es)?\b|\bluncheon\b/i, label: "lunch dishes", confidence: 0.32 },
  { pattern: /\bdinners?\b|\bdinner menu\b/i, label: "dinner dishes", confidence: 0.32 },
];

const INGREDIENT_LABEL_OVERRIDES = {
  coffee: "coffee service",
  tea: "tea service",
  wine: "wine list",
  beer: "beer list",
};

const CUISINE_DISH_LABELS = {
  "asian": "asian dishes",
  "asian american": "asian american dishes",
  "barbecue": "barbecue dishes",
  "belgian": "belgian dishes",
  "british": "british dishes",
  "chinese": "chinese dishes",
  "continental": "continental dishes",
  "creole": "creole dishes",
  "ethiopian": "ethiopian dishes",
  "french": "french dishes",
  "german": "german dishes",
  "greek": "greek dishes",
  "east indian": "indian dishes",
  "indian": "indian dishes",
  "italian": "italian dishes",
  "japanese": "japanese dishes",
  "latin": "latin american dishes",
  "mexican": "mexican dishes",
  "norwegian": "norwegian dishes",
  "seafood": "seafood options",
  "vegetarian": "vegetarian dishes",
};

const METADATA_FOOD_SIGNALS = [
  { pattern: /\bbagels?\b/i, label: "bagel dishes", confidence: 0.44 },
  { pattern: /\bbar-?b-?q\b|\bbbq\b|\bbarbecue\b/i, label: "barbecue dishes", confidence: 0.44 },
  { pattern: /\bbrunch\b/i, label: "brunch dishes", confidence: 0.36 },
  { pattern: /\bchildren'?s menu\b|\btiny tots?\b|\blittle folks\b/i, label: "children's meals", confidence: 0.34 },
  { pattern: /\b(?:east\s+indian|indian restaurants?|india house|indian cuisine)\b/i, label: "indian dishes", confidence: 0.38 },
  { pattern: /\bethiopian(?: restaurants?| cuisine)?\b/i, label: "ethiopian dishes", confidence: 0.38 },
  { pattern: /\b(?:cooking\s+greek|greek restaurants?|greek cuisine)\b/i, label: "greek dishes", confidence: 0.37 },
  { pattern: /\bice cream\b|\bsundaes?\b/i, label: "ice cream desserts", confidence: 0.4 },
  { pattern: /\bvegan\b/i, label: "vegan dishes", confidence: 0.38 },
  { pattern: /\bvegetarian\b|\bnatural food restaurants?\b/i, label: "vegetarian dishes", confidence: 0.38 },
  { pattern: /\bsoda fountain\b|\bsodas?\b/i, label: "soda fountain drinks", confidence: 0.36 },
  { pattern: /\bnorthwest fare\b|\bnorthwestern fare\b|\bpacific northwest fare\b/i, label: "pacific northwest dishes", confidence: 0.34 },
  { pattern: /\blibations?\b/i, label: "cocktails and beverages", confidence: 0.36 },
];

const EXPLICIT_METADATA_PRICE_TOKEN =
  /(?:US\$|\$|€|£)\s*\d|\b\d+(?:[.,]\d+)?\s*(?:¢|cents?|cts?\.?)\b|\b(?:frs?\.?|francs?|marks?|mk\.?)\s*\d|\b\d+(?:[.,]\d{1,2})?\s+dollars?\b/i;

const METADATA_PRICE_DENY =
  /\b(?:broken into|cash register|police|real estate|robbery|sold the property|taken|theft)\b|\b\d+(?:[.,]\d+)?\s+million\s+dollars?\b/i;

const METADATA_PRICE_ALLOW =
  /\b(?:breakfast|brunch|coupon|delivery|dinner|discount|drink|food|hamburgers?|ice cream|lunch|main order|menu|minimum order|per person|price|sundae|supper|table d'?hote|wine)\b/i;

function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

function argValue(args, name, fallback = null) {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function stableId(prefix, parts) {
  return `${prefix}:${crypto.createHash("sha1").update(parts.map((part) => cleanValue(part)).join("|")).digest("hex").slice(0, 16)}`;
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function countBy(records, getter) {
  const counts = {};
  for (const record of records || []) {
    const key = getter(record) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

function subjectText(subject) {
  if (!subject) return "";
  if (typeof subject === "string") return cleanValue(subject);
  return [subject.label, subject.label_with_role, ...(subject.variants || [])].map(cleanValue).filter(Boolean).join(" ");
}

function metadataText(record) {
  return [
    record.title,
    record.venueText,
    record.placeText,
    record.descriptionSummary,
    record.notes,
    ...(record.subjectTerms || record.subjects || []).map(subjectText),
    ...(record.cuisineTags || []),
    ...(record.styleTags || []),
  ]
    .map(cleanValue)
    .filter(Boolean)
    .join(" | ");
}

function normalizedIdPart(value) {
  return normalizedDishName(value).replace(/\s+/g, "-").slice(0, 96);
}

function menuIdForRecord(record) {
  return cleanValue(record.menuId || record.id || `${record.sourceKey || record.sourceId}:${record.sourceRecordId || record.id}`);
}

function sourceRecordId(record) {
  return cleanValue(record.sourceRecordId || String(record.id || "").split(":").slice(1).join(":") || record.id);
}

function makeDishMention(record, rawName, confidence, fileName, method = "external_metadata_topic_signal") {
  const normalizedName = normalizedDishName(rawName);
  if (!normalizedName) return null;
  const menuId = menuIdForRecord(record);
  const sourceId = cleanValue(record.sourceId);
  const sourceKey = cleanValue(record.sourceKey || sourceId);
  return {
    id: stableId("metadish", [menuId, normalizedName, method]),
    menuId,
    sourceId,
    sourceKey,
    rawName: cleanValue(rawName),
    normalizedName,
    canonicalDishId: `dish:${normalizedIdPart(rawName)}`,
    sectionName: "metadata topic signal",
    dishType: dishTypeFor(rawName),
    ingredientTags: ingredientTagsFor(rawName),
    extractionMethod: method,
    confidence,
    provenance: {
      sourceFile: fileName === "external-menu-records.json" ? "enrichment/external-menu-records.json" : `enrichment/external-sources/${fileName}`,
      sourceRecordId: sourceRecordId(record),
      rightsNote: "Derived from public source metadata only; no raw OCR, image bytes, or external LLM payloads.",
    },
  };
}

function metadataDishCandidates(record, options = {}) {
  const text = metadataText(record);
  const candidates = [];
  for (const signal of TOPIC_SIGNALS) {
    if (signal.pattern.test(text)) candidates.push({ rawName: signal.label, confidence: signal.confidence });
  }
  for (const signal of METADATA_FOOD_SIGNALS) {
    if (signal.pattern.test(text)) candidates.push({ rawName: signal.label, confidence: signal.confidence });
  }
  for (const tag of record.cuisineTags || []) {
    const normalizedTag = cleanValue(tag).toLowerCase();
    const label = CUISINE_DISH_LABELS[normalizedTag];
    if (label) candidates.push({ rawName: label, confidence: normalizedTag === "seafood" ? 0.46 : 0.35 });
  }
  const ingredientLimit = Math.max(0, Number(options.ingredientLimit || 2) || 0);
  const metadataIngredientTags = [
    ...new Set([...(record.ingredientTags || []), ...ingredientTagsFor(text)].map(cleanValue).filter(Boolean)),
  ].sort();
  for (const tag of metadataIngredientTags.slice(0, ingredientLimit)) {
    const rawName = INGREDIENT_LABEL_OVERRIDES[tag] || `${tag} dishes`;
    candidates.push({ rawName, confidence: 0.34 });
  }
  const seen = new Set();
  return candidates.filter((candidate) => {
    const normalized = normalizedDishName(candidate.rawName);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function mergeDishMentions(record, additions) {
  const existing = record.dishMentions || [];
  const seen = new Set(existing.map((dish) => normalizedDishName(dish.normalizedName || dish.rawName)));
  const merged = [...existing];
  for (const addition of additions) {
    const normalized = normalizedDishName(addition.normalizedName || addition.rawName);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(addition);
  }
  return merged;
}

function mergePriceObservations(record, additions) {
  const seen = new Set();
  const merged = [];
  for (const addition of [...(record.priceObservations || []), ...additions]) {
    const key = [normalizedDishName(addition.normalizedName || addition.rawName || addition.item), cleanValue(addition.rawPrice || addition.rawPriceText)].join("|");
    if (!key.trim() || seen.has(key)) continue;
    seen.add(key);
    merged.push(addition);
  }
  return collapseMetadataPriceDuplicates(merged);
}

function metadataPriceDuplicateKey(price) {
  if (price?.extractionMethod !== "external_metadata_price_regex") return "";
  const rawPrice = cleanValue(price.rawPrice || price.rawPriceText);
  if (!rawPrice) return "";
  const amount = Number(price.amount);
  return `${Number.isFinite(amount) ? amount : rawPrice}|${rawPrice.replace(/\s+/g, "").toLowerCase()}`;
}

function lowQualityMetadataPriceLabel(price) {
  const label = cleanValue(price.rawName || price.item || price.normalizedName);
  return /Restaurants--|Menu contains$|pre-payment|required to attend|listed prices fr|free delivery w\/|^\W*$/.test(label) || label.length > 72;
}

function metadataPriceLabelScore(price) {
  const label = cleanValue(price.rawName || price.item || price.normalizedName);
  let score = 100 - Math.min(80, label.length);
  if (/\b(?:coupon|delivery|dinner|drink|hamburgers?|martinis?|minimum order|sundae|supper|table d'?hote|wine)\b/i.test(label)) score += 35;
  if (lowQualityMetadataPriceLabel(price)) score -= 80;
  return score;
}

function collapseMetadataPriceDuplicates(prices) {
  const groups = new Map();
  const passthrough = [];
  for (const price of prices) {
    const key = metadataPriceDuplicateKey(price);
    if (!key) {
      passthrough.push(price);
      continue;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(price);
  }

  const collapsed = [...passthrough];
  for (const group of groups.values()) {
    if (group.length === 1 || !group.some(lowQualityMetadataPriceLabel)) {
      collapsed.push(...group);
      continue;
    }
    collapsed.push([...group].sort((a, b) => metadataPriceLabelScore(b) - metadataPriceLabelScore(a))[0]);
  }
  return collapsed;
}

function mergeIngredientTags(record, dishMentions, priceObservations) {
  return [
    ...new Set(
      [
        ...(record.ingredientTags || []),
        ...ingredientTagsFor(metadataText(record)),
        ...dishMentions.flatMap((dish) => dish.ingredientTags || []),
        ...priceObservations.flatMap((price) => price.ingredientTags || []),
      ]
        .map(cleanValue)
        .filter(Boolean)
    ),
  ].sort();
}

function metadataPriceText(record) {
  return metadataPriceLines(record).join("\n");
}

function explicitPriceOnly(record) {
  return EXPLICIT_METADATA_PRICE_TOKEN.test(metadataPriceText(record));
}

function addUniqueLine(lines, value) {
  const line = cleanValue(value);
  if (!line || lines.includes(line)) return;
  lines.push(line);
}

function priceTokenForLine(value) {
  const raw = cleanValue(value);
  const dollars = raw.match(/^(\d+(?:[.,]\d{1,2})?)\s+dollars?$/i);
  if (dollars) return `$${dollars[1].replace(",", ".")}`;
  return raw;
}

function priceTokensInLine(value) {
  const text = cleanValue(value);
  return [
    ...text.matchAll(/(?:US\$|\$|€|£)\s*\d+(?:[.,]\d{1,2})?|\b\d+(?:[.,]\d+)?\s*(?:¢|cents?|cts?\.?)\b|\b\d+(?:[.,]\d{1,2})?\s+dollars?\b/gi),
  ].map((match) => priceTokenForLine(match[0]).replace(/\s+/g, "").toLowerCase());
}

function sharesPriceToken(line, existingLines) {
  const tokens = priceTokensInLine(line);
  if (!tokens.length) return false;
  const existing = new Set(existingLines.flatMap(priceTokensInLine));
  return tokens.some((token) => existing.has(token));
}

function cleanSyntheticItemLabel(value) {
  return cleanValue(value)
    .replace(/^.*?\bnewspaper-style menu\s*(?:,|with)?\s*/i, "")
    .replace(/^.*?\billustrated menu\s*(?:,|with)?\s*/i, "")
    .replace(/^.*?\bmenu\s+with\s+/i, "")
    .replace(/^(?:with|and)\s+/i, "")
    .trim();
}

function syntheticMetadataPriceLines(text) {
  const source = cleanValue(text);
  const lines = [];

  const freeDelivery = source.match(/\bfree delivery\s+(\$\s*\d+(?:\.\d{1,2})?)\s*min(?:imum)?\.?/i);
  if (freeDelivery) addUniqueLine(lines, `minimum order for free delivery ${freeDelivery[1]}`);

  const couponDiscount = source.match(/\bmenu contains\s+(\$\s*\d+(?:\.\d{1,2})?)\s+discount coupon\b/i);
  if (couponDiscount) addUniqueLine(lines, `coupon discount ${couponDiscount[1]}`);

  const couponSpecial = source.match(/\b(\$\s*\d+(?:\.\d{1,2})?)\s+coupon special with main order\b/i);
  if (couponSpecial) addUniqueLine(lines, `main order coupon special ${couponSpecial[1]}`);

  const perPersonDinner = source.match(/\b(Special\s+Wine\s+and\s+Cigar\s+Dinner)\b[\s\S]{0,180}?(\$\s*\d+(?:\.\d{1,2})?)\s+per person\b/i);
  if (perPersonDinner) addUniqueLine(lines, `${perPersonDinner[1]} ${perPersonDinner[2]} per person`);

  const supperDance = source.match(/\b(Supper Dance)\b[\s\S]{0,160}?(\$\s*\d+(?:\.\d{1,2})?)\s+each[\s\S]{0,80}?\bincluding Supper\b/i);
  if (supperDance) addUniqueLine(lines, `${supperDance[1]} including supper ${supperDance[2]}`);

  const sundae = source.match(/\b([^.;|]{0,80}?\bsundae)\s*,?\s*(\$\s*\d+(?:\.\d{1,2})?)\b/i);
  if (sundae) addUniqueLine(lines, `${cleanSyntheticItemLabel(sundae[1])} ${sundae[2]}`);

  const tableDhote = source.match(/\b(Special\s+Table\s+D['’]?Hote dinners?)\s+for\s+(\$\s*\d+(?:\.\d{1,2})?)\b/i);
  if (tableDhote) addUniqueLine(lines, `${tableDhote[1]} ${tableDhote[2]}`);

  const roomDelivery = source.match(/\b(Delivery of food offered to room)\s+for\s+(\d+(?:[.,]\d+)?\s*cents?)\b/i);
  if (roomDelivery) addUniqueLine(lines, `${roomDelivery[1]} ${roomDelivery[2]}`);

  const range = source.match(
    /\b(hamburgers?)\b[\s\S]{0,120}?\branging in price from\s+(\d+(?:[.,]\d+)?\s*cents?|\$\s*\d+(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?\s+dollars?)\s+to\s+(\d+(?:[.,]\d+)?\s*cents?|\$\s*\d+(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?\s+dollars?)\b/i
  );
  if (range) {
    addUniqueLine(lines, `${range[1]} price range minimum ${priceTokenForLine(range[2])}`);
    addUniqueLine(lines, `${range[1]} price range maximum ${priceTokenForLine(range[3])}`);
  }

  return lines;
}

function splitMetadataPriceSegments(text) {
  return cleanValue(text)
    .split(/\s+\|\s+|\n+|;\s+|(?<=[.!?])\s+(?=["A-Z])/g)
    .map((segment) => cleanValue(segment.replace(/^["']+|["']+$/g, "")))
    .filter(Boolean);
}

function normalizedMetadataPriceLine(segment) {
  const line = cleanValue(segment);
  if (!EXPLICIT_METADATA_PRICE_TOKEN.test(line) || METADATA_PRICE_DENY.test(line)) return "";

  const synthetic = syntheticMetadataPriceLines(line);
  if (synthetic.length) return "";
  if (!METADATA_PRICE_ALLOW.test(line) || line.length > 160) return "";
  return line;
}

function metadataPriceLines(record) {
  const sourceText = [record.descriptionSummary, record.notes].map(cleanValue).filter(Boolean).join(" | ");
  const lines = [];
  if (!sourceText || METADATA_PRICE_DENY.test(sourceText)) {
    return lines;
  }
  for (const line of syntheticMetadataPriceLines(sourceText)) addUniqueLine(lines, line);
  for (const segment of splitMetadataPriceSegments(sourceText)) {
    const normalized = normalizedMetadataPriceLine(segment);
    if (normalized && !sharesPriceToken(normalized, lines)) addUniqueLine(lines, normalized);
  }
  return lines;
}

function makePriceObservation(record, extracted, references, contextEvents, fileName) {
  if (!/(explicit|cents)/i.test(cleanValue(extracted.scale))) return null;
  const rawName = cleanValue(extracted.item).replace(/^Representative dishes?:/i, "").replace(/^\(|\($/g, "").trim();
  if (!rawName || rawName.length < 3) return null;
  const normalizedName = normalizedDishName(rawName);
  const menuId = menuIdForRecord(record);
  const sourceId = cleanValue(record.sourceId);
  const sourceKey = cleanValue(record.sourceKey || sourceId);
  const priceRecord = {
    id: stableId("metaprice", [menuId, normalizedName, extracted.rawPrice, extracted.rawLine]),
    menuId,
    menuUid: menuId,
    sourceId,
    sourceKey,
    item: rawName,
    rawName,
    normalizedName,
    rawPrice: cleanValue(extracted.rawPrice),
    rawPriceText: cleanValue(extracted.rawPrice),
    amount: Number.isFinite(Number(extracted.amount)) ? Number(extracted.amount) : null,
    currency: cleanValue(extracted.currency),
    currencyCode: cleanValue(extracted.currency),
    year: record.year || record.pointYear || record.lowerYear || null,
    confidence: cleanValue(extracted.confidence || "medium"),
    scale: "external-metadata-explicit",
    dishType: dishTypeFor(rawName),
    ingredientTags: ingredientTagsFor(rawName),
    extractionMethod: "external_metadata_price_regex",
    provenance: {
      sourceFile: fileName === "external-menu-records.json" ? "enrichment/external-menu-records.json" : `enrichment/external-sources/${fileName}`,
      sourceRecordId: sourceRecordId(record),
      sourceApiUrl: cleanValue(record.sourceApiUrl),
      rightsNote: "Derived from public source metadata only; no raw OCR, image bytes, or external LLM payloads.",
    },
  };
  priceRecord.normalized = normalizePrice(priceRecord, references);
  priceRecord.context = contextForEntry(priceRecord, contextEvents);
  return priceRecord;
}

function metadataPriceObservations(record, references, contextEvents, fileName) {
  if (!explicitPriceOnly(record)) return [];
  const menu = {
    id: menuIdForRecord(record),
    title: cleanValue(record.title),
    country: cleanValue(record.country || "United States"),
    year: record.year || record.pointYear || record.lowerYear || null,
    decade: cleanValue(record.decade || "unknown"),
    sourceUrl: record.sourceUrl || record.itemUrl,
  };
  return extractPricesFromText(metadataPriceText(record), menu)
    .map((price) => makePriceObservation(record, price, references, contextEvents, fileName))
    .filter(Boolean);
}

function dishHintsFromMentions(dishMentions) {
  return dishMentions.map((dish) => ({
    rawName: dish.rawName,
    normalizedName: dish.normalizedName,
    dishType: dish.dishType,
    ingredientTags: dish.ingredientTags || [],
    confidence: dish.confidence,
  }));
}

function enrichExternalRecord(record, context = {}) {
  const fileName = context.fileName || "external-source.json";
  const additions = metadataDishCandidates(record, context.options)
    .map((candidate) => makeDishMention(record, candidate.rawName, candidate.confidence, fileName))
    .filter(Boolean);
  const priceAdditions = metadataPriceObservations(record, context.references || {}, context.contextEvents || [], fileName);
  const dishMentions = mergeDishMentions(record, additions);
  const priceObservations = mergePriceObservations(record, priceAdditions);
  const ingredientTags = mergeIngredientTags(record, dishMentions, priceObservations);
  return {
    ...record,
    dishMentions,
    dishHints: dishHintsFromMentions(dishMentions),
    priceObservations,
    ingredientTags,
    metadataEnrichment: {
      ...(record.metadataEnrichment || {}),
      version: VERSION,
      dishMentionsAdded: dishMentions.length - (record.dishMentions || []).length,
      priceObservationsAdded: priceObservations.length - (record.priceObservations || []).length,
      enrichedAt: context.generatedAt,
    },
  };
}

async function externalSourceFiles() {
  const sourceFiles = await fs
    .readdir(EXTERNAL_SOURCE_DIR)
    .then((files) => files.filter((file) => file.endsWith(".json")).map((file) => path.join(EXTERNAL_SOURCE_DIR, file)).sort())
    .catch(() => []);
  const files = [...sourceFiles];
  try {
    await fs.access(LEGACY_EXTERNAL_PATH);
    files.push(LEGACY_EXTERNAL_PATH);
  } catch (error) {
    // Legacy Northwestern snapshot is optional.
  }
  return files;
}

async function enrichPayloadFile(filePath, context) {
  const payload = await readJson(filePath, null);
  if (!payload?.records) return null;
  const fileName = path.basename(filePath);
  const generatedAt = context.generatedAt;
  let dishMentionsAdded = 0;
  let priceObservationsAdded = 0;
  const records = payload.records.map((record) => {
    const enriched = enrichExternalRecord(record, { ...context, fileName, generatedAt });
    dishMentionsAdded += enriched.metadataEnrichment.dishMentionsAdded;
    priceObservationsAdded += enriched.metadataEnrichment.priceObservationsAdded;
    return enriched;
  });
  const summary = {
    ...(payload.summary || {}),
    total: records.length,
    dishMentions: records.reduce((sum, record) => sum + (record.dishMentions || []).length, 0),
    priceObservations: records.reduce((sum, record) => sum + (record.priceObservations || []).length, 0),
    withDishHints: records.filter((record) => (record.dishMentions || []).length).length,
    withPrices: records.filter((record) => (record.priceObservations || []).length).length,
    ingredientTags: countBy(records.flatMap((record) => (record.ingredientTags || []).map((tag) => ({ tag }))), (record) => record.tag),
    metadataEnrichment: {
      version: VERSION,
      dishMentionsAdded,
      priceObservationsAdded,
      enrichedAt: generatedAt,
    },
  };
  return {
    filePath,
    fileName,
    payload: {
      ...payload,
      generatedAt,
      summary,
      records,
    },
    summary,
  };
}

async function enrichExternalMetadata(options = {}) {
  const generatedAt = new Date().toISOString();
  const [cpiUs, cpiCountry, contextEvents] = await Promise.all([
    readJson(path.join(DATA_DIR, "reference", "cpi-us.json"), {}),
    readJson(path.join(DATA_DIR, "reference", "cpi-country.json"), {}),
    readJson(path.join(DATA_DIR, "reference", "context-events.json"), []),
  ]);
  const files = await externalSourceFiles();
  const results = [];
  for (const filePath of files) {
    const result = await enrichPayloadFile(filePath, {
      generatedAt,
      references: { cpiUs, cpiCountry },
      contextEvents,
      options,
    });
    if (!result) continue;
    results.push(result);
    if (!options.dryRun) await writeJson(filePath, result.payload);
  }
  const summary = {
    version: VERSION,
    generatedAt,
    dryRun: Boolean(options.dryRun),
    files: results.length,
    records: results.reduce((sum, result) => sum + Number(result.summary.total || 0), 0),
    dishMentionsAdded: results.reduce((sum, result) => sum + Number(result.summary.metadataEnrichment?.dishMentionsAdded || 0), 0),
    priceObservationsAdded: results.reduce((sum, result) => sum + Number(result.summary.metadataEnrichment?.priceObservationsAdded || 0), 0),
    byFile: Object.fromEntries(
      results.map((result) => [
        result.fileName,
        {
          total: result.summary.total,
          dishMentions: result.summary.dishMentions,
          priceObservations: result.summary.priceObservations,
          dishMentionsAdded: result.summary.metadataEnrichment.dishMentionsAdded,
          priceObservationsAdded: result.summary.metadataEnrichment.priceObservationsAdded,
        },
      ])
    ),
  };
  return { summary, results };
}

function optionsFromArgs(args = process.argv.slice(2)) {
  return {
    dryRun: hasFlag(args, "dry-run"),
    ingredientLimit: Math.max(0, Number(argValue(args, "ingredient-limit", "2")) || 0),
  };
}

async function main() {
  const result = await enrichExternalMetadata(optionsFromArgs());
  console.log(
    [
      `Enriched ${result.summary.records.toLocaleString()} external metadata rows across ${result.summary.files.toLocaleString()} file(s)`,
      `${result.summary.dishMentionsAdded.toLocaleString()} dish mention(s) added`,
      `${result.summary.priceObservationsAdded.toLocaleString()} price observation(s) added`,
      result.summary.dryRun ? "dry run" : "written",
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
  enrichExternalMetadata,
  enrichExternalRecord,
  metadataPriceLines,
  metadataDishCandidates,
  metadataPriceObservations,
  optionsFromArgs,
};
