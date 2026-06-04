const fs = require("fs/promises");
const path = require("path");
const graphContract = require("../docs/graph-contract");
const { readEnrichmentPayload, readRecipeBridgePayload } = require("./enrichment-shards");

const DATA_DIR = path.join(__dirname, "..", "docs", "data");
const GRAPH_DIR = path.join(DATA_DIR, "graph");
const REFERENCE_DIR = path.join(DATA_DIR, "reference");
const VERSION = 1;
// Core is a browser-facing topology preview. Full per-menu evidence lives in
// evidence-index.json and menu-overlays/by-source shards.
const MAX_CORE_PRICE_NODES = 900;
const MAX_DISH_NODES = 800;
const MAX_TOPOLOGY_DISH_EDGES_PER_MENU = 2;
const MAX_ONTOLOGY_EDGES_PER_TERM = 20;
const SIZE_BUDGET_BYTES = graphContract.STATIC_ARTIFACT_BUDGET_BYTES;
const MAX_CORE_MENU_NODES = 1500;
const MAX_EXTERNAL_MENU_NODES = 500;
const MAX_INGREDIENT_TERMS = 120;
const MAX_DISH_EVIDENCE_INDEX = 7000;
const MAX_IMAGE_EVIDENCE_INDEX = 3000;
const MAX_OCR_CANDIDATE_INDEX = 1000;
const MAX_OCR_FAILURE_INDEX = 500;
const MAX_EXTERNAL_DISH_EDGES_PER_MENU = 3;
const MAX_RECIPE_CLUSTER_INDEX = 240;
const MAX_DISH_RECIPE_LINK_INDEX = 1600;
const MAX_RECIPE_CLUSTER_NODES = 90;
const MAX_RECIPE_INGREDIENT_EDGES = 4;
const MAX_RECIPE_SOURCE_EDGES = 120;
const MAX_INGREDIENT_TERM_ANALYTICS = 160;
const MAX_INGREDIENT_SOURCE_ANALYTICS = 240;
const MAX_INGREDIENT_DECADE_ANALYTICS = 180;
const MAX_INGREDIENT_DISH_TYPE_ANALYTICS = 140;
const MAX_INGREDIENT_PAIR_ANALYTICS = 220;
const MAX_PRICE_SOURCE_DECADE_ANALYTICS = 240;
const MAX_PRICE_DISH_TYPE_ANALYTICS = 180;
const MAX_PRICE_INGREDIENT_ANALYTICS = 220;
const MAX_PRICE_BAND_ANALYTICS = 180;
const MAX_PRICE_METHOD_ANALYTICS = 80;
const MAX_DISH_TERM_ANALYTICS = 320;
const MAX_DISH_SOURCE_ANALYTICS = 260;
const MAX_DISH_DECADE_ANALYTICS = 220;
const MAX_DISH_TYPE_SOURCE_ANALYTICS = 160;
const MAX_DISH_PRICE_LINK_ANALYTICS = 220;
const MAX_DISH_RECIPE_LINK_ANALYTICS = 180;
const MAX_ENRICHMENT_GAP_MENU_INDEX = 1600;
const MAX_ENRICHMENT_GAP_SOURCE_INDEX = 80;
const OVERLAY_SOURCE_SPLIT_THRESHOLD_BYTES = Math.floor(SIZE_BUDGET_BYTES * 0.65);
const OVERLAY_SUBSHARD_TARGET_BYTES = Math.floor(SIZE_BUDGET_BYTES * 0.35);

function cleanValue(value) {
  if (Array.isArray(value)) return value.map(cleanValue).filter(Boolean).join("; ");
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return cleanValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value, fallback = "unknown") {
  const normalized = normalizeText(value);
  return (normalized || fallback).replace(/\s+/g, "-").slice(0, 96);
}

function recordUid(menu) {
  if (menu?.uid) return cleanValue(menu.uid);
  const sourceKey = cleanValue(menu?.sourceKey || "cia");
  const id = cleanValue(menu?.sourceRecordId || menu?.pointer || menu?.id);
  return `${sourceKey}:${id}`;
}

function menuNodeId(menuOrId) {
  return `menu:${cleanValue(typeof menuOrId === "string" ? menuOrId : recordUid(menuOrId))}`;
}

function sourceIdForKey(sourceKey) {
  const key = cleanValue(sourceKey).toLowerCase();
  if (key === "cia") return "cia_menu_collection";
  if (key === "nypl") return "nypl_wotm";
  if (key === "tulane") return "tulane_louisiana_menu_collection";
  if (key === "unlv") return "unlv_menus_art_of_dining";
  return key ? `${slug(key)}_source` : "unknown_source";
}

function sourceNodeId(sourceId) {
  return `source:${sourceId}`;
}

function venueLabel(menu) {
  return cleanValue(menu.restaurant || [menu.title, menu.city, menu.country].filter(Boolean).join(", "));
}

function venueNodeId(label, menu) {
  const place = [menu?.city, menu?.state, menu?.country].map(cleanValue).filter(Boolean).join("-");
  return `venue:${slug(`${label}-${place || "unknown"}`)}`;
}

function dishNodeId(name) {
  return `dish:${slug(name)}`;
}

function termNodeId(term) {
  return `term:${slug(`${term.category}-${term.term || term.id}`)}`;
}

function recipeClusterNodeId(id) {
  return cleanValue(id).startsWith("recipecluster:") ? cleanValue(id) : `recipecluster:${slug(id)}`;
}

function priceNodeId(record, index) {
  return `price:${cleanValue(record.id || `${record.menuId || "menu"}:${slug(record.item || "item")}:${index}`)}`;
}

function dateEvidenceNodeId(record) {
  return `date:${cleanValue(record.menuId || record.menu_id || "unknown")}`;
}

function ingredientAnalyticsId(kind, parts) {
  return `ingredient:${kind}:${parts.map((part) => slug(part)).join(":")}`;
}

function priceAnalyticsId(kind, parts) {
  return `price:${kind}:${parts.map((part) => slug(part)).join(":")}`;
}

function dishAnalyticsId(kind, parts) {
  return `dishanalytics:${kind}:${parts.map((part) => slug(part)).join(":")}`;
}

function edgeId(type, parts) {
  return `edge:${type.toLowerCase()}:${parts.map((part) => cleanValue(part).replace(/\s+/g, "-")).join(":")}`;
}

function node(id, type, label, source, confidence, provenance, extra = {}) {
  return {
    id,
    type,
    label: cleanValue(label) || id,
    source: cleanValue(source) || "menugraph",
    confidence: Number(Number(confidence).toFixed(3)),
    provenance,
    ...extra,
  };
}

function edge(type, from, to, weight, confidence, provenance, extra = {}) {
  return {
    id: edgeId(type, [from, to, provenance?.sourceRecordId || provenance?.sourceFile || "graph"]),
    type,
    from,
    to,
    weight: Number(Number(weight).toFixed(3)),
    confidence: Number(Number(confidence).toFixed(3)),
    provenance,
    ...extra,
  };
}

async function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

async function readExternalMenuRecords() {
  const payloads = [];
  const legacyPath = path.join(DATA_DIR, "enrichment", "external-menu-records.json");
  const legacy = await readJson(legacyPath, null);
  if (legacy?.records?.length) {
    payloads.push({
      sourceFile: "enrichment/external-menu-records.json",
      payload: legacy,
    });
  }

  const sourceDir = path.join(DATA_DIR, "enrichment", "external-sources");
  let sourceFiles = [];
  try {
    sourceFiles = (await fs.readdir(sourceDir)).filter((name) => name.endsWith(".json")).sort();
  } catch (error) {
    sourceFiles = [];
  }
  for (const fileName of sourceFiles) {
    const payload = await readJson(path.join(sourceDir, fileName), null);
    if (payload?.records?.length) {
      payloads.push({
        sourceFile: `enrichment/external-sources/${fileName}`,
        payload,
      });
    }
  }

  const recordsById = new Map();
  const sources = {};
  for (const { sourceFile, payload } of payloads) {
    const sourceId = cleanValue(payload.sourceId || payload.sourceKey || path.basename(sourceFile, ".json"));
    if (sourceId) {
      sources[sourceId] = {
        sourceId,
        sourceKey: cleanValue(payload.sourceKey),
        sourceFile,
        generatedAt: payload.generatedAt || null,
        summary: payload.summary || {},
      };
    }
    for (const record of payload.records || []) {
      const id = cleanValue(record.menuId || record.id);
      if (!id) continue;
      recordsById.set(id, {
        ...record,
        provenance: {
          ...(record.provenance || {}),
          sourceFile: record.provenance?.sourceFile || sourceFile,
        },
      });
    }
  }

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    summary: {
      total: recordsById.size,
      sources: Object.keys(sources).length,
      bySource: Object.fromEntries(
        [...recordsById.values()]
          .reduce((counts, record) => {
            const key = cleanValue(record.sourceId || record.sourceKey || "external");
            counts.set(key, (counts.get(key) || 0) + 1);
            return counts;
          }, new Map())
          .entries()
      ),
    },
    sources,
    records: [...recordsById.values()],
  };
}

function addNode(map, next) {
  if (!next?.id || map.has(next.id)) return;
  map.set(next.id, next);
}

function addEdge(edges, next, seen) {
  if (!next?.id || seen.has(next.id)) return;
  seen.add(next.id);
  edges.push(next);
}

function scoreConfidence(menu) {
  if (menu?.sourceConfidence === "crowdsourced transcript") return 0.82;
  if (menu?.sourceConfidence === "source") return 0.78;
  return 0.65;
}

function priceConfidence(record) {
  const value = cleanValue(record.confidence).toLowerCase();
  if (value === "high") return 0.9;
  if (value === "medium") return 0.65;
  if (value === "low") return 0.35;
  return Number(record.score || 0.5);
}

function dateConfidence(record) {
  return { A: 0.96, B: 0.78, C: 0.58, D: 0.32, X: 0.05 }[record?.confidence] || 0.25;
}

function compactMenu(menu) {
  return {
    uid: recordUid(menu),
    sourceKey: cleanValue(menu.sourceKey || "cia"),
    year: menu.year || null,
    decade: cleanValue(menu.decade || "unknown"),
    title: cleanValue(menu.title),
    restaurant: cleanValue(menu.restaurant),
    place: [menu.city, menu.state, menu.country].map(cleanValue).filter(Boolean).join(", "),
    sourceRecordId: cleanValue(menu.sourceRecordId || menu.pointer || menu.id),
  };
}

function compactExternalMenu(record) {
  return {
    uid: cleanValue(record.menuId || record.id),
    sourceKey: cleanValue(record.sourceKey || "external"),
    sourceId: cleanValue(record.sourceId),
    sourceRecordId: cleanValue(record.sourceRecordId),
    year: record.year || null,
    lowerYear: record.lowerYear || null,
    upperYear: record.upperYear || null,
    pointYear: record.pointYear || null,
    decade: cleanValue(record.decade || "unknown"),
    title: cleanValue(record.title),
    restaurant: cleanValue(record.venueText),
    place: cleanValue(record.placeText),
    transportMode: cleanValue(record.transportMode),
    itemUrl: cleanValue(record.itemUrl || record.sourceUrl),
    iiifManifestUrl: cleanValue(record.iiifManifestUrl),
  };
}

function buildSourceCapabilities(evaluations, generatedAt) {
  const nodes = [];
  const edges = [];
  const seenEdges = new Set();

  for (const source of evaluations.sources || []) {
    nodes.push(
      node(sourceNodeId(source.id), "Source", source.label, "source-evaluations", 0.95, {
        sourceFile: "reference/source-evaluations.json",
        sourceId: source.id,
      }, {
        scores: source.scores,
        sourceKey: source.sourceKey || null,
      })
    );
  }

  for (const capability of evaluations.capabilities || []) {
    nodes.push(
      node(`capability:${capability.id}`, "Capability", capability.label, "source-evaluations", 0.95, {
        sourceFile: "reference/source-evaluations.json",
        capabilityId: capability.id,
      })
    );
  }

  for (const source of evaluations.sources || []) {
    for (const [capability, weight] of Object.entries(source.capabilityWeights || {})) {
      addEdge(
        edges,
        edge("SUPPORTS_CAPABILITY", sourceNodeId(source.id), `capability:${capability}`, Number(weight) / 10, 0.86, {
          sourceFile: "reference/source-evaluations.json",
          sourceId: source.id,
          capabilityId: capability,
          scores: source.scores,
        }),
        seenEdges
      );
    }
  }

  return {
    version: VERSION,
    generatedAt,
    summary: {
      sources: (evaluations.sources || []).length,
      capabilities: (evaluations.capabilities || []).length,
      edges: edges.length,
    },
    nodes,
    edges,
  };
}

function addSourceNodes(coreNodes, evaluations) {
  for (const source of evaluations.sources || []) {
    addNode(
      coreNodes,
      node(sourceNodeId(source.id), "Source", source.label, "source-evaluations", 0.95, {
        sourceFile: "reference/source-evaluations.json",
        sourceId: source.id,
      }, {
        scores: source.scores,
        sourceKey: source.sourceKey || null,
      })
    );
  }
}

function enrichmentRecords(enrichment, key) {
  return enrichment?.[key]?.records || [];
}

function externalSourceFile(record) {
  return cleanValue(record?.provenance?.sourceFile || record?.sourceFile || "enrichment/external-menu-records.json");
}

function compactEvidenceText(value, maxLength = 120) {
  return cleanValue(value).slice(0, maxLength);
}

function compactPriceEvidence(fields) {
  return {
    id: cleanValue(fields.id),
    menuId: cleanValue(fields.menuId),
    sourceId: compactEvidenceText(fields.sourceId, 80),
    item: compactEvidenceText(fields.item),
    rawPrice: compactEvidenceText(fields.rawPrice, 48),
    amount: Number.isFinite(Number(fields.amount)) ? Number(fields.amount) : null,
    currency: compactEvidenceText(fields.currency, 24),
    year: fields.year || null,
    confidence: compactEvidenceText(fields.confidence || "unknown", 24),
    method: compactEvidenceText(fields.method, 64),
    external: Boolean(fields.external) || undefined,
  };
}

function compactDishEvidence(fields) {
  return {
    id: cleanValue(fields.id),
    menuId: cleanValue(fields.menuId),
    sourceId: compactEvidenceText(fields.sourceId, 80),
    rawName: compactEvidenceText(fields.rawName),
    normalizedName: compactEvidenceText(fields.normalizedName),
    dishType: compactEvidenceText(fields.dishType, 64),
    method: compactEvidenceText(fields.method, 64),
  };
}

function topObjectEntries(map, limit = 8) {
  return Object.fromEntries(
    [...(map || new Map()).entries()]
      .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0) || String(a[0]).localeCompare(String(b[0])))
      .slice(0, limit)
  );
}

function incrementMap(map, key, amount = 1) {
  const cleanKey = cleanValue(key);
  if (!cleanKey) return;
  map.set(cleanKey, Number(map.get(cleanKey) || 0) + Number(amount || 1));
}

function decadeFromYear(year) {
  const value = Number(year);
  return Number.isFinite(value) && value > 0 ? `${Math.floor(value / 10) * 10}s` : "";
}

function evidenceDecade(value, year = null) {
  const text = cleanValue(value);
  if (text && text.toLowerCase() !== "unknown") return text;
  return decadeFromYear(year) || "unknown";
}

function numericOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function quantile(values, q) {
  const sorted = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function roundedNumber(value, digits = 2) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(digits));
}

function priceBand(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return "unknown";
  if (value < 0.25) return "under_0.25";
  if (value < 0.5) return "0.25_to_0.49";
  if (value < 1) return "0.50_to_0.99";
  if (value < 2) return "1.00_to_1.99";
  if (value < 5) return "2.00_to_4.99";
  if (value < 10) return "5.00_to_9.99";
  return "10_plus";
}

function compactRecipeClusterEvidence(cluster) {
  return {
    id: cleanValue(cluster.id),
    canonicalDishId: cleanValue(cluster.canonicalDishId),
    canonicalName: compactEvidenceText(cluster.canonicalName),
    dishType: compactEvidenceText(cluster.dishType, 64),
    ingredientTags: (cluster.ingredientTags || []).slice(0, 10).map(cleanValue).filter(Boolean),
    techniqueTags: (cluster.techniqueTags || []).slice(0, 8).map(cleanValue).filter(Boolean),
    firstSeenYear: cluster.firstSeenYear || null,
    lastSeenYear: cluster.lastSeenYear || null,
    observedDishMentionCount: Number(cluster.observedDishMentionCount || 0),
    priceObservationCount: Number(cluster.priceObservationCount || 0),
    menuCount: Number(cluster.menuCount || 0),
    sourceCandidates: (cluster.sourceCandidates || []).slice(0, 6).map((candidate) => ({
      sourceId: cleanValue(candidate.sourceId),
      role: compactEvidenceText(candidate.role, 80),
      confidence: Number(candidate.confidence || 0),
    })),
    confidence: Number(cluster.confidence || 0),
  };
}

function menuMetadataIndex(menus, externalMenus) {
  const index = new Map();
  const set = (key, meta) => {
    const cleanKey = cleanValue(key);
    if (!cleanKey || index.has(cleanKey)) return;
    index.set(cleanKey, meta);
  };

  for (const menu of menus || []) {
    const uid = recordUid(menu);
    const sourceKey = cleanValue(menu.sourceKey || "cia");
    const meta = {
      menuId: uid,
      sourceKey,
      sourceId: sourceIdForKey(sourceKey),
      year: menu.year || null,
      decade: evidenceDecade(menu.decade, menu.year),
    };
    set(uid, meta);
    set(menu.uid, meta);
    set(menu.id, meta);
    set(menu.sourceRecordId, meta);
    set(menu.pointer, meta);
    if (sourceKey === "cia") set(`cia:${menu.id || menu.pointer || menu.sourceRecordId}`, meta);
  }

  for (const record of externalMenus || []) {
    const uid = cleanValue(record.menuId || record.id);
    const sourceKey = cleanValue(record.sourceKey || "external");
    const sourceId = cleanValue(record.sourceId) || sourceIdForKey(sourceKey);
    const year = record.year || record.pointYear || record.lowerYear || null;
    const meta = {
      menuId: uid,
      sourceKey,
      sourceId,
      year,
      decade: evidenceDecade(record.decade, year),
    };
    set(uid, meta);
    set(record.id, meta);
    set(record.sourceRecordId, meta);
  }

  return index;
}

function sortedIngredientTags(tags) {
  return [...new Set((tags || []).map(cleanValue).filter(Boolean))].sort();
}

function defaultIngredientStats(term) {
  return {
    ingredient: term,
    occurrenceCount: 0,
    dishMentionCount: 0,
    priceObservationCount: 0,
    recipeClusterCount: 0,
    menuIds: new Set(),
    sources: new Map(),
    decades: new Map(),
    dishTypes: new Map(),
  };
}

function defaultGroupedIngredientStats(parts) {
  return {
    ...parts,
    count: 0,
    menuIds: new Set(),
    dishMentionCount: 0,
    priceObservationCount: 0,
  };
}

function countIngredientObservation(context) {
  const { analytics, tags, menuId, sourceId, decade, dishType, evidenceKind } = context;
  if (!tags.length) return;

  for (const ingredient of tags) {
    const term = analytics.terms.get(ingredient) || defaultIngredientStats(ingredient);
    term.occurrenceCount += 1;
    if (evidenceKind === "dish") term.dishMentionCount += 1;
    if (evidenceKind === "price") term.priceObservationCount += 1;
    if (evidenceKind === "recipe") term.recipeClusterCount += 1;
    if (menuId) term.menuIds.add(menuId);
    incrementMap(term.sources, sourceId || "unknown_source");
    incrementMap(term.decades, decade || "unknown");
    incrementMap(term.dishTypes, dishType || "dish");
    analytics.terms.set(ingredient, term);

    const sourceKey = `${sourceId || "unknown_source"}|${ingredient}`;
    const sourceRow =
      analytics.bySource.get(sourceKey) ||
      defaultGroupedIngredientStats({
        sourceId: sourceId || "unknown_source",
        ingredient,
      });
    sourceRow.count += 1;
    if (menuId) sourceRow.menuIds.add(menuId);
    if (evidenceKind === "dish") sourceRow.dishMentionCount += 1;
    if (evidenceKind === "price") sourceRow.priceObservationCount += 1;
    analytics.bySource.set(sourceKey, sourceRow);

    const decadeKey = `${decade || "unknown"}|${ingredient}`;
    const decadeRow =
      analytics.byDecade.get(decadeKey) ||
      defaultGroupedIngredientStats({
        decade: decade || "unknown",
        ingredient,
      });
    decadeRow.count += 1;
    if (menuId) decadeRow.menuIds.add(menuId);
    if (evidenceKind === "dish") decadeRow.dishMentionCount += 1;
    if (evidenceKind === "price") decadeRow.priceObservationCount += 1;
    analytics.byDecade.set(decadeKey, decadeRow);

    const dishTypeKey = `${dishType || "dish"}|${ingredient}`;
    const dishTypeRow =
      analytics.byDishType.get(dishTypeKey) ||
      defaultGroupedIngredientStats({
        dishType: dishType || "dish",
        ingredient,
      });
    dishTypeRow.count += 1;
    if (menuId) dishTypeRow.menuIds.add(menuId);
    if (evidenceKind === "dish") dishTypeRow.dishMentionCount += 1;
    if (evidenceKind === "price") dishTypeRow.priceObservationCount += 1;
    analytics.byDishType.set(dishTypeKey, dishTypeRow);
  }

  for (let left = 0; left < tags.length; left += 1) {
    for (let right = left + 1; right < tags.length; right += 1) {
      const pair = [tags[left], tags[right]].sort();
      const pairKey = pair.join("|");
      const pairRow =
        analytics.pairs.get(pairKey) ||
        defaultGroupedIngredientStats({
          ingredients: pair,
        });
      pairRow.count += 1;
      if (menuId) pairRow.menuIds.add(menuId);
      if (evidenceKind === "dish") pairRow.dishMentionCount += 1;
      if (evidenceKind === "price") pairRow.priceObservationCount += 1;
      analytics.pairs.set(pairKey, pairRow);
    }
  }
}

function rankedRows(map, limit, score = (row) => row.count) {
  const rowSortLabel = (row) => {
    if (row.ingredient) return row.ingredient;
    if (Array.isArray(row.ingredients)) return row.ingredients.join(" ");
    if (row.sourceId) return row.sourceId;
    if (row.decade) return row.decade;
    if (row.dishType) return row.dishType;
    if (row.method) return row.method;
    if (row.band) return row.band;
    return "";
  };
  return [...map.values()]
    .sort((a, b) => Number(score(b)) - Number(score(a)) || cleanValue(rowSortLabel(a)).localeCompare(cleanValue(rowSortLabel(b))))
    .slice(0, limit);
}

function buildIngredientAnalytics({ menus, enrichment, recipeBridge }) {
  const externalMenus = enrichmentRecords(enrichment, "externalMenuRecords");
  const menuMeta = menuMetadataIndex(menus, externalMenus);
  const analytics = {
    terms: new Map(),
    bySource: new Map(),
    byDecade: new Map(),
    byDishType: new Map(),
    pairs: new Map(),
  };

  const metaFor = (record) => {
    const uid = cleanValue(record.menuId || record.menuUid || record.id);
    const meta = menuMeta.get(uid) || {};
    const sourceKey = cleanValue(record.sourceKey || meta.sourceKey || "unknown");
    return {
      menuId: uid || cleanValue(meta.menuId),
      sourceKey,
      sourceId: cleanValue(record.sourceId || meta.sourceId || sourceIdForKey(sourceKey)),
      decade: evidenceDecade(record.decade || meta.decade, record.year || meta.year),
    };
  };

  for (const record of enrichmentRecords(enrichment, "dishMentions")) {
    const meta = metaFor(record);
    countIngredientObservation({
      analytics,
      tags: sortedIngredientTags(record.ingredientTags),
      menuId: meta.menuId,
      sourceId: meta.sourceId,
      decade: meta.decade,
      dishType: cleanValue(record.dishType || "dish"),
      evidenceKind: "dish",
    });
  }

  for (const record of enrichmentRecords(enrichment, "priceObservations")) {
    const meta = metaFor(record);
    countIngredientObservation({
      analytics,
      tags: sortedIngredientTags(record.ingredientTags),
      menuId: meta.menuId,
      sourceId: meta.sourceId,
      decade: meta.decade,
      dishType: cleanValue(record.dishType || "dish"),
      evidenceKind: "price",
    });
  }

  for (const record of externalMenus) {
    const meta = metaFor(record);
    const baseTags = sortedIngredientTags(record.ingredientTags);
    if (baseTags.length) {
      countIngredientObservation({
        analytics,
        tags: baseTags,
        menuId: meta.menuId,
        sourceId: meta.sourceId,
        decade: meta.decade,
        dishType: "menu",
        evidenceKind: "dish",
      });
    }
    for (const dish of record.dishMentions || record.dishHints || []) {
      countIngredientObservation({
        analytics,
        tags: sortedIngredientTags(dish.ingredientTags),
        menuId: meta.menuId,
        sourceId: meta.sourceId,
        decade: meta.decade,
        dishType: cleanValue(dish.dishType || "dish"),
        evidenceKind: "dish",
      });
    }
    for (const price of record.priceObservations || []) {
      countIngredientObservation({
        analytics,
        tags: sortedIngredientTags(price.ingredientTags),
        menuId: meta.menuId,
        sourceId: meta.sourceId,
        decade: meta.decade,
        dishType: cleanValue(price.dishType || "dish"),
        evidenceKind: "price",
      });
    }
  }

  for (const cluster of recipeBridge?.clusters || []) {
    countIngredientObservation({
      analytics,
      tags: sortedIngredientTags(cluster.ingredientTags),
      menuId: "",
      sourceId: "recipe_bridge",
      decade: evidenceDecade("", cluster.firstSeenYear),
      dishType: cleanValue(cluster.dishType || "recipe_cluster"),
      evidenceKind: "recipe",
    });
  }

  const records = {};
  const addRecord = (record) => {
    if (!record?.id || records[record.id]) return;
    records[record.id] = record;
  };

  for (const term of rankedRows(analytics.terms, MAX_INGREDIENT_TERM_ANALYTICS, (row) => row.occurrenceCount + row.menuIds.size * 2 + row.priceObservationCount * 2)) {
    addRecord({
      id: ingredientAnalyticsId("term", [term.ingredient]),
      type: "ingredient_term_summary",
      ingredient: term.ingredient,
      occurrenceCount: term.occurrenceCount,
      menuCount: term.menuIds.size,
      dishMentionCount: term.dishMentionCount,
      priceObservationCount: term.priceObservationCount,
      recipeClusterCount: term.recipeClusterCount,
      topSources: topObjectEntries(term.sources, 8),
      topDecades: topObjectEntries(term.decades, 8),
      topDishTypes: topObjectEntries(term.dishTypes, 8),
      confidence: 0.72,
      provenance: {
        sourceFile: "enrichment/dish-mentions.json + enrichment/price-observations.json + enrichment/recipe-bridge.json",
        method: "storage_light_ingredient_rollup",
      },
    });
  }

  for (const row of rankedRows(analytics.bySource, MAX_INGREDIENT_SOURCE_ANALYTICS, (item) => item.count + item.menuIds.size * 2 + item.priceObservationCount * 2)) {
    addRecord({
      id: ingredientAnalyticsId("source", [row.sourceId, row.ingredient]),
      type: "ingredient_by_source",
      ingredient: row.ingredient,
      sourceId: row.sourceId,
      count: row.count,
      menuCount: row.menuIds.size,
      dishMentionCount: row.dishMentionCount,
      priceObservationCount: row.priceObservationCount,
      confidence: 0.68,
      provenance: {
        sourceFile: "enrichment/dish-mentions.json + enrichment/price-observations.json",
        method: "storage_light_source_ingredient_rollup",
      },
    });
  }

  for (const row of rankedRows(analytics.byDecade, MAX_INGREDIENT_DECADE_ANALYTICS, (item) => item.count + item.menuIds.size * 2 + item.priceObservationCount * 2)) {
    addRecord({
      id: ingredientAnalyticsId("decade", [row.decade, row.ingredient]),
      type: "ingredient_by_decade",
      ingredient: row.ingredient,
      decade: row.decade,
      count: row.count,
      menuCount: row.menuIds.size,
      dishMentionCount: row.dishMentionCount,
      priceObservationCount: row.priceObservationCount,
      confidence: 0.64,
      provenance: {
        sourceFile: "enrichment/dish-mentions.json + enrichment/price-observations.json",
        method: "storage_light_decade_ingredient_rollup",
      },
    });
  }

  for (const row of rankedRows(analytics.byDishType, MAX_INGREDIENT_DISH_TYPE_ANALYTICS, (item) => item.count + item.menuIds.size + item.priceObservationCount * 2)) {
    addRecord({
      id: ingredientAnalyticsId("dish-type", [row.dishType, row.ingredient]),
      type: "ingredient_by_dish_type",
      ingredient: row.ingredient,
      dishType: row.dishType,
      count: row.count,
      menuCount: row.menuIds.size,
      dishMentionCount: row.dishMentionCount,
      priceObservationCount: row.priceObservationCount,
      confidence: 0.66,
      provenance: {
        sourceFile: "enrichment/dish-mentions.json + enrichment/price-observations.json",
        method: "storage_light_dish_type_ingredient_rollup",
      },
    });
  }

  for (const row of rankedRows(analytics.pairs, MAX_INGREDIENT_PAIR_ANALYTICS, (item) => item.count + item.menuIds.size * 2 + item.priceObservationCount * 2)) {
    addRecord({
      id: ingredientAnalyticsId("pair", row.ingredients),
      type: "ingredient_pair",
      ingredients: row.ingredients,
      count: row.count,
      menuCount: row.menuIds.size,
      dishMentionCount: row.dishMentionCount,
      priceObservationCount: row.priceObservationCount,
      confidence: 0.6,
      provenance: {
        sourceFile: "enrichment/dish-mentions.json + enrichment/price-observations.json",
        method: "storage_light_ingredient_pair_rollup",
      },
    });
  }

  return records;
}

function defaultPriceStats(parts) {
  return {
    ...parts,
    count: 0,
    menuIds: new Set(),
    rawAmounts: [],
    todayUsdAmounts: [],
    highConfidenceCount: 0,
    sourceStructuredCount: 0,
    localOcrCount: 0,
    ingredients: new Map(),
    dishTypes: new Map(),
    sources: new Map(),
    decades: new Map(),
    methods: new Map(),
  };
}

function priceConfidenceScore(record) {
  const score = numericOrNull(record.confidenceScore || record.score);
  if (score !== null) return score;
  const confidence = cleanValue(record.confidence).toLowerCase();
  if (confidence === "high") return 0.9;
  if (confidence === "medium") return 0.65;
  if (confidence === "low") return 0.35;
  return 0.5;
}

function priceRecordAmount(record) {
  return numericOrNull(record.amount ?? record.rawAmount ?? record.rawPriceAmount);
}

function normalizedTodayUsd(record) {
  const value = numericOrNull(record.normalized?.todayUsd ?? record.todayUsd);
  return value && value > 0 ? value : null;
}

function updatePriceStats(row, observation) {
  row.count += 1;
  if (observation.menuId) row.menuIds.add(observation.menuId);
  if (observation.amount !== null) row.rawAmounts.push(observation.amount);
  if (observation.todayUsd !== null) row.todayUsdAmounts.push(observation.todayUsd);
  if (observation.confidenceScore >= 0.8) row.highConfidenceCount += 1;
  if (/structured|nypl/i.test(observation.method)) row.sourceStructuredCount += 1;
  if (/ocr/i.test(observation.method)) row.localOcrCount += 1;
  for (const tag of observation.ingredientTags) incrementMap(row.ingredients, tag);
  incrementMap(row.dishTypes, observation.dishType || "dish");
  incrementMap(row.sources, observation.sourceId || "unknown_source");
  incrementMap(row.decades, observation.decade || "unknown");
  incrementMap(row.methods, observation.method || "unknown");
}

function compactPriceAnalyticsRecord(base, row, confidence = 0.68) {
  const rawAmounts = row.rawAmounts || [];
  const todayUsdAmounts = row.todayUsdAmounts || [];
  return {
    ...base,
    count: row.count,
    menuCount: row.menuIds.size,
    medianAmount: roundedNumber(quantile(rawAmounts, 0.5)),
    p10Amount: roundedNumber(quantile(rawAmounts, 0.1)),
    p90Amount: roundedNumber(quantile(rawAmounts, 0.9)),
    minAmount: roundedNumber(rawAmounts.length ? Math.min(...rawAmounts) : null),
    maxAmount: roundedNumber(rawAmounts.length ? Math.max(...rawAmounts) : null),
    medianTodayUsd: roundedNumber(quantile(todayUsdAmounts, 0.5)),
    highConfidenceCount: row.highConfidenceCount,
    sourceStructuredCount: row.sourceStructuredCount,
    localOcrCount: row.localOcrCount,
    topIngredients: topObjectEntries(row.ingredients, 8),
    topDishTypes: topObjectEntries(row.dishTypes, 8),
    topSources: topObjectEntries(row.sources, 8),
    topDecades: topObjectEntries(row.decades, 8),
    topMethods: topObjectEntries(row.methods, 6),
    confidence,
    provenance: {
      sourceFile: "enrichment/price-observations.json + enrichment/external-menu-records.json",
      method: "storage_light_price_rollup",
    },
  };
}

function buildPriceAnalytics({ menus, enrichment }) {
  const externalMenus = enrichmentRecords(enrichment, "externalMenuRecords");
  const menuMeta = menuMetadataIndex(menus, externalMenus);
  const groups = {
    bySourceDecade: new Map(),
    byDishType: new Map(),
    byIngredient: new Map(),
    byBand: new Map(),
    byMethod: new Map(),
  };

  const metaFor = (record) => {
    const uid = cleanValue(record.menuId || record.menuUid || record.id);
    const meta = menuMeta.get(uid) || {};
    const sourceKey = cleanValue(record.sourceKey || meta.sourceKey || "unknown");
    return {
      menuId: uid || cleanValue(meta.menuId),
      sourceKey,
      sourceId: cleanValue(record.sourceId || meta.sourceId || sourceIdForKey(sourceKey)),
      decade: evidenceDecade(record.decade || meta.decade, record.year || meta.year),
    };
  };

  const addObservation = (record, fallback = {}) => {
    const amount = priceRecordAmount(record);
    if (amount === null || amount <= 0) return;
    const meta = metaFor({ ...fallback, ...record });
    const currency = cleanValue(record.currencyCode || record.currency || fallback.currency || "unknown");
    const method = cleanValue(record.extractionMethod || record.method || record.priceScale || fallback.method || "price_observation");
    const dishType = cleanValue(record.dishType || fallback.dishType || "dish");
    const ingredientTags = sortedIngredientTags(record.ingredientTags || fallback.ingredientTags);
    const observation = {
      menuId: meta.menuId,
      sourceId: meta.sourceId,
      decade: meta.decade,
      currency,
      method,
      dishType,
      ingredientTags,
      amount,
      todayUsd: normalizedTodayUsd(record),
      confidenceScore: priceConfidenceScore(record),
      band: priceBand(amount),
    };

    const sourceDecadeKey = `${observation.sourceId}|${observation.decade}|${currency}`;
    const sourceDecadeRow =
      groups.bySourceDecade.get(sourceDecadeKey) ||
      defaultPriceStats({
        type: "price_by_source_decade",
        sourceId: observation.sourceId,
        decade: observation.decade,
        currency,
      });
    updatePriceStats(sourceDecadeRow, observation);
    groups.bySourceDecade.set(sourceDecadeKey, sourceDecadeRow);

    const dishTypeKey = `${dishType}|${observation.decade}|${currency}`;
    const dishTypeRow =
      groups.byDishType.get(dishTypeKey) ||
      defaultPriceStats({
        type: "price_by_dish_type",
        dishType,
        decade: observation.decade,
        currency,
      });
    updatePriceStats(dishTypeRow, observation);
    groups.byDishType.set(dishTypeKey, dishTypeRow);

    for (const ingredient of ingredientTags.length ? ingredientTags : ["unknown"]) {
      const ingredientKey = `${ingredient}|${observation.decade}|${currency}`;
      const ingredientRow =
        groups.byIngredient.get(ingredientKey) ||
        defaultPriceStats({
          type: "price_by_ingredient",
          ingredient,
          decade: observation.decade,
          currency,
        });
      updatePriceStats(ingredientRow, observation);
      groups.byIngredient.set(ingredientKey, ingredientRow);
    }

    const bandKey = `${observation.band}|${observation.decade}|${currency}`;
    const bandRow =
      groups.byBand.get(bandKey) ||
      defaultPriceStats({
        type: "price_band_by_decade",
        band: observation.band,
        decade: observation.decade,
        currency,
      });
    updatePriceStats(bandRow, observation);
    groups.byBand.set(bandKey, bandRow);

    const methodKey = `${method}|${observation.sourceId}|${currency}`;
    const methodRow =
      groups.byMethod.get(methodKey) ||
      defaultPriceStats({
        type: "price_method_summary",
        method,
        sourceId: observation.sourceId,
        currency,
      });
    updatePriceStats(methodRow, observation);
    groups.byMethod.set(methodKey, methodRow);
  };

  for (const record of enrichmentRecords(enrichment, "priceObservations")) addObservation(record);
  for (const record of externalMenus) {
    for (const price of record.priceObservations || []) {
      addObservation(price, {
        menuId: cleanValue(record.menuId || record.id),
        sourceKey: cleanValue(record.sourceKey),
        sourceId: cleanValue(record.sourceId),
        decade: record.decade,
        year: record.year || record.pointYear || record.lowerYear,
      });
    }
  }

  const records = {};
  const addRecord = (record) => {
    if (!record?.id || records[record.id]) return;
    records[record.id] = record;
  };
  const rank = (row) => row.count + row.menuIds.size * 2 + row.highConfidenceCount + row.sourceStructuredCount * 0.5;

  for (const row of rankedRows(groups.bySourceDecade, MAX_PRICE_SOURCE_DECADE_ANALYTICS, rank)) {
    addRecord(
      compactPriceAnalyticsRecord(
        {
          id: priceAnalyticsId("source-decade", [row.sourceId, row.decade, row.currency]),
          type: row.type,
          sourceId: row.sourceId,
          decade: row.decade,
          currency: row.currency,
        },
        row,
        0.72
      )
    );
  }

  for (const row of rankedRows(groups.byDishType, MAX_PRICE_DISH_TYPE_ANALYTICS, rank)) {
    addRecord(
      compactPriceAnalyticsRecord(
        {
          id: priceAnalyticsId("dish-type", [row.dishType, row.decade, row.currency]),
          type: row.type,
          dishType: row.dishType,
          decade: row.decade,
          currency: row.currency,
        },
        row,
        0.68
      )
    );
  }

  for (const row of rankedRows(groups.byIngredient, MAX_PRICE_INGREDIENT_ANALYTICS, rank)) {
    addRecord(
      compactPriceAnalyticsRecord(
        {
          id: priceAnalyticsId("ingredient", [row.ingredient, row.decade, row.currency]),
          type: row.type,
          ingredient: row.ingredient,
          decade: row.decade,
          currency: row.currency,
        },
        row,
        0.66
      )
    );
  }

  for (const row of rankedRows(groups.byBand, MAX_PRICE_BAND_ANALYTICS, rank)) {
    addRecord(
      compactPriceAnalyticsRecord(
        {
          id: priceAnalyticsId("band", [row.band, row.decade, row.currency]),
          type: row.type,
          band: row.band,
          decade: row.decade,
          currency: row.currency,
        },
        row,
        0.62
      )
    );
  }

  for (const row of rankedRows(groups.byMethod, MAX_PRICE_METHOD_ANALYTICS, rank)) {
    addRecord(
      compactPriceAnalyticsRecord(
        {
          id: priceAnalyticsId("method", [row.method, row.sourceId, row.currency]),
          type: row.type,
          method: row.method,
          sourceId: row.sourceId,
          currency: row.currency,
        },
        row,
        0.7
      )
    );
  }

  return records;
}

function defaultDishStats(parts) {
  return {
    ...parts,
    count: 0,
    menuIds: new Set(),
    dishMentionCount: 0,
    priceObservationCount: 0,
    recipeClusterCount: 0,
    rawAmounts: [],
    todayUsdAmounts: [],
    highConfidenceCount: 0,
    ingredients: new Map(),
    sources: new Map(),
    decades: new Map(),
    dishTypes: new Map(),
    methods: new Map(),
    rawNames: new Map(),
  };
}

function normalizedDishKey(record = {}) {
  return normalizeText(record.normalizedName || record.rawName || record.item || record.canonicalName || record.name || record.label);
}

function displayDishName(record = {}, fallback = "") {
  return cleanValue(record.rawName || record.canonicalName || record.normalizedName || record.item || fallback);
}

function updateDishStats(row, observation) {
  row.count += 1;
  if (observation.menuId) row.menuIds.add(observation.menuId);
  if (observation.kind === "dish") row.dishMentionCount += 1;
  if (observation.kind === "price") row.priceObservationCount += 1;
  if (observation.kind === "recipe") row.recipeClusterCount += 1;
  if (observation.amount !== null) row.rawAmounts.push(observation.amount);
  if (observation.todayUsd !== null) row.todayUsdAmounts.push(observation.todayUsd);
  if (observation.confidenceScore >= 0.8) row.highConfidenceCount += 1;
  for (const tag of observation.ingredientTags) incrementMap(row.ingredients, tag);
  incrementMap(row.sources, observation.sourceId || "unknown_source");
  incrementMap(row.decades, observation.decade || "unknown");
  incrementMap(row.dishTypes, observation.dishType || "dish");
  incrementMap(row.methods, observation.method || "unknown");
  incrementMap(row.rawNames, observation.displayName || observation.normalizedName);
}

function compactDishAnalyticsRecord(base, row, confidence = 0.68) {
  const rawAmounts = row.rawAmounts || [];
  const todayUsdAmounts = row.todayUsdAmounts || [];
  const topNames = topObjectEntries(row.rawNames, 5);
  return {
    ...base,
    count: row.count,
    menuCount: row.menuIds.size,
    dishMentionCount: row.dishMentionCount,
    priceObservationCount: row.priceObservationCount,
    recipeClusterCount: row.recipeClusterCount,
    medianAmount: roundedNumber(quantile(rawAmounts, 0.5)),
    medianTodayUsd: roundedNumber(quantile(todayUsdAmounts, 0.5)),
    highConfidenceCount: row.highConfidenceCount,
    topNames,
    topIngredients: topObjectEntries(row.ingredients, 8),
    topSources: topObjectEntries(row.sources, 8),
    topDecades: topObjectEntries(row.decades, 8),
    topDishTypes: topObjectEntries(row.dishTypes, 8),
    topMethods: topObjectEntries(row.methods, 6),
    confidence,
    provenance: {
      sourceFile: "enrichment/dish-mentions.json + enrichment/price-observations.json + enrichment/recipe-bridge.json",
      method: "storage_light_dish_rollup",
    },
  };
}

function buildDishAnalytics({ menus, enrichment, recipeBridge }) {
  const externalMenus = enrichmentRecords(enrichment, "externalMenuRecords");
  const menuMeta = menuMetadataIndex(menus, externalMenus);
  const groups = {
    terms: new Map(),
    bySource: new Map(),
    byDecade: new Map(),
    byTypeSource: new Map(),
    priceLinked: new Map(),
    recipeLinked: new Map(),
  };

  const metaFor = (record) => {
    const uid = cleanValue(record.menuId || record.menuUid || record.id);
    const meta = menuMeta.get(uid) || {};
    const sourceKey = cleanValue(record.sourceKey || meta.sourceKey || "unknown");
    return {
      menuId: uid || cleanValue(meta.menuId),
      sourceKey,
      sourceId: cleanValue(record.sourceId || meta.sourceId || sourceIdForKey(sourceKey)),
      decade: evidenceDecade(record.decade || meta.decade, record.year || meta.year),
    };
  };

  const addObservation = (record, fallback = {}) => {
    const normalizedName = normalizedDishKey(record) || normalizedDishKey(fallback);
    if (!normalizedName) return;
    const meta = metaFor({ ...fallback, ...record });
    const dishType = cleanValue(record.dishType || fallback.dishType || "dish");
    const ingredientTags = sortedIngredientTags(record.ingredientTags || fallback.ingredientTags);
    const method = cleanValue(record.extractionMethod || record.method || fallback.method || "dish_observation");
    const amount = priceRecordAmount(record);
    const observation = {
      normalizedName,
      displayName: displayDishName(record, normalizedName),
      menuId: meta.menuId,
      sourceId: meta.sourceId,
      decade: meta.decade,
      dishType,
      ingredientTags,
      method,
      kind: cleanValue(fallback.kind || record.kind || "dish"),
      amount,
      todayUsd: normalizedTodayUsd(record),
      confidenceScore: priceConfidenceScore(record),
    };

    const termRow =
      groups.terms.get(normalizedName) ||
      defaultDishStats({
        type: "dish_term_summary",
        normalizedName,
        canonicalDishId: dishNodeId(normalizedName),
      });
    updateDishStats(termRow, observation);
    groups.terms.set(normalizedName, termRow);

    const sourceKey = `${observation.sourceId}|${normalizedName}`;
    const sourceRow =
      groups.bySource.get(sourceKey) ||
      defaultDishStats({
        type: "dish_by_source",
        sourceId: observation.sourceId,
        normalizedName,
      });
    updateDishStats(sourceRow, observation);
    groups.bySource.set(sourceKey, sourceRow);

    const decadeKey = `${observation.decade}|${normalizedName}`;
    const decadeRow =
      groups.byDecade.get(decadeKey) ||
      defaultDishStats({
        type: "dish_by_decade",
        decade: observation.decade,
        normalizedName,
      });
    updateDishStats(decadeRow, observation);
    groups.byDecade.set(decadeKey, decadeRow);

    const typeSourceKey = `${dishType}|${observation.sourceId}`;
    const typeSourceRow =
      groups.byTypeSource.get(typeSourceKey) ||
      defaultDishStats({
        type: "dish_type_by_source",
        dishType,
        sourceId: observation.sourceId,
      });
    updateDishStats(typeSourceRow, observation);
    groups.byTypeSource.set(typeSourceKey, typeSourceRow);

    if (observation.kind === "price" && observation.amount !== null) {
      const priceKey = `${normalizedName}|${observation.decade}`;
      const priceRow =
        groups.priceLinked.get(priceKey) ||
        defaultDishStats({
          type: "price_linked_dish",
          normalizedName,
          decade: observation.decade,
        });
      updateDishStats(priceRow, observation);
      groups.priceLinked.set(priceKey, priceRow);
    }

    if (observation.kind === "recipe") {
      const recipeRow =
        groups.recipeLinked.get(normalizedName) ||
        defaultDishStats({
          type: "recipe_linked_dish",
          normalizedName,
          canonicalDishId: dishNodeId(normalizedName),
        });
      updateDishStats(recipeRow, observation);
      groups.recipeLinked.set(normalizedName, recipeRow);
    }
  };

  for (const record of enrichmentRecords(enrichment, "dishMentions")) addObservation(record, { kind: "dish" });
  for (const record of enrichmentRecords(enrichment, "priceObservations")) addObservation(record, { kind: "price" });
  for (const record of externalMenus) {
    const fallback = {
      menuId: cleanValue(record.menuId || record.id),
      sourceKey: cleanValue(record.sourceKey),
      sourceId: cleanValue(record.sourceId),
      decade: record.decade,
      year: record.year || record.pointYear || record.lowerYear,
    };
    for (const dish of record.dishMentions || record.dishHints || []) addObservation(dish, { ...fallback, kind: "dish" });
    for (const price of record.priceObservations || []) addObservation(price, { ...fallback, kind: "price" });
  }
  for (const cluster of recipeBridge?.clusters || []) {
    addObservation(cluster, {
      kind: "recipe",
      method: "recipe_bridge_cluster",
      ingredientTags: cluster.ingredientTags,
      dishType: cluster.dishType,
      year: cluster.firstSeenYear,
    });
  }

  const records = {};
  const addRecord = (record) => {
    if (!record?.id || records[record.id]) return;
    records[record.id] = record;
  };
  const rank = (row) => row.count + row.menuIds.size * 2 + row.priceObservationCount * 2 + row.recipeClusterCount;

  for (const row of rankedRows(groups.terms, MAX_DISH_TERM_ANALYTICS, rank)) {
    addRecord(
      compactDishAnalyticsRecord(
        {
          id: dishAnalyticsId("term", [row.normalizedName]),
          type: row.type,
          normalizedName: row.normalizedName,
          canonicalDishId: row.canonicalDishId,
        },
        row,
        0.72
      )
    );
  }

  for (const row of rankedRows(groups.bySource, MAX_DISH_SOURCE_ANALYTICS, rank)) {
    addRecord(
      compactDishAnalyticsRecord(
        {
          id: dishAnalyticsId("source", [row.sourceId, row.normalizedName]),
          type: row.type,
          sourceId: row.sourceId,
          normalizedName: row.normalizedName,
        },
        row,
        0.68
      )
    );
  }

  for (const row of rankedRows(groups.byDecade, MAX_DISH_DECADE_ANALYTICS, rank)) {
    addRecord(
      compactDishAnalyticsRecord(
        {
          id: dishAnalyticsId("decade", [row.decade, row.normalizedName]),
          type: row.type,
          decade: row.decade,
          normalizedName: row.normalizedName,
        },
        row,
        0.64
      )
    );
  }

  for (const row of rankedRows(groups.byTypeSource, MAX_DISH_TYPE_SOURCE_ANALYTICS, rank)) {
    addRecord(
      compactDishAnalyticsRecord(
        {
          id: dishAnalyticsId("type-source", [row.dishType, row.sourceId]),
          type: row.type,
          dishType: row.dishType,
          sourceId: row.sourceId,
        },
        row,
        0.66
      )
    );
  }

  for (const row of rankedRows(groups.priceLinked, MAX_DISH_PRICE_LINK_ANALYTICS, rank)) {
    addRecord(
      compactDishAnalyticsRecord(
        {
          id: dishAnalyticsId("price-linked", [row.decade, row.normalizedName]),
          type: row.type,
          decade: row.decade,
          normalizedName: row.normalizedName,
        },
        row,
        0.66
      )
    );
  }

  for (const row of rankedRows(groups.recipeLinked, MAX_DISH_RECIPE_LINK_ANALYTICS, rank)) {
    addRecord(
      compactDishAnalyticsRecord(
        {
          id: dishAnalyticsId("recipe-linked", [row.normalizedName]),
          type: row.type,
          normalizedName: row.normalizedName,
          canonicalDishId: row.canonicalDishId,
        },
        row,
        0.62
      )
    );
  }

  return records;
}

function enrichmentGapId(kind, parts) {
  return `gap:${kind}:${parts.map((part) => slug(part)).join(":")}`;
}

function gapPriorityBand(score) {
  if (score >= 34) return "critical";
  if (score >= 22) return "high";
  if (score >= 12) return "medium";
  return "low";
}

function bestOcrCandidateByMenu(enrichment) {
  const byMenu = new Map();
  for (const record of enrichmentRecords(enrichment, "ocrTriage")) {
    const uid = cleanValue(record.menuId);
    if (!uid) continue;
    const current = byMenu.get(uid);
    if (!current || Number(record.priorityScore || 0) > Number(current.priorityScore || 0)) byMenu.set(uid, record);
  }
  return byMenu;
}

function ocrFailureCountByMenu(enrichment) {
  const counts = new Map();
  for (const record of enrichmentRecords(enrichment, "ocrFailures")) {
    const uid = cleanValue(record.menuId);
    if (!uid) continue;
    counts.set(uid, (counts.get(uid) || 0) + 1);
  }
  return counts;
}

function menuGapMetadata(menus, externalMenus) {
  const rows = [];
  for (const menu of menus || []) {
    const uid = recordUid(menu);
    const sourceKey = cleanValue(menu.sourceKey || "cia");
    rows.push({
      menuId: uid,
      sourceKey,
      sourceId: sourceIdForKey(sourceKey),
      title: cleanValue(menu.title || menu.restaurant || uid),
      year: menu.year || null,
      decade: evidenceDecade(menu.decade, menu.year),
      placeText: cleanValue([menu.city, menu.state, menu.country].filter(Boolean).join(", ")),
      external: false,
      sourceFile: "menus.json",
    });
  }
  for (const record of externalMenus || []) {
    const uid = cleanValue(record.menuId || record.id);
    if (!uid) continue;
    const sourceKey = cleanValue(record.sourceKey || "external");
    const sourceId = cleanValue(record.sourceId) || sourceIdForKey(sourceKey);
    const year = record.year || record.pointYear || record.lowerYear || null;
    rows.push({
      menuId: uid,
      sourceKey,
      sourceId,
      title: cleanValue(record.title || record.venueText || uid),
      year,
      decade: evidenceDecade(record.decade, year),
      placeText: cleanValue(record.placeText),
      external: true,
      sourceFile: externalSourceFile(record),
    });
  }
  return rows;
}

function recommendedGapAction(missing, candidate, storageOk, counts) {
  if (candidate?.id) return storageOk ? "run_local_ocr" : "free_disk_then_local_ocr";
  if (missing.includes("price") && Number(counts.imageFeatures || 0) > 0) return "price_ocr_pass";
  if (missing.includes("dish") || missing.includes("ingredient")) return "metadata_dish_hint_pass";
  if (missing.includes("image")) return "source_image_route_review";
  return "monitor";
}

function gapPriorityScore({ missing, meta, counts, candidate, failureCount }) {
  let score = 0;
  if (missing.includes("price")) score += 12;
  if (missing.includes("dish")) score += 8;
  if (missing.includes("ingredient")) score += 6;
  if (missing.includes("image")) score += 3;
  if (meta.sourceId === "cia_menu_collection" && (!meta.year || meta.decade === "unknown")) score += 8;
  if (meta.sourceId === "nypl_wotm" && missing.includes("price")) score += 7;
  if (meta.external && (missing.includes("price") || missing.includes("dish"))) score += 5;
  if (Number(counts.dateEvidence || 0) > 0) score += 2;
  if (Number(counts.matches || 0) > 0) score += 2;
  if (candidate) score += Math.min(12, Number(candidate.priorityScore || 0) / 8) + Math.min(6, Number(candidate.valueScore || 0) / 10);
  if (failureCount) score -= Math.min(6, failureCount * 2);
  return roundedNumber(Math.max(1, score));
}

function buildEnrichmentGaps({ menus, enrichment, overlays }) {
  const externalMenus = enrichmentRecords(enrichment, "externalMenuRecords");
  const candidatesByMenu = bestOcrCandidateByMenu(enrichment);
  const failuresByMenu = ocrFailureCountByMenu(enrichment);
  const storageOk = Boolean(enrichment.runPlan?.summary?.storageOk);
  const records = {};
  const sourceStats = new Map();
  const menuRows = [];

  for (const meta of menuGapMetadata(menus, externalMenus)) {
    const overlay = overlays[meta.menuId];
    if (!overlay) continue;
    const counts = overlay.counts || {};
    const missing = [];
    if (!Number(counts.dishMentions || 0)) missing.push("dish");
    if (!Number(counts.priceObservations || 0)) missing.push("price");
    if (!Number(counts.ingredientTags || 0)) missing.push("ingredient");
    if (!Number(counts.imageFeatures || 0)) missing.push("image");
    if (!missing.length) continue;

    const candidate = candidatesByMenu.get(meta.menuId);
    const failureCount = failuresByMenu.get(meta.menuId) || 0;
    const priorityScore = gapPriorityScore({ missing, meta, counts, candidate, failureCount });
    const recommendedAction = recommendedGapAction(missing, candidate, storageOk, counts);
    const row = {
      id: enrichmentGapId("menu", [meta.menuId]),
      type: "menu_enrichment_gap",
      menuId: meta.menuId,
      sourceId: meta.sourceId,
      sourceKey: meta.sourceKey,
      title: compactEvidenceText(meta.title, 120),
      year: meta.year || null,
      decade: meta.decade || "unknown",
      placeText: compactEvidenceText(meta.placeText, 120),
      external: Boolean(meta.external),
      missing,
      counts: {
        dishMentions: Number(counts.dishMentions || 0),
        priceObservations: Number(counts.priceObservations || 0),
        ingredientTags: Number(counts.ingredientTags || 0),
        imageFeatures: Number(counts.imageFeatures || 0),
        dateEvidence: Number(counts.dateEvidence || 0),
        matches: Number(counts.matches || 0),
        ocrCandidates: Number(counts.ocrCandidates || 0),
        ocrFailures: Number(counts.ocrFailures || failureCount || 0),
        recipeClusters: Number(counts.recipeClusters || 0),
      },
      priorityScore,
      priorityBand: gapPriorityBand(priorityScore),
      recommendedAction,
      route: candidate?.route ? cleanValue(candidate.route) : recommendedAction,
      localTier: cleanValue(candidate?.localTier),
      estimatedImages: candidate?.estimatedImages ?? null,
      candidateId: cleanValue(candidate?.id),
      storageOk,
      confidence: candidate ? 0.78 : 0.66,
      provenance: {
        sourceFile: `${meta.sourceFile} + graph/menu-overlays`,
        method: "storage_light_enrichment_gap_rollup",
      },
    };
    menuRows.push(row);

    const sourceRow =
      sourceStats.get(meta.sourceId) ||
      {
        sourceId: meta.sourceId,
        sourceKey: meta.sourceKey,
        menuCount: 0,
        missingDishMenus: 0,
        missingPriceMenus: 0,
        missingIngredientMenus: 0,
        missingImageMenus: 0,
        ocrCandidateMenus: 0,
        ocrFailureMenus: 0,
        externalMenus: 0,
        priorityScoreTotal: 0,
        topActions: new Map(),
      };
    sourceRow.menuCount += 1;
    if (meta.external) sourceRow.externalMenus += 1;
    if (missing.includes("dish")) sourceRow.missingDishMenus += 1;
    if (missing.includes("price")) sourceRow.missingPriceMenus += 1;
    if (missing.includes("ingredient")) sourceRow.missingIngredientMenus += 1;
    if (missing.includes("image")) sourceRow.missingImageMenus += 1;
    if (candidate) sourceRow.ocrCandidateMenus += 1;
    if (failureCount) sourceRow.ocrFailureMenus += 1;
    sourceRow.priorityScoreTotal += priorityScore;
    incrementMap(sourceRow.topActions, recommendedAction);
    sourceStats.set(meta.sourceId, sourceRow);
  }

  for (const row of [...sourceStats.values()]
    .sort((a, b) => b.priorityScoreTotal - a.priorityScoreTotal || a.sourceId.localeCompare(b.sourceId))
    .slice(0, MAX_ENRICHMENT_GAP_SOURCE_INDEX)) {
    records[enrichmentGapId("source", [row.sourceId])] = {
      id: enrichmentGapId("source", [row.sourceId]),
      type: "source_enrichment_gap_summary",
      sourceId: row.sourceId,
      sourceKey: row.sourceKey,
      menuCount: row.menuCount,
      missingDishMenus: row.missingDishMenus,
      missingPriceMenus: row.missingPriceMenus,
      missingIngredientMenus: row.missingIngredientMenus,
      missingImageMenus: row.missingImageMenus,
      ocrCandidateMenus: row.ocrCandidateMenus,
      ocrFailureMenus: row.ocrFailureMenus,
      externalMenus: row.externalMenus,
      priorityScore: roundedNumber(row.priorityScoreTotal),
      priorityBand: gapPriorityBand(row.priorityScoreTotal / Math.max(1, row.menuCount)),
      topActions: topObjectEntries(row.topActions, 6),
      confidence: 0.74,
      provenance: {
        sourceFile: "graph/menu-overlays + enrichment/run-plan.json",
        method: "storage_light_source_gap_rollup",
      },
    };
  }

  for (const row of menuRows
    .sort((a, b) => b.priorityScore - a.priorityScore || a.sourceId.localeCompare(b.sourceId) || a.title.localeCompare(b.title))
    .slice(0, MAX_ENRICHMENT_GAP_MENU_INDEX)) {
    records[row.id] = row;
  }

  return records;
}

function buildDishCounts({ menus, analytics, ontology, prices, enrichment }) {
  const counts = new Map();
  const add = (name, amount, source) => {
    const label = cleanValue(name);
    if (!label) return;
    const key = dishNodeId(label);
    const previous = counts.get(key) || { id: key, label, count: 0, sources: new Set() };
    previous.count += Number(amount) || 1;
    previous.sources.add(source);
    counts.set(key, previous);
  };

  for (const dish of analytics.topDishes || []) add(dish.name || dish.normalized, dish.count || 1, "analytics");
  for (const record of prices.records || []) add(record.item, 1, "prices");
  for (const record of enrichmentRecords(enrichment, "dishMentions")) add(record.rawName || record.normalizedName, 1, `enrichment:${record.extractionMethod || "dish"}`);
  for (const record of enrichmentRecords(enrichment, "priceObservations")) add(record.rawName || record.normalizedName, 1, `enrichment:${record.extractionMethod || "price"}`);
  for (const record of enrichmentRecords(enrichment, "externalMenuRecords")) {
    for (const dish of record.dishHints || []) add(dish.rawName || dish.normalizedName, 1, `external:${record.sourceId || record.sourceKey || "menu"}`);
    for (const price of record.priceObservations || []) add(price.rawName || price.item || price.normalizedName, 1, `external:${record.sourceId || record.sourceKey || "price"}`);
  }
  for (const menu of menus) for (const dish of (menu.topDishes || []).slice(0, 8)) add(dish, 1, "menu-top-dishes");
  for (const category of ["dishes", "ingredients", "beverages"]) {
    for (const term of ontology.categories?.[category] || []) add(term.term, term.count || 1, `ontology:${category}`);
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, MAX_DISH_NODES);
}

function priceEnhancementKey(record) {
  return [
    cleanValue(record.menuId || record.menuUid),
    normalizeText(record.normalizedName || record.rawName || record.item),
    cleanValue(record.rawPriceText || record.rawPrice || record.amount),
  ].join("|");
}

function buildEvidenceIndexes({ menus, matches, prices, dateEstimates, enrichment }) {
  const externalMenus = enrichmentRecords(enrichment, "externalMenuRecords");
  const menuIds = new Set([...menus.map(recordUid), ...externalMenus.map((record) => cleanValue(record.menuId || record.id)).filter(Boolean)]);
  const overlays = {};
  const evidenceIndex = {
    version: VERSION,
    dateEvidence: {},
    priceObservations: {},
    matches: {},
    dishMentions: {},
    imageFeatures: {},
    ocrCandidates: {},
    ocrFailures: {},
    sourceCoverage: {},
    sourceProbes: {},
    externalMenus: {},
    recipeClusters: {},
    dishRecipeLinks: {},
    ingredientAnalytics: {},
    priceAnalytics: {},
    dishAnalytics: {},
    enrichmentGaps: {},
  };
  const dishNamesByMenu = new Map();
  const ingredientTagsByMenu = new Map();
  const priceEnhancements = new Map();
  let dishEvidenceIndexed = 0;
  let imageEvidenceIndexed = 0;
  for (const record of enrichmentRecords(enrichment, "priceObservations")) {
    priceEnhancements.set(priceEnhancementKey(record), record);
  }

  for (const menu of menus) {
    const uid = recordUid(menu);
    const initialDishes = new Set((menu.topDishes || []).slice(0, 3).map(normalizeText).filter(Boolean));
    dishNamesByMenu.set(uid, initialDishes);
    ingredientTagsByMenu.set(uid, new Set());
    overlays[uid] = {
      menuId: uid,
      sourceKey: cleanValue(menu.sourceKey || "cia"),
      counts: {
        dishMentions: 0,
        priceObservations: 0,
        dateEvidence: 0,
        matches: 0,
        ontologyTerms: 0,
        ingredientTags: 0,
        imageFeatures: 0,
        ocrFailures: 0,
      },
      topDishes: (menu.topDishes || []).slice(0, 3).map(cleanValue).filter(Boolean),
      ingredientTags: [],
      dishMentionIds: [],
      priceObservationIds: [],
      dateEvidenceIds: [],
      matchIds: [],
      imageFeatureIds: [],
      ocrFailureIds: [],
    };
    overlays[uid].counts.dishMentions = initialDishes.size;
  }

  for (const record of externalMenus) {
    const uid = cleanValue(record.menuId || record.id);
    if (!uid) continue;
    const sourceFile = externalSourceFile(record);
    const dishMentions = record.dishMentions || [];
    const priceObservations = record.priceObservations || [];
    const imageFeatures = record.imageFeatures || [];
    const ingredientTags = new Set([
      ...(record.ingredientTags || []),
      ...dishMentions.flatMap((dish) => dish.ingredientTags || []),
      ...priceObservations.flatMap((price) => price.ingredientTags || []),
    ].map(cleanValue).filter(Boolean));
    overlays[uid] = {
      menuId: uid,
      sourceId: cleanValue(record.sourceId),
      sourceKey: cleanValue(record.sourceKey || "external"),
      external: true,
      counts: {
        dishMentions: dishMentions.length || (record.dishHints || []).length,
        priceObservations: priceObservations.length,
        dateEvidence: record.lowerYear || record.year || record.pointYear ? 1 : 0,
        matches: 0,
        ontologyTerms: 0,
        ingredientTags: ingredientTags.size,
        imageFeatures: imageFeatures.length || (record.iiifManifestUrl || record.iiifInfoUri || record.imageUri || record.thumbnailUrl ? 1 : 0),
        ocrFailures: 0,
      },
      topDishes: (record.dishHints || dishMentions || []).slice(0, 3).map((dish) => cleanValue(dish.rawName || dish.normalizedName)).filter(Boolean),
      ingredientTags: [...ingredientTags].sort().slice(0, 8),
      dishMentionIds: [],
      priceObservationIds: [],
      dateEvidenceIds: [],
      matchIds: [],
      imageFeatureIds: [],
      ocrFailureIds: [],
    };
    evidenceIndex.externalMenus[uid] = {
      id: uid,
      sourceId: cleanValue(record.sourceId),
      sourceKey: cleanValue(record.sourceKey || "external"),
      sourceRecordId: cleanValue(record.sourceRecordId),
      title: cleanValue(record.title),
      dateText: cleanValue(record.dateText),
      year: record.year || null,
      lowerYear: record.lowerYear || null,
      upperYear: record.upperYear || null,
      pointYear: record.pointYear || null,
      decade: cleanValue(record.decade || "unknown"),
      transportMode: cleanValue(record.transportMode),
      placeText: cleanValue(record.placeText),
      venueText: cleanValue(record.venueText),
      dishHints: overlays[uid].topDishes,
      ingredientTags: overlays[uid].ingredientTags,
      priceObservationCount: priceObservations.length,
      sourceUrl: cleanValue(record.sourceUrl || record.itemUrl),
      iiifManifestUrl: cleanValue(record.iiifManifestUrl),
    };
    if (overlays[uid].counts.dateEvidence) {
      const id = dateEvidenceNodeId({ menuId: uid });
      evidenceIndex.dateEvidence[id] = {
        id,
        menuId: uid,
        lower: record.lowerYear ? `${record.lowerYear}-01-01` : null,
        upper: record.upperYear ? `${record.upperYear}-12-31` : null,
        centerYear: record.year || record.pointYear || null,
        decade: cleanValue(record.decade || "unknown"),
        confidence: record.dateConfidence || "C",
        methods: ["external_source_date_created"],
        sourceFile,
      };
      overlays[uid].dateEvidenceIds.push(id);
    }
    for (const dish of dishMentions) {
      if (overlays[uid].dishMentionIds.length < 3 && dishEvidenceIndexed < MAX_DISH_EVIDENCE_INDEX) {
        overlays[uid].dishMentionIds.push(dish.id);
        dishEvidenceIndexed += 1;
        evidenceIndex.dishMentions[dish.id] = compactDishEvidence({
          id: dish.id,
          menuId: uid,
          sourceId: dish.sourceId || record.sourceId,
          rawName: dish.rawName,
          normalizedName: dish.normalizedName,
          dishType: dish.dishType,
          method: dish.extractionMethod || "external",
        });
      }
    }
    for (const [priceIndex, price] of priceObservations.entries()) {
      const id = priceNodeId(price, `external:${priceIndex}`);
      if (overlays[uid].priceObservationIds.length < 6) overlays[uid].priceObservationIds.push(id);
      evidenceIndex.priceObservations[id] = compactPriceEvidence({
        id,
        menuId: uid,
        sourceId: price.sourceId || record.sourceId,
        item: price.item || price.rawName,
        rawPrice: price.rawPrice || price.rawPriceText,
        amount: price.amount,
        currency: price.currency || price.currencyCode,
        year: price.year || record.year || record.pointYear || null,
        confidence: price.confidence || "medium",
        method: price.extractionMethod || "external_price",
        external: true,
      });
    }
    for (const imageFeature of imageFeatures) {
      const id = cleanValue(imageFeature.id);
      if (!id || imageEvidenceIndexed >= MAX_IMAGE_EVIDENCE_INDEX) continue;
      if (overlays[uid].imageFeatureIds.length < 2) overlays[uid].imageFeatureIds.push(id);
      imageEvidenceIndexed += 1;
      evidenceIndex.imageFeatures[id] = {
        id,
        menuId: uid,
        sourceId: cleanValue(imageFeature.sourceId || record.sourceId),
        featureType: cleanValue(imageFeature.featureType || "external_image_metadata"),
        scalar: {
          width: imageFeature.scalar?.width ?? null,
          height: imageFeature.scalar?.height ?? null,
          aspectRatio: imageFeature.scalar?.aspectRatio ?? null,
          orientation: cleanValue(imageFeature.scalar?.orientation || "unknown"),
          byteSize: imageFeature.scalar?.byteSize ?? null,
          mediaType: cleanValue(imageFeature.scalar?.mediaType || "unknown"),
          pageCount: imageFeature.scalar?.pageCount ?? record.pageCount ?? null,
          hasImageUri: Boolean(imageFeature.scalar?.hasImageUri || record.imageUri),
          hasIiifInfo: Boolean(imageFeature.scalar?.hasIiifInfo || record.iiifInfoUri),
        },
        confidence: Number(imageFeature.confidence || 0.62),
        method: cleanValue(imageFeature.modelName || "external_metadata"),
        sourceFile,
        external: true,
      };
    }
  }

  for (const record of prioritizedDishEvidenceRows(enrichmentRecords(enrichment, "dishMentions"))) {
    const uid = cleanValue(record.menuId);
    if (!menuIds.has(uid)) continue;
    const overlay = overlays[uid];
    const normalized = normalizeText(record.normalizedName || record.rawName);
    if (!normalized) continue;
    const dishSet = dishNamesByMenu.get(uid) || new Set();
    if (!dishSet.has(normalized)) {
      dishSet.add(normalized);
      overlay.counts.dishMentions = dishSet.size;
      if (overlay.topDishes.length < 3) overlay.topDishes.push(cleanValue(record.rawName || record.normalizedName));
    }
    dishNamesByMenu.set(uid, dishSet);
    for (const tag of record.ingredientTags || []) {
      const tagSet = ingredientTagsByMenu.get(uid) || new Set();
      tagSet.add(cleanValue(tag));
      ingredientTagsByMenu.set(uid, tagSet);
    }
    if (overlay.dishMentionIds.length < 2 && dishEvidenceIndexed < MAX_DISH_EVIDENCE_INDEX) {
      overlay.dishMentionIds.push(record.id);
      dishEvidenceIndexed += 1;
      evidenceIndex.dishMentions[record.id] = compactDishEvidence({
        id: record.id,
        menuId: uid,
        sourceId: record.sourceId,
        rawName: record.rawName,
        normalizedName: record.normalizedName,
        dishType: record.dishType,
        method: record.extractionMethod,
      });
    }
  }

  for (const record of enrichmentRecords(enrichment, "priceObservations")) {
    if (record.extractionMethod !== "local_vision_ocr_price") continue;
    const uid = cleanValue(record.menuId);
    if (!menuIds.has(uid)) continue;
    const overlay = overlays[uid];
    overlay.counts.priceObservations += 1;
    if (overlays[uid].priceObservationIds.length < 6) {
      const id = cleanValue(record.id);
      overlays[uid].priceObservationIds.push(id);
      evidenceIndex.priceObservations[id] = compactPriceEvidence({
        id,
        menuId: uid,
        sourceId: record.sourceId,
        item: record.rawName || record.normalizedName,
        rawPrice: record.rawPriceText || record.amount,
        amount: record.amount,
        currency: record.currencyCode,
        year: record.year || null,
        confidence: record.confidence || "unknown",
        method: record.extractionMethod,
      });
    }
  }

  for (const [uid, tags] of ingredientTagsByMenu) {
    if (!overlays[uid]) continue;
    overlays[uid].ingredientTags = [...tags].filter(Boolean).sort().slice(0, 8);
    overlays[uid].counts.ingredientTags = tags.size;
  }

  for (const record of dateEstimates.records || []) {
    const uid = cleanValue(record.menuId);
    if (!menuIds.has(uid)) continue;
    const id = dateEvidenceNodeId(record);
    evidenceIndex.dateEvidence[id] = {
      id,
      menuId: uid,
      lower: record.estimatedNotBefore || null,
      upper: record.estimatedNotAfter || null,
      centerYear: record.estimatedCenterYear || null,
      decade: record.estimatedDecade || null,
      confidence: record.confidence || "X",
      methods: record.methods || [],
    };
    overlays[uid].dateEvidenceIds.push(id);
    overlays[uid].counts.dateEvidence += 1;
  }

  for (const [index, record] of (prices.records || []).entries()) {
    const uid = cleanValue(record.menuUid || record.menuId);
    if (!menuIds.has(uid)) continue;
    const id = priceNodeId(record, index);
    const enhancement =
      priceEnhancements.get(priceEnhancementKey(record)) ||
      priceEnhancements.get(
        [
          uid,
          normalizeText(record.item),
          cleanValue(record.rawAmount || record.amount),
        ].join("|")
      );
    overlays[uid].counts.priceObservations += 1;
    if (overlays[uid].priceObservationIds.length < 6) {
      overlays[uid].priceObservationIds.push(id);
      evidenceIndex.priceObservations[id] = compactPriceEvidence({
        id,
        menuId: uid,
        sourceId: record.sourceId,
        item: record.item,
        rawPrice: record.rawPrice || record.rawAmount || record.amount,
        amount: record.amount,
        currency: record.currency,
        year: record.year || null,
        confidence: record.confidence || "unknown",
        method: enhancement?.extractionMethod || record.extractionMethod || "structured_price",
      });
    }
  }

  for (const record of enrichmentRecords(enrichment, "imageFeatures")) {
    const uid = cleanValue(record.menuId);
    if (!menuIds.has(uid)) continue;
    const overlay = overlays[uid];
    overlay.counts.imageFeatures += 1;
    if (overlay.imageFeatureIds.length < 2 && imageEvidenceIndexed < MAX_IMAGE_EVIDENCE_INDEX) {
      overlay.imageFeatureIds.push(record.id);
      imageEvidenceIndexed += 1;
      evidenceIndex.imageFeatures[record.id] = {
        id: record.id,
        menuId: uid,
        featureType: cleanValue(record.featureType),
        scalar: {
          width: record.scalar?.width ?? null,
          height: record.scalar?.height ?? null,
          aspectRatio: record.scalar?.aspectRatio ?? null,
          orientation: cleanValue(record.scalar?.orientation || "unknown"),
          byteSize: record.scalar?.byteSize ?? null,
          mediaType: cleanValue(record.scalar?.mediaType || "unknown"),
        },
        confidence: Number(record.confidence || 0),
        method: cleanValue(record.modelName),
      };
    }
  }

  let ocrCandidateEvidenceIndexed = 0;
  for (const record of enrichmentRecords(enrichment, "ocrTriage")) {
    const uid = cleanValue(record.menuId);
    if (!menuIds.has(uid) || !overlays[uid]) continue;
    const overlay = overlays[uid];
    overlay.counts.ocrCandidates = Number(overlay.counts.ocrCandidates || 0) + 1;
    if (!overlay.ocrCandidateIds) overlay.ocrCandidateIds = [];
    if (overlay.ocrCandidateIds.length >= 2 || ocrCandidateEvidenceIndexed >= MAX_OCR_CANDIDATE_INDEX) continue;
    overlay.ocrCandidateIds.push(record.id);
    ocrCandidateEvidenceIndexed += 1;
      evidenceIndex.ocrCandidates[record.id] = {
        id: cleanValue(record.id),
        menuId: uid,
        sourceId: cleanValue(record.sourceId),
        sourceKey: cleanValue(record.sourceKey),
        route: cleanValue(record.route),
        localTier: cleanValue(record.localTier),
        priorityRank: record.priorityRank ?? null,
        priorityBatch: cleanValue(record.priorityBatch),
        priorityScore: Number(record.priorityScore || 0),
        valueScore: Number(record.valueScore || 0),
        difficultyScore: Number(record.difficultyScore || 0),
        estimatedImages: Number(record.estimatedImages || 0),
      };
  }

  let ocrFailureEvidenceIndexed = 0;
  for (const record of enrichmentRecords(enrichment, "ocrFailures")) {
    const uid = cleanValue(record.menuId);
    if (!menuIds.has(uid) || !overlays[uid]) continue;
    const overlay = overlays[uid];
    overlay.counts.ocrFailures = Number(overlay.counts.ocrFailures || 0) + 1;
    if (!overlay.ocrFailureIds) overlay.ocrFailureIds = [];
    if (overlay.ocrFailureIds.length >= 2 || ocrFailureEvidenceIndexed >= MAX_OCR_FAILURE_INDEX) continue;
    overlay.ocrFailureIds.push(record.id);
    ocrFailureEvidenceIndexed += 1;
    evidenceIndex.ocrFailures[record.id] = {
      id: cleanValue(record.id),
      candidateId: cleanValue(record.candidateId),
      menuId: uid,
      sourceId: cleanValue(record.sourceId),
      sourceKey: cleanValue(record.sourceKey),
      pageNumber: record.pageNumber ?? null,
      errorClass: cleanValue(record.errorClass),
      errorMessage: cleanValue(record.errorMessage).slice(0, 160),
      retryable: Boolean(record.retryable),
      nextAction: cleanValue(record.nextAction),
      route: cleanValue(record.route),
      localTier: cleanValue(record.localTier),
      priorityRank: record.priorityRank ?? null,
    };
  }

  for (const record of enrichmentRecords(enrichment, "sourceProbes")) {
    evidenceIndex.sourceProbes[record.sourceId] = {
      sourceId: record.sourceId,
      sourceKey: cleanValue(record.sourceKey),
      label: cleanValue(record.label),
      sourceType: cleanValue(record.sourceType),
      status: cleanValue(record.status),
      sourceUrl: cleanValue(record.sourceUrl),
      accessMethod: cleanValue(record.accessMethod),
      routeStatus: cleanValue(record.routeStatus),
      routeBlocker: cleanValue(record.routeBlocker),
      recommendedNextAction: cleanValue(record.recommendedNextAction),
      publicItemCount: record.publicItemCount ?? null,
      estimatedPublicScale: cleanValue(record.estimatedPublicScale),
      ingestedRows: Number(record.ingestedRows || 0),
      staticRows: Number(record.staticRows || 0),
      externalRows: Number(record.externalRows || 0),
      datedRows: Number(record.datedRows || 0),
      externalDishMentions: Number(record.externalDishMentions || 0),
      externalPriceObservations: Number(record.externalPriceObservations || 0),
      imageRouteRows: Number(record.imageRouteRows || 0),
      recipeBridgeClusters: Number(record.recipeBridgeClusters || 0),
      sampleItems: (record.sampleItems || []).slice(0, 8),
      notes: cleanValue(record.notes),
      error: cleanValue(record.error),
    };
  }

  let recipeClustersIndexed = 0;
  for (const cluster of enrichment?.recipeBridge?.clusters || []) {
    const id = recipeClusterNodeId(cluster.id);
    if (!id || recipeClustersIndexed >= MAX_RECIPE_CLUSTER_INDEX) continue;
    recipeClustersIndexed += 1;
    evidenceIndex.recipeClusters[id] = compactRecipeClusterEvidence({ ...cluster, id });
    for (const menuId of cluster.menuIds || []) {
      const uid = cleanValue(menuId);
      if (!overlays[uid]) continue;
      const overlay = overlays[uid];
      overlay.counts.recipeClusters = Number(overlay.counts.recipeClusters || 0) + 1;
      if (!overlay.recipeClusterIds) overlay.recipeClusterIds = [];
      if (overlay.recipeClusterIds.length < 3 && !overlay.recipeClusterIds.includes(id)) overlay.recipeClusterIds.push(id);
    }
  }

  let dishRecipeLinksIndexed = 0;
  for (const link of enrichment?.recipeBridge?.dishLinks || []) {
    const id = cleanValue(link.id);
    if (!id || dishRecipeLinksIndexed >= MAX_DISH_RECIPE_LINK_INDEX) continue;
    dishRecipeLinksIndexed += 1;
    evidenceIndex.dishRecipeLinks[id] = {
      id,
      canonicalDishId: cleanValue(link.canonicalDishId),
      recipeClusterId: recipeClusterNodeId(link.recipeClusterId),
      relationType: cleanValue(link.relationType),
      confidence: Number(link.confidence || 0),
      method: cleanValue(link.method),
      evidence: {
        observedDishMentionCount: Number(link.evidence?.observedDishMentionCount || 0),
        priceObservationCount: Number(link.evidence?.priceObservationCount || 0),
        menuCount: Number(link.evidence?.menuCount || 0),
        ingredientTags: (link.evidence?.ingredientTags || []).slice(0, 8).map(cleanValue).filter(Boolean),
      },
    };
  }

  for (const record of enrichmentRecords(enrichment, "coverageReport")) {
    const sourceId = cleanValue(record.sourceId);
    if (!sourceId) continue;
    evidenceIndex.sourceCoverage[sourceId] = {
      sourceId,
      label: cleanValue(record.label),
      status: cleanValue(record.status),
      sourceType: cleanValue(record.sourceType),
      rowCount: Number(record.rowCount || 0),
      staticRows: Number(record.staticRows || 0),
      externalRows: Number(record.externalRows || 0),
      sampledPriceMenus: Number(record.sampledPriceMenus || 0),
      sourceStructuredPriceMenus: Number(record.sourceStructuredPriceMenus || 0),
      sourceStructuredPriceItems: Number(record.sourceStructuredPriceItems || 0),
      dishCoverage: Number(record.dishCoverage || 0),
      priceCoverage: Number(record.priceCoverage || 0),
      ingredientCoverage: Number(record.ingredientCoverage || 0),
      imageCoverage: Number(record.imageCoverage || 0),
      coverageScore: Number(record.coverageScore || 0),
      ocrCandidates: Number(record.ocrCandidates || 0),
      ocrProcessedMenus: Number(record.ocrProcessedMenus || 0),
      ocrFailures: Number(record.ocrFailures || 0),
      primaryNextAction: cleanValue(record.primaryNextAction),
      nextActions: (record.nextActions || []).slice(0, 3).map((item) => ({
        id: cleanValue(item.id),
        label: cleanValue(item.label),
        priority: Number(item.priority || 0),
      })),
    };
  }

  for (const [index, relationship] of (matches.relationships || []).entries()) {
    const source = cleanValue(relationship.source);
    const target = cleanValue(relationship.target);
    if (!menuIds.has(source) || !menuIds.has(target)) continue;
    const id = `match:${source}:${target}:${index}`;
    let referenced = false;
    if (overlays[source]) {
      overlays[source].counts.matches += 1;
      if (overlays[source].matchIds.length < 6) {
        overlays[source].matchIds.push(id);
        referenced = true;
      }
    }
    if (overlays[target]) {
      overlays[target].counts.matches += 1;
      if (overlays[target].matchIds.length < 6) {
        overlays[target].matchIds.push(id);
        referenced = true;
      }
    }
    if (referenced) {
      evidenceIndex.matches[id] = {
        id,
        source,
        target,
        score: Number(relationship.score || 0),
      };
    }
  }

  return { overlays, evidenceIndex };
}

function selectCoreMenus(menus, overlays) {
  const byId = new Map(menus.map((menu) => [recordUid(menu), menu]));
  const selected = new Set();
  const add = (menuId) => {
    if (selected.size >= MAX_CORE_MENU_NODES) return;
    if (byId.has(menuId)) selected.add(menuId);
  };

  const ranked = menus
    .map((menu) => {
      const uid = recordUid(menu);
      const overlay = overlays[uid] || { counts: {} };
      const counts = overlay.counts || {};
      const score =
        Number(counts.dateEvidence || 0) * 12 +
        Number(counts.matches || 0) * 7 +
        Math.min(10, Number(counts.priceObservations || 0)) * 2 +
        Math.min(6, Number(counts.dishMentions || 0)) +
        (menu.sourceKey === "cia" && (!menu.year || menu.decade === "unknown") ? 8 : 0) +
        (menu.sourceKey === "nypl" ? 2 : 0);
      return { uid, score, year: menu.year || 9999, title: cleanValue(menu.title) };
    })
    .sort((a, b) => b.score - a.score || a.year - b.year || a.title.localeCompare(b.title));

  for (const item of ranked) add(item.uid);
  return new Set([...selected].slice(0, MAX_CORE_MENU_NODES));
}

function ingredientTermCounts(enrichment) {
  const counts = new Map();
  for (const record of enrichmentRecords(enrichment, "dishMentions")) {
    for (const tag of record.ingredientTags || []) {
      const key = cleanValue(tag);
      if (!key) continue;
      const previous = counts.get(key) || { term: key, count: 0, menuIds: new Set() };
      previous.count += 1;
      if (record.menuId) previous.menuIds.add(cleanValue(record.menuId));
      counts.set(key, previous);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.term.localeCompare(b.term)).slice(0, MAX_INGREDIENT_TERMS);
}

function enrichmentDishesByMenu(enrichment) {
  const byMenu = new Map();
  for (const record of enrichmentRecords(enrichment, "dishMentions")) {
    const uid = cleanValue(record.menuId);
    if (!uid) continue;
    if (!byMenu.has(uid)) byMenu.set(uid, []);
    byMenu.get(uid).push(record);
  }
  return byMenu;
}

function prioritizedDishEvidenceRows(records) {
  const priority = (record) => {
    if (record.extractionMethod === "local_vision_ocr_dish") return 0;
    if (record.extractionMethod === "local_transcript_regex") return 1;
    return 2;
  };
  return [...(records || [])].sort((a, b) => priority(a) - priority(b));
}

function externalMenuScore(record) {
  const year = Number(record.year || record.pointYear || record.lowerYear || record.upperYear || 0);
  return (
    (record.priceObservations || []).length * 14 +
    ((record.dishMentions || []).length || (record.dishHints || []).length) * 9 +
    (record.lowerYear || record.year || record.pointYear ? 8 : 0) +
    (record.imageFeatures || []).length * 3 +
    (record.iiifManifestUrl || record.iiifInfoUri || record.thumbnailUrl ? 2 : 0) +
    (record.address ? 3 : 0) +
    (record.phoneText ? 2 : 0) +
    (record.cuisineTags || []).length * 2 +
    (year && year < 1900 ? 8 : 0)
  );
}

function selectExternalMenusForCore(records) {
  const bySource = new Map();
  for (const record of records || []) {
    const sourceKey = cleanValue(record.sourceKey || record.sourceId || "external");
    if (!bySource.has(sourceKey)) bySource.set(sourceKey, []);
    bySource.get(sourceKey).push(record);
  }
  const selected = new Map();
  const perSourceFloor = Math.max(20, Math.floor(MAX_EXTERNAL_MENU_NODES / Math.max(1, bySource.size * 3)));
  const rankedBySource = [...bySource.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [, sourceRecords] of rankedBySource) {
    for (const record of [...sourceRecords].sort((a, b) => externalMenuScore(b) - externalMenuScore(a) || cleanValue(a.title).localeCompare(cleanValue(b.title))).slice(0, perSourceFloor)) {
      selected.set(cleanValue(record.menuId || record.id), record);
    }
  }
  const ranked = [...(records || [])].sort((a, b) => externalMenuScore(b) - externalMenuScore(a) || cleanValue(a.title).localeCompare(cleanValue(b.title)));
  for (const record of ranked) {
    if (selected.size >= MAX_EXTERNAL_MENU_NODES) break;
    selected.set(cleanValue(record.menuId || record.id), record);
  }
  return [...selected.values()].slice(0, MAX_EXTERNAL_MENU_NODES);
}

function externalMenuSourceNodeId(record) {
  const sourceId = cleanValue(record.sourceId) || sourceIdForKey(record.sourceKey || "external");
  return sourceNodeId(sourceId);
}

function buildCoreGraph({ menus, evaluations, matches, prices, dateEstimates, ontology, analytics, evidenceIndex, overlays, enrichment, generatedAt }) {
  const coreNodes = new Map();
  const edges = [];
  const seenEdges = new Set();
  const menuIdSet = new Set();
  const coreMenuIds = selectCoreMenus(menus, overlays);
  const externalMenus = selectExternalMenusForCore(enrichmentRecords(enrichment, "externalMenuRecords"));
  const dishCounts = buildDishCounts({ menus, analytics, ontology, prices, enrichment });
  const dishIds = new Set(dishCounts.map((dish) => dish.id));
  const enrichmentDishMap = enrichmentDishesByMenu(enrichment);
  const recipeClusters = (enrichment?.recipeBridge?.clusters || []).slice(0, MAX_RECIPE_CLUSTER_NODES);
  let recipeSourceEdges = 0;

  addSourceNodes(coreNodes, evaluations);

  for (const menu of menus) {
    const uid = recordUid(menu);
    if (!coreMenuIds.has(uid)) continue;
    menuIdSet.add(uid);
    const menuSourceId = sourceIdForKey(menu.sourceKey || "cia");
    addNode(
      coreNodes,
      node(menuNodeId(uid), "Menu", menu.title || uid, menu.sourceKey || "cia", scoreConfidence(menu), {
        sourceFile: "menus.json",
        sourceRecordId: cleanValue(menu.sourceRecordId || menu.pointer || menu.id),
        sourceKey: cleanValue(menu.sourceKey || "cia"),
      }, compactMenu(menu))
    );
    addEdge(
      edges,
      edge("HAS_MENU", sourceNodeId(menuSourceId), menuNodeId(uid), 1, scoreConfidence(menu), {
        sourceFile: "menus.json",
        sourceRecordId: cleanValue(menu.sourceRecordId || menu.pointer || menu.id),
      }),
      seenEdges
    );

    const label = venueLabel(menu);
    if (label) {
      const venueId = venueNodeId(label, menu);
      addNode(
        coreNodes,
        node(venueId, "Venue", label, menu.sourceKey || "menu-metadata", menu.matchCount ? 0.72 : 0.45, {
          sourceFile: "menus.json",
          sourceRecordId: cleanValue(menu.sourceRecordId || menu.pointer || menu.id),
          provisional: !Number(menu.matchCount || 0),
        }, {
          place: [menu.city, menu.state, menu.country].map(cleanValue).filter(Boolean).join(", "),
          provisional: !Number(menu.matchCount || 0),
        })
      );
      addEdge(
        edges,
        edge("SERVED_AT", menuNodeId(uid), venueId, 0.8, menu.matchCount ? 0.72 : 0.45, {
          sourceFile: "menus.json",
          sourceRecordId: cleanValue(menu.sourceRecordId || menu.pointer || menu.id),
          provisional: !Number(menu.matchCount || 0),
        }),
        seenEdges
      );
    }

    const dishCandidates = [
      ...(menu.topDishes || []).map((rawName) => ({ rawName, method: "source_top_dishes", confidence: menu.sourceKey === "nypl" ? 0.82 : 0.52 })),
      ...(enrichmentDishMap.get(uid) || []).map((record) => ({
        rawName: record.rawName || record.normalizedName,
        method: record.extractionMethod || "enrichment_dish_mention",
        confidence: Number(record.confidence || 0.58),
      })),
    ];
    const seenDishIds = new Set();
    for (const dish of dishCandidates) {
      if (seenDishIds.size >= MAX_TOPOLOGY_DISH_EDGES_PER_MENU) break;
      const dishId = dishNodeId(dish.rawName);
      if (!dishIds.has(dishId)) continue;
      if (seenDishIds.has(dishId)) continue;
      seenDishIds.add(dishId);
      addEdge(
        edges,
        edge("MENTIONS_DISH", menuNodeId(uid), dishId, 0.62, dish.confidence, {
          sourceFile: "menus.json",
          sourceRecordId: cleanValue(menu.sourceRecordId || menu.pointer || menu.id),
          extraction: dish.method,
        }),
        seenEdges
      );
    }
  }

  for (const record of externalMenus) {
    const uid = cleanValue(record.menuId || record.id);
    if (!uid) continue;
    const sourceFile = externalSourceFile(record);
    menuIdSet.add(uid);
    const sourceId = cleanValue(record.sourceId) || sourceIdForKey(record.sourceKey || "external");
    addNode(
      coreNodes,
      node(menuNodeId(uid), "Menu", record.title || uid, record.sourceKey || sourceId, Number(record.confidence || 0.68), {
        sourceFile,
        sourceRecordId: cleanValue(record.sourceRecordId),
        sourceKey: cleanValue(record.sourceKey || "external"),
        sourceId,
      }, compactExternalMenu(record))
    );
    addEdge(
      edges,
      edge("HAS_MENU", externalMenuSourceNodeId(record), menuNodeId(uid), 0.82, Number(record.confidence || 0.68), {
        sourceFile,
        sourceRecordId: cleanValue(record.sourceRecordId),
        sourceId,
      }),
      seenEdges
    );

    const label = cleanValue(record.venueText || record.collectionTitle);
    if (label) {
      const venueId = venueNodeId(label, { city: record.placeText, state: "", country: record.country || "" });
      addNode(
        coreNodes,
        node(venueId, "Venue", label, record.sourceKey || "external-menu-metadata", 0.52, {
          sourceFile,
          sourceRecordId: cleanValue(record.sourceRecordId),
          provisional: true,
        }, {
          place: cleanValue(record.placeText),
          provisional: true,
          transportMode: cleanValue(record.transportMode),
        })
      );
      addEdge(
        edges,
        edge("SERVED_AT", menuNodeId(uid), venueId, 0.62, 0.52, {
          sourceFile,
          sourceRecordId: cleanValue(record.sourceRecordId),
          provisional: true,
        }),
        seenEdges
      );
    }

    const externalDishCandidates = [
      ...(record.dishMentions || []).map((dish) => ({
        rawName: dish.rawName || dish.normalizedName,
        method: dish.extractionMethod || "external_dish_mention",
        confidence: Number(dish.confidence || 0.68),
      })),
      ...(record.dishHints || []).map((dish) => ({
        rawName: dish.rawName || dish.normalizedName,
        method: "external_dish_hint",
        confidence: Number(dish.confidence || 0.58),
      })),
    ];
    const seenDishIds = new Set();
    for (const dish of externalDishCandidates) {
      if (seenDishIds.size >= MAX_EXTERNAL_DISH_EDGES_PER_MENU) break;
      const dishId = dishNodeId(dish.rawName);
      if (!dishIds.has(dishId) || seenDishIds.has(dishId)) continue;
      seenDishIds.add(dishId);
      addEdge(
        edges,
        edge("MENTIONS_DISH", menuNodeId(uid), dishId, 0.66, dish.confidence, {
          sourceFile,
          sourceRecordId: cleanValue(record.sourceRecordId),
          extraction: dish.method,
        }),
        seenEdges
      );
    }

    const termValues = [
      ...(record.ingredientTags || []).map((term) => ({ category: "ingredients", term })),
      ...(record.cuisineTags || []).map((term) => ({ category: "cuisines", term })),
      ...(record.styleTags || []).map((term) => ({ category: "styles", term })),
      ...(record.formatTags || []).map((term) => ({ category: "formats", term })),
      ...(record.subjectTerms || record.subjects || []).slice(0, 4).map((term) => ({ category: "subjects", term })),
      record.transportMode ? { category: "styles", term: record.transportMode } : null,
    ].filter(Boolean);
    for (const term of termValues.slice(0, 10)) {
      const termId = termNodeId(term);
      addNode(
        coreNodes,
        node(termId, "Term", term.term, "external-menu-records", 0.66, {
          sourceFile,
          sourceRecordId: cleanValue(record.sourceRecordId),
        }, {
          category: term.category,
        })
      );
      addEdge(
        edges,
        edge("HAS_ONTOLOGY_TERM", menuNodeId(uid), termId, 0.48, 0.66, {
          sourceFile,
          sourceRecordId: cleanValue(record.sourceRecordId),
        }),
        seenEdges
      );
      if (overlays[uid]) overlays[uid].counts.ontologyTerms += 1;
    }
  }

  for (const dish of dishCounts) {
    addNode(
      coreNodes,
      node(dish.id, "Dish", dish.label, [...dish.sources].sort().join(", "), 0.62, {
        sourceFile: "analytics.json/ontology.json/prices.json/menus.json",
        observedCount: dish.count,
      }, {
        observedCount: dish.count,
        evidenceSources: [...dish.sources].sort(),
      })
    );
  }

  for (const [id, record] of Object.entries(evidenceIndex.dateEvidence)) {
    if (!menuIdSet.has(record.menuId)) continue;
    addNode(
      coreNodes,
      node(id, "DateEvidence", `${record.confidence} ${record.decade || record.centerYear || "date evidence"}`, "date-estimates", dateConfidence(record), {
        sourceFile: record.sourceFile || "date-estimates.json",
        sourceRecordId: record.menuId,
      }, {
        dateConfidence: record.confidence,
        centerYear: record.centerYear,
        methods: record.methods,
      })
    );
    addEdge(
      edges,
      edge("HAS_DATE_EVIDENCE", menuNodeId(record.menuId), id, dateConfidence(record), dateConfidence(record), {
        sourceFile: record.sourceFile || "date-estimates.json",
        sourceRecordId: record.menuId,
      }),
      seenEdges
    );
  }

  const priceEntries = Object.entries(evidenceIndex.priceObservations).sort(([, a], [, b]) => Number(Boolean(b.external)) - Number(Boolean(a.external)));
  for (const [index, [id, record]] of priceEntries.entries()) {
    if (index >= MAX_CORE_PRICE_NODES) break;
    if (!menuIdSet.has(record.menuId)) continue;
    addNode(
      coreNodes,
      node(id, "PriceObservation", `${record.item || "Price"} ${record.rawPrice || ""}`.trim(), "prices", priceConfidence(record), {
        sourceFile: record.sourceFile || "prices.json",
        sourceRecordId: record.menuId,
      }, {
        item: record.item,
        amount: record.amount,
        currency: record.currency,
        year: record.year,
      })
    );
    addEdge(
      edges,
      edge("HAS_PRICE", menuNodeId(record.menuId), id, 0.7, priceConfidence(record), {
        sourceFile: record.sourceFile || "prices.json",
        sourceRecordId: record.menuId,
      }),
      seenEdges
    );
  }

  for (const relationship of matches.relationships || []) {
    const source = cleanValue(relationship.source);
    const target = cleanValue(relationship.target);
    if (!menuIdSet.has(source) || !menuIdSet.has(target)) continue;
    addEdge(
      edges,
      edge("MATCHES_MENU", menuNodeId(source), menuNodeId(target), Number(relationship.score || 0) / 100, Math.min(0.95, Number(relationship.score || 0) / 100), {
        sourceFile: "matches.json",
        sourceRecordId: `${source}->${target}`,
        evidence: (relationship.evidence || []).slice(0, 3),
      }),
      seenEdges
    );
  }

  for (const terms of Object.values(ontology.categories || {})) {
    for (const term of terms || []) {
      const termId = termNodeId(term);
      addNode(
        coreNodes,
        node(termId, "Term", term.term, "ontology", 0.62, {
          sourceFile: "ontology.json",
          sourceRecordId: term.id,
        }, {
          category: term.category,
          count: term.count,
        })
      );
      for (const menuId of (term.recordIds || []).slice(0, MAX_ONTOLOGY_EDGES_PER_TERM)) {
        if (!menuIdSet.has(cleanValue(menuId))) continue;
        if (overlays[menuId]) overlays[menuId].counts.ontologyTerms += 1;
        addEdge(
          edges,
          edge("HAS_ONTOLOGY_TERM", menuNodeId(menuId), termId, 0.5, 0.62, {
            sourceFile: "ontology.json",
            sourceRecordId: term.id,
          }),
          seenEdges
        );
      }
    }
  }

  for (const ingredient of ingredientTermCounts(enrichment)) {
    const term = { category: "ingredients", term: ingredient.term, id: `enrichment-ingredient-${slug(ingredient.term)}` };
    const termId = termNodeId(term);
    addNode(
      coreNodes,
      node(termId, "Term", ingredient.term, "enrichment", 0.7, {
        sourceFile: "enrichment/dish-mentions.json",
        sourceRecordId: ingredient.term,
      }, {
        category: "ingredients",
        count: ingredient.count,
      })
    );
    for (const menuId of [...ingredient.menuIds].slice(0, MAX_ONTOLOGY_EDGES_PER_TERM)) {
      if (!menuIdSet.has(cleanValue(menuId))) continue;
      if (overlays[menuId]) overlays[menuId].counts.ontologyTerms += 1;
      addEdge(
        edges,
        edge("HAS_ONTOLOGY_TERM", menuNodeId(menuId), termId, 0.54, 0.7, {
          sourceFile: "enrichment/dish-mentions.json",
          sourceRecordId: ingredient.term,
        }),
        seenEdges
      );
    }
  }

  for (const cluster of recipeClusters) {
    const clusterId = recipeClusterNodeId(cluster.id);
    addNode(
      coreNodes,
      node(clusterId, "RecipeCluster", cluster.canonicalName || clusterId, "recipe-bridge", Number(cluster.confidence || 0.62), {
        sourceFile: "enrichment/recipe-bridge.json",
        sourceRecordId: cluster.id,
      }, {
        canonicalDishId: cleanValue(cluster.canonicalDishId),
        dishType: cleanValue(cluster.dishType),
        ingredientTags: (cluster.ingredientTags || []).slice(0, 8).map(cleanValue).filter(Boolean),
        firstSeenYear: cluster.firstSeenYear || null,
        lastSeenYear: cluster.lastSeenYear || null,
        sourceCandidates: (cluster.sourceCandidates || []).map((candidate) => cleanValue(candidate.sourceId)).filter(Boolean),
        observedDishMentionCount: Number(cluster.observedDishMentionCount || 0),
        priceObservationCount: Number(cluster.priceObservationCount || 0),
      })
    );
    const dishId = cleanValue(cluster.canonicalDishId);
    if (dishIds.has(dishId)) {
      addEdge(
        edges,
        edge("BRIDGES_RECIPE_CLUSTER", dishId, clusterId, 0.66, Number(cluster.confidence || 0.62), {
          sourceFile: "enrichment/recipe-bridge.json",
          sourceRecordId: cluster.id,
          method: "deterministic_ingredient_and_name_bridge",
        }),
        seenEdges
      );
    }
    for (const ingredient of (cluster.ingredientTags || []).slice(0, MAX_RECIPE_INGREDIENT_EDGES)) {
      const term = { category: "ingredients", term: ingredient, id: `recipe-ingredient-${slug(ingredient)}` };
      const termId = termNodeId(term);
      addNode(
        coreNodes,
        node(termId, "Term", ingredient, "recipe-bridge", 0.7, {
          sourceFile: "enrichment/recipe-bridge.json",
          sourceRecordId: `${cluster.id}:${ingredient}`,
        }, {
          category: "ingredients",
        })
      );
      addEdge(
        edges,
        edge("USES_INGREDIENT", clusterId, termId, 0.5, 0.68, {
          sourceFile: "enrichment/recipe-bridge.json",
          sourceRecordId: `${cluster.id}:${ingredient}`,
        }),
        seenEdges
      );
    }
    for (const [candidateRank, candidate] of [...(cluster.sourceCandidates || [])]
      .filter((item) => cleanValue(item.sourceId))
      .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))
      .entries()) {
      if (recipeSourceEdges >= MAX_RECIPE_SOURCE_EDGES) break;
      const sourceId = cleanValue(candidate.sourceId);
      const sourceNode = sourceNodeId(sourceId);
      if (!coreNodes.has(sourceNode)) continue;
      recipeSourceEdges += 1;
      addEdge(
        edges,
        edge("CANDIDATE_RECIPE_SOURCE", clusterId, sourceNode, Number(candidate.confidence || 0.5), Number(candidate.confidence || 0.5), {
          sourceFile: "enrichment/recipe-bridge.json",
          sourceRecordId: `${cluster.id}:${sourceId}`,
          role: cleanValue(candidate.role),
          candidateRank,
        }),
        seenEdges
      );
    }
  }

  return {
    version: VERSION,
    generatedAt,
    summary: {
      nodes: coreNodes.size,
      edges: edges.length,
      menus: menus.length,
      coreMenus: menuIdSet.size,
      externalMenuNodes: externalMenus.length,
      sources: (evaluations.sources || []).length,
      dateEvidence: Object.keys(evidenceIndex.dateEvidence).length,
      priceObservationsIndexed: Object.keys(evidenceIndex.priceObservations).length,
      priceObservationNodes: Math.min(MAX_CORE_PRICE_NODES, Object.keys(evidenceIndex.priceObservations).length),
      matches: (matches.relationships || []).length,
      dishNodes: dishCounts.length,
      ingredientTerms: ingredientTermCounts(enrichment).length,
      recipeClusters: recipeClusters.length,
      recipeSourceEdges,
    },
    nodes: [...coreNodes.values()],
    edges,
  };
}

function artifactInfo(name, payload) {
  return {
    name,
    bytes: Buffer.byteLength(JSON.stringify(payload), "utf8"),
  };
}

function payloadBytes(payload) {
  return Buffer.byteLength(JSON.stringify(payload), "utf8");
}

async function writeJson(name, payload) {
  const filePath = path.join(GRAPH_DIR, name);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function overlaySummary(records) {
  const values = Object.values(records || {});
  return {
    menus: values.length,
    withPrices: values.filter((item) => item.counts.priceObservations).length,
    withDateEvidence: values.filter((item) => item.counts.dateEvidence).length,
    withMatches: values.filter((item) => item.counts.matches).length,
    withDishes: values.filter((item) => item.counts.dishMentions).length,
    withIngredients: values.filter((item) => item.counts.ingredientTags).length,
    withImageFeatures: values.filter((item) => item.counts.imageFeatures).length,
    withOcrCandidates: values.filter((item) => item.counts.ocrCandidates).length,
    withOcrFailures: values.filter((item) => item.counts.ocrFailures).length,
    withRecipeClusters: values.filter((item) => item.counts.recipeClusters).length,
  };
}

function overlayShardFileName(sourceKey) {
  return `menu-overlays/by-source/${slug(sourceKey || "unknown")}.json`;
}

function overlaySubshardFileName(sourceKey, index) {
  return `menu-overlays/by-source/${slug(sourceKey || "unknown")}/part-${String(index + 1).padStart(4, "0")}.json`;
}

function overlayRecordEntryBytes(menuId, overlay) {
  return Buffer.byteLength(`${JSON.stringify(menuId)}:${JSON.stringify(overlay)}`, "utf8") + 1;
}

function buildOverlaySubshards(sourceKey, records, generatedAt) {
  const sortedEntries = Object.entries(records || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const chunks = [];
  let currentEntries = [];
  let currentBytes = 0;

  for (const [menuId, overlay] of sortedEntries) {
    const entryBytes = overlayRecordEntryBytes(menuId, overlay);
    if (currentEntries.length && currentBytes + entryBytes > OVERLAY_SUBSHARD_TARGET_BYTES) {
      chunks.push(currentEntries);
      currentEntries = [];
      currentBytes = 0;
    }
    currentEntries.push([menuId, overlay]);
    currentBytes += entryBytes;
  }
  if (currentEntries.length) chunks.push(currentEntries);

  return chunks.map((entries, index) => {
    const chunkRecords = Object.fromEntries(entries);
    const file = overlaySubshardFileName(sourceKey, index);
    const summary = overlaySummary(chunkRecords);
    return {
      file,
      payload: {
        version: VERSION,
        generatedAt,
        sourceKey,
        partition: `part-${String(index + 1).padStart(4, "0")}`,
        summary,
        records: chunkRecords,
      },
      metadata: {
        sourceKey,
        partition: `part-${String(index + 1).padStart(4, "0")}`,
        file: `graph/${file}`,
        summary,
        records: summary.menus,
      },
    };
  });
}

function buildMenuOverlayArtifacts(overlays, generatedAt) {
  const bySource = new Map();
  for (const [menuId, overlay] of Object.entries(overlays || {})) {
    const sourceKey = cleanValue(overlay.sourceKey || "unknown");
    if (!bySource.has(sourceKey)) bySource.set(sourceKey, {});
    bySource.get(sourceKey)[menuId] = overlay;
  }

  const artifacts = {};
  const shards = [];
  for (const [sourceKey, records] of [...bySource.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const file = overlayShardFileName(sourceKey);
    const summary = overlaySummary(records);
    const inlinePayload = {
      version: VERSION,
      generatedAt,
      sourceKey,
      summary,
      records,
    };
    if (payloadBytes(inlinePayload) > OVERLAY_SOURCE_SPLIT_THRESHOLD_BYTES) {
      const subshards = buildOverlaySubshards(sourceKey, records, generatedAt);
      for (const shard of subshards) artifacts[shard.file] = shard.payload;
      artifacts[file] = {
        version: VERSION,
        generatedAt,
        sourceKey,
        sharded: true,
        shardKey: "sourceKey:partition",
        summary,
        subshards: subshards.map((shard) => shard.metadata),
        records: {},
      };
      shards.push({
        sourceKey,
        file: `graph/${file}`,
        summary,
        records: summary.menus,
        subsharded: true,
        subshards: subshards.map((shard) => shard.metadata),
      });
    } else {
      artifacts[file] = inlinePayload;
      shards.push({
        sourceKey,
        file: `graph/${file}`,
        summary,
        records: summary.menus,
      });
    }
  }

  const index = {
    version: VERSION,
    generatedAt,
    sharded: true,
    shardKey: "sourceKey",
    summary: overlaySummary(overlays),
    shards,
    records: {},
  };
  artifacts["menu-overlays.json"] = index;
  return { index, artifacts, shards };
}

function evidenceShardFileName(evidenceType) {
  return `evidence/by-type/${slug(evidenceType || "unknown")}.json`;
}

function buildEvidenceIndexArtifacts(evidenceIndex, generatedAt) {
  const evidenceTypes = [
    "dateEvidence",
    "priceObservations",
    "matches",
    "dishMentions",
    "imageFeatures",
    "ocrCandidates",
    "ocrFailures",
    "sourceCoverage",
    "sourceProbes",
    "externalMenus",
    "recipeClusters",
    "dishRecipeLinks",
    "ingredientAnalytics",
    "priceAnalytics",
    "dishAnalytics",
    "enrichmentGaps",
  ];
  const artifacts = {};
  const shards = [];
  const index = {
    version: VERSION,
    generatedAt,
    summary: evidenceIndex.summary || {},
    sharded: true,
    shardKey: "evidenceType",
    shards,
  };

  for (const evidenceType of evidenceTypes) {
    const records = evidenceIndex[evidenceType] || {};
    const file = evidenceShardFileName(evidenceType);
    const summary = { records: Object.keys(records).length };
    const payload = {
      version: VERSION,
      generatedAt,
      evidenceType,
      summary,
      records,
    };
    artifacts[file] = payload;
    index[evidenceType] = {};
    shards.push({
      evidenceType,
      file: `graph/${file}`,
      summary,
      records: summary.records,
    });
  }

  artifacts["evidence-index.json"] = index;
  return { index, artifacts, shards };
}

async function buildGraphOverlay(options = {}) {
  const generatedAt = new Date().toISOString();
  const [
    menusPayload,
    matches,
    analytics,
    prices,
    dateEstimates,
    ontology,
    evaluations,
    enrichmentStatus,
    dishMentions,
    enrichmentPrices,
    imageFeatures,
    ocrTriage,
    ocrFailures,
    coverageReport,
    sourceProbes,
    externalMenuRecords,
    recipeBridge,
    runPlan,
    assimilationPlan,
  ] = await Promise.all([
    readJson(path.join(DATA_DIR, "menus.json"), { menus: [] }),
    readJson(path.join(DATA_DIR, "matches.json"), { relationships: [], matches: {} }),
    readJson(path.join(DATA_DIR, "analytics.json"), { topDishes: [] }),
    readJson(path.join(DATA_DIR, "prices.json"), { records: [] }),
    readJson(path.join(DATA_DIR, "date-estimates.json"), { records: [] }),
    readJson(path.join(DATA_DIR, "ontology.json"), { categories: {} }),
    readJson(path.join(REFERENCE_DIR, "source-evaluations.json"), { sources: [], capabilities: [] }),
    readJson(path.join(DATA_DIR, "enrichment-status.json"), { summary: {} }),
    readEnrichmentPayload(path.join(DATA_DIR, "enrichment", "dish-mentions.json"), { records: [] }),
    readEnrichmentPayload(path.join(DATA_DIR, "enrichment", "price-observations.json"), { records: [] }),
    readJson(path.join(DATA_DIR, "enrichment", "image-features.json"), { records: [] }),
    readJson(path.join(DATA_DIR, "enrichment", "ocr-triage-queue.json"), { records: [] }),
    readJson(path.join(DATA_DIR, "enrichment", "ocr-failures.json"), { records: [] }),
    readJson(path.join(DATA_DIR, "enrichment", "coverage-report.json"), { records: [], summary: {} }),
    readJson(path.join(DATA_DIR, "enrichment", "source-probes.json"), { records: [] }),
    readExternalMenuRecords(),
    readRecipeBridgePayload(path.join(DATA_DIR, "enrichment", "recipe-bridge.json"), { clusters: [], dishLinks: [], summary: {} }),
    readJson(path.join(DATA_DIR, "enrichment", "run-plan.json"), { summary: {}, recommendedSequence: [] }),
    readJson(path.join(DATA_DIR, "enrichment", "assimilation-plan.json"), { summary: {}, workstreams: [], phases: [] }),
  ]);

  const evaluationErrors = graphContract.validateSourceEvaluations(evaluations);
  if (evaluationErrors.length) throw new Error(`Invalid source evaluations:\n${evaluationErrors.join("\n")}`);

  const menus = menusPayload.menus || menusPayload.records || [];
  const enrichment = {
    status: enrichmentStatus,
    dishMentions,
    priceObservations: enrichmentPrices,
    imageFeatures,
    ocrTriage,
    ocrFailures,
    coverageReport,
    sourceProbes,
    externalMenuRecords,
    recipeBridge,
    runPlan,
    assimilationPlan,
  };
  const sourceCapabilities = buildSourceCapabilities(evaluations, generatedAt);
  const sourceErrors = graphContract.validateGraph(sourceCapabilities, { maxBytes: SIZE_BUDGET_BYTES });
  if (sourceErrors.length) throw new Error(`Invalid source-capabilities graph:\n${sourceErrors.join("\n")}`);

  const { overlays, evidenceIndex } = buildEvidenceIndexes({ menus, matches, prices, dateEstimates, enrichment });
  evidenceIndex.ingredientAnalytics = buildIngredientAnalytics({ menus, enrichment, recipeBridge });
  evidenceIndex.priceAnalytics = buildPriceAnalytics({ menus, enrichment });
  evidenceIndex.dishAnalytics = buildDishAnalytics({ menus, enrichment, recipeBridge });
  evidenceIndex.enrichmentGaps = buildEnrichmentGaps({ menus, enrichment, overlays });
  const core = buildCoreGraph({
    menus,
    evaluations,
    matches,
    prices,
    dateEstimates,
    ontology,
    analytics,
    evidenceIndex,
    overlays,
    enrichment,
    generatedAt,
  });
  const coreErrors = graphContract.validateGraph(core, { maxBytes: SIZE_BUDGET_BYTES });
  if (coreErrors.length) throw new Error(`Invalid core graph:\n${coreErrors.join("\n")}`);

  const menuOverlayArtifacts = buildMenuOverlayArtifacts(overlays, generatedAt);
  const menuOverlays = menuOverlayArtifacts.index;

  evidenceIndex.generatedAt = generatedAt;
  evidenceIndex.summary = {
    dateEvidence: Object.keys(evidenceIndex.dateEvidence).length,
    priceObservations: Object.keys(evidenceIndex.priceObservations).length,
    matches: Object.keys(evidenceIndex.matches).length,
    dishMentions: Object.keys(evidenceIndex.dishMentions).length,
    imageFeatures: Object.keys(evidenceIndex.imageFeatures).length,
    ocrCandidates: Object.keys(evidenceIndex.ocrCandidates).length,
    ocrFailures: Object.keys(evidenceIndex.ocrFailures).length,
    sourceCoverage: Object.keys(evidenceIndex.sourceCoverage).length,
    sourceProbes: Object.keys(evidenceIndex.sourceProbes).length,
    externalMenus: Object.keys(evidenceIndex.externalMenus).length,
    recipeClusters: Object.keys(evidenceIndex.recipeClusters).length,
    dishRecipeLinks: Object.keys(evidenceIndex.dishRecipeLinks).length,
    ingredientAnalytics: Object.keys(evidenceIndex.ingredientAnalytics).length,
    priceAnalytics: Object.keys(evidenceIndex.priceAnalytics).length,
    dishAnalytics: Object.keys(evidenceIndex.dishAnalytics).length,
    enrichmentGaps: Object.keys(evidenceIndex.enrichmentGaps).length,
  };
  const evidenceIndexArtifacts = buildEvidenceIndexArtifacts(evidenceIndex, generatedAt);
  const publicEvidenceIndex = evidenceIndexArtifacts.index;

  const artifacts = {
    "source-capabilities.json": sourceCapabilities,
    "core.json": core,
    ...menuOverlayArtifacts.artifacts,
    ...evidenceIndexArtifacts.artifacts,
  };

  const manifest = {
    version: VERSION,
    generatedAt,
    builder: "scripts/build-graph-overlay.js",
    mode: "static-first-menu-dish-price-date",
    sizeBudgetBytes: SIZE_BUDGET_BYTES,
    summary: {
      menus: menus.length,
      sourceCapabilities: sourceCapabilities.summary,
      core: core.summary,
      evidence: publicEvidenceIndex.summary,
      overlays: menuOverlays.summary,
      externalMenus: {
        records: enrichmentRecords(enrichment, "externalMenuRecords").length,
        bySource: Object.fromEntries(
          Object.entries(
            enrichmentRecords(enrichment, "externalMenuRecords").reduce((acc, record) => {
              const key = cleanValue(record.sourceId || record.sourceKey || "external");
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {})
          ).sort((a, b) => a[0].localeCompare(b[0]))
        ),
        dishMentions: enrichmentRecords(enrichment, "externalMenuRecords").reduce((sum, record) => sum + (record.dishMentions || []).length, 0),
        priceObservations: enrichmentRecords(enrichment, "externalMenuRecords").reduce((sum, record) => sum + (record.priceObservations || []).length, 0),
      },
      enrichment: {
        dishMentions: enrichmentRecords(enrichment, "dishMentions").length,
        priceObservations: enrichmentRecords(enrichment, "priceObservations").length,
        imageFeatures: enrichmentRecords(enrichment, "imageFeatures").length,
        ocrCandidates: enrichmentRecords(enrichment, "ocrTriage").length,
        ocrFailures: enrichmentRecords(enrichment, "ocrFailures").length,
        sourceCoverage: enrichmentRecords(enrichment, "coverageReport").length,
        sourceProbes: enrichmentRecords(enrichment, "sourceProbes").length,
        externalMenuRecords: enrichmentRecords(enrichment, "externalMenuRecords").length,
        recipeClusters: recipeBridge.summary?.clusters || (recipeBridge.clusters || []).length,
        dishRecipeLinks: recipeBridge.summary?.dishLinks || (recipeBridge.dishLinks || []).length,
        statusGeneratedAt: enrichmentStatus.summary?.ocrUpdatedAt || enrichmentStatus.finishedAt || enrichmentStatus.generatedAt || null,
      },
      recipeBridge: recipeBridge.summary || {},
      coverage: coverageReport.summary || {},
      runPlan: runPlan.summary || {},
      assimilationPlan: assimilationPlan.summary || {},
    },
    artifacts: Object.entries(artifacts).map(([name, payload]) => artifactInfo(name, payload)),
    shardPlan: {
      thresholdBytes: SIZE_BUDGET_BYTES,
      activeShards: ["menuOverlaysBySource", "menuOverlaysBySourcePartition", "evidenceByType"],
      nextShards: ["decade", "entityType"],
    },
  };
  artifacts["manifest.json"] = manifest;

  if (!options.dryRun) {
    await fs.mkdir(GRAPH_DIR, { recursive: true });
    await fs.rm(path.join(GRAPH_DIR, "menu-overlays"), { recursive: true, force: true });
    for (const [name, payload] of Object.entries(artifacts)) await writeJson(name, payload);
  }

  return { manifest, artifacts };
}

if (require.main === module) {
  buildGraphOverlay({ dryRun: process.argv.includes("--dry-run") })
    .then(({ manifest }) => {
      console.log(JSON.stringify(manifest.summary, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  buildGraphOverlay,
};
