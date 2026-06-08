const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");
const {
  batchRows,
  promptForPacket,
  publicPacketRows,
} = require("./build-confection-wrapper-grok-source-hunt-packets");

const root = path.join(__dirname, "..");
const publicCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_grok_source_hunt_packets.csv");
const publicJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_grok_source_hunt_packets.json");
const publicRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_grok_source_hunt_packets_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertPublicSafe(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\/|api[_-]?key|xai_api/i.test(text), `${label} leaks private path or secret field`);
  assert(!/"prompt"\s*:|source_rows/.test(text), `${label} publishes private prompts or source rows`);
}

const rows = [
  {
    packet_id: "packet_1930s",
    packet_rank: "1",
    product_id: "fixture_bar",
    product_name: "Fixture Bar",
    vintage_label: "1930s",
    vintage_bucket: "1930s",
    source_url: "https://www.candywrapperarchive.com/candy-collector/1930s-fixture-bar/",
    source_title: "1930s Fixture Bar",
    existing_source_role: "dated_wrapper_lineage_context",
    missing_primary_surfaces: "ingredient_panel;nutrition_panel",
    missing_support_surfaces: "net_weight;manufacturer_or_distributor",
    preferred_source_types: "back_panel_photo;auction_listing_photo",
    source_hunt_queries: "\"1930s Fixture Bar\" ingredients wrapper back panel; \"Fixture Bar\" 1930s nutrition facts",
  },
  {
    packet_id: "packet_1940s",
    packet_rank: "2",
    product_id: "fixture_bar",
    product_name: "Fixture Bar",
    vintage_label: "1940s",
    vintage_bucket: "1940s",
    source_url: "https://www.candywrapperarchive.com/candy-collector/1940s-fixture-bar/",
    source_title: "1940s Fixture Bar",
    existing_source_role: "dated_wrapper_lineage_context",
    missing_primary_surfaces: "ingredient_panel;nutrition_panel",
    missing_support_surfaces: "net_weight;manufacturer_or_distributor",
    preferred_source_types: "back_panel_photo;auction_listing_photo",
    source_hunt_queries: "\"1940s Fixture Bar\" ingredients wrapper back panel",
  },
];

const packets = batchRows(rows, 8);
assert.strictEqual(packets.length, 1, "rows for one product should batch together");
assert.strictEqual(packets[0].source_row_count, 2, "packet should retain both source rows");
const prompt = promptForPacket(packets[0]);
assert.strictEqual(prompt.role, "research_assist_only", "prompt should be research-assist only");
assert(prompt.model_policy.forbidden_use.includes("do not mark manual_verified"), "prompt should forbid manual verification");
assert(prompt.source_rows[0].constraints.some((constraint) => /not infer ingredients/i.test(constraint)), "prompt should forbid ingredient inference from wrapper fronts");
const publicRows = publicPacketRows(packets);
assert(!("prompt" in publicRows[0]), "public packet row must not include prompt text");
assert(publicRows[0].prompt_hash, "public packet row should include prompt hash for caching/audit");

const generatedSummary = JSON.parse(fs.readFileSync(publicJsonPath, "utf8"));
const generatedRows = parseCsv(fs.readFileSync(publicCsvPath, "utf8"));
const generatedRunbook = fs.readFileSync(publicRunbookPath, "utf8");
const siteSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
assert.strictEqual(generatedSummary.schema_version, "confection_wrapper_grok_source_hunt_packet_summary.v1", "generated summary should use expected schema");
assert.strictEqual(generatedSummary.totals.source_hunt_rows, 49, "generated packet summary should cover CWA source-hunt rows");
assert.strictEqual(generatedSummary.totals.products, 9, "generated packet summary should cover CWA source-hunt products");
assert.strictEqual(generatedSummary.totals.grok_packets, 9, "default CWA batching should produce one Grok packet per product");
assert.strictEqual(generatedSummary.provider.network_called, false, "packet builder must not call xAI by default");
assert.strictEqual(generatedSummary.public_safety.prompts_committed, false, "public summary must not commit prompts");
assert.strictEqual(generatedRows.length, 9, "public packet CSV should have one row per product packet");
assert(generatedRunbook.includes("Grok is used for source hunting and validation warnings only"), "runbook should state Grok guardrail");
assert(siteSummary.confection_wrapper_grok_source_hunt_packet_summary, "site summary should expose Grok source-hunt packets");
assert(siteSummary.confection_wrapper_panel_gap_source_hunt_summary.grok_packet_summary, "panel source-hunt summary should nest Grok packet summary");
assert(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts.grok_source_hunt_packets_csv, "ingredient priority artifacts should link Grok packet CSV");
assertPublicSafe(fs.readFileSync(publicCsvPath, "utf8"), "generated public CSV");
assertPublicSafe(fs.readFileSync(publicJsonPath, "utf8"), "generated public JSON");
assertPublicSafe(generatedRunbook, "generated public runbook");

console.log("confection wrapper Grok source-hunt packet tests passed");
