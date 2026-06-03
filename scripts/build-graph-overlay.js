const fs = require("fs/promises");
const path = require("path");
const graphContract = require("../docs/graph-contract");

const DATA_DIR = path.join(__dirname, "..", "docs", "data");
const GRAPH_DIR = path.join(DATA_DIR, "graph");
const REFERENCE_DIR = path.join(DATA_DIR, "reference");
const VERSION = 1;
const MAX_CORE_PRICE_NODES = 1200;
const MAX_DISH_NODES = 1000;
const MAX_TOPOLOGY_DISH_EDGES_PER_MENU = 3;
const MAX_ONTOLOGY_EDGES_PER_TERM = 30;
const SIZE_BUDGET_BYTES = graphContract.STATIC_ARTIFACT_BUDGET_BYTES;
const MAX_CORE_MENU_NODES = 2000;
const MAX_EXTERNAL_MENU_NODES = 500;
const MAX_INGREDIENT_TERMS = 120;
const MAX_DISH_EVIDENCE_INDEX = 10000;
const MAX_IMAGE_EVIDENCE_INDEX = 2000;
const MAX_OCR_CANDIDATE_INDEX = 2000;
const MAX_EXTERNAL_DISH_EDGES_PER_MENU = 4;

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

function priceNodeId(record, index) {
  return `price:${cleanValue(record.id || `${record.menuId || "menu"}:${slug(record.item || "item")}:${index}`)}`;
}

function dateEvidenceNodeId(record) {
  return `date:${cleanValue(record.menuId || record.menu_id || "unknown")}`;
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
    sourceProbes: {},
    externalMenus: {},
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
      },
      topDishes: (menu.topDishes || []).slice(0, 3).map(cleanValue).filter(Boolean),
      ingredientTags: [],
      dishMentionIds: [],
      priceObservationIds: [],
      dateEvidenceIds: [],
      matchIds: [],
      imageFeatureIds: [],
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
      },
      topDishes: (record.dishHints || dishMentions || []).slice(0, 3).map((dish) => cleanValue(dish.rawName || dish.normalizedName)).filter(Boolean),
      ingredientTags: [...ingredientTags].sort().slice(0, 8),
      dishMentionIds: [],
      priceObservationIds: [],
      dateEvidenceIds: [],
      matchIds: [],
      imageFeatureIds: [],
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
        reviewStatus: "source_metadata",
        sourceFile,
        evidence: [
          {
            method: "date_created",
            source: cleanValue(record.sourceId || record.sourceKey),
            effect: cleanValue(record.dateText),
            confidence: record.dateConfidence || "C",
          },
        ],
      };
      overlays[uid].dateEvidenceIds.push(id);
    }
    for (const dish of dishMentions) {
      if (overlays[uid].dishMentionIds.length < 3 && dishEvidenceIndexed < MAX_DISH_EVIDENCE_INDEX) {
        overlays[uid].dishMentionIds.push(dish.id);
        dishEvidenceIndexed += 1;
        evidenceIndex.dishMentions[dish.id] = {
          id: dish.id,
          menuId: uid,
          sourceId: cleanValue(dish.sourceId || record.sourceId),
          rawName: cleanValue(dish.rawName),
          normalizedName: cleanValue(dish.normalizedName),
          dishType: cleanValue(dish.dishType),
          ingredientTags: (dish.ingredientTags || []).slice(0, 8).map(cleanValue),
          sectionName: cleanValue(dish.sectionName),
          confidence: Number(dish.confidence || 0),
          method: cleanValue(dish.extractionMethod || "external"),
          sourceFile,
        };
      }
    }
    for (const [priceIndex, price] of priceObservations.entries()) {
      const id = priceNodeId(price, `external:${priceIndex}`);
      if (overlays[uid].priceObservationIds.length < 6) overlays[uid].priceObservationIds.push(id);
      evidenceIndex.priceObservations[id] = {
        id,
        menuId: uid,
        sourceId: cleanValue(price.sourceId || record.sourceId),
        item: cleanValue(price.item || price.rawName),
        rawPrice: cleanValue(price.rawPrice || price.rawPriceText),
        amount: Number.isFinite(Number(price.amount)) ? Number(price.amount) : null,
        currency: cleanValue(price.currency || price.currencyCode),
        year: price.year || record.year || record.pointYear || null,
        confidence: cleanValue(price.confidence || "medium"),
        dishType: cleanValue(price.dishType),
        ingredientTags: (price.ingredientTags || []).slice(0, 8).map(cleanValue),
        normalized: price.normalized
          ? {
              todayUsd: price.normalized.todayUsd ?? null,
              relativeIndex: price.normalized.relativeIndex ?? null,
              caveat: cleanValue(price.normalized.caveat),
            }
          : null,
        sourceFile,
        external: true,
      };
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

  for (const record of enrichmentRecords(enrichment, "dishMentions")) {
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
    const isOcrDish = record.extractionMethod === "local_vision_ocr_dish";
    if (overlay.dishMentionIds.length < 2 && (isOcrDish || dishEvidenceIndexed < MAX_DISH_EVIDENCE_INDEX)) {
      overlay.dishMentionIds.push(record.id);
      if (!isOcrDish) dishEvidenceIndexed += 1;
      evidenceIndex.dishMentions[record.id] = {
        id: record.id,
        menuId: uid,
        rawName: cleanValue(record.rawName),
        normalizedName: cleanValue(record.normalizedName),
        dishType: cleanValue(record.dishType),
        ingredientTags: (record.ingredientTags || []).slice(0, 8).map(cleanValue),
        sectionName: cleanValue(record.sectionName),
        confidence: Number(record.confidence || 0),
        method: cleanValue(record.extractionMethod),
      };
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
      evidenceIndex.priceObservations[id] = {
        id,
        menuId: uid,
        item: cleanValue(record.rawName || record.normalizedName),
        rawPrice: cleanValue(record.rawPriceText || record.amount),
        amount: Number.isFinite(Number(record.amount)) ? Number(record.amount) : null,
        currency: cleanValue(record.currencyCode),
        year: record.year || null,
        confidence: cleanValue(record.confidence || "unknown"),
        dishType: cleanValue(record.dishType),
        ingredientTags: (record.ingredientTags || []).slice(0, 8).map(cleanValue),
        normalized: record.normalized
          ? {
              todayUsd: record.normalized.todayUsd ?? null,
              relativeIndex: record.normalized.relativeIndex ?? null,
              caveat: cleanValue(record.normalized.caveat),
            }
          : null,
        method: cleanValue(record.extractionMethod),
      };
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
      reviewStatus: record.reviewStatus || "machine_inferred",
      evidence: (record.evidence || []).slice(0, 3).map((item) => ({
        method: item.method,
        source: cleanValue(item.source),
        effect: cleanValue(item.effect),
        confidence: item.confidence || record.confidence || "X",
      })),
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
      evidenceIndex.priceObservations[id] = {
        id,
        menuId: uid,
        item: cleanValue(record.item),
        rawPrice: cleanValue(record.rawPrice || record.rawAmount || record.amount),
        amount: Number.isFinite(Number(record.amount)) ? Number(record.amount) : null,
        currency: cleanValue(record.currency),
        year: record.year || null,
        confidence: cleanValue(record.confidence || "unknown"),
        dishType: cleanValue(enhancement?.dishType),
        ingredientTags: (enhancement?.ingredientTags || []).slice(0, 8).map(cleanValue),
        normalized: record.normalized
          ? {
              todayUsd: record.normalized.todayUsd ?? null,
              relativeIndex: record.normalized.relativeIndex ?? null,
              caveat: cleanValue(record.normalized.caveat),
            }
          : null,
      };
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
      pageCount: Number(record.pageCount || 0) || null,
      estimatedImages: Number(record.estimatedImages || 0),
      missingEvidence: record.missingEvidence || {},
      expectedYield: record.expectedYield || {},
      imageAssessment: {
        hasImage: Boolean(record.imageAssessment?.hasImage),
        hasDimensions: Boolean(record.imageAssessment?.hasDimensions),
        width: record.imageAssessment?.width ?? null,
        height: record.imageAssessment?.height ?? null,
        orientation: cleanValue(record.imageAssessment?.orientation || "unknown"),
      },
      sourceFile: cleanValue(record.provenance?.sourceFile || "enrichment/ocr-triage-queue.json"),
    };
  }

  for (const record of enrichmentRecords(enrichment, "sourceProbes")) {
    evidenceIndex.sourceProbes[record.sourceId] = {
      sourceId: record.sourceId,
      status: cleanValue(record.status),
      sourceUrl: cleanValue(record.sourceUrl),
      publicItemCount: record.publicItemCount ?? null,
      sampleItems: (record.sampleItems || []).slice(0, 8),
      notes: cleanValue(record.notes),
      error: cleanValue(record.error),
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
        evidence: (relationship.evidence || []).slice(0, 3).map(cleanValue),
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
  };
}

function overlayShardFileName(sourceKey) {
  return `menu-overlays/by-source/${slug(sourceKey || "unknown")}.json`;
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
    const payload = {
      version: VERSION,
      generatedAt,
      sourceKey,
      summary,
      records,
    };
    artifacts[file] = payload;
    shards.push({
      sourceKey,
      file: `graph/${file}`,
      summary,
      records: summary.menus,
    });
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
    sourceProbes,
    externalMenuRecords,
  ] = await Promise.all([
    readJson(path.join(DATA_DIR, "menus.json"), { menus: [] }),
    readJson(path.join(DATA_DIR, "matches.json"), { relationships: [], matches: {} }),
    readJson(path.join(DATA_DIR, "analytics.json"), { topDishes: [] }),
    readJson(path.join(DATA_DIR, "prices.json"), { records: [] }),
    readJson(path.join(DATA_DIR, "date-estimates.json"), { records: [] }),
    readJson(path.join(DATA_DIR, "ontology.json"), { categories: {} }),
    readJson(path.join(REFERENCE_DIR, "source-evaluations.json"), { sources: [], capabilities: [] }),
    readJson(path.join(DATA_DIR, "enrichment-status.json"), { summary: {} }),
    readJson(path.join(DATA_DIR, "enrichment", "dish-mentions.json"), { records: [] }),
    readJson(path.join(DATA_DIR, "enrichment", "price-observations.json"), { records: [] }),
    readJson(path.join(DATA_DIR, "enrichment", "image-features.json"), { records: [] }),
    readJson(path.join(DATA_DIR, "enrichment", "ocr-triage-queue.json"), { records: [] }),
    readJson(path.join(DATA_DIR, "enrichment", "source-probes.json"), { records: [] }),
    readExternalMenuRecords(),
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
    sourceProbes,
    externalMenuRecords,
  };
  const sourceCapabilities = buildSourceCapabilities(evaluations, generatedAt);
  const sourceErrors = graphContract.validateGraph(sourceCapabilities, { maxBytes: SIZE_BUDGET_BYTES });
  if (sourceErrors.length) throw new Error(`Invalid source-capabilities graph:\n${sourceErrors.join("\n")}`);

  const { overlays, evidenceIndex } = buildEvidenceIndexes({ menus, matches, prices, dateEstimates, enrichment });
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
    sourceProbes: Object.keys(evidenceIndex.sourceProbes).length,
    externalMenus: Object.keys(evidenceIndex.externalMenus).length,
  };

  const artifacts = {
    "source-capabilities.json": sourceCapabilities,
    "core.json": core,
    ...menuOverlayArtifacts.artifacts,
    "evidence-index.json": evidenceIndex,
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
      evidence: evidenceIndex.summary,
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
        sourceProbes: enrichmentRecords(enrichment, "sourceProbes").length,
        externalMenuRecords: enrichmentRecords(enrichment, "externalMenuRecords").length,
        statusGeneratedAt: enrichmentStatus.finishedAt || enrichmentStatus.generatedAt || null,
      },
    },
    artifacts: Object.entries(artifacts).map(([name, payload]) => artifactInfo(name, payload)),
    shardPlan: {
      thresholdBytes: SIZE_BUDGET_BYTES,
      activeShards: ["menuOverlaysBySource"],
      nextShards: ["decade", "entityType", "evidenceType"],
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
