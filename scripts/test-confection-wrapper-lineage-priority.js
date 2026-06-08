const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const lineageJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_lineage_priority.json");
const lineageCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_lineage_priority.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_lineage_priority_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertNoPrivatePaths(filePath) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(fs.readFileSync(filePath, "utf8")), `${filePath} leaks an actual private path`);
}

const manifest = JSON.parse(fs.readFileSync(lineageJsonPath, "utf8"));
const rows = parseCsv(fs.readFileSync(lineageCsvPath, "utf8"));
const runbook = fs.readFileSync(runbookPath, "utf8");
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(manifest.schema_version, "confection_wrapper_lineage_priority.v1", "lineage priority should use the item-lineage schema");
assert.strictEqual(manifest.totals.lineage_products, 9, "lineage priority should cover the nine CWA item-page products");
assert.strictEqual(manifest.totals.item_pages, 49, "lineage priority should cover all CWA item pages");
assert.strictEqual(manifest.totals.panel_review_rows, 49, "lineage priority should align with panel review rows");
assert.strictEqual(manifest.totals.readable_for_ocr, 0, "lineage priority must not mark panels readable before review");
assert.strictEqual(manifest.totals.source_hunt_gaps, 3, "lineage priority should preserve source-hunt gaps");
assert.strictEqual(manifest.public_safety.external_images_committed, false, "lineage priority must not commit external images");
assert.strictEqual(manifest.public_safety.ingredient_claims_promoted, false, "lineage priority must not promote ingredient claims");
assert.strictEqual(manifest.public_safety.manual_verified_created, false, "lineage priority must not create manual verification");
assert.strictEqual(rows.length, 12, "CSV should include nine lineage products plus three source-hunt gap products");

const tootsie = manifest.tootsie_roll_reference;
assert(tootsie, "lineage priority should explicitly expose Tootsie Roll");
assert.strictEqual(tootsie.product_name, "Tootsie Roll", "Tootsie reference should identify the product");
assert.strictEqual(tootsie.item_page_count, 2, "Tootsie should have two CWA item pages");
assert.strictEqual(tootsie.lineage_span_label, "1940s-1960s", "Tootsie should expose the 1940s-1960s wrapper span");
assert.strictEqual(tootsie.panel_review_rows, 2, "Tootsie should have panel review rows");
assert.strictEqual(tootsie.readable_for_ocr, 0, "Tootsie should remain blocked until readable panel review");
assert(tootsie.source_urls.includes("https://www.candywrapperarchive.com/candy-collector/1940s-tootsie-roll/"), "Tootsie should include the 1940s source URL");
assert(tootsie.source_urls.includes("https://www.candywrapperarchive.com/candy-collector/1960s-tootsie-roll-2/"), "Tootsie should include the curated 1960s source URL");

const topNames = manifest.top_targets.map((row) => row.product_name);
assert(topNames.includes("Butterfinger Bar"), "dense CWA lineage products should appear in top targets");
assert(manifest.focus_targets.some((row) => row.product_name === "Tootsie Roll"), "focus targets should keep Tootsie visible even if it is not highest-density");
assert(rows.every((row) => row.ingredient_claim_status === "blocked_pending_readable_panel_review"), "all lineage rows should keep ingredient claims blocked");
assert(rows.every((row) => row.image_publication_policy === "source_link_only_no_public_image"), "all lineage rows should be source-link-only for images");
assert.deepStrictEqual(summary.confection_wrapper_lineage_priority_summary.totals, manifest.totals, "site summary should expose lineage totals");
assert(summary.confection_wrapper_lineage_priority_summary.artifacts.lineage_priority_csv, "site summary should link lineage CSV");
assert(summary.confection_wrapper_lineage_priority_summary.tootsie_roll_reference, "site summary should expose Tootsie reference");

assert(runbook.includes("Candy Wrapper Archive Lineage Priority"), "runbook should identify the lineage priority artifact");
assert(runbook.includes("Tootsie Roll Reference"), "runbook should include the Tootsie reference");
assert(runbook.includes("not a recipe-claim layer"), "runbook should preserve the claim boundary");

[
  lineageJsonPath,
  lineageCsvPath,
  runbookPath,
  summaryPath,
].forEach(assertNoPrivatePaths);

console.log("confection wrapper lineage priority tests passed");
