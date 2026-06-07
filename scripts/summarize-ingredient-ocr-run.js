const fs = require("fs");
const path = require("path");
const {
  countBy,
  generatedAt,
  modelDefaults,
  parseCsv,
  publicHybridSummaryPath,
  publicModelSummaryCsvPath,
  publicReviewQueueCsvPath,
  publicRunSummaryCsvPath,
  readFullQueue,
  readJson,
  redactPrivate,
  runDirFromArgs,
  runIdFromArgs,
  selectQueueRows,
  summaryPath,
  topList,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

function readCsv(filePath) {
  return fs.existsSync(filePath) ? parseCsv(fs.readFileSync(filePath, "utf8")) : [];
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function countWhere(rows, predicate) {
  return rows.filter(predicate).length;
}

function summarizeOcrResults(runDir) {
  const candidates = [
    path.join(runDir, "ocr/ingredient_ocr_results.jsonl"),
    path.join(runDir, "ingredient_ocr_results.jsonl"),
  ];
  const rows = candidates.flatMap(readJsonl);
  return {
    ocr_result_rows: rows.length,
    ocr_attempted: countWhere(rows, (row) => row.status || row.text || row.lines),
    ocr_succeeded: countWhere(rows, (row) => row.status === "ocr_succeeded" || row.text || (row.lines || []).length),
    ocr_failed: countWhere(rows, (row) => /failed/i.test(row.status || "")),
    ingredient_signal_found: countWhere(rows, (row) => /ingredient/i.test(JSON.stringify(row).toLowerCase())),
    needs_human_correction: countWhere(rows, (row) => /human|manual|correction/i.test(JSON.stringify(row).toLowerCase())),
  };
}

function reviewStatusFor(row, captureRowsById, modelRowsByEvidenceId) {
  const capture = captureRowsById.get(row.evidence_id);
  if (!capture) return "needs_source_review";
  if (Number(capture.ready_for_ocr)) {
    return modelRowsByEvidenceId.has(row.evidence_id) ? "candidate_review_ready" : "ocr_attempt_needed";
  }
  if (capture.capture_status === "source_page_capture_blocked_no_network") return "needs_source_review";
  if (row.ocr_gap_category === "source_discovery_needed") return "needs_source_review";
  if (row.ocr_gap_category === "readable_panel_photo_needed") return "needs_better_crop";
  if (row.ocr_gap_category === "document_text_pipeline_needed") return "document_text_pipeline_needed";
  return "needs_manual_transcription";
}

function buildReviewQueue(queueRows, captureRows, modelRows) {
  const captureRowsById = new Map(captureRows.map((row) => [row.evidence_id, row]));
  const modelRowsByEvidenceId = new Map();
  for (const route of modelRows) {
    String(route.evidence_ids || "").split(";").filter(Boolean).forEach((id) => modelRowsByEvidenceId.set(id, route));
  }
  return queueRows.map((row) => {
    const capture = captureRowsById.get(row.evidence_id) || {};
    const modelRoute = modelRowsByEvidenceId.get(row.evidence_id) || {};
    const reviewStatus = reviewStatusFor(row, captureRowsById, modelRowsByEvidenceId);
    return {
      product_id: row.product_id,
      product_name: row.product_name,
      vintage_label: row.vintage_label,
      evidence_id: row.evidence_id,
      source_domain: row.source_domain,
      source_type: row.evidence_kind,
      source_url: row.source_url,
      ocr_priority: row.ocr_priority,
      ocr_gap_category: row.ocr_gap_category,
      capture_status: capture.capture_status || "not_captured",
      processed_status: capture.processed_status || "not_processed",
      model_route: modelRoute.route_type || "",
      model_status: modelRoute.status || "",
      review_status: reviewStatus,
      recommended_next_action: row.ocr_recommended_action || capture.cleanup_actions || "",
      missing_fields: row.ground_truth_fields_missing || "",
      candidate_only: 1,
      manual_verified: 0,
    };
  });
}

function main() {
  const runId = runIdFromArgs("hybrid-ocr");
  const runDir = runDirFromArgs(runId);
  const queueRows = selectQueueRows(readFullQueue(), { limit: 250 });
  const sparkSummary = readJson(path.join(runDir, "spark_packet_summary.public.json"), {});
  const captureSummary = readJson(path.join(runDir, "capture_summary.public.json"), {});
  const modelSummary = readJson(path.join(runDir, "model_assist_summary.public.json"), {});
  const captureRows = readCsv(publicRunSummaryCsvPath).filter((row) => row.run_id === runId);
  const modelRows = readCsv(publicModelSummaryCsvPath).filter((row) => row.run_id === runId);
  const reviewQueue = buildReviewQueue(queueRows, captureRows, modelRows);
  const ocr = summarizeOcrResults(runDir);
  const defaults = modelDefaults();
  const hybridSummary = redactPrivate({
    schema_version: "hybrid_ingredient_ocr_public_rollup.v1",
    generated_at: generatedAt,
    run_id: runId,
    public_safety: {
      images_committed: false,
      private_paths_committed: false,
      prompts_with_private_paths_committed: false,
      api_keys_committed: false,
      unverified_ingredient_claims_published: false,
      manual_verified_created: false,
      candidate_only: true,
    },
    model_routes: {
      spark_model: defaults.spark_model,
      gpt55_review_model: defaults.review_model,
      grok_research_model: defaults.grok_research_model,
      spark_packets_generated: sparkSummary.totals?.packets_generated || 0,
      gpt55_review_batches_planned: modelSummary.totals?.gpt55_review_batches_planned || 0,
      grok_assist_batches_created: modelSummary.totals?.grok_assist_batches_created || 0,
    },
    capture: {
      selected_rows: captureSummary.totals?.selected_rows || captureRows.length,
      rows_captured: captureSummary.totals?.rows_captured || captureRows.length,
      ready_for_ocr: captureSummary.totals?.ready_for_ocr || 0,
      blocked_no_network: captureSummary.totals?.source_page_capture_blocked_no_network || 0,
    },
    ocr,
    review_queue: {
      rows: reviewQueue.length,
      by_status: countBy(reviewQueue, "review_status"),
      candidate_review_ready: countWhere(reviewQueue, (row) => row.review_status === "candidate_review_ready"),
      needs_better_crop: countWhere(reviewQueue, (row) => row.review_status === "needs_better_crop"),
      needs_source_review: countWhere(reviewQueue, (row) => row.review_status === "needs_source_review"),
      needs_manual_transcription: countWhere(reviewQueue, (row) => row.review_status === "needs_manual_transcription"),
    },
    blockers: {
      top_gap_categories: countBy(queueRows, "ocr_gap_category"),
      top_source_domains: countBy(queueRows, "source_domain").slice(0, 12),
      top_products: topList(queueRows, "product_name", 12),
    },
    public_artifacts: {
      pipeline_summary_json: "docs/data/product-evidence/hybrid_ocr_pipeline_summary.json",
      run_summary_csv: "docs/data/product-evidence/exports/hybrid_ocr_run_summary.csv",
      model_assist_summary_csv: "docs/data/product-evidence/exports/hybrid_ocr_model_assist_summary.csv",
      review_queue_csv: "docs/data/product-evidence/exports/hybrid_ocr_review_queue.csv",
    },
  });

  writeJson(publicHybridSummaryPath, hybridSummary);
  writeCsv(publicReviewQueueCsvPath, [
    "product_id",
    "product_name",
    "vintage_label",
    "evidence_id",
    "source_domain",
    "source_type",
    "source_url",
    "ocr_priority",
    "ocr_gap_category",
    "capture_status",
    "processed_status",
    "model_route",
    "model_status",
    "review_status",
    "recommended_next_action",
    "missing_fields",
    "candidate_only",
    "manual_verified",
  ], reviewQueue);

  const siteSummary = readJson(summaryPath, {});
  siteSummary.hybrid_ocr_pipeline_summary = hybridSummary;
  siteSummary.ingredient_ocr_summary = siteSummary.ingredient_ocr_summary || {};
  siteSummary.ingredient_ocr_summary.hybrid_pipeline = hybridSummary;
  writeJson(summaryPath, siteSummary);

  console.log(JSON.stringify({
    run_id: runId,
    spark_packets: hybridSummary.model_routes.spark_packets_generated,
    gpt55_review_batches: hybridSummary.model_routes.gpt55_review_batches_planned,
    grok_assists: hybridSummary.model_routes.grok_assist_batches_created,
    review_queue_rows: reviewQueue.length,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildReviewQueue,
  reviewStatusFor,
};
