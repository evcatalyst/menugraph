const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const storyJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_story_seeds.json");
const storyCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_story_seeds.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_story_seed_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertNoPrivatePaths(value, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(value), `${label} leaks an actual private path`);
}

const manifest = JSON.parse(fs.readFileSync(storyJsonPath, "utf8"));
const csvRows = parseCsv(fs.readFileSync(storyCsvPath, "utf8"));
const runbook = fs.readFileSync(runbookPath, "utf8");
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(manifest.schema_version, "confection_wrapper_story_seeds.v1", "story seeds should use the expected schema");
assert.strictEqual(manifest.totals.story_seed_products, 9, "story seeds should cover every CWA lineage product");
assert.strictEqual(manifest.totals.source_eras, 49, "story seeds should cover every CWA source era");
assert.strictEqual(manifest.totals.capture_rows, 49, "story seeds should align to the capture worksheet");
assert.strictEqual(manifest.totals.surface_template_rows, 294, "story seeds should align to the surface template");
assert.strictEqual(manifest.totals.ocr_surface_rows, 245, "story seeds should align to OCR-eligible surfaces");
assert.strictEqual(manifest.totals.ingredient_panel_targets, 49, "every source era should have an ingredient-panel target");
assert.strictEqual(manifest.totals.nutrition_panel_targets, 49, "every source era should have a nutrition-panel target");
assert.strictEqual(manifest.totals.support_text_targets, 147, "story seeds should track support text targets");
assert.strictEqual(manifest.totals.secondary_context_targets, 49, "story seeds should keep wrapper fronts secondary");
assert.strictEqual(manifest.totals.verified_ingredient_labels, 0, "story seeds must not create verified ingredient labels");
assert.strictEqual(manifest.totals.blocked_ingredient_claim_products, 9, "every story seed should block ingredient claims");
assert.strictEqual(csvRows.length, 9, "story seed CSV should contain one row per product");

const productNames = new Set(csvRows.map((row) => row.product_name));
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
].forEach((productName) => assert(productNames.has(productName), `story seeds should include ${productName}`));

manifest.story_seeds.forEach((seed) => {
  assert.strictEqual(seed.story_seed_status, "package_lineage_story_seed_ready", `${seed.product_name} should be story-seed ready`);
  assert.strictEqual(seed.ingredient_claim_status, "blocked_pending_readable_panel_crop_ocr_and_manual_verification", `${seed.product_name} should block ingredient claims`);
  assert.strictEqual(seed.verified_ingredient_labels, 0, `${seed.product_name} must not claim verified labels`);
  assert.strictEqual(seed.candidate_only, 1, `${seed.product_name} should stay candidate-only`);
  assert.strictEqual(seed.manual_verified, 0, `${seed.product_name} should not be manually verified`);
  assert(seed.timeline_points.length > 0, `${seed.product_name} should expose timeline points`);
  assert(seed.timeline_points.every((point) => point.source_url.startsWith("https://www.candywrapperarchive.com/candy-collector/")), `${seed.product_name} should use CWA item pages`);
  assert(seed.unresolved_gaps.includes("manual verification and reviewer attribution missing"), `${seed.product_name} should expose manual verification gap`);
});

assert.deepStrictEqual(summary.confection_wrapper_story_seed_summary.totals, manifest.totals, "site summary should expose story seed totals");
assert(summary.confection_wrapper_story_seed_summary.artifacts.story_seed_csv, "site summary should link story seed CSV");
assert(summary.confection_wrapper_story_seed_summary.artifacts.story_seed_runbook_md, "site summary should link story seed runbook");
assert(runbook.includes("Candy Wrapper Archive Story Seeds"), "runbook should identify story seeds");
assert(runbook.includes("ingredient claims remain blocked"), "runbook should state the claim gate");

[
  storyJsonPath,
  storyCsvPath,
  runbookPath,
  summaryPath,
].forEach((filePath) => assertNoPrivatePaths(fs.readFileSync(filePath, "utf8"), filePath));

console.log("confection wrapper story seed tests passed");
