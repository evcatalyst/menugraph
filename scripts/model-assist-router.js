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
  parseCsv,
  pathFromArg,
  promptHash,
  publicArtifactRef,
  publicModelSummaryCsvPath,
  queuePathFromArgs,
  readFullQueue,
  redactPrivate,
  responseHash,
  reviewStatuses,
  runDirFromArgs,
  runIdFromArgs,
  selectQueueRows,
  shortHash,
  topList,
  writeCsv,
  writeJson,
  xaiApiKey,
  xaiBaseUrl,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");

const allowedCaptureStrategies = [
  "source_page_screenshot",
  "panel_crop",
  "document_text_extract",
  "source_hunt",
  "manual_review",
];

function providerRegistry() {
  const defaults = modelDefaults();
  return {
    generated_at: generatedAt,
    providers: {
      codex: {
        available_in_script: false,
        spark_model: defaults.spark_model,
        review_model: defaults.review_model,
        policy: "Codex model routing is represented as packet metadata; local scripts do not call Codex models directly.",
      },
      xai: {
        available_in_script: Boolean(xaiApiKey()),
        api_key_present: Boolean(xaiApiKey()),
        base_url: xaiBaseUrl(),
        default_model: defaults.grok_model,
        research_model: defaults.grok_research_model,
        validation_model: defaults.grok_validation_model,
        accepted_env_keys: ["xai_api", "XAI_API_KEY", "GROK_API_KEY", "GROK_MODEL", "GROK_RESEARCH_MODEL", "GROK_VALIDATION_MODEL"],
        policy: "Grok assists source hunting and validation advice only; outputs remain candidate notes.",
      },
    },
  };
}

async function discoverXaiModels({ noNetwork = false } = {}) {
  const registry = providerRegistry();
  const key = xaiApiKey();
  if (noNetwork || !key) return registry;
  try {
    const response = await fetch(`${xaiBaseUrl()}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) throw new Error(`xAI model discovery failed: ${response.status}`);
    const payload = await response.json();
    registry.providers.xai.discovered_models = (payload.data || []).map((model) => model.id).filter(Boolean);
    registry.providers.xai.discovery_status = "ok";
  } catch (error) {
    registry.providers.xai.discovery_status = "failed";
    registry.providers.xai.discovery_error = error.message;
  }
  return registry;
}

function compactRows(rows) {
  return rows.map((row) => ({
    evidence_id: row.evidence_id,
    product: row.product_name,
    category: row.category,
    vintage: row.vintage_label,
    source_domain: row.source_domain,
    source_url: row.source_url,
    source_title: row.source_title,
    evidence_kind: row.evidence_kind,
    gap: row.ocr_gap_category,
    recommended_action: row.ocr_recommended_action,
    blocker: row.promotion_blocker,
  }));
}

function buildGrokPrompt({ assistType, rows }) {
  return {
    role: "source_research_assist",
    assist_type: assistType,
    instructions: [
      "Return JSON only.",
      "Do not claim any ingredient text is verified.",
      "Do not promote evidence to manual_verified.",
      "Generate source-hunting, validation, or domain strategy notes only.",
      "Prefer source-attributable public leads such as brand pages, archive captures, museums, trade catalogs, menu PDFs, or retailer pages.",
      "Do not include private local paths, secrets, or API keys.",
    ],
    required_output_schema: {
      batch_summary: "string",
      leads: [{
        evidence_id: "string",
        suggested_queries: ["string"],
        likely_source_domains: ["string"],
        validation_warnings: ["string"],
        next_action: "string",
      }],
    },
    rows: compactRows(rows),
  };
}

async function callGrok(prompt, model) {
  const key = xaiApiKey();
  if (!key) throw new Error("No xAI key available. Set xai_api, XAI_API_KEY, or GROK_API_KEY.");
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
        { role: "system", content: "You assist evidence discovery and validation. Candidate-only. JSON only." },
        { role: "user", content: JSON.stringify(prompt) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Grok assist failed: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  return payload.choices?.[0]?.message?.content || JSON.stringify(payload);
}

function deterministicAssist({ assistType, rows }) {
  return {
    batch_summary: `${assistType} deterministic fallback for ${rows.length} evidence rows.`,
    leads: rows.map((row) => ({
      evidence_id: row.evidence_id,
      suggested_queries: [
        `${row.product_name} ${row.vintage_label} ingredients package back`,
        `${row.product_name} ${row.vintage_label} nutrition label`,
      ],
      likely_source_domains: [row.source_domain || "brand_or_archive_source"],
      validation_warnings: [
        "Candidate lead only; verify source attribution and visible label before formulation claims.",
        row.category === "fast food" ? "Use document/menu disclosure evidence before package-photo assumptions." : "Confirm SKU and package size before product-story promotion.",
      ],
      next_action: row.ocr_gap_category === "source_discovery_needed"
        ? "source_hunting"
        : "review_source_and_capture_private_panel",
    })),
  };
}

function cachePathFor(dirs, provider, model, hash) {
  return path.join(dirs.modelCacheDir, `${provider}_${shortHash(model)}_${hash.slice(0, 18)}.json`);
}

async function runAssistBatch({ rows, assistType, model, dirs, dryRun, noNetwork }) {
  const prompt = buildGrokPrompt({ assistType, rows });
  const pHash = promptHash(prompt);
  const cachePath = cachePathFor(dirs, "xai", model, pHash);
  if (fs.existsSync(cachePath)) {
    return { ...JSON.parse(fs.readFileSync(cachePath, "utf8")), cache_hit: true };
  }

  let content;
  let status;
  if (dryRun || noNetwork || !xaiApiKey()) {
    content = JSON.stringify(deterministicAssist({ assistType, rows }));
    status = dryRun ? "dry_run_fallback" : noNetwork ? "no_network_fallback" : "no_key_fallback";
  } else {
    content = await callGrok(prompt, model);
    status = "completed";
  }

  const result = {
    schema_version: "hybrid_ingredient_ocr_grok_assist.v1",
    generated_at: generatedAt,
    provider: "xai",
    model,
    assist_type: assistType,
    status,
    source_row_count: rows.length,
    evidence_ids: rows.map((row) => row.evidence_id),
    prompt_hash: pHash,
    response_hash: responseHash(content),
    candidate_only: true,
    content,
  };
  writeJson(cachePath, result);
  return result;
}

function buildBatches(rows, batchSize = 15) {
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.ocr_gap_category || "unknown"}:${row.source_domain || "unknown"}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  const batches = [];
  for (const [group, groupRows] of grouped.entries()) {
    for (let start = 0; start < groupRows.length; start += batchSize) {
      batches.push({
        batch_id: `grok_${shortHash(`${group}:${start}:${groupRows.map((row) => row.evidence_id).join("|")}`, 14)}`,
        group,
        rows: groupRows.slice(start, start + batchSize),
      });
    }
  }
  return batches;
}

function reviewBatchPlan(rows, batchSize = 40) {
  const selected = rows.filter((row) => row.ocr_gap_category !== "source_discovery_needed");
  const batches = [];
  for (let start = 0; start < selected.length; start += batchSize) {
    const slice = selected.slice(start, start + batchSize);
    batches.push({
      schema_version: "hybrid_ingredient_ocr_gpt55_review_batch.v1",
      batch_id: `gpt55_${shortHash(`${start}:${slice.map((row) => row.evidence_id).join("|")}`, 14)}`,
      generated_at: generatedAt,
      provider: "codex",
      model: modelDefaults().review_model,
      status: "planned",
      allowed_statuses: reviewStatuses,
      cannot_set_status: ["manual_verified"],
      source_row_count: slice.length,
      evidence_ids: slice.map((row) => row.evidence_id),
      review_goal: "Review compact OCR/source candidates and decide whether each is ready for human correction, needs better crop, needs source review, or should be rejected.",
      candidate_only: true,
    });
  }
  return batches;
}

function writeMergedModelSummary(runId, summaryRows, outputPath = publicModelSummaryCsvPath) {
  const headers = [
    "run_id",
    "route_type",
    "route_id",
    "provider",
    "model",
    "status",
    "source_row_count",
    "evidence_ids",
    "candidate_only",
  ];
  const existingRows = fs.existsSync(outputPath)
    ? parseCsv(fs.readFileSync(outputPath, "utf8"))
    : [];
  const retained = existingRows.filter((row) => row.run_id !== runId || row.route_type === "spark_packet");
  const deduped = new Map();
  for (const row of [...retained, ...summaryRows]) {
    deduped.set(`${row.run_id}:${row.route_type}:${row.route_id}`, row);
  }
  writeCsv(outputPath, headers, [...deduped.values()]);
}

async function main() {
  const runId = runIdFromArgs("hybrid-ocr");
  const runDir = runDirFromArgs(runId);
  const dirs = ensureRunDirs(runDir);
  const dryRun = hasFlag("dry-run");
  const noNetwork = hasFlag("no-network") || dryRun;
  const assistType = argValue("assist-type", "grok_research_assist");
  const limit = numberArg("limit", 250);
  const batchSize = Math.min(Math.max(numberArg("batch-size", 15), 1), 50);
  const maxGrokCalls = Math.max(numberArg("max-grok-calls", 3), 0);
  const maxGpt55Batches = Math.max(numberArg("max-gpt55-batches", 5), 0);
  const queuePath = queuePathFromArgs();
  const publicModelSummaryPath = pathFromArg("public-model-summary", publicModelSummaryCsvPath);
  const rows = selectQueueRows(readFullQueue(queuePath), {
    limit,
    product: argValue("product"),
    category: argValue("category"),
    sourceDomain: argValue("source-domain"),
    gapCategory: argValue("gap-category"),
    priority: argValue("priority"),
  });
  const registry = await discoverXaiModels({ noNetwork });
  if (hasFlag("print-registry")) {
    console.log(JSON.stringify(redactPrivate(registry), null, 2));
    return;
  }

  const defaults = modelDefaults();
  const grokModel = assistType.includes("validation") ? defaults.grok_validation_model : defaults.grok_research_model;
  const grokCandidateRows = rows.filter((row) => [
    "source_discovery_needed",
    "readable_panel_photo_needed",
    "package_identity_review_needed",
  ].includes(row.ocr_gap_category));
  const grokBatches = buildBatches(grokCandidateRows, batchSize).slice(0, maxGrokCalls);
  const grokResults = [];
  for (const batch of grokBatches) {
    const result = await runAssistBatch({
      rows: batch.rows,
      assistType,
      model: grokModel,
      dirs,
      dryRun,
      noNetwork,
    });
    const privateResult = { ...result, batch_id: batch.batch_id, group: batch.group };
    writeJson(path.join(dirs.grokAssistsDir, `${batch.batch_id}.json`), privateResult);
    grokResults.push(privateResult);
  }

  const reviewBatches = reviewBatchPlan(rows, Math.max(batchSize, 25)).slice(0, maxGpt55Batches);
  writeJson(path.join(dirs.gpt55ReviewDir, "gpt55_review_batch_plan.private.json"), reviewBatches);

  const summaryRows = [
    ...grokResults.map((result) => ({
      run_id: runId,
      route_type: result.assist_type,
      route_id: result.batch_id,
      provider: result.provider,
      model: result.model,
      status: result.status,
      source_row_count: result.source_row_count,
      evidence_ids: result.evidence_ids.join(";"),
      candidate_only: true,
    })),
    ...reviewBatches.map((batch) => ({
      run_id: runId,
      route_type: "gpt55_review_batch",
      route_id: batch.batch_id,
      provider: batch.provider,
      model: batch.model,
      status: batch.status,
      source_row_count: batch.source_row_count,
      evidence_ids: batch.evidence_ids.join(";"),
      candidate_only: true,
    })),
  ];
  writeMergedModelSummary(runId, summaryRows, publicModelSummaryPath);

  const summary = redactPrivate({
    schema_version: "hybrid_ingredient_ocr_model_assist_summary.v1",
    generated_at: generatedAt,
    run_id: runId,
    public_safety: {
      candidate_only: true,
      private_paths_redacted: true,
      api_keys_committed: false,
      manual_verified_created: false,
    },
    provider_registry: registry,
    totals: {
      selected_rows: rows.length,
      grok_assist_batches_created: grokResults.length,
      gpt55_review_batches_planned: reviewBatches.length,
      max_grok_calls: maxGrokCalls,
      max_gpt55_batches: maxGpt55Batches,
    },
    selected_gap_categories: countBy(rows, "ocr_gap_category"),
    selected_top_products: topList(rows, "product_name", 12),
    allowed_capture_strategies: allowedCaptureStrategies,
    allowed_gpt55_review_statuses: reviewStatuses,
    public_artifacts: {
      model_assist_summary_csv: publicArtifactRef(publicModelSummaryPath),
    },
  });
  writeJson(path.join(runDir, "model_assist_summary.public.json"), summary);
  console.log(JSON.stringify({
    run_id: runId,
    selected_rows: rows.length,
    grok_assist_batches_created: grokResults.length,
    gpt55_review_batches_planned: reviewBatches.length,
    no_network: noNetwork,
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = {
  allowedCaptureStrategies,
  buildGrokPrompt,
  providerRegistry,
  reviewBatchPlan,
};
