const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  argValue,
  generatedAt,
  hashFile,
  hasFlag,
  numberArg,
  parseCsv,
  pathFromArg,
  publicArtifactRef,
  publicOcrSummaryCsvPath,
  queuePathFromArgs,
  readFullQueue,
  readJson,
  redactPrivate,
  runDirFromArgs,
  runIdFromArgs,
  selectQueueRows,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const swiftHarnessPath = path.join(root, "scripts/vision-ocr.swift");

const ingredientSignals = [
  /\bingredients?\b/i,
  /\bcontains\b/i,
  /\bmay contain\b/i,
  /\ballergen\b/i,
  /\bsugar\b/i,
  /\bflour\b/i,
  /\boil\b/i,
  /\bcocoa\b/i,
  /\blecithin\b/i,
  /\bleavening\b/i,
  /\bsalt\b/i,
  /\bnatural flavor\b/i,
  /\bartificial flavor\b/i,
  /\bnutrition facts\b/i,
  /\bserving size\b/i,
  /\bnet\s*(wt|weight)\b/i,
  /\bdistributed by\b/i,
  /\bmanufactured by\b/i,
];

function imageMapValue(imageMap, row) {
  if (!imageMap) return "";
  const candidates = [
    row.evidence_id,
    `${row.product_id}:${row.evidence_id}`,
    row.source_url,
  ].filter(Boolean);
  for (const key of candidates) {
    const value = imageMap[key];
    if (value && fs.existsSync(value)) return value;
  }
  return "";
}

function ocrLines(output) {
  if (!output) return [];
  if (Array.isArray(output.lines)) return output.lines;
  if (Array.isArray(output.output?.lines)) return output.output.lines;
  return [];
}

function lineText(line) {
  return String(line?.text || line || "").trim();
}

function ingredientSignalLines(lines) {
  return lines
    .map(lineText)
    .filter((text) => ingredientSignals.some((pattern) => pattern.test(text)));
}

function averageConfidence(lines) {
  const values = lines
    .map((line) => Number(line?.confidence))
    .filter(Number.isFinite);
  if (!values.length) return "";
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4));
}

function runSwiftOcr(imagePath, runDir) {
  const moduleCachePath = path.join(runDir, "ocr/swift-module-cache");
  fs.mkdirSync(moduleCachePath, { recursive: true });
  const run = spawnSync("swift", ["-module-cache-path", moduleCachePath, swiftHarnessPath, imagePath], {
    cwd: root,
    encoding: "utf8",
  });
  if (run.status !== 0) {
    return {
      status: "ocr_failed",
      error: (run.stderr || run.stdout || "Swift/Vision OCR failed").trim(),
      output: null,
    };
  }
  try {
    return {
      status: "ocr_succeeded",
      output: JSON.parse(run.stdout),
    };
  } catch (error) {
    return {
      status: "ocr_failed",
      error: `Could not parse Swift/Vision OCR JSON: ${error.message}`,
      output: null,
    };
  }
}

function buildPrivateOcrResult(row, imagePath, runResult, options = {}) {
  const lines = ocrLines(runResult.output);
  const signals = ingredientSignalLines(lines);
  return {
    schema_version: "ingredient_native_ocr_result.v1",
    generated_at: generatedAt,
    run_id: options.runId,
    evidence_id: row.evidence_id,
    product_id: row.product_id,
    product_name: row.product_name,
    vintage_label: row.vintage_label,
    source_domain: row.source_domain,
    source_url: row.source_url,
    proof_lane: row.proof_lane || "",
    proof_lane_rank: row.proof_lane_rank || "",
    status: runResult.status,
    processor: runResult.output?.processor || (options.dryRun ? "dry_run" : "macos_vision_text_recognition"),
    private_image_path: imagePath,
    image_sha256: imagePath && fs.existsSync(imagePath) ? hashFile(imagePath) : "",
    line_count: lines.length,
    average_confidence: averageConfidence(lines),
    ingredient_signal_found: signals.length > 0,
    ingredient_signal_lines: signals,
    error: runResult.error || "",
    output: runResult.output || null,
    candidate_only: true,
    manual_verified: false,
  };
}

function publicFailureReason(privateRow) {
  const error = String(privateRow.error || "").toLowerCase();
  if (!error) return "";
  if (/no private image-map entry/.test(error)) return "no_private_image_map_entry";
  if (/nilerror/.test(error)) return "vision_runtime_nil_error";
  if (/cvpixelbuffer|pixelbuffer/.test(error)) return "vision_pixel_buffer_failure";
  if (/could not read image/.test(error)) return "image_decode_failed";
  if (/parse swift\/vision ocr json|parse/.test(error)) return "swift_output_parse_failed";
  return "ocr_runtime_failed";
}

function publicOcrRow(privateRow) {
  return {
    run_id: privateRow.run_id,
    evidence_id: privateRow.evidence_id,
    product_id: privateRow.product_id,
    product_name: privateRow.product_name,
    vintage_label: privateRow.vintage_label,
    source_domain: privateRow.source_domain,
    proof_lane: privateRow.proof_lane || "",
    proof_lane_rank: privateRow.proof_lane_rank || "",
    ocr_status: privateRow.status,
    processor: privateRow.processor,
    failure_reason: publicFailureReason(privateRow),
    image_sha256: privateRow.image_sha256,
    line_count: privateRow.line_count,
    ingredient_signal_found: privateRow.ingredient_signal_found ? 1 : 0,
    ingredient_signal_line_count: privateRow.ingredient_signal_lines.length,
    average_confidence: privateRow.average_confidence,
    private_image_present: privateRow.private_image_path ? 1 : 0,
    candidate_only: 1,
    manual_verified: 0,
  };
}

function skippedOcrResult(row, reason, options = {}) {
  return buildPrivateOcrResult(row, "", {
    status: "ocr_skipped_no_image",
    error: reason,
    output: {
      processor: "not_run",
      lines: [],
    },
  }, options);
}

function plannedOcrResult(row, imagePath, options = {}) {
  return buildPrivateOcrResult(row, imagePath, {
    status: "ocr_planned",
    output: {
      processor: "dry_run",
      lines: [],
    },
  }, { ...options, dryRun: true });
}

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function writeMergedPublicOcrRows(runId, publicRows, outputPath) {
  const headers = [
    "run_id",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "proof_lane",
    "proof_lane_rank",
    "ocr_status",
    "processor",
    "failure_reason",
    "image_sha256",
    "line_count",
    "ingredient_signal_found",
    "ingredient_signal_line_count",
    "average_confidence",
    "private_image_present",
    "candidate_only",
    "manual_verified",
  ];
  const existingRows = fs.existsSync(outputPath)
    ? parseCsv(fs.readFileSync(outputPath, "utf8"))
    : [];
  const retained = existingRows.filter((row) => row.run_id !== runId);
  writeCsv(outputPath, headers, [...retained, ...publicRows]);
}

function summarize(runId, privateRows, publicOcrSummaryPath) {
  const countStatus = (status) => privateRows.filter((row) => row.status === status).length;
  return redactPrivate({
    schema_version: "ingredient_native_ocr_summary.v1",
    generated_at: generatedAt,
    run_id: runId,
    public_safety: {
      private_paths_committed: false,
      ocr_text_committed: false,
      images_committed: false,
      candidate_only: true,
      manual_verified_created: false,
    },
    totals: {
      rows_selected: privateRows.length,
      primary_ingredient_panel_rows: privateRows.filter((row) => row.proof_lane === "primary_ingredient_panel").length,
      secondary_product_context_rows: privateRows.filter((row) => row.proof_lane === "secondary_product_context").length,
      ocr_planned: countStatus("ocr_planned"),
      ocr_attempted: countStatus("ocr_succeeded") + countStatus("ocr_failed"),
      ocr_succeeded: countStatus("ocr_succeeded"),
      primary_ocr_succeeded: privateRows.filter((row) => row.proof_lane === "primary_ingredient_panel" && row.status === "ocr_succeeded").length,
      secondary_ocr_succeeded: privateRows.filter((row) => row.proof_lane === "secondary_product_context" && row.status === "ocr_succeeded").length,
      ocr_failed: countStatus("ocr_failed"),
      vision_runtime_nil_error: privateRows.filter((row) => publicFailureReason(row) === "vision_runtime_nil_error").length,
      vision_pixel_buffer_failure: privateRows.filter((row) => publicFailureReason(row) === "vision_pixel_buffer_failure").length,
      no_private_image_map_entry: privateRows.filter((row) => publicFailureReason(row) === "no_private_image_map_entry").length,
      ocr_skipped_no_image: countStatus("ocr_skipped_no_image"),
      ingredient_signal_found: privateRows.filter((row) => row.ingredient_signal_found).length,
      primary_ingredient_signal_found: privateRows.filter((row) => row.proof_lane === "primary_ingredient_panel" && row.ingredient_signal_found).length,
      secondary_ingredient_signal_found: privateRows.filter((row) => row.proof_lane === "secondary_product_context" && row.ingredient_signal_found).length,
      needs_human_correction: privateRows.filter((row) => row.status === "ocr_succeeded").length,
    },
    public_artifacts: {
      ocr_summary_csv: publicArtifactRef(publicOcrSummaryPath),
    },
  });
}

function main() {
  const runId = runIdFromArgs("hybrid-ocr");
  const runDir = runDirFromArgs(runId);
  const dryRun = hasFlag("dry-run");
  const queuePath = queuePathFromArgs();
  const imageMapPath = argValue("image-map", path.join(runDir, "image-map.json"));
  const imageMap = readJson(imageMapPath, {});
  const publicOcrSummaryPath = pathFromArg("public-ocr-summary", publicOcrSummaryCsvPath);
  const rows = selectQueueRows(readFullQueue(queuePath), {
    limit: numberArg("limit", 250),
    product: argValue("product"),
    category: argValue("category"),
    sourceDomain: argValue("source-domain"),
    gapCategory: argValue("gap-category"),
    priority: argValue("priority"),
  });

  const privateRows = rows.map((row) => {
    const imagePath = imageMapValue(imageMap, row);
    if (!imagePath) return skippedOcrResult(row, "No private image-map entry resolved for this evidence row.", { runId });
    if (dryRun) return plannedOcrResult(row, imagePath, { runId });
    return buildPrivateOcrResult(row, imagePath, runSwiftOcr(imagePath, runDir), { runId });
  });
  const publicRows = privateRows.map(publicOcrRow);
  const ocrDir = path.join(runDir, "ocr");
  writeJsonl(path.join(ocrDir, "ingredient_ocr_results.jsonl"), privateRows);
  writeCsv(path.join(ocrDir, "ingredient_ocr_summary.public.csv"), [
    "run_id",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "proof_lane",
    "proof_lane_rank",
    "ocr_status",
    "processor",
    "failure_reason",
    "image_sha256",
    "line_count",
    "ingredient_signal_found",
    "ingredient_signal_line_count",
    "average_confidence",
    "private_image_present",
    "candidate_only",
    "manual_verified",
  ], publicRows);
  writeMergedPublicOcrRows(runId, publicRows, publicOcrSummaryPath);
  const summary = summarize(runId, privateRows, publicOcrSummaryPath);
  writeJson(path.join(ocrDir, "ingredient_ocr_summary.public.json"), summary);

  console.log(JSON.stringify({
    run_id: runId,
    selected_rows: rows.length,
    ocr_planned: summary.totals.ocr_planned,
    ocr_attempted: summary.totals.ocr_attempted,
    ocr_succeeded: summary.totals.ocr_succeeded,
    ocr_failed: summary.totals.ocr_failed,
    ocr_skipped_no_image: summary.totals.ocr_skipped_no_image,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  averageConfidence,
  buildPrivateOcrResult,
  imageMapValue,
  ingredientSignalLines,
  plannedOcrResult,
  publicFailureReason,
  publicOcrRow,
  skippedOcrResult,
  summarize,
};
