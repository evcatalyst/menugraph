const fs = require("fs");
const path = require("path");
const {
  argValue,
  ensureRunDirs,
  generatedAt,
  hasFlag,
  hashFile,
  numberArg,
  pathFromArg,
  publicArtifactRef,
  publicImageMapTemplateCsvPath,
  publicRunSummaryCsvPath,
  queuePathFromArgs,
  readFullQueue,
  readJson,
  redactPrivate,
  runDirFromArgs,
  runIdFromArgs,
  selectQueueRows,
  shortHash,
  slug,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");

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

function extensionFor(value, fallback = ".jpg") {
  const ext = path.extname(String(value || "").split("?")[0]).toLowerCase();
  return /^\.(jpg|jpeg|png|webp|gif|tif|tiff|heic)$/.test(ext) ? ext : fallback;
}

function privateAssetName(row, sourcePath = "") {
  const product = slug(row.product_id || row.product_name || "product");
  const vintage = slug(row.vintage_label || "vintage");
  const evidence = slug(row.evidence_id || shortHash(row.source_url || sourcePath));
  return `${product}__${vintage}__${evidence}${extensionFor(sourcePath)}`;
}

function captureFromLocalImage(row, sourcePath, dirs, dryRun = false) {
  const name = privateAssetName(row, sourcePath);
  const capturePath = path.join(dirs.capturesDir, name);
  const processedPath = path.join(dirs.processedDir, name);
  if (!dryRun) {
    fs.copyFileSync(sourcePath, capturePath);
    fs.copyFileSync(sourcePath, processedPath);
  }
  const originalHash = dryRun ? shortHash(`${sourcePath}:dry-run`) : hashFile(capturePath);
  const processedHash = dryRun ? originalHash : hashFile(processedPath);
  return {
    evidence_id: row.evidence_id,
    capture_status: dryRun ? "local_image_ready_dry_run" : "captured_local_image",
    processed_status: dryRun ? "cleanup_planned" : "processed_passthrough",
    original_sha256: originalHash,
    processed_sha256: processedHash,
    original_private_path: capturePath,
    processed_private_path: processedPath,
    cleanup_actions: ["preserve_original", "copy_for_vision_ocr", "defer_crop_deskew_until_panel_coordinates"],
    image_map_value: processedPath,
  };
}

async function downloadDirectImage(row, dirs, dryRun = false) {
  const url = row.image_reference || "";
  const name = privateAssetName(row, url);
  const capturePath = path.join(dirs.capturesDir, name);
  const processedPath = path.join(dirs.processedDir, name);
  if (dryRun) {
    return {
      evidence_id: row.evidence_id,
      capture_status: "direct_image_download_planned",
      processed_status: "cleanup_planned",
      original_sha256: shortHash(url),
      processed_sha256: shortHash(`${url}:processed`),
      original_private_path: capturePath,
      processed_private_path: processedPath,
      cleanup_actions: ["download_external_image_privately", "deskew_or_rotate", "contrast_sharpen", "crop_panel_candidate"],
      image_map_value: processedPath,
    };
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "MenuGraphProductEvidenceBot/0.1 (private OCR capture; https://github.com/evcatalyst/menugraph)",
    },
  });
  if (!response.ok) throw new Error(`Image download failed ${response.status} ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(capturePath, buffer);
  fs.writeFileSync(processedPath, buffer);
  return {
    evidence_id: row.evidence_id,
    capture_status: "downloaded_direct_image",
    processed_status: "processed_passthrough",
    original_sha256: hashFile(capturePath),
    processed_sha256: hashFile(processedPath),
    original_private_path: capturePath,
    processed_private_path: processedPath,
    cleanup_actions: ["download_external_image_privately", "copy_for_vision_ocr", "defer_crop_deskew_until_panel_coordinates"],
    image_map_value: processedPath,
  };
}

function sourcePagePlan(row, noNetwork) {
  return {
    evidence_id: row.evidence_id,
    capture_status: noNetwork ? "source_page_capture_blocked_no_network" : "source_page_capture_requires_browser_or_screenshot",
    processed_status: "not_ready_for_ocr",
    original_sha256: "",
    processed_sha256: "",
    original_private_path: "",
    processed_private_path: "",
    cleanup_actions: [
      "capture_rights_safe_private_screenshot",
      "crop_visible_label_or_document_surface",
      "deskew_rotate_contrast_sharpen",
    ],
    image_map_value: "",
  };
}

function downloadFailurePlan(row, error) {
  return {
    evidence_id: row.evidence_id,
    capture_status: "direct_image_download_failed",
    processed_status: "not_ready_for_ocr",
    original_sha256: "",
    processed_sha256: "",
    original_private_path: "",
    processed_private_path: "",
    cleanup_actions: [
      "download_external_image_privately",
      `download_failed:${String(error?.message || error || "unknown").slice(0, 120)}`,
      "retry_with_smaller_thumbnail_or_source-host-specific_backoff",
    ],
    image_map_value: "",
  };
}

async function captureRow(row, imageMap, dirs, options) {
  const mappedImage = imageMapValue(imageMap, row);
  if (mappedImage) return captureFromLocalImage(row, mappedImage, dirs, options.dryRun);
  if (row.local_image_path && fs.existsSync(row.local_image_path)) {
    return captureFromLocalImage(row, row.local_image_path, dirs, options.dryRun);
  }
  if (row.image_reference && /^https?:\/\/.+\.(jpe?g|png|webp|gif|tiff?|heic)(\?|$)/i.test(row.image_reference)) {
    if (options.noNetwork) return sourcePagePlan(row, true);
    return downloadDirectImage(row, dirs, options.dryRun);
  }
  return sourcePagePlan(row, options.noNetwork);
}

function publicCaptureRow(row, capture) {
  return {
    evidence_id: row.evidence_id,
    product_id: row.product_id,
    product_name: row.product_name,
    vintage_label: row.vintage_label,
    source_domain: row.source_domain,
    source_type: row.evidence_kind,
    proof_lane: row.proof_lane || "",
    proof_lane_rank: row.proof_lane_rank || "",
    ocr_gap_category: row.ocr_gap_category,
    ocr_priority: row.ocr_priority,
    capture_status: capture.capture_status,
    processed_status: capture.processed_status,
    original_sha256: capture.original_sha256,
    processed_sha256: capture.processed_sha256,
    cleanup_actions: capture.cleanup_actions.join("; "),
    ready_for_ocr: capture.image_map_value ? 1 : 0,
    candidate_only: 1,
  };
}

function buildImageMap(captureRows) {
  const map = {};
  for (const row of captureRows) {
    if (row.image_map_value) map[row.evidence_id] = row.image_map_value;
  }
  return map;
}

function imageMapKeysForRow(row) {
  const explicit = String(row.private_image_map_keys || "")
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean);
  const fallback = [
    row.evidence_id,
    `${row.product_id}:${row.evidence_id}`,
    row.source_url,
  ].filter(Boolean);
  return [...new Set([...explicit, ...fallback])];
}

function imageMapTemplateRow(runId, row) {
  const keys = imageMapKeysForRow(row);
  return {
    run_id: runId,
    evidence_id: row.evidence_id,
    product_id: row.product_id,
    product_name: row.product_name,
    vintage_label: row.vintage_label,
    source_domain: row.source_domain,
    source_url: row.source_url,
    source_title: row.source_title,
    source_type: row.evidence_kind,
    proof_lane: row.proof_lane || "",
    proof_lane_rank: row.proof_lane_rank || "",
    ocr_gap_category: row.ocr_gap_category,
    ocr_priority: row.ocr_priority,
    capture_strategy: row.capture_strategy || row.ocr_recommended_action || "",
    crop_target: row.crop_target || row.ground_truth_fields_missing || "",
    ocr_expected_surface: row.ocr_expected_surface || "",
    image_map_keys: keys.join(";"),
    local_private_image_path: "",
    processed_private_image_path: "",
    panel_crop_note: "",
    rights_review_status: row.rights_status || "rights_review_needed",
    publication_image_policy: row.image_display_policy || "source_link_only_no_public_image",
    candidate_only: 1,
    manual_verified: 0,
  };
}

function buildImageMapTemplateRows(runId, rows) {
  return rows.map((row) => imageMapTemplateRow(runId, row));
}

function summarize(runId, selectedRows, publicRows, options) {
  const count = (field, value) => publicRows.filter((row) => row[field] === value).length;
  const templateRows = options.imageMapTemplateRows || [];
  const imageMapKeyCount = templateRows.reduce((sum, row) => (
    sum + String(row.image_map_keys || "").split(";").filter(Boolean).length
  ), 0);
  return {
    schema_version: "hybrid_ingredient_ocr_capture_summary.v1",
    generated_at: generatedAt,
    run_id: runId,
    run_mode: options.dryRun ? "dry_run" : "private_capture",
    public_safety: {
      candidate_only: true,
      images_committed: false,
      private_paths_redacted: true,
      private_prompts_committed: false,
    },
    totals: {
      selected_rows: selectedRows.length,
      rows_captured: publicRows.length,
      ready_for_ocr: publicRows.filter((row) => Number(row.ready_for_ocr)).length,
      source_page_capture_blocked_no_network: count("capture_status", "source_page_capture_blocked_no_network"),
      direct_image_download_planned: count("capture_status", "direct_image_download_planned"),
      local_image_ready: publicRows.filter((row) => /local_image/.test(row.capture_status)).length,
      image_map_template_rows: templateRows.length,
      image_map_key_count: imageMapKeyCount,
      direct_image_download_failed: count("capture_status", "direct_image_download_failed"),
    },
    public_artifacts: {
      run_summary_csv: options.publicRunSummaryRef,
      image_map_template_csv: options.publicImageMapTemplateRef,
    },
  };
}

async function main() {
  const runId = runIdFromArgs("hybrid-ocr");
  const runDir = runDirFromArgs(runId);
  const limit = numberArg("limit", 250);
  const dryRun = hasFlag("dry-run");
  const noNetwork = hasFlag("no-network") || dryRun;
  const dirs = ensureRunDirs(runDir);
  const imageMapPath = argValue("image-map");
  const imageMap = readJson(imageMapPath, {});
  const queuePath = queuePathFromArgs();
  const publicRunSummaryPath = pathFromArg("public-run-summary", publicRunSummaryCsvPath);
  const publicImageMapTemplatePath = pathFromArg("public-image-map-template", publicImageMapTemplateCsvPath);
  const rows = readFullQueue(queuePath);
  const selectedRows = selectQueueRows(rows, {
    limit,
    product: argValue("product"),
    category: argValue("category"),
    sourceDomain: argValue("source-domain"),
    gapCategory: argValue("gap-category"),
    priority: argValue("priority"),
  });

  const privateRows = [];
  const publicRows = [];
  const imageMapTemplateRows = buildImageMapTemplateRows(runId, selectedRows);
  for (const row of selectedRows) {
    let capture;
    try {
      capture = await captureRow(row, imageMap, dirs, { dryRun, noNetwork });
    } catch (error) {
      capture = downloadFailurePlan(row, error);
    }
    privateRows.push({ ...row, ...capture });
    publicRows.push(publicCaptureRow(row, capture));
  }

  writeJson(path.join(runDir, "capture_manifest.private.json"), privateRows);
  writeJson(path.join(runDir, "image-map.json"), buildImageMap(privateRows));
  const summary = redactPrivate(summarize(runId, selectedRows, publicRows, {
    dryRun,
    publicRunSummaryRef: publicArtifactRef(publicRunSummaryPath),
    publicImageMapTemplateRef: publicArtifactRef(publicImageMapTemplatePath),
    imageMapTemplateRows,
  }));
  writeJson(path.join(runDir, "capture_summary.public.json"), summary);
  writeCsv(path.join(runDir, "capture_summary.public.csv"), [
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_type",
    "proof_lane",
    "proof_lane_rank",
    "ocr_gap_category",
    "ocr_priority",
    "capture_status",
    "processed_status",
    "original_sha256",
    "processed_sha256",
    "cleanup_actions",
    "ready_for_ocr",
    "candidate_only",
  ], publicRows);
  writeCsv(publicRunSummaryPath, [
    "run_id",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_type",
    "proof_lane",
    "proof_lane_rank",
    "ocr_gap_category",
    "ocr_priority",
    "capture_status",
    "processed_status",
    "original_sha256",
    "processed_sha256",
    "cleanup_actions",
    "ready_for_ocr",
    "candidate_only",
  ], publicRows.map((row) => ({ run_id: runId, ...row })));
  writeCsv(publicImageMapTemplatePath, [
    "run_id",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_title",
    "source_type",
    "proof_lane",
    "proof_lane_rank",
    "ocr_gap_category",
    "ocr_priority",
    "capture_strategy",
    "crop_target",
    "ocr_expected_surface",
    "image_map_keys",
    "local_private_image_path",
    "processed_private_image_path",
    "panel_crop_note",
    "rights_review_status",
    "publication_image_policy",
    "candidate_only",
    "manual_verified",
  ], imageMapTemplateRows);

  console.log(JSON.stringify({
    run_id: runId,
    selected_rows: selectedRows.length,
    rows_captured: publicRows.length,
    ready_for_ocr: summary.totals.ready_for_ocr,
    dry_run: dryRun,
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = {
  buildImageMapTemplateRows,
  buildImageMap,
  captureFromLocalImage,
  downloadFailurePlan,
  imageMapKeysForRow,
  publicCaptureRow,
};
