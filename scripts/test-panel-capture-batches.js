const fs = require("fs");
const path = require("path");
const assert = require("assert");
const {
  parseCsv,
  readFullQueue,
  selectQueueRows,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const manifestPath = path.join(root, "docs/data/product-evidence/panel_capture_batches.json");
const queueCsvPath = path.join(root, "docs/data/product-evidence/exports/panel_capture_ocr_queue.csv");
const batchCsvPath = path.join(root, "docs/data/product-evidence/exports/panel_capture_batches.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/panel_capture_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const queueRows = parseCsv(fs.readFileSync(queueCsvPath, "utf8"));
const normalizedQueueRows = readFullQueue(queueCsvPath);
const batchRows = parseCsv(fs.readFileSync(batchCsvPath, "utf8"));
const runbook = fs.readFileSync(runbookPath, "utf8");
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(manifest.schema_version, "panel_capture_batch_manifest.v1", "manifest schema should be versioned");
assert.strictEqual(manifest.totals.board_slots, 720, "capture batches should originate from the 120-product acquisition board");
assert.strictEqual(manifest.totals.board_needs_panel_acquisition_slots, 709, "capture batches should preserve the acquisition gap count");
assert.strictEqual(manifest.totals.selected_rows, 250, "default capture queue should select the top 250 rows");
assert.strictEqual(queueRows.length, manifest.totals.selected_rows, "queue CSV should match selected row count");
assert.strictEqual(batchRows.length, manifest.totals.batch_count, "batch CSV should match manifest batch count");
assert(manifest.totals.batch_count > 0 && manifest.totals.batch_count <= 20, "capture batches should be operationally compact");
assert(manifest.totals.high_priority_rows >= 30, "pilot/current panel leads should remain high priority");
assert(manifest.totals.panel_capture_rows > manifest.totals.readable_panel_photo_rows, "panel/document capture should dominate product-context follow-up");
assert.strictEqual(manifest.public_safety.candidate_only, true, "manifest must remain candidate-only");
assert.strictEqual(manifest.public_safety.manual_verified_created, false, "batching must not create manual verification");

[
  "manifest_json",
  "queue_csv",
  "batch_csv",
  "runbook_markdown",
].forEach((field) => {
  assert(manifest.artifacts[field], `manifest missing artifact ${field}`);
  assert(summary.panel_capture_batch_summary.artifacts[field], `summary missing artifact ${field}`);
});

assert.deepStrictEqual(
  summary.panel_capture_batch_summary.totals,
  manifest.totals,
  "summary totals should match capture manifest totals",
);

const byEvidenceId = new Map(queueRows.map((row) => [row.evidence_id, row]));
const oreo1993 = byEvidenceId.get("flickr_oreo_1993");
assert(oreo1993, "Oreo 1993 panel candidate should be in the top capture queue");
assert.strictEqual(oreo1993.ocr_gap_category, "panel_capture_needed", "Oreo 1993 should require panel capture");
assert.strictEqual(oreo1993.capture_strategy, "panel_crop", "Oreo 1993 should route to panel crop");
assert.strictEqual(oreo1993.candidate_only, "1", "Oreo 1993 should remain candidate-only");
assert.strictEqual(oreo1993.manual_verified, "0", "Oreo 1993 should not be marked manually verified");
assert(/ingredient|nutrition/i.test(oreo1993.ocr_expected_surface), "Oreo 1993 should target ingredient/nutrition text");

queueRows.forEach((row) => {
  assert(row.product_id, "queue row missing product id");
  assert(row.evidence_id, `${row.product_id} missing evidence id`);
  assert(row.ocr_gap_category, `${row.evidence_id} missing OCR gap category`);
  assert(row.capture_strategy, `${row.evidence_id} missing capture strategy`);
  assert.strictEqual(row.candidate_only, "1", `${row.evidence_id} should be candidate-only`);
  assert.strictEqual(row.manual_verified, "0", `${row.evidence_id} should not be manually verified`);
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(JSON.stringify(row)), `${row.evidence_id} leaks an actual private path`);
});

const selectedForSpark = selectQueueRows(normalizedQueueRows, { limit: 40 });
assert.strictEqual(selectedForSpark.length, 40, "panel queue should be compatible with Spark packet selection");
assert(selectedForSpark.every((row) => row.ocr_priority), "normalized queue rows should expose OCR priority");
assert(selectedForSpark.every((row) => row.ocr_gap_category), "normalized queue rows should expose OCR gap category");

assert(/ingredient-panel acquisition board/i.test(runbook), "runbook should identify the source board");
assert(/candidate-only/i.test(runbook), "runbook should preserve candidate-only guidance");
assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(runbook), "runbook should not leak actual private paths");

console.log("panel capture batch tests passed");
