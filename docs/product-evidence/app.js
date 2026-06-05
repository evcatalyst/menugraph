const state = {
  data: null,
  search: "",
  category: "",
  surface: "",
  status: "",
};

const els = {
  status: document.querySelector("#status"),
  metrics: document.querySelector("#metrics"),
  storySummary: document.querySelector("#story-summary"),
  storyRows: document.querySelector("#story-rows"),
  storyCount: document.querySelector("#story-count"),
  search: document.querySelector("#search"),
  category: document.querySelector("#category-filter"),
  surface: document.querySelector("#surface-filter"),
  statusFilter: document.querySelector("#status-filter"),
  scaleProducts: document.querySelector("#scale-product-rows"),
  scaleCategories: document.querySelector("#scale-category-rows"),
  scaleDomains: document.querySelector("#scale-domain-rows"),
  scaleCount: document.querySelector("#scale-count"),
  vintageLegend: document.querySelector("#vintage-legend"),
  productRows: document.querySelector("#product-rows"),
  productCount: document.querySelector("#product-count"),
  sourceBars: document.querySelector("#source-bars"),
  gapRows: document.querySelector("#gap-rows"),
  gapCount: document.querySelector("#gap-count"),
  coverageSummary: document.querySelector("#coverage-summary"),
  registrySummary: document.querySelector("#registry-summary"),
  registryRows: document.querySelector("#registry-rows"),
  registryCount: document.querySelector("#registry-count"),
  campaignRows: document.querySelector("#campaign-rows"),
  campaignCount: document.querySelector("#campaign-count"),
  searchTaskRows: document.querySelector("#search-task-rows"),
  searchTaskCount: document.querySelector("#search-task-count"),
  queueRows: document.querySelector("#queue-rows"),
  queueCount: document.querySelector("#queue-count"),
  photoRows: document.querySelector("#photo-rows"),
  photoCount: document.querySelector("#photo-count"),
  sweepRows: document.querySelector("#sweep-rows"),
  sweepCount: document.querySelector("#sweep-count"),
  runLogRows: document.querySelector("#run-log-rows"),
  runLogCount: document.querySelector("#run-log-count"),
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
  discovered: "Discovered",
  source_review: "Source Review",
  usable_photo: "Usable Photo",
  label_visible: "Label Visible",
  ocr_extracted: "OCR",
  manual_verified: "Verified",
  rejected: "Rejected",
  candidates_inserted: "Candidates",
  query_errors: "Query Errors",
  records_seen: "Records Seen",
  empty_result: "Empty Result",
  search_backlog: "Search Backlog",
  missing_vintage_slot: "Missing Vintage",
  needs_source_discovery: "Needs Source Discovery",
  no_candidate: "No Candidate",
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

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function linkList(value, label = "Open", limit = 3) {
  return splitParts(value, limit)
    .map((part, index) => linkOrText(part, `${label}${limit > 1 ? ` ${index + 1}` : ""}`))
    .filter(Boolean)
    .join("");
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

function formatJsonBlock(value) {
  if (!value) return "";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch (_error) {
    return String(value);
  }
}

function statusTag(value, extraClass = "") {
  return `<span class="status-tag ${escapeHtml(extraClass)}">${escapeHtml(labelFor(value))}</span>`;
}

function pluralize(value, noun) {
  const count = Number(value || 0);
  return `${formatNumber(count)} ${noun}${count === 1 ? "" : "s"}`;
}

function clipped(value, limit = 180) {
  const text = String(value || "").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trim()}...`;
}

function uniqueValues(values, limit = 5) {
  const seen = new Set();
  const output = [];
  values.forEach((value) => {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    output.push(text);
  });
  return output.slice(0, limit);
}

function filtersActive() {
  return Boolean(state.search.trim() || state.category || state.surface || state.status);
}

function productEvidenceRows(product) {
  const canonical = product?.canonical_name || "";
  const display = product?.display_name || "";
  return (state.data.evidence_registry || []).filter((row) => (
    row.canonical_name === canonical || row.display_name === display
  ));
}

function productMatchesStoryFilters(product) {
  if (!passesProduct(product)) return false;
  if (!state.status) return true;
  const statuses = Object.values(product.vintage_statuses || {}).map((row) => row.status);
  if (statuses.includes(state.status) || product.collection_track === state.status) return true;
  return productEvidenceRows(product).some((row) => (
    row.evidence_status === state.status ||
    row.claim_link_status === state.status ||
    row.registry_record_type === state.status ||
    row.source_attribution_status === state.status
  ));
}

function registryCount(rows, status, metricKey = "") {
  if (!filtersActive() && metricKey && state.data.metrics[metricKey] !== undefined) {
    return numeric(state.data.metrics[metricKey]);
  }
  return rows.filter((row) => row.evidence_status === status).length;
}

function storyLinks(values, label = "Source", limit = 3) {
  return uniqueValues(values.flatMap((value) => splitParts(value, limit * 2)), limit)
    .map((value, index) => linkOrText(value, `${label}${limit > 1 ? ` ${index + 1}` : ""}`))
    .join("");
}

function storySourcePath(product, evidenceRows) {
  return uniqueValues([
    ...splitParts(product.top_source_domains, 8),
    ...evidenceRows.map((row) => row.source_domain),
  ], 5);
}

function productVintageCells(product) {
  return state.data.vintages
    .map((vintage) => {
      const info = product.vintage_statuses[vintage] || { status: "unknown", source_count: 0 };
      const status = info.status || "unknown";
      return `<span class="story-vintage status-${escapeHtml(status)}" title="${escapeHtml(vintage)}: ${escapeHtml(status)}">${escapeHtml(vintageLabels[vintage] || vintage)}</span>`;
    })
    .join("");
}

function storyEvidencePreview(rows) {
  const previewRows = rows
    .filter((row) => row.source_url || row.unsupported_gap_note || row.reviewer_notes)
    .slice(0, 2);
  if (!previewRows.length) return "";
  return `
    <div class="story-evidence-list">
      ${previewRows
        .map((row) => `
          <div>
            <strong>${escapeHtml(row.vintage_label || row.evidence_kind || "Evidence")}</strong>
            <span>${escapeHtml(clipped(row.reviewer_notes || row.unsupported_gap_note || row.promotion_blocker, 120))}</span>
          </div>
        `)
        .join("")}
    </div>
  `;
}

function productStoryScore(row) {
  const name = `${row.display_name || ""} ${row.canonical_name || ""}`.toLowerCase();
  return (
    (name.includes("oreo") ? 5000 : 0) +
    numeric(row.collection_opportunity_score) +
    numeric(row.target_priority) +
    numeric(row.product_candidate_count) * 4 +
    (row.missing_vintages ? 180 : 0) +
    (row.panel_needed_vintages ? 120 : 0) -
    numeric(row.ground_truth_slots) * 40
  );
}

function textBlob(row) {
  return Object.values(row).join(" ").toLowerCase();
}

function runLogStatus(row) {
  if (Number(row.candidates_inserted || 0) > 0) return "candidates_inserted";
  if (Number(row.query_errors || 0) > 0) return "query_errors";
  if (Number(row.records_seen || 0) > 0) return "records_seen";
  return "empty_result";
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

function weakCoverageProducts() {
  return state.data.products
    .filter(passesProduct)
    .filter((row) => numeric(row.slot_coverage_pct) < 70 || numeric(row.slots_without_sources) > 0)
    .sort((a, b) => {
      const coverageDelta = numeric(a.slot_coverage_pct) - numeric(b.slot_coverage_pct);
      if (coverageDelta) return coverageDelta;
      const priorityDelta = numeric(b.target_priority) - numeric(a.target_priority);
      if (priorityDelta) return priorityDelta;
      return numeric(b.collection_opportunity_score) - numeric(a.collection_opportunity_score);
    });
}

function passesCampaign(row) {
  const query = state.search.trim().toLowerCase();
  if (state.category && !String(row.categories || "").split(";").includes(state.category)) return false;
  if (state.surface && row.search_surface !== state.surface) return false;
  if (state.status && row.packet_status !== state.status && row.campaign_status !== state.status) return false;
  if (query && !textBlob(row).includes(query)) return false;
  return true;
}

function categoryPriorityRows(products) {
  const groups = new Map();
  products.forEach((row) => {
    const category = row.category || "uncategorized";
    const group = groups.get(category) || {
      category,
      products: 0,
      weakProducts: 0,
      missingSlots: 0,
      candidates: 0,
      coverageTotal: 0,
      topProducts: [],
    };
    const coverage = numeric(row.slot_coverage_pct);
    group.products += 1;
    group.coverageTotal += coverage;
    group.candidates += numeric(row.product_candidate_count);
    group.missingSlots += numeric(row.slots_without_sources);
    if (coverage < 50) group.weakProducts += 1;
    if (coverage < 70 || numeric(row.slots_without_sources) > 0) {
      group.topProducts.push(row.display_name || row.canonical_name);
    }
    groups.set(category, group);
  });
  return [...groups.values()]
    .map((row) => ({
      ...row,
      avgCoverage: row.products ? row.coverageTotal / row.products : 0,
      topProducts: row.topProducts.slice(0, 5),
    }))
    .sort((a, b) => {
      const weakDelta = b.weakProducts - a.weakProducts;
      if (weakDelta) return weakDelta;
      const missingDelta = b.missingSlots - a.missingSlots;
      if (missingDelta) return missingDelta;
      return a.avgCoverage - b.avgCoverage;
    })
    .slice(0, 10);
}

function domainPriorityRows() {
  const query = state.search.trim().toLowerCase();
  const groups = new Map();
  (state.data.evidence_registry || []).forEach((row) => {
    if (state.category && row.category !== state.category) return;
    if (
      state.status &&
      row.evidence_status !== state.status &&
      row.registry_record_type !== state.status &&
      row.claim_link_status !== state.status
    ) {
      return;
    }
    if (query && !textBlob(row).includes(query)) return;
    const domain = row.source_domain || "";
    if (!domain) return;
    const group = groups.get(domain) || {
      domain,
      products: new Set(),
      categories: new Set(),
      rows: 0,
      labelVisible: 0,
      sourceReview: 0,
      usablePhoto: 0,
      discovered: 0,
      maxPriority: 0,
    };
    group.rows += 1;
    group.products.add(row.canonical_name || row.display_name || "");
    group.categories.add(row.category || "");
    group.maxPriority = Math.max(group.maxPriority, numeric(row.registry_priority));
    if (row.evidence_status === "label_visible") group.labelVisible += 1;
    if (row.evidence_status === "source_review") group.sourceReview += 1;
    if (row.evidence_status === "usable_photo") group.usablePhoto += 1;
    if (row.evidence_status === "discovered") group.discovered += 1;
    groups.set(domain, group);
  });
  return [...groups.values()]
    .map((row) => ({
      ...row,
      productCount: [...row.products].filter(Boolean).length,
      categoryCount: [...row.categories].filter(Boolean).length,
    }))
    .filter((row) => row.productCount > 1 || row.rows > 4)
    .sort((a, b) => {
      const productDelta = b.productCount - a.productCount;
      if (productDelta) return productDelta;
      const labelDelta = b.labelVisible - a.labelVisible;
      if (labelDelta) return labelDelta;
      return b.maxPriority - a.maxPriority;
    })
    .slice(0, 14);
}

function passesSearchTask(row) {
  const query = state.search.trim().toLowerCase();
  if (state.category && row.category !== state.category) return false;
  if (state.surface && row.search_surface !== state.surface) return false;
  if (state.status && row.review_stage !== state.status) return false;
  if (query && !textBlob(row).includes(query)) return false;
  return true;
}

function passesGap(row) {
  const query = state.search.trim().toLowerCase();
  if (state.category && row.category !== state.category) return false;
  if (state.surface && row.search_surface !== state.surface) return false;
  if (
    state.status &&
    row.review_stage !== state.status &&
    row.summary_type !== state.status &&
    row.next_verification_gap !== state.status
  ) {
    return false;
  }
  if (query && !textBlob(row).includes(query)) return false;
  return true;
}

function passesPhoto(row) {
  const query = state.search.trim().toLowerCase();
  if (state.category && row.category !== state.category) return false;
  if (query && !textBlob(row).includes(query)) return false;
  return true;
}

function passesRegistry(row) {
  const query = state.search.trim().toLowerCase();
  if (state.category && row.category !== state.category) return false;
  if (
    state.status &&
    row.evidence_status !== state.status &&
    row.registry_record_type !== state.status &&
    row.claim_link_status !== state.status
  ) {
    return false;
  }
  if (query && !textBlob(row).includes(query)) return false;
  return true;
}

function passesRunLog(row) {
  const query = state.search.trim().toLowerCase();
  if (state.status && runLogStatus(row) !== state.status) return false;
  if (query && !textBlob(row).includes(query)) return false;
  return true;
}

function renderMetrics() {
  const metrics = state.data.metrics;
  const cards = [
    ["Products", metrics.targets],
    ["Candidates", metrics.candidates],
    ["Photo Evidence", metrics.photo_evidence_rows],
    ["Registry Records", metrics.evidence_registry_rows || state.data.evidence_registry?.length || 0],
    ["Unsupported Gaps", metrics.unsupported_gap_records || 0],
    ["Acquisition Rows", metrics.acquisition_rows],
    ["Campaign Packets", metrics.collection_campaign_packets],
    ["Mass Search Tasks", metrics.mass_search_tasks],
    ["CDX Runs", metrics.common_crawl_run_logs],
    ["Source Review", metrics.source_review_ready],
    ["Current-Web Search", metrics.current_web_search_ready],
    ["CDX Retry", metrics.cdx_retry_ready],
    ["CDX Sweep", metrics.cdx_sweep_ready],
  ];
  els.metrics.innerHTML = cards
    .map(([label, value]) => `<article class="metric"><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></article>`)
    .join("");
}

function boardStoryCards(registryRows, productRows) {
  const metrics = state.data.metrics;
  const unsupportedCount = !filtersActive()
    ? numeric(metrics.unsupported_gap_records)
    : registryRows.filter((row) => row.registry_record_type === "unsupported_gap").length;
  const sourceReviewCount = registryCount(registryRows, "source_review", "source_review_records");
  const usablePhotoCount = registryCount(registryRows, "usable_photo", "usable_photo_records");
  const labelVisibleCount = registryCount(registryRows, "label_visible", "label_visible_records");
  const manualVerifiedCount = registryCount(registryRows, "manual_verified", "manual_verified_records");
  const cards = [
    {
      kicker: "Evidence Gate",
      title: "Formulation claims are still gated by visible labels",
      body: `${pluralize(unsupportedCount, "claim")} remain explicit gaps, while ${pluralize(sourceReviewCount + usablePhotoCount + labelVisibleCount, "record")} are parked at source review, usable-photo, or label-visible states. Candidate photos help the story only after a readable ingredient panel or reviewed transcription is attached.`,
      stats: [
        ["Unsupported", unsupportedCount],
        ["Review/photo", sourceReviewCount + usablePhotoCount],
        ["Manual verified", manualVerifiedCount],
      ],
      chips: ["discovered", "source_review", "usable_photo", "manual_verified"],
      action: "Promote only source-attributable photos with visible ingredient panels into OCR or manual transcription.",
    },
  ];

  const oreo = state.data.products.find((row) => /oreo/i.test(`${row.display_name || ""} ${row.canonical_name || ""}`));
  if (oreo && productMatchesStoryFilters(oreo)) {
    const evidenceRows = productEvidenceRows(oreo).filter((row) => !state.status || passesRegistry(row));
    const sourcePath = storySourcePath(oreo, evidenceRows);
    cards.push({
      kicker: "Oreo Thread",
      title: "Oreo has package leads, but the ingredient-change story is not verified yet",
      body: `${oreo.display_name} has source leads across ${pluralize(oreo.slots_with_sources, "vintage slot")} and ${pluralize(oreo.product_candidate_count, "candidate")}. The current snapshot still blocks the original-to-current ingredient narrative because readable panels or transcriptions are needed for ${oreo.panel_needed_vintages || "the vintage slots"}.`,
      stats: [
        ["Coverage", `${oreo.slot_coverage_pct || 0}%`],
        ["Candidates", oreo.product_candidate_count],
        ["Ground truth", oreo.ground_truth_slots],
      ],
      chips: [oreo.collection_track, oreo.missing_vintages ? "missing_vintage_slot" : "candidate_found", "candidate_needs_transcription"],
      action: oreo.recommended_next_action || "Review source pages, classify panel roles, then attach label text only when readable.",
      links: storyLinks([oreo.best_source_urls, ...evidenceRows.map((row) => row.source_url)], "Source", 3),
      sourcePath,
      product: oreo,
      evidenceRows,
      featured: true,
      productCanonical: oreo.canonical_name,
    });
  }

  const fastFoodProducts = productRows.filter((row) => row.category === "fast food");
  const fastFoodManifests = (state.data.current_web_harvest_manifest || [])
    .filter((row) => row.category === "fast food")
    .filter((row) => !state.surface || row.search_surface === state.surface)
    .filter((row) => !state.status || row.manifest_status === state.status)
    .filter((row) => !state.search.trim() || textBlob(row).includes(state.search.trim().toLowerCase()));
  if (fastFoodProducts.length || fastFoodManifests.length) {
    cards.push({
      kicker: "Fast Food",
      title: "Restaurant products need document provenance as much as package provenance",
      body: `Fast-food histories route through menu pages, nutrition PDFs, allergen PDFs, archived pages, and packaging where available. The view keeps those document trails separate from package-photo evidence so a Big Mac or McNuggets timeline is not collapsed into an unverified package-label claim.`,
      stats: [
        ["Products", fastFoodProducts.length],
        ["Manifests", fastFoodManifests.length],
        ["Search starts", fastFoodManifests.reduce((sum, row) => sum + splitParts(row.browser_batch_urls, 200).length, 0)],
      ],
      chips: ["current_web_search", "source_review", "missing_vintage_slot"],
      action: "Verify product identity, source owner, date basis, and ingredient/allergen disclosure before turning menu evidence into a formulation version.",
      links: storyLinks(fastFoodManifests.map((row) => row.browser_batch_urls), "Start", 3),
    });
  }

  const photoRows = state.data.photo_evidence.filter(passesPhoto);
  const weightReady = photoRows.filter((row) => numeric(row.net_weight_visible) || row.net_weight_text || row.serving_size_text);
  const weightMissing = photoRows.filter((row) => String(row.ground_truth_fields_missing || "").includes("package_weight"));
  if (photoRows.length) {
    cards.push({
      kicker: "Price + Size",
      title: "Economic overlays need the same ground-truth package fields",
      body: `Price normalization cannot rely on a product name alone. The board tracks package weight, serving size, manufacturer/distributor text, and source coordinates beside the ingredient evidence so later price-per-ounce and price-per-serving views can be compared against formulation changes.`,
      stats: [
        ["Photo leads", photoRows.length],
        ["Weight ready", weightReady.length],
        ["Weight gaps", weightMissing.length],
      ],
      chips: ["usable_photo", "candidate_needs_panel", "candidate_needs_transcription"],
      action: "Capture net weight and serving-size text whenever a package panel is readable; keep SKU/package-format differences separate.",
    });
  }

  const runRows = (state.data.common_crawl_run_logs || []).filter(passesRunLog);
  if (runRows.length) {
    const queryErrors = runRows.reduce((sum, row) => sum + numeric(row.query_errors), 0);
    const candidates = runRows.reduce((sum, row) => sum + numeric(row.candidates_inserted), 0);
    const latest = runRows[0] || {};
    cards.push({
      kicker: "Archive Discovery",
      title: "Common Crawl is discovery signal, not ground truth",
      body: `Recent crawl attempts record ${pluralize(queryErrors, "query error")} and ${pluralize(candidates, "inserted candidate")}. That telemetry explains search friction and source opportunity, but it does not assert ingredient facts until a capture is tied to product identity, date, and visible label evidence.`,
      stats: [
        ["Runs", runRows.length],
        ["Records seen", runRows.reduce((sum, row) => sum + numeric(row.records_seen), 0)],
        ["Inserted", candidates],
      ],
      chips: [runLogStatus(latest), latest.command || "common_crawl"],
      action: latest.error_sample || "Inspect returned captures, dedupe URLs, and promote only product-relevant WARC-coordinate candidates.",
      links: storyLinks([latest.log_path, latest.query_errors_path], "File", 2),
    });
  }

  return cards;
}

function productStoryCards(skipCanonicals = new Set()) {
  return state.data.products
    .filter(productMatchesStoryFilters)
    .filter((row) => !skipCanonicals.has(row.canonical_name))
    .sort((a, b) => productStoryScore(b) - productStoryScore(a))
    .slice(0, 6)
    .map((product) => {
      const evidenceRows = productEvidenceRows(product).filter((row) => !state.status || passesRegistry(row));
      const sourcePath = storySourcePath(product, evidenceRows);
      const blocker = product.missing_vintages
        ? `Missing source slots: ${product.missing_vintages}.`
        : `Panel or transcription needed: ${product.panel_needed_vintages || "review current evidence"}.`;
      return {
        kicker: labelFor(product.category || "Product"),
        title: product.display_name || product.canonical_name,
        body: `${blocker} ${numeric(product.ground_truth_slots) ? "Some ground-truth slots exist in the product map." : "No verified ingredient statement is shown for this product in this snapshot."}`,
        stats: [
          ["Coverage", `${product.slot_coverage_pct || 0}%`],
          ["Sources", product.scout_source_count],
          ["Candidates", product.product_candidate_count],
        ],
        chips: [product.collection_track, product.missing_vintages ? "missing_vintage_slot" : "candidate_found"],
        action: product.recommended_next_action || "Classify visible panels, archive source URLs, and attach verified label text where readable.",
        links: storyLinks([product.best_source_urls, ...evidenceRows.map((row) => row.source_url)], "Source", 2),
        sourcePath,
        product,
        evidenceRows,
      };
    });
}

function renderStorylines() {
  const registryRows = (state.data.evidence_registry || []).filter(passesRegistry);
  const productRows = state.data.products.filter(productMatchesStoryFilters);
  const unsupportedCount = !filtersActive()
    ? numeric(state.data.metrics.unsupported_gap_records)
    : registryRows.filter((row) => row.registry_record_type === "unsupported_gap").length;
  const reviewCount =
    registryCount(registryRows, "source_review", "source_review_records") +
    registryCount(registryRows, "usable_photo", "usable_photo_records") +
    registryCount(registryRows, "label_visible", "label_visible_records");
  const manualVerified = registryCount(registryRows, "manual_verified", "manual_verified_records");
  const cdxRuns = state.data.common_crawl_run_logs.filter(passesRunLog).length;
  const boardCards = boardStoryCards(registryRows, productRows);
  const skipCanonicals = new Set(boardCards.map((card) => card.productCanonical).filter(Boolean));
  const productCards = productStoryCards(skipCanonicals);
  const cards = [...boardCards, ...productCards];

  els.storyCount.textContent = `${formatNumber(cards.length)} stories`;
  els.storySummary.innerHTML = [
    ["Open gaps", unsupportedCount],
    ["Review/photo leads", reviewCount],
    ["Verified labels", manualVerified],
    ["CDX runs", cdxRuns],
  ]
    .map(([label, value]) => `
      <article class="story-stat">
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </article>
    `)
    .join("");

  els.storyRows.innerHTML = cards
    .map((card) => `
      <article class="story-card ${card.featured ? "story-featured" : ""}">
        <div class="story-card-head">
          <div>
            <p class="eyebrow">${escapeHtml(card.kicker)}</p>
            <h3>${escapeHtml(card.title)}</h3>
          </div>
        </div>
        <p>${escapeHtml(card.body)}</p>
        <div class="story-stat-grid">
          ${card.stats
            .map(([label, value]) => `
              <span><strong>${escapeHtml(value)}</strong>${escapeHtml(label)}</span>
            `)
            .join("")}
        </div>
        ${card.product ? `<div class="story-vintage-grid">${productVintageCells(card.product)}</div>` : ""}
        ${card.sourcePath?.length ? `
          <div class="story-source-path">
            ${card.sourcePath.map((source) => `<span>${escapeHtml(source)}</span>`).join("")}
          </div>
        ` : ""}
        ${storyEvidencePreview(card.evidenceRows || [])}
        <div class="lead-meta">
          ${(card.chips || []).filter(Boolean).map((chip) => statusTag(chip)).join("")}
          ${card.links || ""}
        </div>
        <div class="story-action"><strong>Next</strong><span>${escapeHtml(card.action)}</span></div>
      </article>
    `)
    .join("");
}

function renderFilters() {
  const categories = [...new Set(state.data.products.map((row) => row.category).filter(Boolean))].sort();
  const surfaces = [
    ...new Set([
      ...state.data.acquisition_queue.map((row) => row.acquisition_surface).filter(Boolean),
      ...(state.data.gap_summary || []).map((row) => row.search_surface).filter(Boolean),
      ...(state.data.collection_campaign_packets || []).map((row) => row.search_surface).filter(Boolean),
      ...(state.data.mass_search_tasks || []).map((row) => row.search_surface).filter(Boolean),
    ]),
  ].sort();
  const statuses = [
    ...new Set([
      ...state.data.acquisition_queue.map((row) => row.acquisition_status).filter(Boolean),
      ...(state.data.evidence_registry || []).map((row) => row.evidence_status).filter(Boolean),
      ...(state.data.collection_campaign_packets || []).map((row) => row.packet_status).filter(Boolean),
      ...(state.data.collection_campaigns || []).map((row) => row.campaign_status).filter(Boolean),
      ...(state.data.mass_search_tasks || []).map((row) => row.review_stage).filter(Boolean),
      ...(state.data.gap_summary || []).map((row) => row.review_stage).filter(Boolean),
      ...(state.data.gap_summary || []).map((row) => row.summary_type).filter(Boolean),
      ...(state.data.gap_summary || []).map((row) => row.next_verification_gap).filter(Boolean),
      ...(state.data.common_crawl_run_logs || []).map(runLogStatus).filter(Boolean),
    ]),
  ].sort();
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

function renderCoverageSummary() {
  const rows = state.data.coverage_summary || [];
  els.coverageSummary.innerHTML = rows
    .map((row) => `
      <article class="coverage-stat">
        <strong>${escapeHtml(row.value)}</strong>
        <span>${escapeHtml(labelFor(row.metric))}</span>
      </article>
    `)
    .join("");
}

function renderScalePriorities() {
  const weakProducts = weakCoverageProducts().slice(0, 12);
  const categories = categoryPriorityRows(state.data.products.filter(passesProduct));
  const domains = domainPriorityRows();
  els.scaleCount.textContent = `${formatNumber(weakProducts.length + categories.length + domains.length)} lanes`;

  els.scaleProducts.innerHTML = weakProducts
    .map((row) => {
      const bestUrl = firstPart(row.best_source_urls || row.starter_search_urls || row.starter_image_urls);
      return `
        <article class="scale-card">
          <div class="scale-title">
            <strong>${escapeHtml(row.display_name || row.canonical_name)}</strong>
            <span>${escapeHtml(row.category || "")} · ${escapeHtml(row.slot_coverage_pct)}% coverage</span>
          </div>
          <div class="scale-meter" aria-hidden="true">
            <span style="width:${Math.max(3, Math.min(100, numeric(row.slot_coverage_pct)))}%"></span>
          </div>
          <p>${escapeHtml(row.recommended_next_action || "Collect attributable source pages and classify visible panels.")}</p>
          <div class="lead-meta">
            ${statusTag(row.collection_track)}
            ${statusTag(row.missing_vintages ? "missing_vintage_slot" : "candidate_found")}
            ${linkOrText(bestUrl, "Source")}
          </div>
          <div class="small">${escapeHtml(row.missing_vintages ? `Missing: ${row.missing_vintages}` : `Needs panels: ${row.panel_needed_vintages || "review"}`)}</div>
        </article>
      `;
    })
    .join("");

  els.scaleCategories.innerHTML = categories
    .map((row) => `
      <article class="scale-card">
        <div class="scale-title">
          <strong>${escapeHtml(labelFor(row.category))}</strong>
          <span>${formatNumber(row.products)} products · ${row.avgCoverage.toFixed(1)}% avg coverage</span>
        </div>
        <div class="scale-stat-grid">
          <span><strong>${formatNumber(row.weakProducts)}</strong> weak</span>
          <span><strong>${formatNumber(row.missingSlots)}</strong> open slots</span>
          <span><strong>${formatNumber(row.candidates)}</strong> candidates</span>
        </div>
        <p>${escapeHtml(row.topProducts.join("; "))}</p>
      </article>
    `)
    .join("");

  els.scaleDomains.innerHTML = domains
    .map((row) => `
      <article class="scale-card">
        <div class="scale-title">
          <strong>${escapeHtml(row.domain)}</strong>
          <span>${formatNumber(row.productCount)} products · ${formatNumber(row.rows)} records</span>
        </div>
        <div class="scale-stat-grid">
          <span><strong>${formatNumber(row.labelVisible)}</strong> labels</span>
          <span><strong>${formatNumber(row.usablePhoto)}</strong> photos</span>
          <span><strong>${formatNumber(row.sourceReview)}</strong> review</span>
        </div>
        <div class="lead-meta">
          ${statusTag(row.discovered ? "discovered" : "source_review")}
          <span class="status-tag">${formatNumber(row.categoryCount)} categories</span>
        </div>
      </article>
    `)
    .join("");
}

function renderGaps() {
  const rows = (state.data.gap_summary || [])
    .filter(passesGap)
    .sort((a, b) => Number(b.max_priority || 0) - Number(a.max_priority || 0))
    .slice(0, 80);
  els.gapCount.textContent = `${formatNumber(rows.length)} gaps`;
  els.gapRows.innerHTML = rows
    .map((row) => {
      const gapText = row.next_verification_gap || row.review_stage || row.summary_type || "";
      return `
        <article class="gap-card">
          <div class="campaign-head">
            <div>
              <strong>${escapeHtml(row.source_name || row.source_key || "Evidence source")}</strong>
              <span>${escapeHtml(row.category || "")} · ${escapeHtml(row.vintage_label || "")}</span>
            </div>
            <span class="priority-badge">${formatNumber(row.max_priority)}</span>
          </div>
          <p>${escapeHtml(gapText ? labelFor(gapText) : "Source discovery backlog")}</p>
          <div class="campaign-stats">
            <span>${formatNumber(row.product_count)} products</span>
            <span>${formatNumber(row.search_task_count)} searches</span>
            <span>${formatNumber(row.slot_count)} slots</span>
          </div>
          <div class="campaign-products">${escapeHtml(row.top_products || "")}</div>
          <div class="lead-meta">
            ${statusTag(row.summary_type)}
            ${statusTag(row.review_stage)}
            ${statusTag(row.search_surface)}
            ${statusTag(row.source_kind)}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderRegistrySummary() {
  const rows = state.data.evidence_registry || [];
  const workflow = state.data.evidence_registry_status_workflow || [
    "discovered",
    "source_review",
    "usable_photo",
    "label_visible",
    "ocr_extracted",
    "manual_verified",
    "rejected",
  ];
  const counts = rows.reduce((acc, row) => {
    const status = row.evidence_status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  els.registrySummary.innerHTML = workflow
    .map((status) => `
      <article class="registry-stat status-${escapeHtml(status)}">
        <strong>${formatNumber(counts[status] || 0)}</strong>
        <span>${escapeHtml(statusLabels[status] || labelFor(status))}</span>
      </article>
    `)
    .join("");
}

function renderRegistry() {
  const rows = (state.data.evidence_registry || []).filter(passesRegistry).slice(0, 140);
  els.registryCount.textContent = `${formatNumber(rows.length)} records`;
  els.registryRows.innerHTML = rows
    .map((row) => {
      const source = row.source_url ? linkOrText(row.source_url, row.source_domain || "Source") : `<span class="gap-label">Unsupported gap</span>`;
      const note = row.unsupported_gap_note || row.reviewer_notes || row.promotion_blocker || "";
      return `
        <article class="registry-item">
          <div class="registry-main">
            <strong>${escapeHtml(row.display_name || row.canonical_name)}</strong>
            <span>${escapeHtml(row.vintage_label || "")} · ${escapeHtml(row.evidence_kind || "")} · ${escapeHtml(row.claimed_product_date_text || "")}</span>
          </div>
          <p>${escapeHtml(note)}</p>
          <div class="lead-meta">
            ${statusTag(row.evidence_status, `evidence-${row.evidence_status}`)}
            ${statusTag(row.claim_link_status)}
            ${statusTag(row.source_attribution_status || row.source_surface)}
            ${source}
          </div>
          <div class="registry-provenance">
            <span>${escapeHtml(row.source_title || "")}</span>
            <span>${escapeHtml(row.source_publisher_owner || "")}</span>
            <span>${escapeHtml(row.license_rights_note || "")}</span>
            <span>${escapeHtml(row.archive_id || row.capture_date_text || "")}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCampaigns() {
  const rows = (state.data.collection_campaign_packets || []).filter(passesCampaign).slice(0, 30);
  els.campaignCount.textContent = `${formatNumber(rows.length)} packets`;
  els.campaignRows.innerHTML = rows
    .map((row) => {
      const template = formatJsonBlock(row.candidate_jsonl_template);
      return `
        <article class="campaign-card">
          <div class="campaign-head">
            <div>
              <strong>${escapeHtml(row.source_name || row.source_key)}</strong>
              <span>${escapeHtml(labelFor(row.search_surface))} · ${escapeHtml(labelFor(row.source_kind))}</span>
            </div>
            <span class="priority-badge">${formatNumber(row.campaign_priority)}</span>
          </div>
          <p>${escapeHtml(row.operator_goal || "")}</p>
          <div class="campaign-stats">
            <span>${formatNumber(row.product_count)} products</span>
            <span>${formatNumber(row.slot_count)} slots</span>
            <span>${formatNumber(row.search_task_count)} searches</span>
          </div>
          <div class="small">${escapeHtml(row.categories || "")}</div>
          <div class="campaign-products">${escapeHtml(row.top_products || "")}</div>
          <div class="lead-meta">
            ${statusTag(row.packet_status)}
            ${statusTag(row.source_attribution_grade)}
            ${linkList(row.search_urls_to_start, "Search", 2)}
            ${linkList(row.image_urls_to_start, "Image", 2)}
            ${linkOrText(firstPart(row.cli_hints), "CLI")}
          </div>
          <details>
            <summary>Packet</summary>
            <dl class="packet-fields">
              <dt>Accept</dt>
              <dd>${escapeHtml(row.acceptance_checklist || "")}</dd>
              <dt>Gate</dt>
              <dd>${escapeHtml(row.quality_gate || "")}</dd>
              <dt>Template</dt>
              <dd><pre>${escapeHtml(template)}</pre></dd>
            </dl>
          </details>
        </article>
      `;
    })
    .join("");
}

function renderSearchTasks() {
  const rows = (state.data.mass_search_tasks || [])
    .filter(passesSearchTask)
    .sort((a, b) => Number(b.task_priority || 0) - Number(a.task_priority || 0))
    .slice(0, 55);
  els.searchTaskCount.textContent = `${formatNumber(rows.length)} tasks`;
  els.searchTaskRows.innerHTML = rows
    .map((row) => `
      <article class="search-task">
        <div class="lead-title">
          <strong>${escapeHtml(row.display_name || row.canonical_name)}</strong>
          <span>${escapeHtml(row.vintage_label || "")} · ${escapeHtml(row.source_name || row.source_key || "")}</span>
        </div>
        <p>${escapeHtml(row.query_text || row.common_crawl_patterns || "")}</p>
        <div class="lead-meta">
          ${statusTag(row.search_surface)}
          ${statusTag(row.review_stage)}
          ${linkOrText(row.search_url, "Search")}
          ${linkOrText(row.image_search_url, "Images")}
          ${linkOrText(row.cli_hint, "CLI")}
        </div>
      </article>
    `)
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

function renderRunLogs() {
  const rows = (state.data.common_crawl_run_logs || [])
    .filter(passesRunLog)
    .slice(0, 30);
  els.runLogCount.textContent = `${formatNumber(rows.length)} runs`;
  els.runLogRows.innerHTML = rows
    .map((row) => {
      const recorded = row.recorded_at_utc ? new Date(row.recorded_at_utc).toLocaleString() : "unknown";
      return `
        <article class="run-log-item">
          <div class="lead-title">
            <strong>${escapeHtml(row.query_contains || row.command || "Common Crawl")}</strong>
            <span>${escapeHtml(recorded)}</span>
          </div>
          <div class="run-log-grid">
            <span><strong>${formatNumber(row.targets_considered)}</strong> targets</span>
            <span><strong>${formatNumber(row.queries_run)}</strong> queries</span>
            <span><strong>${formatNumber(row.query_errors)}</strong> errors</span>
            <span><strong>${formatNumber(row.records_seen)}</strong> seen</span>
            <span><strong>${formatNumber(row.records_rejected)}</strong> rejected</span>
            <span><strong>${formatNumber(row.candidates_inserted)}</strong> inserted</span>
          </div>
          <p>${escapeHtml(row.error_sample || "No error sample recorded.")}</p>
          <div class="lead-meta">
            ${statusTag(runLogStatus(row))}
            ${statusTag(row.command)}
            ${linkOrText(row.log_path, "Log")}
            ${linkOrText(row.query_errors_path, "Errors")}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderStatus() {
  const generated = state.data.generated_at_utc ? new Date(state.data.generated_at_utc).toLocaleString() : "unknown";
  els.status.innerHTML = `
    <strong>Snapshot loaded</strong>
    <span>${formatNumber(state.data.metrics.evidence_registry_rows || state.data.evidence_registry?.length || 0)} registry records and ${formatNumber(state.data.metrics.acquisition_rows)} acquisition rows from ${escapeHtml(state.data.source_run)} · generated ${escapeHtml(generated)}</span>
  `;
}

function render() {
  renderMetrics();
  renderStorylines();
  renderScalePriorities();
  renderLegend();
  renderProducts();
  renderSourceBars();
  renderCoverageSummary();
  renderGaps();
  renderCampaigns();
  renderSearchTasks();
  renderRegistrySummary();
  renderRegistry();
  renderQueue();
  renderPhotos();
  renderSweeps();
  renderRunLogs();
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
}

async function init() {
  try {
    const response = await fetch("../data/product-evidence/summary.json");
    if (!response.ok) throw new Error(`Snapshot returned ${response.status}`);
    state.data = await response.json();
    renderFilters();
    attachEvents();
    render();
  } catch (error) {
    els.status.innerHTML = `<strong>Could not load snapshot</strong><span>${escapeHtml(error.message)}</span>`;
  }
}

init();
