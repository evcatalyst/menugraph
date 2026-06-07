const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pipelineSummaryPath = path.join(root, "docs/data/product-evidence/pilot_capture_pipeline_summary.json");
const runSummaryCsvPath = path.join(root, "docs/data/product-evidence/exports/pilot_capture_dry_run_summary.csv");
const modelSummaryCsvPath = path.join(root, "docs/data/product-evidence/exports/pilot_capture_model_assist_summary.csv");
const imageMapTemplateCsvPath = path.join(root, "docs/data/product-evidence/exports/pilot_capture_image_map_template.csv");
const imageMapAuditCsvPath = path.join(root, "docs/data/product-evidence/exports/pilot_capture_image_map_audit.csv");
const ocrSummaryCsvPath = path.join(root, "docs/data/product-evidence/exports/pilot_capture_native_ocr_summary.csv");
const reviewQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/pilot_capture_review_queue.csv");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') inQuotes = false;
      else value += char;
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") value += char;
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const headers = rows.shift() || [];
  return rows
    .filter((cells) => cells.some(Boolean))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function assertNoPrivatePaths(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaked a private path`);
}

const pipelineSummary = JSON.parse(fs.readFileSync(pipelineSummaryPath, "utf8"));
const siteSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const runRows = parseCsv(fs.readFileSync(runSummaryCsvPath, "utf8"));
const modelRows = parseCsv(fs.readFileSync(modelSummaryCsvPath, "utf8"));
const imageMapTemplateRows = parseCsv(fs.readFileSync(imageMapTemplateCsvPath, "utf8"));
const imageMapAuditRows = parseCsv(fs.readFileSync(imageMapAuditCsvPath, "utf8"));
const ocrRows = parseCsv(fs.readFileSync(ocrSummaryCsvPath, "utf8"));
const reviewRows = parseCsv(fs.readFileSync(reviewQueueCsvPath, "utf8"));

assert.strictEqual(pipelineSummary.schema_version, "hybrid_ingredient_ocr_public_rollup.v1", "pipeline summary should be versioned");
assert.strictEqual(pipelineSummary.run_id, "pilot-photo-capture-dry-run", "unexpected dry-run id");
assert.strictEqual(pipelineSummary.capture.selected_rows, 101, "dry run should cover pilot capture rows");
assert.strictEqual(pipelineSummary.capture.rows_captured, 101, "dry run should emit public capture rows");
assert.strictEqual(pipelineSummary.capture.ready_for_ocr, 0, "no-network dry run should not mark rows OCR-ready");
assert.strictEqual(pipelineSummary.capture.blocked_no_network, 101, "no-network dry run should preserve source capture blocker");
assert.strictEqual(pipelineSummary.capture.image_map_template_rows, 101, "dry run should emit image-map starter rows");
assert(pipelineSummary.capture.image_map_key_count >= 303, "dry run should expose multiple map keys per row");
assert.strictEqual(pipelineSummary.image_map_audit.template_rows, 101, "image-map audit should cover pilot rows");
assert.strictEqual(pipelineSummary.image_map_audit.ready_for_capture, 0, "blank pilot template should not be capture-ready");
assert.strictEqual(pipelineSummary.image_map_audit.no_private_path_supplied, 101, "blank pilot template should need private paths");
assert.strictEqual(pipelineSummary.capture_task_summary.task_count, 101, "capture task summary should cover pilot rows");
assert.strictEqual(pipelineSummary.capture_task_summary.paths_needed, 101, "pilot capture tasks should need private paths");
assert.strictEqual(pipelineSummary.review_queue.rows, 101, "review queue should cover pilot capture rows");
assert.strictEqual(pipelineSummary.review_queue.needs_source_review, 101, "dry run rows should need source review");
assert.strictEqual(pipelineSummary.ocr.ocr_result_rows, 101, "native OCR dry run should cover pilot capture rows");
assert.strictEqual(pipelineSummary.ocr.ocr_skipped_no_image, 101, "native OCR should be blocked without private image-map rows");
assert.strictEqual(pipelineSummary.ocr.ingredient_signal_found, 0, "skipped OCR rows should not create ingredient signals");
assert.strictEqual(pipelineSummary.model_routes.spark_model, "gpt-5.3-codex-spark", "Spark route should be explicit");
assert.strictEqual(pipelineSummary.model_routes.gpt55_review_model, "gpt-5.5", "GPT-5.5 review route should be explicit");
assert(pipelineSummary.model_routes.spark_packets_generated > 0, "Spark packet count should be populated");
assert.strictEqual(pipelineSummary.model_routes.gpt55_review_batches_planned, 5, "expected capped GPT-5.5 review batches");
assert.strictEqual(pipelineSummary.model_routes.grok_assist_batches_created, 0, "no-network run should not call Grok");
assert.strictEqual(pipelineSummary.public_safety.images_committed, false, "dry run must not publish images");
assert.strictEqual(pipelineSummary.public_safety.private_paths_committed, false, "dry run must not publish private paths");
assert.strictEqual(pipelineSummary.public_safety.unverified_ingredient_claims_published, false, "dry run must not publish claims");
assert.strictEqual(pipelineSummary.public_safety.manual_verified_created, false, "models cannot create manual verification");
assert.strictEqual(pipelineSummary.public_safety.candidate_only, true, "dry run must be candidate-only");

assert.strictEqual(runRows.length, 101, "capture run CSV should contain 101 rows");
assert.strictEqual(imageMapTemplateRows.length, 101, "image-map template CSV should contain 101 rows");
assert.strictEqual(imageMapAuditRows.length, 101, "image-map audit CSV should contain 101 rows");
assert.strictEqual(ocrRows.length, 101, "native OCR CSV should contain 101 rows");
assert.strictEqual(reviewRows.length, 101, "review queue CSV should contain 101 rows");
assert(modelRows.some((row) => row.route_type === "spark_packet"), "model CSV should include Spark packet rows");
assert(modelRows.some((row) => row.route_type === "gpt55_review_batch"), "model CSV should include GPT-5.5 review batches");
assert(runRows.every((row) => Number(row.candidate_only) === 1), "run rows must be candidate-only");
assert(imageMapTemplateRows.every((row) => Number(row.candidate_only) === 1), "image-map template rows must be candidate-only");
assert(imageMapTemplateRows.every((row) => Number(row.manual_verified) === 0), "image-map template rows cannot be manually verified");
assert(imageMapTemplateRows.every((row) => row.local_private_image_path === "" && row.processed_private_image_path === ""), "image-map template must leave private paths blank");
assert(imageMapAuditRows.every((row) => row.audit_status === "no_private_path_supplied"), "blank image-map audit should request private paths");
assert(imageMapAuditRows.every((row) => Number(row.manual_verified) === 0), "image-map audit rows cannot be manually verified");
assert(reviewRows.every((row) => Number(row.candidate_only) === 1), "review rows must be candidate-only");
assert(reviewRows.every((row) => Number(row.manual_verified) === 0), "review rows cannot be manually verified by models");
assert(ocrRows.every((row) => row.ocr_status === "ocr_skipped_no_image"), "pilot dry-run OCR rows should be skipped without image-map entries");
assert(ocrRows.every((row) => Number(row.manual_verified) === 0), "OCR rows cannot be manually verified");

assert(siteSummary.pilot_capture_pipeline_summary, "site summary should expose pilot capture dry-run rollup");
assert.deepStrictEqual(
  siteSummary.pilot_capture_pipeline_summary.capture,
  pipelineSummary.capture,
  "site summary capture rollup should match pipeline summary",
);
assert.strictEqual(
  siteSummary.pilot_capture_pipeline_summary.public_artifacts.review_queue_csv,
  "docs/data/product-evidence/exports/pilot_capture_review_queue.csv",
  "site summary should link review queue artifact",
);
assert.strictEqual(
  siteSummary.pilot_capture_pipeline_summary.public_artifacts.image_map_template_csv,
  "docs/data/product-evidence/exports/pilot_capture_image_map_template.csv",
  "site summary should link image-map template artifact",
);
assert.strictEqual(
  siteSummary.pilot_capture_pipeline_summary.public_artifacts.image_map_audit_csv,
  "docs/data/product-evidence/exports/pilot_capture_image_map_audit.csv",
  "site summary should link image-map audit artifact",
);
assert.strictEqual(
  siteSummary.pilot_capture_pipeline_summary.public_artifacts.capture_task_csv,
  "docs/data/product-evidence/exports/pilot_capture_tasks.csv",
  "site summary should link capture task artifact",
);
assert.strictEqual(
  siteSummary.pilot_capture_pipeline_summary.public_artifacts.ocr_summary_csv,
  "docs/data/product-evidence/exports/pilot_capture_native_ocr_summary.csv",
  "site summary should link native OCR artifact",
);

assertNoPrivatePaths(JSON.stringify(pipelineSummary), "pilot capture pipeline summary");
assertNoPrivatePaths(JSON.stringify(siteSummary.pilot_capture_pipeline_summary), "site summary pilot capture rollup");
assertNoPrivatePaths(fs.readFileSync(runSummaryCsvPath, "utf8"), "pilot capture run CSV");
assertNoPrivatePaths(fs.readFileSync(modelSummaryCsvPath, "utf8"), "pilot capture model CSV");
assertNoPrivatePaths(fs.readFileSync(imageMapTemplateCsvPath, "utf8"), "pilot capture image-map template CSV");
assertNoPrivatePaths(fs.readFileSync(imageMapAuditCsvPath, "utf8"), "pilot capture image-map audit CSV");
assertNoPrivatePaths(fs.readFileSync(ocrSummaryCsvPath, "utf8"), "pilot capture native OCR CSV");
assertNoPrivatePaths(fs.readFileSync(reviewQueueCsvPath, "utf8"), "pilot capture review CSV");

console.log("pilot capture dry-run tests passed");
