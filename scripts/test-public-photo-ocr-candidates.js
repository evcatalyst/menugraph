const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  buildCandidateRecords,
  buildPublicPhotoOcrCandidates,
} = require("./build-public-photo-ocr-candidates");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

function assertNoPrivatePaths(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaked a private path`);
}

const primaryOcr = {
  run_id: "public-photo-ocr-test",
  evidence_id: "primary_doc",
  product_id: "sample_product",
  product_name: "Sample Product",
  vintage_label: "current",
  source_domain: "commons.wikimedia.org",
  source_url: "https://commons.wikimedia.org/wiki/File:Sample.pdf",
  proof_lane: "primary_ingredient_panel",
  status: "ocr_succeeded",
  processor: "macos_vision_text_recognition",
  line_count: 4,
  average_confidence: 0.91,
  ingredient_signal_found: true,
  ingredient_signal_lines: [
    "INGREDIENTS: sugar, enriched flour, palm oil",
    "CONTAINS: wheat, soy",
  ],
};

const secondaryOcr = {
  ...primaryOcr,
  evidence_id: "secondary_photo",
  proof_lane: "secondary_product_context",
};

const skippedOcr = {
  ...primaryOcr,
  evidence_id: "skipped",
  status: "ocr_skipped_no_image",
  ingredient_signal_found: false,
  ingredient_signal_lines: [],
};

const candidateRecords = buildCandidateRecords([primaryOcr, secondaryOcr, skippedOcr]);
assert.strictEqual(candidateRecords.length, 1, "only primary succeeded signal rows should become candidates");
assert.strictEqual(candidateRecords[0].candidate_only, true, "candidate record should stay candidate-only");
assert.strictEqual(candidateRecords[0].manual_verified, false, "candidate record cannot be manual verified");
assert(candidateRecords[0].candidate_raw_ingredient_text.includes("INGREDIENTS"), "primary OCR text should be retained as candidate text");

const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "public-photo-ocr-candidates-"));
const inputPath = path.join(runDir, "ocr/ingredient_ocr_results.jsonl");
const privateCandidateInput = path.join(runDir, "gpt55-review/public-photo-primary-ocr-candidates.jsonl");
const publicCsv = path.join(runDir, "public-candidates.csv");
const publicSummary = path.join(runDir, "public-candidates.json");
const siteSummary = path.join(runDir, "site-summary.json");
const publicPhotoOcrSummary = path.join(runDir, "public-photo-ocr-summary.json");
fs.mkdirSync(path.dirname(inputPath), { recursive: true });
fs.writeFileSync(inputPath, [primaryOcr, secondaryOcr, skippedOcr].map((row) => JSON.stringify(row)).join("\n"));
fs.writeFileSync(siteSummary, "{}\n");
fs.writeFileSync(publicPhotoOcrSummary, "{}\n");

const result = buildPublicPhotoOcrCandidates({
  runId: "public-photo-ocr-test",
  runDir,
  inputPath,
  privateCandidateInputPath: privateCandidateInput,
  publicSummaryPath: publicSummary,
  publicCsvPath: publicCsv,
  siteSummaryPath: siteSummary,
  publicPhotoOcrSummaryPath: publicPhotoOcrSummary,
});

assert.strictEqual(result.summary.source_ocr_result_count, 3, "summary should count OCR inputs");
assert.strictEqual(result.summary.primary_input_candidate_count, 1, "summary should count primary OCR candidates");
assert.strictEqual(result.summary.accepted_candidate_count, 1, "summary should accept supported primary candidate text");
assert.strictEqual(result.summary.rejected_candidate_count, 0, "summary should not reject supported primary candidate text");
assert.strictEqual(result.summary.public_safety.public_text_included, true, "public candidate text flag should be explicit");

const publicRows = parseCsv(fs.readFileSync(publicCsv, "utf8"));
assert.strictEqual(publicRows.length, 1, "public CSV should contain only primary candidate rows");
assert.strictEqual(publicRows[0].review_status, "candidate_review_ready", "candidate should be review-ready");
assert.strictEqual(Number(publicRows[0].manual_verified), 0, "public row cannot be verified");
assert.strictEqual(Number(publicRows[0].promotion_allowed), 0, "public row cannot allow promotion");
assert(publicRows[0].candidate_raw_ingredient_text.includes("INGREDIENTS"), "public candidate CSV should include candidate text when enabled");

const siteSummaryPayload = JSON.parse(fs.readFileSync(siteSummary, "utf8"));
const publicPhotoSummaryPayload = JSON.parse(fs.readFileSync(publicPhotoOcrSummary, "utf8"));
assert(siteSummaryPayload.public_photo_ocr_candidate_extract_summary, "site summary should expose candidate extract summary");
assert(publicPhotoSummaryPayload.candidate_extracts, "public photo OCR summary should expose candidate extract rollup");
assertNoPrivatePaths(fs.readFileSync(publicCsv, "utf8"), "public photo OCR candidate CSV");
assertNoPrivatePaths(fs.readFileSync(publicSummary, "utf8"), "public photo OCR candidate summary");
assertNoPrivatePaths(fs.readFileSync(siteSummary, "utf8"), "site summary");

console.log("public photo OCR candidate tests passed");
