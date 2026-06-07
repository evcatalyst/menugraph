const fs = require("fs");
const path = require("path");
const {
  argValue,
  generatedAt,
  hasFlag,
  pathFromArg,
  publicArtifactRef,
  readJson,
  runDirFromArgs,
  runIdFromArgs,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");
const { importOcrCandidateExtracts } = require("./import-ocr-candidate-extracts");

const root = path.join(__dirname, "..");
const defaultSummaryPath = path.join(root, "docs/data/product-evidence/public_photo_ocr_candidate_extracts_summary.json");
const defaultCsvPath = path.join(root, "docs/data/product-evidence/exports/public_photo_ocr_candidate_extracts.csv");
const defaultSiteSummaryPath = path.join(root, "docs/data/product-evidence/summary.json");
const defaultPublicPhotoOcrSummaryPath = path.join(root, "docs/data/product-evidence/public_photo_ocr_summary.json");

function readJsonl(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function boundedText(lines, maxChars = 5000) {
  let text = "";
  for (const line of lines) {
    const next = text ? `${text}\n${line}` : line;
    if (next.length > maxChars) break;
    text = next;
  }
  return text;
}

function allergenLines(lines) {
  return lines.filter((line) => /\b(allergen|contains|wheat|soy|milk|egg|peanut|tree nut|sesame)\b/i.test(line));
}

function candidateRecordFromOcr(row) {
  const signalLines = Array.isArray(row.ingredient_signal_lines) ? row.ingredient_signal_lines : [];
  return {
    evidence_id: row.evidence_id,
    product_id: row.product_id,
    product_name: row.product_name,
    vintage_label: row.vintage_label,
    source_domain: row.source_domain,
    source_url: row.source_url,
    review_status: "candidate_review_ready",
    candidate_raw_ingredient_text: boundedText(signalLines),
    candidate_allergen_text: boundedText(allergenLines(signalLines), 1600),
    confidence: Number.isFinite(Number(row.average_confidence)) ? Number(row.average_confidence) : "",
    uncertainty_note: "Candidate OCR text from a primary ingredient/document proof row. Reviewer correction and source review are required before any formulation claim.",
    candidate_only: true,
    manual_verified: false,
    provider: "apple_vision",
    model: row.processor || "macos_vision_text_recognition",
    packet_id: `${row.run_id || "public-photo-ocr"}:primary_ocr_candidate`,
    ocr_lines: signalLines.map((text) => ({ text })),
  };
}

function buildCandidateRecords(ocrRows, { primaryOnly = true } = {}) {
  return ocrRows
    .filter((row) => row.status === "ocr_succeeded")
    .filter((row) => !primaryOnly || row.proof_lane === "primary_ingredient_panel")
    .filter((row) => row.ingredient_signal_found && Array.isArray(row.ingredient_signal_lines) && row.ingredient_signal_lines.length)
    .map(candidateRecordFromOcr);
}

function updatePublicSummaries({ publicSummaryPath, publicCsvPath, siteSummaryPath, publicPhotoOcrSummaryPath, summary }) {
  const siteSummary = readJson(siteSummaryPath, {});
  siteSummary.public_photo_ocr_candidate_extract_summary = summary;
  writeJson(siteSummaryPath, siteSummary);

  const publicPhotoOcrSummary = readJson(publicPhotoOcrSummaryPath, {});
  publicPhotoOcrSummary.candidate_extracts = {
    accepted_candidate_count: summary.accepted_candidate_count,
    rejected_candidate_count: summary.rejected_candidate_count,
    public_text_included: summary.public_safety.public_text_included,
    public_artifacts: {
      candidate_extracts_csv: publicArtifactRef(publicCsvPath),
      candidate_extracts_summary_json: publicArtifactRef(publicSummaryPath),
    },
  };
  writeJson(publicPhotoOcrSummaryPath, publicPhotoOcrSummary);

  siteSummary.public_photo_ocr_summary = publicPhotoOcrSummary;
  writeJson(siteSummaryPath, siteSummary);
}

function buildPublicPhotoOcrCandidates({
  runId = runIdFromArgs("public-photo-ocr-v1"),
  runDir = runDirFromArgs(runId),
  inputPath = path.join(runDir, "ocr/ingredient_ocr_results.jsonl"),
  privateCandidateInputPath = path.join(runDir, "gpt55-review/public-photo-primary-ocr-candidates.jsonl"),
  publicSummaryPath = defaultSummaryPath,
  publicCsvPath = defaultCsvPath,
  siteSummaryPath = defaultSiteSummaryPath,
  publicPhotoOcrSummaryPath = defaultPublicPhotoOcrSummaryPath,
  publishCandidateText = true,
  updateSiteSummary = true,
} = {}) {
  const ocrRows = readJsonl(inputPath);
  const candidateRecords = buildCandidateRecords(ocrRows, { primaryOnly: true });
  writeJsonl(privateCandidateInputPath, candidateRecords);
  const result = importOcrCandidateExtracts({
    runId,
    runDir,
    inputPath: privateCandidateInputPath,
    publicSummaryPath,
    publicCsvPath,
    publishCandidateText,
    requireOcrSupport: true,
    updateSiteSummary: false,
  });
  const summary = {
    ...result.summary,
    schema_version: "public_photo_ocr_candidate_extracts_summary.v1",
    source_ocr_result_count: ocrRows.length,
    primary_input_candidate_count: candidateRecords.length,
    public_policy: "Candidate OCR text is shown only for primary ingredient/document proof rows and cannot support formulation claims until manually verified.",
  };
  writeJson(publicSummaryPath, summary);
  if (updateSiteSummary) {
    updatePublicSummaries({ publicSummaryPath, publicCsvPath, siteSummaryPath, publicPhotoOcrSummaryPath, summary });
  }
  return { rows: result.rows, summary, candidateRecords };
}

function main() {
  const runId = runIdFromArgs("public-photo-ocr-v1");
  const runDir = runDirFromArgs(runId);
  const result = buildPublicPhotoOcrCandidates({
    runId,
    runDir,
    inputPath: pathFromArg("input", path.join(runDir, "ocr/ingredient_ocr_results.jsonl")),
    privateCandidateInputPath: pathFromArg("private-candidate-input", path.join(runDir, "gpt55-review/public-photo-primary-ocr-candidates.jsonl")),
    publicSummaryPath: pathFromArg("public-summary", defaultSummaryPath),
    publicCsvPath: pathFromArg("public-csv", defaultCsvPath),
    publishCandidateText: !hasFlag("no-public-candidate-text"),
    updateSiteSummary: !hasFlag("no-site-summary"),
  });
  console.log(JSON.stringify({
    run_id: result.summary.run_id,
    source_ocr_result_count: result.summary.source_ocr_result_count,
    accepted_candidate_count: result.summary.accepted_candidate_count,
    rejected_candidate_count: result.summary.rejected_candidate_count,
    public_text_included: result.summary.public_safety.public_text_included,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildCandidateRecords,
  buildPublicPhotoOcrCandidates,
  candidateRecordFromOcr,
};
