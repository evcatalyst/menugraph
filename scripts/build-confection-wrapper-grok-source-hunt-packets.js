const fs = require("fs");
const path = require("path");
const {
  countBy,
  ensureRunDirs,
  generatedAt,
  modelDefaults,
  parseCsv,
  promptHash,
  publicArtifactRef,
  readJson,
  redactPrivate,
  runDirFromArgs,
  runIdFromArgs,
  shortHash,
  summaryPath,
  writeCsv,
  writeJson,
  xaiBaseUrl,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const sourceHuntCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_panel_gap_source_hunt.csv");
const packetSummaryJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_grok_source_hunt_packets.json");
const packetSummaryCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_grok_source_hunt_packets.csv");
const packetRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_grok_source_hunt_packets_runbook.md");

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compactSourceRow(row = {}) {
  return {
    packet_id: row.packet_id,
    product_id: row.product_id,
    product_name: row.product_name,
    vintage_label: row.vintage_label,
    vintage_bucket: row.vintage_bucket,
    cwa_anchor_url: row.source_url,
    cwa_anchor_title: row.source_title,
    existing_source_role: row.existing_source_role,
    missing_primary_surfaces: row.missing_primary_surfaces,
    missing_support_surfaces: row.missing_support_surfaces,
    preferred_source_types: row.preferred_source_types,
    source_hunt_queries: String(row.source_hunt_queries || "").split(";").map((query) => query.trim()).filter(Boolean),
    constraints: [
      "CWA anchor is dated wrapper context only.",
      "Do not infer ingredients from wrapper-front imagery.",
      "Return source URLs and confidence warnings only.",
      "Readable ingredient or nutrition panel is required before OCR/formulation claims.",
    ],
  };
}

function promptForPacket(packet = {}) {
  return {
    schema_version: "confection_wrapper_grok_source_hunt_prompt.v1",
    role: "research_assist_only",
    product_id: packet.product_id,
    product_name: packet.product_name,
    model_policy: {
      provider: "xai",
      model: packet.model,
      allowed_use: "source hunting and validation advice only",
      forbidden_use: [
        "do not verify ingredient text",
        "do not create formulation claims",
        "do not mark manual_verified",
        "do not include private local paths",
      ],
    },
    instructions: [
      "Return JSON only.",
      "Find source-attributable package back-panel, side-panel, ingredient-panel, nutrition-panel, auction listing, collector listing, brand archive, retailer-label, or archive-capture leads.",
      "Prefer sources with visible ingredients, nutrition facts, net weight, manufacturer/distributor, date/copyright, or lot cues.",
      "Treat every result as candidate-only until visual review, OCR, corrected transcription, and manual verification.",
      "Cite why each lead may or may not support an ingredient-history claim.",
    ],
    required_output_schema: {
      product_id: "string",
      batch_summary: "string",
      leads: [{
        packet_id: "string from supplied source rows",
        source_url: "string",
        source_title: "string",
        source_owner_or_publisher: "string",
        source_type: "enum: back_panel_photo | side_panel_photo | auction_listing_photo | collector_listing_photo | brand_archive | retailer_label | archive_capture | other",
        claimed_product_date: "string",
        visible_surfaces: ["ingredient_panel | nutrition_panel | net_weight | manufacturer | wrapper_front | unknown"],
        confidence_warning: "string",
        next_action: "string",
      }],
      missing_after_search: [{
        packet_id: "string",
        unresolved_gap: "string",
        suggested_next_queries: ["string"],
      }],
    },
    source_rows: packet.source_rows.map(compactSourceRow),
  };
}

function batchRows(rows = [], batchSize = 8) {
  const grouped = new Map();
  for (const row of rows) {
    const key = row.product_id || row.product_name || "unknown_product";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  const model = modelDefaults().grok_research_model;
  const packets = [];
  for (const [productId, productRows] of grouped.entries()) {
    const sortedRows = [...productRows].sort((a, b) => numeric(a.packet_rank) - numeric(b.packet_rank));
    for (let start = 0; start < sortedRows.length; start += batchSize) {
      const slice = sortedRows.slice(start, start + batchSize);
      const productName = slice[0]?.product_name || productId;
      const packet = {
        schema_version: "confection_wrapper_grok_source_hunt_packet.v1",
        packet_id: `cwa_grok_source_hunt_${shortHash(`${productId}:${start}:${slice.map((row) => row.packet_id).join("|")}`, 14)}`,
        generated_at: generatedAt,
        provider: "xai",
        model,
        route_type: "grok_source_hunt_packet",
        status: "packet_ready_not_called",
        product_id: productId,
        product_name: productName,
        source_row_count: slice.length,
        vintage_span: [slice[0]?.vintage_label || "", slice[slice.length - 1]?.vintage_label || ""].filter(Boolean).join(" to "),
        packet_ids: slice.map((row) => row.packet_id),
        candidate_only: true,
        manual_verified_created: false,
        source_rows: slice,
      };
      const prompt = promptForPacket(packet);
      packet.prompt_hash = promptHash(prompt);
      packet.prompt = prompt;
      packets.push(packet);
    }
  }
  return packets.sort((a, b) => (
    a.product_name.localeCompare(b.product_name)
    || a.vintage_span.localeCompare(b.vintage_span)
  ));
}

function writePrivatePackets(packetDir, packets = []) {
  fs.mkdirSync(packetDir, { recursive: true });
  for (const packet of packets) {
    writeJson(path.join(packetDir, `${packet.packet_id}.json`), packet);
  }
  writeJson(path.join(packetDir, "packet_manifest.json"), {
    schema_version: "confection_wrapper_grok_source_hunt_private_manifest.v1",
    generated_at: generatedAt,
    packet_count: packets.length,
    packets: packets.map((packet) => ({
      packet_id: packet.packet_id,
      product_id: packet.product_id,
      product_name: packet.product_name,
      source_row_count: packet.source_row_count,
      prompt_hash: packet.prompt_hash,
      file: `${packet.packet_id}.json`,
    })),
  });
}

function publicPacketRows(packets = []) {
  return packets.map((packet) => ({
    packet_id: packet.packet_id,
    provider: packet.provider,
    model: packet.model,
    status: packet.status,
    product_id: packet.product_id,
    product_name: packet.product_name,
    vintage_span: packet.vintage_span,
    source_row_count: packet.source_row_count,
    prompt_hash: packet.prompt_hash,
    source_packet_ids: packet.packet_ids.join(";"),
    candidate_only: 1,
    manual_verified_created: 0,
  }));
}

function buildSummary({ runId, runDir, packets, rows }) {
  const publicRows = publicPacketRows(packets);
  return redactPrivate({
    schema_version: "confection_wrapper_grok_source_hunt_packet_summary.v1",
    generated_at: generatedAt,
    run_id: runId,
    source_queue: publicArtifactRef(sourceHuntCsvPath),
    provider: {
      name: "xai",
      base_url: xaiBaseUrl(),
      model: modelDefaults().grok_research_model,
      network_called: false,
      policy: "Packets are prepared for Grok research assist only; this builder does not call the API.",
    },
    routing_policy: {
      grok: "source hunting, domain strategy, and validation warnings only",
      codex_spark: "bounded queue classification and packet normalization",
      gpt55: "later compact batch review and conflict resolution",
      verification_gate: "human/manual verification is required before any ingredient claim can be promoted",
    },
    totals: {
      source_hunt_rows: rows.length,
      products: new Set(rows.map((row) => row.product_id)).size,
      grok_packets: packets.length,
      candidate_only_packets: packets.filter((packet) => packet.candidate_only).length,
      manual_verified_created: 0,
    },
    by_product: countBy(rows, "product_name"),
    by_vintage_bucket: countBy(rows, "vintage_bucket"),
    first_packets: publicRows.slice(0, 12),
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      prompts_committed: false,
      model_outputs_committed: false,
      image_urls_committed: false,
      manual_verified_created: false,
    },
    private_artifacts_created: {
      run_dir: runDir,
      grok_packets_dir: "grok-source-hunt-packets",
      private_packet_manifest: "grok-source-hunt-packets/packet_manifest.json",
    },
    public_artifacts: {
      grok_source_hunt_packets_csv: publicArtifactRef(packetSummaryCsvPath),
      grok_source_hunt_packets_json: publicArtifactRef(packetSummaryJsonPath),
      grok_source_hunt_packets_runbook_md: publicArtifactRef(packetRunbookPath),
    },
  });
}

function renderRunbook(summary = {}) {
  const lines = [
    "# CWA Grok Source-Hunt Packets",
    "",
    `Generated: ${summary.generated_at || generatedAt}`,
    `Run ID: ${summary.run_id || ""}`,
    "",
    "This public-safe artifact summarizes private Grok research-assist packets for Candy Wrapper Archive back-panel hunts. The prompts are private packet files; public outputs expose only packet counts, products, source-row counts, prompt hashes, and routing policy.",
    "",
    "## Rules",
    "",
    "- Grok is used for source hunting and validation warnings only.",
    "- Model output cannot verify ingredient text or create formulation claims.",
    "- No private paths, API keys, prompts, model outputs, or images are published.",
    "- Every lead remains candidate-only until visual review, OCR, corrected transcription, and manual verification.",
    "",
    "## Current State",
    "",
    `- Source-hunt rows: ${summary.totals?.source_hunt_rows || 0}`,
    `- Products: ${summary.totals?.products || 0}`,
    `- Grok packets prepared: ${summary.totals?.grok_packets || 0}`,
    `- API called by builder: ${summary.provider?.network_called ? "yes" : "no"}`,
    "",
    "## Operator Path",
    "",
    "1. Open the private packet manifest under the private run directory printed by the builder.",
    "2. Submit one product packet at a time when budget allows.",
    "3. Store responses as `grok_research_assist` notes only.",
    "4. Promote nothing until source review, panel crop, OCR, correction, and manual verification are complete.",
    "",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

function writeGrokSourceHuntPackets({ runId, runDir, batchSize = 8 }) {
  const rows = parseCsv(fs.readFileSync(sourceHuntCsvPath, "utf8"));
  const packets = batchRows(rows, batchSize);
  const dirs = ensureRunDirs(runDir);
  const privatePacketDir = path.join(dirs.grokAssistsDir, "grok-source-hunt-packets");
  writePrivatePackets(privatePacketDir, packets);
  const summary = buildSummary({ runId, runDir, packets, rows });

  writeCsv(packetSummaryCsvPath, [
    "packet_id",
    "provider",
    "model",
    "status",
    "product_id",
    "product_name",
    "vintage_span",
    "source_row_count",
    "prompt_hash",
    "source_packet_ids",
    "candidate_only",
    "manual_verified_created",
  ], publicPacketRows(packets));
  writeJson(packetSummaryJsonPath, summary);
  fs.mkdirSync(path.dirname(packetRunbookPath), { recursive: true });
  fs.writeFileSync(packetRunbookPath, renderRunbook(summary));

  const siteSummary = readJson(summaryPath, {});
  siteSummary.confection_wrapper_grok_source_hunt_packet_summary = summary;
  siteSummary.confection_wrapper_panel_gap_source_hunt_summary = siteSummary.confection_wrapper_panel_gap_source_hunt_summary || {};
  siteSummary.confection_wrapper_panel_gap_source_hunt_summary.grok_packet_summary = summary;
  siteSummary.confection_wrapper_panel_gap_source_hunt_summary.artifacts = {
    ...(siteSummary.confection_wrapper_panel_gap_source_hunt_summary.artifacts || {}),
    ...summary.public_artifacts,
  };
  siteSummary.confection_wrapper_ingredient_priority_summary = siteSummary.confection_wrapper_ingredient_priority_summary || {};
  siteSummary.confection_wrapper_ingredient_priority_summary.grok_source_hunt_packet_summary = summary;
  siteSummary.confection_wrapper_ingredient_priority_summary.artifacts = {
    ...(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts || {}),
    ...summary.public_artifacts,
  };
  writeJson(summaryPath, siteSummary);

  return { summary, packets, privatePacketDir };
}

function main() {
  const runId = runIdFromArgs("cwa-grok-source-hunt");
  const runDir = runDirFromArgs(runId);
  const result = writeGrokSourceHuntPackets({ runId, runDir });
  console.log(JSON.stringify({
    run_id: runId,
    source_hunt_rows: result.summary.totals.source_hunt_rows,
    products: result.summary.totals.products,
    grok_packets: result.summary.totals.grok_packets,
    private_packet_dir: result.privatePacketDir,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  batchRows,
  compactSourceRow,
  promptForPacket,
  publicPacketRows,
  writeGrokSourceHuntPackets,
};
