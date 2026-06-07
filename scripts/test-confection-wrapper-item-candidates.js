const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const itemCandidateJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_item_candidates.json");
const itemCandidateCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_candidates.csv");
const itemGapCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_candidate_gaps.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_candidate_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");
const sourcePriorityPath = path.join(root, "docs/data/product-evidence/confection_wrapper_source_priority.json");
const captureHandoffPath = path.join(root, "docs/data/product-evidence/confection_wrapper_capture_handoff.json");

const manifest = JSON.parse(fs.readFileSync(itemCandidateJsonPath, "utf8"));
const itemRows = parseCsv(fs.readFileSync(itemCandidateCsvPath, "utf8"));
const gapRows = parseCsv(fs.readFileSync(itemGapCsvPath, "utf8"));
const runbook = fs.readFileSync(runbookPath, "utf8");
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const sourcePriority = JSON.parse(fs.readFileSync(sourcePriorityPath, "utf8"));
const captureHandoff = JSON.parse(fs.readFileSync(captureHandoffPath, "utf8"));

assert.strictEqual(manifest.schema_version, "confection_wrapper_item_candidates.v1", "manifest schema should be versioned");
assert.strictEqual(manifest.source_domain, "www.candywrapperarchive.com", "unexpected source domain");
assert.strictEqual(itemRows.length, manifest.totals.item_candidates, "item CSV row count should match manifest");
assert.strictEqual(gapRows.length, manifest.totals.source_hunt_gaps, "gap CSV row count should match manifest");
assert.strictEqual(manifest.totals.item_candidates, 49, "expected first-pass item candidate slice");
assert.strictEqual(manifest.totals.products_with_item_candidates, 9, "expected nine products with item candidates");
assert.strictEqual(manifest.totals.collection_item_candidates, 47, "expected collection-derived item candidates");
assert.strictEqual(manifest.totals.existing_item_page_candidates, 2, "expected two existing Tootsie item pages");
assert.strictEqual(manifest.totals.source_hunt_gaps, 3, "expected three source-hunt gaps");
assert.deepStrictEqual(
  summary.confection_wrapper_item_candidate_summary.totals,
  manifest.totals,
  "site summary totals should match item candidate manifest",
);

const reesesPriority = sourcePriority.top_targets.find((row) => row.product_id === "reeses_peanut_butter_cups");
assert(reesesPriority, "Reese's should remain in source priority");
assert(/\/candy-collection\/resses\//.test(reesesPriority.known_candy_wrapper_archive_urls), "Reese's archive path should use observed /resses/ route");
assert(!/\/candy-collection\/reeses\//.test(JSON.stringify(sourcePriority)), "source priority should not contain guessed /reeses/ route");
assert(!/\/candy-collection\/reeses\//.test(JSON.stringify(captureHandoff)), "capture handoff should not contain guessed /reeses/ route");

const byProduct = new Map();
for (const row of itemRows) {
  if (!byProduct.has(row.product_id)) byProduct.set(row.product_id, []);
  byProduct.get(row.product_id).push(row);
}

const snickers1939 = byProduct.get("snickers_bar").find((row) => row.item_title === "1939 Snickers");
assert(snickers1939, "Snickers should include 1939 item candidate");
assert.strictEqual(snickers1939.candidate_type, "collection_item_candidate", "Snickers 1939 should be collection-derived");
assert(/1940s-snickers/.test(snickers1939.item_url), "Snickers 1939 should link to source item page");

const tootsie1940s = byProduct.get("tootsie_roll").find((row) => row.item_title === "1940s Tootsie Roll");
assert(tootsie1940s, "Tootsie should include 1940s item candidate");
assert.strictEqual(tootsie1940s.candidate_type, "existing_item_page_candidate", "Tootsie 1940s should preserve item-page source type");
assert(/1 1\/2oz/.test(tootsie1940s.source_note), "Tootsie source note should preserve item-page package cue");

const reeses = byProduct.get("reeses_peanut_butter_cups");
assert(reeses && reeses.length === 7, "Reese's should expose seven first-pass item candidates");
assert(reeses.every((row) => /\/candy-collection\/resses\//.test(row.source_collection_url)), "Reese's candidates should use observed /resses/ collection URL");

const gapProducts = gapRows.map((row) => row.product_id).sort();
assert.deepStrictEqual(gapProducts, ["skittles_original", "starburst_original", "twizzlers_strawberry"], "unexpected source-hunt gaps");

itemRows.forEach((row) => {
  assert.strictEqual(row.candidate_only, "1", `${row.candidate_id} should be candidate-only`);
  assert.strictEqual(row.manual_verified, "0", `${row.candidate_id} should not be manually verified`);
  assert.strictEqual(row.ingredient_claim_status, "blocked_pending_readable_panel", `${row.candidate_id} should block ingredient claims`);
  assert.strictEqual(row.publication_image_policy, "source_link_only_no_public_image", `${row.candidate_id} should remain link-only`);
  assert(row.item_url.startsWith("https://www.candywrapperarchive.com/candy-collector/"), `${row.candidate_id} should link to item page`);
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(JSON.stringify(row)), `${row.candidate_id} leaks an actual private path`);
});

gapRows.forEach((row) => {
  assert.strictEqual(row.candidate_only, "1", `${row.gap_id} should be candidate-only`);
  assert.strictEqual(row.manual_verified, "0", `${row.gap_id} should not be manually verified`);
  assert(/site:candywrapperarchive\.com/.test(row.search_queries), `${row.gap_id} should keep constrained archive queries`);
});

assert(/source-handoff layer, not ingredient verification/.test(runbook), "runbook should state source-handoff scope");
assert(/Do not promote ingredient claims/.test(runbook), "runbook should block ingredient claims");
assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(runbook), "runbook should not leak private paths");

console.log("confection wrapper item candidate tests passed");
