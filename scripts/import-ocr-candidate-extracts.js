const fs = require("fs");
const path = require("path");
const {
  argValue,
  generatedAt,
  hasFlag,
  isPrivatePath,
  normalizeText,
  pathFromArg,
  publicArtifactRef,
  readJson,
  redactPrivate,
  responseHash,
  runDirFromArgs,
  runIdFromArgs,
  shortHash,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const defaultPublicSummaryPath = path.join(root, "docs/data/product-evidence/hybrid_ocr_candidate_extracts_summary.json");
const defaultPublicCsvPath = path.join(root, "docs/data/product-evidence/exports/hybrid_ocr_candidate_extracts.csv");

const candidateTextFields = [
  "candidate_raw_ingredient_text",
  "candidate_allergen_text",
  "candidate_manufacturer_or_distributor",
  "candidate_net_weight",
  "candidate_serving_size",
];

const allowedReviewStatuses = new Set([
  "candidate_review_ready",
  "needs_better_crop",
  "needs_source_review",
  "needs_manual_transcription",
  "reject_candidate",
]);

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\n+/)
    .filter(Boolean)
    .flatMap((line) => expandPayload(JSON.parse(line)));
}

function expandPayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.flatMap(expandPayload);
  if (Array.isArray(payload.candidates)) return payload.candidates.flatMap(expandPayload);
  if (Array.isArray(payload.results)) return payload.results.flatMap(expandPayload);
  if (Array.isArray(payload.reviews)) return payload.reviews.flatMap(expandPayload);
  if (Array.isArray(payload.records)) return payload.records.flatMap(expandPayload);
  return [payload];
}

function readInputRecords(inputPath) {
  if (!inputPath || !fs.existsSync(inputPath)) return [];
  const stat = fs.statSync(inputPath);
  if (stat.isDirectory()) {
    return fs.readdirSync(inputPath)
      .filter((file) => /\.(jsonl|json)$/i.test(file))
      .sort()
      .flatMap((file) => readInputRecords(path.join(inputPath, file)));
  }
  if (/\.jsonl$/i.test(inputPath)) return readJsonl(inputPath);
  return expandPayload(JSON.parse(fs.readFileSync(inputPath, "utf8")));
}

function normalizeCandidateRecord(rawRecord = {}) {
  const record = rawRecord.output && typeof rawRecord.output === "object"
    ? { ...rawRecord, ...rawRecord.output }
    : { ...rawRecord };
  return {
    evidence_id: normalizeText(record.evidence_id),
    product_id: normalizeText(record.product_id),
    product_name: normalizeText(record.product_name),
    vintage_label: normalizeText(record.vintage_label),
    source_domain: normalizeText(record.source_domain),
    source_url: normalizeText(record.source_url),
    review_status: normalizeText(record.review_status || record.status || "candidate_review_ready"),
    candidate_raw_ingredient_text: normalizeText(record.candidate_raw_ingredient_text || record.raw_ingredient_text || record.ingredient_text),
    candidate_allergen_text: normalizeText(record.candidate_allergen_text || record.allergen_text),
    candidate_manufacturer_or_distributor: normalizeText(record.candidate_manufacturer_or_distributor || record.manufacturer_or_distributor_text || record.manufacturer_text),
    candidate_net_weight: normalizeText(record.candidate_net_weight || record.net_weight),
    candidate_serving_size: normalizeText(record.candidate_serving_size || record.serving_size),
    confidence: Number.isFinite(Number(record.confidence)) ? Number(record.confidence) : null,
    uncertainty_note: normalizeText(record.uncertainty_note || record.reviewer_note || record.note),
    candidate_only: record.candidate_only === undefined ? true : Boolean(record.candidate_only),
    manual_verified: Boolean(record.manual_verified),
    provider: normalizeText(record.provider || "codex"),
    model: normalizeText(record.model || record.model_name || ""),
    packet_id: normalizeText(record.packet_id),
    prompt_hash: normalizeText(record.prompt_hash),
    response_hash: normalizeText(record.response_hash || responseHash(JSON.stringify(rawRecord))),
    ocr_lines: normalizeOcrLines(record.ocr_lines || record.source_ocr_lines || rawRecord.ocr_lines || []),
    raw_record: rawRecord,
  };
}

function normalizeOcrLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map((line) => normalizeText(typeof line === "string" ? line : line?.text)).filter(Boolean);
}

function candidateFieldValues(record) {
  return candidateTextFields.map((field) => record[field]).filter(Boolean);
}

function normalizedTokens(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !["and", "the", "with", "for", "contains", "ingredient", "ingredients"].includes(token));
}

function unsupportedOcrTokens(record) {
  if (!record.ocr_lines.length) return [];
  const ocrTokens = new Set(normalizedTokens(record.ocr_lines.join(" ")));
  return [...new Set(candidateFieldValues(record).flatMap(normalizedTokens))]
    .filter((token) => !ocrTokens.has(token));
}

function privateLeakFields(record) {
  return Object.entries(record)
    .filter(([key, value]) => key !== "raw_record" && key !== "ocr_lines" && typeof value === "string" && isPrivatePath(value))
    .map(([key]) => key);
}

function validateCandidate(record, { requireOcrSupport = true } = {}) {
  if (!record.evidence_id) return { accepted: false, reason: "missing_evidence_id" };
  if (record.manual_verified) return { accepted: false, reason: "manual_verified_forbidden" };
  if (!record.candidate_only) return { accepted: false, reason: "candidate_only_false" };
  if (!candidateFieldValues(record).length) return { accepted: false, reason: "no_candidate_text_fields" };
  const leakFields = privateLeakFields(record);
  if (leakFields.length) return { accepted: false, reason: `private_path_in_${leakFields.join("_")}` };
  if (!allowedReviewStatuses.has(record.review_status)) return { accepted: false, reason: "unsupported_review_status" };
  const unsupported = unsupportedOcrTokens(record);
  if (requireOcrSupport && record.ocr_lines.length && unsupported.length) {
    return { accepted: false, reason: "candidate_text_not_supported_by_ocr", unsupported_tokens: unsupported.slice(0, 12) };
  }
  return { accepted: true, reason: "" };
}

function candidateTextHash(record) {
  return shortHash(candidateFieldValues(record).join("\n"), 16);
}

function publicValue(value) {
  return isPrivatePath(value) ? "[private_path_redacted]" : value;
}

function publicCandidateRow(record, validation, { publishCandidateText = false, runId = "" } = {}) {
  const base = {
    run_id: runId,
    evidence_id: record.evidence_id,
    product_id: record.product_id,
    product_name: record.product_name,
    vintage_label: record.vintage_label,
    source_domain: record.source_domain,
    source_url: publicValue(record.source_url),
    review_status: validation.accepted ? record.review_status : "reject_candidate",
    candidate_field_count: candidateFieldValues(record).length,
    candidate_text_hash: candidateTextHash(record),
    has_ingredient_text: record.candidate_raw_ingredient_text ? 1 : 0,
    has_allergen_text: record.candidate_allergen_text ? 1 : 0,
    has_manufacturer_or_distributor: record.candidate_manufacturer_or_distributor ? 1 : 0,
    has_net_weight: record.candidate_net_weight ? 1 : 0,
    has_serving_size: record.candidate_serving_size ? 1 : 0,
    confidence: record.confidence === null ? "" : record.confidence,
    uncertainty_note: record.uncertainty_note,
    provider: record.provider,
    model: record.model,
    packet_id: record.packet_id,
    prompt_hash: record.prompt_hash,
    response_hash: record.response_hash,
    candidate_only: 1,
    manual_verified: 0,
    public_text_included: publishCandidateText ? 1 : 0,
    promotion_allowed: 0,
    rejection_reason: validation.reason || "",
    unsupported_ocr_tokens: (validation.unsupported_tokens || []).join(";"),
  };
  if (!publishCandidateText) return base;
  return {
    ...base,
    candidate_raw_ingredient_text: publicValue(record.candidate_raw_ingredient_text),
    candidate_allergen_text: publicValue(record.candidate_allergen_text),
    candidate_manufacturer_or_distributor: publicValue(record.candidate_manufacturer_or_distributor),
    candidate_net_weight: publicValue(record.candidate_net_weight),
    candidate_serving_size: publicValue(record.candidate_serving_size),
  };
}

function countRowsBy(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const key = normalizeText(row[field]) || "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key, count]) => ({ key, count }));
}

function buildSummary({ runId, inputRecordCount, rows, publicCsvPath, publishCandidateText }) {
  const accepted = rows.filter((row) => !row.rejection_reason);
  const rejected = rows.filter((row) => row.rejection_reason);
  return redactPrivate({
    schema_version: "ingredient_ocr_candidate_extracts_summary.v1",
    generated_at: generatedAt,
    run_id: runId,
    input_record_count: inputRecordCount,
    accepted_candidate_count: accepted.length,
    rejected_candidate_count: rejected.length,
    candidate_review_ready: accepted.filter((row) => row.review_status === "candidate_review_ready").length,
    needs_manual_transcription: accepted.filter((row) => row.review_status === "needs_manual_transcription").length,
    needs_better_crop: accepted.filter((row) => row.review_status === "needs_better_crop").length,
    needs_source_review: accepted.filter((row) => row.review_status === "needs_source_review").length,
    rejected_by_reason: countRowsBy(rejected, "rejection_reason"),
    field_presence: {
      ingredient_text: accepted.filter((row) => Number(row.has_ingredient_text)).length,
      allergen_text: accepted.filter((row) => Number(row.has_allergen_text)).length,
      manufacturer_or_distributor: accepted.filter((row) => Number(row.has_manufacturer_or_distributor)).length,
      net_weight: accepted.filter((row) => Number(row.has_net_weight)).length,
      serving_size: accepted.filter((row) => Number(row.has_serving_size)).length,
    },
    public_safety: {
      candidate_only: true,
      manual_verified_created: false,
      promotion_allowed: false,
      private_paths_committed: false,
      public_text_included: Boolean(publishCandidateText),
      default_text_policy: "Candidate text is omitted by default; use --publish-candidate-text only after deciding the public page may show candidate OCR text with visible candidate labels.",
    },
    public_artifacts: {
      candidate_extracts_csv: publicArtifactRef(publicCsvPath),
    },
  });
}

function candidateCsvHeaders(publishCandidateText = false) {
  const headers = [
    "run_id",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "review_status",
    "candidate_field_count",
    "candidate_text_hash",
    "has_ingredient_text",
    "has_allergen_text",
    "has_manufacturer_or_distributor",
    "has_net_weight",
    "has_serving_size",
    "confidence",
    "uncertainty_note",
    "provider",
    "model",
    "packet_id",
    "prompt_hash",
    "response_hash",
    "candidate_only",
    "manual_verified",
    "public_text_included",
    "promotion_allowed",
    "rejection_reason",
    "unsupported_ocr_tokens",
  ];
  return publishCandidateText
    ? headers.concat(candidateTextFields)
    : headers;
}

function importOcrCandidateExtracts({
  runId = runIdFromArgs("hybrid-ocr"),
  runDir = runDirFromArgs(runId),
  inputPath = path.join(runDir, "gpt55-review/ocr-candidate-extracts.jsonl"),
  publicSummaryPath = defaultPublicSummaryPath,
  publicCsvPath = defaultPublicCsvPath,
  publishCandidateText = false,
  requireOcrSupport = true,
  updateSiteSummary = true,
} = {}) {
  const inputRecords = readInputRecords(inputPath);
  const rows = inputRecords.map((rawRecord) => {
    const record = normalizeCandidateRecord(rawRecord);
    const validation = validateCandidate(record, { requireOcrSupport });
    return publicCandidateRow(record, validation, { publishCandidateText, runId });
  });
  writeCsv(publicCsvPath, candidateCsvHeaders(publishCandidateText), rows);
  const summary = buildSummary({ runId, inputRecordCount: inputRecords.length, rows, publicCsvPath, publishCandidateText });
  writeJson(publicSummaryPath, summary);

  if (updateSiteSummary) {
    const siteSummary = readJson(summaryPath, {});
    siteSummary.ocr_candidate_extract_summary = summary;
    siteSummary.ingredient_ocr_summary = siteSummary.ingredient_ocr_summary || {};
    siteSummary.ingredient_ocr_summary.ocr_candidate_extract_summary = summary;
    writeJson(summaryPath, siteSummary);
  }
  return { rows, summary };
}

function main() {
  const runId = runIdFromArgs("hybrid-ocr");
  const runDir = runDirFromArgs(runId);
  const result = importOcrCandidateExtracts({
    runId,
    runDir,
    inputPath: path.resolve(argValue("input", path.join(runDir, "gpt55-review/ocr-candidate-extracts.jsonl"))),
    publicSummaryPath: pathFromArg("public-summary", defaultPublicSummaryPath),
    publicCsvPath: pathFromArg("public-csv", defaultPublicCsvPath),
    publishCandidateText: hasFlag("publish-candidate-text"),
    requireOcrSupport: !hasFlag("allow-unsupported-text"),
  });
  console.log(JSON.stringify({
    run_id: result.summary.run_id,
    input_record_count: result.summary.input_record_count,
    accepted_candidate_count: result.summary.accepted_candidate_count,
    rejected_candidate_count: result.summary.rejected_candidate_count,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  candidateCsvHeaders,
  importOcrCandidateExtracts,
  normalizeCandidateRecord,
  publicCandidateRow,
  readInputRecords,
  unsupportedOcrTokens,
  validateCandidate,
};
