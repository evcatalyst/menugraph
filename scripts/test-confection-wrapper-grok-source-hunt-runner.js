const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const {
  loadEnvFile,
  parseJsonContent,
  publicRowForResult,
  selectPackets,
} = require("./run-confection-wrapper-grok-source-hunt-packets");

const root = path.join(__dirname, "..");
const publicCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_grok_source_hunt_run.csv");
const publicJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_grok_source_hunt_run.json");
const publicRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_grok_source_hunt_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertPublicSafe(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\/|xai_api|Bearer\s+|sk-[A-Za-z0-9_-]+/i.test(text), `${label} leaks private path or secret value`);
  assert(!/"prompt"\s*:|raw_content|"source_url"\s*:/.test(text), `${label} publishes prompts, raw output, or model-returned source URLs`);
}

const packets = [
  { packet_id: "packet_one", product_id: "fixture_bar", product_name: "Fixture Bar" },
  { packet_id: "packet_two", product_id: "fixture_bar", product_name: "Fixture Bar" },
  { packet_id: "packet_three", product_id: "other_bar", product_name: "Other Bar" },
];
assert.deepStrictEqual(selectPackets(packets, { product: "fixture_bar", maxCalls: 1 }).map((packet) => packet.packet_id), ["packet_one"], "selection should filter by product and max calls");
assert.deepStrictEqual(selectPackets(packets, { packetId: "packet_three", maxCalls: 2 }).map((packet) => packet.packet_id), ["packet_three"], "selection should filter by packet id");

const parsed = parseJsonContent("```json\n{\"leads\":[{\"source_url\":\"https://example.test\"}],\"missing_after_search\":[]}\n```");
assert.strictEqual(parsed.leads.length, 1, "parser should handle JSON code fences");
const invalid = parseJsonContent("not json");
assert.strictEqual(invalid.parse_error, "invalid_json", "parser should preserve invalid JSON as manual review");

const envDir = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-grok-env-"));
const envPath = path.join(envDir, ".env");
fs.writeFileSync(envPath, "TEST_CWA_GROK_RUNNER_ENV=value\n");
delete process.env.TEST_CWA_GROK_RUNNER_ENV;
assert.strictEqual(loadEnvFile(envPath), true, "env loader should read existing env files");
assert.strictEqual(process.env.TEST_CWA_GROK_RUNNER_ENV, "value", "env loader should populate missing keys");
delete process.env.TEST_CWA_GROK_RUNNER_ENV;

const publicRow = publicRowForResult({
  packet_id: "packet_one",
  product_id: "fixture_bar",
  product_name: "Fixture Bar",
  source_row_count: 1,
  prompt_hash: "abc",
}, {
  status: "completed",
  response_hash: "def",
  parsed: {
    leads: [{ source_url: "https://example.test/lead" }],
    missing_after_search: [{ packet_id: "packet_one" }],
  },
});
assert.strictEqual(publicRow.candidate_lead_count, 1, "public row should count private candidate leads");
assert(!("source_url" in publicRow), "public row should not publish returned source URLs");
assert.strictEqual(publicRow.manual_verified_created, 0, "runner cannot create manual verification");

const generatedSummary = JSON.parse(fs.readFileSync(publicJsonPath, "utf8"));
const generatedCsv = fs.readFileSync(publicCsvPath, "utf8");
const generatedRunbook = fs.readFileSync(publicRunbookPath, "utf8");
const siteSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
assert.strictEqual(generatedSummary.schema_version, "confection_wrapper_grok_source_hunt_run.v1", "generated summary should use expected schema");
assert.strictEqual(generatedSummary.packets_available, 9, "generated summary should cover all private CWA Grok packets");
assert.strictEqual(generatedSummary.public_safety.raw_model_outputs_committed, false, "public summary must not commit raw model output");
assert.strictEqual(generatedSummary.public_safety.source_urls_from_model_committed, false, "public summary must not commit model-returned URLs");
assert.strictEqual(generatedSummary.public_safety.manual_verified_created, false, "runner cannot create manual verification");
assert(generatedRunbook.includes("grok_research_assist"), "runbook should preserve candidate-only rule");
assert(siteSummary.confection_wrapper_grok_source_hunt_run_summary, "site summary should expose Grok run summary");
assert(siteSummary.confection_wrapper_grok_source_hunt_packet_summary.grok_run_summary, "packet summary should nest run summary");
assert(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts.grok_source_hunt_run_csv, "ingredient priority artifacts should link Grok run CSV");
assertPublicSafe(generatedCsv, "generated public CSV");
assertPublicSafe(fs.readFileSync(publicJsonPath, "utf8"), "generated public JSON");
assertPublicSafe(generatedRunbook, "generated public runbook");

console.log("confection wrapper Grok source-hunt runner tests passed");
