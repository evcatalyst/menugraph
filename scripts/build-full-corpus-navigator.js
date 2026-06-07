const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");

const generatedAt = "2026-06-07T21:45:00Z";

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

const vintageMeta = {
  current_2020s: { year: 2026, label: "Current SKU anchor" },
  "2010s": { year: 2010, label: "2010s bridge" },
  "2000s": { year: 2002, label: "2000s bridge" },
  "1990s": { year: 1993, label: "1990s bridge" },
  "1980s_or_earlier": { year: 1965, label: "1980s or earlier lead" },
  earliest_verified_label: { year: 1912, label: "Earliest label hunt" },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function present(value) {
  return String(value ?? "").trim();
}

function firstPart(value) {
  return present(value).split(";").map((item) => item.trim()).filter(Boolean);
}

function titleCaseStatus(value) {
  return present(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeSummaryStatus(status) {
  if (status === "no_source") return "source_discovery_needed";
  if (status === "candidate_needs_panel") return "needs_photo_review";
  if (status === "candidate_needs_transcription") return "needs_label_transcription";
  if (status === "candidate_needs_archive") return "needs_photo_review";
  if (status === "candidate_found") return "source_review";
  if (status === "manual_verified") return "manual_verified";
  return status || "source_review";
}

function publicImagePolicy(row) {
  const image = present(row.image_path_or_url);
  const rights = present(row.license_rights_note);
  const source = `${row.source_domain || ""} ${row.source_url || ""}`.toLowerCase();
  const rightsText = rights.toLowerCase();
  const rightsClear = /public domain|cc[- ]?by|creative commons|wikimedia commons|owned image|rights cleared/.test(rightsText);
  const blocked = /inspect license|rights note needed|before reuse|external source|collector photo|current-web/.test(rightsText);
  const isLocal = /^\/|^file:/.test(image);
  if (!image) {
    return {
      public_image_url: "",
      thumbnail_url: "",
      source_photo_url: present(row.source_url || row.archive_url),
      image_display_policy: present(row.source_url || row.archive_url) ? "source_link_only_no_public_image" : "missing_source_image",
      rights_status: rights || "rights note not recorded",
      local_private_capture_path: "",
    };
  }
  if (rightsClear && !blocked && !isLocal && !/flickr\.com/.test(source)) {
    return {
      public_image_url: image,
      thumbnail_url: image,
      source_photo_url: present(row.source_url || row.archive_url),
      image_display_policy: "embed_rights_cleared",
      rights_status: rights || "rights cleared",
      local_private_capture_path: "",
    };
  }
  return {
    public_image_url: "",
    thumbnail_url: "",
    source_photo_url: present(row.source_url || row.archive_url),
    image_display_policy: isLocal ? "private_capture_only" : "source_link_only_rights_unclear",
    rights_status: rights || "rights note needed before reproducing imagery",
    local_private_capture_path: isLocal ? "[private_path_redacted]" : "",
  };
}

function evidenceStatus(row) {
  const status = row.evidence_status || row.source_raw_status || row.candidate_status || "";
  if (row.registry_record_type === "unsupported_gap") return "source_discovery_needed";
  if (row.manual_transcription_available === "1") return "manual_verified";
  if (row.ingredient_text_available === "1" || row.ocr_text_available === "1") return "label_text_candidate";
  if (row.ingredient_panel_visible === "1") return "label_visible";
  if (row.front_visible === "1" || row.image_path_or_url || /photo|image|package/i.test(`${row.evidence_kind} ${row.source_surface}`)) return "usable_photo";
  if (status === "discovered") return "source_review";
  return normalizeSummaryStatus(status);
}

function evidenceFromRegistryRow(row) {
  const policy = publicImagePolicy(row);
  return {
    id: row.evidence_id,
    title: row.source_title || row.unsupported_gap_note || `${row.display_name} ${row.vintage_label} evidence`,
    source: row.source_domain || row.source_publisher_owner || "source needed",
    url: row.source_url || row.archive_url || "",
    status: evidenceStatus(row),
    kind: row.evidence_kind || row.registry_record_type || "evidence",
    photo_role: row.front_visible === "1"
      ? "front/package object"
      : row.ingredient_panel_visible === "1"
        ? "ingredient panel candidate"
        : row.evidence_kind || "source receipt",
    label_panel_state: row.ingredient_panel_visible === "1"
      ? "ingredient panel visible"
      : row.ingredient_text_available === "1"
        ? "ingredient text candidate"
        : row.registry_record_type === "unsupported_gap"
          ? "no source-attributable label evidence"
          : "panel not verified readable",
    date_basis_state: row.claimed_product_date_text || row.capture_date_text || row.vintage_label || "date basis needs review",
    quality_note: row.reviewer_notes || row.promotion_blocker || row.unsupported_gap_note || "Review source attribution, date basis, panel visibility, and rights before using this evidence.",
    rights: row.license_rights_note || row.source_attribution_grade || "External source; rights note needed before reproducing imagery.",
    ...policy,
  };
}

function groupRegistry(summary) {
  const grouped = new Map();
  for (const row of summary.evidence_registry || []) {
    const key = row.canonical_name;
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  return grouped;
}

function sourceDomains(rows) {
  return [...new Set(rows.map((row) => row.source_domain).filter(Boolean))].slice(0, 8);
}

function sourceCountFor(summaryProduct, vintage, rows) {
  return numeric(summaryProduct.vintage_statuses?.[vintage]?.source_count || rows.filter((row) => row.registry_record_type !== "unsupported_gap").length);
}

function versionFor(summaryProduct, vintage, rows) {
  const meta = vintageMeta[vintage] || { year: 2026, label: titleCaseStatus(vintage) };
  const sourceCount = sourceCountFor(summaryProduct, vintage, rows);
  const rawStatus = summaryProduct.vintage_statuses?.[vintage]?.status || (sourceCount ? "candidate_found" : "no_source");
  const status = normalizeSummaryStatus(rawStatus);
  const evidenceIds = rows.map((row) => row.evidence_id).filter(Boolean);
  const visibleLabels = rows.filter((row) => row.ingredient_panel_visible === "1" || row.ingredient_text_available === "1" || row.ocr_text_available === "1").length;
  const photoRows = rows.filter((row) => row.front_visible === "1" || row.image_path_or_url || /photo|image|package/i.test(`${row.evidence_kind} ${row.source_surface}`)).length;
  const isMissing = !sourceCount || status === "source_discovery_needed";
  return {
    id: vintage,
    year: meta.year,
    label: meta.label,
    vintage,
    status,
    source_count: sourceCount,
    confidence: Math.min(0.78, Math.max(0.12, (sourceCount * 0.08) + (visibleLabels * 0.08) + (photoRows * 0.04))),
    headline: isMissing
      ? `${meta.label}: source evidence needed`
      : visibleLabels
        ? `${meta.label}: label-visible candidate`
        : `${meta.label}: source/photo lead`,
    ingredient_summary: isMissing
      ? `${summaryProduct.display_name} has no source-attributable ${meta.label} ingredient label in the current registry. Show this as a source-discovery gap, not a recipe claim.`
      : visibleLabels
        ? `${sourceCount} source row${sourceCount === 1 ? "" : "s"} include label or ingredient-text signals. Text remains candidate-only until OCR/manual review.`
        : `${sourceCount} source row${sourceCount === 1 ? "" : "s"} can support package history or discovery context, but not ingredient changes until a readable label is captured.`,
    facet_summary: isMissing
      ? ["source discovery", "photo needed", "claim boundary"]
      : visibleLabels
        ? ["label visible", "OCR/manual review", "candidate text"]
        : ["photo/source lead", "panel review", "claim boundary"],
    photo_quality: {
      role: photoRows ? "source-attributable package/photo/document lead" : "source or photo needed",
      package_front: photoRows ? "candidate package object" : "not attached",
      label_panel: visibleLabels ? "label or ingredient text signal visible" : "not verified readable",
      date_basis: rows.find((row) => row.claimed_product_date_text)?.claimed_product_date_text || meta.label,
      quality_score: Math.min(0.82, Math.max(0.1, (sourceCount * 0.08) + (visibleLabels * 0.12))),
      blocker: visibleLabels
        ? "Correct OCR/manual transcription and reviewer attribution are required before claim promotion."
        : isMissing
          ? "Find a source-attributable package, document, archive, menu, or catalog before this slot can support the story."
          : "Capture or find a readable ingredient/nutrition panel before comparing formulation changes.",
    },
    package_context: rows.find((row) => row.net_weight_text || row.serving_size_text)?.net_weight_text
      || "Package weight, serving size, and manufacturer fields need review before normalization.",
    price_weight_context: "Price/weight alignment remains deferred until package fields and price links are verified.",
    next_step: isMissing
      ? "Run source discovery, attach attribution, then classify photo and label roles."
      : visibleLabels
        ? "Capture panel crop, run OCR/manual correction, and record reviewer attribution."
        : "Open the source links, capture private panel crops, and classify ingredient/net-weight visibility.",
    evidence_ids: evidenceIds,
    validation_state: {
      state: status,
      public_label: titleCaseStatus(status),
      reviewer_required_for_claims: true,
      evidence_count: evidenceIds.length,
      note: "This full-corpus entry is story/navigation evidence only; it does not promote formulation claims.",
    },
  };
}

function reviewQueueRow(summaryProduct, version) {
  return {
    vintage: version.vintage,
    label: version.label,
    status: version.status,
    missing_fields: version.status === "source_discovery_needed"
      ? "source_attribution,photo_or_document,ingredient_panel,package_identity"
      : "panel_crop,ocr_or_manual_text,reviewer,package_weight_or_size,manufacturer_or_distributor",
    next_action: version.next_step,
  };
}

function facetRows(product) {
  return [
    {
      id: "photo_proof",
      label: "Photo/source proof",
      status: numeric(product.photo_evidence_rows) ? "needs_photo_review" : "source_discovery_needed",
      detail: numeric(product.photo_evidence_rows)
        ? `${product.photo_evidence_rows} source/photo rows need visible-role and rights review.`
        : "No photo evidence is attached yet; start with source discovery.",
      photo_unlock: "Attach public-safe image policy and private OCR captures.",
    },
    {
      id: "label_text",
      label: "Ingredient label text",
      status: numeric(product.ingredient_ocr_summary?.label_visible_count) ? "needs_label_transcription" : "needs_photo_review",
      detail: `${product.ingredient_ocr_summary?.label_visible_count || 0} label-visible candidates need OCR/manual correction.`,
      photo_unlock: "Readable panel crop plus corrected text.",
    },
    {
      id: "price_weight",
      label: "Price/weight alignment",
      status: "needs_manual_verification",
      detail: "Package size, serving size, and price links must be verified before normalized analysis.",
      photo_unlock: "Net-weight and serving-size panel capture.",
    },
  ];
}

function productShell(summaryProduct, registryRows, vintages) {
  const evidence = registryRows.map(evidenceFromRegistryRow);
  const versions = vintages.map((vintage) => versionFor(
    summaryProduct,
    vintage,
    registryRows.filter((row) => row.vintage_label === vintage),
  ));
  const sourceBackedSlots = versions.filter((version) => version.source_count > 0).length;
  const missingSlots = versions.length - sourceBackedSlots;
  const sourceDomainList = sourceDomains(registryRows);
  return {
    id: summaryProduct.canonical_name,
    name: summaryProduct.display_name,
    brand: summaryProduct.brand,
    category: summaryProduct.category,
    corpus_scope: "full_corpus_shell",
    summary: `${summaryProduct.display_name} is now selectable in the full-corpus proof navigator. This entry exposes source/photo readiness and explicit claim boundaries before ingredient claims.`,
    story_thesis: `${summaryProduct.display_name} has ${sourceBackedSlots}/${versions.length} source-backed eras in the current registry; ingredient changes remain locked until readable labels are captured and verified.`,
    identity_scope: "Product family/SKU boundaries require manual review before same-product formulation comparisons.",
    maker_timeline: "Manufacturer/distributor timeline is not verified in this full-corpus shell.",
    claim_boundary: "Do not publish definitive formulation diffs until source-attributable label text is manually verified.",
    next_unlock: summaryProduct.recommended_next_action || "Open best source URLs, classify visible panels, archive URLs, and attach verified label text where readable.",
    source_backed_slots: sourceBackedSlots,
    total_slots: versions.length,
    coverage: Math.round((sourceBackedSlots / Math.max(1, versions.length)) * 100),
    candidate_count: numeric(summaryProduct.product_candidate_count || registryRows.length),
    verified_labels: numeric(summaryProduct.ground_truth_slots || 0),
    label_visible_leads: numeric(summaryProduct.ingredient_ocr_summary?.label_visible_count || 0),
    label_text_candidates: numeric(summaryProduct.ingredient_ocr_summary?.ingredient_text_candidate_count || 0),
    photo_enriched_eras: versions.filter((version) => version.photo_quality.role.includes("source-attributable")).length,
    photo_quality_summary: {
      headline: `${summaryProduct.photo_evidence_rows || 0} photo/source leads need review`,
      can_prove: "Source presence, product/era candidates, and review workload.",
      cannot_prove: "Ingredient changes, original recipes, or package-size changes without readable verified labels.",
      highest_value_next: summaryProduct.recommended_next_action || "Capture readable panels for high-priority source rows.",
    },
    pilot_rollup_status: "full_corpus_selectable",
    claim_rollup_status: "needs_manual_verification",
    story_resolution: {
      status: "full_corpus_selectable",
      resolved_slots: sourceBackedSlots,
      source_backed_slots: sourceBackedSlots,
      source_discovery_slots: missingSlots,
      outstanding_gap_count: missingSlots,
      claim_gate: "Candidate-only full-corpus shell; no formulation claim is promoted without manual verification.",
    },
    outstanding_gap_count: missingSlots,
    resolved_gap_count: 0,
    resolved_story_slots: sourceBackedSlots,
    story_resolution_coverage: Math.round((sourceBackedSlots / Math.max(1, versions.length)) * 100),
    source_domains: sourceDomainList,
    ingredient_ocr_summary: summaryProduct.ingredient_ocr_summary || {},
    versions,
    evidence,
    review_queue: versions.map((version) => reviewQueueRow(summaryProduct, version)),
    facets: facetRows(summaryProduct),
    blocked_map: [
      {
        lane: "Photo rights and display",
        status: numeric(summaryProduct.photo_evidence_rows) ? "needs_photo_review" : "source_discovery_needed",
        why: "External package photos are link-only until rights are recorded as clear.",
        photo_target: "Record public_image_url only for rights-cleared images; otherwise preserve source_photo_url.",
      },
      {
        lane: "Ingredient transcription",
        status: numeric(summaryProduct.ingredient_ocr_summary?.label_visible_count) ? "needs_label_transcription" : "needs_photo_review",
        why: "Ingredient text cannot be claimed until a readable label is OCR/manual corrected.",
        photo_target: "Capture ingredient panel crop and run Vision OCR.",
      },
      {
        lane: "Price and weight",
        status: "needs_manual_verification",
        why: "Normalization requires verified package weight, serving size, and price links.",
        photo_target: "Net-weight and nutrition panel crop.",
      },
    ],
    events: versions.map((version) => ({
      year: version.year,
      label: version.label,
      detail: version.ingredient_summary,
      status: version.status,
    })),
    clusters: [
      {
        label: "Full-corpus shell",
        status: "full_corpus_selectable",
        detail: "Selectable product with source/photo readiness and claim boundaries generated from registry rows.",
      },
    ],
    grok_research_assist: {
      recommended_use: "Optional source hunting and validation advice only; not evidence.",
    },
    export_paths: {
      ocr_queue_csv: "../data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv",
      full_corpus_ocr_queue_csv: "../data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv",
      full_corpus_ocr_gap_csv: "../data/product-evidence/exports/full_corpus_ingredient_ocr_gap_report.csv",
    },
  };
}

function enrichPilotProduct(product, summaryProduct) {
  product.corpus_scope = "story_rich_pilot";
  product.evidence = (product.evidence || []).map((row) => {
    const policy = publicImagePolicy({
      image_path_or_url: row.image_url || row.image_path_or_url || row.package_image_url || row.screenshot_image_path || "",
      license_rights_note: row.rights,
      source_domain: row.source,
      source_url: row.url,
      archive_url: "",
    });
    return {
      public_image_url: policy.public_image_url,
      thumbnail_url: policy.thumbnail_url,
      source_photo_url: row.url || "",
      image_display_policy: policy.image_display_policy,
      rights_status: policy.rights_status,
      local_private_capture_path: policy.local_private_capture_path,
      ...row,
    };
  });
  product.story_resolution = product.story_resolution || {};
  product.story_resolution.source_discovery_slots = product.story_resolution.source_discovery_slots || 0;
  product.photo_quality_summary = {
    ...(product.photo_quality_summary || {}),
    display_policy: "External photos remain link-only unless rights are clear; source receipts still appear beside ingredient candidates.",
  };
  product.export_paths = {
    ...(product.export_paths || {}),
    ocr_queue_csv: product.export_paths?.ocr_queue_csv || "../data/product-evidence/exports/ten_product_pilot_ocr_queue.csv",
    full_corpus_ocr_queue_csv: "../data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv",
    full_corpus_ocr_gap_csv: "../data/product-evidence/exports/full_corpus_ingredient_ocr_gap_report.csv",
  };
  if (summaryProduct) {
    product.full_corpus_rank = numeric(summaryProduct.target_priority);
    product.ingredient_ocr_summary = product.ingredient_ocr_summary || summaryProduct.ingredient_ocr_summary;
  }
  return product;
}

function ensureLegend(data) {
  const byKey = new Map((data.status_legend || []).map((row) => [row.key, row]));
  [
    ["full_corpus_selectable", "Full corpus selectable", "A product has a generated proof shell from the registry; claims remain candidate-only."],
    ["source_discovery_needed", "Source discovery needed", "No source-attributable evidence is attached for this era."],
    ["source_link_only_rights_unclear", "Link-only image", "Photo source is cited, but the image is not embedded because rights are unclear."],
    ["embed_rights_cleared", "Embedded image", "Image can be displayed because rights are recorded as clear."],
    ["private_capture_only", "Private capture", "Image exists only in the private OCR/capture cache and is not published."],
  ].forEach(([key, label, meaning]) => {
    byKey.set(key, { key, label, meaning });
  });
  data.status_legend = [...byKey.values()];
}

function productSort(summaryProductsById, product) {
  const pilotIndex = pilotOrder.indexOf(product.id);
  const summaryProduct = summaryProductsById.get(product.id) || {};
  return {
    pilotIndex: pilotIndex === -1 ? 999 : pilotIndex,
    priority: numeric(summaryProduct.target_priority),
    name: product.name,
  };
}

function main() {
  const summary = readJson(summaryPath);
  const currentNavigator = readJson(navigatorPath);
  const registryByProduct = groupRegistry(summary);
  const summaryProductsById = new Map((summary.products || []).map((product) => [product.canonical_name, product]));
  const pilotById = new Map(
    (currentNavigator.products || [])
      .filter((product) => pilotOrder.includes(product.id))
      .map((product) => [product.id, product]),
  );
  const vintages = summary.vintages || currentNavigator.vintages || Object.keys(vintageMeta);

  const products = (summary.products || []).map((summaryProduct) => {
    const pilot = pilotById.get(summaryProduct.canonical_name);
    if (pilot) return enrichPilotProduct(pilot, summaryProduct);
    return productShell(summaryProduct, registryByProduct.get(summaryProduct.canonical_name) || [], vintages);
  }).sort((a, b) => {
    const left = productSort(summaryProductsById, a);
    const right = productSort(summaryProductsById, b);
    return left.pilotIndex - right.pilotIndex
      || right.priority - left.priority
      || left.name.localeCompare(right.name);
  });

  const data = {
    ...currentNavigator,
    generated_at_utc: generatedAt,
    default_product: currentNavigator.default_product || "oreo_original_chocolate_sandwich_cookies",
    vintages,
    products,
    product_index: products.map((product) => ({
      id: product.id,
      label: product.name,
      status: "loaded",
      scope: product.corpus_scope,
      claim_status: product.claim_rollup_status,
      source_backed_slots: product.source_backed_slots,
      total_slots: product.total_slots,
    })),
    review_queue: products.flatMap((product) => (
      (product.review_queue || []).map((row) => ({
        product_id: product.id,
        product_name: product.name,
        source_count: product.versions.find((version) => version.vintage === row.vintage || version.label === row.label)?.source_count || 0,
        ...row,
      }))
    )),
    corpus_summary: {
      product_count: products.length,
      story_rich_pilot_count: products.filter((product) => product.corpus_scope === "story_rich_pilot").length,
      full_corpus_shell_count: products.filter((product) => product.corpus_scope === "full_corpus_shell").length,
      source_backed_slots: products.reduce((sum, product) => sum + numeric(product.source_backed_slots), 0),
      total_slots: products.reduce((sum, product) => sum + numeric(product.total_slots), 0),
      embedded_public_images: products.flatMap((product) => product.evidence || []).filter((row) => row.image_display_policy === "embed_rights_cleared").length,
      link_only_photo_receipts: products.flatMap((product) => product.evidence || []).filter((row) => /link_only/.test(row.image_display_policy || "")).length,
      note: "The navigator is full-corpus selectable. Most products are conservative proof shells until photo rights, OCR, and manual verification improve.",
    },
  };
  ensureLegend(data);
  writeJson(navigatorPath, data);

  console.log(JSON.stringify({
    products: data.products.length,
    story_rich_pilot: data.corpus_summary.story_rich_pilot_count,
    full_corpus_shells: data.corpus_summary.full_corpus_shell_count,
    review_queue: data.review_queue.length,
    embedded_public_images: data.corpus_summary.embedded_public_images,
    link_only_photo_receipts: data.corpus_summary.link_only_photo_receipts,
  }, null, 2));
}

if (require.main === module) main();
