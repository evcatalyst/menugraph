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
  const existing = record.priceObservations || [];
  const seen = new Set(
    existing.map((price) => [normalizedDishName(price.normalizedName || price.rawName || price.item), cleanValue(price.rawPrice || price.rawPriceText)].join("|"))
  );
  const merged = [...existing];
  for (const addition of additions) {
    const key = [normalizedDishName(addition.normalizedName || addition.rawName || addition.item), cleanValue(addition.rawPrice || addition.rawPriceText)].join("|");
    if (!key.trim() || seen.has(key)) continue;
    seen.add(key);
    merged.push(addition);
  }
  return merged;
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
  return [record.descriptionSummary, record.notes, ...(record.dishHints || []).map((dish) => dish.rawName), ...(record.dishMentions || []).map((dish) => dish.rawName)]
    .map(cleanValue)
    .filter(Boolean)
    .join("\n");
}

function explicitPriceOnly(record) {
  return /\$|US\$|€|£|¢|\b(?:cents?|cts?\.?|francs?|frs?\.?|marks?|mk\.?)\b/i.test(metadataPriceText(record));
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
  metadataDishCandidates,
  metadataPriceObservations,
  optionsFromArgs,
};
