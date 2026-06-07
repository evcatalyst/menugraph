const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const manifestPath = path.join(root, "docs/data/product-evidence/ingredient_ocr_manifest.json");
const queueCsvPath = path.join(root, "docs/data/product-evidence/exports/ten_product_pilot_ocr_queue.csv");
const swiftHarnessPath = path.join(root, "scripts/vision-ocr.swift");
const defaultResultDir = path.join(root, ".cache/ingredient-ocr");
const generatedAt = "2026-06-07T19:00:00Z";
const ocrQueueHref = "../data/product-evidence/exports/ten_product_pilot_ocr_queue.csv";

const ingredientPatterns = [
  /\bingredients?\b/i,
  /\bcontains\b/i,
  /\bmay contain\b/i,
  /\ballergen\b/i,
  /\bnutrition facts\b/i,
  /\bserving size\b/i,
  /\bnet\s*(wt|weight)\b/i,
  /\bdistributed by\b/i,
  /\bmanufactured by\b/i,
];

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function readJson(filePath) {
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

function writeCsv(filePath, headers, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${[
      headers.join(","),
      ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
    ].join("\n")}\n`,
  );
}

function normalizeText(value) {
  return String(value || "").trim();
}

function textBlob(...values) {
  return values.map(normalizeText).join(" ").toLowerCase();
}

function isPhotoLike(evidence) {
  const text = textBlob(evidence.kind, evidence.photo_role, evidence.label_panel_state, evidence.source, evidence.title);
  return /(photo|image|package|panel|marketplace|retailer|smartlabel|label database|museum|archive|flickr|commons|walmart|kroger|brand_label)/i.test(text);
}

function isLikelyIngredientSurface(evidence) {
  const text = textBlob(evidence.status, evidence.kind, evidence.photo_role, evidence.label_panel_state, evidence.quality_note, evidence.title);
  return ingredientPatterns.some((pattern) => pattern.test(text));
}

function detectRoles(evidence) {
  const text = textBlob(evidence.status, evidence.kind, evidence.photo_role, evidence.label_panel_state, evidence.quality_note, evidence.title);
  return {
    package_front_visible: /(front|package object|package or source evidence|package\/sku|current package)/i.test(text),
    ingredient_panel_visible: /(ingredient panel visible|ingredient\/nutrition panel visible|ingredient text candidate|partial package text|label text candidate)/i.test(text),
    nutrition_panel_visible: /nutrition panel visible|ingredient\/nutrition panel visible|nutrition facts/i.test(text),
    net_weight_visible: /net weight visible|net wt|net weight|[0-9.]+\s?oz/i.test(text),
    manufacturer_visible: /manufacturer|distributed by|distributor/i.test(text),
    needs_panel_review: /panel not verified|panel role not yet reviewed|not readable|not reviewed/i.test(text),
  };
}

function versionIndexFor(product) {
  const index = new Map();
  for (const version of product.versions || []) {
    for (const evidenceId of version.evidence_ids || []) {
      if (!index.has(evidenceId)) index.set(evidenceId, []);
      index.get(evidenceId).push({
        version_id: version.id,
        vintage: version.vintage,
        version_label: version.label,
        version_status: version.status,
        has_label_extract: Boolean(version.label_extract),
      });
    }
  }
  return index;
}

function priorityFor(evidence, roles, linkedVersions) {
  if (linkedVersions.some((version) => version.has_label_extract)) return "high";
  if (evidence.status === "label_visible" || evidence.status === "label_text_candidate") return "high";
  if (roles.ingredient_panel_visible || roles.nutrition_panel_visible) return "high";
  if (roles.needs_panel_review && isPhotoLike(evidence)) return "medium";
  if (isLikelyIngredientSurface(evidence)) return "medium";
  return "low";
}

function actionFor(priority, roles, localImagePath) {
  if (localImagePath) return "run_native_vision_ocr";
  if (priority === "high" && roles.ingredient_panel_visible) return "capture_or_attach_panel_crop_then_ocr";
  if (priority === "high") return "capture_source_screenshot_or_product_image_then_ocr";
  if (roles.needs_panel_review) return "review_source_image_for_panel_visibility";
  return "hold_as_low_priority_visual_context";
}

function readImageMap(filePath) {
  if (!filePath) return {};
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return {};
  return readJson(resolved);
}

function localImageFor(map, row) {
  const candidates = [
    row.evidence_id,
    `${row.product_id}:${row.evidence_id}`,
    row.source_url,
  ];
  for (const key of candidates) {
    const value = map[key];
    if (value && fs.existsSync(value)) return value;
  }
  return "";
}

function buildQueue(data, imageMap = {}) {
  const rows = [];
  for (const product of data.products || []) {
    const versionIndex = versionIndexFor(product);
    for (const evidence of product.evidence || []) {
      if (!isPhotoLike(evidence) && !isLikelyIngredientSurface(evidence)) continue;
      const linkedVersions = versionIndex.get(evidence.id) || [];
      const roles = detectRoles(evidence);
      const base = {
        product_id: product.id,
        product_name: product.name,
        evidence_id: evidence.id,
        source_status: evidence.status || "",
        source_kind: evidence.kind || "",
        source_owner: evidence.source || "",
        source_url: evidence.url || "",
        source_title: evidence.title || "",
        rights_note: evidence.rights || "",
        photo_role: evidence.photo_role || "",
        label_panel_state: evidence.label_panel_state || "",
        quality_note: evidence.quality_note || "",
        linked_vintages: linkedVersions.map((version) => version.vintage).join(";"),
        linked_versions: linkedVersions.map((version) => version.version_id).join(";"),
      };
      const priority = priorityFor(evidence, roles, linkedVersions);
      const row = {
        ...base,
        ...roles,
        ocr_priority: priority,
        local_image_path: "",
        ocr_readiness: "needs_local_image_or_capture",
      };
      row.local_image_path = localImageFor(imageMap, row);
      row.ocr_recommended_action = actionFor(priority, roles, row.local_image_path);
      row.ocr_readiness = row.local_image_path ? "local_image_ready" : row.ocr_recommended_action;
      row.ingredient_signal = isLikelyIngredientSurface(evidence) || roles.ingredient_panel_visible;
      rows.push(row);
    }
  }
  return rows.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.ocr_priority] - rank[b.ocr_priority]
      || a.product_name.localeCompare(b.product_name)
      || a.evidence_id.localeCompare(b.evidence_id);
  });
}

function buildManifest(data, queue) {
  const byProduct = new Map();
  for (const row of queue) {
    if (!byProduct.has(row.product_id)) {
      byProduct.set(row.product_id, {
        id: row.product_id,
        name: row.product_name,
        ocr_candidate_count: 0,
        high_priority_count: 0,
        local_image_ready_count: 0,
        label_visible_count: 0,
        needs_panel_review_count: 0,
        candidate_evidence_ids: [],
      });
    }
    const product = byProduct.get(row.product_id);
    product.ocr_candidate_count += 1;
    if (row.ocr_priority === "high") product.high_priority_count += 1;
    if (row.local_image_path) product.local_image_ready_count += 1;
    if (row.ingredient_panel_visible) product.label_visible_count += 1;
    if (row.needs_panel_review) product.needs_panel_review_count += 1;
    product.candidate_evidence_ids.push(row.evidence_id);
  }

  return {
    schema_version: 1,
    generated_at_utc: generatedAt,
    processor: {
      swift_harness: "scripts/vision-ocr.swift",
      native_framework: "Apple Vision VNRecognizeTextRequest",
      output_policy: "OCR candidates are review inputs only; manual verification is required before formulation claims.",
    },
    totals: {
      products: data.products.length,
      ocr_candidates: queue.length,
      high_priority: queue.filter((row) => row.ocr_priority === "high").length,
      medium_priority: queue.filter((row) => row.ocr_priority === "medium").length,
      low_priority: queue.filter((row) => row.ocr_priority === "low").length,
      local_image_ready: queue.filter((row) => row.local_image_path).length,
      ingredient_signal_candidates: queue.filter((row) => row.ingredient_signal).length,
    },
    products: [...byProduct.values()],
    queue,
  };
}

function updateNavigatorData(data, manifest) {
  data.ingredient_ocr_summary = {
    generated_at_utc: generatedAt,
    ocr_candidate_count: manifest.totals.ocr_candidates,
    high_priority_count: manifest.totals.high_priority,
    local_image_ready_count: manifest.totals.local_image_ready,
    manifest_path: "docs/data/product-evidence/ingredient_ocr_manifest.json",
    queue_csv: "docs/data/product-evidence/exports/ten_product_pilot_ocr_queue.csv",
    claim_policy: "Native OCR output is candidate evidence only until reviewer corrected and manually verified.",
  };
  const productSummary = new Map(manifest.products.map((product) => [product.id, product]));
  for (const product of data.products || []) {
    const summary = productSummary.get(product.id) || {};
    product.ingredient_ocr_summary = {
      ocr_candidate_count: summary.ocr_candidate_count || 0,
      high_priority_count: summary.high_priority_count || 0,
      local_image_ready_count: summary.local_image_ready_count || 0,
      needs_panel_review_count: summary.needs_panel_review_count || 0,
    };
    product.export_paths = {
      ...(product.export_paths || {}),
      ocr_queue_csv: ocrQueueHref,
    };
  }
}

function runSwiftOcr(queue, resultDir) {
  fs.mkdirSync(resultDir, { recursive: true });
  const moduleCachePath = path.join(resultDir, "swift-module-cache");
  fs.mkdirSync(moduleCachePath, { recursive: true });
  const rows = queue.filter((row) => row.local_image_path);
  const results = [];
  for (const row of rows) {
    const run = spawnSync("swift", ["-module-cache-path", moduleCachePath, swiftHarnessPath, row.local_image_path], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        CLANG_MODULE_CACHE_PATH: moduleCachePath,
        SWIFT_MODULE_CACHE_PATH: moduleCachePath,
      },
      maxBuffer: 1024 * 1024 * 16,
    });
    const result = {
      product_id: row.product_id,
      evidence_id: row.evidence_id,
      source_url: row.source_url,
      local_image_path: row.local_image_path,
      status: run.status === 0 ? "ocr_extracted" : "ocr_failed",
      stderr: run.stderr.trim(),
      output: null,
    };
    if (run.status === 0) {
      result.output = JSON.parse(run.stdout);
      result.ingredient_signal_lines = result.output.lines
        .filter((line) => ingredientPatterns.some((pattern) => pattern.test(line.text)))
        .map((line) => line.text);
    }
    results.push(result);
  }
  const jsonlPath = path.join(resultDir, "ingredient_ocr_results.jsonl");
  fs.writeFileSync(jsonlPath, `${results.map((row) => JSON.stringify(row)).join("\n")}\n`);
  writeCsv(path.join(resultDir, "ingredient_ocr_results.csv"), [
    "product_id",
    "evidence_id",
    "status",
    "line_count",
    "ingredient_signal_lines",
    "source_url",
    "local_image_path",
  ], results.map((row) => ({
    product_id: row.product_id,
    evidence_id: row.evidence_id,
    status: row.status,
    line_count: row.output?.lines?.length ?? 0,
    ingredient_signal_lines: row.ingredient_signal_lines || [],
    source_url: row.source_url,
    local_image_path: row.local_image_path,
  })));
  return { result_count: results.length, jsonl_path: jsonlPath };
}

function main() {
  const imageMap = readImageMap(argValue("image-map", process.env.INGREDIENT_OCR_IMAGE_MAP || ""));
  const data = readJson(navigatorPath);
  const queue = buildQueue(data, imageMap);
  const manifest = buildManifest(data, queue);
  updateNavigatorData(data, manifest);

  writeJson(manifestPath, manifest);
  writeCsv(queueCsvPath, [
    "product_id",
    "product_name",
    "evidence_id",
    "ocr_priority",
    "ocr_readiness",
    "ocr_recommended_action",
    "source_status",
    "source_kind",
    "source_owner",
    "source_url",
    "source_title",
    "rights_note",
    "photo_role",
    "label_panel_state",
    "package_front_visible",
    "ingredient_panel_visible",
    "nutrition_panel_visible",
    "net_weight_visible",
    "manufacturer_visible",
    "needs_panel_review",
    "ingredient_signal",
    "linked_vintages",
    "linked_versions",
  ], queue);
  writeJson(navigatorPath, data);

  let runSummary = null;
  if (hasFlag("run")) {
    runSummary = runSwiftOcr(queue, path.resolve(argValue("result-dir", defaultResultDir)));
  }

  console.log(JSON.stringify({
    ocr_candidates: queue.length,
    high_priority: manifest.totals.high_priority,
    local_image_ready: manifest.totals.local_image_ready,
    manifest: manifestPath,
    queue_csv: queueCsvPath,
    run: runSummary,
  }, null, 2));
}

main();
