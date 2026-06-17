const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.join(__dirname, "..");
const manifestPath = path.join(root, "docs/data/product-evidence/ingredient_ocr_manifest.json");
const queueCsvPath = path.join(root, "docs/data/product-evidence/exports/ten_product_pilot_ocr_queue.csv");
const fullManifestPath = path.join(root, "docs/data/product-evidence/full_corpus_ingredient_ocr_manifest.json");
const fullQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv");
const fullGapCsvPath = path.join(root, "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_gap_report.csv");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");
const sourceFamilySummaryPath = path.join(root, "docs/data/product-evidence/source_family_summary.json");
const sourceFamilyCoveragePath = path.join(root, "docs/data/product-evidence/source_family_coverage.json");
const labelDatabaseVisualIndexPath = path.join(root, "docs/data/product-evidence/label_database_ingredient_visual_index.json");
const ocrBoardSummaryPath = path.join(root, "docs/data/product-evidence/ocr_board_summary.json");
const productStoryIndexPath = path.join(root, "docs/data/product-evidence/product_story_index.json");
const publicReviewQueuePath = path.join(root, "docs/data/product-evidence/review_queue_public.csv");
const publicGapReportPath = path.join(root, "docs/data/product-evidence/gap_report_public.csv");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const headers = rows.shift();
  return rows
    .filter((cells) => cells.some(Boolean))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const fullManifest = JSON.parse(fs.readFileSync(fullManifestPath, "utf8"));
const navigator = JSON.parse(fs.readFileSync(navigatorPath, "utf8"));
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const sourceFamilySummary = JSON.parse(fs.readFileSync(sourceFamilySummaryPath, "utf8"));
const sourceFamilyCoverage = JSON.parse(fs.readFileSync(sourceFamilyCoveragePath, "utf8"));
const labelDatabaseVisualIndex = JSON.parse(fs.readFileSync(labelDatabaseVisualIndexPath, "utf8"));
const ocrBoardSummary = JSON.parse(fs.readFileSync(ocrBoardSummaryPath, "utf8"));
const productStoryIndex = JSON.parse(fs.readFileSync(productStoryIndexPath, "utf8"));
const queue = parseCsv(fs.readFileSync(queueCsvPath, "utf8"));
const fullQueue = parseCsv(fs.readFileSync(fullQueueCsvPath, "utf8"));
const fullGapReport = parseCsv(fs.readFileSync(fullGapCsvPath, "utf8"));
const publicReviewQueue = parseCsv(fs.readFileSync(publicReviewQueuePath, "utf8"));
const publicGapReport = parseCsv(fs.readFileSync(publicGapReportPath, "utf8"));
const { buildCoverage } = require("./build-source-family-coverage");

function assertPublicSafeJson(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  assert(!text.includes(".cache"), `${filePath} should not expose private cache path text`);
  assert(!text.includes("/Volumes/"), `${filePath} should not expose absolute volume paths`);
  assert(!text.includes("local_image_path"), `${filePath} should not expose local image path fields`);
  assert(!text.includes("source_html_path"), `${filePath} should not expose source html paths`);
  assert(!text.includes("ingredient_fragment_path"), `${filePath} should not expose ingredient fragment paths`);
  assert(!text.includes("product_image_path"), `${filePath} should not expose product image paths`);
  assert(!text.includes("preview_path"), `${filePath} should not expose private preview paths`);
  assert(!text.includes("ocr_path"), `${filePath} should not expose private OCR paths`);
  assert(!/data:image\//.test(text), `${filePath} should not expose image data`);
  assert(!text.includes('"lines"'), `${filePath} should not expose raw OCR lines`);
}

assert.strictEqual(manifest.schema_version, 1, "manifest schema should be versioned");
assert.strictEqual(manifest.products.length, 10, "manifest should cover the 10-product pilot");
assert.strictEqual(manifest.totals.products, 10, "manifest totals should cover 10 products");
assert.strictEqual(queue.length, manifest.totals.ocr_candidates, "CSV and manifest candidate counts should match");
assert(manifest.totals.ocr_candidates >= 80, "expected broad OCR queue coverage across product evidence");
assert(manifest.totals.high_priority >= 25, "expected high-priority ingredient OCR candidates");

const productIds = new Set(navigator.products.map((product) => product.id));
manifest.products.forEach((product) => {
  assert(productIds.has(product.id), `unexpected product ${product.id}`);
  assert(product.ocr_candidate_count > 0, `${product.id} should have OCR candidates`);
});

const byEvidence = new Map(queue.map((row) => [row.evidence_id, row]));
const oreo1993 = byEvidence.get("flickr_oreo_1993");
assert(oreo1993, "Oreo 1993 photo should be in the OCR queue");
assert.strictEqual(oreo1993.ocr_priority, "high", "Oreo 1993 photo should be high-priority");
assert.strictEqual(oreo1993.ingredient_panel_visible, "true", "Oreo 1993 should preserve panel visibility");

queue.forEach((row) => {
  assert(row.product_id, "queue row missing product id");
  assert(row.evidence_id, "queue row missing evidence id");
  assert(row.source_url, `${row.evidence_id} missing source URL`);
  assert(row.source_title, `${row.evidence_id} missing source title`);
  assert(row.rights_note, `${row.evidence_id} missing rights note`);
  assert(row.ocr_recommended_action, `${row.evidence_id} missing recommended action`);
});

navigator.products.forEach((product) => {
  assert(product.ingredient_ocr_summary, `${product.id} missing OCR summary`);
  assert(product.export_paths?.ocr_queue_csv, `${product.id} missing OCR queue export path`);
});

assert.strictEqual(fullManifest.schema_version, 1, "full corpus manifest schema should be versioned");
assert.strictEqual(fullManifest.totals.products, 120, "full corpus manifest should cover 120 products");
assert.strictEqual(fullManifest.products.length, 120, "full corpus product summaries should cover 120 products");
assert.strictEqual(fullQueue.length, fullManifest.totals.ocr_candidates, "full corpus CSV and manifest counts should match");
assert(fullQueue.length >= 1700, "expected full corpus OCR queue to cover registry evidence rows");
assert(fullManifest.totals.high_priority >= 700, "expected high-priority full-corpus OCR candidates");
assert.strictEqual(fullManifest.totals.local_image_ready, 0, "public build should not include private local image paths");
assert.strictEqual(
  fullManifest.totals.not_easily_accessible,
  fullManifest.totals.ocr_candidates,
  "public build should mark every row as needing private capture, image map, or source discovery",
);
assert(fullGapReport.length >= 4, "expected grouped full-corpus OCR gap report");
assert(fullGapReport.some((row) => row.gap_category === "source_discovery_needed"), "source discovery gaps should be reported");
assert(fullGapReport.some((row) => row.gap_category === "readable_panel_photo_needed"), "readable panel photo gaps should be reported");
assert(fullGapReport.some((row) => row.gap_category === "panel_capture_needed"), "panel capture gaps should be reported");
assert(fullGapReport.some((row) => row.gap_category === "document_text_pipeline_needed"), "document-first OCR gaps should be reported");

assert.strictEqual(sourceFamilySummary.schema_version, 1, "source family summary should be versioned");
const cwa = sourceFamilySummary.families.find((row) => row.id === "candy-wrapper-archive");
assert(cwa, "Candy Wrapper Archive source family should be published");
assert(cwa.product_count >= 5, "CWA source family should expose multiple products beyond the 10-product pilot");
assert(cwa.evidence_row_count >= 10, "CWA source family should expose lineage rows");
assert(cwa.claim_policy.includes("manual verification"), "CWA family should keep claims gated");
assert(cwa.products.some((row) => row.product_id === "tootsie_roll"), "CWA source family should include Tootsie Roll");
assert(cwa.products.every((row) => row.source_urls.every((url) => /^https?:/.test(url))), "CWA source URLs should remain link-only");

assert.strictEqual(ocrBoardSummary.schema_version, 1, "OCR board summary should be versioned");
assert.strictEqual(ocrBoardSummary.scratch_soft_quota, "200GB", "OCR board should publish the soft scratch quota");
assert(!JSON.stringify(ocrBoardSummary).includes("/Volumes/azssd/scratch/ingredient-ocr/runs/"), "OCR board should not publish private run paths");
assert(!JSON.stringify(ocrBoardSummary).includes("/Volumes/azssd/scratch"), "OCR board should not publish the private scratch path");
assert(!JSON.stringify(sourceFamilySummary).includes("/Volumes/azssd/scratch"), "source family summary should not publish the private scratch path");

assert.strictEqual(typeof buildCoverage, "function", "source-family coverage builder should export buildCoverage");
assert.strictEqual(sourceFamilyCoverage.schema_version, 1, "source family coverage should be versioned");
assert.strictEqual(sourceFamilyCoverage.totals.queue_products, 120, "source family coverage should audit the 120-product queue");
assert.strictEqual(sourceFamilyCoverage.totals.represented_products, 105, "source family coverage should include label-database enrichment");
assert.strictEqual(sourceFamilyCoverage.totals.missing_products, 15, "source family coverage should expose the remaining missing product queue");
assert.strictEqual(navigator.source_family_coverage?.totals?.missing_products, 15, "navigator should embed the remaining missing product queue");
assert(sourceFamilyCoverage.missing_products.some((row) => row.product_id === "starbucks_pumpkin_spice_latte"), "coverage queue should include Starbucks PSL");
assert(sourceFamilyCoverage.missing_products.some((row) => row.product_id === "pearl_milling_pancake_mix_original"), "coverage queue should include Pearl Milling");
assert(!sourceFamilyCoverage.missing_products.some((row) => row.product_id === "nilla_wafers"), "Nilla Wafers should be represented by the label-database source-family lane");
assert(sourceFamilyCoverage.missing_products.every((row) => row.coverage_status === "not_yet_represented_in_source_family"), "missing queue should not mix represented products");
assert(sourceFamilyCoverage.missing_products.every((row) => row.representative_rows.length > 0), "missing queue should include source leads");
assert(sourceFamilyCoverage.missing_products.every((row) => row.representative_rows.every((lead) => /^https?:/.test(lead.source_url))), "missing queue leads should stay source-link based");
assert(sourceFamilyCoverage.missing_capture_classes.candidate_panel_or_text_available >= 1, "coverage queue should classify panel/text candidates");
assert(sourceFamilyCoverage.missing_capture_classes.menu_component_source_needed >= 1, "coverage queue should classify menu-component candidates");
assertPublicSafeJson(sourceFamilyCoveragePath);
assertPublicSafeJson(navigatorPath);
assertPublicSafeJson(labelDatabaseVisualIndexPath);

assert.strictEqual(labelDatabaseVisualIndex.schema_version, 1, "label database visual index should be versioned");
assert.strictEqual(labelDatabaseVisualIndex.source_family.id, "label-database-current-leads", "label database source-family id should be stable");
assert.strictEqual(labelDatabaseVisualIndex.totals.products, 1, "label database lane should add one product in this slice");
assert.strictEqual(labelDatabaseVisualIndex.totals.rows, 1, "label database lane should add one proof row in this slice");
assert.strictEqual(labelDatabaseVisualIndex.totals.local_preview_available, 1, "label database lane should have a local private proof panel");
const labelDatabaseRow = labelDatabaseVisualIndex.rows.find((row) => row.product_id === "nilla_wafers");
assert(labelDatabaseRow, "label database lane should include Nilla Wafers");
assert.strictEqual(labelDatabaseRow.proof_visual_basis, "label_database_source_text_proof_panel", "Nilla proof basis should remain claim-gated to source text");
assert.strictEqual(labelDatabaseRow.ingredient_text_status, "label_database_candidate_needs_package_review", "Nilla label-database text should require package review");
assert(labelDatabaseRow.ingredient_items.includes("High Fructose Corn Syrup"), "Nilla ingredient list should expose searchable ingredient items");
assert(labelDatabaseRow.claim_boundary.includes("Package image review"), "Nilla claim boundary should require package image review");
const labelDatabaseFamily = navigator.source_family_timeline?.families?.find((row) => row.id === "label-database-current-leads");
assert(labelDatabaseFamily, "navigator should expose the label-database current leads lane");
assert.strictEqual(labelDatabaseFamily.product_count, 1, "label-database lane should expose one product");
assert(labelDatabaseFamily.products.some((row) => row.product_id === "nilla_wafers"), "navigator label-database lane should include Nilla Wafers");

assert.strictEqual(productStoryIndex.schema_version, 1, "product story index should be versioned");
assert.strictEqual(productStoryIndex.pilot_products.length, 10, "story index should keep the 10 pilot products");
assert(productStoryIndex.source_family_products.length >= 5, "story index should add source-family products");
assert(productStoryIndex.source_family_products.some((row) => row.product_id === "tootsie_roll"), "story index should expose Tootsie Roll as a source-family candidate");

assert(publicReviewQueue.length > 60, "public review queue should combine pilot and source-family rows");
assert(publicReviewQueue.some((row) => row.source_family === "candy-wrapper-archive"), "public review queue should include CWA rows");
assert(publicGapReport.some((row) => row.scope === "source_family" && row.family_or_gap === "candy-wrapper-archive"), "public gap report should include CWA source-family gaps");

fullQueue.forEach((row) => {
  assert(row.product_id, "full queue row missing product id");
  assert(row.evidence_id, "full queue row missing evidence id");
  assert(row.ocr_access_state, `${row.evidence_id} missing OCR access state`);
  assert(row.ocr_gap_category, `${row.evidence_id} missing OCR gap category`);
  assert(row.future_run_approach, `${row.evidence_id} missing future run approach`);
  assert.strictEqual(row.local_image_path, "", `${row.evidence_id} should not expose a public local image path`);
});

assert(summary.ingredient_ocr_summary, "summary missing full corpus OCR rollup");
assert.strictEqual(summary.ingredient_ocr_summary.corpus_product_count, 120, "summary OCR rollup should cover full corpus");
assert.strictEqual(
  summary.ingredient_ocr_summary.ocr_candidate_count,
  fullManifest.totals.ocr_candidates,
  "summary OCR rollup should match manifest candidate count",
);
summary.products.forEach((product) => {
  assert(product.ingredient_ocr_summary, `${product.canonical_name} missing full corpus OCR summary`);
  assert(product.export_paths?.full_corpus_ocr_queue_csv, `${product.canonical_name} missing full corpus OCR queue export path`);
  assert(product.export_paths?.full_corpus_ocr_gap_csv, `${product.canonical_name} missing full corpus OCR gap export path`);
});

console.log("ingredient OCR queue tests passed");
