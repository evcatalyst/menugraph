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
assert(!hasRawBlob(core), "core graph must not contain raw OCR or image blobs");
assert(!hasRawBlob(menuOverlays), "menu overlays must not contain raw OCR or image blobs");
assert(!hasRawBlob(evidenceIndex), "evidence index must not contain raw OCR or image blobs");

const sourceNodeIds = new Set(sourceCapabilities.nodes.filter((node) => node.type === "Source").map((node) => node.id));
assert(sourceNodeIds.has("source:the_sifter"), "recipe/history sources should be represented in source graph");
assert(sourceNodeIds.has("source:recipe1m_plus"), "recipe enrichment source should be represented in source graph");
for (const sourceId of Object.keys(evidenceIndex.sourceProbes || {})) {
  assert(sourceNodeIds.has(`source:${sourceId}`), `source probe ${sourceId} should resolve to a source node`);
}
assert(Object.keys(evidenceIndex.sourceProbes || {}).length >= 4, "expected probed external sources in evidence index");

for (const source of evaluations.sources) {
  for (const value of Object.values(source.scores || {})) {
    assert(Number(value) >= 1 && Number(value) <= 10, "source scores should stay on the 1-10 scale");
  }
}

const dateOverlay = Object.values(menuOverlays.records).find((record) => record.sourceKey === "cia" && record.counts.dateEvidence > 0);
assert(dateOverlay, "expected a CIA menu with date evidence overlay");
const dateEvidence = evidenceIndex.dateEvidence[dateOverlay.dateEvidenceIds[0]];
assert(dateEvidence, "CIA date overlay should resolve to date evidence");
assert(graphContract.VALID_DATE_CONFIDENCE.has(dateEvidence.confidence), "date evidence confidence should be valid");

const pricedNyplOverlay = Object.values(menuOverlays.records).find(
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
