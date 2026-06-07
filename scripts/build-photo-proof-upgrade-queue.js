const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");
const manifestPath = path.join(root, "docs/data/product-evidence/photo_proof_upgrade_manifest.json");
const queueCsvPath = path.join(root, "docs/data/product-evidence/exports/photo_proof_upgrade_queue.csv");
const queueJsonPath = path.join(root, "docs/data/product-evidence/exports/photo_proof_upgrade_queue.json");
const markdownPath = path.join(root, "docs/data/product-evidence/exports/photo_proof_upgrade_report.md");
const generatedAt = "2026-06-07T22:30:00Z";

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

function labelFor(value) {
  return present(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function sourceUrl(row) {
  return present(row.source_photo_url || row.url || row.source_url || row.archive_url);
}

function hasIngredientSignal(row, linkedVersions) {
  const text = `${row.status || ""} ${row.kind || ""} ${row.photo_role || ""} ${row.label_panel_state || ""} ${row.quality_note || ""}`.toLowerCase();
  return /ingredient|label text|manual_verified|ocr|nutrition facts|serving size|net weight/.test(text)
    || linkedVersions.some((version) => Boolean(version.label_extract));
}

function versionIndex(product) {
  const index = new Map();
  for (const version of product.versions || []) {
    for (const evidenceId of version.evidence_ids || []) {
      if (!index.has(evidenceId)) index.set(evidenceId, []);
      index.get(evidenceId).push({
        version_id: version.id,
        vintage: version.vintage || version.id,
        year: version.year || "",
        label: version.label || version.id,
        status: version.status || "",
        label_extract: version.label_extract || null,
      });
    }
  }
  return index;
}

function displayLane(row, source, ingredientSignal) {
  const policy = row.image_display_policy || "";
  if (policy === "embed_rights_cleared" && (row.public_image_url || row.thumbnail_url)) return "embed_ready";
  if (!source) return "source_discovery_needed";
  if (policy === "private_capture_only") return "private_capture_only";
  if (policy === "source_link_only_rights_unclear") return "rights_review_needed";
  if (ingredientSignal) return "panel_capture_needed";
  if (policy === "source_link_only_no_public_image") return "source_page_capture_needed";
  if (policy === "missing_source_image") return "source_page_capture_needed";
  return "source_review_needed";
}

function nextActionFor(lane, ingredientSignal) {
  if (lane === "embed_ready") return "Publish the rights-cleared image beside the candidate extract and keep source attribution visible.";
  if (lane === "rights_review_needed") return "Review source license/rights. If clear, add public_image_url; otherwise keep link-only and capture privately for OCR.";
  if (lane === "panel_capture_needed") return "Capture a private ingredient/nutrition panel crop, run native OCR, and keep the public page link-only until rights are clear.";
  if (lane === "private_capture_only") return "Run OCR against the private capture and publish only reviewer-safe text/status, not the local image path.";
  if (lane === "source_page_capture_needed") return ingredientSignal
    ? "Open the source page, capture the panel privately, and record crop coordinates for OCR review."
    : "Open the source page, classify the visible product/photo role, and decide whether a panel crop exists.";
  if (lane === "source_discovery_needed") return "Run source discovery for an attributable photo, document, archive, retailer, collector, or brand page.";
  return "Review the source page and classify whether this can become story proof, OCR input, or visual context only.";
}

function priorityFor(product, row, lane, ingredientSignal, linkedVersions) {
  let score = 0;
  if (pilotOrder.includes(product.id)) score += 40;
  if (product.corpus_scope === "story_rich_pilot") score += 20;
  if (ingredientSignal) score += 28;
  if (linkedVersions.some((version) => version.label_extract)) score += 22;
  if (row.status === "manual_verified") score += 18;
  if (row.status === "label_visible" || row.status === "label_text_candidate") score += 14;
  if (lane === "embed_ready") score += 12;
  if (lane === "rights_review_needed") score += 10;
  if (lane === "panel_capture_needed") score += 8;
  if (lane === "source_discovery_needed") score -= 8;
  if (String(row.kind || "").includes("unsupported_gap")) score -= 10;
  const oldestYear = Math.min(...linkedVersions.map((version) => numeric(version.year)).filter(Boolean));
  if (oldestYear && oldestYear < 2000) score += 8;
  return Math.max(0, score);
}

function rowFor(product, evidence, index) {
  const source = sourceUrl(evidence);
  const linkedVersions = index.get(evidence.id) || [];
  const ingredientSignal = hasIngredientSignal(evidence, linkedVersions);
  const lane = displayLane(evidence, source, ingredientSignal);
  const priority = priorityFor(product, evidence, lane, ingredientSignal, linkedVersions);
  return {
    product_id: product.id,
    product_name: product.name,
    corpus_scope: product.corpus_scope || "",
    category: product.category || "",
    evidence_id: evidence.id,
    evidence_status: evidence.status || "",
    evidence_kind: evidence.kind || "",
    source_title: evidence.title || "",
    source_owner: evidence.source || "",
    source_url: source,
    source_photo_url: evidence.source_photo_url || "",
    rights_status: evidence.rights_status || evidence.rights || "",
    image_display_policy: evidence.image_display_policy || "",
    public_image_url: evidence.public_image_url || "",
    thumbnail_url: evidence.thumbnail_url || "",
    photo_role: evidence.photo_role || "",
    label_panel_state: evidence.label_panel_state || "",
    date_basis_state: evidence.date_basis_state || "",
    quality_note: evidence.quality_note || "",
    linked_vintages: linkedVersions.map((version) => version.vintage).join(";"),
    linked_years: linkedVersions.map((version) => version.year).filter(Boolean).join(";"),
    linked_version_labels: linkedVersions.map((version) => version.label).join(";"),
    has_label_extract: linkedVersions.some((version) => Boolean(version.label_extract)),
    ingredient_signal: ingredientSignal,
    display_lane: lane,
    upgrade_priority: priority,
    public_display_decision: lane === "embed_ready"
      ? "embed_image"
      : source
        ? "show_source_receipt_only"
        : "show_gap_only",
    next_action: nextActionFor(lane, ingredientSignal),
  };
}

function buildQueue(navigator) {
  return (navigator.products || [])
    .flatMap((product) => {
      const index = versionIndex(product);
      return (product.evidence || []).map((evidence) => rowFor(product, evidence, index));
    })
    .filter((row) => row.evidence_id)
    .sort((a, b) => b.upgrade_priority - a.upgrade_priority
      || a.product_name.localeCompare(b.product_name)
      || a.evidence_id.localeCompare(b.evidence_id));
}

function topCounts(rows, field, limit = 8) {
  const counts = new Map();
  for (const row of rows) {
    const value = present(row[field]) || "unknown";
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function productSummaries(rows) {
  const products = new Map();
  for (const row of rows) {
    if (!products.has(row.product_id)) {
      products.set(row.product_id, {
        id: row.product_id,
        name: row.product_name,
        corpus_scope: row.corpus_scope,
        row_count: 0,
        embed_ready_count: 0,
        source_receipt_count: 0,
        rights_review_needed_count: 0,
        panel_capture_needed_count: 0,
        source_discovery_needed_count: 0,
        ingredient_signal_count: 0,
        top_priority: 0,
        next_action: "",
      });
    }
    const product = products.get(row.product_id);
    product.row_count += 1;
    if (row.display_lane === "embed_ready") product.embed_ready_count += 1;
    if (row.public_display_decision === "show_source_receipt_only") product.source_receipt_count += 1;
    if (row.display_lane === "rights_review_needed") product.rights_review_needed_count += 1;
    if (row.display_lane === "panel_capture_needed") product.panel_capture_needed_count += 1;
    if (row.display_lane === "source_discovery_needed") product.source_discovery_needed_count += 1;
    if (row.ingredient_signal) product.ingredient_signal_count += 1;
    if (row.upgrade_priority > product.top_priority) {
      product.top_priority = row.upgrade_priority;
      product.next_action = row.next_action;
    }
  }
  return [...products.values()].sort((a, b) => b.top_priority - a.top_priority || a.name.localeCompare(b.name));
}

function buildManifest(navigator, rows) {
  const laneCounts = topCounts(rows, "display_lane", 12);
  const products = productSummaries(rows);
  return {
    schema_version: 1,
    generated_at_utc: generatedAt,
    public_policy: {
      summary: "External package photos remain link-only unless rights are recorded as clear. This queue tells reviewers how to convert source receipts into publishable visual proof or private OCR input.",
      publishable_image_rule: "Only rows with display_lane=embed_ready and a public_image_url/thumbnail_url may render an image in public pages.",
      ingredient_claim_rule: "Ingredient text remains candidate-only until manual verification, even when a photo or OCR candidate exists.",
    },
    totals: {
      products: (navigator.products || []).length,
      evidence_rows: rows.length,
      embed_ready: rows.filter((row) => row.display_lane === "embed_ready").length,
      source_receipts_only: rows.filter((row) => row.public_display_decision === "show_source_receipt_only").length,
      rights_review_needed: rows.filter((row) => row.display_lane === "rights_review_needed").length,
      panel_capture_needed: rows.filter((row) => row.display_lane === "panel_capture_needed").length,
      source_page_capture_needed: rows.filter((row) => row.display_lane === "source_page_capture_needed").length,
      source_discovery_needed: rows.filter((row) => row.display_lane === "source_discovery_needed").length,
      ingredient_signal_rows: rows.filter((row) => row.ingredient_signal).length,
      story_rich_pilot_rows: rows.filter((row) => row.corpus_scope === "story_rich_pilot").length,
      full_corpus_shell_rows: rows.filter((row) => row.corpus_scope === "full_corpus_shell").length,
    },
    artifacts: {
      queue_csv: "docs/data/product-evidence/exports/photo_proof_upgrade_queue.csv",
      queue_json: "docs/data/product-evidence/exports/photo_proof_upgrade_queue.json",
      report_markdown: "docs/data/product-evidence/exports/photo_proof_upgrade_report.md",
    },
    lane_counts: laneCounts,
    product_rollups: products,
    top_queue: rows.slice(0, 80),
  };
}

function writeMarkdown(filePath, manifest) {
  const lines = [
    "# Photo Proof Upgrade Queue",
    "",
    `Generated: ${manifest.generated_at_utc}`,
    "",
    manifest.public_policy.summary,
    "",
    "## Totals",
    "",
    `- Products: ${manifest.totals.products}`,
    `- Evidence rows: ${manifest.totals.evidence_rows}`,
    `- Embeddable images: ${manifest.totals.embed_ready}`,
    `- Source receipts only: ${manifest.totals.source_receipts_only}`,
    `- Rights review needed: ${manifest.totals.rights_review_needed}`,
    `- Panel capture needed: ${manifest.totals.panel_capture_needed}`,
    `- Source discovery needed: ${manifest.totals.source_discovery_needed}`,
    `- Ingredient-signal rows: ${manifest.totals.ingredient_signal_rows}`,
    "",
    "## Display Lanes",
    "",
    ...manifest.lane_counts.flatMap((row) => [
      `- ${labelFor(row.value)}: ${row.count}`,
    ]),
    "",
    "## Top Product Work",
    "",
    ...manifest.product_rollups.slice(0, 20).flatMap((product) => [
      `### ${product.name}`,
      "",
      `Rows: ${product.row_count} · Ingredient signals: ${product.ingredient_signal_count} · Source receipts: ${product.source_receipt_count}`,
      "",
      `Next: ${product.next_action || "Review evidence rows."}`,
      "",
    ]),
  ];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function updateSummary(summary, manifest) {
  summary.photo_proof_upgrade_summary = {
    generated_at_utc: manifest.generated_at_utc,
    product_count: manifest.totals.products,
    evidence_row_count: manifest.totals.evidence_rows,
    embed_ready_count: manifest.totals.embed_ready,
    source_receipt_only_count: manifest.totals.source_receipts_only,
    rights_review_needed_count: manifest.totals.rights_review_needed,
    panel_capture_needed_count: manifest.totals.panel_capture_needed,
    source_page_capture_needed_count: manifest.totals.source_page_capture_needed,
    source_discovery_needed_count: manifest.totals.source_discovery_needed,
    ingredient_signal_row_count: manifest.totals.ingredient_signal_rows,
    public_policy: manifest.public_policy,
    artifacts: manifest.artifacts,
    lane_counts: manifest.lane_counts,
    top_products: manifest.product_rollups.slice(0, 20),
    top_queue: manifest.top_queue.slice(0, 24),
  };
}

function main() {
  const navigator = readJson(navigatorPath);
  const summary = readJson(summaryPath);
  const queue = buildQueue(navigator);
  const manifest = buildManifest(navigator, queue);
  updateSummary(summary, manifest);

  writeJson(manifestPath, manifest);
  writeJson(queueJsonPath, queue);
  writeCsv(queueCsvPath, [
    "product_id",
    "product_name",
    "corpus_scope",
    "category",
    "evidence_id",
    "evidence_status",
    "evidence_kind",
    "source_title",
    "source_owner",
    "source_url",
    "source_photo_url",
    "rights_status",
    "image_display_policy",
    "public_image_url",
    "thumbnail_url",
    "photo_role",
    "label_panel_state",
    "date_basis_state",
    "quality_note",
    "linked_vintages",
    "linked_years",
    "linked_version_labels",
    "has_label_extract",
    "ingredient_signal",
    "display_lane",
    "upgrade_priority",
    "public_display_decision",
    "next_action",
  ], queue);
  writeMarkdown(markdownPath, manifest);
  writeJson(summaryPath, summary);

  console.log(JSON.stringify({
    products: manifest.totals.products,
    evidence_rows: manifest.totals.evidence_rows,
    embed_ready: manifest.totals.embed_ready,
    source_receipts_only: manifest.totals.source_receipts_only,
    rights_review_needed: manifest.totals.rights_review_needed,
    panel_capture_needed: manifest.totals.panel_capture_needed,
    source_discovery_needed: manifest.totals.source_discovery_needed,
    ingredient_signal_rows: manifest.totals.ingredient_signal_rows,
    queue_csv: queueCsvPath,
  }, null, 2));
}

if (require.main === module) main();
