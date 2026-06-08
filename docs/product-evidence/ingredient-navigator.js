const els = {
  productSelect: document.querySelector("#product-select"),
  productSearch: document.querySelector("#product-search"),
  corpusMode: document.querySelector("#corpus-mode"),
  productStrip: document.querySelector("#product-strip"),
  corpusHandoff: document.querySelector("#corpus-handoff"),
  corpusDirectory: document.querySelector("#corpus-directory"),
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

const DATA_VERSION = new URLSearchParams(window.location.search).get("v") || "panel-capture-batches";

const state = {
  data: null,
  summary: null,
  photoProofManifest: null,
  photoProofImagesByEvidenceId: new Map(),
  productId: "",
  versionId: "",
  facetId: "",
  proofFilter: "all",
  corpusMode: "full",
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

function dataHref(path) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${encodeURIComponent(DATA_VERSION)}`;
}

function labelFor(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function navigatorArtifactHref(value) {
  const text = String(value || "");
  if (!text) return "";
  return text
    .replace(/^docs\/data\//, "../data/")
    .replace(/^docs\/product-evidence\//, "./");
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

function productById(id) {
  return state.data.products.find((row) => row.id === id);
}

function versionEvidence(productRow, version) {
  const ids = new Set(version.evidence_ids || []);
  return productRow.evidence.filter((row) => ids.has(row.id));
}

function visibleVersions(productRow) {
  return productRow.versions.filter((row) => Number(row.year) <= Number(state.maxYear || 2026));
}

function productNeedsPhotoCapture(productRow) {
  const summary = productRow?.ingredient_ocr_summary || {};
  return Number(summary.source_page_capture_needed_count || 0) > 0
    || Number(summary.source_discovery_needed_count || 0) > 0
    || (productRow?.evidence || []).some((row) => proofSourceUrl(row) && !canEmbedProofImage(row));
}

function productNeedsOcr(productRow) {
  const summary = productRow?.ingredient_ocr_summary || {};
  return Number(summary.label_visible_count || 0) > 0
    || (productRow?.versions || []).some((row) => /label_visible|usable_photo|source_review/.test(String(row.status || "")));
}

function productReviewReady(productRow) {
  const summary = productRow?.ingredient_ocr_summary || {};
  return Number(summary.ingredient_text_candidate_count || 0) > 0
    || Number(productRow?.label_text_candidates || 0) > 0
    || (productRow?.evidence || []).some((row) => row.visible_extract);
}

function publicPhotoRowsForProduct(productRow) {
  const productId = productRow?.id || "";
  const rows = (state.photoProofManifest?.published_images || [])
    .filter((row) => row.product_id === productId && row.image_display_policy === "embed_rights_cleared");
  const seen = new Set();
  return rows.filter((row) => {
    const key = row.evidence_id || row.public_image_url || row.thumbnail_url || row.source_url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function allPublicPhotoRows() {
  const productNames = new Map((state.data?.products || []).map((row) => [row.id, row.name]));
  return (state.photoProofManifest?.published_images || [])
    .filter((row) => row.image_display_policy === "embed_rights_cleared" && (row.public_image_url || row.thumbnail_url))
    .map((row) => {
      const productRow = productById(row.product_id);
      const evidenceRow = (productRow?.evidence || []).find((evidence) => evidence.id === row.evidence_id) || {};
      const proofLane = isIngredientPanelProof(evidenceRow) ? "primary_ingredient_panel" : "secondary_product_context";
      return {
        ...row,
        proof_lane: proofLane,
        product_name: row.product_name || productNames.get(row.product_id) || row.product_id || "Product photo proof",
      };
    });
}

function productHasPublicPhoto(productRow) {
  return publicPhotoRowsForProduct(productRow).length > 0;
}

function corpusModeDefinitions() {
  return [
    {
      id: "full",
      label: "Full Corpus",
      detail: "All 120 product shells",
      matches: () => true,
    },
    {
      id: "pilot",
      label: "Story Pilot",
      detail: "10 stitched narratives",
      matches: (productRow) => productRow?.corpus_scope === "story_rich_pilot",
    },
    {
      id: "public_photos",
      label: "Photo Worklist",
      detail: "Panel-first, context second",
      matches: productHasPublicPhoto,
    },
    {
      id: "needs_photo",
      label: "Needs Photo",
      detail: "Capture/source review lanes",
      matches: productNeedsPhotoCapture,
    },
    {
      id: "needs_ocr",
      label: "Needs OCR",
      detail: "Readable-panel or document-text leads",
      matches: productNeedsOcr,
    },
    {
      id: "review_ready",
      label: "Review Ready",
      detail: "Candidate text exists",
      matches: productReviewReady,
    },
  ];
}

function productRowsForMode(mode = state.corpusMode) {
  const definition = corpusModeDefinitions().find((row) => row.id === mode) || corpusModeDefinitions()[0];
  return (state.data.product_index || []).filter((row) => definition.matches(productById(row.id)));
}

function searchedProductRows(rows) {
  const search = state.search.trim().toLowerCase();
  if (!search) return rows;
  return rows.filter((row) => `${row.label} ${row.id}`.toLowerCase().includes(search));
}

function renderCorpusMode() {
  if (!els.corpusMode) return;
  const allRows = state.data.product_index || [];
  const definitions = corpusModeDefinitions();
  els.corpusMode.innerHTML = definitions
    .map((definition) => {
      const count = allRows.filter((row) => definition.matches(productById(row.id))).length;
      return `
        <button type="button" data-corpus-mode="${escapeHtml(definition.id)}" class="${definition.id === state.corpusMode ? "is-selected" : ""}">
          <span>${escapeHtml(definition.label)}</span>
          <strong>${escapeHtml(count)}</strong>
          <em>${escapeHtml(definition.detail)}</em>
        </button>
      `;
    })
    .join("");
}

function renderProductPicker() {
  const modeRows = productRowsForMode();
  const rows = searchedProductRows(modeRows);
  const allRows = state.data.product_index || [];
  const storyRich = allRows.filter((row) => row.scope === "story_rich_pilot").length;
  const proofShells = Math.max(0, allRows.length - storyRich);
  const searchLabel = state.search.trim()
    ? `${rows.length} matching products`
    : `${modeRows.length} products in view`;
  const modeLabel = corpusModeDefinitions().find((row) => row.id === state.corpusMode)?.label || "Full Corpus";
  renderCorpusMode();
  els.productSelect.innerHTML = rows
    .map((row) => `<option value="${escapeHtml(row.id)}" ${row.id === state.productId ? "selected" : ""} ${row.status !== "loaded" ? "disabled" : ""}>${escapeHtml(row.label)}${row.scope === "full_corpus_shell" ? " (corpus)" : ""}</option>`)
    .join("");
  els.productStrip.className = `product-strip mode-${escapeHtml(state.corpusMode)}`;
  els.productStrip.innerHTML = `
    <article class="product-strip-summary" aria-label="Corpus selector summary">
      <span>${escapeHtml(searchLabel)}</span>
      <strong>${escapeHtml(`${allRows.length}-product corpus loaded`)}</strong>
      <p>${escapeHtml(`${modeLabel} is showing ${rows.length} products. The first 10 are stitched pilots; the remaining ${proofShells} are source-linked proof shells for photo/OCR work.`)}</p>
      <div class="product-strip-ledger" aria-label="Corpus counts">
        <span><strong>${escapeHtml(allRows.length)}</strong>All products</span>
        <span><strong>${escapeHtml(storyRich)}</strong>Story pilots</span>
        <span><strong>${escapeHtml(proofShells)}</strong>Proof shells</span>
        <span><strong>${escapeHtml(rows.length)}</strong>Shown now</span>
      </div>
    </article>
    ${rows
    .map((row) => `
      <button class="product-card ${row.id === state.productId ? "is-selected" : ""}" type="button" data-product-id="${escapeHtml(row.id)}" ${row.status !== "loaded" ? "disabled" : ""}>
        <strong>${escapeHtml(row.label)}</strong>
        <span>${escapeHtml(row.scope === "story_rich_pilot" ? "Story-rich pilot" : "Full-corpus proof shell")} · ${escapeHtml(row.source_backed_slots || 0)}/${escapeHtml(row.total_slots || 6)} source slots</span>
      </button>
    `)
    .join("")}
  `;
}

function corpusHandoffStats() {
  const products = state.data.products || [];
  const indexRows = state.data.product_index || [];
  const evidenceRows = products.flatMap((row) => row.evidence || []);
  const versionRows = products.flatMap((row) => row.versions || []);
  const storyRich = indexRows.filter((row) => row.scope === "story_rich_pilot").length;
  const proofShells = Math.max(0, products.length - storyRich);
  const sourceLinkedEvidence = evidenceRows.filter((row) => proofSourceUrl(row)).length;
  const embedReadyEvidence = evidenceRows.filter((row) => canEmbedProofImage(row)).length;
  const candidateExtracts = evidenceRows.filter((row) => row.visible_extract).length
    + versionRows.filter((row) => row.label_extract).length;
  const sourceLinkOnly = evidenceRows.filter((row) => (
    row.image_display_policy === "source_link_only_no_public_image"
    || (proofSourceUrl(row) && !canEmbedProofImage(row))
  )).length;
  return {
    productCount: products.length,
    storyRich,
    proofShells,
    sourceLinkedEvidence,
    embedReadyEvidence,
    candidateExtracts,
    sourceLinkOnly,
  };
}

function corpusIngredientPanelProofStats() {
  const rows = (state.data.products || []).flatMap((productRow) => (
    ingredientPanelProofRows(productRow).map((row) => ({ productRow, row }))
  ));
  return {
    rows: rows.length,
    products: new Set(rows.map((entry) => entry.productRow.id)).size,
    publicEmbeds: rows.filter((entry) => canEmbedProofImage(entry.row)).length,
    linkOnly: rows.filter((entry) => proofSourceUrl(entry.row) && !canEmbedProofImage(entry.row)).length,
    candidateText: rows.filter((entry) => entry.row.visible_extract).length,
  };
}

function productPublicEmbedCount(productRow) {
  const evidenceIds = new Set(publicPhotoRowsForProduct(productRow).map((row) => row.evidence_id).filter(Boolean));
  for (const row of productRow?.evidence || []) {
    if (canEmbedProofImage(row)) evidenceIds.add(row.id);
  }
  return evidenceIds.size;
}

function productCandidateTextCount(productRow) {
  return (productRow?.evidence || []).filter((row) => row.visible_extract).length
    + (productRow?.versions || []).filter((row) => row.label_extract).length;
}

function productPanelProofCount(productRow) {
  return ingredientPanelProofRows(productRow).length;
}

function productPanelEmbedCount(productRow) {
  return ingredientPanelProofRows(productRow).filter((row) => canEmbedProofImage(row)).length;
}

function renderCorpusDirectory() {
  if (!els.corpusDirectory) return;
  const modeRows = productRowsForMode();
  const rows = searchedProductRows(modeRows);
  const modeLabel = corpusModeDefinitions().find((row) => row.id === state.corpusMode)?.label || "Full Corpus";
  const publicEmbeds = rows.reduce((sum, row) => sum + productPublicEmbedCount(productById(row.id)), 0);
  const panelLeads = rows.reduce((sum, row) => sum + productPanelProofCount(productById(row.id)), 0);
  const panelEmbeds = rows.reduce((sum, row) => sum + productPanelEmbedCount(productById(row.id)), 0);
  const candidateTexts = rows.reduce((sum, row) => sum + productCandidateTextCount(productById(row.id)), 0);
  const sourceSlots = rows.reduce((sum, row) => sum + Number(row.source_backed_slots || 0), 0);
  els.corpusDirectory.innerHTML = `
    <header class="corpus-directory-head">
      <div>
        <span>All Product Story Directory</span>
        <strong>${escapeHtml(`${rows.length} products shown from ${modeLabel}`)}</strong>
        <p>Use this as the working map for the corpus. Ingredient-panel leads are the recipe-history target; product/package images are secondary context unless the label panel is readable.</p>
      </div>
      <dl>
        <div>
          <dt>Total corpus</dt>
          <dd>${escapeHtml((state.data.product_index || []).length)}</dd>
        </div>
        <div>
          <dt>Source slots</dt>
          <dd>${escapeHtml(sourceSlots)}</dd>
        </div>
        <div>
          <dt>Panel leads</dt>
          <dd>${escapeHtml(panelLeads)}</dd>
        </div>
        <div>
          <dt>Panel embeds</dt>
          <dd>${escapeHtml(panelEmbeds)}</dd>
        </div>
        <div>
          <dt>Text candidates</dt>
          <dd>${escapeHtml(candidateTexts)}</dd>
        </div>
      </dl>
    </header>
    <div class="corpus-directory-grid">
      ${rows.map((row, index) => {
        const productRow = productById(row.id);
        const embedCount = productPublicEmbedCount(productRow);
        const panelCount = productPanelProofCount(productRow);
        const panelEmbedCount = productPanelEmbedCount(productRow);
        const textCount = productCandidateTextCount(productRow);
        return `
          <button type="button" class="corpus-directory-card ${row.id === state.productId ? "is-selected" : ""}" data-product-id="${escapeHtml(row.id)}">
            <span>${escapeHtml(String(index + 1).padStart(2, "0"))}</span>
            <strong>${escapeHtml(row.label)}</strong>
            <em>${escapeHtml(productRow?.category || row.scope || "product")}</em>
            <small>${escapeHtml(row.scope === "story_rich_pilot" ? "Story pilot" : "Proof shell")} · ${escapeHtml(row.source_backed_slots || 0)}/${escapeHtml(row.total_slots || 6)} source slots</small>
            <b>${escapeHtml(panelCount)} panel leads · ${escapeHtml(panelEmbedCount)} panel embeds</b>
            <small>${escapeHtml(embedCount)} secondary/photo embeds · ${escapeHtml(textCount)} text extracts</small>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function captureTaskSummary() {
  const summary = state.summary || {};
  return summary.pilot_capture_task_summary
    || summary.pilot_capture_pipeline_summary?.capture_task_summary
    || summary.hybrid_ocr_capture_task_summary
    || summary.hybrid_ocr_pipeline_summary?.capture_task_summary
    || {};
}

function renderCaptureTaskPreview(taskSummary = {}) {
  const tasks = taskSummary.first_tasks || [];
  if (!tasks.length) return "";
  return `
    <article class="corpus-handoff-card capture-task-handoff">
      <span>First Photo Capture Tasks</span>
      <strong>${escapeHtml(taskSummary.task_count || tasks.length)} queued source/crop tasks</strong>
      <p>These are public-safe source receipts, not published photos. Open a source, capture a private panel crop, then run OCR before any image or ingredient text can be promoted.</p>
      <div class="capture-task-list">
        ${tasks.slice(0, 6).map((task) => `
          <article class="capture-task-card">
            <div>
              <span>${escapeHtml(`${task.rank || ""}. ${task.vintage_label || "vintage"}`)}</span>
              <strong>${escapeHtml(task.product_name || "Product capture task")}</strong>
              <p>${escapeHtml(task.crop_target || task.next_action || "Capture a readable panel crop.")}</p>
            </div>
            <div class="lead-meta">
              <span class="source-chip">${escapeHtml(task.source_url ? sourceHost(task.source_url) : task.source_domain || "source")}</span>
              ${task.source_url ? `<a href="${escapeHtml(task.source_url)}" target="_blank" rel="noreferrer">Open source</a>` : ""}
            </div>
          </article>
        `).join("")}
      </div>
    </article>
  `;
}

function renderPublicPhotoProofStrip() {
  const rows = allPublicPhotoRows();
  if (!rows.length) return "";
  const panelRows = rows.filter((row) => row.proof_lane === "primary_ingredient_panel");
  const secondaryRows = rows.filter((row) => row.proof_lane !== "primary_ingredient_panel");
  const previewRows = [...panelRows, ...secondaryRows].slice(0, 12);
  return `
    <article class="corpus-handoff-card public-photo-strip-card">
      <header class="public-photo-strip-head">
        <div>
          <span>Photo Proof Priority</span>
          <strong>${escapeHtml(`${panelRows.length} ingredient-panel images/documents · ${secondaryRows.length} secondary product images`)}</strong>
          <p>Ingredient or nutrition panels are the primary visual proof. Product/package photos are shown after panel leads and exist to identify era, SKU, format, or maker context.</p>
        </div>
        <button type="button" data-corpus-mode-jump="public_photos">Show photo worklist</button>
      </header>
      <div class="public-photo-strip" aria-label="Panel-first photo proof examples">
        ${previewRows.map((row) => {
          const image = row.thumbnail_url || row.public_image_url;
          return `
            <article class="public-photo-card ${row.proof_lane === "primary_ingredient_panel" ? "is-primary-panel" : "is-secondary-context"}">
              <button type="button" data-product-id="${escapeHtml(row.product_id || "")}">
                <img src="${escapeHtml(image)}" alt="${escapeHtml(`${row.product_name} public photo proof`)}" loading="lazy" />
                <span>${escapeHtml(row.proof_lane === "primary_ingredient_panel" ? "Primary ingredient/document proof" : "Secondary product context")}</span>
                <strong>${escapeHtml(row.evidence_title || row.source_title || "Public photo proof")}</strong>
              </button>
              <p>${escapeHtml(row.attribution_text || row.source_owner || "Attribution recorded in manifest.")}</p>
              <div class="lead-meta">
                <span class="source-chip">${escapeHtml(row.rights_status || "rights recorded")}</span>
                ${row.source_url ? `<a href="${escapeHtml(row.source_url)}" target="_blank" rel="noreferrer">${escapeHtml(sourceHost(row.source_url))}</a>` : ""}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </article>
  `;
}

function renderPublicPhotoOcrStatus() {
  const summary = state.summary?.public_photo_ocr_summary || state.data?.public_photo_ocr_summary || {};
  if (!summary.queue_rows) return "";
  const capture = summary.capture || {};
  const ocr = summary.ocr || {};
  const artifacts = summary.public_artifacts || {};
  const candidates = summary.candidate_extracts || state.summary?.public_photo_ocr_candidate_extract_summary || {};
  const candidateArtifacts = candidates.public_artifacts || {};
  const blocker = Number(ocr.vision_runtime_nil_error || 0)
    ? `${ocr.vision_runtime_nil_error} Vision runtime nilError rows`
    : Number(ocr.vision_pixel_buffer_failure || 0)
      ? `${ocr.vision_pixel_buffer_failure} Vision pixel-buffer rows`
      : Number(ocr.no_private_image_map_entry || 0)
        ? `${ocr.no_private_image_map_entry} missing image-map rows`
        : "No OCR blocker recorded";
  return `
    <article class="corpus-handoff-card public-ocr-status-card status-needs_manual_verification">
      <span>Public Photo OCR Run</span>
      <strong>${escapeHtml(`${summary.primary_ingredient_panel_rows || 0} primary panel rows · ${summary.secondary_product_context_rows || 0} secondary context rows`)}</strong>
      <p>Rights-cleared public images were captured privately. Primary OCR text is shown only as candidate review text, never as verified formulation claims. Current blocker: ${escapeHtml(blocker)}.</p>
      <dl>
        <div>
          <dt>Captured</dt>
          <dd>${escapeHtml(`${capture.ready_for_ocr || 0}/${summary.queue_rows || 0}`)}</dd>
        </div>
        <div>
          <dt>Primary ready</dt>
          <dd>${escapeHtml(capture.primary_ready_for_ocr || 0)}</dd>
        </div>
        <div>
          <dt>OCR succeeded</dt>
          <dd>${escapeHtml(ocr.ocr_succeeded || 0)}</dd>
        </div>
        <div>
          <dt>Candidates</dt>
          <dd>${escapeHtml(candidates.accepted_candidate_count || 0)}</dd>
        </div>
      </dl>
      <div class="corpus-handoff-links">
        ${artifacts.queue_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.queue_csv))}">Queue CSV</a>` : ""}
        ${artifacts.capture_summary_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.capture_summary_csv))}">Capture CSV</a>` : ""}
        ${artifacts.ocr_summary_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.ocr_summary_csv))}">OCR CSV</a>` : ""}
        ${candidateArtifacts.candidate_extracts_csv ? `<a href="${escapeHtml(navigatorArtifactHref(candidateArtifacts.candidate_extracts_csv))}">Candidate Text CSV</a>` : ""}
        ${artifacts.runbook_md ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.runbook_md))}">Runbook</a>` : ""}
      </div>
    </article>
  `;
}

function renderIngredientPanelAcquisitionStatus() {
  const summary = state.summary?.ingredient_panel_acquisition_summary || {};
  const totals = summary.totals || {};
  if (!totals.slots) return "";
  const artifacts = summary.artifacts || {};
  const targets = summary.top_slot_targets || [];
  return `
    <article class="corpus-handoff-card panel-acquisition-card status-needs_photo_review">
      <span>Ingredient Panel Acquisition Board</span>
      <strong>${escapeHtml(`${totals.public_panel_embed_slots || 0} public primary slots · ${totals.needs_panel_acquisition_slots || 0} acquisition slots`)}</strong>
      <p>${escapeHtml(summary.public_policy?.primary_rule || "Ingredient/nutrition/document panels are the primary proof target; product photos stay secondary unless a readable panel is visible.")}</p>
      <dl>
        <div>
          <dt>Vintage slots</dt>
          <dd>${escapeHtml(totals.slots || 0)}</dd>
        </div>
        <div>
          <dt>Missing panels</dt>
          <dd>${escapeHtml(totals.missing_primary_panel_slots || 0)}</dd>
        </div>
        <div>
          <dt>Pilot targets</dt>
          <dd>${escapeHtml(totals.pilot_needs_panel_acquisition_slots || 0)}</dd>
        </div>
      </dl>
      <div class="panel-acquisition-list" aria-label="Top ingredient panel acquisition targets">
        ${targets.slice(0, 4).map((target) => `
          <article class="panel-acquisition-target">
            <span>${escapeHtml(target.panel_acquisition_state || "panel target")}</span>
            <strong>${escapeHtml(target.product_name || "Product")}</strong>
            <p>${escapeHtml(`${target.version_label || target.vintage || "Vintage slot"} · ${target.top_source_domain || "source hunt"}`)}</p>
            <em>${escapeHtml(target.next_action || "Find a readable ingredient or nutrition panel.")}</em>
          </article>
        `).join("")}
      </div>
      <div class="corpus-handoff-links">
        ${artifacts.slot_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.slot_csv))}">Slot CSV</a>` : ""}
        ${artifacts.product_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.product_csv))}">Product CSV</a>` : ""}
        ${artifacts.report_markdown ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.report_markdown))}">Report</a>` : ""}
        ${artifacts.board_json ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.board_json))}">Board JSON</a>` : ""}
      </div>
    </article>
  `;
}

function renderPanelCaptureBatchStatus() {
  const summary = state.summary?.panel_capture_batch_summary || {};
  const totals = summary.totals || {};
  if (!totals.selected_rows) return "";
  const artifacts = summary.artifacts || {};
  const batches = summary.first_batches || [];
  const rows = summary.first_rows || [];
  return `
    <article class="corpus-handoff-card panel-capture-card status-source_review">
      <span>Panel Capture / OCR Batch</span>
      <strong>${escapeHtml(`${totals.selected_rows || 0} panel-first tasks · ${totals.batch_count || 0} capture batches`)}</strong>
      <p>Next run prioritizes ingredient, nutrition, allergen, SmartLabel, and disclosure panels. Product/front photos stay secondary unless they expose readable label text.</p>
      <dl>
        <div>
          <dt>Pilot rows</dt>
          <dd>${escapeHtml(totals.story_rich_pilot_rows || 0)}</dd>
        </div>
        <div>
          <dt>High priority</dt>
          <dd>${escapeHtml(totals.high_priority_rows || 0)}</dd>
        </div>
        <div>
          <dt>Panel crops</dt>
          <dd>${escapeHtml(totals.panel_capture_rows || 0)}</dd>
        </div>
        <div>
          <dt>Context-only</dt>
          <dd>${escapeHtml(totals.readable_panel_photo_rows || 0)}</dd>
        </div>
      </dl>
      <div class="panel-capture-list" aria-label="Panel capture batch preview">
        ${batches.slice(0, 3).map((batch) => `
          <article class="panel-acquisition-target panel-capture-target">
            <span>${escapeHtml(`Batch ${batch.batch_rank || "?"} · ${batch.ocr_gap_category || "panel task"}`)}</span>
            <strong>${escapeHtml(`${batch.row_count || 0} rows · ${batch.source_domain || "mixed sources"}`)}</strong>
            <p>${escapeHtml(batch.product_names || "Products queued")}</p>
            <em>${escapeHtml(batch.capture_goal || "Capture private panel/document crops, then run OCR.")}</em>
          </article>
        `).join("")}
      </div>
      <div class="panel-capture-row-strip" aria-label="First panel capture rows">
        ${rows.slice(0, 5).map((row) => `
          <span>${escapeHtml(`${row.product_name || "Product"} · ${row.vintage_label || "Vintage"} · ${row.ocr_expected_surface || row.capture_strategy || "panel"}`)}</span>
        `).join("")}
      </div>
      <div class="corpus-handoff-links">
        ${artifacts.queue_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.queue_csv))}">OCR Queue CSV</a>` : ""}
        ${artifacts.batch_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.batch_csv))}">Batch CSV</a>` : ""}
        ${artifacts.runbook_markdown ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.runbook_markdown))}">Runbook</a>` : ""}
        ${artifacts.manifest_json ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.manifest_json))}">Manifest JSON</a>` : ""}
      </div>
    </article>
  `;
}

function renderPanelCapturePipelineStatus() {
  const summary = state.summary?.panel_capture_pipeline_summary || {};
  if (!summary.run_id) return "";
  const model = summary.model_routes || {};
  const capture = summary.capture || {};
  const ocr = summary.ocr || {};
  const review = summary.review_queue || {};
  const artifacts = summary.public_artifacts || {};
  const blockers = summary.blockers || {};
  const gapCounts = blockers.top_gap_categories || [];
  return `
    <article class="corpus-handoff-card panel-capture-card status-needs_source_review">
      <span>Panel Model / Capture Handoff</span>
      <strong>${escapeHtml(`${model.spark_packets_generated || 0} Spark packets · ${review.rows || 0} review rows`)}</strong>
      <p>Compact Spark packets are ready for crop/source instructions. The capture run is still public-safe dry-run only: no images, OCR text, or ingredient claims are published until private crops are supplied and reviewed.</p>
      <dl>
        <div>
          <dt>Dry-run rows</dt>
          <dd>${escapeHtml(capture.selected_rows || 0)}</dd>
        </div>
        <div>
          <dt>Ready for OCR</dt>
          <dd>${escapeHtml(capture.ready_for_ocr || 0)}</dd>
        </div>
        <div>
          <dt>Image-map keys</dt>
          <dd>${escapeHtml(capture.image_map_key_count || 0)}</dd>
        </div>
        <div>
          <dt>OCR skipped</dt>
          <dd>${escapeHtml(ocr.ocr_skipped_no_image || 0)}</dd>
        </div>
        <div>
          <dt>Needs source review</dt>
          <dd>${escapeHtml(review.needs_source_review || 0)}</dd>
        </div>
      </dl>
      <div class="panel-capture-row-strip" aria-label="Panel capture blockers">
        ${gapCounts.slice(0, 4).map((row) => `
          <span>${escapeHtml(`${labelFor(row.key)} · ${row.count}`)}</span>
        `).join("")}
      </div>
      <div class="corpus-handoff-links">
        ${artifacts.model_assist_summary_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.model_assist_summary_csv))}">Spark Packets CSV</a>` : ""}
        ${artifacts.run_summary_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.run_summary_csv))}">Capture Dry Run CSV</a>` : ""}
        ${artifacts.image_map_template_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.image_map_template_csv))}">Image Map Template</a>` : ""}
        ${artifacts.review_queue_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.review_queue_csv))}">Review Queue CSV</a>` : ""}
        ${artifacts.pipeline_summary_json ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.pipeline_summary_json))}">Pipeline JSON</a>` : ""}
      </div>
    </article>
  `;
}

function renderConfectionWrapperPriorityStatus() {
  const summary = state.summary?.confection_wrapper_source_priority_summary || {};
  const totals = summary.totals || {};
  if (!totals.confection_products) return "";
  const artifacts = summary.artifacts || {};
  const targets = summary.top_targets || [];
  return `
    <article class="corpus-handoff-card panel-capture-card status-source_review">
      <span>Confection Wrapper Lineage Priority</span>
      <strong>${escapeHtml(`${totals.products_with_existing_candy_wrapper_archive_leads || 0}/${totals.confection_products || 0} candy products have Candy Wrapper Archive leads`)}</strong>
      <p>Candy Wrapper Archive becomes the first source lane for candy wrapper history: use it for decade, package format, weight, and maker context, but keep ingredient claims blocked until a readable panel is captured and reviewed.</p>
      <dl>
        <div>
          <dt>Existing rows</dt>
          <dd>${escapeHtml(totals.existing_candy_wrapper_archive_rows || 0)}</dd>
        </div>
        <div>
          <dt>Likely pages</dt>
          <dd>${escapeHtml(totals.products_with_likely_collection_pages || 0)}</dd>
        </div>
        <div>
          <dt>Search targets</dt>
          <dd>${escapeHtml(totals.products_requiring_targeted_search || 0)}</dd>
        </div>
      </dl>
      <div class="panel-capture-list" aria-label="Confection wrapper source targets">
        ${targets.slice(0, 4).map((target) => `
          <article class="panel-acquisition-target panel-capture-target">
            <span>${escapeHtml(labelFor(target.priority_tier || "source target"))}</span>
            <strong>${escapeHtml(target.product_name || "Candy product")}</strong>
            <p>${escapeHtml(`${target.candy_wrapper_archive_rows || 0} existing rows · ${target.known_candy_wrapper_archive_urls ? sourceHost(target.known_candy_wrapper_archive_urls.split(";")[0]) : "targeted search"}`)}</p>
            <em>${escapeHtml(target.recommended_action || "Review wrapper-lineage source before broader search.")}</em>
          </article>
        `).join("")}
      </div>
      <div class="corpus-handoff-links">
        ${artifacts.priority_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.priority_csv))}">Priority CSV</a>` : ""}
        ${artifacts.report_markdown ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.report_markdown))}">Report</a>` : ""}
        ${artifacts.priority_json ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.priority_json))}">Priority JSON</a>` : ""}
      </div>
    </article>
  `;
}

function renderConfectionWrapperReviewQueueStatus() {
  const summary = state.summary?.confection_wrapper_review_queue_summary || {};
  const totals = summary.totals || {};
  if (!totals.review_tasks) return "";
  const artifacts = summary.artifacts || {};
  const tasks = summary.first_tasks || [];
  return `
    <article class="corpus-handoff-card panel-capture-card status-needs_source_review">
      <span>Confection Wrapper Review Queue</span>
      <strong>${escapeHtml(`${totals.review_tasks || 0} wrapper review tasks · ${totals.products || 0} candy products`)}</strong>
      <p>Prioritize Candy Wrapper Archive pages before broad hunting. Each task asks reviewers to identify item-level wrapper photos, visible panels, weight/maker cues, and rights notes before any OCR or ingredient claim.</p>
      <dl>
        <div>
          <dt>Existing source tasks</dt>
          <dd>${escapeHtml(totals.existing_source_tasks || 0)}</dd>
        </div>
        <div>
          <dt>Item pages</dt>
          <dd>${escapeHtml(totals.item_page_tasks || 0)}</dd>
        </div>
        <div>
          <dt>Collection pages</dt>
          <dd>${escapeHtml(totals.collection_page_tasks || 0)}</dd>
        </div>
        <div>
          <dt>Search tasks</dt>
          <dd>${escapeHtml(totals.search_tasks || 0)}</dd>
        </div>
      </dl>
      <div class="panel-capture-list" aria-label="Confection wrapper review tasks">
        ${tasks.slice(0, 4).map((task) => `
          <article class="panel-acquisition-target panel-capture-target">
            <span>${escapeHtml(labelFor(task.task_type || "source review"))}</span>
            <strong>${escapeHtml(task.product_name || "Candy product")}</strong>
            <p>${escapeHtml(`${task.observed_source_rows || 0} observed rows · ${task.linked_vintage_slots || "new source lead"}`)}</p>
            <em>${escapeHtml(task.review_goal || "Review source before capture/OCR.")}</em>
            ${task.source_url ? `<a href="${escapeHtml(task.source_url)}" target="_blank" rel="noopener">Open source</a>` : `<em>${escapeHtml(task.search_queries || "Targeted archive search")}</em>`}
          </article>
        `).join("")}
      </div>
      <div class="panel-capture-row-strip" aria-label="Confection wrapper review guardrails">
        <span>Wrapper fronts support package lineage</span>
        <span>Ingredient claims require readable panels</span>
        <span>External images stay link-only unless rights are clear</span>
      </div>
      <div class="corpus-handoff-links">
        ${artifacts.review_queue_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.review_queue_csv))}">Review Queue CSV</a>` : ""}
        ${artifacts.runbook_markdown ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.runbook_markdown))}">Runbook</a>` : ""}
        ${artifacts.review_queue_json ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.review_queue_json))}">Review JSON</a>` : ""}
      </div>
    </article>
  `;
}

function renderConfectionWrapperCaptureHandoffStatus() {
  const summary = state.summary?.confection_wrapper_capture_handoff_summary || {};
  const totals = summary.totals || {};
  if (!totals.capture_rows) return "";
  const artifacts = summary.artifacts || {};
  const rows = summary.first_rows || [];
  return `
    <article class="corpus-handoff-card panel-capture-card status-source_page_capture_needed">
      <span>Confection Wrapper Capture Handoff</span>
      <strong>${escapeHtml(`${totals.capture_rows || 0} capture rows · ${totals.high_priority_rows || 0} high priority`)}</strong>
      <p>These Candy Wrapper Archive leads now have capture-ready handoff rows and image-map template entries. Collection pages stay source triage; item pages move to private screenshot/panel review before any ingredient OCR.</p>
      <dl>
        <div>
          <dt>Source-page rows</dt>
          <dd>${escapeHtml(totals.source_page_capture_rows || 0)}</dd>
        </div>
        <div>
          <dt>Item triage</dt>
          <dd>${escapeHtml(totals.item_page_triage_rows || 0)}</dd>
        </div>
        <div>
          <dt>Collection triage</dt>
          <dd>${escapeHtml(totals.collection_index_rows || 0)}</dd>
        </div>
        <div>
          <dt>Source hunts</dt>
          <dd>${escapeHtml(totals.source_discovery_rows || 0)}</dd>
        </div>
      </dl>
      <div class="panel-capture-list" aria-label="Confection wrapper capture handoff rows">
        ${rows.slice(0, 4).map((row) => `
          <article class="panel-acquisition-target panel-capture-target">
            <span>${escapeHtml(labelFor(row.panel_acquisition_state || row.ocr_gap_category || "capture row"))}</span>
            <strong>${escapeHtml(row.product_name || "Candy product")}</strong>
            <p>${escapeHtml(`${labelFor(row.ocr_priority || "priority")} · ${row.source_url ? sourceHost(row.source_url) : "source hunt"}`)}</p>
            <em>${escapeHtml(row.ocr_recommended_action || "Review source before capture/OCR.")}</em>
            ${row.source_url ? `<a href="${escapeHtml(row.source_url)}" target="_blank" rel="noopener">Open source</a>` : `<em>${escapeHtml(row.search_queries || "Targeted archive search")}</em>`}
          </article>
        `).join("")}
      </div>
      <div class="panel-capture-row-strip" aria-label="Confection wrapper capture guardrails">
        <span>Image-map template is private-path blank</span>
        <span>Native OCR only after readable panel triage</span>
        <span>No verified ingredient claims created</span>
      </div>
      <div class="corpus-handoff-links">
        ${artifacts.queue_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.queue_csv))}">Capture Queue CSV</a>` : ""}
        ${artifacts.image_map_template_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.image_map_template_csv))}">Image Map Template</a>` : ""}
        ${artifacts.runbook_markdown ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.runbook_markdown))}">Runbook</a>` : ""}
        ${artifacts.handoff_json ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.handoff_json))}">Handoff JSON</a>` : ""}
      </div>
    </article>
  `;
}

function renderConfectionWrapperItemCandidateStatus() {
  const summary = state.summary?.confection_wrapper_item_candidate_summary || {};
  const totals = summary.totals || {};
  if (!totals.item_candidates) return "";
  const artifacts = summary.artifacts || {};
  const rows = summary.first_candidates || [];
  const gaps = summary.source_hunt_gaps || [];
  return `
    <article class="corpus-handoff-card panel-capture-card status-needs_source_review">
      <span>Confection Item-Level Candidates</span>
      <strong>${escapeHtml(`${totals.item_candidates || 0} item pages · ${totals.products_with_item_candidates || 0} products`)}</strong>
      <p>Collection pages are now reduced into concrete item-page review targets. These are source links and thumbnail references only; every row still needs private panel readability review before OCR or ingredient claims.</p>
      <dl>
        <div>
          <dt>Collection items</dt>
          <dd>${escapeHtml(totals.collection_item_candidates || 0)}</dd>
        </div>
        <div>
          <dt>Existing item pages</dt>
          <dd>${escapeHtml(totals.existing_item_page_candidates || 0)}</dd>
        </div>
        <div>
          <dt>High priority</dt>
          <dd>${escapeHtml(totals.high_priority_candidates || 0)}</dd>
        </div>
        <div>
          <dt>Source gaps</dt>
          <dd>${escapeHtml(totals.source_hunt_gaps || 0)}</dd>
        </div>
      </dl>
      <div class="panel-capture-list" aria-label="Confection item-level candidates">
        ${rows.slice(0, 4).map((row) => `
          <article class="panel-acquisition-target panel-capture-target">
            <span>${escapeHtml(labelFor(row.candidate_type || "item candidate"))}</span>
            <strong>${escapeHtml(row.product_name || "Candy product")}</strong>
            <p>${escapeHtml(`${row.item_title || "Item page"} · ${row.claimed_date_text || "date review"}`)}</p>
            <em>${escapeHtml(row.next_action || "Open item page before capture/OCR.")}</em>
            ${row.item_url ? `<a href="${escapeHtml(row.item_url)}" target="_blank" rel="noopener">Open item</a>` : ""}
          </article>
        `).join("")}
      </div>
      ${gaps.length ? `
        <div class="panel-capture-row-strip" aria-label="Confection item candidate gaps">
          ${gaps.slice(0, 3).map((gap) => `<span>${escapeHtml(`${gap.product_name}: source hunt`)}</span>`).join("")}
        </div>
      ` : ""}
      <div class="corpus-handoff-links">
        ${artifacts.item_candidates_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.item_candidates_csv))}">Item Candidates CSV</a>` : ""}
        ${artifacts.item_candidate_gaps_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.item_candidate_gaps_csv))}">Gaps CSV</a>` : ""}
        ${artifacts.runbook_markdown ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.runbook_markdown))}">Runbook</a>` : ""}
        ${artifacts.item_candidates_json ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.item_candidates_json))}">Candidates JSON</a>` : ""}
      </div>
    </article>
  `;
}

function renderConfectionWrapperLineagePriorityStatus() {
  const summary = state.summary?.confection_wrapper_lineage_priority_summary || {};
  const totals = summary.totals || {};
  if (!totals.item_pages) return "";
  const artifacts = summary.artifacts || {};
  const targets = summary.top_targets || [];
  const focusTargets = summary.focus_targets || [];
  return `
    <article class="corpus-handoff-card panel-capture-card status-source_review">
      <span>Candy Wrapper Archive Item Lineage</span>
      <strong>${escapeHtml(`${totals.item_pages || 0} item pages · ${totals.lineage_products || 0} products prioritized`)}</strong>
      <p>Use products with multiple Candy Wrapper Archive item pages as the first wrapper-history review lane. These pages can support package lineage and era selection, but ingredient proof still requires readable panel crops and manual verification.</p>
      <dl>
        <div>
          <dt>Direct image refs</dt>
          <dd>${escapeHtml(totals.direct_image_references || 0)}</dd>
        </div>
        <div>
          <dt>Panel reviews</dt>
          <dd>${escapeHtml(totals.panel_review_rows || 0)}</dd>
        </div>
        <div>
          <dt>Readable panels</dt>
          <dd>${escapeHtml(totals.readable_for_ocr || 0)}</dd>
        </div>
        <div>
          <dt>Source gaps</dt>
          <dd>${escapeHtml(totals.source_hunt_gaps || 0)}</dd>
        </div>
      </dl>
      <div class="panel-capture-list" aria-label="Candy Wrapper Archive product lineage priorities">
        ${targets.slice(0, 4).map((target) => `
          <article class="panel-acquisition-target panel-capture-target">
            <span>${escapeHtml(`${labelFor(target.priority_tier || "lineage target")} · ${target.lineage_span_label || "date review"}`)}</span>
            <strong>${escapeHtml(target.product_name || "Candy product")}</strong>
            <p>${escapeHtml(`${target.item_page_count || 0} item pages · ${target.panel_review_rows || 0} panel reviews · ${target.readable_for_ocr || 0} readable`)}</p>
            <em>${escapeHtml(target.next_action || "Review item pages, crop readable panels, then route to OCR.")}</em>
            ${target.source_urls ? `<a href="${escapeHtml(target.source_urls.split(";")[0])}" target="_blank" rel="noopener">Open first item</a>` : ""}
          </article>
        `).join("")}
      </div>
      <div class="panel-capture-row-strip" aria-label="Candy Wrapper Archive focus products">
        ${focusTargets.slice(0, 5).map((target) => `
          <span>${escapeHtml(`${target.product_name} · ${target.item_page_count} pages · ${target.lineage_span_label}`)}</span>
        `).join("")}
      </div>
      <div class="corpus-handoff-links">
        ${artifacts.lineage_priority_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.lineage_priority_csv))}">Lineage Priority CSV</a>` : ""}
        ${artifacts.lineage_priority_runbook_md ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.lineage_priority_runbook_md))}">Lineage Runbook</a>` : ""}
        ${artifacts.lineage_priority_json ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.lineage_priority_json))}">Lineage JSON</a>` : ""}
      </div>
    </article>
  `;
}

function renderConfectionWrapperCaptureBatchStatus() {
  const summary = state.summary?.confection_wrapper_capture_batch_summary || {};
  const totals = summary.totals || {};
  if (!totals.capture_rows) return "";
  const artifacts = summary.artifacts || {};
  const batches = summary.first_batches || [];
  const productCounts = summary.by_product || [];
  return `
    <article class="corpus-handoff-card panel-capture-card status-source_page_capture_needed">
      <span>Candy Wrapper Archive Capture Queue</span>
      <strong>${escapeHtml(`${totals.capture_rows || 0} capture rows · ${totals.product_batches || 0} product batches`)}</strong>
      <p>All currently known Candy Wrapper Archive item-lineage products now flow into the private screenshot/crop worksheet. Ingredient and nutrition panels are first-priority capture surfaces; wrapper fronts remain secondary context.</p>
      <dl>
        <div>
          <dt>Source URLs</dt>
          <dd>${escapeHtml(totals.source_urls || 0)}</dd>
        </div>
        <div>
          <dt>Private paths</dt>
          <dd>${escapeHtml(totals.private_paths_supplied || 0)}</dd>
        </div>
        <div>
          <dt>Readable panels</dt>
          <dd>${escapeHtml(totals.readable_for_ocr || 0)}</dd>
        </div>
        <div>
          <dt>Candidate rows</dt>
          <dd>${escapeHtml(totals.candidate_only_rows || 0)}</dd>
        </div>
      </dl>
      <div class="panel-capture-list" aria-label="Candy Wrapper Archive capture batches">
        ${batches.slice(0, 4).map((batch) => `
          <article class="panel-acquisition-target panel-capture-target">
            <span>${escapeHtml(`${batch.batch_rank || "?"}. ${batch.lineage_span_label || "lineage span"}`)}</span>
            <strong>${escapeHtml(batch.product_name || "Candy product")}</strong>
            <p>${escapeHtml(`${batch.panel_review_rows || 0} rows · ${batch.item_page_count || 0} item pages`)}</p>
            <em>${escapeHtml(batch.capture_goal || "Capture private panel crops before OCR.")}</em>
            ${batch.first_source_url ? `<a href="${escapeHtml(batch.first_source_url)}" target="_blank" rel="noopener">Open first source</a>` : ""}
          </article>
        `).join("")}
      </div>
      <div class="panel-capture-row-strip" aria-label="Candy Wrapper Archive capture products">
        ${productCounts.slice(0, 6).map((row) => `
          <span>${escapeHtml(`${row.key} · ${row.count}`)}</span>
        `).join("")}
      </div>
      <div class="corpus-handoff-links">
        ${artifacts.capture_worksheet_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.capture_worksheet_csv))}">Capture Worksheet CSV</a>` : ""}
        ${artifacts.capture_runbook_md ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.capture_runbook_md))}">Capture Batch Runbook</a>` : ""}
        ${artifacts.capture_batches_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.capture_batches_csv))}">Capture Batches CSV</a>` : ""}
        ${artifacts.capture_batches_json ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.capture_batches_json))}">Capture Batches JSON</a>` : ""}
      </div>
    </article>
  `;
}

function renderConfectionWrapperSurfaceOcrStatus() {
  const summary = state.summary?.confection_wrapper_surface_ocr_summary || {};
  const totals = summary.totals || {};
  if (!totals.surface_template_rows) return "";
  const artifacts = summary.artifacts || {};
  const surfaces = summary.by_surface || [];
  return `
    <article class="corpus-handoff-card panel-capture-card status-panel_capture_needed">
      <span>Candy Wrapper Archive Surface OCR Map</span>
      <strong>${escapeHtml(`${totals.ocr_queue_rows || 0} OCR rows · ${totals.surface_template_rows || 0} surface slots`)}</strong>
      <p>The capture worksheet is now split into surface-level OCR rows. Ingredient and nutrition panels lead the queue; wrapper-front context is present in the template but excluded from OCR by default.</p>
      <dl>
        <div>
          <dt>Ingredient panels</dt>
          <dd>${escapeHtml(totals.primary_ingredient_panel_rows || 0)}</dd>
        </div>
        <div>
          <dt>Nutrition panels</dt>
          <dd>${escapeHtml(totals.primary_nutrition_panel_rows || 0)}</dd>
        </div>
        <div>
          <dt>Support text</dt>
          <dd>${escapeHtml(totals.support_text_rows || 0)}</dd>
        </div>
        <div>
          <dt>Ready now</dt>
          <dd>${escapeHtml(totals.ready_for_capture || 0)}</dd>
        </div>
      </dl>
      <div class="panel-capture-row-strip" aria-label="Candy Wrapper Archive OCR surfaces">
        ${surfaces.slice(0, 6).map((row) => `
          <span>${escapeHtml(`${labelFor(row.key)} · ${row.count}`)}</span>
        `).join("")}
      </div>
      <div class="corpus-handoff-links">
        ${artifacts.surface_ocr_queue_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.surface_ocr_queue_csv))}">Surface OCR Queue CSV</a>` : ""}
        ${artifacts.surface_image_map_template_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.surface_image_map_template_csv))}">Surface Image Map Template</a>` : ""}
        ${artifacts.surface_image_map_audit_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.surface_image_map_audit_csv))}">Surface Image Map Audit</a>` : ""}
        ${artifacts.surface_ocr_runbook_md ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.surface_ocr_runbook_md))}">Surface OCR Runbook</a>` : ""}
        ${artifacts.surface_ocr_map_json ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.surface_ocr_map_json))}">Surface OCR JSON</a>` : ""}
      </div>
    </article>
  `;
}

function renderConfectionWrapperItemPanelTriageStatus() {
  const summary = state.summary?.confection_wrapper_item_panel_triage_summary || {};
  const totals = summary.totals || {};
  if (!totals.triage_rows) return "";
  const artifacts = summary.artifacts || {};
  const rows = summary.first_rows || [];
  return `
    <article class="corpus-handoff-card panel-capture-card status-panel_capture_needed">
      <span>Confection Item Panel Triage Queue</span>
      <strong>${escapeHtml(`${totals.triage_rows || 0} triage rows · ${totals.high_priority_rows || 0} high priority`)}</strong>
      <p>Item pages are now capture/OCR-compatible rows. Direct archive image URLs are private capture references only; OCR waits on panel readability review, and product-front wrapper photos stay secondary context.</p>
      <dl>
        <div>
          <dt>Direct image refs</dt>
          <dd>${escapeHtml(totals.direct_image_reference_rows || 0)}</dd>
        </div>
        <div>
          <dt>Source-page rows</dt>
          <dd>${escapeHtml(totals.source_page_capture_rows || 0)}</dd>
        </div>
        <div>
          <dt>Existing item pages</dt>
          <dd>${escapeHtml(totals.item_page_rows || 0)}</dd>
        </div>
        <div>
          <dt>Collection items</dt>
          <dd>${escapeHtml(totals.collection_item_rows || 0)}</dd>
        </div>
      </dl>
      <div class="panel-capture-list" aria-label="Confection item panel triage rows">
        ${rows.slice(0, 4).map((row) => `
          <article class="panel-acquisition-target panel-capture-target">
            <span>${escapeHtml(labelFor(row.capture_strategy || row.ocr_priority || "panel triage"))}</span>
            <strong>${escapeHtml(row.product_name || "Candy product")}</strong>
            <p>${escapeHtml(`${row.source_title || "Item page"} · ${row.vintage_label || "date review"}`)}</p>
            <em>${escapeHtml(row.ocr_recommended_action || "Capture privately, classify panel visibility, then OCR only readable text surfaces.")}</em>
            ${row.source_url ? `<a href="${escapeHtml(row.source_url)}" target="_blank" rel="noopener">Open item</a>` : ""}
          </article>
        `).join("")}
      </div>
      <div class="panel-capture-row-strip" aria-label="Confection item panel triage guardrails">
        <span>Ingredient panels first</span>
        <span>Wrapper fronts are context</span>
        <span>Manual verification required</span>
      </div>
      <div class="corpus-handoff-links">
        ${artifacts.queue_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.queue_csv))}">Panel Triage CSV</a>` : ""}
        ${artifacts.image_map_template_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.image_map_template_csv))}">Image Map Template</a>` : ""}
        ${artifacts.runbook_markdown ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.runbook_markdown))}">Runbook</a>` : ""}
        ${artifacts.triage_json ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.triage_json))}">Triage JSON</a>` : ""}
      </div>
    </article>
  `;
}

function renderConfectionWrapperItemPanelPipelineStatus() {
  const summary = state.summary?.confection_wrapper_item_panel_pipeline_summary || {};
  if (!summary.run_id) return "";
  const model = summary.model_routes || {};
  const capture = summary.capture || {};
  const ocr = summary.ocr || {};
  const review = summary.review_queue || {};
  const artifacts = summary.public_artifacts || {};
  const blockers = summary.blockers || {};
  const audit = summary.image_map_audit || {};
  const tasks = summary.capture_task_summary || {};
  const panelReview = summary.panel_review_worksheet || {};
  const products = Array.isArray(blockers.top_products)
    ? blockers.top_products.map((row) => `${row.key || "Product"} · ${row.count || 0}`)
    : String(blockers.top_products || "").split(";").map((value) => value.trim()).filter(Boolean);
  const reviewQuestions = panelReview.review_questions || [];
  return `
    <article class="corpus-handoff-card panel-capture-card status-needs_source_review">
      <span>Candy Wrapper Archive OCR Pipeline</span>
      <strong>${escapeHtml(`${model.spark_packets_generated || 0} Spark packets · ${panelReview.worksheet_rows || review.rows || 0} panel reviews`)}</strong>
      <p>The item-level Candy Wrapper Archive lane now runs through the same model/capture/OCR summary flow. This is still a dry run: archive photos are source leads, ingredient proof starts only after private readable-panel crops are supplied.</p>
      <dl>
        <div>
          <dt>Dry-run rows</dt>
          <dd>${escapeHtml(capture.selected_rows || 0)}</dd>
        </div>
        <div>
          <dt>Ready for OCR</dt>
          <dd>${escapeHtml(capture.ready_for_ocr || 0)}</dd>
        </div>
        <div>
          <dt>No-network blocks</dt>
          <dd>${escapeHtml(capture.blocked_no_network || 0)}</dd>
        </div>
        <div>
          <dt>OCR skipped</dt>
          <dd>${escapeHtml(ocr.ocr_skipped_no_image || 0)}</dd>
        </div>
        <div>
          <dt>Source review</dt>
          <dd>${escapeHtml(review.needs_source_review || 0)}</dd>
        </div>
        <div>
          <dt>Paths needed</dt>
          <dd>${escapeHtml(audit.no_private_path_supplied || tasks.paths_needed || 0)}</dd>
        </div>
        <div>
          <dt>Capture tasks</dt>
          <dd>${escapeHtml(tasks.task_count || 0)}</dd>
        </div>
        <div>
          <dt>Panel reviews</dt>
          <dd>${escapeHtml(panelReview.worksheet_rows || 0)}</dd>
        </div>
        <div>
          <dt>Readable reviews</dt>
          <dd>${escapeHtml(panelReview.readable_for_ocr || 0)}</dd>
        </div>
      </dl>
      <div class="panel-capture-row-strip" aria-label="Candy Wrapper Archive pipeline product blockers">
        ${products.slice(0, 5).map((row) => `<span>${escapeHtml(row)}</span>`).join("")}
      </div>
      <div class="panel-capture-row-strip" aria-label="Candy Wrapper Archive panel review questions">
        ${reviewQuestions.slice(2, 8).map((question) => `<span>${escapeHtml(question)}</span>`).join("")}
      </div>
      <div class="panel-capture-list" aria-label="Candy Wrapper Archive first capture tasks">
        ${(tasks.first_tasks || []).slice(0, 4).map((task) => `
          <article class="panel-acquisition-target panel-capture-target">
            <span>${escapeHtml(`${task.rank || "?"}. ${task.vintage_label || "vintage"} · ${task.source_domain || "source"}`)}</span>
            <strong>${escapeHtml(task.product_name || "Candy wrapper task")}</strong>
            <p>${escapeHtml(task.crop_target || "Capture a private wrapper/panel crop before OCR.")}</p>
            <em>${escapeHtml(task.next_action || "Fill the private image-map template path after capture.")}</em>
            ${task.source_url ? `<a href="${escapeHtml(task.source_url)}" target="_blank" rel="noopener">Open source</a>` : ""}
          </article>
        `).join("")}
      </div>
      <div class="corpus-handoff-links">
        ${artifacts.model_assist_summary_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.model_assist_summary_csv))}">Spark Packets CSV</a>` : ""}
        ${artifacts.run_summary_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.run_summary_csv))}">Capture Dry Run CSV</a>` : ""}
        ${artifacts.image_map_template_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.image_map_template_csv))}">Image Map Template</a>` : ""}
        ${artifacts.image_map_audit_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.image_map_audit_csv))}">Image Map Audit</a>` : ""}
        ${artifacts.ocr_summary_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.ocr_summary_csv))}">OCR Summary CSV</a>` : ""}
        ${artifacts.review_queue_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.review_queue_csv))}">Review Queue CSV</a>` : ""}
        ${artifacts.capture_task_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.capture_task_csv))}">Capture Tasks CSV</a>` : ""}
        ${artifacts.capture_task_runbook_md ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.capture_task_runbook_md))}">Capture Runbook</a>` : ""}
        ${artifacts.panel_review_worksheet_csv ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.panel_review_worksheet_csv))}">Panel Review CSV</a>` : ""}
        ${artifacts.panel_review_worksheet_runbook_md ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.panel_review_worksheet_runbook_md))}">Panel Review Runbook</a>` : ""}
        ${artifacts.panel_review_worksheet_json ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.panel_review_worksheet_json))}">Panel Review JSON</a>` : ""}
        ${artifacts.pipeline_summary_json ? `<a href="${escapeHtml(navigatorArtifactHref(artifacts.pipeline_summary_json))}">Pipeline JSON</a>` : ""}
      </div>
    </article>
  `;
}

function renderCorpusHandoff() {
  if (!els.corpusHandoff) return;
  const stats = corpusHandoffStats();
  const panelStats = corpusIngredientPanelProofStats();
  const tasks = captureTaskSummary();
  const storyBriefs = state.data.full_corpus_story_briefs_summary || {};
  const storyArtifacts = storyBriefs.site_artifacts || storyBriefs.public_artifacts || {};
  els.corpusHandoff.innerHTML = `
    <article class="corpus-handoff-card">
      <span>Corpus Loaded</span>
      <strong>${escapeHtml(`${stats.productCount}-product corpus`)}</strong>
      <p>The dropdown, search, and Full Corpus mode expose every product. The 10 pilots are narrative examples; the 110 proof shells are active source/photo/OCR workspaces.</p>
      <dl>
        <div>
          <dt>Story-rich pilots</dt>
          <dd>${escapeHtml(stats.storyRich)}</dd>
        </div>
        <div>
          <dt>Proof shells</dt>
          <dd>${escapeHtml(stats.proofShells)}</dd>
        </div>
      </dl>
    </article>
    <article class="corpus-handoff-card status-source_review">
      <span>Primary Display Gate</span>
      <strong>${escapeHtml(panelStats.publicEmbeds ? `${panelStats.publicEmbeds} public panel embeds` : "Ingredient panels are still link/candidate-first")}</strong>
      <p>Ingredient or nutrition panel photos are the primary recipe-history proof. Product-front photos render only as secondary context unless the panel is readable.</p>
      <dl>
        <div>
          <dt>Panel/document leads</dt>
          <dd>${escapeHtml(panelStats.rows)}</dd>
        </div>
        <div>
          <dt>Panel link-only</dt>
          <dd>${escapeHtml(panelStats.linkOnly)}</dd>
        </div>
        <div>
          <dt>Text candidates</dt>
          <dd>${escapeHtml(panelStats.candidateText || stats.candidateExtracts)}</dd>
        </div>
      </dl>
    </article>
    <article class="corpus-handoff-card status-needs_source_review">
      <span>Next Unlock</span>
      <strong>Private capture then review</strong>
      <p>Capture/crop source pages privately, run native OCR, batch-review candidate text, then publish only rights-cleared images or link-only proof cards.</p>
    </article>
    ${renderPublicPhotoProofStrip()}
    ${renderIngredientPanelAcquisitionStatus()}
    ${renderPanelCaptureBatchStatus()}
    ${renderPanelCapturePipelineStatus()}
    ${renderConfectionWrapperPriorityStatus()}
    ${renderConfectionWrapperReviewQueueStatus()}
    ${renderConfectionWrapperCaptureHandoffStatus()}
    ${renderConfectionWrapperItemCandidateStatus()}
    ${renderConfectionWrapperLineagePriorityStatus()}
    ${renderConfectionWrapperCaptureBatchStatus()}
    ${renderConfectionWrapperSurfaceOcrStatus()}
    ${renderConfectionWrapperItemPanelTriageStatus()}
    ${renderConfectionWrapperItemPanelPipelineStatus()}
    ${renderPublicPhotoOcrStatus()}
    ${storyBriefs.product_count ? `
      <article class="corpus-handoff-card status-full_corpus_selectable">
        <span>Story Brief Exports</span>
        <strong>${escapeHtml(`${storyBriefs.product_count} product briefs`)}</strong>
        <p>${escapeHtml(storyBriefs.public_policy || "Story briefs are source/story handoffs; ingredient claims still require manual verification.")}</p>
        <dl>
          <div>
            <dt>Proof shells</dt>
            <dd>${escapeHtml(storyBriefs.proof_shell_count || 0)}</dd>
          </div>
          <div>
            <dt>Receipts</dt>
            <dd>${escapeHtml(storyBriefs.source_receipts || 0)}</dd>
          </div>
          <div>
            <dt>Embeds</dt>
            <dd>${escapeHtml(storyBriefs.public_embeds || 0)}</dd>
          </div>
        </dl>
        <div class="corpus-handoff-links">
          ${storyArtifacts.story_briefs_markdown ? `<a href="${escapeHtml(navigatorArtifactHref(storyArtifacts.story_briefs_markdown))}">Markdown</a>` : ""}
          ${storyArtifacts.story_briefs_csv ? `<a href="${escapeHtml(navigatorArtifactHref(storyArtifacts.story_briefs_csv))}">CSV</a>` : ""}
          ${storyArtifacts.story_briefs_json ? `<a href="${escapeHtml(navigatorArtifactHref(storyArtifacts.story_briefs_json))}">JSON</a>` : ""}
        </div>
      </article>
    ` : ""}
    ${renderCaptureTaskPreview(tasks)}
  `;
}

function applyPhotoProofManifest(manifest = {}) {
  state.photoProofManifest = manifest || {};
  state.photoProofImagesByEvidenceId = new Map(
    (manifest.published_images || [])
      .filter((row) => row.evidence_id && row.public_image_url && row.image_display_policy === "embed_rights_cleared")
      .map((row) => [row.evidence_id, row]),
  );
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

function sourceHost(url) {
  if (!url) return "source needed";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (_error) {
    return String(url).replace(/^https?:\/\//, "").split("/")[0] || "source";
  }
}

function proofImageUrl(row) {
  const published = state.photoProofImagesByEvidenceId.get(row?.id || "");
  return published?.public_image_url || row?.public_image_url || row?.thumbnail_url || row?.image_url || row?.image_path_or_url || row?.package_image_url || row?.screenshot_image_path || "";
}

function rightsNote(row) {
  const published = state.photoProofImagesByEvidenceId.get(row?.id || "");
  return published?.rights_status || row?.rights_status || row?.rights || row?.license_rights_note || "External source; rights note needed before reproducing imagery.";
}

function imageDisplayPolicy(row) {
  const published = state.photoProofImagesByEvidenceId.get(row?.id || "");
  return published?.image_display_policy || row?.image_display_policy || "source_link_only_no_public_image";
}

function imageAttribution(row) {
  const published = state.photoProofImagesByEvidenceId.get(row?.id || "");
  return published?.attribution_text || row?.source || "Source image";
}

function canEmbedProofImage(row) {
  const image = proofImageUrl(row);
  if (!image) return false;
  if (state.photoProofImagesByEvidenceId.has(row?.id || "")) return imageDisplayPolicy(row) === "embed_rights_cleared";
  if (row?.image_display_policy) return row.image_display_policy === "embed_rights_cleared";
  const rights = rightsNote(row).toLowerCase();
  const source = `${row?.source || ""} ${row?.url || ""}`.toLowerCase();
  const clearLicense = /public domain|cc[- ]?by|creative commons|wikimedia commons|owned image|rights cleared/.test(rights);
  const blocked = /inspect license|rights note needed|before reuse|external source|collector photo/.test(rights);
  return clearLicense && !blocked && !/flickr\.com/.test(source);
}

function bestIngredientProofEvidence(productRow, version) {
  const ranked = versionEvidence(productRow, version)
    .filter(isIngredientPanelProof)
    .sort((a, b) => {
      const rank = (row) => (
        (row.visible_extract ? 45 : 0) +
        (canEmbedProofImage(row) ? 30 : proofImageUrl(row) ? 18 : 0) +
        (/ingredient/i.test(`${row.label_panel_state || ""} ${row.photo_role || ""} ${row.ocr_expected_surface || ""}`) ? 18 : 0) +
        (/nutrition|allergen|document|pdf/i.test(`${row.label_panel_state || ""} ${row.photo_role || ""} ${row.ocr_expected_surface || ""} ${row.kind || ""}`) ? 12 : 0) +
        (proofSourceUrl(row) ? 10 : 0) +
        (row.status === "manual_verified" ? 16 : row.status === "label_text_candidate" ? 10 : row.status === "usable_photo" ? 6 : 0)
      );
      return rank(b) - rank(a);
    });
  return ranked[0] || {};
}

function bestSecondaryContextEvidence(productRow, version, primaryRow = {}) {
  const primaryId = primaryRow?.id || "";
  const ranked = versionEvidence(productRow, version)
    .filter((row) => row.id !== primaryId && !isIngredientPanelProof(row))
    .sort((a, b) => {
      const rank = (row) => (
        (canEmbedProofImage(row) ? 35 : proofImageUrl(row) ? 20 : 0) +
        (proofSourceUrl(row) ? 10 : 0) +
        (Number(row.confidence || 0) * 10) +
        (row.status === "usable_photo" ? 6 : row.status === "source_review" ? 4 : 0)
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
  return Boolean(proofExtractFor(version, bestIngredientProofEvidence(productRow, version)))
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
  const title = row.title || `${version.label} ingredient-panel proof`;
  if (!image && !source) {
    return `
      <div class="proof-photo proof-photo-receipt proof-panel-needed status-needs_label_transcription">
        <div class="proof-receipt-visual" aria-hidden="true">
          <span>primary image missing</span>
          <strong>Ingredient panel needed</strong>
          <em>${escapeHtml(version.label || "selected era")}</em>
        </div>
        <span>Primary proof slot</span>
        <strong>${escapeHtml("No readable ingredient-panel photo linked yet")}</strong>
        <p>Recipe history needs a readable ingredient, nutrition, allergen, or disclosure panel first. Product-front or package-object photos are useful only as secondary identity context.</p>
        <dl>
          <div>
            <dt>Required photo</dt>
            <dd>Back/side ingredient panel, nutrition panel, menu ingredient PDF, or disclosure document</dd>
          </div>
          <div>
            <dt>Current blocker</dt>
            <dd>${escapeHtml(version.photo_quality?.blocker || version.next_step || "Find a source-attributable readable panel and run OCR/manual review.")}</dd>
          </div>
        </dl>
      </div>
    `;
  }
  if (embedImage) {
    return `
      <figure class="proof-photo">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(`${productRow.name} ${version.label} ingredient panel or document proof`)}" loading="lazy" />
        <figcaption>${escapeHtml(imageAttribution(row))} · ${escapeHtml(rightsNote(row))}</figcaption>
      </figure>
    `;
  }
  return `
    <div class="proof-photo proof-photo-receipt status-${escapeHtml(row.status || version.status || "unknown")}">
      <div class="proof-receipt-visual" aria-hidden="true">
        <span>${escapeHtml(canEmbedProofImage(row) ? "image ready" : source ? "linked source" : "gap")}</span>
        <strong>${escapeHtml(sourceHost(source))}</strong>
        <em>${escapeHtml(row.photo_role || version.photo_quality?.role || "photo proof")}</em>
      </div>
      <span>${escapeHtml(row.kind || "ingredient panel source receipt")}</span>
      <strong>${escapeHtml(title || "Photo proof needed")}</strong>
      <p>${escapeHtml(imageDisplayPolicy(row) === "embed_rights_cleared" ? "Rights-cleared panel/document image is ready to display." : image ? "Panel/document image reference is present, but this page keeps it link-only until rights are reviewed." : "Ingredient-panel proof is source-attributed, but no rights-cleared embeddable image URL is stored yet.")}</p>
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
          <dd>${escapeHtml(imageDisplayPolicy(row))}</dd>
        </div>
      </dl>
      ${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noreferrer">Open ingredient-panel source</a>` : ""}
    </div>
  `;
}

function renderSecondaryContextCallout(productRow, version, row) {
  const source = proofSourceUrl(row);
  const image = proofImageUrl(row);
  if (!source && !image) return "";
  const embedImage = canEmbedProofImage(row);
  return `
    <aside class="proof-secondary-context" aria-label="Secondary product or package context">
      <div>
        <span>Secondary product context</span>
        <strong>${escapeHtml(row.title || `${version.label} package/source context`)}</strong>
        <p>Useful for product identity, era, package format, or maker cues. It is not ingredient proof unless a readable panel is visible.</p>
      </div>
      ${embedImage ? `
        <figure>
          <img src="${escapeHtml(image)}" alt="${escapeHtml(`${productRow.name} secondary package context`)}" loading="lazy" />
          <figcaption>${escapeHtml(imageAttribution(row))}</figcaption>
        </figure>
      ` : `
        <div class="proof-secondary-receipt">
          <span>${escapeHtml(sourceHost(source))}</span>
          <strong>${escapeHtml(row.photo_role || "package context")}</strong>
        </div>
      `}
      <div class="lead-meta">
        ${statusBadge("secondary_context")}
        ${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noreferrer">Open context source</a>` : ""}
      </div>
    </aside>
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
  const row = bestIngredientProofEvidence(productRow, version);
  const secondaryRow = bestSecondaryContextEvidence(productRow, version, row);
  const source = proofSourceUrl(row) || proofSourceUrl(secondaryRow);
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
      ${renderSecondaryContextCallout(productRow, version, secondaryRow)}
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

function evidenceVersionLabels(productRow, evidenceId) {
  return (productRow.versions || [])
    .filter((version) => (version.evidence_ids || []).includes(evidenceId))
    .map((version) => version.label)
    .join(", ");
}

function sourceProofRows(productRow) {
  return [...(productRow.evidence || [])]
    .filter((row) => proofSourceUrl(row) || proofImageUrl(row))
    .sort((a, b) => {
      const score = (row) => (
        (canEmbedProofImage(row) ? 50 : 0) +
        (row.visible_extract ? 35 : 0) +
        (/ingredient|label/i.test(`${row.label_panel_state || ""} ${row.photo_role || ""}`) ? 20 : 0) +
        (proofSourceUrl(row) ? 10 : 0) +
        (Number(row.confidence || 0) * 10)
      );
      return score(b) - score(a);
    });
}

function isIngredientPanelProof(row) {
  const documentText = [
    row?.title,
    row?.url,
    row?.source_url,
    row?.archive_url,
    row?.source_photo_url,
  ].join(" ").toLowerCase();
  const panelText = [
    row?.photo_role,
    row?.label_panel_state,
    row?.ocr_expected_surface,
  ].join(" ").toLowerCase();
  return Boolean(row?.visible_extract)
    || /ingredient guide|product ingredient|nutrition guide|nutrition facts|allergen|smartlabel|\.pdf\b|pdf$/.test(documentText)
    || (!/not verified|not reviewed|not readable|front package|object visible/.test(panelText)
      && /ingredient panel visible|nutrition panel visible|label text candidate|readable ingredient|readable nutrition|partial package text|wrapper text|ingredient text candidate|current label source|document text/.test(panelText));
}

function ingredientPanelProofRows(productRow) {
  return sourceProofRows(productRow).filter(isIngredientPanelProof);
}

function secondaryPackageProofRows(productRow) {
  const panelIds = new Set(ingredientPanelProofRows(productRow).map((row) => row.id));
  return sourceProofRows(productRow).filter((row) => !panelIds.has(row.id));
}

function sourceProofStats(productRow) {
  const rows = sourceProofRows(productRow);
  const embedReady = rows.filter((row) => canEmbedProofImage(row)).length;
  const candidateText = rows.filter((row) => row.visible_extract).length
    + (productRow.versions || []).filter((row) => row.label_extract).length;
  return {
    rows,
    sourceLinked: rows.filter((row) => proofSourceUrl(row)).length,
    embedReady,
    linkOnly: rows.filter((row) => proofSourceUrl(row) && !canEmbedProofImage(row)).length,
    candidateText,
  };
}

function ingredientPanelProofStats(productRow) {
  const rows = ingredientPanelProofRows(productRow);
  const embedReady = rows.filter((row) => canEmbedProofImage(row)).length;
  const candidateText = rows.filter((row) => row.visible_extract).length
    + (productRow.versions || []).filter((row) => row.label_extract).length;
  return {
    rows,
    sourceLinked: rows.filter((row) => proofSourceUrl(row)).length,
    embedReady,
    linkOnly: rows.filter((row) => proofSourceUrl(row) && !canEmbedProofImage(row)).length,
    candidateText,
  };
}

function secondaryPackageProofStats(productRow) {
  const rows = secondaryPackageProofRows(productRow);
  return {
    rows,
    sourceLinked: rows.filter((row) => proofSourceUrl(row)).length,
    embedReady: rows.filter((row) => canEmbedProofImage(row)).length,
    linkOnly: rows.filter((row) => proofSourceUrl(row) && !canEmbedProofImage(row)).length,
    candidateText: rows.filter((row) => row.visible_extract).length,
  };
}

function renderProofSourceThumb(productRow, row) {
  const image = proofImageUrl(row);
  if (image && canEmbedProofImage(row)) {
    return `
      <figure class="proof-source-thumb">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(`${productRow.name} source photo proof`)}" loading="lazy" />
        <figcaption>${escapeHtml(imageAttribution(row))}</figcaption>
      </figure>
    `;
  }
  return `
    <div class="proof-source-thumb proof-source-thumb-receipt" aria-hidden="true">
      <span>${escapeHtml(sourceHost(proofSourceUrl(row)))}</span>
      <strong>${escapeHtml(row.photo_role || "source receipt")}</strong>
    </div>
  `;
}

function renderProofDisplayGate(stats) {
  const mode = stats.embedReady ? "mixed image/source mode" : "source receipts only";
  return `
    <div class="proof-display-gate" aria-label="Photo proof display mode">
      <article>
        <span>Current public photo mode</span>
        <strong>${escapeHtml(mode)}</strong>
        <p>${escapeHtml(stats.embedReady ? "Rights-cleared package photos can render inline; uncleared sources remain link-only." : "No rights-cleared package images are stored for this product yet, so source cards render beside ingredient text candidates instead of reproducing photos.")}</p>
      </article>
      <article>
        <span>Source receipts</span>
        <strong>${escapeHtml(stats.sourceLinked)}</strong>
        <p>Attributable photo, document, retailer, archive, or menu sources available for review.</p>
      </article>
      <article>
        <span>Candidate text</span>
        <strong>${escapeHtml(stats.candidateText)}</strong>
        <p>Visible extracts remain candidate-only until OCR/manual correction and reviewer metadata are recorded.</p>
      </article>
    </div>
  `;
}

function renderIngredientPanelProofRail(productRow) {
  const stats = ingredientPanelProofStats(productRow);
  const rows = stats.rows.slice(0, 8);
  const hasPublicPanelImage = stats.embedReady > 0;
  return `
    <section class="proof-source-rail proof-source-rail-primary" aria-label="Primary ingredient panel proof inventory">
      <header>
        <div>
          <span>Primary Proof: Ingredient Panels</span>
          <strong>${escapeHtml(stats.sourceLinked)} panel/document leads · ${escapeHtml(stats.embedReady)} public panel embeds</strong>
        </div>
        <p>${escapeHtml(hasPublicPanelImage ? "Ingredient or nutrition panels with clear display rights render here first." : "No rights-cleared ingredient-panel photos are embedded for this product yet. Link-only panel leads and visible text candidates stay primary until a readable panel image clears review.")}</p>
      </header>
      <div class="proof-source-metrics">
        <span><strong>${escapeHtml(stats.linkOnly)}</strong>Panel link-only</span>
        <span><strong>${escapeHtml(stats.candidateText)}</strong>Ingredient text candidates</span>
        <span><strong>${escapeHtml(productRow.ingredient_ocr_summary?.ingredient_text_candidate_count || 0)}</strong>OCR text leads</span>
        <span><strong>${escapeHtml(productRow.ingredient_ocr_summary?.label_visible_count || 0)}</strong>Label-visible rows</span>
      </div>
      <div class="proof-display-gate" aria-label="Ingredient panel display gate">
        <article>
          <span>Publication Priority</span>
          <strong>Ingredient panel first</strong>
          <p>Readable ingredient or nutrition panels are the primary proof object for recipe history. Product-front photos are only context unless they expose label text.</p>
        </article>
        <article>
          <span>Current State</span>
          <strong>${escapeHtml(hasPublicPanelImage ? "panel image available" : "panel proof still link/candidate")}</strong>
          <p>${escapeHtml(hasPublicPanelImage ? "At least one panel-like image can render inline with attribution." : "Use the source link, OCR queue, and manual transcription workflow before presenting this as verified ingredient proof.")}</p>
        </article>
        <article>
          <span>Claim Boundary</span>
          <strong>candidate-only</strong>
          <p>Visible extracts are not verified recipes until reviewer attribution and corrected transcription are recorded.</p>
        </article>
      </div>
      <div class="proof-source-list">
        ${rows.length ? rows.map((row) => {
          const source = proofSourceUrl(row);
          return `
            <article class="proof-source-card status-${escapeHtml(row.status || "source_review")}">
              ${renderProofSourceThumb(productRow, row)}
              <span>${escapeHtml(evidenceVersionLabels(productRow, row.id) || row.date_basis_state || "panel/document lead")}</span>
              <strong>${escapeHtml(row.title || "Ingredient panel proof lead")}</strong>
              <p>${escapeHtml(row.quality_note || row.label_panel_state || "Review panel readability, crop target, OCR output, and manual transcription before promotion.")}</p>
              <dl>
                <div>
                  <dt>Host</dt>
                  <dd>${escapeHtml(sourceHost(source))}</dd>
                </div>
                <div>
                  <dt>Panel role</dt>
                  <dd>${escapeHtml(row.photo_role || "ingredient/document panel candidate")}</dd>
                </div>
                <div>
                  <dt>Panel</dt>
                  <dd>${escapeHtml(row.label_panel_state || "not reviewed")}</dd>
                </div>
                <div>
                  <dt>Policy</dt>
                  <dd>${escapeHtml(imageDisplayPolicy(row))}</dd>
                </div>
              </dl>
              <div class="lead-meta">
                ${statusBadge(canEmbedProofImage(row) ? "embed_rights_cleared" : "source_link_only_rights_unclear")}
                ${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noreferrer">Open panel source</a>` : ""}
              </div>
            </article>
          `;
        }).join("") : `
          <article class="proof-source-card proof-source-card-empty">
            <strong>No ingredient-panel photo is publishable yet</strong>
            <p>Next step: capture a readable back/side panel or document ingredient page, then run OCR and manual correction. Product photos stay secondary until they reveal ingredient text.</p>
            ${statusBadge("needs_label_transcription")}
          </article>
        `}
      </div>
    </section>
  `;
}

function renderProductProofRail(productRow) {
  const stats = secondaryPackageProofStats(productRow);
  const rows = stats.rows.slice(0, 8);
  return `
    <section class="proof-source-rail proof-source-rail-secondary" aria-label="Secondary package and product object proof inventory">
      <header>
        <div>
          <span>Secondary Proof: Product / Package Context</span>
          <strong>${escapeHtml(stats.sourceLinked)} object/context receipts · ${escapeHtml(stats.embedReady)} public embeds</strong>
        </div>
        <p>${escapeHtml(stats.embedReady ? "Rights-cleared product or package-object images can render inline as context. They do not prove ingredients unless the label panel is readable." : "No secondary product photos are embedded yet. Ingredient-panel evidence above remains the primary recipe-history proof object.")}</p>
      </header>
      <div class="proof-source-metrics">
        <span><strong>${escapeHtml(stats.linkOnly)}</strong>Link-only context</span>
        <span><strong>${escapeHtml(stats.candidateText)}</strong>Text on context rows</span>
        <span><strong>${escapeHtml(productRow.ingredient_ocr_summary?.local_image_ready_count || 0)}</strong>Private image-ready</span>
        <span><strong>${escapeHtml(productRow.ingredient_ocr_summary?.source_page_capture_needed_count || 0)}</strong>Capture needed</span>
      </div>
      <div class="proof-source-list">
        ${rows.length ? rows.map((row) => {
          const source = proofSourceUrl(row);
          return `
            <article class="proof-source-card status-${escapeHtml(row.status || "source_review")}">
              ${renderProofSourceThumb(productRow, row)}
              <span>${escapeHtml(evidenceVersionLabels(productRow, row.id) || row.date_basis_state || "source receipt")}</span>
              <strong>${escapeHtml(row.title || "Source proof")}</strong>
              <p>${escapeHtml(row.quality_note || row.rights || "Review source, visible panels, date cues, and rights before promotion.")}</p>
              <dl>
                <div>
                  <dt>Host</dt>
                  <dd>${escapeHtml(sourceHost(source))}</dd>
                </div>
                <div>
                  <dt>Photo role</dt>
                  <dd>${escapeHtml(row.photo_role || "not classified")}</dd>
                </div>
                <div>
                  <dt>Panel</dt>
                  <dd>${escapeHtml(row.label_panel_state || "not reviewed")}</dd>
                </div>
                <div>
                  <dt>Policy</dt>
                  <dd>${escapeHtml(imageDisplayPolicy(row))}</dd>
                </div>
              </dl>
              <div class="lead-meta">
                ${statusBadge(canEmbedProofImage(row) ? "embed_rights_cleared" : "source_link_only_rights_unclear")}
                ${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noreferrer">Open source</a>` : ""}
              </div>
            </article>
          `;
        }).join("") : `<article class="proof-source-card"><strong>No secondary product photo recorded</strong><p>This is acceptable if ingredient-panel proof above is stronger. Product-front imagery is context, not the primary recipe-history evidence.</p>${statusBadge("source_discovery_needed")}</article>`}
      </div>
    </section>
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
    ["photo", "Photo/source-backed"],
    ["ingredient", "Ingredient text candidates"],
    ["verified", "Verified only"],
  ];
  els.proofReader.innerHTML = `
    <header class="proof-reader-head">
    <div>
      <p class="eyebrow">Recipe History Proof</p>
        <h2>Ingredient panel proof next to ingredient text</h2>
        <p>Toggle an era to inspect the ingredient-panel photo, document receipt, or source lead beside the ingredient extract. Product/package photos are secondary context unless the label panel is readable.</p>
      </div>
      <aside class="proof-disclaimer">
        <strong>Publication note</strong>
        <p>This page is not legal advice. It cites source pages and avoids reproducing external package photos unless rights are recorded as clear. Ingredient-panel extracts are evidence candidates, not verified formulation claims.</p>
      </aside>
    </header>
    ${renderIngredientPanelProofRail(productRow)}
    ${renderProductProofRail(productRow)}
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
  const storyArtifacts = state.data.full_corpus_story_briefs_summary?.site_artifacts
    || state.data.full_corpus_story_briefs_summary?.public_artifacts
    || {};
  const rows = [
    ["Timeline JSON", exports.timeline_json],
    ["Evidence CSV", exports.evidence_csv],
    ["Visible Extracts CSV", exports.extracts_csv],
    ["Gap Closure CSV", exports.gap_closure_csv],
    ["OCR Queue CSV", exports.ocr_queue_csv],
    ["Story Briefs", exports.story_markdown],
    ["Full Corpus Stories MD", storyArtifacts.story_briefs_markdown],
    ["Full Corpus Stories CSV", storyArtifacts.story_briefs_csv],
    ["Full Corpus Stories JSON", storyArtifacts.story_briefs_json],
  ].filter(([, href]) => href);
  els.exportLinks.innerHTML = rows.length
    ? rows.map(([label, href]) => `<a href="${escapeHtml(navigatorArtifactHref(href))}">${escapeHtml(label)}</a>`).join("")
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
  renderCorpusHandoff();
  renderCorpusDirectory();
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
    renderCorpusDirectory();
  });
  els.corpusMode?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-corpus-mode]");
    if (!button) return;
    state.corpusMode = button.dataset.corpusMode || "full";
    const modeRows = productRowsForMode();
    if (modeRows.length && !modeRows.some((row) => row.id === state.productId)) {
      state.productId = modeRows[0].id;
      state.versionId = "";
    }
    render();
  });
  els.productStrip.addEventListener("click", (event) => {
    const button = event.target.closest("[data-product-id]");
    if (!button || button.disabled) return;
    state.productId = button.dataset.productId;
    state.versionId = "";
    render();
  });
  els.corpusDirectory?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-product-id]");
    if (!button || button.disabled) return;
    state.productId = button.dataset.productId;
    state.versionId = "";
    render();
  });
  els.corpusHandoff?.addEventListener("click", (event) => {
    const modeButton = event.target.closest("[data-corpus-mode-jump]");
    if (modeButton) {
      state.corpusMode = modeButton.dataset.corpusModeJump || "full";
      const modeRows = productRowsForMode();
      if (modeRows.length && !modeRows.some((row) => row.id === state.productId)) {
        state.productId = modeRows[0].id;
        state.versionId = "";
      }
      render();
      return;
    }
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
    const [response, summary, photoProofManifest] = await Promise.all([
      fetch(dataHref("../data/product-evidence/navigator_data.json")),
      fetch(dataHref("../data/product-evidence/summary.json"))
        .then((summaryResponse) => (summaryResponse.ok ? summaryResponse.json() : {}))
        .catch(() => ({})),
      fetch(dataHref("../data/product-evidence/public_photo_proof_manifest.json"))
        .then((manifestResponse) => (manifestResponse.ok ? manifestResponse.json() : {}))
        .catch(() => ({})),
    ]);
    if (!response.ok) throw new Error(`Navigator data returned ${response.status}`);
    state.data = await response.json();
    state.summary = summary;
    applyPhotoProofManifest(photoProofManifest);
    state.productId = state.data.default_product;
    state.maxYear = Number(els.timeRange.value || 2026);
    attachEvents();
    render();
  } catch (error) {
    els.status.innerHTML = `<strong>Could not load navigator data</strong><span>${escapeHtml(error.message)}</span>`;
  }
}

init();
