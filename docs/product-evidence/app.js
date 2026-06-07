const state = {
  data: null,
  search: "",
  category: "",
  surface: "",
  status: "",
  storyKey: "",
  storyLens: "ingredient",
  storyMode: "reader",
};

const els = {
  status: document.querySelector("#status"),
  metrics: document.querySelector("#metrics"),
  crawlHealth: document.querySelector("#crawl-health"),
  storyModeTitle: document.querySelector("#story-mode-title"),
  storyModeSummary: document.querySelector("#story-mode-summary"),
  storyModeTabs: document.querySelector("#story-mode-tabs"),
  storyModeHint: document.querySelector("#story-mode-hint"),
  storyPath: document.querySelector("#story-path"),
  storyGate: document.querySelector("#story-gate"),
  storyPacket: document.querySelector("#story-packet"),
  storyReview: document.querySelector("#story-review"),
  storyCover: document.querySelector("#story-cover"),
  storyFilmstrip: document.querySelector("#story-filmstrip"),
  storyArticle: document.querySelector("#story-article"),
  storyChapterBoard: document.querySelector("#story-chapter-board"),
  storyTrace: document.querySelector("#story-trace"),
  storyPhotoBoard: document.querySelector("#story-photo-board"),
  storyCaptionBoard: document.querySelector("#story-caption-board"),
  storyCompareStage: document.querySelector("#story-compare-stage"),
  storyMap: document.querySelector("#story-map"),
  storyFacets: document.querySelector("#story-facets"),
  storyReceipts: document.querySelector("#story-receipts"),
  corpusAtlasCount: document.querySelector("#corpus-atlas-count"),
  corpusStoryGuide: document.querySelector("#corpus-story-guide"),
  corpusStoryIssue: document.querySelector("#corpus-story-issue"),
  corpusStoryArcPreview: document.querySelector("#corpus-story-arc-preview"),
  corpusClusterRows: document.querySelector("#corpus-cluster-rows"),
  corpusLaneRows: document.querySelector("#corpus-lane-rows"),
  corpusSourceMissions: document.querySelector("#corpus-source-missions"),
  corpusCollectionWaves: document.querySelector("#corpus-collection-waves"),
  corpusStoryNetwork: document.querySelector("#corpus-story-network"),
  corpusStoryRoutes: document.querySelector("#corpus-story-routes"),
  corpusVisualEvidence: document.querySelector("#corpus-visual-evidence"),
  corpusStoryArcs: document.querySelector("#corpus-story-arcs"),
  corpusStoryBeats: document.querySelector("#corpus-story-beats"),
  corpusStoryDeck: document.querySelector("#corpus-story-deck"),
  corpusClaimBoundaries: document.querySelector("#corpus-claim-boundaries"),
  corpusPublicationQueue: document.querySelector("#corpus-publication-queue"),
  corpusStoryRisks: document.querySelector("#corpus-story-risks"),
  corpusNarrativeDashboard: document.querySelector("#corpus-narrative-dashboard"),
  corpusReaderFrontpage: document.querySelector("#corpus-reader-frontpage"),
  corpusStoryLibrary: document.querySelector("#corpus-story-library"),
  corpusStoryFlow: document.querySelector("#corpus-story-flow"),
  corpusStoryTimeline: document.querySelector("#corpus-story-timeline"),
  corpusPilotStoryboard: document.querySelector("#corpus-pilot-storyboard"),
  corpusEvidenceHeatmap: document.querySelector("#corpus-evidence-heatmap"),
  corpusProductConstellation: document.querySelector("#corpus-product-constellation"),
  corpusTaskGroupCount: document.querySelector("#corpus-task-group-count"),
  corpusTaskGroupRows: document.querySelector("#corpus-task-group-rows"),
  corpusSearchStartRows: document.querySelector("#corpus-search-start-rows"),
  corpusArchiveCommandRows: document.querySelector("#corpus-archive-command-rows"),
  storyDeskCount: document.querySelector("#story-desk-count"),
  readerLede: document.querySelector("#reader-lede"),
  readerReadiness: document.querySelector("#reader-readiness"),
  readerPillars: document.querySelector("#reader-pillars"),
  readerLensbar: document.querySelector("#reader-lensbar"),
  readerClusters: document.querySelector("#reader-clusters"),
  readerGallery: document.querySelector("#reader-gallery"),
  readerCompare: document.querySelector("#reader-compare"),
  readerSources: document.querySelector("#reader-sources"),
  readerMatrix: document.querySelector("#reader-matrix"),
  readerVisual: document.querySelector("#reader-visual"),
  readerScript: document.querySelector("#reader-script"),
  readerChapters: document.querySelector("#reader-chapters"),
  readerScenes: document.querySelector("#reader-scenes"),
  readerPreview: document.querySelector("#reader-preview"),
  readerStoryboard: document.querySelector("#reader-storyboard"),
  readerClaimLedger: document.querySelector("#reader-claim-ledger"),
  readerEraStrip: document.querySelector("#reader-era-strip"),
  readerLineup: document.querySelector("#reader-lineup"),
  readerUnlocks: document.querySelector("#reader-unlocks"),
  storySelector: document.querySelector("#story-selector"),
  storyFocus: document.querySelector("#story-focus"),
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
  corpusOcrCount: document.querySelector("#corpus-ocr-count"),
  corpusOcrSummary: document.querySelector("#corpus-ocr-summary"),
  corpusOcrGaps: document.querySelector("#corpus-ocr-gaps"),
  corpusOcrProducts: document.querySelector("#corpus-ocr-products"),
  photoProofUpgradeSummary: document.querySelector("#photo-proof-upgrade-summary"),
  photoProofUpgradeProducts: document.querySelector("#photo-proof-upgrade-products"),
  photoProofUpgradeQueue: document.querySelector("#photo-proof-upgrade-queue"),
  pilotPhotoCaptureSummary: document.querySelector("#pilot-photo-capture-summary"),
  pilotPhotoCaptureBatches: document.querySelector("#pilot-photo-capture-batches"),
  pilotCaptureDryRunSummary: document.querySelector("#pilot-capture-dry-run-summary"),
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

const storyLensOptions = [
  {
    key: "ingredient",
    label: "Ingredient",
    shortLabel: "Ingredients",
    description: "Formulation claims, label visibility, and verified text.",
  },
  {
    key: "package",
    label: "Package",
    shortLabel: "Size",
    description: "Net weight, serving size, and package-format context.",
  },
  {
    key: "maker",
    label: "Maker",
    shortLabel: "Maker",
    description: "Brand, manufacturer, distributor, and ownership clues.",
  },
  {
    key: "economics",
    label: "Price/Weight",
    shortLabel: "Economics",
    description: "Price clues aligned with package fields for later normalization.",
  },
  {
    key: "provenance",
    label: "Provenance",
    shortLabel: "Sources",
    description: "Source owner, URL, archive/date basis, and rights notes.",
  },
];

const storyModeOptions = [
  {
    key: "reader",
    label: "Reader",
    description: "Tell the product story first, with claim boundaries and proof receipts kept close.",
  },
  {
    key: "proof",
    label: "Proof",
    description: "Inspect provenance, review state, and evidence records behind the selected story.",
  },
  {
    key: "research",
    label: "Research",
    description: "Open the full collection cockpit for gaps, queues, source campaigns, and crawl telemetry.",
  },
];

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

function truthyFlag(value) {
  if (value === true || value === 1) return true;
  return ["1", "true", "yes", "y"].includes(String(value ?? "").trim().toLowerCase());
}

function presentText(value) {
  return String(value ?? "").trim() !== "";
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

function slugPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function storyCardKey(card, index) {
  return card.key || card.productCanonical || `${slugPart(card.kicker)}-${slugPart(card.title)}-${index}`;
}

function workflowStatuses() {
  return state.data.evidence_registry_status_workflow || [
    "discovered",
    "source_review",
    "usable_photo",
    "label_visible",
    "ocr_extracted",
    "manual_verified",
    "rejected",
  ];
}

function rowEvidenceStatus(row) {
  return row.evidence_status || row.evidence_status_label || row.review_stage || row.source_raw_status || "unknown";
}

function bestEvidenceRows(rows, limit = 5) {
  return [...rows]
    .sort((a, b) => {
      const statusRank = {
        manual_verified: 7,
        ocr_extracted: 6,
        label_visible: 5,
        usable_photo: 4,
        source_review: 3,
        discovered: 2,
        rejected: 1,
      };
      const statusDelta = (statusRank[rowEvidenceStatus(b)] || 0) - (statusRank[rowEvidenceStatus(a)] || 0);
      if (statusDelta) return statusDelta;
      return numeric(b.registry_priority || b.matrix_priority) - numeric(a.registry_priority || a.matrix_priority);
    })
    .slice(0, limit);
}

function storyReadinessLabel(product, rows) {
  if (numeric(product?.ground_truth_slots) > 0 || rows.some((row) => rowEvidenceStatus(row) === "manual_verified")) {
    return "verified label present";
  }
  if (rows.some((row) => rowEvidenceStatus(row) === "ocr_extracted")) return "OCR extracted";
  if (rows.some((row) => rowEvidenceStatus(row) === "label_visible")) return "label visible";
  if (rows.some((row) => rowEvidenceStatus(row) === "usable_photo")) return "usable photo";
  if (rows.some((row) => rowEvidenceStatus(row) === "source_review")) return "source review";
  return "discovery";
}

function statusNarrative(status) {
  const narratives = {
    ground_truth_ready: "Reviewed enough to support a product-history claim.",
    manual_review_ready: "Ready for a reviewer to turn visible evidence into text.",
    candidate_found: "A source lead exists, but the claim still needs review.",
    candidate_needs_panel: "The source points to the product, but the ingredient panel is not yet proven readable.",
    candidate_needs_transcription: "A package/label lead exists; transcription and review are still required.",
    candidate_needs_archive: "A current source exists; archive coordinates or a durable snapshot are still needed.",
    no_source: "Unsupported gap. The story cannot assert a change for this era.",
    discovered: "Known as a lead only.",
    source_review: "Source identity and attribution need review.",
    usable_photo: "Photo evidence may be usable after label roles are checked.",
    label_visible: "A panel appears visible; OCR or manual transcription is the next step.",
    ocr_extracted: "OCR exists and needs correction or acceptance.",
    manual_verified: "Verified text can carry claims.",
    rejected: "Do not use this evidence for the story.",
  };
  return narratives[status] || "Needs review before it can support a story claim.";
}

function evidenceClaimText(card) {
  const product = card.product;
  if (!product) {
    return [
      ["Can say", card.body],
      ["Still a gap", "This lane is operational context until a product, date, and source-specific claim is tied to reviewed evidence."],
      ["Proof needed", card.action],
    ];
  }

  const name = product.display_name || product.canonical_name || "This product";
  const panelNeed = product.panel_needed_vintages || product.archive_needed_vintages || "the open vintage slots";
  const gapText = /oreo/i.test(`${product.display_name || ""} ${product.canonical_name || ""}`)
    ? "1912 original ingredient label not verified. Current and vintage labels must remain SKU- and package-specific until readable panels are reviewed."
    : numeric(product.ground_truth_slots)
      ? "Some verified slots exist, but unsupported slots still cannot carry formulation claims."
      : "No manual-verified ingredient statement is available for this product in the current snapshot.";
  return [
    [
      "Can say",
      `${name} has source leads in ${formatNumber(product.slots_with_sources)} of ${formatNumber(product.slots_total)} vintage slots, with ${pluralize(product.product_candidate_count, "candidate")} ready for review.`,
    ],
    ["Still a gap", gapText],
    ["Proof needed", `${card.action || "Review source pages and attach readable label text."} Priority vintages: ${panelNeed}.`],
  ];
}

function storyQuestion(card) {
  const product = card.product;
  if (!product) {
    return card.key === "evidence-gate"
      ? "Which evidence can safely become a public product-history claim?"
      : "What does this board know, and what still needs proof before publication?";
  }
  const name = product.display_name || product.canonical_name || "this product";
  if (/oreo/i.test(`${product.display_name || ""} ${product.canonical_name || ""}`)) {
    return "How did Oreo's ingredient label change across packages, and which source-attributable photos prove each era?";
  }
  if (product.category === "fast food") {
    return `How did ${name} change across menus, nutrition PDFs, allergen disclosures, and package evidence without collapsing distinct restaurant documents?`;
  }
  return `What changed in ${name}, and which package labels can prove the timeline?`;
}

function storySupportedNow(card, evidenceRows) {
  const product = card.product;
  if (!product) {
    return card.body;
  }
  const sourceDomains = storySourcePath(product, evidenceRows).slice(0, 3);
  const sourceText = sourceDomains.length ? ` Source venues include ${sourceDomains.join(", ")}.` : "";
  return `${product.display_name || product.canonical_name} has ${pluralize(product.product_candidate_count, "candidate")} across ${pluralize(product.slots_with_sources, "vintage slot")}.${sourceText}`;
}

function storyCannotSayYet(card, evidenceRows) {
  const product = card.product;
  const verified = evidenceRows.filter((row) => rowEvidenceStatus(row) === "manual_verified").length;
  if (verified) {
    return `${pluralize(verified, "verified label")} can support ingredient claims, but other vintages still need explicit evidence before diffs are generalized.`;
  }
  if (!product) {
    return "Operational metrics are not product claims. They explain where evidence sits in the workflow until a source, date, and label are reviewed.";
  }
  const needed = product.panel_needed_vintages || product.archive_needed_vintages || product.missing_vintages || "open vintage slots";
  return `No manual-verified ingredient statement is present in this snapshot. Do not publish ingredient diffs for ${needed} until readable panels and reviewed transcriptions exist.`;
}

function storyNextEvidenceStep(card, evidenceRows) {
  const product = card.product;
  const labelVisible = evidenceRows.filter((row) => rowEvidenceStatus(row) === "label_visible").length;
  if (labelVisible) {
    return `Start with the ${pluralize(labelVisible, "label-visible record")}: transcribe, attach reviewer notes, and promote only accepted text.`;
  }
  if (product?.recommended_next_action) return product.recommended_next_action;
  return card.action || "Open source records, confirm attribution/date, then classify label visibility and transcription readiness.";
}

function renderStoryBrief(card, evidenceRows) {
  const blocks = [
    ["Story question", storyQuestion(card)],
    ["Supported now", storySupportedNow(card, evidenceRows)],
    ["Cannot say yet", storyCannotSayYet(card, evidenceRows)],
    ["Next evidence step", storyNextEvidenceStep(card, evidenceRows)],
  ];
  return `
    <section class="story-brief" aria-label="Story brief">
      ${blocks
        .map(([label, value]) => `
          <article>
            <strong>${escapeHtml(label)}</strong>
            <p>${escapeHtml(value)}</p>
          </article>
        `)
        .join("")}
    </section>
  `;
}

function storyReaderSentenceRows(card, evidenceRows) {
  const headline = storyReaderHeadline(card, evidenceRows);
  return [
    {
      label: "Reader lede",
      title: headline.title,
      body: headline.dek,
      status: storyPublicationState(card, evidenceRows).status,
    },
    {
      label: "Evidence sentence",
      title: "What the snapshot supports",
      body: storySupportedNow(card, evidenceRows),
      status: "source_review",
    },
    {
      label: "Boundary sentence",
      title: "What the story must not overstate",
      body: storyCannotSayYet(card, evidenceRows),
      status: evidenceRows.some((row) => rowEvidenceStatus(row) === "manual_verified" || truthyFlag(row.manual_transcription_available))
        ? "manual_verified"
        : "missing_vintage_slot",
    },
    {
      label: "Unlock sentence",
      title: "What changes the next chapter",
      body: storyNextEvidenceStep(card, evidenceRows),
      status: evidenceRows.some((row) => rowEvidenceStatus(row) === "label_visible" || truthyFlag(row.ingredient_panel_visible))
        ? "label_visible"
        : "candidate_needs_panel",
    },
  ];
}

function storyBoardSpineRows(card, evidenceRows) {
  const facts = storyEvidenceFacts(evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const bestSource = storyBestSource(evidenceRows);
  const product = card.product;
  const productName = storyDisplayTitle(card);
  const currentRows = product ? vintageEvidenceRows(product, evidenceRows, "current_2020s") : [];
  const currentBest = bestEvidenceRows(currentRows, 1)[0] || {};
  const sourceTitle = currentBest.source_title || currentBest.source_domain || bestSource.title;
  const currentDetail = currentBest.reviewer_notes || currentBest.promotion_blocker || bestSource.detail;
  return [
    {
      label: "1. Frame",
      title: storyQuestion(card),
      body: publicationState.detail,
      status: publicationState.status,
    },
    {
      label: "2. Anchor",
      title: sourceTitle || `${productName} source anchor`,
      body: currentDetail || "Use the strongest available source as the current evidence anchor, then keep SKU/package context visible.",
      status: currentBest.source_title || currentBest.source_domain ? rowEvidenceStatus(currentBest) : bestSource.status,
      source: currentBest.source_url || currentBest.archive_url || bestSource.source,
      sourceLabel: currentBest.source_domain || bestSource.label,
    },
    {
      label: "3. Tension",
      title: storyGapLabel(card),
      body: facts.manualLabels
        ? "Verified labels support scoped chapters, while unresolved vintages remain explicit gaps in the story."
        : "The narrative is evidence status and source provenance until reviewed label text exists.",
      status: facts.manualLabels ? "manual_verified" : "missing_vintage_slot",
    },
    {
      label: "4. Turn",
      title: facts.visibleLabels || facts.usablePhotos ? "Move visible evidence into verified text" : "Find a readable source-attributable label",
      body: storyNextEvidenceStep(card, evidenceRows),
      status: facts.visibleLabels ? "label_visible" : facts.usablePhotos ? "usable_photo" : "candidate_needs_panel",
    },
  ];
}

function storyReceiptRows(evidenceRows) {
  return bestEvidenceRows(evidenceRows, 4).map((row) => {
    const status = rowEvidenceStatus(row);
    const title = row.source_title || row.source_domain || row.evidence_kind || "Evidence record";
    const source = row.source_url || row.archive_url || "";
    const dateBasis = row.claimed_product_date_text || row.capture_date_text || row.vintage_label || row.archive_id || "date not recorded";
    return {
      title,
      status,
      dateBasis,
      owner: row.source_publisher_owner || row.source_author || row.source_domain || "owner not recorded",
      rights: row.license_rights_note || row.source_attribution_grade || "rights not recorded",
      detail: row.reviewer_notes || row.unsupported_gap_note || row.promotion_blocker || row.ground_truth_fields_missing || "",
      source,
      sourceLabel: row.source_domain || "Source",
    };
  });
}

function renderReaderStoryboard(card, evidenceRows) {
  const sentenceRows = storyReaderSentenceRows(card, evidenceRows);
  const spineRows = storyBoardSpineRows(card, evidenceRows);
  const receiptRows = storyReceiptRows(evidenceRows);
  return `
    <div class="reader-story-spine">
      ${spineRows
        .map((row) => `
          <article class="reader-spine-card status-${escapeHtml(row.status || "unknown")}">
            <span>${escapeHtml(row.label)}</span>
            <strong>${escapeHtml(row.title)}</strong>
            <p>${escapeHtml(clipped(row.body, 170))}</p>
            <div class="lead-meta">
              ${statusTag(row.status || "unknown")}
              ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
            </div>
          </article>
        `)
        .join("")}
    </div>
    <div class="reader-script-grid">
      ${sentenceRows
        .map((row) => `
          <article class="reader-script-card status-${escapeHtml(row.status || "unknown")}">
            <span>${escapeHtml(row.label)}</span>
            <strong>${escapeHtml(row.title)}</strong>
            <p>${escapeHtml(row.body)}</p>
          </article>
        `)
        .join("")}
    </div>
    <div class="reader-receipt-strip">
      ${receiptRows.length
        ? receiptRows
          .map((row) => `
            <article class="reader-receipt status-${escapeHtml(row.status || "unknown")}">
              <div>
                <span>${escapeHtml(row.dateBasis)}</span>
                <strong>${escapeHtml(row.title)}</strong>
              </div>
              <p>${escapeHtml(clipped(row.detail, 135))}</p>
              <dl>
                <dt>Owner</dt>
                <dd>${escapeHtml(row.owner)}</dd>
                <dt>Rights</dt>
                <dd>${escapeHtml(row.rights)}</dd>
              </dl>
              <div class="lead-meta">
                ${statusTag(row.status)}
                ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
              </div>
            </article>
          `)
          .join("")
        : `<p class="empty-note">No source receipts are attached to this story under the current filters.</p>`}
    </div>
  `;
}

function storyLensRows(card, evidenceRows) {
  const product = card.product;
  const visibleLabels = evidenceRows.filter((row) => rowEvidenceStatus(row) === "label_visible" || truthyFlag(row.ingredient_panel_visible)).length;
  const manualLabels = evidenceRows.filter((row) => rowEvidenceStatus(row) === "manual_verified" || truthyFlag(row.manual_transcription_available)).length;
  const packageFields = evidenceRows.filter((row) => truthyFlag(row.net_weight_visible) || presentText(row.net_weight_text) || presentText(row.serving_size_text)).length;
  const orgFields = evidenceRows.filter((row) => truthyFlag(row.manufacturer_text_visible) || presentText(row.manufacturer_text)).length;
  const sourceLinks = evidenceRows.filter((row) => row.source_url || row.archive_url).length;
  return [
    {
      label: "Ingredient label",
      value: manualLabels ? "verified" : visibleLabels ? "visible" : "not verified",
      detail: manualLabels ? `${manualLabels} manual label slot(s)` : visibleLabels ? `${visibleLabels} visible panel lead(s)` : "Needs readable panel plus transcription",
    },
    {
      label: "Package size",
      value: packageFields ? "captured" : "needed",
      detail: packageFields ? `${packageFields} weight or serving field(s)` : "Net weight and serving size stay separate from identity",
    },
    {
      label: "Maker timeline",
      value: orgFields ? "has text" : product?.brand || "unknown",
      detail: orgFields ? `${orgFields} manufacturer/distributor field(s)` : "Ownership and distributor changes need source text",
    },
    {
      label: "Source trail",
      value: `${formatNumber(sourceLinks)} links`,
      detail: sourceLinks ? "Attributable URLs available for review" : "Unsupported gap until a source exists",
    },
  ];
}

function storyEvidenceFacts(evidenceRows) {
  return {
    manualLabels: evidenceRows.filter((row) => rowEvidenceStatus(row) === "manual_verified" || truthyFlag(row.manual_transcription_available)).length,
    ocrLabels: evidenceRows.filter((row) => rowEvidenceStatus(row) === "ocr_extracted").length,
    visibleLabels: evidenceRows.filter((row) => rowEvidenceStatus(row) === "label_visible" || truthyFlag(row.ingredient_panel_visible)).length,
    usablePhotos: evidenceRows.filter((row) => rowEvidenceStatus(row) === "usable_photo").length,
    packageFields: evidenceRows.filter((row) => truthyFlag(row.net_weight_visible) || presentText(row.net_weight_text) || presentText(row.serving_size_text) || presentText(row.servings_per_container_text)).length,
    orgFields: evidenceRows.filter((row) => truthyFlag(row.manufacturer_text_visible) || presentText(row.manufacturer_text) || presentText(row.distributor_text) || presentText(row.source_publisher_owner)).length,
    priceFields: evidenceRows.filter((row) => presentText(row.price_text) || presentText(row.price_amount) || presentText(row.unit_price_text) || presentText(row.price_observation_id)).length,
    sourceLinks: evidenceRows.filter((row) => row.source_url || row.archive_url).length,
    rightsNotes: evidenceRows.filter((row) => presentText(row.license_rights_note) || presentText(row.source_attribution_grade)).length,
  };
}

function activeStoryLens() {
  return storyLensOptions.find((option) => option.key === state.storyLens) || storyLensOptions[0];
}

function activeStoryMode() {
  return storyModeOptions.find((option) => option.key === state.storyMode) || storyModeOptions[0];
}

function storyModeNarrative(card, evidenceRows, registryRows) {
  const mode = activeStoryMode();
  const productName = storyDisplayTitle(card);
  const publicationState = storyPublicationState(card, evidenceRows);
  const facts = storyEvidenceFacts(evidenceRows);
  const registryCount = registryRows.length || state.data.metrics.evidence_registry_rows || 0;

  if (mode.key === "proof") {
    return {
      title: `${productName}: proof trail`,
      summary: `${publicationState.label}. This view keeps the story canvas visible while opening provenance, registry status, source ownership, rights notes, and chapter-by-chapter evidence states.`,
      hint: `${pluralize(facts.sourceLinks, "source link")} · ${pluralize(facts.manualLabels, "verified label")} · ${pluralize(registryCount, "registry record")} in scope`,
    };
  }

  if (mode.key === "research") {
    return {
      title: `${productName}: research cockpit`,
      summary: "Collection queues, gap maps, source campaigns, product coverage, and crawl telemetry are visible here. These panels explain what to collect next, but they still do not promote product claims.",
      hint: `${pluralize(state.data.metrics.unsupported_gap_records || 0, "unsupported gap")} · ${pluralize(state.data.metrics.acquisition_rows || 0, "queue row")} · ${pluralize(state.data.metrics.common_crawl_run_logs || 0, "CDX run")}`,
    };
  }

  return {
    title: `${productName}: reader story`,
    summary: `${publicationState.detail} The first screen is the narrative: what changed or might have changed, what proof exists, what the reader must not be told yet, and which evidence would unlock the next chapter.`,
    hint: `${pluralize(facts.visibleLabels, "label-visible lead")} · ${pluralize(facts.packageFields, "package field")} · ${storyGapLabel(card)}`,
  };
}

function renderStoryModeChrome(card, evidenceRows, registryRows) {
  if (!els.storyModeTabs) return;
  const narrative = storyModeNarrative(card, evidenceRows, registryRows);
  document.body.dataset.storyMode = activeStoryMode().key;
  els.storyModeTitle.textContent = narrative.title;
  els.storyModeSummary.textContent = narrative.summary;
  els.storyModeHint.textContent = narrative.hint;
  els.storyModeTabs.innerHTML = storyModeOptions
    .map((option) => `
      <button class="story-mode-tab ${option.key === activeStoryMode().key ? "is-selected" : ""}" type="button" data-story-mode-choice="${escapeHtml(option.key)}">
        <strong>${escapeHtml(option.label)}</strong>
        <span>${escapeHtml(option.description)}</span>
      </button>
    `)
    .join("");
}

function storyPathRows(card, evidenceRows) {
  if (!card) return [];
  const publicationState = storyPublicationState(card, evidenceRows);
  const narrative = storyLensNarrative(card, evidenceRows);
  const facts = storyEvidenceFacts(evidenceRows);
  const comparisonSides = comparisonSideRows(card, evidenceRows).map(comparisonSideCard);
  const comparisonLanes = comparisonLaneRows(comparisonSides[0]?.rows || [], comparisonSides[1]?.rows || []);
  const comparisonVerdict = storyComparisonVerdict(card, comparisonSides[0] || {}, comparisonSides[1] || {}, comparisonLanes);
  const mapRows = storyMapRows(card, evidenceRows);
  const laneRows = storyMapLaneRows(mapRows);
  const activeLane = laneRows.find((lane) => lane.key === activeStoryLens().key) || laneRows[0] || {};
  const receiptRows = storyReceiptLedgerRows(card, evidenceRows);
  const receiptReady = receiptRows.filter((row) => row.receipts.length > 0).length;
  const chapterRows = storyChapterBoardRows(card, evidenceRows);
  const sourcedChapters = chapterRows.filter((row) => row.sourceCount > 0).length;
  const traceRows = storyTraceRows(card, evidenceRows);
  const traceLocked = traceRows.filter((row) => row.bucket === "locked").length;
  const captionRows = storyCaptionRows(card, evidenceRows);
  const captionReady = captionRows.filter((row) => ["manual_verified", "usable_photo"].includes(row.status)).length;
  const facetRows = storyFacetRows(card, evidenceRows);
  const facetLocked = facetRows.filter((row) => row.bucket === "locked").length;
  return [
    {
      number: "01",
      href: "#story-cover",
      label: "Cover",
      status: publicationState.status,
      title: publicationState.label,
      detail: "The opening frame states what the reader can believe first.",
      metric: `${formatNumber(facts.sourceLinks)} receipts`,
    },
    {
      number: "02",
      href: "#story-filmstrip",
      label: "Filmstrip",
      status: publicationState.status,
      title: `${formatNumber(storyFilmstripRows(card, evidenceRows).length)} story beats`,
      detail: "The reader sees the narrative sequence before entering the proof boards.",
      metric: `${formatNumber(facts.sourceLinks)} receipts`,
    },
    {
      number: "03",
      href: "#story-article",
      label: "Article",
      status: narrative.status,
      title: narrative.lens.label,
      detail: "The draft turns evidence state, claim boundary, and next proof move into prose.",
      metric: `${formatNumber(facts.visibleLabels)} visible`,
    },
    {
      number: "04",
      href: "#story-chapter-board",
      label: "Chapters",
      status: chapterRows.some((row) => row.status === "manual_verified") ? "manual_verified" : sourcedChapters ? "source_review" : "missing_vintage_slot",
      title: `${formatNumber(chapterRows.length)} story scenes`,
      detail: "Vintage slots become reader scenes with their own proof object and claim boundary.",
      metric: `${formatNumber(sourcedChapters)} sourced`,
    },
    {
      number: "05",
      href: "#story-trace",
      label: "Claim Trace",
      status: traceLocked ? "source_review" : "manual_verified",
      title: `${formatNumber(traceRows.length)} traced lines`,
      detail: "Reader-facing lines connect to proof objects, receipts, and claim boundaries.",
      metric: `${formatNumber(traceLocked)} locked`,
    },
    {
      number: "06",
      href: "#story-photo-board",
      label: "Visual Proof",
      status: facts.manualLabels ? "manual_verified" : facts.visibleLabels ? "label_visible" : facts.usablePhotos ? "usable_photo" : "candidate_needs_panel",
      title: facts.visibleLabels ? "Panel-ready evidence" : facts.usablePhotos ? "Photo-led proof chase" : "Images still needed",
      detail: "Package photos, readable panels, OCR, and manual verification are kept separate.",
      metric: `${formatNumber(facts.usablePhotos)} photos`,
    },
    {
      number: "07",
      href: "#story-caption-board",
      label: "Captions",
      status: captionReady ? "usable_photo" : "missing_vintage_slot",
      title: `${formatNumber(captionReady)} usable visuals`,
      detail: "Image captions, alt text, owner, date basis, and rights notes stay attached.",
      metric: `${formatNumber(captionRows.length)} captions`,
    },
    {
      number: "08",
      href: "#story-compare-stage",
      label: "Then vs Now",
      status: comparisonVerdict.status,
      title: comparisonVerdict.title,
      detail: "The comparison stage decides whether a change claim is allowed or locked.",
      metric: `${formatNumber(comparisonLanes.length)} lanes`,
    },
    {
      number: "09",
      href: "#story-map",
      label: "Evidence Map",
      status: activeLane.status || publicationState.status,
      title: `${activeLane.label || activeStoryLens().label} lane`,
      detail: "Chapters and facets stay visible together, so gaps are not smoothed into history.",
      metric: `${formatNumber(mapRows.length)} chapters`,
    },
    {
      number: "10",
      href: "#story-facets",
      label: "Facets",
      status: facetRows.some((row) => row.bucket === "ready") ? "manual_verified" : facetLocked ? "source_review" : "label_visible",
      title: `${formatNumber(facetRows.length)} ingredient facets`,
      detail: "Ingredient sub-stories are separated into claim-ready, review, and locked facets.",
      metric: `${formatNumber(facetLocked)} locked`,
    },
    {
      number: "11",
      href: "#story-receipts",
      label: "Receipts",
      status: receiptReady ? "source_review" : "missing_vintage_slot",
      title: `${formatNumber(receiptReady)} receipt chapters`,
      detail: "Owner, date basis, rights note, and review gate stay attached to every source.",
      metric: `${formatNumber(facts.rightsNotes)} rights`,
    },
    {
      number: "12",
      href: "#story-desk",
      label: "Story Desk",
      status: facts.manualLabels ? "manual_verified" : facts.visibleLabels ? "label_visible" : "source_review",
      title: "Research workspace",
      detail: "The deeper canvas keeps clusters, gallery, matrix, script, and follow-up work close.",
      metric: `${formatNumber(facts.manualLabels)} verified`,
    },
  ];
}

function renderStoryPath(card, evidenceRows) {
  if (!els.storyPath) return;
  if (!card) {
    els.storyPath.innerHTML = `<p class="empty-note">No reader path is available for the current filters.</p>`;
    return;
  }
  const rows = storyPathRows(card, evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  els.storyPath.innerHTML = `
    <article class="story-path status-${escapeHtml(publicationState.status)}">
      <div class="story-path-head">
        <div>
          <p class="eyebrow">Reader Path</p>
          <h2>${escapeHtml(storyDisplayTitle(card))}</h2>
        </div>
        <p>${escapeHtml(publicationState.detail)} Follow the path from public narrative to proof receipts and the working story desk.</p>
      </div>
      <nav class="story-path-rail" aria-label="Story section shortcuts">
        ${rows
          .map((row) => `
            <a class="story-path-step status-${escapeHtml(row.status || "unknown")}" href="${escapeHtml(row.href)}">
              <span>${escapeHtml(row.number)}</span>
              <strong>${escapeHtml(row.label)}</strong>
              <em>${escapeHtml(clipped(row.title, 66))}</em>
              <p>${escapeHtml(row.detail)}</p>
              <b>${escapeHtml(row.metric)}</b>
            </a>
          `)
          .join("")}
      </nav>
    </article>
  `;
}

function publicationGateRows(card, evidenceRows) {
  const facts = storyEvidenceFacts(evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const claimRows = storyClaimLedgerRows(card, evidenceRows);
  const formulationClaim = claimRows.find((row) => row.claim === "Ingredient changes") || claimRows[0];
  return [
    {
      label: "Can Publish",
      title: publicationState.label,
      status: publicationState.status,
      detail: storySupportedNow(card, evidenceRows),
      metric: `${formatNumber(facts.sourceLinks)} source links`,
    },
    {
      label: "Must Not Say",
      title: formulationClaim?.state || "claim boundary",
      status: formulationClaim?.status || "missing_vintage_slot",
      detail: storyCannotSayYet(card, evidenceRows),
      metric: formulationClaim?.evidence || `${formatNumber(facts.manualLabels)} verified`,
    },
    {
      label: "Next Unlock",
      title: facts.visibleLabels ? "Transcribe visible panels" : facts.usablePhotos ? "Find back-panel evidence" : "Find source-attributable proof",
      status: facts.manualLabels ? "manual_verified" : facts.visibleLabels ? "label_visible" : facts.usablePhotos ? "usable_photo" : "candidate_needs_panel",
      detail: storyNextEvidenceStep(card, evidenceRows),
      metric: `${formatNumber(facts.visibleLabels)} visible panels`,
    },
  ];
}

function renderStoryGate(card, evidenceRows) {
  if (!els.storyGate) return;
  if (!card) {
    els.storyGate.innerHTML = `<p class="empty-note">No publication gate is available for the current filters.</p>`;
    return;
  }
  const facts = storyEvidenceFacts(evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const gateRows = publicationGateRows(card, evidenceRows);
  const claimRows = storyClaimLedgerRows(card, evidenceRows);
  els.storyGate.innerHTML = `
    <article class="story-gate status-${escapeHtml(publicationState.status)}">
      <header class="story-gate-head">
        <div>
          <p class="eyebrow">Publication Gate</p>
          <h2>${escapeHtml(publicationState.label)}</h2>
          <p>${escapeHtml(publicationState.detail)}</p>
        </div>
        <aside class="story-gate-metrics" aria-label="Publication gate metrics">
          <span><strong>${formatNumber(facts.manualLabels)}</strong>verified labels</span>
          <span><strong>${formatNumber(facts.visibleLabels)}</strong>visible panels</span>
          <span><strong>${formatNumber(facts.sourceLinks)}</strong>source links</span>
          <span><strong>${formatNumber(facts.packageFields)}</strong>package fields</span>
        </aside>
      </header>
      <div class="story-gate-decisions">
        ${gateRows
          .map((row) => `
            <article class="story-gate-decision status-${escapeHtml(row.status || "unknown")}">
              <span>${escapeHtml(row.label)}</span>
              <strong>${escapeHtml(row.title)}</strong>
              <p>${escapeHtml(row.detail)}</p>
              <div class="lead-meta">
                ${statusTag(row.status || "unknown")}
                <span class="status-tag">${escapeHtml(row.metric)}</span>
              </div>
            </article>
          `)
          .join("")}
      </div>
      <div class="story-gate-rules" aria-label="Claim publication rules">
        ${claimRows
          .map((row) => `
            <article class="story-gate-rule status-${escapeHtml(row.status || "unknown")}">
              <span>${escapeHtml(row.claim)}</span>
              <strong>${escapeHtml(row.state)}</strong>
              <p>${escapeHtml(clipped(row.detail, 140))}</p>
              <em>${escapeHtml(row.evidence)}</em>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function storyPacketSections(card, evidenceRows) {
  const facts = storyEvidenceFacts(evidenceRows);
  const gateRows = publicationGateRows(card, evidenceRows);
  const comparisonSides = comparisonSideRows(card, evidenceRows).map(comparisonSideCard);
  const comparisonLanes = comparisonLaneRows(comparisonSides[0]?.rows || [], comparisonSides[1]?.rows || []);
  const comparisonVerdict = storyComparisonVerdict(card, comparisonSides[0] || {}, comparisonSides[1] || {}, comparisonLanes);
  return [
    {
      label: "Headline",
      status: storyPublicationState(card, evidenceRows).status,
      body: storyReaderHeadline(card, evidenceRows).title,
    },
    {
      label: "Supported claim",
      status: gateRows[0]?.status || "source_review",
      body: gateRows[0]?.detail || storySupportedNow(card, evidenceRows),
    },
    {
      label: "Locked claim",
      status: gateRows[1]?.status || "missing_vintage_slot",
      body: gateRows[1]?.detail || storyCannotSayYet(card, evidenceRows),
    },
    {
      label: "Comparison verdict",
      status: comparisonVerdict.status,
      body: comparisonVerdict.detail,
    },
    {
      label: "Next proof move",
      status: gateRows[2]?.status || "candidate_needs_panel",
      body: gateRows[2]?.detail || storyNextEvidenceStep(card, evidenceRows),
    },
    {
      label: "Receipt rule",
      status: facts.sourceLinks ? "source_review" : "missing_vintage_slot",
      body: facts.sourceLinks
        ? `${pluralize(facts.sourceLinks, "source link")} are attached; every public claim still needs owner, date basis, rights, and review state.`
        : "No source-attributable receipt is attached, so the packet must publish as a gap only.",
    },
  ];
}

function storyPacketChecklist(card, evidenceRows) {
  const facts = storyEvidenceFacts(evidenceRows);
  const pathCount = storyPathRows(card, evidenceRows).length;
  return [
    {
      label: "Reader path",
      status: "source_review",
      detail: `${pluralize(pathCount, "section")} are wired for the selected story.`,
    },
    {
      label: "Visual proof",
      status: facts.usablePhotos ? "usable_photo" : "candidate_needs_panel",
      detail: `${pluralize(facts.usablePhotos, "photo lead")} · ${pluralize(facts.visibleLabels, "visible panel")}`,
    },
    {
      label: "Claim ledger",
      status: facts.manualLabels ? "manual_verified" : facts.visibleLabels ? "label_visible" : "source_review",
      detail: `${pluralize(facts.manualLabels, "verified label")} · ingredient diffs stay scoped.`,
    },
    {
      label: "Receipts",
      status: facts.sourceLinks ? "source_review" : "missing_vintage_slot",
      detail: `${pluralize(facts.sourceLinks, "source link")} · ${pluralize(facts.rightsNotes, "rights note")}`,
    },
    {
      label: "Economics overlay",
      status: facts.priceFields && facts.packageFields ? "candidate_found" : "candidate_needs_archive",
      detail: `${pluralize(facts.priceFields, "price clue")} · ${pluralize(facts.packageFields, "package field")}`,
    },
  ];
}

function renderStoryPacket(card, evidenceRows) {
  if (!els.storyPacket) return;
  if (!card) {
    els.storyPacket.innerHTML = `<p class="empty-note">No publish packet is available for the current filters.</p>`;
    return;
  }
  const headline = storyReaderHeadline(card, evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const receipts = storyReceiptRows(evidenceRows).slice(0, 3);
  const sections = storyPacketSections(card, evidenceRows);
  const checklist = storyPacketChecklist(card, evidenceRows);
  els.storyPacket.innerHTML = `
    <article class="story-packet status-${escapeHtml(publicationState.status)}">
      <header class="story-packet-head">
        <div>
          <p class="eyebrow">Publish Packet</p>
          <h2>${escapeHtml(storyDisplayTitle(card))}</h2>
          <p>${escapeHtml(headline.dek)}</p>
        </div>
        <aside class="story-packet-state">
          <span>Publication State</span>
          <strong>${escapeHtml(publicationState.label)}</strong>
          <p>${escapeHtml(publicationState.detail)}</p>
          <div class="lead-meta">${statusTag(publicationState.status)}</div>
        </aside>
      </header>
      <div class="story-packet-grid">
        <section class="story-packet-copy" aria-label="Export-ready story copy">
          ${sections
            .map((row) => `
              <article class="story-packet-line status-${escapeHtml(row.status || "unknown")}">
                <span>${escapeHtml(row.label)}</span>
                <p>${escapeHtml(row.body)}</p>
              </article>
            `)
            .join("")}
        </section>
        <aside class="story-packet-receipts" aria-label="Packet receipt stack">
          <div class="story-packet-subhead">
            <span>Receipt Stack</span>
            <strong>${pluralize(receipts.length, "source")}</strong>
          </div>
          ${receipts.length
            ? receipts
              .map((row) => `
                <article class="story-packet-receipt status-${escapeHtml(row.status || "unknown")}">
                  <span>${escapeHtml(row.dateBasis)}</span>
                  <strong>${escapeHtml(row.title)}</strong>
                  <p>${escapeHtml(clipped(row.detail || `${row.owner} · ${row.rights}`, 118))}</p>
                  <div class="lead-meta">
                    ${statusTag(row.status || "unknown")}
                    ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
                  </div>
                </article>
              `)
              .join("")
            : `<p class="empty-note">No source receipts are attached to this packet.</p>`}
        </aside>
      </div>
      <footer class="story-packet-checklist" aria-label="Publication checklist">
        ${checklist
          .map((row) => `
            <article class="story-packet-check status-${escapeHtml(row.status || "unknown")}">
              <span>${escapeHtml(row.label)}</span>
              <strong>${escapeHtml(row.detail)}</strong>
            </article>
          `)
          .join("")}
      </footer>
    </article>
  `;
}

function reviewStatusBucket(status) {
  const normalized = status || "unknown";
  if (["manual_verified", "ground_truth_ready"].includes(normalized)) return "ready";
  if (
    [
      "missing_vintage_slot",
      "no_source",
      "rejected",
      "candidate_needs_panel",
      "candidate_needs_archive",
      "candidate_needs_transcription",
      "candidate_needs_source",
      "unknown",
    ].includes(normalized)
  ) {
    return "locked";
  }
  return "review";
}

function storyReviewBucketDefinitions() {
  return [
    {
      key: "ready",
      label: "Ready",
      detail: "Story sections or claims that can be shown with current caveats.",
    },
    {
      key: "review",
      label: "In Review",
      detail: "Evidence exists, but an editor still needs source, rights, date, or panel review.",
    },
    {
      key: "locked",
      label: "Locked",
      detail: "Claims or overlays that must stay blocked until new verified proof exists.",
    },
  ];
}

function storyReviewRows(card, evidenceRows) {
  if (!card) return [];
  const facts = storyEvidenceFacts(evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const claimRows = storyClaimLedgerRows(card, evidenceRows);
  const ingredientClaim = claimRows.find((row) => row.claim === "Ingredient changes") || claimRows[0] || {};
  const packageClaim = claimRows.find((row) => row.claim === "Package size and serving context") || {};
  const makerClaim = claimRows.find((row) => row.claim === "Maker and distributor timeline") || {};
  const priceClaim = claimRows.find((row) => row.claim === "Price and weight overlay") || {};
  const comparisonSides = comparisonSideRows(card, evidenceRows).map(comparisonSideCard);
  const comparisonLanes = comparisonLaneRows(comparisonSides[0]?.rows || [], comparisonSides[1]?.rows || []);
  const comparisonVerdict = storyComparisonVerdict(card, comparisonSides[0] || {}, comparisonSides[1] || {}, comparisonLanes);
  const receiptRows = storyReceiptLedgerRows(card, evidenceRows);
  const receiptChapters = receiptRows.filter((row) => row.receipts.length > 0).length;
  const pathRows = storyPathRows(card, evidenceRows);
  const pathStatus = pathRows.length >= 7 ? "manual_verified" : "missing_vintage_slot";
  const visualStatus = facts.manualLabels
    ? "manual_verified"
    : facts.visibleLabels
      ? "label_visible"
      : facts.usablePhotos
        ? "usable_photo"
        : "candidate_needs_panel";
  const receiptStatus = facts.sourceLinks && facts.rightsNotes ? "source_review" : facts.sourceLinks ? "source_review" : "missing_vintage_slot";
  const packetStatus = publicationState.status === "manual_verified" ? "manual_verified" : "source_review";

  const rows = [
    {
      area: "Story shell",
      title: "Reader path",
      status: pathStatus,
      bucket: "ready",
      detail: `${pluralize(pathRows.length, "section")} are wired from cover to source receipts.`,
      metric: "narrative order",
    },
    {
      area: "Story shell",
      title: "Publish packet",
      status: packetStatus,
      bucket: publicationState.status === "manual_verified" ? "ready" : "review",
      detail: publicationState.detail,
      metric: publicationState.label,
    },
    {
      area: "Visual proof",
      title: "Photo and panel board",
      status: visualStatus,
      detail: `${pluralize(facts.usablePhotos, "photo lead")} · ${pluralize(facts.visibleLabels, "visible panel")} · ${pluralize(facts.manualLabels, "verified label")}`,
      metric: facts.manualLabels ? "verified text" : facts.visibleLabels ? "transcribe next" : "find panel",
    },
    {
      area: "Visual proof",
      title: "Source receipts",
      status: receiptStatus,
      bucket: facts.sourceLinks ? "review" : "locked",
      detail: `${pluralize(receiptChapters, "chapter")} have receipts; ${pluralize(facts.rightsNotes, "rights note")} are recorded.`,
      metric: `${formatNumber(facts.sourceLinks)} links`,
    },
    {
      area: "Claim ledger",
      title: ingredientClaim.claim || "Ingredient changes",
      status: ingredientClaim.status || "source_review",
      bucket: ingredientClaim.status === "manual_verified" ? "ready" : reviewStatusBucket(ingredientClaim.status),
      detail: ingredientClaim.detail || "Ingredient claims need verified label text.",
      metric: ingredientClaim.evidence || "claim state",
    },
    {
      area: "Claim ledger",
      title: "Then vs Now comparison",
      status: comparisonVerdict.status,
      bucket: comparisonVerdict.status === "manual_verified" ? "ready" : reviewStatusBucket(comparisonVerdict.status),
      detail: comparisonVerdict.detail,
      metric: comparisonVerdict.title,
    },
    {
      area: "Context overlay",
      title: packageClaim.claim || "Package size and serving context",
      status: packageClaim.status || "candidate_needs_panel",
      bucket: packageClaim.status === "candidate_found" ? "review" : reviewStatusBucket(packageClaim.status),
      detail: packageClaim.detail || "Package fields are needed before size stories or normalization.",
      metric: packageClaim.evidence || `${formatNumber(facts.packageFields)} fields`,
    },
    {
      area: "Context overlay",
      title: makerClaim.claim || "Maker and distributor timeline",
      status: makerClaim.status || "no_source",
      bucket: makerClaim.status === "source_review" ? "review" : reviewStatusBucket(makerClaim.status),
      detail: makerClaim.detail || "Maker and distributor changes need source text.",
      metric: makerClaim.evidence || `${formatNumber(facts.orgFields)} clues`,
    },
    {
      area: "Context overlay",
      title: priceClaim.claim || "Price and weight overlay",
      status: priceClaim.status || "candidate_needs_archive",
      bucket: priceClaim.status === "candidate_found" ? "review" : "locked",
      detail: priceClaim.detail || "Economic overlays are deferred until SKU, package, and price evidence align.",
      metric: priceClaim.evidence || `${formatNumber(facts.priceFields)} price clues`,
    },
  ];
  return rows.map((row) => ({
    ...row,
    bucket: row.bucket || reviewStatusBucket(row.status),
  }));
}

function storyReviewHandoffRows(card, evidenceRows, reviewRows) {
  const lockedRows = reviewRows.filter((row) => row.bucket === "locked");
  const reviewQueueRows = reviewRows.filter((row) => row.bucket === "review");
  const facts = storyEvidenceFacts(evidenceRows);
  return [
    {
      label: "Editor Can Lead With",
      status: reviewRows.some((row) => row.bucket === "ready") ? "manual_verified" : "source_review",
      detail: storySupportedNow(card, evidenceRows),
      metric: `${pluralize(reviewRows.filter((row) => row.bucket === "ready").length, "ready item")}`,
    },
    {
      label: "Fact Check Queue",
      status: reviewQueueRows.length ? "source_review" : "manual_verified",
      detail: reviewQueueRows.length
        ? reviewQueueRows.map((row) => row.title).slice(0, 3).join(" · ")
        : "No open review cards in the selected story.",
      metric: `${pluralize(reviewQueueRows.length, "review item")}`,
    },
    {
      label: "Locked From Copy",
      status: lockedRows.length ? "missing_vintage_slot" : "manual_verified",
      detail: lockedRows.length
        ? lockedRows.map((row) => row.title).slice(0, 3).join(" · ")
        : "No locked cards under the current filters.",
      metric: `${pluralize(lockedRows.length, "locked item")}`,
    },
    {
      label: "Evidence Needed Next",
      status: facts.manualLabels ? "manual_verified" : facts.visibleLabels ? "label_visible" : "candidate_needs_panel",
      detail: storyNextEvidenceStep(card, evidenceRows),
      metric: facts.manualLabels ? "verify gaps" : facts.visibleLabels ? "transcribe" : "source hunt",
    },
  ];
}

function renderStoryReview(card, evidenceRows) {
  if (!els.storyReview) return;
  if (!card) {
    els.storyReview.innerHTML = `<p class="empty-note">No editorial review board is available for the current filters.</p>`;
    return;
  }
  const rows = storyReviewRows(card, evidenceRows);
  const buckets = storyReviewBucketDefinitions();
  const handoffRows = storyReviewHandoffRows(card, evidenceRows, rows);
  const counts = buckets.reduce((acc, bucket) => {
    acc[bucket.key] = rows.filter((row) => row.bucket === bucket.key).length;
    return acc;
  }, {});
  els.storyReview.innerHTML = `
    <article class="story-review">
      <header class="story-review-head">
        <div>
          <p class="eyebrow">Editorial Review Board</p>
          <h2>${escapeHtml(storyDisplayTitle(card))}</h2>
          <p>Collection is paused here. This board only packages the current evidence into story readiness, claim locks, and handoff tasks.</p>
        </div>
        <aside class="story-review-score" aria-label="Editorial readiness counts">
          ${buckets
            .map((bucket) => `
              <span class="review-count-${escapeHtml(bucket.key)}">
                <strong>${formatNumber(counts[bucket.key] || 0)}</strong>${escapeHtml(bucket.label)}
              </span>
            `)
            .join("")}
        </aside>
      </header>
      <div class="story-review-columns">
        ${buckets
          .map((bucket) => {
            const bucketRows = rows.filter((row) => row.bucket === bucket.key);
            return `
              <section class="story-review-lane review-lane-${escapeHtml(bucket.key)}" aria-label="${escapeHtml(bucket.label)} review lane">
                <header>
                  <span>${escapeHtml(bucket.label)}</span>
                  <strong>${formatNumber(bucketRows.length)}</strong>
                  <p>${escapeHtml(bucket.detail)}</p>
                </header>
                <div class="story-review-card-list">
                  ${bucketRows.length
                    ? bucketRows
                      .map((row) => `
                        <article class="story-review-card status-${escapeHtml(row.status || "unknown")}">
                          <span>${escapeHtml(row.area)}</span>
                          <strong>${escapeHtml(row.title)}</strong>
                          <p>${escapeHtml(clipped(row.detail, 150))}</p>
                          <div class="lead-meta">
                            ${statusTag(row.status || "unknown")}
                            <span class="status-tag">${escapeHtml(row.metric || "review")}</span>
                          </div>
                        </article>
                      `)
                      .join("")
                    : `<p class="empty-note">No items in this lane.</p>`}
                </div>
              </section>
            `;
          })
          .join("")}
      </div>
      <footer class="story-review-handoff" aria-label="Editorial handoff summary">
        ${handoffRows
          .map((row) => `
            <article class="story-review-handoff-card status-${escapeHtml(row.status || "unknown")}">
              <span>${escapeHtml(row.label)}</span>
              <strong>${escapeHtml(row.metric)}</strong>
              <p>${escapeHtml(clipped(row.detail, 150))}</p>
            </article>
          `)
          .join("")}
      </footer>
    </article>
  `;
}

function storyLensNarrative(card, evidenceRows, lensKey = state.storyLens) {
  const facts = storyEvidenceFacts(evidenceRows);
  const lens = storyLensOptions.find((option) => option.key === lensKey) || storyLensOptions[0];
  const product = card.product;
  const productName = storyDisplayTitle(card);
  const supported = storySupportedNow(card, evidenceRows);
  const blockedDiffs = storyCannotSayYet(card, evidenceRows);
  const unlock = storyNextEvidenceStep(card, evidenceRows);
  const packageName = product ? product.display_name || product.canonical_name : card.title || "This evidence lane";

  if (lens.key === "package") {
    const status = facts.packageFields ? "candidate_found" : "candidate_needs_panel";
    return {
      lens,
      status,
      headline: `${productName}: the package context story`,
      lede: facts.packageFields
        ? `${packageName} has package-size or serving clues that can sit beside ingredient evidence after SKU review.`
        : `${packageName} still needs net weight, serving size, or package-format evidence before size changes can be narrated.`,
      canSay: facts.packageFields
        ? `${pluralize(facts.packageFields, "package field")} are present as candidate context. They can explain what must be reviewed before package-size changes become claims.`
        : "The story can show package-size context as a missing layer, but it should not infer downsizing or serving-size changes yet.",
      boundary: "Do not normalize price, compare downsizing, or collapse package formats until weight and serving fields are tied to the same SKU evidence.",
      unlock: "Review package photos or source documents for net weight, serving size, servings per container, and package format.",
      metrics: [
        ["Package fields", facts.packageFields],
        ["Price clues", facts.priceFields],
        ["Source links", facts.sourceLinks],
      ],
    };
  }

  if (lens.key === "maker") {
    const status = facts.orgFields ? "source_review" : "no_source";
    return {
      lens,
      status,
      headline: `${productName}: the maker and distributor story`,
      lede: facts.orgFields
        ? `${packageName} has organization clues that can support a manufacturer or distributor timeline after product/date review.`
        : `${packageName} still lacks reviewed organization text for a defensible maker timeline.`,
      canSay: facts.orgFields
        ? `${pluralize(facts.orgFields, "organization clue")} are attached to the selected evidence records.`
        : "The story can identify the intended maker lane, but it should not assert ownership or distributor changes from product name alone.",
      boundary: "Do not merge variants across manufacturer or distributor changes until identity rules and source text agree.",
      unlock: "Capture manufacturer, distributor, copyright, trademark, and source-owner text from each package or document.",
      metrics: [
        ["Org clues", facts.orgFields],
        ["Source links", facts.sourceLinks],
        ["Rights notes", facts.rightsNotes],
      ],
    };
  }

  if (lens.key === "economics") {
    const aligned = facts.priceFields && facts.packageFields;
    return {
      lens,
      status: aligned ? "candidate_found" : "candidate_needs_archive",
      headline: `${productName}: the price and weight overlay`,
      lede: aligned
        ? `${packageName} has the first ingredients of a normalized economics view: price clues and package context.`
        : `${packageName} does not yet have enough aligned price and package evidence for normalized analysis.`,
      canSay: aligned
        ? `${pluralize(facts.priceFields, "price clue")} and ${pluralize(facts.packageFields, "package field")} can be reviewed together before price-per-ounce or price-per-serving exports.`
        : "The UX can explain why economics are deferred while still showing which package and price fields are missing.",
      boundary: "Do not compare price changes against formulation changes until SKU identity, package weight, and price capture context match.",
      unlock: "Attach price observations to reviewed SKU/package evidence, then compute nominal price per ounce, per 100g, and per serving.",
      metrics: [
        ["Price clues", facts.priceFields],
        ["Package fields", facts.packageFields],
        ["Source links", facts.sourceLinks],
      ],
    };
  }

  if (lens.key === "provenance") {
    return {
      lens,
      status: facts.sourceLinks ? "source_review" : "no_source",
      headline: `${productName}: the source trail story`,
      lede: facts.sourceLinks
        ? `${packageName} has source-attributable records, but each claim still needs owner, date, rights, and review state visible.`
        : `${packageName} remains a gap until a source-attributable record exists.`,
      canSay: facts.sourceLinks
        ? `${pluralize(facts.sourceLinks, "source link")} and ${pluralize(facts.rightsNotes, "rights note")} are attached to the selected story evidence.`
        : "The story can say this is unsupported, and that absence is itself visible to the reader.",
      boundary: "Do not show a product/vintage claim without a source URL, owner or publisher, date basis, review state, and rights note where available.",
      unlock: "Promote the strongest source receipts after checking attribution, archive coordinates, image visibility, and claim linkage.",
      metrics: [
        ["Source links", facts.sourceLinks],
        ["Rights notes", facts.rightsNotes],
        ["Verified labels", facts.manualLabels],
      ],
    };
  }

  return {
    lens,
    status: facts.manualLabels ? "manual_verified" : facts.visibleLabels ? "label_visible" : "candidate_needs_panel",
    headline: `${productName}: the ingredient-change story`,
    lede: storyReaderHeadline(card, evidenceRows).dek,
    canSay: facts.manualLabels
      ? `${pluralize(facts.manualLabels, "manual-verified label")} can support scoped ingredient claims. ${supported}`
      : `${supported} This is evidence coverage, not a formulation-diff claim.`,
    boundary: blockedDiffs,
    unlock,
    metrics: [
      ["Verified labels", facts.manualLabels],
      ["Visible panels", facts.visibleLabels],
      ["OCR records", facts.ocrLabels],
    ],
  };
}

function renderStoryLensControls(card, evidenceRows) {
  return storyLensOptions
    .map((option) => {
      const narrative = storyLensNarrative(card, evidenceRows, option.key);
      const selected = option.key === activeStoryLens().key;
      return `
        <button class="reader-lens ${selected ? "is-selected" : ""} status-${escapeHtml(narrative.status)}" type="button" data-story-lens="${escapeHtml(option.key)}">
          <span>${escapeHtml(option.shortLabel)}</span>
          <strong>${escapeHtml(option.label)}</strong>
          <em>${escapeHtml(statusLabels[narrative.status] || labelFor(narrative.status))}</em>
        </button>
      `;
    })
    .join("");
}

function storyVisualMilestoneRows(card, evidenceRows) {
  const rows = storyEraRows(card, evidenceRows);
  if (card.product) {
    return rows.map((row, index) => ({
      ...row,
      number: String(index + 1).padStart(2, "0"),
      headline: row.label,
      subhead: statusLabels[row.status] || labelFor(row.status || "unknown"),
    }));
  }
  return rows.map((row, index) => ({
    ...row,
    number: String(index + 1).padStart(2, "0"),
    headline: row.label,
    subhead: pluralize(row.count, "record"),
  }));
}

function storyVisualOverlayRows(card, evidenceRows) {
  return storyLensOptions.map((option) => {
    const narrative = storyLensNarrative(card, evidenceRows, option.key);
    const metric = narrative.metrics?.[0] || ["Evidence", 0];
    return {
      label: option.shortLabel,
      title: option.label,
      status: narrative.status,
      value: `${metric[0]}: ${formatNumber(metric[1])}`,
      detail: narrative.boundary,
    };
  });
}

function renderReaderVisual(card, evidenceRows) {
  const milestones = storyVisualMilestoneRows(card, evidenceRows);
  const overlays = storyVisualOverlayRows(card, evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const bestSource = storyBestSource(evidenceRows);
  return `
    <article class="reader-visual-map status-${escapeHtml(publicationState.status)}">
      <div class="reader-visual-head">
        <div>
          <p class="eyebrow">Visual Arc</p>
          <h3>${escapeHtml(storyDisplayTitle(card))}</h3>
        </div>
        <div class="lead-meta">
          ${statusTag(publicationState.status)}
          <span class="status-tag">${escapeHtml(publicationState.label)}</span>
          ${bestSource.source ? linkOrText(bestSource.source, bestSource.label || "Source") : ""}
        </div>
      </div>
      <div class="reader-visual-track" aria-label="Timeline proof states">
        ${milestones
          .map((row) => `
            <article class="reader-visual-node status-${escapeHtml(row.status || "unknown")}">
              <span>${escapeHtml(row.number)}</span>
              <strong>${escapeHtml(row.headline)}</strong>
              <em>${escapeHtml(row.subhead)}</em>
              <p>${escapeHtml(clipped(row.detail, 132))}</p>
              <div class="lead-meta">
                <span class="status-tag">${formatNumber(row.count)} sources</span>
                ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
              </div>
            </article>
          `)
          .join("")}
      </div>
    </article>
    <aside class="reader-visual-overlays" aria-label="Story overlays">
      ${overlays
        .map((row) => `
          <article class="reader-visual-overlay status-${escapeHtml(row.status || "unknown")}">
            <span>${escapeHtml(row.label)}</span>
            <strong>${escapeHtml(row.title)}</strong>
            <p>${escapeHtml(row.value)}</p>
            <em>${escapeHtml(clipped(row.detail, 118))}</em>
          </article>
        `)
        .join("")}
    </aside>
  `;
}

function storyScriptParagraphRows(card, evidenceRows) {
  const narrative = storyLensNarrative(card, evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const facts = storyEvidenceFacts(evidenceRows);
  const sourceText = facts.sourceLinks
    ? `${pluralize(facts.sourceLinks, "source receipt")} are attached, but each one still carries its own date, owner, rights, and review state.`
    : "No source receipt is attached under the current filters, so the reader-facing story starts by naming the unsupported gap.";
  return [
    {
      label: "Open",
      text: `${publicationState.detail} ${narrative.lede || storyReaderHeadline(card, evidenceRows).dek}`,
    },
    {
      label: "Evidence",
      text: narrative.canSay,
    },
    {
      label: "Receipts",
      text: sourceText,
    },
    {
      label: "Boundary",
      text: narrative.boundary,
    },
    {
      label: "Next",
      text: narrative.unlock,
    },
  ];
}

function storyScriptBeatRows(card, evidenceRows) {
  const narrative = storyLensNarrative(card, evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const bestSource = storyBestSource(evidenceRows);
  const facts = storyEvidenceFacts(evidenceRows);
  const product = card.product;
  const currentRows = product ? vintageEvidenceRows(product, evidenceRows, "current_2020s") : [];
  const currentBest = bestEvidenceRows(currentRows, 1)[0] || {};
  const earliestRows = product ? vintageEvidenceRows(product, evidenceRows, "earliest_verified_label") : [];
  const earliestBest = bestEvidenceRows(earliestRows, 1)[0] || {};
  const currentStatus = currentBest.source_url || currentBest.archive_url
    ? rowEvidenceStatus(currentBest)
    : product?.vintage_statuses?.current_2020s?.status || bestSource.status || "source_review";
  const earliestStatus = earliestBest.source_url || earliestBest.archive_url
    ? rowEvidenceStatus(earliestBest)
    : product?.vintage_statuses?.earliest_verified_label?.status || "missing_vintage_slot";
  return [
    {
      label: "Question",
      title: "The reader enters through a change question",
      body: storyQuestion(card),
      status: publicationState.status,
    },
    {
      label: "Now",
      title: currentBest.source_title || currentBest.source_domain || "Current anchor",
      body: currentBest.reviewer_notes || currentBest.promotion_blocker || "Keep the present-day label tied to SKU/package context before comparing it to older evidence.",
      status: currentStatus,
      source: currentBest.source_url || currentBest.archive_url || "",
      sourceLabel: currentBest.source_domain || "Source",
    },
    {
      label: "Then",
      title: storyGapLabel(card),
      body: earliestBest.reviewer_notes || earliestBest.unsupported_gap_note || "The earliest chapter should stay visible as a chapter with a proof state, not as implied history.",
      status: earliestStatus,
      source: earliestBest.source_url || earliestBest.archive_url || "",
      sourceLabel: earliestBest.source_domain || "Source",
    },
    {
      label: activeStoryLens().shortLabel,
      title: narrative.headline,
      body: narrative.lede,
      status: narrative.status,
    },
    {
      label: "Receipt",
      title: bestSource.title,
      body: bestSource.detail,
      status: bestSource.status,
      source: bestSource.source,
      sourceLabel: bestSource.label,
    },
    {
      label: "Publish",
      title: facts.manualLabels ? "Scoped claim can publish" : "Claim stays in review",
      body: facts.manualLabels
        ? "Only the verified label chapters can carry ingredient-change language; unresolved eras stay labeled as gaps."
        : "The UX can publish the research state and proof chase, but not a formulation-diff claim yet.",
      status: facts.manualLabels ? "manual_verified" : facts.visibleLabels ? "label_visible" : "candidate_needs_panel",
    },
  ];
}

function renderReaderScript(card, evidenceRows) {
  const headline = storyReaderHeadline(card, evidenceRows);
  const narrative = storyLensNarrative(card, evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const facts = storyEvidenceFacts(evidenceRows);
  const paragraphs = storyScriptParagraphRows(card, evidenceRows);
  const beats = storyScriptBeatRows(card, evidenceRows);
  return `
    <article class="reader-script-article status-${escapeHtml(publicationState.status)}">
      <div class="reader-script-copy">
        <p class="eyebrow">Reader Draft</p>
        <h3>${escapeHtml(headline.title)}</h3>
        <p>${escapeHtml(headline.dek)}</p>
      </div>
      <div class="reader-script-factbar" aria-label="Story proof facts">
        <span><strong>${escapeHtml(publicationState.label)}</strong>State</span>
        <span><strong>${formatNumber(facts.manualLabels)}</strong>Verified labels</span>
        <span><strong>${formatNumber(facts.visibleLabels)}</strong>Visible panels</span>
        <span><strong>${formatNumber(facts.sourceLinks)}</strong>Receipts</span>
      </div>
      <div class="reader-script-prose">
        ${paragraphs
          .map((row) => `
            <p>
              <strong>${escapeHtml(row.label)}</strong>
              ${escapeHtml(row.text)}
            </p>
          `)
          .join("")}
      </div>
      <div class="lead-meta">
        ${statusTag(publicationState.status)}
        ${statusTag(narrative.status)}
        <span class="status-tag">${escapeHtml(activeStoryLens().label)} lens</span>
      </div>
    </article>
    <aside class="reader-script-beats" aria-label="Narrative beat board">
      ${beats
        .map((row) => `
          <article class="reader-script-beat status-${escapeHtml(row.status || "unknown")}">
            <span>${escapeHtml(row.label)}</span>
            <strong>${escapeHtml(row.title)}</strong>
            <p>${escapeHtml(clipped(row.body, 150))}</p>
            <div class="lead-meta">
              ${statusTag(row.status || "unknown")}
              ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
            </div>
          </article>
        `)
        .join("")}
    </aside>
  `;
}

function chapterClaimState(status) {
  if (["manual_verified", "ground_truth_ready"].includes(status)) {
    return {
      label: "Claim-ready",
      body: "Reviewed text can support a scoped claim, while adjacent eras still need their own proof.",
    };
  }
  if (["ocr_extracted", "label_visible"].includes(status)) {
    return {
      label: "Text-ready",
      body: "This chapter can say evidence is readable or extractable, but not that a formulation change is verified.",
    };
  }
  if (["usable_photo", "source_review", "candidate_found", "candidate_needs_archive", "candidate_needs_panel", "candidate_needs_transcription"].includes(status)) {
    return {
      label: "Evidence lead",
      body: "This can appear as a sourced research lead until label role, date basis, and product identity are reviewed.",
    };
  }
  return {
    label: "Gap",
    body: "This chapter should be shown as an unresolved gap, not smoothed into implied product history.",
  };
}

function storyArticleChapterRows(card, evidenceRows) {
  const product = card.product;
  if (!product) {
    return workflowStatuses().map((status, index) => {
      const rows = evidenceRows.filter((row) => rowEvidenceStatus(row) === status);
      const best = bestEvidenceRows(rows, 1)[0] || {};
      const claim = chapterClaimState(status);
      return {
        number: String(index + 1).padStart(2, "0"),
        label: statusLabels[status] || labelFor(status),
        title: claim.label,
        status,
        lead: statusNarrative(status),
        boundary: claim.body,
        sourceCount: rows.length,
        source: best.source_url || best.archive_url || "",
        sourceLabel: best.source_domain || "Source",
      };
    });
  }

  return state.data.vintages.map((vintage, index) => {
    const info = product.vintage_statuses[vintage] || { status: "unknown", source_count: 0 };
    const rows = vintageEvidenceRows(product, evidenceRows, vintage);
    const best = bestEvidenceRows(rows, 1)[0] || {};
    const status = info.status || "unknown";
    const claim = chapterClaimState(status);
    const sourceCount = numeric(info.source_count || rows.length);
    const lead = storyChapterBody(product, vintage, info, rows);
    const oreoOriginBoundary = /oreo/i.test(`${product.display_name || ""} ${product.canonical_name || ""}`) && vintage === "earliest_verified_label"
      ? "The original 1912 ingredient label is not verified; vintage package leads cannot stand in for an origin-label transcription."
      : claim.body;
    return {
      number: String(index + 1).padStart(2, "0"),
      label: vintageLabels[vintage] || vintage,
      title: storyChapterTitle(vintage),
      status,
      lead,
      boundary: oreoOriginBoundary,
      sourceCount,
      source: best.source_url || best.archive_url || "",
      sourceLabel: best.source_domain || "Source",
    };
  });
}

function renderReaderChapters(card, evidenceRows) {
  const chapters = storyArticleChapterRows(card, evidenceRows);
  const facts = storyEvidenceFacts(evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const ledger = storyClaimLedgerRows(card, evidenceRows).slice(0, 4);
  return `
    <article class="reader-chapter-manuscript status-${escapeHtml(publicationState.status)}">
      <div class="reader-chapter-head">
        <div>
          <p class="eyebrow">Article Outline</p>
          <h3>${escapeHtml(storyReaderHeadline(card, evidenceRows).title)}</h3>
        </div>
        <div class="reader-chapter-proof">
          <span><strong>${formatNumber(facts.sourceLinks)}</strong>receipts</span>
          <span><strong>${formatNumber(facts.visibleLabels)}</strong>visible panels</span>
          <span><strong>${formatNumber(facts.manualLabels)}</strong>verified labels</span>
        </div>
      </div>
      <div class="reader-chapter-list">
        ${chapters
          .map((row) => `
            <section class="reader-article-chapter status-${escapeHtml(row.status || "unknown")}">
              <div class="reader-article-chapter-num">${escapeHtml(row.number)}</div>
              <div>
                <span>${escapeHtml(row.label)}</span>
                <h4>${escapeHtml(row.title)}</h4>
                <p>${escapeHtml(row.lead)}</p>
                <p class="reader-chapter-boundary">${escapeHtml(row.boundary)}</p>
                <div class="lead-meta">
                  ${statusTag(row.status || "unknown")}
                  <span class="status-tag">${formatNumber(row.sourceCount)} sources</span>
                  ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
                </div>
              </div>
            </section>
          `)
          .join("")}
      </div>
    </article>
    <aside class="reader-chapter-sidebar" aria-label="Article claim rules">
      <div class="reader-chapter-sidebar-head">
        <span>Claim Rules</span>
        <strong>${escapeHtml(publicationState.label)}</strong>
      </div>
      ${ledger
        .map((row) => `
          <article class="reader-chapter-rule status-${escapeHtml(row.status || "unknown")}">
            <span>${escapeHtml(row.claim)}</span>
            <strong>${escapeHtml(row.state)}</strong>
            <p>${escapeHtml(clipped(row.detail, 150))}</p>
          </article>
        `)
        .join("")}
    </aside>
  `;
}

function storySceneRows(card, evidenceRows) {
  const narrative = storyLensNarrative(card, evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const facts = storyEvidenceFacts(evidenceRows);
  const bestSource = storyBestSource(evidenceRows);
  const headline = storyReaderHeadline(card, evidenceRows);
  const visibleOrVerified = facts.manualLabels || facts.visibleLabels || facts.ocrLabels;
  const packageOrPrice = facts.packageFields || facts.priceFields;
  const missingChapters = card.product
    ? storyEraRows(card, evidenceRows).filter((row) => ["no_source", "missing_vintage_slot", "candidate_needs_panel", "candidate_needs_transcription"].includes(row.status)).length
    : 0;
  const firstReceipt = storyReceiptRows(evidenceRows)[0] || {};

  return [
    {
      number: "01",
      label: "Lead",
      title: headline.title,
      body: headline.dek,
      status: publicationState.status,
      proof: publicationState.label,
      source: firstReceipt.source || bestSource.source,
      sourceLabel: firstReceipt.sourceLabel || bestSource.label,
    },
    {
      number: "02",
      label: "Evidence",
      title: facts.sourceLinks ? "Receipts exist, but they still have jobs" : "This chapter starts as an unsupported gap",
      body: facts.sourceLinks
        ? `${pluralize(facts.sourceLinks, "source link")} are attached. The story still separates source ownership, date basis, label visibility, rights notes, and manual verification instead of treating every lead as proof.`
        : "No source-attributable evidence is attached under the current filters, so the reader should see a gap rather than a claim.",
      status: facts.sourceLinks ? "source_review" : "no_source",
      proof: facts.rightsNotes ? `${pluralize(facts.rightsNotes, "rights note")}` : `${pluralize(facts.sourceLinks, "source link")}`,
      source: bestSource.source,
      sourceLabel: bestSource.label,
    },
    {
      number: "03",
      label: activeStoryLens().shortLabel,
      title: narrative.headline,
      body: narrative.canSay,
      status: narrative.status,
      proof: narrative.metrics.map(([label, value]) => `${label}: ${formatNumber(value)}`).join(" · "),
      source: bestSource.source,
      sourceLabel: bestSource.label,
    },
    {
      number: "04",
      label: "Boundary",
      title: "The story says what it cannot say",
      body: narrative.boundary,
      status: "missing_vintage_slot",
      proof: missingChapters ? `${pluralize(missingChapters, "open chapter")}` : storyGapLabel(card),
      source: "",
      sourceLabel: "",
    },
    {
      number: "05",
      label: "Unlock",
      title: visibleOrVerified ? "Turn visible label evidence into ground truth" : packageOrPrice ? "Attach package context to the proof trail" : "Find the next readable source",
      body: narrative.unlock,
      status: facts.manualLabels ? "manual_verified" : facts.visibleLabels ? "label_visible" : facts.usablePhotos ? "usable_photo" : "candidate_needs_panel",
      proof: `${pluralize(facts.manualLabels, "verified label")} · ${pluralize(facts.visibleLabels, "visible panel")} · ${pluralize(facts.packageFields, "package field")}`,
      source: firstReceipt.source || "",
      sourceLabel: firstReceipt.sourceLabel || "Source",
    },
  ];
}

function renderReaderScenes(card, evidenceRows) {
  const rows = storySceneRows(card, evidenceRows);
  const receipts = storyReceiptRows(evidenceRows).slice(0, 4);
  return `
    <div class="reader-scene-track">
      ${rows
        .map((row) => `
          <article class="reader-scene status-${escapeHtml(row.status || "unknown")}">
            <header>
              <span>${escapeHtml(row.number)}</span>
              <div>
                <em>${escapeHtml(row.label)}</em>
                <strong>${escapeHtml(row.title)}</strong>
              </div>
            </header>
            <p>${escapeHtml(row.body)}</p>
            <div class="reader-scene-meta">
              ${statusTag(row.status || "unknown")}
              <span class="status-tag">${escapeHtml(clipped(row.proof, 96))}</span>
              ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
            </div>
          </article>
        `)
        .join("")}
    </div>
    <aside class="reader-scene-ledger" aria-label="Scene receipt ledger">
      <div>
        <span>Receipt Stack</span>
        <strong>${pluralize(receipts.length, "source")}</strong>
      </div>
      ${receipts.length
        ? receipts
          .map((row) => `
            <article class="reader-scene-receipt status-${escapeHtml(row.status || "unknown")}">
              <span>${escapeHtml(row.dateBasis)}</span>
              <strong>${escapeHtml(row.title)}</strong>
              <p>${escapeHtml(clipped(row.detail || `${row.owner} · ${row.rights}`, 110))}</p>
              <div class="lead-meta">
                ${statusTag(row.status || "unknown")}
                ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
              </div>
            </article>
          `)
          .join("")
        : `<p class="empty-note">No source receipts are attached to these scenes.</p>`}
    </aside>
  `;
}

function renderReaderPreview(card, evidenceRows) {
  const narrative = storyLensNarrative(card, evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const headline = storyReaderHeadline(card, evidenceRows);
  const chapters = storyEraRows(card, evidenceRows).slice(0, card.product ? state.data.vintages.length : 5);
  const receipts = storyReceiptRows(evidenceRows).slice(0, 3);
  return `
    <article class="reader-preview-article status-${escapeHtml(narrative.status)}">
      <p class="eyebrow">${escapeHtml(narrative.lens.label)} Lens</p>
      <h3>${escapeHtml(narrative.headline || headline.title)}</h3>
      <p class="reader-preview-dek">${escapeHtml(narrative.lede || headline.dek)}</p>
      <div class="reader-preview-meter">
        ${statusTag(publicationState.status, `evidence-${publicationState.status}`)}
        <span class="status-tag">${escapeHtml(publicationState.label)}</span>
        ${narrative.metrics
          .map(([label, value]) => `<span class="status-tag">${escapeHtml(label)}: ${escapeHtml(formatNumber(value))}</span>`)
          .join("")}
      </div>
      <div class="reader-preview-copy">
        <p><strong>What the reader can be told:</strong> ${escapeHtml(narrative.canSay)}</p>
        <p><strong>Claim boundary:</strong> ${escapeHtml(narrative.boundary)}</p>
        <p><strong>Next scene to unlock:</strong> ${escapeHtml(narrative.unlock)}</p>
      </div>
    </article>
    <aside class="reader-preview-side">
      <div class="reader-chapter-rail" aria-label="Story chapter proof states">
        ${chapters
          .map((row) => `
            <article class="reader-preview-chapter status-${escapeHtml(row.status || "unknown")}">
              <span>${escapeHtml(row.label)}</span>
              <strong>${escapeHtml(statusLabels[row.status] || labelFor(row.status || "unknown"))}</strong>
              <p>${escapeHtml(row.detail)}</p>
            </article>
          `)
          .join("")}
      </div>
      <div class="reader-preview-receipts" aria-label="Top source receipts">
        ${receipts.length
          ? receipts
            .map((row) => `
              <article class="reader-preview-receipt status-${escapeHtml(row.status || "unknown")}">
                <span>${escapeHtml(row.dateBasis)}</span>
                <strong>${escapeHtml(row.title)}</strong>
                <p>${escapeHtml(clipped(row.detail || `${row.owner} · ${row.rights}`, 120))}</p>
                <div class="lead-meta">
                  ${statusTag(row.status)}
                  ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
                </div>
              </article>
            `)
            .join("")
          : `<p class="empty-note">No receipts are attached to this story yet.</p>`}
      </div>
    </aside>
  `;
}

function storyClaimLedgerRows(card, evidenceRows) {
  const facts = storyEvidenceFacts(evidenceRows);
  const product = card.product;
  const lockedDiffText = product
    ? `${product.panel_needed_vintages || product.missing_vintages || "open vintage slots"} still need readable labels.`
    : "Product-specific formulation claims still need source, date, and verified text.";
  return [
    {
      claim: "Ingredient changes",
      state: facts.manualLabels ? "scoped claim allowed" : "locked",
      status: facts.manualLabels ? "manual_verified" : facts.visibleLabels ? "label_visible" : "source_review",
      evidence: facts.manualLabels ? `${pluralize(facts.manualLabels, "verified label")}` : `${pluralize(facts.visibleLabels, "label-visible lead")}`,
      detail: facts.manualLabels
        ? "Only vintages with reviewed label text can carry ingredient diffs."
        : `No manual-verified ingredient statement is present. ${lockedDiffText}`,
    },
    {
      claim: "Package size and serving context",
      state: facts.packageFields ? "candidate context" : "waiting",
      status: facts.packageFields ? "candidate_found" : "candidate_needs_panel",
      evidence: facts.packageFields ? `${pluralize(facts.packageFields, "package field")}` : "no package fields",
      detail: facts.packageFields
        ? "Net weight, serving size, or servings fields can be reviewed beside formulation evidence."
        : "Price normalization stays blocked until package size and serving fields are captured.",
    },
    {
      claim: "Maker and distributor timeline",
      state: facts.orgFields ? "candidate context" : "waiting",
      status: facts.orgFields ? "source_review" : "no_source",
      evidence: facts.orgFields ? `${pluralize(facts.orgFields, "organization clue")}` : product?.brand || "no maker text",
      detail: facts.orgFields
        ? "Organization text exists, but ownership and distributor changes still need product/date review."
        : "Manufacturer, distributor, or source-owner text needs to be attached before identity changes become story claims.",
    },
    {
      claim: "Price and weight overlay",
      state: facts.priceFields && facts.packageFields ? "alignment candidate" : "deferred",
      status: facts.priceFields && facts.packageFields ? "candidate_found" : "candidate_needs_archive",
      evidence: `${pluralize(facts.priceFields, "price clue")} · ${pluralize(facts.packageFields, "package clue")}`,
      detail: facts.priceFields && facts.packageFields
        ? "Later analysis can normalize price against package fields after SKU identity review."
        : "The story can show why economics are deferred without hiding package or price gaps.",
    },
    {
      claim: "Source provenance",
      state: facts.sourceLinks ? "attributable trail" : "unsupported gap",
      status: facts.sourceLinks ? "source_review" : "no_source",
      evidence: `${pluralize(facts.sourceLinks, "source link")} · ${pluralize(facts.rightsNotes, "rights note")}`,
      detail: facts.sourceLinks
        ? "The reader can trace each lead to a source owner, URL, archive coordinate, or rights note where recorded."
        : "No public story claim should be shown without a source-attributable evidence record.",
    },
  ];
}

function renderReaderClaimLedger(card, evidenceRows) {
  return storyClaimLedgerRows(card, evidenceRows)
    .map((row) => `
      <article class="reader-claim status-${escapeHtml(row.status || "unknown")}">
        <div>
          <span>${escapeHtml(row.claim)}</span>
          <strong>${escapeHtml(row.state)}</strong>
        </div>
        <p>${escapeHtml(row.detail)}</p>
        <div class="lead-meta">
          ${statusTag(row.status || "unknown")}
          <span class="status-tag">${escapeHtml(row.evidence)}</span>
        </div>
      </article>
    `)
    .join("");
}

function storyEraRows(card, evidenceRows) {
  const product = card.product;
  if (!product) {
    const counts = evidenceRows.reduce((acc, row) => {
      const status = rowEvidenceStatus(row);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return workflowStatuses().map((status) => ({
      label: statusLabels[status] || labelFor(status),
      status,
      count: counts[status] || 0,
      detail: statusNarrative(status),
      source: "",
      sourceLabel: "",
    }));
  }
  return state.data.vintages.map((vintage) => {
    const info = product.vintage_statuses[vintage] || { status: "unknown", source_count: 0 };
    const rows = vintageEvidenceRows(product, evidenceRows, vintage);
    const best = bestEvidenceRows(rows, 1)[0] || {};
    const source = best.source_url || best.archive_url || "";
    const note = best.unsupported_gap_note || best.reviewer_notes || best.promotion_blocker || statusNarrative(info.status || "unknown");
    return {
      label: vintageLabels[vintage] || vintage,
      status: info.status || "unknown",
      count: numeric(info.source_count || rows.length),
      detail: clipped(note, 116),
      source,
      sourceLabel: best.source_domain || "Source",
    };
  });
}

function renderReaderEraStrip(card, evidenceRows) {
  return storyEraRows(card, evidenceRows)
    .map((row) => `
      <article class="reader-era status-${escapeHtml(row.status || "unknown")}">
        <header>
          <strong>${escapeHtml(row.label)}</strong>
          <span>${formatNumber(row.count)}</span>
        </header>
        <p>${escapeHtml(row.detail)}</p>
        <div class="lead-meta">
          ${statusTag(row.status || "unknown")}
          ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
        </div>
      </article>
    `)
    .join("");
}

function storyUnlockRows(card, evidenceRows) {
  const product = card.product;
  const facts = storyEvidenceFacts(evidenceRows);
  if (!product) {
    return [
      {
        label: "Attribution gate",
        title: "Source owner and date before claim language",
        detail: `${pluralize(facts.sourceLinks, "source link")} can move the workflow only after owner, URL, archive/date basis, and rights notes are checked.`,
        status: facts.sourceLinks ? "source_review" : "no_source",
        source: "",
        sourceLabel: "",
      },
      {
        label: "Photo gate",
        title: "Visible package evidence before transcription",
        detail: `${pluralize(facts.usablePhotos, "usable photo")} and ${pluralize(facts.visibleLabels, "label-visible lead")} are the bridge from discovery into OCR or manual review.`,
        status: facts.visibleLabels ? "label_visible" : facts.usablePhotos ? "usable_photo" : "candidate_needs_panel",
        source: "",
        sourceLabel: "",
      },
      {
        label: "Text gate",
        title: "Manual labels before formulation diffs",
        detail: `${pluralize(facts.manualLabels, "manual-verified label")} are available in this view; ingredient changes remain locked when this count is zero.`,
        status: facts.manualLabels ? "manual_verified" : "label_visible",
        source: "",
        sourceLabel: "",
      },
      {
        label: "Overlay gate",
        title: "Package fields before normalized economics",
        detail: `${pluralize(facts.packageFields, "package field")} and ${pluralize(facts.priceFields, "price clue")} are needed together for price-per-ounce or price-per-serving analysis.`,
        status: facts.packageFields ? "candidate_found" : "candidate_needs_panel",
        source: "",
        sourceLabel: "",
      },
    ];
  }
  const labelQueue = bestEvidenceRows(
    evidenceRows.filter((row) => ["label_visible", "ocr_extracted", "usable_photo", "source_review"].includes(rowEvidenceStatus(row))),
    3,
  );
  const firstLabel = labelQueue[0] || {};
  const currentRows = product ? vintageEvidenceRows(product, evidenceRows, "current_2020s") : [];
  const currentBest = bestEvidenceRows(currentRows, 1)[0] || {};
  const originRows = product ? vintageEvidenceRows(product, evidenceRows, "earliest_verified_label") : [];
  const originBest = bestEvidenceRows(originRows, 1)[0] || {};
  const originGap = product && /oreo/i.test(`${product.display_name || ""} ${product.canonical_name || ""}`)
    ? "1912 original ingredient label not verified."
    : product?.missing_vintages
      ? `Missing vintages: ${product.missing_vintages}.`
      : `Panel review needed: ${product?.panel_needed_vintages || "open slots"}.`;

  return [
    {
      label: "Next readable label",
      title: firstLabel.source_title || firstLabel.source_domain || "Label candidate needed",
      detail: firstLabel.reviewer_notes || firstLabel.promotion_blocker || "Find a source-attributable package photo or document with readable ingredient text.",
      status: firstLabel.source_title || firstLabel.source_domain ? rowEvidenceStatus(firstLabel) : "candidate_needs_panel",
      source: firstLabel.source_url || firstLabel.archive_url || "",
      sourceLabel: firstLabel.source_domain || "Source",
    },
    {
      label: "Current anchor",
      title: currentBest.source_title || currentBest.source_domain || "Current SKU anchor",
      detail: currentBest.reviewer_notes || currentBest.promotion_blocker || "Current labels stay SKU- and package-specific until source/date review is complete.",
      status: currentBest.source_title || currentBest.source_domain ? rowEvidenceStatus(currentBest) : "candidate_needs_archive",
      source: currentBest.source_url || currentBest.archive_url || "",
      sourceLabel: currentBest.source_domain || "Source",
    },
    {
      label: "Origin chapter",
      title: originGap,
      detail: originBest.reviewer_notes || originBest.unsupported_gap_note || "The origin chapter remains visible as a gap unless a readable label source is attached.",
      status: originBest.source_title || originBest.source_domain ? rowEvidenceStatus(originBest) : "missing_vintage_slot",
      source: originBest.source_url || originBest.archive_url || "",
      sourceLabel: originBest.source_domain || "Source",
    },
    {
      label: "Overlay unlock",
      title: facts.packageFields ? "Package context can join the story" : "Package fields still needed",
      detail: facts.packageFields
        ? `${pluralize(facts.packageFields, "package field")} can support future price/weight normalization after SKU review.`
        : "Capture net weight, serving size, and package format when the label image is reviewed.",
      status: facts.packageFields ? "candidate_found" : "candidate_needs_panel",
      source: "",
      sourceLabel: "",
    },
  ];
}

function renderReaderUnlocks(card, evidenceRows) {
  return storyUnlockRows(card, evidenceRows)
    .map((row) => `
      <article class="reader-unlock status-${escapeHtml(row.status || "unknown")}">
        <span>${escapeHtml(row.label)}</span>
        <strong>${escapeHtml(row.title)}</strong>
        <p>${escapeHtml(clipped(row.detail, 155))}</p>
        <div class="lead-meta">
          ${statusTag(row.status || "unknown")}
          ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
        </div>
      </article>
    `)
    .join("");
}

function storyPublicationState(card, evidenceRows) {
  const manualLabels = evidenceRows.filter((row) => rowEvidenceStatus(row) === "manual_verified" || truthyFlag(row.manual_transcription_available)).length;
  const visibleLabels = evidenceRows.filter((row) => rowEvidenceStatus(row) === "label_visible" || truthyFlag(row.ingredient_panel_visible)).length;
  const usablePhotos = evidenceRows.filter((row) => rowEvidenceStatus(row) === "usable_photo").length;
  if (manualLabels) {
    return {
      label: "partial publication possible",
      detail: `${pluralize(manualLabels, "verified label")} can anchor claims, with unverified eras still shown as gaps.`,
      status: "manual_verified",
    };
  }
  if (visibleLabels) {
    return {
      label: "transcription-ready story",
      detail: `${pluralize(visibleLabels, "label-visible record")} can move into OCR/manual review before ingredient diffs are published.`,
      status: "label_visible",
    };
  }
  if (usablePhotos) {
    return {
      label: "photo-led research story",
      detail: `${pluralize(usablePhotos, "usable photo")} can show package history, but ingredient claims still need readable panels.`,
      status: "usable_photo",
    };
  }
  if (card.product) {
    return {
      label: "source-discovery story",
      detail: "This is not yet a formulation story; it is a map of source leads, gaps, and review work.",
      status: "source_review",
    };
  }
  return {
    label: "workflow story",
    detail: "This view explains how evidence moves from a lead to a claim.",
    status: "discovered",
  };
}

function storyDisplayTitle(card) {
  return card?.product?.display_name || card?.product?.canonical_name || card?.title || "Evidence story";
}

function storyEvidenceStage(product, evidenceRows) {
  if (numeric(product?.ground_truth_slots) > 0 || evidenceRows.some((row) => rowEvidenceStatus(row) === "manual_verified" || truthyFlag(row.manual_transcription_available))) return 4;
  if (evidenceRows.some((row) => rowEvidenceStatus(row) === "ocr_extracted" || rowEvidenceStatus(row) === "label_visible" || truthyFlag(row.ingredient_panel_visible))) return 3;
  if (evidenceRows.some((row) => rowEvidenceStatus(row) === "usable_photo")) return 2;
  if (evidenceRows.some((row) => rowEvidenceStatus(row) === "source_review")) return 1;
  return evidenceRows.length ? 0 : -1;
}

function storyStageSteps(product, evidenceRows) {
  const stage = storyEvidenceStage(product, evidenceRows);
  return [
    ["discovered", "Lead", "A product/date/source hint exists."],
    ["source_review", "Source", "Attribution and source owner can be checked."],
    ["usable_photo", "Photo", "Package or document evidence can be reviewed."],
    ["label_visible", "Label", "Ingredient or disclosure text is visible enough to transcribe."],
    ["manual_verified", "Claim", "Reviewed text can support a public claim."],
  ].map(([status, label, detail], index) => ({
    status,
    label,
    detail,
    reached: stage >= index,
  }));
}

function storyGapLabel(card) {
  const product = card?.product;
  if (!product) return "Product-specific gaps remain until a source, date, and readable label are attached.";
  if (/oreo/i.test(`${product.display_name || ""} ${product.canonical_name || ""}`)) {
    return "1912 original ingredient label not verified.";
  }
  return product.missing_vintages
    ? `Missing source slots: ${product.missing_vintages}.`
    : `Needs panel or transcription review: ${product.panel_needed_vintages || product.archive_needed_vintages || "open slots"}.`;
}

function storyBestSource(evidenceRows) {
  const best = bestEvidenceRows(evidenceRows, 1)[0] || {};
  const source = best.source_url || best.archive_url || "";
  return {
    title: best.source_title || best.source_domain || best.evidence_kind || "No source selected",
    detail: best.reviewer_notes || best.unsupported_gap_note || best.promotion_blocker || best.ground_truth_fields_missing || "Open the provenance trail to inspect source, date, rights, and review state.",
    status: rowEvidenceStatus(best),
    source,
    label: best.source_domain || "Source",
  };
}

function renderReaderProgress(product, evidenceRows) {
  return `
    <div class="reader-progress" aria-label="Evidence-to-claim progress">
      ${storyStageSteps(product, evidenceRows)
        .map((step) => `
          <span class="${step.reached ? "is-reached" : ""} status-${escapeHtml(step.status)}">
            <strong>${escapeHtml(step.label)}</strong>
            ${escapeHtml(step.detail)}
          </span>
        `)
        .join("")}
    </div>
  `;
}

function readerStoryClusterRows(cards, selectedCard, registryRows) {
  const selectedKey = selectedCard?.key || "";
  const groups = new Map();
  cards
    .filter((card) => card.product)
    .forEach((card) => {
      const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : productEvidenceRows(card.product);
      const facts = storyEvidenceFacts(evidenceRows);
      const cluster = corpusCluster(card.product, evidenceRows.length ? evidenceRows : registryRows);
      const group = groups.get(cluster.key) || {
        ...cluster,
        products: 0,
        candidates: 0,
        visibleLabels: 0,
        manualLabels: 0,
        sourceLinks: 0,
        selected: false,
        topCards: [],
      };
      group.products += 1;
      group.candidates += numeric(card.product.product_candidate_count);
      group.visibleLabels += facts.visibleLabels;
      group.manualLabels += facts.manualLabels;
      group.sourceLinks += facts.sourceLinks;
      if (card.key === selectedKey) group.selected = true;
      if (group.topCards.length < 4) {
        group.topCards.push({ card, publicationState: storyPublicationState(card, evidenceRows) });
      }
      groups.set(cluster.key, group);
    });
  return [...groups.values()].sort((a, b) => (b.selected ? 1 : 0) - (a.selected ? 1 : 0) || b.products - a.products || b.visibleLabels - a.visibleLabels);
}

function renderReaderClusters(cards, selectedCard, registryRows) {
  const rows = readerStoryClusterRows(cards, selectedCard, registryRows);
  if (!rows.length) {
    return `<p class="empty-note">No story clusters match the current filters.</p>`;
  }
  return rows
    .map((row) => `
      <article class="reader-cluster-card ${row.selected ? "is-selected" : ""} status-${escapeHtml(row.status)}">
        <div class="reader-cluster-head">
          <div>
            <span>${escapeHtml(row.label)}</span>
            <strong>${formatNumber(row.products)} ${row.products === 1 ? "story" : "stories"}</strong>
          </div>
          ${statusTag(row.status)}
        </div>
        <p>${escapeHtml(row.detail)}</p>
        <div class="reader-cluster-stats">
          <span><strong>${formatNumber(row.candidates)}</strong>candidates</span>
          <span><strong>${formatNumber(row.visibleLabels)}</strong>visible</span>
          <span><strong>${formatNumber(row.manualLabels)}</strong>verified</span>
        </div>
        <div class="reader-cluster-products">
          ${row.topCards
            .map(({ card, publicationState }) => `
              <button class="reader-cluster-product ${card.key === selectedCard?.key ? "is-selected" : ""}" type="button" data-story-key="${escapeHtml(card.key)}">
                <span>${escapeHtml(card.kicker || labelFor(card.product?.category || "Product"))}</span>
                <strong>${escapeHtml(storyDisplayTitle(card))}</strong>
                <em>${escapeHtml(publicationState.label)}</em>
              </button>
            `)
            .join("")}
        </div>
      </article>
    `)
    .join("");
}

function readerGalleryCards(cards, selectedCard, registryRows) {
  const selectedKey = selectedCard?.key || "";
  const productCards = cards
    .filter((card) => card.product)
    .map((card) => {
      const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : productEvidenceRows(card.product);
      const facts = storyEvidenceFacts(evidenceRows);
      const publicationState = storyPublicationState(card, evidenceRows);
      const cluster = corpusCluster(card.product, evidenceRows.length ? evidenceRows : registryRows);
      return {
        card,
        evidenceRows,
        facts,
        publicationState,
        cluster,
        selected: card.key === selectedKey,
      };
    })
    .sort((a, b) => (b.selected ? 1 : 0) - (a.selected ? 1 : 0) || productStoryScore(b.card.product) - productStoryScore(a.card.product));
  return productCards.slice(0, 18);
}

function renderReaderGallery(cards, selectedCard, registryRows) {
  const rows = readerGalleryCards(cards, selectedCard, registryRows);
  if (!rows.length) {
    return `<p class="empty-note">No product stories match the current filters.</p>`;
  }
  return rows
    .map(({ card, facts, publicationState, cluster, selected }) => {
      const product = card.product;
      const sourcePath = storySourcePath(product, card.evidenceRows || []);
      return `
        <button class="reader-gallery-card ${selected ? "is-selected" : ""} status-${escapeHtml(cluster.status)}" type="button" data-story-key="${escapeHtml(card.key)}">
          <div class="reader-gallery-head">
            <div>
              <span>${escapeHtml(labelFor(product.category || "Product"))}</span>
              <strong>${escapeHtml(product.display_name || product.canonical_name)}</strong>
            </div>
            <em>${escapeHtml(cluster.label)}</em>
          </div>
          <div class="story-vintage-grid">${productVintageCells(product)}</div>
          <div class="reader-gallery-metrics">
            <span><strong>${formatNumber(product.product_candidate_count)}</strong>candidates</span>
            <span><strong>${formatNumber(facts.visibleLabels)}</strong>visible</span>
            <span><strong>${formatNumber(facts.manualLabels)}</strong>verified</span>
          </div>
          <p>${escapeHtml(clipped(storyGapLabel(card), 132))}</p>
          <div class="story-source-path">
            ${sourcePath.slice(0, 3).map((domain) => `<span>${escapeHtml(domain)}</span>`).join("")}
          </div>
          <div class="lead-meta">
            ${statusTag(publicationState.status)}
            <span class="status-tag">${escapeHtml(publicationState.label)}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function sourceOverlapScore(aRows, bRows) {
  const aDomains = new Set(aRows.map((row) => row.source_domain).filter(Boolean));
  if (!aDomains.size) return 0;
  return bRows.reduce((score, row) => score + (aDomains.has(row.source_domain) ? 1 : 0), 0);
}

function readerComparisonRows(cards, selectedCard, registryRows) {
  if (!selectedCard?.product) return [];
  const selectedRows = selectedCard.evidenceRows?.length ? selectedCard.evidenceRows : productEvidenceRows(selectedCard.product);
  const selectedCluster = corpusCluster(selectedCard.product, selectedRows.length ? selectedRows : registryRows);
  return cards
    .filter((card) => card.product && card.key !== selectedCard.key)
    .map((card) => {
      const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : productEvidenceRows(card.product);
      const facts = storyEvidenceFacts(evidenceRows);
      const cluster = corpusCluster(card.product, evidenceRows.length ? evidenceRows : registryRows);
      const sameCategory = card.product.category === selectedCard.product.category;
      const sameCluster = cluster.key === selectedCluster.key;
      const score =
        (sameCategory ? 1000 : 0) +
        (sameCluster ? 650 : 0) +
        sourceOverlapScore(selectedRows, evidenceRows) * 40 +
        numeric(card.product.product_candidate_count) * 3 +
        facts.visibleLabels * 12 +
        facts.packageFields * 8;
      return {
        card,
        evidenceRows,
        facts,
        cluster,
        publicationState: storyPublicationState(card, evidenceRows),
        sameCategory,
        sameCluster,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function renderReaderComparison(cards, selectedCard, registryRows) {
  const rows = readerComparisonRows(cards, selectedCard, registryRows);
  if (!rows.length) {
    return `<p class="empty-note">No related product stories match the current filters.</p>`;
  }
  return rows
    .map((row) => {
      const product = row.card.product;
      return `
        <button class="reader-compare-card status-${escapeHtml(row.cluster.status)}" type="button" data-story-key="${escapeHtml(row.card.key)}">
          <div class="reader-compare-head">
            <div>
              <span>${escapeHtml(labelFor(product.category || "Product"))}</span>
              <strong>${escapeHtml(product.display_name || product.canonical_name)}</strong>
            </div>
            <em>${escapeHtml(row.cluster.label)}</em>
          </div>
          <div class="reader-compare-flags">
            <span>${row.sameCategory ? "same category" : "cross category"}</span>
            <span>${row.sameCluster ? "same proof lane" : "different proof lane"}</span>
          </div>
          <div class="reader-compare-metrics">
            <span><strong>${formatNumber(row.facts.visibleLabels)}</strong>visible</span>
            <span><strong>${formatNumber(row.facts.packageFields)}</strong>package</span>
            <span><strong>${formatNumber(row.facts.sourceLinks)}</strong>sources</span>
          </div>
          <p>${escapeHtml(clipped(storyCannotSayYet(row.card, row.evidenceRows), 132))}</p>
          <div class="lead-meta">
            ${statusTag(row.publicationState.status)}
            <span class="status-tag">${escapeHtml(row.publicationState.label)}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function sourceLaneKey(row, product) {
  const blob = [
    row.source_domain,
    row.source_surface,
    row.evidence_kind,
    row.source_title,
    row.source_publisher_owner,
    row.source_attribution_grade,
    row.source_url,
  ].join(" ").toLowerCase();
  if (!row.source_url && !row.archive_url) return "unsupported_gap";
  if (/common.?crawl|warc|cdx|crawl/.test(blob)) return "common_crawl_archive";
  if (/restaurant|menu|allergen|mcdonald|burger king|bk\.com|wendy|taco bell|domino|subway|kfc|chipotle|pizza hut|dunkin/.test(blob) || product?.category === "fast food") return "restaurant_docs";
  if (/flickr|collector|jasonliebig|roadside|blog|museum|wikimedia|worthpoint|ebay|etsy|historic|americanhistory|si\.edu|loc\.gov/.test(blob)) return "collector_archive";
  if (/walmart|target|kroger|webstaurant|retailer|amazon|instacart|wegmans|safeway/.test(blob)) return "retailer_pages";
  if (/smartlabel|brand|official|mondelez|kraftheinz|hershey|coca-cola|pepsico|campbell|general mills|kellogg|nabisco|mars|unilever/.test(blob)) return "brand_current";
  if (/archive|wayback|library|catalog/.test(blob)) return "archive_pages";
  return "other_sources";
}

function sourceLaneMeta(key) {
  const meta = {
    brand_current: {
      label: "Brand / SmartLabel",
      status: "source_review",
      detail: "Useful for current SKU anchors, but still needs package/date review before history claims.",
    },
    collector_archive: {
      label: "Collectors + Archives",
      status: "usable_photo",
      detail: "High-value vintage package/photo leads; panels and rights still need review.",
    },
    retailer_pages: {
      label: "Retailer Pages",
      status: "candidate_found",
      detail: "Good for current labels, package size, price/weight context, and SKU hints.",
    },
    restaurant_docs: {
      label: "Restaurant Docs",
      status: "source_review",
      detail: "Menu, nutrition, allergen, and item documents need product/date reconciliation.",
    },
    common_crawl_archive: {
      label: "Common Crawl / WARC",
      status: "candidate_needs_archive",
      detail: "Discovery signal only until capture, date basis, product identity, and label text are reviewed.",
    },
    archive_pages: {
      label: "Archive Pages",
      status: "candidate_needs_archive",
      detail: "Durable historical coordinates; still need readable product evidence.",
    },
    unsupported_gap: {
      label: "Unsupported Gaps",
      status: "missing_vintage_slot",
      detail: "These chapters cannot carry claims until a source-attributable record exists.",
    },
    other_sources: {
      label: "Other Sources",
      status: "source_review",
      detail: "Source leads that need owner, rights, date, and product-role review.",
    },
  };
  return meta[key] || meta.other_sources;
}

function readerSourceLaneRows(card, evidenceRows) {
  const groups = new Map();
  evidenceRows.forEach((row) => {
    const key = sourceLaneKey(row, card.product);
    const meta = sourceLaneMeta(key);
    const group = groups.get(key) || {
      key,
      ...meta,
      rows: 0,
      sourceLinks: 0,
      visibleLabels: 0,
      rightsNotes: 0,
      domains: [],
      vintages: [],
      topRows: [],
    };
    group.rows += 1;
    if (row.source_url || row.archive_url) group.sourceLinks += 1;
    if (rowEvidenceStatus(row) === "label_visible" || truthyFlag(row.ingredient_panel_visible)) group.visibleLabels += 1;
    if (presentText(row.license_rights_note) || presentText(row.source_attribution_grade)) group.rightsNotes += 1;
    const domain = row.source_domain || row.source_publisher_owner || "";
    if (domain && !group.domains.includes(domain) && group.domains.length < 4) group.domains.push(domain);
    const vintage = vintageLabels[row.vintage_label] || row.vintage_label || "";
    if (vintage && !group.vintages.includes(vintage) && group.vintages.length < 5) group.vintages.push(vintage);
    if (group.topRows.length < 3) group.topRows.push(row);
    groups.set(key, group);
  });
  return [...groups.values()].sort((a, b) => {
    const priority = {
      collector_archive: 8,
      brand_current: 7,
      restaurant_docs: 6,
      retailer_pages: 5,
      archive_pages: 4,
      common_crawl_archive: 3,
      other_sources: 2,
      unsupported_gap: 1,
    };
    return (priority[b.key] || 0) - (priority[a.key] || 0) || b.rows - a.rows;
  });
}

function renderReaderSources(card, evidenceRows) {
  const rows = readerSourceLaneRows(card, evidenceRows);
  if (!rows.length) {
    return `<p class="empty-note">No source lanes are attached to this story under the current filters.</p>`;
  }
  return rows
    .map((row) => `
      <article class="reader-source-card status-${escapeHtml(row.status)}">
        <div class="reader-source-head">
          <div>
            <span>${escapeHtml(row.label)}</span>
            <strong>${pluralize(row.rows, "record")}</strong>
          </div>
          ${statusTag(row.status)}
        </div>
        <p>${escapeHtml(row.detail)}</p>
        <div class="reader-source-stats">
          <span><strong>${formatNumber(row.sourceLinks)}</strong>links</span>
          <span><strong>${formatNumber(row.visibleLabels)}</strong>visible</span>
          <span><strong>${formatNumber(row.rightsNotes)}</strong>rights</span>
        </div>
        <div class="reader-source-domains">
          ${(row.domains.length ? row.domains : ["No source domain"])
            .map((domain) => `<span>${escapeHtml(domain)}</span>`)
            .join("")}
        </div>
        <div class="reader-source-receipts">
          ${row.topRows
            .map((sourceRow) => {
              const source = sourceRow.source_url || sourceRow.archive_url || "";
              const title = sourceRow.source_title || sourceRow.unsupported_gap_note || sourceRow.evidence_kind || "Evidence record";
              return `
                <div>
                  <strong>${escapeHtml(vintageLabels[sourceRow.vintage_label] || sourceRow.vintage_label || "Evidence")}</strong>
                  <span>${escapeHtml(clipped(title, 94))}</span>
                  ${source ? linkOrText(source, sourceRow.source_domain || "Source") : `<span class="gap-label">Gap</span>`}
                </div>
              `;
            })
            .join("")}
        </div>
      </article>
    `)
    .join("");
}

function matrixFacetCell(facet, rows) {
  const facts = storyEvidenceFacts(rows);
  const hasSource = facts.sourceLinks > 0;
  const hasRights = facts.rightsNotes > 0;
  if (facet === "ingredient") {
    if (facts.manualLabels) return { status: "manual_verified", title: "Verified", detail: `${pluralize(facts.manualLabels, "label")} reviewed` };
    if (facts.visibleLabels) return { status: "label_visible", title: "Visible", detail: `${pluralize(facts.visibleLabels, "panel")} to transcribe` };
    if (facts.ocrLabels) return { status: "ocr_extracted", title: "OCR", detail: `${pluralize(facts.ocrLabels, "record")} extracted` };
    return hasSource
      ? { status: "candidate_needs_panel", title: "Needs panel", detail: `${pluralize(facts.sourceLinks, "source")} without verified text` }
      : { status: "no_source", title: "No source", detail: "Ingredient claim blocked" };
  }
  if (facet === "package") {
    if (facts.packageFields) return { status: "candidate_found", title: "Captured", detail: `${pluralize(facts.packageFields, "package field")}` };
    return hasSource
      ? { status: "candidate_needs_panel", title: "Needed", detail: "Weight/serving still missing" }
      : { status: "no_source", title: "No source", detail: "Package context blocked" };
  }
  if (facet === "maker") {
    if (facts.orgFields) return { status: "source_review", title: "Has text", detail: `${pluralize(facts.orgFields, "maker clue")}` };
    return hasSource
      ? { status: "source_review", title: "Review", detail: "Owner/distributor text needed" }
      : { status: "no_source", title: "No source", detail: "Maker timeline blocked" };
  }
  if (facet === "economics") {
    if (facts.priceFields && facts.packageFields) return { status: "candidate_found", title: "Alignable", detail: "Price and size present" };
    if (facts.priceFields) return { status: "candidate_needs_panel", title: "Partial", detail: `${pluralize(facts.priceFields, "price clue")} without size` };
    if (facts.packageFields) return { status: "candidate_needs_archive", title: "Deferred", detail: `${pluralize(facts.packageFields, "size clue")} without price` };
    return hasSource
      ? { status: "candidate_needs_archive", title: "Deferred", detail: "Price/weight not aligned" }
      : { status: "no_source", title: "No source", detail: "Economics blocked" };
  }
  if (facet === "provenance") {
    if (hasSource && hasRights) return { status: "source_review", title: "Traceable", detail: `${pluralize(facts.sourceLinks, "link")} · ${pluralize(facts.rightsNotes, "rights note")}` };
    if (hasSource) return { status: "source_review", title: "Links", detail: `${pluralize(facts.sourceLinks, "source")} needs rights/date` };
    return { status: "missing_vintage_slot", title: "Gap", detail: "No attributable source" };
  }
  return { status: "unknown", title: "Unknown", detail: "No matrix rule" };
}

function readerMatrixRows(card, evidenceRows) {
  const product = card.product;
  const facets = [
    ["ingredient", "Ingredients"],
    ["package", "Package"],
    ["maker", "Maker"],
    ["economics", "Economics"],
    ["provenance", "Sources"],
  ];
  if (!product) {
    return workflowStatuses().map((status) => {
      const rows = evidenceRows.filter((row) => rowEvidenceStatus(row) === status);
      return {
        label: statusLabels[status] || labelFor(status),
        status,
        count: rows.length,
        detail: statusNarrative(status),
        cells: facets.map(([key, label]) => ({ key, label, ...matrixFacetCell(key, rows) })),
      };
    });
  }
  return state.data.vintages.map((vintage) => {
    const info = product.vintage_statuses[vintage] || { status: "unknown", source_count: 0 };
    const rows = vintageEvidenceRows(product, evidenceRows, vintage);
    return {
      label: vintageLabels[vintage] || vintage,
      status: info.status || "unknown",
      count: numeric(info.source_count || rows.length),
      detail: storyChapterTitle(vintage),
      cells: facets.map(([key, label]) => ({ key, label, ...matrixFacetCell(key, rows) })),
    };
  });
}

function renderReaderMatrix(card, evidenceRows) {
  const rows = readerMatrixRows(card, evidenceRows);
  if (!rows.length) {
    return `<p class="empty-note">No matrix rows are available for this story.</p>`;
  }
  return `
    <div class="reader-matrix-key">
      <div>${statusTag("manual_verified")}<span>claim-ready</span></div>
      <div>${statusTag("label_visible")}<span>text-ready</span></div>
      <div>${statusTag("candidate_found")}<span>context captured</span></div>
      <div>${statusTag("missing_vintage_slot")}<span>blocked gap</span></div>
    </div>
    <div class="reader-matrix-rows">
      ${rows
        .map((row) => `
          <article class="reader-matrix-row status-${escapeHtml(row.status || "unknown")}">
            <header>
              <span>${escapeHtml(row.label)}</span>
              <strong>${escapeHtml(row.detail)}</strong>
              <em>${formatNumber(row.count)} sources</em>
            </header>
            <div class="reader-matrix-cells">
              ${row.cells
                .map((cell) => `
                  <div class="reader-matrix-cell status-${escapeHtml(cell.status || "unknown")}">
                    <span>${escapeHtml(cell.label)}</span>
                    <strong>${escapeHtml(cell.title)}</strong>
                    <p>${escapeHtml(cell.detail)}</p>
                  </div>
                `)
                .join("")}
            </div>
          </article>
        `)
        .join("")}
    </div>
  `;
}

function renderReaderDesk(cards, selectedCard, registryRows) {
  if (!els.readerLede) return;
  const card = selectedCard || cards[0];
  if (!card) {
    els.storyDeskCount.textContent = "0 story candidates";
    els.readerLede.innerHTML = `<p class="empty-note">No story candidates match the current filters.</p>`;
    els.readerReadiness.innerHTML = "";
    els.readerPillars.innerHTML = "";
    els.readerLensbar.innerHTML = "";
    els.readerClusters.innerHTML = "";
    els.readerGallery.innerHTML = "";
    els.readerCompare.innerHTML = "";
    els.readerSources.innerHTML = "";
    els.readerMatrix.innerHTML = "";
    els.readerVisual.innerHTML = "";
    els.readerScript.innerHTML = "";
    els.readerChapters.innerHTML = "";
    els.readerScenes.innerHTML = "";
    els.readerPreview.innerHTML = "";
    els.readerStoryboard.innerHTML = "";
    els.readerClaimLedger.innerHTML = "";
    els.readerEraStrip.innerHTML = "";
    els.readerLineup.innerHTML = "";
    els.readerUnlocks.innerHTML = "";
    return;
  }

  const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : bestEvidenceRows(registryRows, 10);
  const publicationState = storyPublicationState(card, evidenceRows);
  const bestSource = storyBestSource(evidenceRows);
  const title = storyDisplayTitle(card);
  const boundaryRows = evidenceClaimText(card);

  els.storyDeskCount.textContent = `${formatNumber(cards.length)} story candidates`;
  els.readerLede.innerHTML = `
    <p class="eyebrow">${escapeHtml(card.kicker || "Story")}</p>
    <h2>${escapeHtml(storyQuestion(card))}</h2>
    <p>${escapeHtml(publicationState.detail)}</p>
    ${renderReaderProgress(card.product, evidenceRows)}
  `;

  els.readerReadiness.innerHTML = [
    ["Publication state", publicationState.label, publicationState.status, "This is the headline constraint for the reader-facing story."],
    ["Proof anchor", bestSource.title, bestSource.status, clipped(bestSource.detail, 130), bestSource.source, bestSource.label],
    ["Open chapter", storyGapLabel(card), "missing_vintage_slot", "The story should show this as part of the narrative, not hide it in a table."],
    [
      "Ingredient claim rule",
      evidenceRows.some((row) => rowEvidenceStatus(row) === "manual_verified" || truthyFlag(row.manual_transcription_available)) ? "scoped diffs allowed" : "diffs stay locked",
      evidenceRows.some((row) => rowEvidenceStatus(row) === "manual_verified" || truthyFlag(row.manual_transcription_available)) ? "manual_verified" : "label_visible",
      "No formulation change is promoted unless the supporting label text is verified.",
    ],
  ]
    .map(([label, value, status, detail, source, sourceLabel]) => `
      <article class="reader-readiness-card status-${escapeHtml(status || "unknown")}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(detail)}</p>
        <div class="lead-meta">
          ${statusTag(status || "unknown")}
          ${source ? linkOrText(source, sourceLabel || "Source") : ""}
        </div>
      </article>
    `)
    .join("");

  els.readerPillars.innerHTML = storyLensRows(card, evidenceRows)
    .map((lens) => `
      <article class="reader-pillar">
        <span>${escapeHtml(lens.label)}</span>
        <strong>${escapeHtml(lens.value)}</strong>
        <p>${escapeHtml(lens.detail)}</p>
      </article>
    `)
    .join("");

  els.readerLensbar.innerHTML = renderStoryLensControls(card, evidenceRows);
  els.readerClusters.innerHTML = renderReaderClusters(cards, card, registryRows);
  els.readerGallery.innerHTML = renderReaderGallery(cards, card, registryRows);
  els.readerCompare.innerHTML = renderReaderComparison(cards, card, registryRows);
  els.readerSources.innerHTML = renderReaderSources(card, evidenceRows);
  els.readerMatrix.innerHTML = renderReaderMatrix(card, evidenceRows);
  els.readerVisual.innerHTML = renderReaderVisual(card, evidenceRows);
  els.readerScript.innerHTML = renderReaderScript(card, evidenceRows);
  els.readerChapters.innerHTML = renderReaderChapters(card, evidenceRows);
  els.readerScenes.innerHTML = renderReaderScenes(card, evidenceRows);
  els.readerPreview.innerHTML = renderReaderPreview(card, evidenceRows);
  els.readerStoryboard.innerHTML = renderReaderStoryboard(card, evidenceRows);
  els.readerClaimLedger.innerHTML = renderReaderClaimLedger(card, evidenceRows);
  els.readerEraStrip.innerHTML = renderReaderEraStrip(card, evidenceRows);

  els.readerLineup.innerHTML = cards
    .slice(0, 6)
    .map((story) => {
      const rows = story.evidenceRows?.length ? story.evidenceRows : bestEvidenceRows(registryRows, 4);
      const stateLabel = storyPublicationState(story, rows);
      const selected = story.key === card.key;
      return `
        <button class="reader-lineup-card ${selected ? "is-selected" : ""}" type="button" data-story-key="${escapeHtml(story.key)}">
          <span>${escapeHtml(story.kicker || "Story")}</span>
          <strong>${escapeHtml(storyDisplayTitle(story))}</strong>
          <p>${escapeHtml(clipped(storyCannotSayYet(story, rows), 120))}</p>
          <em>${escapeHtml(stateLabel.label)}</em>
        </button>
      `;
    })
    .join("");

  els.readerUnlocks.innerHTML = `
    <article class="reader-unlock-reader">
      <span>Selected story</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(storySupportedNow(card, evidenceRows))}</p>
    </article>
    ${renderReaderUnlocks(card, evidenceRows)}
    <article class="reader-unlock-reader reader-unlock-boundary">
      <span>Claim boundary</span>
      <strong>${escapeHtml(boundaryRows[1]?.[0] || "Still a gap")}</strong>
      <p>${escapeHtml(boundaryRows[1]?.[1] || storyCannotSayYet(card, evidenceRows))}</p>
    </article>
  `;
}

function rowImageUrl(row) {
  return row.image_path_or_url || row.image_url || row.package_image_url || row.screenshot_image_path || row.local_image_path || "";
}

function firstEvidenceRow(rows, fallbackRows = []) {
  return bestEvidenceRows(rows.filter(Boolean), 1)[0] || bestEvidenceRows(fallbackRows.filter(Boolean), 1)[0] || {};
}

function storyArticleEvidenceObjects(card, evidenceRows) {
  const product = card?.product;
  const currentRows = product ? vintageEvidenceRows(product, evidenceRows, "current_2020s") : [];
  const earliestRows = product ? vintageEvidenceRows(product, evidenceRows, "earliest_verified_label") : [];
  const readableRows = evidenceRows.filter((row) => (
    rowEvidenceStatus(row) === "manual_verified" ||
    rowEvidenceStatus(row) === "label_visible" ||
    rowEvidenceStatus(row) === "ocr_extracted" ||
    truthyFlag(row.ingredient_panel_visible) ||
    truthyFlag(row.manual_transcription_available)
  ));
  const packageRows = evidenceRows.filter((row) => (
    truthyFlag(row.front_visible) ||
    truthyFlag(row.net_weight_visible) ||
    presentText(row.net_weight_text) ||
    presentText(row.serving_size_text) ||
    presentText(row.price_text) ||
    presentText(row.price_amount)
  ));
  const fallbackRows = evidenceRows.length ? evidenceRows : [];
  return [
    {
      role: "Current anchor",
      title: "Present-day SKU evidence",
      row: firstEvidenceRow(currentRows, fallbackRows),
      fallbackStatus: product?.vintage_statuses?.current_2020s?.status || "candidate_needs_archive",
      detail: "A current package or product-page anchor keeps today's label tied to a specific SKU, size, and source owner.",
    },
    {
      role: "Earlier package",
      title: "Oldest attributable lead",
      row: firstEvidenceRow(earliestRows, fallbackRows),
      fallbackStatus: product?.vintage_statuses?.earliest_verified_label?.status || "missing_vintage_slot",
      detail: /oreo/i.test(`${product?.display_name || ""} ${product?.canonical_name || ""}`)
        ? "This can show package history, but it cannot become the 1912 ingredient label without a readable panel transcription."
        : "This starts the older chapter without collapsing package evidence into verified formulation evidence.",
    },
    {
      role: "Label gate",
      title: "Ingredient text proof",
      row: firstEvidenceRow(readableRows, fallbackRows),
      fallbackStatus: readableRows.length ? rowEvidenceStatus(readableRows[0]) : "candidate_needs_panel",
      detail: "Ingredient-change language stays locked until the panel is visible, transcribed, and manually verified.",
    },
    {
      role: "Economics gate",
      title: "Package and price overlay",
      row: firstEvidenceRow(packageRows, fallbackRows),
      fallbackStatus: packageRows.length ? "candidate_found" : "candidate_needs_archive",
      detail: "Weight, serving, and price clues can sit beside the story, then later feed price-per-ounce or price-per-serving analysis.",
    },
  ];
}

function renderStoryArticleVisual(row, title, fallbackStatus) {
  const image = rowImageUrl(row);
  const status = row.evidence_id ? rowEvidenceStatus(row) : fallbackStatus || "unknown";
  if (image) {
    return `
      <figure class="story-article-photo status-${escapeHtml(status)}">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(title)} evidence" loading="lazy" />
        <figcaption>${escapeHtml(row.source_domain || row.source_publisher_owner || "Evidence image")}</figcaption>
      </figure>
    `;
  }
  return `
    <div class="story-article-photo story-article-photo-placeholder status-${escapeHtml(status)}">
      <span>${escapeHtml(statusLabels[status] || labelFor(status))}</span>
      <strong>${escapeHtml(row.source_domain || row.source_publisher_owner || "Visual needed")}</strong>
      <em>${escapeHtml(row.evidence_kind || "Evidence object")}</em>
    </div>
  `;
}

function storyFilmstripRows(card, evidenceRows) {
  const headline = storyReaderHeadline(card, evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const facts = storyEvidenceFacts(evidenceRows);
  const chapters = storyChapterBoardRows(card, evidenceRows);
  const current = chapters[0] || {};
  const earliest = chapters[chapters.length - 1] || {};
  const traceRows = storyTraceRows(card, evidenceRows);
  const lockedTrace = traceRows.find((row) => row.bucket === "locked") || traceRows.find((row) => /ingredient|then/i.test(row.label)) || {};
  const captionRows = storyCaptionRows(card, evidenceRows);
  const caption = captionRows.find((row) => ["manual_verified", "usable_photo"].includes(row.status)) || captionRows.find((row) => row.source) || {};
  const comparisonSides = comparisonSideRows(card, evidenceRows).map(comparisonSideCard);
  const comparisonLanes = comparisonLaneRows(comparisonSides[0]?.rows || [], comparisonSides[1]?.rows || []);
  const comparisonVerdict = storyComparisonVerdict(card, comparisonSides[0] || {}, comparisonSides[1] || {}, comparisonLanes);
  const bestSource = storyBestSource(evidenceRows);
  return [
    {
      label: "Question",
      title: storyQuestion(card),
      body: headline.dek,
      status: publicationState.status,
      meta: publicationState.label,
      source: bestSource.source,
      sourceLabel: bestSource.label,
    },
    {
      label: "Now",
      title: current.title || "Current anchor",
      body: current.takeaway || "Anchor the story in a current SKU or document before comparing history.",
      status: current.status || publicationState.status,
      meta: `${formatNumber(current.sourceCount || 0)} sources`,
      source: current.source || "",
      sourceLabel: current.sourceLabel || "Source",
    },
    {
      label: "Then",
      title: earliest.title || storyGapLabel(card),
      body: earliest.boundary || storyCannotSayYet(card, evidenceRows),
      status: earliest.status || "missing_vintage_slot",
      meta: `${formatNumber(earliest.sourceCount || 0)} sources`,
      source: earliest.source || "",
      sourceLabel: earliest.sourceLabel || "Source",
    },
    {
      label: "Evidence",
      title: storySupportedNow(card, evidenceRows),
      body: `${pluralize(facts.sourceLinks, "receipt")} · ${pluralize(facts.visibleLabels, "visible panel")} · ${pluralize(facts.manualLabels, "verified label")}`,
      status: facts.manualLabels ? "manual_verified" : facts.visibleLabels ? "label_visible" : facts.usablePhotos ? "usable_photo" : "source_review",
      meta: "proof state",
      source: bestSource.source,
      sourceLabel: bestSource.label,
    },
    {
      label: "Boundary",
      title: lockedTrace.publicLine || "Claim boundary",
      body: lockedTrace.boundary || storyCannotSayYet(card, evidenceRows),
      status: lockedTrace.status || "missing_vintage_slot",
      meta: lockedTrace.bucket || "locked",
      source: lockedTrace.receipt?.source || "",
      sourceLabel: lockedTrace.receipt?.sourceLabel || "Source",
    },
    {
      label: "Visual",
      title: caption.title || "Caption-ready visual",
      body: caption.caption || "A public visual needs caption, alt text, owner, date basis, and rights context before use.",
      status: caption.status || "missing_vintage_slot",
      meta: caption.role || "caption",
      source: caption.source || "",
      sourceLabel: caption.sourceLabel || "Source",
    },
    {
      label: "Comparison",
      title: comparisonVerdict.title,
      body: comparisonVerdict.detail,
      status: comparisonVerdict.status,
      meta: `${formatNumber(comparisonLanes.length)} lanes`,
      source: "",
      sourceLabel: "",
    },
    {
      label: "Next",
      title: "What unlocks the next draft",
      body: storyNextEvidenceStep(card, evidenceRows),
      status: facts.visibleLabels ? "label_visible" : facts.usablePhotos ? "usable_photo" : "candidate_needs_panel",
      meta: facts.visibleLabels ? "transcribe" : facts.usablePhotos ? "panel hunt" : "source hunt",
      source: "",
      sourceLabel: "",
    },
  ].map((row, index) => ({
    ...row,
    number: String(index + 1).padStart(2, "0"),
  }));
}

function renderStoryFilmstrip(card, registryRows) {
  if (!els.storyFilmstrip) return;
  if (!card) {
    els.storyFilmstrip.innerHTML = `<p class="empty-note">No story filmstrip is available for the current filters.</p>`;
    return;
  }
  const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : bestEvidenceRows(registryRows, 10);
  const rows = storyFilmstripRows(card, evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  els.storyFilmstrip.innerHTML = `
    <article class="story-filmstrip status-${escapeHtml(publicationState.status)}">
      <header class="story-filmstrip-head">
        <div>
          <p class="eyebrow">Story Filmstrip</p>
          <h2>${escapeHtml(storyDisplayTitle(card))}</h2>
          <p>${escapeHtml(publicationState.detail)} The filmstrip reads the story as public beats before opening the proof boards.</p>
        </div>
        <aside class="story-filmstrip-state" aria-label="Filmstrip state">
          <span>Publication State</span>
          <strong>${escapeHtml(publicationState.label)}</strong>
          <p>${escapeHtml(storyCannotSayYet(card, evidenceRows))}</p>
        </aside>
      </header>
      <div class="story-filmstrip-track" aria-label="Reader story beats">
        ${rows
          .map((row) => `
            <article class="story-filmstrip-frame status-${escapeHtml(row.status || "unknown")}">
              <header>
                <span>${escapeHtml(row.number)}</span>
                <div>
                  <em>${escapeHtml(row.label)}</em>
                  <strong>${escapeHtml(row.title)}</strong>
                </div>
              </header>
              <p>${escapeHtml(clipped(row.body, 170))}</p>
              <footer>
                ${statusTag(row.status || "unknown")}
                <span class="status-tag">${escapeHtml(row.meta || "story beat")}</span>
                ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
              </footer>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function storyArticleParagraphRows(card, evidenceRows) {
  const narrative = storyLensNarrative(card, evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const facts = storyEvidenceFacts(evidenceRows);
  const receipts = storyReceiptRows(evidenceRows);
  const receiptText = receipts.length
    ? `${pluralize(receipts.length, "receipt")} are attached to this draft, led by ${receipts[0].title}.`
    : "No receipt is attached to this draft yet, so the article opens by naming the missing source trail.";
  return [
    {
      label: "Story",
      status: publicationState.status,
      body: `${publicationState.detail} ${narrative.lede}`,
    },
    {
      label: "Evidence",
      status: narrative.status,
      body: `${narrative.canSay} ${receiptText}`,
    },
    {
      label: "Boundary",
      status: "missing_vintage_slot",
      body: narrative.boundary,
    },
    {
      label: "Next scene",
      status: facts.manualLabels ? "manual_verified" : facts.visibleLabels ? "label_visible" : "candidate_needs_panel",
      body: narrative.unlock,
    },
  ];
}

function storyArticleAnnotationRows(card, evidenceRows) {
  const ledger = storyClaimLedgerRows(card, evidenceRows);
  return ledger.map((row, index) => ({
    ...row,
    number: String(index + 1).padStart(2, "0"),
  }));
}

function storyArticleVisualAssignments(card, evidenceRows) {
  const facts = storyEvidenceFacts(evidenceRows);
  const bestSource = storyBestSource(evidenceRows);
  const unlocks = storyUnlockRows(card, evidenceRows);
  return [
    {
      label: "Hero visual",
      title: facts.usablePhotos || facts.visibleLabels ? "Choose the most attributable package image" : "Find a source-attributable package image",
      status: facts.usablePhotos ? "usable_photo" : facts.visibleLabels ? "label_visible" : "candidate_needs_panel",
      detail: "The public page needs a front or back package visual with owner, URL, date basis, and rights note visible in the receipt.",
      source: bestSource.source,
      sourceLabel: bestSource.label,
    },
    {
      label: "Label receipt",
      title: facts.manualLabels ? "Manual transcription can be cited" : "Back-panel text still needs review",
      status: facts.manualLabels ? "manual_verified" : facts.visibleLabels ? "label_visible" : "candidate_needs_transcription",
      detail: "OCR and manual correction should be shown beside the source photo before ingredient diffs appear in the article.",
      source: unlocks[0]?.source || "",
      sourceLabel: unlocks[0]?.sourceLabel || "Source",
    },
    {
      label: "Overlay evidence",
      title: facts.packageFields ? "Package fields can be shown as context" : "Weight and serving fields are missing",
      status: facts.packageFields ? "candidate_found" : "candidate_needs_panel",
      detail: "Package size, serving size, and price clues stay visually separate from ingredient claims until SKU identity is reviewed.",
      source: unlocks[1]?.source || "",
      sourceLabel: unlocks[1]?.sourceLabel || "Source",
    },
  ];
}

function renderStoryArticle(card, registryRows) {
  if (!els.storyArticle) return;
  if (!card) {
    els.storyArticle.innerHTML = `<p class="empty-note">No story article is available for the current filters.</p>`;
    return;
  }
  const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : bestEvidenceRows(registryRows, 10);
  const headline = storyReaderHeadline(card, evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const narrative = storyLensNarrative(card, evidenceRows);
  const facts = storyEvidenceFacts(evidenceRows);
  const objects = storyArticleEvidenceObjects(card, evidenceRows);
  const paragraphs = storyArticleParagraphRows(card, evidenceRows);
  const timelineRows = storyArticleChapterRows(card, evidenceRows);
  const annotations = storyArticleAnnotationRows(card, evidenceRows);
  const assignments = storyArticleVisualAssignments(card, evidenceRows);

  els.storyArticle.innerHTML = `
    <article class="story-article status-${escapeHtml(publicationState.status)}">
      <header class="story-article-hero">
        <div class="story-article-copy">
          <p class="eyebrow">Public Story Treatment</p>
          <h2>${escapeHtml(headline.title)}</h2>
          <p>${escapeHtml(headline.dek)}</p>
          <div class="lead-meta">
            ${statusTag(publicationState.status)}
            <span class="status-tag">${escapeHtml(publicationState.label)}</span>
            <span class="status-tag">${escapeHtml(narrative.lens.label)} lens</span>
          </div>
        </div>
        <aside class="story-article-facts" aria-label="Article evidence facts">
          <span><strong>${formatNumber(facts.sourceLinks)}</strong>receipts</span>
          <span><strong>${formatNumber(facts.visibleLabels)}</strong>visible panels</span>
          <span><strong>${formatNumber(facts.manualLabels)}</strong>verified labels</span>
          <span><strong>${formatNumber(facts.packageFields)}</strong>package fields</span>
        </aside>
      </header>
      <div class="story-article-layout">
        <section class="story-article-prose" aria-label="Story narrative">
          ${paragraphs
            .map((row) => `
              <p class="status-${escapeHtml(row.status || "unknown")}">
                <span>${escapeHtml(row.label)}</span>
                ${escapeHtml(row.body)}
              </p>
            `)
            .join("")}
        </section>
        <aside class="story-article-object-grid" aria-label="Evidence objects">
          ${objects
            .map(({ role, title, row, fallbackStatus, detail }) => {
              const status = row.evidence_id ? rowEvidenceStatus(row) : fallbackStatus || "unknown";
              const source = row.source_url || row.archive_url || "";
              return `
                <article class="story-article-object status-${escapeHtml(status)}">
                  ${renderStoryArticleVisual(row, title, fallbackStatus)}
                  <div>
                    <span>${escapeHtml(role)}</span>
                    <strong>${escapeHtml(row.source_title || title)}</strong>
                    <p>${escapeHtml(clipped(row.reviewer_notes || row.promotion_blocker || detail, 142))}</p>
                    <div class="lead-meta">
                      ${statusTag(status)}
                      ${source ? linkOrText(source, row.source_domain || "Source") : ""}
                    </div>
                  </div>
                </article>
              `;
            })
            .join("")}
        </aside>
      </div>
      <section class="story-article-timeline" aria-label="Article timeline">
        ${timelineRows
          .map((row) => `
            <article class="story-article-era status-${escapeHtml(row.status || "unknown")}">
              <span>${escapeHtml(row.number)}</span>
              <div>
                <em>${escapeHtml(row.label)}</em>
                <strong>${escapeHtml(row.title)}</strong>
                <p>${escapeHtml(clipped(row.lead, 140))}</p>
                <div class="lead-meta">
                  ${statusTag(row.status || "unknown")}
                  <span class="status-tag">${formatNumber(row.sourceCount)} sources</span>
                  ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
                </div>
              </div>
            </article>
          `)
          .join("")}
      </section>
      <section class="story-article-bottom" aria-label="Claim annotations and visual assignments">
        <div class="story-article-annotations">
          ${annotations
            .map((row) => `
              <article class="story-article-note status-${escapeHtml(row.status || "unknown")}">
                <span>${escapeHtml(row.number)} ${escapeHtml(row.claim)}</span>
                <strong>${escapeHtml(row.state)}</strong>
                <p>${escapeHtml(clipped(row.detail, 150))}</p>
              </article>
            `)
            .join("")}
        </div>
        <div class="story-article-assignments">
          ${assignments
            .map((row) => `
              <article class="story-article-assignment status-${escapeHtml(row.status || "unknown")}">
                <span>${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.title)}</strong>
                <p>${escapeHtml(clipped(row.detail, 145))}</p>
                <div class="lead-meta">
                  ${statusTag(row.status || "unknown")}
                  ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
                </div>
              </article>
            `)
            .join("")}
        </div>
      </section>
    </article>
  `;
}

function chapterBoardTakeaway(status, product, vintage, sourceCount) {
  if (["manual_verified", "ground_truth_ready"].includes(status)) {
    return "This chapter can carry scoped label language because a reviewed ingredient statement is attached.";
  }
  if (["ocr_extracted", "label_visible"].includes(status)) {
    return "This chapter can tell the reader that label evidence is visible or extractable, but the formulation claim still waits for review.";
  }
  if (["usable_photo", "source_review", "candidate_found"].includes(status)) {
    return `${pluralize(sourceCount, "source lead")} can establish package context, date clues, or source provenance before ingredient language is allowed.`;
  }
  if (["candidate_needs_panel", "candidate_needs_transcription"].includes(status)) {
    return "The story can show the package trail, but the ingredient panel still needs a readable image and corrected text.";
  }
  if (vintage === "earliest_verified_label" || vintage === "1980s_or_earlier") {
    return /oreo/i.test(`${product?.display_name || ""} ${product?.canonical_name || ""}`)
      ? "Keep the early Oreo chapter visible as a gap; the original 1912 ingredient label is not verified."
      : "Keep the earliest chapter visible as a gap until a source-attributable readable label exists.";
  }
  return "This chapter should remain a visible gap, not implied history.";
}

function chapterBoardBoundary(status, product, vintage) {
  if (["manual_verified", "ground_truth_ready"].includes(status)) {
    return "Allowed: cite only the verified label text and keep adjacent eras separate.";
  }
  if (["ocr_extracted", "label_visible"].includes(status)) {
    return "Locked: no ingredient diff until OCR/manual transcription is checked against the package image.";
  }
  if (["usable_photo", "source_review", "candidate_found"].includes(status)) {
    return "Locked: no ingredient, package-size, or maker-change claim until the evidence role and date basis are reviewed.";
  }
  if (/oreo/i.test(`${product?.display_name || ""} ${product?.canonical_name || ""}`) && vintage === "earliest_verified_label") {
    return "Locked: do not describe the 1912 original Oreo ingredient label without verified label evidence.";
  }
  return "Locked: publish as an explicit gap until source-attributable evidence is attached.";
}

function chapterBoardProofObject(best, fallbackTitle, status) {
  if (best?.source_title || best?.source_domain || best?.archive_id) {
    return best.source_title || best.source_domain || best.archive_id;
  }
  if (["manual_verified", "ground_truth_ready"].includes(status)) return "Verified label statement";
  if (["ocr_extracted", "label_visible"].includes(status)) return "Readable label panel";
  if (["usable_photo", "source_review", "candidate_found"].includes(status)) return fallbackTitle || "Source lead";
  return "Evidence gap";
}

function storyChapterBoardRows(card, evidenceRows) {
  const product = card?.product;
  if (!product) {
    return workflowStatuses().map((status, index) => {
      const rows = evidenceRows.filter((row) => rowEvidenceStatus(row) === status);
      const best = bestEvidenceRows(rows, 1)[0] || {};
      const source = best.source_url || best.archive_url || "";
      return {
        number: String(index + 1).padStart(2, "0"),
        label: statusLabels[status] || labelFor(status),
        title: "Workflow scene",
        status,
        sourceCount: rows.length,
        takeaway: statusNarrative(status),
        proof: chapterBoardProofObject(best, statusLabels[status] || labelFor(status), status),
        boundary: status === "manual_verified" ? "Allowed: promote reviewed evidence into scoped claims." : "Locked: keep this as workflow state until review advances.",
        source,
        sourceLabel: best.source_domain || "Source",
      };
    });
  }

  return state.data.vintages.map((vintage, index) => {
    const rows = vintageEvidenceRows(product, evidenceRows, vintage);
    const info = product.vintage_statuses[vintage] || { status: "unknown", source_count: 0 };
    const best = bestEvidenceRows(rows, 1)[0] || {};
    const status = best.evidence_id ? rowEvidenceStatus(best) : info.status || "unknown";
    const sourceCount = numeric(info.source_count || rows.length);
    const source = best.source_url || best.archive_url || "";
    return {
      number: String(index + 1).padStart(2, "0"),
      label: vintageLabels[vintage] || vintage,
      title: storyChapterTitle(vintage),
      status,
      sourceCount,
      takeaway: chapterBoardTakeaway(status, product, vintage, sourceCount),
      proof: chapterBoardProofObject(best, storyChapterTitle(vintage), status),
      boundary: chapterBoardBoundary(status, product, vintage),
      source,
      sourceLabel: best.source_domain || "Source",
    };
  });
}

function chapterClaimUnlock(row, card) {
  const status = row.status || "unknown";
  const product = card?.product;
  const isOreoOrigin =
    /oreo/i.test(`${product?.display_name || ""} ${product?.canonical_name || ""}`) &&
    row.label === (vintageLabels.earliest_verified_label || "Earliest verified label");
  if (["manual_verified", "ground_truth_ready"].includes(status)) {
    return "Use this chapter as an anchor, then verify the adjacent era before drawing a change line.";
  }
  if (["ocr_extracted", "label_visible"].includes(status)) {
    return "Correct the OCR or transcription against the source image, then attach the reviewed ingredient statement.";
  }
  if (["usable_photo", "source_review", "candidate_found"].includes(status)) {
    return "Confirm product identity, date basis, label visibility, package fields, and maker text before stronger story language.";
  }
  if (isOreoOrigin) {
    return "Find a source-attributable original label or keep the 1912 chapter as an explicit gap.";
  }
  if (row.sourceCount > 0) {
    return "Promote the source lead through label-visibility review before making a product-history claim.";
  }
  return "Attach source-attributable package, archive, menu, or disclosure evidence before public history language.";
}

function storyChapterClaimLedgerRows(card, evidenceRows) {
  return storyChapterBoardRows(card, evidenceRows).map((row) => ({
    ...row,
    canShow: row.takeaway,
    cannotSay: row.boundary,
    unlock: chapterClaimUnlock(row, card),
  }));
}

function renderStoryChapterClaimLedger(card, evidenceRows) {
  const rows = storyChapterClaimLedgerRows(card, evidenceRows);
  if (!rows.length) return "";
  return `
    <section class="story-chapter-claim-ledger" aria-label="Chapter claim ledger">
      <div class="story-section-heading">
        <div>
          <p class="eyebrow">Chapter Claim Ledger</p>
          <h4>What Each Era Can Carry</h4>
        </div>
        <span>${escapeHtml(storyDisplayTitle(card))}</span>
      </div>
      <div class="story-chapter-claim-ledger-grid">
        ${rows
          .map((row) => `
            <article class="story-chapter-claim-row status-${escapeHtml(row.status || "unknown")}">
              <header>
                <span>${escapeHtml(row.number)} ${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.title)}</strong>
                <em>${escapeHtml(row.proof)}</em>
              </header>
              <section>
                <span>Can Show</span>
                <p>${escapeHtml(clipped(row.canShow, 150))}</p>
              </section>
              <section>
                <span>Cannot Say Yet</span>
                <p>${escapeHtml(clipped(row.cannotSay, 150))}</p>
              </section>
              <section>
                <span>Unlocks With</span>
                <p>${escapeHtml(clipped(row.unlock, 150))}</p>
              </section>
              <footer>
                ${statusTag(row.status || "unknown")}
                <span class="status-tag">${formatNumber(row.sourceCount)} sources</span>
                ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
              </footer>
            </article>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function proofFlowStageRows(row) {
  const status = row.status || "unknown";
  const hasSource = numeric(row.sourceCount) > 0;
  const hasPhoto = ["usable_photo", "label_visible", "ocr_extracted", "manual_verified", "ground_truth_ready"].includes(status);
  const hasPanel = ["label_visible", "ocr_extracted", "manual_verified", "ground_truth_ready"].includes(status);
  const hasText = ["ocr_extracted", "manual_verified", "ground_truth_ready"].includes(status);
  const hasClaim = ["manual_verified", "ground_truth_ready"].includes(status);
  return [
    {
      label: "Source",
      status: hasSource ? "source_review" : "no_source",
      value: hasSource ? `${formatNumber(row.sourceCount)} linked` : "gap",
      detail: hasSource ? "Attributable lead exists" : "No source attached",
    },
    {
      label: "Photo/Panel",
      status: hasPanel ? "label_visible" : hasPhoto ? "usable_photo" : hasSource ? "candidate_needs_panel" : "no_source",
      value: hasPanel ? "panel" : hasPhoto ? "photo" : "needed",
      detail: hasPanel ? "Readable label path" : hasPhoto ? "Package image lead" : "Back panel not proven",
    },
    {
      label: "Text",
      status: hasClaim ? "manual_verified" : hasText ? "ocr_extracted" : hasPanel ? "candidate_needs_transcription" : "candidate_needs_panel",
      value: hasClaim ? "verified" : hasText ? "OCR" : "locked",
      detail: hasClaim ? "Reviewed text attached" : hasText ? "Needs correction" : "No reviewed text",
    },
    {
      label: "Claim",
      status: hasClaim ? "manual_verified" : "missing_vintage_slot",
      value: hasClaim ? "scoped" : "locked",
      detail: hasClaim ? "Can support scoped wording" : "No formulation claim yet",
    },
  ];
}

function storyChapterProofFlowRows(card, evidenceRows) {
  return storyChapterClaimLedgerRows(card, evidenceRows).map((row) => ({
    ...row,
    stages: proofFlowStageRows(row),
    unlock: chapterClaimUnlock(row, card),
  }));
}

function renderStoryChapterProofFlow(card, evidenceRows) {
  const rows = storyChapterProofFlowRows(card, evidenceRows);
  if (!rows.length) return "";
  return `
    <section class="story-chapter-proof-flow" aria-label="Chapter proof flow">
      <div class="story-section-heading">
        <div>
          <p class="eyebrow">Proof Flow</p>
          <h4>How Each Era Moves Toward A Claim</h4>
        </div>
        <span>Source to panel to text to scoped claim</span>
      </div>
      <div class="story-chapter-proof-flow-list">
        ${rows
          .map((row) => `
            <article class="story-chapter-proof-flow-row status-${escapeHtml(row.status || "unknown")}">
              <header>
                <span>${escapeHtml(row.number)} ${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.title)}</strong>
                <em>${escapeHtml(clipped(row.proof, 82))}</em>
              </header>
              <div class="story-chapter-proof-flow-stages">
                ${row.stages
                  .map((stage, index) => `
                    <section class="story-chapter-proof-flow-stage status-${escapeHtml(stage.status)}">
                      <span>${escapeHtml(String(index + 1).padStart(2, "0"))} ${escapeHtml(stage.label)}</span>
                      <strong>${escapeHtml(stage.value)}</strong>
                      <p>${escapeHtml(stage.detail)}</p>
                    </section>
                  `)
                  .join("")}
              </div>
              <footer>
                <span>Next unlock</span>
                <p>${escapeHtml(clipped(row.unlock, 132))}</p>
                ${statusTag(row.status || "unknown")}
                ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
              </footer>
            </article>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function storyEraVisualRows(card, evidenceRows) {
  return storyPhotoRows(card, evidenceRows).map((row) => {
    const source = row.best.source_url || row.best.archive_url || "";
    const image = rowImageUrl(row.best);
    const activeFlags = row.flags.filter((flag) => flag.active).map((flag) => flag.label);
    return {
      ...row,
      source,
      image,
      title: row.best.source_title || row.best.source_domain || row.gate.title,
      status: row.gate.status,
      visualRole: activeFlags.length ? activeFlags.slice(0, 3).join(" / ") : row.gate.title,
      note: row.best.reviewer_notes || row.best.promotion_blocker || row.gate.detail,
      sourceLabel: row.best.source_domain || "Source",
    };
  });
}

function renderStoryEraVisualStrip(card, evidenceRows) {
  const rows = storyEraVisualRows(card, evidenceRows);
  if (!rows.length) return "";
  const imageRows = rows.filter((row) => row.image).length;
  return `
    <section class="story-era-visual-strip" aria-label="Era visual strip">
      <div class="story-section-heading">
        <div>
          <p class="eyebrow">Era Objects</p>
          <h4>Package Evidence Before Ingredient Claims</h4>
        </div>
        <span>${formatNumber(imageRows)} image-backed slots · ${formatNumber(rows.length)} eras</span>
      </div>
      <div class="story-era-visual-track">
        ${rows
          .map((row) => `
            <article class="story-era-visual-card status-${escapeHtml(row.status || "unknown")}">
              ${renderStoryArticleVisual(row.best, `${row.label} package`, row.status)}
              <section>
                <span>${escapeHtml(row.number)} ${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.title)}</strong>
                <p>${escapeHtml(clipped(row.note, 118))}</p>
                <footer>
                  ${statusTag(row.status || "unknown")}
                  <span class="status-tag">${escapeHtml(row.visualRole)}</span>
                  ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
                </footer>
              </section>
            </article>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function visualGapStatus(row) {
  if (!row.source) return "no_source";
  if (!row.image) return "candidate_needs_panel";
  if (!presentText(row.best.license_rights_note) && !presentText(row.best.source_attribution_grade)) return "source_review";
  if (!photoProofFlag(row.rows, "ingredientPanel") && !photoProofFlag(row.rows, "ocr") && !photoProofFlag(row.rows, "manual")) {
    return "candidate_needs_transcription";
  }
  if (!photoProofFlag(row.rows, "manual")) return "label_visible";
  return "manual_verified";
}

function visualGapNeed(row) {
  if (!row.source) return "Attach source URL";
  if (!row.image) return "Attach image path";
  if (!presentText(row.best.license_rights_note) && !presentText(row.best.source_attribution_grade)) return "Record rights note";
  if (!photoProofFlag(row.rows, "ingredientPanel")) return "Mark panel visibility";
  if (!photoProofFlag(row.rows, "ocr") && !photoProofFlag(row.rows, "manual")) return "Extract label text";
  if (!photoProofFlag(row.rows, "manual")) return "Manual verify text";
  return "Ready for scoped caption";
}

function visualGapDetail(row) {
  if (!row.source) {
    return "This era needs a source-attributable package, archive, menu, or disclosure record before it can enter the visual story.";
  }
  if (!row.image) {
    return "The source lead is linked, but the local or remote image path is missing, so the object remains a placeholder.";
  }
  if (!presentText(row.best.license_rights_note) && !presentText(row.best.source_attribution_grade)) {
    return "The image exists, but owner, rights, or attribution notes need review before public use.";
  }
  if (!photoProofFlag(row.rows, "ingredientPanel")) {
    return "The image can show package history, but the ingredient panel has not been marked readable.";
  }
  if (!photoProofFlag(row.rows, "ocr") && !photoProofFlag(row.rows, "manual")) {
    return "A readable panel needs OCR or manual transcription before ingredient language can appear.";
  }
  if (!photoProofFlag(row.rows, "manual")) {
    return "Text exists, but a reviewer still needs to check it against the source image.";
  }
  return "This visual can support scoped caption language while adjacent eras remain separate.";
}

function storyVisualGapRows(card, evidenceRows) {
  return storyEraVisualRows(card, evidenceRows).map((row) => ({
    ...row,
    gapStatus: visualGapStatus(row),
    need: visualGapNeed(row),
    detail: visualGapDetail(row),
  }));
}

function renderStoryVisualGapStrip(card, evidenceRows) {
  const rows = storyVisualGapRows(card, evidenceRows);
  if (!rows.length) return "";
  const blockers = rows.filter((row) => row.gapStatus !== "manual_verified").length;
  return `
    <section class="story-visual-gap-strip" aria-label="Visual evidence gap strip">
      <div class="story-section-heading">
        <div>
          <p class="eyebrow">Visual Gaps</p>
          <h4>What Turns Each Placeholder Into Evidence</h4>
        </div>
        <span>${formatNumber(blockers)} blocked visual slots</span>
      </div>
      <div class="story-visual-gap-grid">
        ${rows
          .map((row) => `
            <article class="story-visual-gap-card status-${escapeHtml(row.gapStatus)}">
              <header>
                <span>${escapeHtml(row.number)} ${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.need)}</strong>
              </header>
              <p>${escapeHtml(clipped(row.detail, 150))}</p>
              <footer>
                ${statusTag(row.gapStatus)}
                <span class="status-tag">${escapeHtml(row.image ? "image attached" : "image missing")}</span>
                ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
              </footer>
            </article>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function visualHandoffRows(card, evidenceRows) {
  return storyVisualGapRows(card, evidenceRows)
    .filter((row) => row.gapStatus !== "manual_verified")
    .map((row) => {
      const owner = row.best.source_publisher_owner || row.best.source_author || row.best.source_domain || "owner not recorded";
      const dateBasis = row.best.claimed_product_date_text || row.best.capture_date_text || row.best.archive_id || row.label;
      const imageField = row.image ? "image_path_or_url recorded" : "image_path_or_url";
      return {
        ...row,
        owner,
        dateBasis,
        field: row.need === "Attach image path" ? imageField : row.need,
        handoff: row.need === "Attach image path"
          ? "Attach the package image path or URL to the evidence row, then re-check label-panel visibility."
          : row.detail,
      };
    });
}

function renderStoryVisualHandoffQueue(card, evidenceRows) {
  const rows = visualHandoffRows(card, evidenceRows);
  if (!rows.length) return "";
  return `
    <section class="story-visual-handoff" aria-label="Visual evidence handoff queue">
      <div class="story-section-heading">
        <div>
          <p class="eyebrow">Visual Handoff</p>
          <h4>Reviewer Tasks For The Object Strip</h4>
        </div>
        <span>${pluralize(rows.length, "open visual task")}</span>
      </div>
      <div class="story-visual-handoff-grid">
        ${rows
          .map((row) => `
            <article class="story-visual-handoff-card status-${escapeHtml(row.gapStatus)}">
              <header>
                <span>${escapeHtml(row.number)} ${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.field)}</strong>
              </header>
              <dl>
                <dt>Source</dt>
                <dd>${escapeHtml(row.sourceLabel || "source needed")}</dd>
                <dt>Owner</dt>
                <dd>${escapeHtml(row.owner)}</dd>
                <dt>Date basis</dt>
                <dd>${escapeHtml(row.dateBasis)}</dd>
              </dl>
              <p>${escapeHtml(clipped(row.handoff, 132))}</p>
              <footer>
                ${statusTag(row.gapStatus)}
                ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
              </footer>
            </article>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function chapterBoardStorylineRows(card, evidenceRows, chapterRows) {
  const facts = storyEvidenceFacts(evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const claimRows = storyClaimLedgerRows(card, evidenceRows);
  const lockedClaims = claimRows.filter((row) => reviewStatusBucket(row.status) === "locked").length;
  return [
    {
      label: "Reader Promise",
      status: publicationState.status,
      title: publicationState.label,
      detail: storySupportedNow(card, evidenceRows),
      metric: `${pluralize(facts.sourceLinks, "receipt")}`,
    },
    {
      label: "Story Spine",
      status: chapterRows.some((row) => row.status === "manual_verified") ? "manual_verified" : "source_review",
      title: `${pluralize(chapterRows.length, "chapter")} staged`,
      detail: "Each era is a scene with its own proof state, not a smoothed-over product history.",
      metric: `${pluralize(chapterRows.filter((row) => row.sourceCount > 0).length, "sourced scene")}`,
    },
    {
      label: "Claim Boundary",
      status: lockedClaims ? "missing_vintage_slot" : "manual_verified",
      title: lockedClaims ? `${pluralize(lockedClaims, "locked claim")}` : "No locked claims",
      detail: storyCannotSayYet(card, evidenceRows),
      metric: `${pluralize(facts.manualLabels, "verified label")}`,
    },
    {
      label: "Next Chapter",
      status: facts.visibleLabels ? "label_visible" : facts.usablePhotos ? "usable_photo" : "candidate_needs_panel",
      title: facts.visibleLabels ? "Transcription pass" : facts.usablePhotos ? "Panel hunt" : "Source search",
      detail: storyNextEvidenceStep(card, evidenceRows),
      metric: facts.visibleLabels ? `${pluralize(facts.visibleLabels, "visible panel")}` : `${pluralize(facts.usablePhotos, "photo")}`,
    },
  ];
}

function renderStoryChapterBoard(card, registryRows) {
  if (!els.storyChapterBoard) return;
  if (!card) {
    els.storyChapterBoard.innerHTML = `<p class="empty-note">No chapter board is available for the current filters.</p>`;
    return;
  }
  const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : bestEvidenceRows(registryRows, 10);
  const chapterRows = storyChapterBoardRows(card, evidenceRows);
  const storylineRows = chapterBoardStorylineRows(card, evidenceRows, chapterRows);
  els.storyChapterBoard.innerHTML = `
    <article class="story-chapter-board status-${escapeHtml(storyPublicationState(card, evidenceRows).status)}">
      <header class="story-chapter-board-head">
        <div>
          <p class="eyebrow">Chapter Board</p>
          <h2>${escapeHtml(storyDisplayTitle(card))}</h2>
          <p>Turn the evidence timeline into story scenes. Each chapter says what the reader can take away, what object proves it, and what claim remains locked.</p>
        </div>
        <aside class="story-chapter-storyline" aria-label="Chapter board storyline summary">
          ${storylineRows
            .map((row) => `
              <article class="story-chapter-storyline-card status-${escapeHtml(row.status || "unknown")}">
                <span>${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.title)}</strong>
                <p>${escapeHtml(clipped(row.detail, 118))}</p>
                <em>${escapeHtml(row.metric)}</em>
              </article>
            `)
            .join("")}
        </aside>
      </header>
      <div class="story-chapter-board-grid" aria-label="Narrative chapters">
        ${chapterRows
          .map((row) => `
            <article class="story-chapter-scene status-${escapeHtml(row.status || "unknown")}">
              <header>
                <span>${escapeHtml(row.number)}</span>
                <div>
                  <em>${escapeHtml(row.label)}</em>
                  <strong>${escapeHtml(row.title)}</strong>
                </div>
              </header>
              <dl>
                <dt>Reader Takeaway</dt>
                <dd>${escapeHtml(row.takeaway)}</dd>
                <dt>Proof Object</dt>
                <dd>${escapeHtml(row.proof)}</dd>
                <dt>Claim Boundary</dt>
                <dd>${escapeHtml(row.boundary)}</dd>
              </dl>
              <div class="lead-meta">
                ${statusTag(row.status || "unknown")}
                <span class="status-tag">${formatNumber(row.sourceCount)} sources</span>
                ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
              </div>
            </article>
          `)
          .join("")}
      </div>
      ${renderStoryEraVisualStrip(card, evidenceRows)}
      ${renderStoryVisualGapStrip(card, evidenceRows)}
      ${renderStoryVisualHandoffQueue(card, evidenceRows)}
      ${renderStoryChapterProofFlow(card, evidenceRows)}
      ${renderStoryChapterClaimLedger(card, evidenceRows)}
    </article>
  `;
}

function storyTraceReceiptFor(receipts, index) {
  if (!receipts.length) {
    return {
      title: "No source receipt attached",
      status: "missing_vintage_slot",
      dateBasis: "date not recorded",
      owner: "owner not recorded",
      rights: "rights not recorded",
      source: "",
      sourceLabel: "",
    };
  }
  return receipts[index % receipts.length];
}

function storyTraceRows(card, evidenceRows) {
  if (!card) return [];
  const facts = storyEvidenceFacts(evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const headline = storyReaderHeadline(card, evidenceRows);
  const claimRows = storyClaimLedgerRows(card, evidenceRows);
  const receipts = storyReceiptRows(evidenceRows);
  const chapters = storyChapterBoardRows(card, evidenceRows);
  const verifiedChapter = chapters.find((row) => ["manual_verified", "ground_truth_ready"].includes(row.status));
  const sourcedChapter = chapters.find((row) => row.sourceCount > 0);
  const comparisonSides = comparisonSideRows(card, evidenceRows).map(comparisonSideCard);
  const comparisonLanes = comparisonLaneRows(comparisonSides[0]?.rows || [], comparisonSides[1]?.rows || []);
  const comparisonVerdict = storyComparisonVerdict(card, comparisonSides[0] || {}, comparisonSides[1] || {}, comparisonLanes);

  const rows = [
    {
      label: "Opening line",
      status: publicationState.status,
      publicLine: headline.title,
      proof: headline.dek,
      boundary: publicationState.detail,
      receipt: storyTraceReceiptFor(receipts, 0),
      chapter: sourcedChapter?.label || "Story",
    },
    {
      label: "Supported claim",
      status: facts.sourceLinks ? "source_review" : "missing_vintage_slot",
      publicLine: storySupportedNow(card, evidenceRows),
      proof: sourcedChapter ? `${sourcedChapter.title}: ${sourcedChapter.proof}` : "No sourced chapter is attached under the current filters.",
      boundary: "This can describe evidence coverage and source state, not verified formulation history.",
      receipt: storyTraceReceiptFor(receipts, 1),
      chapter: sourcedChapter?.label || "Coverage",
    },
    {
      label: "Ingredient-change claim",
      status: claimRows[0]?.status || "source_review",
      publicLine: claimRows[0]?.state || "Ingredient change claim is locked",
      proof: claimRows[0]?.evidence || `${pluralize(facts.manualLabels, "verified label")}`,
      boundary: claimRows[0]?.detail || storyCannotSayYet(card, evidenceRows),
      receipt: storyTraceReceiptFor(receipts, 2),
      chapter: verifiedChapter?.label || "Label text",
    },
    {
      label: "Then vs Now claim",
      status: comparisonVerdict.status,
      publicLine: comparisonVerdict.title,
      proof: comparisonVerdict.detail,
      boundary: "The comparison can only contrast chapters whose proof objects and dates are explicit.",
      receipt: storyTraceReceiptFor(receipts, 3),
      chapter: "Comparison",
    },
    {
      label: "Economics overlay",
      status: claimRows[3]?.status || "candidate_needs_archive",
      publicLine: claimRows[3]?.state || "Price and weight overlay deferred",
      proof: claimRows[3]?.evidence || `${pluralize(facts.priceFields, "price clue")} · ${pluralize(facts.packageFields, "package field")}`,
      boundary: claimRows[3]?.detail || "Do not normalize economics until SKU, price, and package weight align.",
      receipt: storyTraceReceiptFor(receipts, 4),
      chapter: "Price/Weight",
    },
    {
      label: "Next-proof line",
      status: facts.visibleLabels ? "label_visible" : facts.usablePhotos ? "usable_photo" : "candidate_needs_panel",
      publicLine: storyNextEvidenceStep(card, evidenceRows),
      proof: facts.visibleLabels
        ? `${pluralize(facts.visibleLabels, "visible panel")} can enter transcription review.`
        : facts.usablePhotos
          ? `${pluralize(facts.usablePhotos, "photo lead")} still need readable panels.`
          : "The next chapter starts with source-attributable evidence discovery.",
      boundary: storyCannotSayYet(card, evidenceRows),
      receipt: storyTraceReceiptFor(receipts, 5),
      chapter: "Next",
    },
  ];

  return rows.map((row, index) => ({
    ...row,
    number: String(index + 1).padStart(2, "0"),
    bucket: reviewStatusBucket(row.status),
  }));
}

function storyTraceSummaryRows(traceRows) {
  const counts = traceRows.reduce((acc, row) => {
    acc[row.bucket] = (acc[row.bucket] || 0) + 1;
    return acc;
  }, { ready: 0, review: 0, locked: 0 });
  return [
    {
      label: "Ready Lines",
      status: counts.ready ? "manual_verified" : "source_review",
      value: counts.ready,
      detail: "Can appear with current evidence caveats.",
    },
    {
      label: "Review Lines",
      status: counts.review ? "source_review" : "manual_verified",
      value: counts.review,
      detail: "Need editor review before stronger wording.",
    },
    {
      label: "Locked Lines",
      status: counts.locked ? "missing_vintage_slot" : "manual_verified",
      value: counts.locked,
      detail: "Must stay out of public copy as claims.",
    },
  ];
}

function renderStoryTrace(card, registryRows) {
  if (!els.storyTrace) return;
  if (!card) {
    els.storyTrace.innerHTML = `<p class="empty-note">No claim trace board is available for the current filters.</p>`;
    return;
  }
  const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : bestEvidenceRows(registryRows, 10);
  const traceRows = storyTraceRows(card, evidenceRows);
  const summaryRows = storyTraceSummaryRows(traceRows);
  els.storyTrace.innerHTML = `
    <article class="story-trace status-${escapeHtml(storyPublicationState(card, evidenceRows).status)}">
      <header class="story-trace-head">
        <div>
          <p class="eyebrow">Claim Trace</p>
          <h2>${escapeHtml(storyDisplayTitle(card))}</h2>
          <p>Every reader-facing line gets traced to a proof object, a source receipt, and a claim boundary before it reaches the public story.</p>
        </div>
        <aside class="story-trace-summary" aria-label="Claim trace readiness summary">
          ${summaryRows
            .map((row) => `
              <span class="status-${escapeHtml(row.status || "unknown")}">
                <strong>${formatNumber(row.value)}</strong>${escapeHtml(row.label)}
                <em>${escapeHtml(row.detail)}</em>
              </span>
            `)
            .join("")}
        </aside>
      </header>
      <div class="story-trace-list" aria-label="Claim-to-proof trace rows">
        ${traceRows
          .map((row) => `
            <article class="story-trace-row status-${escapeHtml(row.status || "unknown")} trace-${escapeHtml(row.bucket)}">
              <header>
                <span>${escapeHtml(row.number)}</span>
                <div>
                  <em>${escapeHtml(row.label)}</em>
                  <strong>${escapeHtml(row.publicLine)}</strong>
                </div>
              </header>
              <div class="story-trace-chain">
                <section>
                  <span>Proof Object</span>
                  <p>${escapeHtml(row.proof)}</p>
                </section>
                <section>
                  <span>Source Receipt</span>
                  <p>${escapeHtml(`${row.receipt.title} · ${row.receipt.dateBasis}`)}</p>
                  <div class="lead-meta">
                    ${statusTag(row.receipt.status || "unknown")}
                    ${row.receipt.source ? linkOrText(row.receipt.source, row.receipt.sourceLabel || "Source") : ""}
                  </div>
                </section>
                <section>
                  <span>Claim Boundary</span>
                  <p>${escapeHtml(row.boundary)}</p>
                </section>
              </div>
              <footer>
                ${statusTag(row.status || "unknown")}
                <span class="status-tag">${escapeHtml(row.bucket)}</span>
                <span class="status-tag">${escapeHtml(row.chapter)}</span>
              </footer>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function photoProofFlag(rows, key) {
  const checks = {
    front: (row) => truthyFlag(row.front_visible),
    ingredientPanel: (row) => truthyFlag(row.ingredient_panel_visible),
    nutritionPanel: (row) => truthyFlag(row.nutrition_panel_visible),
    weight: (row) => truthyFlag(row.net_weight_visible) || presentText(row.net_weight_text),
    ocr: (row) => truthyFlag(row.ocr_text_available),
    manual: (row) => truthyFlag(row.manual_transcription_available) || rowEvidenceStatus(row) === "manual_verified",
    image: (row) => presentText(rowImageUrl(row)),
  };
  return rows.some(checks[key] || (() => false));
}

function photoProofGate(rows) {
  if (photoProofFlag(rows, "manual")) {
    return {
      status: "manual_verified",
      title: "Verified label image",
      detail: "A reviewer can connect source evidence to corrected label text for this chapter.",
    };
  }
  if (photoProofFlag(rows, "ingredientPanel") || photoProofFlag(rows, "ocr")) {
    return {
      status: photoProofFlag(rows, "ocr") ? "ocr_extracted" : "label_visible",
      title: "Panel ready",
      detail: "Ingredient or OCR text can be reviewed, but formulation claims still need manual verification.",
    };
  }
  if (rows.some((row) => rowEvidenceStatus(row) === "usable_photo") || photoProofFlag(rows, "front")) {
    return {
      status: "usable_photo",
      title: "Package photo lead",
      detail: "Source-attributable package imagery exists, but the ingredient panel is not yet readable.",
    };
  }
  if (rows.some((row) => row.source_url || row.archive_url)) {
    return {
      status: "source_review",
      title: "Source lead",
      detail: "A source is attached, but the visual role still needs review.",
    };
  }
  return {
    status: "missing_vintage_slot",
    title: "Photo needed",
    detail: "Find a source-attributable package photo, then classify front, panel, weight, OCR, and transcription state.",
  };
}

function storyPhotoRows(card, evidenceRows) {
  const product = card?.product;
  const flagDefs = [
    ["front", "Front"],
    ["ingredientPanel", "Ingredient panel"],
    ["weight", "Weight"],
    ["ocr", "OCR"],
    ["manual", "Manual text"],
  ];
  if (!product) {
    return workflowStatuses().map((status, index) => {
      const rows = evidenceRows.filter((row) => rowEvidenceStatus(row) === status);
      const best = firstEvidenceRow(rows, evidenceRows);
      const gate = photoProofGate(rows);
      return {
        number: String(index + 1).padStart(2, "0"),
        label: statusLabels[status] || labelFor(status),
        title: statusNarrative(status),
        rows,
        best,
        gate,
        sourceCount: rows.length,
        flags: flagDefs.map(([key, label]) => ({ key, label, active: photoProofFlag(rows, key) })),
      };
    });
  }
  return state.data.vintages.map((vintage, index) => {
    const rows = vintageEvidenceRows(product, evidenceRows, vintage);
    const info = product.vintage_statuses[vintage] || { status: "unknown", source_count: 0 };
    const best = firstEvidenceRow(rows, evidenceRows);
    const gate = photoProofGate(rows);
    return {
      number: String(index + 1).padStart(2, "0"),
      label: vintageLabels[vintage] || vintage,
      title: storyChapterTitle(vintage),
      rows,
      best,
      gate,
      sourceCount: numeric(info.source_count || rows.length),
      flags: flagDefs.map(([key, label]) => ({ key, label, active: photoProofFlag(rows, key) })),
    };
  });
}

function renderStoryPhotoBoard(card, registryRows) {
  if (!els.storyPhotoBoard) return;
  if (!card) {
    els.storyPhotoBoard.innerHTML = `<p class="empty-note">No photo proof board is available for the current filters.</p>`;
    return;
  }
  const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : bestEvidenceRows(registryRows, 10);
  const rows = storyPhotoRows(card, evidenceRows);
  const facts = storyEvidenceFacts(evidenceRows);
  const imageCount = evidenceRows.filter((row) => rowImageUrl(row)).length;
  els.storyPhotoBoard.innerHTML = `
    <article class="story-photo status-${escapeHtml(storyPublicationState(card, evidenceRows).status)}">
      <header class="story-photo-head">
        <div>
          <p class="eyebrow">Visual Proof</p>
          <h2>${escapeHtml(storyDisplayTitle(card))}</h2>
          <p>Package imagery, readable panels, OCR, and manual transcription are separate gates. A front photo can support package history without proving ingredients.</p>
        </div>
        <aside class="story-photo-summary" aria-label="Photo proof summary">
          <span><strong>${formatNumber(facts.usablePhotos)}</strong>photo leads</span>
          <span><strong>${formatNumber(facts.visibleLabels)}</strong>visible panels</span>
          <span><strong>${formatNumber(facts.manualLabels)}</strong>verified labels</span>
          <span><strong>${formatNumber(imageCount)}</strong>stored images</span>
        </aside>
      </header>
      <div class="story-photo-grid">
        ${rows
          .map((row) => {
            const source = row.best.source_url || row.best.archive_url || "";
            const title = row.best.source_title || row.best.source_domain || row.gate.title;
            return `
              <article class="story-photo-card status-${escapeHtml(row.gate.status)}">
                <div class="story-photo-visual">
                  ${renderStoryArticleVisual(row.best, `${row.label} package`, row.gate.status)}
                </div>
                <div class="story-photo-copy">
                  <span>${escapeHtml(row.number)} ${escapeHtml(row.label)}</span>
                  <strong>${escapeHtml(title)}</strong>
                  <p>${escapeHtml(row.best.reviewer_notes || row.best.promotion_blocker || row.gate.detail)}</p>
                  <div class="story-photo-flags">
                    ${row.flags
                      .map((flag) => `<span class="${flag.active ? "is-active" : ""}">${escapeHtml(flag.label)}</span>`)
                      .join("")}
                  </div>
                  <div class="lead-meta">
                    ${statusTag(row.gate.status)}
                    <span class="status-tag">${formatNumber(row.sourceCount)} sources</span>
                    ${source ? linkOrText(source, row.best.source_domain || "Source") : ""}
                  </div>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </article>
  `;
}

function captionRightsNote(row) {
  return row.license_rights_note || row.source_attribution_grade || "rights note not recorded";
}

function captionOwner(row) {
  return row.source_publisher_owner || row.source_author || row.source_domain || "owner not recorded";
}

function captionDateBasis(row, fallback) {
  return row.claimed_product_date_text || row.capture_date_text || row.vintage_label || row.archive_id || fallback || "date not recorded";
}

function captionUseStatus(row, photoRow) {
  const hasSource = Boolean(row.source_url || row.archive_url);
  const hasImage = Boolean(rowImageUrl(row));
  const hasRights = presentText(row.license_rights_note) || presentText(row.source_attribution_grade);
  if (hasSource && hasImage && hasRights && photoRow.gate.status === "manual_verified") return "manual_verified";
  if (hasSource && hasImage) return "usable_photo";
  if (hasSource) return "source_review";
  return "missing_vintage_slot";
}

function captionVisualRole(photoRow) {
  const active = photoRow.flags.filter((flag) => flag.active).map((flag) => flag.label);
  if (active.includes("Manual text")) return "verified label visual";
  if (active.includes("Ingredient panel")) return "label-panel visual";
  if (active.includes("Front")) return "front-package visual";
  if (active.includes("Weight")) return "package-context visual";
  return photoRow.gate.title.toLowerCase();
}

function storyCaptionRows(card, evidenceRows) {
  return storyPhotoRows(card, evidenceRows).map((photoRow) => {
    const row = photoRow.best || {};
    const source = row.source_url || row.archive_url || "";
    const status = captionUseStatus(row, photoRow);
    const role = captionVisualRole(photoRow);
    const productName = storyDisplayTitle(card);
    const caption = source
      ? `${productName} ${photoRow.label} ${role}, sourced from ${captionOwner(row)} with ${captionDateBasis(row, photoRow.label)} as the date basis.`
      : `${productName} ${photoRow.label} visual is not publication-ready because no source-attributable image receipt is attached.`;
    const altText = rowImageUrl(row)
      ? `${productName} ${photoRow.label} package evidence showing ${role}.`
      : `${productName} ${photoRow.label} evidence placeholder; source-attributable package image still needed.`;
    return {
      number: photoRow.number,
      label: photoRow.label,
      title: row.source_title || row.source_domain || photoRow.gate.title,
      status,
      role,
      caption,
      altText,
      owner: captionOwner(row),
      rights: captionRightsNote(row),
      dateBasis: captionDateBasis(row, photoRow.label),
      source,
      sourceLabel: row.source_domain || "Source",
      image: rowImageUrl(row),
      blocker: source
        ? hasCaptionBlocker(row, status)
        : "Attach a source URL, owner/publisher, date basis, image path or URL, and rights note before using this visual publicly.",
    };
  });
}

function hasCaptionBlocker(row, status) {
  if (status === "manual_verified") return "Caption can publish with the current claim boundary.";
  if (!rowImageUrl(row)) return "Public image use is blocked until a package image path or URL is attached.";
  if (!presentText(row.license_rights_note) && !presentText(row.source_attribution_grade)) {
    return "Caption needs a rights or attribution note before publication.";
  }
  return "Caption can describe evidence state, but claim wording still needs review.";
}

function storyCaptionSummaryRows(rows) {
  const usable = rows.filter((row) => ["manual_verified", "usable_photo"].includes(row.status)).length;
  const sourced = rows.filter((row) => row.source).length;
  const rights = rows.filter((row) => row.rights && row.rights !== "rights note not recorded").length;
  return [
    {
      label: "Usable Visuals",
      value: usable,
      status: usable ? "usable_photo" : "missing_vintage_slot",
      detail: "Have an image-bearing source receipt.",
    },
    {
      label: "Source Captions",
      value: sourced,
      status: sourced ? "source_review" : "missing_vintage_slot",
      detail: "Can name source owner and date basis.",
    },
    {
      label: "Rights Notes",
      value: rights,
      status: rights ? "source_review" : "candidate_needs_archive",
      detail: "Have recorded rights or attribution context.",
    },
  ];
}

function renderStoryCaptionBoard(card, registryRows) {
  if (!els.storyCaptionBoard) return;
  if (!card) {
    els.storyCaptionBoard.innerHTML = `<p class="empty-note">No caption board is available for the current filters.</p>`;
    return;
  }
  const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : bestEvidenceRows(registryRows, 10);
  const rows = storyCaptionRows(card, evidenceRows);
  const summaryRows = storyCaptionSummaryRows(rows);
  els.storyCaptionBoard.innerHTML = `
    <article class="story-caption status-${escapeHtml(storyPublicationState(card, evidenceRows).status)}">
      <header class="story-caption-head">
        <div>
          <p class="eyebrow">Caption Board</p>
          <h2>${escapeHtml(storyDisplayTitle(card))}</h2>
          <p>Prepare visual evidence for publication: caption copy, alt text, attribution, date basis, rights note, and blockers stay together.</p>
        </div>
        <aside class="story-caption-summary" aria-label="Caption readiness summary">
          ${summaryRows
            .map((row) => `
              <span class="status-${escapeHtml(row.status || "unknown")}">
                <strong>${formatNumber(row.value)}</strong>${escapeHtml(row.label)}
                <em>${escapeHtml(row.detail)}</em>
              </span>
            `)
            .join("")}
        </aside>
      </header>
      <div class="story-caption-grid" aria-label="Source-attributed visual captions">
        ${rows
          .map((row) => `
            <article class="story-caption-card status-${escapeHtml(row.status || "unknown")}">
              <header>
                <span>${escapeHtml(row.number)} ${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.title)}</strong>
              </header>
              <div class="story-caption-copy">
                <section>
                  <span>Caption</span>
                  <p>${escapeHtml(row.caption)}</p>
                </section>
                <section>
                  <span>Alt Text</span>
                  <p>${escapeHtml(row.altText)}</p>
                </section>
                <section>
                  <span>Attribution</span>
                  <p>${escapeHtml(`${row.owner} · ${row.dateBasis} · ${row.rights}`)}</p>
                </section>
                <section>
                  <span>Blocker</span>
                  <p>${escapeHtml(row.blocker)}</p>
                </section>
              </div>
              <footer>
                ${statusTag(row.status || "unknown")}
                <span class="status-tag">${escapeHtml(row.role)}</span>
                ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
              </footer>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function comparisonSideRows(card, evidenceRows) {
  const product = card?.product;
  if (!product) {
    const reviewRows = evidenceRows.filter((row) => ["source_review", "usable_photo", "label_visible"].includes(rowEvidenceStatus(row)));
    const verifiedRows = evidenceRows.filter((row) => rowEvidenceStatus(row) === "manual_verified");
    return [
      {
        key: "lead",
        label: "Lead",
        title: "Review evidence",
        rows: reviewRows,
        fallbackRows: evidenceRows,
        status: reviewRows.length ? rowEvidenceStatus(reviewRows[0]) : "source_review",
        detail: "Candidate evidence is still moving through attribution, photo, label, and transcription checks.",
      },
      {
        key: "claim",
        label: "Claim",
        title: "Verified evidence",
        rows: verifiedRows,
        fallbackRows: evidenceRows,
        status: verifiedRows.length ? "manual_verified" : "missing_vintage_slot",
        detail: "Only manual-verified rows can support public formulation claims.",
      },
    ];
  }
  const currentRows = vintageEvidenceRows(product, evidenceRows, "current_2020s");
  const earliestRows = vintageEvidenceRows(product, evidenceRows, "earliest_verified_label");
  const currentInfo = product.vintage_statuses?.current_2020s || {};
  const earliestInfo = product.vintage_statuses?.earliest_verified_label || {};
  const earliestDetail = /oreo/i.test(`${product.display_name || ""} ${product.canonical_name || ""}`)
    ? "The original 1912 ingredient label is not verified. Older package leads can appear here, but cannot stand in for origin-label text."
    : storyChapterBody(product, "earliest_verified_label", earliestInfo, earliestRows);
  return [
    {
      key: "then",
      label: "Then",
      title: storyChapterTitle("earliest_verified_label"),
      rows: earliestRows,
      fallbackRows: evidenceRows,
      status: earliestInfo.status || "missing_vintage_slot",
      detail: earliestDetail,
      sourceCount: numeric(earliestInfo.source_count || earliestRows.length),
    },
    {
      key: "now",
      label: "Now",
      title: storyChapterTitle("current_2020s"),
      rows: currentRows,
      fallbackRows: evidenceRows,
      status: currentInfo.status || "candidate_needs_archive",
      detail: storyChapterBody(product, "current_2020s", currentInfo, currentRows),
      sourceCount: numeric(currentInfo.source_count || currentRows.length),
    },
  ];
}

function comparisonSideCard(side) {
  const row = firstEvidenceRow(side.rows, side.fallbackRows);
  const source = row.source_url || row.archive_url || "";
  const status = row.evidence_id ? rowEvidenceStatus(row) : side.status || "unknown";
  const facts = storyEvidenceFacts(side.rows);
  return {
    ...side,
    row,
    source,
    sourceLabel: row.source_domain || "Source",
    status,
    facts,
    headline: row.source_title || side.title,
    note: row.reviewer_notes || row.unsupported_gap_note || row.promotion_blocker || side.detail,
  };
}

function comparisonLaneVerdict(lane, leftCell, rightCell) {
  const leftTone = storyMapCellTone(leftCell.status);
  const rightTone = storyMapCellTone(rightCell.status);
  if (lane.key === "ingredient") {
    if (leftCell.status === "manual_verified" && rightCell.status === "manual_verified") {
      return {
        status: "manual_verified",
        title: "Ingredient diff allowed",
        detail: "Both sides have reviewed label text, so the article can compare ingredient statements for these scoped chapters.",
      };
    }
    if (["label_visible", "ocr_extracted"].includes(leftCell.status) || ["label_visible", "ocr_extracted"].includes(rightCell.status)) {
      return {
        status: "label_visible",
        title: "Transcription first",
        detail: "At least one side has visible or extractable text, but formulation language remains locked until manual verification.",
      };
    }
    return {
      status: "missing_vintage_slot",
      title: "Ingredient diff locked",
      detail: "The story can explain the evidence gap, but it cannot compare ingredient changes across these chapters yet.",
    };
  }
  if (lane.key === "package") {
    if (leftCell.status === "candidate_found" && rightCell.status === "candidate_found") {
      return {
        status: "candidate_found",
        title: "Package comparison candidate",
        detail: "Both sides have package context; review SKU identity before making downsizing or serving-size claims.",
      };
    }
    if (leftTone !== "gap" || rightTone !== "gap") {
      return {
        status: "candidate_needs_panel",
        title: "Package context partial",
        detail: "One side has package clues, but the comparison needs both weights or serving fields tied to reviewed evidence.",
      };
    }
  }
  if (lane.key === "economics") {
    if (leftCell.status === "candidate_found" && rightCell.status === "candidate_found") {
      return {
        status: "candidate_found",
        title: "Economic overlay candidate",
        detail: "Price and package fields can be normalized after SKU matching and date/capture review.",
      };
    }
    return {
      status: "candidate_needs_archive",
      title: "Economics deferred",
      detail: "Do not compare prices until package size, source date, and product identity are aligned on both sides.",
    };
  }
  if (leftTone !== "gap" && rightTone !== "gap") {
    return {
      status: "source_review",
      title: "Reviewable comparison",
      detail: `${lane.label} evidence exists on both sides, but source/date/product-role review still decides whether it becomes a claim.`,
    };
  }
  return {
    status: "missing_vintage_slot",
    title: "Comparison blocked",
    detail: `${lane.label} cannot be compared until both sides have source-attributable evidence.`,
  };
}

function comparisonLaneRows(leftRows, rightRows) {
  return storyMapLaneDefinitions().map((lane) => {
    const leftCell = matrixFacetCell(lane.key, leftRows);
    const rightCell = matrixFacetCell(lane.key, rightRows);
    const verdict = comparisonLaneVerdict(lane, leftCell, rightCell);
    return {
      ...lane,
      leftCell,
      rightCell,
      leftTone: storyMapCellTone(leftCell.status),
      rightTone: storyMapCellTone(rightCell.status),
      verdict,
    };
  });
}

function storyComparisonVerdict(card, left, right, lanes) {
  const product = card?.product;
  const ingredient = lanes.find((lane) => lane.key === "ingredient");
  if (/oreo/i.test(`${product?.display_name || ""} ${product?.canonical_name || ""}`)) {
    return {
      status: "missing_vintage_slot",
      title: "No original-to-current Oreo ingredient comparison yet",
      detail: "The 1912 original ingredient label is not verified, so this page must tell the proof chase instead of asserting how the original label differs from today's SKU.",
    };
  }
  if (ingredient?.verdict.status === "manual_verified") {
    return {
      status: "manual_verified",
      title: "Ingredient comparison can publish for scoped chapters",
      detail: "Both sides have manual-verified text, so the article can compare those specific labels while keeping other eras labeled as gaps.",
    };
  }
  return {
    status: ingredient?.verdict.status || "source_review",
    title: "Comparison is not claim-ready",
    detail: ingredient?.verdict.detail || "The article can show what evidence exists, but ingredient-change language waits for reviewed label text.",
  };
}

function renderStoryComparison(card, registryRows) {
  if (!els.storyCompareStage) return;
  if (!card) {
    els.storyCompareStage.innerHTML = `<p class="empty-note">No comparison is available for the current filters.</p>`;
    return;
  }
  const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : bestEvidenceRows(registryRows, 10);
  const [leftSide, rightSide] = comparisonSideRows(card, evidenceRows).map(comparisonSideCard);
  const lanes = comparisonLaneRows(leftSide.rows, rightSide.rows);
  const verdict = storyComparisonVerdict(card, leftSide, rightSide, lanes);
  els.storyCompareStage.innerHTML = `
    <article class="story-compare-stage status-${escapeHtml(verdict.status)}">
      <header class="story-compare-head">
        <div>
          <p class="eyebrow">Then vs Now</p>
          <h2>${escapeHtml(verdict.title)}</h2>
          <p>${escapeHtml(verdict.detail)}</p>
        </div>
        <aside class="story-compare-verdict">
          <span>${escapeHtml(leftSide.label)}</span>
          <strong>${escapeHtml(rightSide.label)}</strong>
          <p>${escapeHtml(storyDisplayTitle(card))}</p>
          <div class="lead-meta">
            ${statusTag(verdict.status)}
            ${statusTag(activeStoryLens().label)}
          </div>
        </aside>
      </header>
      <div class="story-compare-sides" aria-label="Compared evidence anchors">
        ${[leftSide, rightSide]
          .map((side) => `
            <article class="story-compare-side status-${escapeHtml(side.status || "unknown")}">
              ${renderStoryArticleVisual(side.row, side.headline, side.status)}
              <div>
                <span>${escapeHtml(side.label)}</span>
                <strong>${escapeHtml(side.headline)}</strong>
                <p>${escapeHtml(clipped(side.note, 170))}</p>
                <div class="story-compare-side-metrics">
                  <span><strong>${formatNumber(side.sourceCount || side.rows.length)}</strong>sources</span>
                  <span><strong>${formatNumber(side.facts.visibleLabels)}</strong>visible</span>
                  <span><strong>${formatNumber(side.facts.manualLabels)}</strong>verified</span>
                </div>
                <div class="lead-meta">
                  ${statusTag(side.status || "unknown")}
                  ${side.source ? linkOrText(side.source, side.sourceLabel || "Source") : ""}
                </div>
              </div>
            </article>
          `)
          .join("")}
      </div>
      <div class="story-compare-lanes" aria-label="Facet comparison verdicts">
        ${lanes
          .map((lane) => `
            <article class="story-compare-lane status-${escapeHtml(lane.verdict.status)}">
              <header>
                <span>${escapeHtml(lane.label)}</span>
                <strong>${escapeHtml(lane.verdict.title)}</strong>
              </header>
              <div class="story-compare-lane-pair">
                <div class="tone-${escapeHtml(lane.leftTone)} status-${escapeHtml(lane.leftCell.status)}">
                  <span>${escapeHtml(leftSide.label)}</span>
                  <strong>${escapeHtml(lane.leftCell.title)}</strong>
                </div>
                <div class="tone-${escapeHtml(lane.rightTone)} status-${escapeHtml(lane.rightCell.status)}">
                  <span>${escapeHtml(rightSide.label)}</span>
                  <strong>${escapeHtml(lane.rightCell.title)}</strong>
                </div>
              </div>
              <p>${escapeHtml(lane.verdict.detail)}</p>
              <button class="story-compare-lens" type="button" data-story-lens="${escapeHtml(lane.key)}">${escapeHtml(lane.label)} lens</button>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function storyMapLaneDefinitions() {
  return [
    ["ingredient", "Ingredients", "Verified label text is required before formulation changes become claims."],
    ["package", "Package", "Net weight, serving, and package format stay separate from ingredient evidence."],
    ["maker", "Maker", "Manufacturer, distributor, and owner clues need their own source text."],
    ["economics", "Economics", "Price links are deferred until SKU and package-size evidence align."],
    ["provenance", "Sources", "Every vintage claim needs source owner, URL, date basis, and review state."],
  ].map(([key, label, rule]) => ({ key, label, rule }));
}

function storyMapCellTone(status) {
  if (["manual_verified", "ground_truth_ready"].includes(status)) return "claim";
  if (["label_visible", "ocr_extracted", "candidate_found"].includes(status)) return "ready";
  if (["no_source", "missing_vintage_slot", "rejected"].includes(status)) return "gap";
  return "review";
}

function storyMapRows(card, evidenceRows) {
  const lanes = storyMapLaneDefinitions();
  const product = card?.product;
  if (!product) {
    return workflowStatuses().map((status, index) => {
      const rows = evidenceRows.filter((row) => rowEvidenceStatus(row) === status);
      return {
        number: String(index + 1).padStart(2, "0"),
        label: statusLabels[status] || labelFor(status),
        title: statusNarrative(status),
        detail: `${pluralize(rows.length, "record")} in this workflow state.`,
        status,
        sourceCount: rows.length,
        source: "",
        sourceLabel: "",
        cells: lanes.map((lane) => {
          const cell = matrixFacetCell(lane.key, rows);
          return { ...lane, ...cell, tone: storyMapCellTone(cell.status) };
        }),
      };
    });
  }
  return state.data.vintages.map((vintage, index) => {
    const info = product.vintage_statuses[vintage] || { status: "unknown", source_count: 0 };
    const rows = vintageEvidenceRows(product, evidenceRows, vintage);
    const best = bestEvidenceRows(rows, 1)[0] || {};
    const status = info.status || "unknown";
    return {
      number: String(index + 1).padStart(2, "0"),
      label: vintageLabels[vintage] || vintage,
      title: storyChapterTitle(vintage),
      detail: storyChapterBody(product, vintage, info, rows),
      status,
      sourceCount: numeric(info.source_count || rows.length),
      source: best.source_url || best.archive_url || "",
      sourceLabel: best.source_domain || "Source",
      cells: lanes.map((lane) => {
        const cell = matrixFacetCell(lane.key, rows);
        return { ...lane, ...cell, tone: storyMapCellTone(cell.status) };
      }),
    };
  });
}

function storyMapLaneRows(rows) {
  return storyMapLaneDefinitions().map((lane) => {
    const cells = rows.map((row) => row.cells.find((cell) => cell.key === lane.key)).filter(Boolean);
    const counts = cells.reduce((memo, cell) => {
      memo[cell.tone] = (memo[cell.tone] || 0) + 1;
      return memo;
    }, { claim: 0, ready: 0, review: 0, gap: 0 });
    const total = cells.length || 1;
    const status = counts.claim
      ? "manual_verified"
      : counts.ready
        ? "label_visible"
        : counts.review
          ? "source_review"
          : "missing_vintage_slot";
    const pct = Math.round(((counts.claim + counts.ready) / total) * 100);
    return {
      ...lane,
      status,
      counts,
      pct,
      selected: lane.key === activeStoryLens().key,
      detail: `${formatNumber(counts.claim)} claim-ready · ${formatNumber(counts.ready)} text/context-ready · ${formatNumber(counts.gap)} blocked`,
    };
  });
}

function renderStoryMap(card, registryRows) {
  if (!els.storyMap) return;
  if (!card) {
    els.storyMap.innerHTML = `<p class="empty-note">No story map is available for the current filters.</p>`;
    return;
  }
  const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : bestEvidenceRows(registryRows, 10);
  const publicationState = storyPublicationState(card, evidenceRows);
  const facts = storyEvidenceFacts(evidenceRows);
  const rows = storyMapRows(card, evidenceRows);
  const laneRows = storyMapLaneRows(rows);
  const productName = storyDisplayTitle(card);
  els.storyMap.innerHTML = `
    <article class="story-map status-${escapeHtml(publicationState.status)}">
      <header class="story-map-head">
        <div>
          <p class="eyebrow">Evidence Story Map</p>
          <h2>${escapeHtml(productName)}</h2>
          <p>Each row is a chapter in the product story; each lane shows whether ingredient, package, maker, economics, and provenance claims are ready, still in review, or blocked as gaps.</p>
        </div>
        <aside class="story-map-summary" aria-label="Story map summary">
          <span><strong>${formatNumber(rows.length)}</strong>chapters</span>
          <span><strong>${formatNumber(facts.sourceLinks)}</strong>receipts</span>
          <span><strong>${formatNumber(facts.manualLabels)}</strong>verified labels</span>
          <span><strong>${formatNumber(facts.priceFields)}</strong>price clues</span>
        </aside>
      </header>
      <div class="story-map-lanes" aria-label="Story evidence lanes">
        ${laneRows
          .map((lane) => `
            <button class="story-map-lane ${lane.selected ? "is-selected" : ""} status-${escapeHtml(lane.status)}" type="button" data-story-lens="${escapeHtml(lane.key)}">
              <span>${escapeHtml(lane.label)}</span>
              <strong>${formatNumber(lane.pct)}%</strong>
              <p>${escapeHtml(lane.detail)}</p>
            </button>
          `)
          .join("")}
      </div>
      <div class="story-map-grid" aria-label="Chapter-by-lane proof map">
        ${rows
          .map((row) => `
            <article class="story-map-row status-${escapeHtml(row.status || "unknown")}">
              <header>
                <span>${escapeHtml(row.number)}</span>
                <div>
                  <em>${escapeHtml(row.label)}</em>
                  <strong>${escapeHtml(row.title)}</strong>
                  <p>${escapeHtml(clipped(row.detail, 120))}</p>
                  <div class="lead-meta">
                    ${statusTag(row.status || "unknown")}
                    <span class="status-tag">${formatNumber(row.sourceCount)} sources</span>
                    ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
                  </div>
                </div>
              </header>
              <div class="story-map-cells">
                ${row.cells
                  .map((cell) => `
                    <section class="story-map-cell tone-${escapeHtml(cell.tone)} status-${escapeHtml(cell.status || "unknown")}">
                      <span>${escapeHtml(cell.label)}</span>
                      <strong>${escapeHtml(cell.title)}</strong>
                      <p>${escapeHtml(cell.detail)}</p>
                    </section>
                  `)
                  .join("")}
              </div>
            </article>
          `)
          .join("")}
      </div>
      <footer class="story-map-rulebar" aria-label="Map reading rules">
        <span>${statusTag("manual_verified")} Reviewed text can carry scoped claims.</span>
        <span>${statusTag("source_review")} Source leads need date, role, rights, or panel review.</span>
        <span>${statusTag("missing_vintage_slot")} Gaps stay visible and cannot be smoothed into history.</span>
      </footer>
    </article>
  `;
}

function ingredientFacetStatus(facts) {
  if (facts.manualLabels) return "manual_verified";
  if (facts.visibleLabels) return "label_visible";
  if (facts.ocrLabels) return "ocr_extracted";
  if (facts.usablePhotos) return "usable_photo";
  if (facts.sourceLinks) return "source_review";
  return "missing_vintage_slot";
}

function storyFacetRows(card, evidenceRows) {
  const facts = storyEvidenceFacts(evidenceRows);
  const productName = storyDisplayTitle(card);
  const labelStatus = ingredientFacetStatus(facts);
  const labelEvidence = `${pluralize(facts.manualLabels, "verified label")} · ${pluralize(facts.visibleLabels, "visible panel")} · ${pluralize(facts.ocrLabels, "OCR record")}`;
  const labelBoundary = storyCannotSayYet(card, evidenceRows);
  const labelUnlock = storyNextEvidenceStep(card, evidenceRows);
  const packageReady = facts.packageFields && facts.priceFields;
  return [
    {
      label: "Ingredient Statement",
      title: "The full label text",
      status: labelStatus,
      canSay: facts.manualLabels
        ? `${productName} has reviewed label text for scoped formulation claims.`
        : "The story can discuss evidence status, but not verified formulation changes.",
      evidence: labelEvidence,
      boundary: labelBoundary,
      unlock: labelUnlock,
    },
    {
      label: "Fat/Oil System",
      title: "Palm, seed oils, animal fat, trans-fat-relevant terms",
      status: facts.manualLabels ? "manual_verified" : labelStatus,
      canSay: facts.manualLabels
        ? "Reviewed labels can be compared for oil and fat terms within verified vintages."
        : "Oil-system changes stay locked until readable labels are transcribed and verified.",
      evidence: labelEvidence,
      boundary: "Do not infer lard, palm oil, canola oil, soybean oil, hydrogenated oil, or trans-fat-related changes from package photos alone.",
      unlock: "Compare verified ingredient statements across vintages for fat/oil canonical IDs and order changes.",
    },
    {
      label: "Sweeteners",
      title: "Sugar, HFCS, invert sugar, syrups",
      status: facts.manualLabels ? "manual_verified" : labelStatus,
      canSay: facts.manualLabels
        ? "Verified labels can support scoped sweetener presence and ordering claims."
        : "Sweetener substitutions cannot be narrated from unverified source leads.",
      evidence: labelEvidence,
      boundary: "Do not claim HFCS, invert sugar, or sugar-system changes until ingredient text is manually verified.",
      unlock: "Capture and facet sweetener terms from corrected label transcriptions.",
    },
    {
      label: "Flour/Grain",
      title: "Wheat flour, enriched flour, enrichment subingredients",
      status: facts.manualLabels ? "manual_verified" : labelStatus,
      canSay: facts.manualLabels
        ? "Verified labels can show flour and enrichment components for scoped eras."
        : "Flour and enrichment details remain a label-text task.",
      evidence: labelEvidence,
      boundary: "Do not collapse wheat flour, enriched flour, niacin, iron, thiamine, riboflavin, or folic acid into one history without the raw label.",
      unlock: "Parse nested enriched-flour subingredients and keep parent/child order.",
    },
    {
      label: "Cocoa/Chocolate",
      title: "Cocoa processed with alkali, chocolate terms",
      status: facts.manualLabels ? "manual_verified" : labelStatus,
      canSay: facts.manualLabels
        ? "Cocoa and chocolate language can be compared only within verified ingredient statements."
        : "Cocoa/chocolate wording remains unverified until label text is reviewed.",
      evidence: labelEvidence,
      boundary: "Do not infer cocoa processing or chocolate formulation from product name or front-panel imagery.",
      unlock: "Normalize cocoa/chocolate synonyms from verified labels.",
    },
    {
      label: "Additives/Flavor",
      title: "Leavening, emulsifiers, natural/artificial flavor",
      status: facts.manualLabels ? "manual_verified" : labelStatus,
      canSay: facts.manualLabels
        ? "Verified labels can support additive, leavening, emulsifier, and flavor facets."
        : "Additive and flavor claims stay in review until the label panel is readable.",
      evidence: labelEvidence,
      boundary: "Do not claim artificial flavor, natural flavor, soy lecithin, or leavening changes from incomplete OCR or front-package claims.",
      unlock: "Parse less-than-2-percent sections, connectors, and nested subingredients.",
    },
    {
      label: "Allergen/Disclosure",
      title: "Contains statements, bioengineered disclosure, may-contain text",
      status: facts.manualLabels ? "manual_verified" : facts.visibleLabels ? "label_visible" : "source_review",
      canSay: facts.manualLabels
        ? "Reviewed label text can separate ingredient list claims from allergen and disclosure claims."
        : "Disclosure changes require readable back-panel or regulatory document evidence.",
      evidence: `${pluralize(facts.visibleLabels, "visible panel")} · ${pluralize(facts.sourceLinks, "source link")}`,
      boundary: "Do not treat allergen statements, may-contain text, or bioengineered disclosures as ingredient-order changes.",
      unlock: "Store disclosure text as separate evidence-linked occurrences.",
    },
    {
      label: "Package/Economics",
      title: "Weight, serving size, price alignment",
      status: packageReady ? "candidate_found" : facts.packageFields ? "candidate_needs_archive" : "candidate_needs_panel",
      canSay: packageReady
        ? "Package and price clues can be reviewed together before normalized analysis."
        : "Economic overlays are still context, not analysis.",
      evidence: `${pluralize(facts.packageFields, "package field")} · ${pluralize(facts.priceFields, "price clue")}`,
      boundary: "Do not compare price, size, or formulation trends until SKU, package weight, serving size, and price capture context align.",
      unlock: "Link reviewed SKU/package evidence to price observations and compute nominal price-per-unit metrics.",
    },
  ].map((row, index) => ({
    ...row,
    number: String(index + 1).padStart(2, "0"),
    bucket: reviewStatusBucket(row.status),
  }));
}

function storyFacetSummaryRows(rows) {
  const counts = rows.reduce((acc, row) => {
    acc[row.bucket] = (acc[row.bucket] || 0) + 1;
    return acc;
  }, { ready: 0, review: 0, locked: 0 });
  return [
    {
      label: "Claim-ready",
      value: counts.ready,
      status: counts.ready ? "manual_verified" : "source_review",
      detail: "Facet stories backed by verified evidence.",
    },
    {
      label: "In review",
      value: counts.review,
      status: counts.review ? "source_review" : "manual_verified",
      detail: "Facet stories needing review or context.",
    },
    {
      label: "Locked",
      value: counts.locked,
      status: counts.locked ? "missing_vintage_slot" : "manual_verified",
      detail: "Facet stories blocked from public claims.",
    },
  ];
}

function renderStoryFacets(card, registryRows) {
  if (!els.storyFacets) return;
  if (!card) {
    els.storyFacets.innerHTML = `<p class="empty-note">No ingredient facet board is available for the current filters.</p>`;
    return;
  }
  const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : bestEvidenceRows(registryRows, 10);
  const rows = storyFacetRows(card, evidenceRows);
  const summaryRows = storyFacetSummaryRows(rows);
  els.storyFacets.innerHTML = `
    <article class="story-facets status-${escapeHtml(storyPublicationState(card, evidenceRows).status)}">
      <header class="story-facets-head">
        <div>
          <p class="eyebrow">Ingredient Facets</p>
          <h2>${escapeHtml(storyDisplayTitle(card))}</h2>
          <p>Facet the ingredient story before publication. Each facet states what can be said, what proof exists, what remains locked, and what unlocks stronger claims.</p>
        </div>
        <aside class="story-facets-summary" aria-label="Ingredient facet readiness summary">
          ${summaryRows
            .map((row) => `
              <span class="status-${escapeHtml(row.status || "unknown")}">
                <strong>${formatNumber(row.value)}</strong>${escapeHtml(row.label)}
                <em>${escapeHtml(row.detail)}</em>
              </span>
            `)
            .join("")}
        </aside>
      </header>
      <div class="story-facets-grid" aria-label="Ingredient facet cards">
        ${rows
          .map((row) => `
            <article class="story-facet-card status-${escapeHtml(row.status || "unknown")} facet-${escapeHtml(row.bucket)}">
              <header>
                <span>${escapeHtml(row.number)} ${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.title)}</strong>
              </header>
              <dl>
                <dt>Can Say</dt>
                <dd>${escapeHtml(row.canSay)}</dd>
                <dt>Evidence</dt>
                <dd>${escapeHtml(row.evidence)}</dd>
                <dt>Claim Boundary</dt>
                <dd>${escapeHtml(row.boundary)}</dd>
                <dt>Unlock</dt>
                <dd>${escapeHtml(row.unlock)}</dd>
              </dl>
              <footer>
                ${statusTag(row.status || "unknown")}
                <span class="status-tag">${escapeHtml(row.bucket)}</span>
              </footer>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function receiptGateForRows(rows) {
  const facts = storyEvidenceFacts(rows);
  if (facts.manualLabels) {
    return {
      status: "manual_verified",
      title: "Claim receipt",
      detail: "Manual-verified label text can support a scoped public claim for this chapter.",
    };
  }
  if (facts.visibleLabels || facts.ocrLabels) {
    return {
      status: facts.ocrLabels ? "ocr_extracted" : "label_visible",
      title: "Text receipt pending",
      detail: "A readable or extractable label exists, but formulation language waits for reviewed transcription.",
    };
  }
  if (facts.usablePhotos) {
    return {
      status: "usable_photo",
      title: "Photo receipt",
      detail: "Photo evidence can support package history, but not ingredient text until the panel is visible.",
    };
  }
  if (facts.sourceLinks) {
    return {
      status: "source_review",
      title: "Source receipt",
      detail: "Attributable source links exist; source role, product identity, date basis, and label visibility still need review.",
    };
  }
  return {
    status: "missing_vintage_slot",
    title: "Gap receipt",
    detail: "No source-attributable receipt is attached to this chapter yet.",
  };
}

function receiptSourceRows(rows, limit = 3) {
  return bestEvidenceRows(rows, limit).map((row) => {
    const source = row.source_url || row.archive_url || "";
    const dateBasis = row.claimed_product_date_text || row.capture_date_text || row.archive_id || row.vintage_label || "date not recorded";
    const rights = row.license_rights_note || row.source_attribution_grade || "rights not recorded";
    return {
      status: rowEvidenceStatus(row),
      title: row.source_title || row.source_domain || row.evidence_kind || "Evidence record",
      source,
      sourceLabel: row.source_domain || "Source",
      owner: row.source_publisher_owner || row.source_author || row.source_domain || "owner not recorded",
      dateBasis,
      rights,
      kind: row.evidence_kind || row.source_surface || "evidence",
      note: row.reviewer_notes || row.unsupported_gap_note || row.promotion_blocker || row.ground_truth_fields_missing || "",
    };
  });
}

function storyReceiptLedgerRows(card, evidenceRows) {
  const product = card?.product;
  if (!product) {
    return workflowStatuses().map((status, index) => {
      const rows = evidenceRows.filter((row) => rowEvidenceStatus(row) === status);
      const gate = receiptGateForRows(rows);
      return {
        number: String(index + 1).padStart(2, "0"),
        label: statusLabels[status] || labelFor(status),
        title: statusNarrative(status),
        status: gate.status,
        gate,
        facts: storyEvidenceFacts(rows),
        sourceCount: rows.length,
        receipts: receiptSourceRows(rows),
      };
    });
  }
  return state.data.vintages.map((vintage, index) => {
    const info = product.vintage_statuses[vintage] || { status: "unknown", source_count: 0 };
    const rows = vintageEvidenceRows(product, evidenceRows, vintage);
    const gate = receiptGateForRows(rows);
    return {
      number: String(index + 1).padStart(2, "0"),
      label: vintageLabels[vintage] || vintage,
      title: storyChapterTitle(vintage),
      status: gate.status,
      gate,
      facts: storyEvidenceFacts(rows),
      sourceCount: numeric(info.source_count || rows.length),
      receipts: receiptSourceRows(rows),
      gap: storyChapterBody(product, vintage, info, rows),
    };
  });
}

function renderStoryReceipts(card, registryRows) {
  if (!els.storyReceipts) return;
  if (!card) {
    els.storyReceipts.innerHTML = `<p class="empty-note">No receipts are available for the current filters.</p>`;
    return;
  }
  const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : bestEvidenceRows(registryRows, 10);
  const rows = storyReceiptLedgerRows(card, evidenceRows);
  const facts = storyEvidenceFacts(evidenceRows);
  els.storyReceipts.innerHTML = `
    <article class="story-receipts status-${escapeHtml(storyPublicationState(card, evidenceRows).status)}">
      <header class="story-receipts-head">
        <div>
          <p class="eyebrow">Source Receipts</p>
          <h2>${escapeHtml(storyDisplayTitle(card))}</h2>
          <p>Each chapter keeps its source receipts, owner/date basis, rights note, and review gate visible before it becomes a public claim.</p>
        </div>
        <aside class="story-receipts-summary" aria-label="Receipt summary">
          <span><strong>${formatNumber(facts.sourceLinks)}</strong>source links</span>
          <span><strong>${formatNumber(facts.rightsNotes)}</strong>rights notes</span>
          <span><strong>${formatNumber(facts.visibleLabels)}</strong>visible labels</span>
          <span><strong>${formatNumber(facts.manualLabels)}</strong>verified labels</span>
        </aside>
      </header>
      <div class="story-receipt-ledger">
        ${rows
          .map((row) => `
            <article class="story-receipt-row status-${escapeHtml(row.status || "unknown")}">
              <header>
                <span>${escapeHtml(row.number)}</span>
                <div>
                  <em>${escapeHtml(row.label)}</em>
                  <strong>${escapeHtml(row.title)}</strong>
                  <p>${escapeHtml(row.gate.detail || row.gap || "")}</p>
                </div>
              </header>
              <div class="story-receipt-gates">
                <span><strong>${formatNumber(row.sourceCount)}</strong>sources</span>
                <span><strong>${formatNumber(row.facts.visibleLabels)}</strong>visible</span>
                <span><strong>${formatNumber(row.facts.manualLabels)}</strong>verified</span>
                <span><strong>${formatNumber(row.facts.rightsNotes)}</strong>rights</span>
              </div>
              <div class="story-receipt-cards">
                ${row.receipts.length
                  ? row.receipts
                    .map((receipt) => `
                      <section class="story-receipt-card status-${escapeHtml(receipt.status || "unknown")}">
                        <div>
                          <span>${escapeHtml(receipt.dateBasis)}</span>
                          <strong>${escapeHtml(receipt.title)}</strong>
                        </div>
                        <dl>
                          <dt>Owner</dt>
                          <dd>${escapeHtml(receipt.owner)}</dd>
                          <dt>Rights</dt>
                          <dd>${escapeHtml(receipt.rights)}</dd>
                          <dt>Kind</dt>
                          <dd>${escapeHtml(labelFor(receipt.kind))}</dd>
                        </dl>
                        <p>${escapeHtml(clipped(receipt.note, 126))}</p>
                        <div class="lead-meta">
                          ${statusTag(receipt.status || "unknown")}
                          ${receipt.source ? linkOrText(receipt.source, receipt.sourceLabel || "Source") : ""}
                        </div>
                      </section>
                    `)
                    .join("")
                  : `<section class="story-receipt-card status-missing_vintage_slot">
                      <div>
                        <span>No receipt</span>
                        <strong>${escapeHtml(row.gate.title)}</strong>
                      </div>
                      <p>${escapeHtml(row.gap || row.gate.detail)}</p>
                      <div class="lead-meta">${statusTag(row.gate.status)}</div>
                    </section>`}
              </div>
            </article>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function storyCoverClaims(card, evidenceRows) {
  const narrative = storyLensNarrative(card, evidenceRows);
  return [
    {
      label: "Can Publish",
      title: "Supported story",
      body: narrative.canSay,
      status: narrative.status,
    },
    {
      label: "Must Not Say",
      title: "Claim boundary",
      body: narrative.boundary,
      status: "missing_vintage_slot",
    },
    {
      label: "Next Unlock",
      title: "Evidence move",
      body: narrative.unlock,
      status: evidenceRows.some((row) => rowEvidenceStatus(row) === "label_visible" || truthyFlag(row.ingredient_panel_visible))
        ? "label_visible"
        : "candidate_needs_panel",
    },
  ];
}

function storyCoverProofMetrics(card, evidenceRows) {
  const facts = storyEvidenceFacts(evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  return [
    ["State", publicationState.label, publicationState.status],
    ["Verified Labels", facts.manualLabels, facts.manualLabels ? "manual_verified" : "source_review"],
    ["Visible Panels", facts.visibleLabels, facts.visibleLabels ? "label_visible" : "candidate_needs_panel"],
    ["Source Links", facts.sourceLinks, facts.sourceLinks ? "source_review" : "no_source"],
  ];
}

function renderStoryCover(card, registryRows) {
  if (!els.storyCover) return;
  if (!card) {
    els.storyCover.innerHTML = `<article class="story-cover-main"><p class="empty-note">No story candidates match the current filters.</p></article>`;
    return;
  }

  const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : bestEvidenceRows(registryRows, 10);
  const headline = storyReaderHeadline(card, evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const narrative = storyLensNarrative(card, evidenceRows);
  const spineRows = storyBoardSpineRows(card, evidenceRows);
  const claims = storyCoverClaims(card, evidenceRows);
  const receipts = storyReceiptRows(evidenceRows).slice(0, 3);
  const proofMetrics = storyCoverProofMetrics(card, evidenceRows);
  const productName = storyDisplayTitle(card);

  els.storyCover.innerHTML = `
    <article class="story-cover-main status-${escapeHtml(publicationState.status)}">
      <div class="story-cover-copy">
        <p class="eyebrow">${escapeHtml(card.kicker || "Product Story")}</p>
        <h2>${escapeHtml(headline.title)}</h2>
        <p>${escapeHtml(headline.dek)}</p>
        <div class="lead-meta">
          ${statusTag(publicationState.status)}
          <span class="status-tag">${escapeHtml(publicationState.label)}</span>
          <span class="status-tag">${escapeHtml(activeStoryLens().label)} lens</span>
        </div>
      </div>
      <div class="story-cover-proof">
        <div class="story-cover-proof-head">
          <span>Selected Product</span>
          <strong>${escapeHtml(productName)}</strong>
        </div>
        <div class="story-cover-metrics">
          ${proofMetrics
            .map(([label, value, status]) => `
              <span class="status-${escapeHtml(status || "unknown")}">
                <strong>${escapeHtml(value)}</strong>
                ${escapeHtml(label)}
              </span>
            `)
            .join("")}
        </div>
      </div>
    </article>
    <div class="story-cover-claims">
      ${claims
        .map((claim) => `
          <article class="story-cover-claim status-${escapeHtml(claim.status || "unknown")}">
            <span>${escapeHtml(claim.label)}</span>
            <strong>${escapeHtml(claim.title)}</strong>
            <p>${escapeHtml(clipped(claim.body, 240))}</p>
          </article>
        `)
        .join("")}
    </div>
    <div class="story-cover-spine" aria-label="Narrative proof spine">
      ${spineRows
        .map((row) => `
          <article class="story-cover-step status-${escapeHtml(row.status || "unknown")}">
            <span>${escapeHtml(row.label)}</span>
            <strong>${escapeHtml(row.title)}</strong>
            <p>${escapeHtml(clipped(row.body, 150))}</p>
            <div class="lead-meta">
              ${statusTag(row.status || "unknown")}
              ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
            </div>
          </article>
        `)
        .join("")}
    </div>
    <aside class="story-cover-receipts" aria-label="Source receipts">
      <div class="subsection-title">
        <strong>Receipts</strong>
        <span>${escapeHtml(narrative.lens.label)} proof trail</span>
      </div>
      <div>
        ${receipts.length
          ? receipts
            .map((row) => `
              <article class="story-cover-receipt status-${escapeHtml(row.status || "unknown")}">
                <span>${escapeHtml(row.dateBasis)}</span>
                <strong>${escapeHtml(row.title)}</strong>
                <p>${escapeHtml(clipped(row.detail || `${row.owner} · ${row.rights}`, 130))}</p>
                <div class="lead-meta">
                  ${statusTag(row.status)}
                  ${row.source ? linkOrText(row.source, row.sourceLabel || "Source") : ""}
                </div>
              </article>
            `)
            .join("")
          : `<p class="empty-note">No source receipts are attached to this story yet.</p>`}
      </div>
    </aside>
  `;
}

function corpusCluster(product, evidenceRows) {
  const facts = storyEvidenceFacts(evidenceRows);
  const statuses = Object.values(product.vintage_statuses || {}).map((row) => row.status || "");
  if (numeric(product.ground_truth_slots) > 0 || facts.manualLabels > 0) {
    return {
      key: "verified_label_claims",
      label: "Verified label claims",
      status: "manual_verified",
      detail: "Reviewed label text can support scoped formulation chapters.",
    };
  }
  if (facts.visibleLabels > 0) {
    return {
      key: "transcription_ready",
      label: "Transcription-ready",
      status: "label_visible",
      detail: "Readable label leads can become ground truth after OCR/manual review.",
    };
  }
  if (product.category === "fast food") {
    return {
      key: "fast_food_documents",
      label: "Fast-food documents",
      status: "source_review",
      detail: "Menu, nutrition, allergen, and archive documents need item/date review.",
    };
  }
  if (facts.usablePhotos > 0 || statuses.includes("candidate_needs_transcription") || statuses.includes("candidate_needs_panel")) {
    return {
      key: "photo_panel_hunt",
      label: "Photo panel hunt",
      status: "usable_photo",
      detail: "Package leads exist; back-panel and net-weight roles still need review.",
    };
  }
  if (numeric(product.slots_without_sources) > 0 || presentText(product.missing_vintages)) {
    return {
      key: "source_gaps",
      label: "Source gaps",
      status: "no_source",
      detail: "One or more story chapters need source-attributable discovery.",
    };
  }
  return {
    key: "archive_queue",
    label: "Archive queue",
    status: "candidate_needs_archive",
    detail: "Candidate sources exist but need durable archive coordinates and review.",
  };
}

function corpusProductRows(registryRows) {
  return state.data.products
    .filter(productMatchesStoryFilters)
    .map((product) => {
      const evidenceRows = productEvidenceRows(product).filter((row) => !state.status || passesRegistry(row));
      const facts = storyEvidenceFacts(evidenceRows);
      const cluster = corpusCluster(product, evidenceRows);
      return {
        product,
        evidenceRows,
        facts,
        cluster,
        score: productStoryScore(product),
        sourcePath: storySourcePath(product, evidenceRows),
        bestSource: storyBestSource(evidenceRows.length ? evidenceRows : registryRows),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function corpusClusterRows(productRows) {
  const groups = new Map();
  productRows.forEach((row) => {
    const key = row.cluster.key;
    const group = groups.get(key) || {
      ...row.cluster,
      products: 0,
      candidates: 0,
      sourceSlots: 0,
      missingSlots: 0,
      visibleLabels: 0,
      manualLabels: 0,
      topProducts: [],
    };
    group.products += 1;
    group.candidates += numeric(row.product.product_candidate_count);
    group.sourceSlots += numeric(row.product.slots_with_sources);
    group.missingSlots += numeric(row.product.slots_without_sources);
    group.visibleLabels += row.facts.visibleLabels;
    group.manualLabels += row.facts.manualLabels;
    if (group.topProducts.length < 5) {
      group.topProducts.push(row.product.display_name || row.product.canonical_name);
    }
    groups.set(key, group);
  });
  return [...groups.values()].sort((a, b) => b.products - a.products || b.visibleLabels - a.visibleLabels);
}

function corpusLaneRows(productRows) {
  const massSearchRows = (state.data.mass_search_tasks || []).filter(passesSearchTask);
  const acquisitionRows = (state.data.acquisition_queue || []).filter(passesQueue);
  const registryRows = (state.data.evidence_registry || []).filter(passesRegistry);
  const sweeps = (state.data.common_crawl_sweeps || []).filter((row) => !state.category || row.category === state.category);
  const laneDefs = [
    {
      key: "current_web",
      label: "Current Web",
      status: "source_review",
      detail: "Brand, SmartLabel, retailer, database, and official current-label pages.",
      rows: massSearchRows.filter((row) => row.search_surface === "current_web_search"),
      acquisition: acquisitionRows.filter((row) => row.acquisition_surface === "current_web"),
    },
    {
      key: "common_crawl",
      label: "Common Crawl",
      status: "candidate_needs_archive",
      detail: "CDX sweeps and exact archive candidates feed WARC-coordinate review.",
      rows: massSearchRows.filter((row) => String(row.search_surface || "").startsWith("common_crawl")),
      acquisition: acquisitionRows.filter((row) => row.acquisition_surface === "common_crawl"),
      extraCount: sweeps.length,
    },
    {
      key: "collectors",
      label: "Collectors + Blogs",
      status: "usable_photo",
      detail: "Flickr, Wikimedia, museum, collector, marketplace, and package-history leads.",
      rows: massSearchRows.filter((row) => /flickr|collector|wikimedia|museum|marketplace|blog|archive/i.test(`${row.source_name || ""} ${row.source_key || ""} ${row.source_kind || ""}`)),
      acquisition: acquisitionRows.filter((row) => /flickr|collector|wikimedia|museum|marketplace|blog|archive/i.test(`${row.source_name || ""} ${row.source_key || ""} ${row.source_kind || ""}`)),
    },
    {
      key: "price_weight",
      label: "Price + Weight",
      status: "candidate_found",
      detail: "Retailer pages and package fields needed for future price-per-ounce overlays.",
      rows: massSearchRows.filter((row) => /retailer|price|package|weight|walmart|target|kroger|wegmans/i.test(`${row.source_name || ""} ${row.source_key || ""} ${row.source_kind || ""} ${row.query_text || ""}`)),
      acquisition: acquisitionRows.filter((row) => /retailer|price|package|weight|walmart|target|kroger|wegmans/i.test(`${row.source_name || ""} ${row.source_key || ""} ${row.source_kind || ""}`)),
    },
  ];
  return laneDefs.map((lane) => {
    const products = uniqueValues(lane.rows.map((row) => row.display_name || row.canonical_name), 5);
    const sourceDomains = uniqueValues([
      ...lane.rows.map((row) => row.source_name || row.source_key),
      ...registryRows.map((row) => row.source_domain),
    ], 4);
    return {
      ...lane,
      taskCount: lane.rows.length,
      acquisitionCount: lane.acquisition.length,
      productCount: uniqueValues(lane.rows.map((row) => row.canonical_name || row.display_name), 1000).length,
      products,
      sourceDomains,
      extraCount: lane.extraCount || 0,
      corpusProducts: productRows.length,
    };
  });
}

function passesTaskGroup(row) {
  const query = state.search.trim().toLowerCase();
  if (state.category && row.category !== state.category) return false;
  if (state.surface && row.search_surface !== state.surface) return false;
  if (state.status && row.review_stage !== state.status && !String(row.review_stages || "").split(";").includes(state.status)) return false;
  if (query && !textBlob(row).includes(query)) return false;
  return true;
}

function collectionTaskGroups() {
  const rows = state.data.collection_task_groups || [];
  if (rows.length) return rows.filter(passesTaskGroup);
  const groups = new Map();
  (state.data.mass_search_tasks || []).filter(passesSearchTask).forEach((row) => {
    const key = [row.search_surface || "", row.source_key || "", row.category || "", row.review_stage || ""].join("\u001f");
    const group = groups.get(key) || {
      group_id: `task-group-${groups.size + 1}`,
      search_surface: row.search_surface || "",
      source_key: row.source_key || "",
      source_name: row.source_name || row.source_key || "",
      source_kind: row.source_kind || "",
      category: row.category || "",
      review_stage: row.review_stage || "",
      task_count: 0,
      product_count: 0,
      top_products: "",
      vintages: "",
      sample_queries: "",
      search_urls_to_start: "",
      image_urls_to_start: "",
      common_crawl_patterns: "",
      cli_hints: "",
      best_candidate_urls: "",
      expected_evidence: row.expected_evidence || "",
      required_next_action: row.required_next_action || row.import_hint || "",
      source_attribution_grade: row.source_attribution_grade || "",
      max_priority: 0,
      productNames: [],
      canonicalNames: new Set(),
      vintageNames: [],
      queryTexts: [],
      searchUrls: [],
      imageUrls: [],
      cdxPatterns: [],
      cliHints: [],
      candidateUrls: [],
    };
    group.task_count += 1;
    group.max_priority = Math.max(group.max_priority, numeric(row.task_priority));
    if (row.canonical_name) group.canonicalNames.add(row.canonical_name);
    if (row.display_name && !group.productNames.includes(row.display_name) && group.productNames.length < 6) group.productNames.push(row.display_name);
    splitParts(row.vintage_label, 4).forEach((value) => {
      if (!group.vintageNames.includes(value) && group.vintageNames.length < 6) group.vintageNames.push(value);
    });
    splitParts(row.query_text, 2).forEach((value) => {
      if (!group.queryTexts.includes(value) && group.queryTexts.length < 4) group.queryTexts.push(value);
    });
    splitParts(row.search_url, 2).forEach((value) => {
      if (!group.searchUrls.includes(value) && group.searchUrls.length < 4) group.searchUrls.push(value);
    });
    splitParts(row.image_search_url, 2).forEach((value) => {
      if (!group.imageUrls.includes(value) && group.imageUrls.length < 4) group.imageUrls.push(value);
    });
    splitParts(row.common_crawl_patterns, 4).forEach((value) => {
      if (!group.cdxPatterns.includes(value) && group.cdxPatterns.length < 8) group.cdxPatterns.push(value);
    });
    splitParts(row.cli_hint, 2).forEach((value) => {
      if (!group.cliHints.includes(value) && group.cliHints.length < 4) group.cliHints.push(value);
    });
    splitParts(row.best_candidate_url, 2).forEach((value) => {
      if (!group.candidateUrls.includes(value) && group.candidateUrls.length < 4) group.candidateUrls.push(value);
    });
    groups.set(key, group);
  });
  return [...groups.values()]
    .map((group) => ({
      ...group,
      product_count: group.canonicalNames.size,
      top_products: group.productNames.join(";"),
      vintages: group.vintageNames.join(";"),
      sample_queries: group.queryTexts.join(";"),
      search_urls_to_start: group.searchUrls.join(";"),
      image_urls_to_start: group.imageUrls.join(";"),
      common_crawl_patterns: group.cdxPatterns.join(";"),
      cli_hints: group.cliHints.join(";"),
      best_candidate_urls: group.candidateUrls.join(";"),
    }))
    .sort((a, b) => numeric(b.max_priority) - numeric(a.max_priority) || numeric(b.task_count) - numeric(a.task_count));
}

function taskGroupStatus(row) {
  if (String(row.search_surface || "").startsWith("common_crawl")) return "candidate_needs_archive";
  if (/flickr|collector|wikimedia|museum|marketplace|blog/i.test(`${row.source_name || ""} ${row.source_key || ""}`)) return "usable_photo";
  if (/retailer|price|weight/i.test(`${row.source_name || ""} ${row.source_key || ""}`)) return "candidate_found";
  return "source_review";
}

function renderCorpusTaskGroups(groups) {
  if (!els.corpusTaskGroupRows) return;
  els.corpusTaskGroupCount.textContent = `${formatNumber(groups.length)} groups`;
  els.corpusTaskGroupRows.innerHTML = groups.length
    ? groups.slice(0, 12).map((row) => {
      const status = taskGroupStatus(row);
      const primary = firstPart(row.search_urls_to_start || row.image_urls_to_start || row.best_candidate_urls || row.cli_hints);
      return `
        <article class="corpus-task-card status-${escapeHtml(status)}">
          <div class="corpus-task-head">
            <div>
              <span>${escapeHtml(labelFor(row.search_surface || "source"))}</span>
              <strong>${escapeHtml(row.source_name || row.source_key || "Collection task")}</strong>
            </div>
            <em>${formatNumber(row.task_count)} tasks</em>
          </div>
          <p>${escapeHtml(clipped(row.required_next_action || row.expected_evidence || "Collect attributable source rows and keep verification gates explicit.", 150))}</p>
          <div class="corpus-statline">
            <span>${pluralize(row.product_count, "product")}</span>
            <span>${escapeHtml(labelFor(row.category || "mixed"))}</span>
            <span>${escapeHtml(labelFor(row.review_stage || "review"))}</span>
          </div>
          <div class="corpus-products">${escapeHtml(row.top_products || row.sample_queries || "")}</div>
          <div class="lead-meta">
            ${statusTag(status)}
            ${linkOrText(primary, primary.startsWith("http") ? "Start" : "CLI")}
          </div>
        </article>
      `;
    }).join("")
    : `<p class="empty-note">No task groups match the current filters.</p>`;
}

function renderCorpusSearchStarts() {
  if (!els.corpusSearchStartRows) return;
  const rows = (state.data.mass_search_tasks || [])
    .filter(passesSearchTask)
    .sort((a, b) => numeric(b.task_priority) - numeric(a.task_priority))
    .slice(0, 10);
  els.corpusSearchStartRows.innerHTML = rows.length
    ? rows.map((row) => `
      <article class="corpus-start-card status-${escapeHtml(taskGroupStatus(row))}">
        <div class="lead-title">
          <strong>${escapeHtml(row.display_name || row.canonical_name)}</strong>
          <span>${escapeHtml(vintageLabels[row.vintage_label] || labelFor(row.vintage_label || ""))} · ${escapeHtml(row.source_name || row.source_key || "")}</span>
        </div>
        <p>${escapeHtml(clipped(row.query_text || row.expected_evidence || row.required_next_action, 145))}</p>
        <div class="lead-meta">
          ${statusTag(row.search_surface)}
          ${statusTag(row.review_stage)}
          ${linkOrText(row.search_url, "Search")}
          ${linkOrText(row.image_search_url, "Images")}
          ${linkOrText(row.best_candidate_url, "Candidate")}
        </div>
      </article>
    `).join("")
    : `<p class="empty-note">No search starts match the current filters.</p>`;
}

function renderCorpusArchiveCommands() {
  if (!els.corpusArchiveCommandRows) return;
  const query = state.search.trim().toLowerCase();
  const rows = (state.data.common_crawl_sweeps || [])
    .filter((row) => !state.category || row.category === state.category)
    .filter((row) => !state.status || row.sweep_status === state.status)
    .filter((row) => !query || textBlob(row).includes(query))
    .sort((a, b) => numeric(b.sweep_priority) - numeric(a.sweep_priority))
    .slice(0, 8);
  els.corpusArchiveCommandRows.innerHTML = rows.length
    ? rows.map((row) => `
      <article class="corpus-command-card status-candidate_needs_archive">
        <div class="lead-title">
          <strong>${escapeHtml(row.query_contains || row.sweep_kind || "Common Crawl sweep")}</strong>
          <span>${escapeHtml(labelFor(row.category || ""))} · ${pluralize(row.product_count, "product")}</span>
        </div>
        <p>${escapeHtml(clipped(row.next_action || row.acceptance_gate || "", 150))}</p>
        <div class="lead-meta">
          ${statusTag(row.sweep_status)}
          ${statusTag(row.sweep_kind)}
          ${linkOrText(row.cli_command, "Command")}
        </div>
        <div class="corpus-products">${escapeHtml(clipped(row.top_products || row.sample_patterns || "", 180))}</div>
      </article>
    `).join("")
    : `<p class="empty-note">No archive commands match the current filters.</p>`;
}

function collectionMissionRows(productRows) {
  const taskRows = (state.data.mass_search_tasks || []).filter(passesSearchTask);
  const acquisitionRows = (state.data.acquisition_queue || []).filter(passesQueue);
  const cdxRows = (state.data.common_crawl_sweeps || [])
    .filter((row) => !state.category || row.category === state.category)
    .filter((row) => !state.status || row.sweep_status === state.status)
    .filter((row) => !state.search.trim() || textBlob(row).includes(state.search.trim().toLowerCase()));
  const groups = collectionTaskGroups();
  const sourceText = (row) => `${row.search_surface || ""} ${row.acquisition_surface || ""} ${row.source_name || ""} ${row.source_key || ""} ${row.source_kind || ""} ${row.query_text || ""} ${row.category || ""} ${row.review_stage || ""}`.toLowerCase();
  const groupText = (row) => `${row.search_surface || ""} ${row.source_name || ""} ${row.source_key || ""} ${row.source_kind || ""} ${row.category || ""} ${row.review_stage || ""} ${row.expected_evidence || ""} ${row.required_next_action || ""}`.toLowerCase();
  const pushStarts = (starts, value, limit) => {
    splitParts(value, limit * 3).forEach((part) => {
      if (!starts.includes(part) && starts.length < limit) starts.push(part);
    });
  };
  const groupStarts = (rows, limit = 3) => {
    const starts = [];
    rows.forEach((row) => {
      pushStarts(starts, row.search_urls_to_start || row.search_url, limit);
      pushStarts(starts, row.image_urls_to_start || row.image_search_url, limit);
      pushStarts(starts, row.best_candidate_urls || row.best_candidate_url, limit);
      pushStarts(starts, row.cli_hints || row.cli_hint, limit);
    });
    return starts.slice(0, limit);
  };
  const taskProducts = (rows, limit = 6) => uniqueValues(rows.flatMap((row) => splitParts(row.top_products || row.display_name || row.canonical_name, 8)), limit);
  const missionDefs = [
    {
      key: "collector_photos",
      label: "Collector Photos",
      status: "usable_photo",
      test: (text) => /collector|flickr|wikimedia|museum|worthpoint|ebay|marketplace|blog|package archive/.test(text),
      productFilter: (row) => /photo|package|collector|flickr|blog|marketplace/i.test(`${row.product.collection_track || ""} ${row.product.recommended_next_action || ""}`),
      evidence: "Source-attributable front/back package photos with readable dates, weights, and label panels.",
      boundary: "Collector photos can support package-history scenes, but ingredient claims stay locked until panels are readable and transcribed.",
    },
    {
      key: "current_web",
      label: "Current Web Labels",
      status: "source_review",
      test: (text) => /current_web|smartlabel|brand|official|retailer|open food facts|usda/.test(text),
      productFilter: (row) => row.facts.visibleLabels || /current|label|smartlabel|brand/i.test(`${row.product.current_2020s_status || ""} ${row.product.recommended_next_action || ""}`),
      evidence: "Current SKU-specific ingredient pages, brand labels, retailer panels, and database records.",
      boundary: "Current labels cannot stand in for historical Oreo-style timelines without SKU/package and date context.",
    },
    {
      key: "common_crawl",
      label: "Common Crawl + Archive",
      status: "candidate_needs_archive",
      test: (text) => /common_crawl|cdx|wayback|archive|warc/.test(text),
      productFilter: (row) => /archive|crawl|wayback|capture/i.test(`${row.product.archive_needed_vintages || ""} ${row.product.recommended_next_action || ""}`),
      evidence: "CDX manifests, Wayback captures, cached product pages, and WARC coordinates.",
      boundary: "Archive hits are discovery signals until capture date, product identity, and visible label evidence are reviewed.",
    },
    {
      key: "fast_food_docs",
      label: "Fast-Food Documents",
      status: "source_review",
      test: (text) => /fast food|menu|nutrition|allergen|pdf|mcdonald|burger king|kfc|taco bell|wendy|chick-fil-a/.test(text),
      productFilter: (row) => row.product.category === "fast food",
      evidence: "Menu pages, nutrition PDFs, allergen PDFs, archived brand pages, and package inserts.",
      boundary: "Restaurant documents should be mapped to item/date/formulation versions without collapsing menu claims into package-label claims.",
    },
    {
      key: "price_weight",
      label: "Price + Weight",
      status: "candidate_found",
      test: (text) => /price|weight|retailer|walmart|target|kroger|wegmans|serving|package/.test(text),
      productFilter: (row) => row.facts.packageFields || /weight|price|serving|package/i.test(`${row.product.recommended_next_action || ""} ${row.product.collection_track || ""}`),
      evidence: "Net weight, serving size, package format, retailer price pages, and price-observation links.",
      boundary: "Economic overlays remain context until SKU, weight, serving size, and capture/source timing align.",
    },
    {
      key: "label_review",
      label: "OCR + Manual Review",
      status: "label_visible",
      test: (text) => /transcription|panel|label_visible|ocr|manual|ingredient/.test(text),
      productFilter: (row) => row.facts.visibleLabels || row.facts.ocrLabels || /transcription|panel|ingredient/i.test(`${row.product.panel_needed_vintages || ""} ${row.product.recommended_next_action || ""}`),
      evidence: "Readable ingredient panels, corrected OCR, reviewer notes, and final verified label text.",
      boundary: "This is the gate between discovery and claims; no ingredient diffs should publish before manual verification.",
    },
  ];

  return missionDefs.map((mission) => {
    const matchedTasks = taskRows.filter((row) => mission.test(sourceText(row)));
    const matchedGroups = groups.filter((row) => mission.test(groupText(row)));
    const matchedAcquisition = acquisitionRows.filter((row) => mission.test(sourceText(row)));
    const matchedProducts = productRows.slice(0, 100).filter(mission.productFilter);
    const extraRows = mission.key === "common_crawl" ? cdxRows : [];
    const topProducts = uniqueValues([
      ...taskProducts(matchedTasks, 10),
      ...taskProducts(matchedGroups, 10),
      ...matchedProducts.map((row) => row.product.display_name || row.product.canonical_name),
    ], 7);
    const sourceNames = uniqueValues([
      ...matchedTasks.map((row) => row.source_name || row.source_key),
      ...matchedGroups.map((row) => row.source_name || row.source_key),
      ...matchedAcquisition.map((row) => row.source_name || row.source_key),
    ], 5);
    return {
      ...mission,
      taskCount: matchedTasks.length + matchedGroups.reduce((sum, row) => sum + numeric(row.task_count), 0) + extraRows.length,
      productCount: uniqueValues([
        ...matchedTasks.map((row) => row.canonical_name || row.display_name),
        ...matchedProducts.map((row) => row.product.canonical_name || row.product.display_name),
      ], 1000).length,
      queueCount: matchedAcquisition.length,
      sourceCount: sourceNames.length,
      topProducts,
      sourceNames,
      starts: groupStarts([...matchedGroups, ...matchedTasks], 3),
    };
  });
}

function renderCorpusSourceMissions(productRows) {
  if (!els.corpusSourceMissions) return;
  const rows = collectionMissionRows(productRows);
  els.corpusSourceMissions.innerHTML = rows.length
    ? rows.map((row) => `
      <article class="corpus-mission-card status-${escapeHtml(row.status)} mission-${escapeHtml(row.key)}">
        <header>
          <div>
            <span>${escapeHtml(row.label)}</span>
            <strong>${formatNumber(row.taskCount)} future starts</strong>
          </div>
          ${statusTag(row.status)}
        </header>
        <p>${escapeHtml(row.evidence)}</p>
        <div class="corpus-mission-metrics">
          <span><strong>${formatNumber(row.productCount)}</strong> products</span>
          <span><strong>${formatNumber(row.queueCount)}</strong> queue rows</span>
          <span><strong>${formatNumber(row.sourceCount)}</strong> sources</span>
        </div>
        <section>
          <span>Claim Boundary</span>
          <p>${escapeHtml(row.boundary)}</p>
        </section>
        <div class="corpus-products">${escapeHtml(row.topProducts.join("; ") || "No matching pilot products under the current filters.")}</div>
        <footer>
          ${row.sourceNames.slice(0, 3).map((source) => `<span>${escapeHtml(source)}</span>`).join("")}
          ${row.starts.map((start) => linkOrText(start, start.startsWith("http") ? "Start" : "CLI")).join("")}
        </footer>
      </article>
    `).join("")
    : `<p class="empty-note">No collection missions match the current filters.</p>`;
}

function collectionWaveRows(productRows) {
  const missionsByKey = Object.fromEntries(collectionMissionRows(productRows).map((row) => [row.key, row]));
  const getMission = (key) => missionsByKey[key] || {
    key,
    label: labelFor(key),
    status: "source_review",
    taskCount: 0,
    productCount: 0,
    queueCount: 0,
    sourceCount: 0,
    topProducts: [],
    sourceNames: [],
    starts: [],
  };
  const waveDefs = [
    {
      number: "01",
      key: "current_anchor",
      title: "Current Label Anchor",
      missionKeys: ["current_web", "label_review"],
      status: "label_visible",
      goal: "Lock a SKU-specific current label, package weight, serving size, and source owner before comparing history.",
      gate: "A current label only graduates when the SKU/package context and readable ingredient panel are source-attributable.",
      boundary: "Do not call it today's label without SKU/package context.",
    },
    {
      number: "02",
      key: "vintage_photo",
      title: "Vintage Package Photo Hunt",
      missionKeys: ["collector_photos"],
      status: "usable_photo",
      goal: "Pull high-value collector, blog, museum, marketplace, and Wikimedia package-photo leads into visual review.",
      gate: "A photo lead only graduates when the package date basis, owner/publisher, rights note, and label visibility are recorded.",
      boundary: "A package front is a visual scene, not ingredient ground truth.",
    },
    {
      number: "03",
      key: "archive_backfill",
      title: "Archive Backfill",
      missionKeys: ["common_crawl"],
      status: "candidate_needs_archive",
      goal: "Use CDX, Wayback, and WARC-coordinate candidates to fill missing vintage slots and source gaps.",
      gate: "An archive hit only graduates when capture date, URL, product identity, and label or page evidence are reviewed.",
      boundary: "Common Crawl feeds review queues; it does not assert formulation facts.",
    },
    {
      number: "04",
      key: "fast_food_documents",
      title: "Fast-Food Document Trail",
      missionKeys: ["fast_food_docs"],
      status: "source_review",
      goal: "Map restaurant products through nutrition PDFs, allergen PDFs, menu pages, archived pages, and package inserts.",
      gate: "A restaurant evidence row graduates only when item name, document owner, date basis, and ingredient/allergen scope are separated.",
      boundary: "Menu documents and package labels stay distinct evidence types.",
    },
    {
      number: "05",
      key: "price_weight_overlay",
      title: "Price + Weight Overlay",
      missionKeys: ["price_weight"],
      status: "candidate_found",
      goal: "Attach package weight, serving size, servings, package format, and price/source timing for later normalized analysis.",
      gate: "Economic overlays graduate only when SKU, package size, source date, and price context are compatible.",
      boundary: "No price-per-ounce story without aligned product size and capture context.",
    },
    {
      number: "06",
      key: "verification_pass",
      title: "OCR + Manual Verification",
      missionKeys: ["label_review"],
      status: "manual_verified",
      goal: "Turn readable labels into corrected text, ingredient facets, formulation versions, and claim receipts.",
      gate: "Ingredient diffs publish only after corrected transcription, reviewer attribution, and evidence links are attached.",
      boundary: "This is the hard gate between a lead and a public ingredient-change claim.",
    },
  ];

  return waveDefs.map((wave) => {
    const missions = wave.missionKeys.map(getMission);
    const starts = uniqueValues(missions.flatMap((mission) => mission.starts || []), 4);
    const sourceNames = uniqueValues(missions.flatMap((mission) => mission.sourceNames || []), 5);
    const products = uniqueValues(missions.flatMap((mission) => mission.topProducts || []), 8);
    return {
      ...wave,
      taskCount: missions.reduce((sum, mission) => sum + numeric(mission.taskCount), 0),
      productCount: uniqueValues(missions.flatMap((mission) => mission.topProducts || []), 1000).length || missions.reduce((sum, mission) => Math.max(sum, numeric(mission.productCount)), 0),
      queueCount: missions.reduce((sum, mission) => sum + numeric(mission.queueCount), 0),
      sourceCount: sourceNames.length,
      starts,
      sourceNames,
      products,
      missionLabels: missions.map((mission) => mission.label),
    };
  });
}

function renderCorpusCollectionWaves(productRows) {
  if (!els.corpusCollectionWaves) return;
  const rows = collectionWaveRows(productRows);
  els.corpusCollectionWaves.innerHTML = rows.length
    ? rows.map((row) => `
      <article class="corpus-wave-card status-${escapeHtml(row.status)} wave-${escapeHtml(row.key)}">
        <header>
          <span>${escapeHtml(row.number)}</span>
          <div>
            <strong>${escapeHtml(row.title)}</strong>
            <p>${escapeHtml(row.goal)}</p>
          </div>
        </header>
        <div class="corpus-wave-metrics">
          <span><strong>${formatNumber(row.taskCount)}</strong> starts</span>
          <span><strong>${formatNumber(row.productCount)}</strong> products</span>
          <span><strong>${formatNumber(row.queueCount)}</strong> queue rows</span>
          <span><strong>${formatNumber(row.sourceCount)}</strong> source types</span>
        </div>
        <section>
          <span>Acceptance Gate</span>
          <p>${escapeHtml(row.gate)}</p>
        </section>
        <section>
          <span>No-Claim Boundary</span>
          <p>${escapeHtml(row.boundary)}</p>
        </section>
        <div class="corpus-products">${escapeHtml(row.products.join("; ") || row.missionLabels.join("; "))}</div>
        <footer>
          ${row.sourceNames.slice(0, 3).map((source) => `<span>${escapeHtml(source)}</span>`).join("")}
          ${row.starts.map((start) => linkOrText(start, start.startsWith("http") ? "Start" : "CLI")).join("")}
        </footer>
      </article>
    `).join("")
    : `<p class="empty-note">No collection waves match the current filters.</p>`;
}

function corpusNetworkProductNames(rows, limit = 6) {
  return uniqueValues(rows.map((row) => row.product.display_name || row.product.canonical_name), limit);
}

function corpusNetworkHasPackageFields(row) {
  return row.evidenceRows.some((evidence) => (
    truthyFlag(evidence.net_weight_visible) ||
    presentText(evidence.net_weight_text) ||
    presentText(evidence.serving_size_text) ||
    presentText(evidence.servings_per_container_text)
  ));
}

function corpusNetworkHasMakerFields(row) {
  return row.evidenceRows.some((evidence) => (
    truthyFlag(evidence.manufacturer_text_visible) ||
    presentText(evidence.manufacturer_text) ||
    presentText(evidence.distributor_text) ||
    presentText(evidence.source_publisher_owner)
  ));
}

function corpusNetworkHasPriceSignals(row) {
  const productText = `${row.product.top_source_names || ""} ${row.product.top_source_domains || ""} ${row.product.recommended_next_action || ""}`.toLowerCase();
  return /retailer|price|weight|walmart|target|kroger|wegmans/.test(productText) || row.evidenceRows.some((evidence) => (
    presentText(evidence.price_text) ||
    presentText(evidence.price_amount) ||
    presentText(evidence.unit_price_text) ||
    presentText(evidence.price_observation_id) ||
    /retailer|price|walmart|target|kroger|wegmans/i.test(`${evidence.evidence_kind || ""} ${evidence.source_domain || ""} ${evidence.source_publisher_owner || ""}`)
  ));
}

function corpusNetworkStageRows(productRows) {
  const targetRows = productRows.slice(0, 100);
  const totalProducts = Math.max(1, targetRows.length);
  const candidates = targetRows.reduce((sum, row) => sum + numeric(row.product.product_candidate_count), 0);
  const sourcedProducts = targetRows.filter((row) => numeric(row.product.slots_with_sources) > 0);
  const objectProducts = targetRows.filter((row) => row.facts.usablePhotos || row.facts.visibleLabels);
  const labelProducts = targetRows.filter((row) => row.facts.visibleLabels);
  const claimProducts = targetRows.filter((row) => numeric(row.product.ground_truth_slots) || row.facts.manualLabels);
  return [
    {
      label: "Lead Inventory",
      status: "discovered",
      count: candidates,
      countLabel: "candidate leads",
      pct: targetRows.length ? 100 : 0,
      detail: "Discovery rows, search starts, package-photo leads, current pages, and archive candidates enter here as leads only.",
      products: corpusNetworkProductNames(targetRows.slice(0, 8)),
      boundary: "Lead density does not equal a formulation claim.",
    },
    {
      label: "Source Scene",
      status: "source_review",
      count: sourcedProducts.length,
      countLabel: "products with sources",
      pct: Math.round((sourcedProducts.length / totalProducts) * 100),
      detail: "Source owner, URL, date basis, and product identity make a scene attributable enough to review.",
      products: corpusNetworkProductNames(sourcedProducts),
      boundary: "The scene can be shown, but unsupported eras stay marked.",
    },
    {
      label: "Visible Object",
      status: "usable_photo",
      count: objectProducts.length,
      countLabel: "products with object proof",
      pct: Math.round((objectProducts.length / totalProducts) * 100),
      detail: "Package photos, page captures, and document evidence can become visual proof once roles are checked.",
      products: corpusNetworkProductNames(objectProducts),
      boundary: "A front panel or menu page is not ingredient ground truth.",
    },
    {
      label: "Label Text Gate",
      status: labelProducts.length ? "label_visible" : "candidate_needs_panel",
      count: labelProducts.length,
      countLabel: "label-visible products",
      pct: Math.round((labelProducts.length / totalProducts) * 100),
      detail: "Readable ingredient panels move into OCR/manual transcription, correction, and reviewer attribution.",
      products: corpusNetworkProductNames(labelProducts),
      boundary: "No ingredient diff publishes before corrected text exists.",
    },
    {
      label: "Public Chapter",
      status: claimProducts.length ? "manual_verified" : "missing_vintage_slot",
      count: claimProducts.length,
      countLabel: "claim-ready products",
      pct: Math.round((claimProducts.length / totalProducts) * 100),
      detail: "Only manual-verified labels, aligned identity, and explicit date context can carry reader-facing changes.",
      products: corpusNetworkProductNames(claimProducts),
      boundary: "Today the corpus mostly tells proof-state stories, not finished formulation histories.",
    },
  ];
}

function corpusNetworkTrackRows(productRows) {
  const targetRows = productRows.slice(0, 100);
  const ingredientRows = targetRows.filter((row) => row.facts.visibleLabels || presentText(row.product.panel_needed_vintages) || numeric(row.product.current_2020s_source_count));
  const packageRows = targetRows.filter(corpusNetworkHasPackageFields);
  const makerRows = targetRows.filter(corpusNetworkHasMakerFields);
  const priceRows = targetRows.filter(corpusNetworkHasPriceSignals);
  const fastFoodRows = targetRows.filter((row) => row.product.category === "fast food");
  const originRows = targetRows.filter((row) => numeric(row.product.earliest_verified_label_source_count) || presentText(row.product.missing_vintages));
  return [
    {
      label: "Ingredient + Facet History",
      status: ingredientRows.some((row) => row.facts.visibleLabels) ? "label_visible" : "candidate_needs_panel",
      rows: ingredientRows,
      signal: `${pluralize(ingredientRows.length, "product")} have current or vintage label leads in the pilot view.`,
      gate: "Visible panel, OCR/corrected transcription, facet parser, and reviewer attribution.",
      payoff: "Sweetener, oil/fat, flour, cocoa/chocolate, allergen, and disclosure changes by decade.",
    },
    {
      label: "Package Size + Serving Story",
      status: packageRows.length ? "candidate_found" : "no_source",
      rows: packageRows,
      signal: `${pluralize(packageRows.length, "product")} expose package size, serving, or weight fields in evidence rows.`,
      gate: "SKU/package identity, net weight text, serving context, and source date must align.",
      payoff: "Package-size changes can sit beside formulation changes without collapsing variants.",
    },
    {
      label: "Maker + Ownership Lineage",
      status: makerRows.length ? "source_review" : "no_source",
      rows: makerRows,
      signal: `${pluralize(makerRows.length, "product")} carry manufacturer, distributor, owner, or publisher clues.`,
      gate: "Separate brand owner, manufacturer text, distributor text, and source owner.",
      payoff: "Ownership changes become context for formulation and package shifts.",
    },
    {
      label: "Price + Weight Overlay",
      status: priceRows.length ? "candidate_found" : "candidate_needs_archive",
      rows: priceRows,
      signal: `${pluralize(priceRows.length, "product")} have retailer, price, package, or weight signals to align later.`,
      gate: "Same family/variant, compatible package size, capture proximity, and price context.",
      payoff: "Nominal price per ounce, per 100g, and per serving can be added after review.",
    },
    {
      label: "Fast-Food Document Trail",
      status: fastFoodRows.length ? "source_review" : "no_source",
      rows: fastFoodRows,
      signal: `${pluralize(fastFoodRows.length, "product")} need document-first timelines instead of package-only evidence.`,
      gate: "Menu, nutrition PDF, allergen PDF, package insert, and archived page scopes stay separate.",
      payoff: "Big Mac, McNuggets, fries, and similar products can tell date-bounded disclosure stories.",
    },
    {
      label: "Origin + Vintage Gap Chase",
      status: originRows.some((row) => presentText(row.product.missing_vintages)) ? "missing_vintage_slot" : "candidate_needs_archive",
      rows: originRows,
      signal: `${pluralize(originRows.length, "product")} have earliest-label leads or explicit missing vintage slots.`,
      gate: "Claimed product date, source owner, archive/capture coordinates, and visible label role.",
      payoff: "Oldest verified label, not oldest advertised product claim, anchors the timeline.",
    },
  ];
}

function corpusNetworkAnchorRows(productRows) {
  const targetRows = productRows.slice(0, 100);
  const oreo = targetRows.find((row) => /oreo/i.test(`${row.product.display_name || ""} ${row.product.canonical_name || ""}`));
  const selected = [];
  if (oreo) selected.push(oreo);
  targetRows.forEach((row) => {
    if (selected.length >= 6) return;
    if (!selected.some((selectedRow) => selectedRow.product.canonical_name === row.product.canonical_name)) selected.push(row);
  });
  return selected.map((row) => ({
    ...row,
    boundary: /oreo/i.test(`${row.product.display_name || ""} ${row.product.canonical_name || ""}`)
      ? "Oreo can show a proof chase across decades, but the 1912 original ingredient label remains unverified."
      : pilotCanSay(row),
  }));
}

function renderCorpusStoryNetwork(productRows) {
  if (!els.corpusStoryNetwork) return;
  const targetRows = productRows.slice(0, 100);
  if (!targetRows.length) {
    els.corpusStoryNetwork.innerHTML = `<p class="empty-note">No corpus story rows match the current filters.</p>`;
    return;
  }
  const stageRows = corpusNetworkStageRows(productRows);
  const trackRows = corpusNetworkTrackRows(productRows);
  const anchorRows = corpusNetworkAnchorRows(productRows);
  const totalSlots = targetRows.reduce((sum, row) => sum + numeric(row.product.slots_total), 0);
  const sourcedSlots = targetRows.reduce((sum, row) => sum + numeric(row.product.slots_with_sources), 0);
  const gapSlots = targetRows.reduce((sum, row) => sum + numeric(row.product.slots_without_sources), 0);
  const manualProducts = targetRows.filter((row) => numeric(row.product.ground_truth_slots) || row.facts.manualLabels).length;
  els.corpusStoryNetwork.innerHTML = `
    <article class="corpus-network">
      <header class="corpus-network-head">
        <div>
          <p class="eyebrow">Story Network</p>
          <h3>From source lead to public product-history chapter</h3>
          <p>The corpus can already tell where evidence exists, what each product needs next, and which stories stay locked. This is a visualization of the paused collection plan, not a live search surface.</p>
        </div>
        <aside class="corpus-network-score" aria-label="Corpus story network scorecard">
          <span><strong>${formatNumber(targetRows.length)}</strong> products in pilot slice</span>
          <span><strong>${formatNumber(sourcedSlots)}</strong> of ${formatNumber(totalSlots)} vintage slots sourced</span>
          <span><strong>${formatNumber(gapSlots)}</strong> explicit gap slots</span>
          <span><strong>${formatNumber(manualProducts)}</strong> claim-ready products</span>
        </aside>
      </header>
      <section class="corpus-network-flow" aria-label="Evidence-to-story flow">
        ${stageRows.map((row) => `
          <article class="corpus-network-stage status-${escapeHtml(row.status)}">
            <header>
              <span>${escapeHtml(row.label)}</span>
              <strong>${formatNumber(row.count)}</strong>
            </header>
            <div class="corpus-network-bar"><span style="width:${Math.max(3, Math.min(100, row.pct))}%"></span></div>
            <p>${escapeHtml(row.detail)}</p>
            <div class="corpus-products">${escapeHtml(row.products.join("; ") || row.boundary)}</div>
            <footer>${escapeHtml(row.boundary)}</footer>
          </article>
        `).join("")}
      </section>
      <section class="corpus-network-tracks" aria-label="Reader story tracks">
        ${trackRows.map((row) => `
          <article class="corpus-network-track status-${escapeHtml(row.status)}">
            <header>
              <span>${escapeHtml(row.label)}</span>
              <strong>${formatNumber(row.rows.length)}</strong>
            </header>
            <p>${escapeHtml(row.signal)}</p>
            <div class="corpus-network-gates">
              <div>
                <span>Gate</span>
                <p>${escapeHtml(row.gate)}</p>
              </div>
              <div>
                <span>Reader Payoff</span>
                <p>${escapeHtml(row.payoff)}</p>
              </div>
            </div>
            <div class="corpus-products">${escapeHtml(corpusNetworkProductNames(row.rows, 6).join("; ") || "No products in this lane under current filters.")}</div>
          </article>
        `).join("")}
      </section>
      <section class="corpus-network-anchors" aria-label="Story anchor products">
        ${anchorRows.map((row) => `
          <article class="corpus-network-anchor status-${escapeHtml(row.cluster.status)}">
            <header>
              <span>${escapeHtml(labelFor(row.product.category || "Product"))}</span>
              <strong>${escapeHtml(row.product.display_name || row.product.canonical_name)}</strong>
            </header>
            <div class="story-vintage-grid">${productVintageCells(row.product)}</div>
            <p>${escapeHtml(row.boundary)}</p>
            <div class="lead-meta">
              ${statusTag(row.cluster.status)}
              ${statusTag(row.cluster.key)}
            </div>
          </article>
        `).join("")}
      </section>
      <footer class="corpus-network-note">
        The strongest current story is the evidence journey itself: ${formatNumber(manualProducts)} products can support claim-ready chapters, while the rest need visible-label review, transcription, identity alignment, or source discovery before formulation claims publish.
      </footer>
    </article>
  `;
}

function corpusStoryRouteDefs() {
  return [
    { key: "ingredient", label: "Ingredient", shortLabel: "Ingredient" },
    { key: "package", label: "Package Size", shortLabel: "Package" },
    { key: "maker", label: "Maker Lineage", shortLabel: "Maker" },
    { key: "price", label: "Price/Weight", shortLabel: "Price" },
    { key: "origin", label: "Origin Vintage", shortLabel: "Origin" },
    { key: "fast_food", label: "Fast-Food Docs", shortLabel: "Foodservice" },
  ];
}

function corpusStoryRouteCell(row, routeKey) {
  const product = row.product;
  const facts = row.facts;
  const earliest = product.vintage_statuses?.earliest_verified_label || {};
  if (routeKey === "ingredient") {
    if (numeric(product.ground_truth_slots) || facts.manualLabels) {
      return {
        status: "manual_verified",
        label: "Claim-ready",
        detail: "Manual-verified ingredient text can support scoped formulation chapters.",
      };
    }
    if (facts.visibleLabels) {
      return {
        status: "label_visible",
        label: "Text gate",
        detail: `${pluralize(facts.visibleLabels, "visible label")} need OCR or manual transcription before ingredient diffs publish.`,
      };
    }
    if (presentText(product.panel_needed_vintages)) {
      return {
        status: "candidate_needs_panel",
        label: "Panel hunt",
        detail: `Readable panels needed for ${product.panel_needed_vintages}.`,
      };
    }
    if (numeric(product.slots_with_sources)) {
      return {
        status: "source_review",
        label: "Source lead",
        detail: "Source-attributable leads exist, but label visibility is not established.",
      };
    }
    return {
      status: "missing_vintage_slot",
      label: "Gap",
      detail: "No ingredient route can be told until a source-attributable label is found.",
    };
  }

  if (routeKey === "package") {
    if (corpusNetworkHasPackageFields(row)) {
      return {
        status: "candidate_found",
        label: "Size fields",
        detail: "Package weight or serving fields are visible enough to begin SKU alignment.",
      };
    }
    if (facts.usablePhotos || facts.visibleLabels) {
      return {
        status: "usable_photo",
        label: "Photo role",
        detail: "Package evidence exists; confirm net weight, serving size, and format before using it.",
      };
    }
    return {
      status: numeric(product.slots_with_sources) ? "source_review" : "no_source",
      label: numeric(product.slots_with_sources) ? "Check source" : "No route",
      detail: "Package-size analysis needs source-date and SKU/package fields.",
    };
  }

  if (routeKey === "maker") {
    if (corpusNetworkHasMakerFields(row)) {
      return {
        status: "source_review",
        label: "Owner clues",
        detail: "Manufacturer, distributor, owner, or publisher clues need identity separation.",
      };
    }
    if (presentText(product.top_source_names) || presentText(product.top_source_domains)) {
      return {
        status: "source_review",
        label: "Source owner",
        detail: "Source owner is known; do not treat it as manufacturer/distributor without review.",
      };
    }
    return {
      status: "no_source",
      label: "No route",
      detail: "Maker lineage needs manufacturer, distributor, brand owner, or document-owner evidence.",
    };
  }

  if (routeKey === "price") {
    if (corpusNetworkHasPriceSignals(row)) {
      return {
        status: "candidate_found",
        label: "Overlay lead",
        detail: "Retailer, package, price, or weight signals can feed later normalized analysis after alignment.",
      };
    }
    if (presentText(product.archive_needed_vintages)) {
      return {
        status: "candidate_needs_archive",
        label: "Archive gap",
        detail: `Archive coordinates still needed for ${product.archive_needed_vintages}.`,
      };
    }
    return {
      status: "no_source",
      label: "No route",
      detail: "Price-per-ounce stories require compatible product size and price context.",
    };
  }

  if (routeKey === "origin") {
    if (numeric(earliest.source_count)) {
      const status = earliest.status || "source_review";
      return {
        status,
        label: status === "candidate_needs_transcription" ? "Transcribe" : "Earliest lead",
        detail: `${pluralize(earliest.source_count, "source lead")} attached to the earliest slot; oldest verified label still requires review.`,
      };
    }
    if (presentText(product.missing_vintages)) {
      return {
        status: "missing_vintage_slot",
        label: "Gap",
        detail: `Missing source-attributable vintages: ${product.missing_vintages}.`,
      };
    }
    return {
      status: "candidate_needs_archive",
      label: "Date basis",
      detail: "Origin stories need claimed product date, source owner, and visible label role.",
    };
  }

  if (routeKey === "fast_food") {
    if (product.category === "fast food") {
      return {
        status: "source_review",
        label: "Docs route",
        detail: "Use menu, nutrition, allergen, archived page, and package-insert evidence as separate document scopes.",
      };
    }
    return {
      status: "not_applicable",
      label: "Out of scope",
      detail: "Packaged-food product; use package, label, maker, and price routes first.",
    };
  }

  return {
    status: "unknown",
    label: "Unknown",
    detail: "Route status is not available.",
  };
}

function corpusStoryRouteRows(productRows) {
  const routeDefs = corpusStoryRouteDefs();
  return productRows.slice(0, 100).map((row, index) => {
    const cells = routeDefs.map((route) => ({
      ...route,
      ...corpusStoryRouteCell(row, route.key),
    }));
    const priority = [
      "missing_vintage_slot",
      "no_source",
      "candidate_needs_panel",
      "candidate_needs_transcription",
      "candidate_needs_archive",
      "source_review",
      "usable_photo",
      "label_visible",
      "candidate_found",
      "manual_verified",
    ];
    const next = cells
      .filter((cell) => cell.status !== "not_applicable")
      .sort((a, b) => priority.indexOf(a.status) - priority.indexOf(b.status))[0] || cells[0];
    return {
      index,
      ...row,
      cells,
      nextGate: `${next.shortLabel}: ${next.detail}`,
    };
  });
}

function corpusStoryRouteSummaryRows(routeRows) {
  return corpusStoryRouteDefs().map((route) => {
    const cells = routeRows.map((row) => row.cells.find((cell) => cell.key === route.key)).filter(Boolean);
    const active = cells.filter((cell) => cell.status !== "not_applicable");
    const claimReady = active.filter((cell) => cell.status === "manual_verified").length;
    const storyReady = active.filter((cell) => ["manual_verified", "label_visible", "candidate_found", "source_review", "usable_photo"].includes(cell.status)).length;
    const blocked = active.filter((cell) => ["missing_vintage_slot", "no_source", "candidate_needs_panel", "candidate_needs_transcription", "candidate_needs_archive"].includes(cell.status)).length;
    const status = claimReady ? "manual_verified" : storyReady ? "source_review" : blocked ? "missing_vintage_slot" : "not_applicable";
    return {
      ...route,
      status,
      activeCount: active.length,
      storyReady,
      blocked,
      claimReady,
    };
  });
}

function renderCorpusStoryRoutes(productRows) {
  if (!els.corpusStoryRoutes) return;
  const rows = corpusStoryRouteRows(productRows);
  if (!rows.length) {
    els.corpusStoryRoutes.innerHTML = `<p class="empty-note">No story routes match the current filters.</p>`;
    return;
  }
  const routeDefs = corpusStoryRouteDefs();
  const summaryRows = corpusStoryRouteSummaryRows(rows);
  els.corpusStoryRoutes.innerHTML = `
    <article class="corpus-routes">
      <header class="corpus-routes-head">
        <div>
          <p class="eyebrow">Route Matrix</p>
          <h3>Every pilot product gets a story route before it gets a claim</h3>
          <p>Each cell is a narrative lane and its current gate. The matrix is designed for editorial planning while collection is paused: it shows what can be told as proof state, what needs review, and what remains out of scope.</p>
        </div>
        <aside class="corpus-route-summary" aria-label="Story route summary">
          ${summaryRows.map((row) => `
            <span class="status-${escapeHtml(row.status)}">
              <strong>${formatNumber(row.storyReady)}</strong>
              ${escapeHtml(row.shortLabel)} ready · ${formatNumber(row.blocked)} blocked
            </span>
          `).join("")}
        </aside>
      </header>
      <div class="corpus-route-grid" aria-label="Product story route matrix">
        <div class="corpus-route-row corpus-route-row-head">
          <span>Product</span>
          <div class="corpus-route-cells">
            ${routeDefs.map((route) => `<span>${escapeHtml(route.shortLabel)}</span>`).join("")}
          </div>
          <span>Next Story Gate</span>
        </div>
        <div class="corpus-route-scroll">
          ${rows.map((row) => `
            <article class="corpus-route-row status-${escapeHtml(row.cluster.status)}">
              <header>
                <span>${String(row.index + 1).padStart(2, "0")} ${escapeHtml(labelFor(row.product.category || "Product"))}</span>
                <strong>${escapeHtml(row.product.display_name || row.product.canonical_name)}</strong>
                <em>${escapeHtml(row.cluster.label)}</em>
              </header>
              <div class="corpus-route-cells">
                ${row.cells.map((cell) => `
                  <span class="corpus-route-cell status-${escapeHtml(cell.status)}" title="${escapeHtml(cell.detail)}">
                    <strong>${escapeHtml(cell.label)}</strong>
                    <em>${escapeHtml(cell.shortLabel)}</em>
                  </span>
                `).join("")}
              </div>
              <p>${escapeHtml(clipped(row.nextGate, 150))}</p>
            </article>
          `).join("")}
        </div>
      </div>
      <footer class="corpus-route-legend" aria-label="Story route legend">
        <span class="status-manual_verified">claim-ready</span>
        <span class="status-label_visible">visible label gate</span>
        <span class="status-candidate_found">overlay lead</span>
        <span class="status-source_review">source review</span>
        <span class="status-missing_vintage_slot">blocked gap</span>
        <span class="status-not_applicable">out of scope</span>
      </footer>
    </article>
  `;
}

function visualEvidenceBestRow(row) {
  const usableRows = row.evidenceRows.filter((evidence) => (
    presentText(evidence.source_url) ||
    presentText(evidence.archive_url) ||
    presentText(evidence.source_title) ||
    presentText(evidence.source_domain)
  ));
  const nonGapRows = usableRows.filter((evidence) => evidence.evidence_kind !== "evidence_gap");
  return bestEvidenceRows(nonGapRows.length ? nonGapRows : usableRows, 1)[0] || {};
}

function visualEvidenceRows(productRows) {
  return productRows.slice(0, 100).map((row, index) => {
    const best = visualEvidenceBestRow(row);
    const status = rowEvidenceStatus(best);
    const hasSource = presentText(best.source_url) || presentText(best.archive_url) || presentText(best.source_title) || presentText(best.source_domain);
    const hasVisibleLabel = truthyFlag(best.ingredient_panel_visible) || ["label_visible", "ocr_extracted", "manual_verified"].includes(status) || row.facts.visibleLabels > 0;
    const hasUsablePhoto = truthyFlag(best.front_visible) || status === "usable_photo" || /photo|image|package|retailer|current_web/i.test(`${best.evidence_kind || ""} ${best.source_attribution_grade || ""}`);
    const hasPackageContext = truthyFlag(best.net_weight_visible) || presentText(best.net_weight_text) || presentText(best.serving_size_text);
    const hasMakerContext = truthyFlag(best.manufacturer_text_visible) || presentText(best.manufacturer_text) || presentText(best.source_publisher_owner);
    const sourceLabel = best.source_domain || best.source_publisher_owner || best.source_title || "source not recorded";
    const vintageLabel = vintageLabels[best.vintage_label] || labelFor(best.vintage_label || "vintage");
    const proofScore = (
      (hasSource ? 28 : 0) +
      (hasVisibleLabel ? 24 : 0) +
      (hasUsablePhoto ? 18 : 0) +
      (hasPackageContext ? 14 : 0) +
      (hasMakerContext ? 10 : 0) +
      numeric(best.registry_priority || best.confidence)
    );
    const blocker = hasVisibleLabel
      ? "Transcribe and review the ingredient panel before publishing a formulation claim."
      : hasUsablePhoto
        ? "Confirm the ingredient panel is readable, then move to OCR/manual transcription."
        : hasSource
          ? "Review source ownership, date basis, and product identity before using this object."
          : "Find a source-attributable photo, page, or document before this story has visual proof.";
    return {
      index,
      ...row,
      best,
      status: hasVisibleLabel ? "label_visible" : hasUsablePhoto ? "usable_photo" : hasSource ? "source_review" : "missing_vintage_slot",
      hasSource,
      hasVisibleLabel,
      hasUsablePhoto,
      hasPackageContext,
      hasMakerContext,
      sourceLabel,
      vintageLabel,
      proofScore,
      blocker,
    };
  }).sort((a, b) => b.proofScore - a.proofScore || b.score - a.score);
}

function visualEvidenceSummaryRows(rows) {
  const sourced = rows.filter((row) => row.hasSource).length;
  const photos = rows.filter((row) => row.hasUsablePhoto).length;
  const panels = rows.filter((row) => row.hasVisibleLabel).length;
  const packages = rows.filter((row) => row.hasPackageContext).length;
  const makers = rows.filter((row) => row.hasMakerContext).length;
  const gaps = rows.filter((row) => !row.hasSource).length;
  return [
    ["source_review", "Sourced", sourced],
    ["usable_photo", "Visual Objects", photos],
    ["label_visible", "Panel Visible", panels],
    ["candidate_found", "Package Context", packages],
    ["source_review", "Maker Clues", makers],
    ["missing_vintage_slot", "Visual Gaps", gaps],
  ];
}

function visualEvidenceLaneRows(rows) {
  const laneDefs = [
    {
      key: "panel",
      label: "Readable Label Panels",
      status: "label_visible",
      rows: rows.filter((row) => row.hasVisibleLabel),
      gate: "Move to corrected OCR/manual transcription and reviewer attribution.",
    },
    {
      key: "photo",
      label: "Package Photo Proof",
      status: "usable_photo",
      rows: rows.filter((row) => row.hasUsablePhoto && !row.hasVisibleLabel),
      gate: "Verify back-panel readability, package role, and claimed product date.",
    },
    {
      key: "package",
      label: "Package + Weight Context",
      status: "candidate_found",
      rows: rows.filter((row) => row.hasPackageContext),
      gate: "Align SKU, package size, serving context, and source date.",
    },
    {
      key: "maker",
      label: "Maker/Owner Clues",
      status: "source_review",
      rows: rows.filter((row) => row.hasMakerContext),
      gate: "Separate source owner from manufacturer, distributor, and brand owner.",
    },
    {
      key: "gap",
      label: "Visual Proof Gaps",
      status: "missing_vintage_slot",
      rows: rows.filter((row) => !row.hasSource || (!row.hasVisibleLabel && !row.hasUsablePhoto)),
      gate: "Find source-attributable package, archive, menu, museum, blog, or retailer evidence.",
    },
  ];
  return laneDefs.map((lane) => ({
    ...lane,
    products: corpusNetworkProductNames(lane.rows, 6),
    sources: uniqueValues(lane.rows.map((row) => row.sourceLabel), 5),
  }));
}

function visualEvidenceVisual(row) {
  const image = row.best.image_path_or_url || "";
  if (image && /^https?:\/\//.test(image)) {
    return `<img src="${escapeHtml(image)}" alt="${escapeHtml(row.product.display_name || row.product.canonical_name)} evidence image" loading="lazy" />`;
  }
  const marks = [
    row.hasSource ? "source" : "gap",
    row.hasUsablePhoto ? "photo" : "no photo",
    row.hasVisibleLabel ? "panel" : "panel?",
    row.hasPackageContext ? "weight" : "weight?",
  ];
  return `
    <div class="corpus-visual-placeholder">
      <strong>${escapeHtml(vintageLabels[row.best.vintage_label] || labelFor(row.best.vintage_label || "Visual"))}</strong>
      <span>${escapeHtml(marks.join(" / "))}</span>
    </div>
  `;
}

function renderCorpusVisualEvidence(productRows) {
  if (!els.corpusVisualEvidence) return;
  const rows = visualEvidenceRows(productRows);
  if (!rows.length) {
    els.corpusVisualEvidence.innerHTML = `<p class="empty-note">No visual evidence rows match the current filters.</p>`;
    return;
  }
  const summaryRows = visualEvidenceSummaryRows(rows);
  const laneRows = visualEvidenceLaneRows(rows);
  els.corpusVisualEvidence.innerHTML = `
    <article class="corpus-visual">
      <header class="corpus-visual-head">
        <div>
          <p class="eyebrow">Visual Proof</p>
          <h3>Photo and label evidence before story claims</h3>
          <p>These are the strongest visual objects in the pilot slice. A source URL or title can place an object on the board, but a formulation story still waits for readable panels, corrected text, identity alignment, and reviewer attribution.</p>
        </div>
        <aside class="corpus-visual-summary" aria-label="Visual evidence summary">
          ${summaryRows.map(([status, label, value]) => `
            <span class="status-${escapeHtml(status)}">
              <strong>${formatNumber(value)}</strong> ${escapeHtml(label)}
            </span>
          `).join("")}
        </aside>
      </header>
      <section class="corpus-visual-lanes" aria-label="Visual evidence lanes">
        ${laneRows.map((lane) => `
          <article class="corpus-visual-lane status-${escapeHtml(lane.status)}">
            <header>
              <span>${escapeHtml(lane.label)}</span>
              <strong>${formatNumber(lane.rows.length)}</strong>
            </header>
            <p>${escapeHtml(lane.gate)}</p>
            <div class="corpus-products">${escapeHtml(lane.products.join("; ") || "No products in this lane under current filters.")}</div>
            <footer>${lane.sources.slice(0, 3).map((source) => `<span>${escapeHtml(source)}</span>`).join("")}</footer>
          </article>
        `).join("")}
      </section>
      <section class="corpus-visual-wall" aria-label="Strongest visual evidence objects">
        ${rows.slice(0, 12).map((row) => {
          const source = row.best.source_url || row.best.archive_url || "";
          return `
            <article class="corpus-visual-card status-${escapeHtml(row.status)}">
              <figure>${visualEvidenceVisual(row)}</figure>
              <div>
                <span>${String(row.index + 1).padStart(2, "0")} ${escapeHtml(labelFor(row.product.category || "Product"))}</span>
                <strong>${escapeHtml(row.product.display_name || row.product.canonical_name)}</strong>
                <p>${escapeHtml(clipped(row.best.source_title || row.best.reviewer_notes || row.blocker, 150))}</p>
                <dl>
                  <dt>Vintage</dt>
                  <dd>${escapeHtml(row.vintageLabel)}</dd>
                  <dt>Owner</dt>
                  <dd>${escapeHtml(row.best.source_publisher_owner || row.best.source_author || row.sourceLabel)}</dd>
                  <dt>Gate</dt>
                  <dd>${escapeHtml(row.blocker)}</dd>
                </dl>
                <div class="lead-meta">
                  ${statusTag(row.status)}
                  ${row.hasPackageContext ? statusTag("package_context") : ""}
                  ${row.hasMakerContext ? statusTag("maker_context") : ""}
                  ${linkOrText(source, row.best.source_domain || "Source")}
                </div>
              </div>
            </article>
          `;
        }).join("")}
      </section>
      <footer class="corpus-visual-note">
        The board privileges source-attributable objects, not attractive images. A visual object can anchor a reader scene, but ingredient, package, maker, and price claims still require the gates shown above.
      </footer>
    </article>
  `;
}

function corpusArcHasPackageContext(row) {
  return row.evidenceRows.some((evidence) => (
    truthyFlag(evidence.net_weight_visible) ||
    presentText(evidence.net_weight_text) ||
    presentText(evidence.serving_size_text) ||
    truthyFlag(evidence.barcode_visible)
  ));
}

function corpusArcHasMakerContext(row) {
  return row.evidenceRows.some((evidence) => (
    truthyFlag(evidence.manufacturer_text_visible) ||
    presentText(evidence.manufacturer_text) ||
    presentText(evidence.source_publisher_owner)
  ));
}

function corpusArcSourceCount(row) {
  return Math.max(numeric(row.product.slots_with_sources), row.evidenceRows.length);
}

function corpusStoryArcDefinitions() {
  return [
    {
      key: "ingredient_proof",
      label: "Ingredient Proof Chase",
      shortLabel: "Ingredients",
      status: "label_visible",
      hook: "The reader sees the formulation story as a proof chase: labels first, diffs only after corrected text.",
      gate: "Do not publish original-to-current ingredient changes until readable panels are transcribed and reviewed.",
      match: (row) => {
        const route = corpusStoryRouteCell(row, "ingredient");
        return ["manual_verified", "label_visible", "candidate_needs_transcription", "candidate_needs_panel", "usable_photo", "source_review"].includes(route.status) && corpusArcSourceCount(row) > 0;
      },
      score: (row) => numeric(row.facts.manualLabels) * 18 + numeric(row.facts.visibleLabels) * 12 + numeric(row.facts.usablePhotos) * 6 + corpusArcSourceCount(row),
      productGate: (row) => row.facts.manualLabels
        ? "Verified label text can support scoped ingredient claims."
        : row.facts.visibleLabels
          ? "Readable panels can anchor the scene, but formulation diffs still need transcription."
          : "This is an ingredient-source lead, not an ingredient-change claim.",
    },
    {
      key: "package_economics",
      label: "Package And Price Pressure",
      shortLabel: "Size/Price",
      status: "candidate_found",
      hook: "The reader can follow package size, serving size, and price/weight context as a separate story lane.",
      gate: "Price-per-ounce and shrinkflation claims wait for SKU, package size, and capture-date alignment.",
      match: (row) => corpusArcHasPackageContext(row) || corpusNetworkHasPriceSignals(row),
      score: (row) => (corpusArcHasPackageContext(row) ? 20 : 0) + (corpusNetworkHasPriceSignals(row) ? 16 : 0) + numeric(row.product.collection_opportunity_score),
      productGate: (row) => corpusArcHasPackageContext(row) && corpusNetworkHasPriceSignals(row)
        ? "Package fields and price clues can be staged together for later normalization."
        : corpusArcHasPackageContext(row)
          ? "Package size can be told; economic claims still need aligned price observations."
          : "Price clues exist, but package context needs identity review before normalization.",
    },
    {
      key: "maker_lineage",
      label: "Maker And Ownership Lineage",
      shortLabel: "Maker",
      status: "source_review",
      hook: "The reader sees brand, manufacturer, distributor, and source owner as separate tracks through time.",
      gate: "Source owner, publisher, manufacturer, distributor, and brand owner cannot be collapsed without review.",
      match: (row) => corpusArcHasMakerContext(row) || corpusStoryRouteCell(row, "maker").status !== "no_source",
      score: (row) => (corpusArcHasMakerContext(row) ? 22 : 0) + numeric(row.product.source_domain_count) + corpusArcSourceCount(row),
      productGate: (row) => corpusArcHasMakerContext(row)
        ? "Maker or owner text can be shown as a clue while role mapping remains explicit."
        : "The story can show source-owner context, but not maker lineage yet.",
    },
    {
      key: "origin_gap",
      label: "Oldest Label Gap",
      shortLabel: "Origins",
      status: "missing_vintage_slot",
      hook: "The earliest chapter remains visible even when it is unsupported, so absence becomes part of the story.",
      gate: "Launch-era or oldest-label claims need a source-attributable object with a date basis and readable label role.",
      match: (row) => presentText(row.product.missing_vintages) || presentText(row.product.archive_needed_vintages) || corpusStoryRouteCell(row, "origin").status !== "manual_verified",
      score: (row) => numeric(row.product.slots_without_sources) * 10 + numeric(row.product.collection_opportunity_score) + numeric(row.product.target_priority),
      productGate: (row) => storyGapLabel({ product: row.product }),
    },
    {
      key: "collector_photo",
      label: "Collector Photo Story",
      shortLabel: "Photos",
      status: "usable_photo",
      hook: "The reader gets a visual object first: package front, back panel, net weight, maker text, and source attribution.",
      gate: "An attractive package image is a scene anchor, not ground truth, until the label panel and source rights are reviewed.",
      match: (row) => row.facts.usablePhotos > 0 || numeric(row.product.photo_evidence_rows) > 0 || row.evidenceRows.some((evidence) => presentText(evidence.image_path_or_url)),
      score: (row) => numeric(row.product.photo_evidence_rows) * 14 + numeric(row.facts.usablePhotos) * 12 + numeric(row.facts.visibleLabels) * 8,
      productGate: (row) => row.facts.visibleLabels
        ? "Photo evidence includes readable label context and can move into transcription."
        : "Photo evidence can carry the scene while ingredient claims stay locked.",
    },
    {
      key: "fast_food_docs",
      label: "Fast-Food Document Trail",
      shortLabel: "Fast Food",
      status: "source_review",
      hook: "Fast-food histories move through menu pages, nutrition PDFs, allergen sheets, archived pages, and package inserts.",
      gate: "Ingredient, allergen, and nutrition disclosures are different document scopes and need item/date review.",
      match: (row) => row.product.category === "fast food",
      score: (row) => numeric(row.product.product_candidate_count) + numeric(row.product.slots_with_sources) * 6 + numeric(row.product.source_domain_count),
      productGate: () => "Tell this as a document trail until the item, document date, and disclosure scope are verified.",
    },
  ];
}

function corpusStoryArcRows(productRows) {
  const targetRows = productRows.slice(0, 100);
  return corpusStoryArcDefinitions().map((definition) => {
    const rows = targetRows
      .filter(definition.match)
      .map((row) => ({ ...row, arcScore: definition.score(row) }))
      .sort((a, b) => b.arcScore - a.arcScore || b.score - a.score);
    const manualReady = rows.filter((row) => row.facts.manualLabels || numeric(row.product.ground_truth_slots)).length;
    const visibleLabels = rows.filter((row) => row.facts.visibleLabels).length;
    const packageRows = rows.filter(corpusArcHasPackageContext).length;
    const sourceSlots = rows.reduce((sum, row) => sum + numeric(row.product.slots_with_sources), 0);
    const gapSlots = rows.reduce((sum, row) => sum + numeric(row.product.slots_without_sources), 0);
    const status = manualReady
      ? "manual_verified"
      : visibleLabels
        ? "label_visible"
        : rows.some((row) => row.facts.usablePhotos || numeric(row.product.photo_evidence_rows))
          ? "usable_photo"
          : rows.length
            ? definition.status
            : "missing_vintage_slot";
    return {
      ...definition,
      rows,
      status,
      manualReady,
      visibleLabels,
      packageRows,
      sourceSlots,
      gapSlots,
      products: corpusNetworkProductNames(rows, 6),
      sources: uniqueValues(rows.flatMap((row) => row.sourcePath), 5),
    };
  });
}

function corpusStoryArcSummaryRows(arcRows, productRows) {
  const targetRows = productRows.slice(0, 100);
  const productNames = new Set();
  arcRows.forEach((arc) => {
    arc.rows.forEach((row) => productNames.add(row.product.canonical_name || row.product.display_name));
  });
  return [
    ["source_review", "Story Arcs", arcRows.length],
    ["candidate_found", "Products In Arcs", productNames.size],
    ["label_visible", "Label-Visible", targetRows.filter((row) => row.facts.visibleLabels).length],
    ["candidate_found", "Package Context", targetRows.filter(corpusArcHasPackageContext).length],
    ["source_review", "Maker Clues", targetRows.filter(corpusArcHasMakerContext).length],
    ["missing_vintage_slot", "Open Vintage Slots", targetRows.reduce((sum, row) => sum + numeric(row.product.slots_without_sources), 0)],
  ];
}

function corpusProductArcMatches(row, definitions = corpusStoryArcDefinitions()) {
  return definitions.filter((definition) => definition.match(row));
}

function corpusStoryArcLineupRows(productRows) {
  const definitions = corpusStoryArcDefinitions();
  return productRows
    .slice(0, 100)
    .map((row) => {
      const arcs = corpusProductArcMatches(row, definitions);
      const primary = arcs
        .map((definition) => ({ ...definition, arcScore: definition.score(row) }))
        .sort((a, b) => b.arcScore - a.arcScore)[0];
      return {
        ...row,
        arcs,
        primary,
        arcDensity: arcs.length,
        arcScore: arcs.reduce((sum, definition) => sum + definition.score(row), 0),
      };
    })
    .filter((row) => row.arcs.length)
    .sort((a, b) => b.arcDensity - a.arcDensity || b.arcScore - a.arcScore || b.score - a.score)
    .slice(0, 12);
}

function renderCorpusStoryArcs(productRows) {
  if (!els.corpusStoryArcs) return;
  const targetRows = productRows.slice(0, 100);
  if (!targetRows.length) {
    els.corpusStoryArcs.innerHTML = `<p class="empty-note">No story arcs match the current filters.</p>`;
    return;
  }
  const arcRows = corpusStoryArcRows(productRows);
  const summaryRows = corpusStoryArcSummaryRows(arcRows, productRows);
  const lineupRows = corpusStoryArcLineupRows(productRows);
  const total = Math.max(1, targetRows.length);
  els.corpusStoryArcs.innerHTML = `
    <article class="corpus-arcs">
      <header class="corpus-arcs-head">
        <div>
          <p class="eyebrow">Narrative Arcs</p>
          <h3>The corpus becomes stories when proof gates stay visible</h3>
          <p>These arcs group products by what a reader can follow now: ingredient proof, package economics, maker lineage, oldest-label gaps, collector-photo scenes, and fast-food document trails.</p>
        </div>
        <aside class="corpus-arcs-summary" aria-label="Corpus story arc summary">
          ${summaryRows.map(([status, label, value]) => `
            <span class="status-${escapeHtml(status)}">
              <strong>${formatNumber(value)}</strong> ${escapeHtml(label)}
            </span>
          `).join("")}
        </aside>
      </header>
      <section class="corpus-arcs-grid" aria-label="Story arc families">
        ${arcRows.map((arc) => {
          const pct = Math.round((arc.rows.length / total) * 100);
          return `
            <article class="corpus-arc-card status-${escapeHtml(arc.status)}">
              <header>
                <span>${escapeHtml(arc.shortLabel)}</span>
                <strong>${formatNumber(arc.rows.length)}</strong>
              </header>
              <h4>${escapeHtml(arc.label)}</h4>
              <p>${escapeHtml(arc.hook)}</p>
              <div class="corpus-arc-meter"><span style="width:${Math.max(3, pct)}%"></span></div>
              <div class="corpus-statline">
                <span>${pluralize(arc.visibleLabels, "label-visible product")}</span>
                <span>${pluralize(arc.sourceSlots, "sourced slot")}</span>
                <span>${pluralize(arc.gapSlots, "open slot")}</span>
              </div>
              <div class="corpus-products">${escapeHtml(arc.products.join("; ") || "No products in this arc under current filters.")}</div>
              <footer>
                <strong>Proof gate</strong>
                <span>${escapeHtml(arc.gate)}</span>
              </footer>
            </article>
          `;
        }).join("")}
      </section>
      <section class="corpus-arc-lineup" aria-label="Representative corpus story products">
        ${lineupRows.map((row, index) => {
          const source = firstPart(row.product.best_source_urls || row.product.starter_search_urls || row.product.starter_image_urls);
          const gate = row.primary?.productGate(row) || pilotCanSay(row);
          return `
            <article class="corpus-arc-product status-${escapeHtml(row.cluster.status)}">
              <header>
                <span>${String(index + 1).padStart(2, "0")} ${escapeHtml(labelFor(row.product.category || "Product"))}</span>
                <strong>${escapeHtml(row.product.display_name || row.product.canonical_name)}</strong>
              </header>
              <div class="corpus-arc-badges">
                ${row.arcs.slice(0, 4).map((arc) => `<span>${escapeHtml(arc.shortLabel)}</span>`).join("")}
              </div>
              <div class="story-vintage-grid">${productVintageCells(row.product)}</div>
              <p>${escapeHtml(gate)}</p>
              <div class="lead-meta">
                ${statusTag(row.cluster.status)}
                ${row.sourcePath.slice(0, 2).map((domain) => `<span class="status-tag">${escapeHtml(domain)}</span>`).join("")}
                ${linkOrText(source, "Source")}
              </div>
            </article>
          `;
        }).join("")}
      </section>
      <footer class="corpus-arcs-note">
        This board is a storytelling surface, not a collection run. It keeps unsupported eras and unreviewed labels visible so story copy can be drafted without implying verified ingredient history.
      </footer>
    </article>
  `;
}

function corpusStoryBeatUnlock(arc, row, best) {
  const action = row.product.recommended_next_action || row.product.top_source_actions || "";
  if (action) return action;
  if (arc.key === "ingredient_proof" && !row.facts.manualLabels) {
    return "Move the visible panel into corrected OCR or manual transcription before the ingredient-change scene can publish.";
  }
  if (arc.key === "package_economics" && !corpusNetworkHasPriceSignals(row)) {
    return "Attach a compatible price observation before price-per-ounce analysis appears in the reader story.";
  }
  if (arc.key === "maker_lineage") {
    return "Review whether the visible owner text is source publisher, brand owner, manufacturer, or distributor.";
  }
  if (arc.key === "origin_gap") {
    return row.product.archive_needed_vintages
      ? `Find archive coordinates for ${row.product.archive_needed_vintages}.`
      : storyGapLabel({ product: row.product });
  }
  if (arc.key === "collector_photo" && !truthyFlag(best.ingredient_panel_visible)) {
    return "Confirm whether the image includes a readable back panel, then capture corrected label text.";
  }
  if (arc.key === "fast_food_docs") {
    return "Tie each menu, nutrition, and allergen document to item scope, document date, and source owner.";
  }
  return arc.gate;
}

function corpusStoryBeatRows(productRows) {
  return corpusStoryArcRows(productRows)
    .filter((arc) => arc.rows.length)
    .map((arc, index) => {
      const row = arc.rows[0];
      const best = visualEvidenceBestRow(row);
      const evidenceStatus = rowEvidenceStatus(best);
      const productName = row.product.display_name || row.product.canonical_name;
      const source = best.source_url || best.archive_url || firstPart(row.product.best_source_urls || row.product.starter_search_urls || row.product.starter_image_urls);
      const sourceLabel = best.source_domain || firstPart(row.product.top_source_domains) || "Source";
      const sourceTitle = best.source_title || best.source_publisher_owner || sourceLabel || "Evidence object";
      const vintage = vintageLabels[best.vintage_label] || labelFor(best.vintage_label || row.product.missing_vintages || "current evidence");
      const readerBoundary = arc.productGate(row);
      const unlock = corpusStoryBeatUnlock(arc, row, best);
      const sceneRows = [
        {
          label: "Hook",
          status: arc.status,
          title: arc.label,
          body: arc.hook,
        },
        {
          label: "Evidence",
          status: evidenceStatus || arc.status,
          title: sourceTitle,
          body: `${productName} anchors this arc with ${vintage} evidence from ${sourceLabel}.`,
        },
        {
          label: "Tension",
          status: "missing_vintage_slot",
          title: "What remains unresolved",
          body: arc.gate,
        },
        {
          label: "Boundary",
          status: row.facts.manualLabels ? "manual_verified" : row.facts.visibleLabels ? "label_visible" : arc.status,
          title: "What the reader can believe",
          body: readerBoundary,
        },
        {
          label: "Unlock",
          status: row.facts.visibleLabels ? "label_visible" : "source_review",
          title: "Next scene",
          body: unlock,
        },
      ];
      return {
        ...arc,
        index,
        row,
        best,
        evidenceStatus: evidenceStatus || arc.status,
        productName,
        source,
        sourceLabel,
        sourceTitle,
        vintage,
        readerBoundary,
        unlock,
        sceneRows,
        supportProducts: corpusNetworkProductNames(arc.rows.slice(1), 5),
      };
    });
}

function corpusStoryBeatSummaryRows(rows) {
  const productNames = uniqueValues(rows.map((row) => row.productName), 1000);
  const sourceReceipts = rows.filter((row) => row.source).length;
  const visibleLabels = rows.filter((row) => row.row.facts.visibleLabels).length;
  const manualLabels = rows.filter((row) => row.row.facts.manualLabels || numeric(row.row.product.ground_truth_slots)).length;
  const openBoundaries = rows.filter((row) => row.sceneRows.some((scene) => scene.status === "missing_vintage_slot")).length;
  return [
    ["source_review", "Beat Sequences", rows.length],
    ["candidate_found", "Lead Products", productNames.length],
    ["source_review", "Source Receipts", sourceReceipts],
    ["label_visible", "Visible Labels", visibleLabels],
    ["manual_verified", "Verified Leads", manualLabels],
    ["missing_vintage_slot", "Claim Boundaries", openBoundaries],
  ];
}

function renderCorpusStoryBeats(productRows) {
  if (!els.corpusStoryBeats) return;
  const rows = corpusStoryBeatRows(productRows);
  if (!rows.length) {
    els.corpusStoryBeats.innerHTML = `<p class="empty-note">No story beat sequences match the current filters.</p>`;
    return;
  }
  const summaryRows = corpusStoryBeatSummaryRows(rows);
  els.corpusStoryBeats.innerHTML = `
    <article class="corpus-beats">
      <header class="corpus-beats-head">
        <div>
          <p class="eyebrow">Story Beats</p>
          <h3>Each arc gets a reader sequence before it gets a claim</h3>
          <p>The sequence keeps the strongest evidence object, unresolved tension, public boundary, and next unlock in one line, so story copy can be drafted without hiding proof gaps.</p>
        </div>
        <aside class="corpus-beats-summary" aria-label="Story beat summary">
          ${summaryRows.map(([status, label, value]) => `
            <span class="status-${escapeHtml(status)}">
              <strong>${formatNumber(value)}</strong> ${escapeHtml(label)}
            </span>
          `).join("")}
        </aside>
      </header>
      <section class="corpus-beat-board" aria-label="Corpus story beat sequences">
        ${rows.map((row) => `
          <article class="corpus-beat-row status-${escapeHtml(row.status)}">
            <header>
              <span>${String(row.index + 1).padStart(2, "0")} ${escapeHtml(row.shortLabel)}</span>
              <strong>${escapeHtml(row.productName)}</strong>
              <em>${escapeHtml(row.label)}</em>
            </header>
            <div class="corpus-beat-scenes">
              ${row.sceneRows.map((scene) => `
                <section class="corpus-beat-scene status-${escapeHtml(scene.status || "unknown")}">
                  <span>${escapeHtml(scene.label)}</span>
                  <strong>${escapeHtml(scene.title)}</strong>
                  <p>${escapeHtml(clipped(scene.body, 155))}</p>
                </section>
              `).join("")}
            </div>
            <aside class="corpus-beat-receipt status-${escapeHtml(row.evidenceStatus)}">
              <span>${escapeHtml(row.vintage)}</span>
              <strong>${escapeHtml(row.sourceTitle)}</strong>
              <p>${escapeHtml(clipped(row.best.reviewer_notes || row.best.unsupported_gap_note || row.best.ground_truth_fields_missing || row.readerBoundary, 150))}</p>
              <div class="lead-meta">
                ${statusTag(row.evidenceStatus)}
                ${linkOrText(row.source, row.sourceLabel)}
              </div>
              <div class="corpus-products">${escapeHtml(row.supportProducts.join("; ") || "No supporting products in this arc under current filters.")}</div>
            </aside>
          </article>
        `).join("")}
      </section>
      <footer class="corpus-beats-note">
        The beat explorer is deliberately conservative: unresolved labels and missing vintages stay in the sequence, instead of being smoothed into a finished product history.
      </footer>
    </article>
  `;
}

function corpusStoryDeckHeadline(row) {
  const productName = row.productName;
  if (row.key === "ingredient_proof") {
    return `${productName}: the ingredient story starts with proof, not nostalgia`;
  }
  if (row.key === "package_economics") {
    return `${productName}: package size is the economic chapter to verify`;
  }
  if (row.key === "maker_lineage") {
    return `${productName}: the maker story has to separate owner, source, and manufacturer`;
  }
  if (row.key === "origin_gap") {
    return `${productName}: the oldest label is still a visible gap`;
  }
  if (row.key === "collector_photo") {
    return `${productName}: the package image can open the scene`;
  }
  if (row.key === "fast_food_docs") {
    return `${productName}: the history lives in documents before labels`;
  }
  return `${productName}: evidence first, story second`;
}

function corpusStoryDeckDek(row) {
  const evidenceScene = row.sceneRows.find((scene) => scene.label === "Evidence") || {};
  const boundaryScene = row.sceneRows.find((scene) => scene.label === "Boundary") || {};
  return `${evidenceScene.body || row.hook} ${boundaryScene.body || row.readerBoundary}`;
}

function corpusStoryDeckImage(row) {
  const image = row.best.image_path_or_url || "";
  if (image && /^https?:\/\//.test(image)) {
    return `<img src="${escapeHtml(image)}" alt="${escapeHtml(row.productName)} evidence object" loading="lazy" />`;
  }
  return `
    <div class="corpus-deck-object">
      <span>${escapeHtml(row.shortLabel)}</span>
      <strong>${escapeHtml(row.vintage)}</strong>
      <em>${escapeHtml(row.evidenceStatus === "unknown" ? "Source object" : labelFor(row.evidenceStatus))}</em>
    </div>
  `;
}

function corpusStoryDeckRows(productRows) {
  return corpusStoryBeatRows(productRows)
    .map((row) => ({
      ...row,
      headline: corpusStoryDeckHeadline(row),
      dek: corpusStoryDeckDek(row),
      canSay: row.readerBoundary,
      cannotSay: row.gate,
      nextProof: row.unlock,
    }));
}

function corpusStoryDeckSummaryRows(rows) {
  return [
    ["source_review", "Draft Pitches", rows.length],
    ["source_review", "Receipts", rows.filter((row) => row.source).length],
    ["label_visible", "Label Scenes", rows.filter((row) => row.row.facts.visibleLabels).length],
    ["missing_vintage_slot", "Boundaries", rows.filter((row) => row.cannotSay).length],
  ];
}

function renderCorpusStoryDeck(productRows) {
  if (!els.corpusStoryDeck) return;
  const rows = corpusStoryDeckRows(productRows);
  if (!rows.length) {
    els.corpusStoryDeck.innerHTML = `<p class="empty-note">No public story pitches match the current filters.</p>`;
    return;
  }
  const feature = rows[0];
  const supportingRows = rows.slice(1);
  const summaryRows = corpusStoryDeckSummaryRows(rows);
  els.corpusStoryDeck.innerHTML = `
    <article class="corpus-deck">
      <header class="corpus-deck-head">
        <div>
          <p class="eyebrow">Story Deck</p>
          <h3>Draft the story without losing the proof boundary</h3>
          <p>Each pitch is public-facing copy backed by the current evidence snapshot. The cards name the object, source receipt, supported sentence, locked claim, and next proof step.</p>
        </div>
        <aside class="corpus-deck-summary" aria-label="Public story deck summary">
          ${summaryRows.map(([status, label, value]) => `
            <span class="status-${escapeHtml(status)}">
              <strong>${formatNumber(value)}</strong> ${escapeHtml(label)}
            </span>
          `).join("")}
        </aside>
      </header>
      <section class="corpus-deck-feature status-${escapeHtml(feature.status)}" aria-label="Feature story pitch">
        <figure>${corpusStoryDeckImage(feature)}</figure>
        <div class="corpus-deck-feature-copy">
          <span>${escapeHtml(feature.label)}</span>
          <h4>${escapeHtml(feature.headline)}</h4>
          <p>${escapeHtml(feature.dek)}</p>
          <dl>
            <dt>Object</dt>
            <dd>${escapeHtml(feature.sourceTitle)}</dd>
            <dt>Can say</dt>
            <dd>${escapeHtml(feature.canSay)}</dd>
            <dt>Cannot say yet</dt>
            <dd>${escapeHtml(feature.cannotSay)}</dd>
            <dt>Unlock</dt>
            <dd>${escapeHtml(feature.nextProof)}</dd>
          </dl>
          <div class="lead-meta">
            ${statusTag(feature.evidenceStatus)}
            ${statusTag(feature.shortLabel)}
            ${linkOrText(feature.source, feature.sourceLabel)}
          </div>
        </div>
      </section>
      <section class="corpus-deck-grid" aria-label="Supporting public story pitches">
        ${supportingRows.map((row) => `
          <article class="corpus-deck-card status-${escapeHtml(row.status)}">
            <figure>${corpusStoryDeckImage(row)}</figure>
            <div>
              <span>${escapeHtml(row.label)}</span>
              <strong>${escapeHtml(row.headline)}</strong>
              <p>${escapeHtml(clipped(row.dek, 190))}</p>
              <div class="corpus-deck-boundary">
                <b>Boundary</b>
                <em>${escapeHtml(clipped(row.cannotSay, 140))}</em>
              </div>
              <div class="lead-meta">
                ${statusTag(row.evidenceStatus)}
                ${linkOrText(row.source, row.sourceLabel)}
              </div>
            </div>
          </article>
        `).join("")}
      </section>
      <footer class="corpus-deck-note">
        The deck is ready for editorial selection, not publication as verified ingredient history. Every pitch keeps one unresolved claim boundary in view.
      </footer>
    </article>
  `;
}

function corpusClaimBoundaryRows(productRows) {
  return corpusStoryDeckRows(productRows).map((row) => {
    const verified = row.row.facts.manualLabels || numeric(row.row.product.ground_truth_slots);
    const visible = row.row.facts.visibleLabels;
    const status = verified
      ? "manual_verified"
      : visible
        ? "label_visible"
        : row.source
          ? "source_review"
          : "missing_vintage_slot";
    const proofLabel = verified
      ? "Claim can be scoped"
      : visible
        ? "Transcription unlock"
        : row.source
          ? "Review unlock"
          : "Source gap";
    return {
      ...row,
      status,
      proofLabel,
      safeCopy: row.canSay || "The story can only show the evidence state under the current filters.",
      lockedClaim: row.cannotSay || "No locked claim recorded for this row.",
      receipt: row.sourceTitle || row.sourceLabel || "No receipt title recorded",
      receiptDetail: row.best.reviewer_notes || row.best.unsupported_gap_note || row.best.ground_truth_fields_missing || row.dek,
    };
  });
}

function corpusClaimBoundarySummaryRows(rows) {
  return [
    ["source_review", "Language Rows", rows.length],
    ["label_visible", "Safe Label Scenes", rows.filter((row) => row.status === "label_visible" || row.status === "manual_verified").length],
    ["missing_vintage_slot", "Locked Claims", rows.filter((row) => row.lockedClaim).length],
    ["source_review", "Receipts", rows.filter((row) => row.source).length],
    ["manual_verified", "Claim-Scoped", rows.filter((row) => row.status === "manual_verified").length],
    ["candidate_found", "Unlock Steps", rows.filter((row) => row.nextProof).length],
  ];
}

function corpusClaimBoundaryLaneRows(rows) {
  return [
    {
      key: "say",
      label: "Can Say",
      status: "source_review",
      count: rows.filter((row) => row.safeCopy).length,
      detail: "Evidence-state language that can appear in the public story without implying verified formulation history.",
    },
    {
      key: "locked",
      label: "Cannot Say Yet",
      status: "missing_vintage_slot",
      count: rows.filter((row) => row.lockedClaim).length,
      detail: "Claims that stay out of the story until labels, dates, identity, package, or document scope are reviewed.",
    },
    {
      key: "unlock",
      label: "Unlock",
      status: "label_visible",
      count: rows.filter((row) => row.nextProof).length,
      detail: "The next proof step that changes an evidence-status chapter into a stronger public claim.",
    },
  ];
}

function renderCorpusClaimBoundaries(productRows) {
  if (!els.corpusClaimBoundaries) return;
  const rows = corpusClaimBoundaryRows(productRows);
  if (!rows.length) {
    els.corpusClaimBoundaries.innerHTML = `<p class="empty-note">No claim boundaries match the current filters.</p>`;
    return;
  }
  const summaryRows = corpusClaimBoundarySummaryRows(rows);
  const laneRows = corpusClaimBoundaryLaneRows(rows);
  els.corpusClaimBoundaries.innerHTML = `
    <article class="corpus-boundary">
      <header class="corpus-boundary-head">
        <div>
          <p class="eyebrow">Claim Boundaries</p>
          <h3>The story copy has to show what it refuses to claim</h3>
          <p>This board makes the editorial contract visible: every pitch carries a supported sentence, a locked claim, a receipt, and the proof step that would unlock stronger language.</p>
        </div>
        <aside class="corpus-boundary-summary" aria-label="Claim boundary summary">
          ${summaryRows.map(([status, label, value]) => `
            <span class="status-${escapeHtml(status)}">
              <strong>${formatNumber(value)}</strong> ${escapeHtml(label)}
            </span>
          `).join("")}
        </aside>
      </header>
      <section class="corpus-boundary-lanes" aria-label="Claim boundary language lanes">
        ${laneRows.map((lane) => `
          <article class="corpus-boundary-lane status-${escapeHtml(lane.status)}">
            <header>
              <span>${escapeHtml(lane.label)}</span>
              <strong>${formatNumber(lane.count)}</strong>
            </header>
            <p>${escapeHtml(lane.detail)}</p>
          </article>
        `).join("")}
      </section>
      <section class="corpus-boundary-list" aria-label="Claim boundary rows">
        ${rows.map((row, index) => `
          <article class="corpus-boundary-row status-${escapeHtml(row.status)}">
            <header>
              <span>${String(index + 1).padStart(2, "0")} ${escapeHtml(row.shortLabel)}</span>
              <strong>${escapeHtml(row.productName)}</strong>
              <em>${escapeHtml(row.proofLabel)}</em>
            </header>
            <section>
              <span>Can say</span>
              <p>${escapeHtml(row.safeCopy)}</p>
            </section>
            <section>
              <span>Cannot say yet</span>
              <p>${escapeHtml(row.lockedClaim)}</p>
            </section>
            <section>
              <span>Unlock</span>
              <p>${escapeHtml(row.nextProof)}</p>
            </section>
            <aside>
              <span>Receipt</span>
              <strong>${escapeHtml(row.receipt)}</strong>
              <p>${escapeHtml(clipped(row.receiptDetail, 135))}</p>
              <div class="lead-meta">
                ${statusTag(row.evidenceStatus)}
                ${linkOrText(row.source, row.sourceLabel)}
              </div>
            </aside>
          </article>
        `).join("")}
      </section>
      <footer class="corpus-boundary-note">
        This board turns uncertainty into interface copy. The product histories can be compelling before they are complete, but the locked claim remains visible to the reader.
      </footer>
    </article>
  `;
}

function corpusPublicationDecision(row) {
  if (row.status === "manual_verified") {
    return {
      key: "claim_ready",
      status: "manual_verified",
      label: "Claim-scoped story",
      detail: "Reviewed evidence can support a scoped public claim with receipts attached.",
    };
  }
  if (row.status === "label_visible") {
    return {
      key: "evidence_story",
      status: "label_visible",
      label: "Publish evidence story",
      detail: "Public copy can show the object, receipt, readable-label state, and locked formulation claim.",
    };
  }
  if (row.source) {
    return {
      key: "source_lead",
      status: "source_review",
      label: "Hold for source review",
      detail: "A source receipt exists, but the story needs role, date, panel, or scope review before publication.",
    };
  }
  return {
    key: "hold_gap",
    status: "missing_vintage_slot",
    label: "Hold as gap",
    detail: "Do not publish beyond the explicit gap until a source-attributable object is attached.",
  };
}

function corpusPublicationRows(productRows) {
  return corpusClaimBoundaryRows(productRows).map((row, index) => {
    const decision = corpusPublicationDecision(row);
    const proofGap = row.status === "manual_verified"
      ? "None for scoped claim language."
      : row.status === "label_visible"
        ? "Corrected OCR/manual transcription is still required for formulation claims."
        : row.source
          ? "Source/date/product-role review is still required."
          : "Source-attributable evidence is still missing.";
    return {
      ...row,
      index,
      decision,
      proofGap,
      publicationCopy: decision.key === "claim_ready"
        ? row.safeCopy
        : `${row.safeCopy} ${row.lockedClaim}`,
    };
  });
}

function corpusPublicationSummaryRows(rows) {
  return [
    ["label_visible", "Evidence Stories", rows.filter((row) => row.decision.key === "evidence_story").length],
    ["manual_verified", "Claim-Scoped", rows.filter((row) => row.decision.key === "claim_ready").length],
    ["source_review", "Source Holds", rows.filter((row) => row.decision.key === "source_lead").length],
    ["missing_vintage_slot", "Gap Holds", rows.filter((row) => row.decision.key === "hold_gap").length],
    ["source_review", "Receipts", rows.filter((row) => row.source).length],
    ["candidate_found", "Unlocks", rows.filter((row) => row.nextProof).length],
  ];
}

function corpusPublicationLaneRows(rows) {
  const laneDefs = [
    {
      key: "evidence_story",
      label: "Evidence Story",
      status: "label_visible",
      detail: "Usable for public narrative that foregrounds evidence status and locked claims.",
    },
    {
      key: "claim_ready",
      label: "Claim-Scoped",
      status: "manual_verified",
      detail: "Can support scoped product-history claims when receipts are attached.",
    },
    {
      key: "source_lead",
      label: "Source Hold",
      status: "source_review",
      detail: "Needs source, date, role, or document-scope review before public treatment.",
    },
    {
      key: "hold_gap",
      label: "Gap Hold",
      status: "missing_vintage_slot",
      detail: "Must remain an explicit unsupported gap.",
    },
  ];
  return laneDefs.map((lane) => {
    const laneRows = rows.filter((row) => row.decision.key === lane.key);
    return {
      ...lane,
      rows: laneRows,
      products: corpusNetworkProductNames(laneRows.map((row) => row.row), 4),
    };
  });
}

function renderCorpusPublicationQueue(productRows) {
  if (!els.corpusPublicationQueue) return;
  const rows = corpusPublicationRows(productRows);
  if (!rows.length) {
    els.corpusPublicationQueue.innerHTML = `<p class="empty-note">No publication decisions match the current filters.</p>`;
    return;
  }
  const summaryRows = corpusPublicationSummaryRows(rows);
  const laneRows = corpusPublicationLaneRows(rows);
  els.corpusPublicationQueue.innerHTML = `
    <article class="corpus-publish">
      <header class="corpus-publish-head">
        <div>
          <p class="eyebrow">Publication Queue</p>
          <h3>Move story pitches by editorial state, not by excitement</h3>
          <p>The queue separates publishable evidence-status stories from claim-scoped histories, source holds, and hard gaps. The public copy stays paired with the proof gap that limits it.</p>
        </div>
        <aside class="corpus-publish-summary" aria-label="Publication queue summary">
          ${summaryRows.map(([status, label, value]) => `
            <span class="status-${escapeHtml(status)}">
              <strong>${formatNumber(value)}</strong> ${escapeHtml(label)}
            </span>
          `).join("")}
        </aside>
      </header>
      <section class="corpus-publish-lanes" aria-label="Publication decision lanes">
        ${laneRows.map((lane) => `
          <article class="corpus-publish-lane status-${escapeHtml(lane.status)}">
            <header>
              <span>${escapeHtml(lane.label)}</span>
              <strong>${formatNumber(lane.rows.length)}</strong>
            </header>
            <p>${escapeHtml(lane.detail)}</p>
            <div class="corpus-products">${escapeHtml(lane.products.join("; ") || "No stories in this lane under current filters.")}</div>
          </article>
        `).join("")}
      </section>
      <section class="corpus-publish-list" aria-label="Publication queue rows">
        ${rows.map((row) => `
          <article class="corpus-publish-row status-${escapeHtml(row.decision.status)}">
            <header>
              <span>${String(row.index + 1).padStart(2, "0")} ${escapeHtml(row.shortLabel)}</span>
              <strong>${escapeHtml(row.productName)}</strong>
              <em>${escapeHtml(row.decision.label)}</em>
            </header>
            <section class="corpus-publish-copy">
              <span>Public copy</span>
              <p>${escapeHtml(clipped(row.publicationCopy, 210))}</p>
            </section>
            <section>
              <span>Proof gap</span>
              <p>${escapeHtml(row.proofGap)}</p>
            </section>
            <section>
              <span>Unlock</span>
              <p>${escapeHtml(row.nextProof)}</p>
            </section>
            <aside>
              <span>Receipt</span>
              <strong>${escapeHtml(row.receipt)}</strong>
              <div class="lead-meta">
                ${statusTag(row.evidenceStatus)}
                ${linkOrText(row.source, row.sourceLabel)}
              </div>
            </aside>
          </article>
        `).join("")}
      </section>
      <footer class="corpus-publish-note">
        Publication here means the interface can tell an evidence-status story. It does not convert visible labels, source leads, or collector photos into verified formulation history.
      </footer>
    </article>
  `;
}

function corpusStoryRiskDefinitions() {
  return [
    {
      key: "transcription",
      label: "Transcription Risk",
      status: "label_visible",
      detail: "Readable panels can anchor a scene, but formulation language waits for corrected OCR or manual transcription.",
      match: (row) => row.status === "label_visible" && row.decision.key !== "claim_ready",
      consequence: "Ingredient-change claims stay locked until label text is reviewed.",
    },
    {
      key: "formulation_lock",
      label: "Formulation Lock",
      status: "missing_vintage_slot",
      detail: "A story can mention evidence status, but cannot assert a formulation change across vintages.",
      match: (row) => presentText(row.lockedClaim),
      consequence: "Use boundary copy in the story instead of implying verified history.",
    },
    {
      key: "identity_role",
      label: "Identity And Role Risk",
      status: "source_review",
      detail: "Brand owner, manufacturer, distributor, source owner, package format, and SKU context must stay separate.",
      match: (row) => ["maker_lineage", "package_economics"].includes(row.key),
      consequence: "Do not collapse source owner or package evidence into product lineage without review.",
    },
    {
      key: "origin_date",
      label: "Origin Date Risk",
      status: "candidate_needs_archive",
      detail: "Earliest chapters need date basis, source owner, and visible label role before origin claims can publish.",
      match: (row) => row.key === "origin_gap" || /oldest|earliest|launch/i.test(`${row.lockedClaim} ${row.nextProof}`),
      consequence: "Keep the origin chapter as a visible gap until source-attributable evidence is verified.",
    },
    {
      key: "document_scope",
      label: "Document Scope Risk",
      status: "source_review",
      detail: "Fast-food menu, nutrition, allergen, archive, and package-insert documents describe different claim scopes.",
      match: (row) => row.key === "fast_food_docs",
      consequence: "Do not merge nutrition, allergen, and ingredient documents without item/date scope review.",
    },
    {
      key: "visual_proof",
      label: "Visual Proof Risk",
      status: "usable_photo",
      detail: "Package photos and page captures can open a scene, but the panel, rights, and source attribution still matter.",
      match: (row) => row.key === "collector_photo" || row.key === "ingredient_proof" || row.row.facts.usablePhotos > 0,
      consequence: "Treat the image as an object receipt, not ground-truth label text, until reviewed.",
    },
  ];
}

function corpusStoryRiskRows(productRows) {
  const publicationRows = corpusPublicationRows(productRows);
  const definitions = corpusStoryRiskDefinitions();
  return publicationRows.flatMap((row) => definitions
    .filter((definition) => definition.match(row))
    .map((definition) => ({
      ...definition,
      row,
      productName: row.productName,
      source: row.source,
      sourceLabel: row.sourceLabel,
      receipt: row.receipt,
      nextProof: row.nextProof,
      lockedClaim: row.lockedClaim,
      safeCopy: row.safeCopy,
    })));
}

function corpusStoryRiskSummaryRows(rows) {
  const affectedProducts = uniqueValues(rows.map((row) => row.productName), 1000).length;
  return [
    ["source_review", "Risk Notes", rows.length],
    ["candidate_found", "Affected Stories", affectedProducts],
    ["label_visible", "Transcription", rows.filter((row) => row.key === "transcription").length],
    ["missing_vintage_slot", "Formulation Locks", rows.filter((row) => row.key === "formulation_lock").length],
    ["source_review", "Identity/Scope", rows.filter((row) => ["identity_role", "document_scope"].includes(row.key)).length],
    ["usable_photo", "Visual/Origin", rows.filter((row) => ["visual_proof", "origin_date"].includes(row.key)).length],
  ];
}

function corpusStoryRiskLaneRows(rows) {
  return corpusStoryRiskDefinitions().map((definition) => {
    const laneRows = rows.filter((row) => row.key === definition.key);
    return {
      ...definition,
      rows: laneRows,
      products: corpusNetworkProductNames(laneRows.map((row) => row.row.row), 4),
    };
  });
}

function renderCorpusStoryRisks(productRows) {
  if (!els.corpusStoryRisks) return;
  const rows = corpusStoryRiskRows(productRows);
  if (!rows.length) {
    els.corpusStoryRisks.innerHTML = `<p class="empty-note">No story risks match the current filters.</p>`;
    return;
  }
  const summaryRows = corpusStoryRiskSummaryRows(rows);
  const laneRows = corpusStoryRiskLaneRows(rows);
  els.corpusStoryRisks.innerHTML = `
    <article class="corpus-risk">
      <header class="corpus-risk-head">
        <div>
          <p class="eyebrow">Risk Board</p>
          <h3>The caveat is part of the story interface</h3>
          <p>Each risk note explains why a public story stays at evidence-status, why a formulation claim remains locked, and what proof would reduce that risk.</p>
        </div>
        <aside class="corpus-risk-summary" aria-label="Story risk summary">
          ${summaryRows.map(([status, label, value]) => `
            <span class="status-${escapeHtml(status)}">
              <strong>${formatNumber(value)}</strong> ${escapeHtml(label)}
            </span>
          `).join("")}
        </aside>
      </header>
      <section class="corpus-risk-lanes" aria-label="Story risk lanes">
        ${laneRows.map((lane) => `
          <article class="corpus-risk-lane status-${escapeHtml(lane.status)}">
            <header>
              <span>${escapeHtml(lane.label)}</span>
              <strong>${formatNumber(lane.rows.length)}</strong>
            </header>
            <p>${escapeHtml(lane.detail)}</p>
            <div class="corpus-products">${escapeHtml(lane.products.join("; ") || "No products in this risk lane under current filters.")}</div>
          </article>
        `).join("")}
      </section>
      <section class="corpus-risk-list" aria-label="Story risk notes">
        ${rows.slice(0, 14).map((risk, index) => `
          <article class="corpus-risk-card status-${escapeHtml(risk.status)}">
            <header>
              <span>${String(index + 1).padStart(2, "0")} ${escapeHtml(risk.row.shortLabel)}</span>
              <strong>${escapeHtml(risk.productName)}</strong>
              <em>${escapeHtml(risk.label)}</em>
            </header>
            <p>${escapeHtml(risk.consequence)}</p>
            <dl>
              <dt>Locked</dt>
              <dd>${escapeHtml(clipped(risk.lockedClaim, 130))}</dd>
              <dt>Unlock</dt>
              <dd>${escapeHtml(clipped(risk.nextProof, 130))}</dd>
              <dt>Receipt</dt>
              <dd>${escapeHtml(clipped(risk.receipt, 100))}</dd>
            </dl>
            <div class="lead-meta">
              ${statusTag(risk.status)}
              ${linkOrText(risk.source, risk.sourceLabel)}
            </div>
          </article>
        `).join("")}
      </section>
      <footer class="corpus-risk-note">
        The board is intentionally conservative. It lets the reader see the research tension without letting the interface imply that visible evidence equals verified ingredient history.
      </footer>
    </article>
  `;
}

function corpusNarrativeProofMoveRows(publicationRows) {
  const groups = new Map();
  publicationRows.forEach((row) => {
    const key = clipped(row.nextProof || "No next proof step recorded.", 120);
    const group = groups.get(key) || {
      action: key,
      rows: [],
      products: [],
      status: row.status === "manual_verified" ? "manual_verified" : row.status === "label_visible" ? "label_visible" : "source_review",
    };
    group.rows.push(row);
    if (group.products.length < 5) group.products.push(row.productName);
    groups.set(key, group);
  });
  return [...groups.values()]
    .sort((a, b) => b.rows.length - a.rows.length || a.action.localeCompare(b.action))
    .slice(0, 6);
}

function corpusNarrativeDashboardData(productRows) {
  const publicationRows = corpusPublicationRows(productRows);
  const riskRows = corpusStoryRiskRows(productRows);
  const riskLaneRows = corpusStoryRiskLaneRows(riskRows);
  const evidenceStories = publicationRows.filter((row) => row.decision.key === "evidence_story");
  const claimScoped = publicationRows.filter((row) => row.decision.key === "claim_ready");
  const sourceHolds = publicationRows.filter((row) => row.decision.key === "source_lead");
  const gapHolds = publicationRows.filter((row) => row.decision.key === "hold_gap");
  const readyRows = [...evidenceStories, ...claimScoped].slice(0, 6);
  const lockedRows = publicationRows
    .filter((row) => presentText(row.lockedClaim))
    .sort((a, b) => b.row.facts.visibleLabels - a.row.facts.visibleLabels || a.productName.localeCompare(b.productName))
    .slice(0, 6);
  const riskCards = riskLaneRows
    .filter((lane) => lane.rows.length)
    .sort((a, b) => b.rows.length - a.rows.length)
    .slice(0, 6);
  const proofMoves = corpusNarrativeProofMoveRows(publicationRows);
  const affectedProducts = uniqueValues(riskRows.map((row) => row.productName), 1000).length;
  return {
    publicationRows,
    riskRows,
    riskCards,
    proofMoves,
    readyRows,
    lockedRows,
    summaryRows: [
      ["label_visible", "Evidence Stories", evidenceStories.length],
      ["manual_verified", "Claim-Scoped", claimScoped.length],
      ["source_review", "Source Holds", sourceHolds.length],
      ["missing_vintage_slot", "Gap Holds", gapHolds.length],
      ["source_review", "Risk Notes", riskRows.length],
      ["candidate_found", "Affected Stories", affectedProducts],
    ],
  };
}

function renderCorpusNarrativeDashboard(productRows) {
  if (!els.corpusNarrativeDashboard) return;
  const data = corpusNarrativeDashboardData(productRows);
  if (!data.publicationRows.length) {
    els.corpusNarrativeDashboard.innerHTML = `<p class="empty-note">No narrative dashboard rows match the current filters.</p>`;
    return;
  }
  els.corpusNarrativeDashboard.innerHTML = `
    <article class="corpus-dashboard">
      <header class="corpus-dashboard-head">
        <div>
          <p class="eyebrow">Narrative Dashboard</p>
          <h3>The corpus can tell evidence stories before it proves formulation history</h3>
          <p>This synthesis keeps the useful reader-facing work visible: publishable evidence copy, locked claims, next proof moves, and the risk lanes that prevent overstatement.</p>
        </div>
        <aside class="corpus-dashboard-summary" aria-label="Narrative dashboard summary">
          ${data.summaryRows.map(([status, label, value]) => `
            <span class="status-${escapeHtml(status)}">
              <strong>${formatNumber(value)}</strong> ${escapeHtml(label)}
            </span>
          `).join("")}
        </aside>
      </header>
      <div class="corpus-dashboard-grid">
        <section class="corpus-dashboard-panel status-label_visible" aria-label="Publishable evidence stories">
          <header>
            <span>Public language</span>
            <strong>${formatNumber(data.readyRows.length)}</strong>
          </header>
          <p>Evidence-status stories can publish when the copy names the proof state and keeps formulation claims locked.</p>
          <div class="corpus-dashboard-list">
            ${data.readyRows.map((row) => `
              <article>
                <strong>${escapeHtml(row.productName)}</strong>
                <p>${escapeHtml(clipped(row.publicationCopy, 145))}</p>
                <div class="lead-meta">${statusTag(row.decision.status)}${linkOrText(row.source, row.sourceLabel)}</div>
              </article>
            `).join("")}
          </div>
        </section>
        <section class="corpus-dashboard-panel status-missing_vintage_slot" aria-label="Locked claims">
          <header>
            <span>Locked claims</span>
            <strong>${formatNumber(data.lockedRows.length)}</strong>
          </header>
          <p>These lines are useful because they tell editors exactly what the public story must not imply yet.</p>
          <div class="corpus-dashboard-list">
            ${data.lockedRows.map((row) => `
              <article>
                <strong>${escapeHtml(row.productName)}</strong>
                <p>${escapeHtml(clipped(row.lockedClaim, 145))}</p>
                <div class="lead-meta">${statusTag(row.status)}${statusTag(row.shortLabel)}</div>
              </article>
            `).join("")}
          </div>
        </section>
        <section class="corpus-dashboard-panel status-candidate_found" aria-label="Next proof moves">
          <header>
            <span>Next proof moves</span>
            <strong>${formatNumber(data.proofMoves.length)}</strong>
          </header>
          <p>Repeated proof steps show where UX and review workflows should focus before collection resumes.</p>
          <div class="corpus-dashboard-list">
            ${data.proofMoves.map((move) => `
              <article>
                <strong>${formatNumber(move.rows.length)} ${move.rows.length === 1 ? "story" : "stories"}</strong>
                <p>${escapeHtml(move.action)}</p>
                <div class="corpus-products">${escapeHtml(uniqueValues(move.products, 5).join("; "))}</div>
              </article>
            `).join("")}
          </div>
        </section>
        <section class="corpus-dashboard-panel status-source_review" aria-label="Risk density">
          <header>
            <span>Risk density</span>
            <strong>${formatNumber(data.riskRows.length)}</strong>
          </header>
          <p>The densest risk lanes explain why the interface should continue showing caveats beside the story copy.</p>
          <div class="corpus-dashboard-list">
            ${data.riskCards.map((risk) => `
              <article>
                <strong>${escapeHtml(risk.label)}</strong>
                <p>${escapeHtml(`${pluralize(risk.rows.length, "note")}. ${risk.detail}`)}</p>
                <div class="corpus-products">${escapeHtml(risk.products.join("; ") || "No products in this lane.")}</div>
              </article>
            `).join("")}
          </div>
        </section>
      </div>
      <footer class="corpus-dashboard-note">
        This is the editorial synthesis layer. It answers what can be told now, what stays locked, and what proof move would make the next story stronger.
      </footer>
    </article>
  `;
}

function corpusFrontPageRows(productRows) {
  const riskRows = corpusStoryRiskRows(productRows);
  return corpusStoryDeckRows(productRows).map((row) => {
    const risks = riskRows.filter((risk) => risk.productName === row.productName && risk.row.key === row.key);
    return {
      ...row,
      risks,
      primaryRisk: risks[0],
      eyebrow: `${row.shortLabel} / ${row.vintage}`,
      readerLede: row.headline,
      readerDek: row.dek,
      receiptLine: row.source ? `${row.sourceTitle} via ${row.sourceLabel}` : row.sourceTitle,
      boundaryLine: row.cannotSay,
      nextChapter: row.nextProof,
    };
  });
}

function corpusFrontPageSummaryRows(rows) {
  return [
    ["label_visible", "Lead Stories", rows.length],
    ["source_review", "Receipts", rows.filter((row) => row.source).length],
    ["missing_vintage_slot", "Boundaries", rows.filter((row) => row.boundaryLine).length],
    ["candidate_found", "Next Chapters", rows.filter((row) => row.nextChapter).length],
  ];
}

function renderCorpusReaderFrontpage(productRows) {
  if (!els.corpusReaderFrontpage) return;
  const rows = corpusFrontPageRows(productRows);
  if (!rows.length) {
    els.corpusReaderFrontpage.innerHTML = `<p class="empty-note">No reader front-page stories match the current filters.</p>`;
    return;
  }
  const hero = rows[0];
  const featureRows = rows.slice(1, 5);
  const sidebarRows = rows.slice(0, 4);
  const summaryRows = corpusFrontPageSummaryRows(rows);
  els.corpusReaderFrontpage.innerHTML = `
    <article class="corpus-frontpage">
      <header class="corpus-frontpage-head">
        <div>
          <p class="eyebrow">Reader Front Page</p>
          <h3>Start with the object, then show the claim boundary</h3>
          <p>This page reads like the public entry point: story ledes, visible evidence, source receipts, and the next proof step all stay together.</p>
        </div>
        <aside class="corpus-frontpage-summary" aria-label="Reader front-page summary">
          ${summaryRows.map(([status, label, value]) => `
            <span class="status-${escapeHtml(status)}">
              <strong>${formatNumber(value)}</strong> ${escapeHtml(label)}
            </span>
          `).join("")}
        </aside>
      </header>
      <section class="corpus-frontpage-layout" aria-label="Reader-facing story packages">
        <article class="corpus-frontpage-hero status-${escapeHtml(hero.status)}">
          <figure>${corpusStoryDeckImage(hero)}</figure>
          <div>
            <span>${escapeHtml(hero.eyebrow)}</span>
            <h4>${escapeHtml(hero.readerLede)}</h4>
            <p>${escapeHtml(hero.readerDek)}</p>
            <dl>
              <dt>Receipt</dt>
              <dd>${escapeHtml(hero.receiptLine)}</dd>
              <dt>Boundary</dt>
              <dd>${escapeHtml(hero.boundaryLine)}</dd>
              <dt>Next</dt>
              <dd>${escapeHtml(hero.nextChapter)}</dd>
            </dl>
            <div class="lead-meta">
              ${statusTag(hero.evidenceStatus)}
              ${hero.primaryRisk ? statusTag(hero.primaryRisk.label) : ""}
              ${linkOrText(hero.source, hero.sourceLabel)}
            </div>
          </div>
        </article>
        <aside class="corpus-frontpage-sidebar" aria-label="Front-page story index">
          <strong>Story Index</strong>
          ${sidebarRows.map((row) => `
            <article class="status-${escapeHtml(row.status)}">
              <span>${escapeHtml(row.shortLabel)}</span>
              <p>${escapeHtml(clipped(row.readerLede, 110))}</p>
            </article>
          `).join("")}
        </aside>
      </section>
      <section class="corpus-frontpage-grid" aria-label="Secondary front-page stories">
        ${featureRows.map((row) => `
          <article class="corpus-frontpage-card status-${escapeHtml(row.status)}">
            <span>${escapeHtml(row.eyebrow)}</span>
            <strong>${escapeHtml(row.readerLede)}</strong>
            <p>${escapeHtml(clipped(row.readerDek, 170))}</p>
            <footer>
              <b>Boundary</b>
              <em>${escapeHtml(clipped(row.boundaryLine, 130))}</em>
            </footer>
          </article>
        `).join("")}
      </section>
      <footer class="corpus-frontpage-note">
        The front page is intentionally evidence-first. It gives readers a story to enter while keeping unverified ingredient history out of the headline.
      </footer>
    </article>
  `;
}

function corpusStoryLibraryLaneRows(rows) {
  const laneDefs = [
    {
      key: "evidence_story",
      label: "Evidence Stories",
      status: "label_visible",
      match: (row) => row.status === "label_visible",
      detail: "Readable evidence can support a public story with claim boundaries visible.",
    },
    {
      key: "claim_ready",
      label: "Claim-Scoped",
      status: "manual_verified",
      match: (row) => row.status === "manual_verified",
      detail: "Reviewed evidence can support scoped product-history claims.",
    },
    {
      key: "source_review",
      label: "Source Review",
      status: "source_review",
      match: (row) => row.status === "source_review",
      detail: "A receipt exists, but role/date/scope review still blocks public treatment.",
    },
    {
      key: "locked",
      label: "Locked Claims",
      status: "missing_vintage_slot",
      match: (row) => presentText(row.boundaryLine),
      detail: "The story is useful because it states what should not be claimed yet.",
    },
  ];
  return laneDefs.map((lane) => {
    const laneRows = rows.filter(lane.match);
    return {
      ...lane,
      rows: laneRows,
      products: uniqueValues(laneRows.map((row) => row.productName), 4),
    };
  });
}

function renderCorpusStoryLibrary(productRows) {
  if (!els.corpusStoryLibrary) return;
  const rows = corpusFrontPageRows(productRows);
  if (!rows.length) {
    els.corpusStoryLibrary.innerHTML = `<p class="empty-note">No story library rows match the current filters.</p>`;
    return;
  }
  const laneRows = corpusStoryLibraryLaneRows(rows);
  els.corpusStoryLibrary.innerHTML = `
    <article class="corpus-library">
      <header class="corpus-library-head">
        <div>
          <p class="eyebrow">Story Library</p>
          <h3>Every story package carries a receipt and a caveat</h3>
          <p>The library is the browsable shelf behind the front page: each story keeps its public lede, source receipt, boundary, risk count, and next proof step together.</p>
        </div>
        <aside class="corpus-library-summary" aria-label="Story library summary">
          <span class="status-label_visible"><strong>${formatNumber(rows.length)}</strong> Stories</span>
          <span class="status-source_review"><strong>${formatNumber(rows.filter((row) => row.source).length)}</strong> Receipts</span>
          <span class="status-missing_vintage_slot"><strong>${formatNumber(rows.filter((row) => row.boundaryLine).length)}</strong> Boundaries</span>
          <span class="status-candidate_found"><strong>${formatNumber(rows.filter((row) => row.nextChapter).length)}</strong> Next Steps</span>
        </aside>
      </header>
      <section class="corpus-library-lanes" aria-label="Story library lanes">
        ${laneRows.map((lane) => `
          <article class="corpus-library-lane status-${escapeHtml(lane.status)}">
            <header>
              <span>${escapeHtml(lane.label)}</span>
              <strong>${formatNumber(lane.rows.length)}</strong>
            </header>
            <p>${escapeHtml(lane.detail)}</p>
            <div class="corpus-products">${escapeHtml(lane.products.join("; ") || "No stories in this lane under current filters.")}</div>
          </article>
        `).join("")}
      </section>
      <section class="corpus-library-grid" aria-label="Packaged reader stories">
        ${rows.map((row, index) => `
          <article class="corpus-library-card status-${escapeHtml(row.status)}">
            <header>
              <span>${String(index + 1).padStart(2, "0")} ${escapeHtml(row.eyebrow)}</span>
              <strong>${escapeHtml(row.readerLede)}</strong>
            </header>
            <p>${escapeHtml(clipped(row.readerDek, 150))}</p>
            <dl>
              <dt>Receipt</dt>
              <dd>${escapeHtml(clipped(row.receiptLine, 95))}</dd>
              <dt>Boundary</dt>
              <dd>${escapeHtml(clipped(row.boundaryLine, 95))}</dd>
              <dt>Next</dt>
              <dd>${escapeHtml(clipped(row.nextChapter, 95))}</dd>
            </dl>
            <footer>
              ${statusTag(row.evidenceStatus)}
              ${row.risks.length ? statusTag(`${row.risks.length} risks`) : ""}
              ${linkOrText(row.source, row.sourceLabel)}
            </footer>
          </article>
        `).join("")}
      </section>
      <footer class="corpus-library-note">
        The shelf treats every story as provisional until the receipt, label text, identity role, and date basis support stronger language.
      </footer>
    </article>
  `;
}

function corpusStoryFlowSteps(row) {
  const receiptStatus = row.source ? "source_review" : "missing_vintage_slot";
  const boundaryStatus = row.boundaryLine ? "missing_vintage_slot" : "manual_verified";
  const nextStatus = row.nextChapter ? "candidate_found" : "rejected";
  return [
    {
      label: "Object",
      status: row.status,
      title: row.shortLabel,
      body: row.readerLede,
    },
    {
      label: "Receipt",
      status: receiptStatus,
      title: row.sourceLabel || "No source",
      body: row.receiptLine || "Attach source attribution before this story can travel.",
    },
    {
      label: "Boundary",
      status: boundaryStatus,
      title: row.primaryRisk?.label || row.evidenceStatus || "Claim scope",
      body: row.boundaryLine || "No explicit boundary is attached under the current filters.",
    },
    {
      label: "Next Proof",
      status: nextStatus,
      title: row.risks.length ? `${row.risks.length} risk gates` : "Proof move",
      body: row.nextChapter || "No next proof step is attached under the current filters.",
    },
  ];
}

function corpusStoryFlowRows(rows) {
  return rows.slice(0, 8).map((row, index) => ({
    ...row,
    number: String(index + 1).padStart(2, "0"),
    steps: corpusStoryFlowSteps(row),
    riskLabel: row.primaryRisk?.label || (row.risks.length ? "risk noted" : "low risk"),
  }));
}

function corpusStoryFlowSummaryRows(rows) {
  return [
    ["label_visible", "Object-Led", rows.length],
    ["source_review", "With Receipts", rows.filter((row) => row.source).length],
    ["missing_vintage_slot", "Bounded Claims", rows.filter((row) => row.boundaryLine).length],
    ["candidate_found", "Proof Moves", rows.filter((row) => row.nextChapter).length],
  ];
}

function renderCorpusStoryFlow(productRows) {
  if (!els.corpusStoryFlow) return;
  const rows = corpusFrontPageRows(productRows);
  if (!rows.length) {
    els.corpusStoryFlow.innerHTML = `<p class="empty-note">No story flow rows match the current filters.</p>`;
    return;
  }

  const flowRows = corpusStoryFlowRows(rows);
  const summaryRows = corpusStoryFlowSummaryRows(rows);
  els.corpusStoryFlow.innerHTML = `
    <article class="corpus-flow">
      <header class="corpus-flow-head">
        <div>
          <p class="eyebrow">Story Flow Map</p>
          <h3>The story moves only as far as the evidence lets it move</h3>
          <p>Each path shows the reader journey from a visible object into a source receipt, then through the claim boundary and the next proof move.</p>
        </div>
        <aside class="corpus-flow-summary" aria-label="Story flow summary">
          ${summaryRows.map(([status, label, value]) => `
            <span class="status-${escapeHtml(status)}"><strong>${formatNumber(value)}</strong> ${escapeHtml(label)}</span>
          `).join("")}
        </aside>
      </header>
      <section class="corpus-flow-stack" aria-label="Evidence-to-story flow paths">
        ${flowRows.map((row) => `
          <article class="corpus-flow-row status-${escapeHtml(row.status)}">
            <header class="corpus-flow-row-head">
              <span>${escapeHtml(`${row.number} ${row.eyebrow}`)}</span>
              <strong>${escapeHtml(row.readerLede)}</strong>
              <em>${escapeHtml(row.riskLabel)}</em>
            </header>
            <div class="corpus-flow-path">
              ${row.steps.map((step, stepIndex) => `
                <section class="corpus-flow-step status-${escapeHtml(step.status)}">
                  <span>${escapeHtml(step.label)}</span>
                  <strong>${escapeHtml(clipped(step.title, 58))}</strong>
                  <p>${escapeHtml(clipped(step.body, 105))}</p>
                </section>
                ${stepIndex < row.steps.length - 1 ? `<div class="corpus-flow-arrow" aria-hidden="true"></div>` : ""}
              `).join("")}
            </div>
          </article>
        `).join("")}
      </section>
      <footer class="corpus-flow-note">
        This view is intentionally conservative: unsupported or partially reviewed stories still appear, but the path stops at the receipt, boundary, or proof move that blocks stronger claims.
      </footer>
    </article>
  `;
}

function storyTimelineStrength(cell) {
  const order = {
    missing_vintage_slot: 0,
    no_source: 0,
    rejected: 0,
    unknown: 0,
    candidate_needs_archive: 1,
    candidate_found: 1,
    source_review: 1,
    usable_photo: 2,
    candidate_needs_panel: 2,
    candidate_needs_transcription: 2,
    label_visible: 3,
    ocr_extracted: 4,
    manual_verified: 5,
  };
  return order[cell.status] ?? 0;
}

function storyTimelineCell(row, vintage) {
  const cell = heatmapCellForVintage(row, vintage);
  const evidenceRows = vintageEvidenceRows(row.product, row.evidenceRows, vintage);
  const best = evidenceRows[0] || {};
  return {
    ...cell,
    vintage,
    vintageLabel: vintageLabels[vintage] || vintage,
    sourceName: best.source_name || best.publisher_owner || best.source_key || "",
    proofObject: best.title || best.evidence_kind || cell.detail,
    strength: storyTimelineStrength(cell),
  };
}

function storyTimelineRows(productRows) {
  const vintages = state.data.vintages || [];
  return productRows.slice(0, 12).map((row, index) => {
    const cells = vintages.map((vintage) => storyTimelineCell(row, vintage));
    const strongest = cells.reduce((best, cell) => (cell.strength > best.strength ? cell : best), cells[0] || {
      status: "missing_vintage_slot",
      label: "gap",
      detail: "No vintage story cells are configured.",
      strength: 0,
      vintageLabel: "Timeline",
    });
    const gapCount = cells.filter((cell) => !cell.strength).length;
    const sourcedCount = cells.filter((cell) => cell.sourceCount || cell.strength).length;
    return {
      ...row,
      number: String(index + 1).padStart(2, "0"),
      cells,
      strongest,
      gapCount,
      sourcedCount,
      readableCount: cells.filter((cell) => cell.strength >= 3).length,
      narration: pilotCanSay(row),
    };
  });
}

function storyTimelineSummaryRows(rows) {
  const cells = rows.flatMap((row) => row.cells);
  return [
    ["source_review", "Sourced Cells", cells.filter((cell) => cell.sourceCount || cell.strength).length],
    ["label_visible", "Readable Labels", cells.filter((cell) => cell.strength >= 3).length],
    ["manual_verified", "Claim Cells", cells.filter((cell) => cell.status === "manual_verified").length],
    ["missing_vintage_slot", "Visible Gaps", cells.filter((cell) => !cell.strength).length],
  ];
}

function renderCorpusStoryTimeline(productRows) {
  if (!els.corpusStoryTimeline) return;
  const rows = storyTimelineRows(productRows);
  const vintages = state.data.vintages || [];
  if (!rows.length || !vintages.length) {
    els.corpusStoryTimeline.innerHTML = `<p class="empty-note">No vintage story timeline rows match the current filters.</p>`;
    return;
  }

  const summaryRows = storyTimelineSummaryRows(rows);
  els.corpusStoryTimeline.innerHTML = `
    <article class="corpus-timeline">
      <header class="corpus-timeline-head">
        <div>
          <p class="eyebrow">Vintage Story Timeline</p>
          <h3>Each product history has a visible proof rhythm</h3>
          <p>The timeline shows where a story has sources, readable package evidence, verified text, and era gaps before the reader sees any formulation claim.</p>
        </div>
        <aside class="corpus-timeline-summary" aria-label="Vintage story timeline summary">
          ${summaryRows.map(([status, label, value]) => `
            <span class="status-${escapeHtml(status)}"><strong>${formatNumber(value)}</strong> ${escapeHtml(label)}</span>
          `).join("")}
        </aside>
      </header>
      <div class="corpus-timeline-scroll">
        <div class="corpus-timeline-grid" style="--timeline-vintages:${vintages.length}">
          <div class="corpus-timeline-row corpus-timeline-row-head">
            <span>Product Story</span>
            ${vintages.map((vintage) => `<span>${escapeHtml(vintageLabels[vintage] || vintage)}</span>`).join("")}
            <span>Reader State</span>
          </div>
          ${rows.map((row) => `
            <article class="corpus-timeline-row status-${escapeHtml(row.strongest.status)}">
              <header class="corpus-timeline-product">
                <span>${escapeHtml(`${row.number} ${labelFor(row.product.category || "Product")}`)}</span>
                <strong>${escapeHtml(row.product.display_name || row.product.canonical_name)}</strong>
                <em>${pluralize(row.sourcedCount, "sourced era")} · ${pluralize(row.gapCount, "gap")}</em>
              </header>
              ${row.cells.map((cell) => `
                <section class="corpus-timeline-cell status-${escapeHtml(cell.status)}">
                  <span>${escapeHtml(cell.label)}</span>
                  <strong>${escapeHtml(cell.sourceCount ? `${cell.sourceCount} source${cell.sourceCount === 1 ? "" : "s"}` : "gap")}</strong>
                  <p>${escapeHtml(clipped(cell.proofObject || cell.detail, 82))}</p>
                </section>
              `).join("")}
              <aside class="corpus-timeline-state">
                ${statusTag(row.strongest.status)}
                <strong>${escapeHtml(row.strongest.vintageLabel)}</strong>
                <p>${escapeHtml(clipped(row.narration, 118))}</p>
              </aside>
            </article>
          `).join("")}
        </div>
      </div>
      <footer class="corpus-timeline-note">
        The timeline reads absence as part of the story. A blank vintage is a visible gap, not permission to infer continuity from current labels.
      </footer>
    </article>
  `;
}

function pilotStageDefinitions() {
  return [
    {
      key: "gap",
      stage: -1,
      label: "Gap Only",
      status: "missing_vintage_slot",
      detail: "Products with no attached evidence rows under the current filters.",
    },
    {
      key: "lead",
      stage: 0,
      label: "Lead",
      status: "discovered",
      detail: "A product/date/source hint exists, but attribution is not ready.",
    },
    {
      key: "source",
      stage: 1,
      label: "Source",
      status: "source_review",
      detail: "Source owner, date basis, and claim linkage need review.",
    },
    {
      key: "photo",
      stage: 2,
      label: "Photo",
      status: "usable_photo",
      detail: "Package or document evidence exists, but a readable label is not verified.",
    },
    {
      key: "label",
      stage: 3,
      label: "Label",
      status: "label_visible",
      detail: "Readable label leads can move into OCR or manual transcription.",
    },
    {
      key: "claim",
      stage: 4,
      label: "Claim",
      status: "manual_verified",
      detail: "Reviewed label text can support scoped formulation claims.",
    },
  ];
}

function pilotStageForRow(row) {
  return storyEvidenceStage(row.product, row.evidenceRows);
}

function pilotStageRows(productRows) {
  const targetRows = productRows.slice(0, 100);
  const total = Math.max(1, targetRows.length);
  return pilotStageDefinitions().map((definition) => {
    const rows = targetRows.filter((row) => pilotStageForRow(row) === definition.stage);
    return {
      ...definition,
      count: rows.length,
      pct: Math.round((rows.length / total) * 100),
      products: rows.slice(0, 4).map((row) => row.product.display_name || row.product.canonical_name),
    };
  });
}

function pilotCategoryRows(productRows) {
  const targetRows = productRows.slice(0, 100);
  const groups = new Map();
  targetRows.forEach((row) => {
    const category = row.product.category || "uncategorized";
    const group = groups.get(category) || {
      category,
      rows: [],
      products: 0,
      coverageTotal: 0,
      sourceSlots: 0,
      gapSlots: 0,
      labelVisible: 0,
      claimReady: 0,
      topProducts: [],
    };
    group.rows.push(row);
    group.products += 1;
    group.coverageTotal += numeric(row.product.slot_coverage_pct);
    group.sourceSlots += numeric(row.product.slots_with_sources);
    group.gapSlots += numeric(row.product.slots_without_sources);
    if (row.facts.visibleLabels) group.labelVisible += 1;
    if (numeric(row.product.ground_truth_slots) || row.facts.manualLabels) group.claimReady += 1;
    if (group.topProducts.length < 5) group.topProducts.push(row.product.display_name || row.product.canonical_name);
    groups.set(category, group);
  });
  return [...groups.values()]
    .map((group) => ({
      ...group,
      averageCoverage: group.products ? Math.round(group.coverageTotal / group.products) : 0,
      status: group.claimReady ? "manual_verified" : group.labelVisible ? "label_visible" : group.sourceSlots ? "source_review" : "missing_vintage_slot",
    }))
    .sort((a, b) => b.products - a.products || b.averageCoverage - a.averageCoverage)
    .slice(0, 8);
}

function pilotVintageRows(productRows) {
  const targetRows = productRows.slice(0, 100);
  const total = Math.max(1, targetRows.length);
  return state.data.vintages.map((vintage) => {
    const statusCounts = {};
    let sourceSlots = 0;
    let gapSlots = 0;
    let visibleSlots = 0;
    let claimSlots = 0;
    const blockers = [];
    targetRows.forEach((row) => {
      const info = row.product.vintage_statuses?.[vintage] || { status: "unknown", source_count: 0 };
      const status = info.status || "unknown";
      const rows = vintageEvidenceRows(row.product, row.evidenceRows, vintage);
      const facts = storyEvidenceFacts(rows);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      if (numeric(info.source_count) || rows.length) sourceSlots += 1;
      if (status === "no_source" || status === "missing_vintage_slot" || (!numeric(info.source_count) && !rows.length)) {
        gapSlots += 1;
        if (blockers.length < 4) blockers.push(row.product.display_name || row.product.canonical_name);
      }
      if (facts.visibleLabels || status === "label_visible" || status === "manual_verified") visibleSlots += 1;
      if (facts.manualLabels || status === "manual_verified") claimSlots += 1;
    });
    const status = claimSlots ? "manual_verified" : visibleSlots ? "label_visible" : sourceSlots ? "source_review" : "missing_vintage_slot";
    return {
      vintage,
      label: vintageLabels[vintage] || vintage,
      status,
      coveragePct: Math.round((sourceSlots / total) * 100),
      sourceSlots,
      gapSlots,
      visibleSlots,
      claimSlots,
      dominantStatus: Object.entries(statusCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "unknown",
      blockers,
    };
  });
}

function pilotCanSay(row) {
  if (numeric(row.product.ground_truth_slots) || row.facts.manualLabels) {
    return "Scoped label claims can be told for verified slots.";
  }
  if (row.facts.visibleLabels) {
    return "The story can say label evidence is visible and ready for transcription.";
  }
  if (row.facts.usablePhotos) {
    return "The story can show package/source evidence while ingredient claims remain locked.";
  }
  if (numeric(row.product.slots_with_sources)) {
    return "The story can show source leads and dated gaps, not formulation changes.";
  }
  return "The story is an explicit source gap until attributable evidence is attached.";
}

function pilotStoryLane(row) {
  const product = row.product;
  const text = [
    product.display_name,
    product.canonical_name,
    product.category,
    product.subcategory,
    product.collection_track,
  ].join(" ").toLowerCase();
  if (product.category === "fast food") return "Document Timeline";
  if (/\b(cola|coke|pepsi|soda|drink|beverage|juice|coffee|tea)\b/.test(text)) return "Formula + Package";
  if (/cookie|cereal|snack|chip|candy|chocolate|cracker|pop-tart|condiment|sauce/.test(text)) return "Ingredient + Object";
  if (numeric(product.slots_without_sources) > 2 || presentText(product.missing_vintages)) return "Origin Gap";
  return "Package + Maker";
}

function pilotCollectionLane(row) {
  const product = row.product;
  const sources = [
    product.best_source_urls,
    product.starter_image_urls,
    product.starter_search_urls,
    row.sourcePath.join(";"),
    product.top_source_domains,
  ].join(" ").toLowerCase();
  if (/flickr|worthpoint|ebay|etsy|collector|collecting|museum|americanhistory|loc\.gov|wikimedia/.test(sources)) {
    return "Collector Photo";
  }
  if (/smartlabel|brand|mondelez|hershey|general mills|coca-cola|pepsico|kraft|campbell|heinz/.test(sources)) {
    return "Current Label";
  }
  if (/walmart|target|kroger|instacart|wegmans|retailer|grocery/.test(sources)) {
    return "Retailer Weight";
  }
  if (/archive|webcache|common crawl|cdx/.test(sources) || presentText(product.common_crawl_patterns)) {
    return "Archive Sweep";
  }
  if (product.category === "fast food") return "Menu Docs";
  return "Source Review";
}

function pilotRichnessScore(row) {
  const product = row.product;
  const sourceDomains = uniqueValues([
    ...splitParts(product.top_source_domains, 20),
    ...row.sourcePath,
  ], 20).length;
  const vintageCoverage = numeric(product.slot_coverage_pct);
  const photoWeight = row.facts.usablePhotos * 8 + row.facts.visibleLabels * 16 + row.facts.packageFields * 4;
  const candidateWeight = Math.min(30, numeric(product.product_candidate_count) * 2);
  const sourceWeight = Math.min(24, sourceDomains * 4);
  const gapPenalty = Math.min(22, numeric(product.slots_without_sources) * 4);
  const priorityWeight = Math.min(18, numeric(product.target_priority) / 8 + numeric(product.collection_opportunity_score) / 80);
  return Math.max(0, Math.round(vintageCoverage * 0.28 + photoWeight + candidateWeight + sourceWeight + priorityWeight - gapPenalty));
}

function pilotProofNeed(row) {
  const product = row.product;
  if (row.facts.visibleLabels && !row.facts.manualLabels) {
    return "Transcribe the visible label panel and attach reviewer attribution before ingredient diffs unlock.";
  }
  if (row.facts.usablePhotos) {
    return "Confirm whether the visual source includes a readable ingredient panel, net weight, and package date basis.";
  }
  if (presentText(product.panel_needed_vintages)) {
    return `Find readable panels for ${product.panel_needed_vintages}.`;
  }
  if (presentText(product.missing_vintages)) {
    return `Find source-attributable objects for ${product.missing_vintages}.`;
  }
  if (product.category === "fast food") {
    return "Tie menu, nutrition, allergen, archive, and package documents to item-specific dates before formulation claims.";
  }
  return product.recommended_next_action || "Review source owner, product identity, date basis, and label visibility.";
}

function pilotPrioritizationRows(productRows) {
  return productRows
    .slice(0, 100)
    .map((row) => {
      const product = row.product;
      const source = firstPart(product.best_source_urls || product.starter_image_urls || product.starter_search_urls);
      const sourceLabel = firstPart(product.top_source_domains) || row.bestSource.label || "Source";
      const sourceDomains = uniqueValues([
        ...splitParts(product.top_source_domains, 12),
        ...row.sourcePath,
      ], 4);
      const score = pilotRichnessScore(row);
      return {
        ...row,
        score,
        lane: pilotStoryLane(row),
        collectionLane: pilotCollectionLane(row),
        proofNeed: pilotProofNeed(row),
        source,
        sourceLabel,
        sourceDomains,
        status: row.facts.manualLabels || numeric(product.ground_truth_slots)
          ? "manual_verified"
          : row.facts.visibleLabels
            ? "label_visible"
            : row.facts.usablePhotos
              ? "usable_photo"
              : numeric(product.slots_with_sources)
                ? "source_review"
                : "missing_vintage_slot",
      };
    })
    .sort((a, b) => b.score - a.score || productStoryScore(b.product) - productStoryScore(a.product))
    .slice(0, 18);
}

function pilotStoryOpeningObject(row) {
  if (row.collectionLane === "Collector Photo") return "Package photo lead";
  if (row.collectionLane === "Current Label") return "Current label anchor";
  if (row.collectionLane === "Retailer Weight") return "Package/weight page";
  if (row.collectionLane === "Archive Sweep") return "Archive capture lead";
  if (row.collectionLane === "Menu Docs") return "Menu document trail";
  return "Source review lead";
}

function pilotStoryOpeningLede(row) {
  const name = row.product.display_name || row.product.canonical_name || "This product";
  if (row.status === "manual_verified") {
    return `${name} can open with verified label text and then show which eras remain separate from the claim.`;
  }
  if (row.status === "label_visible") {
    return `${name} can open with a visible label lead, while the ingredient-change claim waits for reviewed text.`;
  }
  if (row.status === "usable_photo") {
    return `${name} can open with the package object and a clear boundary: photo evidence is not formulation proof yet.`;
  }
  return `${name} can open as a source trail, with unsupported eras kept visible instead of smoothed into a timeline.`;
}

function pilotStoryOpeningLockedClaim(row) {
  if (row.status === "manual_verified") {
    return "Do not generalize verified slots across other packages, vintages, or variants without matching evidence.";
  }
  if (row.status === "label_visible") {
    return "Do not publish ingredient diffs until the visible panel is transcribed, corrected, and reviewer-accepted.";
  }
  if (row.status === "usable_photo") {
    return "Do not treat a product photo as a label statement until the ingredient panel is readable.";
  }
  if (presentText(row.product.missing_vintages)) {
    return `Do not fill ${row.product.missing_vintages} from memory, ads, or nearby variants.`;
  }
  return "Do not claim a formulation timeline until product identity, date basis, and label evidence are tied together.";
}

function pilotStoryOpeningRows(priorityRows) {
  return priorityRows.slice(0, 6).map((row, index) => ({
    ...row,
    number: String(index + 1).padStart(2, "0"),
    object: pilotStoryOpeningObject(row),
    lede: pilotStoryOpeningLede(row),
    lockedClaim: pilotStoryOpeningLockedClaim(row),
    receipt: row.sourceDomains[0] || row.sourceLabel || "source needed",
  }));
}

function pilotEpisodeChangeLens(row) {
  const dimensionLabels = pilotDimensionDefinitions()
    .filter((definition) => definition.active(row))
    .map((definition) => definition.label);
  if (dimensionLabels.length) return dimensionLabels.slice(0, 3).join(" + ");
  return row.lane || "Evidence Story";
}

function pilotEpisodeReaderQuestion(row) {
  const name = row.product.display_name || row.product.canonical_name || "this product";
  if (row.lane === "Document Timeline") {
    return `Which dated documents can safely explain ${name} without mixing menu, nutrition, allergen, and package scopes?`;
  }
  if (row.lane === "Origin Gap") {
    return `How far back can ${name} be traced before the story reaches an unsupported era?`;
  }
  if (row.lane === "Formula + Package") {
    return `Which package, flavor, and disclosure evidence can support a then-now comparison for ${name}?`;
  }
  if (row.lane === "Package + Maker") {
    return `What can ${name}'s package and maker text prove before ingredient history is verified?`;
  }
  return `What changed in ${name}, and which label panels can prove each chapter?`;
}

function pilotEpisodeEraScope(row) {
  const product = row.product;
  if (presentText(product.panel_needed_vintages)) {
    return `Needs readable panels: ${product.panel_needed_vintages}`;
  }
  if (presentText(product.missing_vintages)) {
    return `Open vintage gaps: ${product.missing_vintages}`;
  }
  if (numeric(product.slots_without_sources)) {
    return `${pluralize(numeric(product.slots_without_sources), "vintage gap")} still visible`;
  }
  if (numeric(product.slots_with_sources)) {
    return `${pluralize(numeric(product.slots_with_sources), "sourced vintage")} under review`;
  }
  return "Era scope still needs source attribution";
}

function pilotEpisodeRows(priorityRows) {
  return priorityRows.slice(0, 8).map((row, index) => {
    const object = pilotStoryOpeningObject(row);
    const lockedClaim = pilotStoryOpeningLockedClaim(row);
    const sourceLabel = row.sourceDomains[0] || row.sourceLabel || "source needed";
    const changeLens = pilotEpisodeChangeLens(row);
    const proofStatus = row.source ? "source_review" : "missing_vintage_slot";
    const lensStatus = row.facts.manualLabels
      ? "manual_verified"
      : row.facts.visibleLabels
        ? "label_visible"
        : row.facts.usablePhotos || row.facts.packageFields
          ? "usable_photo"
          : "source_review";
    const unlockStatus = row.status === "manual_verified"
      ? "manual_verified"
      : row.status === "label_visible"
        ? "label_visible"
        : row.status === "usable_photo"
          ? "candidate_needs_panel"
          : "source_review";
    return {
      ...row,
      number: String(index + 1).padStart(2, "0"),
      object,
      lockedClaim,
      sourceLabel,
      changeLens,
      eraScope: pilotEpisodeEraScope(row),
      readerQuestion: pilotEpisodeReaderQuestion(row),
      beats: [
        {
          label: "Hook",
          title: row.product.display_name || row.product.canonical_name,
          body: pilotStoryOpeningLede(row),
          status: row.status,
        },
        {
          label: "Proof Object",
          title: object,
          body: `Start from ${sourceLabel}; keep source owner and date basis visible.`,
          status: proofStatus,
        },
        {
          label: "Change Lens",
          title: changeLens,
          body: pilotEpisodeReaderQuestion(row),
          status: lensStatus,
        },
        {
          label: "Claim Boundary",
          title: "Locked until proof",
          body: lockedClaim,
          status: "missing_vintage_slot",
        },
        {
          label: "Next Scene",
          title: "Evidence move",
          body: row.proofNeed,
          status: unlockStatus,
        },
      ],
    };
  });
}

function pilotReaderScriptCaption(row) {
  const sourceLabel = row.sourceDomains[0] || row.sourceLabel || "source needed";
  if (row.facts.manualLabels) {
    return `Open on the reviewed label text, then keep ${sourceLabel} attached as the receipt.`;
  }
  if (row.facts.visibleLabels) {
    return `Open on the visible package or label panel from ${sourceLabel}; frame it as transcription-ready, not claim-ready.`;
  }
  if (row.facts.usablePhotos) {
    return `Open on the package object from ${sourceLabel}; tell the reader what the photo proves and what it cannot prove.`;
  }
  if (numeric(row.product.slots_with_sources)) {
    return `Open on the dated source trail from ${sourceLabel}; make the missing label panel the tension.`;
  }
  return "Open on the gap itself: the product is in scope, but source-attributable evidence is not attached yet.";
}

function pilotReaderScriptHeadline(row) {
  const name = row.product.display_name || row.product.canonical_name || "Product story";
  if (row.status === "manual_verified") return `${name}: what verified labels can say`;
  if (row.status === "label_visible") return `${name}: the label is visible, the claim is not ready`;
  if (row.status === "usable_photo") return `${name}: start with the package, hold the formula claim`;
  if (row.lane === "Origin Gap") return `${name}: the missing chapter is the story`;
  return `${name}: follow the receipt before the change claim`;
}

function pilotReaderScriptRows(episodeRows) {
  return episodeRows.slice(0, 4).map((row) => ({
    ...row,
    headline: pilotReaderScriptHeadline(row),
    deck: row.readerQuestion,
    caption: pilotReaderScriptCaption(row),
    canSay: pilotCanSay(row),
    cannotSay: row.lockedClaim,
    nextMove: row.proofNeed,
    receipt: row.sourceDomains[0] || row.sourceLabel || "source needed",
  }));
}

function pilotDecisionLaneDefinitions() {
  return [
    {
      key: "verified_pitch",
      label: "Pitch With Verified Claims",
      status: "manual_verified",
      matches: (row) => row.facts.manualLabels || numeric(row.product.ground_truth_slots),
      framing: "Lead with reviewed label text and keep every unsupported vintage outside the claim.",
      hold: "Do not generalize verified slots across other packages, sizes, markets, or eras.",
      action: "Build the receipt ledger, claim language, and side-by-side evidence cards.",
    },
    {
      key: "transcription_hold",
      label: "Hold For Transcription",
      status: "label_visible",
      matches: (row) => row.facts.visibleLabels && !row.facts.manualLabels,
      framing: "Treat the product as a strong visual story lead while ingredient-change language stays locked.",
      hold: "Do not publish formulation diffs from visible panels until corrected text and reviewer attribution are attached.",
      action: "Assign OCR/manual transcription, net-weight capture, and reviewer notes.",
    },
    {
      key: "object_feature",
      label: "Object Feature",
      status: "usable_photo",
      matches: (row) => row.facts.usablePhotos && !row.facts.visibleLabels,
      framing: "Use package photos, maker text, and source context as the public object story.",
      hold: "Do not convert package fronts, ads, or collector photos into ingredient statements.",
      action: "Confirm panel readability, date basis, rights note, and source-owner attribution.",
    },
    {
      key: "gap_dispatch",
      label: "Gap Dispatch",
      status: "missing_vintage_slot",
      matches: (row) => presentText(row.product.missing_vintages) || numeric(row.product.slots_without_sources),
      framing: "Make the unsupported era visible as part of the story instead of smoothing it into continuity.",
      hold: "Do not fill the missing chapter from memory, adjacent variants, current labels, or secondary summaries.",
      action: "Prioritize collector photos, museum records, trade catalogs, archived pages, and readable label panels.",
    },
    {
      key: "economics_sidebar",
      label: "Price/Weight Sidebar",
      status: "source_review",
      matches: (row) => row.facts.priceFields || row.facts.packageFields,
      framing: "Use package size, serving, and price context as a sidebar only when SKU identity is aligned.",
      hold: "Do not compare economics until package weight, date, SKU, and source bucket are compatible.",
      action: "Link weight observations to source evidence, then attach price observations by deterministic match.",
    },
  ];
}

function pilotDecisionRows(priorityRows) {
  const rows = priorityRows.slice(0, 18);
  const total = Math.max(1, rows.length);
  return pilotDecisionLaneDefinitions().map((definition) => {
    const matches = rows.filter((row) => definition.matches(row));
    const sampleRows = (matches.length ? matches : rows).slice(0, 5);
    const leader = sampleRows[0] || {};
    return {
      ...definition,
      count: matches.length,
      total,
      pct: Math.round((matches.length / total) * 100),
      products: sampleRows.map((row) => row.product.display_name || row.product.canonical_name),
      source: leader.source || "",
      sourceLabel: leader.sourceLabel || "Source",
      empty: !matches.length,
    };
  });
}

function pilotPackageRelease(row) {
  if (row.facts.manualLabels || numeric(row.product.ground_truth_slots)) {
    return {
      label: "Claim-Ready Package",
      status: "manual_verified",
      version: "v1 claim draft",
    };
  }
  if (row.facts.visibleLabels) {
    return {
      label: "Transcription Package",
      status: "label_visible",
      version: "v0.5 visual draft",
    };
  }
  if (row.facts.usablePhotos) {
    return {
      label: "Object Feature",
      status: "usable_photo",
      version: "v0 object draft",
    };
  }
  if (presentText(row.product.missing_vintages) || numeric(row.product.slots_without_sources)) {
    return {
      label: "Gap Dispatch",
      status: "missing_vintage_slot",
      version: "v0 gap brief",
    };
  }
  return {
    label: "Source Review Brief",
    status: "source_review",
    version: "v0 source brief",
  };
}

function pilotPackageShipWith(row) {
  const sourceLabel = row.sourceDomains[0] || row.sourceLabel || "source receipt";
  if (row.facts.manualLabels || numeric(row.product.ground_truth_slots)) {
    return `Reviewed label text, ${sourceLabel}, scoped claim language, and visible vintage gaps.`;
  }
  if (row.facts.visibleLabels) {
    return `Visible label/package lead, ${sourceLabel}, source caption, and explicit transcription hold.`;
  }
  if (row.facts.usablePhotos) {
    return `Package object, source attribution, date-basis note, and no-formulation boundary.`;
  }
  if (presentText(row.product.missing_vintages)) {
    return `Origin-gap framing, known source trail, missing vintages, and next evidence target.`;
  }
  return `Source-review lead, product identity context, and a visible no-claim boundary.`;
}

function pilotPackageHoldUntil(row) {
  if (row.facts.manualLabels || numeric(row.product.ground_truth_slots)) {
    return pilotStoryOpeningLockedClaim(row);
  }
  if (row.facts.visibleLabels) {
    return "Hold ingredient diffs until OCR/manual transcription, correction, reviewer attribution, and date basis are attached.";
  }
  if (row.facts.usablePhotos) {
    return "Hold formula language until a readable ingredient panel or verified text is tied to the same object/SKU.";
  }
  if (presentText(row.product.missing_vintages)) {
    return `Hold continuity claims until ${row.product.missing_vintages} have source-attributable evidence.`;
  }
  return "Hold all change claims until product identity, source owner, date basis, and evidence status are reviewed.";
}

function pilotPackageUpgrade(row) {
  if (row.facts.manualLabels || numeric(row.product.ground_truth_slots)) {
    return "Add comparison panel, ingredient facet diff, package size alignment, and price/weight sidebar.";
  }
  if (row.facts.visibleLabels) {
    return "Promote to claim draft after transcription review, ingredient parsing, and package-weight capture.";
  }
  if (row.facts.usablePhotos) {
    return "Promote to transcription package once label visibility and panel readability are confirmed.";
  }
  if (presentText(row.product.missing_vintages)) {
    return "Promote after collector, museum, trade-catalog, or archive evidence fills the missing era.";
  }
  return "Promote after at least one source-attributable product object or document is reviewed.";
}

function pilotPackagePlannerRows(episodeRows) {
  return episodeRows.slice(0, 6).map((row) => {
    const release = pilotPackageRelease(row);
    return {
      ...row,
      release,
      shipWith: pilotPackageShipWith(row),
      holdUntil: pilotPackageHoldUntil(row),
      upgrade: pilotPackageUpgrade(row),
      receipt: row.sourceDomains[0] || row.sourceLabel || "source needed",
    };
  });
}

function pilotIssueSlotRows(packageRows) {
  const used = new Set();
  const pickRow = (predicate, fallbackIndex = 0) => {
    const row = packageRows.find((candidate) => !used.has(candidate) && predicate(candidate))
      || packageRows.find((candidate) => !used.has(candidate))
      || packageRows[fallbackIndex]
      || {};
    used.add(row);
    return row;
  };
  const fallback = pickRow(() => true, 0);
  const visual = pickRow((row) => row.release?.status === "label_visible" || row.facts?.visibleLabels, 1);
  const gap = pickRow((row) => presentText(row.product?.missing_vintages) || numeric(row.product?.slots_without_sources), 2);
  const sidebar = pickRow((row) => row.facts?.priceFields || row.facts?.packageFields, 3);
  const slots = [
    {
      label: "Cover Story",
      role: "Lead the issue with the strongest reader question and the clearest evidence boundary.",
      row: fallback,
      status: fallback.release?.status || fallback.status || "source_review",
      packageType: fallback.release?.label || "Source Review Brief",
      focus: fallback.readerQuestion || "What can this product story safely say from the current evidence?",
      evidence: fallback.shipWith || (fallback.product ? pilotCanSay(fallback) : "No pilot package is selected."),
      boundary: fallback.holdUntil || fallback.lockedClaim || "Keep claim boundaries visible.",
      next: fallback.upgrade || fallback.proofNeed || "Attach stronger evidence before expanding the story.",
    },
    {
      label: "Visual Feature",
      role: "Use the package object as the reader entry point while label claims stay locked.",
      row: visual,
      status: visual.release?.status || visual.status || "label_visible",
      packageType: visual.release?.label || "Visual Draft",
      focus: visual.caption || (visual.product ? pilotReaderScriptCaption(visual) : "Use the strongest visual lead available."),
      evidence: visual.shipWith || "Visible package or label evidence can support the visual lead.",
      boundary: visual.holdUntil || "Do not publish formulation changes until text is reviewed.",
      next: visual.upgrade || "Move through transcription review before claim language.",
    },
    {
      label: "Gap Column",
      role: "Make unsupported eras part of the reader experience instead of smoothing them away.",
      row: gap,
      status: "missing_vintage_slot",
      packageType: presentText(gap.product?.missing_vintages) ? "Open Vintage Gap" : "Gap Watch",
      focus: gap.product ? pilotEpisodeEraScope(gap) : "Open vintage gap",
      evidence: gap.shipWith || "Known evidence can frame the gap, but not fill it.",
      boundary: gap.holdUntil || "Do not infer continuity from current labels or nearby variants.",
      next: gap.upgrade || "Find source-attributable objects or documents for the missing era.",
    },
    {
      label: "Price/Weight Sidebar",
      role: "Hold economic comparisons as context until SKU and package weight alignment are explicit.",
      row: sidebar,
      status: "source_review",
      packageType: "Analysis Sidebar",
      focus: sidebar.product?.display_name || sidebar.product?.canonical_name || "Price/weight alignment",
      evidence: sidebar.facts?.packageFields
        ? "Package weight or serving fields can appear as context."
        : "Price and weight remain future analysis context.",
      boundary: "Do not compare economics until package weight, date, SKU, and source bucket are compatible.",
      next: "Attach weight observations and deterministic price links before normalization.",
    },
  ];
  return slots.map((slot, index) => ({
    ...slot,
    number: String(index + 1).padStart(2, "0"),
    productName: slot.row?.product?.display_name || slot.row?.product?.canonical_name || "Product story",
    source: slot.row?.source || "",
    sourceLabel: slot.row?.sourceLabel || "Source",
    receipt: slot.row?.receipt || slot.row?.sourceDomains?.[0] || slot.row?.sourceLabel || "source needed",
  }));
}

function pilotIssueSpineRows(issueRows) {
  const moveLabels = {
    "Cover Story": "Open The Issue",
    "Visual Feature": "Show The Object",
    "Gap Column": "Name The Gap",
    "Price/Weight Sidebar": "Hold The Analysis",
  };
  return issueRows.map((row) => ({
    ...row,
    move: moveLabels[row.label] || "Advance The Story",
  }));
}

function pilotIssueReceiptRows(issueRows) {
  return issueRows.map((row) => ({
    ...row,
    supported: row.evidence || "Evidence context remains under review.",
    hold: row.boundary || "Do not publish stronger claims without review.",
    unlock: row.next || "Attach stronger evidence before expanding the story.",
  }));
}

function pilotIssueClaimStackRows(issueRows) {
  const publicLines = {
    "Cover Story": "Lead with the clearest question the evidence can carry.",
    "Visual Feature": "Let the package object introduce the product history.",
    "Gap Column": "Make the missing vintage visible instead of smoothing it away.",
    "Price/Weight Sidebar": "Keep economics as context until package alignment is explicit.",
  };
  return issueRows.map((row) => ({
    ...row,
    publicLine: publicLines[row.label] || row.focus || "Frame the story around the verified evidence.",
    canSay: row.evidence || "Evidence context remains under review.",
    offPage: row.boundary || "Do not publish stronger claims without review.",
    upgradeAction: row.next || "Attach stronger evidence before expanding the story.",
  }));
}

function pilotIssueSpreadModel(issueRows, claimRows) {
  const claimByLabel = new Map(claimRows.map((row) => [row.label, row]));
  const cover = issueRows[0] || {};
  const visual = issueRows[1] || cover;
  const gap = issueRows[2] || cover;
  const economics = issueRows[3] || cover;
  const panelRows = [
    {
      label: "Visual Proof",
      row: visual,
      claim: claimByLabel.get(visual.label) || visual,
      treatment: "Object-led module",
    },
    {
      label: "Visible Gap",
      row: gap,
      claim: claimByLabel.get(gap.label) || gap,
      treatment: "Gap callout",
    },
    {
      label: "Context Rail",
      row: economics,
      claim: claimByLabel.get(economics.label) || economics,
      treatment: "Price/weight hold",
    },
  ];
  return {
    cover: {
      ...cover,
      claim: claimByLabel.get(cover.label) || cover,
    },
    panels: panelRows,
    receipts: issueRows.map((row) => ({
      number: row.number,
      label: row.label,
      productName: row.productName,
      receipt: row.receipt,
      source: row.source,
      sourceLabel: row.sourceLabel,
      status: row.status,
    })),
  };
}

function pilotIssueReadingSequence(issueSpread) {
  const cover = issueSpread.cover || {};
  const visual = issueSpread.panels?.[0] || {};
  const gap = issueSpread.panels?.[1] || {};
  const economics = issueSpread.panels?.[2] || {};
  return [
    {
      number: "01",
      label: "Open",
      title: cover.productName || "Pilot product story",
      body: cover.focus || "Start with the strongest reader question.",
      receipt: cover.receipt || "source needed",
      source: cover.source,
      sourceLabel: cover.sourceLabel,
      status: cover.status || "source_review",
    },
    {
      number: "02",
      label: "Inspect",
      title: visual.row?.productName || "Object proof",
      body: visual.claim?.publicLine || visual.row?.focus || "Use the product object as the visual entry point.",
      receipt: visual.row?.receipt || "source needed",
      source: visual.row?.source,
      sourceLabel: visual.row?.sourceLabel,
      status: visual.row?.status || "label_visible",
    },
    {
      number: "03",
      label: "Verify",
      title: "Claim boundary",
      body: visual.claim?.offPage || cover.claim?.offPage || "Keep unverified formulation claims off the page.",
      receipt: visual.row?.receipt || cover.receipt || "source needed",
      source: visual.row?.source || cover.source,
      sourceLabel: visual.row?.sourceLabel || cover.sourceLabel,
      status: "source_review",
    },
    {
      number: "04",
      label: "Name Gap",
      title: gap.row?.productName || "Missing vintage",
      body: gap.claim?.publicLine || gap.row?.boundary || "Show the reader where the timeline is still unsupported.",
      receipt: gap.row?.receipt || "source needed",
      source: gap.row?.source,
      sourceLabel: gap.row?.sourceLabel,
      status: gap.row?.status || "missing_vintage_slot",
    },
    {
      number: "05",
      label: "Next Proof",
      title: economics.row?.productName || "Evidence handoff",
      body: economics.claim?.upgradeAction || economics.row?.next || "Hand off to the next source upgrade before analysis expands.",
      receipt: economics.row?.receipt || "source needed",
      source: economics.row?.source,
      sourceLabel: economics.row?.sourceLabel,
      status: economics.row?.status || "source_review",
    },
  ];
}

function pilotIssueStoryboardFrames(sequenceRows) {
  const treatments = {
    Open: "Cover lead",
    Inspect: "Object close-up",
    Verify: "Receipt zoom",
    "Name Gap": "Timeline gap",
    "Next Proof": "Reporting handoff",
  };
  return sequenceRows.map((row) => ({
    ...row,
    treatment: treatments[row.label] || "Story frame",
    caption: row.body || "Keep the reader-facing copy tied to the available evidence.",
    proofNote: row.receipt || "source needed",
    caveat: row.label === "Verify"
      ? row.body
      : "Do not expand this frame beyond the cited receipt and current review state.",
    unlock: row.label === "Next Proof"
      ? row.body
      : "Advance this frame only when the next evidence upgrade is attached.",
  }));
}

function pilotIssueCopyDraft(issueSpread, frames) {
  const cover = issueSpread.cover || {};
  const frameByLabel = new Map(frames.map((frame) => [frame.label, frame]));
  const open = frameByLabel.get("Open") || frames[0] || {};
  const inspect = frameByLabel.get("Inspect") || frames[1] || {};
  const verify = frameByLabel.get("Verify") || frames[2] || {};
  const gap = frameByLabel.get("Name Gap") || frames[3] || {};
  const next = frameByLabel.get("Next Proof") || frames[4] || {};
  return {
    headline: cover.productName || open.title || "Pilot product story",
    deck: open.caption || "A source-attributable product story with visible claim boundaries.",
    paragraphs: [
      {
        label: "Lede",
        body: open.caption || "Start with the strongest reader question the evidence can carry.",
        status: open.status || "source_review",
      },
      {
        label: "Object",
        body: inspect.caption || "Use the package object as the visual entry point.",
        status: inspect.status || "label_visible",
      },
      {
        label: "Boundary",
        body: verify.caveat || verify.caption || "Keep unsupported formulation claims off the page.",
        status: verify.status || "source_review",
      },
      {
        label: "Gap",
        body: gap.caption || "Show the reader where the timeline is still unsupported.",
        status: gap.status || "missing_vintage_slot",
      },
      {
        label: "Next",
        body: next.unlock || next.caption || "End with the next evidence upgrade needed for a stronger version.",
        status: next.status || "source_review",
      },
    ],
    sourceNotes: frames.map((frame) => ({
      number: frame.number,
      label: frame.label,
      receipt: frame.proofNote,
      caveat: frame.caveat,
      status: frame.status,
      source: frame.source,
      sourceLabel: frame.sourceLabel,
    })),
  };
}

function pilotIssueCopyDeskChecks(copyDraft) {
  const paragraphLabels = new Set(copyDraft.paragraphs.map((paragraph) => paragraph.label));
  const notesWithReceipts = copyDraft.sourceNotes.filter((note) => presentText(note.receipt));
  const notesWithCaveats = copyDraft.sourceNotes.filter((note) => presentText(note.caveat));
  const notesWithSources = copyDraft.sourceNotes.filter((note) => presentText(note.source));
  const firstSource = copyDraft.sourceNotes.find((note) => presentText(note.source)) || {};
  const checks = [
    {
      label: "Receipts Attached",
      passed: notesWithReceipts.length >= copyDraft.paragraphs.length,
      detail: `${formatNumber(notesWithReceipts.length)} receipt notes for ${formatNumber(copyDraft.paragraphs.length)} story paragraphs.`,
    },
    {
      label: "Caveats Visible",
      passed: notesWithCaveats.length >= copyDraft.sourceNotes.length,
      detail: `${formatNumber(notesWithCaveats.length)} of ${formatNumber(copyDraft.sourceNotes.length)} source notes carry caveat copy.`,
    },
    {
      label: "Gap Named",
      passed: paragraphLabels.has("Gap"),
      detail: "The draft includes an explicit gap paragraph instead of smoothing unsupported eras.",
    },
    {
      label: "Next Proof Handoff",
      passed: paragraphLabels.has("Next"),
      detail: "The draft ends with the next evidence upgrade rather than a stronger claim.",
    },
    {
      label: "Source Links Present",
      passed: notesWithSources.length >= copyDraft.sourceNotes.length,
      detail: `${formatNumber(notesWithSources.length)} of ${formatNumber(copyDraft.sourceNotes.length)} notes include source links.`,
    },
  ];
  return checks.map((check, index) => ({
    ...check,
    number: String(index + 1).padStart(2, "0"),
    status: check.passed ? "manual_verified" : "missing_vintage_slot",
    source: firstSource.source,
    sourceLabel: firstSource.sourceLabel,
  }));
}

function pilotIssuePublishPacket(copyDraft, checks) {
  const readyCount = checks.filter((check) => check.passed).length;
  const failedChecks = checks.filter((check) => !check.passed);
  const total = checks.length || 1;
  const firstSource = copyDraft.sourceNotes.find((note) => presentText(note.source)) || {};
  const verifyNote = copyDraft.sourceNotes.find((note) => note.label === "Verify") || {};
  const gapParagraph = copyDraft.paragraphs.find((paragraph) => paragraph.label === "Gap") || {};
  const nextParagraph = copyDraft.paragraphs.find((paragraph) => paragraph.label === "Next") || {};
  const packetStatus = failedChecks.length ? "source_review" : "manual_verified";
  return {
    headline: copyDraft.headline,
    deck: copyDraft.deck,
    readyCount,
    total,
    pct: Math.round((readyCount / total) * 100),
    status: packetStatus,
    source: firstSource.source,
    sourceLabel: firstSource.sourceLabel,
    lanes: [
      {
        label: "Ship With",
        title: "Draft story plus source notes",
        body: `${formatNumber(readyCount)} of ${formatNumber(total)} copy desk checks are ready for the visible draft.`,
        status: packetStatus,
      },
      {
        label: "Keep Visible",
        title: "Receipt and caveat rail",
        body: verifyNote.caveat || "Keep the claim boundary attached to the draft copy.",
        status: "source_review",
      },
      {
        label: "Hold",
        title: failedChecks.length ? "Unmet safeguards" : "Stronger claims",
        body: failedChecks.length
          ? failedChecks.map((check) => check.label).join("; ")
          : "Do not publish stronger formulation or economics claims without upgraded evidence.",
        status: failedChecks.length ? "missing_vintage_slot" : "source_review",
      },
      {
        label: "Next Version",
        title: "Evidence upgrade",
        body: nextParagraph.body || gapParagraph.body || "Attach the next proof object before expanding the story.",
        status: nextParagraph.status || "source_review",
      },
    ],
    receipts: copyDraft.sourceNotes.map((note) => ({
      number: note.number,
      label: note.label,
      receipt: note.receipt,
      status: note.status,
      source: note.source,
      sourceLabel: note.sourceLabel,
    })),
  };
}

function pilotIssueReleaseNote(copyDraft, publishPacket) {
  const firstReceipt = publishPacket.receipts.find((receipt) => presentText(receipt.source))
    || publishPacket.receipts[0]
    || {};
  const lede = copyDraft.paragraphs.find((paragraph) => paragraph.label === "Lede") || {};
  const boundaryLane = publishPacket.lanes.find((lane) => lane.label === "Keep Visible") || {};
  const holdLane = publishPacket.lanes.find((lane) => lane.label === "Hold") || {};
  const nextLane = publishPacket.lanes.find((lane) => lane.label === "Next Version") || {};
  return {
    headline: copyDraft.headline,
    deck: copyDraft.deck,
    status: publishPacket.status,
    source: firstReceipt.source,
    sourceLabel: firstReceipt.sourceLabel,
    readerNote: lede.body || copyDraft.deck,
    evidenceNote: `${formatNumber(publishPacket.readyCount)} of ${formatNumber(publishPacket.total)} safeguards are attached to this draft.`,
    visibleLimit: boundaryLane.body || "Keep the claim boundary attached to the draft copy.",
    heldClaim: holdLane.body || "Do not publish stronger claims without upgraded evidence.",
    nextProof: nextLane.body || "Attach the next proof object before expanding the story.",
    receiptCount: publishPacket.receipts.length,
  };
}

function pilotClaimMaturityRows(copyDraft, publishPacket, releaseNote, checks) {
  const checkByLabel = new Map(checks.map((check) => [check.label, check]));
  const paragraphByLabel = new Map(copyDraft.paragraphs.map((paragraph) => [paragraph.label, paragraph]));
  const firstReceipt = publishPacket.receipts.find((receipt) => presentText(receipt.source))
    || publishPacket.receipts[0]
    || {};
  const nextLane = publishPacket.lanes.find((lane) => lane.label === "Next Version") || {};
  const holdLane = publishPacket.lanes.find((lane) => lane.label === "Hold") || {};
  const rows = [
    {
      label: "Source Object",
      title: "A cited object anchors the story",
      body: paragraphByLabel.get("Object")?.body || releaseNote.readerNote,
      detail: checkByLabel.get("Receipts Attached")?.detail || releaseNote.evidenceNote,
      pct: checkByLabel.get("Receipts Attached")?.passed ? 100 : 52,
      status: checkByLabel.get("Receipts Attached")?.status || releaseNote.status,
    },
    {
      label: "Bounded Claim",
      title: "The claim stays inside the visible caveat",
      body: releaseNote.visibleLimit,
      detail: checkByLabel.get("Caveats Visible")?.detail || "Caveat copy remains attached to the story.",
      pct: checkByLabel.get("Caveats Visible")?.passed ? 100 : 58,
      status: checkByLabel.get("Caveats Visible")?.status || "source_review",
    },
    {
      label: "Gap Named",
      title: "Unsupported eras remain visible",
      body: paragraphByLabel.get("Gap")?.body || "Show the reader where the timeline is still unsupported.",
      detail: checkByLabel.get("Gap Named")?.detail || "The draft names the missing proof instead of smoothing it over.",
      pct: checkByLabel.get("Gap Named")?.passed ? 100 : 50,
      status: checkByLabel.get("Gap Named")?.status || "missing_vintage_slot",
    },
    {
      label: "Held Upgrade",
      title: "The stronger claim stays off page",
      body: releaseNote.heldClaim,
      detail: holdLane.title || "Stronger claims wait for upgraded evidence.",
      pct: releaseNote.status === "manual_verified" ? 72 : 44,
      status: holdLane.status || "source_review",
    },
    {
      label: "Next Proof",
      title: "The next version has a proof target",
      body: releaseNote.nextProof,
      detail: checkByLabel.get("Next Proof Handoff")?.detail || nextLane.title || "Attach the next proof object before expanding the story.",
      pct: checkByLabel.get("Next Proof Handoff")?.passed ? 100 : 62,
      status: checkByLabel.get("Next Proof Handoff")?.status || nextLane.status || "source_review",
    },
  ];
  return rows.map((row, index) => ({
    ...row,
    number: String(index + 1).padStart(2, "0"),
    source: firstReceipt.source,
    sourceLabel: firstReceipt.sourceLabel,
  }));
}

function pilotProofParagraphRows(copyDraft, publishPacket, releaseNote, claimMaturityRows) {
  const paragraphByLabel = new Map(copyDraft.paragraphs.map((paragraph) => [paragraph.label, paragraph]));
  const noteByLabel = new Map(copyDraft.sourceNotes.map((note) => [note.label, note]));
  const maturityByLabel = new Map(claimMaturityRows.map((row) => [row.label, row]));
  const firstReceipt = publishPacket.receipts.find((receipt) => presentText(receipt.source))
    || publishPacket.receipts[0]
    || {};
  const rowSpecs = [
    {
      paragraph: "Lede",
      note: "Open",
      maturity: "Source Object",
      treatment: "On-page lead",
      publishState: "Published",
      fallbackCopy: releaseNote.readerNote,
    },
    {
      paragraph: "Object",
      note: "Inspect",
      maturity: "Source Object",
      treatment: "Visual proof",
      publishState: "Published",
      fallbackCopy: releaseNote.readerNote,
    },
    {
      paragraph: "Boundary",
      note: "Verify",
      maturity: "Bounded Claim",
      treatment: "Visible caveat",
      publishState: "Bounded",
      fallbackCopy: releaseNote.visibleLimit,
    },
    {
      paragraph: "Gap",
      note: "Name Gap",
      maturity: "Gap Named",
      treatment: "Timeline gap",
      publishState: "Visible Gap",
      fallbackCopy: "Show the reader where the timeline is still unsupported.",
    },
    {
      paragraph: "Held Claim",
      note: "Verify",
      maturity: "Held Upgrade",
      treatment: "Off-page claim",
      publishState: "Held",
      fallbackCopy: releaseNote.heldClaim,
    },
    {
      paragraph: "Next",
      note: "Next Proof",
      maturity: "Next Proof",
      treatment: "Next version",
      publishState: "Next Proof",
      fallbackCopy: releaseNote.nextProof,
    },
  ];
  return rowSpecs.map((spec, index) => {
    const paragraph = paragraphByLabel.get(spec.paragraph) || {};
    const note = noteByLabel.get(spec.note) || {};
    const maturity = maturityByLabel.get(spec.maturity) || {};
    const status = spec.publishState === "Held"
      ? maturity.status || "source_review"
      : paragraph.status || note.status || maturity.status || releaseNote.status;
    return {
      number: String(index + 1).padStart(2, "0"),
      paragraphLabel: spec.paragraph,
      treatment: spec.treatment,
      publishState: spec.publishState,
      readerCopy: paragraph.body || spec.fallbackCopy || releaseNote.readerNote,
      receipt: note.receipt || maturity.detail || releaseNote.evidenceNote,
      caveat: spec.publishState === "Held"
        ? releaseNote.visibleLimit
        : note.caveat || maturity.body || releaseNote.visibleLimit,
      maturityLabel: maturity.label || spec.maturity,
      status,
      source: note.source || maturity.source || firstReceipt.source,
      sourceLabel: note.sourceLabel || maturity.sourceLabel || firstReceipt.sourceLabel,
    };
  });
}

function pilotReaderCitationRows(proofParagraphRows) {
  return proofParagraphRows.map((row, index) => ({
    number: String(index + 1).padStart(2, "0"),
    marker: `[${index + 1}]`,
    line: row.readerCopy,
    evidence: row.receipt,
    boundary: row.caveat,
    label: `${row.paragraphLabel} · ${row.publishState}`,
    treatment: row.treatment,
    status: row.status,
    source: row.source,
    sourceLabel: row.sourceLabel,
  }));
}

function pilotReaderTrustLedgerRows(readerCitationRows) {
  const total = readerCitationRows.length || 1;
  const rowsWithEvidence = readerCitationRows.filter((row) => presentText(row.evidence));
  const rowsWithBoundary = readerCitationRows.filter((row) => presentText(row.boundary));
  const heldRows = readerCitationRows.filter((row) => row.label.includes("Held"));
  const rowsWithSources = readerCitationRows.filter((row) => presentText(row.source));
  const firstSource = rowsWithSources[0] || readerCitationRows[0] || {};
  const pct = (count) => Math.round((count / total) * 100);
  return [
    {
      label: "Citation Coverage",
      value: `${formatNumber(rowsWithEvidence.length)}/${formatNumber(total)}`,
      pct: pct(rowsWithEvidence.length),
      body: "Every reader line should carry a proof object before it reads as a public claim.",
      status: rowsWithEvidence.length === total ? "manual_verified" : "source_review",
    },
    {
      label: "Caveat Coverage",
      value: `${formatNumber(rowsWithBoundary.length)}/${formatNumber(total)}`,
      pct: pct(rowsWithBoundary.length),
      body: "Caveats stay in the same frame as the text they limit.",
      status: rowsWithBoundary.length === total ? "manual_verified" : "source_review",
    },
    {
      label: "Held Claims",
      value: formatNumber(heldRows.length),
      pct: heldRows.length ? 74 : 100,
      body: heldRows.length
        ? "Stronger claims are visible as held, not smuggled into the article copy."
        : "No stronger claim is currently held outside the public copy.",
      status: heldRows.length ? "source_review" : "manual_verified",
    },
    {
      label: "Source Links",
      value: `${formatNumber(rowsWithSources.length)}/${formatNumber(total)}`,
      pct: pct(rowsWithSources.length),
      body: "Source links remain attached so readers can trace the evidence trail.",
      status: rowsWithSources.length === total ? "manual_verified" : "source_review",
    },
  ].map((row, index) => ({
    ...row,
    number: String(index + 1).padStart(2, "0"),
    source: firstSource.source,
    sourceLabel: firstSource.sourceLabel,
  }));
}

function pilotPublicStoryFooter(issueReleaseNote, readerCitationRows, readerTrustLedgerRows) {
  const total = readerCitationRows.length || 1;
  const rowsWithEvidence = readerCitationRows.filter((row) => presentText(row.evidence));
  const rowsWithSources = readerCitationRows.filter((row) => presentText(row.source));
  const heldRow = readerCitationRows.find((row) => row.label.includes("Held")) || {};
  const nextRow = readerCitationRows.find((row) => row.label.includes("Next Proof")) || {};
  const boundaryRow = readerCitationRows.find((row) => row.label.includes("Bounded")) || readerCitationRows[0] || {};
  const firstSource = rowsWithSources[0] || readerCitationRows[0] || {};
  const allReady = rowsWithEvidence.length === total && rowsWithSources.length === total;
  return {
    headline: issueReleaseNote.headline,
    status: allReady ? issueReleaseNote.status : "source_review",
    evidenceLine: `${formatNumber(rowsWithEvidence.length)} of ${formatNumber(total)} article lines include attached evidence.`,
    caveatLine: boundaryRow.boundary || issueReleaseNote.visibleLimit,
    heldLine: heldRow.line || issueReleaseNote.heldClaim,
    nextLine: nextRow.line || issueReleaseNote.nextProof,
    ledgerLabels: readerTrustLedgerRows.map((row) => `${row.label}: ${row.value}`),
    source: firstSource.source,
    sourceLabel: firstSource.sourceLabel,
  };
}

function pilotReaderShareCard(publicStoryFooter, readerTrustLedgerRows) {
  const citationMetric = readerTrustLedgerRows.find((row) => row.label === "Citation Coverage") || {};
  const caveatMetric = readerTrustLedgerRows.find((row) => row.label === "Caveat Coverage") || {};
  const heldMetric = readerTrustLedgerRows.find((row) => row.label === "Held Claims") || {};
  const sourceMetric = readerTrustLedgerRows.find((row) => row.label === "Source Links") || {};
  return {
    headline: publicStoryFooter.headline,
    deck: publicStoryFooter.evidenceLine,
    status: publicStoryFooter.status,
    source: publicStoryFooter.source,
    sourceLabel: publicStoryFooter.sourceLabel,
    chips: [
      { label: "Citations", value: citationMetric.value || "0/0", status: citationMetric.status || "source_review" },
      { label: "Caveats", value: caveatMetric.value || "0/0", status: caveatMetric.status || "source_review" },
      { label: "Held", value: heldMetric.value || "0", status: heldMetric.status || "source_review" },
      { label: "Sources", value: sourceMetric.value || "0/0", status: sourceMetric.status || "source_review" },
    ],
    lines: [
      {
        label: "What Readers Can Trust",
        body: publicStoryFooter.evidenceLine,
      },
      {
        label: "Keep Visible",
        body: publicStoryFooter.caveatLine,
      },
      {
        label: "Next Proof",
        body: publicStoryFooter.nextLine,
      },
    ],
  };
}

function pilotReaderDistributionRows(readerShareCard) {
  const trustLine = readerShareCard.lines.find((line) => line.label === "What Readers Can Trust") || {};
  const caveatLine = readerShareCard.lines.find((line) => line.label === "Keep Visible") || {};
  const nextLine = readerShareCard.lines.find((line) => line.label === "Next Proof") || {};
  const sourceChip = readerShareCard.chips.find((chip) => chip.label === "Sources") || {};
  return [
    {
      surface: "Product Page",
      label: "Timeline entry",
      body: trustLine.body || readerShareCard.deck,
      guardrail: caveatLine.body || "Keep the visible caveat attached.",
      proof: sourceChip.value || "0/0",
      status: readerShareCard.status,
    },
    {
      surface: "Story Index",
      label: "Browsable card",
      body: readerShareCard.deck,
      guardrail: "Show citation, caveat, held-claim, and source counts before the reader opens the story.",
      proof: readerShareCard.chips.map((chip) => `${chip.label} ${chip.value}`).join(" · "),
      status: readerShareCard.status,
    },
    {
      surface: "Share Preview",
      label: "Short social card",
      body: readerShareCard.headline,
      guardrail: nextLine.body || "Name the next proof before stronger claims travel outside the app.",
      proof: sourceChip.value || "0/0",
      status: readerShareCard.status,
    },
  ].map((row, index) => ({
    ...row,
    number: String(index + 1).padStart(2, "0"),
    source: readerShareCard.source,
    sourceLabel: readerShareCard.sourceLabel,
  }));
}

function pilotDistributionQaRows(readerDistributionRows) {
  const total = readerDistributionRows.length || 1;
  const rowsWithCopy = readerDistributionRows.filter((row) => presentText(row.body));
  const rowsWithGuardrails = readerDistributionRows.filter((row) => presentText(row.guardrail));
  const rowsWithProof = readerDistributionRows.filter((row) => presentText(row.proof));
  const rowsWithSources = readerDistributionRows.filter((row) => presentText(row.source));
  const firstSource = rowsWithSources[0] || readerDistributionRows[0] || {};
  const buildRow = (label, rows, body) => ({
    label,
    value: `${formatNumber(rows.length)}/${formatNumber(total)}`,
    passed: rows.length === total,
    body,
  });
  return [
    buildRow("Surface Copy", rowsWithCopy, "Every distribution surface has bounded reader copy ready to display."),
    buildRow("Guardrails", rowsWithGuardrails, "Each surface carries the caveat or next-proof boundary with the card."),
    buildRow("Proof Counts", rowsWithProof, "Proof counts stay visible when the story travels outside the article view."),
    buildRow("Source Links", rowsWithSources, "Source provenance remains attached for each destination surface."),
  ].map((row, index) => ({
    ...row,
    number: String(index + 1).padStart(2, "0"),
    status: row.passed ? "manual_verified" : "source_review",
    source: firstSource.source,
    sourceLabel: firstSource.sourceLabel,
  }));
}

function pilotStoryBeatNavigatorRows(issueReleaseNote, readerTrustLedgerRows, readerDistributionRows, distributionQaRows, bridgeRows) {
  const trustByLabel = new Map(readerTrustLedgerRows.map((row) => [row.label, row]));
  const citationMetric = trustByLabel.get("Citation Coverage") || {};
  const caveatMetric = trustByLabel.get("Caveat Coverage") || {};
  const heldMetric = trustByLabel.get("Held Claims") || {};
  const readyQaRows = distributionQaRows.filter((row) => row.passed);
  const sourceRows = [
    issueReleaseNote,
    citationMetric,
    caveatMetric,
    heldMetric,
    ...distributionQaRows,
    ...bridgeRows,
  ].filter((row) => presentText(row.source));
  const firstSource = sourceRows[0] || issueReleaseNote || {};
  const distributionSurfaces = readerDistributionRows.map((row) => row.surface).join(", ");
  const bridgeProducts = bridgeRows
    .map((row) => row.product?.display_name || row.product?.canonical_name || "")
    .filter(Boolean)
    .slice(0, 3)
    .join("; ");
  const rows = [
    {
      label: "Reader Hook",
      title: issueReleaseNote.headline || "The story needs a reader hook",
      body: issueReleaseNote.readerNote || "Start with the strongest supported story sentence before moving into proof.",
      metric: `${formatNumber(issueReleaseNote.receiptCount || 0)} receipts`,
      status: issueReleaseNote.status || "source_review",
      source: issueReleaseNote.source,
      sourceLabel: issueReleaseNote.sourceLabel,
    },
    {
      label: "Proof Basis",
      title: "Show the receipt before the claim",
      body: issueReleaseNote.evidenceNote || citationMetric.body || "Attach proof objects to each reader-facing claim.",
      metric: citationMetric.value || "0/0",
      status: citationMetric.status || issueReleaseNote.status || "source_review",
      source: citationMetric.source,
      sourceLabel: citationMetric.sourceLabel,
    },
    {
      label: "Visible Boundary",
      title: "Keep limits in frame",
      body: issueReleaseNote.visibleLimit || caveatMetric.body || "The caveat stays beside the statement it limits.",
      metric: `${caveatMetric.value || "0/0"} caveats`,
      status: caveatMetric.status || issueReleaseNote.status || "source_review",
      source: caveatMetric.source,
      sourceLabel: caveatMetric.sourceLabel,
    },
    {
      label: "Distribution",
      title: distributionSurfaces || "Story card destinations",
      body: "The same bounded card can travel only when copy, guardrails, proof counts, and source links remain attached.",
      metric: `${formatNumber(readyQaRows.length)}/${formatNumber(distributionQaRows.length || 0)} checks`,
      status: readyQaRows.length === distributionQaRows.length ? "manual_verified" : "source_review",
      source: distributionQaRows[0]?.source,
      sourceLabel: distributionQaRows[0]?.sourceLabel,
    },
    {
      label: "Next Proof",
      title: bridgeProducts || "Name the next proof object",
      body: issueReleaseNote.nextProof || "The next story version should move only after a proof object clears the visible gap.",
      metric: `${formatNumber(bridgeRows.length)} bridge leads`,
      status: heldMetric.status || "source_review",
      source: bridgeRows[0]?.source,
      sourceLabel: bridgeRows[0]?.sourceLabel,
    },
  ];
  return rows.map((row, index) => ({
    ...row,
    number: String(index + 1).padStart(2, "0"),
    source: row.source || firstSource.source,
    sourceLabel: row.sourceLabel || firstSource.sourceLabel,
  }));
}

function pilotVintageChapterRows(vintageRows) {
  return vintageRows.map((row, index) => {
    const productTotal = row.sourceSlots + row.gapSlots || 0;
    const visibleLine = row.claimSlots
      ? `${pluralize(row.claimSlots, "verified claim slot")} can support scoped product-specific history.`
      : row.visibleSlots
        ? `${pluralize(row.visibleSlots, "label-visible slot")} can become transcription work.`
        : row.sourceSlots
          ? `${pluralize(row.sourceSlots, "source lead")} make this a research chapter, not a formulation chapter.`
          : "No source-attributable product objects are attached for this era.";
    const boundaryLine = row.gapSlots
      ? `${pluralize(row.gapSlots, "product gap")} remain visible; do not smooth this era into continuity.`
      : "The chapter still stays SKU- and evidence-specific before any corpus-wide claim.";
    const nextLine = row.blockers.length
      ? `Prioritize ${row.blockers.join("; ")} for the next proof pass.`
      : row.visibleSlots
        ? "Move visible panels through transcription, correction, and reviewer attribution."
        : "Keep this chapter as a source-reviewed era until stronger proof is attached.";
    return {
      ...row,
      number: String(index + 1).padStart(2, "0"),
      metric: `${row.coveragePct}% sourced`,
      productTotal,
      visibleLine,
      boundaryLine,
      nextLine,
    };
  });
}

function pilotReaderSynopsis(issueReleaseNote, vintageChapterRows, dimensionRows, storyBeatNavigatorRows) {
  const firstSourceRow = [
    issueReleaseNote,
    ...storyBeatNavigatorRows,
    ...dimensionRows,
  ].find((row) => presentText(row.source)) || issueReleaseNote || {};
  const currentChapter = vintageChapterRows[0] || {};
  const earliestChapter = vintageChapterRows[vintageChapterRows.length - 1] || {};
  const visibleChapter = [...vintageChapterRows]
    .sort((a, b) => numeric(b.visibleSlots) - numeric(a.visibleSlots) || numeric(b.coveragePct) - numeric(a.coveragePct))[0] || {};
  const gapChapter = [...vintageChapterRows]
    .sort((a, b) => numeric(b.gapSlots) - numeric(a.gapSlots) || numeric(a.coveragePct) - numeric(b.coveragePct))[0] || {};
  const activeDimensions = dimensionRows
    .filter((row) => numeric(row.activeCount))
    .slice(0, 4);
  const dimensionNames = activeDimensions.map((row) => row.label).join(", ") || "source provenance";
  const rows = [
    {
      label: "Open",
      title: issueReleaseNote.headline || "The pilot story needs a headline",
      body: issueReleaseNote.readerNote || "Start with the strongest evidence-bounded reader line.",
      status: issueReleaseNote.status || "source_review",
      source: issueReleaseNote.source,
      sourceLabel: issueReleaseNote.sourceLabel,
    },
    {
      label: "Across Time",
      title: `${formatNumber(vintageChapterRows.length)} era chapters stay visible`,
      body: `${currentChapter.label || "Current"} is the present anchor, while ${earliestChapter.label || "the earliest chapter"} remains a separate proof state. The timeline should show those chapters as evidence states before implying ingredient continuity.`,
      status: visibleChapter.status || "source_review",
      source: firstSourceRow.source,
      sourceLabel: firstSourceRow.sourceLabel,
    },
    {
      label: "Change Lens",
      title: dimensionNames,
      body: `${dimensionNames} can sit beside the story only where evidence is attached. Ingredient, package, maker, and price language stay separated until the same object supports those dimensions.`,
      status: activeDimensions[0]?.status || "source_review",
      source: activeDimensions[0]?.source || firstSourceRow.source,
      sourceLabel: activeDimensions[0]?.sourceLabel || firstSourceRow.sourceLabel,
    },
    {
      label: "Boundary",
      title: gapChapter.gapSlots ? `${pluralize(gapChapter.gapSlots, "open gap")} in ${gapChapter.label}` : "Keep the caveat with the claim",
      body: issueReleaseNote.visibleLimit || gapChapter.boundaryLine || "Do not turn source leads into formulation history until the proof object and transcription are verified.",
      status: gapChapter.gapSlots ? "missing_vintage_slot" : issueReleaseNote.status || "source_review",
      source: firstSourceRow.source,
      sourceLabel: firstSourceRow.sourceLabel,
    },
    {
      label: "Close",
      title: "Next proof before stronger copy",
      body: issueReleaseNote.nextProof || "End the story with the next proof object, not a stronger claim.",
      status: "source_review",
      source: firstSourceRow.source,
      sourceLabel: firstSourceRow.sourceLabel,
    },
  ];
  return {
    headline: issueReleaseNote.headline || "Reader story synopsis",
    deck: issueReleaseNote.deck || issueReleaseNote.evidenceNote || "A proof-bounded story preview for the pilot corpus.",
    status: issueReleaseNote.status || "source_review",
    source: firstSourceRow.source,
    sourceLabel: firstSourceRow.sourceLabel,
    rows: rows.map((row, index) => ({
      ...row,
      number: String(index + 1).padStart(2, "0"),
      source: row.source || firstSourceRow.source,
      sourceLabel: row.sourceLabel || firstSourceRow.sourceLabel,
    })),
    rail: [
      {
        label: "Receipts",
        value: formatNumber(issueReleaseNote.receiptCount || 0),
        body: issueReleaseNote.evidenceNote,
        status: issueReleaseNote.status || "source_review",
      },
      {
        label: "Chapters",
        value: formatNumber(vintageChapterRows.length),
        body: `${visibleChapter.label || "A chapter"} has ${pluralize(visibleChapter.visibleSlots || 0, "visible slot")}.`,
        status: visibleChapter.status || "source_review",
      },
      {
        label: "Dimensions",
        value: formatNumber(activeDimensions.length),
        body: activeDimensions.map((row) => row.label).join("; ") || "No active dimensions under current filters.",
        status: activeDimensions[0]?.status || "source_review",
      },
      {
        label: "Held Claim",
        value: gapChapter.gapSlots ? formatNumber(gapChapter.gapSlots) : "0",
        body: issueReleaseNote.heldClaim,
        status: gapChapter.gapSlots ? "missing_vintage_slot" : "source_review",
      },
    ].map((row, index) => ({
      ...row,
      number: String(index + 1).padStart(2, "0"),
      source: firstSourceRow.source,
      sourceLabel: firstSourceRow.sourceLabel,
    })),
  };
}

function pilotBridgeRows(openerRows) {
  return openerRows.slice(0, 4).map((row) => {
    const unlockStatus = row.status === "manual_verified"
      ? "manual_verified"
      : row.status === "label_visible"
        ? "label_visible"
        : row.status === "usable_photo"
          ? "candidate_needs_panel"
          : "source_review";
    return {
      ...row,
      steps: [
        {
          label: "Object",
          title: row.object,
          body: row.lede,
          status: row.status,
        },
        {
          label: "Receipt",
          title: row.receipt,
          body: "Keep the source owner, date basis, and rights context visible before the story claims anything stronger.",
          status: "source_review",
        },
        {
          label: "Boundary",
          title: "Claim locked",
          body: row.lockedClaim,
          status: "missing_vintage_slot",
        },
        {
          label: "Unlock",
          title: "Next proof",
          body: row.proofNeed,
          status: unlockStatus,
        },
      ],
    };
  });
}

function pilotPatternNarrative(lane) {
  const narratives = {
    "Ingredient + Object": {
      pattern: "The product object can open the story, but ingredient-change language stays behind visible-label and transcription gates.",
      locked: "Do not infer formulation history from package fronts, ads, or nearby variants.",
      unlock: "Find readable ingredient panels, net weight, and reviewer-accepted transcription for each era.",
    },
    "Origin Gap": {
      pattern: "The strongest story is the gap itself: where source-attributable origin evidence exists and where it does not.",
      locked: "Do not fill the oldest label or launch-era formula from secondary claims without a readable object or document.",
      unlock: "Prioritize collector photos, museum records, trade catalogs, and archive captures with visible label text.",
    },
    "Formula + Package": {
      pattern: "Formula stories need package identity, flavor/SKU context, and disclosure text before any then-now comparison.",
      locked: "Do not collapse beverages, flavors, package formats, or markets into one product timeline.",
      unlock: "Align source date, package format, ingredient/disclosure text, and weight before comparing formula changes.",
    },
    "Document Timeline": {
      pattern: "Restaurant products read as document histories before formulation histories.",
      locked: "Do not treat menu, nutrition, allergen, and package documents as interchangeable proof.",
      unlock: "Tie each document to item identity, date, source owner, and disclosure scope.",
    },
    "Package + Maker": {
      pattern: "Maker and package changes can carry the story while formulation claims wait for label evidence.",
      locked: "Do not equate brand ownership, distributor text, or package refreshes with ingredient changes.",
      unlock: "Attach manufacturer/distributor text, package weight, label panel, and source receipt to the same evidence row.",
    },
  };
  return narratives[lane] || {
    pattern: "The pilot story can describe proof state, source venues, and open gates before claiming formulation change.",
    locked: "Do not strengthen the public claim until the proof object and date basis are explicit.",
    unlock: "Attach source owner, date, label visibility, and reviewer notes before advancing the story.",
  };
}

function pilotPatternRows(priorityRows) {
  const groups = new Map();
  priorityRows.forEach((row) => {
    const key = row.lane || "Product Story";
    const group = groups.get(key) || {
      lane: key,
      rows: [],
      scoreTotal: 0,
      candidates: 0,
      visible: 0,
      photos: 0,
      gaps: 0,
      collectionLanes: new Set(),
      sourceDomains: new Set(),
      topProducts: [],
    };
    group.rows.push(row);
    group.scoreTotal += row.score || 0;
    group.candidates += numeric(row.product.product_candidate_count);
    group.visible += row.facts.visibleLabels ? 1 : 0;
    group.photos += row.facts.usablePhotos ? 1 : 0;
    group.gaps += numeric(row.product.slots_without_sources);
    group.collectionLanes.add(row.collectionLane);
    row.sourceDomains.forEach((domain) => group.sourceDomains.add(domain));
    if (group.topProducts.length < 5) group.topProducts.push(row.product.display_name || row.product.canonical_name);
    groups.set(key, group);
  });
  return [...groups.values()]
    .map((group) => {
      const narrative = pilotPatternNarrative(group.lane);
      const leader = group.rows[0] || {};
      const avgScore = group.rows.length ? Math.round(group.scoreTotal / group.rows.length) : 0;
      const status = group.rows.some((row) => row.status === "manual_verified")
        ? "manual_verified"
        : group.rows.some((row) => row.status === "label_visible")
          ? "label_visible"
          : group.rows.some((row) => row.status === "usable_photo")
            ? "usable_photo"
            : "source_review";
      return {
        ...group,
        ...narrative,
        avgScore,
        status,
        collectionLaneList: [...group.collectionLanes].slice(0, 4),
        sourceDomainList: [...group.sourceDomains].slice(0, 4),
        leader,
        source: leader.source || "",
        sourceLabel: leader.sourceLabel || "Source",
      };
    })
    .sort((a, b) => b.rows.length - a.rows.length || b.avgScore - a.avgScore)
    .slice(0, 6);
}

function pilotDimensionDefinitions() {
  return [
    {
      key: "ingredient",
      label: "Ingredient Story",
      active: (row) => row.facts.manualLabels || row.facts.visibleLabels || row.facts.usablePhotos,
      status: (row) => row.facts.manualLabels ? "manual_verified" : row.facts.visibleLabels ? "label_visible" : row.facts.usablePhotos ? "usable_photo" : "candidate_needs_panel",
      evidence: (row) => row.facts.manualLabels
        ? "Verified label text can support scoped claims."
        : row.facts.visibleLabels
          ? "Visible panels can become transcription work."
          : row.facts.usablePhotos
            ? "Package photos can lead the story while claims stay locked."
            : "Readable panels are still needed.",
      locked: "Do not publish ingredient diffs until label text is readable, transcribed, and reviewed.",
      unlock: "Attach ingredient panel visibility, OCR/manual text, reviewer attribution, and source date for each vintage.",
    },
    {
      key: "package",
      label: "Package + Weight",
      active: (row) => row.facts.packageFields,
      status: (row) => row.facts.packageFields ? "label_visible" : "candidate_needs_panel",
      evidence: (row) => row.facts.packageFields ? "Net weight or serving fields are present." : "Package size fields are not yet captured.",
      locked: "Do not normalize prices or package changes from product name alone.",
      unlock: "Capture net weight, serving size, servings per container, and package format on the same evidence row.",
    },
    {
      key: "maker",
      label: "Maker Timeline",
      active: (row) => row.facts.orgFields,
      status: (row) => row.facts.orgFields ? "source_review" : "missing_vintage_slot",
      evidence: (row) => row.facts.orgFields ? "Manufacturer, distributor, or source-owner text is present." : "Maker/distributor text needs explicit source evidence.",
      locked: "Do not equate brand ownership or package refreshes with formulation change.",
      unlock: "Capture manufacturer, distributor, copyright, and source-owner text with date basis.",
    },
    {
      key: "economics",
      label: "Price Overlay",
      active: (row) => row.facts.priceFields,
      status: (row) => row.facts.priceFields ? "candidate_found" : "source_review",
      evidence: (row) => row.facts.priceFields ? "Price or unit-price evidence is present." : "Price linkage remains future analysis context.",
      locked: "Do not compare economics until package weight and SKU identity are aligned.",
      unlock: "Link price observations to SKU/package weight and evidence date before price-per-ounce or price-per-serving views.",
    },
    {
      key: "provenance",
      label: "Source Provenance",
      active: (row) => row.facts.sourceLinks || row.sourceDomains.length,
      status: (row) => row.facts.sourceLinks || row.sourceDomains.length ? "source_review" : "no_source",
      evidence: (row) => row.facts.sourceLinks || row.sourceDomains.length ? "Source links or source domains are attached." : "No attributable source is attached.",
      locked: "Do not turn a candidate into a claim without URL, owner, date basis, rights note, and review state.",
      unlock: "Attach source URL, owner/publisher, capture/date basis, rights note, and reviewer notes.",
    },
  ];
}

function pilotDimensionRows(priorityRows) {
  const targetRows = priorityRows.slice(0, 18);
  const total = Math.max(1, targetRows.length);
  return pilotDimensionDefinitions().map((definition) => {
    const activeRows = targetRows.filter((row) => definition.active(row));
    const sampleRows = (activeRows.length ? activeRows : targetRows).slice(0, 5);
    const statusCounts = {};
    sampleRows.forEach((row) => {
      const status = definition.status(row);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const status = Object.entries(statusCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "unknown";
    const leader = sampleRows[0] || {};
    return {
      ...definition,
      status,
      total,
      activeCount: activeRows.length,
      pct: Math.round((activeRows.length / total) * 100),
      products: sampleRows.map((row) => row.product.display_name || row.product.canonical_name),
      evidence: leader.product ? definition.evidence(leader) : "No pilot rows match this dimension.",
      source: leader.source || "",
      sourceLabel: leader.sourceLabel || "Source",
    };
  });
}

function renderCorpusPilotStoryboard(productRows) {
  if (!els.corpusPilotStoryboard) return;
  const targetRows = productRows.slice(0, 100);
  if (!targetRows.length) {
    els.corpusPilotStoryboard.innerHTML = `<p class="empty-note">No pilot products match the current filters.</p>`;
    return;
  }

  const vintageCount = state.data.vintages.length || 0;
  const totalSlots = targetRows.length * vintageCount;
  const sourceSlots = targetRows.reduce((sum, row) => sum + numeric(row.product.slots_with_sources), 0);
  const gapSlots = targetRows.reduce((sum, row) => sum + numeric(row.product.slots_without_sources), 0);
  const visibleProducts = targetRows.filter((row) => row.facts.visibleLabels).length;
  const claimProducts = targetRows.filter((row) => numeric(row.product.ground_truth_slots) || row.facts.manualLabels).length;
  const categoryCount = uniqueValues(targetRows.map((row) => row.product.category), 1000).length;
  const stageRows = pilotStageRows(productRows);
  const categoryRows = pilotCategoryRows(productRows);
  const vintageRows = pilotVintageRows(productRows);
  const priorityRows = pilotPrioritizationRows(productRows);
  const openerRows = pilotStoryOpeningRows(priorityRows);
  const episodeRows = pilotEpisodeRows(priorityRows);
  const scriptRows = pilotReaderScriptRows(episodeRows);
  const decisionRows = pilotDecisionRows(priorityRows);
  const packageRows = pilotPackagePlannerRows(episodeRows);
  const issueRows = pilotIssueSlotRows(packageRows);
  const issueSpineRows = pilotIssueSpineRows(issueRows);
  const issueReceiptRows = pilotIssueReceiptRows(issueRows);
  const issueClaimStackRows = pilotIssueClaimStackRows(issueRows);
  const issueSpread = pilotIssueSpreadModel(issueRows, issueClaimStackRows);
  const issueReadingSequence = pilotIssueReadingSequence(issueSpread);
  const issueStoryboardFrames = pilotIssueStoryboardFrames(issueReadingSequence);
  const issueCopyDraft = pilotIssueCopyDraft(issueSpread, issueStoryboardFrames);
  const issueCopyDeskChecks = pilotIssueCopyDeskChecks(issueCopyDraft);
  const issuePublishPacket = pilotIssuePublishPacket(issueCopyDraft, issueCopyDeskChecks);
  const issueReleaseNote = pilotIssueReleaseNote(issueCopyDraft, issuePublishPacket);
  const claimMaturityRows = pilotClaimMaturityRows(issueCopyDraft, issuePublishPacket, issueReleaseNote, issueCopyDeskChecks);
  const proofParagraphRows = pilotProofParagraphRows(issueCopyDraft, issuePublishPacket, issueReleaseNote, claimMaturityRows);
  const readerCitationRows = pilotReaderCitationRows(proofParagraphRows);
  const readerTrustLedgerRows = pilotReaderTrustLedgerRows(readerCitationRows);
  const publicStoryFooter = pilotPublicStoryFooter(issueReleaseNote, readerCitationRows, readerTrustLedgerRows);
  const readerShareCard = pilotReaderShareCard(publicStoryFooter, readerTrustLedgerRows);
  const readerDistributionRows = pilotReaderDistributionRows(readerShareCard);
  const distributionQaRows = pilotDistributionQaRows(readerDistributionRows);
  const bridgeRows = pilotBridgeRows(openerRows);
  const storyBeatNavigatorRows = pilotStoryBeatNavigatorRows(
    issueReleaseNote,
    readerTrustLedgerRows,
    readerDistributionRows,
    distributionQaRows,
    bridgeRows
  );
  const patternRows = pilotPatternRows(priorityRows);
  const dimensionRows = pilotDimensionRows(priorityRows);
  const vintageChapterRows = pilotVintageChapterRows(vintageRows);
  const readerSynopsis = pilotReaderSynopsis(issueReleaseNote, vintageChapterRows, dimensionRows, storyBeatNavigatorRows);

  els.corpusPilotStoryboard.innerHTML = `
    <article class="corpus-pilot">
      <header class="corpus-pilot-head">
        <div>
          <p class="eyebrow">100-Product Pilot</p>
          <h3>Story readiness before data collection resumes</h3>
          <p>This view turns the pilot corpus into a reader-facing map: what can be stated now, what is only a source lead, and which vintage chapters are still gaps.</p>
        </div>
        <aside class="corpus-pilot-score" aria-label="Pilot evidence scorecard">
          <span><strong>${formatNumber(targetRows.length)}</strong> products</span>
          <span><strong>${formatNumber(categoryCount)}</strong> categories</span>
          <span><strong>${formatNumber(sourceSlots)}</strong> of ${formatNumber(totalSlots)} sourced slots</span>
          <span><strong>${formatNumber(visibleProducts)}</strong> label-visible products</span>
        </aside>
      </header>
      <section class="corpus-pilot-funnel" aria-label="Pilot proof funnel">
        ${stageRows
          .map((row) => `
            <article class="corpus-pilot-stage status-${escapeHtml(row.status)}">
              <header>
                <span>${escapeHtml(row.label)}</span>
                <strong>${formatNumber(row.count)}</strong>
              </header>
              <div class="corpus-pilot-bar"><span style="width:${Math.max(3, row.pct)}%"></span></div>
              <p>${escapeHtml(row.detail)}</p>
              <div class="corpus-products">${escapeHtml(row.products.join("; ") || "No products in this stage")}</div>
            </article>
          `)
          .join("")}
      </section>
      <section class="corpus-pilot-priority" aria-label="Prioritized rich-evidence story targets">
        <div class="subsection-title">
          <strong>Rich Evidence Targets</strong>
          <span>Which pilot products should anchor source-attributable photo, label, package, and price/weight stories once collection resumes</span>
        </div>
        <div class="corpus-pilot-priority-grid">
          ${priorityRows
            .map((row, index) => `
              <article class="corpus-pilot-priority-card status-${escapeHtml(row.status)}">
                <header>
                  <span>${String(index + 1).padStart(2, "0")} ${escapeHtml(row.lane)}</span>
                  <strong>${escapeHtml(row.product.display_name || row.product.canonical_name)}</strong>
                  <em>${escapeHtml(row.collectionLane)}</em>
                </header>
                <div class="corpus-pilot-priority-score">
                  <span><strong>${formatNumber(row.score)}</strong> richness</span>
                  <span><strong>${formatNumber(row.product.product_candidate_count)}</strong> candidates</span>
                  <span><strong>${escapeHtml(row.product.slot_coverage_pct || 0)}%</strong> coverage</span>
                </div>
                <div class="story-vintage-grid">${productVintageCells(row.product)}</div>
                <p>${escapeHtml(pilotCanSay(row))}</p>
                <section class="corpus-pilot-next-proof">
                  <span>Next Proof</span>
                  <p>${escapeHtml(clipped(row.proofNeed, 150))}</p>
                </section>
                <footer>
                  <div class="story-source-path">
                    ${row.sourceDomains.map((domain) => `<span>${escapeHtml(domain)}</span>`).join("")}
                  </div>
                  <div class="lead-meta">
                    ${statusTag(row.status)}
                    ${linkOrText(row.source, row.sourceLabel)}
                  </div>
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-openers" aria-label="Pilot story openers">
        <div class="subsection-title">
          <strong>Story Openers</strong>
          <span>Top pilot targets as reader-facing openings, proof objects, receipts, locked claims, and next proof moves</span>
        </div>
        <div class="corpus-pilot-opener-grid">
          ${openerRows
            .map((row) => `
              <article class="corpus-pilot-opener-card status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(row.number)} ${escapeHtml(row.lane)}</span>
                  <strong>${escapeHtml(row.product.display_name || row.product.canonical_name)}</strong>
                  <em>${escapeHtml(row.object)}</em>
                </header>
                <section class="corpus-pilot-opener-lede">
                  <span>Reader Lede</span>
                  <p>${escapeHtml(row.lede)}</p>
                </section>
                <div class="corpus-pilot-opener-proof">
                  <section>
                    <span>Receipt</span>
                    <p>${escapeHtml(row.receipt)}</p>
                  </section>
                  <section>
                    <span>Locked Claim</span>
                    <p>${escapeHtml(row.lockedClaim)}</p>
                  </section>
                  <section>
                    <span>Next Proof</span>
                    <p>${escapeHtml(row.proofNeed)}</p>
                  </section>
                </div>
                <footer>
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-episodes" aria-label="Pilot story arc board">
        <div class="subsection-title">
          <strong>Story Arc Board</strong>
          <span>How rich pilot targets become beat-by-beat reader episodes without losing evidence limits</span>
        </div>
        <div class="corpus-pilot-episode-list">
          ${episodeRows
            .map((row) => `
              <article class="corpus-pilot-episode-row status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(`${row.number} ${row.lane}`)}</span>
                  <strong>${escapeHtml(row.product.display_name || row.product.canonical_name)}</strong>
                  <em>${escapeHtml(row.eraScope)}</em>
                </header>
                <div class="corpus-pilot-episode-track">
                  ${row.beats
                    .map((beat) => `
                      <section class="corpus-pilot-episode-beat status-${escapeHtml(beat.status)}">
                        <span>${escapeHtml(beat.label)}</span>
                        <strong>${escapeHtml(clipped(beat.title, 62))}</strong>
                        <p>${escapeHtml(clipped(beat.body, 128))}</p>
                      </section>
                    `)
                    .join("")}
                </div>
                <footer>
                  <div class="story-source-path">
                    ${row.sourceDomains.map((domain) => `<span>${escapeHtml(domain)}</span>`).join("")}
                  </div>
                  <div class="lead-meta">
                    ${statusTag(row.status)}
                    ${linkOrText(row.source, row.sourceLabel)}
                  </div>
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-scripts" aria-label="Pilot reader script panels">
        <div class="subsection-title">
          <strong>Reader Script Panels</strong>
          <span>Draft story treatments that keep the publishable line, source caption, caveat, and next reporting move together</span>
        </div>
        <div class="corpus-pilot-script-grid">
          ${scriptRows
            .map((row) => `
              <article class="corpus-pilot-script-card status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(`${row.number} ${row.changeLens}`)}</span>
                  <strong>${escapeHtml(row.headline)}</strong>
                  <em>${escapeHtml(row.deck)}</em>
                </header>
                <section class="corpus-pilot-script-caption">
                  <span>Opening Caption</span>
                  <p>${escapeHtml(row.caption)}</p>
                </section>
                <div class="corpus-pilot-script-columns">
                  <section>
                    <span>Reader Can Believe</span>
                    <p>${escapeHtml(row.canSay)}</p>
                  </section>
                  <section>
                    <span>Off The Page</span>
                    <p>${escapeHtml(row.cannotSay)}</p>
                  </section>
                  <section>
                    <span>Next Reporting Move</span>
                    <p>${escapeHtml(row.nextMove)}</p>
                  </section>
                </div>
                <footer>
                  <span>${escapeHtml(row.receipt)}</span>
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-decisions" aria-label="Pilot editorial decision lanes">
        <div class="subsection-title">
          <strong>Editorial Decision Lanes</strong>
          <span>Which story packages can be pitched, held, object-led, gap-led, or kept as price/weight sidebars</span>
        </div>
        <div class="corpus-pilot-decision-grid">
          ${decisionRows
            .map((row, index) => `
              <article class="corpus-pilot-decision-card status-${escapeHtml(row.empty ? "missing_vintage_slot" : row.status)}">
                <header>
                  <span>${String(index + 1).padStart(2, "0")} Decision Lane</span>
                  <strong>${escapeHtml(row.label)}</strong>
                  <em>${formatNumber(row.count)} of ${formatNumber(row.total)} rich targets</em>
                </header>
                <div class="corpus-pilot-decision-meter">
                  <span style="width:${Math.max(3, Math.min(100, row.pct))}%"></span>
                </div>
                <p>${escapeHtml(row.framing)}</p>
                <dl>
                  <dt>Products</dt>
                  <dd>${escapeHtml(row.products.join("; ") || "No matching pilot products")}</dd>
                  <dt>Hold</dt>
                  <dd>${escapeHtml(row.hold)}</dd>
                  <dt>Next Editorial Move</dt>
                  <dd>${escapeHtml(row.action)}</dd>
                </dl>
                <footer>
                  ${statusTag(row.empty ? "missing_vintage_slot" : row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-packages" aria-label="Pilot release package planner">
        <div class="subsection-title">
          <strong>Release Package Planner</strong>
          <span>What each lead can ship as now, what stays held, and what evidence upgrades the next version</span>
        </div>
        <div class="corpus-pilot-package-grid">
          ${packageRows
            .map((row) => `
              <article class="corpus-pilot-package-card status-${escapeHtml(row.release.status)}">
                <header>
                  <span>${escapeHtml(`${row.number} ${row.release.version}`)}</span>
                  <strong>${escapeHtml(row.product.display_name || row.product.canonical_name)}</strong>
                  <em>${escapeHtml(row.release.label)}</em>
                </header>
                <dl>
                  <dt>Ship With</dt>
                  <dd>${escapeHtml(row.shipWith)}</dd>
                  <dt>Hold Until</dt>
                  <dd>${escapeHtml(row.holdUntil)}</dd>
                  <dt>Upgrade Path</dt>
                  <dd>${escapeHtml(row.upgrade)}</dd>
                </dl>
                <footer>
                  <span>${escapeHtml(row.receipt)}</span>
                  ${statusTag(row.release.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-issue" aria-label="Pilot reader issue layout">
        <div class="subsection-title">
          <strong>Reader Issue Layout</strong>
          <span>How the pilot release packages become a reader-facing issue while preserving caveats and evidence gaps</span>
        </div>
        <div class="corpus-pilot-issue-layout">
          ${issueRows
            .map((row) => `
              <article class="corpus-pilot-issue-card status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(`${row.number} ${row.packageType}`)}</span>
                  <strong>${escapeHtml(row.label)}</strong>
                  <em>${escapeHtml(row.productName)}</em>
                </header>
                <p>${escapeHtml(row.role)}</p>
                <dl>
                  <dt>Reader Focus</dt>
                  <dd>${escapeHtml(row.focus)}</dd>
                  <dt>Evidence On Page</dt>
                  <dd>${escapeHtml(row.evidence)}</dd>
                  <dt>Boundary</dt>
                  <dd>${escapeHtml(row.boundary)}</dd>
                  <dt>Next Version</dt>
                  <dd>${escapeHtml(row.next)}</dd>
                </dl>
                <footer>
                  <span>${escapeHtml(row.receipt)}</span>
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-issue-spine" aria-label="Pilot reader issue spine">
        <div class="subsection-title">
          <strong>Issue Spine</strong>
          <span>The reading order from public hook to visual proof, explicit gap, and economic context</span>
        </div>
        <div class="corpus-pilot-issue-spine-track">
          ${issueSpineRows
            .map((row) => `
              <article class="corpus-pilot-issue-spine-step status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(`${row.number} ${row.move}`)}</span>
                  <strong>${escapeHtml(row.productName)}</strong>
                  <em>${escapeHtml(row.label)}</em>
                </header>
                <section>
                  <span>Reader Move</span>
                  <p>${escapeHtml(clipped(row.focus, 118))}</p>
                </section>
                <section>
                  <span>Boundary</span>
                  <p>${escapeHtml(clipped(row.boundary, 118))}</p>
                </section>
                <footer>
                  <span>${escapeHtml(row.receipt)}</span>
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
          `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-issue-receipts" aria-label="Pilot issue receipt strip">
        <div class="subsection-title">
          <strong>Issue Receipt Strip</strong>
          <span>Source receipt, claim boundary, and unlock condition for every reader-facing slot</span>
        </div>
        <div class="corpus-pilot-issue-receipt-grid">
          ${issueReceiptRows
            .map((row) => `
              <article class="corpus-pilot-issue-receipt-card status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(`${row.number} ${row.label}`)}</span>
                  <strong>${escapeHtml(row.productName)}</strong>
                  <em>${escapeHtml(row.packageType)}</em>
                </header>
                <dl>
                  <dt>Receipt</dt>
                  <dd>${escapeHtml(row.receipt)}</dd>
                  <dt>Supports</dt>
                  <dd>${escapeHtml(row.supported)}</dd>
                  <dt>Boundary</dt>
                  <dd>${escapeHtml(row.hold)}</dd>
                  <dt>Unlock</dt>
                  <dd>${escapeHtml(row.unlock)}</dd>
                </dl>
                <footer>
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
          `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-claim-stack" aria-label="Pilot issue claim stack">
        <div class="subsection-title">
          <strong>Issue Claim Stack</strong>
          <span>Public story line, permitted evidence language, off-page claim, and upgrade action for each issue slot</span>
        </div>
        <div class="corpus-pilot-claim-stack-grid">
          ${issueClaimStackRows
            .map((row) => `
              <article class="corpus-pilot-claim-stack-card status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(`${row.number} ${row.label}`)}</span>
                  <strong>${escapeHtml(row.productName)}</strong>
                  <em>${escapeHtml(row.receipt)}</em>
                </header>
                <div class="corpus-pilot-claim-stack-lines">
                  <section>
                    <span>Reader Sees</span>
                    <p>${escapeHtml(row.publicLine)}</p>
                  </section>
                  <section>
                    <span>Can Say</span>
                    <p>${escapeHtml(clipped(row.canSay, 132))}</p>
                  </section>
                  <section>
                    <span>Off Page</span>
                    <p>${escapeHtml(clipped(row.offPage, 132))}</p>
                  </section>
                  <section>
                    <span>Unlock</span>
                    <p>${escapeHtml(clipped(row.upgradeAction, 132))}</p>
                  </section>
                </div>
                <footer>
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
          `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-spread-preview" aria-label="Pilot reader spread preview">
        <div class="subsection-title">
          <strong>Reader Spread Preview</strong>
          <span>How the same issue slots could read as a public story package with receipts and caveats still visible</span>
        </div>
        <div class="corpus-pilot-spread-shell">
          <article class="corpus-pilot-spread-cover status-${escapeHtml(issueSpread.cover.status)}">
            <header>
              <span>${escapeHtml(`${issueSpread.cover.number || "01"} Issue Lead`)}</span>
              <strong>${escapeHtml(issueSpread.cover.productName || "Pilot product story")}</strong>
              <em>${escapeHtml(issueSpread.cover.label || "Cover Story")}</em>
            </header>
            <p>${escapeHtml(issueSpread.cover.focus || "Lead with the clearest story the evidence can support.")}</p>
            <div class="corpus-pilot-spread-cover-grid">
              <section>
                <span>Can Say</span>
                <p>${escapeHtml(clipped(issueSpread.cover.claim?.canSay || issueSpread.cover.evidence || "", 150))}</p>
              </section>
              <section>
                <span>Keep Visible</span>
                <p>${escapeHtml(clipped(issueSpread.cover.claim?.offPage || issueSpread.cover.boundary || "", 150))}</p>
              </section>
            </div>
            <footer>
              <span>${escapeHtml(issueSpread.cover.receipt || "source needed")}</span>
              ${statusTag(issueSpread.cover.status)}
              ${linkOrText(issueSpread.cover.source, issueSpread.cover.sourceLabel)}
            </footer>
          </article>
          <div class="corpus-pilot-spread-panels">
            ${issueSpread.panels
              .map((panel) => `
                <article class="corpus-pilot-spread-panel status-${escapeHtml(panel.row.status)}">
                  <figure aria-hidden="true">
                    <span>${escapeHtml(panel.treatment)}</span>
                    <strong>${escapeHtml(panel.row.productName || "Product story")}</strong>
                  </figure>
                  <section>
                    <span>${escapeHtml(panel.label)}</span>
                    <strong>${escapeHtml(panel.row.label || "Issue slot")}</strong>
                    <p>${escapeHtml(clipped(panel.claim?.publicLine || panel.row.focus || "", 132))}</p>
                    <em>${escapeHtml(clipped(panel.claim?.offPage || panel.row.boundary || "", 132))}</em>
                  </section>
                </article>
              `)
              .join("")}
          </div>
          <aside class="corpus-pilot-spread-receipts" aria-label="Pilot spread source rail">
            <strong>Source Rail</strong>
            ${issueSpread.receipts
              .map((row) => `
                <section class="status-${escapeHtml(row.status)}">
                  <span>${escapeHtml(`${row.number} ${row.label}`)}</span>
                  <p>${escapeHtml(row.receipt || "source needed")}</p>
                  <footer>
                    ${statusTag(row.status)}
                    ${linkOrText(row.source, row.sourceLabel)}
                  </footer>
                </section>
              `)
              .join("")}
          </aside>
        </div>
      </section>
      <section class="corpus-pilot-reading-sequence" aria-label="Pilot issue reading sequence">
        <div class="subsection-title">
          <strong>Reading Sequence</strong>
          <span>The reader path through hook, object proof, verification boundary, gap, and next-proof handoff</span>
        </div>
        <div class="corpus-pilot-reading-sequence-track">
          ${issueReadingSequence
            .map((step) => `
              <article class="corpus-pilot-reading-sequence-step status-${escapeHtml(step.status)}">
                <header>
                  <span>${escapeHtml(`${step.number} ${step.label}`)}</span>
                  <strong>${escapeHtml(step.title)}</strong>
                </header>
                <p>${escapeHtml(clipped(step.body, 140))}</p>
                <footer>
                  <span>${escapeHtml(step.receipt)}</span>
                  ${statusTag(step.status)}
                  ${linkOrText(step.source, step.sourceLabel)}
                </footer>
              </article>
          `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-storyboard-frames" aria-label="Pilot storyboard frames">
        <div class="subsection-title">
          <strong>Storyboard Frames</strong>
          <span>Frame-level caption, proof note, caveat, and unlock copy for the reader issue</span>
        </div>
        <div class="corpus-pilot-storyboard-frame-grid">
          ${issueStoryboardFrames
            .map((frame) => `
              <article class="corpus-pilot-storyboard-frame status-${escapeHtml(frame.status)}">
                <figure aria-hidden="true">
                  <span>${escapeHtml(`${frame.number} ${frame.treatment}`)}</span>
                  <strong>${escapeHtml(frame.title)}</strong>
                </figure>
                <section class="corpus-pilot-storyboard-frame-copy">
                  <span>${escapeHtml(frame.label)}</span>
                  <p>${escapeHtml(clipped(frame.caption, 144))}</p>
                </section>
                <dl>
                  <dt>Proof Note</dt>
                  <dd>${escapeHtml(clipped(frame.proofNote, 118))}</dd>
                  <dt>Caveat</dt>
                  <dd>${escapeHtml(clipped(frame.caveat, 118))}</dd>
                  <dt>Unlock</dt>
                  <dd>${escapeHtml(clipped(frame.unlock, 118))}</dd>
                </dl>
                <footer>
                  ${statusTag(frame.status)}
                  ${linkOrText(frame.source, frame.sourceLabel)}
                </footer>
              </article>
          `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-copy-draft" aria-label="Pilot reader copy draft">
        <div class="subsection-title">
          <strong>Reader Copy Draft</strong>
          <span>A draft article surface assembled from the frames, with source notes and caveats still attached</span>
        </div>
        <article class="corpus-pilot-copy-draft-shell">
          <header class="corpus-pilot-copy-draft-head">
            <span>Draft Story</span>
            <strong>${escapeHtml(issueCopyDraft.headline)}</strong>
            <p>${escapeHtml(clipped(issueCopyDraft.deck, 220))}</p>
          </header>
          <div class="corpus-pilot-copy-draft-body">
            ${issueCopyDraft.paragraphs
              .map((paragraph) => `
                <section class="status-${escapeHtml(paragraph.status)}">
                  <span>${escapeHtml(paragraph.label)}</span>
                  <p>${escapeHtml(paragraph.body)}</p>
                </section>
              `)
              .join("")}
          </div>
          <aside class="corpus-pilot-copy-draft-notes" aria-label="Draft story source notes">
            <strong>Source Notes</strong>
            ${issueCopyDraft.sourceNotes
              .map((note) => `
                <section class="status-${escapeHtml(note.status)}">
                  <span>${escapeHtml(`${note.number} ${note.label}`)}</span>
                  <p>${escapeHtml(clipped(note.receipt, 120))}</p>
                  <em>${escapeHtml(clipped(note.caveat, 120))}</em>
                  <footer>
                    ${statusTag(note.status)}
                    ${linkOrText(note.source, note.sourceLabel)}
                  </footer>
                </section>
              `)
              .join("")}
          </aside>
        </article>
      </section>
      <section class="corpus-pilot-copy-desk" aria-label="Pilot copy desk checklist">
        <div class="subsection-title">
          <strong>Copy Desk Checklist</strong>
          <span>Publication safeguards for the draft: receipts, caveats, gaps, handoff, and source links</span>
        </div>
        <div class="corpus-pilot-copy-desk-grid">
          ${issueCopyDeskChecks
            .map((check) => `
              <article class="corpus-pilot-copy-desk-card status-${escapeHtml(check.status)}">
                <header>
                  <span>${escapeHtml(`${check.number} ${check.passed ? "Ready" : "Hold"}`)}</span>
                  <strong>${escapeHtml(check.label)}</strong>
                </header>
                <p>${escapeHtml(check.detail)}</p>
                <footer>
                  ${statusTag(check.status)}
                  ${linkOrText(check.source, check.sourceLabel)}
                </footer>
              </article>
          `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-publish-packet" aria-label="Pilot publish packet">
        <div class="subsection-title">
          <strong>Publish Packet</strong>
          <span>Release handoff for the reader draft, with readiness score, held claims, and attached receipts</span>
        </div>
        <article class="corpus-pilot-publish-packet-shell status-${escapeHtml(issuePublishPacket.status)}">
          <header class="corpus-pilot-publish-packet-head">
            <span>Release Candidate</span>
            <strong>${escapeHtml(issuePublishPacket.headline)}</strong>
            <p>${escapeHtml(clipped(issuePublishPacket.deck, 180))}</p>
            <div class="corpus-pilot-publish-meter" aria-label="Publish readiness">
              <span style="width:${Math.max(3, issuePublishPacket.pct)}%"></span>
            </div>
            <em>${formatNumber(issuePublishPacket.readyCount)} of ${formatNumber(issuePublishPacket.total)} safeguards ready</em>
          </header>
          <div class="corpus-pilot-publish-lanes">
            ${issuePublishPacket.lanes
              .map((lane) => `
                <section class="status-${escapeHtml(lane.status)}">
                  <span>${escapeHtml(lane.label)}</span>
                  <strong>${escapeHtml(lane.title)}</strong>
                  <p>${escapeHtml(clipped(lane.body, 150))}</p>
                </section>
              `)
              .join("")}
          </div>
          <aside class="corpus-pilot-publish-receipts" aria-label="Publish packet attached receipts">
            <strong>Attached Receipts</strong>
            ${issuePublishPacket.receipts
              .map((receipt) => `
                <section class="status-${escapeHtml(receipt.status)}">
                  <span>${escapeHtml(`${receipt.number} ${receipt.label}`)}</span>
                  <p>${escapeHtml(clipped(receipt.receipt, 96))}</p>
                  <footer>
                    ${statusTag(receipt.status)}
                    ${linkOrText(receipt.source, receipt.sourceLabel)}
                  </footer>
                </section>
              `)
              .join("")}
          </aside>
        </article>
      </section>
      <section class="corpus-pilot-release-note" aria-label="Pilot reader release note">
        <div class="subsection-title">
          <strong>Reader Release Note</strong>
          <span>Public-facing footer copy that keeps the receipt count, claim boundary, held claim, and next proof visible</span>
        </div>
        <article class="corpus-pilot-release-note-shell status-${escapeHtml(issueReleaseNote.status)}">
          <header>
            <span>Public Note</span>
            <strong>${escapeHtml(issueReleaseNote.headline)}</strong>
            <p>${escapeHtml(clipped(issueReleaseNote.readerNote, 220))}</p>
          </header>
          <div class="corpus-pilot-release-note-grid">
            <section>
              <span>Evidence Status</span>
              <p>${escapeHtml(issueReleaseNote.evidenceNote)}</p>
            </section>
            <section>
              <span>Visible Limit</span>
              <p>${escapeHtml(clipped(issueReleaseNote.visibleLimit, 150))}</p>
            </section>
            <section>
              <span>Held Claim</span>
              <p>${escapeHtml(clipped(issueReleaseNote.heldClaim, 150))}</p>
            </section>
            <section>
              <span>Next Proof</span>
              <p>${escapeHtml(clipped(issueReleaseNote.nextProof, 150))}</p>
            </section>
          </div>
          <footer>
            <span>${formatNumber(issueReleaseNote.receiptCount)} attached receipts</span>
            ${statusTag(issueReleaseNote.status)}
            ${linkOrText(issueReleaseNote.source, issueReleaseNote.sourceLabel)}
          </footer>
        </article>
      </section>
      <section class="corpus-pilot-reader-synopsis" aria-label="Pilot reader story synopsis">
        <div class="subsection-title">
          <strong>Reader Story Synopsis</strong>
          <span>A composed story preview that keeps era chapters, change dimensions, caveats, and source provenance in the same frame</span>
        </div>
        <div class="corpus-pilot-reader-synopsis-shell status-${escapeHtml(readerSynopsis.status)}">
          <article class="corpus-pilot-reader-synopsis-main">
            <header>
              <span>Public Preview</span>
              <strong>${escapeHtml(readerSynopsis.headline)}</strong>
              <p>${escapeHtml(clipped(readerSynopsis.deck, 170))}</p>
            </header>
            <div class="corpus-pilot-reader-synopsis-copy">
              ${readerSynopsis.rows
                .map((row) => `
                  <section class="status-${escapeHtml(row.status)}">
                    <span>${escapeHtml(`${row.number} ${row.label}`)}</span>
                    <strong>${escapeHtml(row.title)}</strong>
                    <p>${escapeHtml(clipped(row.body, 170))}</p>
                    <footer>
                      ${statusTag(row.status)}
                      ${linkOrText(row.source, row.sourceLabel)}
                    </footer>
                  </section>
                `)
                .join("")}
            </div>
          </article>
          <aside class="corpus-pilot-reader-synopsis-rail" aria-label="Synopsis proof rail">
            ${readerSynopsis.rail
              .map((row) => `
                <section class="status-${escapeHtml(row.status)}">
                  <span>${escapeHtml(`${row.number} ${row.label}`)}</span>
                  <strong>${escapeHtml(row.value)}</strong>
                  <p>${escapeHtml(clipped(row.body, 112))}</p>
                  <footer>
                    ${statusTag(row.status)}
                    ${linkOrText(row.source, row.sourceLabel)}
                  </footer>
                </section>
              `)
              .join("")}
          </aside>
        </div>
      </section>
      <section class="corpus-pilot-claim-maturity" aria-label="Pilot reader claim maturity ladder">
        <div class="subsection-title">
          <strong>Claim Maturity Ladder</strong>
          <span>How the reader claim moves from source object to bounded statement, named gap, held upgrade, and next proof</span>
        </div>
        <div class="corpus-pilot-claim-maturity-track">
          ${claimMaturityRows
            .map((row) => `
              <article class="corpus-pilot-claim-maturity-step status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(`${row.number} ${row.label}`)}</span>
                  <strong>${escapeHtml(row.title)}</strong>
                </header>
                <div class="corpus-pilot-claim-maturity-meter" aria-label="${escapeHtml(`${row.label} readiness`)}">
                  <span style="width:${Math.max(4, Math.min(100, row.pct))}%"></span>
                </div>
                <p>${escapeHtml(clipped(row.body, 150))}</p>
                <footer>
                  <span>${escapeHtml(clipped(row.detail, 105))}</span>
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-proof-map" aria-label="Pilot proof to paragraph map">
        <div class="subsection-title">
          <strong>Proof-To-Paragraph Map</strong>
          <span>Each reader paragraph linked to its receipt, caveat, maturity step, and publish treatment</span>
        </div>
        <div class="corpus-pilot-proof-map-list">
          ${proofParagraphRows
            .map((row) => `
              <article class="corpus-pilot-proof-map-row status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(`${row.number} ${row.publishState}`)}</span>
                  <strong>${escapeHtml(row.paragraphLabel)}</strong>
                  <em>${escapeHtml(row.treatment)}</em>
                </header>
                <section class="corpus-pilot-proof-map-copy">
                  <span>Reader Copy</span>
                  <p>${escapeHtml(clipped(row.readerCopy, 155))}</p>
                </section>
                <section class="corpus-pilot-proof-map-proof">
                  <span>Receipt And Caveat</span>
                  <p>${escapeHtml(clipped(row.receipt, 118))}</p>
                  <em>${escapeHtml(clipped(row.caveat, 118))}</em>
                </section>
                <footer>
                  <span>${escapeHtml(row.maturityLabel)}</span>
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-citation-trail" aria-label="Pilot reader citation trail">
        <div class="subsection-title">
          <strong>Reader Citation Trail</strong>
          <span>Footnote-style evidence rail for the article: citation marker, proof object, visible caveat, and source link</span>
        </div>
        <div class="corpus-pilot-citation-trail-shell">
          <article class="corpus-pilot-citation-story">
            <header>
              <span>Annotated Story Excerpt</span>
              <strong>${escapeHtml(issueReleaseNote.headline)}</strong>
            </header>
            <ol>
              ${readerCitationRows
                .map((row) => `
                  <li class="status-${escapeHtml(row.status)}">
                    <span>${escapeHtml(row.marker)}</span>
                    <p>${escapeHtml(clipped(row.line, 128))}</p>
                  </li>
                `)
                .join("")}
            </ol>
          </article>
          <aside class="corpus-pilot-citation-notes" aria-label="Reader citation notes">
            ${readerCitationRows
              .map((row) => `
                <section class="status-${escapeHtml(row.status)}">
                  <header>
                    <span>${escapeHtml(`${row.marker} ${row.label}`)}</span>
                    <strong>${escapeHtml(row.treatment)}</strong>
                  </header>
                  <p>${escapeHtml(clipped(row.evidence, 112))}</p>
                  <em>${escapeHtml(clipped(row.boundary, 112))}</em>
                  <footer>
                    ${statusTag(row.status)}
                    ${linkOrText(row.source, row.sourceLabel)}
                  </footer>
                </section>
              `)
              .join("")}
          </aside>
        </div>
      </section>
      <section class="corpus-pilot-trust-ledger" aria-label="Pilot reader trust ledger">
        <div class="subsection-title">
          <strong>Reader Trust Ledger</strong>
          <span>Publication-level proof signals distilled from the citation trail: coverage, caveats, held claims, and source links</span>
        </div>
        <div class="corpus-pilot-trust-ledger-grid">
          ${readerTrustLedgerRows
            .map((row) => `
              <article class="corpus-pilot-trust-ledger-card status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(`${row.number} ${row.label}`)}</span>
                  <strong>${escapeHtml(row.value)}</strong>
                </header>
                <div class="corpus-pilot-trust-ledger-meter" aria-label="${escapeHtml(`${row.label} score`)}">
                  <span style="width:${Math.max(4, Math.min(100, row.pct))}%"></span>
                </div>
                <p>${escapeHtml(row.body)}</p>
                <footer>
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-public-footer" aria-label="Pilot public story footer">
        <div class="subsection-title">
          <strong>Public Story Footer</strong>
          <span>Reader-facing endnote copy that closes the article with evidence basis, caveat, held claim, and next proof</span>
        </div>
        <article class="corpus-pilot-public-footer-shell status-${escapeHtml(publicStoryFooter.status)}">
          <header>
            <span>Story Endnote</span>
            <strong>${escapeHtml(publicStoryFooter.headline)}</strong>
            <p>${escapeHtml(publicStoryFooter.evidenceLine)}</p>
          </header>
          <div class="corpus-pilot-public-footer-copy">
            <section>
              <span>Visible Caveat</span>
              <p>${escapeHtml(clipped(publicStoryFooter.caveatLine, 145))}</p>
            </section>
            <section>
              <span>Held Claim</span>
              <p>${escapeHtml(clipped(publicStoryFooter.heldLine, 145))}</p>
            </section>
            <section>
              <span>Next Proof</span>
              <p>${escapeHtml(clipped(publicStoryFooter.nextLine, 145))}</p>
            </section>
          </div>
          <footer>
            <div class="corpus-pilot-public-footer-ledger">
              ${publicStoryFooter.ledgerLabels
                .map((label) => `<span>${escapeHtml(label)}</span>`)
                .join("")}
            </div>
            <div class="lead-meta">
              ${statusTag(publicStoryFooter.status)}
              ${linkOrText(publicStoryFooter.source, publicStoryFooter.sourceLabel)}
            </div>
          </footer>
        </article>
      </section>
      <section class="corpus-pilot-share-card" aria-label="Pilot reader share card">
        <div class="subsection-title">
          <strong>Reader Share Card</strong>
          <span>Compact story card for product pages, story indexes, and share previews with evidence limits still attached</span>
        </div>
        <article class="corpus-pilot-share-card-shell status-${escapeHtml(readerShareCard.status)}">
          <header>
            <span>Share Preview</span>
            <strong>${escapeHtml(readerShareCard.headline)}</strong>
            <p>${escapeHtml(readerShareCard.deck)}</p>
          </header>
          <div class="corpus-pilot-share-card-chips">
            ${readerShareCard.chips
              .map((chip) => `
                <span class="status-${escapeHtml(chip.status)}">
                  <strong>${escapeHtml(chip.value)}</strong>
                  ${escapeHtml(chip.label)}
                </span>
              `)
              .join("")}
          </div>
          <div class="corpus-pilot-share-card-lines">
            ${readerShareCard.lines
              .map((line) => `
                <section>
                  <span>${escapeHtml(line.label)}</span>
                  <p>${escapeHtml(clipped(line.body, 132))}</p>
                </section>
              `)
              .join("")}
          </div>
          <footer>
            ${statusTag(readerShareCard.status)}
            ${linkOrText(readerShareCard.source, readerShareCard.sourceLabel)}
          </footer>
        </article>
      </section>
      <section class="corpus-pilot-distribution" aria-label="Pilot reader distribution strip">
        <div class="subsection-title">
          <strong>Reader Distribution Strip</strong>
          <span>Where the evidence-bounded card can appear without losing proof counts, visible caveats, or source provenance</span>
        </div>
        <div class="corpus-pilot-distribution-grid">
          ${readerDistributionRows
            .map((row) => `
              <article class="corpus-pilot-distribution-card status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(`${row.number} ${row.surface}`)}</span>
                  <strong>${escapeHtml(row.label)}</strong>
                </header>
                <section>
                  <span>Reader Surface</span>
                  <p>${escapeHtml(clipped(row.body, 130))}</p>
                </section>
                <section>
                  <span>Guardrail</span>
                  <p>${escapeHtml(clipped(row.guardrail, 130))}</p>
                </section>
                <footer>
                  <span>${escapeHtml(clipped(row.proof, 72))}</span>
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-distribution-qa" aria-label="Pilot distribution QA checklist">
        <div class="subsection-title">
          <strong>Distribution QA Checklist</strong>
          <span>Publication checks that make sure distributed story cards still carry copy, guardrails, proof counts, and source links</span>
        </div>
        <div class="corpus-pilot-distribution-qa-grid">
          ${distributionQaRows
            .map((row) => `
              <article class="corpus-pilot-distribution-qa-card status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(`${row.number} ${row.passed ? "Ready" : "Hold"}`)}</span>
                  <strong>${escapeHtml(row.label)}</strong>
                  <em>${escapeHtml(row.value)}</em>
                </header>
                <p>${escapeHtml(row.body)}</p>
                <footer>
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-story-beat-nav" aria-label="Pilot story beat navigator">
        <div class="subsection-title">
          <strong>Story Beat Navigator</strong>
          <span>The reader arc in one pass: hook, proof basis, visible boundary, distribution checks, and next proof</span>
        </div>
        <div class="corpus-pilot-story-beat-track">
          ${storyBeatNavigatorRows
            .map((row) => `
              <article class="corpus-pilot-story-beat status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(`${row.number} ${row.label}`)}</span>
                  <strong>${escapeHtml(row.title)}</strong>
                  <em>${escapeHtml(row.metric)}</em>
                </header>
                <p>${escapeHtml(clipped(row.body, 150))}</p>
                <footer>
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-bridge" aria-label="Pilot narrative bridge">
        <div class="subsection-title">
          <strong>Narrative Bridge</strong>
          <span>How each lead becomes a public story only after the receipt, boundary, and next proof move stay attached</span>
        </div>
        <div class="corpus-pilot-bridge-list">
          ${bridgeRows
            .map((row) => `
              <article class="corpus-pilot-bridge-row status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(row.number)} ${escapeHtml(row.lane)}</span>
                  <strong>${escapeHtml(row.product.display_name || row.product.canonical_name)}</strong>
                  <em>${escapeHtml(row.collectionLane)}</em>
                </header>
                <div class="corpus-pilot-bridge-steps">
                  ${row.steps
                    .map((step) => `
                      <section class="corpus-pilot-bridge-step status-${escapeHtml(step.status)}">
                        <span>${escapeHtml(step.label)}</span>
                        <strong>${escapeHtml(step.title)}</strong>
                        <p>${escapeHtml(clipped(step.body, 132))}</p>
                      </section>
                    `)
                    .join("")}
                </div>
                <footer>
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-patterns" aria-label="Pilot story pattern map">
        <div class="subsection-title">
          <strong>Story Pattern Map</strong>
          <span>Recurring story types across the rich pilot targets, with the claim boundary kept in the same frame</span>
        </div>
        <div class="corpus-pilot-pattern-grid">
          ${patternRows
            .map((row, index) => `
              <article class="corpus-pilot-pattern-card status-${escapeHtml(row.status)}">
                <header>
                  <span>${String(index + 1).padStart(2, "0")} Pattern</span>
                  <strong>${escapeHtml(row.lane)}</strong>
                  <em>${pluralize(row.rows.length, "target")} · ${formatNumber(row.avgScore)} avg richness</em>
                </header>
                <p>${escapeHtml(row.pattern)}</p>
                <div class="corpus-pilot-pattern-proof">
                  <section>
                    <span>Lead Products</span>
                    <p>${escapeHtml(row.topProducts.join("; "))}</p>
                  </section>
                  <section>
                    <span>Proof Objects</span>
                    <p>${escapeHtml(row.collectionLaneList.join("; ") || "source review")}</p>
                  </section>
                  <section>
                    <span>Locked Claim</span>
                    <p>${escapeHtml(row.locked)}</p>
                  </section>
                  <section>
                    <span>Unlock</span>
                    <p>${escapeHtml(row.unlock)}</p>
                  </section>
                </div>
                <footer>
                  <div class="story-source-path">
                    ${row.sourceDomainList.map((domain) => `<span>${escapeHtml(domain)}</span>`).join("")}
                  </div>
                  <div class="lead-meta">
                    ${statusTag(row.status)}
                    ${linkOrText(row.source, row.sourceLabel)}
                  </div>
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-dimensions" aria-label="Pilot change dimension matrix">
        <div class="subsection-title">
          <strong>Change Dimension Matrix</strong>
          <span>Which story dimensions are supported, partial, or locked across the rich pilot targets</span>
        </div>
        <div class="corpus-pilot-dimension-grid">
          ${dimensionRows
            .map((row, index) => `
              <article class="corpus-pilot-dimension-card status-${escapeHtml(row.status)}">
                <header>
                  <span>${String(index + 1).padStart(2, "0")} Dimension</span>
                  <strong>${escapeHtml(row.label)}</strong>
                  <em>${formatNumber(row.activeCount)} of ${formatNumber(row.total)} targets active</em>
                </header>
                <div class="corpus-pilot-dimension-meter">
                  <span style="width:${Math.max(3, Math.min(100, row.pct))}%"></span>
                </div>
                <p>${escapeHtml(row.evidence)}</p>
                <dl>
                  <dt>Lead products</dt>
                  <dd>${escapeHtml(row.products.join("; "))}</dd>
                  <dt>Locked claim</dt>
                  <dd>${escapeHtml(row.locked)}</dd>
                  <dt>Unlock</dt>
                  <dd>${escapeHtml(row.unlock)}</dd>
                </dl>
                <footer>
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="corpus-pilot-vintage-chapters" aria-label="Pilot vintage story chapter timeline">
        <div class="subsection-title">
          <strong>Vintage Story Chapters</strong>
          <span>The era-by-era reader path: what evidence supports, what stays locked, and which products need the next proof pass</span>
        </div>
        <div class="corpus-pilot-vintage-chapter-track">
          ${vintageChapterRows
            .map((row) => `
              <article class="corpus-pilot-vintage-chapter status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(`${row.number} ${row.label}`)}</span>
                  <strong>${escapeHtml(row.metric)}</strong>
                  <em>${escapeHtml(`${pluralize(row.visibleSlots, "visible slot")} · ${pluralize(row.claimSlots, "claim slot")}`)}</em>
                </header>
                <div class="corpus-pilot-vintage-chapter-meter" aria-label="${escapeHtml(`${row.label} sourced coverage`)}">
                  <span style="width:${Math.max(3, Math.min(100, row.coveragePct))}%"></span>
                </div>
                <section>
                  <span>Supports</span>
                  <p>${escapeHtml(clipped(row.visibleLine, 118))}</p>
                </section>
                <section>
                  <span>Boundary</span>
                  <p>${escapeHtml(clipped(row.boundaryLine, 118))}</p>
                </section>
                <footer>
                  <span>${escapeHtml(clipped(row.nextLine, 100))}</span>
                  ${statusTag(row.status)}
                  ${statusTag(row.dominantStatus)}
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <div class="corpus-pilot-grid">
        <section class="corpus-pilot-panel" aria-label="Category story lanes">
          <div class="subsection-title">
            <strong>Category Story Lanes</strong>
            <span>Where the pilot has density and where claims remain locked</span>
          </div>
          <div class="corpus-pilot-category-list">
            ${categoryRows
              .map((row) => `
                <article class="corpus-pilot-category status-${escapeHtml(row.status)}">
                  <header>
                    <span>${escapeHtml(labelFor(row.category))}</span>
                    <strong>${formatNumber(row.products)} products</strong>
                  </header>
                  <div class="corpus-coverage"><span style="width:${Math.max(3, Math.min(100, row.averageCoverage))}%"></span></div>
                  <div class="corpus-statline">
                    <span>${row.averageCoverage}% avg coverage</span>
                    <span>${pluralize(row.labelVisible, "label-visible product")}</span>
                    <span>${pluralize(row.gapSlots, "gap slot")}</span>
                  </div>
                  <div class="corpus-products">${escapeHtml(row.topProducts.join("; "))}</div>
                </article>
              `)
              .join("")}
          </div>
        </section>
        <section class="corpus-pilot-panel" aria-label="Vintage chapter coverage">
          <div class="subsection-title">
            <strong>Vintage Chapter Coverage</strong>
            <span>Each era stays visible even when it is unsupported</span>
          </div>
          <div class="corpus-pilot-vintage-list">
            ${vintageRows
              .map((row) => `
                <article class="corpus-pilot-vintage status-${escapeHtml(row.status)}">
                  <header>
                    <span>${escapeHtml(row.label)}</span>
                    <strong>${row.coveragePct}% sourced</strong>
                  </header>
                  <div class="corpus-coverage"><span style="width:${Math.max(3, Math.min(100, row.coveragePct))}%"></span></div>
                  <p>${pluralize(row.visibleSlots, "visible label")} · ${pluralize(row.claimSlots, "verified claim slot")} · ${pluralize(row.gapSlots, "gap")}.</p>
                  <div class="lead-meta">
                    ${statusTag(row.status)}
                    ${statusTag(row.dominantStatus)}
                  </div>
                  <div class="corpus-products">${escapeHtml(row.blockers.length ? `Gaps: ${row.blockers.join("; ")}` : "No unsourced pilot gaps in this era under current filters.")}</div>
                </article>
              `)
              .join("")}
          </div>
        </section>
      </div>
      <section class="corpus-pilot-lineup" aria-label="Pilot product story lineup">
        ${targetRows.slice(0, 12).map((row, index) => `
          <article class="corpus-pilot-product status-${escapeHtml(row.cluster.status)}">
            <header>
              <span>${String(index + 1).padStart(2, "0")} ${escapeHtml(labelFor(row.product.category || "Product"))}</span>
              <strong>${escapeHtml(row.product.display_name || row.product.canonical_name)}</strong>
            </header>
            <div class="story-vintage-grid">${productVintageCells(row.product)}</div>
            <p>${escapeHtml(pilotCanSay(row))}</p>
            <div class="lead-meta">
              ${statusTag(row.cluster.status)}
              ${statusTag(row.cluster.key)}
            </div>
          </article>
        `).join("")}
      </section>
      <footer class="corpus-pilot-note">
        ${formatNumber(claimProducts)} products have claim-ready label evidence. ${formatNumber(gapSlots)} pilot vintage slots remain explicit gaps until source-attributable evidence is reviewed.
      </footer>
    </article>
  `;
}

function heatmapCellForVintage(row, vintage) {
  const info = row.product.vintage_statuses?.[vintage] || { status: "unknown", source_count: 0 };
  const evidenceRows = vintageEvidenceRows(row.product, row.evidenceRows, vintage);
  const facts = storyEvidenceFacts(evidenceRows);
  const status = info.status || "unknown";
  const sourceCount = numeric(info.source_count || evidenceRows.length);
  const label = vintageLabels[vintage] || vintage;

  if (facts.manualLabels || status === "manual_verified") {
    return {
      label: "claim",
      status: "manual_verified",
      detail: `${label}: reviewed label text can support scoped claims.`,
      sourceCount,
    };
  }
  if (facts.ocrLabels || status === "ocr_extracted") {
    return {
      label: "ocr",
      status: "ocr_extracted",
      detail: `${label}: OCR text exists and still needs review.`,
      sourceCount,
    };
  }
  if (facts.visibleLabels || status === "label_visible") {
    return {
      label: "label",
      status: "label_visible",
      detail: `${label}: readable label evidence can move to transcription.`,
      sourceCount,
    };
  }
  if (facts.usablePhotos || ["usable_photo", "candidate_needs_transcription", "candidate_needs_panel"].includes(status)) {
    return {
      label: "photo",
      status: "usable_photo",
      detail: `${label}: package or document evidence exists, but label text is not verified.`,
      sourceCount,
    };
  }
  if (sourceCount || ["source_review", "candidate_found", "candidate_needs_archive"].includes(status)) {
    return {
      label: "source",
      status: "source_review",
      detail: `${label}: source leads need attribution, date, and claim review.`,
      sourceCount,
    };
  }
  return {
    label: "gap",
    status: "missing_vintage_slot",
    detail: `${label}: no source-attributable evidence is attached under current filters.`,
    sourceCount,
  };
}

function heatmapSummaryRows(rows) {
  const initial = {
    manual_verified: 0,
    label_visible: 0,
    ocr_extracted: 0,
    usable_photo: 0,
    source_review: 0,
    missing_vintage_slot: 0,
  };
  const counts = rows.reduce((acc, row) => {
    row.cells.forEach((cell) => {
      acc[cell.status] = (acc[cell.status] || 0) + 1;
    });
    return acc;
  }, initial);
  return [
    ["manual_verified", "Claim", counts.manual_verified],
    ["label_visible", "Label", counts.label_visible],
    ["ocr_extracted", "OCR", counts.ocr_extracted],
    ["usable_photo", "Photo", counts.usable_photo],
    ["source_review", "Source", counts.source_review],
    ["missing_vintage_slot", "Gap", counts.missing_vintage_slot],
  ];
}

function heatmapProductRows(productRows) {
  return productRows.slice(0, 100).map((row, index) => {
    const cells = state.data.vintages.map((vintage) => heatmapCellForVintage(row, vintage));
    const labelReady = cells.filter((cell) => ["manual_verified", "label_visible", "ocr_extracted"].includes(cell.status)).length;
    const gapCount = cells.filter((cell) => cell.status === "missing_vintage_slot").length;
    const nextBoundary = labelReady
      ? `Verify ${pluralize(labelReady, "label slot")} before ingredient diffs become public claims.`
      : storyGapLabel({ product: row.product });
    return {
      index,
      ...row,
      cells,
      labelReady,
      gapCount,
      nextBoundary,
    };
  });
}

function renderCorpusEvidenceHeatmap(productRows) {
  if (!els.corpusEvidenceHeatmap) return;
  const rows = heatmapProductRows(productRows);
  if (!rows.length) {
    els.corpusEvidenceHeatmap.innerHTML = `<p class="empty-note">No heatmap products match the current filters.</p>`;
    return;
  }
  const summaryRows = heatmapSummaryRows(rows);
  els.corpusEvidenceHeatmap.innerHTML = `
    <article class="corpus-heatmap">
      <header class="corpus-heatmap-head">
        <div>
          <p class="eyebrow">Evidence Heatmap</p>
          <h3>Every pilot product keeps its unsupported eras visible</h3>
          <p>Scan the top 100 products across vintage chapters. Each cell is a proof state, not a formulation claim.</p>
        </div>
        <aside class="corpus-heatmap-summary" aria-label="Heatmap proof-state summary">
          ${summaryRows
            .map(([status, label, value]) => `
              <span class="status-${escapeHtml(status)}">
                <strong>${formatNumber(value)}</strong> ${escapeHtml(label)}
              </span>
            `)
            .join("")}
        </aside>
      </header>
      <div class="corpus-heatmap-grid" aria-label="Product vintage evidence heatmap">
        <div class="corpus-heatmap-row corpus-heatmap-row-head">
          <span>Product</span>
          <div class="corpus-heatmap-cells">
            ${state.data.vintages.map((vintage) => `<span>${escapeHtml(vintageLabels[vintage] || vintage)}</span>`).join("")}
          </div>
          <span>Next Boundary</span>
        </div>
        <div class="corpus-heatmap-scroll">
          ${rows
            .map((row) => `
              <article class="corpus-heatmap-row status-${escapeHtml(row.cluster.status)}">
                <header>
                  <span>${String(row.index + 1).padStart(2, "0")} ${escapeHtml(labelFor(row.product.category || "Product"))}</span>
                  <strong>${escapeHtml(row.product.display_name || row.product.canonical_name)}</strong>
                  <em>${escapeHtml(row.cluster.label)}</em>
                </header>
                <div class="corpus-heatmap-cells">
                  ${row.cells
                    .map((cell) => `
                      <span class="corpus-heatmap-cell status-${escapeHtml(cell.status)}" title="${escapeHtml(cell.detail)}">
                        <strong>${escapeHtml(cell.label)}</strong>
                        <em>${formatNumber(cell.sourceCount)} src</em>
                      </span>
                    `)
                    .join("")}
                </div>
                <p>${escapeHtml(clipped(row.nextBoundary, 130))}</p>
              </article>
            `)
            .join("")}
        </div>
      </div>
      <footer class="corpus-heatmap-legend" aria-label="Heatmap legend">
        <span class="status-manual_verified">claim: manually verified label text</span>
        <span class="status-label_visible">label: readable panel awaiting transcription</span>
        <span class="status-usable_photo">photo: useful package/document evidence</span>
        <span class="status-source_review">source: attribution/date review needed</span>
        <span class="status-missing_vintage_slot">gap: no usable source yet</span>
      </footer>
    </article>
  `;
}

function corpusStoryGuideRows(productRows, taskGroups) {
  const storyRows = corpusFrontPageRows(productRows);
  const arcRows = corpusStoryArcRows(productRows).filter((row) => row.rows.length);
  const vintageCount = state.data.vintages.length || 0;
  const pilotProducts = Math.min(productRows.length, 100);
  const timelineProducts = Math.min(productRows.length, 12);
  const heatmapCells = pilotProducts * vintageCount;
  return [
    {
      label: "Issue",
      title: "Story issue preview",
      href: "#corpus-story-issue",
      status: storyRows.length ? "manual_verified" : "missing_vintage_slot",
      metric: `${formatNumber(Math.min(storyRows.length, 6))} issue ${Math.min(storyRows.length, 6) === 1 ? "story" : "stories"}`,
      detail: "Open the editorial package first: issue spine, readiness meter, cover, chapters, credits, claim ledger, and checklist.",
    },
    {
      label: "Arc",
      title: "Corpus arc preview",
      href: "#corpus-story-arc-preview",
      status: arcRows.length ? "candidate_found" : "missing_vintage_slot",
      metric: pluralize(arcRows.length, "arc"),
      detail: "See the 100-product corpus as narrative families before moving into source lanes or collection planning.",
    },
    {
      label: "Open",
      title: "Reader front page",
      href: "#corpus-reader-frontpage",
      status: storyRows.length ? "label_visible" : "missing_vintage_slot",
      metric: `${formatNumber(storyRows.length)} ${storyRows.length === 1 ? "story" : "stories"}`,
      detail: "Start with public-facing ledes that keep receipt, boundary, and next chapter attached.",
    },
    {
      label: "Browse",
      title: "Story library",
      href: "#corpus-story-library",
      status: storyRows.length ? "source_review" : "missing_vintage_slot",
      metric: pluralize(storyRows.filter((row) => row.source).length, "receipt"),
      detail: "Scan every packaged story without losing the evidence status or source link.",
    },
    {
      label: "Trace",
      title: "Story flow map",
      href: "#corpus-story-flow",
      status: storyRows.length ? "candidate_found" : "missing_vintage_slot",
      metric: pluralize(storyRows.length * 4, "step"),
      detail: "Follow the object-to-receipt-to-boundary-to-next-proof route for each story.",
    },
    {
      label: "Timeline",
      title: "Vintage story timeline",
      href: "#corpus-story-timeline",
      status: timelineProducts ? "label_visible" : "missing_vintage_slot",
      metric: pluralize(timelineProducts * vintageCount, "era cell"),
      detail: "Read across eras before allowing ingredient-change language into the story.",
    },
    {
      label: "Pilot",
      title: "100-product storyboard",
      href: "#corpus-pilot-storyboard",
      status: pilotProducts ? "usable_photo" : "missing_vintage_slot",
      metric: pluralize(pilotProducts, "product"),
      detail: "See corpus readiness by proof stage, category, vintage coverage, and story line-up.",
    },
    {
      label: "Scan",
      title: "Evidence heatmap",
      href: "#corpus-evidence-heatmap",
      status: heatmapCells ? "source_review" : "missing_vintage_slot",
      metric: pluralize(heatmapCells, "proof cell"),
      detail: "Find visible gaps and source-heavy eras without treating leads as verified claims.",
    },
    {
      label: "Assign",
      title: "Collection workbench",
      href: "#corpus-collection-workbench",
      status: taskGroups.length ? "candidate_needs_archive" : "missing_vintage_slot",
      metric: pluralize(taskGroups.length, "task group"),
      detail: "When collection resumes, move from story gaps to source-specific review assignments.",
    },
  ];
}

function renderCorpusStoryGuide(productRows, taskGroups) {
  if (!els.corpusStoryGuide) return;
  const rows = corpusStoryGuideRows(productRows, taskGroups);
  els.corpusStoryGuide.innerHTML = `
    <article class="corpus-guide">
      <header class="corpus-guide-head">
        <div>
          <p class="eyebrow">Atlas Story Guide</p>
          <h3>Move from story to proof before moving to collection</h3>
          <p>The guide turns the Atlas into a route: open the reader story, inspect the proof shape, read across time, then only assign collection work for the gaps that remain visible.</p>
        </div>
        <aside class="corpus-guide-summary" aria-label="Atlas guide summary">
          <span class="status-label_visible"><strong>${formatNumber(productRows.length)}</strong> Products</span>
          <span class="status-source_review"><strong>${formatNumber(state.data.vintages.length || 0)}</strong> Vintages</span>
          <span class="status-candidate_found"><strong>${formatNumber(corpusFrontPageRows(productRows).length)}</strong> Stories</span>
          <span class="status-candidate_needs_archive"><strong>${formatNumber(taskGroups.length)}</strong> Work Groups</span>
        </aside>
      </header>
      <nav class="corpus-guide-nav" aria-label="Atlas story section shortcuts">
        ${rows.map((row, index) => `
          <a class="corpus-guide-card status-${escapeHtml(row.status)}" href="${escapeHtml(row.href)}">
            <span>${String(index + 1).padStart(2, "0")} ${escapeHtml(row.label)}</span>
            <strong>${escapeHtml(row.title)}</strong>
            <em>${escapeHtml(row.metric)}</em>
            <p>${escapeHtml(row.detail)}</p>
          </a>
        `).join("")}
      </nav>
      <footer class="corpus-guide-note">
        The order is intentional: the interface should tell the story that is already supported, then point collection toward the exact proof object that would unlock a stronger version.
      </footer>
    </article>
  `;
}

function corpusStoryIssueRows(productRows) {
  const rows = corpusFrontPageRows(productRows);
  const cover = rows[0];
  const chapters = rows.slice(1, 6);
  const receipts = rows.slice(0, 6).map((row, index) => ({
    ...row,
    number: String(index + 1).padStart(2, "0"),
    sourceName: row.sourceTitle || row.receiptLine || "No source title recorded",
    sourceLabelText: row.sourceLabel || row.evidenceStatus || "source",
    publicLine: row.readerDek || row.readerLede,
    lockedClaim: row.boundaryLine || "No explicit locked claim is attached under the current filters.",
    unlockLine: row.nextChapter || "Attach the next proof object before strengthening the public story.",
    gates: [
      {
        label: "Lede",
        ready: presentText(row.readerLede),
        status: presentText(row.readerLede) ? "label_visible" : "missing_vintage_slot",
        detail: presentText(row.readerLede) ? "public entry ready" : "needs story line",
      },
      {
        label: "Receipt",
        ready: Boolean(row.source),
        status: row.source ? "source_review" : "missing_vintage_slot",
        detail: row.source ? "source attached" : "source missing",
      },
      {
        label: "Boundary",
        ready: presentText(row.boundaryLine),
        status: presentText(row.boundaryLine) ? "missing_vintage_slot" : "manual_verified",
        detail: presentText(row.boundaryLine) ? "claim caveat visible" : "boundary missing",
      },
      {
        label: "Unlock",
        ready: presentText(row.nextChapter),
        status: presentText(row.nextChapter) ? "candidate_found" : "candidate_needs_archive",
        detail: presentText(row.nextChapter) ? "next proof named" : "next proof missing",
      },
    ],
  }));
  const departments = [
    {
      label: "Receipts",
      status: "source_review",
      value: rows.filter((row) => row.source).length,
      detail: "Every story needs a source line before it becomes public copy.",
    },
    {
      label: "Boundaries",
      status: "missing_vintage_slot",
      value: rows.filter((row) => row.boundaryLine).length,
      detail: "The caveat is shown beside the lede, not buried after the story.",
    },
    {
      label: "Proof Moves",
      status: "candidate_found",
      value: rows.filter((row) => row.nextChapter).length,
      detail: "The next research step is part of the editorial package.",
    },
  ];
  return {
    rows,
    cover,
    chapters,
    receipts,
    departments,
  };
}

function corpusStoryIssueReadiness(issue) {
  const gates = issue.receipts.flatMap((row) => row.gates || []);
  const total = gates.length;
  const ready = gates.filter((gate) => gate.ready).length;
  const pct = total ? Math.round((ready / total) * 100) : 0;
  const gateRows = ["Lede", "Receipt", "Boundary", "Unlock"].map((label) => {
    const labelGates = gates.filter((gate) => gate.label === label);
    const labelReady = labelGates.filter((gate) => gate.ready).length;
    const status = label === "Lede"
      ? "label_visible"
      : label === "Receipt"
        ? "source_review"
        : label === "Boundary"
          ? "missing_vintage_slot"
          : "candidate_found";
    return {
      label,
      status: labelReady === labelGates.length ? status : "candidate_needs_archive",
      ready: labelReady,
      total: labelGates.length,
      detail: `${formatNumber(labelReady)} of ${formatNumber(labelGates.length)} stories carry this gate.`,
    };
  });
  return {
    ready,
    total,
    pct,
    status: pct === 100 ? "manual_verified" : pct >= 75 ? "candidate_found" : "candidate_needs_archive",
    gateRows,
  };
}

function corpusStoryIssueHandoff(issue, readiness) {
  const receipts = issue.receipts || [];
  const firstUnlock = receipts.find((row) => presentText(row.unlockLine))?.unlockLine;
  const lockedClaims = receipts.filter((row) => presentText(row.lockedClaim)).length;
  const unlocks = receipts.filter((row) => presentText(row.unlockLine)).length;
  const issueIsReady = readiness.pct === 100;
  return [
    {
      label: issueIsReady ? "Publish Now" : "Publish With Caveats",
      status: readiness.status,
      value: `${formatNumber(readiness.ready)}/${formatNumber(readiness.total)}`,
      detail: issueIsReady
        ? "Every chapter has the lede, receipt, boundary, and proof move needed for an evidence-first issue."
        : "The issue can be previewed, but incomplete gates must remain visible in the public package.",
    },
    {
      label: "Reader Promise",
      status: "label_visible",
      value: `${formatNumber(receipts.length)} chapters`,
      detail: "Lead with the strongest supported story sentence, then show the receipt and unresolved tension beside it.",
    },
    {
      label: "Keep Caveated",
      status: "missing_vintage_slot",
      value: `${formatNumber(lockedClaims)} locked`,
      detail: "Do not turn visible packaging, ads, or retailer copy into formulation history until label text is verified.",
    },
    {
      label: "Next Proof",
      status: "candidate_found",
      value: `${formatNumber(unlocks)} moves`,
      detail: firstUnlock || "Attach the next proof object before strengthening the public story.",
    },
  ];
}

function corpusStoryIssueStoryboard(issue) {
  return (issue.receipts || []).map((row) => ({
    ...row,
    beats: [
      {
        label: "Hook",
        status: "label_visible",
        text: row.readerLede || "No public story line is attached yet.",
      },
      {
        label: "Receipt",
        status: row.source ? "source_review" : "missing_vintage_slot",
        text: row.receiptLine || row.sourceName || "Attach a source before this becomes public copy.",
      },
      {
        label: "Caveat",
        status: presentText(row.boundaryLine) ? "missing_vintage_slot" : "manual_verified",
        text: row.boundaryLine || "No explicit caveat is attached under the current filters.",
      },
      {
        label: "Next Proof",
        status: presentText(row.nextChapter) ? "candidate_found" : "candidate_needs_archive",
        text: row.nextChapter || "Name the next proof object needed to advance the story.",
      },
    ],
  }));
}

function corpusArcStoryProofScore(row) {
  let score = 10;
  if (corpusArcSourceCount(row) > 0) score = 34;
  if (row.facts.usablePhotos || numeric(row.product.photo_evidence_rows)) score = 52;
  if (row.facts.visibleLabels) score = 72;
  if (row.facts.manualLabels || numeric(row.product.ground_truth_slots)) score = 94;
  if (corpusArcHasPackageContext(row)) score += 4;
  if (corpusArcHasMakerContext(row)) score += 3;
  if (corpusNetworkHasPriceSignals(row)) score += 3;
  return Math.min(100, score);
}

function corpusArcStoryTensionScore(row) {
  let score = 8;
  if (presentText(row.product.missing_vintages)) score += 22;
  if (presentText(row.product.archive_needed_vintages)) score += 20;
  if (presentText(row.product.panel_needed_vintages)) score += 16;
  if (numeric(row.product.slots_without_sources)) score += Math.min(34, numeric(row.product.slots_without_sources) * 8);
  if (numeric(row.product.unsupported_gap_records)) score += Math.min(18, numeric(row.product.unsupported_gap_records) * 4);
  if (row.cluster.status === "missing_vintage_slot") score += 10;
  return Math.min(100, score);
}

function corpusArcTerrainBand(proofScore, tensionScore) {
  if (proofScore >= 62 && tensionScore >= 50) {
    return {
      key: "rich_caveated",
      label: "Rich, Caveated",
      axis: "High proof / high tension",
      status: "candidate_found",
      move: "Draft the reader story, but keep the unresolved vintage boundary beside the lede.",
    };
  }
  if (proofScore >= 62) {
    return {
      key: "ready_explainer",
      label: "Ready Explainer",
      axis: "High proof / lower tension",
      status: "label_visible",
      move: "Use this as a clean explanatory chapter and show the receipt path prominently.",
    };
  }
  if (tensionScore >= 50) {
    return {
      key: "high_tension_hunt",
      label: "High-Tension Hunt",
      axis: "Lower proof / high tension",
      status: "missing_vintage_slot",
      move: "Tell the absence honestly, then point the reader to the exact proof object needed.",
    };
  }
  return {
    key: "early_pattern",
    label: "Early Pattern",
    axis: "Lower proof / lower tension",
    status: "source_review",
    move: "Keep this as a background pattern until stronger receipts or labels appear.",
  };
}

function corpusArcTerrainLensScores(arc, proofScore, tensionScore) {
  if (arc.key === "origin_gap") {
    return {
      proofScore: Math.min(proofScore, 44),
      tensionScore: Math.max(tensionScore, 82),
    };
  }
  if (arc.key === "fast_food_docs") {
    return {
      proofScore: Math.min(proofScore, 56),
      tensionScore: Math.max(tensionScore, 62),
    };
  }
  if (arc.key === "collector_photo") {
    return {
      proofScore: Math.max(64, Math.min(proofScore, 78)),
      tensionScore: Math.min(Math.max(tensionScore, 38), 48),
    };
  }
  if (arc.key === "package_economics") {
    return {
      proofScore: Math.max(62, Math.min(proofScore, 82)),
      tensionScore: Math.min(Math.max(tensionScore, 36), 48),
    };
  }
  if (arc.key === "maker_lineage") {
    return {
      proofScore: Math.min(proofScore, 58),
      tensionScore: Math.min(Math.max(tensionScore, 34), 48),
    };
  }
  return { proofScore, tensionScore };
}

function corpusArcTerrainRows(cards) {
  return cards.map((arc, index) => {
    const denominator = Math.max(1, arc.rows.length);
    const rawProofScore = Math.round(arc.rows.reduce((sum, row) => sum + corpusArcStoryProofScore(row), 0) / denominator);
    const rawTensionScore = Math.round(arc.rows.reduce((sum, row) => sum + corpusArcStoryTensionScore(row), 0) / denominator);
    const { proofScore, tensionScore } = corpusArcTerrainLensScores(arc, rawProofScore, rawTensionScore);
    const band = corpusArcTerrainBand(proofScore, tensionScore);
    const lead = arc.lead;
    const best = lead ? visualEvidenceBestRow(lead) : {};
    const nextProof = lead ? corpusStoryBeatUnlock(arc, lead, best) : arc.gate;
    const source = best.source_url || best.archive_url || arc.source;
    return {
      key: arc.key,
      index,
      label: arc.shortLabel,
      title: arc.label,
      status: band.status,
      band,
      proofScore,
      tensionScore,
      products: arc.rows.length,
      leadName: arc.leadName,
      source,
      sourceLabel: best.source_domain || arc.sourceLabel,
      receipt: best.source_title || best.source_domain || arc.sourceLabel || "Source receipt needed",
      move: nextProof || band.move,
    };
  });
}

function corpusArcStoryRouteRows(terrainRows) {
  const stages = [
    {
      key: "rich_caveated",
      number: "01",
      label: "Feature Lede",
      title: "Open where proof and tension are both visible",
      status: "candidate_found",
      pageRole: "Longform opener",
      useFor: "A reader can enter through a specific product scene while the unresolved vintage claim remains visible.",
      caveat: "Keep the boundary beside the lede. Do not turn readable objects into full formulation history.",
    },
    {
      key: "ready_explainer",
      number: "02",
      label: "Explainer",
      title: "Explain the mechanism with lower claim risk",
      status: "label_visible",
      pageRole: "Context module",
      useFor: "Use stronger proof and lower tension to teach size, photo, package, or source mechanics.",
      caveat: "Show the source path and the limits of what the object proves.",
    },
    {
      key: "high_tension_hunt",
      number: "03",
      label: "Evidence Hunt",
      title: "Make the missing proof part of the story",
      status: "missing_vintage_slot",
      pageRole: "Open question",
      useFor: "Turn earliest-label and document-scope gaps into honest reader-facing questions.",
      caveat: "The absence is a finding only when the missing source type and date basis are explicit.",
    },
    {
      key: "early_pattern",
      number: "04",
      label: "Sidebar",
      title: "Keep weaker patterns near the proof map",
      status: "source_review",
      pageRole: "Background note",
      useFor: "Use supporting patterns without forcing them into the main narrative spine.",
      caveat: "Do not collapse publisher, brand owner, manufacturer, and distributor roles.",
    },
  ];
  return stages.map((stage) => {
    const rows = terrainRows.filter((row) => row.band.key === stage.key);
    const lead = rows[0];
    const source = lead?.source || "";
    const sourceLabel = lead?.sourceLabel || "Source";
    const proof = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.proofScore, 0) / rows.length)
      : 0;
    const tension = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.tensionScore, 0) / rows.length)
      : 0;
    return {
      ...stage,
      rows,
      source,
      sourceLabel,
      proof,
      tension,
      leadName: lead?.leadName || "No arc in this lane",
      nextMove: lead?.move || stage.caveat,
    };
  });
}

function corpusArcReaderFrameRows(routeRows) {
  return routeRows.map((stage) => {
    const arcLabels = stage.rows.map((row) => row.label);
    return {
      ...stage,
      scene: stage.rows.length
        ? `${stage.leadName} carries the ${stage.label.toLowerCase()} frame.`
        : `${stage.label} waits for a product arc under the current filters.`,
      proofLine: stage.rows.length
        ? `${arcLabels.join(", ")} with ${formatNumber(stage.proof)}% average proof readiness and ${formatNumber(stage.tension)}% story tension.`
        : "No proof-bearing arc is available in this lane under the current filters.",
      caveatLine: stage.caveat,
      nextLine: stage.nextMove || stage.caveat,
      receiptLine: stage.source ? stage.sourceLabel : "Source receipt still needed",
    };
  });
}

function corpusArcCopyDeskRows(frameRows) {
  return frameRows.map((frame) => {
    const arcLine = frame.rows.length
      ? frame.rows.map((row) => row.label).join(" + ")
      : frame.label;
    return {
      ...frame,
      eyebrow: `${frame.number} / ${frame.pageRole}`,
      headline: `${frame.leadName}: ${frame.label}`,
      dek: frame.scene,
      receiptCaption: frame.source
        ? `${frame.receiptLine} anchors the ${arcLine.toLowerCase()} chapter.`
        : `${frame.label} still needs a source-attributable receipt before the chapter can strengthen.`,
      caveatCaption: frame.caveatLine,
      proofMove: frame.nextLine,
    };
  });
}

function corpusArcIssueSpread(copyRows) {
  const cover = copyRows[0] || {};
  const chapters = copyRows.slice(1);
  return {
    cover,
    chapters,
    proofRows: copyRows.map((copy) => ({
      number: copy.number,
      label: copy.label,
      status: copy.status,
      receiptCaption: copy.receiptCaption,
      caveatCaption: copy.caveatCaption,
      proofMove: copy.proofMove,
      source: copy.source,
      sourceLabel: copy.receiptLine,
    })),
    summaryRows: [
      ["candidate_found", "Chapters", copyRows.length],
      ["source_review", "Receipts", copyRows.filter((copy) => copy.source).length],
      ["missing_vintage_slot", "Caveats", copyRows.filter((copy) => presentText(copy.caveatCaption)).length],
      ["label_visible", "Proof Moves", copyRows.filter((copy) => presentText(copy.proofMove)).length],
    ],
  };
}

function corpusArcClaimGuardrailRows(copyRows) {
  return copyRows.map((copy) => ({
    number: copy.number,
    label: copy.label,
    status: copy.status,
    product: copy.leadName,
    canSay: copy.dek,
    cannotSay: copy.caveatCaption,
    unlock: copy.proofMove,
    source: copy.source,
    sourceLabel: copy.receiptLine,
  }));
}

function corpusArcSourceNoteRows(copyRows) {
  return copyRows.map((copy) => ({
    number: copy.number,
    label: copy.label,
    status: copy.status,
    title: copy.headline,
    source: copy.source,
    sourceLabel: copy.receiptLine,
    receiptRole: copy.receiptCaption,
    storyBoundary: copy.caveatCaption,
    usage: copy.source
      ? "Use as a visible receipt in the reader package; keep formulation or lineage claims constrained to the attached caveat."
      : "Hold this chapter as a draft until a source-attributable receipt is attached.",
  }));
}

function corpusArcReaderQuestion(label) {
  const normalized = String(label || "").toLowerCase();
  if (normalized.includes("lede")) {
    return "What is the strongest product story the reader can inspect immediately?";
  }
  if (normalized.includes("explainer")) {
    return "Which pattern explains why this product belongs in the larger corpus?";
  }
  if (normalized.includes("hunt")) {
    return "Where is the proof still thin, and how should that uncertainty stay visible?";
  }
  if (normalized.includes("sidebar")) {
    return "What adjacent context helps the story without carrying the main claim?";
  }
  return "What should the reader understand before moving to the next chapter?";
}

function corpusArcReaderSequenceRows(copyRows) {
  return copyRows.map((copy, index) => {
    const next = copyRows[index + 1];
    return {
      number: copy.number,
      label: copy.label,
      status: copy.status,
      role: copy.pageRole,
      title: copy.headline,
      readerQuestion: corpusArcReaderQuestion(copy.label),
      storyFrame: copy.dek,
      proofOnScreen: copy.receiptCaption,
      claimBoundary: copy.caveatCaption,
      nextTurn: next
        ? `Then turn to ${next.label.toLowerCase()}: ${next.leadName}.`
        : "Close with the proof rail, source notes, and claim boundaries visible.",
      source: copy.source,
      sourceLabel: copy.receiptLine,
    };
  });
}

function corpusArcReaderTakeawayRows(sequenceRows) {
  const rows = Array.isArray(sequenceRows) ? sequenceRows : [];
  const lead = rows[0] || {};
  const sourcedRows = rows.filter((row) => row.source);
  const boundary = rows.find((row) => presentText(row.claimBoundary)) || {};
  const close = rows[rows.length - 1] || {};
  const firstSource = sourcedRows[0] || lead;
  return [
    {
      status: lead.status || "source_review",
      label: "Reader Learns",
      title: lead.title || "The story needs a lead chapter",
      body: lead.storyFrame || "Choose a lead chapter before the reader package can carry a clear takeaway.",
      kicker: "Opening understanding",
      source: lead.source,
      sourceLabel: lead.sourceLabel,
    },
    {
      status: sourcedRows.length ? "source_review" : "missing_vintage_slot",
      label: "Receipt Carries",
      title: `${formatNumber(sourcedRows.length)} of ${formatNumber(rows.length)} chapters link to a receipt`,
      body: firstSource.proofOnScreen || "Attach a visible source receipt before using the chapter as reader-facing proof.",
      kicker: "Proof visible on screen",
      source: firstSource.source,
      sourceLabel: firstSource.sourceLabel,
    },
    {
      status: boundary.status || "missing_vintage_slot",
      label: "Do Not Infer",
      title: "The caveat remains part of the story",
      body: boundary.claimBoundary || "Keep unsupported formulation, date, and lineage claims out of the reader takeaway.",
      kicker: `${formatNumber(rows.filter((row) => presentText(row.claimBoundary)).length)} claim boundaries`,
      source: boundary.source,
      sourceLabel: boundary.sourceLabel,
    },
    {
      status: close.status || "source_review",
      label: "Closing Turn",
      title: close.label ? `End on ${close.label.toLowerCase()}` : "Close with source notes",
      body: close.nextTurn || "Close with source notes and claim boundaries visible.",
      kicker: "Issue handoff",
      source: close.source,
      sourceLabel: close.sourceLabel,
    },
  ];
}

function corpusArcReaderSynopsisRows(sequenceRows, takeawayRows) {
  const rows = Array.isArray(sequenceRows) ? sequenceRows : [];
  const takeaways = Array.isArray(takeawayRows) ? takeawayRows : [];
  const lead = rows[0] || {};
  const explainer = rows.find((row) => String(row.label || "").toLowerCase().includes("explainer")) || rows[1] || {};
  const boundary = rows.find((row) => presentText(row.claimBoundary)) || {};
  const close = rows[rows.length - 1] || {};
  const receipt = takeaways.find((row) => row.label === "Receipt Carries") || {};
  const chapterLine = rows.map((row) => row.label).filter(Boolean).join(" -> ");
  return [
    {
      label: "Lede",
      status: lead.status || "source_review",
      title: lead.title || "The issue needs a lead",
      body: lead.storyFrame || "Choose a lead chapter before the story can publish as a reader package.",
      source: lead.source,
      sourceLabel: lead.sourceLabel,
    },
    {
      label: "Nut Graf",
      status: explainer.status || "source_review",
      title: explainer.title || "Explain the pattern",
      body: chapterLine
        ? `The issue moves through ${chapterLine}, keeping proof and caveat attached to each turn.`
        : "The issue needs a chapter sequence before the pattern can be summarized.",
      source: explainer.source,
      sourceLabel: explainer.sourceLabel,
    },
    {
      label: "Receipt",
      status: receipt.status || "source_review",
      title: receipt.title || "Source receipt required",
      body: receipt.body || "Attach a visible source receipt before using the chapter as reader-facing proof.",
      source: receipt.source,
      sourceLabel: receipt.sourceLabel,
    },
    {
      label: "Boundary",
      status: boundary.status || "missing_vintage_slot",
      title: "Claim boundary",
      body: boundary.claimBoundary || "Keep unsupported formulation, date, and lineage claims out of the reader synopsis.",
      source: boundary.source,
      sourceLabel: boundary.sourceLabel,
    },
    {
      label: "Close",
      status: close.status || "source_review",
      title: close.title || "Close with source notes",
      body: close.nextTurn || "Close with source notes and claim boundaries visible.",
      source: close.source,
      sourceLabel: close.sourceLabel,
    },
  ];
}

function corpusArcReaderLead(synopsisRows, sequenceRows) {
  const rows = Array.isArray(synopsisRows) ? synopsisRows : [];
  const sequence = Array.isArray(sequenceRows) ? sequenceRows : [];
  const byLabel = (label) => rows.find((row) => row.label === label) || {};
  const lede = byLabel("Lede");
  const nutGraf = byLabel("Nut Graf");
  const receipt = byLabel("Receipt");
  const boundary = byLabel("Boundary");
  const close = byLabel("Close");
  const sourceRows = sequence.filter((row) => row.source);
  const boundaryRows = sequence.filter((row) => presentText(row.claimBoundary));
  return {
    status: lede.status || "source_review",
    eyebrow: "Reader Lead",
    headline: lede.title || "The issue needs a lead story",
    dek: nutGraf.body || lede.body || "Build a reader-facing lead before opening the analytic surfaces.",
    proofLine: receipt.body || "Attach a visible receipt before the lead carries proof.",
    boundaryLine: boundary.body || "Keep unverified formulation and lineage claims out of the lead.",
    closeLine: close.body || "Close with source notes and claim boundaries visible.",
    source: lede.source || receipt.source || close.source,
    sourceLabel: lede.sourceLabel || receipt.sourceLabel || close.sourceLabel,
    stats: [
      ["candidate_found", "Chapters", sequence.length],
      ["source_review", "Source Links", sourceRows.length],
      ["missing_vintage_slot", "Boundaries", boundaryRows.length],
    ],
  };
}

function corpusArcCoverDeck(readerLead, takeawayRows, synopsisRows) {
  const takeaways = Array.isArray(takeawayRows) ? takeawayRows : [];
  const synopsis = Array.isArray(synopsisRows) ? synopsisRows : [];
  const bySynopsis = (label) => synopsis.find((row) => row.label === label) || {};
  const receipt = bySynopsis("Receipt");
  const boundary = bySynopsis("Boundary");
  const close = bySynopsis("Close");
  return {
    status: readerLead.status || "source_review",
    title: readerLead.headline || "Issue cover needs a headline",
    deck: readerLead.dek || "Build the reader issue from source-linked chapters before opening the diagnostics.",
    proof: readerLead.proofLine || receipt.body || "Visible receipt needed before stronger cover language.",
    boundary: readerLead.boundaryLine || boundary.body || "Keep unsupported claims outside the cover treatment.",
    close: readerLead.closeLine || close.body || "Close with source notes and claim boundaries visible.",
    source: readerLead.source || receipt.source || boundary.source || close.source,
    sourceLabel: readerLead.sourceLabel || receipt.sourceLabel || boundary.sourceLabel || close.sourceLabel,
    lines: takeaways.map((row) => ({
      status: row.status || "source_review",
      label: row.label,
      title: row.title,
      body: row.body,
      source: row.source,
      sourceLabel: row.sourceLabel,
    })),
  };
}

function corpusArcIssueContentsRows(sequenceRows) {
  const rows = Array.isArray(sequenceRows) ? sequenceRows : [];
  return rows.map((row, index) => ({
    number: row.number || String(index + 1).padStart(2, "0"),
    label: row.label || `Chapter ${index + 1}`,
    role: row.role || "Story chapter",
    status: row.status || "source_review",
    title: row.title || row.storyFrame || "Untitled chapter",
    question: row.readerQuestion || "What should the reader understand in this chapter?",
    teaser: row.storyFrame || row.proofOnScreen || row.nextTurn || "",
    boundary: row.claimBoundary || "Claim boundary needed before publication.",
    source: row.source,
    sourceLabel: row.sourceLabel,
  }));
}

function corpusArcIssueNavigatorRows(contentsRows) {
  const rows = Array.isArray(contentsRows) ? contentsRows : [];
  return rows.map((row, index) => ({
    number: row.number,
    label: row.label,
    status: row.status,
    title: row.title,
    role: row.role,
    cue: row.question,
    source: row.source,
    sourceLabel: row.sourceLabel,
    connector: index < rows.length - 1 ? "Next" : "Close",
  }));
}

function corpusArcIssueGalleryRows(copyRows) {
  const rows = Array.isArray(copyRows) ? copyRows : [];
  return rows.map((copy, index) => {
    const receiptReady = Boolean(copy.source);
    const boundaryReady = presentText(copy.caveatCaption);
    const nextReady = presentText(copy.proofMove);
    return {
      number: copy.number || String(index + 1).padStart(2, "0"),
      label: copy.label || `Chapter ${index + 1}`,
      role: copy.pageRole || "Story chapter",
      status: copy.status || "source_review",
      product: copy.leadName || "Story product",
      headline: copy.headline || "Story headline needed",
      deck: copy.dek || "Attach a source-linked story frame before this card can carry public copy.",
      receipt: copy.receiptCaption || "Receipt caption needed before publication.",
      caveat: copy.caveatCaption || "Claim boundary needed before publication.",
      nextProof: copy.proofMove || "Name the next proof object before strengthening the story.",
      source: copy.source,
      sourceLabel: copy.receiptLine || copy.sourceLabel,
      chips: [
        {
          label: "Receipt",
          value: receiptReady ? "Linked" : "Missing",
          status: receiptReady ? "source_review" : "missing_vintage_slot",
        },
        {
          label: "Boundary",
          value: boundaryReady ? "Visible" : "Needed",
          status: boundaryReady ? "missing_vintage_slot" : "candidate_needs_archive",
        },
        {
          label: "Next",
          value: nextReady ? "Named" : "Needed",
          status: nextReady ? "candidate_found" : "candidate_needs_archive",
        },
      ],
    };
  });
}

function corpusArcFeatureSpread(galleryRows) {
  const rows = Array.isArray(galleryRows) ? galleryRows : [];
  const lead = rows[0] || {};
  const chipStatus = (label, fallback) => (
    (lead.chips || []).find((chip) => chip.label === label)?.status || fallback
  );
  const proofRows = [
    {
      label: "Reader Hook",
      status: lead.status || "source_review",
      body: lead.deck || "The story needs a reader-facing hook before it can open the issue.",
    },
    {
      label: "Receipt",
      status: chipStatus("Receipt", lead.source ? "source_review" : "missing_vintage_slot"),
      body: lead.receipt || "Attach a source receipt before using this as public proof.",
    },
    {
      label: "Caveat",
      status: chipStatus("Boundary", "missing_vintage_slot"),
      body: lead.caveat || "Keep unsupported formulation, date, and identity claims out of the feature.",
    },
    {
      label: "Next Proof",
      status: chipStatus("Next", "candidate_found"),
      body: lead.nextProof || "Name the next proof object before strengthening the story.",
    },
  ];
  const captionLabels = [
    ["Scene", "What the reader can enter"],
    ["Receipt", "What carries attribution"],
    ["Boundary", "What stays caveated"],
    ["Next", "What reporting unlocks"],
  ];
  return {
    status: lead.status || "source_review",
    number: lead.number || "01",
    label: lead.label || "Feature",
    role: lead.role || "Reader story",
    product: lead.product || "Story product",
    headline: lead.headline || "Feature headline needed",
    deck: lead.deck || "Attach a source-linked story frame before this spread can carry public copy.",
    source: lead.source,
    sourceLabel: lead.sourceLabel,
    proofRows,
    captionRows: proofRows.map((row, index) => ({
      label: captionLabels[index]?.[0] || row.label,
      role: captionLabels[index]?.[1] || "Proof role",
      status: row.status,
      body: row.body,
      source: index === 1 ? lead.source : "",
      sourceLabel: index === 1 ? lead.sourceLabel : "",
    })),
    claimLedgerRows: [
      {
        label: "Can Show",
        status: lead.status || "source_review",
        title: lead.product || "Reader scene",
        body: lead.deck || "The story can show a source-linked reader scene, but needs a clearer proof object before stronger claims.",
        source: lead.source,
        sourceLabel: lead.sourceLabel,
      },
      {
        label: "Cannot Say Yet",
        status: chipStatus("Boundary", "missing_vintage_slot"),
        title: "No unsupported formulation leap",
        body: lead.caveat || "Keep unsupported formulation, date, and identity claims out of the feature.",
        source: "",
        sourceLabel: "",
      },
      {
        label: "Unlocks With",
        status: chipStatus("Next", "candidate_found"),
        title: "Next proof object",
        body: lead.nextProof || "Name the next proof object before strengthening the story.",
        source: "",
        sourceLabel: "",
      },
    ],
    articleRows: [
      {
        kicker: "Scene",
        status: lead.status || "source_review",
        title: lead.product || "Story product",
        body: lead.deck || "The story needs a reader-facing hook before it can open the issue.",
      },
      {
        kicker: "Receipt",
        status: chipStatus("Receipt", lead.source ? "source_review" : "missing_vintage_slot"),
        title: lead.sourceLabel || "Source receipt",
        body: lead.receipt || "Attach a source receipt before using this as public proof.",
      },
      {
        kicker: "Boundary",
        status: chipStatus("Boundary", "missing_vintage_slot"),
        title: "What the story must not imply",
        body: lead.caveat || "Keep unsupported formulation, date, and identity claims out of the feature.",
      },
      {
        kicker: "Reporting Path",
        status: chipStatus("Next", "candidate_found"),
        title: "What unlocks the stronger version",
        body: lead.nextProof || "Name the next proof object before strengthening the story.",
      },
    ],
    storyboardRows: [
      {
        number: "01",
        label: "Open",
        status: lead.status || "source_review",
        title: lead.product || "Story product",
        body: lead.deck || "The story needs a reader-facing hook before it can open the issue.",
      },
      {
        number: "02",
        label: "Show Receipt",
        status: chipStatus("Receipt", lead.source ? "source_review" : "missing_vintage_slot"),
        title: lead.sourceLabel || "Source receipt",
        body: lead.receipt || "Attach a source receipt before using this as public proof.",
      },
      {
        number: "03",
        label: "Hold Boundary",
        status: chipStatus("Boundary", "missing_vintage_slot"),
        title: "Claim limit",
        body: lead.caveat || "Keep unsupported formulation, date, and identity claims out of the feature.",
      },
      {
        number: "04",
        label: "Report Forward",
        status: chipStatus("Next", "candidate_found"),
        title: "Next proof",
        body: lead.nextProof || "Name the next proof object before strengthening the story.",
      },
    ],
    relatedRows: rows.slice(1, 4).map((row) => ({
      number: row.number,
      label: row.label,
      status: row.status,
      product: row.product,
      headline: row.headline,
      deck: row.deck,
      source: row.source,
      sourceLabel: row.sourceLabel,
    })),
    chips: lead.chips || [],
  };
}

function corpusStoryArcPreviewData(productRows) {
  const targetRows = productRows.slice(0, 100);
  const arcRows = corpusStoryArcRows(productRows).filter((arc) => arc.rows.length);
  const definitions = corpusStoryArcDefinitions();
  const productNames = new Set();
  arcRows.forEach((arc) => {
    arc.rows.forEach((row) => productNames.add(row.product.canonical_name || row.product.display_name));
  });
  const total = Math.max(1, targetRows.length);
  const cards = arcRows.map((arc) => {
    const lead = arc.rows[0];
    const leadName = lead ? lead.product.display_name || lead.product.canonical_name : "No lead product";
    const source = lead ? firstPart(lead.product.best_source_urls || lead.product.starter_search_urls || lead.product.starter_image_urls) : "";
    const leadGate = lead ? arc.productGate(lead) : arc.gate;
    return {
      ...arc,
      pct: Math.round((arc.rows.length / total) * 100),
      lead,
      leadName,
      source,
      sourceLabel: lead ? firstPart(lead.product.top_source_domains) || "Source" : "Source",
      leadGate,
    };
  });
  const spotlightRows = cards.slice(0, 3).map((arc, index) => {
    const lead = arc.lead;
    const best = lead ? visualEvidenceBestRow(lead) : {};
    const nextProof = lead ? corpusStoryBeatUnlock(arc, lead, best) : arc.gate;
    return {
      ...arc,
      index,
      canSay: `${arc.leadName} can anchor a ${arc.shortLabel.toLowerCase()} story because ${arc.leadGate}`,
      locked: arc.gate,
      nextProof,
      supportProducts: corpusNetworkProductNames(arc.rows.slice(1), 5),
      receiptLine: best.source_title || best.source_domain || arc.sourceLabel || "Source receipt needed",
      evidenceStatus: rowEvidenceStatus(best) || arc.status,
    };
  });
  const scriptRows = cards.map((arc, index) => {
    const lead = arc.lead;
    const best = lead ? visualEvidenceBestRow(lead) : {};
    const nextProof = lead ? corpusStoryBeatUnlock(arc, lead, best) : arc.gate;
    const receiptTitle = best.source_title || best.source_domain || arc.sourceLabel || "Source receipt needed";
    return {
      key: arc.key,
      index,
      label: arc.shortLabel,
      title: arc.label,
      status: rowEvidenceStatus(best) || arc.status,
      leadName: arc.leadName,
      source: arc.source,
      sourceLabel: arc.sourceLabel,
      beats: [
        {
          label: "Open",
          status: arc.status,
          text: `${arc.leadName} opens the ${arc.shortLabel.toLowerCase()} arc for ${pluralize(arc.rows.length, "product")}.`,
        },
        {
          label: "Receipt",
          status: rowEvidenceStatus(best) || "source_review",
          text: receiptTitle,
        },
        {
          label: "Boundary",
          status: "missing_vintage_slot",
          text: arc.gate,
        },
        {
          label: "Unlock",
          status: lead?.facts?.visibleLabels || lead?.facts?.manualLabels ? "label_visible" : "candidate_found",
          text: nextProof,
        },
      ],
    };
  });
  const receiptRows = cards.map((arc, index) => {
    const lead = arc.lead;
    const best = lead ? visualEvidenceBestRow(lead) : {};
    const source = best.source_url || best.archive_url || arc.source;
    const sourceLabel = best.source_domain || best.source_publisher_owner || arc.sourceLabel;
    const sourceTitle = best.source_title || best.source_publisher_owner || sourceLabel || "Source receipt needed";
    const evidenceStatus = rowEvidenceStatus(best) || arc.status;
    const vintage = vintageLabels[best.vintage_label] || labelFor(best.vintage_label || lead?.product?.missing_vintages || "current evidence");
    const reviewerNote = best.reviewer_notes || best.unsupported_gap_note || best.ground_truth_fields_missing || arc.gate;
    return {
      key: arc.key,
      index,
      label: arc.shortLabel,
      title: arc.label,
      leadName: arc.leadName,
      source,
      sourceLabel,
      sourceTitle,
      evidenceStatus,
      vintage,
      reviewerNote,
      gate: arc.gate,
      nextProof: lead ? corpusStoryBeatUnlock(arc, lead, best) : arc.gate,
    };
  });
  const terrainRows = corpusArcTerrainRows(cards);
  const terrainBands = [
    corpusArcTerrainBand(75, 65),
    corpusArcTerrainBand(75, 25),
    corpusArcTerrainBand(35, 65),
    corpusArcTerrainBand(35, 25),
  ];
  const routeRows = corpusArcStoryRouteRows(terrainRows);
  const frameRows = corpusArcReaderFrameRows(routeRows);
  const copyRows = corpusArcCopyDeskRows(frameRows);
  const issueSpread = corpusArcIssueSpread(copyRows);
  const guardrailRows = corpusArcClaimGuardrailRows(copyRows);
  const sourceNoteRows = corpusArcSourceNoteRows(copyRows);
  const readerSequenceRows = corpusArcReaderSequenceRows(copyRows);
  const readerTakeawayRows = corpusArcReaderTakeawayRows(readerSequenceRows);
  const readerSynopsisRows = corpusArcReaderSynopsisRows(readerSequenceRows, readerTakeawayRows);
  const readerLead = corpusArcReaderLead(readerSynopsisRows, readerSequenceRows);
  const readerCoverDeck = corpusArcCoverDeck(readerLead, readerTakeawayRows, readerSynopsisRows);
  const readerContentsRows = corpusArcIssueContentsRows(readerSequenceRows);
  const readerNavigatorRows = corpusArcIssueNavigatorRows(readerContentsRows);
  const readerGalleryRows = corpusArcIssueGalleryRows(copyRows);
  const readerFeatureSpread = corpusArcFeatureSpread(readerGalleryRows);
  const proofLadderRows = cards.map((arc) => {
    const sourceProducts = arc.rows.filter((row) => corpusArcSourceCount(row) > 0).length;
    const photoProducts = arc.rows.filter((row) => row.facts.usablePhotos || numeric(row.product.photo_evidence_rows)).length;
    const labelProducts = arc.rows.filter((row) => row.facts.visibleLabels).length;
    const verifiedProducts = arc.rows.filter((row) => row.facts.manualLabels || numeric(row.product.ground_truth_slots)).length;
    const gapProducts = arc.rows.filter((row) => numeric(row.product.slots_without_sources) || presentText(row.product.missing_vintages) || presentText(row.product.archive_needed_vintages)).length;
    const denominator = Math.max(1, arc.rows.length);
    return {
      key: arc.key,
      label: arc.shortLabel,
      title: arc.label,
      status: verifiedProducts ? "manual_verified" : labelProducts ? "label_visible" : photoProducts ? "usable_photo" : sourceProducts ? "source_review" : "missing_vintage_slot",
      products: arc.rows.length,
      gate: arc.gate,
      stages: [
        {
          label: "Source",
          status: sourceProducts ? "source_review" : "missing_vintage_slot",
          value: sourceProducts,
          pct: Math.round((sourceProducts / denominator) * 100),
        },
        {
          label: "Photo",
          status: photoProducts ? "usable_photo" : "candidate_needs_panel",
          value: photoProducts,
          pct: Math.round((photoProducts / denominator) * 100),
        },
        {
          label: "Label",
          status: labelProducts ? "label_visible" : "candidate_needs_transcription",
          value: labelProducts,
          pct: Math.round((labelProducts / denominator) * 100),
        },
        {
          label: "Verified",
          status: verifiedProducts ? "manual_verified" : "source_review",
          value: verifiedProducts,
          pct: Math.round((verifiedProducts / denominator) * 100),
        },
        {
          label: "Gap",
          status: gapProducts ? "missing_vintage_slot" : "manual_verified",
          value: gapProducts,
          pct: Math.round((gapProducts / denominator) * 100),
        },
      ],
    };
  });
  const matrixRows = targetRows
    .map((row) => {
      const cells = definitions.map((definition) => {
        const active = definition.match(row);
        let status = "not_applicable";
        if (active && definition.key === "ingredient_proof") {
          status = row.facts.manualLabels
            ? "manual_verified"
            : row.facts.visibleLabels
              ? "label_visible"
              : row.facts.usablePhotos
                ? "usable_photo"
                : "source_review";
        } else if (active && definition.key === "package_economics") {
          status = corpusArcHasPackageContext(row) && corpusNetworkHasPriceSignals(row)
            ? "candidate_found"
            : "source_review";
        } else if (active && definition.key === "maker_lineage") {
          status = corpusArcHasMakerContext(row) ? "source_review" : "candidate_needs_archive";
        } else if (active && definition.key === "origin_gap") {
          status = "missing_vintage_slot";
        } else if (active && definition.key === "collector_photo") {
          status = row.facts.visibleLabels ? "label_visible" : row.facts.usablePhotos ? "usable_photo" : "source_review";
        } else if (active && definition.key === "fast_food_docs") {
          status = "source_review";
        }
        return {
          key: definition.key,
          label: definition.shortLabel,
          active,
          status,
          detail: active ? definition.productGate(row) : "No supported story lane under current filters.",
        };
      });
      const activeCount = cells.filter((cell) => cell.active).length;
      const primary = definitions
        .filter((definition) => definition.match(row))
        .map((definition) => ({ ...definition, arcScore: definition.score(row) }))
        .sort((a, b) => b.arcScore - a.arcScore)[0];
      return {
        ...row,
        productName: row.product.display_name || row.product.canonical_name,
        category: labelFor(row.product.category || "Product"),
        source: firstPart(row.product.best_source_urls || row.product.starter_search_urls || row.product.starter_image_urls),
        sourceLabel: firstPart(row.product.top_source_domains) || "Source",
        cells,
        activeCount,
        primaryGate: primary ? primary.productGate(row) : storyGapLabel(row),
      };
    })
    .filter((row) => row.activeCount)
    .sort((a, b) => b.activeCount - a.activeCount || b.score - a.score)
    .slice(0, 10);
  return {
    cards,
    terrainRows,
    terrainBands,
    routeRows,
    frameRows,
    copyRows,
    issueSpread,
    guardrailRows,
    sourceNoteRows,
    readerSequenceRows,
    readerTakeawayRows,
    readerSynopsisRows,
    readerLead,
    readerCoverDeck,
    readerContentsRows,
    readerNavigatorRows,
    readerGalleryRows,
    readerFeatureSpread,
    spotlightRows,
    scriptRows,
    receiptRows,
    proofLadderRows,
    matrixRows,
    summaryRows: [
      ["source_review", "Narrative Arcs", arcRows.length],
      ["candidate_found", "Products In Arcs", productNames.size],
      ["label_visible", "Label-Visible", targetRows.filter((row) => row.facts.visibleLabels).length],
      ["missing_vintage_slot", "Open Vintage Slots", targetRows.reduce((sum, row) => sum + numeric(row.product.slots_without_sources), 0)],
    ],
  };
}

function renderCorpusStoryArcPreview(productRows) {
  if (!els.corpusStoryArcPreview) return;
  const data = corpusStoryArcPreviewData(productRows);
  if (!data.cards.length) {
    els.corpusStoryArcPreview.innerHTML = `<p class="empty-note">No corpus story arcs match the current filters.</p>`;
    return;
  }
  els.corpusStoryArcPreview.innerHTML = `
    <article class="corpus-arc-preview">
      <header class="corpus-arc-preview-head">
        <div>
          <p class="eyebrow">Arc Preview</p>
          <h3>The corpus reads as a set of proof-aware story families</h3>
          <p>This preview gives the reader the big pattern first: which narrative families exist, which products lead them, what can be said now, and what proof gate keeps the stronger claim locked.</p>
        </div>
        <aside class="corpus-arc-preview-summary" aria-label="Corpus arc preview summary">
          ${data.summaryRows.map(([status, label, value]) => `
            <span class="status-${escapeHtml(status)}">
              <strong>${formatNumber(value)}</strong> ${escapeHtml(label)}
            </span>
          `).join("")}
        </aside>
      </header>
      <section class="corpus-arc-preview-lead status-${escapeHtml(data.readerLead.status)}" aria-label="Reader lead">
        <article class="corpus-arc-preview-lead-copy">
          <span>${escapeHtml(data.readerLead.eyebrow)}</span>
          <strong>${escapeHtml(data.readerLead.headline)}</strong>
          <p>${escapeHtml(data.readerLead.dek)}</p>
          <footer>
            ${statusTag(data.readerLead.status)}
            ${linkOrText(data.readerLead.source, data.readerLead.sourceLabel)}
          </footer>
        </article>
        <aside class="corpus-arc-preview-lead-proof" aria-label="Reader lead proof">
          <section>
            <span>Receipt</span>
            <p>${escapeHtml(clipped(data.readerLead.proofLine, 150))}</p>
          </section>
          <section>
            <span>Boundary</span>
            <p>${escapeHtml(clipped(data.readerLead.boundaryLine, 150))}</p>
          </section>
          <section>
            <span>Close</span>
            <p>${escapeHtml(clipped(data.readerLead.closeLine, 150))}</p>
          </section>
        </aside>
        <aside class="corpus-arc-preview-lead-stats" aria-label="Reader lead stats">
          ${data.readerLead.stats.map(([status, label, value]) => `
            <span class="status-${escapeHtml(status)}">
              <strong>${formatNumber(value)}</strong> ${escapeHtml(label)}
            </span>
          `).join("")}
        </aside>
      </section>
      <section class="corpus-arc-preview-cover-deck status-${escapeHtml(data.readerCoverDeck.status)}" aria-label="Reader cover deck">
        <article class="corpus-arc-preview-cover-sheet">
          <span>Cover Deck</span>
          <strong>${escapeHtml(data.readerCoverDeck.title)}</strong>
          <p>${escapeHtml(data.readerCoverDeck.deck)}</p>
          <footer>
            ${statusTag(data.readerCoverDeck.status)}
            ${linkOrText(data.readerCoverDeck.source, data.readerCoverDeck.sourceLabel)}
          </footer>
        </article>
        <aside class="corpus-arc-preview-cover-proof" aria-label="Cover proof and boundary">
          <section>
            <span>Proof</span>
            <p>${escapeHtml(clipped(data.readerCoverDeck.proof, 128))}</p>
          </section>
          <section>
            <span>Boundary</span>
            <p>${escapeHtml(clipped(data.readerCoverDeck.boundary, 128))}</p>
          </section>
          <section>
            <span>Close</span>
            <p>${escapeHtml(clipped(data.readerCoverDeck.close, 128))}</p>
          </section>
        </aside>
        <aside class="corpus-arc-preview-cover-lines" aria-label="Cover lines">
          ${data.readerCoverDeck.lines.map((line) => `
            <section class="status-${escapeHtml(line.status)}">
              <span>${escapeHtml(line.label)}</span>
              <strong>${escapeHtml(line.title)}</strong>
              <p>${escapeHtml(clipped(line.body, 92))}</p>
              <div class="lead-meta">
                ${statusTag(line.status)}
                ${linkOrText(line.source, line.sourceLabel)}
              </div>
            </section>
          `).join("")}
        </aside>
      </section>
      <section class="corpus-arc-preview-feature status-${escapeHtml(data.readerFeatureSpread.status)}" aria-label="Reader feature spread">
        <article class="corpus-arc-preview-feature-lede">
          <figure>
            <span>Feature Spread</span>
            <strong>${escapeHtml(data.readerFeatureSpread.number)}</strong>
            <em>${escapeHtml(data.readerFeatureSpread.label)}</em>
          </figure>
          <div class="corpus-arc-preview-feature-copy">
            <span>${escapeHtml(data.readerFeatureSpread.product)}</span>
            <strong>${escapeHtml(data.readerFeatureSpread.headline)}</strong>
            <p>${escapeHtml(data.readerFeatureSpread.deck)}</p>
            <footer>
              ${statusTag(data.readerFeatureSpread.status)}
              ${linkOrText(data.readerFeatureSpread.source, data.readerFeatureSpread.sourceLabel)}
            </footer>
          </div>
        </article>
        <aside class="corpus-arc-preview-feature-proof" aria-label="Feature proof rail">
          ${data.readerFeatureSpread.proofRows.map((row) => `
            <section class="status-${escapeHtml(row.status)}">
              <span>${escapeHtml(row.label)}</span>
              <p>${escapeHtml(clipped(row.body, 128))}</p>
            </section>
          `).join("")}
        </aside>
        <aside class="corpus-arc-preview-feature-related" aria-label="Related issue chapters">
          <span>Related Chapters</span>
          ${data.readerFeatureSpread.relatedRows.map((row) => `
            <article class="status-${escapeHtml(row.status)}">
              <strong>${escapeHtml(`${row.number} ${row.label}`)}</strong>
              <p>${escapeHtml(clipped(row.headline || row.deck, 104))}</p>
              <div class="lead-meta">
                ${statusTag(row.status)}
                ${linkOrText(row.source, row.sourceLabel)}
              </div>
            </article>
          `).join("")}
        </aside>
      </section>
      <section class="corpus-arc-preview-article" aria-label="Annotated reader article">
        <div class="subsection-title">
          <strong>Annotated Story</strong>
          <span>A readable article pass where each paragraph keeps its evidence role visible</span>
        </div>
        <div class="corpus-arc-preview-article-layout">
          <article class="corpus-arc-preview-article-main status-${escapeHtml(data.readerFeatureSpread.status)}">
            <header>
              <span>${escapeHtml(`${data.readerFeatureSpread.number} ${data.readerFeatureSpread.label}`)}</span>
              <strong>${escapeHtml(data.readerFeatureSpread.headline)}</strong>
            </header>
            ${data.readerFeatureSpread.articleRows.map((row) => `
              <section class="status-${escapeHtml(row.status)}">
                <span>${escapeHtml(row.kicker)}</span>
                <strong>${escapeHtml(row.title)}</strong>
                <p>${escapeHtml(row.body)}</p>
              </section>
            `).join("")}
          </article>
          <aside class="corpus-arc-preview-article-rail" aria-label="Annotated story source rail">
            ${data.readerFeatureSpread.articleRows.map((row) => `
              <section class="status-${escapeHtml(row.status)}">
                <span>${escapeHtml(row.kicker)}</span>
                ${statusTag(row.status)}
                <p>${escapeHtml(clipped(row.body, 120))}</p>
              </section>
            `).join("")}
            <footer>
              ${linkOrText(data.readerFeatureSpread.source, data.readerFeatureSpread.sourceLabel)}
            </footer>
          </aside>
        </div>
      </section>
      <section class="corpus-arc-preview-storyboard" aria-label="Feature storyboard">
        <div class="subsection-title">
          <strong>Feature Storyboard</strong>
          <span>The feature story as four visual beats before the issue route continues</span>
        </div>
        <div class="corpus-arc-preview-storyboard-track">
          ${data.readerFeatureSpread.storyboardRows.map((row) => `
            <article class="corpus-arc-preview-storyboard-panel status-${escapeHtml(row.status)}">
              <figure>
                <span>${escapeHtml(row.number)}</span>
                <strong>${escapeHtml(row.label)}</strong>
              </figure>
              <section>
                <span>${escapeHtml(row.title)}</span>
                <p>${escapeHtml(clipped(row.body, 128))}</p>
              </section>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-captions" aria-label="Feature proof captions">
        <div class="subsection-title">
          <strong>Proof Captions</strong>
          <span>Fast claim controls for what the feature shows, sources, caveats, and unlocks</span>
        </div>
        <div class="corpus-arc-preview-caption-grid">
          ${data.readerFeatureSpread.captionRows.map((row) => `
            <article class="corpus-arc-preview-caption-card status-${escapeHtml(row.status)}">
              <header>
                <span>${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.role)}</strong>
              </header>
              <p>${escapeHtml(clipped(row.body, 118))}</p>
              <footer>
                ${statusTag(row.status)}
                ${linkOrText(row.source, row.sourceLabel)}
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-claim-ledger" aria-label="Feature claim ledger">
        <div class="subsection-title">
          <strong>Feature Claim Ledger</strong>
          <span>What the feature can show now, what it must not imply, and what proof would unlock stronger language</span>
        </div>
        <div class="corpus-arc-preview-claim-ledger-grid">
          ${data.readerFeatureSpread.claimLedgerRows.map((row) => `
            <article class="corpus-arc-preview-claim-ledger-card status-${escapeHtml(row.status)}">
              <header>
                <span>${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.title)}</strong>
              </header>
              <p>${escapeHtml(clipped(row.body, 160))}</p>
              <footer>
                ${statusTag(row.status)}
                ${linkOrText(row.source, row.sourceLabel)}
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-navigator" aria-label="Issue navigator">
        <div class="subsection-title">
          <strong>Issue Navigator</strong>
          <span>The story route as connected reader steps before the full contents cards</span>
        </div>
        <div class="corpus-arc-preview-navigator-track">
          ${data.readerNavigatorRows.map((row) => `
            <article class="corpus-arc-preview-nav-step status-${escapeHtml(row.status)}">
              <header>
                <span>${escapeHtml(row.number)}</span>
                <strong>${escapeHtml(row.label)}</strong>
              </header>
              <p>${escapeHtml(clipped(row.cue, 112))}</p>
              <footer>
                <em>${escapeHtml(row.connector)}</em>
                <div class="lead-meta">
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </div>
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-gallery" aria-label="Issue story gallery">
        <div class="subsection-title">
          <strong>Issue Story Gallery</strong>
          <span>Reader cards that keep the hook, source receipt, caveat, and next proof move together</span>
        </div>
        <div class="corpus-arc-preview-gallery-grid">
          ${data.readerGalleryRows.map((row) => `
            <article class="corpus-arc-preview-gallery-card status-${escapeHtml(row.status)}">
              <figure>
                <span>${escapeHtml(row.number)}</span>
                <strong>${escapeHtml(row.label)}</strong>
                <em>${escapeHtml(row.role)}</em>
              </figure>
              <div class="corpus-arc-preview-gallery-copy">
                <header>
                  <span>${escapeHtml(row.product)}</span>
                  <strong>${escapeHtml(row.headline)}</strong>
                </header>
                <p>${escapeHtml(clipped(row.deck, 150))}</p>
                <dl>
                  <dt>Receipt</dt>
                  <dd>${escapeHtml(clipped(row.receipt, 104))}</dd>
                  <dt>Caveat</dt>
                  <dd>${escapeHtml(clipped(row.caveat, 104))}</dd>
                  <dt>Next</dt>
                  <dd>${escapeHtml(clipped(row.nextProof, 104))}</dd>
                </dl>
                <footer>
                  <div class="corpus-arc-preview-gallery-chips">
                    ${row.chips.map((chip) => `
                      <span class="status-${escapeHtml(chip.status)}">
                        <strong>${escapeHtml(chip.label)}</strong>
                        <em>${escapeHtml(chip.value)}</em>
                      </span>
                    `).join("")}
                  </div>
                  <div class="lead-meta">
                    ${statusTag(row.status)}
                    ${linkOrText(row.source, row.sourceLabel)}
                  </div>
                </footer>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-contents" aria-label="Issue contents">
        <div class="subsection-title">
          <strong>Issue Contents</strong>
          <span>The reader path through the package, with source and claim-boundary signals attached to each chapter</span>
        </div>
        <div class="corpus-arc-preview-contents-grid">
          ${data.readerContentsRows.map((row) => `
            <article class="corpus-arc-preview-content-card status-${escapeHtml(row.status)}">
              <header>
                <span>${escapeHtml(row.number)} ${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.title)}</strong>
                <em>${escapeHtml(row.role)}</em>
              </header>
              <section>
                <span>Reader Question</span>
                <p>${escapeHtml(row.question)}</p>
              </section>
              <section>
                <span>Chapter Tease</span>
                <p>${escapeHtml(clipped(row.teaser, 118))}</p>
              </section>
              <footer>
                <span>Boundary</span>
                <p>${escapeHtml(clipped(row.boundary, 118))}</p>
                <div class="lead-meta">
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </div>
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-terrain" aria-label="Story terrain by proof and tension">
        <div class="subsection-title">
          <strong>Story Terrain</strong>
          <span>Proof strength against unresolved vintage tension, so the reader path starts with the strongest story shape</span>
        </div>
        <div class="corpus-arc-preview-terrain-board">
          ${data.terrainBands.map((band) => {
            const rows = data.terrainRows.filter((row) => row.band.key === band.key);
            return `
              <article class="corpus-arc-preview-terrain-cell status-${escapeHtml(band.status)}">
                <header>
                  <span>${escapeHtml(band.axis)}</span>
                  <strong>${escapeHtml(band.label)}</strong>
                  <em>${pluralize(rows.length, "arc")}</em>
                </header>
                <div class="corpus-arc-preview-terrain-stack">
                  ${rows.length
                    ? rows.map((arc) => `
                      <section class="corpus-arc-preview-terrain-chip status-${escapeHtml(arc.status)}">
                        <header>
                          <span>${escapeHtml(arc.label)}</span>
                          <strong>${escapeHtml(arc.leadName)}</strong>
                        </header>
                        <div class="corpus-arc-preview-terrain-bars" aria-label="${escapeHtml(arc.label)} proof and tension">
                          <span><i style="width:${Math.max(4, arc.proofScore)}%"></i></span>
                          <span><i style="width:${Math.max(4, arc.tensionScore)}%"></i></span>
                        </div>
                        <dl>
                          <dt>Proof</dt>
                          <dd>${formatNumber(arc.proofScore)}%</dd>
                          <dt>Tension</dt>
                          <dd>${formatNumber(arc.tensionScore)}%</dd>
                        </dl>
                        <p>${escapeHtml(clipped(arc.move, 132))}</p>
                        <footer>
                          <span>${pluralize(arc.products, "product")}</span>
                          ${linkOrText(arc.source, arc.sourceLabel)}
                        </footer>
                      </section>
                    `).join("")
                    : `<p class="empty-note">${escapeHtml(band.move)}</p>`}
                </div>
              </article>
            `;
          }).join("")}
        </div>
        <footer class="corpus-arc-preview-terrain-legend">
          <span><i class="proof"></i> Proof readiness</span>
          <span><i class="tension"></i> Vintage/story tension</span>
          <strong>Use the upper-right arcs for caveated features, lower-right arcs for explainers, and upper-left arcs for honest gap stories.</strong>
        </footer>
      </section>
      <section class="corpus-arc-preview-route" aria-label="Story route from terrain to issue structure">
        <div class="subsection-title">
          <strong>Story Route</strong>
          <span>Convert the terrain into an issue sequence: opener, explainer, evidence hunt, and supporting sidebar</span>
        </div>
        <div class="corpus-arc-preview-route-grid">
          ${data.routeRows.map((stage) => `
            <article class="corpus-arc-preview-route-card status-${escapeHtml(stage.status)}">
              <header>
                <span>${escapeHtml(stage.number)} ${escapeHtml(stage.label)}</span>
                <strong>${escapeHtml(stage.title)}</strong>
                <em>${escapeHtml(stage.pageRole)}</em>
              </header>
              <section>
                <span>Use For</span>
                <p>${escapeHtml(stage.useFor)}</p>
              </section>
              <section>
                <span>Arcs</span>
                <div class="corpus-arc-preview-route-arcs">
                  ${stage.rows.length
                    ? stage.rows.map((arc) => `
                      <strong class="status-${escapeHtml(arc.status)}">
                        ${escapeHtml(arc.label)}
                        <small>${formatNumber(arc.proofScore)}p / ${formatNumber(arc.tensionScore)}t</small>
                      </strong>
                    `).join("")
                    : `<em>No matching arc under the current filters</em>`}
                </div>
              </section>
              <footer>
                <span>Keep Visible</span>
                <p>${escapeHtml(clipped(stage.nextMove || stage.caveat, 144))}</p>
                <div class="corpus-arc-preview-route-meter" aria-label="${escapeHtml(stage.label)} average proof and tension">
                  <span><i style="width:${Math.max(stage.proof ? 5 : 0, stage.proof)}%"></i></span>
                  <span><i style="width:${Math.max(stage.tension ? 5 : 0, stage.tension)}%"></i></span>
                </div>
                <div class="lead-meta">
                  ${statusTag(stage.status)}
                  ${linkOrText(stage.source, stage.sourceLabel)}
                </div>
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-frames" aria-label="Reader-facing issue frames">
        <div class="subsection-title">
          <strong>Reader Frames</strong>
          <span>What each issue chapter shows the reader, with proof, caveat, and next move kept in the frame</span>
        </div>
        <div class="corpus-arc-preview-frame-grid">
          ${data.frameRows.map((frame) => `
            <article class="corpus-arc-preview-frame-card status-${escapeHtml(frame.status)}">
              <header>
                <span>${escapeHtml(frame.number)} ${escapeHtml(frame.label)}</span>
                <strong>${escapeHtml(frame.leadName)}</strong>
                <em>${escapeHtml(frame.pageRole)}</em>
              </header>
              <section>
                <span>Reader Sees</span>
                <p>${escapeHtml(frame.scene)}</p>
              </section>
              <section>
                <span>Proof On Screen</span>
                <p>${escapeHtml(frame.proofLine)}</p>
              </section>
              <section>
                <span>Caveat</span>
                <p>${escapeHtml(frame.caveatLine)}</p>
              </section>
              <footer>
                <span>Next Move</span>
                <p>${escapeHtml(clipped(frame.nextLine, 136))}</p>
                <div class="lead-meta">
                  ${statusTag(frame.status)}
                  ${linkOrText(frame.source, frame.receiptLine)}
                </div>
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-copy" aria-label="Story copy desk">
        <div class="subsection-title">
          <strong>Copy Desk</strong>
          <span>Chapter copy with receipt captions, caveat captions, and proof moves attached</span>
        </div>
        <div class="corpus-arc-preview-copy-grid">
          ${data.copyRows.map((copy) => `
            <article class="corpus-arc-preview-copy-card status-${escapeHtml(copy.status)}">
              <header>
                <span>${escapeHtml(copy.eyebrow)}</span>
                <strong>${escapeHtml(copy.headline)}</strong>
                <p>${escapeHtml(copy.dek)}</p>
              </header>
              <section>
                <span>Receipt Caption</span>
                <p>${escapeHtml(copy.receiptCaption)}</p>
              </section>
              <section>
                <span>Caveat Caption</span>
                <p>${escapeHtml(copy.caveatCaption)}</p>
              </section>
              <footer>
                <span>Proof Move</span>
                <p>${escapeHtml(clipped(copy.proofMove, 150))}</p>
                <div class="lead-meta">
                  ${statusTag(copy.status)}
                  ${linkOrText(copy.source, copy.receiptLine)}
                </div>
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-sequence" aria-label="Reader story sequence">
        <div class="subsection-title">
          <strong>Reader Sequence</strong>
          <span>The chapter path as a reader-facing story: question, frame, proof, boundary, and next turn</span>
        </div>
        <div class="corpus-arc-preview-sequence-track">
          ${data.readerSequenceRows.map((row) => `
            <article class="corpus-arc-preview-sequence-card status-${escapeHtml(row.status)}">
              <header>
                <span>${escapeHtml(row.number)} ${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.title)}</strong>
                <em>${escapeHtml(row.role)}</em>
              </header>
              <section>
                <span>Reader Question</span>
                <p>${escapeHtml(row.readerQuestion)}</p>
              </section>
              <section>
                <span>Story Frame</span>
                <p>${escapeHtml(clipped(row.storyFrame, 142))}</p>
              </section>
              <section>
                <span>Proof On Screen</span>
                <p>${escapeHtml(clipped(row.proofOnScreen, 142))}</p>
              </section>
              <section>
                <span>Boundary</span>
                <p>${escapeHtml(clipped(row.claimBoundary, 142))}</p>
              </section>
              <footer>
                <span>Next Turn</span>
                <p>${escapeHtml(row.nextTurn)}</p>
                <div class="lead-meta">
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </div>
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-takeaways" aria-label="Reader story takeaways">
        <div class="subsection-title">
          <strong>Reader Takeaways</strong>
          <span>A fast editorial readout of what the issue teaches, what proves it, what it avoids, and where it lands</span>
        </div>
        <div class="corpus-arc-preview-takeaway-grid">
          ${data.readerTakeawayRows.map((row) => `
            <article class="corpus-arc-preview-takeaway-card status-${escapeHtml(row.status)}">
              <span>${escapeHtml(row.label)}</span>
              <strong>${escapeHtml(row.title)}</strong>
              <p>${escapeHtml(clipped(row.body, 168))}</p>
              <footer>
                <em>${escapeHtml(row.kicker)}</em>
                <div class="lead-meta">
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </div>
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-synopsis" aria-label="Reader story synopsis">
        <div class="subsection-title">
          <strong>Story Synopsis</strong>
          <span>A publishable paragraph stack built from the same source-linked chapters and claim boundaries</span>
        </div>
        <div class="corpus-arc-preview-synopsis-layout">
          <article class="corpus-arc-preview-synopsis-main status-${escapeHtml(data.readerSynopsisRows[0]?.status || "source_review")}">
            <header>
              <span>Draft Reader Copy</span>
              <strong>${escapeHtml(data.readerSynopsisRows[0]?.title || "Story synopsis")}</strong>
            </header>
            <div class="corpus-arc-preview-synopsis-copy">
              ${data.readerSynopsisRows.map((row) => `
                <section class="status-${escapeHtml(row.status)}">
                  <span>${escapeHtml(row.label)}</span>
                  <p>${escapeHtml(row.body)}</p>
                </section>
              `).join("")}
            </div>
          </article>
          <aside class="corpus-arc-preview-synopsis-rail" aria-label="Synopsis source rail">
            ${data.readerSynopsisRows.map((row) => `
              <section class="status-${escapeHtml(row.status)}">
                <span>${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.title)}</strong>
                <div class="lead-meta">
                  ${statusTag(row.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </div>
              </section>
            `).join("")}
          </aside>
        </div>
      </section>
      <section class="corpus-arc-preview-spread" aria-label="Composed issue spread">
        <div class="subsection-title">
          <strong>Issue Spread</strong>
          <span>A composed reader package: cover story, chapter run, and proof rail kept together</span>
        </div>
        <div class="corpus-arc-preview-spread-head">
          <article class="corpus-arc-preview-spread-cover status-${escapeHtml(data.issueSpread.cover.status || "source_review")}">
            <span>Cover Story</span>
            <strong>${escapeHtml(data.issueSpread.cover.headline || "Issue cover needs a lead story")}</strong>
            <p>${escapeHtml(data.issueSpread.cover.dek || "Add a lead chapter before the issue spread can render.")}</p>
            <footer>
              ${statusTag(data.issueSpread.cover.status || "source_review")}
              ${linkOrText(data.issueSpread.cover.source, data.issueSpread.cover.receiptLine)}
            </footer>
          </article>
          <aside class="corpus-arc-preview-spread-summary" aria-label="Issue spread summary">
            ${data.issueSpread.summaryRows.map(([status, label, value]) => `
              <span class="status-${escapeHtml(status)}">
                <strong>${formatNumber(value)}</strong> ${escapeHtml(label)}
              </span>
            `).join("")}
          </aside>
        </div>
        <div class="corpus-arc-preview-spread-layout">
          <section class="corpus-arc-preview-spread-chapters" aria-label="Issue chapter run">
            ${data.issueSpread.chapters.map((chapter) => `
              <article class="corpus-arc-preview-spread-chapter status-${escapeHtml(chapter.status)}">
                <header>
                  <span>${escapeHtml(chapter.number)} ${escapeHtml(chapter.label)}</span>
                  <strong>${escapeHtml(chapter.headline)}</strong>
                </header>
                <p>${escapeHtml(chapter.dek)}</p>
                <footer>
                  ${statusTag(chapter.status)}
                  ${linkOrText(chapter.source, chapter.receiptLine)}
                </footer>
              </article>
            `).join("")}
          </section>
          <aside class="corpus-arc-preview-spread-proof" aria-label="Issue proof rail">
            ${data.issueSpread.proofRows.map((row) => `
              <section class="corpus-arc-preview-spread-proof-row status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(row.number)} ${escapeHtml(row.label)}</span>
                  ${statusTag(row.status)}
                </header>
                <p><strong>Receipt</strong> ${escapeHtml(clipped(row.receiptCaption, 112))}</p>
                <p><strong>Caveat</strong> ${escapeHtml(clipped(row.caveatCaption, 112))}</p>
                <p><strong>Move</strong> ${escapeHtml(clipped(row.proofMove, 112))}</p>
              </section>
            `).join("")}
          </aside>
        </div>
      </section>
      <section class="corpus-arc-preview-guardrails" aria-label="Issue claim guardrails">
        <div class="subsection-title">
          <strong>Claim Guardrails</strong>
          <span>What the issue can say, what it must not imply, and which proof would unlock stronger language</span>
        </div>
        <div class="corpus-arc-preview-guardrail-grid">
          ${data.guardrailRows.map((row) => `
            <article class="corpus-arc-preview-guardrail-row status-${escapeHtml(row.status)}">
              <header>
                <span>${escapeHtml(row.number)} ${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.product)}</strong>
              </header>
              <section>
                <span>Can Say</span>
                <p>${escapeHtml(clipped(row.canSay, 142))}</p>
              </section>
              <section>
                <span>Cannot Say Yet</span>
                <p>${escapeHtml(clipped(row.cannotSay, 142))}</p>
              </section>
              <section>
                <span>Unlock</span>
                <p>${escapeHtml(clipped(row.unlock, 142))}</p>
              </section>
              <footer>
                ${statusTag(row.status)}
                ${linkOrText(row.source, row.sourceLabel)}
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-source-notes" aria-label="Issue source notes">
        <div class="subsection-title">
          <strong>Source Notes</strong>
          <span>Chapter footnotes that keep source receipt, story role, and claim boundary visible</span>
        </div>
        <div class="corpus-arc-preview-source-note-grid">
          ${data.sourceNoteRows.map((note) => `
            <article class="corpus-arc-preview-source-note status-${escapeHtml(note.status)}">
              <header>
                <span>${escapeHtml(note.number)} ${escapeHtml(note.label)}</span>
                <strong>${escapeHtml(note.title)}</strong>
              </header>
              <section>
                <span>Receipt Role</span>
                <p>${escapeHtml(clipped(note.receiptRole, 136))}</p>
              </section>
              <section>
                <span>Boundary</span>
                <p>${escapeHtml(clipped(note.storyBoundary, 136))}</p>
              </section>
              <footer>
                <p>${escapeHtml(clipped(note.usage, 132))}</p>
                <div class="lead-meta">
                  ${statusTag(note.status)}
                  ${linkOrText(note.source, note.sourceLabel)}
                </div>
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-rail" aria-label="Narrative arc preview rail">
        ${data.cards.map((arc) => `
          <article class="corpus-arc-preview-card status-${escapeHtml(arc.status)}">
            <header>
              <span>${escapeHtml(arc.shortLabel)}</span>
              <strong>${formatNumber(arc.rows.length)}</strong>
            </header>
            <h4>${escapeHtml(arc.label)}</h4>
            <p>${escapeHtml(clipped(arc.hook, 132))}</p>
            <div class="corpus-arc-preview-meter"><span style="width:${Math.max(3, arc.pct)}%"></span></div>
            <footer>
              <span>Lead Product</span>
              <strong>${escapeHtml(arc.leadName)}</strong>
              <p>${escapeHtml(clipped(arc.leadGate, 108))}</p>
              <div class="lead-meta">
                ${statusTag(arc.status)}
                ${linkOrText(arc.source, arc.sourceLabel)}
              </div>
            </footer>
          </article>
        `).join("")}
      </section>
      <section class="corpus-arc-preview-script" aria-label="Arc reader script">
        <div class="subsection-title">
          <strong>Reader Script</strong>
          <span>Each arc as a sequence of public opening, source receipt, claim boundary, and unlock step</span>
        </div>
        <div class="corpus-arc-preview-script-grid">
          ${data.scriptRows.map((arc) => `
            <article class="corpus-arc-preview-script-row status-${escapeHtml(arc.status)}">
              <header>
                <span>${String(arc.index + 1).padStart(2, "0")} ${escapeHtml(arc.label)}</span>
                <strong>${escapeHtml(arc.title)}</strong>
                <em>${escapeHtml(arc.leadName)}</em>
              </header>
              ${arc.beats.map((beat) => `
                <section class="corpus-arc-preview-script-beat status-${escapeHtml(beat.status)}">
                  <span>${escapeHtml(beat.label)}</span>
                  <p>${escapeHtml(clipped(beat.text, 120))}</p>
                </section>
              `).join("")}
              <footer>
                ${statusTag(arc.status)}
                ${linkOrText(arc.source, arc.sourceLabel)}
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-receipts" aria-label="Arc source receipts">
        <div class="subsection-title">
          <strong>Arc Receipts</strong>
          <span>Source object, review state, claim boundary, and next proof move behind each narrative family</span>
        </div>
        <div class="corpus-arc-preview-receipt-grid">
          ${data.receiptRows.map((arc) => `
            <article class="corpus-arc-preview-receipt-row status-${escapeHtml(arc.evidenceStatus)}">
              <header>
                <span>${String(arc.index + 1).padStart(2, "0")} ${escapeHtml(arc.label)}</span>
                <strong>${escapeHtml(arc.leadName)}</strong>
                <em>${escapeHtml(arc.vintage)}</em>
              </header>
              <section>
                <span>Receipt</span>
                <strong>${escapeHtml(clipped(arc.sourceTitle, 120))}</strong>
                <p>${escapeHtml(clipped(arc.reviewerNote, 132))}</p>
              </section>
              <section>
                <span>Boundary</span>
                <p>${escapeHtml(clipped(arc.gate, 132))}</p>
              </section>
              <section>
                <span>Unlock</span>
                <p>${escapeHtml(clipped(arc.nextProof, 132))}</p>
              </section>
              <footer>
                ${statusTag(arc.evidenceStatus)}
                ${linkOrText(arc.source, arc.sourceLabel)}
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-spotlight" aria-label="Arc story spotlight">
        <div class="subsection-title">
          <strong>Arc Spotlight</strong>
          <span>Three reader-ready story packages with public copy, locked claims, and the next proof move</span>
        </div>
        <div class="corpus-arc-preview-spotlight-grid">
          ${data.spotlightRows.map((arc) => `
            <article class="corpus-arc-preview-spotlight-card status-${escapeHtml(arc.status)}">
              <header>
                <span>${String(arc.index + 1).padStart(2, "0")} ${escapeHtml(arc.shortLabel)}</span>
                <strong>${escapeHtml(arc.leadName)}</strong>
                <em>${escapeHtml(arc.label)}</em>
              </header>
              <section>
                <span>Can Say</span>
                <p>${escapeHtml(clipped(arc.canSay, 160))}</p>
              </section>
              <section>
                <span>Locked</span>
                <p>${escapeHtml(clipped(arc.locked, 160))}</p>
              </section>
              <section>
                <span>Next Proof</span>
                <p>${escapeHtml(clipped(arc.nextProof, 160))}</p>
              </section>
              <footer>
                <p>${escapeHtml(arc.supportProducts.length ? `Also visible in ${arc.supportProducts.join("; ")}.` : "No supporting products match under the current filters.")}</p>
                <div class="lead-meta">
                  ${statusTag(arc.evidenceStatus)}
                  ${linkOrText(arc.source, arc.sourceLabel)}
                </div>
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-ladder" aria-label="Arc proof ladder">
        <div class="subsection-title">
          <strong>Proof Ladder</strong>
          <span>How each narrative family moves from sourced objects to photos, readable labels, verified text, and explicit gaps</span>
        </div>
        <div class="corpus-arc-preview-ladder-grid">
          ${data.proofLadderRows.map((arc) => `
            <article class="corpus-arc-preview-ladder-row status-${escapeHtml(arc.status)}">
              <header>
                <span>${escapeHtml(arc.label)}</span>
                <strong>${escapeHtml(arc.title)}</strong>
                <em>${pluralize(arc.products, "product")}</em>
              </header>
              <div class="corpus-arc-preview-ladder-stages">
                ${arc.stages.map((stage) => `
                  <section class="corpus-arc-preview-ladder-stage status-${escapeHtml(stage.status)}">
                    <span>${escapeHtml(stage.label)}</span>
                    <strong>${formatNumber(stage.value)}</strong>
                    <div><i style="width:${Math.max(stage.value ? 5 : 0, stage.pct)}%"></i></div>
                  </section>
                `).join("")}
              </div>
              <footer>
                <span>Gate</span>
                <p>${escapeHtml(clipped(arc.gate, 150))}</p>
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-matrix" aria-label="Product by story arc matrix">
        <div class="subsection-title">
          <strong>Product Arc Matrix</strong>
          <span>Which leading products carry each narrative lane, and where the story must stay caveated</span>
        </div>
        <div class="corpus-arc-preview-matrix-grid">
          ${data.matrixRows.map((row) => `
            <article class="corpus-arc-preview-matrix-row status-${escapeHtml(row.cluster.status)}">
              <header>
                <span>${escapeHtml(row.category)}</span>
                <strong>${escapeHtml(row.productName)}</strong>
                <em>${formatNumber(row.activeCount)} / ${formatNumber(row.cells.length)} arcs</em>
              </header>
              ${row.cells.map((cell) => `
                <section class="corpus-arc-preview-cell status-${escapeHtml(cell.status)}">
                  <span>${escapeHtml(cell.label)}</span>
                  <strong>${escapeHtml(cell.active ? labelFor(cell.status) : "No lane")}</strong>
                </section>
              `).join("")}
              <footer>
                <span>Primary Gate</span>
                <p>${escapeHtml(clipped(row.primaryGate, 150))}</p>
                <div class="lead-meta">
                  ${statusTag(row.cluster.status)}
                  ${linkOrText(row.source, row.sourceLabel)}
                </div>
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-arc-preview-thread" aria-label="Arc claim boundary thread">
        ${data.cards.slice(0, 4).map((arc) => `
          <article class="corpus-arc-preview-thread-card status-${escapeHtml(arc.status)}">
            <span>${escapeHtml(arc.shortLabel)}</span>
            <strong>${escapeHtml(arc.leadName)}</strong>
            <p>${escapeHtml(clipped(arc.gate, 140))}</p>
          </article>
        `).join("")}
      </section>
    </article>
  `;
}

function renderCorpusStoryIssue(productRows) {
  if (!els.corpusStoryIssue) return;
  const issue = corpusStoryIssueRows(productRows);
  if (!issue.rows.length) {
    els.corpusStoryIssue.innerHTML = `<p class="empty-note">No story issue rows match the current filters.</p>`;
    return;
  }

  const cover = issue.cover;
  const readiness = corpusStoryIssueReadiness(issue);
  const handoffRows = corpusStoryIssueHandoff(issue, readiness);
  const storyboardRows = corpusStoryIssueStoryboard(issue);
  els.corpusStoryIssue.innerHTML = `
    <article class="corpus-issue">
      <header class="corpus-issue-head">
        <div>
          <p class="eyebrow">Story Issue Preview</p>
          <h3>The public issue starts with proof, then gives the reader the unresolved tension</h3>
          <p>This preview shows what the Atlas can publish as a coherent reader package today: a cover story, chapter line-up, source receipts, claim boundaries, and next proof moves.</p>
        </div>
        <aside class="corpus-issue-summary" aria-label="Story issue summary">
          <span class="status-label_visible"><strong>${formatNumber(issue.rows.length)}</strong> Stories</span>
          ${issue.departments.map((row) => `
            <span class="status-${escapeHtml(row.status)}"><strong>${formatNumber(row.value)}</strong> ${escapeHtml(row.label)}</span>
          `).join("")}
        </aside>
      </header>
      <section class="corpus-issue-readiness" aria-label="Issue readiness meter">
        <article class="corpus-issue-readiness-main status-${escapeHtml(readiness.status)}">
          <span>Issue Readiness</span>
          <strong>${formatNumber(readiness.ready)} of ${formatNumber(readiness.total)} gates</strong>
          <div class="corpus-issue-readiness-bar"><i style="width:${Math.max(3, readiness.pct)}%"></i></div>
          <p>${readiness.pct}% complete across the issue stories. The meter checks whether every story carries a lede, receipt, claim boundary, and next proof move.</p>
        </article>
        <div class="corpus-issue-readiness-grid">
          ${readiness.gateRows.map((row) => `
            <article class="corpus-issue-readiness-card status-${escapeHtml(row.status)}">
              <span>${escapeHtml(row.label)}</span>
              <strong>${formatNumber(row.ready)} / ${formatNumber(row.total)}</strong>
              <p>${escapeHtml(row.detail)}</p>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-issue-handoff" aria-label="Publication handoff">
        ${handoffRows.map((row) => `
          <article class="corpus-issue-handoff-card status-${escapeHtml(row.status)}">
            <span>${escapeHtml(row.label)}</span>
            <strong>${escapeHtml(row.value)}</strong>
            <p>${escapeHtml(row.detail)}</p>
          </article>
        `).join("")}
      </section>
      <section class="corpus-issue-storyboard" aria-label="Reader storyboard">
        <div class="subsection-title">
          <strong>Reader Storyboard</strong>
          <span>Each story moves from hook to receipt to caveat to the next proof object</span>
        </div>
        <div class="corpus-issue-storyboard-grid">
          ${storyboardRows.map((row) => `
            <article class="corpus-issue-story-row status-${escapeHtml(row.status)}">
              <header>
                <span>${escapeHtml(`${row.number} ${row.shortLabel}`)}</span>
                <strong>${escapeHtml(row.eyebrow || row.shortLabel)}</strong>
              </header>
              ${row.beats.map((beat) => `
                <section class="status-${escapeHtml(beat.status)}">
                  <span>${escapeHtml(beat.label)}</span>
                  <p>${escapeHtml(clipped(beat.text, 116))}</p>
                </section>
              `).join("")}
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-issue-spine" aria-label="Issue story spine">
        ${issue.receipts.map((row) => `
          <article class="corpus-issue-spine-card status-${escapeHtml(row.status)}">
            <span>${escapeHtml(row.number)}</span>
            <strong>${escapeHtml(row.shortLabel)}</strong>
            <p>${escapeHtml(clipped(row.readerLede, 92))}</p>
            <em>${escapeHtml(row.primaryRisk?.label || row.evidenceStatus || "proof state")}</em>
          </article>
        `).join("")}
      </section>
      <section class="corpus-issue-layout" aria-label="Editorial issue layout">
        <article class="corpus-issue-cover status-${escapeHtml(cover.status)}">
          <div class="corpus-issue-cover-art">${corpusStoryDeckImage(cover)}</div>
          <div class="corpus-issue-cover-copy">
            <span>${escapeHtml(cover.eyebrow)}</span>
            <h4>${escapeHtml(cover.readerLede)}</h4>
            <p>${escapeHtml(cover.readerDek)}</p>
            <dl>
              <dt>Receipt</dt>
              <dd>${escapeHtml(cover.receiptLine)}</dd>
              <dt>Boundary</dt>
              <dd>${escapeHtml(cover.boundaryLine)}</dd>
              <dt>Next</dt>
              <dd>${escapeHtml(cover.nextChapter)}</dd>
            </dl>
            <footer>
              ${statusTag(cover.evidenceStatus)}
              ${cover.primaryRisk ? statusTag(cover.primaryRisk.label) : ""}
              ${linkOrText(cover.source, cover.sourceLabel)}
            </footer>
          </div>
        </article>
        <aside class="corpus-issue-sidebar" aria-label="Issue departments">
          <strong>Editor Notes</strong>
          ${issue.departments.map((row) => `
            <article class="status-${escapeHtml(row.status)}">
              <span>${escapeHtml(row.label)}</span>
              <strong>${formatNumber(row.value)}</strong>
              <p>${escapeHtml(row.detail)}</p>
            </article>
          `).join("")}
        </aside>
      </section>
      <section class="corpus-issue-chapters" aria-label="Issue chapter line-up">
        ${issue.chapters.map((row, index) => `
          <article class="corpus-issue-chapter status-${escapeHtml(row.status)}">
            <header>
              <span>${String(index + 2).padStart(2, "0")} ${escapeHtml(row.eyebrow)}</span>
              <strong>${escapeHtml(row.readerLede)}</strong>
            </header>
            <p>${escapeHtml(clipped(row.readerDek, 150))}</p>
            <dl>
              <dt>Receipt</dt>
              <dd>${escapeHtml(clipped(row.receiptLine, 82))}</dd>
              <dt>Boundary</dt>
              <dd>${escapeHtml(clipped(row.boundaryLine, 82))}</dd>
            </dl>
          </article>
        `).join("")}
      </section>
      <section class="corpus-issue-receipts" aria-label="Issue source credits and claim boundaries">
        <div class="subsection-title">
          <strong>Source Credits</strong>
          <span>Receipts, caveats, and next proof moves for every issue story</span>
        </div>
        <div class="corpus-issue-receipt-grid">
          ${issue.receipts.map((row) => `
            <article class="corpus-issue-receipt status-${escapeHtml(row.status)}">
              <header>
                <span>${escapeHtml(`${row.number} ${row.shortLabel}`)}</span>
                <strong>${escapeHtml(clipped(row.sourceName, 92))}</strong>
              </header>
              <dl>
                <dt>Story</dt>
                <dd>${escapeHtml(clipped(row.readerLede, 92))}</dd>
                <dt>Boundary</dt>
                <dd>${escapeHtml(clipped(row.boundaryLine, 92))}</dd>
                <dt>Next</dt>
                <dd>${escapeHtml(clipped(row.nextChapter, 92))}</dd>
              </dl>
              <footer>
                ${statusTag(row.evidenceStatus)}
                ${row.primaryRisk ? statusTag(row.primaryRisk.label) : ""}
                ${linkOrText(row.source, row.sourceLabelText)}
              </footer>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-issue-ledger" aria-label="Issue claim ledger">
        <div class="subsection-title">
          <strong>Claim Ledger</strong>
          <span>What each issue story can say, cannot say yet, and needs next</span>
        </div>
        <div class="corpus-issue-ledger-grid">
          ${issue.receipts.map((row) => `
            <article class="corpus-issue-ledger-row status-${escapeHtml(row.status)}">
              <header>
                <span>${escapeHtml(`${row.number} ${row.shortLabel}`)}</span>
                <strong>${escapeHtml(row.readerLede)}</strong>
              </header>
              <section>
                <span>Can Say</span>
                <p>${escapeHtml(clipped(row.publicLine, 130))}</p>
              </section>
              <section>
                <span>Locked</span>
                <p>${escapeHtml(clipped(row.lockedClaim, 130))}</p>
              </section>
              <section>
                <span>Unlock</span>
                <p>${escapeHtml(clipped(row.unlockLine, 130))}</p>
              </section>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="corpus-issue-checklist" aria-label="Issue publication checklist">
        <div class="subsection-title">
          <strong>Publication Checklist</strong>
          <span>Each story must carry a lede, receipt, boundary, and unlock before it reads as a complete issue item</span>
        </div>
        <div class="corpus-issue-checklist-grid">
          ${issue.receipts.map((row) => `
            <article class="corpus-issue-check-row status-${escapeHtml(row.status)}">
              <header>
                <span>${escapeHtml(`${row.number} ${row.shortLabel}`)}</span>
                <strong>${escapeHtml(clipped(row.readerLede, 88))}</strong>
              </header>
              <div class="corpus-issue-checks">
                ${row.gates.map((gate) => `
                  <section class="corpus-issue-check status-${escapeHtml(gate.status)}">
                    <span>${escapeHtml(gate.label)}</span>
                    <strong>${escapeHtml(gate.detail)}</strong>
                  </section>
                `).join("")}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
      <footer class="corpus-issue-note">
        The issue preview is deliberately publishable without pretending the research is finished: each chapter keeps the strongest supported sentence, the source line, and the locked claim in the same frame.
      </footer>
    </article>
  `;
}

function renderCorpusAtlas(registryRows) {
  if (!els.corpusAtlasCount) return;
  const productRows = corpusProductRows(registryRows);
  const clusterRows = corpusClusterRows(productRows);
  const laneRows = corpusLaneRows(productRows);
  const taskGroups = collectionTaskGroups();
  els.corpusAtlasCount.textContent = `${formatNumber(productRows.length)} products`;

  renderCorpusStoryGuide(productRows, taskGroups);
  renderCorpusStoryIssue(productRows);
  renderCorpusStoryArcPreview(productRows);

  els.corpusClusterRows.innerHTML = clusterRows.length
    ? clusterRows
      .map((row) => `
        <article class="corpus-cluster status-${escapeHtml(row.status)}">
          <div>
            <span>${escapeHtml(row.label)}</span>
            <strong>${formatNumber(row.products)}</strong>
          </div>
          <p>${escapeHtml(row.detail)}</p>
          <div class="corpus-statline">
            <span>${pluralize(row.candidates, "candidate")}</span>
            <span>${pluralize(row.sourceSlots, "sourced slot")}</span>
            <span>${pluralize(row.visibleLabels, "visible label")}</span>
          </div>
          <div class="corpus-products">${escapeHtml(row.topProducts.join("; "))}</div>
        </article>
      `)
      .join("")
    : `<p class="empty-note">No product clusters match the current filters.</p>`;

  els.corpusLaneRows.innerHTML = laneRows
    .map((row) => `
      <article class="corpus-lane status-${escapeHtml(row.status)}">
        <div class="corpus-lane-head">
          <div>
            <span>${escapeHtml(row.label)}</span>
            <strong>${formatNumber(row.taskCount + row.extraCount)} tasks</strong>
          </div>
          ${statusTag(row.status)}
        </div>
        <p>${escapeHtml(row.detail)}</p>
        <div class="corpus-statline">
          <span>${pluralize(row.productCount, "product")}</span>
          <span>${pluralize(row.acquisitionCount, "queue row")}</span>
          <span>${row.extraCount ? pluralize(row.extraCount, "sweep") : pluralize(row.taskCount, "search")}</span>
        </div>
        <div class="corpus-products">${escapeHtml((row.products.length ? row.products : row.sourceDomains).join("; "))}</div>
      </article>
    `)
    .join("");

  renderCorpusSourceMissions(productRows);
  renderCorpusCollectionWaves(productRows);
  renderCorpusStoryNetwork(productRows);
  renderCorpusStoryRoutes(productRows);
  renderCorpusVisualEvidence(productRows);
  renderCorpusStoryArcs(productRows);
  renderCorpusStoryBeats(productRows);
  renderCorpusStoryDeck(productRows);
  renderCorpusClaimBoundaries(productRows);
  renderCorpusPublicationQueue(productRows);
  renderCorpusStoryRisks(productRows);
  renderCorpusNarrativeDashboard(productRows);
  renderCorpusReaderFrontpage(productRows);
  renderCorpusStoryLibrary(productRows);
  renderCorpusStoryFlow(productRows);
  renderCorpusStoryTimeline(productRows);
  renderCorpusPilotStoryboard(productRows);
  renderCorpusEvidenceHeatmap(productRows);

  els.corpusProductConstellation.innerHTML = productRows
    .slice(0, 18)
    .map((row) => {
      const product = row.product;
      const source = firstPart(product.best_source_urls || product.starter_search_urls || product.starter_image_urls);
      const gap = storyGapLabel({ product });
      return `
        <article class="corpus-product-card status-${escapeHtml(row.cluster.status)}">
          <div class="corpus-product-head">
            <div>
              <span>${escapeHtml(labelFor(product.category || "Product"))}</span>
              <strong>${escapeHtml(product.display_name || product.canonical_name)}</strong>
            </div>
            <em>${escapeHtml(row.cluster.label)}</em>
          </div>
          <div class="corpus-coverage">
            <span style="width:${Math.max(3, Math.min(100, numeric(product.slot_coverage_pct)))}%"></span>
          </div>
          <div class="corpus-product-metrics">
            <span><strong>${escapeHtml(product.slot_coverage_pct || 0)}%</strong> coverage</span>
            <span><strong>${formatNumber(product.product_candidate_count)}</strong> candidates</span>
            <span><strong>${formatNumber(row.facts.visibleLabels)}</strong> visible labels</span>
          </div>
          <div class="story-vintage-grid">${productVintageCells(product)}</div>
          <p>${escapeHtml(clipped(gap, 145))}</p>
          <div class="story-source-path">
            ${row.sourcePath.slice(0, 3).map((domain) => `<span>${escapeHtml(domain)}</span>`).join("")}
          </div>
          <div class="lead-meta">
            ${statusTag(row.cluster.status)}
            ${linkOrText(source, "Best source")}
          </div>
        </article>
      `;
    })
    .join("");
  renderCorpusTaskGroups(taskGroups);
  renderCorpusSearchStarts();
  renderCorpusArchiveCommands();
}

function vintageStatusSummary(product, vintage, evidenceRows) {
  const info = product.vintage_statuses[vintage] || { status: "unknown", source_count: 0 };
  const rows = vintageEvidenceRows(product, evidenceRows, vintage);
  const best = bestEvidenceRows(rows, 1)[0] || {};
  return {
    vintage,
    status: info.status || "unknown",
    sourceCount: numeric(info.source_count || rows.length),
    best,
  };
}

function storyReaderHeadline(card, evidenceRows) {
  const product = card.product;
  const stateLabel = storyPublicationState(card, evidenceRows).label;
  if (!product) {
    return {
      title: "A Claim Starts As A Lead, Then Earns Its Place In The Timeline",
      dek: "The page should read like a public research notebook: evidence first, unsupported eras visible, and no ingredient-change claim promoted without source, date, and label review.",
    };
  }
  const name = product.display_name || product.canonical_name || "This product";
  if (/oreo/i.test(`${product.display_name || ""} ${product.canonical_name || ""}`)) {
    return {
      title: "Oreo's Ingredient History Is Still A Proof Chase",
      dek: `${name} has package and source leads across the vintage map, but the story cannot claim original-to-current ingredient changes until readable panels are transcribed. The 1912 original ingredient label remains explicitly unverified.`,
      stateLabel,
    };
  }
  if (product.category === "fast food") {
    return {
      title: `${name} Needs A Document Timeline Before It Becomes A Formulation Timeline`,
      dek: "Fast-food products move through menu pages, nutrition PDFs, allergen disclosures, archived pages, and package evidence. The story keeps those evidence types separate until a reviewer ties each claim to a date and source owner.",
      stateLabel,
    };
  }
  return {
    title: `${name} Has A Research Arc, But Not Yet A Finished Ingredient Arc`,
    dek: `The strongest story today is where evidence exists, where labels are still unreadable, and which package or source chapter would unlock ingredient, weight, maker, and price overlays.`,
    stateLabel,
  };
}

function storyProofBeatRows(card, evidenceRows) {
  const product = card.product;
  if (!product) {
    const counts = evidenceRows.reduce((acc, row) => {
      const status = rowEvidenceStatus(row);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return [
      {
        label: "Lead",
        title: "Discovery is not proof",
        body: `${pluralize(counts.discovered || 0, "record")} sit at discovery and need attribution review before carrying public story weight.`,
        status: "discovered",
      },
      {
        label: "Photo",
        title: "Photos need panel roles",
        body: `${pluralize((counts.source_review || 0) + (counts.usable_photo || 0), "record")} are in review or usable-photo states; they still need label visibility checks.`,
        status: "usable_photo",
      },
      {
        label: "Text",
        title: "Labels become text",
        body: `${pluralize((counts.label_visible || 0) + (counts.ocr_extracted || 0), "record")} are label-visible or OCR-ready before manual verification.`,
        status: "label_visible",
      },
      {
        label: "Claim",
        title: "Verified labels carry the story",
        body: `${pluralize(counts.manual_verified || 0, "record")} are manual-verified in this filtered view.`,
        status: "manual_verified",
      },
    ];
  }

  const current = vintageStatusSummary(product, "current_2020s", evidenceRows);
  const earliest = vintageStatusSummary(product, "earliest_verified_label", evidenceRows);
  const intermediate = state.data.vintages
    .filter((vintage) => vintage !== "current_2020s" && vintage !== "earliest_verified_label")
    .map((vintage) => vintageStatusSummary(product, vintage, evidenceRows));
  const intermediateWithSources = intermediate.filter((row) => row.sourceCount > 0);
  const visibleLabels = evidenceRows.filter((row) => rowEvidenceStatus(row) === "label_visible" || truthyFlag(row.ingredient_panel_visible)).length;
  const manualLabels = evidenceRows.filter((row) => rowEvidenceStatus(row) === "manual_verified" || truthyFlag(row.manual_transcription_available)).length;
  const currentSource = current.best.source_domain || current.best.source_title || "current source lead";
  const earliestLabel = /oreo/i.test(`${product.display_name || ""} ${product.canonical_name || ""}`)
    ? "1912 original label gap"
    : "earliest chapter";
  const earliestBody = /oreo/i.test(`${product.display_name || ""} ${product.canonical_name || ""}`)
    ? "The board can show candidate package history, but it must not imply a verified 1912 ingredient statement without a readable source-attributable label."
    : `${statusNarrative(earliest.status)} ${pluralize(earliest.sourceCount, "source lead")} are attached to the earliest chapter.`;

  return [
    {
      label: "Anchor",
      title: "Start with the current SKU",
      body: `${pluralize(current.sourceCount, "source lead")} are attached to the present-day slot. Treat ${currentSource} as a SKU-specific anchor only after source/date review.`,
      status: current.status,
      source: current.best.source_url || "",
      sourceLabel: current.best.source_domain || "Source",
    },
    {
      label: "Bridge",
      title: "Use decade chapters to avoid a false jump cut",
      body: `${pluralize(intermediateWithSources.length, "intermediate vintage")} have source leads. Each one needs label visibility, package weight, and manufacturer/distributor checks before it can explain a formulation change.`,
      status: intermediateWithSources.length ? "candidate_found" : "no_source",
    },
    {
      label: "Origin",
      title: earliestLabel,
      body: earliestBody,
      status: earliest.status,
      source: earliest.best.source_url || "",
      sourceLabel: earliest.best.source_domain || "Source",
    },
    {
      label: "Publish",
      title: manualLabels ? "Ingredient diffs can be partial" : "Ingredient diffs stay locked",
      body: manualLabels
        ? `${pluralize(manualLabels, "manual label")} can support scoped claims; the remaining vintages still need explicit gap labels.`
        : `${pluralize(visibleLabels, "label-visible lead")} and zero manual-verified labels mean this story should publish as evidence status, not as an ingredient-change claim.`,
      status: manualLabels ? "manual_verified" : visibleLabels ? "label_visible" : "source_review",
    },
  ];
}

function readerStoryFrame(card, evidenceRows) {
  const product = card.product;
  const facts = storyEvidenceFacts(evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const name = storyDisplayTitle(card);
  const sourceBacked = product
    ? `${formatNumber(product.slots_with_sources || 0)} of ${formatNumber(product.slots_total || state.data.vintages.length)}`
    : pluralize(facts.sourceLinks, "source link");
  const sourcePath = product ? storySourcePath(product, evidenceRows).slice(0, 4) : [];
  const isOreo = /oreo/i.test(`${product?.display_name || ""} ${product?.canonical_name || ""}`);
  const thesis = isOreo
    ? "This is not yet the story of how Oreo's recipe changed. It is the story of how a package history becomes a recipe history only when each label earns its place."
    : product
      ? `${name} has a product-history path, but ingredient-change language waits for comparable reviewed label text.`
      : "The reader should see evidence becoming claims, with every unsupported step held in view.";
  const readerPayoff = isOreo
    ? "The tension is the proof break: current label leads and vintage package objects exist, but the original-to-current ingredient claim is still locked."
    : "The useful story is where proof gets stronger, where it breaks, and which source would change the conclusion.";
  const noClaim = isOreo
    ? "Do not imply a verified 1912 Oreo ingredient statement or a full original-to-current formulation diff."
    : storyCannotSayYet(card, evidenceRows);
  const unlock = facts.visibleLabels || facts.ocrLabels
    ? "Turn the label-visible records into corrected OCR/manual transcriptions with reviewer attribution."
    : storyNextEvidenceStep(card, evidenceRows);
  return {
    name,
    status: publicationState.status,
    label: publicationState.label,
    thesis,
    metrics: [
      ["Source-backed slots", sourceBacked],
      ["Label-visible leads", facts.visibleLabels],
      ["Verified labels", facts.manualLabels],
      ["Source links", facts.sourceLinks],
    ],
    beats: [
      {
        label: "Say Now",
        title: "A sourced package journey exists",
        body: product
          ? `${name} has source leads in ${sourceBacked} vintage slots, enough to show a research route without overstating formulation change.`
          : storySupportedNow(card, evidenceRows),
        status: facts.sourceLinks ? "source_review" : "discovered",
      },
      {
        label: "Hold",
        title: "The recipe claim is not earned",
        body: noClaim,
        status: facts.manualLabels ? "manual_verified" : "missing_vintage_slot",
      },
      {
        label: "Reader Payoff",
        title: "Show the proof break",
        body: readerPayoff,
        status: publicationState.status,
      },
      {
        label: "Unlock",
        title: facts.visibleLabels || facts.ocrLabels ? "Transcribe visible labels" : "Find readable labels",
        body: unlock,
        status: facts.visibleLabels || facts.ocrLabels ? "label_visible" : "candidate_needs_panel",
      },
    ],
    sourcePath,
  };
}

function renderReaderStoryFrame(card, evidenceRows) {
  const frame = readerStoryFrame(card, evidenceRows);
  return `
    <section class="reader-storyline status-${escapeHtml(frame.status)}" aria-label="Reader story frame">
      <header class="reader-storyline-head">
        <div>
          <p class="eyebrow">Reader Story</p>
          <h4>${escapeHtml(frame.name)}</h4>
          <p>${escapeHtml(frame.thesis)}</p>
          <div class="lead-meta">
            ${statusTag(frame.status)}
            <span class="status-tag">${escapeHtml(frame.label)}</span>
          </div>
        </div>
        <aside class="reader-storyline-metrics" aria-label="Story evidence metrics">
          ${frame.metrics
            .map(([label, value]) => `<span><strong>${escapeHtml(value)}</strong>${escapeHtml(label)}</span>`)
            .join("")}
        </aside>
      </header>
      <div class="reader-storyline-grid">
        ${frame.beats
          .map((beat) => `
            <article class="reader-storyline-beat status-${escapeHtml(beat.status)}">
              <span>${escapeHtml(beat.label)}</span>
              <strong>${escapeHtml(beat.title)}</strong>
              <p>${escapeHtml(beat.body)}</p>
              ${statusTag(beat.status)}
            </article>
          `)
          .join("")}
      </div>
      ${frame.sourcePath.length
        ? `<footer class="reader-storyline-sources">${frame.sourcePath.map((source) => `<span>${escapeHtml(source)}</span>`).join("")}</footer>`
        : ""}
    </section>
  `;
}

function renderStoryReader(card, evidenceRows) {
  const headline = storyReaderHeadline(card, evidenceRows);
  const publicationState = storyPublicationState(card, evidenceRows);
  const beats = storyProofBeatRows(card, evidenceRows);
  return `
    <section class="story-reader" aria-label="Story reader">
      <div class="story-reader-copy">
        <p class="eyebrow">Story Reader</p>
        <h4>${escapeHtml(headline.title)}</h4>
        <p>${escapeHtml(headline.dek)}</p>
        <div class="lead-meta">
          ${statusTag(publicationState.status)}
          <span class="status-tag">${escapeHtml(publicationState.label)}</span>
        </div>
        <p class="story-reader-note">${escapeHtml(publicationState.detail)}</p>
      </div>
      <div class="story-beats" aria-label="Proof beats">
        ${beats
          .map((beat) => `
            <article class="story-beat status-${escapeHtml(beat.status || "unknown")}">
              <span>${escapeHtml(beat.label)}</span>
              <strong>${escapeHtml(beat.title)}</strong>
              <p>${escapeHtml(beat.body)}</p>
              <div class="lead-meta">
                ${statusTag(beat.status || "unknown")}
                ${beat.source ? linkOrText(beat.source, beat.sourceLabel || "Source") : ""}
              </div>
            </article>
          `)
          .join("")}
      </div>
    </section>
  `;
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

function runLogSummary(rows) {
  const logs = rows || [];
  const latest = logs[0] || {};
  const totals = logs.reduce(
    (memo, row) => ({
      queries: memo.queries + numeric(row.queries_run),
      errors: memo.errors + numeric(row.query_errors),
      seen: memo.seen + numeric(row.records_seen),
      rejected: memo.rejected + numeric(row.records_rejected),
      inserted: memo.inserted + numeric(row.candidates_inserted),
      failedRuns:
        memo.failedRuns +
        (numeric(row.query_errors) > 0 && numeric(row.records_seen) === 0 && numeric(row.candidates_inserted) === 0 ? 1 : 0),
    }),
    { queries: 0, errors: 0, seen: 0, rejected: 0, inserted: 0, failedRuns: 0 },
  );
  const queryErrorRate = totals.queries ? Math.round((totals.errors / totals.queries) * 100) : 0;
  const errorRow = logs.find((row) => row.error_sample);
  return {
    latest,
    totals,
    latestStatus: latest ? runLogStatus(latest) : "",
    queryErrorRate,
    errorSample: errorRow?.error_sample || "",
  };
}

function crawlHealthNarrative(summary) {
  if (!summary.totals.queries) {
    return {
      title: "No crawl runs match this view",
      meaning: "The current filters do not expose Common Crawl attempts, so the product story should lean on source-review and current-web queues.",
      next: "Clear filters or open the Common Crawl table to inspect all archive sweeps.",
    };
  }
  if (summary.totals.inserted > 0) {
    return {
      title: "Archive captures produced candidate leads",
      meaning: "Inserted candidates remain evidence leads until the capture, product identity, date basis, and readable label are reviewed together.",
      next: "Review the inserted capture rows, dedupe URLs, and promote only source-attributable records with visible package or disclosure text.",
    };
  }
  if (summary.totals.errors > 0 && summary.totals.seen === 0) {
    return {
      title: "Recent CDX attempts are blocked before evidence review",
      meaning: "The run log records query errors without returned captures, so these archive sweeps explain a gap rather than supporting a product claim.",
      next: "Retry the lane later, shift to curated archive pages or current-web source owners, and keep affected product vintages marked unsupported.",
    };
  }
  if (summary.totals.seen > 0) {
    return {
      title: "Captures were found but not promoted",
      meaning: "Common Crawl saw records, but rejection or dedupe rules prevented them from becoming product evidence candidates.",
      next: "Inspect rejection reasons and tune source/product/date hints before moving any capture into source review.",
    };
  }
  return {
    title: "Archive sweeps are currently empty",
    meaning: "The crawl lane has no candidates for this filtered story, so Common Crawl should not be used as claim evidence here.",
    next: "Use product-specific source discovery, museum/archive pages, retailer photos, or manual vintage research for the next evidence step.",
  };
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

function renderCrawlHealth() {
  if (!els.crawlHealth) return;
  const rows = (state.data.common_crawl_run_logs || []).filter(passesRunLog);
  const recentRows = rows.slice(0, 8);
  const summary = runLogSummary(recentRows);
  const narrative = crawlHealthNarrative(summary);
  const latest = recentRows[0] || {};
  const latestRecorded = latest.recorded_at_utc ? new Date(latest.recorded_at_utc).toLocaleString() : "No matching run";
  const latestLabel = latest.query_contains || latest.command || "No matching Common Crawl run";
  const errorSample = summary.errorSample ? clipped(summary.errorSample, 220) : "No error sample recorded for the matching runs.";
  const latestLinks = linkOrText(latest.log_path, "Log") + linkOrText(latest.query_errors_path, "Errors");
  els.crawlHealth.innerHTML = `
    <article class="crawl-health-card crawl-health-lede">
      <p class="eyebrow">Crawl Health</p>
      <h2>${escapeHtml(narrative.title)}</h2>
      <p>${escapeHtml(narrative.meaning)}</p>
      <div class="lead-meta">
        ${statusTag("common_crawl")}
        ${statusTag(summary.totals.inserted ? "candidates_inserted" : summary.totals.errors ? "query_errors" : "empty_result")}
      </div>
    </article>
    <article class="crawl-health-card">
      <span>Latest Matching Run</span>
      <strong>${escapeHtml(latestLabel)}</strong>
      <p>${escapeHtml(latestRecorded)}</p>
      <div class="lead-meta">
        ${latest.command ? statusTag(latest.command) : ""}
        ${latestLinks}
      </div>
    </article>
    <article class="crawl-health-card crawl-health-metrics">
      <span>Recent Throughput</span>
      <div>
        <strong>${formatNumber(summary.totals.queries)}</strong><small>queries</small>
        <strong>${formatNumber(summary.totals.errors)}</strong><small>errors</small>
        <strong>${formatNumber(summary.totals.seen)}</strong><small>seen</small>
        <strong>${formatNumber(summary.totals.inserted)}</strong><small>inserted</small>
      </div>
      <p>${formatNumber(summary.totals.failedRuns)} blocked runs · ${formatNumber(summary.queryErrorRate)}% query error rate</p>
    </article>
    <article class="crawl-health-card">
      <span>Next Evidence Move</span>
      <strong>${escapeHtml(narrative.next)}</strong>
      <p>${escapeHtml(errorSample)}</p>
    </article>
  `;
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
      key: "evidence-gate",
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
      evidenceRows: bestEvidenceRows(registryRows, 10),
    },
  ];

  const oreo = state.data.products.find((row) => /oreo/i.test(`${row.display_name || ""} ${row.canonical_name || ""}`));
  if (oreo && productMatchesStoryFilters(oreo)) {
    const evidenceRows = productEvidenceRows(oreo).filter((row) => !state.status || passesRegistry(row));
    const sourcePath = storySourcePath(oreo, evidenceRows);
    cards.push({
      key: "oreo-thread",
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
    const evidenceRows = registryRows
      .filter((row) => row.category === "fast food")
      .slice(0, 12);
    cards.push({
      key: "fast-food",
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
      evidenceRows,
    });
  }

  const photoRows = state.data.photo_evidence.filter(passesPhoto);
  const weightReady = photoRows.filter((row) => truthyFlag(row.net_weight_visible) || presentText(row.net_weight_text) || presentText(row.serving_size_text));
  const weightMissing = photoRows.filter((row) => String(row.ground_truth_fields_missing || "").includes("package_weight"));
  if (photoRows.length) {
    cards.push({
      key: "price-size",
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
      evidenceRows: bestEvidenceRows(photoRows, 10),
    });
  }

  const runRows = (state.data.common_crawl_run_logs || []).filter(passesRunLog);
  if (runRows.length) {
    const queryErrors = runRows.reduce((sum, row) => sum + numeric(row.query_errors), 0);
    const candidates = runRows.reduce((sum, row) => sum + numeric(row.candidates_inserted), 0);
    const latest = runRows[0] || {};
    cards.push({
      key: "archive-discovery",
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
    .slice(0, 120)
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
        productCanonical: product.canonical_name,
      };
    });
}

function renderStorySelector(cards) {
  els.storySelector.innerHTML = cards
    .slice(0, 9)
    .map((card) => `
      <button class="story-tab ${card.key === state.storyKey ? "is-selected" : ""}" type="button" data-story-key="${escapeHtml(card.key)}">
        <span>${escapeHtml(card.kicker)}</span>
        <strong>${escapeHtml(card.product?.display_name || card.title)}</strong>
      </button>
    `)
    .join("");
}

function renderStoryClaimCards(card) {
  return evidenceClaimText(card)
    .map(([label, value]) => `
      <article class="story-proof-card">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(value)}</span>
      </article>
    `)
    .join("");
}

function renderStoryWorkflow(card, evidenceRows) {
  const counts = evidenceRows.reduce((acc, row) => {
    const status = rowEvidenceStatus(row);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  return `
    <div class="story-workflow" aria-label="Evidence workflow">
      ${workflowStatuses()
        .map((status) => {
          const count = counts[status] || 0;
          return `
            <span class="story-workflow-step status-${escapeHtml(status)} ${count ? "has-count" : ""}">
              <strong>${formatNumber(count)}</strong>
              ${escapeHtml(statusLabels[status] || labelFor(status))}
            </span>
          `;
        })
        .join("")}
    </div>
  `;
}

function recipeJourneyEvidenceState(rows, info) {
  const facts = storyEvidenceFacts(rows);
  const statuses = rows.map(rowEvidenceStatus);
  if (facts.manualLabels || statuses.includes("manual_verified")) {
    return {
      label: "Verified Recipe Text",
      status: "manual_verified",
      detail: "Reviewed ingredient text can support scoped formulation comparison for this chapter.",
    };
  }
  if (facts.ocrLabels || statuses.includes("ocr_extracted")) {
    return {
      label: "OCR Candidate",
      status: "ocr_extracted",
      detail: "OCR text exists but still needs correction against the source image before recipe claims publish.",
    };
  }
  if (facts.visibleLabels || rows.some((row) => truthyFlag(row.ingredient_panel_visible) || truthyFlag(row.ingredient_text_available))) {
    return {
      label: "Readable Label Candidate",
      status: "label_visible",
      detail: "Ingredient text or panel visibility is present, but the recipe is not ground truth until manual review.",
    };
  }
  if (facts.usablePhotos || statuses.includes("usable_photo")) {
    return {
      label: "Package Photo Lead",
      status: "usable_photo",
      detail: "A product object can anchor the era visually, but the ingredient panel still needs to be read.",
    };
  }
  if (numeric(info?.source_count) || rows.length) {
    return {
      label: "Source Lead",
      status: info?.status || "source_review",
      detail: "A source is attached, but it has not yet become readable ingredient evidence.",
    };
  }
  return {
    label: "Open Gap",
    status: info?.status || "missing_vintage_slot",
    detail: "No source-attributable recipe evidence is attached for this era.",
  };
}

function recipeJourneyContextLine(rows, key, fallback) {
  const row = rows.find((item) => presentText(item[key]));
  return row ? row[key] : fallback;
}

function productRecipeJourneyRows(product, evidenceRows) {
  return state.data.vintages.map((vintage, index) => {
    const info = product.vintage_statuses?.[vintage] || { status: "unknown", source_count: 0 };
    const rows = vintageEvidenceRows(product, evidenceRows, vintage);
    const best = bestEvidenceRows(rows, 1)[0] || {};
    const recipeState = recipeJourneyEvidenceState(rows, info);
    const facts = storyEvidenceFacts(rows);
    const source = best.source_url || best.archive_url || "";
    const isOreoOrigin = /oreo/i.test(`${product.display_name || ""} ${product.canonical_name || ""}`) && vintage === "earliest_verified_label";
    const boundary = recipeState.status === "manual_verified"
      ? "Recipe comparison can be scoped to this verified chapter only."
      : isOreoOrigin
        ? "Do not describe the original 1912 Oreo recipe without verified label evidence."
        : "Do not promote this chapter into a recipe-diff claim until ingredient text is reviewed.";
    const nextProof = recipeState.status === "manual_verified"
      ? "Compare canonical ingredient IDs, order, nested subingredients, and package context."
      : facts.visibleLabels || facts.ocrLabels
        ? "Correct/transcribe the ingredient text against the source image and attach reviewer attribution."
        : facts.usablePhotos
          ? "Confirm the ingredient panel is readable, then capture OCR/manual transcription."
          : source
            ? "Review the source object for label panel visibility, date basis, net weight, and rights."
            : "Find a source-attributable package photo, label scan, archive page, or document for this era.";
    return {
      number: String(index + 1).padStart(2, "0"),
      vintage,
      label: vintageLabels[vintage] || vintage,
      title: storyChapterTitle(vintage),
      status: recipeState.status,
      recipeState,
      sourceCount: numeric(info.source_count || rows.length),
      source,
      sourceLabel: best.source_domain || "Source",
      sourceTitle: best.source_title || best.source_domain || best.evidence_kind || "No source object",
      dateBasis: best.claimed_product_date_text || best.capture_date_text || best.vintage_label || vintageLabels[vintage] || vintage,
      packageContext: recipeJourneyContextLine(rows, "package_size_text", facts.packageFields ? `${pluralize(facts.packageFields, "package field")} present` : "Package weight/serving not captured"),
      makerContext: recipeJourneyContextLine(rows, "manufacturer_distributor_text", facts.orgFields ? `${pluralize(facts.orgFields, "maker clue")} present` : "Maker/distributor text not captured"),
      priceContext: recipeJourneyContextLine(rows, "price_text", facts.priceFields ? `${pluralize(facts.priceFields, "price clue")} present` : "Price/weight alignment deferred"),
      boundary,
      nextProof,
    };
  });
}

function productRecipeJourneySummary(product, evidenceRows, rows) {
  const facts = storyEvidenceFacts(evidenceRows);
  const verified = rows.filter((row) => row.status === "manual_verified").length;
  const readable = rows.filter((row) => ["manual_verified", "ocr_extracted", "label_visible"].includes(row.status)).length;
  const sourceSlots = rows.filter((row) => row.sourceCount || row.source).length;
  const name = product.display_name || product.canonical_name || "This product";
  const locked = verified < 2;
  return {
    name,
    status: verified ? "manual_verified" : readable ? "label_visible" : sourceSlots ? "source_review" : "missing_vintage_slot",
    headline: `${name} Recipe Journey`,
    dek: locked
      ? `${name} can show a source-backed recipe evidence path, but not an end-to-end formulation diff yet. The missing step is reviewed ingredient text across at least two comparable eras.`
      : `${name} has multiple verified recipe chapters ready for scoped ingredient comparison.`,
    metrics: [
      ["Era chapters", rows.length],
      ["Source-backed", sourceSlots],
      ["Readable labels", readable],
      ["Verified recipes", verified],
      ["Package fields", facts.packageFields],
      ["Price clues", facts.priceFields],
    ],
    verdict: locked
      ? "Recipe diff locked"
      : "Scoped recipe diff possible",
    boundary: /oreo/i.test(`${product.display_name || ""} ${product.canonical_name || ""}`)
      ? "The 1912 original Oreo ingredient label remains unverified, so the journey must show the proof chase before any original-to-current claim."
      : "Only chapters with reviewed label text can support ingredient-change language.",
  };
}

function recipeJourneyStitchLine(summary, rows) {
  const current = rows[0] || {};
  const earliest = rows[rows.length - 1] || {};
  const currentLabel = current.recipeState?.label || "Current evidence";
  const earliestLabel = earliest.recipeState?.label || "Earliest evidence";
  return `${currentLabel} flows through ${formatNumber(rows.length)} dated chapters toward ${earliestLabel}; each break keeps its source object, claim boundary, and next proof visible. ${summary.boundary}`;
}

function renderProductRecipeJourney(card, evidenceRows) {
  const product = card.product;
  if (!product) return "";
  const rows = productRecipeJourneyRows(product, evidenceRows);
  const summary = productRecipeJourneySummary(product, evidenceRows, rows);
  return `
    <section class="recipe-journey status-${escapeHtml(summary.status)}" aria-label="Selected product recipe journey">
      <header class="recipe-journey-head">
        <div>
          <p class="eyebrow">Recipe Journey</p>
          <h4>${escapeHtml(summary.headline)}</h4>
          <p>${escapeHtml(summary.dek)}</p>
        </div>
        <aside class="recipe-journey-score" aria-label="Recipe journey scorecard">
          ${summary.metrics
            .map(([label, value]) => `<span><strong>${formatNumber(value)}</strong>${escapeHtml(label)}</span>`)
            .join("")}
        </aside>
      </header>
      <div class="recipe-journey-verdict">
        ${statusTag(summary.status)}
        <strong>${escapeHtml(summary.verdict)}</strong>
        <span>${escapeHtml(summary.boundary)}</span>
      </div>
      <div class="recipe-stitch" aria-label="Stitched recipe story route">
        <aside class="recipe-stitch-copy">
          <span>Story Stitch</span>
          <strong>${escapeHtml(summary.name)}</strong>
          <p>${escapeHtml(recipeJourneyStitchLine(summary, rows))}</p>
        </aside>
        <div class="recipe-stitch-route">
          ${rows
            .map((row) => `
              <article class="recipe-stitch-node status-${escapeHtml(row.status)}">
                <header>
                  <span>${escapeHtml(row.number)}</span>
                  <strong>${escapeHtml(row.label)}</strong>
                  <em>${escapeHtml(row.dateBasis)}</em>
                </header>
                <section>
                  <span>${escapeHtml(row.recipeState.label)}</span>
                  <p>${escapeHtml(clipped(row.sourceTitle, 92))}</p>
                </section>
                <footer>
                  <b>${escapeHtml(`${formatNumber(row.sourceCount)} source${row.sourceCount === 1 ? "" : "s"}`)}</b>
                  <p>${escapeHtml(clipped(row.nextProof, 118))}</p>
                  <div class="lead-meta">
                    ${statusTag(row.status)}
                    ${row.source ? linkOrText(row.source, row.sourceLabel) : `<span class="gap-label">No source link</span>`}
                  </div>
                </footer>
              </article>
            `)
            .join("")}
        </div>
      </div>
      <div class="recipe-journey-track">
        ${rows
          .map((row) => `
            <article class="recipe-journey-card status-${escapeHtml(row.status)}">
              <header>
                <span>${escapeHtml(`${row.number} ${row.label}`)}</span>
                <strong>${escapeHtml(row.recipeState.label)}</strong>
                <em>${escapeHtml(`${formatNumber(row.sourceCount)} source${row.sourceCount === 1 ? "" : "s"}`)}</em>
              </header>
              <section>
                <span>Evidence Object</span>
                <p>${escapeHtml(clipped(row.sourceTitle, 120))}</p>
                <em>${escapeHtml(clipped(row.dateBasis, 92))}</em>
              </section>
              <section>
                <span>Recipe State</span>
                <p>${escapeHtml(row.recipeState.detail)}</p>
              </section>
              <dl>
                <dt>Package</dt>
                <dd>${escapeHtml(clipped(row.packageContext, 80))}</dd>
                <dt>Maker</dt>
                <dd>${escapeHtml(clipped(row.makerContext, 80))}</dd>
                <dt>Price/Weight</dt>
                <dd>${escapeHtml(clipped(row.priceContext, 80))}</dd>
              </dl>
              <footer>
                <p><strong>Boundary:</strong> ${escapeHtml(row.boundary)}</p>
                <p><strong>Next:</strong> ${escapeHtml(row.nextProof)}</p>
                <div class="lead-meta">
                  ${statusTag(row.status)}
                  ${row.source ? linkOrText(row.source, row.sourceLabel) : `<span class="gap-label">No source link</span>`}
                </div>
              </footer>
            </article>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function vintageEvidenceRows(product, evidenceRows, vintage) {
  const rows = evidenceRows.filter((row) => row.vintage_label === vintage);
  if (rows.length) return rows;
  return productEvidenceRows(product).filter((row) => row.vintage_label === vintage);
}

function renderStoryTimeline(card, evidenceRows) {
  const product = card.product;
  if (!product) return "";
  return `
    <div class="story-timeline" aria-label="Product vintage timeline">
      ${state.data.vintages
        .map((vintage) => {
          const info = product.vintage_statuses[vintage] || { status: "unknown", source_count: 0 };
          const rows = vintageEvidenceRows(product, evidenceRows, vintage);
          const best = bestEvidenceRows(rows, 1)[0] || {};
          const note = best.reviewer_notes || best.unsupported_gap_note || product.recommended_next_action || "";
          return `
            <article class="story-timeline-row status-${escapeHtml(info.status || "unknown")}">
              <div>
                <strong>${escapeHtml(vintageLabels[vintage] || vintage)}</strong>
                <span>${escapeHtml(statusLabels[info.status] || labelFor(info.status || "unknown"))}</span>
              </div>
              <p>${escapeHtml(clipped(note, 150))}</p>
              <div class="lead-meta">
                ${statusTag(info.status || "unknown")}
                <span class="status-tag">${formatNumber(info.source_count || rows.length)} sources</span>
                ${best.source_url ? linkOrText(best.source_url, best.source_domain || "Source") : ""}
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderStoryLenses(card, evidenceRows) {
  return `
    <div class="story-lenses">
      ${storyLensRows(card, evidenceRows)
        .map((lens) => `
          <article class="story-lens">
            <span>${escapeHtml(lens.label)}</span>
            <strong>${escapeHtml(lens.value)}</strong>
            <p>${escapeHtml(lens.detail)}</p>
          </article>
        `)
        .join("")}
    </div>
  `;
}

function storyChapterTitle(vintage) {
  const titles = {
    current_2020s: "Present-day SKU anchor",
    "2010s": "Modern disclosure bridge",
    "2000s": "Archive-web bridge",
    "1990s": "Nutrition-panel era",
    "1980s_or_earlier": "Vintage package hunt",
    earliest_verified_label: "Earliest verified label",
  };
  return titles[vintage] || labelFor(vintage);
}

function storyChapterBody(product, vintage, info, rows) {
  const status = info.status || "unknown";
  const sourceCount = numeric(info.source_count || rows.length);
  const base = statusNarrative(status);
  if (status === "no_source") {
    return `${base} Find an attributable package, archive page, menu document, or catalog before this chapter can enter the public timeline.`;
  }
  if (sourceCount) {
    return `${base} ${pluralize(sourceCount, "source lead")} can be reviewed for product identity, date basis, label visibility, package size, and manufacturer/distributor text.`;
  }
  return `${base} Keep this chapter visible as an explicit gap.`;
}

function renderProductStoryArc(card, evidenceRows) {
  const product = card.product;
  return `
    <section class="story-arc" aria-label="Product story chapters">
      <div class="story-section-heading">
        <div>
          <p class="eyebrow">Story Arc</p>
          <h4>Chapters Before Publication</h4>
        </div>
        <span>${escapeHtml(product.display_name || product.canonical_name || "")}</span>
      </div>
      <div class="story-chapters">
        ${state.data.vintages
          .map((vintage) => {
            const info = product.vintage_statuses[vintage] || { status: "unknown", source_count: 0 };
            const status = info.status || "unknown";
            const rows = vintageEvidenceRows(product, evidenceRows, vintage);
            const best = bestEvidenceRows(rows, 1)[0] || {};
            const source = best.source_url || best.archive_url || "";
            return `
              <article class="story-chapter status-${escapeHtml(status)}">
                <header>
                  <span>${escapeHtml(vintageLabels[vintage] || vintage)}</span>
                  <strong>${escapeHtml(storyChapterTitle(vintage))}</strong>
                </header>
                <p>${escapeHtml(storyChapterBody(product, vintage, info, rows))}</p>
                <div class="story-chapter-meta">
                  ${statusTag(status)}
                  <span class="status-tag">${formatNumber(info.source_count || rows.length)} sources</span>
                  ${source ? linkOrText(source, best.source_domain || "Source") : `<span class="gap-label">No source link</span>`}
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderWorkflowStoryArc(card, evidenceRows) {
  const counts = evidenceRows.reduce((acc, row) => {
    const status = rowEvidenceStatus(row);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  return `
    <section class="story-arc" aria-label="Evidence workflow story">
      <div class="story-section-heading">
        <div>
          <p class="eyebrow">Story Arc</p>
          <h4>How A Lead Becomes A Claim</h4>
        </div>
        <span>${escapeHtml(card.kicker || "Evidence")}</span>
      </div>
      <div class="story-chapters">
        ${workflowStatuses()
          .map((status) => `
            <article class="story-chapter status-${escapeHtml(status)}">
              <header>
                <span>${formatNumber(counts[status] || 0)} records</span>
                <strong>${escapeHtml(statusLabels[status] || labelFor(status))}</strong>
              </header>
              <p>${escapeHtml(statusNarrative(status))}</p>
              <div class="story-chapter-meta">${statusTag(status)}</div>
            </article>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function renderStoryArc(card, evidenceRows) {
  return card.product ? renderProductStoryArc(card, evidenceRows) : renderWorkflowStoryArc(card, evidenceRows);
}

function renderProvenanceTrail(evidenceRows) {
  const rows = bestEvidenceRows(evidenceRows, 6);
  if (!rows.length) {
    return `<p class="empty-note">No source-attributable evidence rows are attached to this story under the current filters.</p>`;
  }
  return rows
    .map((row) => {
      const source = row.source_url || row.archive_url || "";
      const status = rowEvidenceStatus(row);
      const title = row.source_title || row.source_domain || row.evidence_kind || "Evidence record";
      const note = row.reviewer_notes || row.unsupported_gap_note || row.promotion_blocker || row.ground_truth_fields_missing || "";
      return `
        <article class="provenance-card">
          <div>
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(row.vintage_label || row.claimed_product_date_text || row.capture_date_text || "")}</span>
          </div>
          <p>${escapeHtml(clipped(note, 170))}</p>
          <dl>
            <dt>Owner</dt>
            <dd>${escapeHtml(row.source_publisher_owner || row.source_author || row.source_domain || "unknown")}</dd>
            <dt>Rights</dt>
            <dd>${escapeHtml(row.license_rights_note || row.source_attribution_grade || "not recorded")}</dd>
            <dt>Capture</dt>
            <dd>${escapeHtml(row.archive_id || row.capture_date_text || row.crawl_id || "not recorded")}</dd>
          </dl>
          <div class="lead-meta">
            ${statusTag(status, `evidence-${status}`)}
            ${statusTag(row.claim_link_status || row.source_attribution_status || row.source_surface)}
            ${linkOrText(source, row.source_domain || "Source")}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderStoryFocus(card, registryRows) {
  if (!card) {
    els.storyFocus.innerHTML = `<p class="empty-note">No stories match the current filters.</p>`;
    return;
  }
  const evidenceRows = card.evidenceRows?.length ? card.evidenceRows : bestEvidenceRows(registryRows, 10);
  const readiness = storyReadinessLabel(card.product, evidenceRows);
  els.storyFocus.innerHTML = `
    <div class="story-focus-main">
      <div class="story-focus-copy">
        <p class="eyebrow">${escapeHtml(card.kicker)}</p>
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.body)}</p>
        <div class="lead-meta">
          ${statusTag(readiness)}
          ${(card.chips || []).filter(Boolean).map((chip) => statusTag(chip)).join("")}
          ${card.links || ""}
        </div>
      </div>
      ${renderStoryReader(card, evidenceRows)}
      ${renderReaderStoryFrame(card, evidenceRows)}
      ${renderProductRecipeJourney(card, evidenceRows)}
      ${renderStoryBrief(card, evidenceRows)}
      <div class="story-proof-grid">${renderStoryClaimCards(card)}</div>
      ${renderStoryLenses(card, evidenceRows)}
      ${card.product ? renderStoryTimeline(card, evidenceRows) : ""}
      ${renderStoryChapterProofFlow(card, evidenceRows)}
      ${renderStoryChapterClaimLedger(card, evidenceRows)}
      ${renderStoryArc(card, evidenceRows)}
    </div>
    <aside class="story-focus-sidebar">
      <div class="story-sidebar-heading">
        <p class="eyebrow">Provenance Trail</p>
        <strong>${formatNumber(evidenceRows.length)} linked records</strong>
      </div>
      ${renderStoryWorkflow(card, evidenceRows)}
      <div class="provenance-list">${renderProvenanceTrail(evidenceRows)}</div>
    </aside>
  `;
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
  const cards = [...boardCards, ...productCards].map((card, index) => ({
    ...card,
    key: storyCardKey(card, index),
  }));

  if (!cards.some((card) => card.key === state.storyKey)) {
    state.storyKey = cards.find((card) => card.key === "oreo-thread")?.key || cards[0]?.key || "";
  }
  const selectedCard = cards.find((card) => card.key === state.storyKey) || cards[0];
  const selectedEvidenceRows = selectedCard
    ? selectedCard.evidenceRows?.length
      ? selectedCard.evidenceRows
      : bestEvidenceRows(registryRows, 10)
    : [];

  els.storyCount.textContent = `${formatNumber(cards.length)} stories`;
  if (selectedCard) {
    renderStoryModeChrome(selectedCard, selectedEvidenceRows, registryRows);
  } else {
    document.body.dataset.storyMode = activeStoryMode().key;
    els.storyModeTitle.textContent = "No story selected";
    els.storyModeSummary.textContent = "No story candidates match the current filters.";
    els.storyModeHint.textContent = "Clear filters to return to the story workspace.";
    els.storyModeTabs.innerHTML = storyModeOptions
      .map((option) => `
        <button class="story-mode-tab ${option.key === activeStoryMode().key ? "is-selected" : ""}" type="button" data-story-mode-choice="${escapeHtml(option.key)}">
          <strong>${escapeHtml(option.label)}</strong>
          <span>${escapeHtml(option.description)}</span>
        </button>
      `)
      .join("");
  }
  renderStoryPath(selectedCard, selectedEvidenceRows);
  renderStoryGate(selectedCard, selectedEvidenceRows);
  renderStoryPacket(selectedCard, selectedEvidenceRows);
  renderStoryReview(selectedCard, selectedEvidenceRows);
  renderReaderDesk(cards, selectedCard, registryRows);
  renderStoryCover(selectedCard, registryRows);
  renderStoryFilmstrip(selectedCard, registryRows);
  renderStoryArticle(selectedCard, registryRows);
  renderStoryChapterBoard(selectedCard, registryRows);
  renderStoryTrace(selectedCard, registryRows);
  renderStoryPhotoBoard(selectedCard, registryRows);
  renderStoryCaptionBoard(selectedCard, registryRows);
  renderStoryComparison(selectedCard, registryRows);
  renderStoryMap(selectedCard, registryRows);
  renderStoryFacets(selectedCard, registryRows);
  renderStoryReceipts(selectedCard, registryRows);
  renderCorpusAtlas(registryRows);
  renderStorySelector(cards);
  renderStoryFocus(selectedCard, registryRows);
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
      <article class="story-card ${card.featured ? "story-featured" : ""} ${card.key === state.storyKey ? "is-selected" : ""}">
        <div class="story-card-head">
          <div>
            <p class="eyebrow">${escapeHtml(card.kicker)}</p>
            <h3>${escapeHtml(card.title)}</h3>
          </div>
          <button class="story-open" type="button" data-story-key="${escapeHtml(card.key)}">Focus</button>
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

function evidenceDataHref(value) {
  const text = String(value || "");
  if (!text) return "";
  return text
    .replace(/^docs\/data\//, "../data/")
    .replace(/^docs\/product-evidence\//, "./");
}

function artifactLink(value, label) {
  const href = evidenceDataHref(value);
  if (!href) return "";
  return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function renderCorpusOcrScale() {
  if (!els.corpusOcrSummary) return;
  const summary = state.data.ingredient_ocr_summary || {};
  const hybrid = summary.hybrid_pipeline || state.data.hybrid_ocr_pipeline_summary || {};
  const imageMapAudit = hybrid.image_map_audit || state.data.hybrid_ocr_image_map_audit || {};
  const captureTasks = hybrid.capture_task_summary || state.data.hybrid_ocr_capture_task_summary || {};
  const candidateCount = numeric(summary.ocr_candidate_count);
  els.corpusOcrCount.textContent = `${formatNumber(candidateCount)} rows`;

  const summaryCards = [
    ["Products", summary.corpus_product_count],
    ["Registry rows", summary.corpus_registry_record_count],
    ["High priority", summary.high_priority_count],
    ["Local image ready", summary.local_image_ready_count],
    ["Needs capture/discovery", summary.not_easily_accessible_count],
    ["Visible panels", summary.ingredient_panel_visible_count],
  ];
  const hybridCards = [
    ["Spark packets", hybrid.model_routes?.spark_packets_generated],
    ["GPT-5.5 batches", hybrid.model_routes?.gpt55_review_batches_planned],
    ["Grok assists", hybrid.model_routes?.grok_assist_batches_created],
    ["Captured", hybrid.capture?.rows_captured],
    ["Image-map rows", hybrid.capture?.image_map_template_rows],
    ["Capture-ready crops", imageMapAudit.ready_for_capture],
    ["Paths needed", imageMapAudit.no_private_path_supplied],
    ["Capture tasks", captureTasks.task_count],
    ["OCR planned", hybrid.ocr?.ocr_planned],
    ["OCR attempted", hybrid.ocr?.ocr_attempted],
    ["OCR skipped", hybrid.ocr?.ocr_skipped_no_image],
    ["Review queue", hybrid.review_queue?.rows],
  ];
  els.corpusOcrSummary.innerHTML = `
    <div class="corpus-ocr-stat-grid">
      ${summaryCards.map(([label, value]) => `
        <article class="corpus-ocr-stat">
          <strong>${formatNumber(value)}</strong>
          <span>${escapeHtml(label)}</span>
        </article>
      `).join("")}
    </div>
    <div class="corpus-ocr-stat-grid corpus-ocr-hybrid-grid">
      ${hybridCards.map(([label, value]) => `
        <article class="corpus-ocr-stat">
          <strong>${formatNumber(value)}</strong>
          <span>${escapeHtml(label)}</span>
        </article>
      `).join("")}
    </div>
    <div class="corpus-ocr-policy">
      <p>${escapeHtml(summary.claim_policy || "OCR output remains candidate evidence until reviewer verified.")}</p>
      <p>${escapeHtml(summary.public_image_policy || "External photos stay link-only; private image maps drive OCR execution.")}</p>
      ${hybrid.model_routes ? `<p>${escapeHtml(`Hybrid routing: ${hybrid.model_routes.spark_model || "Spark"} for bounded packets, ${hybrid.model_routes.gpt55_review_model || "GPT-5.5"} for batch review, ${hybrid.model_routes.grok_research_model || "Grok"} for research assists.`)}</p>` : ""}
      <div class="lead-meta">
        ${artifactLink(summary.queue_csv, "Queue CSV")}
        ${artifactLink(summary.gap_report_csv, "Gap CSV")}
        ${artifactLink(summary.manifest_path, "Manifest")}
        ${artifactLink(hybrid.public_artifacts?.run_summary_csv, "Capture CSV")}
        ${artifactLink(hybrid.public_artifacts?.image_map_template_csv, "Image-map CSV")}
        ${artifactLink(hybrid.public_artifacts?.image_map_audit_csv || imageMapAudit.public_artifacts?.audit_summary_csv, "Image-map Audit")}
        ${artifactLink(hybrid.public_artifacts?.capture_task_csv || captureTasks.public_artifacts?.capture_task_csv, "Capture Tasks")}
        ${artifactLink(hybrid.public_artifacts?.capture_task_runbook_md || captureTasks.public_artifacts?.capture_task_runbook_md, "Capture Runbook")}
        ${artifactLink(hybrid.public_artifacts?.ocr_summary_csv, "OCR CSV")}
        ${artifactLink(hybrid.public_artifacts?.model_assist_summary_csv, "Model CSV")}
        ${artifactLink(hybrid.public_artifacts?.review_queue_csv, "Review CSV")}
      </div>
    </div>
  `;

  const gapRows = summary.top_gap_groups || [];
  els.corpusOcrGaps.innerHTML = gapRows.length
    ? gapRows.map((row) => `
      <article class="corpus-ocr-gap">
        <div class="lead-title">
          <strong>${escapeHtml(labelFor(row.gap_category))}</strong>
          <span>${formatNumber(row.row_count)} rows · ${formatNumber(row.product_count)} products</span>
        </div>
        <p>${escapeHtml(row.suggested_future_run || row.why_not_easy || "")}</p>
        <div class="small">${escapeHtml(row.top_products || "")}</div>
        <div class="lead-meta">
          ${statusTag(row.gap_category)}
          ${row.top_domains ? `<span class="status-tag">${escapeHtml(clipped(row.top_domains, 70))}</span>` : ""}
        </div>
      </article>
    `).join("")
    : `<p class="empty-note">No OCR gap report has been generated yet.</p>`;

  const products = (state.data.products || [])
    .filter(passesProduct)
    .filter((product) => product.ingredient_ocr_summary)
    .sort((a, b) => numeric(b.ingredient_ocr_summary.high_priority_count) - numeric(a.ingredient_ocr_summary.high_priority_count)
      || numeric(b.ingredient_ocr_summary.not_easily_accessible_count) - numeric(a.ingredient_ocr_summary.not_easily_accessible_count)
      || String(a.display_name || a.canonical_name).localeCompare(String(b.display_name || b.canonical_name)))
    .slice(0, 14);
  els.corpusOcrProducts.innerHTML = products.length
    ? products.map((product) => {
      const ocr = product.ingredient_ocr_summary || {};
      const next = numeric(ocr.source_discovery_needed_count)
        ? "Attach source-attributable records before OCR."
        : numeric(ocr.panel_capture_needed_count)
          ? "Capture panel crops, then run Vision OCR."
          : numeric(ocr.source_page_capture_needed_count)
            ? "Capture source pages privately, then classify panels."
            : "Review candidate evidence and verification state.";
      return `
        <article class="corpus-ocr-product">
          <div class="lead-title">
            <strong>${escapeHtml(product.display_name || product.canonical_name)}</strong>
            <span>${escapeHtml(product.category || "")}</span>
          </div>
          <div class="corpus-ocr-product-grid">
            <span><strong>${formatNumber(ocr.high_priority_count)}</strong> high</span>
            <span><strong>${formatNumber(ocr.label_visible_count)}</strong> panels</span>
            <span><strong>${formatNumber(ocr.source_discovery_needed_count)}</strong> discovery</span>
            <span><strong>${formatNumber(ocr.not_easily_accessible_count)}</strong> blocked</span>
          </div>
          <p>${escapeHtml(next)}</p>
        </article>
      `;
    }).join("")
    : `<p class="empty-note">No product OCR summaries match the current filters.</p>`;
}

function renderPhotoProofUpgrades() {
  if (!els.photoProofUpgradeSummary) return;
  const summary = state.data.photo_proof_upgrade_summary || {};
  const policy = summary.public_policy || {};
  const statRows = [
    ["Evidence rows", summary.evidence_row_count],
    ["Embeddable photos", summary.embed_ready_count],
    ["Source receipts", summary.source_receipt_only_count],
    ["Panel capture", summary.panel_capture_needed_count],
    ["Source pages", summary.source_page_capture_needed_count],
    ["Source gaps", summary.source_discovery_needed_count],
    ["Ingredient signals", summary.ingredient_signal_row_count],
  ];
  const laneRows = summary.lane_counts || [];
  const artifacts = summary.artifacts || {};
  els.photoProofUpgradeSummary.innerHTML = summary.evidence_row_count ? `
    <div class="photo-proof-stat-grid">
      ${statRows.map(([label, value]) => `
        <article class="photo-proof-stat">
          <strong>${formatNumber(value)}</strong>
          <span>${escapeHtml(label)}</span>
        </article>
      `).join("")}
    </div>
    <article class="photo-proof-policy">
      <strong>Public display rule</strong>
      <p>${escapeHtml(policy.summary || "External product photos remain link-only until rights are reviewed.")}</p>
      <p>${escapeHtml(policy.publishable_image_rule || "Only rows marked embed-ready may render public images.")}</p>
      <div class="lead-meta">
        ${artifactLink(artifacts.queue_csv, "Queue CSV")}
        ${artifactLink(artifacts.queue_json, "Queue JSON")}
        ${artifactLink(artifacts.report_markdown, "Report")}
      </div>
    </article>
    <div class="photo-proof-lanes">
      ${laneRows.map((row) => `
        <span>${statusTag(row.value)} <strong>${formatNumber(row.count)}</strong></span>
      `).join("")}
    </div>
  ` : `<p class="empty-note">No photo proof upgrade queue has been generated yet.</p>`;

  const productRows = (summary.top_products || [])
    .filter((product) => {
      const query = state.search.trim().toLowerCase();
      return !query || `${product.name} ${product.id}`.toLowerCase().includes(query);
    })
    .slice(0, 12);
  els.photoProofUpgradeProducts.innerHTML = productRows.length
    ? productRows.map((product) => `
      <article class="photo-proof-product">
        <div class="lead-title">
          <strong>${escapeHtml(product.name || product.id)}</strong>
          <span>${escapeHtml(labelFor(product.corpus_scope || "product"))}</span>
        </div>
        <div class="photo-proof-product-grid">
          <span><strong>${formatNumber(product.row_count)}</strong> rows</span>
          <span><strong>${formatNumber(product.ingredient_signal_count)}</strong> signals</span>
          <span><strong>${formatNumber(product.source_receipt_count)}</strong> receipts</span>
          <span><strong>${formatNumber(product.panel_capture_needed_count)}</strong> panels</span>
        </div>
        <p>${escapeHtml(product.next_action || "Review source receipt and display policy.")}</p>
      </article>
    `).join("")
    : `<p class="empty-note">No photo proof product rows match the current filters.</p>`;

  const queueRows = (summary.top_queue || [])
    .filter((row) => {
      const query = state.search.trim().toLowerCase();
      return !query || textBlob(row).includes(query);
    })
    .slice(0, 16);
  els.photoProofUpgradeQueue.innerHTML = queueRows.length
    ? queueRows.map((row) => `
      <article class="photo-proof-row">
        <div class="lead-title">
          <strong>${escapeHtml(row.product_name || row.product_id)}</strong>
          <span>${escapeHtml(row.source_owner || row.evidence_kind || "")}</span>
        </div>
        <p>${escapeHtml(row.next_action || "")}</p>
        <dl class="photo-proof-row-fields">
          <div>
            <dt>Photo role</dt>
            <dd>${escapeHtml(row.photo_role || "source receipt")}</dd>
          </div>
          <div>
            <dt>Panel</dt>
            <dd>${escapeHtml(row.label_panel_state || "not reviewed")}</dd>
          </div>
          <div>
            <dt>Rights</dt>
            <dd>${escapeHtml(row.rights_status || "rights note needed")}</dd>
          </div>
        </dl>
        <div class="lead-meta">
          ${statusTag(row.display_lane)}
          ${statusTag(row.public_display_decision)}
          ${row.ingredient_signal ? statusTag("ingredient_signal") : ""}
          ${row.has_label_extract ? statusTag("label_extract") : ""}
          ${linkOrText(row.source_url, "Source")}
        </div>
      </article>
    `).join("")
    : `<p class="empty-note">No photo proof evidence rows match the current filters.</p>`;

  const capture = state.data.pilot_photo_capture_summary || {};
  const captureArtifacts = capture.artifacts || {};
  const captureStats = [
    ["Pilot products", capture.product_count],
    ["Selected rows", capture.selected_row_count],
    ["Capture batches", capture.batch_count],
    ["Panel captures", capture.panel_capture_needed_count],
    ["Source pages", capture.source_page_capture_needed_count],
    ["Ingredient signals", capture.ingredient_signal_row_count],
  ];
  els.pilotPhotoCaptureSummary.innerHTML = capture.selected_row_count ? `
    <div class="pilot-capture-stat-grid">
      ${captureStats.map(([label, value]) => `
        <article class="photo-proof-stat">
          <strong>${formatNumber(value)}</strong>
          <span>${escapeHtml(label)}</span>
        </article>
      `).join("")}
    </div>
    <article class="photo-proof-policy">
      <strong>Private capture handoff</strong>
      <p>${escapeHtml(capture.selection_policy?.private_capture_policy || "Write captures and image-map paths only to the private OCR cache.")}</p>
      <p>${escapeHtml(capture.selection_policy?.public_output_policy || "Public artifacts expose source URLs, hashes/statuses, and candidate-only OCR state only.")}</p>
      <div class="lead-meta">
        ${artifactLink(captureArtifacts.manifest_json, "Batch JSON")}
        ${artifactLink(captureArtifacts.batch_csv, "Batch CSV")}
        ${artifactLink(captureArtifacts.row_csv, "Row CSV")}
        ${artifactLink(captureArtifacts.runbook_markdown, "Runbook")}
      </div>
    </article>
  ` : `<p class="empty-note">No pilot capture batches have been generated yet.</p>`;

  const captureBatches = (capture.top_batches || [])
    .filter((batch) => {
      const query = state.search.trim().toLowerCase();
      return !query || `${batch.product_name} ${batch.product_id} ${batch.first_evidence_ids?.join(" ")}`.toLowerCase().includes(query);
    })
    .slice(0, 12);
  els.pilotPhotoCaptureBatches.innerHTML = captureBatches.length
    ? captureBatches.map((batch) => `
      <article class="pilot-capture-batch">
        <div class="lead-title">
          <strong>${escapeHtml(batch.product_name || batch.product_id)}</strong>
          <span>${escapeHtml(batch.batch_id)}</span>
        </div>
        <div class="photo-proof-product-grid">
          <span><strong>${formatNumber(batch.row_count)}</strong> rows</span>
          <span><strong>${formatNumber(batch.ingredient_signal_count)}</strong> signals</span>
          <span><strong>${formatNumber(batch.max_priority)}</strong> priority</span>
          <span><strong>${escapeHtml(labelFor(batch.display_lane || ""))}</strong></span>
        </div>
        <p>${escapeHtml(batch.capture_goal || "Create private captures/crops for OCR review.")}</p>
        <div class="lead-meta">
          ${statusTag(batch.display_lane)}
          ${batch.source_owner ? `<span class="status-tag">${escapeHtml(clipped(batch.source_owner, 96))}</span>` : ""}
          ${(batch.first_evidence_ids || []).slice(0, 4).map((id) => `<code>${escapeHtml(id)}</code>`).join("")}
        </div>
      </article>
    `).join("")
    : `<p class="empty-note">No pilot capture batches match the current filters.</p>`;

  if (els.pilotCaptureDryRunSummary) {
    const dryRun = state.data.pilot_capture_pipeline_summary || {};
    const dryAudit = dryRun.image_map_audit || state.data.pilot_capture_image_map_audit || {};
    const dryTasks = dryRun.capture_task_summary || state.data.pilot_capture_task_summary || {};
    const dryArtifacts = dryRun.public_artifacts || {};
    const dryStats = [
      ["Selected rows", dryRun.capture?.selected_rows],
      ["Capture rows", dryRun.capture?.rows_captured],
      ["Ready for OCR", dryRun.capture?.ready_for_ocr],
      ["Blocked no-network", dryRun.capture?.blocked_no_network],
      ["Image-map rows", dryRun.capture?.image_map_template_rows],
      ["Image-map keys", dryRun.capture?.image_map_key_count],
      ["Capture-ready crops", dryAudit.ready_for_capture],
      ["Paths needed", dryAudit.no_private_path_supplied],
      ["Capture tasks", dryTasks.task_count],
      ["OCR planned", dryRun.ocr?.ocr_planned],
      ["OCR skipped", dryRun.ocr?.ocr_skipped_no_image],
      ["Review rows", dryRun.review_queue?.rows],
      ["Needs source review", dryRun.review_queue?.needs_source_review],
    ];
    const routeStats = [
      ["Spark packets", dryRun.model_routes?.spark_packets_generated],
      ["GPT-5.5 batches", dryRun.model_routes?.gpt55_review_batches_planned],
      ["Grok assists", dryRun.model_routes?.grok_assist_batches_created],
    ];
    els.pilotCaptureDryRunSummary.innerHTML = dryRun.run_id ? `
      <div class="pilot-capture-dry-grid">
        ${dryStats.map(([label, value]) => `
          <article class="photo-proof-stat">
            <strong>${formatNumber(value)}</strong>
            <span>${escapeHtml(label)}</span>
          </article>
        `).join("")}
      </div>
      <article class="photo-proof-policy pilot-capture-dry-policy">
        <strong>${escapeHtml(dryRun.run_id)}</strong>
        <p>${escapeHtml(dryRun.run_policy?.mode || "Dry run; no network capture or external model call has been executed.")}</p>
        <p>${escapeHtml(dryRun.run_policy?.public_safety || "No private images, local paths, prompts, secrets, or verified ingredient claims are published.")}</p>
        <div class="pilot-capture-route-grid">
          ${routeStats.map(([label, value]) => `
            <span><strong>${formatNumber(value)}</strong>${escapeHtml(label)}</span>
          `).join("")}
        </div>
        <div class="lead-meta">
          ${artifactLink(dryArtifacts.pipeline_summary_json, "Pipeline JSON")}
          ${artifactLink(dryArtifacts.run_summary_csv, "Run CSV")}
          ${artifactLink(dryArtifacts.image_map_template_csv, "Image-map CSV")}
          ${artifactLink(dryArtifacts.image_map_audit_csv || dryAudit.public_artifacts?.audit_summary_csv, "Image-map Audit")}
          ${artifactLink(dryArtifacts.capture_task_csv || dryTasks.public_artifacts?.capture_task_csv, "Capture Tasks")}
          ${artifactLink(dryArtifacts.capture_task_runbook_md || dryTasks.public_artifacts?.capture_task_runbook_md, "Capture Runbook")}
          ${artifactLink(dryArtifacts.ocr_summary_csv, "OCR CSV")}
          ${artifactLink(dryArtifacts.model_assist_summary_csv, "Model CSV")}
          ${artifactLink(dryArtifacts.review_queue_csv, "Review CSV")}
        </div>
      </article>
      <article class="photo-proof-policy pilot-capture-dry-policy">
        <strong>Current blocker</strong>
        <p>${escapeHtml("The pilot rows are source-linked but not image-map ready. Private captures/crops must be created before the Swift/Vision OCR harness can attempt ingredient extraction.")}</p>
        <div class="lead-meta">
          ${statusTag("candidate_only")}
          ${statusTag("needs_source_review")}
          ${statusTag("source_link_only_no_public_image")}
        </div>
      </article>
    ` : `<p class="empty-note">No pilot dry-run capture summary has been generated yet.</p>`;
  }
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
    <strong>Story workspace snapshot loaded</strong>
    <span>Showing ${formatNumber(state.data.metrics.evidence_registry_rows || state.data.evidence_registry?.length || 0)} registry records from ${escapeHtml(state.data.source_run)} as reader, proof, and research views · generated ${escapeHtml(generated)}</span>
  `;
}

function render() {
  renderMetrics();
  renderCrawlHealth();
  renderStorylines();
  renderScalePriorities();
  renderLegend();
  renderProducts();
  renderSourceBars();
  renderCoverageSummary();
  renderGaps();
  renderCorpusOcrScale();
  renderPhotoProofUpgrades();
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
  const selectStory = (event) => {
    const button = event.target.closest("[data-story-key]");
    if (!button) return;
    state.storyKey = button.dataset.storyKey || "";
    render();
    els.storyFocus.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  els.readerLineup.addEventListener("click", selectStory);
  els.readerClusters.addEventListener("click", selectStory);
  els.readerGallery.addEventListener("click", selectStory);
  els.readerCompare.addEventListener("click", selectStory);
  els.storySelector.addEventListener("click", selectStory);
  els.storyRows.addEventListener("click", selectStory);
  els.storyModeTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-story-mode-choice]");
    if (!button) return;
    state.storyMode = button.dataset.storyModeChoice || storyModeOptions[0].key;
    render();
  });
  els.readerLensbar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-story-lens]");
    if (!button) return;
    state.storyLens = button.dataset.storyLens || storyLensOptions[0].key;
    render();
  });
  els.storyCompareStage.addEventListener("click", (event) => {
    const button = event.target.closest("[data-story-lens]");
    if (!button) return;
    state.storyLens = button.dataset.storyLens || storyLensOptions[0].key;
    render();
  });
  els.storyMap.addEventListener("click", (event) => {
    const button = event.target.closest("[data-story-lens]");
    if (!button) return;
    state.storyLens = button.dataset.storyLens || storyLensOptions[0].key;
    render();
  });
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
