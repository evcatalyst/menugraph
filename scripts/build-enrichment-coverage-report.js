const fs = require("fs/promises");
const path = require("path");
const { cleanValue } = require("../docs/multisource");
const { readEnrichmentPayload } = require("./enrichment-shards");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const ENRICHMENT_DIR = path.join(DATA_DIR, "enrichment");
const SOURCE_DIR = path.join(ENRICHMENT_DIR, "external-sources");
const OUTPUT_PATH = path.join(ENRICHMENT_DIR, "coverage-report.json");
const VERSION = 1;

function argValue(args, name, fallback = null) {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(args, name) {
  return args.includes(`--${name}`);
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

function sourceIdForKey(sourceKey) {
  const key = cleanValue(sourceKey).toLowerCase();
  if (key === "cia") return "cia_menu_collection";
  if (key === "nypl") return "nypl_wotm";
  if (key === "lapl") return "lapl_menu_collection";
  if (key === "cornell") return "cornell_nestle_menu_collection";
  if (key === "uh") return "uh_1850s_1860s_menus";
  if (key === "northwestern") return "northwestern_transport_menus";
  if (key === "milwaukee") return "milwaukee_historic_menus";
  if (key === "uw") return "uw_menus_collection";
  if (key === "nola") return "nola_menu_collection";
  if (key === "seattle") return "seattle_room_menu_collection";
  if (key === "denver") return "denver_menu_collection";
  return key ? `${key.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}_source` : "unknown_source";
}

function sourceIdForRecord(record = {}) {
  return cleanValue(record.sourceId) || sourceIdForKey(record.sourceKey || "external");
}

function recordMenuId(record = {}) {
  return cleanValue(record.menuId || record.menuUid || record.id);
}

function numberRatio(value, total) {
  if (!Number(total)) return 0;
  return Number(Math.min(1, Math.max(0, Number(value || 0) / Number(total))).toFixed(3));
}

function countObject(map) {
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function topObject(map, limit = 12) {
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit));
}

function addCount(map, key, amount = 1) {
  const value = cleanValue(key);
  if (!value) return;
  map.set(value, (map.get(value) || 0) + amount);
}

function blankSource(id, label = id, sourceKey = "") {
  return {
    sourceId: id,
    sourceKey: cleanValue(sourceKey),
    label: cleanValue(label || id),
    sourceType: "menu",
    staticMenuIds: new Set(),
    externalMenuIds: new Set(),
    dateMenuIds: new Set(),
    dishMenuIds: new Set(),
    priceMenuIds: new Set(),
    ingredientMenuIds: new Set(),
    imageMenuIds: new Set(),
    ocrCandidateIds: new Set(),
    ocrProcessedMenuIds: new Set(),
    ocrFailureMenuIds: new Set(),
    recipeClusterIds: new Set(),
    counts: {
      dishMentions: 0,
      priceObservations: 0,
      imageFeatures: 0,
      ocrPagesProcessed: 0,
      ocrPagesFailed: 0,
      ocrTextLines: 0,
      recipeClusterCandidates: 0,
    },
    ingredientTags: new Map(),
    dishTypes: new Map(),
    transportModes: new Map(),
    failureClasses: new Map(),
    nextActions: [],
  };
}

function sourceRecord(sources, id, label = id, sourceKey = "") {
  const sourceId = cleanValue(id) || "unknown_source";
  if (!sources.has(sourceId)) sources.set(sourceId, blankSource(sourceId, label, sourceKey));
  const record = sources.get(sourceId);
  if (label && record.label === sourceId) record.label = cleanValue(label);
  if (sourceKey && !record.sourceKey) record.sourceKey = cleanValue(sourceKey);
  return record;
}

async function externalRecords() {
  const output = [];
  const seen = new Set();
  const append = (payload) => {
    for (const record of payload.records || []) {
      const sourceId = sourceIdForRecord(record);
      const menuId = recordMenuId(record);
      const key = `${sourceId}|${menuId || cleanValue(record.sourceRecordId)}`;
      if (!sourceId || !key || seen.has(key)) continue;
      seen.add(key);
      output.push(record);
    }
  };

  append(await readJson(path.join(ENRICHMENT_DIR, "external-menu-records.json"), { records: [] }));
  let names = [];
  try {
    names = await fs.readdir(SOURCE_DIR);
  } catch (error) {
    names = [];
  }
  for (const name of names.filter((item) => item.endsWith(".json")).sort()) {
    append(await readJson(path.join(SOURCE_DIR, name), { records: [] }));
  }
  return output;
}

function ingestSourceEvaluations(sources, evaluations) {
  const recipeSourceIds = new Set([
    "recipe1m_plus",
    "recipenlg",
    "foodcom_recipes_interactions",
    "epicurious_kaggle",
    "yummly_whats_cooking",
    "the_sifter",
  ]);
  for (const source of evaluations.sources || []) {
    const record = sourceRecord(sources, source.id, source.label, source.sourceKey || "");
    record.scores = source.scores || {};
    record.capabilityWeights = source.capabilityWeights || {};
    if (recipeSourceIds.has(source.id)) record.sourceType = "recipe_or_food_history";
    if (source.id === "dotlas_structured_menus") record.sourceType = "commercial_modern_menu";
  }
}

function ingestMenus(sources, menus) {
  for (const menu of menus || []) {
    const sourceId = sourceIdForKey(menu.sourceKey || "cia");
    const record = sourceRecord(sources, sourceId, sourceId, menu.sourceKey || "cia");
    const menuId = recordMenuId(menu) || `${menu.sourceKey || "cia"}:${cleanValue(menu.sourceRecordId || menu.pointer || menu.id)}`;
    if (!menuId) continue;
    record.staticMenuIds.add(menuId);
    if (menu.year || (menu.decade && menu.decade !== "unknown")) record.dateMenuIds.add(menuId);
    if ((menu.topDishes || []).length) record.dishMenuIds.add(menuId);
  }
}

function ingestExternalRecords(sources, records) {
  for (const item of records || []) {
    const sourceId = sourceIdForRecord(item);
    const record = sourceRecord(sources, sourceId, sourceId, item.sourceKey);
    const menuId = recordMenuId(item);
    if (!menuId) continue;
    record.externalMenuIds.add(menuId);
    if (item.year || item.pointYear || item.lowerYear || item.upperYear || (item.decade && item.decade !== "unknown")) record.dateMenuIds.add(menuId);
    const dishMentions = item.dishMentions || [];
    const priceObservations = item.priceObservations || [];
    const ingredientTags = new Set([
      ...(item.ingredientTags || []),
      ...dishMentions.flatMap((dish) => dish.ingredientTags || []),
      ...priceObservations.flatMap((price) => price.ingredientTags || []),
    ].map(cleanValue).filter(Boolean));
    if (dishMentions.length || (item.dishHints || []).length) record.dishMenuIds.add(menuId);
    if (priceObservations.length) record.priceMenuIds.add(menuId);
    if (ingredientTags.size) record.ingredientMenuIds.add(menuId);
    if ((item.imageFeatures || []).length || item.iiifManifestUrl || item.iiifInfoUri || item.imageUri || item.thumbnailUrl) record.imageMenuIds.add(menuId);
    record.counts.dishMentions += dishMentions.length || (item.dishHints || []).length;
    record.counts.priceObservations += priceObservations.length;
    record.counts.imageFeatures += (item.imageFeatures || []).length;
    if (item.transportMode) addCount(record.transportModes, item.transportMode);
    for (const tag of ingredientTags) addCount(record.ingredientTags, tag);
    for (const dish of dishMentions) addCount(record.dishTypes, dish.dishType);
  }
}

function ingestDishMentions(sources, records) {
  for (const item of records || []) {
    const sourceId = sourceIdForRecord(item);
    const record = sourceRecord(sources, sourceId, sourceId, item.sourceKey);
    const menuId = recordMenuId(item);
    if (menuId) record.dishMenuIds.add(menuId);
    record.counts.dishMentions += 1;
    if ((item.ingredientTags || []).length && menuId) record.ingredientMenuIds.add(menuId);
    for (const tag of item.ingredientTags || []) addCount(record.ingredientTags, tag);
    addCount(record.dishTypes, item.dishType);
  }
}

function ingestPriceObservations(sources, records) {
  for (const item of records || []) {
    const sourceId = sourceIdForRecord(item);
    const record = sourceRecord(sources, sourceId, sourceId, item.sourceKey);
    const menuId = recordMenuId(item);
    if (menuId) record.priceMenuIds.add(menuId);
    record.counts.priceObservations += 1;
    if ((item.ingredientTags || []).length && menuId) record.ingredientMenuIds.add(menuId);
    for (const tag of item.ingredientTags || []) addCount(record.ingredientTags, tag);
  }
}

function ingestImageFeatures(sources, records) {
  for (const item of records || []) {
    const sourceId = sourceIdForRecord(item);
    const record = sourceRecord(sources, sourceId, sourceId, item.sourceKey);
    const menuId = recordMenuId(item);
    if (menuId) record.imageMenuIds.add(menuId);
    record.counts.imageFeatures += 1;
  }
}

function ingestOcr(sources, candidates, extractions, failures) {
  for (const item of candidates || []) {
    const sourceId = sourceIdForRecord(item);
    const record = sourceRecord(sources, sourceId, sourceId, item.sourceKey);
    if (item.id) record.ocrCandidateIds.add(cleanValue(item.id));
  }
  for (const item of extractions || []) {
    const sourceId = sourceIdForRecord(item);
    const record = sourceRecord(sources, sourceId, sourceId, item.sourceKey);
    const menuId = recordMenuId(item);
    if (item.status === "error") {
      if (menuId) record.ocrFailureMenuIds.add(menuId);
      record.counts.ocrPagesFailed += 1;
      continue;
    }
    if (menuId) record.ocrProcessedMenuIds.add(menuId);
    record.counts.ocrPagesProcessed += 1;
    record.counts.ocrTextLines += Number(item.lineCount || 0);
  }
  for (const item of failures || []) {
    const sourceId = sourceIdForRecord(item);
    const record = sourceRecord(sources, sourceId, sourceId, item.sourceKey);
    const menuId = recordMenuId(item);
    if (menuId) record.ocrFailureMenuIds.add(menuId);
    addCount(record.failureClasses, item.errorClass);
  }
}

function ingestRecipeBridge(sources, recipeBridge) {
  for (const cluster of recipeBridge.clusters || []) {
    for (const candidate of cluster.sourceCandidates || []) {
      const sourceId = cleanValue(candidate.sourceId);
      if (!sourceId) continue;
      const record = sourceRecord(sources, sourceId, sourceId, "");
      record.recipeClusterIds.add(cleanValue(cluster.id));
      record.counts.recipeClusterCandidates += 1;
    }
  }
}

function action(id, label, priority, reason) {
  return { id, label, priority: Number(Number(priority).toFixed(2)), reason: cleanValue(reason).slice(0, 180) };
}

function actionsForSource(row, probe = null) {
  const actions = [];
  if (row.sourceType === "commercial_modern_menu") {
    actions.push(action("license_diligence", "Complete access and license diligence before row ingestion", 6, "Commercial/marketplace data should not enter the public static graph until rights are explicit."));
    return actions;
  }
  if (row.sourceType === "recipe_or_food_history") {
    if (row.recipeBridgeClusters > 0) {
      actions.push(action("recipe_bridge_expansion", "Expand recipe bridge with rights-cleared sample rows", row.sourceId === "the_sifter" ? 7.4 : 6.2, `${row.recipeBridgeClusters} recipe bridge cluster(s) already target this source; next step is rights-cleared sample ingestion.`));
    } else {
      actions.push(action("recipe_bridge_sampling", "Build recipe bridge samples, not full row ingestion", row.sourceId === "the_sifter" ? 7 : 5, "Recipe sources should enrich dish/ingredient semantics through linked clusters and provenance-safe snippets."));
    }
    return actions;
  }
  if (row.ocrFailures > 0) {
    actions.push(action("source_image_route_review", "Review blocked OCR image routes", 8 + Math.min(2, row.ocrFailures / 20), `${row.ocrFailures} OCR page(s) are classified for access, alternate route, or metadata review.`));
  }
  if (row.rowCount > 0 && row.priceCoverage < 0.08 && row.imageCoverage >= 0.4) {
    actions.push(action("local_ocr_price_pass", "Run a targeted local OCR price pass", 7.2, "Price coverage is low while image metadata coverage is high enough to support page-level extraction."));
  }
  if (row.rowCount > 0 && row.dishCoverage < 0.5) {
    actions.push(action("metadata_dish_hint_pass", "Expand dish/entity extraction from metadata and OCR", 6.4, "Dish coverage is below half of known rows; run keyword extraction and entity normalization before broad ML work."));
  }
  if (row.rowCount > 0 && row.imageCoverage < 0.5) {
    actions.push(action("iiif_image_assessment", "Assess IIIF/image metadata coverage", 5.9, "Image metadata coverage is thin; dimensions and page counts improve OCR routing and visual-style triage."));
  }
  if (probe?.publicItemCount && probe.publicItemCount > row.rowCount * 1.5) {
    actions.push(action("expand_source_limit", "Increase source scrape limit", 5.5, `${probe.publicItemCount} public item(s) observed versus ${row.rowCount} row(s) currently represented.`));
  }
  if (!row.rowCount && row.sourceType === "menu") {
    actions.push(action("source_probe_or_ingest", "Probe or ingest source rows", 4.8, "Source is modeled in capabilities but has no row-level menu evidence yet."));
  }
  return actions.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)).slice(0, 4);
}

function sourceRows(sources, sourceProbes) {
  const probeBySource = new Map((sourceProbes.records || []).map((item) => [cleanValue(item.sourceId), item]));
  return [...sources.values()]
    .map((source) => {
      const rowMenuIds = new Set([...source.staticMenuIds, ...source.externalMenuIds]);
      const rowCount = rowMenuIds.size;
      const row = {
        sourceId: source.sourceId,
        sourceKey: source.sourceKey || null,
        label: source.label,
        sourceType: source.sourceType,
        rowCount,
        staticRows: source.staticMenuIds.size,
        externalRows: source.externalMenuIds.size,
        dateMenus: source.dateMenuIds.size,
        dishMenus: source.dishMenuIds.size,
        priceMenus: source.priceMenuIds.size,
        ingredientMenus: source.ingredientMenuIds.size,
        imageMenus: source.imageMenuIds.size,
        ocrCandidates: source.ocrCandidateIds.size,
        ocrProcessedMenus: source.ocrProcessedMenuIds.size,
        ocrFailures: source.ocrFailureMenuIds.size,
        recipeBridgeClusters: source.recipeClusterIds.size,
        dishMentions: source.counts.dishMentions,
        priceObservations: source.counts.priceObservations,
        imageFeatures: source.counts.imageFeatures,
        ocrPagesProcessed: source.counts.ocrPagesProcessed,
        ocrPagesFailed: source.counts.ocrPagesFailed,
        ocrTextLines: source.counts.ocrTextLines,
        recipeClusterCandidates: source.counts.recipeClusterCandidates,
        dateCoverage: numberRatio(source.dateMenuIds.size, rowCount),
        dishCoverage: numberRatio(source.dishMenuIds.size, rowCount),
        priceCoverage: numberRatio(source.priceMenuIds.size, rowCount),
        ingredientCoverage: numberRatio(source.ingredientMenuIds.size, rowCount),
        imageCoverage: numberRatio(source.imageMenuIds.size, rowCount),
        topIngredientTags: topObject(source.ingredientTags, 10),
        topDishTypes: topObject(source.dishTypes, 8),
        transportModes: topObject(source.transportModes, 8),
        failureClasses: topObject(source.failureClasses, 6),
      };
      const probe = probeBySource.get(source.sourceId);
      row.publicItemCount = probe?.publicItemCount ?? null;
      row.status =
        row.staticRows ? "static_app_rows" :
        row.externalRows ? "external_graph_rows" :
        row.recipeBridgeClusters ? "recipe_bridge_targets" :
        probe ? "probed_only" :
        row.sourceType === "menu" ? "modeled_only" : "capability_only";
      row.coverageScore = Number((
        row.dateCoverage * 0.18 +
        row.dishCoverage * 0.24 +
        row.priceCoverage * 0.24 +
        row.ingredientCoverage * 0.18 +
        row.imageCoverage * 0.16
      ).toFixed(3));
      row.nextActions = actionsForSource(row, probe);
      row.primaryNextAction = row.nextActions[0]?.id || "monitor";
      return row;
    })
    .sort((a, b) => {
      const statusRank = { static_app_rows: 0, external_graph_rows: 1, recipe_bridge_targets: 2, probed_only: 3, modeled_only: 4, capability_only: 5 };
      return statusRank[a.status] - statusRank[b.status] || b.rowCount - a.rowCount || a.label.localeCompare(b.label);
    });
}

function globalActions(rows) {
  return rows
    .flatMap((row) => row.nextActions.map((item) => ({ ...item, sourceId: row.sourceId, sourceLabel: row.label })))
    .sort((a, b) => b.priority - a.priority || a.sourceLabel.localeCompare(b.sourceLabel))
    .slice(0, 20);
}

function summarizeRows(rows) {
  const menuRows = rows.filter((row) => row.sourceType === "menu");
  const rowSources = rows.filter((row) => row.rowCount > 0);
  return {
    sources: rows.length,
    menuSources: menuRows.length,
    rowLevelSources: rowSources.length,
    rowCount: rows.reduce((sum, row) => sum + row.rowCount, 0),
    staticRows: rows.reduce((sum, row) => sum + row.staticRows, 0),
    externalRows: rows.reduce((sum, row) => sum + row.externalRows, 0),
    dishMenus: rows.reduce((sum, row) => sum + row.dishMenus, 0),
    priceMenus: rows.reduce((sum, row) => sum + row.priceMenus, 0),
    ingredientMenus: rows.reduce((sum, row) => sum + row.ingredientMenus, 0),
    imageMenus: rows.reduce((sum, row) => sum + row.imageMenus, 0),
    ocrCandidates: rows.reduce((sum, row) => sum + row.ocrCandidates, 0),
    ocrProcessedMenus: rows.reduce((sum, row) => sum + row.ocrProcessedMenus, 0),
    ocrFailures: rows.reduce((sum, row) => sum + row.ocrFailures, 0),
    recipeBridgeClusters: rows.reduce((sum, row) => sum + row.recipeBridgeClusters, 0),
    averageCoverageScore: rowSources.length ? Number((rowSources.reduce((sum, row) => sum + row.coverageScore, 0) / rowSources.length).toFixed(3)) : 0,
    byStatus: countObject(rows.reduce((map, row) => {
      addCount(map, row.status);
      return map;
    }, new Map())),
    topNextActions: countObject(rows.reduce((map, row) => {
      addCount(map, row.primaryNextAction);
      return map;
    }, new Map())),
  };
}

async function buildEnrichmentCoverageReport(options = {}) {
  const generatedAt = new Date().toISOString();
  const [
    evaluations,
    menusPayload,
    dishMentions,
    priceObservations,
    imageFeatures,
    ocrQueue,
    ocrExtractions,
    ocrFailures,
    sourceProbes,
    recipeBridge,
  ] = await Promise.all([
    readJson(path.join(DATA_DIR, "reference", "source-evaluations.json"), { sources: [] }),
    readJson(path.join(DATA_DIR, "menus.json"), { menus: [] }),
    readEnrichmentPayload(path.join(ENRICHMENT_DIR, "dish-mentions.json"), { records: [] }),
    readEnrichmentPayload(path.join(ENRICHMENT_DIR, "price-observations.json"), { records: [] }),
    readJson(path.join(ENRICHMENT_DIR, "image-features.json"), { records: [] }),
    readJson(path.join(ENRICHMENT_DIR, "ocr-triage-queue.json"), { records: [] }),
    readEnrichmentPayload(path.join(ENRICHMENT_DIR, "ocr-extractions.json"), { records: [] }),
    readJson(path.join(ENRICHMENT_DIR, "ocr-failures.json"), { records: [] }),
    readJson(path.join(ENRICHMENT_DIR, "source-probes.json"), { records: [] }),
    readJson(path.join(ENRICHMENT_DIR, "recipe-bridge.json"), { clusters: [], summary: {} }),
  ]);
  const extRecords = await externalRecords();
  const sources = new Map();
  ingestSourceEvaluations(sources, evaluations);
  ingestMenus(sources, menusPayload.menus || menusPayload.records || []);
  ingestExternalRecords(sources, extRecords);
  ingestDishMentions(sources, dishMentions.records || []);
  ingestPriceObservations(sources, priceObservations.records || []);
  ingestImageFeatures(sources, imageFeatures.records || []);
  ingestOcr(sources, ocrQueue.records || [], ocrExtractions.records || [], ocrFailures.records || []);
  ingestRecipeBridge(sources, recipeBridge);

  const rows = sourceRows(sources, sourceProbes);
  const payload = {
    version: VERSION,
    generatedAt,
    processor: {
      name: "enrichment_coverage_report",
      version: "0.1.0",
      localOnly: true,
      storesRawOcr: false,
      storesImageBlobs: false,
    },
    summary: summarizeRows(rows),
    prioritizedActions: globalActions(rows),
    records: rows,
  };
  if (!options.dryRun) await writeJson(options.outputPath || OUTPUT_PATH, payload);
  return payload;
}

function optionsFromArgs(args = process.argv.slice(2)) {
  return {
    dryRun: hasFlag(args, "dry-run"),
    outputPath: argValue(args, "output", OUTPUT_PATH),
  };
}

if (require.main === module) {
  buildEnrichmentCoverageReport(optionsFromArgs())
    .then((payload) => console.log(JSON.stringify(payload.summary, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  VERSION,
  actionsForSource,
  buildEnrichmentCoverageReport,
  numberRatio,
  optionsFromArgs,
  sourceIdForKey,
  sourceRows,
  summarizeRows,
};
