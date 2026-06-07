const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const priorityJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_source_priority.json");
const priorityCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_priority.csv");
const reportPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_priority.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

const manifest = JSON.parse(fs.readFileSync(priorityJsonPath, "utf8"));
const rows = parseCsv(fs.readFileSync(priorityCsvPath, "utf8"));
const report = fs.readFileSync(reportPath, "utf8");
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(manifest.schema_version, "confection_wrapper_source_priority.v1", "manifest schema should be versioned");
assert.strictEqual(manifest.source_domain, "www.candywrapperarchive.com", "unexpected source domain");
assert.strictEqual(rows.length, manifest.totals.confection_products, "CSV row count should match confection product total");
assert(manifest.totals.confection_products >= 12, "expected focused candy/confection product set");
assert(manifest.totals.products_with_existing_candy_wrapper_archive_leads >= 5, "expected existing Candy Wrapper Archive leads");
assert(manifest.totals.existing_candy_wrapper_archive_rows >= 16, "expected existing Candy Wrapper Archive source rows");
assert.strictEqual(manifest.public_policy.ingredient_gate.includes("readable label panel"), true, "ingredient gate should be explicit");

const byId = new Map(rows.map((row) => [row.product_id, row]));
const tootsie = byId.get("tootsie_roll");
assert(tootsie, "Tootsie Roll should be prioritized from Candy Wrapper Archive");
assert(/candywrapperarchive\.com/.test(tootsie.known_candy_wrapper_archive_urls), "Tootsie should carry Candy Wrapper Archive URLs");
assert.strictEqual(tootsie.source_role, "wrapper_lineage_secondary_context", "wrapper lineage should stay secondary context");
assert(/Do not treat wrapper-front/.test(tootsie.ingredient_claim_rule), "Tootsie should preserve ingredient claim guardrail");

const snickers = byId.get("snickers_bar");
assert(snickers, "Snickers should be prioritized from Candy Wrapper Archive");
assert.strictEqual(snickers.priority_tier, "existing_lineage_source", "Snickers should be an existing lineage source");

assert(!byId.has("oreo_original_chocolate_sandwich_cookies"), "Oreo should not be pulled into confection wrapper priority by generic chocolate text");
assert(summary.confection_wrapper_source_priority_summary, "site summary should expose confection wrapper priority");
assert.deepStrictEqual(
  summary.confection_wrapper_source_priority_summary.totals,
  manifest.totals,
  "site summary totals should match manifest totals",
);

[
  priorityJsonPath,
  priorityCsvPath,
  reportPath,
].forEach((filePath) => {
  const text = fs.readFileSync(filePath, "utf8");
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(text), `${filePath} leaks an actual private path`);
  assert(!/manual_verified[^\\n]*(true|1)/i.test(text), `${filePath} should not claim manual verification`);
});

assert(/Wrapper images are secondary product-lineage proof/.test(report), "report should state wrapper-image guardrail");

console.log("confection wrapper source priority tests passed");
