const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");
const manifestPath = path.join(root, "docs/data/product-evidence/ingredient_ocr_manifest.json");
const queueCsvPath = path.join(root, "docs/data/product-evidence/exports/ten_product_pilot_ocr_queue.csv");
const fullCorpusManifestPath = path.join(root, "docs/data/product-evidence/full_corpus_ingredient_ocr_manifest.json");
const fullCorpusQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv");
const fullCorpusGapCsvPath = path.join(root, "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_gap_report.csv");
const fullCorpusGapMarkdownPath = path.join(root, "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_gap_report.md");
const sourceFamilySummaryPath = path.join(root, "docs/data/product-evidence/source_family_summary.json");
const ocrBoardSummaryPath = path.join(root, "docs/data/product-evidence/ocr_board_summary.json");
const productStoryIndexPath = path.join(root, "docs/data/product-evidence/product_story_index.json");
const publicReviewQueuePath = path.join(root, "docs/data/product-evidence/review_queue_public.csv");
const publicGapReportPath = path.join(root, "docs/data/product-evidence/gap_report_public.csv");
const swiftHarnessPath = path.join(root, "scripts/vision-ocr.swift");
const defaultResultDir = path.join(root, ".cache/ingredient-ocr");
const generatedAt = "2026-06-07T19:00:00Z";
const ocrQueueHref = "../data/product-evidence/exports/ten_product_pilot_ocr_queue.csv";
const fullCorpusOcrQueueHref = "../data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv";
const fullCorpusOcrGapHref = "../data/product-evidence/exports/full_corpus_ingredient_ocr_gap_report.csv";

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

function booleanFlag(value) {
  if (value === true || value === 1) return true;
  return ["1", "true", "yes", "y"].includes(String(value ?? "").trim().toLowerCase());
}

function numericValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function unique(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function firstNonEmpty(...values) {
  return values.map(normalizeText).find(Boolean) || "";
}

function slugPart(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function topValues(rows, field, limit = 6) {
  const counts = new Map();
  for (const row of rows) {
    for (const part of String(row[field] || "").split(";")) {
      const value = part.trim();
      if (!value) continue;
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => `${value} (${count})`)
    .join("; ");
}

function cwaFamilyMatch(row) {
  return /candywrapperarchive\.com|candy wrapper archive/i.test(textBlob(
    row.source_domain,
    row.source_url,
    row.source_title,
    row.source_owner,
  ));
}

function sourceFamilyFor(row) {
  if (cwaFamilyMatch(row)) return "candy-wrapper-archive";
  return "";
}

function sourceFamilyLabel(id) {
  const labels = {
    "candy-wrapper-archive": "Candy Wrapper Archive",
  };
  return labels[id] || id;
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

function fullCorpusEvidenceRows(summary) {
  return summary.evidence_registry || [];
}

function fullCorpusIdFor(row, index) {
  return firstNonEmpty(
    row.evidence_id,
    row.review_id,
    [row.canonical_name, row.vintage_label, row.source_domain, index].map(slugPart).filter(Boolean).join("__"),
  );
}

function isDocumentFirst(row) {
  return /fast food|menu|nutrition|allergen|pdf|document|foodservice/i.test(textBlob(
    row.category,
    row.evidence_kind,
    row.source_surface,
    row.source_title,
    row.source_domain,
  ));
}

function fullCorpusRoles(row) {
  return {
    package_front_visible: booleanFlag(row.front_visible || row.front_or_primary_panel_visible),
    ingredient_panel_visible: booleanFlag(row.ingredient_panel_visible),
    nutrition_panel_visible: booleanFlag(row.nutrition_panel_visible),
    net_weight_visible: booleanFlag(row.net_weight_visible),
    barcode_visible: booleanFlag(row.barcode_visible),
    manufacturer_visible: booleanFlag(row.manufacturer_text_visible || row.manufacturer_or_distributor_visible),
    ingredient_text_available: booleanFlag(row.ingredient_text_available || row.ingredient_text_present),
    ocr_text_available: booleanFlag(row.ocr_text_available || row.ocr_text_present),
    manual_transcription_available: booleanFlag(row.manual_transcription_available || row.transcribed_label_text_present),
    manual_review_ready: booleanFlag(row.manual_review_ready),
    ground_truth_ready: booleanFlag(row.ground_truth_ready),
  };
}

function directImageReference(row) {
  const value = firstNonEmpty(row.image_path_or_url, row.package_image_url, row.image_url);
  if (!value) return "";
  if (/^https?:\/\/(www\.)?(google|bing)\./i.test(value)) return "";
  return value;
}

function accessStateFor(row, localImagePath) {
  if (localImagePath) return "local_image_ready";
  if (directImageReference(row)) return "external_image_reference_ready";
  if (row.source_url) return "source_page_capture_needed";
  return "source_discovery_needed";
}

function gapCategoryFor(row, roles, accessState) {
  if (accessState === "local_image_ready") return "ocr_ready";
  if (accessState === "source_discovery_needed") return "source_discovery_needed";
  if (isDocumentFirst(row)) return "document_text_pipeline_needed";
  if (roles.ingredient_panel_visible || roles.nutrition_panel_visible || roles.ingredient_text_available) return "panel_capture_needed";
  if (/find_readable_ingredient_panel_photo/i.test(row.promotion_blocker || "")) return "readable_panel_photo_needed";
  if (/verify_package_front/i.test(row.promotion_blocker || "")) return "package_identity_review_needed";
  if (/archive_source_or_record_capture_coordinates/i.test(row.promotion_blocker || row.ground_truth_fields_missing || "")) return "archive_coordinates_needed";
  if (accessState === "external_image_reference_ready") return "private_image_download_needed";
  return "source_page_review_needed";
}

function priorityForFullCorpus(row, roles, gapCategory) {
  if (roles.ground_truth_ready || roles.ocr_text_available || roles.manual_transcription_available) return "low";
  if (gapCategory === "source_discovery_needed") return "blocked";
  if (roles.ingredient_panel_visible || roles.ingredient_text_available) return "high";
  if (gapCategory === "panel_capture_needed" || gapCategory === "document_text_pipeline_needed") return "high";
  if (roles.nutrition_panel_visible || roles.net_weight_visible || roles.manufacturer_visible) return "medium";
  if (gapCategory === "readable_panel_photo_needed" || gapCategory === "private_image_download_needed") return "medium";
  return "medium";
}

function actionForFullCorpus(row, gapCategory, accessState) {
  if (accessState === "local_image_ready") return "run_native_vision_ocr";
  if (gapCategory === "document_text_pipeline_needed") {
    return "route_to_document_or_pdf_text_extraction_before_image_ocr";
  }
  if (gapCategory === "source_discovery_needed") {
    return "run_targeted_source_discovery_then_attach_attributable_source";
  }
  if (gapCategory === "panel_capture_needed") {
    return "capture_private_panel_crop_from_source_then_run_native_vision_ocr";
  }
  if (gapCategory === "readable_panel_photo_needed") {
    return "find_back_or_side_panel_photo_with_readable_ingredient_text";
  }
  if (gapCategory === "package_identity_review_needed") {
    return "review_source_photo_for_product_identity_front_panel_and_package_size";
  }
  if (gapCategory === "archive_coordinates_needed") {
    return "add_wayback_or_common_crawl_capture_coordinates_before_ocr_review";
  }
  if (gapCategory === "private_image_download_needed") {
    return "download_or_capture_image_privately_then_run_native_vision_ocr";
  }
  return "capture_source_screenshot_or_product_image_then_classify_panel_visibility";
}

function approachForGapCategory(gapCategory) {
  const approaches = {
    ocr_ready: "Run the Swift/Vision harness on the mapped local image and store output as candidate OCR.",
    source_discovery_needed: "Use targeted current-web, collector, museum, marketplace, Common Crawl, and Wayback discovery to attach a source-attributable product record before OCR.",
    document_text_pipeline_needed: "For fast-food and foodservice records, prefer PDF/text extraction and archived document capture, then use image OCR only for screenshots or package inserts.",
    panel_capture_needed: "Use the source URL to capture a rights-safe private screenshot or crop of the visible ingredient/nutrition panel, then run native OCR.",
    readable_panel_photo_needed: "Search the same source family for back-panel, side-panel, or higher-resolution photos; front-only package photos should remain visual context.",
    package_identity_review_needed: "Review the source photo for front panel, SKU, package size, and date cues before spending OCR effort on an ingredient crop.",
    archive_coordinates_needed: "Resolve a Wayback/CDX/Common Crawl capture timestamp and record coordinates so the OCR candidate is tied to a reproducible source.",
    private_image_download_needed: "Fetch the direct image only into a private cache, keep the public repo link-only, then run OCR against the local file.",
    source_page_review_needed: "Open the source page, classify panel visibility, and decide whether a screenshot/crop can produce useful OCR.",
  };
  return approaches[gapCategory] || approaches.source_page_review_needed;
}

function fullCorpusQueueRow(row, imageMap, index) {
  const productId = firstNonEmpty(row.canonical_name, slugPart(row.display_name));
  const evidenceId = fullCorpusIdFor(row, index);
  const localImagePath = localImageFor(imageMap, {
    product_id: productId,
    evidence_id: evidenceId,
    source_url: row.source_url,
  });
  const roles = fullCorpusRoles(row);
  const accessState = accessStateFor(row, localImagePath);
  const gapCategory = gapCategoryFor(row, roles, accessState);
  const priority = priorityForFullCorpus(row, roles, gapCategory);
  const sourceUrl = normalizeText(row.source_url);
  const imageReference = directImageReference(row);
  const notAccessible = accessState !== "local_image_ready";
  return {
    product_id: productId,
    product_name: row.display_name || row.canonical_name || "",
    brand: row.brand || "",
    category: row.category || "",
    vintage_label: row.vintage_label || "",
    vintage_start: row.vintage_start || "",
    vintage_end: row.vintage_end || "",
    evidence_id: evidenceId,
    claim_id: row.claim_id || "",
    evidence_status: row.evidence_status || row.evidence_status_label || "",
    claim_link_status: row.claim_link_status || "",
    evidence_kind: row.evidence_kind || "",
    source_surface: row.source_surface || "",
    source_attribution_status: row.source_attribution_status || "",
    source_attribution_grade: row.source_attribution_grade || "",
    source_domain: row.source_domain || "",
    source_url: sourceUrl,
    source_title: row.source_title || "",
    source_owner: row.source_publisher_owner || row.source_publisher || row.source_author || "",
    rights_note: row.license_rights_note || row.rights_status || "",
    archive_url: row.archive_url || "",
    capture_date_text: row.capture_date_text || row.capture_timestamp_utc || "",
    image_reference: imageReference,
    local_image_path: localImagePath,
    package_front_visible: roles.package_front_visible,
    ingredient_panel_visible: roles.ingredient_panel_visible,
    nutrition_panel_visible: roles.nutrition_panel_visible,
    net_weight_visible: roles.net_weight_visible,
    barcode_visible: roles.barcode_visible,
    manufacturer_visible: roles.manufacturer_visible,
    ingredient_text_available: roles.ingredient_text_available,
    ocr_text_available: roles.ocr_text_available,
    manual_transcription_available: roles.manual_transcription_available,
    manual_review_ready: roles.manual_review_ready,
    ground_truth_ready: roles.ground_truth_ready,
    ocr_priority: priority,
    ocr_access_state: accessState,
    ocr_gap_category: gapCategory,
    ocr_recommended_action: actionForFullCorpus(row, gapCategory, accessState),
    not_easily_accessible: notAccessible,
    future_run_approach: approachForGapCategory(gapCategory),
    promotion_blocker: row.promotion_blocker || row.promotion_status || "",
    ground_truth_fields_missing: row.ground_truth_fields_missing || "",
    reviewer_notes: row.reviewer_notes || row.verification_notes || row.unsupported_gap_note || "",
    confidence: row.confidence || "",
    registry_priority: row.registry_priority || row.matrix_priority || "",
  };
}

function buildFullCorpusQueue(summary, imageMap = {}) {
  const rows = fullCorpusEvidenceRows(summary).map((row, index) => fullCorpusQueueRow(row, imageMap, index));
  return rows.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2, blocked: 3 };
    return rank[a.ocr_priority] - rank[b.ocr_priority]
      || numericValue(b.registry_priority) - numericValue(a.registry_priority)
      || a.product_name.localeCompare(b.product_name)
      || a.evidence_id.localeCompare(b.evidence_id);
  });
}

function buildGapReport(queue) {
  const groups = new Map();
  for (const row of queue) {
    if (row.ocr_access_state === "local_image_ready") continue;
    const key = row.ocr_gap_category;
    if (!groups.has(key)) {
      groups.set(key, {
        gap_category: key,
        row_count: 0,
        product_ids: new Set(),
        products: [],
        domains: [],
        blockers: [],
        evidence_kinds: [],
        example_urls: [],
      });
    }
    const group = groups.get(key);
    group.row_count += 1;
    group.product_ids.add(row.product_id);
    group.products.push(row.product_name);
    group.domains.push(row.source_domain);
    group.blockers.push(row.promotion_blocker || row.ground_truth_fields_missing);
    group.evidence_kinds.push(row.evidence_kind);
    if (row.source_url && group.example_urls.length < 5) group.example_urls.push(row.source_url);
  }
  return [...groups.values()]
    .map((group) => ({
      gap_category: group.gap_category,
      row_count: group.row_count,
      product_count: group.product_ids.size,
      top_products: topValues(group.products.map((value) => ({ value })), "value", 8),
      top_domains: topValues(group.domains.map((value) => ({ value })), "value", 8),
      top_blockers: topValues(group.blockers.map((value) => ({ value })), "value", 8),
      evidence_kinds: unique(group.evidence_kinds).slice(0, 8).join("; "),
      why_not_easy: approachForGapCategory(group.gap_category),
      suggested_future_run: approachForGapCategory(group.gap_category),
      example_source_urls: unique(group.example_urls).slice(0, 5).join("; "),
    }))
    .sort((a, b) => b.row_count - a.row_count || a.gap_category.localeCompare(b.gap_category));
}

function productSummariesForFullCorpus(summary, queue) {
  const products = new Map();
  for (const product of summary.products || []) {
    const id = firstNonEmpty(product.canonical_name, slugPart(product.display_name));
    products.set(id, {
      id,
      name: product.display_name || product.canonical_name || id,
      category: product.category || "",
      ocr_candidate_count: 0,
      high_priority_count: 0,
      local_image_ready_count: 0,
      source_page_capture_needed_count: 0,
      source_discovery_needed_count: 0,
      document_pipeline_needed_count: 0,
      panel_capture_needed_count: 0,
      readable_panel_photo_needed_count: 0,
      not_easily_accessible_count: 0,
      label_visible_count: 0,
      ingredient_text_candidate_count: 0,
      evidence_ids: [],
    });
  }
  for (const row of queue) {
    if (!products.has(row.product_id)) {
      products.set(row.product_id, {
        id: row.product_id,
        name: row.product_name,
        category: row.category,
        ocr_candidate_count: 0,
        high_priority_count: 0,
        local_image_ready_count: 0,
        source_page_capture_needed_count: 0,
        source_discovery_needed_count: 0,
        document_pipeline_needed_count: 0,
        panel_capture_needed_count: 0,
        readable_panel_photo_needed_count: 0,
        not_easily_accessible_count: 0,
        label_visible_count: 0,
        ingredient_text_candidate_count: 0,
        evidence_ids: [],
      });
    }
    const product = products.get(row.product_id);
    product.ocr_candidate_count += 1;
    if (row.ocr_priority === "high") product.high_priority_count += 1;
    if (row.local_image_path) product.local_image_ready_count += 1;
    if (row.ocr_access_state === "source_page_capture_needed") product.source_page_capture_needed_count += 1;
    if (row.ocr_access_state === "source_discovery_needed") product.source_discovery_needed_count += 1;
    if (row.ocr_gap_category === "document_text_pipeline_needed") product.document_pipeline_needed_count += 1;
    if (row.ocr_gap_category === "panel_capture_needed") product.panel_capture_needed_count += 1;
    if (row.ocr_gap_category === "readable_panel_photo_needed") product.readable_panel_photo_needed_count += 1;
    if (row.not_easily_accessible) product.not_easily_accessible_count += 1;
    if (row.ingredient_panel_visible || row.nutrition_panel_visible) product.label_visible_count += 1;
    if (row.ingredient_text_available) product.ingredient_text_candidate_count += 1;
    product.evidence_ids.push(row.evidence_id);
  }
  return [...products.values()].sort((a, b) => b.high_priority_count - a.high_priority_count || a.name.localeCompare(b.name));
}

function buildFullCorpusManifest(summary, queue, gapReport) {
  const products = productSummariesForFullCorpus(summary, queue);
  const localReady = queue.filter((row) => row.local_image_path).length;
  const notAccessible = queue.filter((row) => row.not_easily_accessible).length;
  return {
    schema_version: 1,
    generated_at_utc: generatedAt,
    processor: {
      swift_harness: "scripts/vision-ocr.swift",
      native_framework: "Apple Vision VNRecognizeTextRequest",
      output_policy: "Full-corpus OCR rows are candidate review inputs. External images stay link-only unless rights are clear or the capture is kept private.",
      image_map_policy: "Use --image-map to attach private local image/crop paths by evidence_id, product_id:evidence_id, or source_url.",
    },
    totals: {
      products: (summary.products || []).length,
      registry_records: fullCorpusEvidenceRows(summary).length,
      ocr_candidates: queue.length,
      high_priority: queue.filter((row) => row.ocr_priority === "high").length,
      medium_priority: queue.filter((row) => row.ocr_priority === "medium").length,
      low_priority: queue.filter((row) => row.ocr_priority === "low").length,
      blocked_priority: queue.filter((row) => row.ocr_priority === "blocked").length,
      local_image_ready: localReady,
      not_easily_accessible: notAccessible,
      source_page_capture_needed: queue.filter((row) => row.ocr_access_state === "source_page_capture_needed").length,
      source_discovery_needed: queue.filter((row) => row.ocr_access_state === "source_discovery_needed").length,
      ingredient_panel_visible: queue.filter((row) => row.ingredient_panel_visible).length,
      ingredient_text_candidates: queue.filter((row) => row.ingredient_text_available).length,
      manual_verified: queue.filter((row) => row.ground_truth_ready).length,
      manual_transcriptions: queue.filter((row) => row.manual_transcription_available).length,
    },
    artifacts: {
      queue_csv: "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv",
      gap_report_csv: "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_gap_report.csv",
      gap_report_markdown: "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_gap_report.md",
    },
    gap_report: gapReport,
    products,
    queue_sample: queue.slice(0, 80),
  };
}

function buildSourceFamilySummary(queue) {
  const families = new Map();
  for (const row of queue) {
    const familyId = sourceFamilyFor(row);
    if (!familyId) continue;
    if (!families.has(familyId)) {
      families.set(familyId, {
        id: familyId,
        label: sourceFamilyLabel(familyId),
        strategy: "visual_lineage_first",
        public_image_policy: "Link out to source pages; do not reproduce external photos unless rights are clear.",
        claim_policy: "Wrapper lineage can support visual provenance only. Ingredient claims require readable panel OCR and manual verification.",
        evidence_row_count: 0,
        product_ids: new Set(),
        products: new Map(),
        source_domains: [],
        source_urls: [],
        gap_categories: [],
        cwa_run_command: "INGREDIENT_OCR_SCRATCH_ROOT=<private-scratch-root> python3 -m ccfoodprice --run-dir runs/product-discovery --db runs/product-discovery/product_discovery.sqlite ingredient-ocr-image-map --source-family candy-wrapper-archive --run-id cwa-top250 --limit 250 --max-scratch-bytes 200GB",
      });
    }
    const family = families.get(familyId);
    family.evidence_row_count += 1;
    family.product_ids.add(row.product_id);
    family.source_domains.push(row.source_domain);
    family.source_urls.push(row.source_url);
    family.gap_categories.push(row.ocr_gap_category);
    if (!family.products.has(row.product_id)) {
      family.products.set(row.product_id, {
        product_id: row.product_id,
        product_name: row.product_name,
        brand: row.brand,
        category: row.category,
        evidence_count: 0,
        vintages: new Set(),
        source_urls: [],
        ingredient_panel_visible_count: 0,
        local_image_ready_count: 0,
        readable_panel_photo_needed_count: 0,
        next_action: "Find a back/side/ingredient-panel photo, then route private capture through OCR.",
      });
    }
    const product = family.products.get(row.product_id);
    product.evidence_count += 1;
    if (row.vintage_label) product.vintages.add(row.vintage_label);
    if (row.source_url) product.source_urls.push(row.source_url);
    if (booleanFlag(row.ingredient_panel_visible)) product.ingredient_panel_visible_count += 1;
    if (row.local_image_path) product.local_image_ready_count += 1;
    if (row.ocr_gap_category === "readable_panel_photo_needed") product.readable_panel_photo_needed_count += 1;
    product.next_action = row.ocr_recommended_action || product.next_action;
  }
  return {
    schema_version: 1,
    generated_at_utc: generatedAt,
    private_scratch_policy: "Use the configured private scratch root for captures, crops, OCR text, model packets, and review manifests. Public files remain link/status only.",
    families: [...families.values()].map((family) => ({
      id: family.id,
      label: family.label,
      strategy: family.strategy,
      public_image_policy: family.public_image_policy,
      claim_policy: family.claim_policy,
      evidence_row_count: family.evidence_row_count,
      product_count: family.product_ids.size,
      top_domains: topValues(family.source_domains.map((value) => ({ value })), "value", 8),
      gap_categories: topValues(family.gap_categories.map((value) => ({ value })), "value", 8),
      cwa_run_command: family.cwa_run_command,
      products: [...family.products.values()]
        .map((product) => ({
          ...product,
          vintage_count: product.vintages.size,
          vintages: [...product.vintages].sort(),
          source_urls: unique(product.source_urls).slice(0, 5),
        }))
        .sort((a, b) => b.evidence_count - a.evidence_count || a.product_name.localeCompare(b.product_name)),
    })),
  };
}

function buildOcrBoardSummary(fullManifest, sourceFamilySummary) {
  return {
    schema_version: 1,
    generated_at_utc: generatedAt,
    scratch_root_policy: "A private OCR scratch root is configured for bulk captures and OCR work; public site exports must not include private paths.",
    scratch_soft_quota: "200GB",
    public_safety_note: "Counts and source links are public. Captures, crops, OCR text, prompts, model responses, hashes, and local paths stay private.",
    model_policy: "Spark handles bounded packet work; GPT-5.5 handles compact batch review; Grok assists source hunting and validation only.",
    totals: fullManifest?.totals || {},
    source_family_count: sourceFamilySummary.families.length,
    source_family_rows: sourceFamilySummary.families.reduce((sum, family) => sum + family.evidence_row_count, 0),
  };
}

function buildProductStoryIndex(data, fullQueue) {
  const sourceFamilyProducts = new Map();
  for (const row of fullQueue) {
    const familyId = sourceFamilyFor(row);
    if (!familyId) continue;
    if (!sourceFamilyProducts.has(row.product_id)) {
      sourceFamilyProducts.set(row.product_id, {
        product_id: row.product_id,
        product_name: row.product_name,
        source_family: familyId,
        mode: "visual_lineage_candidate",
        evidence_count: 0,
        vintages: new Set(),
        story_state: "needs_panel_photo",
        next_action: "Find readable ingredient/back/side panel evidence before formulation claims.",
      });
    }
    const product = sourceFamilyProducts.get(row.product_id);
    product.evidence_count += 1;
    if (row.vintage_label) product.vintages.add(row.vintage_label);
    product.next_action = row.ocr_recommended_action || product.next_action;
  }
  return {
    schema_version: 1,
    generated_at_utc: generatedAt,
    pilot_products: (data.products || []).map((product) => ({
      product_id: product.id,
      product_name: product.name,
      mode: "pilot_story",
      story_state: product.pilot_rollup_status || "story_ready",
      claim_state: product.claim_rollup_status || "needs_manual_verification",
      total_slots: product.total_slots,
      source_backed_slots: product.source_backed_slots,
      verified_labels: product.verified_labels,
    })),
    source_family_products: [...sourceFamilyProducts.values()].map((product) => ({
      ...product,
      vintage_count: product.vintages.size,
      vintages: [...product.vintages].sort(),
    })),
  };
}

function buildPublicReviewRows(data, fullQueue) {
  const pilotRows = (data.review_queue || []).map((row) => ({
    product_id: row.product_id,
    product_name: row.product_name,
    source_family: "",
    vintage_label: row.vintage,
    source_url: "",
    status: row.status,
    missing_fields: row.missing_fields,
    next_action: row.next_action,
    public_note: "Pilot review row; candidate-only until manual verification.",
  }));
  const sourceRows = fullQueue
    .filter((row) => sourceFamilyFor(row))
    .map((row) => ({
      product_id: row.product_id,
      product_name: row.product_name,
      source_family: sourceFamilyFor(row),
      vintage_label: row.vintage_label,
      source_url: row.source_url,
      status: row.ocr_gap_category,
      missing_fields: row.ground_truth_fields_missing || row.promotion_blocker,
      next_action: row.ocr_recommended_action,
      public_note: "Source-family lineage row; source link only, no external image reuse.",
    }));
  return [...pilotRows, ...sourceRows];
}

function buildPublicGapRows(fullGapReport, sourceFamilySummary) {
  const corpusRows = fullGapReport.map((row) => ({
    scope: "full_corpus",
    family_or_gap: row.gap_category,
    row_count: row.row_count,
    product_count: row.product_count,
    next_action: row.suggested_future_run,
    public_note: row.why_not_easy,
  }));
  const familyRows = sourceFamilySummary.families.map((family) => ({
    scope: "source_family",
    family_or_gap: family.id,
    row_count: family.evidence_row_count,
    product_count: family.product_count,
    next_action: "Use lineage pages to find readable back/side/ingredient panels, then run private OCR.",
    public_note: family.claim_policy,
  }));
  return [...familyRows, ...corpusRows];
}

function writeGapMarkdown(filePath, manifest) {
  const lines = [
    "# Full-Corpus Ingredient OCR Gap Report",
    "",
    `Generated: ${manifest.generated_at_utc}`,
    "",
    "This report queues every product evidence registry row for the 100+ product corpus. OCR execution is limited to rows with a local private image or crop path; source pages and external images remain link-only until captured or rights-reviewed.",
    "",
    "## Totals",
    "",
    `- Products: ${manifest.totals.products}`,
    `- Evidence rows queued: ${manifest.totals.ocr_candidates}`,
    `- High-priority OCR candidates: ${manifest.totals.high_priority}`,
    `- Local image ready: ${manifest.totals.local_image_ready}`,
    `- Not immediately OCR-accessible: ${manifest.totals.not_easily_accessible}`,
    `- Source discovery needed: ${manifest.totals.source_discovery_needed}`,
    `- Source-page capture needed: ${manifest.totals.source_page_capture_needed}`,
    "",
    "## Gaps Not Easily Accessible",
    "",
    ...manifest.gap_report.flatMap((row) => [
      `### ${row.gap_category}`,
      "",
      `Rows: ${row.row_count} · Products: ${row.product_count}`,
      "",
      `Approach: ${row.suggested_future_run}`,
      "",
      `Top products: ${row.top_products || "none"}`,
      "",
      `Top domains: ${row.top_domains || "none"}`,
      "",
    ]),
  ];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function updateSummaryData(summary, manifest) {
  summary.ingredient_ocr_summary = {
    generated_at_utc: generatedAt,
    corpus_product_count: manifest.totals.products,
    corpus_registry_record_count: manifest.totals.registry_records,
    ocr_candidate_count: manifest.totals.ocr_candidates,
    high_priority_count: manifest.totals.high_priority,
    local_image_ready_count: manifest.totals.local_image_ready,
    not_easily_accessible_count: manifest.totals.not_easily_accessible,
    source_page_capture_needed_count: manifest.totals.source_page_capture_needed,
    source_discovery_needed_count: manifest.totals.source_discovery_needed,
    ingredient_panel_visible_count: manifest.totals.ingredient_panel_visible,
    ingredient_text_candidate_count: manifest.totals.ingredient_text_candidates,
    manifest_path: "docs/data/product-evidence/full_corpus_ingredient_ocr_manifest.json",
    queue_csv: "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv",
    gap_report_csv: "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_gap_report.csv",
    claim_policy: "Native OCR output is candidate evidence only until reviewer corrected and manually verified.",
    public_image_policy: "External photos are not reproduced in public artifacts; source links and private local image-map paths drive OCR.",
    top_gap_groups: manifest.gap_report.slice(0, 8),
  };
  const productSummary = new Map(manifest.products.map((product) => [product.id, product]));
  for (const product of summary.products || []) {
    const id = firstNonEmpty(product.canonical_name, slugPart(product.display_name));
    const ocr = productSummary.get(id) || {};
    product.ingredient_ocr_summary = {
      ocr_candidate_count: ocr.ocr_candidate_count || 0,
      high_priority_count: ocr.high_priority_count || 0,
      local_image_ready_count: ocr.local_image_ready_count || 0,
      source_page_capture_needed_count: ocr.source_page_capture_needed_count || 0,
      source_discovery_needed_count: ocr.source_discovery_needed_count || 0,
      not_easily_accessible_count: ocr.not_easily_accessible_count || 0,
      label_visible_count: ocr.label_visible_count || 0,
      ingredient_text_candidate_count: ocr.ingredient_text_candidate_count || 0,
    };
    product.export_paths = {
      ...(product.export_paths || {}),
      full_corpus_ocr_queue_csv: fullCorpusOcrQueueHref,
      full_corpus_ocr_gap_csv: fullCorpusOcrGapHref,
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
  const summary = fs.existsSync(summaryPath) ? readJson(summaryPath) : null;
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

  let fullCorpusQueue = [];
  let fullCorpusManifest = null;
  let fullCorpusGapReport = [];
  let sourceFamilySummary = null;
  let ocrBoardSummary = null;
  let productStoryIndex = null;
  if (summary) {
    fullCorpusQueue = buildFullCorpusQueue(summary, imageMap);
    fullCorpusGapReport = buildGapReport(fullCorpusQueue);
    fullCorpusManifest = buildFullCorpusManifest(summary, fullCorpusQueue, fullCorpusGapReport);
    sourceFamilySummary = buildSourceFamilySummary(fullCorpusQueue);
    ocrBoardSummary = buildOcrBoardSummary(fullCorpusManifest, sourceFamilySummary);
    productStoryIndex = buildProductStoryIndex(data, fullCorpusQueue);
    data.source_family_summary = sourceFamilySummary;
    data.ocr_board_summary = ocrBoardSummary;
    data.product_story_index = productStoryIndex;
    updateSummaryData(summary, fullCorpusManifest);
    writeJson(fullCorpusManifestPath, fullCorpusManifest);
    writeJson(sourceFamilySummaryPath, sourceFamilySummary);
    writeJson(ocrBoardSummaryPath, ocrBoardSummary);
    writeJson(productStoryIndexPath, productStoryIndex);
    writeCsv(fullCorpusQueueCsvPath, [
      "product_id",
      "product_name",
      "brand",
      "category",
      "vintage_label",
      "vintage_start",
      "vintage_end",
      "evidence_id",
      "claim_id",
      "ocr_priority",
      "ocr_access_state",
      "ocr_gap_category",
      "ocr_recommended_action",
      "not_easily_accessible",
      "future_run_approach",
      "evidence_status",
      "claim_link_status",
      "evidence_kind",
      "source_surface",
      "source_attribution_status",
      "source_attribution_grade",
      "source_domain",
      "source_url",
      "source_title",
      "source_owner",
      "rights_note",
      "archive_url",
      "capture_date_text",
      "image_reference",
      "local_image_path",
      "package_front_visible",
      "ingredient_panel_visible",
      "nutrition_panel_visible",
      "net_weight_visible",
      "barcode_visible",
      "manufacturer_visible",
      "ingredient_text_available",
      "ocr_text_available",
      "manual_transcription_available",
      "manual_review_ready",
      "ground_truth_ready",
      "promotion_blocker",
      "ground_truth_fields_missing",
      "reviewer_notes",
      "confidence",
      "registry_priority",
    ], fullCorpusQueue);
    writeCsv(fullCorpusGapCsvPath, [
      "gap_category",
      "row_count",
      "product_count",
      "top_products",
      "top_domains",
      "top_blockers",
      "evidence_kinds",
      "why_not_easy",
      "suggested_future_run",
      "example_source_urls",
    ], fullCorpusGapReport);
    writeGapMarkdown(fullCorpusGapMarkdownPath, fullCorpusManifest);
    writeCsv(publicReviewQueuePath, [
      "product_id",
      "product_name",
      "source_family",
      "vintage_label",
      "source_url",
      "status",
      "missing_fields",
      "next_action",
      "public_note",
    ], buildPublicReviewRows(data, fullCorpusQueue));
    writeCsv(publicGapReportPath, [
      "scope",
      "family_or_gap",
      "row_count",
      "product_count",
      "next_action",
      "public_note",
    ], buildPublicGapRows(fullCorpusGapReport, sourceFamilySummary));
    writeJson(summaryPath, summary);
  }
  writeJson(navigatorPath, data);

  let runSummary = null;
  if (hasFlag("run")) {
    const scope = argValue("scope", "all");
    const runRows = scope === "pilot"
      ? queue
      : scope === "full"
        ? fullCorpusQueue
        : [...queue, ...fullCorpusQueue];
    const seen = new Set();
    const dedupedRows = runRows.filter((row) => {
      const key = `${row.product_id}:${row.evidence_id}:${row.local_image_path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    runSummary = runSwiftOcr(dedupedRows, path.resolve(argValue("result-dir", defaultResultDir)));
  }

  console.log(JSON.stringify({
    pilot: {
      ocr_candidates: queue.length,
      high_priority: manifest.totals.high_priority,
      local_image_ready: manifest.totals.local_image_ready,
      manifest: manifestPath,
      queue_csv: queueCsvPath,
    },
    full_corpus: fullCorpusManifest ? {
      products: fullCorpusManifest.totals.products,
      ocr_candidates: fullCorpusManifest.totals.ocr_candidates,
      high_priority: fullCorpusManifest.totals.high_priority,
      local_image_ready: fullCorpusManifest.totals.local_image_ready,
      not_easily_accessible: fullCorpusManifest.totals.not_easily_accessible,
      source_discovery_needed: fullCorpusManifest.totals.source_discovery_needed,
      source_page_capture_needed: fullCorpusManifest.totals.source_page_capture_needed,
      manifest: fullCorpusManifestPath,
      queue_csv: fullCorpusQueueCsvPath,
      gap_report_csv: fullCorpusGapCsvPath,
      source_family_summary: sourceFamilySummaryPath,
      ocr_board_summary: ocrBoardSummaryPath,
      product_story_index: productStoryIndexPath,
      review_queue_public: publicReviewQueuePath,
      gap_report_public: publicGapReportPath,
    } : null,
    run: runSummary,
  }, null, 2));
}

main();
