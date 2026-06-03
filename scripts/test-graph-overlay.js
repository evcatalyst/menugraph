const assert = require("assert");
const fs = require("fs");
const path = require("path");
const graphContract = require("../docs/graph-contract");
const { buildGraphOverlay } = require("./build-graph-overlay");

const DATA_DIR = path.join(__dirname, "..", "docs", "data");
const GRAPH_DIR = path.join(DATA_DIR, "graph");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOverlayRecords(menuOverlays) {
  const records = { ...(menuOverlays.records || {}) };
  const shardDir = path.join(GRAPH_DIR, "menu-overlays", "by-source");
  if (fs.existsSync(shardDir)) {
    for (const fileName of fs.readdirSync(shardDir).filter((name) => name.endsWith(".json"))) {
      const shard = readJson(path.join(shardDir, fileName));
      Object.assign(records, shard.records || {});
      for (const subshard of shard.subshards || []) {
        const subshardPath = path.join(DATA_DIR, subshard.file.replace(/^graph\//, "graph/"));
        const subshardPayload = readJson(subshardPath);
        Object.assign(records, subshardPayload.records || {});
      }
    }
  }
  return records;
}

function readHydratedEvidenceIndex(evidenceIndex) {
  if (!evidenceIndex.shards?.length) return evidenceIndex;
  const hydrated = { ...evidenceIndex };
  for (const shard of evidenceIndex.shards) {
    const shardPath = path.join(DATA_DIR, shard.file.replace(/^graph\//, "graph/"));
    const payload = readJson(shardPath);
    hydrated[shard.evidenceType] = payload.records || {};
  }
  return hydrated;
}

function byteLength(payload) {
  return Buffer.byteLength(JSON.stringify(payload), "utf8");
}

function hasRawBlob(value) {
  const text = JSON.stringify(value);
  return /data:image\/|iiif\/2\/|ocr text requires|Full OCR text requires/.test(text);
}

const evaluations = readJson(path.join(DATA_DIR, "reference", "source-evaluations.json"));
assert.deepStrictEqual(graphContract.validateSourceEvaluations(evaluations), [], "source evaluations should validate");

const manifest = readJson(path.join(GRAPH_DIR, "manifest.json"));
const sourceCapabilities = readJson(path.join(GRAPH_DIR, "source-capabilities.json"));
const core = readJson(path.join(GRAPH_DIR, "core.json"));
const menuOverlays = readJson(path.join(GRAPH_DIR, "menu-overlays.json"));
const evidenceIndexArtifact = readJson(path.join(GRAPH_DIR, "evidence-index.json"));
const evidenceIndex = readHydratedEvidenceIndex(evidenceIndexArtifact);
const ocrFailuresPath = path.join(DATA_DIR, "enrichment", "ocr-failures.json");
const ocrFailures = fs.existsSync(ocrFailuresPath) ? readJson(ocrFailuresPath) : { summary: { total: 0 }, records: [] };
const coverageReportPath = path.join(DATA_DIR, "enrichment", "coverage-report.json");
const coverageReport = fs.existsSync(coverageReportPath) ? readJson(coverageReportPath) : { summary: { sources: 0 }, records: [] };

assert.deepStrictEqual(graphContract.validateGraph(sourceCapabilities, { maxBytes: manifest.sizeBudgetBytes }), [], "source graph should validate");
assert.deepStrictEqual(graphContract.validateGraph(core, { maxBytes: manifest.sizeBudgetBytes }), [], "core graph should validate");
assert(byteLength(core) <= manifest.sizeBudgetBytes, "core graph should stay under the static budget");
assert(byteLength(menuOverlays) <= manifest.sizeBudgetBytes, "menu overlay index should stay under the static budget");
assert(byteLength(evidenceIndexArtifact) <= manifest.sizeBudgetBytes, "evidence index should stay under the static budget");
assert(manifest.summary.core.ingredientTerms >= 100, "core graph should expose expanded ingredient taxonomy terms");
assert(manifest.summary.overlays.withIngredients >= 15500, "ingredient overlays should cover the enriched menu set");
assert(manifest.summary.recipeBridge?.clusters >= 100, "recipe bridge should summarize deterministic recipe clusters");
assert(Number.isFinite(Number(manifest.summary.runPlan?.pendingCandidates)), "run plan should summarize pending OCR candidates");
assert(manifest.summary.evidence.recipeClusters >= 100, "recipe clusters should be indexed as compact evidence");
assert(manifest.summary.overlays.withRecipeClusters >= 100, "recipe bridge clusters should appear in menu overlays");
assert(manifest.summary.enrichment.ocrCandidates >= 1000, "OCR triage candidates should be summarized in the enrichment graph");
assert(manifest.summary.overlays.withOcrCandidates >= 1000, "OCR triage should appear as menu overlay evidence");
assert(Object.keys(evidenceIndex.ocrCandidates || {}).length >= 1000, "OCR triage evidence should be indexed compactly");
if (coverageReport.summary?.sources) {
  assert.strictEqual(manifest.summary.enrichment.sourceCoverage, coverageReport.summary.sources, "source coverage count should be summarized in the enrichment graph");
  assert.strictEqual(manifest.summary.coverage.sources, coverageReport.summary.sources, "coverage report summary should be included in the graph manifest");
  assert(Object.keys(evidenceIndex.sourceCoverage || {}).length >= coverageReport.summary.sources, "source coverage should be indexed compactly");
  assert(evidenceIndex.sourceCoverage.cia_menu_collection?.primaryNextAction, "CIA coverage row should include a next action");
  assert(
    ["recipe_bridge_sampling", "recipe_bridge_expansion"].includes(evidenceIndex.sourceCoverage.the_sifter?.primaryNextAction),
    "recipe sources should retain bridge next actions"
  );
}
if (ocrFailures.summary?.total) {
  assert.strictEqual(manifest.summary.enrichment.ocrFailures, ocrFailures.summary.total, "OCR failure count should be summarized in the enrichment graph");
  assert(Object.keys(evidenceIndex.ocrFailures || {}).length > 0, "OCR failure evidence should be indexed compactly");
  assert(
    Object.values(evidenceIndex.ocrFailures || {}).every((record) => record.errorClass && record.nextAction),
    "OCR failures should include class and next action"
  );
}
assert(
  core.nodes.some((node) => node.type === "Term" && node.category === "ingredients" && node.label === "potato"),
  "core graph should include high-signal ingredient term nodes"
);
assert(core.nodes.some((node) => node.type === "RecipeCluster"), "core graph should include recipe bridge cluster nodes");
assert(core.edges.some((edge) => edge.type === "BRIDGES_RECIPE_CLUSTER"), "core graph should link dish nodes to recipe clusters");
assert(core.edges.some((edge) => edge.type === "USES_INGREDIENT"), "core graph should link recipe clusters to ingredient terms");
assert(!hasRawBlob(core), "core graph must not contain raw OCR or image blobs");
assert(!hasRawBlob(menuOverlays), "menu overlays must not contain raw OCR or image blobs");
assert(!hasRawBlob(evidenceIndexArtifact), "evidence index must not contain raw OCR or image blobs");
const overlayRecords = readOverlayRecords(menuOverlays);
assert(Object.keys(overlayRecords).length >= manifest.summary.overlays.menus, "overlay shards should cover manifest overlay count");
for (const shard of menuOverlays.shards || []) {
  const shardPath = path.join(DATA_DIR, shard.file.replace(/^graph\//, "graph/"));
  const payload = readJson(shardPath);
  assert(byteLength(payload) <= manifest.sizeBudgetBytes, `overlay shard ${shard.sourceKey} should stay under budget`);
  assert(!hasRawBlob(payload), `overlay shard ${shard.sourceKey} must not contain raw OCR or image blobs`);
  for (const subshard of payload.subshards || []) {
    const subshardPath = path.join(DATA_DIR, subshard.file.replace(/^graph\//, "graph/"));
    const subshardPayload = readJson(subshardPath);
    assert(byteLength(subshardPayload) <= manifest.sizeBudgetBytes, `overlay subshard ${subshard.file} should stay under budget`);
    assert(!hasRawBlob(subshardPayload), `overlay subshard ${subshard.file} must not contain raw OCR or image blobs`);
    assert(Object.keys(subshardPayload.records || {}).length > 0, `overlay subshard ${subshard.file} should contain records`);
  }
}

for (const shard of evidenceIndexArtifact.shards || []) {
  const shardPath = path.join(DATA_DIR, shard.file.replace(/^graph\//, "graph/"));
  const payload = readJson(shardPath);
  assert(byteLength(payload) <= manifest.sizeBudgetBytes, `evidence shard ${shard.evidenceType} should stay under budget`);
  assert(!hasRawBlob(payload), `evidence shard ${shard.evidenceType} must not contain raw OCR or image blobs`);
  assert.strictEqual(Object.keys(payload.records || {}).length, shard.records, `evidence shard ${shard.evidenceType} record count should match manifest`);
}

const sourceNodeIds = new Set(sourceCapabilities.nodes.filter((node) => node.type === "Source").map((node) => node.id));
assert(sourceNodeIds.has("source:the_sifter"), "recipe/history sources should be represented in source graph");
assert(sourceNodeIds.has("source:recipe1m_plus"), "recipe enrichment source should be represented in source graph");
for (const sourceId of Object.keys(evidenceIndex.sourceProbes || {})) {
  assert(sourceNodeIds.has(`source:${sourceId}`), `source probe ${sourceId} should resolve to a source node`);
}
assert(Object.keys(evidenceIndex.sourceProbes || {}).length >= 4, "expected probed external sources in evidence index");
if (manifest.summary.externalMenus?.records) {
  assert(manifest.summary.externalMenus.bySource.northwestern_transport_menus > 0, "external Northwestern rows should be summarized by source");
  assert(manifest.summary.externalMenus.bySource.uh_1850s_1860s_menus > 0, "external UH rows should be summarized by source");
  assert(manifest.summary.externalMenus.bySource.lapl_menu_collection > 0, "external LAPL rows should be summarized by source");
  assert(manifest.summary.externalMenus.bySource.milwaukee_historic_menus > 0, "external Milwaukee rows should be summarized by source");
  assert(manifest.summary.externalMenus.bySource.uw_menus_collection > 0, "external UW rows should be summarized by source");
  assert(manifest.summary.externalMenus.bySource.nola_menu_collection > 0, "external NOLA rows should be summarized by source");
  assert(manifest.summary.externalMenus.bySource.seattle_room_menu_collection > 0, "external Seattle rows should be summarized by source");
  assert(manifest.summary.externalMenus.bySource.denver_menu_collection > 0, "external Denver rows should be summarized by source");
  assert(Object.keys(evidenceIndex.externalMenus || {}).some((id) => id.startsWith("northwestern:")), "external Northwestern menu evidence should be indexed");
  assert(Object.keys(evidenceIndex.externalMenus || {}).some((id) => id.startsWith("uh:")), "external UH menu evidence should be indexed");
  assert(Object.keys(evidenceIndex.externalMenus || {}).some((id) => id.startsWith("lapl:")), "external LAPL menu evidence should be indexed");
  assert(Object.keys(evidenceIndex.externalMenus || {}).some((id) => id.startsWith("milwaukee:")), "external Milwaukee menu evidence should be indexed");
  assert(Object.keys(evidenceIndex.externalMenus || {}).some((id) => id.startsWith("uw:")), "external UW menu evidence should be indexed");
  assert(Object.keys(evidenceIndex.externalMenus || {}).some((id) => id.startsWith("nola:")), "external NOLA menu evidence should be indexed");
  assert(Object.keys(evidenceIndex.externalMenus || {}).some((id) => id.startsWith("seattle:")), "external Seattle menu evidence should be indexed");
  assert(Object.keys(evidenceIndex.externalMenus || {}).some((id) => id.startsWith("denver:")), "external Denver menu evidence should be indexed");
  assert(core.nodes.some((node) => node.id.startsWith("menu:northwestern:")), "core graph should include external Northwestern menu nodes");
  assert(core.nodes.some((node) => node.id.startsWith("menu:uh:")), "core graph should include external UH menu nodes");
  assert(core.nodes.some((node) => node.id.startsWith("menu:lapl:")), "core graph should include external LAPL menu nodes");
  assert(core.nodes.some((node) => node.id.startsWith("menu:milwaukee:")), "core graph should include external Milwaukee menu nodes");
  assert(core.nodes.some((node) => node.id.startsWith("menu:uw:")), "core graph should include external UW menu nodes");
  assert(core.nodes.some((node) => node.id.startsWith("menu:nola:")), "core graph should include external NOLA menu nodes");
  assert(core.nodes.some((node) => node.id.startsWith("menu:seattle:")), "core graph should include external Seattle menu nodes");
  assert(core.nodes.some((node) => node.id.startsWith("menu:denver:")), "core graph should include external Denver menu nodes");
  assert(
    core.edges.some((edge) => edge.type === "HAS_MENU" && edge.from === "source:northwestern_transport_menus" && edge.to.startsWith("menu:northwestern:")),
    "core graph should link Northwestern source to external menu nodes"
  );
  assert(
    core.edges.some((edge) => edge.type === "HAS_MENU" && edge.from === "source:uh_1850s_1860s_menus" && edge.to.startsWith("menu:uh:")),
    "core graph should link UH source to external menu nodes"
  );
  assert(
    core.edges.some((edge) => edge.type === "HAS_MENU" && edge.from === "source:lapl_menu_collection" && edge.to.startsWith("menu:lapl:")),
    "core graph should link LAPL source to external menu nodes"
  );
  assert(
    Object.values(evidenceIndex.dishMentions || {}).some(
      (record) => record.sourceId === "lapl_menu_collection" && record.method === "lapl_metadata_keyword"
    ),
    "LAPL metadata dish mentions should be indexed"
  );
  assert(
    core.edges.some((edge) => edge.type === "HAS_MENU" && edge.from === "source:milwaukee_historic_menus" && edge.to.startsWith("menu:milwaukee:")),
    "core graph should link Milwaukee source to external menu nodes"
  );
  assert(
    core.edges.some((edge) => edge.type === "HAS_MENU" && edge.from === "source:uw_menus_collection" && edge.to.startsWith("menu:uw:")),
    "core graph should link UW source to external menu nodes"
  );
  assert(
    core.edges.some((edge) => edge.type === "HAS_MENU" && edge.from === "source:nola_menu_collection" && edge.to.startsWith("menu:nola:")),
    "core graph should link NOLA source to external menu nodes"
  );
  assert(
    core.edges.some((edge) => edge.type === "HAS_MENU" && edge.from === "source:seattle_room_menu_collection" && edge.to.startsWith("menu:seattle:")),
    "core graph should link Seattle source to external menu nodes"
  );
  assert(
    core.edges.some((edge) => edge.type === "HAS_MENU" && edge.from === "source:denver_menu_collection" && edge.to.startsWith("menu:denver:")),
    "core graph should link Denver source to external menu nodes"
  );
  assert(
    Object.values(evidenceIndex.dishMentions || {}).some(
      (record) => record.sourceId === "seattle_room_menu_collection" && record.method === "seattle_metadata_keyword"
    ),
    "Seattle metadata dish mentions should be indexed"
  );
  assert(
    Object.values(evidenceIndex.dishMentions || {}).some(
      (record) => record.sourceId === "denver_menu_collection" && record.method === "denver_metadata_keyword"
    ),
    "Denver metadata dish mentions should be indexed"
  );
  assert(
    Object.values(evidenceIndex.imageFeatures || {}).some((record) => record.sourceId === "lapl_menu_collection" && record.scalar?.width && record.scalar?.height),
    "LAPL image metadata dimensions should be indexed"
  );
  assert(
    Object.values(evidenceIndex.imageFeatures || {}).some(
      (record) => record.sourceId === "milwaukee_historic_menus" && record.scalar?.width && record.scalar?.height
    ),
    "Milwaukee image metadata dimensions should be indexed"
  );
  assert(
    Object.values(evidenceIndex.imageFeatures || {}).some(
      (record) => record.sourceId === "northwestern_transport_menus" && record.scalar?.width && record.scalar?.height
    ),
    "Northwestern image metadata dimensions should be indexed"
  );
  assert(
    Object.values(evidenceIndex.imageFeatures || {}).some(
      (record) => record.sourceId === "uh_1850s_1860s_menus" && record.scalar?.width && record.scalar?.height
    ),
    "UH image metadata dimensions should be indexed"
  );
  assert(
    Object.values(evidenceIndex.imageFeatures || {}).some((record) => record.sourceId === "uw_menus_collection" && record.scalar?.width && record.scalar?.height),
    "UW image metadata dimensions should be indexed"
  );
  assert(
    Object.values(evidenceIndex.imageFeatures || {}).some((record) => record.sourceId === "nola_menu_collection" && record.scalar?.width && record.scalar?.height),
    "NOLA image metadata dimensions should be indexed"
  );
  assert(
    Object.values(evidenceIndex.imageFeatures || {}).some((record) => record.sourceId === "seattle_room_menu_collection" && record.scalar?.width && record.scalar?.height),
    "Seattle image metadata dimensions should be indexed"
  );
  assert(
    Object.values(evidenceIndex.imageFeatures || {}).some((record) => record.sourceId === "denver_menu_collection" && record.scalar?.width && record.scalar?.height),
    "Denver image metadata dimensions should be indexed"
  );
}

const recipeOverlay = Object.values(overlayRecords).find((record) =>
  (record.recipeClusterIds || []).some((id) => evidenceIndex.recipeClusters?.[id])
);
assert(recipeOverlay, "expected a menu overlay with recipe bridge evidence");
const recipeCluster = evidenceIndex.recipeClusters[recipeOverlay.recipeClusterIds[0]];
assert(recipeCluster?.sourceCandidates?.length, "recipe bridge evidence should include target recipe source candidates");

for (const source of evaluations.sources) {
  for (const value of Object.values(source.scores || {})) {
    assert(Number(value) >= 1 && Number(value) <= 10, "source scores should stay on the 1-10 scale");
  }
}

const dateOverlay = Object.values(overlayRecords).find((record) => record.sourceKey === "cia" && record.counts.dateEvidence > 0);
assert(dateOverlay, "expected a CIA menu with date evidence overlay");
const dateEvidence = evidenceIndex.dateEvidence[dateOverlay.dateEvidenceIds[0]];
assert(dateEvidence, "CIA date overlay should resolve to date evidence");
assert(graphContract.VALID_DATE_CONFIDENCE.has(dateEvidence.confidence), "date evidence confidence should be valid");

const pricedNyplOverlay = Object.values(overlayRecords).find(
  (record) => record.sourceKey === "nypl" && record.counts.priceObservations > 0 && record.counts.dishMentions > 0
);
assert(pricedNyplOverlay, "expected an NYPL menu with dish and price overlay");
assert(pricedNyplOverlay.topDishes.length > 0, "NYPL overlay should expose top dish summaries");
assert(evidenceIndex.priceObservations[pricedNyplOverlay.priceObservationIds[0]], "NYPL price overlay should resolve to evidence index");

const ocrPriceOverlay = Object.values(overlayRecords).find((record) =>
  (record.priceObservationIds || []).some((id) => evidenceIndex.priceObservations[id]?.method === "local_vision_ocr_price")
);
assert(ocrPriceOverlay, "expected local Vision OCR prices to resolve through graph overlays");
assert(
  (ocrPriceOverlay.dishMentionIds || []).some((id) => evidenceIndex.dishMentions[id]?.method === "local_vision_ocr_dish"),
  "expected local Vision OCR dish evidence to resolve through graph overlays"
);

if (ocrFailures.summary?.total) {
  const ocrFailureOverlay = Object.values(overlayRecords).find((record) =>
    (record.ocrFailureIds || []).some((id) => evidenceIndex.ocrFailures?.[id])
  );
  assert(ocrFailureOverlay, "expected persistent OCR failures to resolve through graph overlays");
}

assert(
  core.edges.some((edge) => edge.type === "MATCHES_MENU"),
  "core graph should expose cross-source MATCHES_MENU edges"
);

buildGraphOverlay({ dryRun: true }).then(({ manifest: dryManifest }) => {
  assert(dryManifest.summary.core.nodes >= 1, "dry-run graph builder should return a manifest");
  console.log("graph overlay tests passed");
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
