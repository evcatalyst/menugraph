const fs = require("fs");
const path = require("path");
const {
  argValue,
  generatedAt,
  normalizeText,
  parseCsv,
  pathFromArg,
  publicArtifactRef,
  readJson,
  summaryPath: defaultSiteSummaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const defaultNavigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const defaultManifestPath = path.join(root, "docs/data/product-evidence/public_photo_proof_manifest.json");
const defaultQueuePath = path.join(root, "docs/data/product-evidence/exports/public_photo_ocr_intake_queue.csv");
const defaultRunbookPath = path.join(root, "docs/data/product-evidence/exports/public_photo_ocr_runbook.md");
const defaultSummaryPath = path.join(root, "docs/data/product-evidence/public_photo_ocr_summary.json");
const defaultCaptureCsvPath = path.join(root, "docs/data/product-evidence/exports/public_photo_ocr_capture_summary.csv");
const defaultOcrCsvPath = path.join(root, "docs/data/product-evidence/exports/public_photo_native_ocr_summary.csv");
const defaultImageMapTemplatePath = path.join(root, "docs/data/product-evidence/exports/public_photo_ocr_image_map_template.csv");

function readCsvIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8");
  return normalizeText(text) ? parseCsv(text) : [];
}

function evidenceSourceUrl(evidence = {}) {
  return normalizeText(evidence.source_photo_url || evidence.url || evidence.source_url || evidence.archive_url);
}

function sourceHost(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch (_error) {
    return normalizeText(value).replace(/^https?:\/\//, "").split("/")[0];
  }
}

function directImageReference(publishedImage = {}) {
  const publicImageUrl = publishedImage.public_image_url || "";
  if (/\.(jpe?g|png|webp|gif|tiff?|heic)(\?|$)/i.test(publicImageUrl)) return publicImageUrl;
  return publishedImage.thumbnail_url || publicImageUrl;
}

function navigatorIndex(navigatorData) {
  const byProductEvidenceId = new Map();
  const byEvidenceId = new Map();
  for (const product of navigatorData.products || []) {
    for (const evidence of product.evidence || []) {
      const value = { product, evidence };
      byProductEvidenceId.set(`${product.id}:${evidence.id}`, value);
      byEvidenceId.set(evidence.id, value);
    }
  }
  return { byProductEvidenceId, byEvidenceId };
}

function versionLabelsFor(product, evidenceId) {
  return (product.versions || [])
    .filter((version) => (version.evidence_ids || []).includes(evidenceId))
    .map((version) => version.label || version.vintage)
    .filter(Boolean)
    .join("; ");
}

function primaryDocumentSignal(evidence = {}, publishedImage = {}) {
  const text = [
    evidence.title,
    evidence.url,
    evidence.source_url,
    publishedImage.source_title,
    publishedImage.source_url,
    publishedImage.public_image_url,
    publishedImage.thumbnail_url,
  ].join(" ").toLowerCase();
  return /ingredient guide|product ingredient|nutrition guide|nutrition facts|allergen|smartlabel|\.pdf\b|pdf$/.test(text);
}

function panelSignal(evidence = {}, publishedImage = {}) {
  if (evidence.visible_extract) return true;
  if (primaryDocumentSignal(evidence, publishedImage)) return true;
  const state = String(evidence.label_panel_state || "").toLowerCase();
  if (/not verified|not reviewed|not readable|front package|object visible/.test(state)) return false;
  return /ingredient panel visible|nutrition panel visible|label text candidate|readable ingredient|readable nutrition|partial package text|wrapper text/.test(state);
}

function primaryProofLane(evidence = {}, publishedImage = {}) {
  return panelSignal(evidence, publishedImage) ? "primary_ingredient_panel" : "secondary_product_context";
}

function expectedSurface(evidence = {}, publishedImage = {}) {
  if (primaryDocumentSignal(evidence, publishedImage)) {
    return "ingredient/nutrition document text if visible";
  }
  if (/ingredient/i.test(`${evidence.label_panel_state || ""} ${evidence.photo_role || ""}`) && panelSignal(evidence, publishedImage)) {
    return "ingredient panel or ingredient text if visible";
  }
  if (/nutrition/i.test(`${evidence.label_panel_state || ""} ${evidence.photo_role || ""}`) && panelSignal(evidence, publishedImage)) {
    return "nutrition panel text if visible";
  }
  if (/menu|document|pdf/i.test(`${evidence.kind || ""} ${evidence.photo_role || ""}`) && primaryDocumentSignal(evidence, publishedImage)) {
    return "document text or menu/nutrition disclosure";
  }
  return "package/front text and any visible label clues; ingredient panel not guaranteed";
}

function queuePriority(evidence = {}, publishedImage = {}) {
  if (/label_text_candidate|label_visible|manual_verified/.test(evidence.status || "")) return "high";
  if (panelSignal(evidence, publishedImage)) return "high";
  return "medium";
}

function gapCategory(evidence = {}, publishedImage = {}) {
  if (/label_text_candidate|label_visible|manual_verified/.test(evidence.status || "")) return "panel_capture_needed";
  if (primaryDocumentSignal(evidence, publishedImage)) return "document_text_pipeline_needed";
  if (panelSignal(evidence, publishedImage)) return "readable_panel_photo_needed";
  return "package_identity_review_needed";
}

function intakeRow(publishedImage, match) {
  const product = match?.product || {};
  const evidence = match?.evidence || {};
  const sourceUrl = publishedImage.source_url || evidenceSourceUrl(evidence);
  const publicImageUrl = publishedImage.public_image_url || "";
  const imageReference = directImageReference(publishedImage);
  return {
    product_id: publishedImage.product_id || product.id || "",
    product_name: publishedImage.product_name || product.name || "",
    brand: product.brand || "",
    category: product.category || "",
    vintage_label: versionLabelsFor(product, evidence.id) || publishedImage.claimed_product_date || evidence.date_basis_state || "",
    evidence_id: publishedImage.evidence_id || evidence.id || "",
    evidence_kind: evidence.kind || "public_photo_proof",
    source_domain: sourceHost(sourceUrl),
    source_url: sourceUrl,
    source_title: publishedImage.source_title || evidence.title || "",
    source_owner: publishedImage.source_owner || evidence.source || "",
    proof_lane: primaryProofLane(evidence, publishedImage),
    proof_lane_rank: panelSignal(evidence, publishedImage) ? 1 : 2,
    ocr_priority: queuePriority(evidence, publishedImage),
    ocr_gap_category: gapCategory(evidence, publishedImage),
    ocr_access_state: "external_image_reference_ready",
    ocr_recommended_action: panelSignal(evidence, publishedImage)
      ? "Download rights-cleared panel/document image into private cache, crop readable ingredient/nutrition surface first, run native OCR, and send candidate text to manual review."
      : "Download rights-cleared product image into private cache for broad OCR/identity context only; do not treat as ingredient proof unless OCR finds a readable panel signal.",
    registry_priority: panelSignal(evidence, publishedImage) ? 95 : 45,
    promotion_blocker: "OCR text is candidate-only; no ingredient claim promotion without manual verification metadata.",
    ground_truth_fields_missing: "ocr_lines; ingredient_panel_visibility; corrected_text; reviewer; manual_verified",
    image_reference: imageReference,
    public_image_url: publicImageUrl,
    thumbnail_url: publishedImage.thumbnail_url || publicImageUrl,
    image_display_policy: publishedImage.image_display_policy || "embed_rights_cleared",
    rights_status: publishedImage.rights_status || "",
    license_url: publishedImage.license_url || "",
    attribution_text: publishedImage.attribution_text || "",
    ingredient_panel_visible: /ingredient/i.test(`${evidence.label_panel_state || ""} ${evidence.photo_role || ""}`) ? "candidate" : "",
    nutrition_panel_visible: /nutrition/i.test(`${evidence.label_panel_state || ""} ${evidence.photo_role || ""}`) ? "candidate" : "",
    net_weight_visible: /net weight|net wt/i.test(`${evidence.label_panel_state || ""} ${evidence.photo_role || ""} ${evidence.quality_note || ""}`) ? "candidate" : "",
    capture_strategy: "direct_public_image_download",
    crop_target: panelSignal(evidence, publishedImage) ? "crop readable ingredient/nutrition/back-panel surface first" : "secondary context scan; crop only if OCR or reviewer sees ingredient/nutrition panel",
    ocr_expected_surface: expectedSurface(evidence, publishedImage),
    candidate_only: 1,
    manual_verified: 0,
  };
}

function summarizeCaptureRows(rows) {
  return {
    rows: rows.length,
    primary_ingredient_panel_rows: rows.filter((row) => row.proof_lane === "primary_ingredient_panel").length,
    secondary_product_context_rows: rows.filter((row) => row.proof_lane === "secondary_product_context").length,
    ready_for_ocr: rows.filter((row) => Number(row.ready_for_ocr)).length,
    primary_ready_for_ocr: rows.filter((row) => row.proof_lane === "primary_ingredient_panel" && Number(row.ready_for_ocr)).length,
    secondary_ready_for_ocr: rows.filter((row) => row.proof_lane === "secondary_product_context" && Number(row.ready_for_ocr)).length,
    downloaded_direct_image: rows.filter((row) => row.capture_status === "downloaded_direct_image").length,
    download_planned: rows.filter((row) => row.capture_status === "direct_image_download_planned").length,
    blocked_no_network: rows.filter((row) => row.capture_status === "source_page_capture_blocked_no_network").length,
    direct_image_download_failed: rows.filter((row) => row.capture_status === "direct_image_download_failed").length,
  };
}

function summarizeOcrRows(rows) {
  return {
    rows: rows.length,
    primary_ingredient_panel_rows: rows.filter((row) => row.proof_lane === "primary_ingredient_panel").length,
    secondary_product_context_rows: rows.filter((row) => row.proof_lane === "secondary_product_context").length,
    ocr_planned: rows.filter((row) => row.ocr_status === "ocr_planned").length,
    ocr_attempted: rows.filter((row) => row.ocr_status === "ocr_succeeded" || row.ocr_status === "ocr_failed").length,
    ocr_succeeded: rows.filter((row) => row.ocr_status === "ocr_succeeded").length,
    primary_ocr_succeeded: rows.filter((row) => row.proof_lane === "primary_ingredient_panel" && row.ocr_status === "ocr_succeeded").length,
    secondary_ocr_succeeded: rows.filter((row) => row.proof_lane === "secondary_product_context" && row.ocr_status === "ocr_succeeded").length,
    ocr_failed: rows.filter((row) => row.ocr_status === "ocr_failed").length,
    vision_runtime_nil_error: rows.filter((row) => row.failure_reason === "vision_runtime_nil_error").length,
    vision_pixel_buffer_failure: rows.filter((row) => row.failure_reason === "vision_pixel_buffer_failure").length,
    no_private_image_map_entry: rows.filter((row) => row.failure_reason === "no_private_image_map_entry").length,
    ocr_skipped_no_image: rows.filter((row) => row.ocr_status === "ocr_skipped_no_image").length,
    ingredient_signal_found: rows.filter((row) => Number(row.ingredient_signal_found)).length,
    primary_ingredient_signal_found: rows.filter((row) => row.proof_lane === "primary_ingredient_panel" && Number(row.ingredient_signal_found)).length,
    secondary_ingredient_signal_found: rows.filter((row) => row.proof_lane === "secondary_product_context" && Number(row.ingredient_signal_found)).length,
    private_image_present: rows.filter((row) => Number(row.private_image_present)).length,
  };
}

function queueHeaders() {
  return [
    "product_id",
    "product_name",
    "brand",
    "category",
    "vintage_label",
    "evidence_id",
    "evidence_kind",
    "source_domain",
    "source_url",
    "source_title",
    "source_owner",
    "proof_lane",
    "proof_lane_rank",
    "ocr_priority",
    "ocr_gap_category",
    "ocr_access_state",
    "ocr_recommended_action",
    "registry_priority",
    "promotion_blocker",
    "ground_truth_fields_missing",
    "image_reference",
    "public_image_url",
    "thumbnail_url",
    "image_display_policy",
    "rights_status",
    "license_url",
    "attribution_text",
    "ingredient_panel_visible",
    "nutrition_panel_visible",
    "net_weight_visible",
    "capture_strategy",
    "crop_target",
    "ocr_expected_surface",
    "candidate_only",
    "manual_verified",
  ];
}

function markdownRunbook(summary) {
  return [
    "# Public Photo OCR Intake",
    "",
    `Generated: ${summary.generated_at}`,
    "",
    "This queue converts rights-cleared public photo proof into a private OCR run. It does not publish OCR text and cannot create verified ingredient claims.",
    "",
    `- Queue rows: ${summary.queue_rows}`,
    `- Products: ${summary.product_count}`,
    `- Public photos: ${summary.public_photo_count}`,
    `- Primary ingredient-panel rows: ${summary.primary_ingredient_panel_rows}`,
    `- Secondary product-context rows: ${summary.secondary_product_context_rows}`,
    `- High-priority panel/text candidates: ${summary.high_priority_rows}`,
    `- Capture ready rows: ${summary.capture.ready_for_ocr}`,
    `- OCR succeeded rows: ${summary.ocr.ocr_succeeded}`,
    `- Ingredient-signal rows: ${summary.ocr.ingredient_signal_found}`,
    "",
    "Suggested run:",
    "",
    "```sh",
    "node scripts/capture-ingredient-ocr-assets.js --run-id=public-photo-ocr-v1 --queue=docs/data/product-evidence/exports/public_photo_ocr_intake_queue.csv --limit=31 --public-run-summary=docs/data/product-evidence/exports/public_photo_ocr_capture_summary.csv --public-image-map-template=docs/data/product-evidence/exports/public_photo_ocr_image_map_template.csv",
    "node scripts/run-ingredient-ocr.js --run-id=public-photo-ocr-v1 --run-dir=<private-run-dir> --queue=docs/data/product-evidence/exports/public_photo_ocr_intake_queue.csv --limit=31 --image-map=<private-run-dir>/image-map.json --public-ocr-summary=docs/data/product-evidence/exports/public_photo_native_ocr_summary.csv",
    "node scripts/build-public-photo-ocr-intake.js",
    "```",
    "",
    "Public artifacts contain counts, hashes, statuses, and source identifiers only. Private images and OCR text stay in the local private run directory.",
    "",
  ].join("\n");
}

function buildPublicPhotoOcrIntake({
  navigatorData,
  publicPhotoManifest,
  captureRows = [],
  ocrRows = [],
  queuePath = defaultQueuePath,
  runbookPath = defaultRunbookPath,
  captureCsvPath = defaultCaptureCsvPath,
  ocrCsvPath = defaultOcrCsvPath,
  imageMapTemplatePath = defaultImageMapTemplatePath,
}) {
  const index = navigatorIndex(navigatorData);
  const publishedImages = (publicPhotoManifest.published_images || [])
    .filter((row) => row.image_display_policy === "embed_rights_cleared" && row.public_image_url);
  const rows = publishedImages.map((publishedImage) => {
    const match = index.byProductEvidenceId.get(`${publishedImage.product_id}:${publishedImage.evidence_id}`)
      || index.byEvidenceId.get(publishedImage.evidence_id)
      || {};
    return intakeRow(publishedImage, match);
  }).sort((a, b) => (
    Number(a.proof_lane_rank || 9) - Number(b.proof_lane_rank || 9)
    || String(a.product_name).localeCompare(String(b.product_name))
    || String(a.evidence_id).localeCompare(String(b.evidence_id))
  ));
  const productCount = new Set(rows.map((row) => row.product_id).filter(Boolean)).size;
  const summary = {
    schema_version: "public_photo_ocr_summary.v1",
    generated_at: generatedAt,
    queue_rows: rows.length,
    product_count: productCount,
    public_photo_count: publishedImages.length,
    primary_ingredient_panel_rows: rows.filter((row) => row.proof_lane === "primary_ingredient_panel").length,
    secondary_product_context_rows: rows.filter((row) => row.proof_lane === "secondary_product_context").length,
    high_priority_rows: rows.filter((row) => row.ocr_priority === "high").length,
    medium_priority_rows: rows.filter((row) => row.ocr_priority === "medium").length,
    low_priority_rows: rows.filter((row) => row.ocr_priority === "low").length,
    capture: summarizeCaptureRows(captureRows),
    ocr: summarizeOcrRows(ocrRows),
    public_safety: {
      source: "public_photo_proof_manifest.embed_rights_cleared rows",
      private_images_committed: false,
      ocr_text_committed: false,
      ingredient_claims_verified: false,
      candidate_only: true,
      manual_verified_created: false,
    },
    public_artifacts: {
      queue_csv: publicArtifactRef(queuePath),
      runbook_md: publicArtifactRef(runbookPath),
      capture_summary_csv: publicArtifactRef(captureCsvPath),
      ocr_summary_csv: publicArtifactRef(ocrCsvPath),
      image_map_template_csv: publicArtifactRef(imageMapTemplatePath),
    },
  };
  return { rows, summary };
}

function main() {
  const navigatorPath = pathFromArg("navigator", defaultNavigatorPath);
  const manifestPath = pathFromArg("manifest", defaultManifestPath);
  const queuePath = pathFromArg("queue", defaultQueuePath);
  const runbookPath = pathFromArg("runbook", defaultRunbookPath);
  const summaryPath = pathFromArg("summary", defaultSummaryPath);
  const siteSummaryPath = pathFromArg("site-summary", defaultSiteSummaryPath);
  const captureCsvPath = pathFromArg("capture-csv", defaultCaptureCsvPath);
  const ocrCsvPath = pathFromArg("ocr-csv", defaultOcrCsvPath);
  const imageMapTemplatePath = pathFromArg("image-map-template", defaultImageMapTemplatePath);
  const result = buildPublicPhotoOcrIntake({
    navigatorData: readJson(navigatorPath, {}),
    publicPhotoManifest: readJson(manifestPath, {}),
    captureRows: readCsvIfPresent(captureCsvPath),
    ocrRows: readCsvIfPresent(ocrCsvPath),
    queuePath,
    runbookPath,
    captureCsvPath,
    ocrCsvPath,
    imageMapTemplatePath,
  });
  writeCsv(queuePath, queueHeaders(), result.rows);
  fs.mkdirSync(path.dirname(runbookPath), { recursive: true });
  fs.writeFileSync(runbookPath, `${markdownRunbook(result.summary)}\n`);
  writeJson(summaryPath, result.summary);
  const siteSummary = readJson(siteSummaryPath, {});
  siteSummary.public_photo_ocr_summary = result.summary;
  writeJson(siteSummaryPath, siteSummary);
  console.log(JSON.stringify({
    queue_rows: result.summary.queue_rows,
    product_count: result.summary.product_count,
    public_photo_count: result.summary.public_photo_count,
    ocr_succeeded: result.summary.ocr.ocr_succeeded,
    ingredient_signal_found: result.summary.ocr.ingredient_signal_found,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildPublicPhotoOcrIntake,
  expectedSurface,
  intakeRow,
  queueHeaders,
};
