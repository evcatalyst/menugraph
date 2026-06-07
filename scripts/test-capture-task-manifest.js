const assert = require("assert");
const { publicAuditRows } = require("./audit-image-map-template");
const { buildCaptureTasks, buildTaskSummary, renderRunbook } = require("./build-capture-task-manifest");
const { buildImageMapTemplateRows } = require("./capture-ingredient-ocr-assets");
const { readFullQueue, selectQueueRows } = require("./ingredient-ocr-pipeline-utils");

function assertNoPrivatePaths(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaked a private path`);
}

const sourceRows = selectQueueRows(readFullQueue(), { limit: 8 });
assert.strictEqual(sourceRows.length, 8, "expected source rows");
const templateRows = buildImageMapTemplateRows("task-test", sourceRows);
const auditRows = publicAuditRows(templateRows);
const tasks = buildCaptureTasks({ runId: "task-test", templateRows, auditRows });

assert.strictEqual(tasks.length, 8, "expected one task per audit row");
assert(tasks.every((task) => task.task_id.startsWith("capture_")), "tasks need stable IDs");
assert(tasks.every((task) => Number(task.candidate_only) === 1), "tasks must be candidate-only");
assert(tasks.every((task) => Number(task.manual_verified) === 0), "tasks cannot create manual verification");
assert(tasks.every((task) => task.private_template_fields_to_fill.includes("private_image_path")), "tasks should name private path fields");
assert(tasks.every((task) => task.image_map_keys.includes(task.evidence_id)), "tasks should include image-map keys");
assert(tasks[0].task_priority_score >= tasks[tasks.length - 1].task_priority_score, "tasks should be ranked by score");
assertNoPrivatePaths(JSON.stringify(tasks), "capture tasks");

const summary = buildTaskSummary({
  runId: "task-test",
  tasks,
  publicTaskCsvPath: "docs/data/product-evidence/exports/test_capture_tasks.csv",
  publicTaskJsonPath: "docs/data/product-evidence/test_capture_tasks.json",
  publicRunbookPath: "docs/data/product-evidence/exports/test_capture_task_runbook.md",
});
assert.strictEqual(summary.task_count, 8, "summary should count tasks");
assert.strictEqual(summary.paths_needed, 8, "blank tasks should need paths");
assert.strictEqual(summary.ready_for_capture, 0, "blank tasks should not be capture-ready");
assert(summary.first_tasks.length > 0, "summary should expose first tasks");
assert(summary.first_tasks[0].source_url, "first tasks should expose source URL for capture operators");
assert("crop_target" in summary.first_tasks[0], "first tasks should expose crop target");
assertNoPrivatePaths(JSON.stringify(summary), "capture task summary");

const runbook = renderRunbook(summary, tasks);
assert(runbook.includes("Ingredient OCR Capture Task Runbook"), "runbook needs title");
assert(runbook.includes("Operator Flow"), "runbook needs operator flow");
assert(runbook.includes("Image-map keys"), "runbook should include map keys");
assertNoPrivatePaths(runbook, "capture task runbook");

console.log("capture task manifest tests passed");
