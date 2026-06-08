const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");
const {
  buildRows,
  gapStatusFor,
  queryPack,
  sourceHuntRow,
} = require("./build-confection-wrapper-panel-gap-source-hunt");

const root = path.join(__dirname, "..");
const publicCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_panel_gap_source_hunt.csv");
const publicJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_panel_gap_source_hunt.json");
const publicRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_panel_gap_source_hunt_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertPublicSafe(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\/|image_candidate_url/.test(text), `${label} leaks private path or image candidate URL fields`);
}

const wrapperOnly = {
  packet_id: "packet_wrapper_only",
  packet_rank: "1",
  product_id: "fixture_bar",
  product_name: "Fixture Bar",
  vintage_label: "1970s",
  source_url: "https://www.candywrapperarchive.com/candy-collector/1970s-fixture-bar/",
  source_title: "1970s Fixture Bar source page",
  image_candidate_count: "7",
  explicit_panel_signal_candidates: "0",
  high_priority_panel_candidates: "0",
  wrapper_context_candidates: "5",
  low_signal_candidates: "2",
};
const panelSignal = {
  ...wrapperOnly,
  packet_id: "packet_panel_signal",
  packet_rank: "2",
  vintage_label: "1981",
  explicit_panel_signal_candidates: "1",
  high_priority_panel_candidates: "1",
  wrapper_context_candidates: "2",
};

assert.strictEqual(gapStatusFor(wrapperOnly), "lineage_photo_only_back_panel_hunt_needed", "wrapper-only rows should become back-panel hunts");
assert.strictEqual(gapStatusFor(panelSignal), "panel_candidate_private_review_needed", "panel-signal rows should route to private crop review");
assert(queryPack(wrapperOnly).some((query) => query.includes("ingredients wrapper back panel")), "queries should target ingredient back panels");
const sourceRow = sourceHuntRow(wrapperOnly);
assert.strictEqual(sourceRow.manual_verified, 0, "source hunt rows cannot be manual verified");
assert(/research assist only/i.test(sourceRow.grok_research_packet), "Grok packet should be assist-only");

const sorted = buildRows([panelSignal, wrapperOnly]);
assert.strictEqual(sorted[0].packet_id, "packet_wrapper_only", "earliest wrapper-only gaps should stay high-priority source hunts");

const generatedSummary = JSON.parse(fs.readFileSync(publicJsonPath, "utf8"));
const generatedRows = parseCsv(fs.readFileSync(publicCsvPath, "utf8"));
const generatedRunbook = fs.readFileSync(publicRunbookPath, "utf8");
const siteSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
assert.strictEqual(generatedSummary.schema_version, "confection_wrapper_panel_gap_source_hunt.v1", "generated summary should use expected schema");
assert.strictEqual(generatedSummary.totals.source_packets, 49, "generated source-hunt queue should cover all CWA source packets");
assert.strictEqual(generatedRows.length, 49, "generated public CSV should have one row per CWA source packet");
assert.strictEqual(generatedSummary.totals.lineage_photo_only_back_panel_hunt_needed, 49, "current CWA metadata should route all source packets to back-panel hunts");
assert.strictEqual(generatedSummary.totals.panel_candidate_private_review_needed, 0, "current CWA metadata should not invent panel candidates");
assert.strictEqual(generatedSummary.public_safety.manual_verified_created, false, "source hunt cannot create manual verification");
assert(generatedRunbook.includes("wrapper photos are dated product context, not ingredient proof"), "runbook should preserve proof hierarchy");
assert(siteSummary.confection_wrapper_panel_gap_source_hunt_summary, "site summary should expose source-hunt summary");
assert(siteSummary.confection_wrapper_source_panel_candidate_review_summary.panel_gap_source_hunt_summary, "panel candidate summary should nest source-hunt summary");
assert(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts.source_hunt_csv, "ingredient priority artifacts should link source hunt CSV");
assertPublicSafe(fs.readFileSync(publicCsvPath, "utf8"), "generated public CSV");
assertPublicSafe(fs.readFileSync(publicJsonPath, "utf8"), "generated public JSON");
assertPublicSafe(generatedRunbook, "generated public runbook");

console.log("confection wrapper panel gap source hunt tests passed");
