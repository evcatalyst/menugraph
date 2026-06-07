const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { publicAuditRows, summarizeAudit } = require("./audit-image-map-template");
const { buildImageMapTemplateRows } = require("./capture-ingredient-ocr-assets");
const { readFullQueue, selectQueueRows } = require("./ingredient-ocr-pipeline-utils");

function assertNoPrivatePaths(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaked a private path`);
}

const sourceRows = selectQueueRows(readFullQueue(), { limit: 4 });
assert.strictEqual(sourceRows.length, 4, "expected source rows");
const templateRows = buildImageMapTemplateRows("audit-test", sourceRows);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "image-map-audit-test-"));
const readyImage = path.join(tmpDir, "ready-panel.jpg");
const unsupportedImage = path.join(tmpDir, "panel.txt");
fs.writeFileSync(readyImage, "fake image");
fs.writeFileSync(unsupportedImage, "not an image");

const rows = [
  templateRows[0],
  { ...templateRows[1], local_private_image_path: readyImage },
  { ...templateRows[2], local_private_image_path: path.join(tmpDir, "missing-panel.jpg") },
  { ...templateRows[3], local_private_image_path: unsupportedImage },
];

const auditRows = publicAuditRows(rows);
assert.strictEqual(auditRows.length, 4, "expected audit rows");
assert.strictEqual(auditRows[0].audit_status, "no_private_path_supplied");
assert.strictEqual(auditRows[1].audit_status, "ready_for_capture");
assert.strictEqual(auditRows[2].audit_status, "private_path_missing");
assert.strictEqual(auditRows[3].audit_status, "unsupported_image_extension");
assert(auditRows.every((row) => Number(row.candidate_only) === 1), "audit rows must be candidate-only");
assert(auditRows.every((row) => Number(row.manual_verified) === 0), "audit rows cannot create manual verification");
assertNoPrivatePaths(JSON.stringify(auditRows), "public audit rows");

const summary = summarizeAudit("audit-test", auditRows, {
  publicAuditCsvRef: "docs/data/product-evidence/exports/test.csv",
  publicAuditJsonRef: "docs/data/product-evidence/test.json",
});
assert.strictEqual(summary.template_rows, 4, "summary should count rows");
assert.strictEqual(summary.ready_for_capture, 1, "summary should count ready rows");
assert.strictEqual(summary.no_private_path_supplied, 1, "summary should count blank rows");
assert.strictEqual(summary.private_path_missing, 1, "summary should count missing paths");
assert.strictEqual(summary.unsupported_image_extension, 1, "summary should count unsupported extensions");
assert.strictEqual(summary.public_safety.private_paths_committed, false, "summary must not commit paths");
assertNoPrivatePaths(JSON.stringify(summary), "public audit summary");

console.log("image-map audit tests passed");
