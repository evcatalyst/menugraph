const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  importOcrCandidateExtracts,
  readInputRecords,
  unsupportedOcrTokens,
  validateCandidate,
  normalizeCandidateRecord,
} = require("./import-ocr-candidate-extracts");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");

function assertNoPrivatePaths(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaked a private path`);
}

const validCandidate = {
  evidence_id: "flickr_oreo_1993",
  product_id: "oreo_original_chocolate_sandwich_cookies",
  product_name: "Oreo Original Chocolate Sandwich Cookies",
  vintage_label: "1993 label candidate",
  source_domain: "www.flickr.com",
  source_url: "https://www.flickr.com/photos/example/1",
  review_status: "candidate_review_ready",
  candidate_raw_ingredient_text: "INGREDIENTS: sugar, flour, oil",
  candidate_allergen_text: "CONTAINS: wheat, soy",
  candidate_net_weight: "NET WT 14.3 OZ",
  confidence: 0.82,
  uncertainty_note: "Candidate text only; reviewer correction required.",
  candidate_only: true,
  manual_verified: false,
  provider: "codex",
  model: "gpt-5.3-codex-spark",
  packet_id: "ocr_struct_test",
  ocr_lines: [
    { text: "INGREDIENTS: sugar, flour, oil" },
    { text: "CONTAINS: wheat, soy" },
    { text: "NET WT 14.3 OZ" },
  ],
};

const manualVerifiedCandidate = {
  ...validCandidate,
  evidence_id: "manual_bad",
  manual_verified: true,
};

const unsupportedCandidate = {
  ...validCandidate,
  evidence_id: "unsupported_bad",
  candidate_raw_ingredient_text: "INGREDIENTS: sugar, flour, unicorn extract",
};

const privatePathCandidate = {
  ...validCandidate,
  evidence_id: "private_path_bad",
  source_url: "/private/tmp/panel.png",
};

const emptyCandidate = {
  evidence_id: "empty_bad",
  candidate_only: true,
  manual_verified: false,
};

const normalizedValid = normalizeCandidateRecord(validCandidate);
assert.strictEqual(validateCandidate(normalizedValid).accepted, true, "valid candidate should pass");
assert.deepStrictEqual(unsupportedOcrTokens(normalizedValid), [], "valid candidate should be supported by OCR lines");
assert.strictEqual(validateCandidate(normalizeCandidateRecord(manualVerifiedCandidate)).reason, "manual_verified_forbidden", "manual verified candidates must be rejected");
assert.strictEqual(validateCandidate(normalizeCandidateRecord(unsupportedCandidate)).reason, "candidate_text_not_supported_by_ocr", "unsupported OCR text must be rejected");
assert.strictEqual(validateCandidate(normalizeCandidateRecord(privatePathCandidate)).reason, "private_path_in_source_url", "private paths must be rejected");
assert.strictEqual(validateCandidate(normalizeCandidateRecord(emptyCandidate)).reason, "no_candidate_text_fields", "empty candidates must be rejected");

const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "ocr-candidate-extracts-"));
const inputPath = path.join(runDir, "gpt55-review/ocr-candidate-extracts.jsonl");
const publicCsv = path.join(runDir, "public-candidates.csv");
const publicSummary = path.join(runDir, "public-candidates.json");
fs.mkdirSync(path.dirname(inputPath), { recursive: true });
fs.writeFileSync(inputPath, [
  validCandidate,
  manualVerifiedCandidate,
  unsupportedCandidate,
  privatePathCandidate,
  emptyCandidate,
].map((row) => JSON.stringify(row)).join("\n"));

assert.strictEqual(readInputRecords(inputPath).length, 5, "JSONL reader should load all records");

const result = importOcrCandidateExtracts({
  runId: "ocr-candidate-test",
  inputPath,
  publicCsvPath: publicCsv,
  publicSummaryPath: publicSummary,
  updateSiteSummary: false,
});

assert.strictEqual(result.summary.input_record_count, 5, "summary should count input records");
assert.strictEqual(result.summary.accepted_candidate_count, 1, "summary should count accepted candidates");
assert.strictEqual(result.summary.rejected_candidate_count, 4, "summary should count rejected candidates");
assert.strictEqual(result.summary.public_safety.public_text_included, false, "default public output should omit candidate text");
assert.strictEqual(result.summary.public_safety.manual_verified_created, false, "importer cannot create manual verification");

const publicCsvText = fs.readFileSync(publicCsv, "utf8");
const publicSummaryText = fs.readFileSync(publicSummary, "utf8");
const publicRows = parseCsv(publicCsvText);
assert.strictEqual(publicRows.length, 5, "public CSV should retain accepted and rejected rows for audit");
assert(publicRows.some((row) => row.evidence_id === "flickr_oreo_1993" && row.review_status === "candidate_review_ready"), "accepted row should stay review-ready");
assert(publicRows.some((row) => row.rejection_reason === "manual_verified_forbidden"), "manual verification rejection should be visible");
assert(publicRows.every((row) => Number(row.manual_verified) === 0), "public rows must never mark manual verified");
assert(publicRows.every((row) => Number(row.promotion_allowed) === 0), "public rows must never allow claim promotion");
assert(!publicCsvText.includes("INGREDIENTS: sugar"), "default public CSV should not publish candidate OCR text");
assert(!publicSummaryText.includes("INGREDIENTS: sugar"), "public summary should not publish candidate OCR text");
assertNoPrivatePaths(publicCsvText, "public candidate CSV");
assertNoPrivatePaths(publicSummaryText, "public candidate summary");

const textCsv = path.join(runDir, "public-candidates-with-text.csv");
const textSummary = path.join(runDir, "public-candidates-with-text.json");
const textResult = importOcrCandidateExtracts({
  runId: "ocr-candidate-test",
  inputPath,
  publicCsvPath: textCsv,
  publicSummaryPath: textSummary,
  updateSiteSummary: false,
  publishCandidateText: true,
});
const textCsvRows = parseCsv(fs.readFileSync(textCsv, "utf8"));
assert.strictEqual(textResult.summary.public_safety.public_text_included, true, "explicit text flag should be recorded");
assert(textCsvRows.some((row) => row.candidate_raw_ingredient_text === "INGREDIENTS: sugar, flour, oil"), "explicit text flag should include candidate text");
assertNoPrivatePaths(fs.readFileSync(textCsv, "utf8"), "public candidate text CSV");

const defaultPublicCsvPath = path.join(root, "docs/data/product-evidence/exports/hybrid_ocr_candidate_extracts.csv");
const defaultPublicSummaryPath = path.join(root, "docs/data/product-evidence/hybrid_ocr_candidate_extracts_summary.json");
assert(fs.existsSync(defaultPublicCsvPath), "default candidate extract CSV should exist");
assert(fs.existsSync(defaultPublicSummaryPath), "default candidate extract summary should exist");
assert(!fs.readFileSync(defaultPublicCsvPath, "utf8").includes("candidate_raw_ingredient_text"), "default public candidate CSV should not include text columns");

console.log("OCR candidate extract tests passed");
