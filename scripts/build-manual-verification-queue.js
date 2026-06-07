const fs = require("fs");
const path = require("path");
const {
  argValue,
  generatedAt,
  isPrivatePath,
  normalizeText,
  parseCsv,
  pathFromArg,
  publicArtifactRef,
  publicReviewQueueCsvPath,
  readJson,
  redactPrivate,
  runIdFromArgs,
  shortHash,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const defaultCandidateCsvPath = path.join(root, "docs/data/product-evidence/exports/hybrid_ocr_candidate_extracts.csv");
const defaultPublicSummaryPath = path.join(root, "docs/data/product-evidence/hybrid_ocr_manual_verification_summary.json");
const defaultPublicCsvPath = path.join(root, "docs/data/product-evidence/exports/hybrid_ocr_manual_verification_queue.csv");

function readCsvRows(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  return parseCsv(fs.readFileSync(filePath, "utf8"));
}

function rowKey(row) {
  return normalizeText(row.evidence_id);
}

function indexByEvidenceId(rows) {
  const index = new Map();
  for (const row of rows) {
    const key = rowKey(row);
    if (key && !index.has(key)) index.set(key, row);
  }
  return index;
}

function publicSourceUrl(value) {
  return isPrivatePath(value) ? "[private_path_redacted]" : normalizeText(value);
}

function candidateAccepted(row) {
  return normalizeText(row.rejection_reason) === "" && Number(row.candidate_only) === 1 && Number(row.manual_verified) === 0;
}

function candidateHasText(row) {
  return Number(row.has_ingredient_text || 0) === 1
    || Number(row.has_allergen_text || 0) === 1
    || Number(row.has_manufacturer_or_distributor || 0) === 1
    || Number(row.has_net_weight || 0) === 1
    || Number(row.has_serving_size || 0) === 1;
}

function verificationLane(candidateRow, reviewRow = {}) {
  const reviewStatus = normalizeText(candidateRow.review_status || reviewRow.review_status);
  if (!candidateAccepted(candidateRow)) return "candidate_rejected_audit";
  if (reviewStatus === "needs_better_crop") return "needs_better_crop";
  if (reviewStatus === "needs_source_review") return "needs_source_review";
  if (reviewStatus === "needs_manual_transcription") return "needs_manual_transcription";
  if (candidateHasText(candidateRow)) return "candidate_extract_review";
  return "needs_manual_transcription";
}

function sourceReviewLane(row = {}) {
  const reviewStatus = normalizeText(row.review_status);
  const ocrStatus = normalizeText(row.ocr_status);
  const captureStatus = normalizeText(row.capture_status);
  if (reviewStatus === "needs_better_crop") return "needs_better_crop";
  if (ocrStatus === "ocr_succeeded") return "needs_ocr_structuring";
  if (captureStatus.includes("blocked") || reviewStatus === "needs_source_review") return "needs_source_review";
  return "source_capture_needed";
}

function requiredFieldsForLane(lane, row = {}) {
  const base = ["reviewer", "reviewed_at", "source_url", "source_title_or_owner", "review_decision", "reviewer_notes"];
  if (lane === "candidate_extract_review") {
    return base.concat(["source_photo_or_document_checked", "corrected_transcription", "field_match_decision", "package_identity_decision"]);
  }
  if (lane === "needs_manual_transcription") {
    return base.concat(["manual_transcription", "source_panel_visibility", "package_identity_decision"]);
  }
  if (lane === "needs_better_crop") {
    return base.concat(["better_crop_path_private", "crop_target", "panel_visibility"]);
  }
  if (lane === "needs_source_review") {
    return base.concat(["source_access_result", "label_visibility", "rights_note", "capture_or_archive_coordinates"]);
  }
  if (lane === "candidate_rejected_audit") {
    return base.concat(["rejection_reason_confirmed"]);
  }
  return base.concat([normalizeText(row.missing_fields) || "source_review_fields"]);
}

function nextActionForLane(lane) {
  if (lane === "candidate_extract_review") return "Compare the candidate extract against the source photo/document, correct the transcription, record reviewer metadata, then decide whether it is ready for a separate manual_verified promotion.";
  if (lane === "needs_manual_transcription") return "Open the source or private crop, transcribe readable fields manually, and record reviewer attribution before any claim promotion.";
  if (lane === "needs_better_crop") return "Capture a sharper private crop with the requested panel target, rerun OCR, then rebuild candidate extracts.";
  if (lane === "needs_source_review") return "Open the source URL, confirm product identity, date cues, label visibility, rights note, and capture coordinates before OCR or transcription.";
  if (lane === "candidate_rejected_audit") return "Keep the rejected model/OCR output in audit state and confirm the rejection reason if this row is reviewed.";
  return "Capture source evidence, run OCR or manual transcription, and keep output candidate-only until reviewer verification.";
}

function queueRowFromCandidate(candidateRow, reviewRow = {}, runId = "") {
  const lane = verificationLane(candidateRow, reviewRow);
  const fieldCount = Number(candidateRow.candidate_field_count || 0);
  return {
    run_id: runId,
    evidence_id: candidateRow.evidence_id,
    product_id: candidateRow.product_id || reviewRow.product_id,
    product_name: candidateRow.product_name || reviewRow.product_name,
    vintage_label: candidateRow.vintage_label || reviewRow.vintage_label,
    source_domain: candidateRow.source_domain || reviewRow.source_domain,
    source_url: publicSourceUrl(candidateRow.source_url || reviewRow.source_url),
    verification_lane: lane,
    candidate_review_status: normalizeText(candidateRow.review_status),
    source_review_status: normalizeText(reviewRow.review_status),
    candidate_field_count: fieldCount,
    candidate_text_hash: normalizeText(candidateRow.candidate_text_hash),
    has_ingredient_text: Number(candidateRow.has_ingredient_text || 0),
    has_allergen_text: Number(candidateRow.has_allergen_text || 0),
    has_manufacturer_or_distributor: Number(candidateRow.has_manufacturer_or_distributor || 0),
    has_net_weight: Number(candidateRow.has_net_weight || 0),
    has_serving_size: Number(candidateRow.has_serving_size || 0),
    evidence_context_status: fieldCount ? "candidate_text_available" : "candidate_text_missing",
    required_reviewer_actions: nextActionForLane(lane),
    required_fields: requiredFieldsForLane(lane, reviewRow).join(";"),
    rejection_reason: normalizeText(candidateRow.rejection_reason),
    reviewer: "",
    reviewed_at: "",
    reviewer_decision: "",
    candidate_only: 1,
    manual_verified: 0,
    claim_promotion_allowed: 0,
    public_text_included: Number(candidateRow.public_text_included || 0),
    queue_row_id: `manual_review_${shortHash(`${runId}:${candidateRow.evidence_id}:${lane}`, 14)}`,
  };
}

function queueRowFromSourceReview(reviewRow = {}, runId = "") {
  const lane = sourceReviewLane(reviewRow);
  return {
    run_id: runId,
    evidence_id: reviewRow.evidence_id,
    product_id: reviewRow.product_id,
    product_name: reviewRow.product_name,
    vintage_label: reviewRow.vintage_label,
    source_domain: reviewRow.source_domain,
    source_url: publicSourceUrl(reviewRow.source_url),
    verification_lane: lane,
    candidate_review_status: "",
    source_review_status: normalizeText(reviewRow.review_status),
    candidate_field_count: 0,
    candidate_text_hash: "",
    has_ingredient_text: 0,
    has_allergen_text: 0,
    has_manufacturer_or_distributor: 0,
    has_net_weight: 0,
    has_serving_size: 0,
    evidence_context_status: normalizeText(reviewRow.capture_status) || "source_review_needed",
    required_reviewer_actions: nextActionForLane(lane),
    required_fields: requiredFieldsForLane(lane, reviewRow).join(";"),
    rejection_reason: "",
    reviewer: "",
    reviewed_at: "",
    reviewer_decision: "",
    candidate_only: 1,
    manual_verified: 0,
    claim_promotion_allowed: 0,
    public_text_included: 0,
    queue_row_id: `manual_review_${shortHash(`${runId}:${reviewRow.evidence_id}:${lane}`, 14)}`,
  };
}

function countBy(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const key = normalizeText(row[field]) || "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key, count]) => ({ key, count }));
}

function buildManualVerificationRows({ runId, candidateRows = [], reviewRows = [], includeSourceReview = true, limit = 0 } = {}) {
  const reviewByEvidence = indexByEvidenceId(reviewRows);
  const used = new Set();
  const rows = [];

  for (const candidate of candidateRows) {
    const evidenceId = rowKey(candidate);
    if (!evidenceId) continue;
    const reviewRow = reviewByEvidence.get(evidenceId) || {};
    used.add(evidenceId);
    rows.push(queueRowFromCandidate(candidate, reviewRow, runId));
  }

  if (includeSourceReview) {
    for (const reviewRow of reviewRows) {
      const evidenceId = rowKey(reviewRow);
      if (!evidenceId || used.has(evidenceId)) continue;
      rows.push(queueRowFromSourceReview(reviewRow, runId));
    }
  }

  rows.sort((a, b) => {
    const laneRank = {
      candidate_extract_review: 0,
      needs_manual_transcription: 1,
      needs_better_crop: 2,
      needs_source_review: 3,
      source_capture_needed: 4,
      needs_ocr_structuring: 5,
      candidate_rejected_audit: 6,
    };
    return (laneRank[a.verification_lane] ?? 9) - (laneRank[b.verification_lane] ?? 9)
      || String(a.product_name).localeCompare(String(b.product_name))
      || String(a.evidence_id).localeCompare(String(b.evidence_id));
  });

  return limit ? rows.slice(0, limit) : rows;
}

function buildSummary({ runId, candidateRows, reviewRows, queueRows, publicCsvPath }) {
  return redactPrivate({
    schema_version: "ingredient_ocr_manual_verification_summary.v1",
    generated_at: generatedAt,
    run_id: runId,
    candidate_extract_rows: candidateRows.length,
    source_review_rows: reviewRows.length,
    verification_queue_rows: queueRows.length,
    candidate_extract_review_rows: queueRows.filter((row) => row.verification_lane === "candidate_extract_review").length,
    needs_manual_transcription_rows: queueRows.filter((row) => row.verification_lane === "needs_manual_transcription").length,
    needs_better_crop_rows: queueRows.filter((row) => row.verification_lane === "needs_better_crop").length,
    needs_source_review_rows: queueRows.filter((row) => row.verification_lane === "needs_source_review").length,
    rejected_audit_rows: queueRows.filter((row) => row.verification_lane === "candidate_rejected_audit").length,
    by_lane: countBy(queueRows, "verification_lane"),
    top_products: countBy(queueRows, "product_name").slice(0, 12),
    public_safety: {
      candidate_only: true,
      manual_verified_created: false,
      claim_promotion_allowed: false,
      reviewer_fields_blank_by_default: true,
      public_text_included: queueRows.some((row) => Number(row.public_text_included || 0) === 1),
      private_paths_committed: false,
    },
    promotion_policy: "This queue is a reviewer worklist only. A separate human-reviewed artifact must record corrected text, reviewer, reviewed_at, and decision before any evidence can become manual_verified.",
    public_artifacts: {
      manual_verification_queue_csv: publicArtifactRef(publicCsvPath),
    },
  });
}

function manualVerificationHeaders() {
  return [
    "run_id",
    "queue_row_id",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "verification_lane",
    "candidate_review_status",
    "source_review_status",
    "candidate_field_count",
    "candidate_text_hash",
    "has_ingredient_text",
    "has_allergen_text",
    "has_manufacturer_or_distributor",
    "has_net_weight",
    "has_serving_size",
    "evidence_context_status",
    "required_reviewer_actions",
    "required_fields",
    "rejection_reason",
    "reviewer",
    "reviewed_at",
    "reviewer_decision",
    "candidate_only",
    "manual_verified",
    "claim_promotion_allowed",
    "public_text_included",
  ];
}

function buildManualVerificationQueue({
  runId = runIdFromArgs("hybrid-ocr"),
  candidateCsvPath = defaultCandidateCsvPath,
  reviewQueueCsvPath = publicReviewQueueCsvPath,
  publicSummaryPath = defaultPublicSummaryPath,
  publicCsvPath = defaultPublicCsvPath,
  includeSourceReview = true,
  limit = 0,
  updateSiteSummary = true,
} = {}) {
  const candidateRows = readCsvRows(candidateCsvPath);
  const reviewRows = readCsvRows(reviewQueueCsvPath);
  const queueRows = buildManualVerificationRows({ runId, candidateRows, reviewRows, includeSourceReview, limit });
  writeCsv(publicCsvPath, manualVerificationHeaders(), queueRows);
  const summary = buildSummary({ runId, candidateRows, reviewRows, queueRows, publicCsvPath });
  writeJson(publicSummaryPath, summary);
  if (updateSiteSummary) {
    const siteSummary = readJson(summaryPath, {});
    siteSummary.ocr_manual_verification_summary = summary;
    siteSummary.ingredient_ocr_summary = siteSummary.ingredient_ocr_summary || {};
    siteSummary.ingredient_ocr_summary.ocr_manual_verification_summary = summary;
    writeJson(summaryPath, siteSummary);
  }
  return { queueRows, summary };
}

function main() {
  const result = buildManualVerificationQueue({
    runId: runIdFromArgs("hybrid-ocr"),
    candidateCsvPath: pathFromArg("candidate-csv", defaultCandidateCsvPath),
    reviewQueueCsvPath: pathFromArg("review-csv", publicReviewQueueCsvPath),
    publicSummaryPath: pathFromArg("public-summary", defaultPublicSummaryPath),
    publicCsvPath: pathFromArg("public-csv", defaultPublicCsvPath),
    includeSourceReview: !process.argv.includes("--candidate-only"),
    limit: Number(argValue("limit", 0)) || 0,
  });
  console.log(JSON.stringify({
    run_id: result.summary.run_id,
    verification_queue_rows: result.summary.verification_queue_rows,
    candidate_extract_review_rows: result.summary.candidate_extract_review_rows,
    needs_source_review_rows: result.summary.needs_source_review_rows,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildManualVerificationQueue,
  buildManualVerificationRows,
  queueRowFromCandidate,
  queueRowFromSourceReview,
  verificationLane,
};
