const fs = require("fs");
const path = require("path");
const {
  approvedSparkTaskTypes,
  argValue,
  countBy,
  ensureRunDirs,
  generatedAt,
  groupKeyForRow,
  hasFlag,
  modelDefaults,
  numberArg,
  pathFromArg,
  publicEvidenceRow,
  publicModelSummaryCsvPath,
  queuePathFromArgs,
  readFullQueue,
  redactPrivate,
  runDirFromArgs,
  runIdFromArgs,
  selectQueueRows,
  shortHash,
  topList,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");

function taskTypeFor(groupRows) {
  const categories = new Set(groupRows.map((row) => row.ocr_gap_category));
  if (categories.has("source_discovery_needed")) return "domain_failure_packet";
  if (categories.has("document_text_pipeline_needed")) return "selector_hint_packet";
  if (categories.has("panel_capture_needed") || categories.has("readable_panel_photo_needed") || categories.has("source_page_capture_needed")) {
    return "capture_strategy_packet";
  }
  return "review_queue_packet";
}

function goalFor(taskType, groupRows) {
  const sample = groupRows[0] || {};
  if (taskType === "domain_failure_packet") {
    return "Generate source-hunting leads and query patterns for evidence rows that lack a usable label or document source.";
  }
  if (taskType === "selector_hint_packet") {
    return "Classify document-text extraction targets and recommend document capture or PDF text routes before image OCR.";
  }
  if (taskType === "capture_strategy_packet") {
    return "Recommend private capture, crop, and OCR-surface strategy for source-attributable product evidence rows.";
  }
  return `Prepare review notes for ${sample.category || "food"} evidence rows without promoting candidate text to verified status.`;
}

function outputSchemaFor(taskType) {
  const base = {
    evidence_id: "string, must match one supplied source row",
    capture_strategy: "enum: source_page_screenshot | panel_crop | document_text_extract | source_hunt | manual_review",
    crop_target: "string, concrete panel or document surface to capture",
    ocr_expected_surface: "enum: ingredient_panel | nutrition_panel | net_weight | manufacturer | document_text | none",
    risk_flags: "array of strings",
    next_action: "string, one recommended action only",
    reviewer_note: "string, concise and candidate-only",
  };
  if (taskType === "domain_failure_packet") {
    base.source_hunting_queries = "array of strings, search queries only";
    base.likely_source_domains = "array of strings, source domains to check";
  }
  return base;
}

function packetRows(rows, packetSize = 20) {
  const grouped = new Map();
  for (const row of rows) {
    const key = groupKeyForRow(row);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }

  const packets = [];
  const models = modelDefaults();
  for (const [groupKey, groupRows] of grouped.entries()) {
    for (let start = 0; start < groupRows.length; start += packetSize) {
      const slice = groupRows.slice(start, start + packetSize);
      const packetType = taskTypeFor(slice);
      const hashInput = `${groupKey}:${start}:${slice.map((row) => row.evidence_id).join("|")}`;
      packets.push({
        schema_version: "hybrid_ingredient_ocr_spark_packet.v1",
        packet_id: `spark_${shortHash(hashInput, 14)}`,
        packet_type: packetType,
        generated_at: generatedAt,
        model_route: {
          primary_provider: "codex",
          primary_model: models.spark_model,
          fallback_provider: "deterministic",
          quality_gate_provider: "codex",
          quality_gate_model: models.review_model,
        },
        goal: goalFor(packetType, slice),
        allowed_actions: [
          "classify_capture_strategy",
          "recommend_crop_target",
          "flag_ocr_risks",
          "draft_reviewer_note",
          "propose_source_hunting_query",
        ],
        do_not_do: [
          "do not claim manual_verified",
          "do not invent ingredient text",
          "do not fetch network resources",
          "do not include private local paths",
          "do not treat model output as ground truth",
        ],
        expected_output_schema: outputSchemaFor(packetType),
        acceptance_checks: [
          "Every output row references one supplied evidence_id.",
          "No output status is manual_verified.",
          "Ingredient or label text appears only when present in supplied source metadata or later OCR text.",
          "Reviewer notes stay candidate-only and cite remaining uncertainty.",
        ],
        risk_notes: [
          "External source photos may be link-only and rights-limited.",
          "Fast-food products are document-first and should not be forced into package-label assumptions.",
          "Vintage package dates may be inferred from source context until reviewer-verified.",
        ],
        source_rows: slice.map(publicEvidenceRow),
      });
    }
  }

  return packets.sort((a, b) => a.packet_id.localeCompare(b.packet_id));
}

function buildSummary(runId, runDir, selectedRows, packets, options) {
  const packetRowsFlat = packets.flatMap((packet) => packet.source_rows);
  return {
    schema_version: "hybrid_ingredient_ocr_spark_packet_summary.v1",
    generated_at: generatedAt,
    run_id: runId,
    run_mode: options.dryRun ? "dry_run" : "private_packet_generation",
    public_safety: {
      candidate_only: true,
      private_paths_redacted: true,
      images_committed: false,
      api_keys_committed: false,
      manual_verified_created: false,
    },
    routing_policy: {
      spark: "gpt-5.3-codex-spark handles bounded packet classification and reviewer-note drafts.",
      gpt55: "gpt-5.5 is reserved for compact batch review and conflict resolution.",
      grok: "Grok/xAI assists source hunting and validation advice only; it cannot verify facts.",
    },
    totals: {
      selected_rows: selectedRows.length,
      packets_generated: packets.length,
      packet_size_target: options.packetSize,
      source_rows_in_packets: packetRowsFlat.length,
    },
    packet_types: countBy(packets, "packet_type"),
    gap_categories: countBy(selectedRows, "ocr_gap_category"),
    source_domains: countBy(selectedRows, "source_domain").slice(0, 12),
    top_products: topList(selectedRows, "product_name", 12),
    approved_spark_task_types: approvedSparkTaskTypes,
    private_artifacts: options.dryRun
      ? {}
      : {
        run_dir: runDir,
        spark_packets_dir: path.join(runDir, "spark-packets"),
      },
    public_artifacts: {
      model_assist_summary_csv: options.publicModelSummaryRef,
    },
  };
}

function writePackets(packetDir, packets) {
  fs.mkdirSync(packetDir, { recursive: true });
  for (const packet of packets) {
    writeJson(path.join(packetDir, `${packet.packet_id}.json`), packet);
  }
  writeJson(path.join(packetDir, "packet_manifest.json"), {
    schema_version: "hybrid_ingredient_ocr_spark_packet_manifest.v1",
    generated_at: generatedAt,
    packet_count: packets.length,
    packets: packets.map((packet) => ({
      packet_id: packet.packet_id,
      packet_type: packet.packet_type,
      source_row_count: packet.source_rows.length,
      file: `${packet.packet_id}.json`,
    })),
  });
}

function main() {
  const runId = runIdFromArgs("hybrid-ocr");
  const runDir = runDirFromArgs(runId);
  const limit = numberArg("limit", 250);
  const packetSize = Math.min(Math.max(numberArg("packet-size", 20), 1), 50);
  const dryRun = hasFlag("dry-run");
  const queuePath = queuePathFromArgs();
  const publicModelSummaryPath = pathFromArg("public-model-summary", publicModelSummaryCsvPath);
  const rows = readFullQueue(queuePath);
  const selectedRows = selectQueueRows(rows, {
    limit,
    product: argValue("product"),
    category: argValue("category"),
    sourceDomain: argValue("source-domain"),
    gapCategory: argValue("gap-category"),
    priority: argValue("priority"),
  });
  const packets = packetRows(selectedRows, packetSize);
  const dirs = dryRun ? { sparkPacketsDir: path.join(runDir, "spark-packets") } : ensureRunDirs(runDir);
  if (!dryRun) writePackets(dirs.sparkPacketsDir, packets);

  const summary = redactPrivate(buildSummary(runId, runDir, selectedRows, packets, {
    packetSize,
    dryRun,
    publicModelSummaryRef: path.relative(root, publicModelSummaryPath),
  }));
  writeJson(path.join(runDir, "spark_packet_summary.public.json"), summary);
  writeCsv(publicModelSummaryPath, [
    "run_id",
    "route_type",
    "route_id",
    "provider",
    "model",
    "status",
    "source_row_count",
    "evidence_ids",
    "candidate_only",
  ], packets.map((packet) => ({
    run_id: runId,
    route_type: "spark_packet",
    route_id: packet.packet_id,
    provider: packet.model_route.primary_provider,
    model: packet.model_route.primary_model,
    status: "packet_ready",
    source_row_count: packet.source_rows.length,
    evidence_ids: packet.source_rows.map((row) => row.evidence_id).join(";"),
    candidate_only: true,
  })));

  console.log(JSON.stringify({
    run_id: runId,
    selected_rows: selectedRows.length,
    packets_generated: packets.length,
    dry_run: dryRun,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  packetRows,
  taskTypeFor,
};
