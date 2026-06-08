const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const {
  buildRows,
  rowsFromResult,
  writeLeadReview,
} = require("./build-confection-wrapper-grok-source-lead-review");

const root = path.join(__dirname, "..");
const publicCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_grok_source_lead_review.csv");
const publicJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_grok_source_lead_review.json");
const publicRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_grok_source_lead_review_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertPublicSafe(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaks private path`);
  assert(!/"source_url"\s*:|https:\/\/example\.test|Fixture wrapper listing|raw_content|confidence_warning"\s*:|model_next_action/.test(text), `${label} leaks model-returned lead details`);
}

const fixtureResult = {
  schema_version: "confection_wrapper_grok_source_hunt_result.v1",
  packet_id: "packet_fixture",
  product_id: "fixture_bar",
  product_name: "Fixture Bar",
  model: "grok-test",
  status: "completed",
  prompt_hash: "prompt-hash",
  response_hash: "response-hash",
  parsed: {
    leads: [
      {
        packet_id: "source_packet_fixture",
        source_url: "https://example.test/fixture-wrapper-back-panel",
        source_title: "Fixture wrapper listing",
        source_owner_or_publisher: "Example Seller",
        source_type: "auction_listing_photo",
        claimed_product_date: "1970s",
        visible_surfaces: ["ingredient_panel", "nutrition_panel", "net_weight"],
        confidence_warning: "Candidate only; confirm label readability.",
        next_action: "Open and inspect image panels.",
      },
    ],
    missing_after_search: [],
  },
};

const pairRows = rowsFromResult(fixtureResult);
assert.strictEqual(pairRows.length, 1, "fixture should produce one lead row");
assert.strictEqual(pairRows[0].public.ingredient_panel_signal, 1, "public row should preserve panel signal");
assert.strictEqual(pairRows[0].public.nutrition_panel_signal, 1, "public row should preserve nutrition signal");
assert(!("source_url" in pairRows[0].public), "public row must not expose model-returned source URL");
assert(pairRows[0].private.source_url.includes("example.test"), "private row should retain source URL");
const built = buildRows([fixtureResult]);
assert.strictEqual(built.publicRows[0].lead_id, pairRows[0].public.lead_id, "buildRows should retain lead identity");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-grok-leads-"));
const resultDir = path.join(tmpDir, "results");
fs.mkdirSync(resultDir, { recursive: true });
fs.writeFileSync(path.join(resultDir, "fixture.json"), JSON.stringify(fixtureResult, null, 2));
const result = writeLeadReview({
  runId: "unit-cwa-grok-source-lead-review",
  runDir: path.join(tmpDir, "run"),
  resultDir,
  publicCsvPath: path.join(tmpDir, "lead-review.csv"),
  publicJsonPath: path.join(tmpDir, "lead-review.json"),
  publicRunbookPath: path.join(tmpDir, "lead-review.md"),
  updateSiteSummary: false,
});
assert.strictEqual(result.summary.private_result_files_read, 1, "fixture should read one private result file");
assert.strictEqual(result.summary.public_review_rows, 1, "fixture should create one public review row");
assert.strictEqual(result.summary.ingredient_panel_signal_rows, 1, "fixture should count panel signal");
assert(fs.readFileSync(path.join(result.privateReviewDir, "grok-source-lead-review.private.json"), "utf8").includes("https://example.test/fixture-wrapper-back-panel"), "private review should retain source URL");
assertPublicSafe(fs.readFileSync(path.join(tmpDir, "lead-review.csv"), "utf8"), "fixture public CSV");
assertPublicSafe(fs.readFileSync(path.join(tmpDir, "lead-review.json"), "utf8"), "fixture public JSON");
assertPublicSafe(fs.readFileSync(path.join(tmpDir, "lead-review.md"), "utf8"), "fixture public runbook");

const generatedSummary = JSON.parse(fs.readFileSync(publicJsonPath, "utf8"));
const generatedCsv = fs.readFileSync(publicCsvPath, "utf8");
const generatedRunbook = fs.readFileSync(publicRunbookPath, "utf8");
const siteSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
assert.strictEqual(generatedSummary.schema_version, "confection_wrapper_grok_source_lead_review.v1", "generated summary should use expected schema");
assert.strictEqual(generatedSummary.private_result_files_read, 0, "generated baseline should not include fixture result files");
assert.strictEqual(generatedSummary.public_review_rows, 0, "generated baseline should not include fixture review rows");
assert.strictEqual(generatedSummary.products_with_candidate_leads, 0, "generated baseline should not include fixture products");
assert.strictEqual(generatedSummary.public_safety.model_returned_source_urls_committed, false, "public summary must not commit model-returned URLs");
assert.strictEqual(generatedSummary.public_safety.manual_verified_created, false, "lead review cannot create manual verification");
assert(generatedRunbook.includes("model-returned URLs"), "runbook should state URL-publication guardrail");
assert(siteSummary.confection_wrapper_grok_source_lead_review_summary, "site summary should expose lead review summary");
assert(siteSummary.confection_wrapper_grok_source_hunt_run_summary.lead_review_summary, "run summary should nest lead review summary");
assert(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts.grok_source_lead_review_csv, "ingredient priority artifacts should link lead review CSV");
assertPublicSafe(generatedCsv, "generated public CSV");
assertPublicSafe(fs.readFileSync(publicJsonPath, "utf8"), "generated public JSON");
assertPublicSafe(generatedRunbook, "generated public runbook");

console.log("confection wrapper Grok source lead review tests passed");
