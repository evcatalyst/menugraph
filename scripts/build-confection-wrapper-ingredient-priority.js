const fs = require("fs");
const path = require("path");
const {
  countBy,
  generatedAt,
  parseCsv,
  publicArtifactRef,
  readJson,
  shortHash,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const storySeedJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_story_seeds.json");
const surfaceQueuePath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_surface_ocr_queue.csv");
const priorityJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_priority.json");
const priorityCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority_runbook.md");

const primarySurfaceIds = new Set(["ingredient_panel", "nutrition_panel"]);
const supportSurfaceIds = new Set(["wrapper_back_or_side", "net_weight", "maker_or_date"]);

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function surfaceRank(row = {}) {
  if (row.surface_id === "ingredient_panel") return 1;
  if (row.surface_id === "nutrition_panel") return 2;
  if (row.surface_id === "wrapper_back_or_side") return 3;
  if (row.surface_id === "net_weight") return 4;
  if (row.surface_id === "maker_or_date") return 5;
  return 9;
}

function vintageRank(row = {}) {
  const text = `${row.vintage_label || ""} ${row.source_title || ""}`;
  const year = text.match(/\b(19|20)\d{2}\b/);
  if (year) return Number(year[0]);
  const decade = text.match(/\b(19|20)\d0s\b/);
  if (decade) return Number(decade[0].slice(0, 4));
  return 9999;
}

function sourceHost(value = "") {
  try {
    return new URL(value).hostname;
  } catch (_error) {
    return "";
  }
}

function proofLane(row = {}) {
  if (row.surface_id === "ingredient_panel") return "primary_ingredient_panel_photo";
  if (row.surface_id === "nutrition_panel") return "primary_nutrition_panel_photo";
  if (supportSurfaceIds.has(row.surface_id)) return "supporting_label_text_photo";
  return "secondary_context_not_ocr_default";
}

function captureInstruction(row = {}) {
  if (row.surface_id === "ingredient_panel") {
    return "Capture the ingredient statement first, with enough wrapper context to preserve product and vintage cues.";
  }
  if (row.surface_id === "nutrition_panel") {
    return "Capture the nutrition facts and serving-size area after the ingredient panel or when ingredients are absent.";
  }
  if (row.surface_id === "wrapper_back_or_side") {
    return "Capture readable back/side wrapper text only after checking for ingredient and nutrition panels.";
  }
  if (row.surface_id === "net_weight") return "Capture net weight as package-size evidence for later normalization.";
  if (row.surface_id === "maker_or_date") return "Capture maker, distributor, copyright, lot, or date cues for identity and timeline confidence.";
  return "Use as package context only unless a reviewer sees readable label text.";
}

function storySeedMaps(manifest = {}) {
  const productOrder = new Map();
  const seedByProduct = new Map();
  const pointOrder = new Map();
  (manifest.story_seeds || []).forEach((seed, seedIndex) => {
    productOrder.set(seed.product_id, seedIndex + 1);
    seedByProduct.set(seed.product_id, seed);
    (seed.timeline_points || []).forEach((point, pointIndex) => {
      pointOrder.set(`${seed.product_id}:${point.capture_id}`, pointIndex + 1);
    });
  });
  return { productOrder, seedByProduct, pointOrder };
}

function priorityRow(row = {}, context = {}) {
  const seed = context.seedByProduct.get(row.product_id) || {};
  const productOrder = context.productOrder.get(row.product_id) || 999;
  const sourceEraRank = context.pointOrder.get(`${row.product_id}:${row.version_id}`) || 999;
  const primary = primarySurfaceIds.has(row.surface_id);
  return {
    priority_id: `cwa_ingredient_priority_${shortHash(`${row.product_id}:${row.version_id}:${row.surface_id}`, 12)}`,
    product_id: row.product_id,
    product_name: row.product_name,
    product_order: productOrder,
    priority_tier: seed.priority_tier || "",
    lineage_span_label: seed.lineage_span_label || "",
    source_era_rank: sourceEraRank,
    vintage_label: row.vintage_label,
    version_id: row.version_id,
    evidence_id: row.evidence_id,
    source_domain: row.source_domain || sourceHost(row.source_url),
    source_url: row.source_url,
    source_title: row.source_title,
    surface_id: row.surface_id,
    surface_label: row.surface_label,
    surface_rank: surfaceRank(row),
    proof_lane: proofLane(row),
    proof_lane_rank: numeric(row.proof_lane_rank),
    photo_priority: primary ? "primary_ingredient_or_nutrition_photo" : "supporting_label_text_photo",
    ocr_priority: row.ocr_priority,
    ocr_expected_surface: row.ocr_expected_surface,
    panel_acquisition_state: row.panel_acquisition_state,
    ocr_access_state: row.ocr_access_state,
    capture_path_field: row.capture_path_field,
    capture_strategy: row.capture_strategy,
    crop_target: row.crop_target,
    capture_instruction: captureInstruction(row),
    claim_gate: "blocked_until_private_readable_crop_ocr_correction_and_manual_verification",
    publication_image_policy: "source_link_only_until_rights_review_clears_reuse",
    rights_review_status: row.rights_review_status || "rights_review_needed",
    primary_text_surface: primary ? 1 : 0,
    support_text_surface: supportSurfaceIds.has(row.surface_id) ? 1 : 0,
    private_paths_supplied: row.ocr_access_state === "local_image_ready" ? 1 : 0,
    ready_for_ocr: row.ocr_access_state === "local_image_ready" ? 1 : 0,
    candidate_only: 1,
    manual_verified: 0,
  };
}

function sortPriorityRows(rows = []) {
  return rows.slice().sort((a, b) => (
    numeric(a.product_order) - numeric(b.product_order)
    || vintageRank(a) - vintageRank(b)
    || numeric(a.source_era_rank) - numeric(b.source_era_rank)
    || numeric(a.surface_rank) - numeric(b.surface_rank)
    || String(a.source_title).localeCompare(String(b.source_title))
    || String(a.priority_id).localeCompare(String(b.priority_id))
  ));
}

function addRanks(rows = []) {
  const productCounts = new Map();
  return rows.map((row, index) => {
    const nextRank = (productCounts.get(row.product_id) || 0) + 1;
    productCounts.set(row.product_id, nextRank);
    return {
      ...row,
      global_capture_rank: index + 1,
      product_capture_rank: nextRank,
    };
  });
}

function productPriorities(rows = [], seeds = []) {
  return seeds.map((seed) => {
    const productRows = rows.filter((row) => row.product_id === seed.product_id);
    return {
      product_id: seed.product_id,
      product_name: seed.product_name,
      priority_tier: seed.priority_tier,
      lineage_span_label: seed.lineage_span_label,
      source_era_count: seed.source_era_count,
      capture_rows: productRows.length,
      primary_text_rows: productRows.filter((row) => row.primary_text_surface).length,
      ingredient_panel_rows: productRows.filter((row) => row.surface_id === "ingredient_panel").length,
      nutrition_panel_rows: productRows.filter((row) => row.surface_id === "nutrition_panel").length,
      support_text_rows: productRows.filter((row) => row.support_text_surface).length,
      ready_for_ocr: productRows.filter((row) => row.ready_for_ocr).length,
      verified_ingredient_labels: 0,
      claim_gate: "ingredient_claims_blocked_pending_private_panel_capture_ocr_and_manual_verification",
      next_action: "Open the source pages, privately crop ingredient/nutrition panels first, then route readable text crops to native OCR.",
      first_source_url: seed.first_source_url,
      rows: productRows.slice(0, 12),
    };
  }).filter((row) => row.capture_rows);
}

function buildIngredientPriority({ storyManifest = {}, surfaceRows = [] }) {
  const context = storySeedMaps(storyManifest);
  const candidateRows = surfaceRows
    .filter((row) => row.product_id)
    .filter((row) => primarySurfaceIds.has(row.surface_id) || supportSurfaceIds.has(row.surface_id))
    .map((row) => priorityRow(row, context));
  return addRanks(sortPriorityRows(candidateRows));
}

function manifestFor({ storyManifest, surfaceRows, rows }) {
  const seeds = storyManifest.story_seeds || [];
  const products = productPriorities(rows, seeds);
  const totals = {
    products: products.length,
    priority_rows: rows.length,
    source_eras: new Set(rows.map((row) => row.version_id).filter(Boolean)).size,
    source_urls: new Set(rows.map((row) => row.source_url).filter(Boolean)).size,
    primary_text_rows: rows.filter((row) => row.primary_text_surface).length,
    ingredient_panel_rows: rows.filter((row) => row.surface_id === "ingredient_panel").length,
    nutrition_panel_rows: rows.filter((row) => row.surface_id === "nutrition_panel").length,
    support_text_rows: rows.filter((row) => row.support_text_surface).length,
    ready_for_ocr: rows.filter((row) => row.ready_for_ocr).length,
    private_paths_supplied: rows.filter((row) => row.private_paths_supplied).length,
    verified_ingredient_labels: 0,
    claim_blocked_rows: rows.length,
    input_surface_rows: surfaceRows.length,
  };
  return {
    schema_version: "confection_wrapper_ingredient_priority.v1",
    generated_at: generatedAt,
    source_domain: "www.candywrapperarchive.com",
    source_story_seeds: publicArtifactRef(storySeedJsonPath),
    source_surface_ocr_queue: publicArtifactRef(surfaceQueuePath),
    priority_policy: {
      primary_visual_rule: "Ingredient and nutrition panels are the primary photo proof targets.",
      secondary_visual_rule: "Wrapper fronts and product beauty shots are secondary package context unless readable label text is visible.",
      capture_rule: "For each source era, capture ingredient panel, nutrition panel, wrapper back/side text, net weight, and maker/date cues in that order.",
      claim_gate: "No formulation claim is promoted until a private readable crop is OCRed/transcribed, corrected, manually verified, and attributed.",
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
    by_product: countBy(rows, "product_name"),
    by_surface: countBy(rows, "surface_id"),
    first_rows: rows.slice(0, 16).map((row) => ({
      global_capture_rank: row.global_capture_rank,
      product_capture_rank: row.product_capture_rank,
      product_id: row.product_id,
      product_name: row.product_name,
      vintage_label: row.vintage_label,
      surface_id: row.surface_id,
      surface_label: row.surface_label,
      photo_priority: row.photo_priority,
      source_url: row.source_url,
      capture_instruction: row.capture_instruction,
      claim_gate: row.claim_gate,
    })),
    product_priorities: products,
    artifacts: {
      ingredient_priority_json: publicArtifactRef(priorityJsonPath),
      ingredient_priority_csv: publicArtifactRef(priorityCsvPath),
      ingredient_priority_runbook_md: publicArtifactRef(runbookPath),
    },
  };
}

function renderRunbook(manifest = {}) {
  const totals = manifest.totals || {};
  const lines = [
    "# Candy Wrapper Archive Ingredient-First Priority",
    "",
    `Generated: ${manifest.generated_at}`,
    "",
    "This artifact turns Candy Wrapper Archive lineage rows into an ingredient-first capture plan. It does not publish source images, private crop paths, OCR text, or verified formulation claims.",
    "",
    "## Priority Rules",
    "",
    "1. Capture ingredient panels first.",
    "2. Capture nutrition panels second.",
    "3. Capture wrapper back/side text, net weight, and maker/date cues as supporting label evidence.",
    "4. Treat wrapper-front product photos as secondary context unless readable label text is visible.",
    "5. Keep every OCR/model/manual transcription output candidate-only until reviewer attribution and manual verification are recorded.",
    "",
    "## Totals",
    "",
    `- Products: ${totals.products || 0}`,
    `- Priority rows: ${totals.priority_rows || 0}`,
    `- Primary ingredient/nutrition rows: ${totals.primary_text_rows || 0}`,
    `- Support text rows: ${totals.support_text_rows || 0}`,
    `- Ready for OCR now: ${totals.ready_for_ocr || 0}`,
    `- Verified ingredient labels: ${totals.verified_ingredient_labels || 0}`,
    "",
    "## First Rows",
    "",
  ];
  for (const row of manifest.first_rows || []) {
    lines.push(`- ${row.global_capture_rank}. ${row.product_name} ${row.vintage_label}: ${row.surface_label}; ${row.capture_instruction}`);
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function writeIngredientPriority() {
  const storyManifest = readJson(storySeedJsonPath, {});
  const surfaceRows = fs.existsSync(surfaceQueuePath)
    ? parseCsv(fs.readFileSync(surfaceQueuePath, "utf8"))
    : [];
  const rows = buildIngredientPriority({ storyManifest, surfaceRows });
  const manifest = manifestFor({ storyManifest, surfaceRows, rows });

  writeJson(priorityJsonPath, manifest);
  writeCsv(priorityCsvPath, [
    "global_capture_rank",
    "product_capture_rank",
    "priority_id",
    "product_id",
    "product_name",
    "priority_tier",
    "lineage_span_label",
    "source_era_rank",
    "vintage_label",
    "version_id",
    "evidence_id",
    "source_domain",
    "source_url",
    "source_title",
    "surface_id",
    "surface_label",
    "surface_rank",
    "proof_lane",
    "photo_priority",
    "ocr_priority",
    "ocr_expected_surface",
    "panel_acquisition_state",
    "ocr_access_state",
    "capture_path_field",
    "capture_strategy",
    "crop_target",
    "capture_instruction",
    "claim_gate",
    "publication_image_policy",
    "rights_review_status",
    "primary_text_surface",
    "support_text_surface",
    "private_paths_supplied",
    "ready_for_ocr",
    "candidate_only",
    "manual_verified",
  ], rows);
  fs.mkdirSync(path.dirname(runbookPath), { recursive: true });
  fs.writeFileSync(runbookPath, renderRunbook(manifest));

  const summary = readJson(summaryPath, {});
  summary.confection_wrapper_ingredient_priority_summary = {
    schema_version: manifest.schema_version,
    generated_at: manifest.generated_at,
    source_domain: manifest.source_domain,
    priority_policy: manifest.priority_policy,
    public_safety: manifest.public_safety,
    totals: manifest.totals,
    by_product: manifest.by_product,
    by_surface: manifest.by_surface,
    first_rows: manifest.first_rows,
    artifacts: manifest.artifacts,
  };
  writeJson(summaryPath, summary);
  return manifest;
}

function main() {
  const manifest = writeIngredientPriority();
  console.log(JSON.stringify({
    products: manifest.totals.products,
    priority_rows: manifest.totals.priority_rows,
    primary_text_rows: manifest.totals.primary_text_rows,
    support_text_rows: manifest.totals.support_text_rows,
    ready_for_ocr: manifest.totals.ready_for_ocr,
    ingredient_priority_csv: manifest.artifacts.ingredient_priority_csv,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildIngredientPriority,
  writeIngredientPriority,
};
