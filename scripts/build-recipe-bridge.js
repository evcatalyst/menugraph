const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { cleanValue } = require("../docs/multisource");
const { INGREDIENT_META, normalizeText } = require("../docs/food-taxonomy");
const { readEnrichmentPayload } = require("./enrichment-shards");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const ENRICHMENT_DIR = path.join(DATA_DIR, "enrichment");
const OUTPUT_PATH = path.join(ENRICHMENT_DIR, "recipe-bridge.json");
const VERSION = 1;
const DEFAULT_CLUSTER_LIMIT = 500;
const DEFAULT_DISH_LINK_LIMIT = 1600;
const RECIPE_SOURCE_IDS = [
  "the_sifter",
  "recipe1m_plus",
  "recipenlg",
  "foodcom_recipes_interactions",
  "epicurious_kaggle",
  "yummly_whats_cooking",
];

function argValue(args, name, fallback = null) {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function stableId(prefix, parts) {
  return `${prefix}:${crypto.createHash("sha1").update(parts.map((part) => cleanValue(part)).join("|")).digest("hex").slice(0, 16)}`;
}

function slug(value, fallback = "unknown") {
  return (normalizeText(value) || fallback).replace(/\s+/g, "-").slice(0, 96);
}

async function readJson(filePath, fallback = {}) {
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

async function readExternalMenuRecords() {
  const records = [];
  const seen = new Set();
  const append = (payload) => {
    for (const record of payload.records || []) {
      const id = cleanValue(record.menuId || record.id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      records.push(record);
    }
  };
  append(await readJson(path.join(ENRICHMENT_DIR, "external-menu-records.json"), { records: [] }));
  let files = [];
  try {
    files = (await fs.readdir(path.join(ENRICHMENT_DIR, "external-sources"))).filter((name) => name.endsWith(".json")).sort();
  } catch (error) {
    files = [];
  }
  for (const file of files) append(await readJson(path.join(ENRICHMENT_DIR, "external-sources", file), { records: [] }));
  return records;
}

async function menuYearIndex() {
  const [menusPayload, externalRecords] = await Promise.all([
    readJson(path.join(DATA_DIR, "menus.json"), { menus: [] }),
    readExternalMenuRecords(),
  ]);
  const byMenu = new Map();
  for (const menu of menusPayload.menus || menusPayload.records || []) {
    const sourceKey = cleanValue(menu.sourceKey || "cia");
    const sourceRecordId = cleanValue(menu.sourceRecordId || menu.pointer || menu.id);
    const menuId = cleanValue(menu.uid || `${sourceKey}:${sourceRecordId}`);
    const year = numberOrNull(menu.year);
    if (menuId && year) byMenu.set(menuId, year);
  }
  for (const record of externalRecords) {
    const menuId = cleanValue(record.menuId || record.id);
    const year = numberOrNull(record.year || record.pointYear || record.lowerYear);
    if (menuId && year) byMenu.set(menuId, year);
  }
  return byMenu;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function decadeForYear(year) {
  const number = Number(year);
  return Number.isFinite(number) && number > 0 ? `${Math.floor(number / 10) * 10}s` : "";
}

function ingredientCategories(tags = []) {
  const counts = new Map();
  for (const tag of tags) {
    const category = INGREDIENT_META?.[tag]?.category || "other";
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function techniqueTagsFor(name) {
  const normalized = normalizeText(name);
  const techniques = [
    ["fried", /\b(fried|saute|sauteed|frit|frite)\b/],
    ["broiled", /\b(broiled|grilled|grille)\b/],
    ["roasted", /\b(roast|roasted|roti|baked)\b/],
    ["boiled", /\b(boiled|bouilli|poached)\b/],
    ["creamed", /\b(cream|creamed|creme)\b/],
    ["stewed", /\b(stew|stewed|ragout|fricassee)\b/],
    ["salad", /\b(salad|slaw)\b/],
    ["soup", /\b(soup|consomme|bisque|chowder|potage)\b/],
    ["sauce", /\b(sauce|gravy|hollandaise|bearnaise|mayonnaise)\b/],
    ["raw", /\b(raw|on the half shell|ceviche)\b/],
  ];
  return techniques.filter(([, pattern]) => pattern.test(normalized)).map(([id]) => id);
}

function sourceCandidatesForCluster(cluster) {
  const candidates = [];
  const firstSeen = Number(cluster.firstSeenYear || 0);
  const hasNutritionSignal = cluster.ingredientTags.length >= 2 || cluster.priceObservationCount > 0;
  if (!firstSeen || firstSeen < 1950 || cluster.sourceKeys.has("cia")) {
    candidates.push({
      sourceId: "the_sifter",
      role: "historical_recipe_metadata",
      confidence: firstSeen && firstSeen < 1950 ? 0.82 : 0.7,
      reason: "Best provenance-safe bridge for historical cookbook and recipe metadata without storing full recipe text.",
    });
  }
  candidates.push({
    sourceId: "recipe1m_plus",
    role: "multimodal_recipe_similarity",
    confidence: 0.72,
    reason: "Use later for text-image recipe embeddings and modern equivalents.",
  });
  candidates.push({
    sourceId: "recipenlg",
    role: "semi_structured_recipe_text",
    confidence: 0.68,
    reason: "Use later for title, ingredient, and instruction-style clusters after rights review.",
  });
  if (cluster.observedDishMentionCount >= 5) {
    candidates.push({
      sourceId: "foodcom_recipes_interactions",
      role: "modern_popularity_and_variant_context",
      confidence: 0.62,
      reason: "Useful for modern recipe variants and user interaction priors, not direct historical claims.",
    });
  }
  if (hasNutritionSignal) {
    candidates.push({
      sourceId: "epicurious_kaggle",
      role: "nutrition_proxy",
      confidence: 0.58,
      reason: "Useful for coarse nutrition proxies on ingredient-rich clusters.",
    });
  }
  if (cluster.ingredientTags.length || cluster.dishType !== "dish") {
    candidates.push({
      sourceId: "yummly_whats_cooking",
      role: "cuisine_and_ingredient_classifier",
      confidence: 0.6,
      reason: "Useful for ingredient-to-cuisine classification features.",
    });
  }
  return candidates
    .filter((candidate, index, all) => all.findIndex((item) => item.sourceId === candidate.sourceId) === index)
    .slice(0, 6);
}

function clusterScore(cluster) {
  return (
    cluster.observedDishMentionCount * 2 +
    cluster.priceObservationCount * 4 +
    cluster.menuIds.size * 1.6 +
    cluster.sourceKeys.size * 8 +
    cluster.ingredientTags.length * 5 +
    (cluster.firstSeenYear && cluster.firstSeenYear < 1950 ? 16 : 0) +
    (cluster.firstSeenYear && cluster.firstSeenYear < 1900 ? 12 : 0) +
    (cluster.dishType && cluster.dishType !== "dish" ? 6 : 0)
  );
}

function ensureCluster(clusters, record) {
  const rawName = cleanValue(record.rawName || record.normalizedName);
  const normalized = normalizeText(record.normalizedName || rawName);
  if (!normalized || normalized.length < 3) return null;
  const canonicalDishId = cleanValue(record.canonicalDishId || `dish:${slug(normalized)}`);
  const clusterId = `recipecluster:${slug(normalized)}`;
  if (!clusters.has(clusterId)) {
    clusters.set(clusterId, {
      id: clusterId,
      canonicalDishId,
      canonicalName: rawName || normalized,
      aliases: new Set(),
      dishType: cleanValue(record.dishType || "dish"),
      ingredientTags: new Set(),
      techniqueTags: new Set(),
      menuIds: new Set(),
      sourceKeys: new Set(),
      decades: new Map(),
      representativeDishes: new Map(),
      observedDishMentionCount: 0,
      priceObservationCount: 0,
      firstSeenYear: null,
      lastSeenYear: null,
      confidenceSum: 0,
      confidenceCount: 0,
      provenanceIds: new Set(),
    });
  }
  return clusters.get(clusterId);
}

function observeYear(cluster, value) {
  const year = numberOrNull(value);
  if (!year) return;
  cluster.firstSeenYear = cluster.firstSeenYear ? Math.min(cluster.firstSeenYear, year) : year;
  cluster.lastSeenYear = cluster.lastSeenYear ? Math.max(cluster.lastSeenYear, year) : year;
  const decade = decadeForYear(year);
  if (decade) cluster.decades.set(decade, (cluster.decades.get(decade) || 0) + 1);
}

function observeDishRecord(clusters, record, menuYears = new Map()) {
  const cluster = ensureCluster(clusters, record);
  if (!cluster) return;
  const rawName = cleanValue(record.rawName || record.normalizedName);
  const menuId = cleanValue(record.menuId);
  cluster.observedDishMentionCount += 1;
  cluster.aliases.add(cleanValue(record.normalizedName || rawName));
  cluster.menuIds.add(menuId);
  cluster.sourceKeys.add(cleanValue(record.sourceKey || record.sourceId || "unknown"));
  for (const tag of record.ingredientTags || []) cluster.ingredientTags.add(cleanValue(tag));
  for (const technique of techniqueTagsFor(rawName)) cluster.techniqueTags.add(technique);
  if (record.dishType && cluster.dishType === "dish") cluster.dishType = cleanValue(record.dishType);
  cluster.representativeDishes.set(rawName, (cluster.representativeDishes.get(rawName) || 0) + 1);
  cluster.confidenceSum += Number(record.confidence || 0.5);
  cluster.confidenceCount += 1;
  cluster.provenanceIds.add(cleanValue(record.id));
  observeYear(cluster, record.year || menuYears.get(menuId));
}

function observePriceRecord(clusters, record, menuYears = new Map()) {
  const cluster = ensureCluster(clusters, {
    rawName: record.rawName || record.normalizedName,
    normalizedName: record.normalizedName || record.rawName,
    canonicalDishId: record.canonicalDishId,
    dishType: record.dishType,
    ingredientTags: record.ingredientTags,
  });
  if (!cluster) return;
  const menuId = cleanValue(record.menuId);
  cluster.priceObservationCount += 1;
  cluster.menuIds.add(menuId);
  cluster.sourceKeys.add(cleanValue(record.sourceKey || record.sourceId || "unknown"));
  for (const tag of record.ingredientTags || []) cluster.ingredientTags.add(cleanValue(tag));
  observeYear(cluster, record.year || menuYears.get(menuId));
}

function compactCluster(cluster) {
  const ingredientTags = [...cluster.ingredientTags].filter(Boolean).sort().slice(0, 12);
  const techniqueTags = [...cluster.techniqueTags].sort().slice(0, 8);
  const representativeDishes = [...cluster.representativeDishes.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));
  const confidence = cluster.confidenceCount ? cluster.confidenceSum / cluster.confidenceCount : 0.55;
  const compact = {
    id: cluster.id,
    canonicalDishId: cluster.canonicalDishId,
    canonicalName: cleanValue(representativeDishes[0]?.name || cluster.canonicalName),
    aliases: [...cluster.aliases].filter(Boolean).sort().slice(0, 8),
    dishType: cleanValue(cluster.dishType || "dish"),
    ingredientTags,
    ingredientCategories: ingredientCategories(ingredientTags),
    techniqueTags,
    firstSeenYear: cluster.firstSeenYear,
    lastSeenYear: cluster.lastSeenYear,
    decades: Object.fromEntries([...cluster.decades.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    observedDishMentionCount: cluster.observedDishMentionCount,
    priceObservationCount: cluster.priceObservationCount,
    menuCount: cluster.menuIds.size,
    menuIds: [...cluster.menuIds].filter(Boolean).sort().slice(0, 16),
    sourceKeys: [...cluster.sourceKeys].filter(Boolean).sort(),
    representativeDishes,
    sourceCandidates: [],
    confidence: Number(Math.max(0.2, Math.min(0.95, confidence)).toFixed(3)),
    rightsCategory: "derived_metadata_only",
    provenance: {
      sourceFile: "enrichment/dish-mentions.json + enrichment/price-observations.json",
      sourceRecordIds: [...cluster.provenanceIds].filter(Boolean).sort().slice(0, 12),
      method: "deterministic_menu_recipe_bridge",
    },
  };
  compact.sourceCandidates = sourceCandidatesForCluster({ ...compact, sourceKeys: cluster.sourceKeys });
  return compact;
}

function buildDishLinks(clusters, limit) {
  return clusters.slice(0, limit).map((cluster) => ({
    id: stableId("recipelink", [cluster.canonicalDishId, cluster.id]),
    canonicalDishId: cluster.canonicalDishId,
    recipeClusterId: cluster.id,
    relationType: "historical_menu_dish_to_recipe_cluster",
    confidence: Number(Math.min(0.92, 0.42 + Math.log10(Math.max(1, cluster.observedDishMentionCount)) * 0.18 + cluster.ingredientTags.length * 0.025).toFixed(3)),
    method: "deterministic_ingredient_and_name_bridge",
    evidence: {
      observedDishMentionCount: cluster.observedDishMentionCount,
      priceObservationCount: cluster.priceObservationCount,
      menuCount: cluster.menuCount,
      ingredientTags: cluster.ingredientTags.slice(0, 8),
      sourceKeys: cluster.sourceKeys,
    },
    provenance: {
      sourceFile: "enrichment/recipe-bridge.json",
      sourceRecordId: cluster.id,
    },
  }));
}

async function buildRecipeBridge(options = {}) {
  const generatedAt = new Date().toISOString();
  const clusterLimit = Math.max(10, Number(options.clusterLimit || DEFAULT_CLUSTER_LIMIT));
  const dishLinkLimit = Math.max(10, Number(options.dishLinkLimit || DEFAULT_DISH_LINK_LIMIT));
  const [dishMentions, priceObservations] = await Promise.all([
    readEnrichmentPayload(path.join(ENRICHMENT_DIR, "dish-mentions.json"), { records: [] }),
    readEnrichmentPayload(path.join(ENRICHMENT_DIR, "price-observations.json"), { records: [] }),
  ]);
  const menuYears = await menuYearIndex();
  const clusters = new Map();
  for (const record of dishMentions.records || []) observeDishRecord(clusters, record, menuYears);
  for (const record of priceObservations.records || []) observePriceRecord(clusters, record, menuYears);

  const rankedClusters = [...clusters.values()]
    .filter((cluster) => cluster.observedDishMentionCount >= 2 || cluster.priceObservationCount || cluster.ingredientTags.size)
    .map(compactCluster)
    .sort((a, b) => clusterScore({ ...b, menuIds: new Set(b.menuIds), sourceKeys: new Set(b.sourceKeys) }) - clusterScore({ ...a, menuIds: new Set(a.menuIds), sourceKeys: new Set(a.sourceKeys) }) || a.canonicalName.localeCompare(b.canonicalName));

  const selectedClusters = rankedClusters.slice(0, clusterLimit);
  const dishLinks = buildDishLinks(selectedClusters, dishLinkLimit);
  const ingredientCounts = new Map();
  const sourceCandidateCounts = new Map();
  for (const cluster of selectedClusters) {
    for (const tag of cluster.ingredientTags) ingredientCounts.set(tag, (ingredientCounts.get(tag) || 0) + 1);
    for (const candidate of cluster.sourceCandidates) sourceCandidateCounts.set(candidate.sourceId, (sourceCandidateCounts.get(candidate.sourceId) || 0) + 1);
  }

  const payload = {
    version: VERSION,
    generatedAt,
    summary: {
      totalCandidateClusters: rankedClusters.length,
      clusters: selectedClusters.length,
      dishLinks: dishLinks.length,
      menusRepresented: new Set(selectedClusters.flatMap((cluster) => cluster.menuIds)).size,
      priceLinkedClusters: selectedClusters.filter((cluster) => cluster.priceObservationCount).length,
      historicalClusters: selectedClusters.filter((cluster) => cluster.firstSeenYear && cluster.firstSeenYear < 1950).length,
      ingredientTags: ingredientCounts.size,
      sourceCandidates: Object.fromEntries([...sourceCandidateCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    },
    sources: RECIPE_SOURCE_IDS.map((sourceId) => ({
      sourceId,
      role: sourceId === "the_sifter" ? "historical_recipe_metadata" : sourceId === "epicurious_kaggle" ? "nutrition_proxy" : "modern_recipe_similarity",
      ingestionStatus: "bridge_target_only",
      rightsNote: "No recipe rows or full recipe text are stored in this static bridge.",
    })),
    ingredientIndex: Object.fromEntries([...ingredientCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 120)),
    clusters: selectedClusters,
    dishLinks,
  };
  if (!options.dryRun) await writeJson(OUTPUT_PATH, payload);
  return payload;
}

function optionsFromArgs(args = process.argv.slice(2)) {
  return {
    clusterLimit: Number(argValue(args, "cluster-limit", DEFAULT_CLUSTER_LIMIT)),
    dishLinkLimit: Number(argValue(args, "dish-link-limit", DEFAULT_DISH_LINK_LIMIT)),
    dryRun: args.includes("--dry-run"),
  };
}

if (require.main === module) {
  buildRecipeBridge(optionsFromArgs())
    .then((payload) => {
      console.log(JSON.stringify(payload.summary, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  VERSION,
  buildRecipeBridge,
  clusterScore,
  optionsFromArgs,
  sourceCandidatesForCluster,
  techniqueTagsFor,
};
