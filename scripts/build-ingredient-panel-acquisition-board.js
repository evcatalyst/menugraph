const path = require("path");
const {
  normalizeText,
  publicArtifactRef,
  readJson,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const publicPhotoManifestPath = path.join(root, "docs/data/product-evidence/public_photo_proof_manifest.json");
const boardJsonPath = path.join(root, "docs/data/product-evidence/ingredient_panel_acquisition_board.json");
const slotCsvPath = path.join(root, "docs/data/product-evidence/exports/ingredient_panel_acquisition_slots.csv");
const productCsvPath = path.join(root, "docs/data/product-evidence/exports/ingredient_panel_acquisition_products.csv");
const markdownPath = path.join(root, "docs/data/product-evidence/exports/ingredient_panel_acquisition_report.md");
const generatedAt = "2026-06-07T23:45:00Z";

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

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sourceUrl(row = {}) {
  return normalizeText(row.source_photo_url || row.url || row.source_url || row.archive_url);
}

function sourceHost(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch (_error) {
    return normalizeText(value).replace(/^https?:\/\//, "").split("/")[0];
  }
}

function labelFor(value) {
  return normalizeText(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function publicImageIndex(manifest = {}) {
  const byEvidenceId = new Map();
  for (const row of manifest.published_images || []) {
    if (row.evidence_id && row.image_display_policy === "embed_rights_cleared" && (row.public_image_url || row.thumbnail_url)) {
      byEvidenceId.set(row.evidence_id, row);
    }
  }
  return byEvidenceId;
}

function isIngredientPanelProof(row = {}) {
  const documentText = [
    row.title,
    row.url,
    row.source_url,
    row.archive_url,
    row.source_photo_url,
  ].join(" ").toLowerCase();
  const panelText = [
    row.photo_role,
    row.label_panel_state,
    row.ocr_expected_surface,
  ].join(" ").toLowerCase();
  return Boolean(row.visible_extract)
    || /ingredient guide|product ingredient|nutrition guide|nutrition facts|allergen|smartlabel|\.pdf\b|pdf$/.test(documentText)
    || (!/not verified|not reviewed|not readable|front package|object visible/.test(panelText)
      && /ingredient panel visible|nutrition panel visible|label text candidate|readable ingredient|readable nutrition|partial package text|wrapper text|ingredient text candidate|current label source|document text/.test(panelText));
}

function versionEvidence(product, version) {
  const ids = new Set(version.evidence_ids || []);
  return (product.evidence || []).filter((row) => ids.has(row.id));
}

function bestSource(rows) {
  return [...rows].sort((a, b) => {
    const score = (row) => (
      (row.visible_extract ? 35 : 0)
      + (isIngredientPanelProof(row) ? 30 : 0)
      + (sourceUrl(row) ? 10 : 0)
      + (/label_text_candidate|label_visible|manual_verified/.test(row.status || "") ? 8 : 0)
    );
    return score(b) - score(a);
  })[0] || {};
}

function hasLabelCandidate(version, evidenceRows) {
  return Boolean(version.label_extract)
    || /label_text_candidate|label_visible|manual_verified/.test(version.status || "")
    || evidenceRows.some((row) => /label_text_candidate|label_visible|manual_verified/.test(row.status || "") || row.visible_extract);
}

function slotState({ version, evidenceRows, panelRows, publicPanelRows, manualVerified }) {
  if (manualVerified) return "manual_verified";
  if (publicPanelRows.length) return "public_panel_embed_candidate";
  if (panelRows.some((row) => sourceUrl(row))) return "panel_source_candidate";
  if (hasLabelCandidate(version, evidenceRows)) return "candidate_text_needs_photo";
  if (version.status === "gap_publishable") return "publishable_gap";
  if (evidenceRows.some((row) => sourceUrl(row))) return "secondary_context_only";
  return "source_discovery_needed";
}

function nextActionFor(state, version) {
  if (state === "manual_verified") return "Maintain reviewed transcription and use it as the slot's claim support.";
  if (state === "public_panel_embed_candidate") return "Show panel/document proof first, run/correct OCR, then require manual verification before any formulation claim.";
  if (state === "panel_source_candidate") return "Capture a private crop of the ingredient/nutrition/document panel, run native OCR, and batch-review the candidate text.";
  if (state === "candidate_text_needs_photo") return "Find or capture the source-attributable panel image behind the candidate text before presenting the recipe story as evidence-backed.";
  if (state === "publishable_gap") return "Keep the gap visible, but run source hunting for a vintage label or document that can replace the gap.";
  if (state === "secondary_context_only") return "Use existing product/package photos for identity only; hunt for a readable ingredient or nutrition panel for this vintage slot.";
  return `Run source discovery for ${version.label || version.vintage || "this vintage"} with queries targeting back-panel, ingredients, nutrition, allergen, or disclosure evidence.`;
}

function priorityFor(product, version, state, evidenceRows, panelRows) {
  let score = 0;
  if (pilotOrder.includes(product.id)) score += 44;
  if (product.corpus_scope === "story_rich_pilot") score += 24;
  if (state === "candidate_text_needs_photo") score += 30;
  if (state === "panel_source_candidate") score += 26;
  if (state === "secondary_context_only") score += 20;
  if (state === "source_discovery_needed") score += 18;
  if (state === "publishable_gap") score += 12;
  if (state === "public_panel_embed_candidate") score += 10;
  if (/current_2020s|earliest_verified_label|1990s/.test(version.vintage || "")) score += 10;
  if (numeric(version.year) && numeric(version.year) < 2000) score += 8;
  if (hasLabelCandidate(version, evidenceRows)) score += 8;
  if (panelRows.length) score += 5;
  return Math.max(0, score);
}

function slotRow(product, version, publicImagesByEvidenceId) {
  const evidenceRows = versionEvidence(product, version);
  const panelRows = evidenceRows.filter(isIngredientPanelProof);
  const publicPanelRows = panelRows.filter((row) => publicImagesByEvidenceId.has(row.id));
  const secondaryRows = evidenceRows.filter((row) => sourceUrl(row) && !panelRows.some((panel) => panel.id === row.id));
  const manualVerified = version.status === "manual_verified" || evidenceRows.some((row) => row.status === "manual_verified");
  const state = slotState({ version, evidenceRows, panelRows, publicPanelRows, manualVerified });
  const top = bestSource(panelRows.length ? panelRows : evidenceRows);
  const missingPrimaryPanel = !manualVerified && !panelRows.length && state !== "publishable_gap";
  const needsAcquisition = !manualVerified && !publicPanelRows.length && state !== "publishable_gap";
  return {
    product_id: product.id,
    product_name: product.name,
    category: product.category || "",
    corpus_scope: product.corpus_scope || "",
    version_id: version.id,
    vintage: version.vintage || version.id,
    version_label: version.label || version.id,
    year: version.year || "",
    version_status: version.status || "",
    panel_acquisition_state: state,
    priority: priorityFor(product, version, state, evidenceRows, panelRows),
    evidence_count: evidenceRows.length,
    primary_panel_candidate_count: panelRows.length,
    public_panel_embed_count: publicPanelRows.length,
    secondary_context_count: secondaryRows.length,
    candidate_text_available: hasLabelCandidate(version, evidenceRows) ? 1 : 0,
    manual_verified: manualVerified ? 1 : 0,
    missing_primary_panel: missingPrimaryPanel ? 1 : 0,
    needs_panel_acquisition: needsAcquisition ? 1 : 0,
    top_evidence_id: top.id || "",
    top_source_title: top.title || "",
    top_source_domain: sourceHost(sourceUrl(top)),
    top_source_url: sourceUrl(top),
    label_panel_state: top.label_panel_state || version.photo_quality?.label_panel || "",
    photo_role: top.photo_role || version.photo_quality?.role || "",
    public_display_rule: publicPanelRows.length ? "panel_or_document_can_embed_when_rights_clear" : "source_receipt_or_gap_only",
    next_action: nextActionFor(state, version),
  };
}

function productRollups(slotRows) {
  const products = new Map();
  for (const row of slotRows) {
    if (!products.has(row.product_id)) {
      products.set(row.product_id, {
        product_id: row.product_id,
        product_name: row.product_name,
        category: row.category,
        corpus_scope: row.corpus_scope,
        total_slots: 0,
        manual_verified_slots: 0,
        public_panel_embed_slots: 0,
        panel_source_candidate_slots: 0,
        candidate_text_needs_photo_slots: 0,
        secondary_context_only_slots: 0,
        source_discovery_needed_slots: 0,
        publishable_gap_slots: 0,
        missing_primary_panel_slots: 0,
        needs_panel_acquisition_slots: 0,
        top_priority: 0,
        next_target_vintage: "",
        next_action: "",
      });
    }
    const product = products.get(row.product_id);
    product.total_slots += 1;
    if (row.manual_verified) product.manual_verified_slots += 1;
    if (row.public_panel_embed_count) product.public_panel_embed_slots += 1;
    if (row.panel_acquisition_state === "panel_source_candidate") product.panel_source_candidate_slots += 1;
    if (row.panel_acquisition_state === "candidate_text_needs_photo") product.candidate_text_needs_photo_slots += 1;
    if (row.panel_acquisition_state === "secondary_context_only") product.secondary_context_only_slots += 1;
    if (row.panel_acquisition_state === "source_discovery_needed") product.source_discovery_needed_slots += 1;
    if (row.panel_acquisition_state === "publishable_gap") product.publishable_gap_slots += 1;
    if (row.missing_primary_panel) product.missing_primary_panel_slots += 1;
    if (row.needs_panel_acquisition) product.needs_panel_acquisition_slots += 1;
    if (row.priority > product.top_priority && row.needs_panel_acquisition) {
      product.top_priority = row.priority;
      product.next_target_vintage = row.version_label;
      product.next_action = row.next_action;
    }
  }
  return [...products.values()].sort((a, b) => (
    b.top_priority - a.top_priority
    || b.needs_panel_acquisition_slots - a.needs_panel_acquisition_slots
    || a.product_name.localeCompare(b.product_name)
  ));
}

function countBy(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const value = normalizeText(row[field]) || "unknown";
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }));
}

function buildBoard(navigatorData, publicPhotoManifest) {
  const publicImagesByEvidenceId = publicImageIndex(publicPhotoManifest);
  const slotRows = (navigatorData.products || [])
    .flatMap((product) => (product.versions || []).map((version) => slotRow(product, version, publicImagesByEvidenceId)))
    .sort((a, b) => b.priority - a.priority
      || b.needs_panel_acquisition - a.needs_panel_acquisition
      || a.product_name.localeCompare(b.product_name)
      || numeric(a.year) - numeric(b.year));
  const productRows = productRollups(slotRows);
  const targetRows = slotRows.filter((row) => Number(row.needs_panel_acquisition));
  const board = {
    schema_version: "ingredient_panel_acquisition_board.v1",
    generated_at: generatedAt,
    public_policy: {
      primary_rule: "Ingredient, nutrition, allergen, SmartLabel, or ingredient-guide/document panels are the primary photo proof for recipe history.",
      secondary_rule: "Product-front and package-object photos are secondary identity context unless a readable label panel is visible.",
      claim_rule: "No formulation claim is verified until corrected transcription and manual verification metadata exist.",
      public_image_rule: "Only rights-cleared public images may render inline; other sources stay as links/source receipts.",
    },
    totals: {
      products: (navigatorData.products || []).length,
      slots: slotRows.length,
      story_rich_pilot_products: productRows.filter((row) => row.corpus_scope === "story_rich_pilot").length,
      full_corpus_shell_products: productRows.filter((row) => row.corpus_scope === "full_corpus_shell").length,
      manual_verified_slots: slotRows.filter((row) => Number(row.manual_verified)).length,
      public_panel_embed_slots: slotRows.filter((row) => Number(row.public_panel_embed_count)).length,
      panel_source_candidate_slots: slotRows.filter((row) => row.panel_acquisition_state === "panel_source_candidate").length,
      candidate_text_needs_photo_slots: slotRows.filter((row) => row.panel_acquisition_state === "candidate_text_needs_photo").length,
      secondary_context_only_slots: slotRows.filter((row) => row.panel_acquisition_state === "secondary_context_only").length,
      source_discovery_needed_slots: slotRows.filter((row) => row.panel_acquisition_state === "source_discovery_needed").length,
      publishable_gap_slots: slotRows.filter((row) => row.panel_acquisition_state === "publishable_gap").length,
      missing_primary_panel_slots: slotRows.filter((row) => Number(row.missing_primary_panel)).length,
      needs_panel_acquisition_slots: targetRows.length,
      pilot_needs_panel_acquisition_slots: targetRows.filter((row) => row.corpus_scope === "story_rich_pilot").length,
    },
    artifacts: {
      board_json: publicArtifactRef(boardJsonPath),
      slot_csv: publicArtifactRef(slotCsvPath),
      product_csv: publicArtifactRef(productCsvPath),
      report_markdown: publicArtifactRef(markdownPath),
    },
    state_counts: countBy(slotRows, "panel_acquisition_state"),
    top_product_targets: productRows.slice(0, 30),
    top_slot_targets: targetRows.slice(0, 80),
  };
  return { board, slotRows, productRows };
}

function markdownReport(board) {
  return [
    "# Ingredient Panel Acquisition Board",
    "",
    `Generated: ${board.generated_at}`,
    "",
    board.public_policy.primary_rule,
    "",
    "## Totals",
    "",
    `- Products: ${board.totals.products}`,
    `- Vintage slots: ${board.totals.slots}`,
    `- Public primary panel/document embed slots: ${board.totals.public_panel_embed_slots}`,
    `- Manual verified slots: ${board.totals.manual_verified_slots}`,
    `- Needs panel acquisition slots: ${board.totals.needs_panel_acquisition_slots}`,
    `- Pilot slots needing panel acquisition: ${board.totals.pilot_needs_panel_acquisition_slots}`,
    "",
    "## Slot States",
    "",
    ...board.state_counts.map((row) => `- ${labelFor(row.value)}: ${row.count}`),
    "",
    "## Top Product Targets",
    "",
    ...board.top_product_targets.slice(0, 20).flatMap((row) => [
      `### ${row.product_name}`,
      "",
      `Needs acquisition: ${row.needs_panel_acquisition_slots}/${row.total_slots} · Missing primary panels: ${row.missing_primary_panel_slots}`,
      "",
      `Next vintage: ${row.next_target_vintage || "Review queue"}`,
      "",
      `Next action: ${row.next_action || "Review product evidence rows."}`,
      "",
    ]),
  ].join("\n");
}

function updateSummary(summary, board) {
  summary.ingredient_panel_acquisition_summary = {
    generated_at: board.generated_at,
    public_policy: board.public_policy,
    totals: board.totals,
    artifacts: board.artifacts,
    state_counts: board.state_counts,
    top_product_targets: board.top_product_targets.slice(0, 12),
    top_slot_targets: board.top_slot_targets.slice(0, 16),
  };
}

function main() {
  const navigatorData = readJson(navigatorPath, {});
  const publicPhotoManifest = readJson(publicPhotoManifestPath, {});
  const summary = readJson(summaryPath, {});
  const { board, slotRows, productRows } = buildBoard(navigatorData, publicPhotoManifest);
  updateSummary(summary, board);
  writeJson(boardJsonPath, board);
  writeCsv(slotCsvPath, [
    "product_id",
    "product_name",
    "category",
    "corpus_scope",
    "version_id",
    "vintage",
    "version_label",
    "year",
    "version_status",
    "panel_acquisition_state",
    "priority",
    "evidence_count",
    "primary_panel_candidate_count",
    "public_panel_embed_count",
    "secondary_context_count",
    "candidate_text_available",
    "manual_verified",
    "missing_primary_panel",
    "needs_panel_acquisition",
    "top_evidence_id",
    "top_source_title",
    "top_source_domain",
    "top_source_url",
    "label_panel_state",
    "photo_role",
    "public_display_rule",
    "next_action",
  ], slotRows);
  writeCsv(productCsvPath, [
    "product_id",
    "product_name",
    "category",
    "corpus_scope",
    "total_slots",
    "manual_verified_slots",
    "public_panel_embed_slots",
    "panel_source_candidate_slots",
    "candidate_text_needs_photo_slots",
    "secondary_context_only_slots",
    "source_discovery_needed_slots",
    "publishable_gap_slots",
    "missing_primary_panel_slots",
    "needs_panel_acquisition_slots",
    "top_priority",
    "next_target_vintage",
    "next_action",
  ], productRows);
  require("fs").mkdirSync(path.dirname(markdownPath), { recursive: true });
  require("fs").writeFileSync(markdownPath, `${markdownReport(board).trimEnd()}\n`);
  writeJson(summaryPath, summary);
  console.log(JSON.stringify({
    products: board.totals.products,
    slots: board.totals.slots,
    public_panel_embed_slots: board.totals.public_panel_embed_slots,
    needs_panel_acquisition_slots: board.totals.needs_panel_acquisition_slots,
    pilot_needs_panel_acquisition_slots: board.totals.pilot_needs_panel_acquisition_slots,
    board_json: board.artifacts.board_json,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildBoard,
  isIngredientPanelProof,
  slotRow,
};
