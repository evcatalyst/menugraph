const fs = require("fs");
const path = require("path");
const {
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
const captureWorksheetPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_capture_worksheet.csv");
const surfaceQueuePath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_surface_ocr_queue.csv");
const surfaceTemplatePath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_surface_image_map_template.csv");
const storySeedJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_story_seeds.json");
const storySeedCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_story_seeds.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_story_seed_runbook.md");

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function yearSort(row = {}) {
  const text = `${row.vintage_label || ""} ${row.source_title || ""}`;
  const year = text.match(/\b(19|20)\d{2}\b/);
  if (year) return Number(year[0]);
  const decade = text.match(/\b(19|20)\d0s\b/);
  if (decade) return Number(decade[0].slice(0, 4));
  return 9999;
}

function groupBy(rows = [], key) {
  const groups = new Map();
  for (const row of rows) {
    const value = row[key] || "";
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(row);
  }
  return groups;
}

function summarizeSurfaces(productRows = [], surfaceRows = []) {
  const captureIds = new Set(productRows.map((row) => row.capture_id));
  const productSurfaces = surfaceRows.filter((row) => captureIds.has(row.version_id || row.source_capture_id));
  const count = (surfaceId) => productSurfaces.filter((row) => row.surface_id === surfaceId).length;
  const proofCount = (proofLane) => productSurfaces.filter((row) => row.proof_lane === proofLane).length;
  return {
    surface_slots: productSurfaces.length,
    ocr_surface_rows: productSurfaces.filter((row) => row.ocr_eligible === "1" || row.ocr_eligible === 1).length,
    ingredient_panel_targets: count("ingredient_panel"),
    nutrition_panel_targets: count("nutrition_panel"),
    support_text_targets: proofCount("support_package_text"),
    secondary_context_targets: proofCount("secondary_product_context"),
  };
}

function timelinePoints(productRows = []) {
  return productRows
    .slice()
    .sort((a, b) => (
      yearSort(a) - yearSort(b)
      || String(a.source_title).localeCompare(String(b.source_title))
      || String(a.capture_id).localeCompare(String(b.capture_id))
    ))
    .map((row) => ({
      capture_id: row.capture_id,
      evidence_id: row.evidence_id,
      vintage_label: row.vintage_label,
      source_title: row.source_title,
      source_url: row.source_url,
      source_domain: row.source_domain,
      source_type: row.source_type,
      capture_surface_order: row.capture_surface_order,
      photo_role_priority: row.photo_role_priority,
      public_story_role: "source-attributable package lineage and capture target",
      ingredient_claim_status: "blocked_pending_readable_panel_crop_ocr_and_manual_verification",
      next_action: row.next_action,
    }));
}

function storySeedFor({ lineageRow = {}, productRows = [], surfaceRows = [] }) {
  const points = timelinePoints(productRows);
  const surfaceSummary = summarizeSurfaces(productRows, surfaceRows);
  const sourceUrls = unique(productRows.map((row) => row.source_url));
  const vintageLabels = unique(points.map((row) => row.vintage_label));
  return {
    product_id: lineageRow.product_id || productRows[0]?.product_id || "",
    product_name: lineageRow.product_name || productRows[0]?.product_name || "",
    priority_tier: lineageRow.priority_tier || "",
    story_seed_status: "package_lineage_story_seed_ready",
    ingredient_claim_status: "blocked_pending_readable_panel_crop_ocr_and_manual_verification",
    public_confidence_label: "source-attributable package lineage; no verified ingredient formulation",
    lineage_span_label: lineageRow.lineage_span_label || "",
    source_era_count: productRows.length,
    source_url_count: sourceUrls.length,
    vintage_labels: vintageLabels.join(";"),
    source_urls: sourceUrls.join(";"),
    first_source_url: sourceUrls[0] || "",
    first_source_title: points[0]?.source_title || "",
    earliest_vintage_label: points[0]?.vintage_label || "",
    latest_vintage_label: points[points.length - 1]?.vintage_label || "",
    exact_year_count: numeric(lineageRow.exact_year_count),
    decade_count: numeric(lineageRow.decade_count),
    direct_image_reference_count: numeric(lineageRow.direct_image_reference_count),
    surface_slots: surfaceSummary.surface_slots,
    ocr_surface_rows: surfaceSummary.ocr_surface_rows,
    ingredient_panel_targets: surfaceSummary.ingredient_panel_targets,
    nutrition_panel_targets: surfaceSummary.nutrition_panel_targets,
    support_text_targets: surfaceSummary.support_text_targets,
    secondary_context_targets: surfaceSummary.secondary_context_targets,
    readable_for_ocr: 0,
    verified_ingredient_labels: 0,
    unresolved_gaps: [
      "private panel crops not supplied",
      "OCR not run on readable ingredient/nutrition surfaces",
      "corrected ingredient text not reviewed",
      "manual verification and reviewer attribution missing",
      "external image rights not cleared for publication",
    ],
    next_action: "Capture private ingredient/nutrition/back-side surfaces from the linked source pages, run native OCR on readable text crops, then review corrected text before promoting formulation claims.",
    publication_policy: "source links and story seed metadata only; no external images, private paths, OCR text, or verified ingredient claims",
    candidate_only: 1,
    manual_verified: 0,
    timeline_points: points,
  };
}

function buildStorySeeds({ lineageManifest = {}, captureRows = [], surfaceRows = [] }) {
  const captureByProduct = groupBy(captureRows, "product_id");
  return (lineageManifest.rows || [])
    .filter((row) => numeric(row.item_page_count) > 0)
    .map((lineageRow) => storySeedFor({
      lineageRow,
      productRows: captureByProduct.get(lineageRow.product_id) || [],
      surfaceRows,
    }))
    .sort((a, b) => (
      b.source_era_count - a.source_era_count
      || b.ingredient_panel_targets - a.ingredient_panel_targets
      || a.product_name.localeCompare(b.product_name)
    ));
}

function manifestFor({ lineageManifest, captureRows, surfaceRows, seeds }) {
  const timelinePointCount = seeds.reduce((sum, seed) => sum + seed.timeline_points.length, 0);
  return {
    schema_version: "confection_wrapper_story_seeds.v1",
    generated_at: generatedAt,
    source_domain: "www.candywrapperarchive.com",
    source_lineage_priority: publicArtifactRef(lineageJsonPath),
    source_capture_worksheet: publicArtifactRef(captureWorksheetPath),
    source_surface_ocr_queue: publicArtifactRef(surfaceQueuePath),
    story_policy: {
      role: "Bridge from CWA wrapper lineage to publishable product story candidates.",
      story_gate: "A product can have a source-attributable package journey before it has a verified ingredient journey.",
      ingredient_gate: "No formulation claim is promoted until a readable panel crop is OCRed/transcribed, corrected, manually verified, and attributed to specific evidence.",
      image_gate: "External CWA images remain link-only unless rights review clears publication.",
    },
    public_safety: {
      candidate_only: true,
      external_images_committed: false,
      private_paths_committed: false,
      ocr_text_committed: false,
      ingredient_claims_promoted: false,
      manual_verified_created: false,
    },
    totals: {
      story_seed_products: seeds.length,
      source_eras: timelinePointCount,
      capture_rows: captureRows.length,
      surface_template_rows: surfaceRows.length,
      ocr_surface_rows: seeds.reduce((sum, seed) => sum + seed.ocr_surface_rows, 0),
      ingredient_panel_targets: seeds.reduce((sum, seed) => sum + seed.ingredient_panel_targets, 0),
      nutrition_panel_targets: seeds.reduce((sum, seed) => sum + seed.nutrition_panel_targets, 0),
      support_text_targets: seeds.reduce((sum, seed) => sum + seed.support_text_targets, 0),
      secondary_context_targets: seeds.reduce((sum, seed) => sum + seed.secondary_context_targets, 0),
      verified_ingredient_labels: 0,
      blocked_ingredient_claim_products: seeds.length,
      lineage_products_available: lineageManifest.totals?.lineage_products || seeds.length,
    },
    first_story_seeds: seeds.slice(0, 8).map((seed) => ({
      product_id: seed.product_id,
      product_name: seed.product_name,
      lineage_span_label: seed.lineage_span_label,
      source_era_count: seed.source_era_count,
      ingredient_panel_targets: seed.ingredient_panel_targets,
      nutrition_panel_targets: seed.nutrition_panel_targets,
      story_seed_status: seed.story_seed_status,
      ingredient_claim_status: seed.ingredient_claim_status,
      first_source_url: seed.first_source_url,
      next_action: seed.next_action,
    })),
    artifacts: {
      story_seed_json: publicArtifactRef(storySeedJsonPath),
      story_seed_csv: publicArtifactRef(storySeedCsvPath),
      story_seed_runbook_md: publicArtifactRef(runbookPath),
    },
    story_seeds: seeds,
  };
}

function renderRunbook(manifest = {}) {
  const lines = [
    "# Candy Wrapper Archive Story Seeds",
    "",
    `Generated: ${manifest.generated_at}`,
    "",
    "These story seeds translate CWA wrapper lineage into product-story candidates. They are useful for visual narrative planning, but ingredient claims remain blocked until source panel crops are OCRed/transcribed, corrected, manually verified, and attributed.",
    "",
    "## Gates",
    "",
    "- Package lineage can be shown from source links and review state.",
    "- Ingredient/nutrition panels are the primary next capture target.",
    "- Wrapper-front photographs are secondary context unless they expose readable label text.",
    "- No external images, private paths, OCR text, or verified formulation claims are committed by this artifact.",
    "",
    "## Totals",
    "",
    `- Story seed products: ${manifest.totals.story_seed_products}`,
    `- Source eras: ${manifest.totals.source_eras}`,
    `- Ingredient panel targets: ${manifest.totals.ingredient_panel_targets}`,
    `- Surface OCR rows: ${manifest.totals.ocr_surface_rows}`,
    `- Verified ingredient labels: ${manifest.totals.verified_ingredient_labels}`,
    "",
    "## First Story Seeds",
    "",
  ];
  for (const seed of manifest.first_story_seeds || []) {
    lines.push(`- ${seed.product_name}: ${seed.source_era_count} source eras, ${seed.lineage_span_label}; ${seed.ingredient_panel_targets} ingredient-panel targets; ${seed.ingredient_claim_status}.`);
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function writeStorySeeds() {
  const lineageManifest = readJson(lineageJsonPath, {});
  const captureRows = fs.existsSync(captureWorksheetPath)
    ? parseCsv(fs.readFileSync(captureWorksheetPath, "utf8"))
    : [];
  const surfaceRows = fs.existsSync(surfaceTemplatePath)
    ? parseCsv(fs.readFileSync(surfaceTemplatePath, "utf8"))
    : [];
  const seeds = buildStorySeeds({ lineageManifest, captureRows, surfaceRows });
  const manifest = manifestFor({ lineageManifest, captureRows, surfaceRows, seeds });

  writeJson(storySeedJsonPath, manifest);
  writeCsv(storySeedCsvPath, [
    "product_id",
    "product_name",
    "priority_tier",
    "story_seed_status",
    "ingredient_claim_status",
    "public_confidence_label",
    "lineage_span_label",
    "source_era_count",
    "source_url_count",
    "earliest_vintage_label",
    "latest_vintage_label",
    "exact_year_count",
    "decade_count",
    "direct_image_reference_count",
    "surface_slots",
    "ocr_surface_rows",
    "ingredient_panel_targets",
    "nutrition_panel_targets",
    "support_text_targets",
    "secondary_context_targets",
    "readable_for_ocr",
    "verified_ingredient_labels",
    "unresolved_gaps",
    "next_action",
    "publication_policy",
    "first_source_url",
    "source_urls",
    "candidate_only",
    "manual_verified",
  ], seeds);
  fs.mkdirSync(path.dirname(runbookPath), { recursive: true });
  fs.writeFileSync(runbookPath, renderRunbook(manifest));

  const summary = readJson(summaryPath, {});
  summary.confection_wrapper_story_seed_summary = {
    schema_version: manifest.schema_version,
    generated_at: manifest.generated_at,
    source_domain: manifest.source_domain,
    story_policy: manifest.story_policy,
    public_safety: manifest.public_safety,
    totals: manifest.totals,
    first_story_seeds: manifest.first_story_seeds,
    artifacts: manifest.artifacts,
  };
  writeJson(summaryPath, summary);
  return manifest;
}

function main() {
  const manifest = writeStorySeeds();
  console.log(JSON.stringify({
    story_seed_products: manifest.totals.story_seed_products,
    source_eras: manifest.totals.source_eras,
    ingredient_panel_targets: manifest.totals.ingredient_panel_targets,
    ocr_surface_rows: manifest.totals.ocr_surface_rows,
    story_seed_csv: manifest.artifacts.story_seed_csv,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildStorySeeds,
  storySeedFor,
  writeStorySeeds,
};
