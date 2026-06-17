const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ingredientItemsFromStatement } = require("./ingredient-statement-utils");

const root = path.join(__dirname, "..");
const fullQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv");
const visualIndexPath = path.join(root, "docs/data/product-evidence/label_database_ingredient_visual_index.json");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const cacheRoot = path.join(root, ".cache/ingredient-ocr/label-database-text-leads");
const latestPrivateManifestPath = path.join(cacheRoot, "latest-private-manifest.json");
const sourceFamilyId = "label-database-text-leads";
const sourceFamilyLabel = "Label Database Text Leads";
const generatedAt = new Date().toISOString();

const curatedRows = {
  "nilla_wafers__current_2020s__63__6": {
    source_title_override: "Nilla Wafers Family Size - Directions for Me",
    source_owner_override: "Horizons for the Blind / Directions for Me",
    source_detail_url: "https://www.directionsforme.org/product/75544",
    source_image_match_status: "label_database_source_text_record",
    source_record_title: "Nilla Wafers Family Size",
    product_size: "15 oz (425 g)",
    manufacturer: "Mondelez Global LLC, East Hanover, NJ 07936 United States",
    upc: "00044000077136",
    allergen_statement: "Contains: wheat, milk, egg, soy.",
    source_disclaimer: "Horizons for the Blind makes no warranties regarding the accuracy of any information provided through this service.",
    ingredient_statement_override: "Unbleached Enriched Flour (Wheat Flour, Niacin, Reduced Iron, Thiamine Mononitrate [Vitamin B1], Riboflavin [Vitamin B2], Folic Acid), Sugar, Soybean and/or Canola Oil, Palm Oil, High Fructose Corn Syrup, Whey (from Milk), Eggs, Salt, Leavening (Baking Soda, Calcium Phosphate), Mono- and Diglycerides, Natural and Artificial Flavor, Soy Lecithin.",
    verification_note: "Accessibility/product database text candidate verified from the public source page on 2026-06-17. Package image review is still required before promoting this as package-label ground truth.",
  },
  "twinkies__2010s__15__1": {
    source_title_override: "Hostess Twinkies (045000001008) - UPC Food Search",
    source_owner_override: "UPC Food Search",
    source_detail_url: "https://upcfoodsearch.com/food-products/other-pastries/045000001008/",
    source_image_match_status: "label_database_source_text_record",
    source_record_title: "Hostess Twinkies",
    product_size: "Package size not stated on source page",
    manufacturer: "Hostess",
    upc: "045000001008",
    allergen_statement: "May contain peanuts or traces of peanuts.",
    source_disclaimer: "Third-party UPC database text; original package image and capture date are not provided on the source page.",
    ingredient_statement_override: "Enriched Bleached Wheat Flour (Flour, Ferrous Sulfate, B Vitamins (Niacin, Thiamine Mononitrate [B1], Riboflavin [B2], Folic Acid), Sugar, Corn Syrup, Water, High Fructose Corn Syrup, Partially Hydrogenated Vegetable Shortening (Contains One Or More: Soybean, Canola Or Palm Oil), Dextrose, Whole Eggs. Contains 2% Or Less Of: Modified Corn Starch, Cellulose Gum, Whey, Leavenings (Sodium Acid Pyrophosphate, Baking Soda, Monocalcium Phosphate), Salt, Cornstarch, Corn Flour, Corn Dextrins, Mono And Diglycerides, Polysorbate 60, Soy Lecithin, Natural And Artificial Flavors, Soy Protein Isolate, Sodium Stearoyl Lactylate, Sodium And Calcium Caseinate, Calcium Sulfate, Sorbic Acid (To Retain Freshness), Color Added (Yellow 5, Red 40).",
    ingredient_items_override: [
      "Enriched Bleached Wheat Flour (Flour, Ferrous Sulfate, B Vitamins: Niacin, Thiamine Mononitrate [B1], Riboflavin [B2], Folic Acid)",
      "Sugar",
      "Corn Syrup",
      "Water",
      "High Fructose Corn Syrup",
      "Partially Hydrogenated Vegetable Shortening (Contains One Or More: Soybean, Canola Or Palm Oil)",
      "Dextrose",
      "Whole Eggs",
      "Contains 2% Or Less Of: Modified Corn Starch",
      "Cellulose Gum",
      "Whey",
      "Leavenings (Sodium Acid Pyrophosphate, Baking Soda, Monocalcium Phosphate)",
      "Salt",
      "Cornstarch",
      "Corn Flour",
      "Corn Dextrins",
      "Mono And Diglycerides",
      "Polysorbate 60",
      "Soy Lecithin",
      "Natural And Artificial Flavors",
      "Soy Protein Isolate",
      "Sodium Stearoyl Lactylate",
      "Sodium And Calcium Caseinate",
      "Calcium Sulfate",
      "Sorbic Acid (To Retain Freshness)",
      "Color Added (Yellow 5, Red 40)",
    ],
    verification_note: "UPC Food Search original ingredient statement verified from the public source page on 2026-06-17. Treat as a formulation lead only until package imagery or an archived label confirms the text and date.",
  },
};

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeTextIfChanged(filePath, value) {
  ensureDir(path.dirname(filePath));
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === value) return;
  fs.writeFileSync(filePath, value);
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

function sanitizeId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function sha(value, length = 12) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, length);
}

function shortText(value, limit = 240) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trim()}...` : text;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function visualIdFor(row) {
  return `${sanitizeId(row.product_id)}__${sanitizeId(row.vintage_label)}__${sha(`${row.evidence_id}|${row.source_url}`, 10)}`;
}

function privateSafePreviewEndpoint(visualId) {
  return `/api/private/ingredient-crops/${visualId}`;
}

function ingredientTextFromItems(items) {
  return items.join(", ");
}

function sourceYearLabel(row) {
  return row.vintage_label === "current_2020s" ? "current" : row.vintage_label;
}

function sourceSnapshotText(row, review, ingredientText) {
  return [
    `Source: ${review.source_detail_url || row.source_url}`,
    `Title: ${review.source_record_title || review.source_title_override || row.source_title}`,
    `Product size: ${review.product_size || ""}`,
    `Manufacturer: ${review.manufacturer || ""}`,
    `UPC: ${review.upc || ""}`,
    "",
    "Ingredients:",
    ingredientText,
    "",
    "Warnings:",
    review.allergen_statement || "",
    "",
    "Source disclaimer:",
    review.source_disclaimer || "",
    "",
    "Review note:",
    review.verification_note || "",
  ].join("\n");
}

function proofHtml(row, review, items) {
  const itemRows = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const title = review.source_record_title || row.product_name;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  :root { color-scheme: light; }
  body {
    margin: 0;
    background: #f6f1e8;
    color: #20211d;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .proof-panel {
    width: 1280px;
    min-height: 820px;
    padding: 42px;
    background: #fffaf0;
    border: 1px solid #d5c7a9;
    box-sizing: border-box;
  }
  .proof-layout {
    display: grid;
    grid-template-columns: 410px minmax(0, 1fr);
    gap: 36px;
    align-items: start;
  }
  .source-record {
    min-height: 540px;
    padding: 28px;
    background: #ffffff;
    border: 2px solid #1f302d;
    box-shadow: inset 0 0 0 8px #edf4ef;
    box-sizing: border-box;
  }
  .source-record span {
    display: block;
    margin-bottom: 18px;
    color: #8b3d29;
    font-size: 17px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .source-record h2 {
    margin: 0 0 18px;
    font-size: 42px;
    line-height: 1.02;
    letter-spacing: 0;
  }
  .source-record dl {
    display: grid;
    gap: 12px;
    margin: 0;
  }
  .source-record div {
    border-top: 1px solid #d9dfd8;
    padding-top: 12px;
  }
  .source-record dt {
    margin: 0 0 3px;
    color: #5e655c;
    font-size: 16px;
    font-weight: 750;
    text-transform: uppercase;
  }
  .source-record dd {
    margin: 0;
    color: #20211d;
    font-size: 23px;
    line-height: 1.2;
    font-weight: 720;
  }
  .proof-copy {
    min-width: 0;
  }
  .proof-kicker {
    margin: 0 0 10px;
    color: #7d2c1f;
    font-size: 24px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    font-size: 50px;
    line-height: 1.02;
    letter-spacing: 0;
  }
  .source {
    margin: 14px 0 0;
    color: #5d564a;
    font-size: 22px;
    line-height: 1.35;
  }
  .ingredients {
    columns: 2;
    column-gap: 34px;
    margin: 26px 0 0;
    padding: 24px 0 0;
    list-style: none;
    border-top: 4px solid #1d1f1b;
  }
  .ingredients li {
    break-inside: avoid;
    margin: 0 0 9px;
    border-bottom: 1px solid #e4dccd;
    padding: 0 0 9px;
    font-size: 25px;
    line-height: 1.15;
    font-weight: 720;
  }
  .footer {
    margin-top: 28px;
    color: #6c665b;
    font-size: 20px;
    line-height: 1.35;
  }
</style>
</head>
<body>
  <main class="proof-panel">
    <section class="proof-layout">
      <aside class="source-record" aria-label="Source record">
        <span>Label Database Record</span>
        <h2>${escapeHtml(title)}</h2>
        <dl>
          <div><dt>Size</dt><dd>${escapeHtml(review.product_size || "Package size pending")}</dd></div>
          <div><dt>Manufacturer</dt><dd>${escapeHtml(review.manufacturer || "Manufacturer pending")}</dd></div>
          <div><dt>UPC</dt><dd>${escapeHtml(review.upc || "UPC pending")}</dd></div>
          <div><dt>Warnings</dt><dd>${escapeHtml(review.allergen_statement || "Warnings pending")}</dd></div>
        </dl>
      </aside>
      <div class="proof-copy">
        <p class="proof-kicker">Source Text Candidate</p>
        <h1>${escapeHtml(row.product_name)}</h1>
        <p class="source">${escapeHtml(review.source_title_override || row.source_title)} · ${escapeHtml(new URL(review.source_detail_url || row.source_url).hostname)}</p>
        <ol class="ingredients">${itemRows}</ol>
        <p class="footer">Local proof panel from public source text. The source carries its own accuracy disclaimer; package-photo review is still required before treating this as label ground truth.</p>
      </div>
    </section>
  </main>
</body>
</html>`;
}

async function renderProofImage(htmlPath, outputPath, noRender) {
  if (fs.existsSync(outputPath)) {
    const outputStat = fs.statSync(outputPath);
    const htmlStat = fs.existsSync(htmlPath) ? fs.statSync(htmlPath) : null;
    if (!htmlStat || outputStat.mtimeMs >= htmlStat.mtimeMs) {
      return { status: "cached", output_pixels: null };
    }
  }
  if (noRender) return { status: "render_skipped", output_pixels: null };
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1400, height: 1100 },
      deviceScaleFactor: 2,
    });
    await page.goto(`file://${htmlPath}`);
    const panel = page.locator(".proof-panel");
    await panel.waitFor();
    ensureDir(path.dirname(outputPath));
    await panel.screenshot({ path: outputPath });
    const dimensions = await page.evaluate(() => {
      const image = document.querySelector(".proof-panel");
      const rect = image.getBoundingClientRect();
      return { width: Math.round(rect.width * window.devicePixelRatio), height: Math.round(rect.height * window.devicePixelRatio) };
    });
    return { status: "upscaled_crop_ready", output_pixels: dimensions };
  } finally {
    await browser.close();
  }
}

function rowsByProduct(publicRows) {
  const products = new Map();
  for (const row of publicRows) {
    if (!products.has(row.product_id)) {
      products.set(row.product_id, {
        product_id: row.product_id,
        product_name: row.product_name,
        brand: row.brand,
        category: row.category,
        source_family: sourceFamilyId,
        evidence_count: 0,
        local_preview_available_count: 0,
        ingredient_signal_count: 0,
        vintages: [],
        rows: [],
      });
    }
    const product = products.get(row.product_id);
    product.evidence_count += 1;
    if (row.local_preview_available) product.local_preview_available_count += 1;
    if (row.ingredient_signal_status === "ingredient_signal_found") product.ingredient_signal_count += 1;
    product.vintages.push(row.vintage_label);
    product.rows.push(row);
  }
  return [...products.values()].map((product) => ({
    ...product,
    vintages: [...new Set(product.vintages)].sort(),
    rows: product.rows.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id)),
  })).sort((a, b) => b.evidence_count - a.evidence_count || a.product_name.localeCompare(b.product_name));
}

function upsertFamily(families, family) {
  const existingIndex = families.findIndex((row) => row.id === family.id);
  if (existingIndex >= 0) families.splice(existingIndex, 1, family);
  else families.push(family);
  return families;
}

function removeLegacyFamilies(families) {
  return (families || []).filter((family) => family.id !== "label-database-current-leads");
}

function publicClaimBoundary() {
  return "Label database text is candidate evidence only. Package image review is required before promoting a package-label ingredient claim or historical formulation comparison.";
}

function publicRowFor(row, review, visual, ingredientText, ingredientItems) {
  const sourceUrl = review.source_detail_url || row.source_url;
  return {
    product_id: row.product_id,
    product_name: row.product_name,
    brand: row.brand,
    category: row.category,
    vintage_label: row.vintage_label,
    vintage_start: row.vintage_start,
    vintage_end: row.vintage_end,
    evidence_id: row.evidence_id,
    ocr_priority: row.ocr_priority,
    ocr_gap_category: row.ocr_gap_category,
    source_domain: new URL(sourceUrl).hostname,
    source_url: sourceUrl,
    source_title: review.source_title_override || row.source_title,
    source_owner: review.source_owner_override || row.source_owner,
    rights_note: row.rights_note,
    visual_id: visual.visual_id,
    preview_endpoint: privateSafePreviewEndpoint(visual.visual_id),
    visual_status: "local_source_text_proof_ready",
    local_preview_available: Boolean(visual.upscaled_preview_path),
    local_upscaled_preview_available: Boolean(visual.upscaled_preview_path),
    preview_render_variant: visual.upscaled_preview_path ? "upscaled_crop" : "none",
    ocr_status: "source_html_text_extracted",
    crop_status: visual.crop_status,
    source_image_title: review.source_record_title || review.source_title_override || row.source_title,
    source_image_year: sourceYearLabel(row),
    source_detail_url: sourceUrl,
    source_image_match_status: review.source_image_match_status,
    proof_visual_basis: "label_database_source_text_proof_panel",
    crop_focus: "ingredient_text",
    crop_rotation_degrees: 0,
    ingredient_text: ingredientText,
    ingredient_items: ingredientItems,
    ingredient_text_source: "label_database_source_text",
    ingredient_text_status: "label_database_candidate_needs_package_review",
    candidate_excerpt: shortText(ingredientText, 240),
    candidate_status: "source_text_candidate_needs_package_review",
    ingredient_signal_status: "ingredient_signal_found",
    source_capture_status: "manual_source_text_snapshot_ready",
    source_candidate_image_count: 0,
    product_size: review.product_size,
    manufacturer: review.manufacturer,
    upc: review.upc,
    allergen_statement: review.allergen_statement,
    source_disclaimer_excerpt: shortText(review.source_disclaimer, 180),
    source_text_hash: sha(ingredientText, 16),
    claim_boundary: publicClaimBoundary(),
  };
}

function updateNavigatorTimeline(visualIndex) {
  const data = JSON.parse(fs.readFileSync(navigatorPath, "utf8"));
  data.source_family_summary = data.source_family_summary || {
    schema_version: 1,
    generated_at_utc: visualIndex.generated_at_utc,
    private_scratch_policy: "Use the configured private scratch root for captures, crops, OCR text, model packets, and review manifests. Public files remain link/status only.",
    families: [],
  };
  data.source_family_summary.families = upsertFamily(removeLegacyFamilies(data.source_family_summary.families), {
    id: sourceFamilyId,
    label: sourceFamilyLabel,
    strategy: "label_database_source_text_leads",
    public_image_policy: visualIndex.public_image_policy,
    claim_policy: visualIndex.claim_policy,
    evidence_row_count: visualIndex.totals.rows,
    product_count: visualIndex.totals.products,
    top_domains: visualIndex.source_family.source_domain,
    gap_categories: "package_label_photo_review_needed",
    products: visualIndex.products.map((product) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      brand: product.brand,
      category: product.category,
      evidence_count: product.evidence_count,
      vintages: product.vintages,
      source_urls: [...new Set(product.rows.map((sourceRow) => sourceRow.source_url).filter(Boolean))],
      ingredient_panel_visible_count: product.ingredient_signal_count,
      local_image_ready_count: product.local_preview_available_count,
      readable_panel_photo_needed_count: 0,
      next_action: "verify_label_database_text_against_package_photo",
      vintage_count: product.vintages.length,
    })),
  });

  const existingTimeline = data.source_family_timeline || {};
  data.source_family_timeline = {
    schema_version: visualIndex.schema_version,
    generated_at_utc: visualIndex.generated_at_utc,
    default_family: existingTimeline.default_family || "official-current-labels",
    public_image_policy: existingTimeline.public_image_policy || visualIndex.public_image_policy,
    claim_policy: existingTimeline.claim_policy || visualIndex.claim_policy,
    families: upsertFamily(removeLegacyFamilies(existingTimeline.families), {
      id: sourceFamilyId,
      label: sourceFamilyLabel,
      row_count: visualIndex.totals.rows,
      product_count: visualIndex.totals.products,
      local_preview_available_count: visualIndex.totals.local_preview_available,
      ingredient_signal_count: visualIndex.totals.ingredient_signal_candidates,
      products: visualIndex.products,
    }),
  };
  writeJson(navigatorPath, data);
}

async function build() {
  const noRender = hasFlag("no-render");
  const runId = sanitizeId(argValue("run-id", "label_database_text")) || "label_database_text";
  const runDir = path.resolve(argValue("result-dir", path.join(cacheRoot, runId)));
  const sourceSnapshotDir = path.join(runDir, "source-snapshots");
  const proofHtmlDir = path.join(runDir, "proof-html");
  const cropDir = path.join(runDir, "crops");
  const upscaledCropDir = path.join(cropDir, "upscaled");
  [runDir, sourceSnapshotDir, proofHtmlDir, cropDir, upscaledCropDir].forEach(ensureDir);

  const queueRows = parseCsv(fs.readFileSync(fullQueueCsvPath, "utf8"));
  const rows = Object.keys(curatedRows).map((evidenceId) => {
    const row = queueRows.find((candidate) => candidate.evidence_id === evidenceId);
    if (!row) throw new Error(`Curated label-database row missing from queue: ${evidenceId}`);
    return row;
  });

  const privateVisuals = [];
  const publicRows = [];
  const sourceCaptures = [];

  for (const row of rows) {
    const review = curatedRows[row.evidence_id];
    const visualId = visualIdFor(row);
    const items = review.ingredient_items_override || ingredientItemsFromStatement(review.ingredient_statement_override);
    const ingredientText = ingredientTextFromItems(items);
    const snapshotPath = path.join(sourceSnapshotDir, `${visualId}.txt`);
    writeTextIfChanged(snapshotPath, sourceSnapshotText(row, review, ingredientText));
    const proofPath = path.join(proofHtmlDir, `${visualId}.html`);
    writeTextIfChanged(proofPath, proofHtml(row, review, items));

    const upscaledPath = path.join(upscaledCropDir, `${visualId}.png`);
    const render = await renderProofImage(proofPath, upscaledPath, noRender);
    const upscaledReady = render.status === "upscaled_crop_ready" || render.status === "cached";

    const visual = {
      visual_id: visualId,
      product_id: row.product_id,
      evidence_id: row.evidence_id,
      source_url: review.source_detail_url || row.source_url,
      source_snapshot_path: snapshotPath,
      ingredient_fragment_path: snapshotPath,
      source_image_title: review.source_record_title || row.source_title,
      source_image_year: sourceYearLabel(row),
      source_detail_url: review.source_detail_url || row.source_url,
      source_image_match_status: review.source_image_match_status,
      preview_path: "",
      upscaled_preview_path: upscaledReady ? upscaledPath : "",
      upscaled_crop_status: render.status,
      crop_output_pixels: null,
      upscaled_output_pixels: render.output_pixels,
      ocr_path: "",
      ocr_status: "source_html_text_extracted",
      crop_status: upscaledReady ? "label_database_source_text_proof_panel_ready" : render.status,
      crop_focus: "ingredient_text",
      crop_rotation_degrees: 0,
      ingredient_text: ingredientText,
      ingredient_text_source: "label_database_source_text",
      ingredient_signal_lines: ingredientText ? [ingredientText] : [],
      panel_context_lines: [],
      errors: upscaledReady ? [] : [render.status],
    };

    sourceCaptures.push({
      source_url: review.source_detail_url || row.source_url,
      status: "manual_source_text_snapshot_ready",
      candidates: [{ url: review.source_detail_url || row.source_url, title: `${review.source_record_title || row.product_name} ingredient text`, year: sourceYearLabel(row) }],
      downloads: [{ url: review.source_detail_url || row.source_url, file_path: snapshotPath, title: `${review.source_record_title || row.product_name} source text snapshot` }],
      public_error: "",
    });

    privateVisuals.push(visual);
    publicRows.push(publicRowFor(row, review, visual, ingredientText, items));
  }

  const privateManifest = {
    schema_version: 1,
    generated_at_utc: generatedAt,
    run_id: runId,
    run_dir: runDir,
    source_family: sourceFamilyId,
    rows: privateVisuals,
    source_captures: sourceCaptures,
  };
  writeJson(path.join(runDir, "private-manifest.json"), privateManifest);
  writeJson(latestPrivateManifestPath, privateManifest);

  const products = rowsByProduct(publicRows);
  const visualIndex = {
    schema_version: 1,
    generated_at_utc: generatedAt,
    source_family: {
      id: sourceFamilyId,
      label: sourceFamilyLabel,
      source_domain: [...new Set(publicRows.map((row) => row.source_domain || new URL(row.source_url).hostname))]
        .sort()
        .join("; "),
    },
    public_image_policy: "Public artifacts publish source links, candidate ingredient text, hashes, and status only. Localhost may render cached proof panels through /api/private/ingredient-crops/:visual_id when a private cache exists.",
    claim_policy: "Label database text remains candidate evidence until manually reviewed against package labeling.",
    totals: {
      products: products.length,
      rows: publicRows.length,
      unique_source_urls: new Set(publicRows.map((row) => row.source_url)).size,
      local_preview_available: publicRows.filter((row) => row.local_preview_available).length,
      ingredient_signal_candidates: publicRows.filter((row) => row.ingredient_signal_status === "ingredient_signal_found").length,
      readable_panel_still_needed: 0,
      source_text_snapshots: sourceCaptures.length,
    },
    sources: sourceCaptures.map((capture) => ({
      source_url: capture.source_url,
      status: capture.status,
      candidate_image_count: capture.candidates.length,
      downloaded_image_count: capture.downloads.length,
      error: capture.public_error || "",
    })),
    products,
    rows: publicRows,
  };

  writeJson(visualIndexPath, visualIndex);
  updateNavigatorTimeline(visualIndex);

  console.log(JSON.stringify({
    run_id: runId,
    source_rows: rows.length,
    local_preview_available: visualIndex.totals.local_preview_available,
    ingredient_signal_candidates: visualIndex.totals.ingredient_signal_candidates,
    visual_index: visualIndexPath,
    private_manifest: latestPrivateManifestPath,
  }, null, 2));
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
