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
    }
  }
  return records;
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
const evidenceIndex = readJson(path.join(GRAPH_DIR, "evidence-index.json"));

assert.deepStrictEqual(graphContract.validateGraph(sourceCapabilities, { maxBytes: manifest.sizeBudgetBytes }), [], "source graph should validate");
assert.deepStrictEqual(graphContract.validateGraph(core, { maxBytes: manifest.sizeBudgetBytes }), [], "core graph should validate");
assert(byteLength(core) <= manifest.sizeBudgetBytes, "core graph should stay under the static budget");
assert(byteLength(menuOverlays) <= manifest.sizeBudgetBytes, "menu overlay index should stay under the static budget");
assert(!hasRawBlob(core), "core graph must not contain raw OCR or image blobs");
assert(!hasRawBlob(menuOverlays), "menu overlays must not contain raw OCR or image blobs");
assert(!hasRawBlob(evidenceIndex), "evidence index must not contain raw OCR or image blobs");
const overlayRecords = readOverlayRecords(menuOverlays);
assert(Object.keys(overlayRecords).length >= manifest.summary.overlays.menus, "overlay shards should cover manifest overlay count");
for (const shard of menuOverlays.shards || []) {
  const shardPath = path.join(DATA_DIR, shard.file.replace(/^graph\//, "graph/"));
  const payload = readJson(shardPath);
  assert(byteLength(payload) <= manifest.sizeBudgetBytes, `overlay shard ${shard.sourceKey} should stay under budget`);
  assert(!hasRawBlob(payload), `overlay shard ${shard.sourceKey} must not contain raw OCR or image blobs`);
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
  assert(Object.keys(evidenceIndex.externalMenus || {}).some((id) => id.startsWith("northwestern:")), "external Northwestern menu evidence should be indexed");
  assert(Object.keys(evidenceIndex.externalMenus || {}).some((id) => id.startsWith("uh:")), "external UH menu evidence should be indexed");
  assert(Object.keys(evidenceIndex.externalMenus || {}).some((id) => id.startsWith("lapl:")), "external LAPL menu evidence should be indexed");
  assert(Object.keys(evidenceIndex.externalMenus || {}).some((id) => id.startsWith("milwaukee:")), "external Milwaukee menu evidence should be indexed");
  assert(core.nodes.some((node) => node.id.startsWith("menu:northwestern:")), "core graph should include external Northwestern menu nodes");
  assert(core.nodes.some((node) => node.id.startsWith("menu:uh:")), "core graph should include external UH menu nodes");
  assert(core.nodes.some((node) => node.id.startsWith("menu:lapl:")), "core graph should include external LAPL menu nodes");
  assert(core.nodes.some((node) => node.id.startsWith("menu:milwaukee:")), "core graph should include external Milwaukee menu nodes");
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
    core.edges.some((edge) => edge.type === "HAS_MENU" && edge.from === "source:milwaukee_historic_menus" && edge.to.startsWith("menu:milwaukee:")),
    "core graph should link Milwaukee source to external menu nodes"
  );
  assert(
    Object.values(evidenceIndex.imageFeatures || {}).some((record) => record.sourceId === "lapl_menu_collection" && record.scalar?.pageCount),
    "LAPL image metadata features should be indexed"
  );
  assert(
    Object.values(evidenceIndex.imageFeatures || {}).some((record) => record.sourceId === "milwaukee_historic_menus" && record.scalar?.pageCount),
    "Milwaukee image metadata features should be indexed"
  );
}

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
