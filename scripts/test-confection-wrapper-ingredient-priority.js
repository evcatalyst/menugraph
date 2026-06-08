const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const priorityJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_priority.json");
const priorityCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority_runbook.md");
const imageMapTemplatePath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority_image_map_template.csv");
const auditCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority_image_map_audit.csv");
const auditJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_priority_image_map_audit.json");
const captureTaskCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_capture_tasks.csv");
const captureTaskJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_capture_tasks.json");
const captureRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_capture_runbook.md");
const capturePacketCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_capture_packets.csv");
const capturePacketJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_capture_packets.json");
const capturePacketRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_capture_packet_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertNoPrivatePaths(value, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(value), `${label} leaks an actual private path`);
}

const manifest = JSON.parse(fs.readFileSync(priorityJsonPath, "utf8"));
const csvRows = parseCsv(fs.readFileSync(priorityCsvPath, "utf8"));
const imageMapRows = parseCsv(fs.readFileSync(imageMapTemplatePath, "utf8"));
const auditRows = parseCsv(fs.readFileSync(auditCsvPath, "utf8"));
const auditSummary = JSON.parse(fs.readFileSync(auditJsonPath, "utf8"));
const captureTaskRows = parseCsv(fs.readFileSync(captureTaskCsvPath, "utf8"));
const captureTaskSummary = JSON.parse(fs.readFileSync(captureTaskJsonPath, "utf8"));
const capturePacketRows = parseCsv(fs.readFileSync(capturePacketCsvPath, "utf8"));
const capturePacketSummary = JSON.parse(fs.readFileSync(capturePacketJsonPath, "utf8"));
const runbook = fs.readFileSync(runbookPath, "utf8");
const captureRunbook = fs.readFileSync(captureRunbookPath, "utf8");
const capturePacketRunbook = fs.readFileSync(capturePacketRunbookPath, "utf8");
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(manifest.schema_version, "confection_wrapper_ingredient_priority.v1", "ingredient priority should use expected schema");
assert.strictEqual(manifest.totals.products, 9, "ingredient priority should cover every CWA story seed product");
assert.strictEqual(manifest.totals.priority_rows, 245, "ingredient priority should include all OCR-eligible CWA text surfaces");
assert.strictEqual(manifest.totals.source_eras, 49, "ingredient priority should span every CWA source era");
assert.strictEqual(manifest.totals.primary_text_rows, 98, "ingredient and nutrition panel rows should lead the plan");
assert.strictEqual(manifest.totals.ingredient_panel_rows, 49, "every source era should have an ingredient-panel target");
assert.strictEqual(manifest.totals.nutrition_panel_rows, 49, "every source era should have a nutrition-panel target");
assert.strictEqual(manifest.totals.support_text_rows, 147, "support text rows should remain after primary panels");
assert.strictEqual(manifest.totals.ready_for_ocr, 0, "no row should claim OCR readiness without private crops");
assert.strictEqual(manifest.totals.private_paths_supplied, 0, "public artifact should not include private crop paths");
assert.strictEqual(manifest.totals.verified_ingredient_labels, 0, "priority artifact must not create verified labels");
assert.strictEqual(manifest.totals.claim_blocked_rows, 245, "every priority row should keep claims blocked");
assert.strictEqual(manifest.totals.image_map_template_rows, 245, "every priority row should enter the private image-map template");
assert.strictEqual(manifest.totals.capture_task_rows, 245, "every priority row should become a capture task");
assert.strictEqual(manifest.totals.capture_packets, 49, "every source era should become one source-page capture packet");
assert.strictEqual(manifest.totals.paths_needed, 245, "every priority row should still need a private crop path");
assert.strictEqual(csvRows.length, 245, "CSV should contain every priority row");
assert.strictEqual(imageMapRows.length, 245, "image-map template should contain every priority row");
assert.strictEqual(auditRows.length, 245, "audit CSV should contain every priority row");
assert.strictEqual(captureTaskRows.length, 245, "capture task CSV should contain every priority row");
assert.strictEqual(capturePacketRows.length, 49, "capture packet CSV should contain one row per source era");
assert.strictEqual(auditSummary.template_rows, 245, "audit summary should count every template row");
assert.strictEqual(auditSummary.ready_for_capture, 0, "audit should not mark rows ready without private paths");
assert.strictEqual(auditSummary.no_private_path_supplied, 245, "audit should identify missing private paths");
assert.strictEqual(captureTaskSummary.task_count, 245, "capture task summary should count every task");
assert.strictEqual(captureTaskSummary.paths_needed, 245, "capture task summary should identify path work");
assert.strictEqual(captureTaskSummary.ready_for_capture, 0, "capture task summary should not mark rows ready");
assert.strictEqual(capturePacketSummary.packet_count, 49, "capture packet summary should count source pages");
assert.strictEqual(capturePacketSummary.surface_rows, 245, "capture packet summary should count all surface rows");
assert.strictEqual(capturePacketSummary.primary_text_rows, 98, "capture packet summary should count primary rows");
assert.strictEqual(capturePacketSummary.support_text_rows, 147, "capture packet summary should count support rows");
assert.strictEqual(capturePacketSummary.private_paths_needed, 245, "capture packet summary should identify private path work");
assert.strictEqual(capturePacketSummary.ready_for_ocr, 0, "capture packet summary should not mark rows ready");

const productNames = new Set(manifest.product_priorities.map((row) => row.product_name));
[
  "Butterfinger Bar",
  "Reese's Peanut Butter Cups",
  "Hershey's Milk Chocolate Bar",
  "Kit Kat Bar",
  "Snickers Bar",
  "M&M's Milk Chocolate Candies",
  "Twix Bar",
  "Milky Way Bar",
  "Tootsie Roll",
].forEach((productName) => assert(productNames.has(productName), `ingredient priority should include ${productName}`));

manifest.product_priorities.forEach((product) => {
  assert(product.primary_text_rows > 0, `${product.product_name} should have primary ingredient/nutrition rows`);
  assert(product.rows.length > 0, `${product.product_name} should expose preview rows`);
  assert.strictEqual(product.verified_ingredient_labels, 0, `${product.product_name} must not claim verified labels`);
  assert.strictEqual(product.claim_gate, "ingredient_claims_blocked_pending_private_panel_capture_ocr_and_manual_verification", `${product.product_name} should keep claims blocked`);
  assert(product.rows[0].surface_id === "ingredient_panel", `${product.product_name} first capture row should be ingredient panel`);
  assert(product.rows[1].surface_id === "nutrition_panel", `${product.product_name} second capture row should be nutrition panel`);
});

manifest.first_rows.forEach((row) => {
  assert(row.source_url.startsWith("https://www.candywrapperarchive.com/candy-collector/"), `${row.product_name} row should link to a CWA item page`);
  assert(row.image_map_keys.includes(row.evidence_id), `${row.product_name} row should expose image-map keys`);
  assert.strictEqual(row.claim_gate, "blocked_until_private_readable_crop_ocr_correction_and_manual_verification", `${row.product_name} row should keep claim gate`);
});

assert.strictEqual(summary.confection_wrapper_ingredient_priority_summary.totals.priority_rows, manifest.totals.priority_rows, "site summary should expose priority totals");
assert(summary.confection_wrapper_ingredient_priority_summary.artifacts.ingredient_priority_csv, "site summary should link ingredient priority CSV");
assert(summary.confection_wrapper_ingredient_priority_summary.artifacts.ingredient_priority_runbook_md, "site summary should link ingredient priority runbook");
assert(summary.confection_wrapper_ingredient_priority_summary.artifacts.image_map_template_csv, "site summary should link image-map template CSV");
assert(summary.confection_wrapper_ingredient_priority_summary.artifacts.capture_task_csv, "site summary should link capture task CSV");
assert(summary.confection_wrapper_ingredient_priority_summary.artifacts.capture_packet_csv, "site summary should link capture packet CSV");
assert.strictEqual(summary.confection_wrapper_ingredient_capture_task_summary.task_count, 245, "site summary should expose capture task summary");
assert.strictEqual(summary.confection_wrapper_ingredient_capture_packet_summary.packet_count, 49, "site summary should expose capture packet summary");
assert.strictEqual(summary.confection_wrapper_ingredient_image_map_audit.template_rows, 245, "site summary should expose image-map audit");
assert(runbook.includes("Candy Wrapper Archive Ingredient-First Priority"), "runbook should identify ingredient priority");
assert(runbook.includes("Capture ingredient panels first"), "runbook should state ingredient-first rule");
assert(runbook.includes("wrapper-front product photos as secondary context"), "runbook should keep product photos secondary");
assert(captureRunbook.includes("Ingredient OCR Capture Task Runbook"), "capture runbook should use capture task flow");
assert(captureRunbook.includes("Image-map keys"), "capture runbook should expose image-map keys");
assert(capturePacketRunbook.includes("Candy Wrapper Archive Ingredient Capture Packets"), "packet runbook should identify packets");
assert(capturePacketRunbook.includes("open one source page"), "packet runbook should explain source-page capture");

capturePacketSummary.packets.forEach((packet) => {
  assert.strictEqual(packet.surface_count, 5, `${packet.packet_id} should group five expected surfaces`);
  assert.strictEqual(packet.primary_text_rows, 2, `${packet.packet_id} should include ingredient and nutrition rows`);
  assert.strictEqual(packet.support_text_rows, 3, `${packet.packet_id} should include support text rows`);
  assert.strictEqual(packet.ready_for_ocr, 0, `${packet.packet_id} should not be OCR-ready`);
  assert.strictEqual(packet.private_paths_needed, 5, `${packet.packet_id} should need private crop paths`);
  assert.strictEqual(packet.rows[0].surface_id, "ingredient_panel", `${packet.packet_id} should start with ingredient panel`);
  assert.strictEqual(packet.rows[1].surface_id, "nutrition_panel", `${packet.packet_id} should capture nutrition second`);
});

imageMapRows.forEach((row) => {
  assert(row.image_map_keys.includes(row.evidence_id), `${row.evidence_id} should include evidence image-map key`);
  assert.strictEqual(row.local_private_image_path, "", `${row.evidence_id} should not commit local private path`);
  assert.strictEqual(row.processed_private_image_path, "", `${row.evidence_id} should not commit processed private path`);
  assert.strictEqual(row.candidate_only, "1", `${row.evidence_id} should stay candidate-only`);
  assert.strictEqual(row.manual_verified, "0", `${row.evidence_id} should not be manually verified`);
});

[
  priorityJsonPath,
  priorityCsvPath,
  runbookPath,
  imageMapTemplatePath,
  auditCsvPath,
  auditJsonPath,
  captureTaskCsvPath,
  captureTaskJsonPath,
  captureRunbookPath,
  capturePacketCsvPath,
  capturePacketJsonPath,
  capturePacketRunbookPath,
  summaryPath,
].forEach((filePath) => assertNoPrivatePaths(fs.readFileSync(filePath, "utf8"), filePath));

console.log("confection wrapper ingredient priority tests passed");
