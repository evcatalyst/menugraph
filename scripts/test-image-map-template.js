const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { buildImageMapFromTemplate } = require("./build-image-map-from-template");
const { buildImageMapTemplateRows } = require("./capture-ingredient-ocr-assets");
const { readFullQueue, selectQueueRows, writeCsv } = require("./ingredient-ocr-pipeline-utils");

function assertNoPrivatePaths(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaked a private path`);
}

const rows = selectQueueRows(readFullQueue(), { limit: 3 });
assert.strictEqual(rows.length, 3, "expected queue rows");

const templateRows = buildImageMapTemplateRows("test-run", rows);
assert.strictEqual(templateRows.length, 3, "expected template rows");
assert(templateRows.every((row) => row.local_private_image_path === ""), "template must not prefill private paths");
assert(templateRows.every((row) => row.processed_private_image_path === ""), "template must not prefill processed paths");
assert(templateRows.every((row) => Number(row.candidate_only) === 1), "template rows must be candidate-only");
assert(templateRows.every((row) => Number(row.manual_verified) === 0), "template rows cannot be manually verified");
assert(templateRows.every((row) => String(row.image_map_keys || "").includes(row.evidence_id)), "template should include evidence_id key");
assertNoPrivatePaths(JSON.stringify(templateRows), "public image-map template rows");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "image-map-template-test-"));
const privateImagePath = path.join(tmpDir, "panel.jpg");
fs.writeFileSync(privateImagePath, "fake image bytes");
const filledRows = [
  {
    ...templateRows[0],
    local_private_image_path: privateImagePath,
  },
];
const result = buildImageMapFromTemplate(filledRows);
const keys = String(templateRows[0].image_map_keys).split(";").filter(Boolean);
assert.strictEqual(result.summary.mapped_rows, 1, "expected one mapped row");
assert.strictEqual(result.summary.missing_path_rows, 0, "expected no missing path rows");
for (const key of keys) {
  assert.strictEqual(result.imageMap[key], privateImagePath, `missing map key ${key}`);
}

const csvPath = path.join(tmpDir, "template.private.csv");
writeCsv(csvPath, [
  "evidence_id",
  "image_map_keys",
  "local_private_image_path",
  "processed_private_image_path",
], filledRows);
assert(fs.existsSync(csvPath), "expected private template fixture");

console.log("image-map template tests passed");
