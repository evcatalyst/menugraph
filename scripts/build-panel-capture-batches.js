const fs = require("fs");
const path = require("path");
const {
  countBy,
  normalizeText,
  parseCsv,
  publicArtifactRef,
  readJson,
  shortHash,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const boardPath = path.join(root, "docs/data/product-evidence/ingredient_panel_acquisition_board.json");
const acquisitionSlotCsvPath = path.join(root, "docs/data/product-evidence/exports/ingredient_panel_acquisition_slots.csv");
const manifestPath = path.join(root, "docs/data/product-evidence/panel_capture_batches.json");
const queueCsvPath = path.join(root, "docs/data/product-evidence/exports/panel_capture_ocr_queue.csv");
const batchCsvPath = path.join(root, "docs/data/product-evidence/exports/panel_capture_batches.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/panel_capture_runbook.md");
const generatedAt = "2026-06-07T23:55:00Z";

const stateRank = {
  panel_source_candidate: 0,
  public_panel_embed_candidate: 1,
  candidate_text_needs_photo: 2,
  secondary_context_only: 3,
  source_discovery_needed: 4,
  publishable_gap: 5,
};

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sourceDomain(row = {}) {
  return normalizeText(row.top_source_domain || "source_discovery_needed");
}

function ocrGapCategory(row = {}) {
  if (row.panel_acquisition_state === "panel_source_candidate") return "panel_capture_needed";
  if (row.panel_acquisition_state === "public_panel_embed_candidate") return "panel_capture_needed";
  if (row.panel_acquisition_state === "candidate_text_needs_photo") return "readable_panel_photo_needed";
  if (row.panel_acquisition_state === "secondary_context_only") return "readable_panel_photo_needed";
  return "source_discovery_needed";
}

function ocrPriority(row = {}) {
  if (row.corpus_scope === "story_rich_pilot" && numeric(row.priority) >= 100) return "high";
  if (numeric(row.priority) >= 100) return "medium";
  if (row.panel_acquisition_state === "source_discovery_needed") return "medium";
  return "low";
}

function captureStrategy(row = {}) {
  if (row.panel_acquisition_state === "source_discovery_needed" || row.panel_acquisition_state === "publishable_gap") return "source_hunt";
  if (row.panel_acquisition_state === "secondary_context_only") return "source_page_review";
  if (/pdf|document|guide|mcdonald|smartlabel/i.test(`${row.top_source_title || ""} ${row.top_source_url || ""} ${row.photo_role || ""}`)) {
    return "document_text_extract";
  }
  return "panel_crop";
}

function expectedSurface(row = {}) {
  const text = `${row.label_panel_state || ""} ${row.photo_role || ""} ${row.top_source_title || ""}`.toLowerCase();
  if (/nutrition/.test(text)) return "ingredient_or_nutrition_panel";
  if (/allergen|document|pdf|guide|smartlabel|menu/.test(text)) return "document_text";
  if (/ingredient|label|panel/.test(text)) return "ingredient_panel";
  if (row.panel_acquisition_state === "secondary_context_only") return "package_identity_then_panel_hunt";
  return "source_discovery";
}

function cropTarget(row = {}) {
  const surface = expectedSurface(row);
  if (surface === "ingredient_or_nutrition_panel") return "Crop the ingredient and nutrition panel together; include serving size, net weight, and manufacturer/distributor text if visible.";
  if (surface === "document_text") return "Capture the ingredient, allergen, nutrition, or disclosure document block for this product/vintage slot.";
  if (surface === "ingredient_panel") return "Crop the ingredient statement panel with enough surrounding package context to preserve SKU/date cues.";
  if (surface === "package_identity_then_panel_hunt") return "Review the source for back/side-panel imagery; if no readable panel exists, keep this as secondary identity context and hunt for panel proof.";
  return "Find a source-attributable ingredient, nutrition, allergen, SmartLabel, or product-disclosure panel.";
}

function accessState(row = {}) {
  if (row.panel_acquisition_state === "source_discovery_needed" || row.panel_acquisition_state === "publishable_gap") return "source_discovery_needed";
  if (row.top_source_url) return "source_page_capture_needed";
  return "source_discovery_needed";
}

function recommendedAction(row = {}) {
  if (row.panel_acquisition_state === "secondary_context_only") {
    return "Use the listed product/source receipt for identity only; search or capture a readable ingredient/nutrition panel before OCR.";
  }
  if (row.panel_acquisition_state === "source_discovery_needed" || row.panel_acquisition_state === "publishable_gap") {
    return "Run source hunting for a readable panel or disclosure document; do not OCR product-front imagery as ingredient proof.";
  }
  return row.next_action || "Capture a private panel/document crop, run native OCR, and keep all text candidate-only until manual review.";
}

function imageMapKeys(row = {}) {
  return [row.top_evidence_id, `${row.product_id}:${row.top_evidence_id}`, row.top_source_url].filter(Boolean).join(";");
}

function queueRow(row = {}) {
  const gapCategory = ocrGapCategory(row);
  const strategy = captureStrategy(row);
  return {
    product_id: row.product_id,
    product_name: row.product_name,
    brand: "",
    category: row.category,
    corpus_scope: row.corpus_scope,
    vintage_label: row.version_label || row.vintage,
    version_id: row.version_id,
    evidence_id: row.top_evidence_id || `${row.product_id}:${row.version_id}:panel_source_needed`,
    evidence_kind: row.panel_acquisition_state,
    source_domain: sourceDomain(row),
    source_url: row.top_source_url || "",
    source_title: row.top_source_title || `${row.product_name} ${row.version_label || row.vintage} panel source needed`,
    source_owner: row.top_source_domain || "",
    panel_acquisition_state: row.panel_acquisition_state,
    ocr_priority: ocrPriority(row),
    ocr_gap_category: gapCategory,
    ocr_access_state: accessState(row),
    ocr_recommended_action: recommendedAction(row),
    registry_priority: row.priority,
    promotion_blocker: "Candidate-only: no ingredient or formulation claim may be promoted without corrected transcription and manual verification.",
    ground_truth_fields_missing: "private_panel_crop_path; ocr_lines; corrected_text; reviewer; manual_verified",
    image_reference: "",
    ingredient_panel_visible: /panel_source_candidate|public_panel_embed_candidate/.test(row.panel_acquisition_state) ? "candidate" : "",
    nutrition_panel_visible: /nutrition/i.test(row.label_panel_state || "") ? "candidate" : "",
    net_weight_visible: /net weight|net wt/i.test(`${row.label_panel_state || ""} ${row.photo_role || ""}`) ? "candidate" : "",
    capture_strategy: strategy,
    crop_target: cropTarget(row),
    ocr_expected_surface: expectedSurface(row),
    private_image_map_keys: imageMapKeys(row),
    rights_review_status: row.public_display_rule || "source_receipt_or_gap_only",
    allowed_public_output: "source receipt, hashes, OCR status, candidate text only after review; no private paths and no unverified claims",
    candidate_only: 1,
    manual_verified: 0,
  };
}

function sortRows(rows) {
  return [...rows].sort((a, b) => (
    numeric(b.priority) - numeric(a.priority)
    || (stateRank[a.panel_acquisition_state] ?? 9) - (stateRank[b.panel_acquisition_state] ?? 9)
    || String(a.product_name).localeCompare(String(b.product_name))
    || numeric(a.year) - numeric(b.year)
  ));
}

function selectRows(board, acquisitionRows, limit) {
  const source = acquisitionRows?.length
    ? acquisitionRows
    : board.top_slot_targets?.length
    ? board.top_slot_targets
    : [];
  const rows = source.filter((row) => Number(row.needs_panel_acquisition));
  return sortRows(rows).slice(0, limit);
}

function groupKey(row) {
  return [
    row.corpus_scope === "story_rich_pilot" ? "pilot" : "corpus",
    row.ocr_gap_category,
  ].join("__");
}

function buildBatches(queueRows, packetSize) {
  const groups = new Map();
  for (const row of queueRows) {
    const key = groupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const batches = [];
  for (const [key, rows] of groups.entries()) {
    for (let start = 0; start < rows.length; start += packetSize) {
      const slice = rows.slice(start, start + packetSize);
      const domains = [...new Set(slice.map((row) => row.source_domain).filter(Boolean))];
      const batchId = `panel_capture_${shortHash(`${key}:${start}:${slice.map((row) => row.evidence_id).join("|")}`, 14)}`;
      batches.push({
        batch_id: batchId,
        batch_rank: 0,
        batch_key: key,
        packet_size_target: packetSize,
        row_count: slice.length,
        source_domain: domains.length > 3 ? `mixed (${domains.length} domains)` : domains.join("; "),
        ocr_gap_category: slice[0].ocr_gap_category,
        ocr_priority: slice.some((row) => row.ocr_priority === "high") ? "high" : slice[0].ocr_priority,
        product_count: new Set(slice.map((row) => row.product_id)).size,
        evidence_ids: slice.map((row) => row.evidence_id).join(";"),
        product_names: [...new Set(slice.map((row) => row.product_name))].join("; "),
        capture_goal: slice[0].ocr_gap_category === "source_discovery_needed"
          ? "Use Spark/Grok for source-hunting leads, then attach a source-attributable panel/document candidate."
          : "Use Spark for bounded crop/capture instructions, then capture private panel/document crops for native OCR.",
        model_route: "gpt-5.3-codex-spark for capture packets; gpt-5.5 only after OCR; Grok only for source hunting or validation advice.",
        public_safety: "candidate-only; no private paths; no external image embeds; no manual_verified output",
        rows: slice,
      });
    }
  }
  return batches
    .sort((a, b) => (
      (a.ocr_priority === "high" ? 0 : 1) - (b.ocr_priority === "high" ? 0 : 1)
      || a.source_domain.localeCompare(b.source_domain)
      || a.batch_id.localeCompare(b.batch_id)
    ))
    .map((batch, index) => ({ ...batch, batch_rank: index + 1 }));
}

function batchCsvRows(batches) {
  return batches.map((batch) => ({
    batch_id: batch.batch_id,
    batch_rank: batch.batch_rank,
    row_count: batch.row_count,
    source_domain: batch.source_domain,
    ocr_gap_category: batch.ocr_gap_category,
    ocr_priority: batch.ocr_priority,
    product_count: batch.product_count,
    evidence_ids: batch.evidence_ids,
    product_names: batch.product_names,
    capture_goal: batch.capture_goal,
    model_route: batch.model_route,
    public_safety: batch.public_safety,
  }));
}

function renderRunbook(manifest) {
  const lines = [
    "# Panel-First Capture Batch Runbook",
    "",
    `Generated: ${manifest.generated_at}`,
    "",
    "This queue is built from the ingredient-panel acquisition board. It prioritizes ingredient, nutrition, allergen, SmartLabel, and disclosure panels before product-front/package context.",
    "",
    "## Totals",
    "",
    `- Selected panel tasks: ${manifest.totals.selected_rows}`,
    `- Spark-sized batches: ${manifest.totals.batch_count}`,
    `- High priority rows: ${manifest.totals.high_priority_rows}`,
    `- Pilot rows: ${manifest.totals.story_rich_pilot_rows}`,
    `- Source discovery rows: ${manifest.totals.source_discovery_rows}`,
    "",
    "## Operator Flow",
    "",
    "1. Run `node scripts/build-spark-ocr-packets.js --queue=docs/data/product-evidence/exports/panel_capture_ocr_queue.csv --run-id=panel-capture-v1 --limit=250 --packet-size=20 --group-mode=compact --public-model-summary=docs/data/product-evidence/exports/panel_capture_model_assist_summary.csv` to create private Spark packets.",
    "2. Use Spark output only for crop/source-review notes. It cannot verify ingredients or create `manual_verified`.",
    "3. Capture or crop source pages into `.cache/ingredient-ocr/runs/<run-id>/` only.",
    "4. Run native OCR, then batch-review compact OCR candidates before publishing any candidate text.",
    "",
    "## First Batches",
    "",
  ];
  for (const batch of manifest.batches.slice(0, 12)) {
    lines.push(`### ${batch.batch_rank}. ${batch.source_domain} / ${batch.ocr_gap_category}`);
    lines.push("");
    lines.push(`- Rows: ${batch.row_count}`);
    lines.push(`- Products: ${batch.product_names}`);
    lines.push(`- Goal: ${batch.capture_goal}`);
    lines.push(`- Safety: ${batch.public_safety}`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function buildManifest({ board, selectedRows, queueRows, batches, limit, packetSize }) {
  const count = (predicate) => queueRows.filter(predicate).length;
  return {
    schema_version: "panel_capture_batch_manifest.v1",
    generated_at: generatedAt,
    source_board: board.artifacts?.board_json || publicArtifactRef(boardPath),
    selection_policy: {
      scope: "Top ingredient-panel acquisition slots across the 120-product corpus.",
      limit,
      packet_size_target: packetSize,
      primary_visual_rule: "Ingredient/document panels are first-class OCR targets; product photos remain secondary context.",
      compatible_with: "scripts/build-spark-ocr-packets.js via --queue=docs/data/product-evidence/exports/panel_capture_ocr_queue.csv --group-mode=compact",
    },
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      external_images_committed: false,
      manual_verified_created: false,
      model_outputs_are_assistive: true,
    },
    totals: {
      board_slots: board.totals?.slots || 0,
      board_needs_panel_acquisition_slots: board.totals?.needs_panel_acquisition_slots || 0,
      selected_rows: queueRows.length,
      selected_source_slots: selectedRows.length,
      batch_count: batches.length,
      high_priority_rows: count((row) => row.ocr_priority === "high"),
      story_rich_pilot_rows: count((row) => row.corpus_scope === "story_rich_pilot"),
      panel_capture_rows: count((row) => row.ocr_gap_category === "panel_capture_needed"),
      readable_panel_photo_rows: count((row) => row.ocr_gap_category === "readable_panel_photo_needed"),
      source_discovery_rows: count((row) => row.ocr_gap_category === "source_discovery_needed"),
    },
    state_counts: countBy(queueRows, "panel_acquisition_state"),
    gap_counts: countBy(queueRows, "ocr_gap_category"),
    source_domain_counts: countBy(queueRows, "source_domain").slice(0, 16),
    artifacts: {
      manifest_json: publicArtifactRef(manifestPath),
      queue_csv: publicArtifactRef(queueCsvPath),
      batch_csv: publicArtifactRef(batchCsvPath),
      runbook_markdown: publicArtifactRef(runbookPath),
    },
    first_rows: queueRows.slice(0, 20),
    batches,
  };
}

function updateSummary(summary, manifest) {
  summary.panel_capture_batch_summary = {
    generated_at: manifest.generated_at,
    source_board: manifest.source_board,
    selection_policy: manifest.selection_policy,
    public_safety: manifest.public_safety,
    totals: manifest.totals,
    artifacts: manifest.artifacts,
    state_counts: manifest.state_counts,
    gap_counts: manifest.gap_counts,
    source_domain_counts: manifest.source_domain_counts,
    first_rows: manifest.first_rows.slice(0, 12),
    first_batches: manifest.batches.slice(0, 8).map((batch) => ({
      batch_id: batch.batch_id,
      batch_rank: batch.batch_rank,
      row_count: batch.row_count,
      source_domain: batch.source_domain,
      ocr_gap_category: batch.ocr_gap_category,
      product_names: batch.product_names,
      capture_goal: batch.capture_goal,
    })),
  };
}

function buildPanelCaptureBatches({ board, acquisitionRows = [], limit = 250, packetSize = 20 }) {
  const selectedRows = selectRows(board, acquisitionRows, limit);
  const queueRows = selectedRows.map(queueRow);
  const batches = buildBatches(queueRows, packetSize);
  const manifest = buildManifest({ board, selectedRows, queueRows, batches, limit, packetSize });
  return { manifest, queueRows, batches };
}

function main() {
  const board = readJson(boardPath, {});
  const acquisitionRows = fs.existsSync(acquisitionSlotCsvPath)
    ? parseCsv(fs.readFileSync(acquisitionSlotCsvPath, "utf8"))
    : [];
  const summary = readJson(summaryPath, {});
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const packetArg = process.argv.find((arg) => arg.startsWith("--packet-size="));
  const limit = limitArg ? numeric(limitArg.split("=").slice(1).join("=")) : 250;
  const packetSize = packetArg ? Math.min(Math.max(numeric(packetArg.split("=").slice(1).join("=")), 1), 50) : 20;
  const { manifest, queueRows, batches } = buildPanelCaptureBatches({ board, acquisitionRows, limit, packetSize });
  updateSummary(summary, manifest);

  writeJson(manifestPath, manifest);
  writeCsv(queueCsvPath, [
    "product_id",
    "product_name",
    "brand",
    "category",
    "corpus_scope",
    "vintage_label",
    "version_id",
    "evidence_id",
    "evidence_kind",
    "source_domain",
    "source_url",
    "source_title",
    "source_owner",
    "panel_acquisition_state",
    "ocr_priority",
    "ocr_gap_category",
    "ocr_access_state",
    "ocr_recommended_action",
    "registry_priority",
    "promotion_blocker",
    "ground_truth_fields_missing",
    "image_reference",
    "ingredient_panel_visible",
    "nutrition_panel_visible",
    "net_weight_visible",
    "capture_strategy",
    "crop_target",
    "ocr_expected_surface",
    "private_image_map_keys",
    "rights_review_status",
    "allowed_public_output",
    "candidate_only",
    "manual_verified",
  ], queueRows);
  writeCsv(batchCsvPath, [
    "batch_id",
    "batch_rank",
    "row_count",
    "source_domain",
    "ocr_gap_category",
    "ocr_priority",
    "product_count",
    "evidence_ids",
    "product_names",
    "capture_goal",
    "model_route",
    "public_safety",
  ], batchCsvRows(batches));
  fs.mkdirSync(path.dirname(runbookPath), { recursive: true });
  fs.writeFileSync(runbookPath, renderRunbook(manifest));
  writeJson(summaryPath, summary);

  console.log(JSON.stringify({
    selected_rows: manifest.totals.selected_rows,
    batch_count: manifest.totals.batch_count,
    high_priority_rows: manifest.totals.high_priority_rows,
    queue_csv: manifest.artifacts.queue_csv,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildPanelCaptureBatches,
  queueRow,
};
