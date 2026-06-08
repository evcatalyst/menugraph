const fs = require("fs");
const path = require("path");
const {
  countBy,
  generatedAt,
  publicArtifactRef,
  readJson,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const itemCandidatesPath = path.join(root, "docs/data/product-evidence/confection_wrapper_item_candidates.json");
const panelReviewPath = path.join(root, "docs/data/product-evidence/confection_wrapper_panel_review_worksheet.json");
const lineageJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_lineage_priority.json");
const lineageCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_lineage_priority.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_lineage_priority_runbook.md");

function decadeStart(value = "") {
  const match = String(value).match(/\b(19|20)\d0s\b/);
  return match ? Number(match[0].slice(0, 4)) : null;
}

function yearMarker(row = {}) {
  if (row.claimed_year) return { label: row.claimed_year, sort: Number(row.claimed_year), type: "year" };
  if (row.claimed_decade) return { label: row.claimed_decade, sort: decadeStart(row.claimed_decade), type: "decade" };
  const fromTitle = String(row.item_title || row.claimed_date_text || "").match(/\b(19|20)\d{2}\b/);
  if (fromTitle) return { label: fromTitle[0], sort: Number(fromTitle[0]), type: "year" };
  const fromDecade = String(row.item_title || row.claimed_date_text || "").match(/\b(19|20)\d0s\b/);
  if (fromDecade) return { label: fromDecade[0], sort: decadeStart(fromDecade[0]), type: "decade" };
  return { label: row.claimed_date_text || "date review", sort: null, type: "unknown" };
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function markerRange(markers = []) {
  const sorted = markers.filter((marker) => Number.isFinite(marker.sort)).sort((a, b) => a.sort - b.sort);
  if (!sorted.length) return "date review";
  const first = sorted[0].label;
  const last = sorted[sorted.length - 1].label;
  return first === last ? first : `${first}-${last}`;
}

function reviewCountsByProduct(panelReview = {}) {
  const counts = new Map();
  for (const row of panelReview.by_product || []) counts.set(row.key, Number(row.count || 0));
  return counts;
}

function priorityTier(row = {}) {
  if (row.item_page_count >= 6 && row.decade_count >= 4) return "dense_lineage_first";
  if (row.item_page_count >= 4) return "multi_era_lineage";
  if (row.item_page_count >= 2) return "promising_lineage";
  return "single_lead_or_gap";
}

function nextAction(row = {}) {
  if (row.panel_review_rows > 0 && row.readable_for_ocr === 0) {
    return "Open the item pages, privately crop wrapper backs/sides first, answer panel-readability fields, then route only readable text surfaces to OCR.";
  }
  if (row.source_hunt_gap_count > 0) {
    return "Attach item-level Candy Wrapper Archive pages or equivalent source-attributable package photos before capture.";
  }
  return "Review source links for package lineage, then hunt for readable ingredient or nutrition panels.";
}

function buildLineageRows(itemManifest = {}, panelReview = {}) {
  const productGroups = new Map();
  const reviewCounts = reviewCountsByProduct(panelReview);

  for (const row of itemManifest.candidates || []) {
    if (!productGroups.has(row.product_id)) {
      productGroups.set(row.product_id, {
        product_id: row.product_id,
        product_name: row.product_name,
        items: [],
        source_hunt_gap_count: 0,
      });
    }
    productGroups.get(row.product_id).items.push(row);
  }

  for (const gap of itemManifest.source_hunt_gaps || []) {
    if (!productGroups.has(gap.product_id)) {
      productGroups.set(gap.product_id, {
        product_id: gap.product_id,
        product_name: gap.product_name,
        items: [],
        source_hunt_gap_count: 0,
      });
    }
    productGroups.get(gap.product_id).source_hunt_gap_count += 1;
  }

  return [...productGroups.values()].map((group) => {
    const markers = group.items.map(yearMarker);
    const labels = unique(markers.map((marker) => marker.label));
    const decades = unique(group.items.map((row) => row.claimed_decade || (yearMarker(row).type === "year" ? `${String(yearMarker(row).sort).slice(0, 3)}0s` : "")));
    const sourceUrls = unique(group.items.map((row) => row.item_url));
    const imageRefs = group.items.filter((row) => row.source_image_url || row.thumbnail_url).length;
    const exactYears = unique(group.items.map((row) => row.claimed_year));
    const sortValues = markers.map((marker) => marker.sort).filter(Number.isFinite);
    const earliestSort = sortValues.length ? Math.min(...sortValues) : null;
    const earliestBonus = earliestSort && earliestSort <= 1950 ? 20 : earliestSort && earliestSort <= 1970 ? 10 : 0;
    const itemPageCount = group.items.length;
    const decadeCount = decades.length;
    const panelReviewRows = reviewCounts.get(group.product_name) || 0;
    const lineageRow = {
      product_id: group.product_id,
      product_name: group.product_name,
      item_page_count: itemPageCount,
      collection_item_pages: group.items.filter((row) => row.candidate_type === "collection_item_candidate").length,
      existing_item_pages: group.items.filter((row) => row.candidate_type === "existing_item_page_candidate").length,
      source_hunt_gap_count: group.source_hunt_gap_count,
      direct_image_reference_count: imageRefs,
      exact_year_count: exactYears.length,
      decade_count: decadeCount,
      year_or_decade_markers: labels.join(";"),
      lineage_span_label: markerRange(markers),
      panel_review_rows: panelReviewRows,
      panel_review_not_started: panelReviewRows,
      readable_for_ocr: 0,
      manual_verified_labels: 0,
      source_urls: sourceUrls.join(";"),
      first_item_titles: group.items.slice(0, 5).map((row) => row.item_title).join(";"),
      ingredient_claim_status: "blocked_pending_readable_panel_review",
      image_publication_policy: "source_link_only_no_public_image",
      reviewer_priority_score: itemPageCount * 12 + decadeCount * 8 + imageRefs * 2 + earliestBonus + panelReviewRows,
    };
    lineageRow.priority_tier = priorityTier(lineageRow);
    lineageRow.next_action = nextAction(lineageRow);
    return lineageRow;
  }).sort((a, b) => (
    b.reviewer_priority_score - a.reviewer_priority_score
    || b.item_page_count - a.item_page_count
    || a.product_name.localeCompare(b.product_name)
  ));
}

function buildManifest(lineageRows = {}, itemManifest = {}, panelReview = {}) {
  const rows = Array.isArray(lineageRows) ? lineageRows : [];
  const tootsie = rows.find((row) => row.product_id === "tootsie_roll");
  const focusTargets = unique([
    "tootsie_roll",
    "butterfinger_bar",
    "hersheys_milk_chocolate_bar",
    "snickers_bar",
    "kit_kat_bar",
  ]).map((id) => rows.find((row) => row.product_id === id)).filter(Boolean);
  return {
    schema_version: "confection_wrapper_lineage_priority.v1",
    generated_at: generatedAt,
    source_domain: "www.candywrapperarchive.com",
    source_role: "item-level historical wrapper lineage priority",
    source_policy: {
      why_prioritized: "Candy Wrapper Archive has item-level historical wrapper pages that can quickly establish product/package lineage and candidate eras for review.",
      ingredient_gate: "Wrapper photos are not ingredient proof until a readable ingredient or nutrition panel is privately cropped, OCRed/transcribed, and manually verified.",
      publication_gate: "External archive images remain source-link-only unless rights are reviewed and cleared.",
    },
    totals: {
      lineage_products: rows.filter((row) => row.item_page_count > 0).length,
      item_pages: rows.reduce((sum, row) => sum + row.item_page_count, 0),
      source_hunt_gaps: rows.reduce((sum, row) => sum + row.source_hunt_gap_count, 0),
      panel_review_rows: rows.reduce((sum, row) => sum + row.panel_review_rows, 0),
      readable_for_ocr: rows.reduce((sum, row) => sum + row.readable_for_ocr, 0),
      direct_image_references: rows.reduce((sum, row) => sum + row.direct_image_reference_count, 0),
      item_candidate_rows: itemManifest.totals?.item_candidates || 0,
      panel_review_worksheet_rows: panelReview.worksheet_rows || 0,
    },
    priority_tiers: countBy(rows, "priority_tier"),
    top_targets: rows.slice(0, 12),
    focus_targets: focusTargets,
    tootsie_roll_reference: tootsie || null,
    public_safety: {
      candidate_only: true,
      external_images_committed: false,
      private_paths_committed: false,
      ingredient_claims_promoted: false,
      manual_verified_created: false,
    },
    artifacts: {
      lineage_priority_json: publicArtifactRef(lineageJsonPath),
      lineage_priority_csv: publicArtifactRef(lineageCsvPath),
      lineage_priority_runbook_md: publicArtifactRef(runbookPath),
    },
    rows,
  };
}

function renderRunbook(manifest = {}) {
  const lines = [
    "# Candy Wrapper Archive Lineage Priority",
    "",
    `Generated: ${manifest.generated_at}`,
    "",
    "This artifact prioritizes Candy Wrapper Archive item pages by product-level historical wrapper density. It is a review-routing layer, not a recipe-claim layer.",
    "",
    "## Rules",
    "",
    "- Prioritize products with multiple item-level historical wrapper pages because they can support a clearer package journey.",
    "- Capture/crop ingredient, nutrition, net-weight, maker, and date panels before OCR.",
    "- Treat wrapper fronts as product-lineage context only.",
    "- Do not publish external images unless rights are reviewed and clear.",
    "- Do not mark any ingredient claim verified from this artifact.",
    "",
    "## Totals",
    "",
    `- Products with item lineage: ${manifest.totals.lineage_products}`,
    `- Item pages: ${manifest.totals.item_pages}`,
    `- Panel review rows: ${manifest.totals.panel_review_rows}`,
    `- Readable for OCR: ${manifest.totals.readable_for_ocr}`,
    "",
    "## Top Targets",
    "",
  ];
  for (const row of manifest.top_targets || []) {
    lines.push(`- ${row.product_name}: ${row.item_page_count} item pages, ${row.lineage_span_label}, ${row.panel_review_rows} panel reviews; ${row.next_action}`);
  }
  if (manifest.tootsie_roll_reference) {
    const row = manifest.tootsie_roll_reference;
    lines.push("");
    lines.push("## Tootsie Roll Reference");
    lines.push("");
    lines.push(`- ${row.product_name}: ${row.item_page_count} item pages, ${row.lineage_span_label}; ${row.source_urls}`);
  }
  return `${lines.join("\n")}\n`;
}

function writeLineagePriority() {
  const itemManifest = readJson(itemCandidatesPath, {});
  const panelReview = readJson(panelReviewPath, {});
  const rows = buildLineageRows(itemManifest, panelReview);
  const manifest = buildManifest(rows, itemManifest, panelReview);

  writeJson(lineageJsonPath, manifest);
  writeCsv(lineageCsvPath, [
    "product_id",
    "product_name",
    "priority_tier",
    "reviewer_priority_score",
    "item_page_count",
    "collection_item_pages",
    "existing_item_pages",
    "source_hunt_gap_count",
    "direct_image_reference_count",
    "exact_year_count",
    "decade_count",
    "year_or_decade_markers",
    "lineage_span_label",
    "panel_review_rows",
    "panel_review_not_started",
    "readable_for_ocr",
    "manual_verified_labels",
    "ingredient_claim_status",
    "image_publication_policy",
    "source_urls",
    "first_item_titles",
    "next_action",
  ], rows);
  fs.mkdirSync(path.dirname(runbookPath), { recursive: true });
  fs.writeFileSync(runbookPath, renderRunbook(manifest));

  const summary = readJson(summaryPath, {});
  summary.confection_wrapper_lineage_priority_summary = {
    schema_version: manifest.schema_version,
    generated_at: manifest.generated_at,
    source_domain: manifest.source_domain,
    source_role: manifest.source_role,
    source_policy: manifest.source_policy,
    totals: manifest.totals,
    priority_tiers: manifest.priority_tiers,
    top_targets: manifest.top_targets.slice(0, 8),
    focus_targets: manifest.focus_targets,
    tootsie_roll_reference: manifest.tootsie_roll_reference,
    public_safety: manifest.public_safety,
    artifacts: manifest.artifacts,
  };
  writeJson(summaryPath, summary);
  return manifest;
}

function main() {
  const manifest = writeLineagePriority();
  console.log(JSON.stringify({
    lineage_products: manifest.totals.lineage_products,
    item_pages: manifest.totals.item_pages,
    panel_review_rows: manifest.totals.panel_review_rows,
    readable_for_ocr: manifest.totals.readable_for_ocr,
    lineage_priority_csv: manifest.artifacts.lineage_priority_csv,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildLineageRows,
  buildManifest,
  writeLineagePriority,
};
