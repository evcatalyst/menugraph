const fs = require("fs");
const path = require("path");
const {
  argValue,
  generatedAt,
  numberArg,
  pathFromArg,
  publicArtifactRef,
  readJson,
  redactPrivate,
  runDirFromArgs,
  runIdFromArgs,
  shortHash,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const defaultPublicSummaryPath = path.join(__dirname, "../docs/data/product-evidence/hybrid_ocr_structuring_summary.json");
const defaultPublicCsvPath = path.join(__dirname, "../docs/data/product-evidence/exports/hybrid_ocr_structuring_packets.csv");

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function lineText(line) {
  return String(line?.text || line || "").trim();
}

function selectedOcrRows(rows, { limit = 0, requireSignal = true } = {}) {
  const selected = rows.filter((row) => (
    row.status === "ocr_succeeded"
    && Array.isArray(row.output?.lines)
    && row.output.lines.some((line) => lineText(line))
    && (!requireSignal || row.ingredient_signal_found === true || Number(row.ingredient_signal_found) === 1)
  ));
  return limit ? selected.slice(0, limit) : selected;
}

function compactOcrLines(row, maxLines = 80) {
  return (row.output?.lines || [])
    .map((line, index) => ({
      index,
      text: lineText(line),
      confidence: Number.isFinite(Number(line?.confidence)) ? Number(line.confidence) : null,
      bounding_box: line?.boundingBox || line?.bounding_box || null,
    }))
    .filter((line) => line.text)
    .slice(0, maxLines);
}

function buildPackets(rows, { runId, packetSize = 10, maxLines = 80 } = {}) {
  const packets = [];
  for (let start = 0; start < rows.length; start += packetSize) {
    const packetRows = rows.slice(start, start + packetSize);
    const packetId = `ocr_struct_${shortHash(`${runId}:${start}:${packetRows.map((row) => row.evidence_id).join("|")}`, 14)}`;
    packets.push({
      schema_version: "ingredient_ocr_structuring_packet.v1",
      generated_at: generatedAt,
      run_id: runId,
      packet_id: packetId,
      provider_route: {
        primary_model: "gpt-5.3-codex-spark",
        quality_gate_model: "gpt-5.5",
        route_policy: "Spark structures OCR text into candidate fields; GPT-5.5 reviews compact batches. Neither can mark manual_verified.",
      },
      instructions: [
        "Return JSON only.",
        "Use only the OCR lines provided; do not invent missing words.",
        "Preserve raw candidate ingredient text, allergen text, manufacturer/distributor text, net weight, serving size, and uncertainty notes when visible.",
        "Mark every output candidate_only=true and manual_verified=false.",
        "Reject or leave blank fields when OCR lines do not support them.",
      ],
      required_output_schema: {
        evidence_id: "string",
        candidate_raw_ingredient_text: "string",
        candidate_allergen_text: "string",
        candidate_manufacturer_or_distributor: "string",
        candidate_net_weight: "string",
        candidate_serving_size: "string",
        confidence: "number",
        uncertainty_note: "string",
        candidate_only: "boolean",
        manual_verified: "boolean",
      },
      source_rows: packetRows.map((row) => ({
        evidence_id: row.evidence_id,
        product_id: row.product_id,
        product_name: row.product_name,
        vintage_label: row.vintage_label,
        source_domain: row.source_domain,
        source_url: row.source_url,
        image_sha256: row.image_sha256,
        line_count: row.line_count,
        average_confidence: row.average_confidence,
        ingredient_signal_lines: row.ingredient_signal_lines || [],
        ocr_lines: compactOcrLines(row, maxLines),
      })),
      candidate_only: true,
      manual_verified: false,
    });
  }
  return packets;
}

function writePrivatePackets(packets, packetDir) {
  fs.mkdirSync(packetDir, { recursive: true });
  for (const packet of packets) {
    writeJson(path.join(packetDir, `${packet.packet_id}.json`), packet);
  }
}

function publicPacketRows(packets) {
  return packets.map((packet) => {
    const lineCount = packet.source_rows.reduce((sum, row) => sum + Number(row.line_count || 0), 0);
    const signalCount = packet.source_rows.reduce((sum, row) => sum + (row.ingredient_signal_lines || []).length, 0);
    return {
      run_id: packet.run_id,
      packet_id: packet.packet_id,
      provider: "codex",
      primary_model: packet.provider_route.primary_model,
      quality_gate_model: packet.provider_route.quality_gate_model,
      source_row_count: packet.source_rows.length,
      evidence_ids: packet.source_rows.map((row) => row.evidence_id).join(";"),
      product_names: [...new Set(packet.source_rows.map((row) => row.product_name).filter(Boolean))].join(";"),
      ocr_line_count: lineCount,
      ingredient_signal_line_count: signalCount,
      status: "private_packet_written",
      public_text_included: 0,
      candidate_only: 1,
      manual_verified: 0,
    };
  });
}

function buildSummary({ runId, packets, selectedRows, publicCsvPath, packetDir }) {
  return redactPrivate({
    schema_version: "ingredient_ocr_structuring_summary.v1",
    generated_at: generatedAt,
    run_id: runId,
    selected_ocr_rows: selectedRows.length,
    packet_count: packets.length,
    public_safety: {
      private_packet_dir: "[private_path_redacted]",
      ocr_text_committed: false,
      private_paths_committed: false,
      candidate_only: true,
      manual_verified_created: false,
    },
    route: {
      primary_model: "gpt-5.3-codex-spark",
      quality_gate_model: "gpt-5.5",
      packet_dir_hint: path.basename(packetDir),
    },
    public_artifacts: {
      packet_summary_csv: publicArtifactRef(publicCsvPath),
    },
  });
}

function writeStructuringPackets({
  runId = runIdFromArgs("hybrid-ocr"),
  runDir = runDirFromArgs(runId),
  privateOcrJsonlPath = path.join(runDir, "ocr/ingredient_ocr_results.jsonl"),
  packetDir = path.join(runDir, "spark-packets/ocr-structuring"),
  publicSummaryPath = defaultPublicSummaryPath,
  publicCsvPath = defaultPublicCsvPath,
  packetSize = 10,
  maxLines = 80,
  limit = 0,
  requireSignal = true,
  updateSiteSummary = true,
} = {}) {
  const ocrRows = readJsonl(privateOcrJsonlPath);
  const selectedRows = selectedOcrRows(ocrRows, { limit, requireSignal });
  const packets = buildPackets(selectedRows, { runId, packetSize, maxLines });
  writePrivatePackets(packets, packetDir);
  writeCsv(publicCsvPath, [
    "run_id",
    "packet_id",
    "provider",
    "primary_model",
    "quality_gate_model",
    "source_row_count",
    "evidence_ids",
    "product_names",
    "ocr_line_count",
    "ingredient_signal_line_count",
    "status",
    "public_text_included",
    "candidate_only",
    "manual_verified",
  ], publicPacketRows(packets));
  const summary = buildSummary({ runId, packets, selectedRows, publicCsvPath, packetDir });
  writeJson(publicSummaryPath, summary);

  if (updateSiteSummary) {
    const siteSummary = readJson(summaryPath, {});
    siteSummary.ocr_structuring_summary = summary;
    siteSummary.ingredient_ocr_summary = siteSummary.ingredient_ocr_summary || {};
    siteSummary.ingredient_ocr_summary.ocr_structuring_summary = summary;
    writeJson(summaryPath, siteSummary);
  }
  return { packets, summary };
}

function main() {
  const runId = runIdFromArgs("hybrid-ocr");
  const runDir = runDirFromArgs(runId);
  const result = writeStructuringPackets({
    runId,
    runDir,
    privateOcrJsonlPath: path.resolve(argValue("ocr-jsonl", path.join(runDir, "ocr/ingredient_ocr_results.jsonl"))),
    packetDir: path.resolve(argValue("packet-dir", path.join(runDir, "spark-packets/ocr-structuring"))),
    publicSummaryPath: pathFromArg("public-summary", defaultPublicSummaryPath),
    publicCsvPath: pathFromArg("public-csv", defaultPublicCsvPath),
    packetSize: numberArg("packet-size", 10),
    maxLines: numberArg("max-lines", 80),
    limit: numberArg("limit", 0),
    requireSignal: !process.argv.includes("--include-no-signal"),
  });
  console.log(JSON.stringify({
    run_id: result.summary.run_id,
    selected_ocr_rows: result.summary.selected_ocr_rows,
    packet_count: result.summary.packet_count,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildPackets,
  compactOcrLines,
  publicPacketRows,
  selectedOcrRows,
  writeStructuringPackets,
};
