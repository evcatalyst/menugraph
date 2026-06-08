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
const {
  publicAuditRows,
  summarizeAudit,
} = require("./audit-image-map-template");
const {
  buildCaptureTasks,
  buildTaskSummary,
  renderRunbook: renderCaptureTaskRunbook,
} = require("./build-capture-task-manifest");

const root = path.join(__dirname, "..");
const storySeedJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_story_seeds.json");
const surfaceQueuePath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_surface_ocr_queue.csv");
const priorityJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_priority.json");
const priorityCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority_runbook.md");
const imageMapTemplatePath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority_image_map_template.csv");
const auditCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority_image_map_audit.csv");
const auditJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_priority_image_map_audit.json");
const captureTaskCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_capture_tasks.csv");
const captureTaskJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_capture_tasks.json");
const captureTaskRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_capture_runbook.md");
const capturePacketCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_capture_packets.csv");
const capturePacketJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_capture_packets.json");
const capturePacketRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_capture_packet_runbook.md");
const runId = "cwa-ingredient-priority-v1";

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
    source_type: row.source_type || "collector_archive_page",
    surface_id: row.surface_id,
    surface_label: row.surface_label,
    surface_rank: surfaceRank(row),
    proof_lane: proofLane(row),
    proof_lane_rank: numeric(row.proof_lane_rank),
    photo_priority: primary ? "primary_ingredient_or_nutrition_photo" : "supporting_label_text_photo",
    ocr_priority: row.ocr_priority,
    ocr_gap_category: row.ocr_gap_category || "panel_capture_needed",
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
    image_map_keys: row.private_image_map_keys || row.image_map_keys || row.evidence_id || "",
    local_private_image_path: "",
    processed_private_image_path: "",
    panel_crop_note: "",
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

function imageMapTemplateRows(rows = []) {
  return rows.map((row) => ({
    run_id: runId,
    priority_id: row.priority_id,
    global_capture_rank: row.global_capture_rank,
    product_capture_rank: row.product_capture_rank,
    evidence_id: row.evidence_id,
    product_id: row.product_id,
    product_name: row.product_name,
    vintage_label: row.vintage_label,
    source_domain: row.source_domain,
    source_url: row.source_url,
    source_type: row.source_type,
    source_title: row.source_title,
    surface_id: row.surface_id,
    surface_label: row.surface_label,
    ocr_gap_category: row.ocr_gap_category,
    ocr_priority: row.ocr_priority,
    capture_strategy: row.capture_strategy,
    crop_target: row.crop_target,
    ocr_expected_surface: row.ocr_expected_surface,
    image_map_keys: row.image_map_keys,
    local_private_image_path: "",
    processed_private_image_path: "",
    panel_crop_note: "",
    rights_review_status: row.rights_review_status,
    publication_image_policy: row.publication_image_policy,
    candidate_only: 1,
    manual_verified: 0,
  }));
}

function splitKeys(value = "") {
  return String(value).split(";").map((item) => item.trim()).filter(Boolean);
}

function groupRowsBySource(rows = []) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.product_id}:${row.version_id}:${row.source_url}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.values()].map((group) => group.slice().sort((a, b) => (
    numeric(a.surface_rank) - numeric(b.surface_rank)
    || String(a.evidence_id).localeCompare(String(b.evidence_id))
  )));
}

function packetRowsFor(rowGroup = []) {
  return rowGroup.map((row) => ({
    evidence_id: row.evidence_id,
    surface_id: row.surface_id,
    surface_label: row.surface_label,
    surface_rank: row.surface_rank,
    capture_strategy: row.capture_strategy,
    crop_target: row.crop_target,
    image_map_keys: row.image_map_keys,
    capture_path_field: row.capture_path_field,
    local_private_image_path: "",
    processed_private_image_path: "",
    candidate_only: 1,
    manual_verified: 0,
  }));
}

function buildCapturePackets(rows = []) {
  return groupRowsBySource(rows).map((rowGroup, index) => {
    const first = rowGroup[0] || {};
    const evidenceIds = rowGroup.map((row) => row.evidence_id).filter(Boolean);
    const keyCount = rowGroup.reduce((sum, row) => sum + splitKeys(row.image_map_keys).length, 0);
    const ingredientRow = rowGroup.find((row) => row.surface_id === "ingredient_panel") || {};
    const nutritionRow = rowGroup.find((row) => row.surface_id === "nutrition_panel") || {};
    return {
      run_id: runId,
      packet_id: `cwa_ingredient_packet_${shortHash(`${first.product_id}:${first.version_id}:${first.source_url}`, 14)}`,
      packet_rank: index + 1,
      product_id: first.product_id,
      product_name: first.product_name,
      priority_tier: first.priority_tier,
      lineage_span_label: first.lineage_span_label,
      source_era_rank: first.source_era_rank,
      vintage_label: first.vintage_label,
      version_id: first.version_id,
      source_domain: first.source_domain,
      source_url: first.source_url,
      source_title: `${first.vintage_label || "Vintage"} ${first.product_name || "product"} source page`,
      surface_count: rowGroup.length,
      primary_text_rows: rowGroup.filter((row) => row.primary_text_surface).length,
      support_text_rows: rowGroup.filter((row) => row.support_text_surface).length,
      ingredient_panel_evidence_id: ingredientRow.evidence_id || "",
      nutrition_panel_evidence_id: nutritionRow.evidence_id || "",
      evidence_ids: evidenceIds.join(";"),
      image_map_key_count: keyCount,
      capture_surface_order: rowGroup.map((row) => row.surface_id).join(";"),
      private_paths_needed: rowGroup.length,
      ready_for_ocr: 0,
      verified_ingredient_labels: 0,
      recommended_next_action: "Open this source page once, privately crop ingredient and nutrition panels first, then capture supporting back/side, weight, and maker/date text if visible.",
      done_when: "All visible text surfaces from this source page have private crop paths or explicit no-readable-surface notes; readable crops can then enter native OCR.",
      claim_gate: "blocked_until_private_readable_crop_ocr_correction_and_manual_verification",
      publication_image_policy: "source_link_only_until_rights_review_clears_reuse",
      candidate_only: 1,
      manual_verified: 0,
      rows: packetRowsFor(rowGroup),
    };
  });
}

function buildIngredientPriority({ storyManifest = {}, surfaceRows = [] }) {
  const context = storySeedMaps(storyManifest);
  const candidateRows = surfaceRows
    .filter((row) => row.product_id)
    .filter((row) => primarySurfaceIds.has(row.surface_id) || supportSurfaceIds.has(row.surface_id))
    .map((row) => priorityRow(row, context));
  return addRanks(sortPriorityRows(candidateRows));
}

function capturePacketSummary(packets = []) {
  return {
    schema_version: "confection_wrapper_ingredient_capture_packets.v1",
    generated_at: generatedAt,
    run_id: runId,
    packet_count: packets.length,
    surface_rows: packets.reduce((sum, packet) => sum + Number(packet.surface_count || 0), 0),
    primary_text_rows: packets.reduce((sum, packet) => sum + Number(packet.primary_text_rows || 0), 0),
    support_text_rows: packets.reduce((sum, packet) => sum + Number(packet.support_text_rows || 0), 0),
    ready_for_ocr: packets.reduce((sum, packet) => sum + Number(packet.ready_for_ocr || 0), 0),
    private_paths_needed: packets.reduce((sum, packet) => sum + Number(packet.private_paths_needed || 0), 0),
    verified_ingredient_labels: 0,
    by_product: countBy(packets, "product_name"),
    first_packets: packets.slice(0, 12).map((packet) => ({
      packet_id: packet.packet_id,
      packet_rank: packet.packet_rank,
      product_name: packet.product_name,
      vintage_label: packet.vintage_label,
      source_url: packet.source_url,
      surface_count: packet.surface_count,
      primary_text_rows: packet.primary_text_rows,
      support_text_rows: packet.support_text_rows,
      private_paths_needed: packet.private_paths_needed,
      recommended_next_action: packet.recommended_next_action,
    })),
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      images_committed: false,
      ocr_text_committed: false,
      manual_verified_created: false,
    },
    public_artifacts: {
      capture_packet_csv: publicArtifactRef(capturePacketCsvPath),
      capture_packet_json: publicArtifactRef(capturePacketJsonPath),
      capture_packet_runbook_md: publicArtifactRef(capturePacketRunbookPath),
    },
  };
}

function manifestFor({ storyManifest, surfaceRows, rows, auditSummary = {}, captureTaskSummary = {}, packets = [], packetSummary = {} }) {
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
    image_map_template_rows: auditSummary.template_rows || rows.length,
    image_map_key_count: auditSummary.image_map_key_count || 0,
    capture_task_rows: captureTaskSummary.task_count || rows.length,
    capture_packets: packetSummary.packet_count || packets.length,
    paths_needed: captureTaskSummary.paths_needed ?? rows.length,
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
    image_map_audit: auditSummary,
    capture_task_summary: captureTaskSummary,
    capture_packet_summary: packetSummary,
    first_rows: rows.slice(0, 16).map((row) => ({
      global_capture_rank: row.global_capture_rank,
      product_capture_rank: row.product_capture_rank,
      product_id: row.product_id,
      product_name: row.product_name,
      vintage_label: row.vintage_label,
      evidence_id: row.evidence_id,
      surface_id: row.surface_id,
      surface_label: row.surface_label,
      photo_priority: row.photo_priority,
      source_url: row.source_url,
      image_map_keys: row.image_map_keys,
      capture_instruction: row.capture_instruction,
      claim_gate: row.claim_gate,
    })),
    product_priorities: products,
    artifacts: {
      ingredient_priority_json: publicArtifactRef(priorityJsonPath),
      ingredient_priority_csv: publicArtifactRef(priorityCsvPath),
      ingredient_priority_runbook_md: publicArtifactRef(runbookPath),
      image_map_template_csv: publicArtifactRef(imageMapTemplatePath),
      image_map_audit_csv: publicArtifactRef(auditCsvPath),
      image_map_audit_json: publicArtifactRef(auditJsonPath),
      capture_task_csv: publicArtifactRef(captureTaskCsvPath),
      capture_task_json: publicArtifactRef(captureTaskJsonPath),
      capture_task_runbook_md: publicArtifactRef(captureTaskRunbookPath),
      capture_packet_csv: publicArtifactRef(capturePacketCsvPath),
      capture_packet_json: publicArtifactRef(capturePacketJsonPath),
      capture_packet_runbook_md: publicArtifactRef(capturePacketRunbookPath),
    },
  };
}

function renderCapturePacketRunbook(summary = {}, packets = []) {
  const lines = [
    "# Candy Wrapper Archive Ingredient Capture Packets",
    "",
    `Generated: ${summary.generated_at || generatedAt}`,
    `Run ID: ${summary.run_id || runId}`,
    "",
    "These packets group CWA ingredient-priority rows by source page. They are the human capture unit: open one source page, capture ingredient and nutrition panels first, then capture supporting wrapper text, net weight, and maker/date cues if visible.",
    "",
    "## Totals",
    "",
    `- Packets: ${summary.packet_count || 0}`,
    `- Surface rows: ${summary.surface_rows || 0}`,
    `- Primary ingredient/nutrition rows: ${summary.primary_text_rows || 0}`,
    `- Support text rows: ${summary.support_text_rows || 0}`,
    `- Private paths needed: ${summary.private_paths_needed || 0}`,
    "",
    "## Operator Flow",
    "",
    "1. Open the packet source URL.",
    "2. Capture a page screenshot privately if useful for context.",
    "3. Crop the ingredient panel first, then nutrition panel.",
    "4. Crop back/side wrapper text, net weight, and maker/date cues when readable.",
    "5. Fill the private image-map template rows for each captured surface.",
    "6. Run the image-map audit, then native OCR only on readable text crops.",
    "",
    "## First Packets",
    "",
  ];
  for (const packet of packets.slice(0, 25)) {
    lines.push(`### ${packet.packet_rank}. ${packet.product_name} / ${packet.vintage_label}`);
    lines.push("");
    lines.push(`- Source: ${packet.source_url || "source needed"}`);
    lines.push(`- Surfaces: ${packet.capture_surface_order}`);
    lines.push(`- Evidence IDs: \`${packet.evidence_ids}\``);
    lines.push(`- Next action: ${packet.recommended_next_action}`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
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
    `- Image-map template rows: ${totals.image_map_template_rows || 0}`,
    `- Source-page capture packets: ${totals.capture_packets || 0}`,
    `- Private paths still needed: ${totals.paths_needed || 0}`,
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
  const packets = buildCapturePackets(rows);
  const packetSummary = capturePacketSummary(packets);
  const templateRows = imageMapTemplateRows(rows);
  const auditRows = publicAuditRows(templateRows);
  const auditSummary = summarizeAudit(runId, auditRows, {
    publicAuditCsvRef: publicArtifactRef(auditCsvPath),
    publicAuditJsonRef: publicArtifactRef(auditJsonPath),
  });
  const captureTasks = buildCaptureTasks({ runId, templateRows, auditRows });
  const captureTaskSummary = buildTaskSummary({
    runId,
    tasks: captureTasks,
    publicTaskCsvPath: captureTaskCsvPath,
    publicTaskJsonPath: captureTaskJsonPath,
    publicRunbookPath: captureTaskRunbookPath,
  });
  const manifest = manifestFor({
    storyManifest,
    surfaceRows,
    rows,
    auditSummary,
    captureTaskSummary,
    packets,
    packetSummary,
  });

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
    "source_type",
    "surface_id",
    "surface_label",
    "surface_rank",
    "proof_lane",
    "photo_priority",
    "ocr_priority",
    "ocr_gap_category",
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
    "image_map_keys",
    "local_private_image_path",
    "processed_private_image_path",
    "panel_crop_note",
    "primary_text_surface",
    "support_text_surface",
    "private_paths_supplied",
    "ready_for_ocr",
    "candidate_only",
    "manual_verified",
  ], rows);
  writeCsv(imageMapTemplatePath, [
    "run_id",
    "priority_id",
    "global_capture_rank",
    "product_capture_rank",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_type",
    "source_title",
    "surface_id",
    "surface_label",
    "ocr_gap_category",
    "ocr_priority",
    "capture_strategy",
    "crop_target",
    "ocr_expected_surface",
    "image_map_keys",
    "local_private_image_path",
    "processed_private_image_path",
    "panel_crop_note",
    "rights_review_status",
    "publication_image_policy",
    "candidate_only",
    "manual_verified",
  ], templateRows);
  writeCsv(auditCsvPath, [
    "run_id",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_type",
    "ocr_gap_category",
    "ocr_priority",
    "capture_strategy",
    "key_count",
    "private_path_supplied",
    "private_path_exists",
    "extension_ok",
    "audit_status",
    "recommended_next_action",
    "candidate_only",
    "manual_verified",
  ], auditRows);
  writeJson(auditJsonPath, auditSummary);
  writeCsv(captureTaskCsvPath, [
    "run_id",
    "task_id",
    "task_rank",
    "task_priority_score",
    "audit_status",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_title",
    "source_type",
    "ocr_gap_category",
    "ocr_priority",
    "capture_strategy",
    "crop_target",
    "ocr_expected_surface",
    "image_map_keys",
    "key_count",
    "private_template_fields_to_fill",
    "rights_review_status",
    "publication_image_policy",
    "recommended_next_action",
    "done_when",
    "candidate_only",
    "manual_verified",
  ], captureTasks);
  writeJson(captureTaskJsonPath, captureTaskSummary);
  writeCsv(capturePacketCsvPath, [
    "run_id",
    "packet_id",
    "packet_rank",
    "product_id",
    "product_name",
    "priority_tier",
    "lineage_span_label",
    "source_era_rank",
    "vintage_label",
    "version_id",
    "source_domain",
    "source_url",
    "source_title",
    "surface_count",
    "primary_text_rows",
    "support_text_rows",
    "ingredient_panel_evidence_id",
    "nutrition_panel_evidence_id",
    "evidence_ids",
    "image_map_key_count",
    "capture_surface_order",
    "private_paths_needed",
    "ready_for_ocr",
    "verified_ingredient_labels",
    "recommended_next_action",
    "done_when",
    "claim_gate",
    "publication_image_policy",
    "candidate_only",
    "manual_verified",
  ], packets);
  writeJson(capturePacketJsonPath, { ...packetSummary, packets });
  fs.mkdirSync(path.dirname(runbookPath), { recursive: true });
  fs.writeFileSync(runbookPath, renderRunbook(manifest));
  fs.writeFileSync(captureTaskRunbookPath, renderCaptureTaskRunbook(captureTaskSummary, captureTasks));
  fs.writeFileSync(capturePacketRunbookPath, renderCapturePacketRunbook(packetSummary, packets));

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
    image_map_audit: manifest.image_map_audit,
    capture_task_summary: manifest.capture_task_summary,
    capture_packet_summary: manifest.capture_packet_summary,
    first_rows: manifest.first_rows,
    artifacts: manifest.artifacts,
  };
  summary.confection_wrapper_ingredient_capture_task_summary = captureTaskSummary;
  summary.confection_wrapper_ingredient_capture_packet_summary = packetSummary;
  summary.confection_wrapper_ingredient_image_map_audit = auditSummary;
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
    image_map_template_rows: manifest.totals.image_map_template_rows,
    capture_task_rows: manifest.totals.capture_task_rows,
    capture_packets: manifest.totals.capture_packets,
    ingredient_priority_csv: manifest.artifacts.ingredient_priority_csv,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildIngredientPriority,
  buildCapturePackets,
  capturePacketSummary,
  imageMapTemplateRows,
  writeIngredientPriority,
};
