const fs = require("fs/promises");
const path = require("path");
const { cleanValue } = require("../docs/multisource");
const { VERSION: TAXONOMY_VERSION, dishTypeFor, ingredientTagsFor } = require("../docs/food-taxonomy");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const ENRICHMENT_DIR = path.join(DATA_DIR, "enrichment");
const EXTERNAL_SOURCE_DIR = path.join(ENRICHMENT_DIR, "external-sources");

function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
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

function textForRecord(record, extraText = "") {
  return [
    record?.rawName,
    record?.normalizedName,
    record?.item,
    record?.sectionName,
    record?.title,
    record?.descriptionSummary,
    record?.notes,
    extraText,
  ]
    .map(cleanValue)
    .filter(Boolean)
    .join(" ");
}

function mergeIngredientTags(...values) {
  return [...new Set(values.flat().map(cleanValue).filter(Boolean))].sort();
}

function retagDishRecord(record, extraText = "") {
  const recordText = textForRecord(record);
  const text = [recordText, extraText].map(cleanValue).filter(Boolean).join(" ");
  const recordType = dishTypeFor(recordText);
  const dishType = recordType !== "dish" ? recordType : dishTypeFor(text);
  return {
    ...record,
    dishType: dishType !== "dish" ? dishType : cleanValue(record.dishType || "dish"),
    ingredientTags: ingredientTagsFor(text),
  };
}

function retagPriceRecord(record, extraText = "") {
  const recordText = textForRecord(record);
  const text = [recordText, extraText].map(cleanValue).filter(Boolean).join(" ");
  const recordType = dishTypeFor(recordText);
  const dishType = recordType !== "dish" ? recordType : dishTypeFor(text);
  return {
    ...record,
    dishType: dishType !== "dish" ? dishType : cleanValue(record.dishType || "dish"),
    ingredientTags: ingredientTagsFor(text),
  };
}

function retagExternalMenuRecord(record) {
  const baseText = [
    record.title,
    record.venueText,
    record.placeText,
    record.descriptionSummary,
    record.notes,
    ...(record.cuisineTags || []),
    ...(record.subjectTerms || record.subjects || []),
    ...(record.styleTags || []),
  ]
    .map(cleanValue)
    .filter(Boolean)
    .join(" ");
  const dishMentions = (record.dishMentions || []).map((dish) => retagDishRecord(dish, baseText));
  const priceObservations = (record.priceObservations || []).map((price) => retagPriceRecord(price, baseText));
  const ingredientTags = mergeIngredientTags(
    ingredientTagsFor(baseText),
    dishMentions.flatMap((dish) => dish.ingredientTags || []),
    priceObservations.flatMap((price) => price.ingredientTags || [])
  );
  return {
    ...record,
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
  };
}

function retagDishPayload(payload) {
  const records = (payload.records || []).map((record) => retagDishRecord(record));
  return {
    ...payload,
    generatedAt: new Date().toISOString(),
    summary: {
      ...(payload.summary || {}),
      total: records.length,
      bySource: countBy(records, (record) => record.sourceKey),
      byType: countBy(records, (record) => record.dishType),
      ingredientTags: countBy(records.flatMap((record) => (record.ingredientTags || []).map((tag) => ({ tag }))), (record) => record.tag),
      taxonomyVersion: TAXONOMY_VERSION,
    },
    records,
  };
}

function retagPricePayload(payload) {
  const records = (payload.records || []).map((record) => retagPriceRecord(record));
  return {
    ...payload,
    generatedAt: new Date().toISOString(),
    summary: {
      ...(payload.summary || {}),
      total: records.length,
      bySource: countBy(records, (record) => record.sourceKey),
      ingredientTags: countBy(records.flatMap((record) => (record.ingredientTags || []).map((tag) => ({ tag }))), (record) => record.tag),
      taxonomyVersion: TAXONOMY_VERSION,
    },
    records,
  };
}

function retagExternalSourcePayload(payload) {
  const records = (payload.records || []).map(retagExternalMenuRecord);
  return {
    ...payload,
    generatedAt: new Date().toISOString(),
    summary: {
      ...(payload.summary || {}),
      total: records.length,
      dishMentions: records.reduce((sum, record) => sum + (record.dishMentions || []).length, 0),
      priceObservations: records.reduce((sum, record) => sum + (record.priceObservations || []).length, 0),
      withDishHints: records.filter((record) => (record.dishHints || []).length).length,
      ingredientTags: countBy(records.flatMap((record) => (record.ingredientTags || []).map((tag) => ({ tag }))), (record) => record.tag),
      taxonomyVersion: TAXONOMY_VERSION,
    },
    records,
  };
}

function retagStatusPayload(payload, dishPayload, pricePayload) {
  const dishRecords = dishPayload.records || [];
  const priceRecords = pricePayload.records || [];
  return {
    ...payload,
    retaggedAt: new Date().toISOString(),
    taxonomyVersion: TAXONOMY_VERSION,
    summary: {
      ...(payload.summary || {}),
      dishMentions: dishRecords.length,
      priceObservations: priceRecords.length,
      dishTypes: countBy(dishRecords, (record) => record.dishType),
      ingredientTags: countBy(dishRecords.flatMap((record) => (record.ingredientTags || []).map((tag) => ({ tag }))), (record) => record.tag),
      priceIngredientTags: countBy(priceRecords.flatMap((record) => (record.ingredientTags || []).map((tag) => ({ tag }))), (record) => record.tag),
    },
  };
}

async function retagEnrichment(options = {}) {
  const dishPath = path.join(ENRICHMENT_DIR, "dish-mentions.json");
  const pricePath = path.join(ENRICHMENT_DIR, "price-observations.json");
  const statusPath = path.join(DATA_DIR, "enrichment-status.json");
  const dishPayload = retagDishPayload(await readJson(dishPath, { records: [] }));
  const pricePayload = retagPricePayload(await readJson(pricePath, { records: [] }));
  const statusPayload = retagStatusPayload(await readJson(statusPath, { summary: {} }), dishPayload, pricePayload);

  const externalSources = [];
  const legacyExternalPath = path.join(ENRICHMENT_DIR, "external-menu-records.json");
  const legacyExternalPayload = await readJson(legacyExternalPath, null);
  if (legacyExternalPayload?.records?.length) {
    const retagged = retagExternalSourcePayload(legacyExternalPayload);
    externalSources.push({ fileName: "external-menu-records.json", filePath: legacyExternalPath, payload: retagged });
  }

  let sourceFiles = [];
  try {
    sourceFiles = (await fs.readdir(EXTERNAL_SOURCE_DIR)).filter((fileName) => fileName.endsWith(".json")).sort();
  } catch (error) {
    sourceFiles = [];
  }
  for (const fileName of sourceFiles) {
    const filePath = path.join(EXTERNAL_SOURCE_DIR, fileName);
    const payload = await readJson(filePath, null);
    if (!payload?.records) continue;
    const retagged = retagExternalSourcePayload(payload);
    externalSources.push({ fileName, filePath, payload: retagged });
  }

  if (!options.dryRun) {
    await writeJson(dishPath, dishPayload);
    await writeJson(pricePath, pricePayload);
    await writeJson(statusPath, statusPayload);
    for (const source of externalSources) {
      await writeJson(source.filePath, source.payload);
    }
  }

  return {
    taxonomyVersion: TAXONOMY_VERSION,
    dishSummary: dishPayload.summary,
    priceSummary: pricePayload.summary,
    externalSources: externalSources.map((source) => ({
      fileName: source.fileName,
      sourceId: source.payload.sourceId,
      summary: source.payload.summary,
    })),
  };
}

async function main() {
  const result = await retagEnrichment({ dryRun: hasFlag(process.argv.slice(2), "dry-run") });
  console.log(
    [
      `Retagged ${Number(result.dishSummary.total || 0).toLocaleString()} dish mentions`,
      `${Number(result.priceSummary.total || 0).toLocaleString()} price observations`,
      `${result.externalSources.length.toLocaleString()} external source files`,
      `taxonomy v${result.taxonomyVersion}`,
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
  retagDishRecord,
  retagEnrichment,
  retagExternalMenuRecord,
  retagExternalSourcePayload,
  retagPriceRecord,
};
