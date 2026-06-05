const state = {
  data: null,
  journey: null,
  search: "",
  category: "",
  surface: "",
  status: "",
  selectedJourneyProduct: "",
};

const els = {
  status: document.querySelector("#status"),
  metrics: document.querySelector("#metrics"),
  search: document.querySelector("#search"),
  category: document.querySelector("#category-filter"),
  surface: document.querySelector("#surface-filter"),
  statusFilter: document.querySelector("#status-filter"),
  vintageLegend: document.querySelector("#vintage-legend"),
  productRows: document.querySelector("#product-rows"),
  productCount: document.querySelector("#product-count"),
  sourceBars: document.querySelector("#source-bars"),
  queueRows: document.querySelector("#queue-rows"),
  queueCount: document.querySelector("#queue-count"),
  photoRows: document.querySelector("#photo-rows"),
  photoCount: document.querySelector("#photo-count"),
  sweepRows: document.querySelector("#sweep-rows"),
  sweepCount: document.querySelector("#sweep-count"),
  journeyCount: document.querySelector("#journey-count"),
  journeySummary: document.querySelector("#journey-summary"),
  journeyProduct: document.querySelector("#journey-product"),
  journeyProducts: document.querySelector("#journey-products"),
};

const vintageLabels = {
  current_2020s: "2020s",
  "2010s": "2010s",
  "2000s": "2000s",
  "1990s": "1990s",
  "1980s_or_earlier": "1980s-",
  earliest_verified_label: "Earliest",
};

const statusLabels = {
  ground_truth_ready: "Verified",
  manual_review_ready: "Review",
  candidate_found: "Found",
  candidate_needs_panel: "Panel",
  candidate_needs_transcription: "Text",
  candidate_needs_archive: "Archive",
  no_source: "Open",
  unknown: "Unknown",
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

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function firstPart(value) {
  return String(value || "").split(";").map((part) => part.trim()).find(Boolean) || "";
}

function splitParts(value, limit = 4) {
  return String(value || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function labelFor(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function linkOrText(value, label = "Open") {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.startsWith("http://") || text.startsWith("https://")) {
    return `<a href="${escapeHtml(text)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
  }
  return `<code>${escapeHtml(text)}</code>`;
}

function statusTag(value, extraClass = "") {
  return `<span class="status-tag ${escapeHtml(extraClass)}">${escapeHtml(labelFor(value))}</span>`;
}

function textBlob(row) {
  return Object.values(row).join(" ").toLowerCase();
}

function productBlob(row) {
  return [
    row.display_name,
    row.brand,
    row.category,
    row.subcategory,
    row.collection_track,
    row.top_source_names,
    row.top_source_domains,
    row.missing_vintages,
    row.panel_needed_vintages,
    row.archive_needed_vintages,
  ].join(" ").toLowerCase();
}

function passesQueue(row) {
  const query = state.search.trim().toLowerCase();
  if (state.category && row.category !== state.category) return false;
  if (state.surface && row.acquisition_surface !== state.surface) return false;
  if (state.status && row.acquisition_status !== state.status) return false;
  if (query && !textBlob(row).includes(query)) return false;
  return true;
}

function passesProduct(row) {
  const query = state.search.trim().toLowerCase();
  if (state.category && row.category !== state.category) return false;
  if (query && !productBlob(row).includes(query)) return false;
  return true;
}

function passesPhoto(row) {
  const query = state.search.trim().toLowerCase();
  if (state.category && row.category !== state.category) return false;
  if (query && !textBlob(row).includes(query)) return false;
  return true;
}

function renderMetrics() {
  const metrics = state.data.metrics;
  const cards = [
    ["Products", metrics.targets],
    ["Candidates", metrics.candidates],
    ["Photo Evidence", metrics.photo_evidence_rows],
    ["Acquisition Rows", metrics.acquisition_rows],
    ["Source Review", metrics.source_review_ready],
    ["Current-Web Search", metrics.current_web_search_ready],
    ["CDX Retry", metrics.cdx_retry_ready],
    ["CDX Sweep", metrics.cdx_sweep_ready],
  ];
  els.metrics.innerHTML = cards
    .map(([label, value]) => `<article class="metric"><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></article>`)
    .join("");
}

function renderFilters() {
  const categories = [...new Set(state.data.products.map((row) => row.category).filter(Boolean))].sort();
  const surfaces = [...new Set(state.data.acquisition_queue.map((row) => row.acquisition_surface).filter(Boolean))].sort();
  const statuses = [...new Set(state.data.acquisition_queue.map((row) => row.acquisition_status).filter(Boolean))].sort();
  els.category.innerHTML = `<option value="">All categories</option>${categories
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("")}`;
  els.surface.innerHTML = `<option value="">All surfaces</option>${surfaces
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(labelFor(value))}</option>`)
    .join("")}`;
  els.statusFilter.innerHTML = `<option value="">All statuses</option>${statuses
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(labelFor(value))}</option>`)
    .join("")}`;
}

function renderLegend() {
  els.vintageLegend.innerHTML = state.data.vintages
    .map((vintage) => `<span><i></i>${escapeHtml(vintageLabels[vintage] || vintage)}</span>`)
    .join("");
}

function renderProducts() {
  const rows = state.data.products.filter(passesProduct);
  els.productCount.textContent = `${formatNumber(rows.length)} products`;
  els.productRows.innerHTML = rows
    .slice(0, 100)
    .map((row) => {
      const cells = state.data.vintages
        .map((vintage) => {
          const info = row.vintage_statuses[vintage] || { status: "unknown", source_count: 0 };
          const status = info.status || "unknown";
          return `<span class="vintage-cell status-${escapeHtml(status)}" title="${escapeHtml(vintage)}: ${escapeHtml(status)}">${escapeHtml(statusLabels[status] || info.source_count || "")}</span>`;
        })
        .join("");
      const bestUrl = firstPart(row.best_source_urls || row.starter_search_urls || row.starter_image_urls);
      return `
        <article class="product-row">
          <div class="product-name">
            <strong>${escapeHtml(row.display_name || row.canonical_name)}</strong>
            <span>${escapeHtml(row.category || "")} · ${formatNumber(row.product_candidate_count)} candidates · ${formatNumber(row.scout_source_count)} source venues</span>
          </div>
          <div class="vintage-grid">${cells}</div>
          <div class="small">
            ${escapeHtml(labelFor(row.collection_track))}<br />
            ${linkOrText(bestUrl, "Best source")}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSourceBars() {
  const rows = state.data.source_batches
    .filter((row) => !state.category || row.category === state.category)
    .filter((row) => !state.surface || row.surface === state.surface)
    .slice(0, 28);
  const max = Math.max(1, ...rows.map((row) => Number(row.count || 0)));
  els.sourceBars.innerHTML = rows
    .map((row) => {
      const width = Math.max(5, Math.round((Number(row.count || 0) / max) * 100));
      return `
        <article class="source-bar">
          <header>
            <strong>${escapeHtml(row.source)}</strong>
            <span>${formatNumber(row.count)}</span>
          </header>
          <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
          <span class="small">${escapeHtml(row.category)} · ${escapeHtml(labelFor(row.surface))}</span>
        </article>
      `;
    })
    .join("");
}

function renderQueue() {
  const rows = state.data.acquisition_queue.filter(passesQueue);
  els.queueCount.textContent = `${formatNumber(rows.length)} rows`;
  els.queueRows.innerHTML = rows
    .slice(0, 220)
    .map((row) => {
      const primary = firstPart(row.primary_url_or_command || row.browser_batch_urls);
      return `
        <tr>
          <td>${formatNumber(row.acquisition_priority)}</td>
          <td>${statusTag(row.acquisition_status)}</td>
          <td>${statusTag(row.acquisition_surface, `surface-${row.acquisition_surface}`)}</td>
          <td>${escapeHtml(row.source_name || row.source_key)}</td>
          <td>${escapeHtml(row.category || "")}</td>
          <td>${formatNumber(row.product_count)}<br /><span class="small">${escapeHtml(row.top_products || "")}</span></td>
          <td>${linkOrText(primary, primary.startsWith("http") ? "Open" : "Command")}</td>
          <td>${escapeHtml(row.verification_gate || row.completion_gate || "")}</td>
        </tr>
      `;
    })
    .join("");
}

function renderPhotos() {
  const rows = state.data.photo_evidence
    .filter(passesPhoto)
    .sort((a, b) => Number(b.matrix_priority || 0) - Number(a.matrix_priority || 0))
    .slice(0, 90);
  els.photoCount.textContent = `${formatNumber(rows.length)} shown`;
  els.photoRows.innerHTML = rows
    .map((row) => `
      <article class="lead-item">
        <div class="lead-title">
          <strong>${escapeHtml(row.display_name || row.canonical_name)}</strong>
          <span>${escapeHtml(row.vintage_label || "")} · ${escapeHtml(row.source_domain || "")}</span>
        </div>
        <p>${escapeHtml(row.promotion_blocker || row.ground_truth_fields_missing || row.evidence_status_label || "")}</p>
        <div class="lead-meta">
          ${statusTag(row.evidence_status_label)}
          ${statusTag(row.source_attribution_status)}
          ${linkOrText(row.source_url, "Source")}
        </div>
      </article>
    `)
    .join("");
}

function renderSweeps() {
  const rows = state.data.common_crawl_sweeps
    .filter((row) => !state.category || row.category === state.category)
    .filter((row) => !state.status || row.sweep_status === state.status || !state.status.startsWith("ready_for"))
    .filter((row) => {
      const query = state.search.trim().toLowerCase();
      return !query || textBlob(row).includes(query);
    })
    .slice(0, 80);
  els.sweepCount.textContent = `${formatNumber(rows.length)} sweeps`;
  els.sweepRows.innerHTML = rows
    .map((row) => `
      <article class="lead-item">
        <div class="lead-title">
          <strong>${escapeHtml(row.query_contains || row.sweep_kind)}</strong>
          <span>${escapeHtml(row.category || "")} · ${formatNumber(row.product_count)} products</span>
        </div>
        <p>${escapeHtml(row.next_action || "")}</p>
        <div class="lead-meta">
          ${statusTag(row.sweep_status)}
          ${statusTag(row.sweep_kind)}
          ${linkOrText(row.cli_command, "Command")}
        </div>
      </article>
    `)
    .join("");
}

function renderIngredientTags(tags, limit = 8) {
  return (tags || [])
    .slice(0, limit)
    .map((tag) => `<span>${escapeHtml(tag)}</span>`)
    .join("");
}

function renderJourneySourceLead(lead, index) {
  const label = lead.sourceTitle || lead.sourceDomain || `Evidence ${index + 1}`;
  const meta = [lead.vintage && labelFor(lead.vintage), lead.role && labelFor(lead.role), lead.confidence ? `score ${lead.confidence}` : ""]
    .filter(Boolean)
    .join(" · ");
  return `
    <article class="source-lead">
      <strong>${linkOrText(lead.sourceUrl, label)}</strong>
      <span>${escapeHtml(meta)}</span>
      <p>${escapeHtml(lead.disclosure || "")}</p>
    </article>
  `;
}

function renderJourneyEra(era) {
  const evidenceLinks = (era.photoEvidence || []).length
    ? `
      <details class="source-leads">
        <summary>Evidence leads (${formatNumber(era.photoEvidence.length)})</summary>
        <div>${era.photoEvidence.map(renderJourneySourceLead).join("")}</div>
      </details>
    `
    : `<p class="journey-next">${escapeHtml(era.nextAction || "")}</p>`;
  return `
    <article class="journey-era status-${escapeHtml(era.status || "unknown")}">
      <header>
        <strong>${escapeHtml(vintageLabels[era.vintage] || labelFor(era.vintage))}</strong>
        ${statusTag(era.status || "unknown", `status-${era.status || "unknown"}`)}
      </header>
      <dl>
        <div><dt>Sources</dt><dd>${formatNumber(era.sourceCount)}</dd></div>
        <div><dt>Evidence</dt><dd>${formatNumber(era.evidenceScore)}</dd></div>
      </dl>
      <div class="ingredient-tags">${renderIngredientTags(era.ingredientSignals, 5)}</div>
      ${evidenceLinks}
    </article>
  `;
}

function renderOwnershipMilestone(milestone) {
  return `
    <article class="ownership-item">
      <strong>${escapeHtml(milestone.year)} · ${escapeHtml(milestone.owner || "")}</strong>
      <p>${escapeHtml(milestone.event || "")}</p>
      ${linkOrText(milestone.sourceUrl, milestone.sourceLabel || "Source")}
    </article>
  `;
}

function renderJourneyOverview(products, selectedId) {
  return `
    <div class="journey-overview" aria-label="Product journey comparison">
      ${products
        .map((product) => {
          const years = product.ownershipMilestones.map((event) => event.year).join(", ") || "stable";
          const selected = product.canonicalName === selectedId ? " selected" : "";
          return `
            <article class="journey-overview-card${selected}">
              <strong>${escapeHtml(product.displayName || product.canonicalName)}</strong>
              <span>${escapeHtml(product.category || "")} · ${escapeHtml(years)}</span>
              <p>${escapeHtml(product.trendSummary || "")}</p>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderJourney() {
  if (!els.journeyProducts) return;
  const journey = state.journey;
  const products = journey?.products || [];
  if (!products.length) {
    els.journeyCount.textContent = "No journey data";
    els.journeySummary.innerHTML = "";
    els.journeyProducts.innerHTML = `
      <article class="journey-empty">
        <strong>Ingredient journey artifact missing</strong>
        <p>Run the product ingredient journey builder after the product evidence snapshot is available.</p>
      </article>
    `;
    return;
  }

  if (!products.some((product) => product.canonicalName === state.selectedJourneyProduct)) {
    state.selectedJourneyProduct = products[0].canonicalName;
  }

  const selected = products.find((product) => product.canonicalName === state.selectedJourneyProduct) || products[0];
  els.journeyCount.textContent = `${formatNumber(products.length)} products`;
  els.journeyProduct.innerHTML = products
    .map((product) => `<option value="${escapeHtml(product.canonicalName)}">${escapeHtml(product.displayName || product.canonicalName)}</option>`)
    .join("");
  els.journeyProduct.value = selected.canonicalName;

  const metrics = journey.metrics || {};
  const summaryCards = [
    ["Tracked Products", metrics.products],
    ["Ownership Milestones", metrics.ownershipMilestones],
    ["Evidence Links", metrics.evidencePhotoLinks],
    ["Ingredient Themes", metrics.ingredientThemes],
  ];
  els.journeySummary.innerHTML = summaryCards
    .map(([label, value]) => `<article class="metric journey-metric"><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></article>`)
    .join("");

  const ownership = selected.ownershipMilestones.length
    ? selected.ownershipMilestones.map(renderOwnershipMilestone).join("")
    : `<article class="ownership-item"><strong>Stable ownership baseline</strong><p>No ownership checkpoint is attached to this v1 journey row.</p></article>`;

  els.journeyProducts.innerHTML = `
    <article class="journey-card">
      <header class="journey-card-header">
        <div>
          <p class="eyebrow">${escapeHtml(selected.category || "Product")}</p>
          <h3>${escapeHtml(selected.displayName || selected.canonicalName)}</h3>
          <p>${escapeHtml(selected.trendSummary || "")}</p>
        </div>
        <div class="journey-score">
          <strong>${formatNumber(selected.photoEvidenceRows)}</strong>
          <span>photo rows</span>
        </div>
      </header>
      <div class="ingredient-tags prominent">${renderIngredientTags(selected.ingredientThemes, 10)}</div>
      <section class="ownership-list" aria-label="Ownership milestones">
        ${ownership}
      </section>
      <section class="journey-stage-grid" aria-label="Ingredient evidence timeline">
        ${selected.timeline.map(renderJourneyEra).join("")}
      </section>
    </article>
    ${renderJourneyOverview(products, selected.canonicalName)}
  `;
}

function renderStatus() {
  const generated = state.data.generated_at_utc ? new Date(state.data.generated_at_utc).toLocaleString() : "unknown";
  els.status.innerHTML = `
    <strong>Snapshot loaded</strong>
    <span>${formatNumber(state.data.metrics.acquisition_rows)} acquisition rows from ${escapeHtml(state.data.source_run)} · generated ${escapeHtml(generated)}</span>
  `;
}

function render() {
  renderMetrics();
  renderLegend();
  renderProducts();
  renderSourceBars();
  renderQueue();
  renderPhotos();
  renderSweeps();
  renderJourney();
  renderStatus();
}

function attachEvents() {
  els.search.addEventListener("input", () => {
    state.search = els.search.value;
    render();
  });
  els.category.addEventListener("change", () => {
    state.category = els.category.value;
    render();
  });
  els.surface.addEventListener("change", () => {
    state.surface = els.surface.value;
    render();
  });
  els.statusFilter.addEventListener("change", () => {
    state.status = els.statusFilter.value;
    render();
  });
  if (els.journeyProduct) {
    els.journeyProduct.addEventListener("change", () => {
      state.selectedJourneyProduct = els.journeyProduct.value;
      renderJourney();
    });
  }
}

async function init() {
  try {
    const [response, journeyResponse] = await Promise.all([
      fetch("../data/product-evidence/summary.json"),
      fetch("../data/product-evidence/ingredient-journey.json").catch(() => null),
    ]);
    if (!response.ok) throw new Error(`Snapshot returned ${response.status}`);
    state.data = await response.json();
    state.journey = journeyResponse?.ok ? await journeyResponse.json() : null;
    renderFilters();
    attachEvents();
    render();
  } catch (error) {
    els.status.innerHTML = `<strong>Could not load snapshot</strong><span>${escapeHtml(error.message)}</span>`;
  }
}

init();
