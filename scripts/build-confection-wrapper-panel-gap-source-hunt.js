const fs = require("fs");
const path = require("path");
const {
  countBy,
  generatedAt,
  normalizeText,
  parseCsv,
  publicArtifactRef,
  readJson,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const panelReviewCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_panel_candidate_review.csv");
const panelReviewJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_source_panel_candidate_review.json");
const sourceHuntJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_panel_gap_source_hunt.json");
const sourceHuntCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_panel_gap_source_hunt.csv");
const sourceHuntRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_panel_gap_source_hunt_runbook.md");
const runId = "cwa-panel-gap-source-hunt-v1";

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sourceHost(value = "") {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return normalizeText(value).replace(/^https?:\/\//, "").split("/")[0];
  }
}

function decadeBucket(vintage = "") {
  const text = normalizeText(vintage);
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) return `${yearMatch[0].slice(0, 3)}0s`;
  const decadeMatch = text.match(/\b(19|20)\d0s\b/);
  if (decadeMatch) return decadeMatch[0];
  return text || "unknown";
}

function quoteQuery(value = "") {
  const text = normalizeText(value).replace(/"/g, "");
  return text.includes(" ") ? `"${text}"` : text;
}

function queryPack(row = {}) {
  const product = normalizeText(row.product_name);
  const vintage = normalizeText(row.vintage_label);
  const decade = decadeBucket(vintage);
  const base = [vintage, product].filter(Boolean).join(" ");
  return [
    `${quoteQuery(base)} ingredients wrapper back panel`,
    `${quoteQuery(base)} nutrition facts wrapper`,
    `${quoteQuery(base)} candy wrapper back`,
    `${quoteQuery(`${decade} ${product}`)} ingredients label`,
    `${quoteQuery(product)} ${vintage} "net wt" wrapper`,
  ];
}

function gapStatusFor(row = {}) {
  if (numeric(row.explicit_panel_signal_candidates) > 0) return "panel_candidate_private_review_needed";
  if (numeric(row.wrapper_context_candidates) > 0) return "lineage_photo_only_back_panel_hunt_needed";
  return "manual_source_review_needed";
}

function priorityFor(row = {}) {
  let score = 0;
  const rank = numeric(row.packet_rank);
  if (rank && rank <= 12) score += 18;
  if (rank && rank <= 24) score += 8;
  if (numeric(row.wrapper_context_candidates) > 0) score += 30;
  if (numeric(row.explicit_panel_signal_candidates) === 0) score += 22;
  if (numeric(row.high_priority_panel_candidates) > 0) score += 12;
  if (numeric(row.image_candidate_count) >= 7) score += 6;
  if (/19\d{2}|19\d0s/.test(row.vintage_label || "")) score += 8;
  return score;
}

function nextActionFor(status) {
  if (status === "panel_candidate_private_review_needed") {
    return "Privately inspect panel-signal candidates, crop ingredient panel first and nutrition panel second, then run native OCR.";
  }
  if (status === "lineage_photo_only_back_panel_hunt_needed") {
    return "Use the CWA wrapper photo as dated product context, then hunt a readable back/side ingredient or nutrition panel for the same product and vintage.";
  }
  return "Open the source page manually, confirm whether any image candidate is useful, and create a source-discovery lead if no panel is visible.";
}

function sourceHuntRow(row = {}) {
  const status = gapStatusFor(row);
  const queries = queryPack(row);
  return {
    run_id: runId,
    packet_id: row.packet_id,
    packet_rank: row.packet_rank,
    product_id: row.product_id,
    product_name: row.product_name,
    vintage_label: row.vintage_label,
    vintage_bucket: decadeBucket(row.vintage_label),
    source_domain: sourceHost(row.source_url),
    source_url: row.source_url,
    source_title: row.source_title,
    panel_gap_status: status,
    proof_lane: "ingredient_panel_source_hunt",
    existing_source_role: numeric(row.wrapper_context_candidates) > 0 ? "dated_wrapper_lineage_context" : "source_page_reference",
    existing_image_candidate_count: row.image_candidate_count,
    explicit_panel_signal_candidates: row.explicit_panel_signal_candidates,
    wrapper_context_candidates: row.wrapper_context_candidates,
    low_signal_candidates: row.low_signal_candidates,
    missing_primary_surfaces: "ingredient_panel;nutrition_panel",
    missing_support_surfaces: "net_weight;manufacturer_or_distributor;serving_size;date_or_lot_cue",
    preferred_source_types: "back_panel_photo;side_panel_photo;auction_listing_photo;collector_listing_photo;brand_archive;retailer_label;archive_capture",
    source_hunt_queries: queries.join("; "),
    grok_research_packet: `Research assist only: find source-attributable ${row.product_name} ${row.vintage_label} ingredient, nutrition, or back-panel photo leads. Treat CWA as dated wrapper context only; return source URLs and confidence warnings, not verified claims.`,
    review_sequence: "1_private_visual_review_existing_cwa;2_back_panel_source_hunt;3_private_crop;4_native_ocr;5_corrected_transcription;6_manual_verification",
    priority: priorityFor(row),
    next_action: nextActionFor(status),
    candidate_only: 1,
    manual_verified: 0,
  };
}

function buildRows(panelReviewRows = []) {
  return panelReviewRows
    .map(sourceHuntRow)
    .sort((a, b) => (
      numeric(b.priority) - numeric(a.priority)
      || numeric(a.packet_rank) - numeric(b.packet_rank)
      || a.product_name.localeCompare(b.product_name)
      || a.vintage_label.localeCompare(b.vintage_label)
    ));
}

function productRollups(rows = []) {
  const products = new Map();
  for (const row of rows) {
    if (!products.has(row.product_id)) {
      products.set(row.product_id, {
        product_id: row.product_id,
        product_name: row.product_name,
        gap_rows: 0,
        wrapper_context_only_rows: 0,
        panel_candidate_rows: 0,
        top_priority: 0,
        next_target_vintage: "",
        next_action: "",
      });
    }
    const product = products.get(row.product_id);
    product.gap_rows += 1;
    if (row.panel_gap_status === "lineage_photo_only_back_panel_hunt_needed") product.wrapper_context_only_rows += 1;
    if (row.panel_gap_status === "panel_candidate_private_review_needed") product.panel_candidate_rows += 1;
    if (numeric(row.priority) > product.top_priority) {
      product.top_priority = numeric(row.priority);
      product.next_target_vintage = row.vintage_label;
      product.next_action = row.next_action;
    }
  }
  return [...products.values()].sort((a, b) => (
    b.top_priority - a.top_priority
    || b.gap_rows - a.gap_rows
    || a.product_name.localeCompare(b.product_name)
  ));
}

function buildManifest(rows = [], panelReviewSummary = {}) {
  return {
    schema_version: "confection_wrapper_panel_gap_source_hunt.v1",
    generated_at: generatedAt,
    run_id: runId,
    source_panel_review: publicArtifactRef(panelReviewJsonPath),
    selection_policy: {
      primary_rule: "Ingredient panel photos are primary evidence; nutrition panels are second; product/wrapper photos are secondary identity context.",
      source_rule: "Candy Wrapper Archive lineage pages can support product/vintage context, but not formulation claims until a readable ingredient or nutrition panel is cropped, OCRed, corrected, and manually verified.",
      grok_rule: "Grok/source-hunt prompts are research assists only and cannot create verified claims.",
    },
    totals: {
      source_packets: rows.length,
      products: new Set(rows.map((row) => row.product_id)).size,
      panel_candidate_private_review_needed: rows.filter((row) => row.panel_gap_status === "panel_candidate_private_review_needed").length,
      lineage_photo_only_back_panel_hunt_needed: rows.filter((row) => row.panel_gap_status === "lineage_photo_only_back_panel_hunt_needed").length,
      manual_source_review_needed: rows.filter((row) => row.panel_gap_status === "manual_source_review_needed").length,
      candidate_only_rows: rows.filter((row) => Number(row.candidate_only)).length,
      manual_verified_rows: rows.filter((row) => Number(row.manual_verified)).length,
      source_panel_review_packets_with_panel_signal: panelReviewSummary.packets_with_explicit_panel_signal || 0,
      source_panel_review_wrapper_context_only: panelReviewSummary.packets_with_wrapper_context_only || 0,
    },
    by_status: countBy(rows, "panel_gap_status"),
    by_product: countBy(rows, "product_name"),
    by_vintage_bucket: countBy(rows, "vintage_bucket"),
    product_rollups: productRollups(rows),
    first_rows: rows.slice(0, 16),
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      image_urls_committed: false,
      images_committed: false,
      ocr_text_committed: false,
      manual_verified_created: false,
    },
    artifacts: {
      source_hunt_csv: publicArtifactRef(sourceHuntCsvPath),
      source_hunt_json: publicArtifactRef(sourceHuntJsonPath),
      source_hunt_runbook_md: publicArtifactRef(sourceHuntRunbookPath),
    },
    rows,
  };
}

function renderRunbook(manifest = {}) {
  const lines = [
    "# CWA Ingredient Panel Gap Source Hunt",
    "",
    `Generated: ${manifest.generated_at || generatedAt}`,
    `Run ID: ${manifest.run_id || runId}`,
    "",
    "This queue converts Candy Wrapper Archive lineage photos into ingredient-panel source-hunt work. It is intentionally conservative: wrapper photos are dated product context, not ingredient proof.",
    "",
    "## Current State",
    "",
    `- Source packets: ${manifest.totals?.source_packets || 0}`,
    `- Products: ${manifest.totals?.products || 0}`,
    `- Back-panel hunts needed from wrapper-only lineage: ${manifest.totals?.lineage_photo_only_back_panel_hunt_needed || 0}`,
    `- Panel candidates ready for private review: ${manifest.totals?.panel_candidate_private_review_needed || 0}`,
    `- Manual verified rows created: ${manifest.totals?.manual_verified_rows || 0}`,
    "",
    "## Operator Path",
    "",
    "1. Use CWA as the dated product/wrapper lineage anchor.",
    "2. Run the generated source-hunt queries for readable back, side, ingredient, or nutrition panel photos.",
    "3. Keep source leads link-only unless rights review clears public image reuse.",
    "4. Capture ingredient panels first, nutrition panels second, then support surfaces such as net weight and manufacturer text.",
    "5. Run native OCR and keep text candidate-only until corrected transcription and manual verification.",
    "",
    "## First Targets",
    "",
  ];
  for (const row of (manifest.first_rows || []).slice(0, 12)) {
    lines.push(`- ${row.product_name} / ${row.vintage_label}: ${row.panel_gap_status}; ${row.next_action}`);
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function writePanelGapSourceHunt() {
  const panelReviewRows = parseCsv(fs.readFileSync(panelReviewCsvPath, "utf8"));
  const panelReviewSummary = readJson(panelReviewJsonPath, {});
  const rows = buildRows(panelReviewRows);
  const manifest = buildManifest(rows, panelReviewSummary);
  writeJson(sourceHuntJsonPath, manifest);
  writeCsv(sourceHuntCsvPath, [
    "run_id",
    "packet_id",
    "packet_rank",
    "product_id",
    "product_name",
    "vintage_label",
    "vintage_bucket",
    "source_domain",
    "source_url",
    "source_title",
    "panel_gap_status",
    "proof_lane",
    "existing_source_role",
    "existing_image_candidate_count",
    "explicit_panel_signal_candidates",
    "wrapper_context_candidates",
    "low_signal_candidates",
    "missing_primary_surfaces",
    "missing_support_surfaces",
    "preferred_source_types",
    "source_hunt_queries",
    "grok_research_packet",
    "review_sequence",
    "priority",
    "next_action",
    "candidate_only",
    "manual_verified",
  ], rows);
  fs.mkdirSync(path.dirname(sourceHuntRunbookPath), { recursive: true });
  fs.writeFileSync(sourceHuntRunbookPath, renderRunbook(manifest));

  const summary = readJson(summaryPath, {});
  const publicSummary = {
    generated_at: manifest.generated_at,
    run_id: manifest.run_id,
    source_panel_review: manifest.source_panel_review,
    selection_policy: manifest.selection_policy,
    totals: manifest.totals,
    by_status: manifest.by_status,
    by_product: manifest.by_product,
    by_vintage_bucket: manifest.by_vintage_bucket,
    product_rollups: manifest.product_rollups,
    first_rows: manifest.first_rows.slice(0, 10),
    public_safety: manifest.public_safety,
    artifacts: manifest.artifacts,
  };
  summary.confection_wrapper_panel_gap_source_hunt_summary = publicSummary;
  summary.confection_wrapper_source_panel_candidate_review_summary = summary.confection_wrapper_source_panel_candidate_review_summary || {};
  summary.confection_wrapper_source_panel_candidate_review_summary.panel_gap_source_hunt_summary = publicSummary;
  summary.confection_wrapper_source_panel_candidate_review_summary.public_artifacts = {
    ...(summary.confection_wrapper_source_panel_candidate_review_summary.public_artifacts || {}),
    ...manifest.artifacts,
  };
  summary.confection_wrapper_ingredient_priority_summary = summary.confection_wrapper_ingredient_priority_summary || {};
  summary.confection_wrapper_ingredient_priority_summary.panel_gap_source_hunt_summary = publicSummary;
  summary.confection_wrapper_ingredient_priority_summary.artifacts = {
    ...(summary.confection_wrapper_ingredient_priority_summary.artifacts || {}),
    ...manifest.artifacts,
  };
  writeJson(summaryPath, summary);
  return manifest;
}

if (require.main === module) {
  const manifest = writePanelGapSourceHunt();
  console.log(JSON.stringify({
    run_id: manifest.run_id,
    source_packets: manifest.totals.source_packets,
    products: manifest.totals.products,
    lineage_photo_only_back_panel_hunt_needed: manifest.totals.lineage_photo_only_back_panel_hunt_needed,
    panel_candidate_private_review_needed: manifest.totals.panel_candidate_private_review_needed,
  }, null, 2));
}

module.exports = {
  buildManifest,
  buildRows,
  gapStatusFor,
  queryPack,
  sourceHuntRow,
  writePanelGapSourceHunt,
};
