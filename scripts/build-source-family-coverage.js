const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const queuePath = path.join(root, "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const coveragePath = path.join(root, "docs/data/product-evidence/source_family_coverage.json");
const generatedAt = new Date().toISOString();

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

function coveredProductsFromNavigator(navigator) {
  return new Set((navigator.source_family_timeline?.families || [])
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

  for (const family of navigator.source_family_timeline?.families || []) {
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

  navigator.source_family_coverage = coverage;
  writeJson(coveragePath, coverage);
  writeJson(navigatorPath, navigator);
  return coverage;
}

if (require.main === module) {
  const coverage = buildCoverage();
  console.log(`Source-family coverage written: ${coverage.totals.represented_products}/${coverage.totals.queue_products} products represented; ${coverage.totals.missing_products} missing.`);
}

module.exports = { buildCoverage };
