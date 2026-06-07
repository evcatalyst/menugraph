const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const generatedAt = "2026-06-07T20:30:00Z";
const fullQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");
const publicHybridSummaryPath = path.join(root, "docs/data/product-evidence/hybrid_ocr_pipeline_summary.json");
const publicModelSummaryCsvPath = path.join(root, "docs/data/product-evidence/exports/hybrid_ocr_model_assist_summary.csv");
const publicRunSummaryCsvPath = path.join(root, "docs/data/product-evidence/exports/hybrid_ocr_run_summary.csv");
const publicReviewQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/hybrid_ocr_review_queue.csv");
const defaultRunRoot = path.join(root, ".cache/ingredient-ocr/runs");

const approvedSparkTaskTypes = [
  "capture_strategy_packet",
  "domain_failure_packet",
  "selector_hint_packet",
  "ocr_result_packet",
  "review_queue_packet",
];

const reviewStatuses = [
  "candidate_review_ready",
  "needs_better_crop",
  "needs_source_review",
  "needs_manual_transcription",
  "reject_candidate",
];

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function numberArg(name, fallback) {
  const parsed = Number(argValue(name, fallback));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pathFromArg(name, fallback) {
  const value = argValue(name, fallback);
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function queuePathFromArgs(fallback = fullQueueCsvPath) {
  return pathFromArg("queue", fallback);
}

function readJson(filePath, fallback = null) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') inQuotes = false;
      else value += char;
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") value += char;
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const headers = rows.shift() || [];
  return rows
    .filter((cells) => cells.some(Boolean))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function writeCsv(filePath, headers, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${[
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n")}\n`);
}

function domainFromUrl(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function queuePriority(row) {
  if (row.ocr_priority) return row.ocr_priority;
  const priority = numeric(row.upgrade_priority || row.registry_priority);
  if (priority >= 100) return "high";
  if (priority >= 50) return "medium";
  return "low";
}

function queueGapCategory(row) {
  if (row.ocr_gap_category) return row.ocr_gap_category;
  if (row.display_lane) return row.display_lane;
  if (row.capture_strategy === "source_hunt") return "source_discovery_needed";
  if (row.capture_strategy === "document_text_extract") return "document_text_pipeline_needed";
  if (row.capture_strategy === "source_page_screenshot") return "source_page_capture_needed";
  if (row.capture_strategy === "panel_crop") return "panel_capture_needed";
  return "";
}

function queueAccessState(row) {
  if (row.ocr_access_state) return row.ocr_access_state;
  if (row.local_image_path) return "local_image_ready";
  if (row.image_reference) return "external_image_reference_ready";
  if (row.source_url) return "source_page_capture_needed";
  return "source_discovery_needed";
}

function normalizeQueueRow(row) {
  const sourceUrl = normalizeText(row.source_url);
  const sourceDomain = normalizeText(row.source_domain || row.source_owner) || domainFromUrl(sourceUrl);
  const gapCategory = queueGapCategory(row);
  const expectedSurface = normalizeText(row.ocr_expected_surface);
  const cropTarget = normalizeText(row.crop_target);
  return {
    ...row,
    product_id: normalizeText(row.product_id || row.batch_product_id),
    product_name: normalizeText(row.product_name),
    category: normalizeText(row.category),
    vintage_label: normalizeText(row.vintage_label || row.linked_vintages),
    evidence_id: normalizeText(row.evidence_id),
    evidence_kind: normalizeText(row.evidence_kind || row.source_type || row.capture_strategy || row.display_lane),
    source_domain: sourceDomain,
    source_url: sourceUrl,
    source_title: normalizeText(row.source_title),
    source_owner: normalizeText(row.source_owner),
    ocr_priority: queuePriority(row),
    ocr_gap_category: gapCategory,
    ocr_access_state: queueAccessState(row),
    ocr_recommended_action: normalizeText(row.ocr_recommended_action || row.next_action || row.capture_goal),
    registry_priority: normalizeText(row.registry_priority || row.upgrade_priority),
    promotion_blocker: normalizeText(row.promotion_blocker || row.success_criteria),
    ground_truth_fields_missing: normalizeText(row.ground_truth_fields_missing || row.crop_target),
    image_reference: normalizeText(row.image_reference || row.public_image_url || row.thumbnail_url),
    ingredient_panel_visible: normalizeText(row.ingredient_panel_visible || (/ingredient/.test(`${expectedSurface} ${cropTarget}`) ? "true" : "")),
    nutrition_panel_visible: normalizeText(row.nutrition_panel_visible || (/nutrition/.test(`${expectedSurface} ${cropTarget}`) ? "true" : "")),
    net_weight_visible: normalizeText(row.net_weight_visible || (/net[- ]?weight/.test(cropTarget) ? "true" : "")),
  };
}

function readFullQueue(filePath = fullQueueCsvPath) {
  return parseCsv(fs.readFileSync(filePath, "utf8")).map(normalizeQueueRow);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function slug(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
}

function shortHash(value, length = 12) {
  return crypto.createHash("sha256").update(String(value ?? "")).digest("hex").slice(0, length);
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function promptHash(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function responseHash(payload) {
  return crypto.createHash("sha256").update(String(payload ?? "")).digest("hex");
}

function isPrivatePath(value) {
  return /(^|["\s])(?:\/Users\/|\/private\/|\/tmp\/|\.cache\/|file:\/\/)/.test(normalizeText(value));
}

function redactPrivate(value) {
  if (Array.isArray(value)) return value.map(redactPrivate);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, redactPrivate(val)]));
  }
  return isPrivatePath(value) ? "[private_path_redacted]" : value;
}

function runIdFromArgs(prefix = "hybrid-ocr") {
  return argValue("run-id", `${prefix}-${generatedAt.replace(/[^0-9]/g, "").slice(0, 12)}`);
}

function runDirFromArgs(runId = runIdFromArgs()) {
  return path.resolve(argValue("run-dir", path.join(defaultRunRoot, runId)));
}

function ensureRunDirs(runDir) {
  const dirs = {
    runDir,
    capturesDir: path.join(runDir, "captures"),
    processedDir: path.join(runDir, "processed"),
    ocrDir: path.join(runDir, "ocr"),
    sparkPacketsDir: path.join(runDir, "spark-packets"),
    grokAssistsDir: path.join(runDir, "grok-assists"),
    gpt55ReviewDir: path.join(runDir, "gpt55-review"),
    modelCacheDir: path.join(runDir, "model-cache"),
  };
  Object.values(dirs).forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
  return dirs;
}

function laneRank(row) {
  return ({
    panel_capture_needed: 0,
    document_text_pipeline_needed: 1,
    readable_panel_photo_needed: 2,
    package_identity_review_needed: 3,
    source_discovery_needed: 4,
  })[row.ocr_gap_category] ?? 8;
}

function priorityRank(row) {
  return ({ high: 0, medium: 1, low: 2, blocked: 3 })[row.ocr_priority] ?? 9;
}

function rowSort(a, b) {
  return priorityRank(a) - priorityRank(b)
    || laneRank(a) - laneRank(b)
    || numeric(b.registry_priority) - numeric(a.registry_priority)
    || String(a.product_name).localeCompare(String(b.product_name))
    || String(a.evidence_id).localeCompare(String(b.evidence_id));
}

function matchesFilter(value, filter) {
  if (!filter) return true;
  return normalizeText(value).toLowerCase() === normalizeText(filter).toLowerCase();
}

function selectQueueRows(rows, options = {}) {
  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : rows.length;
  return rows
    .filter((row) => matchesFilter(row.product_id, options.product) || matchesFilter(row.product_name, options.product))
    .filter((row) => matchesFilter(row.category, options.category))
    .filter((row) => matchesFilter(row.source_domain, options.sourceDomain))
    .filter((row) => matchesFilter(row.ocr_gap_category, options.gapCategory))
    .filter((row) => matchesFilter(row.ocr_priority, options.priority))
    .sort(rowSort)
    .slice(0, Math.max(0, limit));
}

function groupKeyForRow(row) {
  return [row.ocr_gap_category || "unknown_gap", row.source_domain || "no_domain", row.category || "uncategorized"].map(slug).join("__");
}

function publicEvidenceRow(row) {
  return {
    evidence_id: row.evidence_id,
    product_id: row.product_id,
    product_name: row.product_name,
    brand: row.brand,
    category: row.category,
    vintage_label: row.vintage_label,
    evidence_kind: row.evidence_kind,
    source_domain: row.source_domain,
    source_url: row.source_url,
    source_title: row.source_title,
    ocr_priority: row.ocr_priority,
    ocr_gap_category: row.ocr_gap_category,
    ocr_access_state: row.ocr_access_state,
    ocr_recommended_action: row.ocr_recommended_action,
    ingredient_panel_visible: row.ingredient_panel_visible,
    nutrition_panel_visible: row.nutrition_panel_visible,
    net_weight_visible: row.net_weight_visible,
    promotion_blocker: row.promotion_blocker,
  };
}

function countBy(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const value = normalizeText(row[field]) || "unknown";
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key, count]) => ({ key, count }));
}

function topList(rows, field, limit = 6) {
  return countBy(rows, field).slice(0, limit).map(({ key, count }) => `${key} (${count})`).join("; ");
}

function modelDefaults() {
  return {
    spark_model: process.env.CODEX_SPARK_MODEL || "gpt-5.3-codex-spark",
    review_model: process.env.CODEX_REVIEW_MODEL || "gpt-5.5",
    grok_model: process.env.GROK_MODEL || "grok-4.3",
    grok_research_model: process.env.GROK_RESEARCH_MODEL || process.env.GROK_MODEL || "grok-4.3",
    grok_validation_model: process.env.GROK_VALIDATION_MODEL || process.env.GROK_MODEL || "grok-4.3",
  };
}

function xaiApiKey() {
  return process.env.xai_api || process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
}

function xaiBaseUrl() {
  return (process.env.GROK_API_BASE || "https://api.x.ai/v1").replace(/\/+$/, "");
}

module.exports = {
  approvedSparkTaskTypes,
  argValue,
  countBy,
  defaultRunRoot,
  ensureRunDirs,
  fullQueueCsvPath,
  generatedAt,
  groupKeyForRow,
  hasFlag,
  hashFile,
  modelDefaults,
  normalizeText,
  numberArg,
  parseCsv,
  pathFromArg,
  promptHash,
  publicEvidenceRow,
  publicHybridSummaryPath,
  publicModelSummaryCsvPath,
  publicReviewQueueCsvPath,
  publicRunSummaryCsvPath,
  queuePathFromArgs,
  readFullQueue,
  readJson,
  redactPrivate,
  responseHash,
  reviewStatuses,
  runDirFromArgs,
  runIdFromArgs,
  selectQueueRows,
  shortHash,
  slug,
  summaryPath,
  topList,
  writeCsv,
  writeJson,
  xaiApiKey,
  xaiBaseUrl,
};
