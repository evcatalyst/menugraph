const fs = require("fs");
const path = require("path");
const {
  countBy,
  ensureRunDirs,
  generatedAt,
  normalizeText,
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

const root = path.join(__dirname, "..");
const defaultResultDir = path.join(root, ".cache/ingredient-ocr/runs/cwa-grok-source-hunt-run-v1/grok-assists/grok-source-hunt-results");
const publicReviewJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_grok_source_lead_review.json");
const publicReviewCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_grok_source_lead_review.csv");
const publicRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_grok_source_lead_review_runbook.md");

function resultFiles(resultDir = "") {
  if (!resultDir || !fs.existsSync(resultDir)) return [];
  return fs.readdirSync(resultDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(resultDir, file))
    .sort();
}

function arrayValue(value) {
  if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean);
  return String(value || "").split(/[;,]/).map(normalizeText).filter(Boolean);
}

function sourceHost(value = "") {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function surfaceSignals(lead = {}) {
  const surfaces = arrayValue(lead.visible_surfaces);
  return {
    visible_surfaces: surfaces.join(";"),
    ingredient_panel_signal: surfaces.some((surface) => /ingredient/i.test(surface)) ? 1 : 0,
    nutrition_panel_signal: surfaces.some((surface) => /nutrition/i.test(surface)) ? 1 : 0,
    net_weight_signal: surfaces.some((surface) => /net_weight|net weight/i.test(surface)) ? 1 : 0,
    manufacturer_signal: surfaces.some((surface) => /manufacturer|distributor/i.test(surface)) ? 1 : 0,
  };
}

function leadPriority(lead = {}) {
  const signals = surfaceSignals(lead);
  let score = 0;
  if (signals.ingredient_panel_signal) score += 50;
  if (signals.nutrition_panel_signal) score += 35;
  if (signals.net_weight_signal) score += 12;
  if (signals.manufacturer_signal) score += 8;
  if (lead.source_url) score += 10;
  if (/back_panel|side_panel|retailer_label|archive_capture|auction_listing/.test(lead.source_type || "")) score += 10;
  return score;
}

function publicNextAction(row = {}) {
  if (Number(row.ingredient_panel_signal) || Number(row.nutrition_panel_signal)) {
    return "Privately open the candidate source, confirm panel readability, then crop for OCR if usable.";
  }
  return "Privately review the candidate source for package identity, date cues, and whether a readable panel exists.";
}

function rowsFromResult(result = {}) {
  const leads = Array.isArray(result.parsed?.leads) ? result.parsed.leads : [];
  return leads.map((lead, index) => {
    const signals = surfaceSignals(lead);
    const sourceUrl = normalizeText(lead.source_url);
    const sourceTitle = normalizeText(lead.source_title);
    const sourceOwner = normalizeText(lead.source_owner_or_publisher);
    const rowBase = {
      lead_id: `grok_lead_${shortHash(`${result.packet_id}:${index}:${sourceUrl}:${sourceTitle}`, 16)}`,
      packet_id: result.packet_id,
      product_id: result.product_id,
      product_name: result.product_name,
      model: result.model,
      result_status: result.status,
      prompt_hash: result.prompt_hash,
      response_hash: result.response_hash,
      source_type: normalizeText(lead.source_type || "other"),
      claimed_product_date: normalizeText(lead.claimed_product_date),
      ...signals,
      source_url_hash: sourceUrl ? shortHash(sourceUrl, 18) : "",
      source_title_hash: sourceTitle ? shortHash(sourceTitle, 18) : "",
      source_owner_hash: sourceOwner ? shortHash(sourceOwner, 18) : "",
      confidence_warning_hash: lead.confidence_warning ? shortHash(lead.confidence_warning, 18) : "",
      candidate_priority: leadPriority(lead),
      review_state: "needs_private_source_review",
      candidate_only: 1,
      manual_verified: 0,
    };
    return {
      public: {
        ...rowBase,
        next_action: publicNextAction(rowBase),
      },
      private: {
        ...rowBase,
        source_host: sourceHost(sourceUrl),
        source_url: sourceUrl,
        source_title: sourceTitle,
        source_owner_or_publisher: sourceOwner,
        confidence_warning: normalizeText(lead.confidence_warning),
        model_next_action: normalizeText(lead.next_action),
      },
    };
  });
}

function buildRows(results = []) {
  const pairs = results.flatMap(rowsFromResult);
  const publicRows = pairs.map((pair) => pair.public).sort((a, b) => (
    Number(b.candidate_priority || 0) - Number(a.candidate_priority || 0)
    || String(a.product_name).localeCompare(String(b.product_name))
    || String(a.lead_id).localeCompare(String(b.lead_id))
  ));
  const privateRowsById = new Map(pairs.map((pair) => [pair.public.lead_id, pair.private]));
  const privateRows = publicRows.map((row) => privateRowsById.get(row.lead_id));
  return { publicRows, privateRows };
}

function buildSummary({ runId, results, publicRows, publicCsvPath, publicJsonPath, publicRunbookPath }) {
  return redactPrivate({
    schema_version: "confection_wrapper_grok_source_lead_review.v1",
    generated_at: generatedAt,
    run_id: runId,
    private_result_files_read: results.length,
    public_review_rows: publicRows.length,
    products_with_candidate_leads: new Set(publicRows.map((row) => row.product_id)).size,
    ingredient_panel_signal_rows: publicRows.filter((row) => Number(row.ingredient_panel_signal)).length,
    nutrition_panel_signal_rows: publicRows.filter((row) => Number(row.nutrition_panel_signal)).length,
    candidate_only_rows: publicRows.filter((row) => Number(row.candidate_only)).length,
    manual_verified_rows: publicRows.filter((row) => Number(row.manual_verified)).length,
    by_review_state: countBy(publicRows, "review_state"),
    by_product: countBy(publicRows, "product_name"),
    by_source_type: countBy(publicRows, "source_type"),
    first_rows: publicRows.slice(0, 12),
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      model_returned_source_urls_committed: false,
      model_returned_source_titles_committed: false,
      raw_model_outputs_committed: false,
      prompts_committed: false,
      manual_verified_created: false,
    },
    public_artifacts: {
      grok_source_lead_review_csv: publicArtifactRef(publicCsvPath),
      grok_source_lead_review_json: publicArtifactRef(publicJsonPath),
      grok_source_lead_review_runbook_md: publicArtifactRef(publicRunbookPath),
    },
  });
}

function renderRunbook(summary = {}) {
  const lines = [
    "# CWA Grok Source Lead Review",
    "",
    `Generated: ${summary.generated_at || generatedAt}`,
    `Run ID: ${summary.run_id || ""}`,
    "",
    "This public-safe artifact summarizes candidate source leads returned by private Grok source-hunt results. It publishes review counts and hashes only; model-returned URLs, titles, owner text, warnings, raw outputs, prompts, and local paths stay private.",
    "",
    "## Current State",
    "",
    `- Private result files read: ${summary.private_result_files_read || 0}`,
    `- Public review rows: ${summary.public_review_rows || 0}`,
    `- Products with candidate leads: ${summary.products_with_candidate_leads || 0}`,
    `- Ingredient-panel signal rows: ${summary.ingredient_panel_signal_rows || 0}`,
    `- Manual verified rows created: ${summary.manual_verified_rows || 0}`,
    "",
    "## Rules",
    "",
    "- Source leads are `grok_research_assist` candidates only.",
    "- Public rows use hashes and counts until a reviewer confirms source usability.",
    "- Do not promote any ingredient claim without source review, panel crop, OCR/correction, and manual verification.",
    "",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

function writeLeadReview({
  runId,
  runDir,
  resultDir = defaultResultDir,
  publicCsvPath = publicReviewCsvPath,
  publicJsonPath = publicReviewJsonPath,
  publicRunbookPath: runbookPath = publicRunbookPath,
  updateSiteSummary = true,
} = {}) {
  const dirs = ensureRunDirs(runDir);
  const results = resultFiles(resultDir).map((file) => readJson(file, {}));
  const { publicRows, privateRows } = buildRows(results);
  const privateReviewDir = path.join(dirs.grokAssistsDir, "grok-source-lead-review");
  fs.mkdirSync(privateReviewDir, { recursive: true });
  writeJson(path.join(privateReviewDir, "grok-source-lead-review.private.json"), {
    schema_version: "confection_wrapper_grok_source_lead_review_private.v1",
    generated_at: generatedAt,
    run_id: runId,
    private_rows: privateRows,
  });
  writeCsv(path.join(privateReviewDir, "grok-source-lead-review.private.csv"), [
    "lead_id",
    "packet_id",
    "product_id",
    "product_name",
    "source_type",
    "source_url",
    "source_title",
    "source_owner_or_publisher",
    "claimed_product_date",
    "visible_surfaces",
    "confidence_warning",
    "model_next_action",
    "review_state",
    "candidate_only",
    "manual_verified",
  ], privateRows);

  writeCsv(publicCsvPath, [
    "lead_id",
    "packet_id",
    "product_id",
    "product_name",
    "model",
    "result_status",
    "prompt_hash",
    "response_hash",
    "source_type",
    "claimed_product_date",
    "visible_surfaces",
    "ingredient_panel_signal",
    "nutrition_panel_signal",
    "net_weight_signal",
    "manufacturer_signal",
    "source_url_hash",
    "source_title_hash",
    "source_owner_hash",
    "confidence_warning_hash",
    "candidate_priority",
    "review_state",
    "candidate_only",
    "manual_verified",
    "next_action",
  ], publicRows);
  const summary = buildSummary({
    runId,
    results,
    publicRows,
    publicCsvPath,
    publicJsonPath,
    publicRunbookPath: runbookPath,
  });
  writeJson(publicJsonPath, summary);
  fs.mkdirSync(path.dirname(runbookPath), { recursive: true });
  fs.writeFileSync(runbookPath, renderRunbook(summary));

  if (updateSiteSummary) {
    const siteSummary = readJson(summaryPath, {});
    siteSummary.confection_wrapper_grok_source_lead_review_summary = summary;
    siteSummary.confection_wrapper_grok_source_hunt_run_summary = siteSummary.confection_wrapper_grok_source_hunt_run_summary || {};
    siteSummary.confection_wrapper_grok_source_hunt_run_summary.lead_review_summary = summary;
    siteSummary.confection_wrapper_grok_source_hunt_run_summary.public_artifacts = {
      ...(siteSummary.confection_wrapper_grok_source_hunt_run_summary.public_artifacts || {}),
      ...summary.public_artifacts,
    };
    siteSummary.confection_wrapper_ingredient_priority_summary = siteSummary.confection_wrapper_ingredient_priority_summary || {};
    siteSummary.confection_wrapper_ingredient_priority_summary.grok_source_lead_review_summary = summary;
    siteSummary.confection_wrapper_ingredient_priority_summary.artifacts = {
      ...(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts || {}),
      ...summary.public_artifacts,
    };
    writeJson(summaryPath, siteSummary);
  }

  return { summary, publicRows, privateRows, privateReviewDir };
}

function main() {
  const runId = runIdFromArgs("cwa-grok-source-lead-review");
  const runDir = runDirFromArgs(runId);
  const result = writeLeadReview({
    runId,
    runDir,
    resultDir: process.argv.find((arg) => arg.startsWith("--result-dir="))
      ? path.resolve(process.argv.find((arg) => arg.startsWith("--result-dir=")).split("=").slice(1).join("="))
      : defaultResultDir,
  });
  console.log(JSON.stringify({
    run_id: runId,
    private_result_files_read: result.summary.private_result_files_read,
    public_review_rows: result.summary.public_review_rows,
    products_with_candidate_leads: result.summary.products_with_candidate_leads,
    private_review_dir: result.privateReviewDir,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildRows,
  leadPriority,
  rowsFromResult,
  sourceHost,
  writeLeadReview,
};
