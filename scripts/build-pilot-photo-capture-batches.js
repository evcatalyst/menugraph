const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");
const queuePath = path.join(root, "docs/data/product-evidence/exports/photo_proof_upgrade_queue.json");
const manifestPath = path.join(root, "docs/data/product-evidence/pilot_photo_capture_batches.json");
const batchCsvPath = path.join(root, "docs/data/product-evidence/exports/pilot_photo_capture_batches.csv");
const rowCsvPath = path.join(root, "docs/data/product-evidence/exports/pilot_photo_capture_rows.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/pilot_photo_capture_runbook.md");
const generatedAt = "2026-06-07T23:00:00Z";

const pilotOrder = [
  "oreo_original_chocolate_sandwich_cookies",
  "doritos_nacho_cheese",
  "cheerios_original",
  "coca_cola_classic",
  "campbells_tomato_soup",
  "heinz_tomato_ketchup",
  "poptarts_frosted_strawberry",
  "kraft_macaroni_and_cheese_original",
  "mcdonalds_big_mac",
  "mcdonalds_chicken_mcnuggets",
];

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
  fs.writeFileSync(filePath, `${[
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n")}\n`);
}

function present(value) {
  return String(value ?? "").trim();
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function slug(value) {
  return present(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 72);
}

function shortHash(value, length = 10) {
  return crypto.createHash("sha256").update(String(value ?? "")).digest("hex").slice(0, length);
}

function productRank(row) {
  const index = pilotOrder.indexOf(row.product_id);
  return index === -1 ? 999 : index;
}

function rowSort(a, b) {
  return productRank(a) - productRank(b)
    || numeric(b.upgrade_priority) - numeric(a.upgrade_priority)
    || String(a.display_lane).localeCompare(String(b.display_lane))
    || String(a.evidence_id).localeCompare(String(b.evidence_id));
}

function expectedSurface(row) {
  const text = `${row.photo_role || ""} ${row.label_panel_state || ""} ${row.next_action || ""}`.toLowerCase();
  if (/nutrition/.test(text)) return "ingredient_or_nutrition_panel";
  if (/ingredient|label text|panel/.test(text)) return "ingredient_panel";
  if (/document|pdf|menu|allergen/.test(text)) return "document_text";
  if (/front|package object/.test(text)) return "package_identity";
  return "source_receipt";
}

function captureStrategy(row) {
  if (row.display_lane === "source_discovery_needed") return "source_hunt";
  if (row.display_lane === "source_page_capture_needed") return "source_page_screenshot";
  if (row.display_lane === "private_capture_only") return "run_private_ocr";
  if (row.display_lane === "embed_ready") return "publish_or_verify_embedded_image";
  if (row.ingredient_signal) return "panel_crop";
  return "source_page_review";
}

function cropTarget(row) {
  const surface = expectedSurface(row);
  if (surface === "ingredient_or_nutrition_panel") return "ingredient/nutrition panel crop, including serving size and net-weight if visible";
  if (surface === "ingredient_panel") return "ingredient statement panel crop with enough surrounding package context for SKU/date review";
  if (surface === "document_text") return "document text block that lists ingredients, allergens, nutrition, or menu-item disclosure";
  if (surface === "package_identity") return "front/side panel with product identity, package format, net weight, and date cues";
  return "source page screenshot showing title, source owner, date cue, and package/photo context";
}

function imageMapKeys(row) {
  return [row.evidence_id, `${row.product_id}:${row.evidence_id}`, row.source_url].filter(Boolean);
}

function rowToCapture(row) {
  const strategy = captureStrategy(row);
  return {
    product_id: row.product_id,
    product_name: row.product_name,
    evidence_id: row.evidence_id,
    source_url: row.source_url,
    source_owner: row.source_owner,
    source_title: row.source_title,
    display_lane: row.display_lane,
    public_display_decision: row.public_display_decision,
    image_display_policy: row.image_display_policy,
    rights_status: row.rights_status,
    upgrade_priority: numeric(row.upgrade_priority),
    linked_vintages: row.linked_vintages,
    linked_years: row.linked_years,
    capture_strategy: strategy,
    crop_target: cropTarget(row),
    ocr_expected_surface: expectedSurface(row),
    private_image_map_keys: imageMapKeys(row).join(";"),
    allowed_public_output: "source receipt, hashes, OCR status, candidate text after review; no private image path and no external image embed",
    success_criteria: strategy === "source_hunt"
      ? "Attributable source URL attached with title, owner, rights note, and product/date cue."
      : "Private capture/crop exists, image-map key is populated, OCR can run, and source receipt remains public-safe.",
    next_action: row.next_action,
  };
}

function groupKey(row) {
  return [
    row.product_id,
    row.display_lane,
  ].join("__");
}

function buildBatches(rows, batchSize) {
  const grouped = new Map();
  for (const row of rows) {
    const key = groupKey(row);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }

  const batches = [];
  for (const [key, groupRows] of grouped.entries()) {
    const sortedRows = groupRows.sort(rowSort);
    for (let start = 0; start < sortedRows.length; start += batchSize) {
      const slice = sortedRows.slice(start, start + batchSize);
      const productId = slice[0].product_id;
      const productName = slice[0].product_name;
      const lane = slice[0].display_lane;
      const sourceOwner = [...new Set(slice.map((row) => row.source_owner).filter(Boolean))].slice(0, 5).join("; ") || "source";
      const batchId = `pilot_capture_${shortHash(`${key}:${start}:${slice.map((row) => row.evidence_id).join("|")}`, 14)}`;
      batches.push({
        batch_id: batchId,
        product_id: productId,
        product_name: productName,
        display_lane: lane,
        source_owner: sourceOwner,
        row_count: slice.length,
        ingredient_signal_count: slice.filter((row) => row.ingredient_signal).length,
        source_discovery_count: slice.filter((row) => row.display_lane === "source_discovery_needed").length,
        max_priority: Math.max(...slice.map((row) => numeric(row.upgrade_priority))),
        capture_goal: lane === "source_discovery_needed"
          ? "Find an attributable source before OCR."
          : "Create private captures/crops that can feed native Vision OCR while keeping public pages link-only.",
        model_handoff: {
          spark: "Use gpt-5.3-codex-spark for bounded crop/capture strategy notes if deterministic instructions are insufficient.",
          gpt55: "Use gpt-5.5 only for compact batch review of OCR candidates after capture.",
          grok: "Use Grok/xAI only for source hunting or validation advice, never as verified evidence.",
        },
        public_safety: {
          commit_images: false,
          expose_private_paths: false,
          external_images_link_only: true,
          candidate_only: true,
        },
        rows: slice.map(rowToCapture),
      });
    }
  }
  return batches.sort((a, b) => productRank(a) - productRank(b) || b.max_priority - a.max_priority || a.batch_id.localeCompare(b.batch_id));
}

function batchRows(batches) {
  return batches.flatMap((batch) => batch.rows.map((row, index) => ({
    batch_id: batch.batch_id,
    batch_product_id: batch.product_id,
    row_number: index + 1,
    ...row,
  })));
}

function productRollups(rows) {
  return pilotOrder.map((productId) => {
    const productRows = rows.filter((row) => row.product_id === productId);
    const first = productRows[0] || {};
    return {
      product_id: productId,
      product_name: first.product_name || productId,
      row_count: productRows.length,
      panel_capture_needed: productRows.filter((row) => row.display_lane === "panel_capture_needed").length,
      source_page_capture_needed: productRows.filter((row) => row.display_lane === "source_page_capture_needed").length,
      source_discovery_needed: productRows.filter((row) => row.display_lane === "source_discovery_needed").length,
      ingredient_signal_count: productRows.filter((row) => row.ingredient_signal).length,
      top_priority: Math.max(0, ...productRows.map((row) => numeric(row.upgrade_priority))),
      next_action: productRows[0]?.next_action || "No story-rich photo proof rows currently queued.",
    };
  });
}

function buildManifest(rows, batches) {
  return {
    schema_version: 1,
    generated_at_utc: generatedAt,
    scope: "story_rich_pilot_photo_capture",
    selection_policy: {
      products: "The ten story-rich pilot products are included before scaling the same workflow across full-corpus proof shells.",
      row_source: "docs/data/product-evidence/exports/photo_proof_upgrade_queue.json",
      private_capture_policy: "Write captures, crops, OCR JSON, and image-map paths only under the private OCR run directory.",
      public_output_policy: "Public artifacts contain source URLs, action labels, hashes/statuses, and candidate-only OCR status. They do not contain private paths or reproduced external photos.",
    },
    totals: {
      products: pilotOrder.length,
      selected_rows: rows.length,
      batches: batches.length,
      panel_capture_needed: rows.filter((row) => row.display_lane === "panel_capture_needed").length,
      source_page_capture_needed: rows.filter((row) => row.display_lane === "source_page_capture_needed").length,
      source_discovery_needed: rows.filter((row) => row.display_lane === "source_discovery_needed").length,
      ingredient_signal_rows: rows.filter((row) => row.ingredient_signal).length,
      embed_ready: rows.filter((row) => row.display_lane === "embed_ready").length,
    },
    artifacts: {
      manifest_json: "docs/data/product-evidence/pilot_photo_capture_batches.json",
      batch_csv: "docs/data/product-evidence/exports/pilot_photo_capture_batches.csv",
      row_csv: "docs/data/product-evidence/exports/pilot_photo_capture_rows.csv",
      runbook_markdown: "docs/data/product-evidence/exports/pilot_photo_capture_runbook.md",
    },
    product_rollups: productRollups(rows),
    batches,
  };
}

function writeRunbook(filePath, manifest) {
  const lines = [
    "# Pilot Photo Capture Runbook",
    "",
    `Generated: ${manifest.generated_at_utc}`,
    "",
    "This runbook turns source-linked photo proof rows for the ten story-rich pilot products into private capture/OCR tasks. It is not a publication claim and it does not grant permission to reproduce external images.",
    "",
    "## Public Safety",
    "",
    "- Do not commit captures, crops, or private image-map paths.",
    "- Do not embed external product photos unless the evidence row is explicitly rights-cleared and marked embed-ready.",
    "- OCR output remains candidate text until reviewer-corrected and manually verified.",
    "",
    "## Totals",
    "",
    `- Products: ${manifest.totals.products}`,
    `- Selected rows: ${manifest.totals.selected_rows}`,
    `- Capture batches: ${manifest.totals.batches}`,
    `- Panel capture rows: ${manifest.totals.panel_capture_needed}`,
    `- Source-page capture rows: ${manifest.totals.source_page_capture_needed}`,
    `- Source-discovery rows: ${manifest.totals.source_discovery_needed}`,
    `- Ingredient-signal rows: ${manifest.totals.ingredient_signal_rows}`,
    "",
    "## First Batches",
    "",
    ...manifest.batches.slice(0, 24).flatMap((batch) => [
      `### ${batch.product_name} · ${batch.display_lane}`,
      "",
      `Batch: ${batch.batch_id}`,
      "",
      `Rows: ${batch.row_count} · Source: ${batch.source_owner}`,
      "",
      `Goal: ${batch.capture_goal}`,
      "",
      ...batch.rows.slice(0, 4).map((row) => `- ${row.evidence_id}: ${row.capture_strategy}; ${row.crop_target}`),
      "",
    ]),
  ];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function updateSummary(summary, manifest) {
  summary.pilot_photo_capture_summary = {
    generated_at_utc: manifest.generated_at_utc,
    product_count: manifest.totals.products,
    selected_row_count: manifest.totals.selected_rows,
    batch_count: manifest.totals.batches,
    panel_capture_needed_count: manifest.totals.panel_capture_needed,
    source_page_capture_needed_count: manifest.totals.source_page_capture_needed,
    source_discovery_needed_count: manifest.totals.source_discovery_needed,
    ingredient_signal_row_count: manifest.totals.ingredient_signal_rows,
    embed_ready_count: manifest.totals.embed_ready,
    selection_policy: manifest.selection_policy,
    artifacts: manifest.artifacts,
    product_rollups: manifest.product_rollups,
    top_batches: manifest.batches.slice(0, 12).map((batch) => ({
      batch_id: batch.batch_id,
      product_id: batch.product_id,
      product_name: batch.product_name,
      display_lane: batch.display_lane,
      source_owner: batch.source_owner,
      row_count: batch.row_count,
      ingredient_signal_count: batch.ingredient_signal_count,
      max_priority: batch.max_priority,
      capture_goal: batch.capture_goal,
      first_evidence_ids: batch.rows.slice(0, 5).map((row) => row.evidence_id),
    })),
  };
}

function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const batchSizeArg = process.argv.find((arg) => arg.startsWith("--batch-size="));
  const limit = limitArg ? Math.max(1, numeric(limitArg.split("=")[1])) : Infinity;
  const batchSize = Math.min(Math.max(batchSizeArg ? numeric(batchSizeArg.split("=")[1]) : 12, 1), 25);
  const summary = readJson(summaryPath);
  const queue = readJson(queuePath)
    .filter((row) => pilotOrder.includes(row.product_id))
    .sort(rowSort)
    .slice(0, limit);
  const batches = buildBatches(queue, batchSize);
  const manifest = buildManifest(queue, batches);
  const rows = batchRows(batches);
  updateSummary(summary, manifest);

  writeJson(manifestPath, manifest);
  writeCsv(batchCsvPath, [
    "batch_id",
    "product_id",
    "product_name",
    "display_lane",
    "source_owner",
    "row_count",
    "ingredient_signal_count",
    "source_discovery_count",
    "max_priority",
    "capture_goal",
  ], batches);
  writeCsv(rowCsvPath, [
    "batch_id",
    "batch_product_id",
    "row_number",
    "product_id",
    "product_name",
    "evidence_id",
    "source_url",
    "source_owner",
    "source_title",
    "display_lane",
    "public_display_decision",
    "image_display_policy",
    "rights_status",
    "upgrade_priority",
    "linked_vintages",
    "linked_years",
    "capture_strategy",
    "crop_target",
    "ocr_expected_surface",
    "private_image_map_keys",
    "allowed_public_output",
    "success_criteria",
    "next_action",
  ], rows);
  writeRunbook(runbookPath, manifest);
  writeJson(summaryPath, summary);

  console.log(JSON.stringify({
    products: manifest.totals.products,
    selected_rows: manifest.totals.selected_rows,
    batches: manifest.totals.batches,
    panel_capture_needed: manifest.totals.panel_capture_needed,
    source_page_capture_needed: manifest.totals.source_page_capture_needed,
    source_discovery_needed: manifest.totals.source_discovery_needed,
    ingredient_signal_rows: manifest.totals.ingredient_signal_rows,
  }, null, 2));
}

if (require.main === module) main();
