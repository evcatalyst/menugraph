const els = {
  productSelect: document.querySelector("#product-select"),
  productSearch: document.querySelector("#product-search"),
  productStrip: document.querySelector("#product-strip"),
  timeRange: document.querySelector("#time-range"),
  compareToggle: document.querySelector("#compare-toggle"),
  status: document.querySelector("#journey-status"),
  productSummary: document.querySelector("#product-summary"),
  storyReadiness: document.querySelector("#story-readiness"),
  storyHero: document.querySelector("#story-hero"),
  proofReader: document.querySelector("#proof-reader"),
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
};

const state = {
  data: null,
  productId: "",
  versionId: "",
  facetId: "",
  proofFilter: "all",
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

function statusBadge(status) {
  return `<span class="status-badge status-${escapeHtml(status || "unknown")}">${escapeHtml(labelFor(status || "unknown"))}</span>`;
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
    .map((row) => `<option value="${escapeHtml(row.id)}" ${row.id === state.productId ? "selected" : ""} ${row.status !== "loaded" ? "disabled" : ""}>${escapeHtml(row.label)}${row.scope === "full_corpus_shell" ? " (corpus)" : ""}</option>`)
    .join("");
  els.productStrip.innerHTML = rows
    .map((row) => `
      <button class="product-card ${row.id === state.productId ? "is-selected" : ""}" type="button" data-product-id="${escapeHtml(row.id)}" ${row.status !== "loaded" ? "disabled" : ""}>
        <strong>${escapeHtml(row.label)}</strong>
        <span>${escapeHtml(row.scope === "story_rich_pilot" ? "Story-rich pilot" : "Full-corpus proof shell")}</span>
      </button>
    `)
    .join("");
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
  const columns = `repeat(${Math.max(1, versions.length)}, minmax(0, 1fr))`;
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

function proofSourceUrl(row) {
  return row?.source_photo_url || row?.url || row?.source_url || row?.archive_url || "";
}

function proofImageUrl(row) {
  return row?.public_image_url || row?.thumbnail_url || row?.image_url || row?.image_path_or_url || row?.package_image_url || row?.screenshot_image_path || "";
}

function rightsNote(row) {
  return row?.rights_status || row?.rights || row?.license_rights_note || "External source; rights note needed before reproducing imagery.";
}

function canEmbedProofImage(row) {
  const image = proofImageUrl(row);
  if (!image) return false;
  if (row?.image_display_policy) return row.image_display_policy === "embed_rights_cleared";
  const rights = rightsNote(row).toLowerCase();
  const source = `${row?.source || ""} ${row?.url || ""}`.toLowerCase();
  const clearLicense = /public domain|cc[- ]?by|creative commons|wikimedia commons|owned image|rights cleared/.test(rights);
  const blocked = /inspect license|rights note needed|before reuse|external source|collector photo/.test(rights);
  return clearLicense && !blocked && !/flickr\.com/.test(source);
}

function bestProofEvidence(productRow, version) {
  const evidenceRows = versionEvidence(productRow, version);
  const ranked = [...evidenceRows].sort((a, b) => {
    const rank = (row) => (
      (row.visible_extract ? 40 : 0) +
      (/ingredient|label/i.test(`${row.label_panel_state || ""} ${row.photo_role || ""}`) ? 25 : 0) +
      (proofImageUrl(row) ? 15 : 0) +
      (proofSourceUrl(row) ? 10 : 0) +
      (row.status === "manual_verified" ? 10 : row.status === "label_text_candidate" ? 8 : row.status === "usable_photo" ? 5 : 0)
    );
    return rank(b) - rank(a);
  });
  return ranked[0] || {};
}

function proofExtractFor(version, row) {
  return version.label_extract || row.visible_extract || null;
}

function versionHasPhotoProof(productRow, version) {
  return versionEvidence(productRow, version).some((row) => proofSourceUrl(row) || proofImageUrl(row))
    || Number(version.source_count || 0) > 0;
}

function versionHasIngredientProof(productRow, version) {
  return Boolean(proofExtractFor(version, bestProofEvidence(productRow, version)))
    || /label|transcription|manual_verified|text_candidate/.test(String(version.status || ""));
}

function proofFilteredVersions(productRow) {
  const versions = visibleVersions(productRow);
  const filtered = versions.filter((version) => {
    if (state.proofFilter === "photo") return versionHasPhotoProof(productRow, version);
    if (state.proofFilter === "ingredient") return versionHasIngredientProof(productRow, version);
    if (state.proofFilter === "verified") return version.status === "manual_verified" || version.validation_state?.state === "manual_verified";
    return true;
  });
  return filtered.length ? filtered : versions;
}

function renderProofVisual(productRow, version, row) {
  const image = proofImageUrl(row);
  const source = proofSourceUrl(row);
  const embedImage = canEmbedProofImage(row);
  const title = row.title || `${version.label} photo proof`;
  if (embedImage) {
    return `
      <figure class="proof-photo">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(`${productRow.name} ${version.label} source photo proof`)}" loading="lazy" />
        <figcaption>${escapeHtml(row.source || "Source image")} · ${escapeHtml(rightsNote(row))}</figcaption>
      </figure>
    `;
  }
  return `
    <div class="proof-photo proof-photo-receipt status-${escapeHtml(row.status || version.status || "unknown")}">
      <span>${escapeHtml(row.kind || "source receipt")}</span>
      <strong>${escapeHtml(title || "Photo proof needed")}</strong>
      <p>${escapeHtml(row.image_display_policy === "embed_rights_cleared" ? "Rights-cleared image is ready to display." : image ? "Image reference is present, but this page keeps it link-only until rights are reviewed." : "Photo proof is source-attributed, but no rights-cleared embeddable image URL is stored yet.")}</p>
      <dl>
        <div>
          <dt>Photo role</dt>
          <dd>${escapeHtml(row.photo_role || version.photo_quality?.role || "not classified")}</dd>
        </div>
        <div>
          <dt>Panel state</dt>
          <dd>${escapeHtml(row.label_panel_state || version.photo_quality?.label_panel || "not reviewed")}</dd>
        </div>
        <div>
          <dt>Rights</dt>
          <dd>${escapeHtml(rightsNote(row))}</dd>
        </div>
        <div>
          <dt>Display policy</dt>
          <dd>${escapeHtml(row.image_display_policy || "source_link_only_no_public_image")}</dd>
        </div>
      </dl>
      ${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noreferrer">Open source photo/document</a>` : ""}
    </div>
  `;
}

function renderProofIngredients(version, row) {
  const extract = proofExtractFor(version, row);
  if (extract) {
    return `
      <section class="proof-ingredients">
        <span>${escapeHtml(extract.status || version.status || "ingredient candidate")}</span>
        <h3>Visible ingredient text</h3>
        ${renderLabelExtract(extract)}
      </section>
    `;
  }
  if (version.gap_resolution) {
    return `
      <section class="proof-ingredients proof-gap">
        <span>${escapeHtml(version.gap_resolution.state || "gap_publishable")}</span>
        <h3>No ingredient label published</h3>
        <p>${escapeHtml(version.gap_resolution.can_say || version.ingredient_summary)}</p>
        <p><strong>Cannot say:</strong> ${escapeHtml(version.gap_resolution.cannot_say || "Do not publish ingredient changes without verified label text.")}</p>
      </section>
    `;
  }
  return `
    <section class="proof-ingredients proof-gap">
      <span>${escapeHtml(version.status || "needs_label_transcription")}</span>
      <h3>Ingredient text not ready</h3>
      <p>${escapeHtml(version.photo_quality?.blocker || version.next_step || "Readable label text needs OCR/manual transcription before publication.")}</p>
    </section>
  `;
}

function renderProofCard(productRow, version, modeLabel) {
  const row = bestProofEvidence(productRow, version);
  const source = proofSourceUrl(row);
  const extract = proofExtractFor(version, row);
  return `
    <article class="proof-card status-${escapeHtml(version.status || "unknown")}">
      <header class="proof-card-head">
        <div>
          <span>${escapeHtml(modeLabel)}</span>
          <h3>${escapeHtml(`${version.year} · ${version.label}`)}</h3>
          <p>${escapeHtml(version.headline || version.ingredient_summary)}</p>
        </div>
        <div class="proof-status-stack">
          ${statusBadge(version.status)}
          ${statusBadge(extract ? "needs_manual_verification" : version.gap_resolution ? "gap_publishable" : "needs_label_transcription")}
        </div>
      </header>
      <div class="proof-card-body">
        ${renderProofVisual(productRow, version, row)}
        ${renderProofIngredients(version, row)}
      </div>
      <footer class="proof-card-foot">
        <span>${escapeHtml(version.validation_state?.public_label || labelFor(version.status))}</span>
        <p>${escapeHtml(version.validation_state?.note || "Candidate evidence remains separate from verified formulation claims.")}</p>
        <div class="lead-meta">
          <span class="source-chip">${escapeHtml(`${version.source_count || version.evidence_ids?.length || 0} sources`)}</span>
          ${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noreferrer">${escapeHtml(row.source || "Source")}</a>` : ""}
        </div>
      </footer>
    </article>
  `;
}

function renderProofReader(productRow, version) {
  if (!els.proofReader) return;
  const versions = proofFilteredVersions(productRow);
  const displayVersion = versions.some((row) => row.id === version.id) ? version : versions[0] || version;
  const current = productRow.versions.find((row) => row.vintage === "current_2020s") || versions[versions.length - 1] || displayVersion;
  const cards = state.compare && current.id !== displayVersion.id
    ? [
      { version: displayVersion, label: "Selected era" },
      { version: current, label: "Current anchor" },
    ]
    : [{ version: displayVersion, label: "Selected era" }];
  const filterRows = [
    ["all", "All eras"],
    ["photo", "Photo-backed"],
    ["ingredient", "Ingredient-backed"],
    ["verified", "Verified only"],
  ];
  els.proofReader.innerHTML = `
    <header class="proof-reader-head">
      <div>
        <p class="eyebrow">Recipe History Proof</p>
        <h2>Photo/source proof next to ingredient text</h2>
        <p>Toggle an era to inspect the source-attributed photo or document receipt beside the ingredient extract. Rights-unclear images stay link-only; candidate text stays candidate until manual verification.</p>
      </div>
      <aside class="proof-disclaimer">
        <strong>Publication note</strong>
        <p>This page is not legal advice. It cites source pages and avoids reproducing external package photos unless rights are recorded as clear. Ingredient extracts are evidence candidates, not verified formulation claims.</p>
      </aside>
    </header>
    <div class="proof-era-toggle" aria-label="Recipe history era toggle">
      ${versions.map((row) => `
        <button type="button" data-version-id="${escapeHtml(row.id)}" class="${row.id === displayVersion.id ? "is-selected" : ""}">
          <span>${escapeHtml(row.year)}</span>
          <strong>${escapeHtml(row.label)}</strong>
        </button>
      `).join("")}
    </div>
    <div class="proof-filter-toggle" aria-label="Proof filter controls">
      ${filterRows.map(([key, label]) => `
        <button type="button" data-proof-filter="${escapeHtml(key)}" class="${state.proofFilter === key ? "is-selected" : ""}">
          ${escapeHtml(label)}
        </button>
      `).join("")}
    </div>
    <div class="proof-card-grid ${state.compare && cards.length > 1 ? "is-compare" : ""}">
      ${cards.map((card) => renderProofCard(productRow, card.version, card.label)).join("")}
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
  renderStatus(productRow);
  renderSummary(productRow);
  renderStoryReadiness(productRow);
  renderHero(productRow);
  renderProofReader(productRow, version);
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
  els.timelineTrack.addEventListener("click", (event) => {
    const button = event.target.closest("[data-version-id]");
    if (!button) return;
    state.versionId = button.dataset.versionId;
    render();
  });
  els.proofReader.addEventListener("click", (event) => {
    const filterButton = event.target.closest("[data-proof-filter]");
    if (filterButton) {
      state.proofFilter = filterButton.dataset.proofFilter || "all";
      render();
      return;
    }
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
    render();
  });
}

async function init() {
  try {
    const response = await fetch("../data/product-evidence/navigator_data.json");
    if (!response.ok) throw new Error(`Navigator data returned ${response.status}`);
    state.data = await response.json();
    state.productId = state.data.default_product;
    state.maxYear = Number(els.timeRange.value || 2026);
    attachEvents();
    render();
  } catch (error) {
    els.status.innerHTML = `<strong>Could not load navigator data</strong><span>${escapeHtml(error.message)}</span>`;
  }
}

init();
