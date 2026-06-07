const fs = require("fs");
const path = require("path");
const {
  argValue,
  countBy,
  generatedAt,
  numberArg,
  parseCsv,
  pathFromArg,
  publicArtifactRef,
  readJson,
  redactPrivate,
  runIdFromArgs,
  shortHash,
  slug,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const defaultTemplatePath = path.join(root, "docs/data/product-evidence/exports/hybrid_ocr_image_map_template.csv");
const defaultAuditPath = path.join(root, "docs/data/product-evidence/exports/hybrid_ocr_image_map_audit.csv");
const defaultTaskCsvPath = path.join(root, "docs/data/product-evidence/exports/hybrid_ocr_capture_tasks.csv");
const defaultTaskJsonPath = path.join(root, "docs/data/product-evidence/hybrid_ocr_capture_tasks.json");
const defaultRunbookPath = path.join(root, "docs/data/product-evidence/exports/hybrid_ocr_capture_task_runbook.md");

function priorityScore(row) {
  const priorityBase = { high: 100, medium: 65, low: 35 }[row.ocr_priority] || 20;
  const gapBonus = {
    panel_capture_needed: 35,
    source_page_capture_needed: 24,
    document_text_pipeline_needed: 18,
    readable_panel_photo_needed: 12,
    source_discovery_needed: 0,
  }[row.ocr_gap_category] || 6;
  const surfaceBonus = /ingredient|nutrition/i.test(`${row.ocr_expected_surface || ""} ${row.crop_target || ""}`) ? 12 : 0;
  const statusBonus = row.audit_status === "no_private_path_supplied" ? 8 : row.audit_status === "private_path_missing" ? 4 : 0;
  return priorityBase + gapBonus + surfaceBonus + statusBonus;
}

function rowByEvidenceId(rows) {
  return new Map(rows.map((row) => [row.evidence_id, row]));
}

function taskAction(row) {
  if (row.audit_status === "ready_for_capture") return "Run capture/OCR with the existing private path.";
  if (row.audit_status === "private_path_missing") return "Fix the private image path in the private template before capture.";
  if (row.audit_status === "unsupported_image_extension") return "Convert the crop to jpg/png/webp/tiff/heic, then rerun the audit.";
  if (row.ocr_gap_category === "source_discovery_needed") return "Find a source-attributable page or photo before capture.";
  return "Open source, capture a private panel crop, then fill the private template path.";
}

function buildCaptureTasks({ runId, templateRows, auditRows, limit = 0 }) {
  const templateById = rowByEvidenceId(templateRows);
  const tasks = auditRows.map((auditRow) => {
    const templateRow = templateById.get(auditRow.evidence_id) || {};
    const score = priorityScore({ ...templateRow, ...auditRow });
    const taskId = `capture_${shortHash(`${runId}:${auditRow.evidence_id}`, 14)}`;
    return {
      run_id: runId,
      task_id: taskId,
      task_rank: 0,
      task_priority_score: score,
      audit_status: auditRow.audit_status,
      evidence_id: auditRow.evidence_id,
      product_id: auditRow.product_id,
      product_name: auditRow.product_name,
      vintage_label: auditRow.vintage_label,
      source_domain: auditRow.source_domain,
      source_url: auditRow.source_url,
      source_title: templateRow.source_title || "",
      source_type: auditRow.source_type,
      ocr_gap_category: auditRow.ocr_gap_category,
      ocr_priority: auditRow.ocr_priority,
      capture_strategy: auditRow.capture_strategy,
      crop_target: templateRow.crop_target || "",
      ocr_expected_surface: templateRow.ocr_expected_surface || "",
      image_map_keys: templateRow.image_map_keys || "",
      key_count: auditRow.key_count,
      private_template_fields_to_fill: "local_private_image_path or processed_private_image_path",
      rights_review_status: templateRow.rights_review_status || "rights_review_needed",
      publication_image_policy: templateRow.publication_image_policy || "source_link_only_no_public_image",
      recommended_next_action: taskAction({ ...templateRow, ...auditRow }),
      done_when: "A private crop path exists, audit_status becomes ready_for_capture, then native OCR can run.",
      candidate_only: 1,
      manual_verified: 0,
    };
  }).sort((a, b) => (
    b.task_priority_score - a.task_priority_score
    || a.product_name.localeCompare(b.product_name)
    || a.evidence_id.localeCompare(b.evidence_id)
  ));
  const selected = limit ? tasks.slice(0, limit) : tasks;
  selected.forEach((task, index) => {
    task.task_rank = index + 1;
  });
  return selected;
}

function groupedTasks(tasks, field, limit = 12) {
  const groups = new Map();
  for (const task of tasks) {
    const key = task[field] || "unknown";
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        tasks: 0,
        high_priority: 0,
        ready_for_capture: 0,
        paths_needed: 0,
        top_task_id: task.task_id,
        top_source_domain: task.source_domain,
      });
    }
    const group = groups.get(key);
    group.tasks += 1;
    if (task.ocr_priority === "high") group.high_priority += 1;
    if (task.audit_status === "ready_for_capture") group.ready_for_capture += 1;
    if (task.audit_status === "no_private_path_supplied") group.paths_needed += 1;
  }
  return [...groups.values()]
    .sort((a, b) => b.high_priority - a.high_priority || b.tasks - a.tasks || a.key.localeCompare(b.key))
    .slice(0, limit);
}

function buildTaskSummary({ runId, tasks, publicTaskCsvPath, publicTaskJsonPath, publicRunbookPath }) {
  const count = (predicate) => tasks.filter(predicate).length;
  const summary = {
    schema_version: "hybrid_ingredient_ocr_capture_task_summary.v1",
    generated_at: generatedAt,
    run_id: runId,
    task_count: tasks.length,
    high_priority_tasks: count((task) => task.ocr_priority === "high"),
    ready_for_capture: count((task) => task.audit_status === "ready_for_capture"),
    paths_needed: count((task) => task.audit_status === "no_private_path_supplied"),
    source_discovery_tasks: count((task) => task.ocr_gap_category === "source_discovery_needed"),
    by_status: countBy(tasks, "audit_status"),
    by_product: groupedTasks(tasks, "product_name"),
    by_source_domain: groupedTasks(tasks, "source_domain"),
    first_tasks: tasks.slice(0, 12).map((task) => ({
      task_id: task.task_id,
      rank: task.task_rank,
      product_name: task.product_name,
      vintage_label: task.vintage_label,
      source_domain: task.source_domain,
      source_url: task.source_url,
      source_title: task.source_title,
      evidence_id: task.evidence_id,
      crop_target: task.crop_target,
      priority_score: task.task_priority_score,
      next_action: task.recommended_next_action,
    })),
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      images_committed: false,
      manual_verified_created: false,
    },
    public_artifacts: {
      capture_task_csv: publicArtifactRef(publicTaskCsvPath),
      capture_task_json: publicArtifactRef(publicTaskJsonPath),
      capture_task_runbook_md: publicArtifactRef(publicRunbookPath),
    },
  };
  return redactPrivate(summary);
}

function renderRunbook(summary, tasks) {
  const lines = [
    "# Ingredient OCR Capture Task Runbook",
    "",
    `Generated: ${generatedAt}`,
    `Run ID: ${summary.run_id}`,
    "",
    "This runbook is public-safe. It contains source links, evidence IDs, crop targets, and template fields to fill, but no private image paths and no external image embeds.",
    "",
    "## Totals",
    "",
    `- Tasks: ${summary.task_count}`,
    `- High priority: ${summary.high_priority_tasks}`,
    `- Capture-ready crops: ${summary.ready_for_capture}`,
    `- Paths needed: ${summary.paths_needed}`,
    `- Source discovery tasks: ${summary.source_discovery_tasks}`,
    "",
    "## Operator Flow",
    "",
    "1. Open the source URL for a task.",
    "2. Capture or crop the ingredient/nutrition/package panel privately.",
    "3. Fill `local_private_image_path` or `processed_private_image_path` in a private copy of the image-map template.",
    "4. Run `scripts/audit-image-map-template.js` against the private template.",
    "5. Convert the private template to `image-map-input.json`, then run capture and native OCR.",
    "",
    "## First Tasks",
    "",
  ];
  for (const task of tasks.slice(0, 25)) {
    lines.push(`### ${task.task_rank}. ${task.product_name} / ${task.vintage_label}`);
    lines.push("");
    lines.push(`- Evidence: \`${task.evidence_id}\``);
    lines.push(`- Source: ${task.source_url || "source needed"}`);
    lines.push(`- Source domain: ${task.source_domain || "unknown"}`);
    lines.push(`- Crop target: ${task.crop_target || task.ocr_expected_surface || "panel crop needed"}`);
    lines.push(`- Image-map keys: \`${task.image_map_keys}\``);
    lines.push(`- Fill: \`${task.private_template_fields_to_fill}\``);
    lines.push(`- Next action: ${task.recommended_next_action}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function writeTaskManifest({ runId, templatePath, auditPath, publicTaskCsvPath, publicTaskJsonPath, publicRunbookPath, pipelineSummaryPath, summaryField, limit }) {
  if (!fs.existsSync(templatePath)) throw new Error(`Image-map template not found: ${templatePath}`);
  if (!fs.existsSync(auditPath)) throw new Error(`Image-map audit not found: ${auditPath}`);
  const templateRows = parseCsv(fs.readFileSync(templatePath, "utf8"));
  const auditRows = parseCsv(fs.readFileSync(auditPath, "utf8"));
  const tasks = buildCaptureTasks({ runId, templateRows, auditRows, limit });
  const summary = buildTaskSummary({ runId, tasks, publicTaskCsvPath, publicTaskJsonPath, publicRunbookPath });

  writeCsv(publicTaskCsvPath, [
    "run_id",
    "task_id",
    "task_rank",
    "task_priority_score",
    "audit_status",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_title",
    "source_type",
    "ocr_gap_category",
    "ocr_priority",
    "capture_strategy",
    "crop_target",
    "ocr_expected_surface",
    "image_map_keys",
    "key_count",
    "private_template_fields_to_fill",
    "rights_review_status",
    "publication_image_policy",
    "recommended_next_action",
    "done_when",
    "candidate_only",
    "manual_verified",
  ], tasks);
  writeJson(publicTaskJsonPath, summary);
  fs.mkdirSync(path.dirname(publicRunbookPath), { recursive: true });
  fs.writeFileSync(publicRunbookPath, renderRunbook(summary, tasks));

  if (pipelineSummaryPath) {
    const pipelineSummary = readJson(pipelineSummaryPath, {});
    pipelineSummary.capture_task_summary = summary;
    pipelineSummary.public_artifacts = pipelineSummary.public_artifacts || {};
    pipelineSummary.public_artifacts.capture_task_csv = publicArtifactRef(publicTaskCsvPath);
    pipelineSummary.public_artifacts.capture_task_json = publicArtifactRef(publicTaskJsonPath);
    pipelineSummary.public_artifacts.capture_task_runbook_md = publicArtifactRef(publicRunbookPath);
    writeJson(pipelineSummaryPath, pipelineSummary);
  }

  if (summaryField) {
    const siteSummary = readJson(summaryPath, {});
    siteSummary[summaryField] = summary;
    if (pipelineSummaryPath) {
      const pipelineSummary = readJson(pipelineSummaryPath, {});
      const pipelineField = path.basename(pipelineSummaryPath) === "pilot_capture_pipeline_summary.json"
        ? "pilot_capture_pipeline_summary"
        : "hybrid_ocr_pipeline_summary";
      siteSummary[pipelineField] = pipelineSummary;
      if (pipelineField === "hybrid_ocr_pipeline_summary") {
        siteSummary.ingredient_ocr_summary = siteSummary.ingredient_ocr_summary || {};
        siteSummary.ingredient_ocr_summary.hybrid_pipeline = pipelineSummary;
      }
    }
    writeJson(summaryPath, siteSummary);
  }

  return { tasks, summary };
}

function main() {
  const runId = runIdFromArgs("hybrid-ocr-v1");
  const templatePath = pathFromArg("template", defaultTemplatePath);
  const auditPath = pathFromArg("audit", defaultAuditPath);
  const publicTaskCsvPath = pathFromArg("public-task-csv", defaultTaskCsvPath);
  const publicTaskJsonPath = pathFromArg("public-task-json", defaultTaskJsonPath);
  const publicRunbookPath = pathFromArg("public-runbook", defaultRunbookPath);
  const pipelineSummaryArg = argValue("pipeline-summary", "docs/data/product-evidence/hybrid_ocr_pipeline_summary.json");
  const pipelineSummaryPath = pipelineSummaryArg ? pathFromArg("pipeline-summary", pipelineSummaryArg) : "";
  const summaryField = argValue("summary-field", "hybrid_ocr_capture_task_summary");
  const limit = numberArg("limit", 0);
  const result = writeTaskManifest({
    runId,
    templatePath,
    auditPath,
    publicTaskCsvPath,
    publicTaskJsonPath,
    publicRunbookPath,
    pipelineSummaryPath,
    summaryField,
    limit,
  });
  console.log(JSON.stringify({
    run_id: runId,
    task_count: result.summary.task_count,
    high_priority_tasks: result.summary.high_priority_tasks,
    ready_for_capture: result.summary.ready_for_capture,
    paths_needed: result.summary.paths_needed,
  }, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  buildCaptureTasks,
  buildTaskSummary,
  priorityScore,
  renderRunbook,
  writeTaskManifest,
};
