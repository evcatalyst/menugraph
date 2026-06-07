const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const queueCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_panel_triage_queue.csv");
const modelAssistCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_panel_model_assist_summary.csv");
const dryRunCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_panel_capture_dry_run_summary.csv");
const imageMapTemplateCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_panel_image_map_template.csv");
const nativeOcrCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_panel_native_ocr_summary.csv");
const reviewQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_panel_review_queue.csv");
const pipelineSummaryPath = path.join(root, "docs/data/product-evidence/confection_wrapper_item_panel_pipeline_summary.json");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertNoPrivatePaths(filePath) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(fs.readFileSync(filePath, "utf8")), `${filePath} leaks an actual private path`);
}

const runId = "confection-wrapper-item-panel-v1";
const queueRows = parseCsv(fs.readFileSync(queueCsvPath, "utf8"));
const modelRows = parseCsv(fs.readFileSync(modelAssistCsvPath, "utf8"));
const dryRunRows = parseCsv(fs.readFileSync(dryRunCsvPath, "utf8"));
const imageMapRows = parseCsv(fs.readFileSync(imageMapTemplateCsvPath, "utf8"));
const nativeOcrRows = parseCsv(fs.readFileSync(nativeOcrCsvPath, "utf8")).filter((row) => row.run_id === runId);
const reviewRows = parseCsv(fs.readFileSync(reviewQueueCsvPath, "utf8"));
const pipelineSummary = JSON.parse(fs.readFileSync(pipelineSummaryPath, "utf8"));
const siteSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(queueRows.length, 49, "expected CWA item panel queue rows");
assert.strictEqual(pipelineSummary.schema_version, "hybrid_ingredient_ocr_public_rollup.v1", "pipeline summary should use shared rollup schema");
assert.strictEqual(pipelineSummary.run_id, runId, "pipeline summary should use CWA item-panel run id");
assert.strictEqual(pipelineSummary.public_safety.images_committed, false, "pipeline must not publish images");
assert.strictEqual(pipelineSummary.public_safety.unverified_ingredient_claims_published, false, "pipeline must not publish ingredient claims");
assert.strictEqual(pipelineSummary.public_safety.manual_verified_created, false, "pipeline must not create manual verification");
assert.deepStrictEqual(siteSummary.confection_wrapper_item_panel_pipeline_summary, pipelineSummary, "site summary should include CWA pipeline summary");

assert.strictEqual(modelRows.length, 3, "expected three compact Spark packets for 49 rows");
assert(modelRows.every((row) => row.run_id === runId), "model rows should use CWA run id");
assert(modelRows.every((row) => row.grouping_policy === "compact"), "model rows should record compact grouping");
assert.strictEqual(
  modelRows.reduce((sum, row) => sum + Number(row.source_row_count || 0), 0),
  queueRows.length,
  "model rows should cover every CWA triage row",
);

assert.strictEqual(dryRunRows.length, queueRows.length, "capture dry-run CSV should cover every CWA row");
assert.strictEqual(imageMapRows.length, queueRows.length, "image-map template should cover every CWA row");
assert.strictEqual(nativeOcrRows.length, queueRows.length, "native OCR summary should cover every CWA row");
assert.strictEqual(reviewRows.length, queueRows.length, "review queue should cover every CWA row");
assert(dryRunRows.every((row) => row.capture_status === "source_page_capture_blocked_no_network"), "dry run should not claim public image capture");
assert(dryRunRows.every((row) => row.ready_for_ocr === "0"), "dry-run rows should not be OCR-ready");
assert(imageMapRows.every((row) => row.local_private_image_path === "" && row.processed_private_image_path === ""), "image-map template should keep private paths blank");
assert(nativeOcrRows.every((row) => row.ocr_status === "ocr_skipped_no_image"), "OCR rows should be skipped until private images exist");
assert(reviewRows.every((row) => row.review_status === "needs_source_review"), "review queue should wait on source/image review");
assert(reviewRows.every((row) => row.candidate_only === "1" && row.manual_verified === "0"), "review queue must stay candidate-only");

assert.strictEqual(pipelineSummary.model_routes.spark_packets_generated, 3, "pipeline should expose Spark packet count");
assert.strictEqual(pipelineSummary.capture.selected_rows, queueRows.length, "pipeline capture rows should match queue rows");
assert.strictEqual(pipelineSummary.capture.ready_for_ocr, 0, "pipeline should not be OCR-ready without private crops");
assert.strictEqual(pipelineSummary.capture.blocked_no_network, queueRows.length, "pipeline should expose no-network blockers");
assert.strictEqual(pipelineSummary.capture.image_map_template_rows, queueRows.length, "pipeline should expose image-map rows");
assert.strictEqual(pipelineSummary.ocr.ocr_skipped_no_image, queueRows.length, "pipeline should expose skipped OCR rows");
assert.strictEqual(pipelineSummary.review_queue.rows, queueRows.length, "pipeline should expose review rows");
assert.strictEqual(pipelineSummary.review_queue.needs_source_review, queueRows.length, "pipeline should require source review");

[
  modelAssistCsvPath,
  dryRunCsvPath,
  imageMapTemplateCsvPath,
  nativeOcrCsvPath,
  reviewQueueCsvPath,
  pipelineSummaryPath,
].forEach(assertNoPrivatePaths);

console.log("confection wrapper item panel pipeline tests passed");
