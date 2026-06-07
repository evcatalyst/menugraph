const fs = require("fs");
const path = require("path");
const {
  countBy,
  publicArtifactRef,
  readJson,
  shortHash,
  slug,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const itemCandidatePath = path.join(root, "docs/data/product-evidence/confection_wrapper_item_candidates.json");
const triageJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_item_panel_triage.json");
const triageQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_panel_triage_queue.csv");
const imageMapTemplateCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_panel_triage_image_map_template.csv");
const triageRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_panel_triage_runbook.md");
const generatedAt = "2026-06-08T02:15:00Z";
const runId = "confection-wrapper-item-panel-triage-v1";

function evidenceId(candidate = {}) {
  return `cwa_item_triage_${slug(candidate.product_id)}_${shortHash(candidate.candidate_id || candidate.item_url, 10)}`;
}

function ocrPriority(candidate = {}) {
  const score = Number(candidate.candidate_priority_score || 0);
  if (score >= 100) return "high";
  if (score >= 70) return "medium";
  return "low";
}

function captureStrategy(candidate = {}) {
  if (candidate.source_image_url) return "direct_image_reference_then_panel_triage";
  return "item_page_screenshot_then_panel_triage";
}

function ocrRecommendedAction(candidate = {}) {
  if (candidate.source_image_url) {
    return "Privately capture the linked source image and item page, then classify wrapper text, net weight, maker, and panel readability before OCR.";
  }
  return "Open the item page, capture a private source-page screenshot/crop, classify wrapper role and panel readability, then route only readable panels to OCR.";
}

function cropTarget(candidate = {}) {
  if (candidate.source_image_url) {
    return "Use source image only as a private capture reference; crop wrapper front/back/side regions separately and OCR only if ingredient or nutrition text is readable.";
  }
  return "Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.";
}

function imageMapKeys(row = {}) {
  return [
    row.evidence_id,
    `${row.product_id}:${row.evidence_id}`,
    row.source_url,
    row.image_reference,
  ].filter(Boolean).join(";");
}

function queueRow(candidate = {}) {
  const id = evidenceId(candidate);
  const imageReference = candidate.source_image_url || "";
  const row = {
    run_id: runId,
    product_id: candidate.product_id,
    product_name: candidate.product_name,
    brand: "",
    category: "candy",
    corpus_scope: "confection_wrapper_item_candidate",
    vintage_label: candidate.claimed_date_text || candidate.claimed_decade || "item page candidate",
    version_id: candidate.candidate_id,
    evidence_id: id,
    evidence_kind: candidate.candidate_type,
    source_domain: candidate.source_domain || "www.candywrapperarchive.com",
    source_url: candidate.item_url,
    source_title: candidate.item_title,
    source_owner: "Candy Wrapper Archive",
    panel_acquisition_state: "item_page_panel_readability_triage",
    ocr_priority: ocrPriority(candidate),
    ocr_gap_category: "source_page_capture_needed",
    ocr_access_state: imageReference ? "direct_image_reference_ready" : "source_page_capture_needed",
    ocr_recommended_action: ocrRecommendedAction(candidate),
    registry_priority: candidate.candidate_priority_score || 0,
    promotion_blocker: "Item page and wrapper photo are not ingredient proof. Ingredient claims require readable panel OCR, corrected transcription, reviewer attribution, and manual verification.",
    ground_truth_fields_missing: "photo_role; panel_readability; private_crop_path; ocr_lines; corrected_text; reviewer; manual_verified",
    image_reference: imageReference,
    ingredient_panel_visible: "",
    nutrition_panel_visible: "",
    net_weight_visible: "",
    capture_strategy: captureStrategy(candidate),
    crop_target: cropTarget(candidate),
    ocr_expected_surface: "package_identity_then_panel_hunt",
    private_image_map_keys: "",
    rights_review_status: candidate.rights_review_status || "rights_review_needed",
    allowed_public_output: "source receipt, panel-readability status, hashes, OCR status; no public image reuse and no unverified ingredient claims",
    candidate_only: 1,
    manual_verified: 0,
    parent_item_candidate_id: candidate.candidate_id,
    parent_capture_evidence_id: candidate.parent_capture_evidence_id,
    claimed_date_text: candidate.claimed_date_text || "",
    claimed_year: candidate.claimed_year || "",
    claimed_decade: candidate.claimed_decade || "",
    thumbnail_url: candidate.thumbnail_url || "",
    publication_image_policy: candidate.publication_image_policy || "source_link_only_no_public_image",
  };
  row.private_image_map_keys = imageMapKeys(row);
  return row;
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

function buildRows(itemManifest = {}) {
  return (itemManifest.candidates || []).map(queueRow).sort((a, b) => (
    Number(b.registry_priority || 0) - Number(a.registry_priority || 0)
    || a.product_name.localeCompare(b.product_name)
    || a.source_title.localeCompare(b.source_title)
  ));
}

function buildManifest(rows, itemManifest = {}) {
  const count = (predicate) => rows.filter(predicate).length;
  return {
    schema_version: "confection_wrapper_item_panel_triage.v1",
    generated_at: generatedAt,
    run_id: runId,
    source_item_candidates: itemManifest.artifacts?.item_candidates_json || publicArtifactRef(itemCandidatePath),
    selection_policy: {
      scope: "Panel-readability triage queue for item-level Candy Wrapper Archive candidates.",
      compatible_with: "scripts/build-spark-ocr-packets.js and scripts/capture-ingredient-ocr-assets.js via queue CSV.",
      direct_image_policy: "Direct archive image URLs are private capture references only and are not committed or embedded.",
      ingredient_gate: "OCR is allowed only after reviewer confirms ingredient, nutrition, or useful package text is readable.",
    },
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      external_images_committed: false,
      direct_image_urls_are_link_references_only: true,
      manual_verified_created: false,
    },
    totals: {
      triage_rows: rows.length,
      products: new Set(rows.map((row) => row.product_id)).size,
      high_priority_rows: count((row) => row.ocr_priority === "high"),
      direct_image_reference_rows: count((row) => row.image_reference),
      source_page_capture_rows: count((row) => !row.image_reference),
      item_page_rows: count((row) => row.evidence_kind === "existing_item_page_candidate"),
      collection_item_rows: count((row) => row.evidence_kind === "collection_item_candidate"),
    },
    priority_counts: countBy(rows, "ocr_priority"),
    product_counts: countBy(rows, "product_name"),
    capture_strategy_counts: countBy(rows, "capture_strategy"),
    first_rows: rows.slice(0, 16),
    artifacts: {
      triage_json: publicArtifactRef(triageJsonPath),
      queue_csv: publicArtifactRef(triageQueueCsvPath),
      image_map_template_csv: publicArtifactRef(imageMapTemplateCsvPath),
      runbook_markdown: publicArtifactRef(triageRunbookPath),
    },
    rows,
  };
}

function renderRunbook(manifest = {}) {
  const lines = [
    "# Confection Wrapper Item Panel Triage",
    "",
    `Generated: ${manifest.generated_at}`,
    `Run ID: ${manifest.run_id}`,
    "",
    "This queue turns item-level Candy Wrapper Archive candidates into private capture/OCR work. It remains public-safe: URLs are source references, private paths stay blank, and no ingredient text is verified.",
    "",
    "## Rules",
    "",
    "- Capture item pages or source images privately only.",
    "- Treat direct image URLs as private capture references, not public embeds.",
    "- Classify wrapper front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility before OCR.",
    "- Run OCR only on readable ingredient, nutrition, net-weight, maker, or useful package text surfaces.",
    "- Do not promote ingredient claims without corrected transcription, reviewer attribution, and manual verification.",
    "",
    "## Operator Flow",
    "",
    "1. Start with high-priority item rows.",
    "2. Capture item page and/or source image under `.cache/ingredient-ocr/runs/<run-id>/`.",
    "3. Fill a private copy of the image-map template with local crop paths.",
    "4. Run native OCR against that private image map.",
    "5. Keep OCR output candidate-only until manual correction and review.",
    "",
    "## First Rows",
    "",
  ];
  for (const row of manifest.first_rows.slice(0, 12)) {
    lines.push(`- ${row.product_name}: ${row.source_title}; ${row.source_url}; ${row.ocr_recommended_action}`);
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function writeTriage() {
  const itemManifest = readJson(itemCandidatePath, {});
  const rows = buildRows(itemManifest);
  const manifest = buildManifest(rows, itemManifest);
  const summary = readJson(summaryPath, {});
  summary.confection_wrapper_item_panel_triage_summary = {
    generated_at: manifest.generated_at,
    run_id: manifest.run_id,
    source_item_candidates: manifest.source_item_candidates,
    selection_policy: manifest.selection_policy,
    public_safety: manifest.public_safety,
    totals: manifest.totals,
    priority_counts: manifest.priority_counts,
    product_counts: manifest.product_counts,
    capture_strategy_counts: manifest.capture_strategy_counts,
    first_rows: manifest.first_rows.slice(0, 8),
    artifacts: manifest.artifacts,
  };

  writeJson(triageJsonPath, manifest);
  writeCsv(triageQueueCsvPath, [
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
    "parent_item_candidate_id",
    "parent_capture_evidence_id",
    "claimed_date_text",
    "claimed_year",
    "claimed_decade",
    "thumbnail_url",
    "publication_image_policy",
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
  fs.mkdirSync(path.dirname(triageRunbookPath), { recursive: true });
  fs.writeFileSync(triageRunbookPath, renderRunbook(manifest));
  writeJson(summaryPath, summary);
  return manifest;
}

function main() {
  const manifest = writeTriage();
  console.log(JSON.stringify({
    run_id: manifest.run_id,
    triage_rows: manifest.totals.triage_rows,
    high_priority_rows: manifest.totals.high_priority_rows,
    direct_image_reference_rows: manifest.totals.direct_image_reference_rows,
    queue_csv: manifest.artifacts.queue_csv,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildManifest,
  buildRows,
  queueRow,
  writeTriage,
};
