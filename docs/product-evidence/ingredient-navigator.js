const els = {
  productSelect: document.querySelector("#product-select"),
  productSearch: document.querySelector("#product-search"),
  productStrip: document.querySelector("#product-strip"),
  timeRange: document.querySelector("#time-range"),
  compareToggle: document.querySelector("#compare-toggle"),
  sourceFamilySummary: document.querySelector("#source-family-summary"),
  cwaTimelinePanel: document.querySelector("#cwa-timeline-panel"),
  sourceFamilyTimelineTitle: document.querySelector("#source-family-timeline-title"),
  sourceFamilyTimelineNote: document.querySelector("#source-family-timeline-note"),
  sourceFamilyTabs: document.querySelector("#source-family-tabs"),
  sourceFamilySearch: document.querySelector("#source-family-search"),
  sourceFamilyFilterClear: document.querySelector("#source-family-filter-clear"),
  sourceFamilyFilterStatus: document.querySelector("#source-family-filter-status"),
  sourceFamilyPrev: document.querySelector("#source-family-prev"),
  sourceFamilyNext: document.querySelector("#source-family-next"),
  sourceFamilyPosition: document.querySelector("#source-family-position"),
  sourceFamilyIngredientSummary: document.querySelector("#source-family-ingredient-summary"),
  sourceFamilyGapSummary: document.querySelector("#source-family-gap-summary"),
  sourceFamilyCoverageSummary: document.querySelector("#source-family-coverage-summary"),
  cwaProductStrip: document.querySelector("#cwa-product-strip"),
  cwaTimelineTrack: document.querySelector("#cwa-timeline-track"),
  status: document.querySelector("#journey-status"),
  productSummary: document.querySelector("#product-summary"),
  storyReadiness: document.querySelector("#story-readiness"),
  storyHero: document.querySelector("#story-hero"),
  timelineAxis: document.querySelector("#timeline-axis"),
  timelineTrack: document.querySelector("#timeline-track"),
  facetList: document.querySelector("#facet-list"),
  clearFacet: document.querySelector("#clear-facet"),
  photoSummary: document.querySelector("#photo-summary"),
  gapList: document.querySelector("#gap-list"),
  flowView: document.querySelector("#flow-view"),
  blockedMap: document.querySelector("#blocked-map"),
  eventList: document.querySelector("#event-list"),
  versionDetail: document.querySelector("#version-detail"),
  evidenceGallery: document.querySelector("#evidence-gallery"),
  reviewQueue: document.querySelector("#review-queue"),
  priceWeight: document.querySelector("#price-weight"),
  exportLinks: document.querySelector("#export-links"),
  clusterList: document.querySelector("#cluster-list"),
  ingredientDrilldown: document.querySelector("#ingredient-drilldown"),
  ingredientDrilldownContent: document.querySelector("#ingredient-drilldown-content"),
};

const state = {
  data: null,
  productId: "",
  versionId: "",
  facetId: "",
  sourceFamilyId: "",
  cwaProductId: "",
  sourceFamilyQuery: "",
  search: "",
  compare: false,
  maxYear: 2026,
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function labelFor(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncateText(value, limit = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trim()}...` : text;
}

function statusBadge(status) {
  return `<span class="status-badge status-${escapeHtml(status || "unknown")}">${escapeHtml(labelFor(status || "unknown"))}</span>`;
}

const cwaIconSvgs = {
  ingredient: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5.5h10M5 10h10M5 14.5h7" /></svg>',
  panel: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3.5h10v13H5zM7.5 7h5M7.5 10h5M7.5 13h3" /></svg>',
  image: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5h12v10H4zM6.5 12l2.4-2.5 2 2 1.4-1.3 2.2 2.8M7.5 7.5h.1" /></svg>',
  local: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5v3M14 3.5v3M6 13.5v3M14 13.5v3M3.5 6h3M13.5 6h3M3.5 14h3M13.5 14h3M7 7h6v6H7z" /></svg>',
  date: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 4.5h10v11H5zM5 8h10M8 3v3M12 3v3" /></svg>',
  partial: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h5M11 10h5M10 4v5M10 11v5" /></svg>',
  source: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 5H5v10h10v-3M10 4h6v6M9 11l7-7" /></svg>',
  crop: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3v11h11M3 6h11v11M8 8h6v6H8z" /></svg>',
  inspect: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M9 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12.5 12.5 16 16M7 9h4M9 7v4" /></svg>',
};

const collectionTargetFamilyId = "collection-targets";

function cwaInlineIcon(name) {
  return cwaIconSvgs[name] || cwaIconSvgs.image;
}

function cwaStatusIcon(name, title, tone = "neutral") {
  return `<span class="cwa-status-icon is-${escapeHtml(tone)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${cwaInlineIcon(name)}</span>`;
}

function proofVisualBasis(row) {
  if (row?.proof_visual_basis) return row.proof_visual_basis;
  if (row?.source_image_match_status === "official_current_ingredient_label_image") return "official_ingredient_label_image";
  if (row?.ingredient_text_source === "manual_visual_read_candidate"
    || /^(source_record_date_matched|vintage_matched|earliest_available_source_image)$/.test(row?.source_image_match_status || "")) {
    return row?.ingredient_text ? "archive_ingredient_label_crop" : "source_visual_lineage_only";
  }
  if (row?.ingredient_text) return "official_source_text_proof_panel";
  return "source_visual_lineage_only";
}

function proofVisualLabel(row) {
  const basis = proofVisualBasis(row);
  if (basis === "official_ingredient_label_image") return "Ingredient label image with transcript";
  if (basis === "official_menu_or_api_text") return "Menu ingredient source proof";
  if (basis === "official_source_text_proof_panel") return "Source text proof panel";
  if (basis === "label_database_source_text_proof_panel") return "Label database proof panel";
  if (basis === "archive_ingredient_label_crop") return "Archive ingredient label crop";
  if (basis === "collection_target_source_lead") return "Collection source lead";
  return row?.ingredient_text ? "Ingredient source proof" : "Visual lineage only";
}

function cwaStatusIcons(row) {
  const icons = [];
  const basis = proofVisualBasis(row);
  if (row.ingredient_text) {
    const title = basis === "official_ingredient_label_image"
      ? "Ingredient text candidate paired with an official label image"
      : basis === "label_database_source_text_proof_panel"
        ? "Ingredient text candidate from a label database source; package label review still needed"
        : "Ingredient text candidate extracted from the selected official source";
    icons.push(cwaStatusIcon("ingredient", title, "good"));
  }
  else if (basis === "collection_target_source_lead") icons.push(cwaStatusIcon("source", "Collection source lead; readable ingredient source still needed", "warn"));
  else if (row.crop_focus === "panel_context") icons.push(cwaStatusIcon("panel", "Package text crop, ingredient panel still needed", "warn"));
  else icons.push(cwaStatusIcon("image", "Visual lineage only; readable ingredient panel still needed", "muted"));

  if (row.local_upscaled_preview_available) icons.push(cwaStatusIcon("local", "Local private upscaled crop available", "local"));
  else if (row.local_preview_available) icons.push(cwaStatusIcon("crop", "Local private crop available", "local"));

  if (row.source_image_match_status === "vintage_matched" || row.source_image_match_status === "source_record_date_matched") {
    icons.push(cwaStatusIcon("date", "Selected image matches the row date range", "good"));
  } else if (row.source_image_match_status) {
    icons.push(cwaStatusIcon("partial", labelFor(row.source_image_match_status), "warn"));
  }
  return icons.join("");
}

function cwaActionLink(icon, title, href) {
  if (!href) return "";
  return `<a class="cwa-action-icon" href="${escapeHtml(href)}" target="_blank" rel="noreferrer" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${cwaInlineIcon(icon)}</a>`;
}

function cwaActionButton(icon, title, visualId) {
  return `<button class="cwa-action-icon" type="button" data-cwa-inspect="${escapeHtml(visualId)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${cwaInlineIcon(icon)}</button>`;
}

function splitIngredientText(value) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^ingredients?:\s*/i, "")
    .replace(/^label formula statement:\s*/i, "")
    .replace(/^seven-up contains\s*/i, "")
    .replace(/^a beverage syrup:\s*/i, "");
  if (!text) return [];

  const parts = [];
  let part = "";
  let depth = 0;
  for (const char of text) {
    if (char === "(") depth += 1;
    if (char === ")" && depth > 0) depth -= 1;
    if ((char === ";" || char === ",") && depth === 0) {
      const clean = part.trim();
      if (clean) parts.push(clean);
      part = "";
    } else {
      part += char;
    }
  }
  const clean = part.replace(/\.$/, "").trim();
  if (clean) parts.push(clean);
  return parts
    .map((row) => row.replace(/\.$/, "").trim())
    .filter(Boolean);
}

function ingredientItemsForRow(row) {
  if (Array.isArray(row?.ingredient_items) && row.ingredient_items.length) {
    return row.ingredient_items
      .map((item) => String(item || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }
  return splitIngredientText(row?.ingredient_text || "");
}

function ingredientMatchesActiveFilter(item, query = sourceFamilyFilterQuery()) {
  return Boolean(query && ingredientTrendKey(item).includes(query));
}

function ingredientProofExcerpt(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!limit || text.length <= limit) return text;

  const query = sourceFamilyFilterQuery();
  const matchIndex = query ? text.toLowerCase().indexOf(query) : -1;
  if (matchIndex < 0) return truncateText(text, limit);

  const padding = Math.max(12, Math.floor((limit - query.length) / 2));
  let start = Math.max(0, matchIndex - padding);
  let end = Math.min(text.length, start + limit);
  start = Math.max(0, end - limit);

  let excerpt = text.slice(start, end).trim();
  if (start > 0) excerpt = `...${excerpt.replace(/^[,;:\s]+/, "")}`;
  if (end < text.length) excerpt = `${excerpt.replace(/[,;:\s]+$/, "")}...`;
  return excerpt;
}

function ingredientProofListItem(item, options = {}) {
  const value = String(item || "").replace(/\s+/g, " ").trim();
  const isFilterMatch = ingredientMatchesActiveFilter(value);
  const className = `ingredient-proof-list-item${isFilterMatch ? " is-filter-match" : ""}`;
  const matchAttr = isFilterMatch ? ` data-filter-match="true"` : "";
  const text = options.truncate ? ingredientProofExcerpt(value, options.truncate) : value;
  return `<li class="${escapeHtml(className)}"${matchAttr}>${escapeHtml(text)}</li>`;
}

function ingredientFilterButton(item) {
  const value = String(item || "").replace(/\s+/g, " ").trim();
  const isFilterMatch = ingredientMatchesActiveFilter(value);
  const className = `ingredient-filter-link${isFilterMatch ? " is-filter-match" : ""}`;
  const title = isFilterMatch ? `Active proof filter: ${value}` : `Find proof cards with ${value}`;
  const currentAttr = isFilterMatch ? ` aria-current="true"` : "";
  return `<button class="${escapeHtml(className)}" type="button" data-source-family-filter-value="${escapeHtml(value)}" title="${escapeHtml(title)}"${currentAttr}>${escapeHtml(value)}</button>`;
}

function missingProofTitle(row) {
  const basis = proofVisualBasis(row);
  if (basis === "collection_target_source_lead") return "Source lead only";
  if (row?.crop_focus === "panel_context") return "Panel context only";
  return "Visual proof only";
}

function missingProofMessage(row) {
  return row?.candidate_excerpt
    || (row?.crop_focus === "panel_context"
      ? "Focused package text is visible; a readable ingredient list still needs capture and review."
      : "This source image supports visual provenance, but no readable ingredient panel has been captured for this row.");
}

function ingredientOverlay(row) {
  if (!row.ingredient_text) {
    return `
      <div class="cwa-ingredient-overlay is-missing-text" aria-label="Readable ingredient proof status">
        <span>${escapeHtml(missingProofTitle(row))}</span>
        <p>${escapeHtml(missingProofMessage(row))}</p>
        <em>Readable panel still needed</em>
      </div>
    `;
  }

  const items = ingredientItemsForRow(row);
  const basis = proofVisualBasis(row);
  const overlayTitle = basis === "official_menu_or_api_text"
    ? "Menu source text"
    : basis === "label_database_source_text_proof_panel"
      ? "Ingredient source text"
      : "Ingredients on label";
  return `
    <div class="cwa-ingredient-overlay has-ingredient-list" aria-label="Readable ingredient proof text">
      <span>${escapeHtml(overlayTitle)}</span>
      ${items.length
        ? `<ul class="cwa-overlay-ingredient-list">${items.map((item) => ingredientProofListItem(item, { truncate: 140 })).join("")}</ul>`
        : `<p>${escapeHtml(row.ingredient_text)}</p>`}
      <em>${escapeHtml(items.length ? `${items.length} ingredient ${items.length === 1 ? "entry" : "entries"}` : "Ingredient text")}</em>
    </div>
  `;
}

function ingredientTextBlock(row, options = {}) {
  if (!row.ingredient_text) return "";
  const compact = Boolean(options.compact);
  const idAttr = options.id ? ` id="${escapeHtml(options.id)}"` : "";
  const items = ingredientItemsForRow(row);
  const sourceText = row.ingredient_text || row.candidate_excerpt || "";
  const list = items.length
    ? `<ul>${items.map((item) => `<li>${ingredientFilterButton(item)}</li>`).join("")}</ul>`
    : "";
  const basis = proofVisualBasis(row);
  const label = compact && items.length
    ? basis === "official_menu_or_api_text"
      ? "Menu reader"
      : basis === "label_database_source_text_proof_panel"
        ? "Source reader"
        : "Label reader"
    : compact ? "Ingredients listed" : "Readable ingredient text";
  const readerMeta = compact && items.length
    ? `<small class="cwa-label-reader-meta">${escapeHtml(`${items.length} ingredient ${items.length === 1 ? "entry" : "entries"}`)}</small>`
    : "";
  const sourceLine = sourceText
    ? `<p class="cwa-ingredient-source-line">${escapeHtml(sourceText)}</p>`
    : "";
  return `
    <div${idAttr} class="cwa-ingredient-copy ${compact ? "is-compact cwa-label-reader has-ingredients" : ""}">
      <div class="cwa-label-reader-title">
        <span>${escapeHtml(label)}</span>
        ${readerMeta}
      </div>
      ${list}${sourceLine}
    </div>
  `;
}

function missingIngredientTextBlock(row, fallbackText, options = {}) {
  const idAttr = options.id ? ` id="${escapeHtml(options.id)}"` : "";
  const sourceStatus = row.crop_focus === "panel_context"
    ? "package text crop"
    : "visual lineage";
  return `
    <div${idAttr} class="cwa-ingredient-copy is-compact cwa-label-reader needs-readable-panel">
      <div class="cwa-label-reader-title">
        <span>${escapeHtml(missingProofTitle(row))}</span>
        <small class="cwa-label-reader-meta">Readable panel needed · ${escapeHtml(sourceStatus)}</small>
      </div>
      <p>${escapeHtml(fallbackText)}</p>
    </div>
  `;
}

function cwaPreviewButtonLabel(button, isOpen = false) {
  const productName = button?.dataset?.cwaProductName || "this product";
  const vintageLabel = button?.dataset?.cwaVintageLabel || "";
  const subject = `${productName} ${vintageLabel}`.trim();
  if (button?.dataset?.cwaHasIngredient !== "1") {
    return `${isOpen ? "Close" : "Inspect"} visual source gap for ${subject}`;
  }
  return `${isOpen ? "Hide" : "Show"} ingredient proof text for ${subject}`;
}

function setCwaPreviewState(button, isPreviewing) {
  const card = button?.closest(".cwa-timeline-card");
  if (!card) return;
  card.classList.toggle("is-ingredient-preview", Boolean(isPreviewing));
}

function syncCwaPreviewButton(button, isOpen) {
  button.setAttribute("aria-pressed", String(isOpen));
  button.setAttribute("aria-label", cwaPreviewButtonLabel(button, isOpen));
}

function qualityLabel(value) {
  return Number.isFinite(Number(value)) ? formatPct(value) : "Pending";
}

function formatPct(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function product() {
  return state.data.products.find((row) => row.id === state.productId) || state.data.products[0];
}

function isLocalPreviewHost() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function sourceFamilyTimeline() {
  const families = state.data.source_family_timeline?.families || [];
  return families.find((row) => row.id === state.sourceFamilyId) || families[0];
}

function cwaTimeline() {
  return sourceFamilyTimeline();
}

function sourceFamilyFilterQuery() {
  return String(state.sourceFamilyQuery || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function sourceFamilyRowSearchText(row) {
  return [
    row.product_name,
    row.brand,
    row.category,
    row.vintage_label,
    row.source_title,
    row.source_image_title,
    row.source_domain,
    row.ingredient_text,
    row.candidate_excerpt,
    ...ingredientItemsForRow(row),
  ].filter(Boolean).join(" ").toLowerCase();
}

function sourceFamilyProductSearchText(productRow) {
  return [
    productRow.product_name,
    productRow.brand,
    productRow.category,
    ...(productRow.vintages || []),
  ].filter(Boolean).join(" ").toLowerCase();
}

function sourceFamilyRowMatches(row, query) {
  return !query || sourceFamilyRowSearchText(row).includes(query);
}

function sourceFamilyProductMatches(productRow, query) {
  return !query
    || sourceFamilyProductSearchText(productRow).includes(query)
    || (productRow.rows || []).some((row) => sourceFamilyRowMatches(row, query));
}

function filteredSourceFamilyProducts(family) {
  const query = sourceFamilyFilterQuery();
  return (family?.products || []).filter((productRow) => sourceFamilyProductMatches(productRow, query));
}

function sourceFamilyRowsForProduct(productRow, query = sourceFamilyFilterQuery()) {
  const productMatch = sourceFamilyProductSearchText(productRow).includes(query);
  return query && !productMatch
    ? (productRow.rows || []).filter((row) => sourceFamilyRowMatches(row, query))
    : productRow.rows || [];
}

function ingredientTrendRows(products, query = sourceFamilyFilterQuery()) {
  return products.flatMap((productRow) => sourceFamilyRowsForProduct(productRow, query));
}

function ingredientTrendKey(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function ingredientTrendItems(rows, limit = 8, options = {}) {
  const proofLimit = Number(options.proofLimit || 4);
  const dedupeProofsByProduct = options.dedupeProofsByProduct !== false;
  const counts = new Map();
  for (const row of rows) {
    for (const item of ingredientItemsForRow(row)) {
      const label = String(item || "").replace(/\s+/g, " ").trim();
      const key = ingredientTrendKey(label);
      if (!key) continue;
      const existing = counts.get(key) || {
        label,
        count: 0,
        local_visual_count: 0,
        product_ids: new Set(),
        proofs: [],
        proof_product_ids: new Set(),
      };
      existing.count += 1;
      if (row.local_preview_available) existing.local_visual_count += 1;
      if (row.product_id) existing.product_ids.add(row.product_id);
      const proofKey = dedupeProofsByProduct
        ? row.product_id
        : row.visual_id || row.evidence_id || `${row.product_id}:${row.vintage_label}`;
      if (row.local_preview_available
        && row.preview_endpoint
        && proofKey
        && !existing.proof_product_ids.has(proofKey)
        && existing.proofs.length < proofLimit) {
        existing.proof_product_ids.add(proofKey);
        existing.proofs.push({
          product_name: row.product_name,
          vintage_label: row.vintage_label,
          preview_endpoint: row.preview_endpoint,
          proof_label: proofVisualLabel(row),
        });
      }
      counts.set(key, existing);
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function sourceFamilyProductPreviewRow(productRow, query = sourceFamilyFilterQuery()) {
  const rows = sourceFamilyRowsForProduct(productRow, query);
  return rows.find((row) => row.local_preview_available && row.ingredient_text)
    || rows.find((row) => row.local_preview_available)
    || rows.find((row) => row.ingredient_text)
    || rows[0]
    || (productRow.rows || [])[0]
    || null;
}

function sourceFamilyProductPreview(productRow, query, localImages) {
  const row = sourceFamilyProductPreviewRow(productRow, query);
  const hasIngredientProof = Boolean(row?.ingredient_text);
  const canShowPreview = Boolean(localImages && row?.local_preview_available && row?.preview_endpoint);
  const thumbClass = [
    "cwa-product-thumb",
    hasIngredientProof ? "has-proof" : "needs-readable-panel",
    canShowPreview ? "has-private-preview" : "",
  ].filter(Boolean).join(" ");
  return `
    <span class="${escapeHtml(thumbClass)}" aria-hidden="true">
      ${canShowPreview
        ? `<img src="${escapeHtml(row.preview_endpoint)}" alt="" loading="lazy" data-private-product-preview="1" />`
        : cwaInlineIcon(hasIngredientProof ? "ingredient" : "image")}
      <span class="cwa-product-thumb-icon">${cwaInlineIcon(hasIngredientProof ? "ingredient" : "panel")}</span>
    </span>
  `;
}

function cwaProductMetric(iconName, value, singularLabel, pluralLabel = `${singularLabel}s`, tone = "neutral") {
  const count = Number(value || 0);
  const label = count === 1 ? singularLabel : pluralLabel;
  return `
    <span class="cwa-product-chip-metric is-${escapeHtml(tone)}" title="${escapeHtml(`${count} ${label}`)}" aria-label="${escapeHtml(`${count} ${label}`)}">
      ${cwaInlineIcon(iconName)}
      <b>${escapeHtml(count)}</b>
    </span>
  `;
}

function sourceFamilyProductMetrics(productRow) {
  const rows = productRow.rows || [];
  const readableGapCount = rows.filter((row) => !row.ingredient_text).length;
  const rowLabel = productRow.source_family === collectionTargetFamilyId ? "source lead" : "visual row";
  return `
    <span class="cwa-product-chip-metrics">
      ${cwaProductMetric("panel", productRow.evidence_count || rows.length, rowLabel)}
      ${cwaProductMetric("ingredient", productRow.ingredient_signal_count || 0, "ingredient proof row", "ingredient proof rows", "good")}
      ${cwaProductMetric("crop", productRow.local_preview_available_count || 0, "local visual preview", "local visual previews", "local")}
      ${readableGapCount ? cwaProductMetric("partial", readableGapCount, "readable panel still needed", "readable panels still needed", "warn") : ""}
    </span>
  `;
}

function sourceFamilyTabMetric(iconName, value, singularLabel, pluralLabel = `${singularLabel}s`, tone = "neutral") {
  const count = Number(value || 0);
  const label = count === 1 ? singularLabel : pluralLabel;
  return `
    <span class="source-family-tab-metric is-${escapeHtml(tone)}" title="${escapeHtml(`${count} ${label}`)}" aria-label="${escapeHtml(`${count} ${label}`)}">
      ${cwaInlineIcon(iconName)}
      <b>${escapeHtml(count)}</b>
    </span>
  `;
}

function sourceFamilyTabMetrics(family) {
  const products = family.products || [];
  const rows = products.flatMap((productRow) => productRow.rows || []);
  const productCount = family.product_count || products.length;
  const proofCount = family.ingredient_signal_count || rows.filter((row) => row.ingredient_text).length;
  const localVisualCount = rows.filter((row) => row.local_preview_available).length;
  const readableGapCount = rows.filter((row) => !row.ingredient_text).length;
  return `
    <span class="source-family-tab-metrics">
      ${sourceFamilyTabMetric("image", productCount, "product")}
      ${sourceFamilyTabMetric("ingredient", proofCount, "ingredient proof row", "ingredient proof rows", "good")}
      ${sourceFamilyTabMetric("crop", localVisualCount, "local visual preview", "local visual previews", "local")}
      ${readableGapCount ? sourceFamilyTabMetric("partial", readableGapCount, "readable panel still needed", "readable panels still needed", "warn") : ""}
    </span>
  `;
}

function sourceFamilyHeaderMetric(iconName, value, singularLabel, pluralLabel = `${singularLabel}s`, tone = "neutral") {
  const count = Number(value || 0);
  const label = count === 1 ? singularLabel : pluralLabel;
  return `
    <span class="source-family-header-metric is-${escapeHtml(tone)}" title="${escapeHtml(`${count} ${label}`)}" aria-label="${escapeHtml(`${count} ${label}`)}">
      ${cwaInlineIcon(iconName)}
      <b>${escapeHtml(count)}</b>
    </span>
  `;
}

function sourceFamilyHeaderMetrics(family) {
  const products = family.products || [];
  const rows = products.flatMap((productRow) => productRow.rows || []);
  const productCount = family.product_count || products.length;
  const proofCount = family.ingredient_signal_count || rows.filter((row) => row.ingredient_text).length;
  const localVisualCount = rows.filter((row) => row.local_preview_available).length;
  const readableGapCount = rows.filter((row) => !row.ingredient_text).length;
  return `
    <span class="source-family-header-metrics" aria-label="${escapeHtml(`${productCount} products, ${proofCount} ingredient proof rows, ${localVisualCount} local visual previews, ${readableGapCount} readable panels still needed`)}">
      ${sourceFamilyHeaderMetric("image", productCount, "product")}
      ${sourceFamilyHeaderMetric("ingredient", proofCount, "ingredient proof row", "ingredient proof rows", "good")}
      ${sourceFamilyHeaderMetric("crop", localVisualCount, "local visual preview", "local visual previews", "local")}
      ${readableGapCount ? sourceFamilyHeaderMetric("partial", readableGapCount, "readable panel still needed", "readable panels still needed", "warn") : ""}
    </span>
  `;
}

function sourceFamilyGapRows(products, query = sourceFamilyFilterQuery()) {
  return products.flatMap((productRow) => (
    sourceFamilyRowsForProduct(productRow, query)
      .filter((row) => !row.ingredient_text)
      .map((row) => ({ ...row, product_group_id: productRow.product_id }))
  ));
}

function sourceFamilyGapThumb(row, localImages) {
  const canShowPreview = Boolean(localImages && row.local_preview_available && row.preview_endpoint);
  return `
    <span class="source-family-gap-thumb" aria-hidden="true">
      ${canShowPreview
        ? `<img src="${escapeHtml(row.preview_endpoint)}" alt="" loading="lazy" data-private-gap-preview="1" />`
        : cwaInlineIcon(row.crop_focus === "panel_context" ? "panel" : "image")}
      <span>${cwaInlineIcon("panel")}</span>
    </span>
  `;
}

function renderSourceFamilyGapSummary(family, visibleProducts, query, localImages) {
  if (!els.sourceFamilyGapSummary) return;
  const gaps = sourceFamilyGapRows(visibleProducts, query);
  if (!gaps.length) {
    els.sourceFamilyGapSummary.innerHTML = "";
    return;
  }
  els.sourceFamilyGapSummary.innerHTML = `
    <div class="source-family-gap-summary-title">
      <span>Readable panel queue</span>
      <small>${escapeHtml(`${gaps.length} ${gaps.length === 1 ? "row" : "rows"}`)}</small>
    </div>
    <div class="source-family-gap-list">
      ${gaps.slice(0, 6).map((row) => {
        const sourceLink = row.source_detail_url || row.source_url;
        return `
          <article class="source-family-gap-card">
            ${sourceFamilyGapThumb(row, localImages)}
            <div>
              <span>${escapeHtml(row.vintage_label)}</span>
              <strong>${escapeHtml(row.product_name)}</strong>
              <small>${escapeHtml(row.source_image_title || row.source_title || row.source_domain || "Source image")}</small>
            </div>
            <div class="source-family-gap-actions">
              <button type="button" data-cwa-gap-product-id="${escapeHtml(row.product_group_id)}" aria-label="${escapeHtml(`Show ${row.product_name} proof rows`)}">${cwaInlineIcon("date")}</button>
              ${sourceLink ? `<a href="${escapeHtml(sourceLink)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(`Open source for ${row.product_name}`)}">${cwaInlineIcon("source")}</a>` : ""}
              ${row.visual_id ? cwaActionButton("inspect", `Open ${row.product_name} collection drill-in`, row.visual_id) : ""}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
  els.sourceFamilyGapSummary.querySelectorAll("[data-private-gap-preview]").forEach((image) => {
    image.addEventListener("error", () => {
      image.closest(".source-family-gap-thumb")?.classList.add("is-missing-private-preview");
      image.remove();
    }, { once: true });
  });
}

function missingCoverageSearchText(productRow) {
  return [
    productRow.product_name,
    productRow.brand,
    productRow.category,
    productRow.capture_class,
    productRow.next_collection_goal,
    productRow.promotion_boundary,
    ...(productRow.collection_blockers || []).flatMap((blocker) => [
      blocker.status,
      blocker.label,
      blocker.detail,
      blocker.next_step,
      blocker.claim_boundary,
    ]),
    ...(productRow.top_source_domains || []).map((row) => row.domain),
    ...(productRow.representative_rows || []).flatMap((row) => [
      row.vintage_label,
      row.source_domain,
      row.source_title,
      row.ocr_gap_category,
      row.next_action,
    ]),
  ].filter(Boolean).join(" ").toLowerCase();
}

function sourceFamilyCoverageRows(query = sourceFamilyFilterQuery()) {
  const coverage = state.data?.source_family_coverage;
  const rows = coverage?.missing_products || [];
  if (!query) return rows;
  return rows.filter((row) => missingCoverageSearchText(row).includes(query));
}

function renderSourceFamilyCoverageSummary(query = sourceFamilyFilterQuery()) {
  if (!els.sourceFamilyCoverageSummary) return;
  const coverage = state.data?.source_family_coverage;
  if (!coverage?.missing_products?.length) {
    els.sourceFamilyCoverageSummary.innerHTML = "";
    return;
  }
  const rows = sourceFamilyCoverageRows(query);
  const totals = coverage.totals || {};
  const visibleRows = rows.slice(0, 6);
  if (!visibleRows.length) {
    els.sourceFamilyCoverageSummary.innerHTML = `
      <div class="source-family-coverage-title">
        <span>Full-corpus capture queue</span>
        <small>${escapeHtml(`0 of ${totals.missing_products || coverage.missing_products.length} missing products match`)}</small>
      </div>
    `;
    return;
  }
  els.sourceFamilyCoverageSummary.innerHTML = `
    <div class="source-family-coverage-title">
      <span>Full-corpus capture queue</span>
      <small>${escapeHtml(query
        ? `${rows.length} of ${totals.missing_products || coverage.missing_products.length} missing products match`
        : `${totals.represented_products || 0}/${totals.queue_products || 0} products represented · ${totals.missing_products || coverage.missing_products.length} missing`)}</small>
    </div>
    <div class="source-family-coverage-list">
      ${visibleRows.map((productRow) => {
        const lead = (productRow.representative_rows || [])[0] || {};
        const sourceLink = lead.source_url || "";
        const topDomain = productRow.top_source_domains?.[0]?.domain || lead.source_domain || "source needed";
        const blocker = (productRow.collection_blockers || [])[0] || null;
        return `
          <article class="source-family-coverage-card">
            <span>${escapeHtml(labelFor(productRow.capture_class || "capture_queue"))}</span>
            <strong>${escapeHtml(productRow.product_name)}</strong>
            <small>${escapeHtml(`${productRow.high_priority_row_count || 0} high-priority rows · ${productRow.current_row_count || 0} current rows · ${topDomain}`)}</small>
            <p>${escapeHtml(labelFor(productRow.next_collection_goal || lead.next_action || "source_attributable_panel_capture_needed"))}</p>
            ${blocker ? `
              <p class="source-family-coverage-blocker">
                <span>${cwaInlineIcon("partial")}</span>
                <b>${escapeHtml(blocker.label || labelFor(blocker.status || "blocked"))}</b>
                ${escapeHtml(blocker.detail || "")}
              </p>
              ${blocker.next_step ? `<small class="source-family-coverage-next">${escapeHtml(blocker.next_step)}</small>` : ""}
            ` : ""}
            <div class="source-family-coverage-actions">
              ${sourceLink ? `<a href="${escapeHtml(sourceLink)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(`Open lead source for ${productRow.product_name}`)}">${cwaInlineIcon("source")}</a>` : ""}
              <button type="button" data-source-family-filter-value="${escapeHtml(productRow.product_name)}" aria-label="${escapeHtml(`Search proof board for ${productRow.product_name}`)}">${cwaInlineIcon("inspect")}</button>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function selectedCwaProduct() {
  const family = cwaTimeline();
  const products = filteredSourceFamilyProducts(family);
  if (!products.length) return null;
  return products.find((row) => row.product_id === state.cwaProductId) || products[0];
}

function selectedSourceFamilyProductIndex(products) {
  return Math.max(0, products.findIndex((row) => row.product_id === state.cwaProductId));
}

function moveSourceFamilyProduct(delta) {
  const products = filteredSourceFamilyProducts(cwaTimeline());
  if (!products.length) return;
  const currentIndex = selectedSourceFamilyProductIndex(products);
  const nextIndex = Math.min(products.length - 1, Math.max(0, currentIndex + delta));
  state.cwaProductId = products[nextIndex].product_id;
  renderCwaTimeline();
}

function applySourceFamilyFilter(value, options = {}) {
  const query = String(value || "").replace(/\s+/g, " ").trim();
  if (!query) return;
  state.sourceFamilyQuery = query;
  state.cwaProductId = "";
  if (els.sourceFamilySearch) els.sourceFamilySearch.value = query;
  renderCwaTimeline();
  if (options.closeDrilldown) closeIngredientDrilldown();
  els.cwaTimelinePanel?.scrollIntoView({ block: "start", behavior: "smooth" });
  els.sourceFamilySearch?.focus();
}

function sourceFamilyRowByVisualId(visualId) {
  if (!visualId) return null;
  const families = state.data?.source_family_timeline?.families || [];
  for (const family of families) {
    for (const productRow of family.products || []) {
      const match = (productRow.rows || []).find((row) => row.visual_id === visualId);
      if (match) {
        return {
          ...match,
          source_family_id: family.id,
          source_family_label: family.label,
          source_family_product_count: family.product_count || family.products?.length || 0,
        };
      }
    }
  }
  return null;
}

function sourceFamilyContextForRow(row) {
  const families = state.data?.source_family_timeline?.families || [];
  for (const family of families) {
    if (row?.source_family_id && row.source_family_id !== family.id) continue;
    for (const productRow of family.products || []) {
      const match = (productRow.rows || []).some((sourceRow) => sourceRow.visual_id === row?.visual_id);
      if (match || (row?.product_id && row.product_id === productRow.product_id && row?.source_family_id === family.id)) {
        return { family, productRow };
      }
    }
  }
  return null;
}

function statusDetail(row) {
  const parts = [
    row.ingredient_signal_status ? `Signal: ${labelFor(row.ingredient_signal_status)}` : "",
    row.crop_status ? `Crop: ${labelFor(row.crop_status)}` : "",
    row.ocr_status ? `OCR: ${labelFor(row.ocr_status)}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

function drilldownPlaceholder(row, label = "Local crop unavailable") {
  return `<div class="ingredient-drilldown-placeholder"><strong>${escapeHtml(String(row.vintage_label || "").slice(0, 4))}</strong><span>${escapeHtml(label)}</span></div>`;
}

function ingredientDrilldownFacts(row, canShowPreview) {
  const items = ingredientItemsForRow(row);
  const context = sourceFamilyContextForRow(row);
  const familyLabel = row.source_family_label || context?.family?.label || row.source_family || "Source family";
  return `
    <div class="ingredient-drilldown-facts">
      <span><strong>${escapeHtml(items.length || "0")}</strong> ingredient entries</span>
      <span><strong>${escapeHtml(canShowPreview ? "local" : "linked")}</strong> ${escapeHtml(canShowPreview ? "crop available" : "source only")}</span>
      <span><strong>${escapeHtml(proofVisualLabel(row))}</strong> proof basis</span>
      <span><strong>${escapeHtml(familyLabel)}</strong> ${escapeHtml(`${context?.family?.product_count || row.source_family_product_count || 0} products`)}</span>
    </div>
  `;
}

function ingredientDrilldownTrendBlock(row) {
  const context = sourceFamilyContextForRow(row);
  const rows = context?.productRow?.rows || [];
  const localImages = isLocalPreviewHost();
  const items = ingredientTrendItems(rows, 8, { dedupeProofsByProduct: false, proofLimit: 3 });
  if (!items.length) return "";
  return `
    <div class="ingredient-drilldown-trends">
      <span>Product ingredient signals</span>
      <div>
        ${items.map((item) => `
          <button type="button" data-source-family-filter-value="${escapeHtml(item.label)}">
            <span class="ingredient-drilldown-trend-copy">
              <strong>${escapeHtml(truncateText(item.label, 48))}</strong>
              ${localImages && item.proofs?.length ? `
                <span class="ingredient-drilldown-trend-thumbs" aria-label="${escapeHtml(`Proof examples for ${item.label}`)}">
                  ${item.proofs.map((proof) => `
                    <span class="ingredient-drilldown-trend-thumb" title="${escapeHtml(`${proof.product_name} · ${proof.vintage_label} · ${proof.proof_label}`)}">
                      <img src="${escapeHtml(proof.preview_endpoint)}" alt="" loading="lazy" data-private-drilldown-trend-preview="1" />
                    </span>
                  `).join("")}
                </span>
              ` : ""}
            </span>
            <small title="${escapeHtml(`${item.count} proof ${item.count === 1 ? "row" : "rows"}`)}">${escapeHtml(item.count)}</small>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function ingredientDrilldownProofOverlay(row) {
  const items = ingredientItemsForRow(row);
  if (!items.length) {
    return `
      <div class="ingredient-drilldown-proof-overlay is-missing-text" aria-label="Visual source gap status">
        <span>${escapeHtml(missingProofTitle(row))}</span>
        <p>${escapeHtml(missingProofMessage(row))}</p>
      </div>
    `;
  }
  return `
    <div class="ingredient-drilldown-proof-overlay" aria-label="Readable ingredient proof text">
      <span>${escapeHtml(proofVisualLabel(row))}</span>
      <ul>
        ${items.map((item) => ingredientProofListItem(item, { truncate: 140 })).join("")}
      </ul>
    </div>
  `;
}

function renderIngredientDrilldown(row) {
  const canShowPreview = isLocalPreviewHost() && row.local_preview_available && row.preview_endpoint;
  const sourceLink = row.source_detail_url || row.source_url;
  const sourceTitle = row.source_image_title || row.source_title || "Source image pending";
  const ingredientCopy = ingredientTextBlock(row);
  const fallbackText = row.candidate_excerpt
    || (row.crop_focus === "panel_context"
      ? "Focused package text is visible; readable ingredient list still needed."
      : "Wrapper imagery can support visual provenance only; readable ingredient panel still needed.");
  const previewTitle = row.local_upscaled_preview_available
    ? `Upscaled ${proofVisualLabel(row).toLowerCase()}`
    : proofVisualLabel(row);
  return `
    <div class="ingredient-drilldown-header">
      <p class="eyebrow">${escapeHtml(row.source_family_label || row.source_family || "Source family")}</p>
      <h2 id="ingredient-drilldown-title">${escapeHtml(row.product_name)} · ${escapeHtml(row.vintage_label)}</h2>
      <p>${escapeHtml(sourceTitle)}</p>
    </div>
    <div class="ingredient-drilldown-layout">
      <div class="ingredient-drilldown-image ${canShowPreview ? "has-private-preview" : ""}">
        ${canShowPreview
          ? `<img src="${escapeHtml(row.preview_endpoint)}" alt="${escapeHtml(`${row.product_name} ${row.vintage_label} ingredient crop`)}" />`
          : drilldownPlaceholder(row)}
        ${ingredientDrilldownProofOverlay(row)}
      </div>
      <div class="ingredient-drilldown-copy">
        <span>${escapeHtml(previewTitle)}</span>
        ${ingredientDrilldownFacts(row, canShowPreview)}
        ${ingredientCopy || `<p>${escapeHtml(fallbackText)}</p>`}
        ${ingredientDrilldownTrendBlock(row)}
        <dl class="ingredient-drilldown-meta">
          <div>
            <dt>Status</dt>
            <dd>${escapeHtml(statusDetail(row) || "Pending review")}</dd>
          </div>
          <div>
            <dt>Claim Boundary</dt>
            <dd>${escapeHtml(row.claim_boundary || "No ingredient claim is promoted without manual verification.")}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd><a href="${escapeHtml(sourceLink)}" target="_blank" rel="noreferrer">${escapeHtml(row.source_domain || "Open source")}</a></dd>
          </div>
          ${canShowPreview ? `
            <div>
              <dt>Local Crop</dt>
              <dd><a href="${escapeHtml(row.preview_endpoint)}" target="_blank" rel="noreferrer">Open private crop</a></dd>
            </div>
          ` : ""}
        </dl>
      </div>
    </div>
  `;
}

function closeIngredientDrilldown() {
  if (!els.ingredientDrilldown) return;
  els.ingredientDrilldown.hidden = true;
  document.body.classList.remove("ingredient-drilldown-open");
  if (els.ingredientDrilldownContent) {
    els.ingredientDrilldownContent.innerHTML = "";
  }
}

function openIngredientDrilldown(row) {
  if (!els.ingredientDrilldown || !els.ingredientDrilldownContent) return;
  els.ingredientDrilldownContent.innerHTML = renderIngredientDrilldown(row);
  els.ingredientDrilldown.hidden = false;
  document.body.classList.add("ingredient-drilldown-open");
  els.ingredientDrilldownContent.querySelector(".ingredient-drilldown-image img")?.addEventListener("error", (event) => {
    const frame = event.currentTarget.closest(".ingredient-drilldown-image");
    if (frame) {
      frame.classList.add("is-missing-private-preview");
      frame.innerHTML = drilldownPlaceholder(row, "Private crop missing");
    }
  }, { once: true });
  els.ingredientDrilldownContent.querySelectorAll("[data-private-drilldown-trend-preview]").forEach((image) => {
    image.addEventListener("error", () => {
      image.closest(".ingredient-drilldown-trend-thumb")?.classList.add("is-missing-private-preview");
      image.remove();
    }, { once: true });
  });
  els.ingredientDrilldown.querySelector(".ingredient-drilldown-close")?.focus();
}

function selectedVersion(productRow) {
  return productRow.versions.find((row) => row.id === state.versionId) || productRow.versions[productRow.versions.length - 1];
}

function versionEvidence(productRow, version) {
  const ids = new Set(version.evidence_ids || []);
  return productRow.evidence.filter((row) => ids.has(row.id));
}

function visibleVersions(productRow) {
  return productRow.versions.filter((row) => Number(row.year) <= Number(state.maxYear || 2026));
}

function renderProductPicker() {
  const rows = state.data.product_index.filter((row) => (
    !state.search.trim() || `${row.label} ${row.id}`.toLowerCase().includes(state.search.trim().toLowerCase())
  ));
  els.productSelect.innerHTML = rows
    .map((row) => `<option value="${escapeHtml(row.id)}" ${row.id === state.productId ? "selected" : ""} ${row.status !== "loaded" ? "disabled" : ""}>${escapeHtml(row.label)}${row.status !== "loaded" ? " (planned)" : ""}</option>`)
    .join("");
  els.productStrip.innerHTML = rows
    .map((row) => `
      <button class="product-card ${row.id === state.productId ? "is-selected" : ""}" type="button" data-product-id="${escapeHtml(row.id)}" ${row.status !== "loaded" ? "disabled" : ""}>
        <strong>${escapeHtml(row.label)}</strong>
        <span>${escapeHtml(row.status === "loaded" ? "Pilot story loaded" : "Planned corpus target")}</span>
      </button>
    `)
    .join("");
}

function sourceFamilyFocusMetric(iconName, value, singularLabel, pluralLabel = `${singularLabel}s`, tone = "neutral") {
  const count = Number(value || 0);
  const label = count === 1 ? singularLabel : pluralLabel;
  return `
    <span class="source-family-focus-metric is-${escapeHtml(tone)}" title="${escapeHtml(`${count} ${label}`)}" aria-label="${escapeHtml(`${count} ${label}`)}">
      ${cwaInlineIcon(iconName)}
      <b>${escapeHtml(count)}</b>
    </span>
  `;
}

function sourceFamilyFocusMetrics(metrics, options = {}) {
  const rowLabel = options.rowLabel || "proof row";
  return `
    <div class="source-family-focus-metrics">
      ${sourceFamilyFocusMetric("image", metrics.selectedProducts, "product")}
      ${sourceFamilyFocusMetric("panel", metrics.selectedRows, rowLabel)}
      ${sourceFamilyFocusMetric("ingredient", metrics.selectedProofs, "proof text candidate", "proof text candidates", "good")}
      ${sourceFamilyFocusMetric("crop", metrics.selectedLocalVisuals, "local visual", "local visuals", "local")}
      ${sourceFamilyFocusMetric("ingredient", metrics.selectedStructuredRows, "structured ingredient row", "structured ingredient rows", "good")}
      ${metrics.selectedReadableGaps ? sourceFamilyFocusMetric("partial", metrics.selectedReadableGaps, "readable panel gap", "readable panel gaps", "warn") : ""}
    </div>
  `;
}

function renderSourceFamilySummary() {
  if (!els.sourceFamilySummary) return;
  const families = state.data.source_family_summary?.families || [];
  const timelineFamilies = state.data.source_family_timeline?.families || [];
  if (!families.length) {
    els.sourceFamilySummary.innerHTML = `
      <article class="source-family-empty">
        <strong>Source-family queue pending</strong>
        <span>Run the ingredient OCR build to publish source-rich product lanes.</span>
      </article>
    `;
    return;
  }
  const selectedSummary = families.find((family) => family.id === state.sourceFamilyId)
    || timelineFamilies.find((family) => family.id === state.sourceFamilyId)
    || families[0];
  const selectedTimelineFamily = timelineFamilies.find((family) => family.id === selectedSummary.id) || timelineFamilies[0] || {};
  const selectedTimelineRows = (selectedTimelineFamily.products || []).flatMap((productRow) => productRow.rows || []);
  const allTimelineRows = timelineFamilies.flatMap((family) => (family.products || []).flatMap((productRow) => productRow.rows || []));
  const totalProducts = new Set(timelineFamilies.flatMap((family) => (family.products || []).map((productRow) => productRow.product_id))).size
    || families.reduce((sum, family) => sum + Number(family.product_count || 0), 0);
  const totalRows = families.reduce((sum, family) => sum + Number(family.evidence_row_count || family.row_count || 0), 0);
  const selectedProducts = Number(selectedSummary.product_count || selectedSummary.products?.length || 0);
  const selectedRows = Number(selectedSummary.evidence_row_count || selectedSummary.row_count || 0);
  const selectedProofs = Number(selectedSummary.ingredient_signal_count || 0)
    || (selectedSummary.products || []).reduce((sum, row) => sum + Number(row.ingredient_signal_count || row.ingredient_panel_visible_count || 0), 0);
  const allLocalVisuals = allTimelineRows.filter((row) => row.local_preview_available).length;
  const allStructuredRows = allTimelineRows.filter((row) => ingredientItemsForRow(row).length).length;
  const selectedLocalVisuals = selectedTimelineRows.filter((row) => row.local_preview_available).length;
  const selectedStructuredRows = selectedTimelineRows.filter((row) => ingredientItemsForRow(row).length).length;
  const selectedReadableGaps = selectedTimelineRows.filter((row) => !row.ingredient_text).length;
  const selectedRowLabel = selectedSummary.id === collectionTargetFamilyId ? "source lead" : "proof row";
  els.sourceFamilySummary.innerHTML = `
    <div class="source-family-metrics">
      <span>${cwaInlineIcon("image")}<strong>${escapeHtml(totalProducts)}</strong>products</span>
      <span>${cwaInlineIcon("panel")}<strong>${escapeHtml(totalRows)}</strong>proof rows</span>
      <span>${cwaInlineIcon("crop")}<strong>${escapeHtml(allLocalVisuals)}</strong>local visuals</span>
      <span>${cwaInlineIcon("ingredient")}<strong>${escapeHtml(allStructuredRows)}</strong>ingredient lists</span>
    </div>
    <div class="source-family-focus">
      <span>${escapeHtml(selectedSummary.label || "Selected source lane")}</span>
      ${sourceFamilyFocusMetrics({
        selectedProducts,
        selectedRows,
        selectedProofs,
        selectedLocalVisuals,
        selectedStructuredRows,
        selectedReadableGaps,
      }, { rowLabel: selectedRowLabel })}
      <em>${escapeHtml(selectedSummary.claim_policy || state.data.source_family_timeline?.claim_policy || "Ingredient text remains candidate evidence until manual review.")}</em>
    </div>
  `;
}

function sourceFamilyTrendMetric(iconName, value, singularLabel, pluralLabel = `${singularLabel}s`, tone = "neutral") {
  const count = Number(value || 0);
  const label = count === 1 ? singularLabel : pluralLabel;
  return `
    <span class="source-family-ingredient-metric is-${escapeHtml(tone)}" title="${escapeHtml(`${count} ${label}`)}" aria-label="${escapeHtml(`${count} ${label}`)}">
      ${cwaInlineIcon(iconName)}
      <b>${escapeHtml(count)}</b>
    </span>
  `;
}

function sourceFamilyTrendMetrics(item) {
  const productCount = item.product_ids?.size || 0;
  return `
    <span class="source-family-ingredient-metrics">
      ${sourceFamilyTrendMetric("ingredient", item.count, "proof row", "proof rows", "good")}
      ${sourceFamilyTrendMetric("image", productCount, "product")}
      ${sourceFamilyTrendMetric("crop", item.local_visual_count || 0, "local visual preview", "local visual previews", "local")}
    </span>
  `;
}

function sourceFamilyTrendProofStrip(item, localImages) {
  if (!localImages || !item.proofs?.length) return "";
  const exampleNames = item.proofs
    .map((proof) => proof.product_name)
    .filter(Boolean);
  const visibleExamples = exampleNames.slice(0, 2).join(" · ");
  const remainingExamples = Math.max(0, exampleNames.length - 2);
  const exampleLabel = [
    visibleExamples,
    remainingExamples ? `+${remainingExamples}` : "",
  ].filter(Boolean).join(" · ");
  return `
    <span class="source-family-ingredient-proof-strip" aria-label="${escapeHtml(`Proof examples: ${exampleNames.join(", ")}`)}">
      <span class="source-family-ingredient-proof-thumbs">
        ${item.proofs.map((proof) => {
          const proofLabel = [proof.product_name, proof.vintage_label, proof.proof_label].filter(Boolean).join(" · ");
          return `
          <span
            class="source-family-ingredient-proof-thumb"
            role="img"
            aria-label="${escapeHtml(proofLabel)}"
            title="${escapeHtml(proofLabel)}"
            data-proof-basis="${escapeHtml(proof.proof_label || "")}"
            data-proof-product="${escapeHtml(proof.product_name || "")}"
            data-proof-vintage="${escapeHtml(proof.vintage_label || "")}"
          >
            <img src="${escapeHtml(proof.preview_endpoint)}" alt="" loading="lazy" data-private-ingredient-trend-preview="1" />
          </span>
        `; }).join("")}
      </span>
      ${exampleLabel ? `<span class="source-family-ingredient-proof-names">${escapeHtml(exampleLabel)}</span>` : ""}
    </span>
  `;
}

function sourceFamilyTrendAriaLabel(item) {
  const productCount = item.product_ids?.size || 0;
  const base = `${item.label}: ${item.count} proof ${item.count === 1 ? "row" : "rows"}, ${productCount} ${productCount === 1 ? "product" : "products"}, ${item.local_visual_count || 0} local visual ${(item.local_visual_count || 0) === 1 ? "preview" : "previews"}`;
  const examples = (item.proofs || [])
    .map((proof) => proof.product_name)
    .filter(Boolean);
  return examples.length ? `${base}; proof examples: ${examples.join(", ")}` : base;
}

function renderSourceFamilyIngredientSummary(family, visibleProducts, query) {
  if (!els.sourceFamilyIngredientSummary) return;
  const rows = ingredientTrendRows(visibleProducts, query);
  const items = ingredientTrendItems(rows);
  if (!items.length) {
    els.sourceFamilyIngredientSummary.innerHTML = `<span>No structured ingredient trend rows in this view.</span>`;
    return;
  }
  const maxCount = Math.max(...items.map((item) => item.count), 1);
  const localImages = isLocalPreviewHost();
  const title = query ? "Filtered ingredients" : "Frequent ingredients";
  const subtitle = query
    ? `${query} · ${rows.length} proof ${rows.length === 1 ? "row" : "rows"}`
    : `${rows.length} proof ${rows.length === 1 ? "row" : "rows"}`;
  els.sourceFamilyIngredientSummary.innerHTML = `
    <div class="source-family-ingredient-summary-title">
      <span>${escapeHtml(title)}</span>
      <small>${escapeHtml(subtitle)}</small>
    </div>
    <div class="source-family-ingredient-bars">
      ${items.map((item) => `
        <button class="source-family-ingredient-bar" type="button" data-source-family-filter-value="${escapeHtml(item.label)}" aria-label="${escapeHtml(sourceFamilyTrendAriaLabel(item))}">
          <span class="source-family-ingredient-label">${escapeHtml(truncateText(item.label, 56))}</span>
          <meter min="0" max="${escapeHtml(maxCount)}" value="${escapeHtml(item.count)}"></meter>
          ${sourceFamilyTrendMetrics(item)}
          ${sourceFamilyTrendProofStrip(item, localImages)}
        </button>
      `).join("")}
    </div>
  `;
  els.sourceFamilyIngredientSummary.querySelectorAll("[data-private-ingredient-trend-preview]").forEach((image) => {
    image.addEventListener("error", () => {
      image.closest(".source-family-ingredient-proof-thumb")?.classList.add("is-missing-private-preview");
      image.remove();
    }, { once: true });
  });
}

function renderCwaTimeline() {
  if (!els.cwaTimelinePanel || !els.cwaProductStrip || !els.cwaTimelineTrack) return;
  const families = state.data.source_family_timeline?.families || [];
  const family = cwaTimeline();
  if (!family?.products?.length) {
    els.cwaTimelinePanel.hidden = true;
    return;
  }
  els.cwaTimelinePanel.hidden = false;
  if (!state.sourceFamilyId || !families.some((row) => row.id === state.sourceFamilyId)) {
    state.sourceFamilyId = family.id;
  }
  if (els.sourceFamilyTimelineTitle) {
    els.sourceFamilyTimelineTitle.textContent = `${family.label} ${family.id === collectionTargetFamilyId ? "Board" : "Proof Board"}`;
  }
  if (els.sourceFamilyTimelineNote) {
    els.sourceFamilyTimelineNote.innerHTML = sourceFamilyHeaderMetrics(family);
  }
  if (els.sourceFamilyTabs) {
    els.sourceFamilyTabs.innerHTML = families.length > 1
      ? families.map((row) => `
        <button class="source-family-tab ${row.id === family.id ? "is-selected" : ""}" type="button" data-source-family-id="${escapeHtml(row.id)}">
          <strong>${escapeHtml(row.label)}</strong>
          ${sourceFamilyTabMetrics(row)}
        </button>
      `).join("")
      : "";
  }
  const query = sourceFamilyFilterQuery();
  const visibleProducts = filteredSourceFamilyProducts(family);
  const allProducts = family.products || [];
  if (els.sourceFamilySearch && els.sourceFamilySearch.value !== state.sourceFamilyQuery) {
    els.sourceFamilySearch.value = state.sourceFamilyQuery;
  }
  if (els.sourceFamilyFilterClear) {
    els.sourceFamilyFilterClear.disabled = !query;
  }
  if (els.sourceFamilyFilterStatus) {
    const visibleRows = ingredientTrendRows(visibleProducts, query).length;
    const rowLabel = family.id === collectionTargetFamilyId ? "source leads" : "proof rows";
    const totalRows = family.row_count || allProducts.reduce((sum, row) => sum + Number(row.evidence_count || 0), 0);
    els.sourceFamilyFilterStatus.textContent = query
      ? `${visibleProducts.length} of ${allProducts.length} products · ${visibleRows} matching proof rows`
      : `${allProducts.length} products · ${totalRows} ${rowLabel}`;
  }
  const localImages = isLocalPreviewHost();
  renderSourceFamilyIngredientSummary(family, visibleProducts, query);
  renderSourceFamilyGapSummary(family, visibleProducts, query, localImages);
  renderSourceFamilyCoverageSummary(query);
  if (!visibleProducts.length) {
    state.cwaProductId = "";
    els.cwaProductStrip.innerHTML = "";
    if (els.sourceFamilyPrev) els.sourceFamilyPrev.disabled = true;
    if (els.sourceFamilyNext) els.sourceFamilyNext.disabled = true;
    if (els.sourceFamilyPosition) els.sourceFamilyPosition.textContent = "0 / 0";
    els.cwaTimelineTrack.classList.remove("is-single-proof-row");
    els.cwaTimelineTrack.innerHTML = `<article class="cwa-timeline-empty">No matching proof rows.</article>`;
    return;
  }
  if (!state.cwaProductId || !visibleProducts.some((row) => row.product_id === state.cwaProductId)) {
    state.cwaProductId = visibleProducts[0].product_id;
  }
  const productRow = selectedCwaProduct();
  const selectedProductIndex = selectedSourceFamilyProductIndex(visibleProducts);
  if (els.sourceFamilyPrev) els.sourceFamilyPrev.disabled = selectedProductIndex <= 0;
  if (els.sourceFamilyNext) els.sourceFamilyNext.disabled = selectedProductIndex >= visibleProducts.length - 1;
  if (els.sourceFamilyPosition) {
    els.sourceFamilyPosition.textContent = `${selectedProductIndex + 1} / ${visibleProducts.length}`;
  }
  els.cwaProductStrip.innerHTML = visibleProducts
    .map((row) => `
      <button class="cwa-product-chip ${row.product_id === state.cwaProductId ? "is-selected" : ""}" type="button" data-cwa-product-id="${escapeHtml(row.product_id)}">
        ${sourceFamilyProductPreview(row, query, localImages)}
        <span class="cwa-product-chip-copy">
          <strong>${escapeHtml(row.product_name)}</strong>
          ${sourceFamilyProductMetrics(row)}
        </span>
      </button>
    `)
    .join("");
  els.cwaProductStrip.querySelectorAll("[data-private-product-preview]").forEach((image) => {
    image.addEventListener("error", () => {
      image.closest(".cwa-product-thumb")?.classList.add("is-missing-private-preview");
      image.remove();
    }, { once: true });
  });

  const timelineRows = sourceFamilyRowsForProduct(productRow, query);
  els.cwaTimelineTrack.classList.toggle("is-single-proof-row", timelineRows.length === 1);
  els.cwaTimelineTrack.innerHTML = timelineRows
    .map((row, index) => {
      const canShowPreview = localImages && row.local_preview_available && row.preview_endpoint;
      const sourceLink = row.source_detail_url || row.source_url;
      const sourceTitle = row.source_image_title || (row.source_image_year ? `${row.source_image_year} source image` : "Source image pending");
      const ingredientText = row.ingredient_text || "";
      const evidenceText = row.candidate_excerpt
        || (row.crop_focus === "panel_context"
          ? "Focused package text is visible; readable ingredient list still needed."
          : "Wrapper imagery can support visual provenance only; readable ingredient panel still needed.");
      const proofClass = ingredientText ? "has-ingredient-proof" : "needs-readable-panel";
      const previewClass = ingredientText ? "has-transcript-overlay" : "needs-transcript-overlay";
      const visualBasis = proofVisualBasis(row);
      const readerId = `cwa-label-reader-${row.visual_id || index}`;
      return `
        <article class="cwa-timeline-card status-${escapeHtml(row.ingredient_signal_status)} ${proofClass}" data-proof-basis="${escapeHtml(visualBasis)}">
          <button class="cwa-preview-frame ${previewClass} ${canShowPreview ? "has-private-preview" : ""}" type="button" data-cwa-toggle="1" data-cwa-has-ingredient="${ingredientText ? "1" : "0"}" data-cwa-product-name="${escapeHtml(row.product_name)}" data-cwa-vintage-label="${escapeHtml(row.vintage_label)}" aria-pressed="false" aria-describedby="${escapeHtml(readerId)}" aria-label="${escapeHtml(ingredientText ? `Show ingredient proof text for ${row.product_name} ${row.vintage_label}` : `Inspect visual source gap for ${row.product_name} ${row.vintage_label}`)}">
            ${canShowPreview
              ? `<img src="${escapeHtml(row.preview_endpoint)}" alt="${escapeHtml(`${row.product_name} ${row.vintage_label} ${proofVisualLabel(row).toLowerCase()}`)}" loading="lazy" data-private-preview="1" />`
              : ""}
            <div class="cwa-preview-placeholder"><span>${escapeHtml(String(row.vintage_label || "").slice(0, 4))}</span></div>
            <span class="cwa-preview-reader-guide" aria-hidden="true"></span>
            <span class="cwa-preview-lens" aria-hidden="true">${cwaInlineIcon(ingredientText ? "ingredient" : "inspect")}</span>
            ${ingredientOverlay(row)}
          </button>
          <div class="cwa-proof-row">
            <div class="cwa-icon-row">${cwaStatusIcons(row)}</div>
            <div class="cwa-card-links">
              ${cwaActionLink("source", `Open source: ${row.source_domain || "source page"}`, sourceLink)}
              ${canShowPreview ? cwaActionLink("crop", "Open local private crop", row.preview_endpoint) : ""}
              ${cwaActionButton("inspect", "Open ingredient drill-in", row.visual_id)}
            </div>
          </div>
          <div class="cwa-card-body">
            <span>${escapeHtml(row.vintage_label)}</span>
            <strong>${escapeHtml(row.product_name)}</strong>
            <small class="cwa-source-title">${escapeHtml(sourceTitle)}</small>
            ${ingredientText
              ? ingredientTextBlock(row, { compact: true, id: readerId })
              : missingIngredientTextBlock(row, evidenceText, { id: readerId })}
          </div>
        </article>
      `;
    })
    .join("");
  els.cwaTimelineTrack.querySelectorAll("[data-private-preview]").forEach((image) => {
    image.addEventListener("error", () => {
      image.closest(".cwa-preview-frame")?.classList.add("is-missing-private-preview");
      image.remove();
    }, { once: true });
  });
  els.cwaTimelineTrack.querySelectorAll("[data-cwa-toggle]").forEach((button) => {
    syncCwaPreviewButton(button, false);
    button.addEventListener("pointerenter", () => setCwaPreviewState(button, true));
    button.addEventListener("pointerleave", () => setCwaPreviewState(button, false));
    button.addEventListener("focus", () => setCwaPreviewState(button, true));
    button.addEventListener("blur", () => setCwaPreviewState(button, false));
    button.addEventListener("click", () => {
      const card = button.closest(".cwa-timeline-card");
      const isOpen = card?.classList.toggle("is-ingredient-open") || false;
      syncCwaPreviewButton(button, isOpen);
    });
  });
}

function renderSummary(productRow) {
  const resolution = productRow.story_resolution || {};
  els.productSummary.innerHTML = `
    <article class="summary-card">
      <p class="eyebrow">${escapeHtml(productRow.category)}</p>
      <h2>${escapeHtml(productRow.name)}</h2>
      <p>${escapeHtml(productRow.summary)}</p>
      <div class="summary-metrics">
        <span><strong>${escapeHtml(`${productRow.source_backed_slots}/${productRow.total_slots}`)}</strong>Source-backed slots</span>
        <span><strong>${escapeHtml(`${productRow.coverage}%`)}</strong>Coverage</span>
        <span><strong>${escapeHtml(productRow.candidate_count)}</strong>Candidates</span>
        <span><strong>${escapeHtml(productRow.verified_labels)}</strong>Verified labels</span>
        <span><strong>${escapeHtml(resolution.outstanding_gap_count ?? 0)}</strong>Raw gaps</span>
      </div>
    </article>
  `;
  els.gapList.innerHTML = `
    <article class="gap-card">
      <strong>Original Label</strong>
      <p>${escapeHtml(productRow.claim_boundary)}</p>
      ${statusBadge("gap_publishable")}
    </article>
    <article class="gap-card">
      <strong>Next Unlock</strong>
      <p>${escapeHtml(productRow.next_unlock)}</p>
      ${statusBadge("label_visible")}
    </article>
  `;
}

function renderStoryReadiness(productRow) {
  const resolution = productRow.story_resolution || {};
  els.storyReadiness.innerHTML = `
    <article class="readiness-card">
      <div class="readiness-pair">
        <span>Story</span>
        ${statusBadge(productRow.pilot_rollup_status || "story_ready")}
      </div>
      <div class="readiness-pair">
        <span>Claims</span>
        ${statusBadge(productRow.claim_rollup_status || "needs_manual_verification")}
      </div>
      <div class="readiness-pair">
        <span>Resolved Slots</span>
        <strong>${escapeHtml(`${resolution.resolved_slots ?? productRow.total_slots}/${productRow.total_slots}`)}</strong>
      </div>
      <div class="readiness-pair">
        <span>Publishable Gaps</span>
        <strong>${escapeHtml(resolution.publishable_gap_slots ?? 0)}</strong>
      </div>
      <div class="readiness-pair">
        <span>Outstanding Raw Gaps</span>
        <strong>${escapeHtml(resolution.outstanding_gap_count ?? 0)}</strong>
      </div>
      <dl class="photo-summary-list">
        <div>
          <dt>Identity Scope</dt>
          <dd>${escapeHtml(productRow.identity_scope || "Variant and SKU boundaries need review.")}</dd>
        </div>
        <div>
          <dt>Maker Timeline</dt>
          <dd>${escapeHtml(productRow.maker_timeline || "Manufacturer/distributor context needs source-backed review.")}</dd>
        </div>
        <div>
          <dt>Grok / xAI</dt>
          <dd>${escapeHtml(productRow.grok_research_assist?.recommended_use || "Optional research assist only; not evidence.")}</dd>
        </div>
        <div>
          <dt>Claim Gate</dt>
          <dd>${escapeHtml(resolution.claim_gate || "No formulation claim is promoted without manual verification metadata.")}</dd>
        </div>
      </dl>
    </article>
  `;
}

function renderHero(productRow) {
  const frame = productRow.category === "fast food"
    ? "document journey first, formulation claims later"
    : "package journey first, recipe comparison later";
  els.storyHero.innerHTML = `
    <p class="eyebrow">Reader Story</p>
    <h2>${escapeHtml(productRow.name)}: ${escapeHtml(frame)}</h2>
    <p>${escapeHtml(productRow.story_thesis)}</p>
      <div class="hero-metrics">
        <span><strong>${escapeHtml(productRow.source_backed_slots)}</strong>Source-backed chapters</span>
        <span><strong>${escapeHtml(productRow.photo_enriched_eras || 0)}</strong>Photo-enriched eras</span>
        <span><strong>${escapeHtml(productRow.label_visible_leads)}</strong>Label-visible leads</span>
        <span><strong>${escapeHtml(productRow.label_text_candidates || 0)}</strong>Text candidates</span>
        <span><strong>${escapeHtml(productRow.verified_labels)}</strong>Verified ingredient labels</span>
        <span><strong>${escapeHtml(productRow.source_domains.length)}</strong>Source venues</span>
        <span><strong>${escapeHtml(productRow.story_resolution?.publishable_gap_slots ?? 0)}</strong>Bounded gaps</span>
      </div>
    <div class="lead-meta reader-tags">
      ${statusBadge(productRow.pilot_rollup_status || "story_ready")}
      ${statusBadge(productRow.claim_rollup_status || "needs_manual_verification")}
      ${statusBadge("source_review")}
      ${statusBadge("gap_publishable")}
      ${productRow.source_domains.slice(0, 4).map((source) => `<span class="source-chip">${escapeHtml(source)}</span>`).join("")}
    </div>
  `;
}

function renderPhotoSummary(productRow) {
  const summary = productRow.photo_quality_summary || {};
  els.photoSummary.innerHTML = `
    <article class="photo-summary-card">
      <strong>${escapeHtml(summary.headline || "Photo quality summary pending")}</strong>
      <dl class="photo-summary-list">
        <div>
          <dt>Can prove</dt>
          <dd>${escapeHtml(summary.can_prove || "Source and package context after review.")}</dd>
        </div>
        <div>
          <dt>Cannot prove</dt>
          <dd>${escapeHtml(summary.cannot_prove || "Ingredient changes without reviewed label text.")}</dd>
        </div>
        <div>
          <dt>Next photo target</dt>
          <dd>${escapeHtml(summary.highest_value_next || "Find readable panels and verified transcriptions.")}</dd>
        </div>
      </dl>
    </article>
  `;
}

function renderTimeline(productRow) {
  const versions = visibleVersions(productRow);
  const isMobile = window.matchMedia("(max-width: 680px)").matches;
  const columns = isMobile ? "1fr" : `repeat(${Math.max(1, versions.length)}, minmax(0, 1fr))`;
  els.timelineAxis.style.gridTemplateColumns = columns;
  els.timelineTrack.style.gridTemplateColumns = columns;
  els.timelineAxis.innerHTML = versions.map((row) => `<span>${escapeHtml(row.year)}</span>`).join("");
  els.timelineTrack.innerHTML = versions
    .map((row) => `
      <button class="timeline-card ${row.id === state.versionId ? "is-selected" : ""}" type="button" data-version-id="${escapeHtml(row.id)}">
        <em>${escapeHtml(String(row.year).slice(-2))}</em>
        <span>${escapeHtml(row.label)}</span>
        <strong>${escapeHtml(row.headline)}</strong>
        <p>${escapeHtml(row.ingredient_summary)}</p>
        ${statusBadge(row.status)}
      </button>
    `)
    .join("");
}

function renderFacets(productRow) {
  els.facetList.innerHTML = productRow.facets
    .map((facet) => `
      <button class="facet-card ${facet.id === state.facetId ? "is-selected" : ""}" type="button" data-facet-id="${escapeHtml(facet.id)}">
        <span>${escapeHtml(facet.status)}</span>
        <strong>${escapeHtml(facet.label)}</strong>
        <p>${escapeHtml(facet.detail)}</p>
        ${facet.photo_unlock ? `<em>${escapeHtml(facet.photo_unlock)}</em>` : ""}
      </button>
    `)
    .join("");
}

function renderFlow(productRow) {
  const versions = visibleVersions(productRow);
  const facets = state.facetId
    ? productRow.facets.filter((row) => row.id === state.facetId)
    : productRow.facets;
  els.flowView.innerHTML = facets
    .map((facet) => `
      <article class="flow-row">
        <strong>${escapeHtml(facet.label)}</strong>
        <div class="flow-line" style="grid-template-columns:repeat(${Math.max(1, versions.length)}, minmax(0, 1fr))" aria-label="${escapeHtml(facet.label)} readiness by vintage">
          ${versions.map((version) => {
            const className = ["manual_verified", "ocr_extracted", "label_visible", "label_text_candidate"].includes(version.status) ? "is-ready" : version.status === "usable_photo" || version.status === "source_review" ? "is-photo" : version.status === "gap_publishable" ? "is-gap" : "";
            return `<span class="${className}" title="${escapeHtml(version.label)}: ${escapeHtml(labelFor(version.status))}"></span>`;
          }).join("")}
        </div>
        ${statusBadge(facet.status)}
      </article>
    `)
    .join("");
}

function renderBlockedMap(productRow) {
  els.blockedMap.innerHTML = (productRow.blocked_map || [])
    .map((row) => `
      <article class="blocked-card status-${escapeHtml(row.status)}">
        <span>${escapeHtml(row.status)}</span>
        <strong>${escapeHtml(row.lane)}</strong>
        <p>${escapeHtml(row.why)}</p>
        <em>${escapeHtml(row.photo_target)}</em>
        ${statusBadge(row.status)}
      </article>
    `)
    .join("");
}

function renderEvents(productRow) {
  els.eventList.innerHTML = productRow.events
    .filter((event) => Number(event.year) <= Number(state.maxYear || 2026))
    .map((event) => `
      <article class="event-card">
        <span>${escapeHtml(event.year)}</span>
        <strong>${escapeHtml(event.label)}</strong>
        <p>${escapeHtml(event.detail)}</p>
        ${statusBadge(event.status)}
      </article>
    `)
    .join("");
}

function renderLabelExtract(extract, compact = false) {
  if (!extract) return "";
  const terms = (extract.legible_terms || [])
    .map((term) => `<span>${escapeHtml(term)}</span>`)
    .join("");
  return `
    <div class="visible-extract ${compact ? "is-compact" : ""}">
      <span>${escapeHtml(extract.status || "label-text candidate")}</span>
      <p>${escapeHtml(extract.observed_text || "Visible extract pending transcription.")}</p>
      ${extract.source_note ? `<small>${escapeHtml(extract.source_note)}</small>` : ""}
      <small>${escapeHtml(extract.confidence_note || "Manual verification needed.")}</small>
      ${terms ? `<div class="extract-terms">${terms}</div>` : ""}
    </div>
  `;
}

function renderSourceTargets(targets = []) {
  if (!targets.length) return "";
  return `
    <div class="source-targets">
      <strong>Queued Source Targets</strong>
      ${targets.slice(0, 4).map((target) => `
        <article>
          <span>${escapeHtml(target.source_name || "Source target")}</span>
          <p>${escapeHtml(target.expected_evidence || target.import_hint || "Review for attributable product, date, and panel evidence.")}</p>
          ${target.search_url ? `<a href="${escapeHtml(target.search_url)}" target="_blank" rel="noreferrer">Open search</a>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function renderGapResolution(version) {
  const resolution = version.gap_resolution;
  if (!resolution) return "";
  return `
    <div class="gap-resolution">
      <span>${escapeHtml(resolution.state || "resolved_publishable_gap")}</span>
      <dl>
        <div>
          <dt>Can Say</dt>
          <dd>${escapeHtml(resolution.can_say)}</dd>
        </div>
        <div>
          <dt>Cannot Say</dt>
          <dd>${escapeHtml(resolution.cannot_say)}</dd>
        </div>
        <div>
          <dt>Confidence Scope</dt>
          <dd>${escapeHtml(resolution.confidence_scope)}</dd>
        </div>
      </dl>
      ${renderSourceTargets(resolution.source_targets || [])}
    </div>
  `;
}

function renderDetail(productRow, version) {
  const evidenceRows = versionEvidence(productRow, version);
  els.versionDetail.innerHTML = `
    <article>
      <p class="eyebrow">Selected Version</p>
      <h2>${escapeHtml(version.label)}</h2>
      <p>${escapeHtml(version.ingredient_summary)}</p>
      <div class="detail-grid">
        <span><strong>${escapeHtml(version.year)}</strong>Year marker</span>
        <span><strong>${escapeHtml(formatPct(version.confidence))}</strong>Confidence</span>
        <span><strong>${escapeHtml(qualityLabel(version.photo_quality?.quality_score))}</strong>Photo quality</span>
        <span><strong>${escapeHtml(version.source_count)}</strong>Sources</span>
        <span><strong>${escapeHtml(evidenceRows.length)}</strong>Shown evidence</span>
      </div>
      <dl class="detail-list">
        <div>
          <dt>Validation State</dt>
          <dd>${escapeHtml(version.validation_state?.note || "Candidate evidence needs review before claim promotion.")}</dd>
        </div>
        <div>
          <dt>Photo Role</dt>
          <dd>${escapeHtml(version.photo_quality?.role || "Not classified")}</dd>
        </div>
        <div>
          <dt>Label Panel</dt>
          <dd>${escapeHtml(version.photo_quality?.label_panel || "Not reviewed")}</dd>
        </div>
        <div>
          <dt>Photo Blocker</dt>
          <dd>${escapeHtml(version.photo_quality?.blocker || "Needs source-attributable readable panel.")}</dd>
        </div>
        <div>
          <dt>Package</dt>
          <dd>${escapeHtml(version.package_context)}</dd>
        </div>
        <div>
          <dt>Price/Weight</dt>
          <dd>${escapeHtml(version.price_weight_context)}</dd>
        </div>
        <div>
          <dt>Next Proof</dt>
          <dd>${escapeHtml(version.next_step)}</dd>
        </div>
      </dl>
      ${renderGapResolution(version)}
      ${renderLabelExtract(version.label_extract)}
    </article>
  `;
  els.evidenceGallery.innerHTML = evidenceRows.length
    ? evidenceRows.map((row) => `
      <article class="evidence-card">
        <span>${escapeHtml(row.kind)}</span>
        <strong>${escapeHtml(row.title)}</strong>
        <p>${escapeHtml(row.rights)}</p>
        <dl class="evidence-quality">
          <div>
            <dt>Photo role</dt>
            <dd>${escapeHtml(row.photo_role || "not classified")}</dd>
          </div>
          <div>
            <dt>Panel state</dt>
            <dd>${escapeHtml(row.label_panel_state || "not reviewed")}</dd>
          </div>
          <div>
            <dt>Quality note</dt>
            <dd>${escapeHtml(row.quality_note || "review needed")}</dd>
          </div>
        </dl>
        ${renderLabelExtract(row.visible_extract, true)}
        ${statusBadge(row.status)}
        <a href="${escapeHtml(row.url)}" target="_blank" rel="noreferrer">${escapeHtml(row.source)}</a>
      </article>
    `).join("")
    : `<article class="evidence-card"><strong>No verified source object shown</strong><p>This slot is intentionally held as a publishable evidence gap. The gap can be shown, but no ingredient fact can be claimed.</p>${statusBadge("gap_publishable")}</article>`;
  els.priceWeight.innerHTML = `
    <span><strong>${escapeHtml(version.price_weight_context.includes("candidate") ? "Candidate" : "Deferred")}</strong>Price/oz</span>
    <span><strong>${escapeHtml(version.package_context.includes("serving") ? "Candidate" : "Deferred")}</strong>Price/100g</span>
    <span><strong>${escapeHtml(version.price_weight_context.includes("serving") ? "Candidate" : "Deferred")}</strong>Serving</span>
  `;
}

function renderReviewQueue(productRow) {
  els.reviewQueue.innerHTML = (productRow.review_queue || [])
    .map((row) => `
      <article class="review-card">
        <span>${escapeHtml(row.vintage)}</span>
        <strong>${escapeHtml(row.label)}</strong>
        <p>${escapeHtml(row.missing_fields)}</p>
        ${row.gap_resolution_state ? `<small>${escapeHtml(`${row.gap_resolution_state} · ${row.source_target_count || 0} source targets`)}</small>` : ""}
        <em>${escapeHtml(row.next_action)}</em>
        ${statusBadge(row.status)}
      </article>
    `)
    .join("");
}

function renderExports(productRow) {
  const exports = productRow.export_paths || {};
  const rows = [
    ["Timeline JSON", exports.timeline_json],
    ["Evidence CSV", exports.evidence_csv],
    ["Visible Extracts CSV", exports.extracts_csv],
    ["Gap Closure CSV", exports.gap_closure_csv],
    ["OCR Queue CSV", exports.ocr_queue_csv],
    ["Story Briefs", exports.story_markdown],
  ].filter(([, href]) => href);
  els.exportLinks.innerHTML = rows.length
    ? rows.map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join("")
    : `<p class="empty-note">Exports are not configured for this product.</p>`;
}

function renderClusters(productRow) {
  els.clusterList.innerHTML = productRow.clusters
    .map((row) => `
      <article class="cluster-card">
        <span>${escapeHtml(row.status)}</span>
        <strong>${escapeHtml(row.label)}</strong>
        <p>${escapeHtml(row.detail)}</p>
        ${statusBadge(row.status)}
      </article>
    `)
    .join("");
}

function renderStatus(productRow) {
  els.status.innerHTML = `
    <strong>${escapeHtml(productRow.name)}</strong>
    <span>${escapeHtml(productRow.claim_boundary)}</span>
  `;
}

function render() {
  const productRow = product();
  const versions = visibleVersions(productRow);
  if (!state.versionId || !versions.some((row) => row.id === state.versionId)) {
    state.versionId = versions[versions.length - 1]?.id || productRow.versions[productRow.versions.length - 1].id;
  }
  const version = selectedVersion(productRow);
  renderProductPicker();
  renderSourceFamilySummary();
  renderCwaTimeline();
  renderStatus(productRow);
  renderSummary(productRow);
  renderStoryReadiness(productRow);
  renderHero(productRow);
  renderPhotoSummary(productRow);
  renderTimeline(productRow);
  renderFacets(productRow);
  renderFlow(productRow);
  renderBlockedMap(productRow);
  renderEvents(productRow);
  renderDetail(productRow, version);
  renderReviewQueue(productRow);
  renderExports(productRow);
  renderClusters(productRow);
}

function attachEvents() {
  els.productSelect.addEventListener("change", () => {
    const next = state.data.products.find((row) => row.id === els.productSelect.value);
    if (!next) return;
    state.productId = next.id;
    state.versionId = "";
    render();
  });
  els.productSearch.addEventListener("input", () => {
    state.search = els.productSearch.value;
    renderProductPicker();
  });
  els.productStrip.addEventListener("click", (event) => {
    const button = event.target.closest("[data-product-id]");
    if (!button || button.disabled) return;
    state.productId = button.dataset.productId;
    state.versionId = "";
    render();
  });
  els.cwaProductStrip?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cwa-product-id]");
    if (!button) return;
    state.cwaProductId = button.dataset.cwaProductId;
    renderCwaTimeline();
  });
  els.sourceFamilySearch?.addEventListener("input", () => {
    state.sourceFamilyQuery = els.sourceFamilySearch.value;
    renderCwaTimeline();
  });
  els.sourceFamilyFilterClear?.addEventListener("click", () => {
    state.sourceFamilyQuery = "";
    state.cwaProductId = "";
    if (els.sourceFamilySearch) els.sourceFamilySearch.value = "";
    renderCwaTimeline();
    els.sourceFamilySearch?.focus();
  });
  els.sourceFamilyPrev?.addEventListener("click", () => {
    moveSourceFamilyProduct(-1);
  });
  els.sourceFamilyNext?.addEventListener("click", () => {
    moveSourceFamilyProduct(1);
  });
  els.cwaTimelinePanel?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-source-family-filter-value]");
    if (button) {
      event.preventDefault();
      applySourceFamilyFilter(button.dataset.sourceFamilyFilterValue);
      return;
    }
    const gapProductButton = event.target.closest("[data-cwa-gap-product-id]");
    if (gapProductButton) {
      state.cwaProductId = gapProductButton.dataset.cwaGapProductId;
      renderCwaTimeline();
      els.cwaTimelineTrack?.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    const gapInspectButton = event.target.closest(".source-family-gap-summary [data-cwa-inspect]");
    if (gapInspectButton) {
      const row = sourceFamilyRowByVisualId(gapInspectButton.dataset.cwaInspect);
      if (row) openIngredientDrilldown(row);
    }
  });
  els.cwaTimelineTrack?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cwa-inspect]");
    if (!button) return;
    const row = sourceFamilyRowByVisualId(button.dataset.cwaInspect);
    if (row) openIngredientDrilldown(row);
  });
  els.sourceFamilyTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-source-family-id]");
    if (!button) return;
    state.sourceFamilyId = button.dataset.sourceFamilyId;
    state.cwaProductId = "";
    renderSourceFamilySummary();
    renderCwaTimeline();
  });
  els.timelineTrack.addEventListener("click", (event) => {
    const button = event.target.closest("[data-version-id]");
    if (!button) return;
    state.versionId = button.dataset.versionId;
    render();
  });
  els.facetList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-facet-id]");
    if (!button) return;
    state.facetId = state.facetId === button.dataset.facetId ? "" : button.dataset.facetId;
    render();
  });
  els.clearFacet.addEventListener("click", () => {
    state.facetId = "";
    render();
  });
  els.timeRange.addEventListener("input", () => {
    state.maxYear = Number(els.timeRange.value);
    render();
  });
  els.compareToggle.addEventListener("click", () => {
    state.compare = !state.compare;
    els.compareToggle.setAttribute("aria-pressed", String(state.compare));
    els.compareToggle.textContent = state.compare ? "Compare Mode On" : "Compare Mode";
  });
  els.ingredientDrilldown?.addEventListener("click", (event) => {
    const ingredientButton = event.target.closest("[data-source-family-filter-value]");
    if (ingredientButton) {
      event.preventDefault();
      applySourceFamilyFilter(ingredientButton.dataset.sourceFamilyFilterValue, { closeDrilldown: true });
      return;
    }
    if (event.target.closest("[data-ingredient-drilldown-close]")) {
      closeIngredientDrilldown();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.ingredientDrilldown?.hidden) {
      closeIngredientDrilldown();
    }
  });
}

async function init() {
  try {
    const response = await fetch("../data/product-evidence/navigator_data.json");
    if (!response.ok) throw new Error(`Navigator data returned ${response.status}`);
    state.data = await response.json();
    state.productId = state.data.default_product;
    state.sourceFamilyId = state.data.source_family_timeline?.default_family || state.data.source_family_timeline?.families?.[0]?.id || "";
    const family = sourceFamilyTimeline();
    state.cwaProductId = family?.products?.[0]?.product_id || "";
    state.maxYear = Number(els.timeRange.value || 2026);
    attachEvents();
    render();
  } catch (error) {
    els.status.innerHTML = `<strong>Could not load navigator data</strong><span>${escapeHtml(error.message)}</span>`;
  }
}

init();
