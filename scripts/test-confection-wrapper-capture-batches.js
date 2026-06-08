const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const captureBatchJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_capture_batches.json");
const captureBatchCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_capture_batches.csv");
const captureWorksheetCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_capture_worksheet.csv");
const captureRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_capture_batch_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertNoPrivatePaths(filePath) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(fs.readFileSync(filePath, "utf8")), `${filePath} leaks an actual private path`);
}

const manifest = JSON.parse(fs.readFileSync(captureBatchJsonPath, "utf8"));
const batchRows = parseCsv(fs.readFileSync(captureBatchCsvPath, "utf8"));
const worksheetRows = parseCsv(fs.readFileSync(captureWorksheetCsvPath, "utf8"));
const runbook = fs.readFileSync(captureRunbookPath, "utf8");
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(manifest.schema_version, "confection_wrapper_capture_batches.v1", "capture batches should use the CWA capture schema");
assert.strictEqual(manifest.run_id, "cwa-private-capture-all-lineage-v1", "capture batches should use the all-lineage run id");
assert.strictEqual(manifest.selection_policy.selection_mode, "all_available_lineage_products", "capture batches should include every available CWA lineage product by default");
assert.strictEqual(manifest.totals.product_batches, manifest.totals.lineage_products_available, "capture batches should cover all available lineage products");
assert.strictEqual(manifest.totals.capture_rows, manifest.totals.lineage_item_pages_available, "capture batches should cover all available lineage item pages");
assert.strictEqual(manifest.totals.product_batches, 9, "current CWA capture queue should include nine item-lineage products");
assert.strictEqual(manifest.totals.capture_rows, 49, "current CWA capture queue should include 49 capture rows");
assert.strictEqual(manifest.totals.source_urls, 49, "capture queue should expose one source URL per capture row");
assert.strictEqual(manifest.totals.readable_for_ocr, 0, "capture worksheet must not mark rows readable before review");
assert.strictEqual(manifest.totals.private_paths_supplied, 0, "public capture worksheet must not include private paths");
assert.strictEqual(manifest.totals.candidate_only_rows, 49, "all capture rows should remain candidate-only");
assert.strictEqual(batchRows.length, 9, "batch CSV should include every product batch");
assert.strictEqual(worksheetRows.length, 49, "capture worksheet should include every CWA item-page row");
assert.strictEqual(manifest.public_safety.external_images_committed, false, "capture batches must not publish external images");
assert.strictEqual(manifest.public_safety.private_paths_committed, false, "capture batches must not publish private paths");
assert.strictEqual(manifest.public_safety.ocr_text_committed, false, "capture batches must not publish OCR text");
assert.strictEqual(manifest.public_safety.ingredient_claims_promoted, false, "capture batches must not promote ingredient claims");
assert.strictEqual(manifest.public_safety.manual_verified_created, false, "capture batches must not create manual verification");

const products = new Set(batchRows.map((row) => row.product_name));
[
  "Butterfinger Bar",
  "Reese's Peanut Butter Cups",
  "Hershey's Milk Chocolate Bar",
  "Snickers Bar",
  "Kit Kat Bar",
  "Milky Way Bar",
  "M&M's Milk Chocolate Candies",
  "Twix Bar",
  "Tootsie Roll",
].forEach((productName) => assert(products.has(productName), `capture queue should include ${productName}`));

const tootsieRows = worksheetRows.filter((row) => row.product_name === "Tootsie Roll");
assert.strictEqual(tootsieRows.length, 2, "Tootsie should contribute two capture rows");
assert(tootsieRows.some((row) => row.vintage_label === "1940s"), "Tootsie worksheet should include the 1940s source");
assert(tootsieRows.some((row) => row.vintage_label === "1960s"), "Tootsie worksheet should include the 1960s source");
assert(tootsieRows.every((row) => row.capture_surface_order.startsWith("ingredient_panel; nutrition_panel")), "Tootsie capture should prioritize panels first");

worksheetRows.forEach((row) => {
  assert(row.source_url.startsWith("https://www.candywrapperarchive.com/candy-collector/"), `${row.capture_id} should link to a CWA item page`);
  assert.strictEqual(row.candidate_only, "1", `${row.capture_id} should stay candidate-only`);
  assert.strictEqual(row.manual_verified, "0", `${row.capture_id} must not be verified`);
  assert.strictEqual(row.ocr_route, "blocked_until_private_readable_panel_crop", `${row.capture_id} should be blocked until private panel crop`);
  [
    "private_page_screenshot_path",
    "private_wrapper_front_crop_path",
    "private_wrapper_back_or_side_crop_path",
    "private_ingredient_panel_crop_path",
    "private_nutrition_panel_crop_path",
    "private_net_weight_crop_path",
    "private_maker_or_date_crop_path",
    "screenshot_hash",
    "crop_hashes",
    "package_surface_visible",
    "ingredient_panel_visible",
    "nutrition_panel_visible",
    "net_weight_visible",
    "manufacturer_or_distributor_visible",
    "date_or_lot_cue_visible",
    "text_readable_for_ocr",
  ].forEach((field) => {
    assert.strictEqual(row[field], "", `${row.capture_id} should leave ${field} blank for private capture/review`);
  });
});

assert.deepStrictEqual(summary.confection_wrapper_capture_batch_summary.totals, manifest.totals, "site summary should expose capture batch totals");
assert(summary.confection_wrapper_capture_batch_summary.artifacts.capture_worksheet_csv, "site summary should link capture worksheet");
assert(summary.confection_wrapper_capture_batch_summary.artifacts.capture_runbook_md, "site summary should link capture runbook");
assert(runbook.includes("Candy Wrapper Archive Private Capture Batches"), "runbook should identify the capture batches");
assert(runbook.includes("Capture ingredient or nutrition panels first"), "runbook should preserve the panel-first rule");
assert(runbook.includes("private_ingredient_panel_crop_path"), "runbook should list private fields to fill");

[
  captureBatchJsonPath,
  captureBatchCsvPath,
  captureWorksheetCsvPath,
  captureRunbookPath,
  summaryPath,
].forEach(assertNoPrivatePaths);

console.log("confection wrapper capture batch tests passed");
