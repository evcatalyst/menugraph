const fs = require("fs/promises");
const path = require("path");
const { cleanValue } = require("../docs/multisource");
const { sourceIdForKey } = require("./build-enrichment-coverage-report");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const ENRICHMENT_DIR = path.join(DATA_DIR, "enrichment");
const SOURCE_DIR = path.join(ENRICHMENT_DIR, "external-sources");
const OUTPUT_PATH = path.join(ENRICHMENT_DIR, "source-probes.json");
const VERSION = 1;

const SOURCE_HINTS = {
  cia_menu_collection: {
    sourceUrl: "http://ciadigitalcollections.culinary.edu/digital/collection/p16940coll1",
    accessMethod: "CONTENTdm browse and item endpoints",
    estimatedPublicScale: "5k+ digitized menus from roughly 40k physical holdings",
  },
  nypl_wotm: {
    sourceUrl: "https://menus.nypl.org/",
    accessMethod: "NYPL static data/Kaggle CSV exports and public site",
    estimatedPublicScale: "17k+ structured menu rows with 1M+ dish rows in the analytical export",
  },
  lapl_menu_collection: {
    sourceUrl: "https://tessa.lapl.org/c10",
    accessMethod: "TESSA public collection pages and CONTENTdm-compatible metadata routes",
    estimatedPublicScale: "17k+ menus; exact bulk count should be verified before expansion",
  },
  cornell_nestle_menu_collection: {
    sourceUrl: "https://rmc.library.cornell.edu/EAD/htmldocs/RMM06452.html",
    accessMethod: "finding aid plus collection-specific metadata review",
    estimatedPublicScale: "10k+ menus described in the Nestle/SHA collection",
  },
  uh_1850s_1860s_menus: {
    sourceUrl: "https://digitalcollections.lib.uh.edu/collections/g158bj49n",
    accessMethod: "public collection metadata and item pages",
    publicItemCount: 81,
    estimatedPublicScale: "narrow 1850s-1860s public collection slice",
  },
  northwestern_transport_menus: {
    sourceUrl: "https://api.dc.library.northwestern.edu/docs/v2/index.html",
    accessMethod: "documented Northwestern Digital Collections JSON API and IIIF routes",
    estimatedPublicScale: "900+ transport-themed menu records",
  },
  regional_menu_collections: {
    sourceUrl: "",
    accessMethod: "federated source family tracked through individual regional connectors",
    estimatedPublicScale: "modeled umbrella for Milwaukee, Denver, Tulane, UNLV, UW, Seattle, and New Orleans style sources",
  },
  tulane_louisiana_menu_collection: {
    sourceUrl: "https://library.tulane.edu/index.php/Collections/Tulane-University-Digital-Collections",
    accessMethod: "Tulane Library Search public digital collection pages; metadata-first probe until a stable bulk/export route is confirmed",
    estimatedPublicScale: "Louisiana Menu and Restaurant Collection of digitized menus, restaurant brochures, bar flyers, and related Louisiana food-industry ephemera",
  },
  unlv_menus_art_of_dining: {
    sourceUrl: "https://special.library.unlv.edu/collections/menus/digitizing-menus",
    accessMethod: "UNLV public collection/exhibit pages; metadata-first probe until API/export terms are explicit",
    estimatedPublicScale: "Las Vegas and regional restaurant, hotel, casino, resort, and event menus; public documentation cites roughly 1,500 digitized menus at launch",
  },
  milwaukee_historic_menus: {
    sourceUrl: "https://content.mpl.org/digital/collection/histmenu",
    accessMethod: "CONTENTdm public metadata routes",
    estimatedPublicScale: "regional Milwaukee historic menu collection",
  },
  uw_menus_collection: {
    sourceUrl: "https://digitalcollections.lib.washington.edu/digital/collection/menus",
    accessMethod: "CONTENTdm public metadata routes",
    estimatedPublicScale: "regional University of Washington menu collection",
  },
  nola_menu_collection: {
    sourceUrl: "https://louisianadigitallibrary.org/",
    accessMethod: "Louisiana Digital Library public metadata routes",
    estimatedPublicScale: "regional New Orleans/Louisiana menu evidence",
  },
  seattle_room_menu_collection: {
    sourceUrl: "https://spl.contentdm.oclc.org/digital/collection/p16118coll5",
    accessMethod: "CONTENTdm public metadata routes",
    estimatedPublicScale: "Seattle Room regional menu collection",
  },
  denver_menu_collection: {
    sourceUrl: "https://digital.denverlibrary.org/",
    accessMethod: "public digital collection metadata routes",
    estimatedPublicScale: "regional Denver menu evidence",
  },
  dotlas_structured_menus: {
    sourceUrl: "https://www.databricks.com/marketplace",
    accessMethod: "commercial Databricks Marketplace access; license diligence required",
    estimatedPublicScale: "modern structured menu dataset, not ingested into public artifacts",
  },
  recipe1m_plus: {
    sourceUrl: "https://im2recipe.csail.mit.edu/",
    accessMethod: "research dataset access; bridge only until rights-cleared row ingestion",
    estimatedPublicScale: "1M+ recipes and 13M food images",
  },
  recipenlg: {
    sourceUrl: "https://aclanthology.org/2020.inlg-1.4/",
    accessMethod: "Kaggle/Hugging Face style dataset access; bridge only until rights review",
    estimatedPublicScale: "2.2M+ semi-structured recipe records",
  },
  foodcom_recipes_interactions: {
    sourceUrl: "https://aclanthology.org/D19-1613/",
    accessMethod: "research/Kaggle dataset access; bridge only until rights review",
    estimatedPublicScale: "180k+ recipes and 700k+ interactions",
  },
  epicurious_kaggle: {
    sourceUrl: "https://www.kaggle.com/datasets/hugodarwood/epirecipes",
    accessMethod: "Kaggle dataset access; nutrition proxy bridge only until rights review",
    estimatedPublicScale: "20k-ish recipe records with ratings/nutrition fields",
  },
  yummly_whats_cooking: {
    sourceUrl: "https://www.kaggle.com/c/whats-cooking",
    accessMethod: "Kaggle competition data; ingredient/cuisine classifier bridge",
    estimatedPublicScale: "clean ingredient-list JSON with cuisine labels",
  },
  the_sifter: {
    sourceUrl: "https://thesifter.org/",
    accessMethod: "public search and CSV/Excel result export; no full recipe text in public graph",
    estimatedPublicScale: "historical recipe/cookbook metadata from 800+ AD to modern sources",
  },
};

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

function normalizeMenuId(record = {}) {
  return cleanValue(record.menuId || record.menuUid || record.uid || record.id);
}

function sourceKeyForSource(source = {}) {
  const explicit = cleanValue(source.sourceKey);
  if (explicit) return explicit;
  const id = cleanValue(source.id || source.sourceId);
  const pairs = {
    lapl_menu_collection: "lapl",
    uh_1850s_1860s_menus: "uh",
    northwestern_transport_menus: "northwestern",
    tulane_louisiana_menu_collection: "tulane",
    unlv_menus_art_of_dining: "unlv",
    milwaukee_historic_menus: "milwaukee",
    uw_menus_collection: "uw",
    nola_menu_collection: "nola",
    seattle_room_menu_collection: "seattle",
    denver_menu_collection: "denver",
  };
  return pairs[id] || "";
}

function sourceTypeFor(id) {
  if (
    [
      "recipe1m_plus",
      "recipenlg",
      "foodcom_recipes_interactions",
      "epicurious_kaggle",
      "yummly_whats_cooking",
      "the_sifter",
    ].includes(id)
  ) {
    return "recipe_or_food_history";
  }
  if (id === "dotlas_structured_menus") return "commercial_modern_menu";
  return "menu";
}

async function externalRecords() {
  const records = [];
  const seen = new Set();
  const append = (payload) => {
    for (const record of payload.records || []) {
      const sourceId = cleanValue(record.sourceId) || sourceIdForKey(record.sourceKey || "external");
      const menuId = normalizeMenuId(record);
      const key = `${sourceId}|${menuId || cleanValue(record.sourceRecordId)}`;
      if (!sourceId || seen.has(key)) continue;
      seen.add(key);
      records.push({ ...record, sourceId });
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
  return records;
}

function compactSample(record = {}) {
  const title = cleanValue(record.title || record.label || record.name).slice(0, 140);
  const date = cleanValue(record.dateText || record.date || record.decade || record.year || record.pointYear || "").slice(0, 80);
  const menuId = normalizeMenuId(record);
  const itemUrl = cleanValue(record.itemUrl || record.url || record.sourceUrl).slice(0, 240);
  return {
    title,
    date,
    menuId,
    itemUrl,
  };
}

function summarizeExternal(records = []) {
  const bySource = new Map();
  for (const record of records) {
    const sourceId = cleanValue(record.sourceId);
    if (!sourceId) continue;
    if (!bySource.has(sourceId)) {
      bySource.set(sourceId, {
        rows: 0,
        datedRows: 0,
        dishMentions: 0,
        priceObservations: 0,
        imageRoutes: 0,
        sampleItems: [],
      });
    }
    const summary = bySource.get(sourceId);
    summary.rows += 1;
    if (record.year || record.pointYear || record.lowerYear || record.upperYear || (record.decade && record.decade !== "unknown")) summary.datedRows += 1;
    summary.dishMentions += (record.dishMentions || record.dishHints || []).length;
    summary.priceObservations += (record.priceObservations || []).length;
    if ((record.imageFeatures || []).length || record.iiifManifestUrl || record.iiifInfoUri || record.imageUri || record.thumbnailUrl) summary.imageRoutes += 1;
    if (summary.sampleItems.length < 8) summary.sampleItems.push(compactSample(record));
  }
  return bySource;
}

function summarizeStaticMenus(menus = []) {
  const bySource = new Map();
  for (const menu of menus) {
    const sourceKey = cleanValue(menu.sourceKey || "cia");
    const sourceId = sourceIdForKey(sourceKey);
    if (!bySource.has(sourceId)) {
      bySource.set(sourceId, {
        rows: 0,
        datedRows: 0,
        dishRows: 0,
        priceRows: 0,
        sampleItems: [],
      });
    }
    const summary = bySource.get(sourceId);
    summary.rows += 1;
    if (menu.year || (menu.decade && menu.decade !== "unknown")) summary.datedRows += 1;
    if ((menu.topDishes || []).length || Number(menu.itemCount || menu.dishCount || 0) > 0) summary.dishRows += 1;
    if (Number(menu.priceCount || 0) > 0) summary.priceRows += 1;
    if (summary.sampleItems.length < 8) summary.sampleItems.push(compactSample({ ...menu, menuId: normalizeMenuId(menu) || `${sourceKey}:${menu.id || menu.sourceRecordId}` }));
  }
  return bySource;
}

function statusFor({ staticSummary, externalSummary, recipeBridgeClusters, priorProbe, sourceType }) {
  if (staticSummary?.rows) return "static_rows";
  if (externalSummary?.rows) return "external_rows";
  if (recipeBridgeClusters) return "recipe_bridge_targets";
  if (priorProbe?.status === "error") return "probe_error";
  if (sourceType === "commercial_modern_menu") return "license_required";
  if (priorProbe) return "metadata_probe";
  return "modeled_only";
}

function probeForSource(source, inputs = {}) {
  const sourceId = cleanValue(source.id || source.sourceId);
  const sourceKey = sourceKeyForSource(source);
  const sourceType = sourceTypeFor(sourceId);
  const hint = SOURCE_HINTS[sourceId] || {};
  const priorProbe = inputs.priorProbeBySource?.get(sourceId) || null;
  const staticSummary = inputs.staticBySource?.get(sourceId) || null;
  const externalSummary = inputs.externalBySource?.get(sourceId) || null;
  const recipeBridgeClusters = Number(inputs.recipeSourceCandidates?.[sourceId] || 0);
  const publicItemCount = priorProbe?.publicItemCount ?? hint.publicItemCount ?? null;
  const sampleItems = (priorProbe?.sampleItems?.length ? priorProbe.sampleItems : externalSummary?.sampleItems?.length ? externalSummary.sampleItems : staticSummary?.sampleItems || [])
    .map((item) => ({
      title: cleanValue(item.title).slice(0, 140),
      date: cleanValue(item.date).slice(0, 80),
      menuId: cleanValue(item.menuId),
      itemUrl: cleanValue(item.itemUrl).slice(0, 240),
    }))
    .filter((item) => item.title || item.menuId)
    .slice(0, 8);

  return {
    sourceId,
    sourceKey,
    label: cleanValue(source.label || sourceId),
    sourceType,
    status: statusFor({ staticSummary, externalSummary, recipeBridgeClusters, priorProbe, sourceType }),
    probedAt: inputs.generatedAt,
    sourceUrl: cleanValue(priorProbe?.sourceUrl || hint.sourceUrl),
    accessMethod: cleanValue(hint.accessMethod),
    publicItemCount,
    estimatedPublicScale: cleanValue(hint.estimatedPublicScale),
    ingestedRows: Number((staticSummary?.rows || 0) + (externalSummary?.rows || 0)),
    staticRows: Number(staticSummary?.rows || 0),
    externalRows: Number(externalSummary?.rows || 0),
    datedRows: Number((staticSummary?.datedRows || 0) + (externalSummary?.datedRows || 0)),
    dishRows: Number(staticSummary?.dishRows || 0),
    priceRows: Number(staticSummary?.priceRows || 0),
    externalDishMentions: Number(externalSummary?.dishMentions || 0),
    externalPriceObservations: Number(externalSummary?.priceObservations || 0),
    imageRouteRows: Number(externalSummary?.imageRoutes || 0),
    recipeBridgeClusters,
    sampleItems,
    scores: source.scores || {},
    capabilityWeights: source.capabilityWeights || {},
    notes: cleanValue(
      priorProbe?.notes ||
        (sourceType === "recipe_or_food_history"
          ? "Recipe source is represented as rights-safe dish/ingredient bridge metadata; no full recipe text or recipe rows are stored in public graph artifacts."
          : sourceType === "commercial_modern_menu"
            ? "Commercial modern menu source is modeled for capability planning only until license and Databricks access are explicit."
            : "Storage-light source probe generated from local registry and compact metadata artifacts; raw OCR, image blobs, vectors, and external LLM payloads are excluded.")
    ),
    provenance: {
      sourceFile: "reference/source-evaluations.json + enrichment/external-sources/* + menus.json + enrichment/recipe-bridge.json",
      method: "deterministic_storage_light_source_probe",
      priorProbeStatus: cleanValue(priorProbe?.status),
    },
  };
}

function summarize(records = []) {
  const byStatus = {};
  const byType = {};
  for (const record of records) {
    byStatus[record.status] = (byStatus[record.status] || 0) + 1;
    byType[record.sourceType] = (byType[record.sourceType] || 0) + 1;
  }
  return {
    total: records.length,
    byStatus: Object.fromEntries(Object.entries(byStatus).sort()),
    byType: Object.fromEntries(Object.entries(byType).sort()),
    ingestedRows: records.reduce((sum, record) => sum + Number(record.ingestedRows || 0), 0),
    staticRows: records.reduce((sum, record) => sum + Number(record.staticRows || 0), 0),
    externalRows: records.reduce((sum, record) => sum + Number(record.externalRows || 0), 0),
    recipeBridgeClusters: records.reduce((sum, record) => sum + Number(record.recipeBridgeClusters || 0), 0),
  };
}

async function buildSourceProbes(options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const [evaluations, menusPayload, priorProbes, recipeBridge] = await Promise.all([
    readJson(path.join(DATA_DIR, "reference", "source-evaluations.json"), { sources: [] }),
    readJson(path.join(DATA_DIR, "menus.json"), { menus: [] }),
    readJson(options.priorPath || OUTPUT_PATH, { records: [] }),
    readJson(path.join(ENRICHMENT_DIR, "recipe-bridge.json"), { summary: {} }),
  ]);
  const external = await externalRecords();
  const staticBySource = summarizeStaticMenus(menusPayload.menus || menusPayload.records || []);
  const externalBySource = summarizeExternal(external);
  const priorProbeBySource = new Map((priorProbes.records || []).map((record) => [cleanValue(record.sourceId), record]));
  const recipeSourceCandidates = recipeBridge.summary?.sourceCandidates || {};
  const records = (evaluations.sources || [])
    .map((source) => probeForSource(source, { generatedAt, staticBySource, externalBySource, priorProbeBySource, recipeSourceCandidates }))
    .filter((record) => record.sourceId)
    .sort((a, b) => {
      const rank = {
        static_rows: 0,
        external_rows: 1,
        recipe_bridge_targets: 2,
        metadata_probe: 3,
        probe_error: 4,
        modeled_only: 5,
        license_required: 6,
      };
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || b.ingestedRows - a.ingestedRows || a.label.localeCompare(b.label);
    });
  const payload = {
    version: VERSION,
    generatedAt,
    processor: {
      name: "source_probe_builder",
      version: "0.1.0",
      localOnly: true,
      storesRawOcr: false,
      storesImageBlobs: false,
      storesRecipeText: false,
      storesExternalLlmPayloads: false,
    },
    summary: summarize(records),
    records,
  };
  if (!options.dryRun) await writeJson(options.outputPath || OUTPUT_PATH, payload);
  return payload;
}

function optionsFromArgs(args = process.argv.slice(2)) {
  return {
    dryRun: hasFlag(args, "dry-run"),
    outputPath: argValue(args, "output", OUTPUT_PATH),
    priorPath: argValue(args, "prior", OUTPUT_PATH),
  };
}

if (require.main === module) {
  buildSourceProbes(optionsFromArgs())
    .then((payload) => {
      console.log(
        [
          `Wrote ${payload.summary.total} source probe record(s)`,
          `${payload.summary.ingestedRows.toLocaleString()} ingested row(s) summarized`,
          `${payload.summary.recipeBridgeClusters.toLocaleString()} recipe bridge target(s)`,
        ].join(", ")
      );
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  SOURCE_HINTS,
  buildSourceProbes,
  compactSample,
  optionsFromArgs,
  probeForSource,
  sourceKeyForSource,
  sourceTypeFor,
  statusFor,
  summarize,
  summarizeExternal,
  summarizeStaticMenus,
};
