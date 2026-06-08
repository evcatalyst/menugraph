const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const manifestPath = path.join(root, "docs/data/product-evidence/confection_wrapper_surface_ocr_map.json");
const queueCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_surface_ocr_queue.csv");
const templateCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_surface_image_map_template.csv");
const auditCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_surface_image_map_audit.csv");
const auditJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_surface_image_map_audit.json");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_surface_ocr_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertNoPrivatePaths(filePath) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(fs.readFileSync(filePath, "utf8")), `${filePath} leaks an actual private path`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const queueRows = parseCsv(fs.readFileSync(queueCsvPath, "utf8"));
const templateRows = parseCsv(fs.readFileSync(templateCsvPath, "utf8"));
const auditRows = parseCsv(fs.readFileSync(auditCsvPath, "utf8"));
const audit = JSON.parse(fs.readFileSync(auditJsonPath, "utf8"));
const runbook = fs.readFileSync(runbookPath, "utf8");
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(manifest.schema_version, "confection_wrapper_surface_ocr_map.v1", "surface OCR map should use the expected schema");
assert.strictEqual(manifest.run_id, "cwa-surface-ocr-v1", "surface OCR map should use the CWA surface OCR run id");
assert.strictEqual(manifest.totals.capture_rows, 49, "surface map should cover every available CWA capture row");
assert.strictEqual(manifest.totals.surface_template_rows, 294, "surface map should include six surface slots per capture row");
assert.strictEqual(manifest.totals.ocr_queue_rows, 245, "surface OCR queue should include five OCR surfaces per capture row");
assert.strictEqual(manifest.totals.primary_ingredient_panel_rows, 49, "surface OCR queue should include ingredient panel rows");
assert.strictEqual(manifest.totals.primary_nutrition_panel_rows, 49, "surface OCR queue should include nutrition panel rows");
assert.strictEqual(manifest.totals.support_text_rows, 147, "surface OCR queue should include support text rows");
assert.strictEqual(manifest.totals.secondary_context_rows, 49, "surface template should keep wrapper fronts as secondary context");
assert.strictEqual(manifest.totals.ready_for_capture, 0, "surface map should not be ready without private paths");
assert.strictEqual(manifest.totals.no_private_path_supplied, 294, "every public template row should need private paths");
assert.strictEqual(manifest.totals.private_paths_supplied, 0, "public surface map should not publish private paths");
assert.strictEqual(queueRows.length, 245, "queue CSV should match OCR queue total");
assert.strictEqual(templateRows.length, 294, "template CSV should match surface total");
assert.strictEqual(auditRows.length, 294, "audit CSV should cover every surface template row");
assert.strictEqual(audit.template_rows, 294, "audit JSON should cover every surface template row");
assert.strictEqual(audit.ready_for_capture, 0, "audit should not mark public rows ready");
assert.strictEqual(audit.no_private_path_supplied, 294, "audit should require private paths");
assert.strictEqual(audit.private_paths_supplied, 0, "audit should not publish private paths");

assert(templateRows.some((row) => row.surface_id === "wrapper_front_context" && row.ocr_eligible === "0"), "wrapper fronts should stay in the template as secondary context");
assert(!queueRows.some((row) => row.surface_id === "wrapper_front_context"), "wrapper front context should be excluded from OCR queue");
assert(queueRows.some((row) => row.surface_id === "ingredient_panel" && row.proof_lane === "primary_ingredient_panel"), "queue should include primary ingredient panels");
assert(queueRows.some((row) => row.surface_id === "nutrition_panel" && row.proof_lane === "primary_nutrition_panel"), "queue should include primary nutrition panels");
assert(queueRows.some((row) => row.proof_lane === "support_package_text"), "queue should include support package text");

templateRows.forEach((row) => {
  assert.strictEqual(row.local_private_image_path, "", `${row.evidence_id} should leave local private path blank`);
  assert.strictEqual(row.processed_private_image_path, "", `${row.evidence_id} should leave processed private path blank`);
  assert.strictEqual(row.candidate_only, "1", `${row.evidence_id} should stay candidate-only`);
  assert.strictEqual(row.manual_verified, "0", `${row.evidence_id} must not be verified`);
  assert(row.image_map_keys.includes(row.evidence_id), `${row.evidence_id} should include its image-map key`);
});

queueRows.forEach((row) => {
  assert.strictEqual(row.candidate_only, "1", `${row.evidence_id} should stay candidate-only`);
  assert.strictEqual(row.manual_verified, "0", `${row.evidence_id} must not be verified`);
  assert(
    ["primary_ingredient_panel", "primary_nutrition_panel", "support_package_text"].includes(row.proof_lane),
    `${row.evidence_id} should be a text-relevant OCR lane`,
  );
});

assert.deepStrictEqual(summary.confection_wrapper_surface_ocr_summary.totals, manifest.totals, "site summary should expose surface OCR totals");
assert(summary.confection_wrapper_surface_ocr_summary.artifacts.surface_ocr_queue_csv, "site summary should link surface OCR queue");
assert(summary.confection_wrapper_surface_ocr_summary.artifacts.surface_image_map_template_csv, "site summary should link surface image-map template");
assert(summary.confection_wrapper_surface_ocr_summary.artifacts.surface_ocr_runbook_md, "site summary should link surface OCR runbook");
assert(runbook.includes("Candy Wrapper Archive Surface OCR Map"), "runbook should identify the surface OCR map");
assert(runbook.includes("Wrapper front context, excluded from OCR by default"), "runbook should preserve the context-only rule");
assert(runbook.includes("Run native OCR"), "runbook should include the OCR handoff");

[
  manifestPath,
  queueCsvPath,
  templateCsvPath,
  auditCsvPath,
  auditJsonPath,
  runbookPath,
  summaryPath,
].forEach(assertNoPrivatePaths);

console.log("confection wrapper surface OCR map tests passed");
