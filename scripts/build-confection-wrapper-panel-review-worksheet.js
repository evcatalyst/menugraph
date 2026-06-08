const fs = require("fs");
const path = require("path");
const {
  argValue,
  countBy,
  generatedAt,
  parseCsv,
  pathFromArg,
  publicArtifactRef,
  readJson,
  shortHash,
  slug,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const defaultCaptureTaskCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_panel_capture_tasks.csv");
const defaultWorksheetCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_panel_review_worksheet.csv");
const defaultWorksheetJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_panel_review_worksheet.json");
const defaultRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_panel_review_worksheet_runbook.md");
const defaultPipelineSummaryPath = path.join(root, "docs/data/product-evidence/confection_wrapper_item_panel_pipeline_summary.json");

const reviewQuestionSet = [
  "Is this an item-level wrapper or package source?",
  "Is a package surface visible after private capture?",
  "Is ingredient text visible?",
  "Is nutrition text visible?",
  "Is net weight visible?",
  "Is maker/distributor text visible?",
  "Is date, copyright, or lot cue visible?",
  "Is any visible text readable enough for OCR?",
  "Is this only wrapper-front/product identity context?",
  "Should this remain source-link-only for rights reasons?",
];

function worksheetId(task = {}) {
  return `cwa_panel_review_${slug(task.product_id || task.product_name)}_${shortHash(task.evidence_id || task.task_id, 10)}`;
}

function reviewSurfaceHint(task = {}) {
  const text = `${task.crop_target || ""} ${task.ocr_expected_surface || ""}`.toLowerCase();
  if (/ingredient/.test(text)) return "ingredient_or_package_text_surface";
  if (/nutrition/.test(text)) return "nutrition_or_package_text_surface";
  if (/net weight|net wt/.test(text)) return "net_weight_or_identity_surface";
  return "wrapper_surface_classification";
}

function worksheetRow(task = {}) {
  return {
    run_id: task.run_id || "confection-wrapper-item-panel-v1",
    review_id: worksheetId(task),
    task_id: task.task_id,
    task_rank: task.task_rank,
    task_priority_score: task.task_priority_score,
    review_state: "panel_review_not_started",
    evidence_id: task.evidence_id,
    product_id: task.product_id,
    product_name: task.product_name,
    vintage_label: task.vintage_label,
    source_domain: task.source_domain,
    source_url: task.source_url,
    source_title: task.source_title,
    source_type: task.source_type,
    ocr_priority: task.ocr_priority,
    capture_strategy: task.capture_strategy,
    review_surface_hint: reviewSurfaceHint(task),
    crop_target: task.crop_target,
    private_crop_supplied: 0,
    private_crop_hash: "",
    package_surface_visible: "",
    package_front_visible: "",
    package_back_or_side_visible: "",
    ingredient_panel_visible: "",
    nutrition_panel_visible: "",
    net_weight_visible: "",
    manufacturer_or_distributor_visible: "",
    date_or_lot_cue_visible: "",
    text_readable_for_ocr: "",
    panel_role_decision: "",
    reviewer: "",
    reviewed_at: "",
    reviewer_notes: "",
    rights_review_status: task.rights_review_status || "rights_review_needed",
    publication_image_policy: task.publication_image_policy || "source_link_only_no_public_image",
    question_set: reviewQuestionSet.join("; "),
    decision_policy: "Route to OCR only when a private crop exists and visible package text is readable; otherwise keep as wrapper lineage/context evidence.",
    recommended_next_action: "Open source, privately capture/crop the package surface, answer the review fields, then route readable text crops to OCR.",
    candidate_only: 1,
    manual_verified: 0,
  };
}

function buildWorksheetRows(taskRows = []) {
  return taskRows.map(worksheetRow).sort((a, b) => (
    Number(a.task_rank || 0) - Number(b.task_rank || 0)
    || a.product_name.localeCompare(b.product_name)
    || a.evidence_id.localeCompare(b.evidence_id)
  ));
}

function buildSummary({ runId, rows, worksheetCsvPath, worksheetJsonPath, runbookPath }) {
  const count = (predicate) => rows.filter(predicate).length;
  return {
    schema_version: "confection_wrapper_panel_review_worksheet.v1",
    generated_at: generatedAt,
    run_id: runId,
    worksheet_rows: rows.length,
    panel_review_not_started: count((row) => row.review_state === "panel_review_not_started"),
    private_crops_supplied: count((row) => Number(row.private_crop_supplied)),
    readable_for_ocr: count((row) => row.text_readable_for_ocr === "yes"),
    manual_verified_created: 0,
    review_questions: reviewQuestionSet,
    by_product: countBy(rows, "product_name"),
    by_review_surface_hint: countBy(rows, "review_surface_hint"),
    first_rows: rows.slice(0, 10).map((row) => ({
      review_id: row.review_id,
      rank: row.task_rank,
      product_name: row.product_name,
      vintage_label: row.vintage_label,
      source_domain: row.source_domain,
      source_url: row.source_url,
      source_title: row.source_title,
      evidence_id: row.evidence_id,
      review_surface_hint: row.review_surface_hint,
      crop_target: row.crop_target,
      recommended_next_action: row.recommended_next_action,
      review_state: row.review_state,
    })),
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      private_hashes_committed: false,
      images_committed: false,
      ocr_text_committed: false,
      manual_verified_created: false,
    },
    public_artifacts: {
      panel_review_worksheet_csv: publicArtifactRef(worksheetCsvPath),
      panel_review_worksheet_json: publicArtifactRef(worksheetJsonPath),
      panel_review_worksheet_runbook_md: publicArtifactRef(runbookPath),
    },
  };
}

function renderRunbook(summary = {}) {
  const lines = [
    "# Candy Wrapper Archive Panel Review Worksheet",
    "",
    `Generated: ${summary.generated_at}`,
    `Run ID: ${summary.run_id}`,
    "",
    "This worksheet is the human review gate between wrapper/source capture and OCR. It is public-safe: source links and blank review fields are committed, but private crops, image paths, OCR text, and reviewer-local files are not.",
    "",
    "## Review Questions",
    "",
    ...reviewQuestionSet.map((question) => `- ${question}`),
    "",
    "## Decision Policy",
    "",
    "- If a private crop contains readable ingredient, nutrition, net-weight, maker/distributor, or date text, route that crop to native OCR.",
    "- If it is only a wrapper-front or product identity image, keep it as lineage/context evidence and do not OCR it as an ingredient label.",
    "- No row can become `manual_verified` from this worksheet alone; manual verification requires corrected text and reviewer attribution.",
    "",
    "## First Review Rows",
    "",
  ];
  for (const row of summary.first_rows || []) {
    lines.push(`### ${row.rank}. ${row.product_name} / ${row.vintage_label}`);
    lines.push("");
    lines.push(`- Evidence: \`${row.evidence_id}\``);
    lines.push(`- Source: ${row.source_url}`);
    lines.push(`- Surface hint: ${row.review_surface_hint}`);
    lines.push(`- Crop target: ${row.crop_target}`);
    lines.push(`- Next action: ${row.recommended_next_action}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function writeWorksheet({
  runId,
  captureTaskCsvPath,
  worksheetCsvPath,
  worksheetJsonPath,
  runbookPath,
  pipelineSummaryPath,
  summaryField,
}) {
  if (!fs.existsSync(captureTaskCsvPath)) throw new Error(`Capture task CSV not found: ${captureTaskCsvPath}`);
  const taskRows = parseCsv(fs.readFileSync(captureTaskCsvPath, "utf8"));
  const rows = buildWorksheetRows(taskRows);
  const summary = buildSummary({ runId, rows, worksheetCsvPath, worksheetJsonPath, runbookPath });

  writeCsv(worksheetCsvPath, [
    "run_id",
    "review_id",
    "task_id",
    "task_rank",
    "task_priority_score",
    "review_state",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_title",
    "source_type",
    "ocr_priority",
    "capture_strategy",
    "review_surface_hint",
    "crop_target",
    "private_crop_supplied",
    "private_crop_hash",
    "package_surface_visible",
    "package_front_visible",
    "package_back_or_side_visible",
    "ingredient_panel_visible",
    "nutrition_panel_visible",
    "net_weight_visible",
    "manufacturer_or_distributor_visible",
    "date_or_lot_cue_visible",
    "text_readable_for_ocr",
    "panel_role_decision",
    "reviewer",
    "reviewed_at",
    "reviewer_notes",
    "rights_review_status",
    "publication_image_policy",
    "question_set",
    "decision_policy",
    "recommended_next_action",
    "candidate_only",
    "manual_verified",
  ], rows);
  writeJson(worksheetJsonPath, summary);
  fs.mkdirSync(path.dirname(runbookPath), { recursive: true });
  fs.writeFileSync(runbookPath, renderRunbook(summary));

  if (pipelineSummaryPath) {
    const pipelineSummary = readJson(pipelineSummaryPath, {});
    pipelineSummary.panel_review_worksheet = summary;
    pipelineSummary.public_artifacts = pipelineSummary.public_artifacts || {};
    pipelineSummary.public_artifacts.panel_review_worksheet_csv = publicArtifactRef(worksheetCsvPath);
    pipelineSummary.public_artifacts.panel_review_worksheet_json = publicArtifactRef(worksheetJsonPath);
    pipelineSummary.public_artifacts.panel_review_worksheet_runbook_md = publicArtifactRef(runbookPath);
    writeJson(pipelineSummaryPath, pipelineSummary);
  }

  if (summaryField) {
    const siteSummary = readJson(summaryPath, {});
    siteSummary[summaryField] = summary;
    if (pipelineSummaryPath) {
      siteSummary.confection_wrapper_item_panel_pipeline_summary = readJson(pipelineSummaryPath, {});
    }
    writeJson(summaryPath, siteSummary);
  }

  return { rows, summary };
}

function main() {
  const runId = argValue("run-id", "confection-wrapper-item-panel-v1");
  const result = writeWorksheet({
    runId,
    captureTaskCsvPath: pathFromArg("capture-tasks", defaultCaptureTaskCsvPath),
    worksheetCsvPath: pathFromArg("public-worksheet-csv", defaultWorksheetCsvPath),
    worksheetJsonPath: pathFromArg("public-worksheet-json", defaultWorksheetJsonPath),
    runbookPath: pathFromArg("public-runbook", defaultRunbookPath),
    pipelineSummaryPath: pathFromArg("pipeline-summary", defaultPipelineSummaryPath),
    summaryField: argValue("summary-field", "confection_wrapper_panel_review_worksheet_summary"),
  });
  console.log(JSON.stringify({
    run_id: result.summary.run_id,
    worksheet_rows: result.summary.worksheet_rows,
    panel_review_not_started: result.summary.panel_review_not_started,
    private_crops_supplied: result.summary.private_crops_supplied,
    readable_for_ocr: result.summary.readable_for_ocr,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildSummary,
  buildWorksheetRows,
  reviewQuestionSet,
  worksheetRow,
  writeWorksheet,
};
