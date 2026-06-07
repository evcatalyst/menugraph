const fs = require("fs");
const path = require("path");
const {
  countBy,
  normalizeText,
  publicArtifactRef,
  readJson,
  shortHash,
  slug,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const reviewQueuePath = path.join(root, "docs/data/product-evidence/confection_wrapper_review_queue.json");
const handoffJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_capture_handoff.json");
const handoffQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_capture_handoff_queue.csv");
const imageMapTemplateCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_capture_image_map_template.csv");
const handoffRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_capture_handoff_runbook.md");
const generatedAt = "2026-06-08T01:20:00Z";
const runId = "confection-wrapper-capture-v1";

function taskEvidenceId(task = {}) {
  return `cwa_capture_${slug(task.product_id)}_${shortHash(`${task.task_id}:${task.source_url || task.search_queries}`, 10)}`;
}

function captureLane(task = {}) {
  if (task.task_type === "targeted_archive_search") return "source_hunt_before_capture";
  if (task.task_type === "item_page_review") return "item_page_screenshot_panel_triage";
  if (/collection_page/.test(task.task_type || "")) return "collection_index_to_item_page_triage";
  return "archive_source_review";
}

function ocrGapCategory(task = {}) {
  if (task.task_type === "targeted_archive_search") return "source_discovery_needed";
  return "source_page_capture_needed";
}

function ocrPriority(task = {}) {
  if (Number(task.observed_source_rows || 0) >= 2) return "high";
  if (task.task_type === "item_page_review") return "high";
  if (/collection_page/.test(task.task_type || "")) return "medium";
  return "low";
}

function captureStrategy(task = {}) {
  if (task.task_type === "targeted_archive_search") return "source_hunt";
  if (task.task_type === "item_page_review") return "source_page_screenshot_then_panel_triage";
  if (/collection_page/.test(task.task_type || "")) return "collection_index_review_then_item_page_capture";
  return "source_page_review";
}

function cropTarget(task = {}) {
  if (task.task_type === "targeted_archive_search") {
    return "Find a Candy Wrapper Archive item or collection page with source-attributable wrapper photos before any capture.";
  }
  if (task.task_type === "item_page_review") {
    return "Capture a private source-page screenshot, then crop wrapper front/back/side panels separately; route to OCR only if ingredient or nutrition text is readable.";
  }
  if (/collection_page/.test(task.task_type || "")) {
    return "Review the collection index for item-level wrapper pages by decade; capture only item-level pages or images, not the collection index as a label.";
  }
  return "Review source page for package lineage and any readable label panel before private capture.";
}

function expectedSurface(task = {}) {
  if (task.task_type === "targeted_archive_search") return "source_discovery";
  if (task.task_type === "item_page_review") return "package_identity_then_panel_hunt";
  return "collection_index_to_item_page_hunt";
}

function recommendedAction(task = {}) {
  if (task.task_type === "targeted_archive_search") {
    return "Run the constrained Candy Wrapper Archive search queries, attach the strongest source URL, then rebuild this handoff.";
  }
  if (task.task_type === "item_page_review") {
    return "Open the item page, capture a private screenshot/crop, classify photo role and panel readability, then fill the private image-map path only if a useful crop exists.";
  }
  return "Open the collection page, choose item-level wrapper records by decade, then create source-attributable capture rows for those item pages.";
}

function imageMapKeys(row = {}) {
  return [row.evidence_id, `${row.product_id}:${row.evidence_id}`, row.source_url].filter(Boolean).join(";");
}

function queueRow(task = {}) {
  const evidenceId = taskEvidenceId(task);
  return {
    run_id: runId,
    product_id: task.product_id,
    product_name: task.product_name,
    brand: "",
    category: task.category || "candy",
    corpus_scope: "confection_wrapper_priority",
    vintage_label: task.linked_vintage_slots || "archive lineage source lead",
    version_id: task.task_id,
    evidence_id: evidenceId,
    evidence_kind: task.task_type,
    source_domain: task.source_domain || "www.candywrapperarchive.com",
    source_url: task.source_url || "",
    source_title: task.source_title || `${task.product_name} Candy Wrapper Archive lead`,
    source_owner: "Candy Wrapper Archive",
    panel_acquisition_state: captureLane(task),
    ocr_priority: ocrPriority(task),
    ocr_gap_category: ocrGapCategory(task),
    ocr_access_state: task.source_url ? "source_page_capture_needed" : "source_discovery_needed",
    ocr_recommended_action: recommendedAction(task),
    registry_priority: task.priority_score || 0,
    promotion_blocker: "Wrapper lineage is not ingredient proof. Ingredient claims require readable panel OCR, corrected transcription, reviewer attribution, and manual verification.",
    ground_truth_fields_missing: "source_review; photo_role; panel_readability; private_crop_path; ocr_lines; corrected_text; reviewer; manual_verified",
    image_reference: "",
    ingredient_panel_visible: "",
    nutrition_panel_visible: "",
    net_weight_visible: "",
    capture_strategy: captureStrategy(task),
    crop_target: cropTarget(task),
    ocr_expected_surface: expectedSurface(task),
    private_image_map_keys: imageMapKeys({ evidence_id: evidenceId, product_id: task.product_id, source_url: task.source_url }),
    rights_review_status: "rights_review_needed",
    allowed_public_output: "source receipt, source-review status, hashes, candidate OCR status; no public image reuse unless rights are clear",
    candidate_only: 1,
    manual_verified: 0,
    source_review_task_id: task.task_id,
    source_review_task_type: task.task_type,
    observed_source_rows: task.observed_source_rows || 0,
    search_queries: task.search_queries || "",
  };
}

function imageMapTemplateRow(row = {}) {
  return {
    run_id: runId,
    evidence_id: row.evidence_id,
    product_id: row.product_id,
    product_name: row.product_name,
    vintage_label: row.vintage_label,
    source_domain: row.source_domain,
    source_url: row.source_url,
    source_title: row.source_title,
    source_type: row.evidence_kind,
    proof_lane: row.panel_acquisition_state,
    proof_lane_rank: "",
    ocr_gap_category: row.ocr_gap_category,
    ocr_priority: row.ocr_priority,
    capture_strategy: row.capture_strategy,
    crop_target: row.crop_target,
    ocr_expected_surface: row.ocr_expected_surface,
    image_map_keys: row.private_image_map_keys,
    local_private_image_path: "",
    processed_private_image_path: "",
    panel_crop_note: "",
    rights_review_status: row.rights_review_status,
    publication_image_policy: "source_link_only_no_public_image",
    candidate_only: 1,
    manual_verified: 0,
  };
}

function buildRows(reviewManifest = {}) {
  return (reviewManifest.tasks || []).map(queueRow).sort((a, b) => (
    Number(b.registry_priority || 0) - Number(a.registry_priority || 0)
    || a.product_name.localeCompare(b.product_name)
    || a.evidence_id.localeCompare(b.evidence_id)
  ));
}

function buildManifest(rows, reviewManifest = {}) {
  const count = (predicate) => rows.filter(predicate).length;
  return {
    schema_version: "confection_wrapper_capture_handoff.v1",
    generated_at: generatedAt,
    run_id: runId,
    source_review_queue: reviewManifest.artifacts?.review_queue_json || publicArtifactRef(reviewQueuePath),
    selection_policy: {
      scope: "Candy/confection products with Candy Wrapper Archive lineage leads.",
      primary_visual_rule: "Capture ingredient or nutrition panels when visible; wrapper-front photos remain package-lineage context.",
      source_priority_rule: "Candy Wrapper Archive pages are reviewed before broad web hunting for confection products.",
      compatible_with: "scripts/build-spark-ocr-packets.js, scripts/capture-ingredient-ocr-assets.js, and the native OCR image-map template.",
    },
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      external_images_committed: false,
      manual_verified_created: false,
      wrapper_fronts_are_not_ingredient_claims: true,
    },
    totals: {
      capture_rows: rows.length,
      products: new Set(rows.map((row) => row.product_id)).size,
      high_priority_rows: count((row) => row.ocr_priority === "high"),
      source_page_capture_rows: count((row) => row.ocr_gap_category === "source_page_capture_needed"),
      source_discovery_rows: count((row) => row.ocr_gap_category === "source_discovery_needed"),
      item_page_triage_rows: count((row) => row.panel_acquisition_state === "item_page_screenshot_panel_triage"),
      collection_index_rows: count((row) => row.panel_acquisition_state === "collection_index_to_item_page_triage"),
    },
    lane_counts: countBy(rows, "panel_acquisition_state"),
    gap_counts: countBy(rows, "ocr_gap_category"),
    source_domain_counts: countBy(rows, "source_domain"),
    first_rows: rows.slice(0, 16),
    artifacts: {
      handoff_json: publicArtifactRef(handoffJsonPath),
      queue_csv: publicArtifactRef(handoffQueueCsvPath),
      image_map_template_csv: publicArtifactRef(imageMapTemplateCsvPath),
      runbook_markdown: publicArtifactRef(handoffRunbookPath),
    },
    rows,
  };
}

function renderRunbook(manifest = {}) {
  const lines = [
    "# Confection Wrapper Capture Handoff",
    "",
    `Generated: ${manifest.generated_at}`,
    `Run ID: ${manifest.run_id}`,
    "",
    "This handoff converts Candy Wrapper Archive source-review tasks into private capture work. It is public-safe: it stores source URLs and review instructions, but no private screenshots, crops, OCR text, or verified ingredient claims.",
    "",
    "## Rules",
    "",
    "- Candy Wrapper Archive is prioritized for confection wrapper lineage before broad web hunting.",
    "- Wrapper-front photos support product/package history only.",
    "- Ingredient claims require a readable ingredient or nutrition panel, candidate OCR, corrected transcription, reviewer attribution, and manual verification.",
    "- Collection pages must be reduced to item-level wrapper pages before capture/OCR.",
    "- External images remain link-only unless rights are explicitly clear.",
    "",
    "## Totals",
    "",
    `- Capture rows: ${manifest.totals.capture_rows}`,
    `- Products: ${manifest.totals.products}`,
    `- High priority rows: ${manifest.totals.high_priority_rows}`,
    `- Source-page capture rows: ${manifest.totals.source_page_capture_rows}`,
    `- Source-discovery rows: ${manifest.totals.source_discovery_rows}`,
    "",
    "## Operator Flow",
    "",
    "1. Open the source URL for an item or collection task.",
    "2. For collection pages, select item-level wrapper records by decade before capture.",
    "3. Capture private screenshots/crops only under `.cache/ingredient-ocr/runs/<run-id>/`.",
    "4. Record photo role, panel readability, rights notes, and date/package cues.",
    "5. Fill the private image-map path only for useful crops.",
    "6. Run native OCR only when a readable ingredient/nutrition/document surface exists.",
    "",
    "## First Rows",
    "",
  ];
  for (const row of manifest.first_rows.slice(0, 12)) {
    lines.push(`### ${row.product_name} / ${row.panel_acquisition_state}`);
    lines.push("");
    lines.push(`- Evidence: \`${row.evidence_id}\``);
    lines.push(`- Source: ${row.source_url || row.search_queries || "source needed"}`);
    lines.push(`- Crop target: ${row.crop_target}`);
    lines.push(`- Next action: ${row.ocr_recommended_action}`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function writeHandoff() {
  const reviewManifest = readJson(reviewQueuePath, {});
  const rows = buildRows(reviewManifest);
  const manifest = buildManifest(rows, reviewManifest);
  const summary = readJson(summaryPath, {});
  summary.confection_wrapper_capture_handoff_summary = {
    generated_at: manifest.generated_at,
    run_id: manifest.run_id,
    source_review_queue: manifest.source_review_queue,
    selection_policy: manifest.selection_policy,
    public_safety: manifest.public_safety,
    totals: manifest.totals,
    lane_counts: manifest.lane_counts,
    gap_counts: manifest.gap_counts,
    source_domain_counts: manifest.source_domain_counts,
    first_rows: manifest.first_rows.slice(0, 8),
    artifacts: manifest.artifacts,
  };

  writeJson(handoffJsonPath, manifest);
  writeCsv(handoffQueueCsvPath, [
    "run_id",
    "product_id",
    "product_name",
    "brand",
    "category",
    "corpus_scope",
    "vintage_label",
    "version_id",
    "evidence_id",
    "evidence_kind",
    "source_domain",
    "source_url",
    "source_title",
    "source_owner",
    "panel_acquisition_state",
    "ocr_priority",
    "ocr_gap_category",
    "ocr_access_state",
    "ocr_recommended_action",
    "registry_priority",
    "promotion_blocker",
    "ground_truth_fields_missing",
    "image_reference",
    "ingredient_panel_visible",
    "nutrition_panel_visible",
    "net_weight_visible",
    "capture_strategy",
    "crop_target",
    "ocr_expected_surface",
    "private_image_map_keys",
    "rights_review_status",
    "allowed_public_output",
    "candidate_only",
    "manual_verified",
    "source_review_task_id",
    "source_review_task_type",
    "observed_source_rows",
    "search_queries",
  ], rows);
  writeCsv(imageMapTemplateCsvPath, [
    "run_id",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_title",
    "source_type",
    "proof_lane",
    "proof_lane_rank",
    "ocr_gap_category",
    "ocr_priority",
    "capture_strategy",
    "crop_target",
    "ocr_expected_surface",
    "image_map_keys",
    "local_private_image_path",
    "processed_private_image_path",
    "panel_crop_note",
    "rights_review_status",
    "publication_image_policy",
    "candidate_only",
    "manual_verified",
  ], rows.map(imageMapTemplateRow));
  fs.mkdirSync(path.dirname(handoffRunbookPath), { recursive: true });
  fs.writeFileSync(handoffRunbookPath, renderRunbook(manifest));
  writeJson(summaryPath, summary);

  return manifest;
}

function main() {
  const manifest = writeHandoff();
  console.log(JSON.stringify({
    run_id: manifest.run_id,
    capture_rows: manifest.totals.capture_rows,
    products: manifest.totals.products,
    high_priority_rows: manifest.totals.high_priority_rows,
    queue_csv: manifest.artifacts.queue_csv,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildManifest,
  buildRows,
  captureLane,
  queueRow,
  writeHandoff,
};
