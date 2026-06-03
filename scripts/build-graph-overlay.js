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

function buildDishCounts({ menus, analytics, ontology, prices }) {
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
  for (const menu of menus) for (const dish of (menu.topDishes || []).slice(0, 8)) add(dish, 1, "menu-top-dishes");
  for (const category of ["dishes", "ingredients", "beverages"]) {
    for (const term of ontology.categories?.[category] || []) add(term.term, term.count || 1, `ontology:${category}`);
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, MAX_DISH_NODES);
}

function buildEvidenceIndexes({ menus, matches, prices, dateEstimates }) {
  const menuIds = new Set(menus.map(recordUid));
  const overlays = {};
  const evidenceIndex = {
    version: VERSION,
    dateEvidence: {},
    priceObservations: {},
    matches: {},
  };

  for (const menu of menus) {
    const uid = recordUid(menu);
    overlays[uid] = {
      menuId: uid,
      sourceKey: cleanValue(menu.sourceKey || "cia"),
      counts: {
        dishMentions: 0,
        priceObservations: 0,
        dateEvidence: 0,
        matches: 0,
        ontologyTerms: 0,
      },
      topDishes: (menu.topDishes || []).slice(0, 3).map(cleanValue).filter(Boolean),
      priceObservationIds: [],
      dateEvidenceIds: [],
      matchIds: [],
    };
    overlays[uid].counts.dishMentions = overlays[uid].topDishes.length;
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

function buildCoreGraph({ menus, evaluations, matches, prices, dateEstimates, ontology, analytics, evidenceIndex, overlays, generatedAt }) {
  const coreNodes = new Map();
  const edges = [];
  const seenEdges = new Set();
  const menuIdSet = new Set();
  const coreMenuIds = selectCoreMenus(menus, overlays);
  const dishCounts = buildDishCounts({ menus, analytics, ontology, prices });
  const dishIds = new Set(dishCounts.map((dish) => dish.id));

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

    for (const dish of (menu.topDishes || []).slice(0, MAX_TOPOLOGY_DISH_EDGES_PER_MENU)) {
      const dishId = dishNodeId(dish);
      if (!dishIds.has(dishId)) continue;
      addEdge(
        edges,
        edge("MENTIONS_DISH", menuNodeId(uid), dishId, 0.62, menu.sourceKey === "nypl" ? 0.82 : 0.52, {
          sourceFile: "menus.json",
          sourceRecordId: cleanValue(menu.sourceRecordId || menu.pointer || menu.id),
          extraction: "source_top_dishes",
        }),
        seenEdges
      );
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
        sourceFile: "date-estimates.json",
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
        sourceFile: "date-estimates.json",
        sourceRecordId: record.menuId,
      }),
      seenEdges
    );
  }

  for (const [index, [id, record]] of Object.entries(evidenceIndex.priceObservations).entries()) {
    if (index >= MAX_CORE_PRICE_NODES) break;
    if (!menuIdSet.has(record.menuId)) continue;
    addNode(
      coreNodes,
      node(id, "PriceObservation", `${record.item || "Price"} ${record.rawPrice || ""}`.trim(), "prices", priceConfidence(record), {
        sourceFile: "prices.json",
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
        sourceFile: "prices.json",
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

  return {
    version: VERSION,
    generatedAt,
    summary: {
      nodes: coreNodes.size,
      edges: edges.length,
      menus: menus.length,
      coreMenus: menuIdSet.size,
      sources: (evaluations.sources || []).length,
      dateEvidence: Object.keys(evidenceIndex.dateEvidence).length,
      priceObservationsIndexed: Object.keys(evidenceIndex.priceObservations).length,
      priceObservationNodes: Math.min(MAX_CORE_PRICE_NODES, Object.keys(evidenceIndex.priceObservations).length),
      matches: (matches.relationships || []).length,
      dishNodes: dishCounts.length,
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
  await fs.writeFile(path.join(GRAPH_DIR, name), `${JSON.stringify(payload)}\n`, "utf8");
}

async function buildGraphOverlay(options = {}) {
  const generatedAt = new Date().toISOString();
  const [menusPayload, matches, analytics, prices, dateEstimates, ontology, evaluations] = await Promise.all([
    readJson(path.join(DATA_DIR, "menus.json"), { menus: [] }),
    readJson(path.join(DATA_DIR, "matches.json"), { relationships: [], matches: {} }),
    readJson(path.join(DATA_DIR, "analytics.json"), { topDishes: [] }),
    readJson(path.join(DATA_DIR, "prices.json"), { records: [] }),
    readJson(path.join(DATA_DIR, "date-estimates.json"), { records: [] }),
    readJson(path.join(DATA_DIR, "ontology.json"), { categories: {} }),
    readJson(path.join(REFERENCE_DIR, "source-evaluations.json"), { sources: [], capabilities: [] }),
  ]);

  const evaluationErrors = graphContract.validateSourceEvaluations(evaluations);
  if (evaluationErrors.length) throw new Error(`Invalid source evaluations:\n${evaluationErrors.join("\n")}`);

  const menus = menusPayload.menus || menusPayload.records || [];
  const sourceCapabilities = buildSourceCapabilities(evaluations, generatedAt);
  const sourceErrors = graphContract.validateGraph(sourceCapabilities, { maxBytes: SIZE_BUDGET_BYTES });
  if (sourceErrors.length) throw new Error(`Invalid source-capabilities graph:\n${sourceErrors.join("\n")}`);

  const { overlays, evidenceIndex } = buildEvidenceIndexes({ menus, matches, prices, dateEstimates });
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
    generatedAt,
  });
  const coreErrors = graphContract.validateGraph(core, { maxBytes: SIZE_BUDGET_BYTES });
  if (coreErrors.length) throw new Error(`Invalid core graph:\n${coreErrors.join("\n")}`);

  const menuOverlays = {
    version: VERSION,
    generatedAt,
    summary: {
      menus: Object.keys(overlays).length,
      withPrices: Object.values(overlays).filter((item) => item.counts.priceObservations).length,
      withDateEvidence: Object.values(overlays).filter((item) => item.counts.dateEvidence).length,
      withMatches: Object.values(overlays).filter((item) => item.counts.matches).length,
      withDishes: Object.values(overlays).filter((item) => item.counts.dishMentions).length,
    },
    records: overlays,
  };

  evidenceIndex.generatedAt = generatedAt;
  evidenceIndex.summary = {
    dateEvidence: Object.keys(evidenceIndex.dateEvidence).length,
    priceObservations: Object.keys(evidenceIndex.priceObservations).length,
    matches: Object.keys(evidenceIndex.matches).length,
  };

  const artifacts = {
    "source-capabilities.json": sourceCapabilities,
    "core.json": core,
    "menu-overlays.json": menuOverlays,
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
    },
    artifacts: Object.entries(artifacts).map(([name, payload]) => artifactInfo(name, payload)),
    shardPlan: {
      thresholdBytes: SIZE_BUDGET_BYTES,
      nextShards: ["sourceKey", "decade", "entityType"],
    },
  };
  artifacts["manifest.json"] = manifest;

  if (!options.dryRun) {
    await fs.mkdir(GRAPH_DIR, { recursive: true });
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
