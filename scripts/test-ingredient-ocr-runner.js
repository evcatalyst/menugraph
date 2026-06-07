const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  averageConfidence,
  buildPrivateOcrResult,
  imageMapValue,
  ingredientSignalLines,
  publicOcrRow,
  summarize,
} = require("./run-ingredient-ocr");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");

function assertNoPrivatePaths(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaked a private path`);
}

const sampleLines = [
  { text: "INGREDIENTS: sugar, enriched flour, palm oil", confidence: 0.91 },
  { text: "Distributed by Example Foods", confidence: 0.82 },
  { text: "Best when used by date on package", confidence: 0.42 },
];
const signals = ingredientSignalLines(sampleLines);
assert.strictEqual(signals.length, 2, "expected ingredient/manufacturer signal lines");
assert.strictEqual(averageConfidence(sampleLines), 0.7167, "expected averaged confidence");

const row = {
  evidence_id: "flickr_oreo_1993",
  product_id: "oreo_original_chocolate_sandwich_cookies",
  product_name: "Oreo Original Chocolate Sandwich Cookies",
  vintage_label: "1990s",
  source_domain: "www.flickr.com",
  source_url: "https://www.flickr.com/photos/jasonliebigstuff/6823914204",
};
const privatePath = path.join(os.tmpdir(), "ingredient-ocr-private-panel.jpg");
fs.writeFileSync(privatePath, "fake image bytes for hashing");

const resolved = imageMapValue({
  [row.evidence_id]: privatePath,
  [row.source_url]: "/missing/path.jpg",
}, row);
assert.strictEqual(resolved, privatePath, "image map should resolve by evidence id");

const privateResult = buildPrivateOcrResult(row, privatePath, {
  status: "ocr_succeeded",
  output: {
    processor: "macos_vision_text_recognition",
    lines: sampleLines,
  },
}, { runId: "ocr-runner-unit" });
assert.strictEqual(privateResult.status, "ocr_succeeded", "expected private OCR success");
assert.strictEqual(privateResult.ingredient_signal_found, true, "expected ingredient signal flag");

const publicRow = publicOcrRow(privateResult);
assert.strictEqual(publicRow.candidate_only, 1, "public OCR row should be candidate-only");
assert.strictEqual(publicRow.manual_verified, 0, "OCR cannot create manual verification");
assert.strictEqual(publicRow.ingredient_signal_found, 1, "public OCR row should preserve signal flag");
assertNoPrivatePaths(JSON.stringify(publicRow), "public OCR row");
assert(!JSON.stringify(publicRow).includes("INGREDIENTS"), "public OCR row should not expose OCR text");

const summary = summarize("ocr-runner-unit", [privateResult], path.join(root, "docs/data/product-evidence/exports/test_native_ocr_summary.csv"));
assert.strictEqual(summary.public_safety.ocr_text_committed, false, "summary should not publish OCR text");
assert.strictEqual(summary.totals.ocr_succeeded, 1, "summary should count OCR successes");
assertNoPrivatePaths(JSON.stringify(summary), "OCR summary");

const skippedSummary = summarize("ocr-runner-skipped", [{
  ...privateResult,
  status: "ocr_skipped_no_image",
  ingredient_signal_found: false,
  ingredient_signal_lines: [],
}], path.join(root, "docs/data/product-evidence/exports/test_native_ocr_summary.csv"));
assert.strictEqual(skippedSummary.totals.ocr_skipped_no_image, 1, "summary should count skipped OCR rows");
assert.strictEqual(skippedSummary.totals.ingredient_signal_found, 0, "skipped OCR rows should not create ingredient signals");

const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "ingredient-ocr-runner-"));
const publicCsv = path.join(runDir, "public-native-ocr.csv");
const imageMapPath = path.join(runDir, "image-map.json");
fs.writeFileSync(imageMapPath, JSON.stringify({ [row.evidence_id]: privatePath }, null, 2));
const run = spawnSync("node", [
  "scripts/run-ingredient-ocr.js",
  "--queue=docs/data/product-evidence/exports/pilot_photo_capture_rows.csv",
  "--run-id=ocr-runner-unit-main",
  `--run-dir=${runDir}`,
  "--limit=2",
  "--dry-run",
  `--image-map=${imageMapPath}`,
  `--public-ocr-summary=${publicCsv}`,
], { cwd: root, encoding: "utf8" });
assert.strictEqual(run.status, 0, run.stderr || run.stdout);
const publicRows = parseCsv(fs.readFileSync(publicCsv, "utf8"));
assert.strictEqual(publicRows.length, 2, "dry-run CLI should emit public OCR rows");
assert(publicRows.some((item) => item.ocr_status === "ocr_planned"), "expected planned OCR row");
assert(publicRows.some((item) => item.ocr_status === "ocr_skipped_no_image"), "expected skipped OCR row");
assertNoPrivatePaths(fs.readFileSync(publicCsv, "utf8"), "public OCR dry-run CSV");

console.log("ingredient OCR runner tests passed");
