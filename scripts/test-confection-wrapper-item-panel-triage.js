const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const triageJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_item_panel_triage.json");
const triageQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_panel_triage_queue.csv");
const imageMapTemplateCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_panel_triage_image_map_template.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_panel_triage_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

const manifest = JSON.parse(fs.readFileSync(triageJsonPath, "utf8"));
const queueRows = parseCsv(fs.readFileSync(triageQueueCsvPath, "utf8"));
const imageMapRows = parseCsv(fs.readFileSync(imageMapTemplateCsvPath, "utf8"));
const runbook = fs.readFileSync(runbookPath, "utf8");
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(manifest.schema_version, "confection_wrapper_item_panel_triage.v1", "manifest schema should be versioned");
assert.strictEqual(manifest.run_id, "confection-wrapper-item-panel-triage-v1", "run id should be stable");
assert.strictEqual(queueRows.length, manifest.totals.triage_rows, "queue CSV row count should match manifest");
assert.strictEqual(imageMapRows.length, manifest.totals.triage_rows, "image-map template should cover every triage row");
assert.strictEqual(manifest.totals.triage_rows, 49, "expected all item candidates to become panel triage rows");
assert.strictEqual(manifest.totals.products, 9, "expected nine products with panel triage rows");
assert.strictEqual(manifest.totals.high_priority_rows, 23, "expected high-priority row count");
assert.strictEqual(manifest.totals.direct_image_reference_rows, 2, "expected two direct image references");
assert.strictEqual(manifest.totals.source_page_capture_rows, 47, "expected source-page capture rows for collection candidates");
assert.strictEqual(manifest.totals.item_page_rows, 2, "expected existing item pages to be preserved");
assert.strictEqual(manifest.totals.collection_item_rows, 47, "expected collection-derived item rows");
assert.deepStrictEqual(
  summary.confection_wrapper_item_panel_triage_summary.totals,
  manifest.totals,
  "site summary totals should match panel triage manifest",
);

const tootsie1940s = queueRows.find((row) => row.product_id === "tootsie_roll" && /1940s-tootsie-roll/.test(row.source_url));
assert(tootsie1940s, "Tootsie 1940s direct image row should exist");
assert(/Image209\.jpg/.test(tootsie1940s.image_reference), "Tootsie 1940s should preserve direct source image reference");
assert.strictEqual(tootsie1940s.capture_strategy, "direct_image_reference_then_panel_triage", "Tootsie direct image row should use direct capture strategy");
assert.strictEqual(tootsie1940s.ocr_access_state, "direct_image_reference_ready", "Tootsie direct image row should be capture-ready");
assert(/not ingredient proof/i.test(tootsie1940s.promotion_blocker), "Tootsie row should block ingredient overclaiming");

const snickers1939 = queueRows.find((row) => row.product_id === "snickers_bar" && row.source_title === "1939 Snickers");
assert(snickers1939, "Snickers 1939 panel triage row should exist");
assert.strictEqual(snickers1939.image_reference, "", "Snickers 1939 should not invent a direct image reference");
assert.strictEqual(snickers1939.capture_strategy, "item_page_screenshot_then_panel_triage", "Snickers should require item-page screenshot triage");

queueRows.forEach((row) => {
  assert.strictEqual(row.candidate_only, "1", `${row.evidence_id} should be candidate-only`);
  assert.strictEqual(row.manual_verified, "0", `${row.evidence_id} should not be manually verified`);
  assert(/not ingredient proof/i.test(row.promotion_blocker), `${row.evidence_id} should block ingredient proof promotion`);
  assert(row.source_url.startsWith("https://www.candywrapperarchive.com/candy-collector/"), `${row.evidence_id} should link to an item page`);
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(JSON.stringify(row)), `${row.evidence_id} leaks an actual private path`);
});

imageMapRows.forEach((row) => {
  assert.strictEqual(row.local_private_image_path, "", `${row.evidence_id} should not publish local private path`);
  assert.strictEqual(row.processed_private_image_path, "", `${row.evidence_id} should not publish processed private path`);
  assert.strictEqual(row.candidate_only, "1", `${row.evidence_id} image-map row should be candidate-only`);
  assert.strictEqual(row.manual_verified, "0", `${row.evidence_id} image-map row should not be manually verified`);
  assert(row.image_map_keys.includes(row.evidence_id), `${row.evidence_id} should include evidence id image-map key`);
  assert(row.image_map_keys.includes(row.source_url), `${row.evidence_id} should include source URL image-map key`);
  if (row.capture_strategy === "direct_image_reference_then_panel_triage") {
    assert(/Image\d+\.jpg/.test(row.image_map_keys), `${row.evidence_id} should include direct image reference as a lookup key`);
  }
});

assert(/Direct archive image URLs are private capture references only/.test(manifest.selection_policy.direct_image_policy), "manifest should state direct image policy");
assert(/Treat direct image URLs as private capture references/.test(runbook), "runbook should block public direct image embeds");
assert(/Run OCR only on readable ingredient/.test(runbook), "runbook should gate OCR on readable surfaces");
assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(runbook), "runbook should not leak private paths");

console.log("confection wrapper item panel triage tests passed");
