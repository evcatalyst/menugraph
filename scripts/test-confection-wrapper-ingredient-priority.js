const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const priorityJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_priority.json");
const priorityCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertNoPrivatePaths(value, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(value), `${label} leaks an actual private path`);
}

const manifest = JSON.parse(fs.readFileSync(priorityJsonPath, "utf8"));
const csvRows = parseCsv(fs.readFileSync(priorityCsvPath, "utf8"));
const runbook = fs.readFileSync(runbookPath, "utf8");
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
assert.strictEqual(csvRows.length, 245, "CSV should contain every priority row");

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
  assert.strictEqual(row.claim_gate, "blocked_until_private_readable_crop_ocr_correction_and_manual_verification", `${row.product_name} row should keep claim gate`);
});

assert.strictEqual(summary.confection_wrapper_ingredient_priority_summary.totals.priority_rows, manifest.totals.priority_rows, "site summary should expose priority totals");
assert(summary.confection_wrapper_ingredient_priority_summary.artifacts.ingredient_priority_csv, "site summary should link ingredient priority CSV");
assert(summary.confection_wrapper_ingredient_priority_summary.artifacts.ingredient_priority_runbook_md, "site summary should link ingredient priority runbook");
assert(runbook.includes("Candy Wrapper Archive Ingredient-First Priority"), "runbook should identify ingredient priority");
assert(runbook.includes("Capture ingredient panels first"), "runbook should state ingredient-first rule");
assert(runbook.includes("wrapper-front product photos as secondary context"), "runbook should keep product photos secondary");

[
  priorityJsonPath,
  priorityCsvPath,
  runbookPath,
  summaryPath,
].forEach((filePath) => assertNoPrivatePaths(fs.readFileSync(filePath, "utf8"), filePath));

console.log("confection wrapper ingredient priority tests passed");
