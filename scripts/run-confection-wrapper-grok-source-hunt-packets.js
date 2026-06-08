const fs = require("fs");
const path = require("path");
const {
  argValue,
  countBy,
  ensureRunDirs,
  generatedAt,
  hasFlag,
  modelDefaults,
  numberArg,
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
  xaiApiKey,
  xaiBaseUrl,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const defaultPacketDir = path.join(root, ".cache/ingredient-ocr/runs/cwa-grok-source-hunt-v1/grok-assists/grok-source-hunt-packets");
const publicRunJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_grok_source_hunt_run.json");
const publicRunCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_grok_source_hunt_run.csv");
const publicRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_grok_source_hunt_runbook.md");

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return false;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    if (process.env[key]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
  return true;
}

function packetFiles(packetDir) {
  const manifestPath = path.join(packetDir, "packet_manifest.json");
  const manifest = readJson(manifestPath, { packets: [] });
  return (manifest.packets || []).map((packet) => ({
    ...packet,
    private_packet_path: path.join(packetDir, packet.file),
  }));
}

function selectPackets(packetRefs = [], { product = "", packetId = "", maxCalls = 0 } = {}) {
  const packetIds = new Set(String(packetId || "").split(",").map((item) => item.trim()).filter(Boolean));
  const filtered = packetRefs
    .filter((packet) => !product || packet.product_id === product || packet.product_name === product)
    .filter((packet) => !packetIds.size || packetIds.has(packet.packet_id));
  return maxCalls > 0 ? filtered.slice(0, maxCalls) : [];
}

function parseJsonContent(content = "") {
  const text = String(content || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(text);
  } catch {
    return {
      batch_summary: "Model output was not valid JSON and needs manual review.",
      leads: [],
      missing_after_search: [],
      parse_error: "invalid_json",
    };
  }
}

function privateResultPath(resultDir, packet = {}) {
  return path.join(resultDir, `${packet.packet_id}.json`);
}

function plannedResult(packet = {}, status = "not_selected_budget_guard") {
  return {
    schema_version: "confection_wrapper_grok_source_hunt_result.v1",
    generated_at: generatedAt,
    provider: "xai",
    model: packet.model || modelDefaults().grok_research_model,
    packet_id: packet.packet_id,
    product_id: packet.product_id,
    product_name: packet.product_name,
    status,
    source_row_count: packet.source_row_count,
    prompt_hash: packet.prompt_hash,
    response_hash: "",
    parsed: {
      batch_summary: status,
      leads: [],
      missing_after_search: [],
    },
    candidate_only: true,
    manual_verified_created: false,
  };
}

async function callGrokPacket(packet = {}, { model, resultDir, allowNetwork, dryRun }) {
  const outputPath = privateResultPath(resultDir, packet);
  if (fs.existsSync(outputPath)) {
    return { ...readJson(outputPath, {}), cache_hit: true };
  }
  if (dryRun) {
    const result = plannedResult(packet, "dry_run_not_called");
    writeJson(outputPath, result);
    return result;
  }
  if (!allowNetwork) {
    const result = plannedResult(packet, "no_network_not_called");
    writeJson(outputPath, result);
    return result;
  }
  const key = xaiApiKey();
  if (!key) {
    const result = plannedResult(packet, "missing_xai_key_not_called");
    writeJson(outputPath, result);
    return result;
  }

  const response = await fetch(`${xaiBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: "You are a source research assistant. Return JSON only. Candidate leads only; never verify ingredient claims." },
        { role: "user", content: JSON.stringify(packet.prompt) },
      ],
    }),
  });
  const raw = await response.text();
  if (!response.ok) {
    const result = {
      ...plannedResult(packet, `api_error_${response.status}`),
      response_hash: responseHash(raw),
      error_message: raw.slice(0, 500),
    };
    writeJson(outputPath, result);
    return result;
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = {};
  }
  const content = payload.choices?.[0]?.message?.content || raw;
  const parsed = parseJsonContent(content);
  const result = {
    schema_version: "confection_wrapper_grok_source_hunt_result.v1",
    generated_at: generatedAt,
    provider: "xai",
    model,
    packet_id: packet.packet_id,
    product_id: packet.product_id,
    product_name: packet.product_name,
    status: "completed",
    source_row_count: packet.source_row_count,
    prompt_hash: packet.prompt_hash,
    response_hash: responseHash(content),
    usage: payload.usage || {},
    parsed,
    raw_content: content,
    candidate_only: true,
    manual_verified_created: false,
  };
  writeJson(outputPath, result);
  return result;
}

function publicRowForResult(packet = {}, result = {}) {
  const leads = Array.isArray(result.parsed?.leads) ? result.parsed.leads : [];
  const missing = Array.isArray(result.parsed?.missing_after_search) ? result.parsed.missing_after_search : [];
  return {
    packet_id: packet.packet_id,
    provider: "xai",
    model: result.model || packet.model || modelDefaults().grok_research_model,
    status: result.status || "not_selected_budget_guard",
    product_id: packet.product_id,
    product_name: packet.product_name,
    vintage_span: packet.vintage_span || "",
    source_row_count: packet.source_row_count || "",
    candidate_lead_count: leads.length,
    unresolved_gap_count: missing.length,
    prompt_hash: packet.prompt_hash,
    response_hash: result.response_hash || "",
    cache_hit: result.cache_hit ? 1 : 0,
    candidate_only: 1,
    manual_verified_created: 0,
    next_action: leads.length
      ? "Review returned source leads visually; crop ingredient/nutrition panels privately before OCR."
      : "No reviewed source leads are public; continue source hunting or run the packet when budget allows.",
  };
}

function buildPublicSummary({ runId, packetRefs, packetRows, calledRows, results, allowNetwork, dryRun, envFileLoaded }) {
  const completedRows = packetRows.filter((row) => row.status === "completed");
  return redactPrivate({
    schema_version: "confection_wrapper_grok_source_hunt_run.v1",
    generated_at: generatedAt,
    run_id: runId,
    run_mode: dryRun ? "dry_run" : allowNetwork ? "network_enabled" : "no_network",
    packets_available: packetRefs.length,
    packets_selected_for_call: calledRows.length,
    packets_completed: completedRows.length,
    packets_with_candidate_leads: packetRows.filter((row) => Number(row.candidate_lead_count) > 0).length,
    private_results_created: results.length,
    env_file_loaded: Boolean(envFileLoaded),
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      prompts_committed: false,
      raw_model_outputs_committed: false,
      source_urls_from_model_committed: false,
      api_keys_committed: false,
      manual_verified_created: false,
    },
    provider: {
      name: "xai",
      model: modelDefaults().grok_research_model,
      network_allowed: Boolean(allowNetwork),
      policy: "Grok source-hunt results are research assists only and cannot verify formulation claims.",
    },
    totals: {
      public_packet_rows: packetRows.length,
      completed_packets: completedRows.length,
      candidate_leads_private: packetRows.reduce((sum, row) => sum + Number(row.candidate_lead_count || 0), 0),
      unresolved_gaps_private: packetRows.reduce((sum, row) => sum + Number(row.unresolved_gap_count || 0), 0),
      manual_verified_created: 0,
    },
    by_status: countBy(packetRows, "status"),
    by_product: countBy(packetRows, "product_name"),
    first_rows: packetRows.slice(0, 12),
    public_artifacts: {
      grok_source_hunt_run_csv: publicArtifactRef(publicRunCsvPath),
      grok_source_hunt_run_json: publicArtifactRef(publicRunJsonPath),
      grok_source_hunt_runbook_md: publicArtifactRef(publicRunbookPath),
    },
  });
}

function renderRunbook(summary = {}) {
  const lines = [
    "# CWA Grok Source-Hunt Run",
    "",
    `Generated: ${summary.generated_at || generatedAt}`,
    `Run ID: ${summary.run_id || ""}`,
    "",
    "This public-safe artifact summarizes execution/import state for private Grok source-hunt packets. It does not publish prompts, raw model output, returned source URLs, local paths, or verified ingredient claims.",
    "",
    "## Current State",
    "",
    `- Packets available: ${summary.packets_available || 0}`,
    `- Packets selected for call: ${summary.packets_selected_for_call || 0}`,
    `- Packets completed: ${summary.packets_completed || 0}`,
    `- Candidate leads stored privately: ${summary.totals?.candidate_leads_private || 0}`,
    `- Manual verified rows created: ${summary.totals?.manual_verified_created || 0}`,
    "",
    "## Rules",
    "",
    "- Returned leads are `grok_research_assist` candidates only.",
    "- Do not publish model-returned source URLs until source review decides they are usable.",
    "- Do not promote ingredient text without visible panel review, OCR, corrected transcription, and manual verification.",
    "",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

async function runGrokSourceHuntPackets({
  runId,
  runDir,
  packetDir,
  maxCalls,
  allowNetwork,
  dryRun,
  product,
  packetId,
  envFile,
}) {
  const envFileLoaded = loadEnvFile(envFile);
  const dirs = ensureRunDirs(runDir);
  const resultDir = path.join(dirs.grokAssistsDir, "grok-source-hunt-results");
  fs.mkdirSync(resultDir, { recursive: true });
  const packetRefs = packetFiles(packetDir);
  const selectedRefs = selectPackets(packetRefs, { product, packetId, maxCalls });
  const selectedIds = new Set(selectedRefs.map((packet) => packet.packet_id));
  const packets = packetRefs.map((packetRef) => readJson(packetRef.private_packet_path, {}));
  const packetById = new Map(packets.map((packet) => [packet.packet_id, packet]));
  const model = modelDefaults().grok_research_model;
  const results = [];
  const calledRows = [];

  for (const packetRef of selectedRefs) {
    const packet = packetById.get(packetRef.packet_id);
    if (!packet) continue;
    calledRows.push(packet);
    results.push(await callGrokPacket(packet, { model, resultDir, allowNetwork, dryRun }));
  }

  const resultByPacket = new Map(results.map((result) => [result.packet_id, result]));
  const publicRows = packetRefs.map((packetRef) => {
    const packet = packetById.get(packetRef.packet_id) || packetRef;
    const result = resultByPacket.get(packetRef.packet_id)
      || (selectedIds.has(packetRef.packet_id) ? plannedResult(packet, "selected_not_called") : plannedResult(packet, "not_selected_budget_guard"));
    return publicRowForResult(packet, result);
  });
  writeCsv(publicRunCsvPath, [
    "packet_id",
    "provider",
    "model",
    "status",
    "product_id",
    "product_name",
    "vintage_span",
    "source_row_count",
    "candidate_lead_count",
    "unresolved_gap_count",
    "prompt_hash",
    "response_hash",
    "cache_hit",
    "candidate_only",
    "manual_verified_created",
    "next_action",
  ], publicRows);
  const summary = buildPublicSummary({
    runId,
    packetRefs,
    packetRows: publicRows,
    calledRows,
    results,
    allowNetwork,
    dryRun,
    envFileLoaded,
  });
  writeJson(publicRunJsonPath, summary);
  fs.mkdirSync(path.dirname(publicRunbookPath), { recursive: true });
  fs.writeFileSync(publicRunbookPath, renderRunbook(summary));

  const siteSummary = readJson(summaryPath, {});
  siteSummary.confection_wrapper_grok_source_hunt_run_summary = summary;
  siteSummary.confection_wrapper_grok_source_hunt_packet_summary = siteSummary.confection_wrapper_grok_source_hunt_packet_summary || {};
  siteSummary.confection_wrapper_grok_source_hunt_packet_summary.grok_run_summary = summary;
  siteSummary.confection_wrapper_grok_source_hunt_packet_summary.public_artifacts = {
    ...(siteSummary.confection_wrapper_grok_source_hunt_packet_summary.public_artifacts || {}),
    ...summary.public_artifacts,
  };
  siteSummary.confection_wrapper_ingredient_priority_summary = siteSummary.confection_wrapper_ingredient_priority_summary || {};
  siteSummary.confection_wrapper_ingredient_priority_summary.grok_source_hunt_run_summary = summary;
  siteSummary.confection_wrapper_ingredient_priority_summary.artifacts = {
    ...(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts || {}),
    ...summary.public_artifacts,
  };
  writeJson(summaryPath, siteSummary);

  return { summary, publicRows, results, resultDir };
}

async function main() {
  const runId = runIdFromArgs("cwa-grok-source-hunt-run");
  const runDir = runDirFromArgs(runId);
  const envFile = argValue("env-file", "");
  const result = await runGrokSourceHuntPackets({
    runId,
    runDir,
    packetDir: pathFromArg("packet-dir", defaultPacketDir),
    maxCalls: Math.max(numberArg("max-calls", 0), 0),
    allowNetwork: hasFlag("allow-network"),
    dryRun: hasFlag("dry-run"),
    product: argValue("product", ""),
    packetId: argValue("packet-id", ""),
    envFile,
  });
  console.log(JSON.stringify({
    run_id: runId,
    packets_available: result.summary.packets_available,
    packets_selected_for_call: result.summary.packets_selected_for_call,
    packets_completed: result.summary.packets_completed,
    candidate_leads_private: result.summary.totals.candidate_leads_private,
    result_dir: result.resultDir,
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = {
  loadEnvFile,
  parseJsonContent,
  publicRowForResult,
  runGrokSourceHuntPackets,
  selectPackets,
};
