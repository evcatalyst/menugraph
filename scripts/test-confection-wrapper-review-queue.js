const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const reviewJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_review_queue.json");
const reviewCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_review_queue.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_review_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

const manifest = JSON.parse(fs.readFileSync(reviewJsonPath, "utf8"));
const rows = parseCsv(fs.readFileSync(reviewCsvPath, "utf8"));
const runbook = fs.readFileSync(runbookPath, "utf8");
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(manifest.schema_version, "confection_wrapper_review_queue.v1", "manifest schema should be versioned");
assert.strictEqual(manifest.source_domain, "www.candywrapperarchive.com", "unexpected source domain");
assert.strictEqual(rows.length, manifest.totals.review_tasks, "CSV row count should match review task total");
assert.strictEqual(manifest.totals.review_tasks, 13, "expected focused review queue for existing candy wrapper leads");
assert.strictEqual(manifest.totals.products, 12, "expected twelve candy products in wrapper review queue");
assert.strictEqual(manifest.totals.existing_source_tasks, 6, "expected existing source tasks to be grouped");
assert.strictEqual(manifest.totals.existing_source_rows_grouped, 16, "expected duplicate source rows to be grouped");
assert.strictEqual(manifest.totals.item_page_tasks, 2, "expected item-page Tootsie Roll review tasks");
assert.strictEqual(manifest.totals.collection_page_tasks, 8, "expected existing and likely collection page tasks");
assert.strictEqual(manifest.totals.likely_collection_tasks, 4, "expected likely collection leads");
assert.strictEqual(manifest.totals.search_tasks, 3, "expected targeted archive search tasks");
assert.deepStrictEqual(
  summary.confection_wrapper_review_queue_summary.totals,
  manifest.totals,
  "site summary totals should match review queue manifest",
);

const byId = new Map(rows.map((row) => [row.task_id, row]));
const snickers = [...byId.values()].find((row) => row.product_id === "snickers_bar");
assert(snickers, "Snickers should have a wrapper review task");
assert.strictEqual(snickers.task_type, "collection_page_existing_lead", "Snickers should start from its collection page");
assert.strictEqual(Number(snickers.observed_source_rows), 4, "Snickers should group repeated source rows");
assert(/\/snickers\//.test(snickers.source_url), "Snickers source should use Candy Wrapper Archive");

const tootsie1960s = [...byId.values()].find((row) => /1960s-tootsie-roll-2/.test(row.source_url));
assert(tootsie1960s, "1960s Tootsie Roll item page should be an actionable review task");
assert.strictEqual(tootsie1960s.task_type, "item_page_review", "Tootsie item page should route to page review");
assert(/ingredient claims require readable panel OCR/i.test(tootsie1960s.ingredient_claim_rule), "Tootsie should keep ingredient claims gated");

const butterfinger = [...byId.values()].find((row) => row.product_id === "butterfinger_bar");
assert(butterfinger, "Butterfinger should have a likely collection lead");
assert.strictEqual(butterfinger.task_type, "collection_page_likely_lead", "Butterfinger should prefer likely archive page before broad search");

const skittles = [...byId.values()].find((row) => row.product_id === "skittles_original");
assert(skittles, "Skittles should have a targeted archive search task");
assert.strictEqual(skittles.task_type, "targeted_archive_search", "Skittles should route to targeted archive search");
assert.strictEqual(skittles.source_url, "", "Search tasks should not invent source URLs");
assert(/site:candywrapperarchive\.com/.test(skittles.search_queries), "Search tasks should carry constrained archive queries");

rows.forEach((row) => {
  assert.strictEqual(row.source_domain, "www.candywrapperarchive.com", `${row.task_id} should remain archive-specific`);
  assert(row.extraction_checklist.includes("promote to panel OCR only if ingredient or nutrition text is visibly readable"), `${row.task_id} should preserve panel gate`);
  assert(row.publication_rule.includes("Link out first"), `${row.task_id} should preserve link-first publication policy`);
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(JSON.stringify(row)), `${row.task_id} leaks an actual private path`);
  assert(!/manual_verified[^\\n]*(true|1)/i.test(JSON.stringify(row)), `${row.task_id} should not claim manual verification`);
});

assert(/Do not treat wrapper-front photos as ingredient evidence/.test(runbook), "runbook should block wrapper-front ingredient claims");
assert(/readable ingredient\/nutrition panel/.test(runbook), "runbook should require readable panels before ingredient claims");
assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(runbook), "runbook should not leak actual private paths");

console.log("confection wrapper review queue tests passed");
