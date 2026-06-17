const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const queuePath = path.join(root, "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const coveragePath = path.join(root, "docs/data/product-evidence/source_family_coverage.json");
const gapWorklistPath = path.join(root, "docs/data/product-evidence/source_family_gap_worklist.json");
const generatedAt = new Date().toISOString();
const collectionTargetFamilyId = "collection-targets";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
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
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
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
    } else if (char !== "\r") {
      value += char;
    }
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

function shortText(value, limit = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trim()}...` : text;
}

function domainCounts(rows) {
  const counts = new Map();
  for (const row of rows) {
    const domain = row.source_domain || "unknown_source";
    counts.set(domain, (counts.get(domain) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([domain, count]) => ({ domain, count }));
}

function groupedQueueProducts(rows) {
  const products = new Map();
  for (const row of rows) {
    if (!products.has(row.product_id)) {
      products.set(row.product_id, {
        product_id: row.product_id,
        product_name: row.product_name,
        brand: row.brand,
        category: row.category,
        rows: [],
      });
    }
    products.get(row.product_id).rows.push(row);
  }
  return products;
}

function proofFamilies(navigator) {
  return (navigator.source_family_timeline?.families || [])
    .filter((family) => family.id !== collectionTargetFamilyId);
}

function coveredProductsFromNavigator(navigator) {
  return new Set(proofFamilies(navigator)
    .flatMap((family) => (family.products || []).map((product) => product.product_id)));
}

function representativeRows(rows) {
  return rows
    .slice()
    .sort((a, b) => {
      const priority = (value) => (value === "high" ? 0 : value === "medium" ? 1 : 2);
      return priority(a.ocr_priority) - priority(b.ocr_priority)
        || String(b.vintage_label === "current_2020s").localeCompare(String(a.vintage_label === "current_2020s"))
        || String(a.vintage_label).localeCompare(String(b.vintage_label));
    })
    .slice(0, 4)
    .map((row) => ({
      evidence_id: row.evidence_id,
      vintage_label: row.vintage_label,
      ocr_priority: row.ocr_priority,
      ocr_gap_category: row.ocr_gap_category,
      ocr_recommended_action: row.ocr_recommended_action,
      evidence_kind: row.evidence_kind,
      source_domain: row.source_domain,
      source_url: row.source_url,
      source_title: row.source_title,
      source_owner: row.source_owner,
      source_surface: row.source_surface,
      ingredient_panel_visible: row.ingredient_panel_visible === "true",
      ingredient_text_available: row.ingredient_text_available === "true",
      next_action: nextActionForRow(row),
      reviewer_note_excerpt: shortText(row.reviewer_notes, 260),
    }));
}

function nextActionForRow(row) {
  if (row.ingredient_text_available === "true") return "extract_or_verify_source_ingredient_text";
  if (row.ingredient_panel_visible === "true") return "capture_private_panel_crop_and_run_ocr";
  if (row.package_front_visible === "true") return "find_back_or_side_panel_photo";
  if (row.source_surface === "current_web" || row.evidence_kind === "current_web_page") return "find_package_label_or_smartlabel_panel";
  return row.ocr_recommended_action || "source_attributable_panel_capture_needed";
}

function captureClass(product) {
  const category = String(product.category || "").toLowerCase();
  const rows = product.rows || [];
  const domains = new Set(rows.map((row) => row.source_domain).filter(Boolean));
  if (/\bfast food\b|\brestaurant\b|\bcoffee\b|\bbeverage service\b/.test(category)
    || [...domains].some((domain) => /starbucks|chipotle|kfc|subway|bk\.com|burger/.test(domain))) {
    return "menu_component_source_needed";
  }
  if (rows.some((row) => row.ingredient_text_available === "true" || row.ingredient_panel_visible === "true")) {
    return "candidate_panel_or_text_available";
  }
  if (rows.some((row) => row.package_front_visible === "true")) return "package_visual_without_readable_panel";
  return "source_discovery_needed";
}

function collectionBlockersForProduct(product) {
  if (product.product_id === "starbucks_pumpkin_spice_latte") {
    return [{
      status: "official_source_cache_blocked",
      label: "Official Starbucks source cache blocked",
      detail: "Starbucks-owned PSL PDF and page leads currently resolve to challenge, not-found, or non-PDF HTML during local collection, so no cacheable ingredient source is attached yet.",
      next_step: "Capture a Starbucks-owned menu, allergen, ingredient document, or product API through a browser session before promoting PSL ingredient text.",
      claim_boundary: "Do not promote PSL ingredient composition from secondary articles or brand-history text alone.",
      source_research_status: "official_owned_source_required",
      acceptable_source_types: [
        "Starbucks-owned menu or product API with Pumpkin Spice Latte ingredients",
        "Starbucks-owned allergen or ingredient document with PSL rows",
        "Cacheable Starbucks PDF/page whose text can be extracted and reviewed",
      ],
      rejected_source_types: [
        "brand-history pages without ingredient rows",
        "secondary nutrition articles or recipes",
        "availability press releases without ingredient text",
      ],
    }];
  }
  if (product.product_id === "kfc_original_recipe_chicken") {
    return [{
      status: "item_level_ingredient_source_needed",
      label: "Item-level ingredient source needed",
      detail: "Cacheable KFC-owned pages found so far describe chicken quality, Original Recipe process, and 11 herbs and spices, but do not expose a current US item-level ingredient statement.",
      next_step: "Resolve KFC US nutrition/allergen data or an original KFC ingredient PDF for Original Recipe Chicken before promoting an ingredient proof row.",
      claim_boundary: "Use current KFC pages as source-routing and process context only, not formulation evidence.",
      source_research_status: "item_level_official_source_required",
      acceptable_source_types: [
        "KFC-owned US nutrition/allergen/ingredient document with Original Recipe Chicken rows",
        "KFC-owned product API or menu data with item-level ingredients",
        "Original KFC PDF/page whose text can be extracted and reviewed",
      ],
      rejected_source_types: [
        "global process pages about chicken quality",
        "secret-recipe articles or recreation recipes",
        "general takeout bag or meal photos without ingredient text",
      ],
    }];
  }
  return [];
}

function promotionBoundaryForProduct(product) {
  const blocker = collectionBlockersForProduct(product)[0];
  return blocker?.claim_boundary || "Missing-product rows are collection targets only; no ingredient, formulation, or historical-change claim is promoted.";
}

function collectionTargetVisualId(evidenceId) {
  return `${String(evidenceId || "source_lead").replace(/[^a-z0-9_]+/gi, "_")}__collection_target`;
}

function collectionTargetRow(product, lead, index) {
  const blocker = (product.collection_blockers || [])[0] || {};
  const candidateExcerpt = [
    blocker.label || "Collection target",
    blocker.detail || product.next_collection_goal,
    lead.reviewer_note_excerpt,
  ].filter(Boolean).join(" ");
  return {
    visual_id: collectionTargetVisualId(lead.evidence_id || `${product.product_id}_${index}`),
    product_id: product.product_id,
    product_group_id: product.product_id,
    product_name: product.product_name,
    vintage_label: lead.vintage_label || "source_lead",
    evidence_id: lead.evidence_id,
    source_family: collectionTargetFamilyId,
    source_family_label: "Collection Targets",
    source_domain: lead.source_domain,
    source_url: lead.source_url,
    source_detail_url: lead.source_url,
    source_image_title: lead.source_title || "Collection source lead",
    source_title: lead.source_title || "Collection source lead",
    source_owner: lead.source_owner,
    source_surface: lead.source_surface,
    evidence_kind: lead.evidence_kind,
    ocr_priority: lead.ocr_priority,
    ocr_gap_category: lead.ocr_gap_category,
    source_image_match_status: "collection_target_source_lead",
    proof_visual_basis: "collection_target_source_lead",
    crop_status: "collection_target_source_lead",
    crop_focus: lead.ingredient_panel_visible ? "panel_context" : "source_lead",
    ocr_status: lead.ocr_gap_category,
    ocr_recommended_action: lead.ocr_recommended_action,
    ingredient_panel_visible: Boolean(lead.ingredient_panel_visible),
    ingredient_text_available: Boolean(lead.ingredient_text_available),
    local_preview_available: false,
    local_upscaled_preview_available: false,
    preview_endpoint: "",
    preview_render_variant: "source_lead_placeholder",
    ingredient_text: "",
    ingredient_items: [],
    ingredient_signal_status: "readable_panel_needed",
    candidate_excerpt: shortText(candidateExcerpt, 360),
    claim_boundary: product.promotion_boundary,
    collection_target_status: blocker.status || product.capture_class,
    collection_source_status: blocker.source_research_status || product.capture_class,
    collection_acceptable_source_types: blocker.acceptable_source_types || [],
    collection_rejected_source_types: blocker.rejected_source_types || [],
    collection_lead_action: lead.next_action,
    collection_reviewer_note_excerpt: lead.reviewer_note_excerpt,
    collection_next_step: blocker.next_step || lead.next_action || product.next_collection_goal,
  };
}

function collectionTargetProduct(product) {
  const rows = (product.representative_rows || []).map((lead, index) => collectionTargetRow(product, lead, index));
  return {
    product_id: product.product_id,
    product_group_id: product.product_id,
    product_name: product.product_name,
    source_family: collectionTargetFamilyId,
    evidence_count: rows.length,
    source_queue_evidence_count: product.evidence_row_count,
    high_priority_row_count: product.high_priority_row_count,
    local_preview_available_count: 0,
    ingredient_signal_count: 0,
    readable_panel_needed_count: rows.length,
    source_domains: product.top_source_domains || [],
    collection_blockers: product.collection_blockers,
    claim_policy: product.promotion_boundary,
    rows,
  };
}

function buildCollectionTargetFamily(missing) {
  const products = missing.map(collectionTargetProduct);
  const rows = products.flatMap((product) => product.rows || []);
  return {
    id: collectionTargetFamilyId,
    label: "Collection Targets",
    source_family: collectionTargetFamilyId,
    product_count: products.length,
    row_count: rows.length,
    local_preview_available_count: 0,
    ingredient_signal_count: 0,
    readable_panel_needed_count: rows.length,
    claim_policy: "Collection target rows expose source leads only. They do not promote ingredient, formulation, or historical-change claims until readable source text is captured and reviewed.",
    products,
  };
}

function upsertCollectionTargetFamily(navigator, missing) {
  const existingTimeline = navigator.source_family_timeline || {};
  const families = (existingTimeline.families || []).filter((family) => family.id !== collectionTargetFamilyId);
  navigator.source_family_timeline = {
    ...existingTimeline,
    families: missing.length ? [...families, buildCollectionTargetFamily(missing)] : families,
  };
}

function gapKind(row) {
  return row.ocr_gap_category || row.ingredient_signal_status || "readable_panel_needed";
}

function gapWorkstream(row) {
  const kind = gapKind(row);
  if (kind === "document_text_pipeline_needed") return "document_or_api_text_capture";
  if (kind === "panel_capture_needed") return "same_source_panel_crop";
  if (kind === "readable_panel_photo_needed") return "same_era_panel_photo";
  return "readable_panel_review";
}

function gapNextStep(row) {
  return row.collection_next_step
    || row.collection_lead_action
    || row.gap_next_step
    || row.ocr_recommended_action
    || "Capture a source-attributable readable ingredient panel before promoting claims.";
}

function gapAcceptedSourceTypes(row) {
  return row.collection_acceptable_source_types?.length
    ? row.collection_acceptable_source_types
    : row.gap_accepted_source_types || [];
}

function gapRejectedSourceTypes(row) {
  return row.collection_rejected_source_types?.length
    ? row.collection_rejected_source_types
    : row.gap_rejected_source_types || [];
}

function sourceFamilyGapWorklist(navigator) {
  const rows = [];
  for (const family of navigator.source_family_timeline?.families || []) {
    for (const product of family.products || []) {
      for (const row of product.rows || []) {
        if (row.ingredient_text) continue;
        rows.push({
          visual_id: row.visual_id,
          evidence_id: row.evidence_id,
          product_id: row.product_id || product.product_id,
          product_name: row.product_name || product.product_name,
          source_family_id: family.id,
          source_family_label: family.label,
          vintage_label: row.vintage_label,
          gap_kind: gapKind(row),
          workstream: gapWorkstream(row),
          source_requirement_status: row.collection_source_status || row.gap_source_status || "",
          next_step: gapNextStep(row),
          accepted_source_types: gapAcceptedSourceTypes(row),
          rejected_source_types: gapRejectedSourceTypes(row),
          source_domain: row.source_domain,
          source_url: row.source_detail_url || row.source_url,
          source_title: row.source_image_title || row.source_title,
          local_preview_available: Boolean(row.local_preview_available),
          preview_endpoint: row.preview_endpoint || "",
          crop_focus: row.crop_focus || "",
          proof_visual_basis: row.proof_visual_basis || "",
          candidate_excerpt: shortText(row.candidate_excerpt, 260),
          claim_boundary: row.claim_boundary || "",
        });
      }
    }
  }
  rows.sort((a, b) => Number(b.local_preview_available) - Number(a.local_preview_available)
    || a.workstream.localeCompare(b.workstream)
    || a.product_name.localeCompare(b.product_name)
    || String(a.vintage_label).localeCompare(String(b.vintage_label)));

  const products = new Set(rows.map((row) => row.product_id).filter(Boolean));
  const workstreams = rows.reduce((map, row) => {
    map.set(row.workstream, (map.get(row.workstream) || 0) + 1);
    return map;
  }, new Map());
  return {
    schema_version: 1,
    generated_at_utc: generatedAt,
    public_image_policy: "Gap worklist exposes source URLs, local preview endpoint IDs, status, and collection criteria only. Private screenshots, crop files, OCR dumps, and absolute local paths stay out of this artifact.",
    claim_policy: "Rows without ingredient text are collection targets only. They do not promote ingredient, formulation, or historical-change claims.",
    totals: {
      rows: rows.length,
      products: products.size,
      local_preview_rows: rows.filter((row) => row.local_preview_available).length,
      collection_target_rows: rows.filter((row) => row.source_family_id === collectionTargetFamilyId).length,
      workstreams: Object.fromEntries([...workstreams.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    },
    rows,
  };
}

function publicProduct(product, coveredSourceFamilies = []) {
  const rows = product.rows || [];
  const highPriorityRows = rows.filter((row) => row.ocr_priority === "high").length;
  const currentRows = rows.filter((row) => row.vintage_label === "current_2020s").length;
  const currentOfficialRows = rows.filter((row) => row.vintage_label === "current_2020s" && row.source_attribution_grade === "brand_source").length;
  const panelVisibleRows = rows.filter((row) => row.ingredient_panel_visible === "true").length;
  const textAvailableRows = rows.filter((row) => row.ingredient_text_available === "true").length;
  return {
    product_id: product.product_id,
    product_name: product.product_name,
    brand: product.brand,
    category: product.category,
    coverage_status: coveredSourceFamilies.length ? "represented_in_source_family" : "not_yet_represented_in_source_family",
    represented_source_families: coveredSourceFamilies,
    capture_class: coveredSourceFamilies.length ? "represented" : captureClass(product),
    evidence_row_count: rows.length,
    high_priority_row_count: highPriorityRows,
    current_row_count: currentRows,
    current_official_row_count: currentOfficialRows,
    ingredient_panel_visible_row_count: panelVisibleRows,
    ingredient_text_available_row_count: textAvailableRows,
    top_source_domains: domainCounts(rows).slice(0, 5),
    representative_rows: representativeRows(rows),
    next_collection_goal: coveredSourceFamilies.length
      ? "continue_archive_era_enrichment_and_manual_review"
      : nextGoalForProduct(product),
    collection_blockers: coveredSourceFamilies.length ? [] : collectionBlockersForProduct(product),
    promotion_boundary: coveredSourceFamilies.length ? "" : promotionBoundaryForProduct(product),
  };
}

function nextGoalForProduct(product) {
  const cls = captureClass(product);
  if (cls === "menu_component_source_needed") return "collect_official_menu_component_ingredient_document_or_api_rows";
  if (cls === "candidate_panel_or_text_available") return "promote_best_candidate_to_private_crop_and_reviewed_ocr";
  if (cls === "package_visual_without_readable_panel") return "find_or_capture_readable_back_or_side_ingredient_panel";
  return "find_source_attributable_current_label_and_archive_panel_candidates";
}

function buildCoverage() {
  const queueRows = parseCsv(fs.readFileSync(queuePath, "utf8"));
  const navigator = JSON.parse(fs.readFileSync(navigatorPath, "utf8"));
  const grouped = groupedQueueProducts(queueRows);
  const sourceFamilyProducts = new Map();

  for (const family of proofFamilies(navigator)) {
    for (const product of family.products || []) {
      const families = sourceFamilyProducts.get(product.product_id) || [];
      families.push({ id: family.id, label: family.label });
      sourceFamilyProducts.set(product.product_id, families);
    }
  }

  const products = [...grouped.values()].map((product) => publicProduct(product, sourceFamilyProducts.get(product.product_id) || []));
  const covered = coveredProductsFromNavigator(navigator);
  const missing = products
    .filter((product) => !covered.has(product.product_id))
    .sort((a, b) => b.high_priority_row_count - a.high_priority_row_count
      || b.evidence_row_count - a.evidence_row_count
      || a.product_name.localeCompare(b.product_name));

  const coverage = {
    schema_version: 1,
    generated_at_utc: generatedAt,
    public_image_policy: "Coverage queue exposes source links, status counts, and next actions only. Private screenshots, crops, OCR dumps, and local paths stay in the private local cache.",
    claim_policy: "Missing-product rows are capture targets only. They do not promote ingredient, formulation, or historical-change claims.",
    totals: {
      queue_products: products.length,
      represented_products: products.length - missing.length,
      collection_target_products: missing.length,
      timeline_products: products.length,
      missing_products: missing.length,
      queue_evidence_rows: queueRows.length,
      high_priority_missing_rows: missing.reduce((sum, product) => sum + product.high_priority_row_count, 0),
      current_missing_rows: missing.reduce((sum, product) => sum + product.current_row_count, 0),
    },
    missing_capture_classes: Object.fromEntries([...missing.reduce((map, product) => {
      map.set(product.capture_class, (map.get(product.capture_class) || 0) + 1);
      return map;
    }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    missing_products: missing,
  };

  upsertCollectionTargetFamily(navigator, missing);
  const gapWorklist = sourceFamilyGapWorklist(navigator);
  navigator.source_family_coverage = coverage;
  navigator.source_family_gap_worklist = {
    schema_version: gapWorklist.schema_version,
    generated_at_utc: gapWorklist.generated_at_utc,
    public_path: "data/product-evidence/source_family_gap_worklist.json",
    totals: gapWorklist.totals,
    claim_policy: gapWorklist.claim_policy,
  };
  writeJson(coveragePath, coverage);
  writeJson(gapWorklistPath, gapWorklist);
  writeJson(navigatorPath, navigator);
  return coverage;
}

if (require.main === module) {
  const coverage = buildCoverage();
  console.log(`Source-family coverage written: ${coverage.totals.represented_products}/${coverage.totals.queue_products} products represented; ${coverage.totals.missing_products} missing.`);
}

module.exports = { buildCoverage };
