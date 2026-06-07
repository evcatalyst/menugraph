const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const handoffJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_capture_handoff.json");
const handoffQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_capture_handoff_queue.csv");
const imageMapTemplateCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_capture_image_map_template.csv");
const handoffRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_capture_handoff_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

const manifest = JSON.parse(fs.readFileSync(handoffJsonPath, "utf8"));
const queueRows = parseCsv(fs.readFileSync(handoffQueueCsvPath, "utf8"));
const imageMapRows = parseCsv(fs.readFileSync(imageMapTemplateCsvPath, "utf8"));
const runbook = fs.readFileSync(handoffRunbookPath, "utf8");
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(manifest.schema_version, "confection_wrapper_capture_handoff.v1", "manifest schema should be versioned");
assert.strictEqual(manifest.run_id, "confection-wrapper-capture-v1", "run id should be stable");
assert.strictEqual(queueRows.length, manifest.totals.capture_rows, "queue CSV row count should match manifest");
assert.strictEqual(imageMapRows.length, manifest.totals.capture_rows, "image-map template should cover every handoff row");
assert.strictEqual(manifest.totals.capture_rows, 13, "expected focused confection wrapper capture handoff rows");
assert.strictEqual(manifest.totals.products, 12, "expected twelve candy products");
assert.strictEqual(manifest.totals.high_priority_rows, 6, "expected existing source leads to become high-priority capture rows");
assert.strictEqual(manifest.totals.source_page_capture_rows, 10, "expected source-page capture rows for item/collection leads");
assert.strictEqual(manifest.totals.source_discovery_rows, 3, "expected search-only rows to stay source discovery");
assert.strictEqual(manifest.totals.item_page_triage_rows, 2, "expected two Tootsie item-page triage rows");
assert.strictEqual(manifest.totals.collection_index_rows, 8, "expected collection pages to remain item-page triage");
assert.deepStrictEqual(
  summary.confection_wrapper_capture_handoff_summary.totals,
  manifest.totals,
  "site summary totals should match capture handoff manifest",
);

const rowsByProduct = new Map(queueRows.map((row) => [row.product_id, row]));
const snickers = rowsByProduct.get("snickers_bar");
assert(snickers, "Snickers should have a capture handoff row");
assert.strictEqual(snickers.panel_acquisition_state, "collection_index_to_item_page_triage", "Snickers collection page should not be OCRed as a label");
assert.strictEqual(snickers.ocr_priority, "high", "Snickers should be high priority from repeated archive rows");
assert(/candywrapperarchive\.com\/candy-collection\/snickers/.test(snickers.source_url), "Snickers should link to archive collection source");

const tootsie1960s = queueRows.find((row) => /1960s-tootsie-roll-2/.test(row.source_url));
assert(tootsie1960s, "1960s Tootsie item page should become capture handoff row");
assert.strictEqual(tootsie1960s.panel_acquisition_state, "item_page_screenshot_panel_triage", "Tootsie item page should route to screenshot/panel triage");
assert(/route to OCR only if ingredient or nutrition text is readable/i.test(tootsie1960s.crop_target), "Tootsie crop target should keep OCR gated");

const skittles = rowsByProduct.get("skittles_original");
assert(skittles, "Skittles should have a source-hunt row");
assert.strictEqual(skittles.source_url, "", "source-hunt rows should not invent URLs");
assert.strictEqual(skittles.ocr_gap_category, "source_discovery_needed", "Skittles should remain source discovery");
assert.strictEqual(skittles.capture_strategy, "source_hunt", "Skittles should not enter capture before a source URL");
assert(/site:candywrapperarchive\.com/.test(skittles.search_queries), "Skittles should carry constrained archive queries");

queueRows.forEach((row) => {
  assert.strictEqual(row.candidate_only, "1", `${row.evidence_id} should be candidate-only`);
  assert.strictEqual(row.manual_verified, "0", `${row.evidence_id} should not be manually verified`);
  assert(/Wrapper lineage is not ingredient proof/.test(row.promotion_blocker), `${row.evidence_id} should block ingredient overclaims`);
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(JSON.stringify(row)), `${row.evidence_id} leaks an actual private path`);
});

imageMapRows.forEach((row) => {
  assert.strictEqual(row.local_private_image_path, "", `${row.evidence_id} should not publish local private path`);
  assert.strictEqual(row.processed_private_image_path, "", `${row.evidence_id} should not publish processed private path`);
  assert.strictEqual(row.candidate_only, "1", `${row.evidence_id} image-map row should be candidate-only`);
  assert.strictEqual(row.manual_verified, "0", `${row.evidence_id} image-map row should not be manually verified`);
  assert(row.image_map_keys.includes(row.evidence_id), `${row.evidence_id} should include evidence id image-map key`);
});

assert(/Wrapper-front photos support product\/package history only/.test(runbook), "runbook should block front-wrapper ingredient claims");
assert(/Collection pages must be reduced to item-level wrapper pages before capture\/OCR/.test(runbook), "runbook should require item-level pages");
assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(runbook), "runbook should not leak private paths");

console.log("confection wrapper capture handoff tests passed");
