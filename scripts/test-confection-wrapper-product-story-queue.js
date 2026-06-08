const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const queueJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_product_story_queue.json");
const queueCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_product_story_queue.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_product_story_queue_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertNoPrivatePaths(value, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(value), `${label} leaks a private path`);
}

const manifest = JSON.parse(fs.readFileSync(queueJsonPath, "utf8"));
const rows = parseCsv(fs.readFileSync(queueCsvPath, "utf8"));
const runbook = fs.readFileSync(runbookPath, "utf8");
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(manifest.schema_version, "confection_wrapper_product_story_queue.v1", "product story queue should use expected schema");
assert.strictEqual(manifest.totals.product_queue_rows, 12, "queue should include nine CWA products plus three source-hunt gaps");
assert.strictEqual(manifest.totals.package_story_candidate_products, 9, "queue should expose nine package-story candidates");
assert.strictEqual(manifest.totals.source_hunt_gap_products, 3, "queue should preserve three CWA source-hunt gaps");
assert.strictEqual(manifest.totals.source_eras, 49, "queue should cover every CWA source era");
assert.strictEqual(manifest.totals.item_pages, 49, "queue should cover every CWA item page");
assert.strictEqual(manifest.totals.ingredient_panel_targets, 49, "each source era should have an ingredient-panel target");
assert.strictEqual(manifest.totals.nutrition_panel_targets, 49, "each source era should have a nutrition-panel target");
assert.strictEqual(manifest.totals.primary_panel_targets, 98, "primary panel targets should combine ingredients and nutrition");
assert.strictEqual(manifest.totals.support_text_targets, 147, "support text targets should remain secondary");
assert.strictEqual(manifest.totals.secondary_context_targets, 49, "wrapper fronts should remain secondary context");
assert.strictEqual(manifest.totals.explicit_panel_signal_source_eras, 0, "no CWA source era should claim a readable panel signal yet");
assert.strictEqual(manifest.totals.wrapper_context_only_source_eras, 49, "all CWA source eras should remain wrapper-context-only until visual review");
assert.strictEqual(manifest.totals.back_panel_hunt_needed_rows, 49, "all source eras should still need back-panel hunts");
assert.strictEqual(manifest.totals.readable_for_ocr, 0, "queue must not mark OCR readiness without private crops");
assert.strictEqual(manifest.totals.verified_ingredient_labels, 0, "queue must not create verified labels");
assert.strictEqual(rows.length, 12, "CSV should contain every queue row");

const first = manifest.rows[0];
assert.strictEqual(first.product_name, "Butterfinger Bar", "highest-density CWA product should lead the queue");
assert.strictEqual(first.primary_photo_rule, "ingredient_and_nutrition_panels_first", "primary photo rule should be ingredient-first");
assert.strictEqual(first.secondary_photo_rule, "wrapper_front_or_product_photo_is_package_context_only", "secondary photo rule should demote wrapper fronts");
assert.strictEqual(first.ingredient_evidence_state, "lineage_photo_only_back_panel_hunt_needed", "top product should still need panel hunts");
assert.strictEqual(first.verified_ingredient_labels, 0, "top product should not claim verified labels");
assert(first.first_source_url.startsWith("https://www.candywrapperarchive.com/candy-collector/"), "top product should link to a CWA item page");

const names = new Set(rows.map((row) => row.product_name));
[
  "Butterfinger Bar",
  "Hershey's Milk Chocolate Bar",
  "Snickers Bar",
  "Reese's Peanut Butter Cups",
  "Kit Kat Bar",
  "Milky Way Bar",
  "M&M's Milk Chocolate Candies",
  "Twix Bar",
  "Tootsie Roll",
  "Skittles Original",
  "Starburst Original",
  "Twizzlers Strawberry Twists",
].forEach((name) => assert(names.has(name), `queue should include ${name}`));

const gapRows = manifest.source_hunt_targets;
assert.strictEqual(gapRows.length, 3, "manifest should expose source-hunt targets");
gapRows.forEach((row) => {
  assert.strictEqual(row.product_queue_state, "cwa_source_hunt_gap", `${row.product_name} should be a source-hunt gap`);
  assert(row.source_hunt_queries.includes("site:candywrapperarchive.com"), `${row.product_name} should retain constrained CWA queries`);
  assert.strictEqual(row.verified_ingredient_labels, 0, `${row.product_name} should not claim verified labels`);
});

manifest.top_story_targets.forEach((row) => {
  assert.strictEqual(row.product_queue_state, "cwa_package_story_candidate", `${row.product_name} should be a package story candidate`);
  assert.strictEqual(row.primary_photo_rule, "ingredient_and_nutrition_panels_first", `${row.product_name} should keep panel-first rule`);
  assert.strictEqual(row.claim_gate, "blocked_until_readable_panel_crop_ocr_correction_and_manual_verification", `${row.product_name} should keep claim gate`);
  assert(row.next_action.includes("back-panel"), `${row.product_name} should route wrapper-only eras to back-panel hunts`);
});

assert.deepStrictEqual(summary.confection_wrapper_product_story_queue_summary.totals, manifest.totals, "site summary should expose queue totals");
assert(summary.confection_wrapper_product_story_queue_summary.artifacts.product_story_queue_csv, "site summary should link queue CSV");
assert(summary.confection_wrapper_product_story_queue_summary.artifacts.product_story_queue_runbook_md, "site summary should link queue runbook");
assert(summary.confection_wrapper_ingredient_priority_summary.product_story_queue_summary, "ingredient priority summary should nest product story queue summary");
assert(runbook.includes("Candy Wrapper Archive Product Story Queue"), "runbook should identify product queue");
assert(runbook.includes("Ingredient panels are primary"), "runbook should state ingredient panels are primary");
assert(runbook.includes("Wrapper-front/product photos are secondary context"), "runbook should state product photos are secondary");

[
  queueJsonPath,
  queueCsvPath,
  runbookPath,
  summaryPath,
].forEach((filePath) => assertNoPrivatePaths(fs.readFileSync(filePath, "utf8"), filePath));

console.log("confection wrapper product story queue tests passed");
