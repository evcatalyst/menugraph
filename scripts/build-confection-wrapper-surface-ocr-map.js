const fs = require("fs");
const path = require("path");
const {
  argValue,
  countBy,
  generatedAt,
  parseCsv,
  publicArtifactRef,
  readJson,
  shortHash,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");
const {
  publicAuditRows,
  summarizeAudit,
} = require("./audit-image-map-template");

const root = path.join(__dirname, "..");
const captureWorksheetPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_capture_worksheet.csv");
const surfaceQueuePath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_surface_ocr_queue.csv");
const surfaceTemplatePath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_surface_image_map_template.csv");
const surfaceAuditCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_surface_image_map_audit.csv");
const surfaceAuditJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_surface_image_map_audit.json");
const surfaceManifestPath = path.join(root, "docs/data/product-evidence/confection_wrapper_surface_ocr_map.json");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_surface_ocr_runbook.md");

const surfaces = [
  {
    surface_id: "ingredient_panel",
    label: "Ingredient panel",
    path_field: "private_ingredient_panel_crop_path",
    proof_lane: "primary_ingredient_panel",
    proof_lane_rank: 1,
    ocr_gap_category: "panel_capture_needed",
    ocr_priority: "high",
    ocr_expected_surface: "ingredient_panel",
    ocr_eligible: 1,
    capture_strategy: "private_ingredient_panel_crop",
    crop_target: "Crop the ingredient statement with enough package context to preserve product/date cues.",
  },
  {
    surface_id: "nutrition_panel",
    label: "Nutrition panel",
    path_field: "private_nutrition_panel_crop_path",
    proof_lane: "primary_nutrition_panel",
    proof_lane_rank: 2,
    ocr_gap_category: "panel_capture_needed",
    ocr_priority: "high",
    ocr_expected_surface: "nutrition_panel",
    ocr_eligible: 1,
    capture_strategy: "private_nutrition_panel_crop",
    crop_target: "Crop the nutrition panel and serving-size text if visible.",
  },
  {
    surface_id: "wrapper_back_or_side",
    label: "Wrapper back or side text",
    path_field: "private_wrapper_back_or_side_crop_path",
    proof_lane: "support_package_text",
    proof_lane_rank: 3,
    ocr_gap_category: "readable_panel_photo_needed",
    ocr_priority: "medium",
    ocr_expected_surface: "package_back_side_text",
    ocr_eligible: 1,
    capture_strategy: "private_back_or_side_text_crop",
    crop_target: "Crop readable wrapper back/side text, prioritizing ingredients, nutrition, net weight, maker, or date cues.",
  },
  {
    surface_id: "net_weight",
    label: "Net weight",
    path_field: "private_net_weight_crop_path",
    proof_lane: "support_package_text",
    proof_lane_rank: 4,
    ocr_gap_category: "readable_panel_photo_needed",
    ocr_priority: "medium",
    ocr_expected_surface: "net_weight",
    ocr_eligible: 1,
    capture_strategy: "private_net_weight_crop",
    crop_target: "Crop net weight and package-size text.",
  },
  {
    surface_id: "maker_or_date",
    label: "Maker or date cue",
    path_field: "private_maker_or_date_crop_path",
    proof_lane: "support_package_text",
    proof_lane_rank: 5,
    ocr_gap_category: "readable_panel_photo_needed",
    ocr_priority: "medium",
    ocr_expected_surface: "maker_distributor_or_date_cue",
    ocr_eligible: 1,
    capture_strategy: "private_maker_or_date_crop",
    crop_target: "Crop maker/distributor, copyright, lot, or date cue text.",
  },
  {
    surface_id: "wrapper_front_context",
    label: "Wrapper front context",
    path_field: "private_wrapper_front_crop_path",
    proof_lane: "secondary_product_context",
    proof_lane_rank: 6,
    ocr_gap_category: "secondary_context_only",
    ocr_priority: "low",
    ocr_expected_surface: "package_identity_context",
    ocr_eligible: 0,
    capture_strategy: "private_wrapper_front_context_crop",
    crop_target: "Capture wrapper front only as product/package context after text surfaces are handled.",
  },
];

function privatePath(row = {}, surface = {}) {
  return String(row[surface.path_field] || "").trim();
}

function surfaceEvidenceId(row = {}, surface = {}) {
  return `cwa_surface_${shortHash(`${row.capture_id}:${surface.surface_id}`, 14)}`;
}

function imageMapKeys(row = {}, surface = {}, evidenceId = "") {
  return [
    evidenceId,
    `${row.product_id}:${evidenceId}`,
    `${row.capture_id}:${surface.surface_id}`,
    `${row.source_url}#${surface.surface_id}`,
  ].filter(Boolean).join(";");
}

function surfaceRow(row = {}, surface = {}) {
  const evidenceId = surfaceEvidenceId(row, surface);
  const localPrivatePath = privatePath(row, surface);
  return {
    run_id: row.run_id,
    evidence_id: evidenceId,
    product_id: row.product_id,
    product_name: row.product_name,
    brand: "",
    category: "candy",
    corpus_scope: "confection_wrapper_capture_round",
    vintage_label: row.vintage_label,
    version_id: row.capture_id,
    evidence_kind: "cwa_private_capture_surface",
    source_domain: row.source_domain,
    source_url: row.source_url,
    source_title: `${row.source_title || row.product_name} - ${surface.label}`,
    source_owner: "Candy Wrapper Archive",
    source_type: row.source_type,
    source_capture_id: row.capture_id,
    review_id: row.review_id,
    batch_id: row.batch_id,
    batch_rank: row.batch_rank,
    surface_id: surface.surface_id,
    surface_label: surface.label,
    surface_role: surface.ocr_eligible ? "ocr_text_surface" : "secondary_context_surface",
    capture_path_field: surface.path_field,
    proof_lane: surface.proof_lane,
    proof_lane_rank: surface.proof_lane_rank,
    panel_acquisition_state: surface.ocr_eligible ? "private_crop_needed" : "secondary_context_capture_optional",
    ocr_priority: surface.ocr_priority,
    ocr_gap_category: surface.ocr_gap_category,
    ocr_access_state: localPrivatePath ? "local_image_ready" : "private_crop_path_needed",
    ocr_recommended_action: surface.ocr_eligible
      ? "Fill the private crop path after capture; build private image-map input; run native OCR only if the text is readable."
      : "Capture only as package context; do not route wrapper-front context to OCR unless a reviewer promotes visible text.",
    registry_priority: row.capture_priority_score,
    promotion_blocker: "Candidate-only: surface crop must be OCRed/transcribed and manually verified before any ingredient claim.",
    ground_truth_fields_missing: "private_surface_crop_path; ocr_lines; corrected_text; reviewer; manual_verified",
    image_reference: "",
    ingredient_panel_visible: surface.surface_id === "ingredient_panel" ? "needs_review" : "",
    nutrition_panel_visible: surface.surface_id === "nutrition_panel" ? "needs_review" : "",
    net_weight_visible: surface.surface_id === "net_weight" ? "needs_review" : "",
    capture_strategy: surface.capture_strategy,
    crop_target: surface.crop_target,
    ocr_expected_surface: surface.ocr_expected_surface,
    image_map_keys: imageMapKeys(row, surface, evidenceId),
    private_image_map_keys: imageMapKeys(row, surface, evidenceId),
    local_private_image_path: localPrivatePath,
    processed_private_image_path: "",
    panel_crop_note: "",
    ocr_eligible: surface.ocr_eligible,
    rights_review_status: row.rights_review_status || "rights_review_needed",
    publication_image_policy: row.publication_image_policy || "source_link_only_no_public_image",
    allowed_public_output: "source receipt, public hashes/status only; no private paths, images, OCR text, or verified ingredient claims",
    candidate_only: 1,
    manual_verified: 0,
  };
}

function buildSurfaceRows(captureRows = []) {
  return captureRows.flatMap((row) => surfaces.map((surface) => surfaceRow(row, surface)));
}

function queueRows(surfaceRows = []) {
  return surfaceRows.filter((row) => Number(row.ocr_eligible)).map((row) => ({
    product_id: row.product_id,
    product_name: row.product_name,
    brand: row.brand,
    category: row.category,
    corpus_scope: row.corpus_scope,
    vintage_label: row.vintage_label,
    version_id: row.version_id,
    evidence_id: row.evidence_id,
    evidence_kind: row.evidence_kind,
    source_domain: row.source_domain,
    source_url: row.source_url,
    source_title: row.source_title,
    source_owner: row.source_owner,
    surface_id: row.surface_id,
    surface_label: row.surface_label,
    surface_role: row.surface_role,
    capture_path_field: row.capture_path_field,
    proof_lane: row.proof_lane,
    proof_lane_rank: row.proof_lane_rank,
    panel_acquisition_state: row.panel_acquisition_state,
    ocr_priority: row.ocr_priority,
    ocr_gap_category: row.ocr_gap_category,
    ocr_access_state: row.ocr_access_state,
    ocr_recommended_action: row.ocr_recommended_action,
    registry_priority: row.registry_priority,
    promotion_blocker: row.promotion_blocker,
    ground_truth_fields_missing: row.ground_truth_fields_missing,
    image_reference: "",
    ingredient_panel_visible: row.ingredient_panel_visible,
    nutrition_panel_visible: row.nutrition_panel_visible,
    net_weight_visible: row.net_weight_visible,
    capture_strategy: row.capture_strategy,
    crop_target: row.crop_target,
    ocr_expected_surface: row.ocr_expected_surface,
    private_image_map_keys: row.private_image_map_keys,
    rights_review_status: row.rights_review_status,
    allowed_public_output: row.allowed_public_output,
    candidate_only: 1,
    manual_verified: 0,
  }));
}

function manifestFor({ runId, captureRows, surfaceRows, ocrRows, auditSummary }) {
  return {
    schema_version: "confection_wrapper_surface_ocr_map.v1",
    generated_at: generatedAt,
    run_id: runId,
    source_capture_worksheet: publicArtifactRef(captureWorksheetPath),
    surface_policy: {
      primary_surfaces: "ingredient_panel; nutrition_panel; wrapper_back_or_side; net_weight; maker_or_date",
      secondary_surfaces: "wrapper_front_context",
      ocr_gate: "Only OCR text-eligible private crop surfaces; wrapper-front context is excluded from the OCR queue by default.",
      publication_gate: "Do not publish external images, private crop paths, OCR text, or verified claims from this template.",
    },
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      images_committed: false,
      ocr_text_committed: false,
      manual_verified_created: false,
    },
    totals: {
      capture_rows: captureRows.length,
      surface_template_rows: surfaceRows.length,
      ocr_queue_rows: ocrRows.length,
      primary_ingredient_panel_rows: ocrRows.filter((row) => row.proof_lane === "primary_ingredient_panel").length,
      primary_nutrition_panel_rows: ocrRows.filter((row) => row.proof_lane === "primary_nutrition_panel").length,
      support_text_rows: ocrRows.filter((row) => row.proof_lane === "support_package_text").length,
      secondary_context_rows: surfaceRows.filter((row) => row.proof_lane === "secondary_product_context").length,
      ready_for_capture: auditSummary.ready_for_capture,
      no_private_path_supplied: auditSummary.no_private_path_supplied,
      private_paths_supplied: auditSummary.private_paths_supplied,
    },
    by_surface: countBy(surfaceRows, "surface_id"),
    by_product: countBy(surfaceRows, "product_name"),
    first_rows: surfaceRows.slice(0, 12).map((row) => ({
      evidence_id: row.evidence_id,
      product_name: row.product_name,
      vintage_label: row.vintage_label,
      surface_id: row.surface_id,
      proof_lane: row.proof_lane,
      ocr_eligible: row.ocr_eligible,
      source_url: row.source_url,
      crop_target: row.crop_target,
      ocr_recommended_action: row.ocr_recommended_action,
    })),
    artifacts: {
      surface_ocr_map_json: publicArtifactRef(surfaceManifestPath),
      surface_ocr_queue_csv: publicArtifactRef(surfaceQueuePath),
      surface_image_map_template_csv: publicArtifactRef(surfaceTemplatePath),
      surface_image_map_audit_csv: publicArtifactRef(surfaceAuditCsvPath),
      surface_image_map_audit_json: publicArtifactRef(surfaceAuditJsonPath),
      surface_ocr_runbook_md: publicArtifactRef(runbookPath),
    },
  };
}

function renderRunbook(manifest = {}) {
  const lines = [
    "# Candy Wrapper Archive Surface OCR Map",
    "",
    `Generated: ${manifest.generated_at}`,
    `Run ID: ${manifest.run_id}`,
    "",
    "This artifact converts the CWA private capture worksheet into surface-level OCR rows and a matching image-map template. It is public-safe: private paths are blank in committed artifacts.",
    "",
    "## Surface Order",
    "",
    "1. Ingredient panel",
    "2. Nutrition panel",
    "3. Wrapper back/side text",
    "4. Net weight",
    "5. Maker/distributor/date cue",
    "6. Wrapper front context, excluded from OCR by default",
    "",
    "## Operator Flow",
    "",
    "1. Fill private crop paths in the surface image-map template after capture.",
    "2. Run `node scripts/build-image-map-from-template.js --template=<private-template.csv> --output=<run-dir>/image-map.json`.",
    "3. Run native OCR with `node scripts/run-ingredient-ocr.js --queue=docs/data/product-evidence/exports/confection_wrapper_surface_ocr_queue.csv --run-id=cwa-surface-ocr-v1 --image-map=<run-dir>/image-map.json`.",
    "4. Keep OCR text candidate-only until corrected and manually verified.",
    "",
    "## Totals",
    "",
    `- Capture rows: ${manifest.totals.capture_rows}`,
    `- Surface template rows: ${manifest.totals.surface_template_rows}`,
    `- OCR queue rows: ${manifest.totals.ocr_queue_rows}`,
    `- Ready for capture now: ${manifest.totals.ready_for_capture}`,
    "",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

function writeSurfaceOcrMap({ runId = "cwa-surface-ocr-v1" } = {}) {
  const captureRows = fs.existsSync(captureWorksheetPath)
    ? parseCsv(fs.readFileSync(captureWorksheetPath, "utf8"))
    : [];
  const surfaceRows = buildSurfaceRows(captureRows);
  const ocrRows = queueRows(surfaceRows);
  const auditRows = publicAuditRows(surfaceRows);
  const auditSummary = summarizeAudit(runId, auditRows, {
    publicAuditCsvRef: publicArtifactRef(surfaceAuditCsvPath),
    publicAuditJsonRef: publicArtifactRef(surfaceAuditJsonPath),
  });
  const manifest = manifestFor({ runId, captureRows, surfaceRows, ocrRows, auditSummary });

  writeCsv(surfaceTemplatePath, [
    "run_id",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_type",
    "source_capture_id",
    "surface_id",
    "surface_label",
    "surface_role",
    "capture_path_field",
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
    "ocr_eligible",
    "rights_review_status",
    "publication_image_policy",
    "candidate_only",
    "manual_verified",
  ], surfaceRows);
  writeCsv(surfaceQueuePath, [
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
    "surface_id",
    "surface_label",
    "surface_role",
    "capture_path_field",
    "proof_lane",
    "proof_lane_rank",
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
  ], ocrRows);
  writeCsv(surfaceAuditCsvPath, [
    "run_id",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_type",
    "ocr_gap_category",
    "ocr_priority",
    "capture_strategy",
    "key_count",
    "private_path_supplied",
    "private_path_exists",
    "extension_ok",
    "audit_status",
    "recommended_next_action",
    "candidate_only",
    "manual_verified",
  ], auditRows);
  writeJson(surfaceAuditJsonPath, auditSummary);
  writeJson(surfaceManifestPath, { ...manifest, audit_summary: auditSummary });
  fs.mkdirSync(path.dirname(runbookPath), { recursive: true });
  fs.writeFileSync(runbookPath, renderRunbook(manifest));

  const summary = readJson(summaryPath, {});
  summary.confection_wrapper_surface_ocr_summary = {
    schema_version: manifest.schema_version,
    generated_at: manifest.generated_at,
    run_id: manifest.run_id,
    source_capture_worksheet: manifest.source_capture_worksheet,
    surface_policy: manifest.surface_policy,
    public_safety: manifest.public_safety,
    totals: manifest.totals,
    by_surface: manifest.by_surface,
    by_product: manifest.by_product,
    first_rows: manifest.first_rows,
    artifacts: manifest.artifacts,
  };
  writeJson(summaryPath, summary);
  return { manifest, surfaceRows, ocrRows, auditRows, auditSummary };
}

function main() {
  const result = writeSurfaceOcrMap({
    runId: argValue("run-id", "cwa-surface-ocr-v1"),
  });
  console.log(JSON.stringify({
    run_id: result.manifest.run_id,
    capture_rows: result.manifest.totals.capture_rows,
    surface_template_rows: result.manifest.totals.surface_template_rows,
    ocr_queue_rows: result.manifest.totals.ocr_queue_rows,
    ready_for_capture: result.manifest.totals.ready_for_capture,
    surface_ocr_queue_csv: result.manifest.artifacts.surface_ocr_queue_csv,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildSurfaceRows,
  queueRows,
  surfaces,
  writeSurfaceOcrMap,
};
