const fs = require("fs");
const path = require("path");
const {
  countBy,
  generatedAt,
  parseCsv,
  publicArtifactRef,
  readJson,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const lineageJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_lineage_priority.json");
const storySeedJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_story_seeds.json");
const ingredientPriorityJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_priority.json");
const panelReviewJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_source_panel_candidate_review.json");
const panelReviewCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_panel_candidate_review.csv");
const panelGapJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_panel_gap_source_hunt.json");
const sourceImageIntakeJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_source_image_intake.json");
const sourceImageIntakeCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_image_intake.csv");
const itemCandidateGapCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_candidate_gaps.csv");
const productQueueJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_product_story_queue.json");
const productQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_product_story_queue.csv");
const productQueueRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_product_story_queue_runbook.md");

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstSourceUrl(row = {}, seed = {}) {
  return seed.first_source_url || String(row.source_urls || "").split(";").find(Boolean) || "";
}

function firstSourceTitle(row = {}, seed = {}) {
  return seed.first_source_title || String(row.first_item_titles || "").split(";").find(Boolean) || "";
}

function earliestMarkerValue(row = {}, seed = {}) {
  const text = `${seed.earliest_vintage_label || ""} ${row.year_or_decade_markers || ""} ${row.lineage_span_label || ""}`;
  const year = text.match(/\b(19|20)\d{2}\b/);
  if (year) return Number(year[0]);
  const decade = text.match(/\b(19|20)\d0s\b/);
  if (decade) return Number(decade[0].slice(0, 4));
  return 9999;
}

function groupRows(rows = [], key) {
  const map = new Map();
  for (const row of rows) {
    const value = row[key] || "";
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
  }
  return map;
}

function rowsForProductName(map = new Map(), productName = "") {
  const names = unique([productName, productName.replace("&", "&amp;")]);
  return names.flatMap((name) => map.get(name) || []);
}

function productQueueState(lineageRow = {}) {
  if (numeric(lineageRow.item_page_count) > 0) return "cwa_package_story_candidate";
  return "cwa_source_hunt_gap";
}

function sourceSiteReadiness(lineageRow = {}) {
  if (numeric(lineageRow.item_page_count) > 0) return "dated_wrapper_lineage_available";
  return "needs_item_level_cwa_or_equivalent_source";
}

function ingredientEvidenceState({ ingredientTargets = 0, readyForOcr = 0, verifiedLabels = 0, explicitPanelSignals = 0 } = {}) {
  if (verifiedLabels > 0) return "verified_label_available";
  if (readyForOcr > 0) return "readable_crop_ready_for_ocr";
  if (explicitPanelSignals > 0) return "panel_signal_needs_private_crop";
  if (ingredientTargets > 0) return "lineage_photo_only_back_panel_hunt_needed";
  return "source_hunt_before_panel_review";
}

function reviewBlocker(state = "") {
  if (state === "cwa_source_hunt_gap") {
    return "Attach item-level CWA pages or equivalent source-attributable wrapper photos before building a package story.";
  }
  return "Ingredient story remains blocked until a readable ingredient/nutrition panel is privately cropped, OCRed or transcribed, corrected, and manually verified.";
}

function nextAction(row = {}) {
  if (row.product_queue_state === "cwa_source_hunt_gap") {
    return "Run constrained Candy Wrapper Archive item/collection searches, attach source URLs, then regenerate the item-candidate and panel-review pipeline.";
  }
  if (row.explicit_panel_signal_source_eras > 0) {
    return "Privately crop the panel-signal source eras first, run native OCR on readable text, then manually verify corrected ingredients.";
  }
  return "Use the CWA pages as dated wrapper lineage, inspect each source image for back/side panels, and run back-panel source hunts for eras that remain wrapper-front only.";
}

function queueScore({ lineageRow = {}, seed = {}, sourceImageCandidateCount = 0, panelGapRows = 0 }) {
  const earliest = earliestMarkerValue(lineageRow, seed);
  const oldAnchorBonus = earliest <= 1920 ? 30 : earliest <= 1950 ? 22 : earliest <= 1970 ? 12 : 0;
  const gapPenalty = numeric(lineageRow.item_page_count) > 0 ? 0 : 60;
  return numeric(lineageRow.reviewer_priority_score)
    + numeric(seed.ingredient_panel_targets) * 3
    + numeric(seed.nutrition_panel_targets) * 2
    + Math.min(sourceImageCandidateCount, 50)
    + panelGapRows
    + oldAnchorBonus
    - gapPenalty;
}

function sourceHuntQueriesFor(productId = "", gapRows = []) {
  const row = gapRows.find((gap) => gap.product_id === productId) || {};
  return row.source_hunt_queries || row.search_queries || "";
}

function productRow({
  lineageRow = {},
  seed = {},
  ingredientProduct = {},
  panelRows = [],
  panelGapRows = [],
  sourceImageRows = [],
  itemGapRows = [],
}) {
  const state = productQueueState(lineageRow);
  const explicitPanelSignals = panelRows.reduce((sum, row) => sum + numeric(row.explicit_panel_signal_candidates), 0);
  const wrapperContextCandidates = panelRows.reduce((sum, row) => sum + numeric(row.wrapper_context_candidates), 0);
  const sourceImageCandidateCount = sourceImageRows.reduce((sum, row) => sum + numeric(row.image_candidate_count), 0);
  const ingredientTargets = numeric(seed.ingredient_panel_targets || ingredientProduct.ingredient_panel_rows);
  const nutritionTargets = numeric(seed.nutrition_panel_targets || ingredientProduct.nutrition_panel_rows);
  const supportTargets = numeric(seed.support_text_targets || ingredientProduct.support_text_rows);
  const secondaryTargets = numeric(seed.secondary_context_targets || lineageRow.item_page_count);
  const readyForOcr = numeric(seed.readable_for_ocr || ingredientProduct.ready_for_ocr || lineageRow.readable_for_ocr);
  const verifiedLabels = numeric(seed.verified_ingredient_labels || ingredientProduct.verified_ingredient_labels || lineageRow.manual_verified_labels);
  const ingredientState = ingredientEvidenceState({
    ingredientTargets,
    readyForOcr,
    verifiedLabels,
    explicitPanelSignals,
  });
  const row = {
    product_id: lineageRow.product_id || seed.product_id || ingredientProduct.product_id || itemGapRows[0]?.product_id || "",
    product_name: lineageRow.product_name || seed.product_name || ingredientProduct.product_name || itemGapRows[0]?.product_name || "",
    product_queue_state: state,
    source_site_readiness: sourceSiteReadiness(lineageRow),
    story_readiness_state: state === "cwa_package_story_candidate"
      ? "package_lineage_story_ready_ingredient_blocked"
      : "source_hunt_needed_before_story",
    ingredient_evidence_state: ingredientState,
    source_domain: "www.candywrapperarchive.com",
    priority_tier: lineageRow.priority_tier || seed.priority_tier || "source_hunt_gap",
    lineage_span_label: lineageRow.lineage_span_label || seed.lineage_span_label || "source hunt",
    item_page_count: numeric(lineageRow.item_page_count),
    source_era_count: numeric(seed.source_era_count || lineageRow.item_page_count),
    source_url_count: numeric(seed.source_url_count) || unique(String(lineageRow.source_urls || "").split(";")).length,
    exact_year_count: numeric(lineageRow.exact_year_count || seed.exact_year_count),
    decade_count: numeric(lineageRow.decade_count || seed.decade_count),
    earliest_vintage_label: seed.earliest_vintage_label || String(lineageRow.year_or_decade_markers || "").split(";").find(Boolean) || "",
    latest_vintage_label: seed.latest_vintage_label || "",
    primary_photo_rule: "ingredient_and_nutrition_panels_first",
    secondary_photo_rule: "wrapper_front_or_product_photo_is_package_context_only",
    ingredient_panel_targets: ingredientTargets,
    nutrition_panel_targets: nutritionTargets,
    primary_panel_targets: ingredientTargets + nutritionTargets,
    support_text_targets: supportTargets,
    secondary_context_targets: secondaryTargets,
    explicit_panel_signal_source_eras: panelRows.filter((panel) => numeric(panel.explicit_panel_signal_candidates) > 0).length,
    wrapper_context_only_source_eras: panelRows.filter((panel) => numeric(panel.wrapper_context_candidates) > 0 && numeric(panel.explicit_panel_signal_candidates) === 0).length,
    wrapper_context_candidate_count: wrapperContextCandidates,
    source_image_candidate_count: sourceImageCandidateCount,
    back_panel_hunt_needed_rows: panelGapRows.length,
    source_hunt_gap_count: numeric(lineageRow.source_hunt_gap_count || itemGapRows.length),
    readable_for_ocr: readyForOcr,
    verified_ingredient_labels: verifiedLabels,
    first_source_title: firstSourceTitle(lineageRow, seed),
    first_source_url: firstSourceUrl(lineageRow, seed),
    source_hunt_queries: sourceHuntQueriesFor(lineageRow.product_id, itemGapRows),
    claim_gate: "blocked_until_readable_panel_crop_ocr_correction_and_manual_verification",
    publication_image_policy: "source_link_only_no_external_image_reuse_until_rights_review",
    review_blocker: reviewBlocker(state),
    next_action: "",
    candidate_only: 1,
    manual_verified: 0,
  };
  row.product_priority_score = queueScore({
    lineageRow,
    seed,
    sourceImageCandidateCount,
    panelGapRows: panelGapRows.length,
  });
  row.next_action = nextAction(row);
  return row;
}

function buildQueueRows({
  lineageManifest = {},
  storyManifest = {},
  ingredientManifest = {},
  panelReviewManifest = {},
  panelGapManifest = {},
  sourceImageManifest = {},
  itemGapRows = [],
} = {}) {
  const seedsByProduct = new Map((storyManifest.story_seeds || []).map((seed) => [seed.product_id, seed]));
  const ingredientByProduct = new Map((ingredientManifest.product_priorities || []).map((product) => [product.product_id, product]));
  const productNameById = new Map((lineageManifest.rows || []).map((row) => [row.product_id, row.product_name]));
  const idByProductName = new Map((lineageManifest.rows || []).map((row) => [row.product_name, row.product_id]));
  const panelRowsByName = groupRows(panelReviewManifest.rows || [], "product_name");
  const panelGapRowsById = groupRows(panelGapManifest.rows || [], "product_id");
  const imageRowsByName = groupRows(sourceImageManifest.rows || [], "product_name");
  const itemGapRowsById = groupRows(itemGapRows, "product_id");
  const productIds = unique([
    ...(lineageManifest.rows || []).map((row) => row.product_id),
    ...(storyManifest.story_seeds || []).map((row) => row.product_id),
    ...(ingredientManifest.product_priorities || []).map((row) => row.product_id),
    ...itemGapRows.map((row) => row.product_id),
  ]);

  return productIds.map((productId) => {
    const lineageRow = (lineageManifest.rows || []).find((row) => row.product_id === productId)
      || { product_id: productId, product_name: productNameById.get(productId) || itemGapRowsById.get(productId)?.[0]?.product_name || productId };
    const productName = lineageRow.product_name || productNameById.get(productId) || "";
    const matchedPanelRows = rowsForProductName(panelRowsByName, productName);
    const matchedImageRows = rowsForProductName(imageRowsByName, productName);
    return productRow({
      lineageRow,
      seed: seedsByProduct.get(productId) || {},
      ingredientProduct: ingredientByProduct.get(productId) || {},
      panelRows: matchedPanelRows.length ? matchedPanelRows : panelRowsByName.get(productNameById.get(productId)) || [],
      panelGapRows: panelGapRowsById.get(productId) || [],
      sourceImageRows: matchedImageRows.length ? matchedImageRows : imageRowsByName.get(productNameById.get(productId)) || [],
      itemGapRows: itemGapRowsById.get(productId) || [],
    });
  }).sort((a, b) => (
    numeric(b.item_page_count > 0 ? 1 : 0) - numeric(a.item_page_count > 0 ? 1 : 0)
    || numeric(b.product_priority_score) - numeric(a.product_priority_score)
    || String(a.product_name).localeCompare(String(b.product_name))
  )).map((row, index) => ({
    product_queue_rank: index + 1,
    ...row,
  }));
}

function buildManifest(rows = []) {
  const storyRows = rows.filter((row) => row.product_queue_state === "cwa_package_story_candidate");
  const gapRows = rows.filter((row) => row.product_queue_state === "cwa_source_hunt_gap");
  const totals = {
    product_queue_rows: rows.length,
    package_story_candidate_products: storyRows.length,
    source_hunt_gap_products: gapRows.length,
    source_eras: rows.reduce((sum, row) => sum + numeric(row.source_era_count), 0),
    item_pages: rows.reduce((sum, row) => sum + numeric(row.item_page_count), 0),
    ingredient_panel_targets: rows.reduce((sum, row) => sum + numeric(row.ingredient_panel_targets), 0),
    nutrition_panel_targets: rows.reduce((sum, row) => sum + numeric(row.nutrition_panel_targets), 0),
    primary_panel_targets: rows.reduce((sum, row) => sum + numeric(row.primary_panel_targets), 0),
    support_text_targets: rows.reduce((sum, row) => sum + numeric(row.support_text_targets), 0),
    secondary_context_targets: rows.reduce((sum, row) => sum + numeric(row.secondary_context_targets), 0),
    explicit_panel_signal_source_eras: rows.reduce((sum, row) => sum + numeric(row.explicit_panel_signal_source_eras), 0),
    wrapper_context_only_source_eras: rows.reduce((sum, row) => sum + numeric(row.wrapper_context_only_source_eras), 0),
    source_image_candidates: rows.reduce((sum, row) => sum + numeric(row.source_image_candidate_count), 0),
    back_panel_hunt_needed_rows: rows.reduce((sum, row) => sum + numeric(row.back_panel_hunt_needed_rows), 0),
    readable_for_ocr: rows.reduce((sum, row) => sum + numeric(row.readable_for_ocr), 0),
    verified_ingredient_labels: rows.reduce((sum, row) => sum + numeric(row.verified_ingredient_labels), 0),
  };
  return {
    schema_version: "confection_wrapper_product_story_queue.v1",
    generated_at: generatedAt,
    source_domain: "www.candywrapperarchive.com",
    source_site_strategy: {
      why_prioritized: "Candy Wrapper Archive provides product-specific historical wrapper pages with dating, maker, size, and visual lineage cues, so confection products from this source should be prioritized before broader generic hunting.",
      primary_visual_rule: "Ingredient and nutrition panels are the primary proof photos.",
      secondary_visual_rule: "Wrapper fronts and product photos are secondary package context unless readable label text is visible.",
      claim_gate: "No recipe or ingredient-change claim is promoted until readable panel text is OCRed/transcribed, corrected, manually verified, and tied to source evidence.",
    },
    public_safety: {
      candidate_only: true,
      external_images_committed: false,
      private_paths_committed: false,
      ocr_text_committed: false,
      ingredient_claims_promoted: false,
      manual_verified_created: false,
    },
    totals,
    by_queue_state: countBy(rows, "product_queue_state"),
    by_ingredient_evidence_state: countBy(rows, "ingredient_evidence_state"),
    top_story_targets: storyRows.slice(0, 9),
    source_hunt_targets: gapRows,
    first_rows: rows.slice(0, 12),
    artifacts: {
      product_story_queue_json: publicArtifactRef(productQueueJsonPath),
      product_story_queue_csv: publicArtifactRef(productQueueCsvPath),
      product_story_queue_runbook_md: publicArtifactRef(productQueueRunbookPath),
    },
    rows,
  };
}

function renderRunbook(manifest = {}) {
  const totals = manifest.totals || {};
  const lines = [
    "# Candy Wrapper Archive Product Story Queue",
    "",
    `Generated: ${manifest.generated_at || generatedAt}`,
    "",
    "This queue makes Candy Wrapper Archive a first-priority source-site lane for confection products. It ranks products for package-story work while keeping ingredient proof blocked until readable label panels are reviewed.",
    "",
    "## Visual Priority",
    "",
    "1. Ingredient panels are primary.",
    "2. Nutrition panels are second.",
    "3. Back/side wrapper text, net weight, maker, and date cues support identity and normalization.",
    "4. Wrapper-front/product photos are secondary context unless they expose readable label text.",
    "",
    "## Totals",
    "",
    `- Queue rows: ${totals.product_queue_rows || 0}`,
    `- Package-story candidates: ${totals.package_story_candidate_products || 0}`,
    `- Source-hunt gaps: ${totals.source_hunt_gap_products || 0}`,
    `- Source eras: ${totals.source_eras || 0}`,
    `- Primary ingredient/nutrition panel targets: ${totals.primary_panel_targets || 0}`,
    `- Wrapper-context-only eras: ${totals.wrapper_context_only_source_eras || 0}`,
    `- Back-panel hunt rows: ${totals.back_panel_hunt_needed_rows || 0}`,
    `- Verified ingredient labels: ${totals.verified_ingredient_labels || 0}`,
    "",
    "## First Targets",
    "",
  ];
  for (const row of manifest.top_story_targets || []) {
    lines.push(`- ${row.product_queue_rank}. ${row.product_name}: ${row.lineage_span_label}, ${row.source_era_count} source eras, ${row.primary_panel_targets} primary panel targets; ${row.next_action}`);
  }
  if ((manifest.source_hunt_targets || []).length) {
    lines.push("");
    lines.push("## Source-Hunt Gaps");
    lines.push("");
    for (const row of manifest.source_hunt_targets) {
      lines.push(`- ${row.product_name}: ${row.next_action}`);
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function writeProductStoryQueue() {
  const lineageManifest = readJson(lineageJsonPath, {});
  const storyManifest = readJson(storySeedJsonPath, {});
  const ingredientManifest = readJson(ingredientPriorityJsonPath, {});
  const panelReviewManifest = readJson(panelReviewJsonPath, {});
  const panelGapManifest = readJson(panelGapJsonPath, {});
  const sourceImageManifest = readJson(sourceImageIntakeJsonPath, {});
  panelReviewManifest.rows = panelReviewManifest.rows || (fs.existsSync(panelReviewCsvPath)
    ? parseCsv(fs.readFileSync(panelReviewCsvPath, "utf8"))
    : []);
  sourceImageManifest.rows = sourceImageManifest.rows || (fs.existsSync(sourceImageIntakeCsvPath)
    ? parseCsv(fs.readFileSync(sourceImageIntakeCsvPath, "utf8"))
    : []);
  const itemGapRows = fs.existsSync(itemCandidateGapCsvPath)
    ? parseCsv(fs.readFileSync(itemCandidateGapCsvPath, "utf8"))
    : [];
  const rows = buildQueueRows({
    lineageManifest,
    storyManifest,
    ingredientManifest,
    panelReviewManifest,
    panelGapManifest,
    sourceImageManifest,
    itemGapRows,
  });
  const manifest = buildManifest(rows);

  writeJson(productQueueJsonPath, manifest);
  writeCsv(productQueueCsvPath, [
    "product_queue_rank",
    "product_id",
    "product_name",
    "product_priority_score",
    "product_queue_state",
    "source_site_readiness",
    "story_readiness_state",
    "ingredient_evidence_state",
    "priority_tier",
    "lineage_span_label",
    "item_page_count",
    "source_era_count",
    "source_url_count",
    "exact_year_count",
    "decade_count",
    "earliest_vintage_label",
    "latest_vintage_label",
    "primary_photo_rule",
    "secondary_photo_rule",
    "ingredient_panel_targets",
    "nutrition_panel_targets",
    "primary_panel_targets",
    "support_text_targets",
    "secondary_context_targets",
    "explicit_panel_signal_source_eras",
    "wrapper_context_only_source_eras",
    "wrapper_context_candidate_count",
    "source_image_candidate_count",
    "back_panel_hunt_needed_rows",
    "source_hunt_gap_count",
    "readable_for_ocr",
    "verified_ingredient_labels",
    "first_source_title",
    "first_source_url",
    "source_hunt_queries",
    "claim_gate",
    "publication_image_policy",
    "review_blocker",
    "next_action",
    "candidate_only",
    "manual_verified",
  ], rows);
  fs.mkdirSync(path.dirname(productQueueRunbookPath), { recursive: true });
  fs.writeFileSync(productQueueRunbookPath, renderRunbook(manifest));

  const summary = readJson(summaryPath, {});
  summary.confection_wrapper_product_story_queue_summary = {
    schema_version: manifest.schema_version,
    generated_at: manifest.generated_at,
    source_domain: manifest.source_domain,
    source_site_strategy: manifest.source_site_strategy,
    public_safety: manifest.public_safety,
    totals: manifest.totals,
    by_queue_state: manifest.by_queue_state,
    by_ingredient_evidence_state: manifest.by_ingredient_evidence_state,
    top_story_targets: manifest.top_story_targets.slice(0, 6),
    source_hunt_targets: manifest.source_hunt_targets,
    artifacts: manifest.artifacts,
  };
  summary.confection_wrapper_ingredient_priority_summary = summary.confection_wrapper_ingredient_priority_summary || {};
  summary.confection_wrapper_ingredient_priority_summary.product_story_queue_summary = summary.confection_wrapper_product_story_queue_summary;
  summary.confection_wrapper_ingredient_priority_summary.artifacts = {
    ...(summary.confection_wrapper_ingredient_priority_summary.artifacts || {}),
    ...manifest.artifacts,
  };
  writeJson(summaryPath, summary);
  return manifest;
}

function main() {
  const manifest = writeProductStoryQueue();
  console.log(JSON.stringify({
    product_queue_rows: manifest.totals.product_queue_rows,
    package_story_candidate_products: manifest.totals.package_story_candidate_products,
    source_hunt_gap_products: manifest.totals.source_hunt_gap_products,
    primary_panel_targets: manifest.totals.primary_panel_targets,
    product_story_queue_csv: manifest.artifacts.product_story_queue_csv,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildManifest,
  buildQueueRows,
  productRow,
  writeProductStoryQueue,
};
