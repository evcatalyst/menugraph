const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const worksheetCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_panel_review_worksheet.csv");
const worksheetJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_panel_review_worksheet.json");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_panel_review_worksheet_runbook.md");
const pipelineSummaryPath = path.join(root, "docs/data/product-evidence/confection_wrapper_item_panel_pipeline_summary.json");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertNoPrivatePaths(filePath) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(fs.readFileSync(filePath, "utf8")), `${filePath} leaks an actual private path`);
}

const rows = parseCsv(fs.readFileSync(worksheetCsvPath, "utf8"));
const worksheet = JSON.parse(fs.readFileSync(worksheetJsonPath, "utf8"));
const runbook = fs.readFileSync(runbookPath, "utf8");
const pipelineSummary = JSON.parse(fs.readFileSync(pipelineSummaryPath, "utf8"));
const siteSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(worksheet.schema_version, "confection_wrapper_panel_review_worksheet.v1", "worksheet should use CWA panel-review schema");
assert.strictEqual(rows.length, 49, "worksheet should cover every CWA capture task");
assert.strictEqual(worksheet.worksheet_rows, rows.length, "worksheet summary should match CSV rows");
assert.strictEqual(worksheet.panel_review_not_started, rows.length, "all worksheet rows should start unreviewed");
assert.strictEqual(worksheet.private_crops_supplied, 0, "public worksheet should not include private crops");
assert.strictEqual(worksheet.readable_for_ocr, 0, "public worksheet should not mark rows OCR-ready");
assert.strictEqual(worksheet.manual_verified_created, 0, "worksheet must not create manual verification");
assert(worksheet.review_questions.includes("Is ingredient text visible?"), "worksheet should ask whether ingredient text is visible");
assert(worksheet.review_questions.includes("Is any visible text readable enough for OCR?"), "worksheet should ask whether text is readable enough for OCR");
assert(worksheet.first_rows.length > 0, "worksheet should expose first rows for site preview");
assert(worksheet.first_rows[0].source_url, "first worksheet row should expose source URL");
assert(worksheet.first_rows[0].crop_target, "first worksheet row should expose crop target");
assert(worksheet.first_rows[0].review_surface_hint, "first worksheet row should expose review surface hint");
assert.strictEqual(worksheet.first_rows[0].review_state, "panel_review_not_started", "first worksheet row should start unreviewed");

rows.forEach((row) => {
  assert.strictEqual(row.review_state, "panel_review_not_started", `${row.review_id} should start unreviewed`);
  assert.strictEqual(row.candidate_only, "1", `${row.review_id} should stay candidate-only`);
  assert.strictEqual(row.manual_verified, "0", `${row.review_id} must not be manual verified`);
  assert.strictEqual(row.private_crop_supplied, "0", `${row.review_id} should not publish a private crop`);
  assert.strictEqual(row.private_crop_hash, "", `${row.review_id} should not publish a private hash`);
  [
    "package_surface_visible",
    "package_front_visible",
    "package_back_or_side_visible",
    "ingredient_panel_visible",
    "nutrition_panel_visible",
    "net_weight_visible",
    "manufacturer_or_distributor_visible",
    "date_or_lot_cue_visible",
    "text_readable_for_ocr",
    "panel_role_decision",
    "reviewer",
    "reviewed_at",
    "reviewer_notes",
  ].forEach((field) => {
    assert.strictEqual(row[field], "", `${row.review_id} should leave ${field} blank for human review`);
  });
  assert(
    row.source_url.startsWith("https://www.candywrapperarchive.com/candy-collector/"),
    `${row.review_id} should link to a Candy Wrapper Archive item page`,
  );
});

assert.strictEqual(pipelineSummary.panel_review_worksheet.worksheet_rows, rows.length, "pipeline summary should attach worksheet summary");
assert.strictEqual(pipelineSummary.panel_review_worksheet.panel_review_not_started, rows.length, "pipeline summary should expose unreviewed rows");
assert.strictEqual(pipelineSummary.panel_review_worksheet.readable_for_ocr, 0, "pipeline summary should expose no readable reviews yet");
assert(pipelineSummary.public_artifacts.panel_review_worksheet_csv, "pipeline summary should link panel-review CSV");
assert(pipelineSummary.public_artifacts.panel_review_worksheet_json, "pipeline summary should link panel-review JSON");
assert(pipelineSummary.public_artifacts.panel_review_worksheet_runbook_md, "pipeline summary should link panel-review runbook");
assert.deepStrictEqual(siteSummary.confection_wrapper_panel_review_worksheet_summary, worksheet, "site summary should expose worksheet summary");
assert.deepStrictEqual(
  siteSummary.confection_wrapper_item_panel_pipeline_summary.panel_review_worksheet,
  worksheet,
  "site pipeline summary should include worksheet summary",
);

assert(runbook.includes("Candy Wrapper Archive Panel Review Worksheet"), "runbook should identify the review worksheet");
assert(runbook.includes("Review Questions"), "runbook should list review questions");
assert(runbook.includes("manual verification"), "runbook should preserve the manual-verification boundary");

[
  worksheetCsvPath,
  worksheetJsonPath,
  runbookPath,
  pipelineSummaryPath,
  summaryPath,
].forEach(assertNoPrivatePaths);

console.log("confection wrapper panel review worksheet tests passed");
