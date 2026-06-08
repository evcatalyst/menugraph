const fs = require("fs");
const path = require("path");
const {
  argValue,
  countBy,
  generatedAt,
  numberArg,
  parseCsv,
  publicArtifactRef,
  readJson,
  shortHash,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const lineagePriorityPath = path.join(root, "docs/data/product-evidence/confection_wrapper_lineage_priority.json");
const panelWorksheetCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_panel_review_worksheet.csv");
const captureBatchJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_capture_batches.json");
const captureBatchCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_capture_batches.csv");
const captureWorksheetCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_capture_worksheet.csv");
const captureRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_capture_batch_runbook.md");

function splitList(value = "") {
  return String(value).split(/[;,]/).map((item) => item.trim()).filter(Boolean);
}

function rowDateSort(row = {}) {
  const text = `${row.vintage_label || ""} ${row.source_title || ""}`;
  const year = text.match(/\b(19|20)\d{2}\b/);
  if (year) return Number(year[0]);
  const decade = text.match(/\b(19|20)\d0s\b/);
  if (decade) return Number(decade[0].slice(0, 4));
  return 9999;
}

function selectedProductIds(lineageRows = [], { productLimit = 0, forceProducts = [] } = {}) {
  const available = lineageRows
    .filter((row) => Number(row.item_page_count || 0) > 0)
    .map((row) => row.product_id);
  const top = productLimit > 0 ? available.slice(0, productLimit) : available;
  return [...new Set([...top, ...forceProducts])];
}

function worksheetRowsByProduct(rows = []) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.product_id)) map.set(row.product_id, []);
    map.get(row.product_id).push(row);
  }
  for (const [productId, productRows] of map.entries()) {
    map.set(productId, productRows.sort((a, b) => (
      rowDateSort(a) - rowDateSort(b)
      || String(a.source_title).localeCompare(String(b.source_title))
      || String(a.evidence_id).localeCompare(String(b.evidence_id))
    )));
  }
  return map;
}

function capturePriority(row = {}, lineageRow = {}, rowIndex = 0) {
  const earlyBonus = rowDateSort(row) <= 1960 ? 20 : rowDateSort(row) <= 1980 ? 10 : 0;
  const exactPanelBonus = /ingredient|nutrition|panel/i.test(`${row.crop_target || ""} ${row.review_surface_hint || ""}`) ? 8 : 0;
  return Number(lineageRow.reviewer_priority_score || 0) + earlyBonus + exactPanelBonus - rowIndex;
}

function captureRow(row = {}, lineageRow = {}, batch = {}, rowIndex = 0) {
  return {
    run_id: batch.run_id,
    batch_id: batch.batch_id,
    batch_rank: batch.batch_rank,
    row_rank_in_batch: rowIndex + 1,
    capture_id: `cwa_capture_round_${shortHash(`${batch.batch_id}:${row.review_id}`, 12)}`,
    review_id: row.review_id,
    evidence_id: row.evidence_id,
    product_id: row.product_id,
    product_name: row.product_name,
    priority_tier: lineageRow.priority_tier,
    capture_priority_score: capturePriority(row, lineageRow, rowIndex),
    lineage_span_label: lineageRow.lineage_span_label,
    vintage_label: row.vintage_label,
    source_domain: row.source_domain,
    source_url: row.source_url,
    source_title: row.source_title,
    source_type: row.source_type,
    photo_role_priority: "ingredient_or_nutrition_panel_first; wrapper_back_or_side_second; wrapper_front_context_only",
    capture_surface_order: "ingredient_panel; nutrition_panel; net_weight; manufacturer_or_distributor; date_or_lot_cue; wrapper_front_context",
    crop_target: row.crop_target,
    review_surface_hint: row.review_surface_hint,
    private_page_screenshot_path: "",
    private_wrapper_front_crop_path: "",
    private_wrapper_back_or_side_crop_path: "",
    private_ingredient_panel_crop_path: "",
    private_nutrition_panel_crop_path: "",
    private_net_weight_crop_path: "",
    private_maker_or_date_crop_path: "",
    screenshot_hash: "",
    crop_hashes: "",
    package_surface_visible: "",
    ingredient_panel_visible: "",
    nutrition_panel_visible: "",
    net_weight_visible: "",
    manufacturer_or_distributor_visible: "",
    date_or_lot_cue_visible: "",
    text_readable_for_ocr: "",
    ocr_route: "blocked_until_private_readable_panel_crop",
    rights_review_status: row.rights_review_status || "rights_review_needed",
    publication_image_policy: row.publication_image_policy || "source_link_only_no_public_image",
    next_action: "Open source, privately screenshot the item page, crop panel surfaces in priority order, fill private paths locally, then route only readable text crops to native OCR.",
    candidate_only: 1,
    manual_verified: 0,
  };
}

function buildBatches({ lineageManifest = {}, worksheetRows = [], runId, productLimit, forceProducts }) {
  const lineageRows = lineageManifest.rows || [];
  const selectedIds = selectedProductIds(lineageRows, { productLimit, forceProducts });
  const rowsByProduct = worksheetRowsByProduct(worksheetRows);
  const selectedLineageRows = selectedIds
    .map((id) => lineageRows.find((row) => row.product_id === id))
    .filter(Boolean);

  const batches = selectedLineageRows.map((lineageRow, index) => {
    const productRows = rowsByProduct.get(lineageRow.product_id) || [];
    const batchId = `cwa_capture_batch_${lineageRow.product_id}_${shortHash(`${runId}:${lineageRow.product_id}`, 8)}`;
    const batch = {
      run_id: runId,
      batch_id: batchId,
      batch_rank: index + 1,
      product_id: lineageRow.product_id,
      product_name: lineageRow.product_name,
      priority_tier: lineageRow.priority_tier,
      reviewer_priority_score: lineageRow.reviewer_priority_score,
      lineage_span_label: lineageRow.lineage_span_label,
      item_page_count: lineageRow.item_page_count,
      panel_review_rows: productRows.length,
      readable_for_ocr: 0,
      first_source_url: splitList(lineageRow.source_urls)[0] || "",
      capture_goal: "Privately capture source item pages, crop ingredient/nutrition/back-side text before wrapper fronts, and keep all output candidate-only.",
      done_when: "Every row has private screenshot/crop paths filled locally or an explicit no-readable-panel note; readable text crops can then enter native OCR.",
      public_safety: "No images, private paths, OCR text, or verified ingredient claims are published by this artifact.",
    };
    return {
      ...batch,
      rows: productRows.map((row, rowIndex) => captureRow(row, lineageRow, batch, rowIndex)),
    };
  });
  return batches;
}

function flatRows(batches = []) {
  return batches.flatMap((batch) => batch.rows);
}

function buildManifest({ lineageManifest, worksheetRows, batches, runId, productLimit, forceProducts }) {
  const rows = flatRows(batches);
  const availableLineageProducts = lineageManifest.totals?.lineage_products || 0;
  const selectedAllAvailable = batches.length >= availableLineageProducts && availableLineageProducts > 0;
  return {
    schema_version: "confection_wrapper_capture_batches.v1",
    generated_at: generatedAt,
    run_id: runId,
    source_domain: "www.candywrapperarchive.com",
    source_lineage_priority: publicArtifactRef(lineagePriorityPath),
    source_panel_review_worksheet: publicArtifactRef(panelWorksheetCsvPath),
    selection_policy: {
      scope: selectedAllAvailable
        ? "Private capture batches for every currently known Candy Wrapper Archive item-lineage product."
        : "Private capture batches for the highest-density Candy Wrapper Archive item-lineage products plus forced focus products.",
      selection_mode: selectedAllAvailable ? "all_available_lineage_products" : "top_n_plus_forced_products",
      product_limit: productLimit,
      forced_products: forceProducts,
      selected_product_ids: batches.map((batch) => batch.product_id),
      primary_capture_rule: "Capture ingredient/nutrition/back-side text surfaces first; wrapper-front product photos are secondary context.",
      ingredient_gate: "No ingredient claim is promoted until a readable panel crop is OCRed/transcribed and manually verified.",
    },
    public_safety: {
      candidate_only: true,
      external_images_committed: false,
      private_paths_committed: false,
      ocr_text_committed: false,
      ingredient_claims_promoted: false,
      manual_verified_created: false,
    },
    totals: {
      product_batches: batches.length,
      capture_rows: rows.length,
      source_urls: new Set(rows.map((row) => row.source_url).filter(Boolean)).size,
      readable_for_ocr: rows.filter((row) => row.text_readable_for_ocr === "yes").length,
      private_paths_supplied: rows.filter((row) => row.private_page_screenshot_path || row.private_ingredient_panel_crop_path || row.private_nutrition_panel_crop_path).length,
      candidate_only_rows: rows.filter((row) => Number(row.candidate_only)).length,
      lineage_products_available: lineageManifest.totals?.lineage_products || 0,
      lineage_item_pages_available: lineageManifest.totals?.item_pages || 0,
      worksheet_rows_available: worksheetRows.length,
    },
    by_product: countBy(rows, "product_name"),
    by_priority_tier: countBy(rows, "priority_tier"),
    first_batches: batches.slice(0, 8).map((batch) => ({
      batch_id: batch.batch_id,
      batch_rank: batch.batch_rank,
      product_name: batch.product_name,
      lineage_span_label: batch.lineage_span_label,
      item_page_count: batch.item_page_count,
      panel_review_rows: batch.panel_review_rows,
      first_source_url: batch.first_source_url,
      capture_goal: batch.capture_goal,
      done_when: batch.done_when,
    })),
    first_rows: rows.slice(0, 12).map((row) => ({
      capture_id: row.capture_id,
      batch_id: row.batch_id,
      product_name: row.product_name,
      vintage_label: row.vintage_label,
      source_url: row.source_url,
      source_title: row.source_title,
      capture_surface_order: row.capture_surface_order,
      ocr_route: row.ocr_route,
      next_action: row.next_action,
    })),
    artifacts: {
      capture_batches_json: publicArtifactRef(captureBatchJsonPath),
      capture_batches_csv: publicArtifactRef(captureBatchCsvPath),
      capture_worksheet_csv: publicArtifactRef(captureWorksheetCsvPath),
      capture_runbook_md: publicArtifactRef(captureRunbookPath),
    },
    batches,
  };
}

function renderRunbook(manifest = {}) {
  const lines = [
    "# Candy Wrapper Archive Private Capture Batches",
    "",
    `Generated: ${manifest.generated_at}`,
    `Run ID: ${manifest.run_id}`,
    "",
    "This is the execution handoff for private capture across currently known Candy Wrapper Archive item pages. It is public-safe: it publishes source URLs, crop instructions, and blank capture fields, but no images, private paths, OCR text, or verified ingredient claims.",
    "",
    "## Rules",
    "",
    "- Capture ingredient or nutrition panels first.",
    "- If no panel is visible, crop wrapper back/side text, net weight, maker/distributor, and date cues before wrapper-front context.",
    "- Wrapper-front images support package lineage only.",
    "- Fill private paths locally; do not commit screenshots or crops.",
    "- Route to native OCR only when a readable text crop exists.",
    "- Keep model/OCR outputs candidate-only until corrected and manually verified.",
    "",
    "## Totals",
    "",
    `- Product batches: ${manifest.totals.product_batches}`,
    `- Capture rows: ${manifest.totals.capture_rows}`,
    `- Source URLs: ${manifest.totals.source_urls}`,
    `- Readable for OCR now: ${manifest.totals.readable_for_ocr}`,
    "",
    "## First Batches",
    "",
  ];
  for (const batch of manifest.first_batches || []) {
    lines.push(`### ${batch.batch_rank}. ${batch.product_name} (${batch.lineage_span_label})`);
    lines.push("");
    lines.push(`- Rows: ${batch.panel_review_rows}`);
    lines.push(`- First source: ${batch.first_source_url}`);
    lines.push(`- Goal: ${batch.capture_goal}`);
    lines.push(`- Done when: ${batch.done_when}`);
    lines.push("");
  }
  lines.push("## Worksheet Fields To Fill Privately");
  lines.push("");
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
    "text_readable_for_ocr",
  ].forEach((field) => lines.push(`- ${field}`));
  return `${lines.join("\n").trimEnd()}\n`;
}

function writeCaptureBatches({
  runId = "cwa-private-capture-all-lineage-v1",
  productLimit = 0,
  forceProducts = [],
} = {}) {
  const lineageManifest = readJson(lineagePriorityPath, {});
  const worksheetRows = fs.existsSync(panelWorksheetCsvPath)
    ? parseCsv(fs.readFileSync(panelWorksheetCsvPath, "utf8"))
    : [];
  const batches = buildBatches({ lineageManifest, worksheetRows, runId, productLimit, forceProducts });
  const manifest = buildManifest({ lineageManifest, worksheetRows, batches, runId, productLimit, forceProducts });
  const rows = flatRows(batches);

  writeJson(captureBatchJsonPath, manifest);
  writeCsv(captureBatchCsvPath, [
    "run_id",
    "batch_id",
    "batch_rank",
    "product_id",
    "product_name",
    "priority_tier",
    "reviewer_priority_score",
    "lineage_span_label",
    "item_page_count",
    "panel_review_rows",
    "readable_for_ocr",
    "first_source_url",
    "capture_goal",
    "done_when",
    "public_safety",
  ], batches);
  writeCsv(captureWorksheetCsvPath, [
    "run_id",
    "batch_id",
    "batch_rank",
    "row_rank_in_batch",
    "capture_id",
    "review_id",
    "evidence_id",
    "product_id",
    "product_name",
    "priority_tier",
    "capture_priority_score",
    "lineage_span_label",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_title",
    "source_type",
    "photo_role_priority",
    "capture_surface_order",
    "crop_target",
    "review_surface_hint",
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
    "ocr_route",
    "rights_review_status",
    "publication_image_policy",
    "next_action",
    "candidate_only",
    "manual_verified",
  ], rows);
  fs.mkdirSync(path.dirname(captureRunbookPath), { recursive: true });
  fs.writeFileSync(captureRunbookPath, renderRunbook(manifest));

  const summary = readJson(summaryPath, {});
  summary.confection_wrapper_capture_batch_summary = {
    schema_version: manifest.schema_version,
    generated_at: manifest.generated_at,
    run_id: manifest.run_id,
    source_domain: manifest.source_domain,
    selection_policy: manifest.selection_policy,
    public_safety: manifest.public_safety,
    totals: manifest.totals,
    by_product: manifest.by_product,
    by_priority_tier: manifest.by_priority_tier,
    first_batches: manifest.first_batches,
    first_rows: manifest.first_rows,
    artifacts: manifest.artifacts,
  };
  writeJson(summaryPath, summary);
  return manifest;
}

function main() {
  const manifest = writeCaptureBatches({
    runId: argValue("run-id", "cwa-private-capture-all-lineage-v1"),
    productLimit: numberArg("product-limit", 0),
    forceProducts: splitList(argValue("force-product", "")),
  });
  console.log(JSON.stringify({
    run_id: manifest.run_id,
    product_batches: manifest.totals.product_batches,
    capture_rows: manifest.totals.capture_rows,
    readable_for_ocr: manifest.totals.readable_for_ocr,
    capture_worksheet_csv: manifest.artifacts.capture_worksheet_csv,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildBatches,
  buildManifest,
  selectedProductIds,
  writeCaptureBatches,
};
