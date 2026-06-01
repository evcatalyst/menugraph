const state = {
  allMenus: [],
  fullMenus: [],
  fullRecordLabel: "",
  visibleMenus: [],
  activeLens: "chat",
  archiveMode: false,
  ontology: null,
  prices: null,
  chatMessages: [],
  chatBusy: false,
  chatDraft: "",
  askUnlocked: false,
  askSecretHash: "",
  askError: "",
  dateEstimates: null,
  dateEstimateByMenu: new Map(),
  includeEstimatedDates: true,
  matches: null,
  ontologyCategory: "ingredients",
  priceMode: "todayUsd",
  priceCurrency: null,
  priceConfidence: null,
  selectedOntologyTerm: null,
  selectedOntologyIds: null,
  selectedPriceMenuIds: null,
  ontologyPoll: null,
  filterDrawerOpen: false,
  filters: {
    search: "",
    decade: null,
    type: null,
    place: null,
    source: "all",
    minYear: 1800,
    maxYear: 2020,
  },
  selectedId: null,
  detailCache: new Map(),
  mobileLab: {
    enabled: false,
    variant: "hybrid",
    mode: "discover",
    command: "",
    trayIds: [],
    detailId: null,
    detailMenu: null,
    detailData: null,
    detailError: "",
    detailOpen: false,
    sheetState: "half",
  },
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEFAULT_REMOTE_CHAT_API_BASE = "https://gitbrain-menugraph.netlify.app";
const ASK_SECRET_HASH = "8f388ed94f5ff3d417b9b3f897bf9fc4d56a2d0dd6778905d8440a938558d30a";
const ASK_SECRET_STORAGE_KEY = "menugraph:ask-secret-hash:v1";
const MOBILE_LAB_VARIANTS = new Set(["cards", "journey", "chat", "recipe", "hybrid"]);
const MOBILE_LAB_MODE_BY_VARIANT = {
  cards: "menus",
  journey: "discover",
  chat: "ask",
  recipe: "inspire",
  hybrid: "discover",
};

const els = {
  recordCount: document.querySelector("#record-count"),
  searchInput: document.querySelector("#search-input"),
  fieldSelect: document.querySelector("#field-select"),
  archiveSearch: document.querySelector("#archive-search"),
  lensButtons: [...document.querySelectorAll(".lens-switch button")],
  sourceButtons: [...document.querySelectorAll(".source-switch button")],
  yearMin: document.querySelector("#year-min"),
  yearMax: document.querySelector("#year-max"),
  yearLabel: document.querySelector("#year-label"),
  estimatedToggle: document.querySelector("#estimated-toggle"),
  dateEstimateStatus: document.querySelector("#date-estimate-status"),
  decadeFacets: document.querySelector("#decade-facets"),
  typeFacets: document.querySelector("#type-facets"),
  placeFacets: document.querySelector("#place-facets"),
  clearFilters: document.querySelector("#clear-filters"),
  lensLabel: document.querySelector("#lens-label"),
  resultTitle: document.querySelector("#result-title"),
  viz: document.querySelector("#viz"),
  sampleButton: document.querySelector("#sample-button"),
  refreshButton: document.querySelector("#refresh-button"),
  resultsLabel: document.querySelector("#results-label"),
  resultsCount: document.querySelector("#results-count"),
  resultList: document.querySelector("#result-list"),
  detailEmpty: document.querySelector("#detail-empty"),
  detailCard: document.querySelector("#detail-card"),
  detailImage: document.querySelector("#detail-image"),
  detailKicker: document.querySelector("#detail-kicker"),
  detailTitle: document.querySelector("#detail-title"),
  detailMeta: document.querySelector("#detail-meta"),
  detailEvidence: document.querySelector("#detail-evidence"),
  detailText: document.querySelector("#detail-text"),
  detailLink: document.querySelector("#detail-link"),
  detailImageZoom: document.querySelector("#detail-image-zoom"),
  pageStrip: document.querySelector("#page-strip"),
  ontologyStatus: document.querySelector("#ontology-status"),
  ontologyTerms: document.querySelector("#ontology-terms"),
  ontologyCategoryButtons: [...document.querySelectorAll(".ontology-tabs button")],
  priceStatus: document.querySelector("#price-status"),
  priceFacets: document.querySelector("#price-facets"),
  priceModeButtons: [...document.querySelectorAll(".price-tabs button")],
  ontologyBuild: document.querySelector("#ontology-build"),
  insightsList: document.querySelector("#insights-list"),
  activityPanel: document.querySelector("#activity-panel"),
  activityLabel: document.querySelector("#activity-label"),
  activityTitle: document.querySelector("#activity-title"),
  activityDetail: document.querySelector("#activity-detail"),
  activityProgress: document.querySelector("#activity-progress"),
  activityProgressText: document.querySelector("#activity-progress-text"),
  filterPanel: document.querySelector("#filter-panel"),
  filterToggle: document.querySelector("#filter-toggle"),
  filterClose: document.querySelector("#filter-close"),
  filterBackdrop: document.querySelector("#filter-backdrop"),
  canvasPanel: document.querySelector(".canvas-panel"),
  detailPanel: document.querySelector(".detail"),
};

const palette = ["#327c87", "#b6573c", "#5f7d4f", "#c49a47", "#b76075", "#2f3a3f"];
const categoryLabels = {
  meals: "Meals",
  dishes: "Dishes",
  ingredients: "Ingredients",
  beverages: "Beverages",
  styles: "Styles",
  clusters: "Clusters",
};
const chatSuggestions = window.MenuGraphChat?.suggestedQuestions || [
  "beef or steak dishes that are stew with carrots and potatoes, no mushrooms",
  "oysters and champagne in New York before 1920",
  "lobster prices in Boston and New York",
  "estimated 1980s French restaurants with desserts",
];

try {
  state.askSecretHash = sessionStorage.getItem(ASK_SECRET_STORAGE_KEY) || "";
  state.askUnlocked = state.askSecretHash === ASK_SECRET_HASH;
} catch (error) {
  state.askSecretHash = "";
  state.askUnlocked = false;
}

function titleCase(value) {
  return String(value || "")
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

function compact(value, fallback = "Unknown") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

async function sha256Hex(value) {
  if (!window.crypto?.subtle || !window.TextEncoder) throw new Error("This browser cannot verify the Ask secret.");
  const bytes = new TextEncoder().encode(String(value || ""));
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function unlockAsk(secret) {
  const hash = await sha256Hex(secret);
  if (hash !== ASK_SECRET_HASH) {
    state.askError = "Shared secret did not match.";
    state.askUnlocked = false;
    state.askSecretHash = "";
    throw new Error(state.askError);
  }
  state.askError = "";
  state.askUnlocked = true;
  state.askSecretHash = hash;
  try {
    sessionStorage.setItem(ASK_SECRET_STORAGE_KEY, hash);
  } catch (error) {
    // Session storage can be unavailable in restrictive browser modes; the current in-memory unlock still works.
  }
}

function askCredentialPayload() {
  return state.askUnlocked && state.askSecretHash ? { askSecretHash: state.askSecretHash } : {};
}

function menuKey(menu) {
  if (!menu) return "";
  return window.MenuGraphMultiSource?.recordUid(menu) || menu.uid || menu.id;
}

function sourceLabel(menu) {
  return menu?.sourceShortLabel || menu?.sourceLabel || (menu?.sourceKey ? menu.sourceKey.toUpperCase() : "CIA");
}

function sourceCollectionLabel(sourceKey) {
  if (sourceKey === "nypl") return "NYPL Digital Collections";
  if (sourceKey === "cia") return "CIA Digital Collections";
  return "Source Collection";
}

function dateEstimateKeys(menu) {
  const keys = [menuKey(menu), menu?.uid, menu?.id, menu?.pointer, menu?.sourceRecordId].filter((value) => value !== undefined && value !== null && value !== "");
  if ((menu?.sourceKey || "cia") === "cia" && menu?.id) keys.push(`cia:${menu.id}`);
  return [...new Set(keys.map(String))];
}

function dateEstimateFor(menu) {
  if (!menu) return null;
  for (const key of dateEstimateKeys(menu)) {
    const estimate = state.dateEstimateByMenu.get(key);
    if (estimate) return estimate;
  }
  return null;
}

function decadeFromYear(year) {
  const value = Number(year);
  return Number.isFinite(value) ? `${Math.floor(value / 10) * 10}s` : null;
}

function sourceDecade(menu) {
  const source = compact(menu?.decade, "").toLowerCase();
  if (source && source !== "unknown") return menu.decade;
  return decadeFromYear(menu?.year) || menu?.decade || "unknown";
}

function isPlottableDateEstimate(estimate) {
  return estimate?.estimatedCenterYear && ["A", "B", "C"].includes(estimate.confidence);
}

function effectiveYear(menu) {
  if (menu?.year) return menu.year;
  const estimate = dateEstimateFor(menu);
  return state.includeEstimatedDates && isPlottableDateEstimate(estimate) ? estimate.estimatedCenterYear : null;
}

function effectiveDecade(menu) {
  if (menu?.year) return sourceDecade(menu);
  const estimate = dateEstimateFor(menu);
  return state.includeEstimatedDates && isPlottableDateEstimate(estimate) ? estimate.estimatedDecade : menu?.decade || "unknown";
}

function formatEstimateRange(estimate) {
  if (!estimate) return "";
  const start = estimate.estimatedNotBefore ? estimate.estimatedNotBefore.slice(0, 4) : "?";
  const end = estimate.estimatedNotAfter ? estimate.estimatedNotAfter.slice(0, 4) : "?";
  if (start === end && start !== "?") return `Estimated ${start}`;
  return `Estimated ${start}-${end}`;
}

function estimateEvidenceLabel(estimate) {
  const evidence = estimate?.evidence?.[0];
  if (!evidence) return "";
  const source = evidence.source ? ` from ${evidence.source}` : "";
  return `${formatEstimateRange(estimate)}${source}`;
}

function displayDateLabel(menu) {
  const sourceDate = compact(menu?.date, "");
  if (sourceDate) return sourceDate;
  const estimate = dateEstimateFor(menu);
  return isPlottableDateEstimate(estimate) ? formatEstimateRange(estimate) : "Undated";
}

function placeholderImage(label = "Menu") {
  const text = titleCase(compact(label, "Menu")).slice(0, 28);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 420">
      <rect width="320" height="420" fill="#f5f0e7"/>
      <rect x="54" y="46" width="212" height="328" rx="8" fill="#fffaf0" stroke="#c9b88f" stroke-width="6"/>
      <path d="M92 118h136M92 156h136M92 194h136M92 232h104M92 282h136" stroke="#6f7f74" stroke-width="10" stroke-linecap="round"/>
      <circle cx="160" cy="84" r="18" fill="#b6573c"/>
      <text x="160" y="340" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="#2f3a3f">${text}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function setImageSource(img, src, label) {
  if (!img) return;
  img.onerror = () => {
    img.onerror = null;
    img.src = placeholderImage(label);
  };
  img.src = src || placeholderImage(label);
}

function detailImageSource(src, sourceKey) {
  if (sourceKey === "nypl" && src) return src.replace(/([?&]t=)[a-z]\b/i, "$1v");
  return src;
}

function zoomableImageSource(src, sourceKey) {
  if (sourceKey === "nypl" && src) return src.replace(/([?&]t=)[a-z]\b/i, "$1w");
  return detailImageSource(src, sourceKey);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function uniqueCount(menus, getter) {
  const map = new Map();
  for (const menu of menus) {
    const values = getter(menu);
    for (const raw of Array.isArray(values) ? values : [values]) {
      const value = compact(raw, "");
      if (!value) continue;
      const key = value.toLowerCase();
      map.set(key, { name: value, count: (map.get(key)?.count || 0) + 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

async function getJson(url, options = {}) {
  if (window.MenuGraphArchive && url.startsWith("/api/")) {
    return window.MenuGraphArchive.handle(url, options);
  }
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || response.statusText);
  }
  return response.json();
}

async function fetchJsonDirect(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || response.statusText);
  }
  return response.json();
}

function isLocalHost() {
  return LOCAL_HOSTS.has(window.location.hostname);
}

function remoteChatApiBase() {
  const explicit = window.MENUGRAPH_CHAT_API_BASE || window.MenuGraphConfig?.chatApiBase;
  if (explicit) return String(explicit).replace(/\/+$/, "");
  if (window.location.hostname.endsWith("github.io")) return DEFAULT_REMOTE_CHAT_API_BASE;
  return "";
}

async function loadMenus(refresh = false) {
  els.recordCount.textContent = refresh ? "Refreshing archive..." : "Loading archive...";
  setActivity({
    label: refresh ? "Refreshing Archive" : "Loading Archive",
    title: "Paging CONTENTdm metadata",
    detail: "Requesting records in batches, then merging date, place, type, cuisine, source, and image pointers.",
    indeterminate: true,
  });
  els.viz.innerHTML = '<div class="loading">Pulling published metadata from CONTENTdm...</div>';
  const payload = await getJson(`/api/menus${refresh ? "?refresh=1" : ""}`, {
    onProgress: (progress) => setActivity(progress),
  });
  state.allMenus = payload.menus;
  state.fullMenus = payload.menus;
  const sourceCounts = payload.summary.sources?.map((item) => `${item.name}: ${item.count.toLocaleString()}`).join(" / ");
  state.fullRecordLabel = sourceCounts || `${payload.summary.total.toLocaleString()} menus loaded`;
  state.archiveMode = false;
  const summary = payload.summary;
  const min = summary.yearMin || 1800;
  const max = summary.yearMax || new Date().getFullYear();
  state.filters.minYear = min;
  state.filters.maxYear = max;
  for (const slider of [els.yearMin, els.yearMax]) {
    slider.min = min;
    slider.max = max;
  }
  els.yearMin.value = min;
  els.yearMax.value = max;
  els.recordCount.textContent = state.fullRecordLabel;
  setActivity({
    label: "Archive Ready",
    title: `${summary.total.toLocaleString()} records mapped`,
    detail: `Known dates run ${min} - ${max}. Source, date, place, food, and price lenses are ready.`,
    progress: 1,
  });
  update();
  loadDateEstimates().catch(() => {
    if (els.dateEstimateStatus) els.dateEstimateStatus.textContent = "offline";
  });
  loadOntology().catch(() => {
    els.ontologyStatus.textContent = "offline";
  });
  loadPrices().catch(() => {
    if (els.priceStatus) els.priceStatus.textContent = "offline";
  });
  loadMatches().catch(() => {});
}

async function loadOntology(refresh = false) {
  els.ontologyStatus.textContent = "loading";
  setActivity({
    label: "Ontology",
    title: "Loading food index",
    detail: "Reading cached ontology terms and trend counts for meals, dishes, ingredients, beverages, styles, and clusters.",
    indeterminate: true,
  });
  const ontology = await getJson(`/api/ontology${refresh ? "?refresh=1" : ""}`);
  state.ontology = ontology;
  updateOntologyStatus(ontology.job);
  configureOntologyBuildButton();
  renderOntologyControls();
  renderInsights();
  describeOntologyLoaded(ontology);
  if (ontology.job?.active) startOntologyPolling();
  if (state.activeLens === "ontology") renderViz();
}

async function loadPrices(refresh = false) {
  if (els.priceStatus) els.priceStatus.textContent = "loading";
  const prices = await getJson(`/api/prices${refresh ? "?refresh=1" : ""}`);
  state.prices = prices;
  renderPriceControls();
  if (els.priceStatus) {
    const count = Number(prices.summary?.total || 0);
    els.priceStatus.textContent = count ? `${count.toLocaleString()} prices` : "none";
  }
  if (state.activeLens === "prices") {
    describePricesLoaded();
    renderViz();
  }
}

async function loadDateEstimates(refresh = false) {
  if (els.dateEstimateStatus) els.dateEstimateStatus.textContent = "loading";
  const dateEstimates = await getJson(`/api/date-estimates${refresh ? "?refresh=1" : ""}`);
  state.dateEstimates = dateEstimates;
  state.dateEstimateByMenu = new Map();
  for (const record of dateEstimates.records || []) {
    const key = String(record.menuId);
    state.dateEstimateByMenu.set(key, record);
    const ciaMatch = key.match(/^cia:(\d+)$/);
    if (ciaMatch) state.dateEstimateByMenu.set(ciaMatch[1], record);
    if (/^\d+$/.test(key)) state.dateEstimateByMenu.set(`cia:${key}`, record);
  }
  if (els.dateEstimateStatus) {
    const summary = dateEstimates.summary || {};
    const estimated = Number(summary.plottableEstimated || 0);
    const review = Number(summary.needsReview || 0);
    els.dateEstimateStatus.textContent = `${estimated.toLocaleString()} estimated / ${review.toLocaleString()} review`;
  }
  update();
}

async function loadMatches(refresh = false) {
  const payload = await getJson(`/api/matches/__index__${refresh ? "?refresh=1" : ""}`).catch(() => null);
  state.matches = payload?.relationships ? payload : state.matches;
}

function filteredMenus(options = {}) {
  const includeOntology = options.includeOntology !== false;
  const includePriceSelection = options.includePriceSelection !== false;
  const search = state.filters.search.trim().toLowerCase();
  return state.allMenus.filter((menu) => {
    const menuYear = effectiveYear(menu);
    if (state.filters.source === "matched" && !Number(menu.matchCount || 0)) return false;
    if (state.filters.source && state.filters.source !== "all" && state.filters.source !== "matched" && menu.sourceKey !== state.filters.source) return false;
    if (menuYear && (menuYear < state.filters.minYear || menuYear > state.filters.maxYear)) return false;
    if (state.filters.decade && compact(effectiveDecade(menu)).toLowerCase() !== state.filters.decade) return false;
    if (state.filters.type && !menu.types.some((type) => type.toLowerCase() === state.filters.type)) return false;
    if (includeOntology && state.selectedOntologyIds && !state.selectedOntologyIds.has(menuKey(menu))) return false;
    if (includePriceSelection && state.selectedPriceMenuIds && !state.selectedPriceMenuIds.has(menu.id)) return false;
    if (
      state.filters.place &&
      ![menu.city, menu.state, menu.country].some((place) => compact(place, "").toLowerCase() === state.filters.place)
    ) {
      return false;
    }
    if (search) {
      const haystack = [menu.title, menu.restaurant, menu.city, menu.state, menu.country, menu.types.join(" "), menu.source, menu.sourceLabel, menu.topDishes?.join(" ")]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

function update() {
  state.visibleMenus = filteredMenus();
  updateYearLabel();
  renderSourceControls();
  renderFacets();
  renderOntologyControls();
  renderPriceControls();
  renderViz();
  renderResults();
  renderMobileLab();
}

function renderSourceControls() {
  els.sourceButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.source === state.filters.source);
  });
}

function updateYearLabel() {
  const min = Number(els.yearMin.value);
  const max = Number(els.yearMax.value);
  state.filters.minYear = Math.min(min, max);
  state.filters.maxYear = Math.max(min, max);
  els.yearLabel.textContent = `${state.filters.minYear} - ${state.filters.maxYear}`;
}

function makeFacetButton(item, selected, onClick) {
  const label = item.name || item.term;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "facet-pill";
  button.dataset.selected = selected ? "true" : "false";
  button.innerHTML = `<span>${titleCase(label)}</span><small>${item.count}</small>`;
  button.addEventListener("click", onClick);
  return button;
}

function renderFacets() {
  const base = filteredMenusWithoutFacet();
  const decadeCounts = uniqueCount(base.decade, (menu) => effectiveDecade(menu)).slice(0, 12);
  const typeCounts = uniqueCount(base.type, (menu) => menu.types).slice(0, 10);
  const placeCounts = uniqueCount(base.place, (menu) => [menu.city, menu.state, menu.country]).slice(0, 14);

  els.decadeFacets.replaceChildren(
    ...decadeCounts.map((item) =>
      makeFacetButton(item, state.filters.decade === item.name.toLowerCase(), () => {
        state.filters.decade = state.filters.decade === item.name.toLowerCase() ? null : item.name.toLowerCase();
        update();
      })
    )
  );

  els.typeFacets.replaceChildren(
    ...typeCounts.map((item) =>
      makeFacetButton(item, state.filters.type === item.name.toLowerCase(), () => {
        state.filters.type = state.filters.type === item.name.toLowerCase() ? null : item.name.toLowerCase();
        update();
      })
    )
  );

  els.placeFacets.replaceChildren(
    ...placeCounts.map((item) =>
      makeFacetButton(item, state.filters.place === item.name.toLowerCase(), () => {
        state.filters.place = state.filters.place === item.name.toLowerCase() ? null : item.name.toLowerCase();
        update();
      })
    )
  );
}

function renderOntologyControls() {
  if (!els.ontologyTerms) return;
  const terms = state.ontology?.categories?.[state.ontologyCategory] || [];
  els.ontologyCategoryButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.category === state.ontologyCategory);
  });
  els.ontologyTerms.replaceChildren(
    ...terms.slice(0, 16).map((term) =>
      makeFacetButton(term, state.selectedOntologyTerm?.id === term.id, () => {
        selectOntologyTerm(state.selectedOntologyTerm?.id === term.id ? null : term);
      })
    )
  );
}

function priceRecordsForVisibleMenus() {
  const menuPool = state.selectedOntologyTerm ? filteredMenus({ includeOntology: false, includePriceSelection: false }) : state.visibleMenus;
  const visibleIds = new Set(menuPool.map((menu) => String(menu.id)));
  return (state.prices?.records || []).filter((record) => {
    if (!visibleIds.has(String(record.menuId))) return false;
    if (state.selectedOntologyTerm && !priceRecordMatchesOntologyTerm(record, state.selectedOntologyTerm.term)) return false;
    if (state.priceCurrency && record.currency !== state.priceCurrency) return false;
    if (state.priceConfidence && record.confidence !== state.priceConfidence) return false;
    if (!state.priceConfidence && record.confidence === "low") return false;
    if (record.year && (record.year < state.filters.minYear || record.year > state.filters.maxYear)) return false;
    return valueForPriceRecord(record) !== null;
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termBoundaryPattern(term) {
  const normalized = compact(term, "").toLowerCase();
  if (!normalized) return null;
  if (/^[a-z0-9]+$/.test(normalized)) {
    const pluralLike = normalized.length > 3 && normalized.endsWith("s") && !normalized.endsWith("ss") && !normalized.endsWith("us");
    const stem = pluralLike ? normalized.slice(0, -1) : normalized;
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(stem)}s?([^a-z0-9]|$)`, "i");
  }
  const phrase = normalized.split(/\s+/).map(escapeRegExp).join("\\s+");
  return new RegExp(`(^|[^a-z0-9])${phrase}([^a-z0-9]|$)`, "i");
}

function priceRecordMatchesOntologyTerm(record, term) {
  const pattern = termBoundaryPattern(term);
  if (!pattern) return true;
  return pattern.test(String(record.item || "").toLowerCase());
}

function renderPriceControls() {
  if (!els.priceFacets) return;
  els.priceModeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.priceMode === state.priceMode);
  });

  const records = state.prices?.records || [];
  const currencies = uniqueCount(records, (record) => record.currency).slice(0, 5);
  const confidence = uniqueCount(records, (record) => record.confidence).slice(0, 3);
  const buttons = [
    ...currencies.map((item) =>
      makeFacetButton(
        { name: item.name, count: item.count },
        state.priceCurrency === item.name,
        () => {
          state.priceCurrency = state.priceCurrency === item.name ? null : item.name;
          state.activeLens = "prices";
          activateLensButton("prices");
          describePricesLoaded();
          update();
        }
      )
    ),
    ...confidence.map((item) =>
      makeFacetButton(
        { name: item.name, count: item.count },
        state.priceConfidence === item.name,
        () => {
          state.priceConfidence = state.priceConfidence === item.name ? null : item.name;
          state.activeLens = "prices";
          activateLensButton("prices");
          describePricesLoaded();
          update();
        }
      )
    ),
  ];
  els.priceFacets.replaceChildren(...buttons);
}

function renderInsights() {
  if (!els.insightsList) return;
  const insights = state.ontology?.insights || [];
  els.insightsList.replaceChildren(
    ...insights.slice(0, 4).map((insight) => {
      const div = document.createElement("div");
      div.className = "insight-card";
      div.textContent = insight;
      return div;
    })
  );
}

function selectOntologyTerm(term) {
  state.selectedOntologyTerm = term;
  state.selectedOntologyIds = term
    ? new Set((term.recordIds || []).flatMap((id) => (typeof id === "number" || /^\d+$/.test(String(id)) ? [id, `cia:${id}`] : [id])))
    : null;
  if (term) {
    setActivity({
      label: "Ontology Filter",
      title: `${titleCase(term.term)} selected`,
      detail: `${term.count.toLocaleString()} indexed records match this ${categoryLabels[term.category].toLowerCase()} signal; the result strip is filtered to the strongest linked examples.`,
      progress: 1,
    });
  } else if (state.ontology) {
    describeOntologyLoaded(state.ontology);
  }
  update();
}

function filteredMenusWithoutFacet() {
  const current = { ...state.filters };
  const build = (omitted) => {
    const previous = state.filters[omitted];
    state.filters[omitted] = null;
    const menus = filteredMenus();
    state.filters[omitted] = previous;
    return menus;
  };

  const value = {
    decade: build("decade"),
    type: build("type"),
    place: build("place"),
  };
  state.filters = current;
  return value;
}

async function requestChatAnswer(question) {
  const payload = { question, ...askCredentialPayload() };
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
      return response.json();
    }
  } catch (error) {
    // Static hosts may not have a same-origin API route.
  }
  const remoteBase = remoteChatApiBase();
  if (remoteBase) {
    try {
      const response = await fetch(`${remoteBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
        return response.json();
      }
    } catch (error) {
      // Fall through to the committed static index when the remote function is unavailable.
    }
  }
  if (window.MenuGraphArchive?.handle) {
    return window.MenuGraphArchive.handle("/api/chat", { body: payload });
  }
  throw new Error("Chat index is not available");
}

async function askChat(question) {
  const text = compact(question, "");
  if (!text || state.chatBusy) return;
  if (!state.askUnlocked) {
    state.activeLens = "chat";
    activateLensButton("chat");
    state.askError = "Enter the shared secret to use Ask MenuGraph.";
    renderViz();
    return;
  }
  state.activeLens = "chat";
  activateLensButton("chat");
  const startedAt = performance.now();
  state.chatMessages.push({ role: "user", content: text });
  state.chatDraft = "";
  state.chatBusy = true;
  renderViz();
  setActivity({
    label: "Chat Query",
    title: "Searching menu, dish, price, and date indexes",
    detail: "Retrieving candidate records first; the local server can synthesize with Grok when an API key is configured.",
    indeterminate: true,
  });
  try {
    const answer = await requestChatAnswer(text);
    const elapsedMs = Math.round(performance.now() - startedAt);
    state.chatMessages.push({
      role: "assistant",
      content: answer.answer,
      matches: answer.matches || [],
      facets: answer.facets || null,
      analysis: answer.analysis || null,
      chartRecommendation: answer.chartRecommendation || null,
      parsed: answer.parsed || null,
      engine: answer.engine || "local-retrieval",
      model: answer.model,
      error: answer.llmError,
      searched: answer.searched,
      caveats: answer.caveats || [],
      diagnostics: buildChatDiagnostics(text, answer, elapsedMs),
    });
    setActivity({
      label: answer.engine === "grok" ? "Grok Synthesis" : "Static Retrieval",
      title: `${Number(answer.matches?.length || 0).toLocaleString()} candidate records returned`,
      detail: answer.llmError || "Results are grounded in committed MenuGraph snapshots and source-linked records.",
      progress: 1,
    });
  } catch (error) {
    state.chatMessages.push({
      role: "assistant",
      content: error.message,
      matches: [],
      engine: "error",
    });
    setActivity({
      label: "Chat Error",
      title: "Question could not be answered",
      detail: error.message,
      progress: 1,
    });
  } finally {
    state.chatBusy = false;
    if (state.activeLens === "chat") renderViz();
    renderMobileLab();
  }
}

function buildChatDiagnostics(question, answer, elapsedMs) {
  const engine = answer.engine || "local-retrieval";
  const model = answer.model || (engine === "local-retrieval" ? "Static retrieval index" : "Not reported");
  const usage = answer.usage || answer.tokenUsage || null;
  const cost = engine === "local-retrieval" ? "$0.00" : answer.costUsd ? `$${Number(answer.costUsd).toFixed(6)}` : "Not reported";
  return {
    engine,
    model,
    cost,
    elapsedMs,
    usage,
    rawInput: {
      question,
      parsed: answer.parsed || null,
    },
    rawOutput: {
      answer: answer.answer || "",
      localAnswer: answer.localAnswer || null,
      searched: answer.searched || null,
      chartOptions: (answer.chartRecommendation?.options || []).map((option) => ({
        id: option.id,
        chartType: option.chartType,
        rows: option.rows?.length || 0,
      })),
      caveats: answer.caveats || [],
    },
  };
}

function renderChatPanel() {
  const panel = document.createElement("div");
  panel.className = "chat-panel";

  const header = document.createElement("div");
  header.className = "chat-header";
  const title = document.createElement("div");
  title.innerHTML = "<strong>Ask MenuGraph</strong><span>Start with a natural-language question; the browser adapts to prices, places, time, dishes, and source evidence.</span>";
  const status = document.createElement("span");
  status.className = "chat-engine";
  const lastAssistant = [...state.chatMessages].reverse().find((message) => message.role === "assistant");
  status.textContent = state.askUnlocked ? (lastAssistant?.engine === "grok" ? `Grok ${lastAssistant.model || ""}`.trim() : "Static retrieval") : "Locked";
  header.append(title, status);

  if (!state.askUnlocked) {
    panel.append(header, renderAskGate());
    return panel;
  }

  const form = document.createElement("form");
  form.className = "chat-form";
  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = "Ask about dishes, ingredients, prices, places, or date ranges";
  input.autocomplete = "off";
  input.value = state.chatDraft;
  input.addEventListener("input", () => {
    state.chatDraft = input.value;
  });
  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = state.chatBusy ? "Searching" : "Ask";
  button.disabled = state.chatBusy;
  form.append(input, button);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    askChat(input.value);
  });

  const suggestions = document.createElement("div");
  suggestions.className = "chat-suggestions";
  chatSuggestions.slice(0, 4).forEach((suggestion) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = suggestion;
    chip.addEventListener("click", () => askChat(suggestion));
    suggestions.appendChild(chip);
  });

  const messages = document.createElement("div");
  messages.className = "chat-messages";
  if (!state.chatMessages.length) {
    const empty = document.createElement("div");
    empty.className = "chat-empty";
    empty.textContent = "Try a constrained culinary question, then open candidate menus from the result list.";
    messages.appendChild(empty);
  }
  for (const message of state.chatMessages) {
    messages.appendChild(renderChatMessage(message));
  }
  if (state.chatBusy) {
    const busy = document.createElement("div");
    busy.className = "chat-message chat-message--assistant";
    busy.textContent = "Searching the static corpus...";
    messages.appendChild(busy);
  }

  panel.append(header, form, suggestions, messages);
  requestAnimationFrame(() => {
    const latest = messages.querySelector(".chat-message:last-child");
    if (latest) {
      messages.scrollTop = state.chatBusy ? messages.scrollHeight : Math.max(0, latest.offsetTop - messages.offsetTop - 6);
    }
    if (!state.chatMessages.length || document.activeElement === document.body) input.focus({ preventScroll: true });
  });
  return panel;
}

function renderAskGate() {
  const gate = document.createElement("form");
  gate.className = "ask-gate";
  gate.innerHTML = `
    <div>
      <strong>Unlock Ask</strong>
      <span>Ask is a shared workspace entrypoint. Enter the shared secret once per session.</span>
    </div>
  `;
  const row = document.createElement("div");
  row.className = "ask-gate__row";
  const input = document.createElement("input");
  input.type = "password";
  input.autocomplete = "current-password";
  input.placeholder = "Shared secret";
  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Enter";
  row.append(input, button);
  gate.appendChild(row);
  if (state.askError) {
    const error = document.createElement("small");
    error.className = "chat-warning";
    error.textContent = state.askError;
    gate.appendChild(error);
  }
  gate.addEventListener("submit", async (event) => {
    event.preventDefault();
    button.disabled = true;
    button.textContent = "Checking";
    try {
      await unlockAsk(input.value);
      setActivity({
        label: "Ask Unlocked",
        title: "Ask MenuGraph is ready",
        detail: "Questions now search the committed menu, dish, price, place, and date indexes.",
        progress: 1,
      });
    } catch (error) {
      setActivity({
        label: "Ask Locked",
        title: "Shared secret required",
        detail: error.message,
        progress: 1,
      });
    } finally {
      renderViz();
    }
  });
  requestAnimationFrame(() => input.focus({ preventScroll: true }));
  return gate;
}

function renderChatMessage(message) {
  const wrapper = document.createElement("div");
  wrapper.className = `chat-message chat-message--${message.role}`;
  const body = document.createElement("div");
  body.className = "chat-message__body";
  body.textContent = message.role === "assistant" && message.matches?.length ? String(message.content || "").split("\n\n")[0] : message.content;
  wrapper.appendChild(body);

  if (message.role === "assistant" && message.diagnostics) {
    wrapper.appendChild(renderChatDiagnostics(message.diagnostics));
  }

  if (message.error) {
    const warning = document.createElement("small");
    warning.className = "chat-warning";
    warning.textContent = message.error;
    wrapper.appendChild(warning);
  }

  if (message.role === "assistant" && message.matches?.length) {
    const workspace = document.createElement("div");
    workspace.className = "chat-discovery-workspace";
    const main = document.createElement("div");
    main.className = "chat-discovery-main";
    const rail = document.createElement("aside");
    rail.className = "chat-discovery-rail";

    rail.appendChild(renderChatOverview(message));
    if (message.chartRecommendation) main.appendChild(renderChartRecommendation(message.chartRecommendation));
    if (message.analysis) rail.appendChild(renderAdaptiveBrowser(message.analysis));
    const results = document.createElement("div");
    results.className = "chat-results";
    message.matches.slice(0, 36).forEach((match) => results.appendChild(renderChatResult(match)));
    main.appendChild(results);
    workspace.append(main, rail);
    wrapper.appendChild(workspace);
  }
  return wrapper;
}

function renderChatDiagnostics(diagnostics) {
  const details = document.createElement("details");
  details.className = "chat-diagnostics";
  const summary = document.createElement("summary");
  const elapsed = Number.isFinite(Number(diagnostics.elapsedMs)) ? `${(diagnostics.elapsedMs / 1000).toFixed(1)}s` : "n/a";
  summary.innerHTML = `
    <span>Query details</span>
    <strong>${diagnostics.engine}</strong>
    <strong>${diagnostics.model}</strong>
    <strong>${diagnostics.cost}</strong>
    <strong>${elapsed}</strong>
  `;
  details.appendChild(summary);

  const grid = document.createElement("div");
  grid.className = "chat-diagnostics__grid";
  [
    ["Engine", diagnostics.engine],
    ["Model", diagnostics.model],
    ["Cost", diagnostics.cost],
    ["Latency", elapsed],
    ["Usage", diagnostics.usage ? JSON.stringify(diagnostics.usage) : "Not reported"],
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    item.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    grid.appendChild(item);
  });
  details.appendChild(grid);

  const raw = document.createElement("div");
  raw.className = "chat-diagnostics__raw";
  raw.appendChild(renderRawDiagnosticBlock("Raw input", diagnostics.rawInput));
  raw.appendChild(renderRawDiagnosticBlock("Raw output", diagnostics.rawOutput));
  details.appendChild(raw);
  return details;
}

function renderRawDiagnosticBlock(label, value) {
  const block = document.createElement("div");
  const title = document.createElement("span");
  title.textContent = label;
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(value, null, 2);
  block.append(title, pre);
  return block;
}

function chatDecade(match) {
  const year = Number(match.year);
  return Number.isFinite(year) ? `${Math.floor(year / 10) * 10}s` : "Undated";
}

function applyChatResultFilter(wrapper, kind, value) {
  const activeKind = wrapper.dataset.filterKind;
  const activeValue = wrapper.dataset.filterValue;
  const nextActive = activeKind === kind && activeValue === value ? null : { kind, value };
  if (nextActive) {
    wrapper.dataset.filterKind = nextActive.kind;
    wrapper.dataset.filterValue = nextActive.value;
  } else {
    delete wrapper.dataset.filterKind;
    delete wrapper.dataset.filterValue;
  }
  let visible = 0;
  wrapper.querySelectorAll(".chat-result").forEach((result) => {
    const show = !nextActive || result.dataset[nextActive.kind] === nextActive.value;
    result.hidden = !show;
    if (show) visible += 1;
  });
  wrapper.querySelectorAll(".chat-facet-button, .chat-facet-option").forEach((button) => {
    button.classList.toggle("active", Boolean(nextActive && button.dataset.kind === nextActive.kind && button.dataset.value === nextActive.value));
  });
  const label = wrapper.querySelector(".chat-result-count");
  if (label) label.textContent = nextActive ? `${visible} shown` : `${wrapper.querySelectorAll(".chat-result").length} shown`;
  const activeLabel = wrapper.querySelector(".chat-active-filter");
  if (activeLabel) activeLabel.textContent = nextActive ? `${nextActive.value}` : "All results";
}

function renderChatOverview(message) {
  const overview = document.createElement("div");
  overview.className = "chat-overview";

  const head = document.createElement("div");
  head.className = "chat-refine-head";
  const stats = document.createElement("strong");
  const span = message.facets?.yearMin && message.facets?.yearMax ? `${message.facets.yearMin}-${message.facets.yearMax}` : "mixed dates";
  const duplicates = Number(message.searched?.duplicateCandidates || 0);
  const parts = [
    `${message.matches.length.toLocaleString()} diversified results`,
    span,
    duplicates ? `${duplicates.toLocaleString()} near-duplicates collapsed` : "",
  ].filter(Boolean);
  stats.textContent = parts.join(" / ");
  const active = document.createElement("span");
  active.className = "chat-active-filter";
  active.textContent = "All results";
  const count = document.createElement("span");
  count.className = "chat-result-count";
  count.textContent = `${message.matches.length} shown`;
  head.append(stats, active, count);
  overview.appendChild(head);

  const nav = document.createElement("div");
  nav.className = "chat-refine-nav";

  const timeline = message.facets?.timeline || [];
  if (timeline.length) {
    nav.appendChild(renderChatFacetMenu("Dates", "decade", timeline, overview));
  }

  const places = message.facets?.places || [];
  if (places.length) {
    nav.appendChild(renderChatFacetMenu("Locations", "placeKey", places.slice(0, 10), overview));
  }

  const sources = message.facets?.sources || [];
  if (sources.length) {
    nav.appendChild(renderChatFacetMenu("Sources", "sourceKey", sources.slice(0, 6), overview));
  }

  if (nav.childElementCount) overview.appendChild(nav);
  return overview;
}

function renderChatFacetMenu(label, kind, items, overview) {
  const menu = document.createElement("details");
  const orderedItems = orderChatFacetItems(kind, items).slice(0, kind === "decade" ? 16 : 10);
  menu.className = `chat-facet-menu chat-facet-menu--${kind}`;
  const summary = document.createElement("summary");
  summary.className = "chat-facet-summary";
  summary.appendChild(renderChatFacetDistribution(orderedItems));
  const total = orderedItems.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const labelNode = document.createElement("span");
  labelNode.className = "chat-facet-summary__label";
  labelNode.textContent = label;
  const detail = document.createElement("span");
  detail.className = "chat-facet-summary__detail";
  detail.textContent = chatFacetSummaryDetail(kind, orderedItems);
  const count = document.createElement("strong");
  count.textContent = total.toLocaleString();
  summary.append(labelNode, detail, count);
  menu.appendChild(summary);

  const list = document.createElement("div");
  list.className = "chat-facet-menu__list";
  orderedItems.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chat-facet-option";
    button.dataset.kind = kind;
    button.dataset.value = item.name;
    button.innerHTML = `<span>${item.name}</span><strong>${Number(item.count || 0).toLocaleString()}</strong>`;
    button.addEventListener("click", () => {
      applyChatResultFilter(overview.closest(".chat-message"), kind, item.name);
      menu.open = false;
    });
    list.appendChild(button);
  });
  menu.appendChild(list);
  return menu;
}

function decadeSortValue(name) {
  if (name === "Undated") return Number.MAX_SAFE_INTEGER;
  const year = Number(String(name || "").match(/\d{4}/)?.[0]);
  return Number.isFinite(year) ? year : Number.MAX_SAFE_INTEGER - 1;
}

function orderChatFacetItems(kind, items) {
  const rows = [...(items || [])];
  if (kind === "decade") return rows.sort((a, b) => decadeSortValue(a.name) - decadeSortValue(b.name));
  return rows.sort((a, b) => Number(b.count || 0) - Number(a.count || 0) || String(a.name || "").localeCompare(String(b.name || "")));
}

function chatFacetSummaryDetail(kind, items) {
  if (!items.length) return "";
  if (kind === "decade") {
    const dated = items.map((item) => item.name).filter((name) => name !== "Undated");
    return dated.length ? `${dated[0].replace("s", "")}-${dated[dated.length - 1].replace("s", "")}` : "Undated";
  }
  const top = items[0];
  return top?.name ? String(top.name).slice(0, 22) : "";
}

function renderChatFacetDistribution(items) {
  const distribution = document.createElement("span");
  distribution.className = "chat-facet-summary__dist";
  const max = Math.max(...(items || []).map((item) => Number(item.count || 0)), 1);
  (items || []).slice(0, 16).forEach((item) => {
    const bar = document.createElement("i");
    bar.style.setProperty("--bar", `${Math.max(4, (Number(item.count || 0) / max) * 22)}px`);
    bar.title = `${item.name}: ${Number(item.count || 0).toLocaleString()}`;
    distribution.appendChild(bar);
  });
  return distribution;
}

function renderChartRecommendation(recommendation) {
  const panel = document.createElement("div");
  panel.className = "chat-chart-recommendation";
  const options = recommendation.options || [];
  let activeId = recommendation.defaultOptionId || options[0]?.id || "";
  let activePriceMetric = null;

  const heading = document.createElement("div");
  heading.className = "chat-chart-recommendation__heading";
  const title = document.createElement("strong");
  title.textContent = "Recommended visualization";
  heading.append(title);

  const toggleRow = document.createElement("div");
  toggleRow.className = "chat-chart-toggle";
  const chartSlot = document.createElement("div");
  chartSlot.className = "chat-chart-slot";

  function draw() {
    const option = options.find((item) => item.id === activeId) || options[0];
    toggleRow.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.optionId === option?.id);
    });
    if (option) {
      const metrics = priceMetricsForRows(option.rows || []);
      if (metrics.length && !metrics.some((metric) => metric.key === activePriceMetric)) activePriceMetric = option.spec?.y || metrics[0].key;
      chartSlot.replaceChildren(renderComparisonChart(option, activePriceMetric, (metric) => {
        activePriceMetric = metric;
        draw();
      }));
    } else {
      chartSlot.replaceChildren(document.createTextNode(""));
    }
  }

  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.optionId = option.id;
    button.textContent = option.label;
    button.addEventListener("click", () => {
      activeId = option.id;
      draw();
    });
    toggleRow.appendChild(button);
  });

  panel.append(heading, toggleRow, chartSlot);
  draw();
  return panel;
}

function formatChartValue(value, key) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "n/a";
  if (/relative/i.test(key)) return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (/price|usd|raw/i.test(key)) return `$${number.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return number.toLocaleString();
}

function priceMetricsForRows(rows) {
  const metrics = [
    { key: "medianTodayUsd", label: "Today USD" },
    { key: "medianRaw", label: "Raw" },
    { key: "medianRelative", label: "Relative" },
  ];
  return metrics.filter((metric) => rows.some((row) => Number.isFinite(Number(row[metric.key]))));
}

function chartValueKey(option, activePriceMetric) {
  const yKey = option.spec?.y || "count";
  if (yKey === "count") return "count";
  const metrics = priceMetricsForRows(option.rows || []);
  return metrics.some((metric) => metric.key === activePriceMetric) ? activePriceMetric : yKey;
}

function chartFilterKind(option, row) {
  if (option.id === "timeline" || option.id === "matrix") return "decade";
  return row.filterKind || "placeKey";
}

function chartFilterValue(option, row) {
  if (option.id === "timeline") return row.label;
  if (option.id === "matrix") return row.series;
  return row.filterValue || row.label;
}

function handleChartRowClick(node, option, row) {
  node.addEventListener("click", () => {
    if (row.menuUid) {
      selectMenu(row.menuUid);
      return;
    }
    const wrapper = node.closest(".chat-message");
    if (wrapper) applyChatResultFilter(wrapper, chartFilterKind(option, row), chartFilterValue(option, row));
  });
}

function renderComparisonChart(option, activePriceMetric, onPriceMetricChange) {
  const wrap = document.createElement("div");
  wrap.className = `chat-chart chat-chart--${option.chartType || "bar"}`;
  const metrics = priceMetricsForRows(option.rows || []);
  if (metrics.length) {
    const metricRow = document.createElement("div");
    metricRow.className = "chat-price-lens-toggle";
    metrics.forEach((metric) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = metric.label;
      button.classList.toggle("active", metric.key === chartValueKey(option, activePriceMetric));
      button.addEventListener("click", () => onPriceMetricChange(metric.key));
      metricRow.appendChild(button);
    });
    wrap.appendChild(metricRow);
  }
  const reason = document.createElement("p");
  reason.className = "chat-chart__reason";
  reason.textContent = option.reason || "";
  wrap.appendChild(reason);

  const rows = option.rows || [];
  if (!rows.length) return wrap;
  if (option.chartType === "table") {
    wrap.appendChild(renderComparisonTable(option, rows, activePriceMetric));
    return wrap;
  }
  if (option.chartType === "heatmap") {
    wrap.appendChild(renderComparisonMatrix(option, rows, activePriceMetric));
    return wrap;
  }
  wrap.appendChild(renderComparisonBars(option, rows, activePriceMetric));
  return wrap;
}

function renderComparisonBars(option, rows, activePriceMetric) {
  const chart = document.createElement("div");
  chart.className = "chat-chart-bars";
  const yKey = chartValueKey(option, activePriceMetric);
  const max = Math.max(...rows.map((row) => Number(row[yKey] || 0)), 1);
  rows.forEach((row) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chat-chart-bar";
    button.style.setProperty("--bar", `${Math.max(4, (Number(row[yKey] || 0) / max) * 100)}%`);
    const label = document.createElement("span");
    label.textContent = row.label;
    const value = document.createElement("strong");
    value.textContent = formatChartValue(row[yKey], yKey);
    button.append(label, value);
    handleChartRowClick(button, option, row);
    chart.appendChild(button);
  });
  return chart;
}

function renderComparisonMatrix(option, rows, activePriceMetric) {
  const chart = document.createElement("div");
  chart.className = "chat-chart-matrix";
  const yKey = chartValueKey(option, activePriceMetric);
  const max = Math.max(...rows.map((row) => Number(row[yKey] || 0)), 1);
  rows.forEach((row) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chat-chart-cell";
    button.style.setProperty("--heat", String(Math.max(0.12, Number(row[yKey] || 0) / max)));
    const label = document.createElement("span");
    label.textContent = `${row.label} / ${row.series}`;
    const value = document.createElement("strong");
    value.textContent = formatChartValue(row[yKey], yKey);
    button.append(label, value);
    handleChartRowClick(button, option, row);
    chart.appendChild(button);
  });
  return chart;
}

function renderComparisonTable(option, rows, activePriceMetric) {
  const table = document.createElement("div");
  table.className = "chat-chart-table";
  const yKey = chartValueKey(option, activePriceMetric);
  rows.forEach((row) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chat-chart-table-row";
    const label = document.createElement("strong");
    label.textContent = row.label;
    const meta = document.createElement("span");
    const price = yKey !== "count" && row[yKey] ? formatChartValue(row[yKey], yKey) : "";
    meta.textContent = [row.series, price, row.evidence?.[0]].filter(Boolean).join(" / ");
    button.append(label, meta);
    handleChartRowClick(button, option, row);
    table.appendChild(button);
  });
  return table;
}

function renderAdaptiveBrowser(analysis) {
  const browser = document.createElement("div");
  browser.className = "chat-data-browser";
  const heading = document.createElement("div");
  heading.className = "chat-data-browser__heading";
  const title = document.createElement("strong");
  title.textContent = analysis.title || "Adaptive Data Browser";
  const note = document.createElement("span");
  note.textContent = analysis.subtitle || "Breakdowns are computed from the retrieved evidence rows.";
  heading.append(title, note);
  browser.appendChild(heading);

  if (analysis.summary?.length) {
    const summary = document.createElement("div");
    summary.className = "chat-data-browser__summary";
    analysis.summary.slice(0, 4).forEach((item) => {
      const card = document.createElement("div");
      card.className = "chat-summary-card";
      card.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
      summary.appendChild(card);
    });
    browser.appendChild(summary);
  }

  const sections = [
    ["Types", analysis.types],
    ["Regions", analysis.regions],
    ["Timeline", analysis.timeline],
  ].filter(([, rows]) => rows?.length);

  sections.forEach(([label, rows]) => {
    const section = document.createElement("section");
    section.className = "chat-data-section";
    const sectionTitle = document.createElement("h3");
    sectionTitle.textContent = label;
    section.appendChild(sectionTitle);
    const max = Math.max(...rows.map((row) => row.count || 0), 1);
    rows.slice(0, 12).forEach((row) => {
      const item = document.createElement("div");
      item.className = "chat-data-row";
      item.style.setProperty("--bar", `${Math.max(6, ((row.count || 0) / max) * 100)}%`);
      const metric = [row.count ? `${row.count} rows` : "", row.medianTodayUsd ? `$${row.medianTodayUsd} today` : "", row.medianRaw ? `$${row.medianRaw} raw` : ""]
        .filter(Boolean)
        .join(" / ");
      item.innerHTML = `<span>${row.label}</span><strong>${metric}</strong>`;
      section.appendChild(item);
    });
    browser.appendChild(section);
  });

  if (analysis.warning) {
    const warning = document.createElement("small");
    warning.className = "chat-warning";
    warning.textContent = analysis.warning;
    browser.appendChild(warning);
  }
  return browser;
}

function renderChatResult(match) {
  const button = document.createElement("button");
  button.className = "chat-result";
  button.type = "button";
  button.dataset.decade = chatDecade(match);
  button.dataset.placeKey = match.place || "Unknown";
  button.dataset.sourceKey = match.source || "Source";
  const title = document.createElement("strong");
  title.textContent = match.item || match.snippet || match.title;
  const meta = document.createElement("span");
  meta.textContent = [match.title, match.year || match.date, match.place, match.source].filter(Boolean).join(" / ");
  const reason = document.createElement("small");
  const price = match.price?.rawPrice ? ` / ${match.price.rawPrice} ${match.price.currency || ""}` : "";
  const duplicate = Number(match.duplicateCount || 0) > 1 ? `collapsed ${match.duplicateCount}` : "";
  reason.textContent = [...(match.reasons || []).slice(0, 4), duplicate, price].filter(Boolean).join(", ");
  button.append(title, meta, reason);
  button.addEventListener("click", () => {
    if (match.uid) selectMenu(match.uid);
  });
  return button;
}

function svgEl(name, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

function renderViz() {
  document.body.dataset.activeLens = state.activeLens;
  document.body.classList.toggle("chat-expanded", state.activeLens === "chat" && state.chatMessages.length > 0);
  if (els.canvasPanel) els.canvasPanel.dataset.lens = state.activeLens;
  if (state.activeLens === "chat") {
    removeTooltip();
    lensCopy();
    els.viz.replaceChildren(renderChatPanel());
    return;
  }
  const rect = els.viz.getBoundingClientRect();
  const width = Math.max(rect.width, 320);
  const height = Math.max(rect.height, 360);
  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, role: "presentation" });
  els.viz.replaceChildren(svg);
  removeTooltip();

  const lenses = {
    time: renderTimeLens,
    place: renderBarLens,
    type: renderTypeLens,
    lineage: renderLineageLens,
    ontology: renderOntologyLens,
    prices: renderPriceLens,
  };
  lenses[state.activeLens](svg, width, height);
}

function lensCopy() {
  const copies = {
    time: ["Time Lens", "Menus Across Time"],
    place: ["Place Lens", "Where Dining Records Cluster"],
    type: ["Type Lens", "Formats, Courses, and Occasions"],
    lineage: ["Lineage Lens", "Collectors and Collection Memory"],
    ontology: ["Food Lens", `${categoryLabels[state.ontologyCategory]} Across Time`],
    prices: ["Price Lens", priceLensTitle()],
    chat: ["Ask Lens", "Ask Across The MenuGraph"],
  };
  const [label, title] = copies[state.activeLens];
  els.lensLabel.textContent = label;
  els.resultTitle.textContent = title;
}

function priceLensTitle() {
  const prefix = state.selectedOntologyTerm?.term ? `${titleCase(state.selectedOntologyTerm.term)} ` : "";
  if (state.priceMode === "raw") return `${prefix}Historical Menu Prices`;
  if (state.priceMode === "relative") return `${prefix}Relative Local Value`;
  return `${prefix}Prices Indexed To Today`;
}

function colorFor(value) {
  let hash = 0;
  for (const char of String(value || "")) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return palette[hash % palette.length];
}

function renderTimeLens(svg, width, height) {
  lensCopy();
  const menus = state.visibleMenus;
  const pad = { top: 42, right: 28, bottom: 56, left: 76 };
  const minYear = state.filters.minYear;
  const maxYear = state.filters.maxYear;
  const plotted = menus
    .map((menu) => {
      const estimate = dateEstimateFor(menu);
      const estimated = !menu.year && isPlottableDateEstimate(estimate);
      return {
        menu,
        year: menu.year || (state.includeEstimatedDates && estimated ? estimate.estimatedCenterYear : null),
        estimated,
        estimate,
      };
    })
    .filter((item) => item.year);
  const rowDefs = [
    { key: "a-la-carte", label: "A la carte", terms: ["a la carte", "ala carte", "à la carte"] },
    { key: "set", label: "Set", terms: ["set menu", "set menus", "table d'hote", "table d’hote", "prix fixe"] },
    { key: "drinks", label: "Drink lists", terms: ["drink", "beverage", "cocktail", "liquor", "bar menu"] },
    { key: "wine", label: "Wine lists", terms: ["wine"] },
  ];
  const otherRow = { key: "other", label: "Other", terms: [] };
  const rowFor = (menu) => {
    const text = (menu.types || []).join(" | ").toLowerCase();
    return rowDefs.find((row) => row.terms.some((term) => text.includes(term))) || otherRow;
  };
  const rowCounts = new Map();
  plotted.forEach(({ menu }) => {
    const row = rowFor(menu);
    rowCounts.set(row.key, (rowCounts.get(row.key) || 0) + 1);
  });
  const rows = [...rowDefs, otherRow].filter((row) => rowCounts.has(row.key));
  if (!rows.length) rows.push(otherRow);
  const rowIndex = new Map(rows.map((row, index) => [row.key, index]));
  const availableH = Math.max(180, height - pad.top - pad.bottom);
  const rowH = Math.min(76, Math.max(42, availableH / rows.length));
  const plotH = Math.min(availableH, rowH * rows.length);
  const axisY = pad.top + plotH;
  const x = (year) => pad.left + ((year - minYear) / Math.max(maxYear - minYear, 1)) * (width - pad.left - pad.right);
  const y = (row) => pad.top + (rowIndex.get(row.key) + 0.5) * rowH;

  for (let i = 0; i <= 5; i++) {
    const year = Math.round(minYear + ((maxYear - minYear) * i) / 5);
    const gx = x(year);
    svg.appendChild(svgEl("line", { x1: gx, y1: pad.top, x2: gx, y2: axisY, class: "grid-line" }));
    const text = svgEl("text", { x: gx, y: Math.min(height - 22, axisY + 30), "text-anchor": "middle", class: "axis-label" });
    text.textContent = year;
    svg.appendChild(text);
  }

  rows.forEach((row) => {
    const yy = y(row);
    svg.appendChild(svgEl("line", { x1: pad.left, y1: yy, x2: width - pad.right, y2: yy, class: "grid-line" }));
    const text = svgEl("text", { x: 16, y: yy + 4, class: "axis-label" });
    text.textContent = row.label;
    svg.appendChild(text);
  });

  const jitter = new Map();
  const sample = [...plotted.filter((item) => !item.estimated).slice(0, 1400), ...plotted.filter((item) => item.estimated).slice(0, 400)];
  sample.forEach(({ menu, year, estimated }) => {
    const row = rowFor(menu);
    const key = `${year}-${row.key}`;
    const offset = (jitter.get(key) || 0) + 1;
    jitter.set(key, offset);
    const jitterSlots = Math.max(5, Math.min(13, Math.floor(rowH / 5)));
    const jitterStep = Math.min(3.4, Math.max(2.2, rowH / (jitterSlots + 4)));
    const dot = svgEl("circle", {
      cx: x(year),
      cy: y(row) + ((offset % jitterSlots) - Math.floor(jitterSlots / 2)) * jitterStep,
      r: state.selectedId === menuKey(menu) ? 7 : 4.6,
      fill: colorFor(menu.sourceKey || menu.country || row.key),
      opacity: estimated ? 0.58 : 0.9,
      class: estimated ? "menu-dot estimate-dot" : "menu-dot",
      tabindex: 0,
    });
    bindMenuNode(dot, menu);
    svg.appendChild(dot);
  });

  const counts = menus.reduce(
    (acc, menu) => {
      const estimate = dateEstimateFor(menu);
      if (menu.year) acc.source += 1;
      else if (isPlottableDateEstimate(estimate)) acc.estimated += 1;
      else if (estimate?.confidence === "X" || estimate?.confidence === "D") acc.review += 1;
      else acc.undated += 1;
      return acc;
    },
    { source: 0, estimated: 0, undated: 0, review: 0 }
  );
  drawUnknownBadge(svg, counts, width, height);
}

function drawUnknownBadge(svg, counts, width, height) {
  const count = Number(counts.undated || 0);
  const estimated = Number(counts.estimated || 0);
  const review = Number(counts.review || 0);
  if (!count && !estimated && !review) return;
  const group = svgEl("g");
  const boxWidth = Math.min(width - 32, 330);
  group.appendChild(svgEl("rect", { x: width - boxWidth - 24, y: 16, width: boxWidth, height: 34, rx: 7, fill: "rgba(47,58,63,0.08)" }));
  const text = svgEl("text", { x: width - boxWidth / 2 - 24, y: 38, "text-anchor": "middle", class: "axis-label" });
  text.textContent = `${count.toLocaleString()} undated / ${estimated.toLocaleString()} estimated / ${review.toLocaleString()} review`;
  group.appendChild(text);
  svg.appendChild(group);
}

function renderBarLens(svg, width, height) {
  lensCopy();
  const counts = uniqueCount(state.visibleMenus, (menu) => [menu.city, menu.state, menu.country]).slice(0, 22);
  renderBars(svg, width, height, counts, "place");
}

function renderTypeLens(svg, width, height) {
  lensCopy();
  const counts = uniqueCount(state.visibleMenus, (menu) => menu.types).slice(0, 22);
  renderBars(svg, width, height, counts, "type");
}

function renderLineageLens(svg, width, height) {
  lensCopy();
  const counts = uniqueCount(state.visibleMenus, (menu) => menu.sourceLabel || menu.donor || sourceFamily(menu.source)).slice(0, 22);
  renderBars(svg, width, height, counts, "lineage");
}

function renderOntologyLens(svg, width, height) {
  lensCopy();
  const terms = state.ontology?.categories?.[state.ontologyCategory] || [];
  if (!terms.length) {
    const text = svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", class: "axis-label" });
    text.textContent = "Ontology loading";
    svg.appendChild(text);
    return;
  }

  const topTerms = terms.slice(0, 14);
  const decadeSet = new Set();
  topTerms.forEach((term) => {
    Object.keys(term.decades || {}).forEach((decade) => decadeSet.add(decade));
  });
  const decades = [...decadeSet].sort((a, b) => decadeSortValue(a) - decadeSortValue(b)).slice(0, 12);
  const pad = { top: 42, right: 28, bottom: 44, left: 176 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const cellW = plotW / Math.max(decades.length, 1);
  const rowH = plotH / Math.max(topTerms.length, 1);
  const max = Math.max(
    ...topTerms.flatMap((term) => Object.values(term.decades || {}).map(Number)),
    1
  );

  decades.forEach((decade, index) => {
    const x = pad.left + index * cellW + cellW / 2;
    const text = svgEl("text", { x, y: height - 18, "text-anchor": "middle", class: "axis-label" });
    text.textContent = decade.replace("s", "");
    svg.appendChild(text);
    svg.appendChild(svgEl("line", { x1: x, y1: pad.top - 8, x2: x, y2: height - pad.bottom, class: "grid-line" }));
  });

  topTerms.forEach((term, row) => {
    const y = pad.top + row * rowH;
    const label = svgEl("text", { x: pad.left - 10, y: y + rowH / 2 + 4, "text-anchor": "end", class: "axis-label" });
    label.textContent = titleCase(term.term).slice(0, 24);
    label.style.cursor = "pointer";
    label.addEventListener("click", () => selectOntologyTerm(term));
    svg.appendChild(label);

    decades.forEach((decade, col) => {
      const value = Number(term.decades?.[decade] || 0);
      const opacity = value ? 0.18 + (value / max) * 0.78 : 0.04;
      const rect = svgEl("rect", {
        x: pad.left + col * cellW + 2,
        y: y + 3,
        width: Math.max(cellW - 4, 2),
        height: Math.max(rowH - 6, 2),
        rx: 5,
        fill: colorFor(term.term),
        opacity,
        class: "bar",
      });
      rect.addEventListener("click", () => selectOntologyTerm(term));
      rect.addEventListener("mousemove", (event) => {
        showTooltip(event, `<strong>${titleCase(term.term)}</strong>${value.toLocaleString()} ${decade} records`);
      });
      rect.addEventListener("mouseleave", removeTooltip);
      svg.appendChild(rect);
    });
  });
}

function valueForPriceRecord(record) {
  if (state.priceMode === "raw") return Number(record.amount) || null;
  if (state.priceMode === "relative") return record.normalized?.relativeIndex || null;
  return record.normalized?.todayUsd || null;
}

function priceValueLabel(record) {
  if (state.priceMode === "raw") return `${record.rawPrice} ${record.currency}`;
  if (state.priceMode === "relative" && record.normalized?.localToday && !record.normalized?.todayUsd) {
    return `${record.currency} ${formatNumber(record.normalized.localToday)} local CPI index`;
  }
  if (record.normalized?.todayUsd) {
    return `${formatMoney(record.normalized.todayLow)}-${formatMoney(record.normalized.todayHigh)} today USD`;
  }
  return "Not safely indexed";
}

function formatRecordAmount(record) {
  const amount = Number(record.amount);
  if (!Number.isFinite(amount)) return "";
  return record.currency === "USD" ? formatMoney(amount) : `${record.currency} ${formatNumber(amount)}`;
}

function priceScaleLabel(record) {
  const interpretedAmount = formatRecordAmount(record);
  const interpreted = interpretedAmount ? ` as ${interpretedAmount}` : "";
  if (record.scale === "inferred-cents") return `${record.rawPrice} interpreted${interpreted}; inferred cents`;
  if (record.scale === "explicit-cents") return `${record.rawPrice} interpreted${interpreted}; explicit cents`;
  if (record.scale === "decimal-dollars") return `${record.rawPrice} read${interpreted}; bare decimal`;
  if (record.scale === "explicit-currency") return `${record.rawPrice} read${interpreted}; explicit currency`;
  return record.scaleReason || "Scale not inferred";
}

function priceRecordMenuUid(record) {
  if (record.menuUid) return record.menuUid;
  if (record.sourceKey === "nypl") return String(record.menuId || "");
  return `cia:${record.menuId}`;
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "...";
  return `$${number.toLocaleString(undefined, { maximumFractionDigits: number >= 100 ? 0 : 2 })}`;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "...";
  return number.toLocaleString(undefined, { maximumFractionDigits: number >= 100 ? 0 : 2 });
}

function renderPriceLens(svg, width, height) {
  lensCopy();
  const records = priceRecordsForVisibleMenus();
  if (!state.prices) {
    const text = svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", class: "axis-label" });
    text.textContent = "Price data loading";
    svg.appendChild(text);
    return;
  }
  if (!records.length) {
    const text = svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", class: "axis-label" });
    text.textContent = "No safely indexed prices in this view";
    svg.appendChild(text);
    return;
  }

  const pad = { top: 44, right: 38, bottom: 58, left: 72 };
  const minYear = Math.min(...records.map((record) => record.year).filter(Boolean), state.filters.minYear);
  const maxYear = Math.max(...records.map((record) => record.year).filter(Boolean), state.filters.maxYear);
  const values = records.map(valueForPriceRecord).filter((value) => value !== null && value > 0);
  const minValue = Math.max(Math.min(...values), 0.01);
  const maxValue = Math.max(...values);
  const logMin = Math.log10(minValue);
  const logMax = Math.log10(maxValue || minValue + 1);
  const x = (year) => pad.left + ((year - minYear) / Math.max(maxYear - minYear, 1)) * (width - pad.left - pad.right);
  const y = (value) => {
    const log = Math.log10(Math.max(value, minValue));
    return height - pad.bottom - ((log - logMin) / Math.max(logMax - logMin, 0.001)) * (height - pad.top - pad.bottom);
  };

  for (let i = 0; i <= 5; i++) {
    const year = Math.round(minYear + ((maxYear - minYear) * i) / 5);
    const gx = x(year);
    svg.appendChild(svgEl("line", { x1: gx, y1: pad.top, x2: gx, y2: height - pad.bottom, class: "grid-line" }));
    const text = svgEl("text", { x: gx, y: height - 22, "text-anchor": "middle", class: "axis-label" });
    text.textContent = year;
    svg.appendChild(text);
  }

  const ticks = [minValue, Math.sqrt(minValue * maxValue), maxValue].filter((value, index, arr) => index === 0 || Math.abs(value - arr[index - 1]) > 0.01);
  ticks.forEach((value) => {
    const yy = y(value);
    svg.appendChild(svgEl("line", { x1: pad.left, y1: yy, x2: width - pad.right, y2: yy, class: "grid-line" }));
    const label = svgEl("text", { x: 16, y: yy + 4, class: "axis-label" });
    label.textContent =
      state.priceMode === "raw" ? value.toFixed(value >= 10 ? 0 : 2) : state.priceMode === "relative" ? formatNumber(value) : formatMoney(value);
    svg.appendChild(label);
  });

  records.slice(0, 1800).forEach((record, index) => {
    const value = valueForPriceRecord(record);
    if (!value || !record.year) return;
    const dot = svgEl("circle", {
      cx: x(record.year),
      cy: y(value) + ((index % 9) - 4) * 1.8,
      r: record.confidence === "high" ? 5.6 : record.confidence === "medium" ? 4.8 : 4,
      fill: colorFor(record.currency),
      opacity: record.confidence === "low" ? 0.58 : 0.88,
      class: "price-dot",
      tabindex: 0,
    });
    dot.addEventListener("click", () => selectMenu(priceRecordMenuUid(record)));
    dot.addEventListener("keyup", (event) => {
      if (event.key === "Enter") selectMenu(priceRecordMenuUid(record));
    });
    dot.addEventListener("mousemove", (event) => {
      const context = record.context?.[0]?.label ? `<br><em>${record.context[0].label}: ${record.context[0].note}</em>` : "";
      showTooltip(
        event,
        `<strong>${titleCase(record.item)}</strong>${record.rawPrice} in ${record.year} (${record.currency})<br>${priceScaleLabel(record)}<br>${priceValueLabel(record)}<br>${record.confidence} confidence - ${record.normalized?.method || "raw"}${context}`
      );
    });
    dot.addEventListener("mouseleave", removeTooltip);
    svg.appendChild(dot);
  });

  const note = svgEl("text", { x: width - pad.right, y: pad.top - 16, "text-anchor": "end", class: "price-note" });
  note.textContent = `${records.length.toLocaleString()} observations; low confidence hidden until selected`;
  svg.appendChild(note);
}

function decadeSortValue(decade) {
  const match = String(decade || "").match(/\d{4}/);
  return match ? Number(match[0]) : 9999;
}

function sourceFamily(source) {
  const match = String(source || "").match(/Menu Collection;\s*([^;]+)/i);
  return match ? match[1].trim() : "Unspecified source";
}

function renderBars(svg, width, height, counts, facetKind) {
  const pad = { top: 30, right: 36, bottom: 30, left: 180 };
  const max = Math.max(...counts.map((item) => item.count), 1);
  const rowH = Math.min(31, (height - pad.top - pad.bottom) / Math.max(counts.length, 1));

  counts.forEach((item, index) => {
    const y = pad.top + index * rowH;
    const barWidth = ((width - pad.left - pad.right) * item.count) / max;
    const group = svgEl("g", { class: "bar", tabindex: 0 });
    group.appendChild(svgEl("rect", { x: pad.left, y: y + 4, width: width - pad.left - pad.right, height: rowH - 8, rx: 5, class: "bar-bg" }));
    group.appendChild(svgEl("rect", { x: pad.left, y: y + 4, width: barWidth, height: rowH - 8, rx: 5, fill: colorFor(item.name) }));
    const label = svgEl("text", { x: pad.left - 10, y: y + rowH / 2 + 4, "text-anchor": "end", class: "axis-label" });
    label.textContent = titleCase(item.name).slice(0, 24);
    group.appendChild(label);
    const count = svgEl("text", { x: pad.left + barWidth + 8, y: y + rowH / 2 + 4, class: "axis-label" });
    count.textContent = item.count.toLocaleString();
    group.appendChild(count);
    group.addEventListener("click", () => applyBarFilter(facetKind, item.name));
    group.addEventListener("mousemove", (event) => showTooltip(event, `<strong>${titleCase(item.name)}</strong>${item.count.toLocaleString()} records`));
    group.addEventListener("mouseleave", removeTooltip);
    svg.appendChild(group);
  });
}

function applyBarFilter(kind, value) {
  const normalized = value.toLowerCase();
  if (kind === "type") state.filters.type = state.filters.type === normalized ? null : normalized;
  if (kind === "place") state.filters.place = state.filters.place === normalized ? null : normalized;
  if (kind === "lineage") state.filters.search = state.filters.search === normalized ? "" : value;
  els.searchInput.value = state.filters.search;
  update();
}

function bindMenuNode(node, menu) {
  node.addEventListener("click", () => selectMenu(menuKey(menu)));
  node.addEventListener("keyup", (event) => {
    if (event.key === "Enter") selectMenu(menuKey(menu));
  });
  node.addEventListener("mousemove", (event) => {
    const where = [menu.city, menu.state, menu.country].filter(Boolean).join(", ");
    const estimate = dateEstimateFor(menu);
    const estimateLine = !menu.year && estimate ? `<br><em>${estimateEvidenceLabel(estimate)} (${estimate.confidence})</em>` : "";
    showTooltip(
      event,
      `<strong>${menu.title}</strong>${displayDateLabel(menu)} ${where ? `- ${titleCase(where)}` : ""}${estimateLine}`
    );
  });
  node.addEventListener("mouseleave", removeTooltip);
}

function showTooltip(event, html) {
  let tooltip = document.querySelector(".tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    els.viz.appendChild(tooltip);
  }
  const rect = els.viz.getBoundingClientRect();
  tooltip.innerHTML = html;
  tooltip.style.left = `${event.clientX - rect.left}px`;
  tooltip.style.top = `${event.clientY - rect.top}px`;
}

function removeTooltip() {
  document.querySelector(".tooltip")?.remove();
}

function isMobileLayout() {
  return window.matchMedia("(max-width: 759px)").matches;
}

function setFilterDrawerOpen(open) {
  state.filterDrawerOpen = Boolean(open);
  document.body.classList.toggle("filter-drawer-open", state.filterDrawerOpen);
  els.filterToggle?.setAttribute("aria-expanded", String(state.filterDrawerOpen));
  els.filterPanel?.setAttribute("aria-hidden", String(isMobileLayout() && !state.filterDrawerOpen));
  if (els.filterBackdrop) els.filterBackdrop.hidden = !state.filterDrawerOpen;
}

function syncResponsiveState() {
  if (!isMobileLayout() && state.filterDrawerOpen) {
    setFilterDrawerOpen(false);
  } else if (els.filterPanel) {
    els.filterPanel.setAttribute("aria-hidden", String(isMobileLayout() && !state.filterDrawerOpen));
  }
}

function scrollDetailIntoViewOnMobile() {
  if (!isMobileLayout() || !els.detailPanel) return;
  requestAnimationFrame(() => els.detailPanel.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function renderResults() {
  const menus = state.visibleMenus.slice(0, 80);
  els.resultsCount.textContent = state.visibleMenus.length.toLocaleString();
  els.resultsLabel.textContent = state.selectedOntologyTerm
    ? titleCase(state.selectedOntologyTerm.term)
    : state.filters.search
      ? "Filtered Records"
      : "Records";
  els.resultList.replaceChildren(
    ...menus.map((menu) => {
      const button = document.createElement("button");
      button.className = "result-item";
      button.type = "button";
      button.innerHTML = `
        <img alt="" loading="lazy" />
        <span>
          <strong>${menu.title}</strong>
          <span>${sourceLabel(menu)} / ${displayDateLabel(menu)} ${compact(menu.city || menu.country, "")}</span>
        </span>
      `;
      setImageSource(button.querySelector("img"), menu.imageUrl, menu.title);
      button.addEventListener("click", () => selectMenu(menuKey(menu)));
      return button;
    })
  );
}

async function selectMenu(id) {
  state.selectedId = String(id);
  renderViz();
  const summary = state.allMenus.find((menu) => menuKey(menu) === state.selectedId || String(menu.id) === state.selectedId) || state.visibleMenus.find((menu) => menuKey(menu) === state.selectedId);
  renderDetailSkeleton(summary);
  scrollDetailIntoViewOnMobile();
  try {
    const detail = state.detailCache.get(state.selectedId) || (await getJson(`/api/item/${encodeURIComponent(state.selectedId)}`));
    state.detailCache.set(state.selectedId, detail);
    renderDetail(detail, summary);
    const matches = await getJson(`/api/matches/${encodeURIComponent(state.selectedId)}`).catch(() => ({ matches: [] }));
    renderEvidence(matches.matches || [], summary, detail);
  } catch (error) {
    els.detailText.textContent = error.message;
  }
}

function renderDetailSkeleton(menu) {
  els.detailEmpty.classList.add("hidden");
  els.detailCard.classList.remove("hidden");
  els.detailImage.alt = menu?.title || "Selected menu";
  setImageSource(els.detailImage, detailImageSource(menu?.imageUrl, menu?.sourceKey || "cia"), menu?.title);
  configureDetailImageZoom(detailImageSource(menu?.imageUrl, menu?.sourceKey || "cia"), menu?.title, menu?.sourceKey || "cia");
  els.detailKicker.textContent = [displayDateLabel(menu), compact(menu?.country, "")].filter(Boolean).join(" / ");
  els.detailTitle.textContent = menu?.title || "Loading menu";
  els.detailMeta.replaceChildren();
  els.detailText.textContent = "Loading full record...";
  els.detailLink.href = menu?.itemUrl || "#";
  els.detailLink.textContent = `Open in ${sourceCollectionLabel(menu?.sourceKey || "cia")}`;
  els.pageStrip.replaceChildren();
  if (els.detailEvidence) {
    els.detailEvidence.classList.add("hidden");
    els.detailEvidence.replaceChildren();
  }
}

function renderDetail(detail, menu) {
  els.detailImage.alt = detail.title;
  setImageSource(els.detailImage, detailImageSource(detail.imageUrl, detail.sourceKey || menu?.sourceKey || "cia"), detail.title || menu?.title);
  configureDetailImageZoom(zoomableImageSource(detail.imageUrl, detail.sourceKey || menu?.sourceKey || "cia"), detail.title || menu?.title, detail.sourceKey || menu?.sourceKey || "cia");
  els.detailTitle.textContent = detail.title || menu?.title || "Menu";
  const estimate = dateEstimateFor(menu);
  const sourceDate = fieldValue(detail, "date") || menu?.date || "";
  els.detailKicker.textContent = [sourceDate || displayDateLabel(menu), fieldValue(detail, "countr") || menu?.country]
    .filter(Boolean)
    .join(" / ");
  els.detailLink.href = detail.sourceUrl;
  els.detailLink.textContent = `Open in ${sourceCollectionLabel(detail.sourceKey || menu?.sourceKey || "cia")}`;

  const rows = [
    ["Corpus", fieldValue(detail, "sourceLabel") || menu?.sourceLabel],
    ["Source Date", compact(sourceDate, "Undated")],
    ["Estimated Date", estimate ? `${formatEstimateRange(estimate)} (${estimate.confidence})` : ""],
    ["Date Evidence", estimateEvidenceLabel(estimate)],
    ["Restaurant", fieldValue(detail, "restau") || menu?.restaurant],
    ["Type", fieldValue(detail, "typea") || menu?.types?.join(", ")],
    ["Place", [fieldValue(detail, "locati") || menu?.city, fieldValue(detail, "state") || menu?.state, fieldValue(detail, "countr") || menu?.country].filter(Boolean).join(", ")],
    ["Source", fieldValue(detail, "source") || menu?.source],
    ["Donor", fieldValue(detail, "donor") || menu?.donor],
    ["Rights", fieldValue(detail, "rights") || menu?.rights],
    ["Matches", menu?.matchCount ? `${menu.matchCount} cross-source candidate${menu.matchCount === 1 ? "" : "s"}` : ""],
  ].filter(([, value]) => compact(value, ""));

  els.detailMeta.replaceChildren(
    ...rows.flatMap(([label, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      return [dt, dd];
    })
  );

  els.detailText.textContent = detail.text || "No transcript text available for this page.";
  renderPageStrip(detail);
}

function configureDetailImageZoom(src, title, sourceKey) {
  const imageSrc = src || "";
  els.detailImage.dataset.zoomSrc = imageSrc;
  els.detailImage.dataset.zoomTitle = title || "Menu image";
  els.detailImage.dataset.zoomSource = sourceKey || "";
  const canZoom = Boolean(imageSrc && !imageSrc.startsWith("data:image/svg+xml"));
  els.detailImage.classList.toggle("zoomable", canZoom);
  if (els.detailImageZoom) {
    els.detailImageZoom.hidden = !canZoom;
    els.detailImageZoom.disabled = !canZoom;
    els.detailImageZoom.onclick = canZoom ? () => openImageZoomer(imageSrc, title || "Menu image") : null;
  }
}

els.detailImage?.addEventListener("click", () => {
  if (!els.detailImage.classList.contains("zoomable")) return;
  openImageZoomer(els.detailImage.dataset.zoomSrc || els.detailImage.src, els.detailImage.dataset.zoomTitle || els.detailImage.alt);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") document.querySelector(".image-zoomer")?.remove();
});

function openImageZoomer(src, title) {
  if (!src) return;
  document.querySelector(".image-zoomer")?.remove();
  let scale = 1;
  let x = 0;
  let y = 0;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  const overlay = document.createElement("div");
  overlay.className = "image-zoomer";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Menu image zoom viewer");
  overlay.innerHTML = `
    <div class="image-zoomer__bar">
      <strong>${title || "Menu image"}</strong>
      <div>
        <button type="button" data-action="out" aria-label="Zoom out">-</button>
        <button type="button" data-action="reset" aria-label="Reset zoom">100%</button>
        <button type="button" data-action="in" aria-label="Zoom in">+</button>
        <button type="button" data-action="close" aria-label="Close image viewer">Close</button>
      </div>
    </div>
    <div class="image-zoomer__stage">
      <img alt="${title || "Menu image"}" />
    </div>
  `;
  const stage = overlay.querySelector(".image-zoomer__stage");
  const img = overlay.querySelector("img");
  img.src = src;

  function applyTransform() {
    img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  function setScale(nextScale) {
    scale = clamp(nextScale, 0.6, 5);
    if (scale === 1) {
      x = 0;
      y = 0;
    }
    applyTransform();
  }

  overlay.addEventListener("click", (event) => {
    const action = event.target?.dataset?.action;
    if (!action) {
      if (event.target === overlay) overlay.remove();
      return;
    }
    if (action === "close") overlay.remove();
    if (action === "reset") setScale(1);
    if (action === "in") setScale(scale * 1.25);
    if (action === "out") setScale(scale / 1.25);
  });

  stage.addEventListener("wheel", (event) => {
    event.preventDefault();
    setScale(scale * (event.deltaY < 0 ? 1.12 : 0.88));
  }, { passive: false });

  stage.addEventListener("pointerdown", (event) => {
    dragging = true;
    stage.setPointerCapture(event.pointerId);
    startX = event.clientX;
    startY = event.clientY;
    originX = x;
    originY = y;
    stage.classList.add("dragging");
  });

  stage.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    x = originX + event.clientX - startX;
    y = originY + event.clientY - startY;
    applyTransform();
  });

  stage.addEventListener("pointerup", (event) => {
    dragging = false;
    stage.releasePointerCapture(event.pointerId);
    stage.classList.remove("dragging");
  });

  stage.addEventListener("pointercancel", () => {
    dragging = false;
    stage.classList.remove("dragging");
  });

  document.body.appendChild(overlay);
  overlay.querySelector("[data-action='close']").focus({ preventScroll: true });
  applyTransform();
}

function fieldValue(detail, key) {
  return detail.fields?.[key]?.value || "";
}

function renderPageStrip(detail) {
  const pages = detail.pages || [];
  els.pageStrip.replaceChildren(
    ...pages.map((page) => {
      const img = document.createElement("img");
      img.className = `page-thumb${page.id === detail.id ? " active" : ""}`;
      img.alt = page.title;
      img.loading = "lazy";
      setImageSource(img, page.imageUrl, page.title);
      img.addEventListener("click", () => selectMenu(detail.sourceKey === "cia" ? `cia:${page.id}` : page.id));
      return img;
    })
  );
}

function renderEvidence(matches, menu) {
  if (!els.detailEvidence) return;
  els.detailEvidence.replaceChildren();
  const estimate = dateEstimateFor(menu);
  if (!matches.length && !estimate) {
    els.detailEvidence.classList.add("hidden");
    return;
  }
  els.detailEvidence.classList.remove("hidden");
  const title = document.createElement("strong");
  title.textContent = "Evidence";
  els.detailEvidence.appendChild(title);
  if (estimate) {
    const dateNote = document.createElement("div");
    dateNote.className = "evidence-item";
    dateNote.innerHTML = `
      <span>
        <b>Date estimate ${estimate.confidence}</b>
        <em>${formatEstimateRange(estimate)}</em>
      </span>
      <span>${(estimate.methods || []).join(", ")}</span>
      <small>${(estimate.evidence || []).slice(0, 3).map((item) => `${item.source}: ${item.effect}`).join("; ")}</small>
    `;
    els.detailEvidence.appendChild(dateNote);
  }
  if (matches.length) {
    const crossTitle = document.createElement("strong");
    crossTitle.textContent = "Cross-source matches";
    els.detailEvidence.appendChild(crossTitle);
  }
  for (const match of matches.slice(0, 3)) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "evidence-item";
    item.innerHTML = `
      <span>
        <b>${sourceLabel(match)} ${Math.round(match.score || 0)}</b>
        <em>${compact(match.date, "Undated")} / ${compact(match.city || match.country, "")}</em>
      </span>
      <span>${match.title}</span>
      <small>${(match.evidence || []).slice(0, 2).join("; ")}</small>
    `;
    item.addEventListener("click", () => selectMenu(match.uid));
    els.detailEvidence.appendChild(item);
  }
  if (!menu?.year) {
    const suggestion = matches.find((match) => match.suggestedDate);
    if (suggestion?.suggestedDate) {
      const note = document.createElement("p");
      note.textContent = `Suggested date evidence: ${suggestion.suggestedDate.decade || suggestion.suggestedDate.year} at ${suggestion.suggestedDate.confidence}% confidence.`;
      els.detailEvidence.appendChild(note);
    }
  }
}

async function runArchiveSearch() {
  const term = els.searchInput.value.trim();
  state.filters.search = term;
  if (!term) {
    await loadMenus(false);
    return;
  }
  els.recordCount.textContent = "Searching OCR transcripts...";
  setActivity({
    label: "Archive Search",
    title: `Searching ${els.fieldSelect.options[els.fieldSelect.selectedIndex].text}`,
    detail: `Sending "${term}" to CONTENTdm and returning up to 600 matching records for visualization.`,
    indeterminate: true,
  });
  els.viz.innerHTML = '<div class="loading">Asking CONTENTdm for transcript matches...</div>';
  const payload = await getJson(`/api/search?term=${encodeURIComponent(term)}&field=${els.fieldSelect.value}&limit=600`);
  state.allMenus = payload.menus;
  state.archiveMode = true;
  const loadedMatches = payload.menus.length;
  els.recordCount.textContent =
    payload.remote === false
      ? `${payload.total.toLocaleString()} static metadata matches`
      : payload.total > loadedMatches
        ? `${loadedMatches.toLocaleString()} of ${payload.total.toLocaleString()} archive matches`
        : `${payload.total.toLocaleString()} archive matches`;
  state.filters.search = "";
  state.filters.decade = null;
  state.filters.type = null;
  state.filters.place = null;
  setActivity({
    label: payload.remote === false ? "Static Search" : "Search Complete",
    title: `${loadedMatches.toLocaleString()} records loaded from ${payload.total.toLocaleString()} archive matches`,
    detail:
      payload.remote === false
        ? "GitHub Pages searched the committed metadata snapshot. Live transcript search is available when a proxy/server can reach CONTENTdm."
        : "Local filters now operate on this search result set; clear filters to return to the full collection.",
    progress: 1,
  });
  update();
}

function updateOntologyStatus(job = state.ontology?.job) {
  if (job?.active) {
    els.ontologyStatus.textContent = `${job.indexed}/${job.total || "..."}`;
    describeOntologyJob(job);
    return;
  }
  const transcriptRecords = Number(state.ontology?.transcriptRecords || 0);
  els.ontologyStatus.textContent = transcriptRecords ? `${transcriptRecords} text` : "metadata";
}

function configureOntologyBuildButton() {
  if (!els.ontologyBuild) return;
  if (isLocalHost()) {
    els.ontologyBuild.disabled = false;
    els.ontologyBuild.textContent = "Rebuild Index";
    els.ontologyBuild.title = "Rebuild the transcript ontology through the local Node server.";
    return;
  }
  els.ontologyBuild.disabled = true;
  els.ontologyBuild.textContent = "Published Index";
  els.ontologyBuild.title = "The transcript index is generated during data sync and published as static JSON.";
}

async function buildOntologyTextIndex() {
  if (!isLocalHost()) {
    configureOntologyBuildButton();
    setActivity({
      label: "Published Index",
      title: "Using committed transcript index",
      detail: "Public deployments read the generated ontology snapshot; transcript crawling is handled by the build workflow.",
      progress: 1,
    });
    return;
  }
  els.ontologyBuild.disabled = true;
  els.ontologyBuild.textContent = "Indexing...";
  const status = await fetchJsonDirect("/api/ontology/build?limit=300");
  updateOntologyStatus(status);
  startOntologyPolling(true);
}

function startOntologyPolling(useDirectServer = false) {
  clearInterval(state.ontologyPoll);
  state.ontologyPoll = setInterval(async () => {
    const next = useDirectServer ? await fetchJsonDirect("/api/ontology/status") : await getJson("/api/ontology/status");
    updateOntologyStatus(next);
    if (!next.active) {
      clearInterval(state.ontologyPoll);
      state.ontologyPoll = null;
      els.ontologyBuild.disabled = false;
      configureOntologyBuildButton();
      if (useDirectServer) {
        const ontology = await fetchJsonDirect("/api/ontology");
        state.ontology = ontology;
        updateOntologyStatus(ontology.job);
        renderOntologyControls();
        renderInsights();
        describeOntologyLoaded(ontology);
        if (state.activeLens === "ontology") renderViz();
      } else {
        await loadOntology();
      }
    }
  }, 1500);
}

function setActivity({ label, title, detail, progress = 0, indeterminate = false }) {
  if (!els.activityPanel) return;
  els.activityPanel.dataset.indeterminate = indeterminate ? "true" : "false";
  els.activityLabel.textContent = label;
  els.activityTitle.textContent = title;
  els.activityDetail.textContent = detail;
  const percent = indeterminate ? 0 : Math.round(clamp(progress, 0, 1) * 100);
  els.activityProgress.style.width = `${percent}%`;
  els.activityProgressText.textContent = indeterminate ? "Working" : `${percent}%`;
}

function setupMobileLab() {
  const params = new URLSearchParams(window.location.search);
  state.mobileLab.enabled = params.get("mobileLab") === "1";
  if (!state.mobileLab.enabled) return;
  const requestedVariant = params.get("mobileVariant") || "hybrid";
  state.mobileLab.variant = MOBILE_LAB_VARIANTS.has(requestedVariant) ? requestedVariant : "hybrid";
  state.mobileLab.mode = MOBILE_LAB_MODE_BY_VARIANT[state.mobileLab.variant] || "discover";
  document.body.classList.add("mobile-lab");
  document.body.dataset.mobileVariant = state.mobileLab.variant;
  mobileLabRoot();
  renderMobileLab();
}

function mobileLabRoot() {
  let root = document.querySelector("#mobile-lab-root");
  if (!root) {
    root = document.createElement("section");
    root.id = "mobile-lab-root";
    root.className = "mobile-lab-root";
    root.setAttribute("aria-label", "MenuGraph mobile lab");
    document.body.appendChild(root);
  }
  root.dataset.variant = state.mobileLab.variant;
  root.dataset.mode = state.mobileLab.mode;
  return root;
}

function mobileEl(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function mobileLabHref(variant) {
  const params = new URLSearchParams(window.location.search);
  params.set("mobileLab", "1");
  params.set("mobileVariant", variant);
  return `${window.location.pathname}?${params.toString()}`;
}

function setMobileLabMode(mode) {
  state.mobileLab.mode = mode;
  renderMobileLab();
}

function mobileLabMenus() {
  return (state.visibleMenus.length ? state.visibleMenus : state.allMenus).filter(Boolean);
}

function mobileFindMenuById(id) {
  const key = String(id || "");
  return (
    state.allMenus.find((menu) => menuKey(menu) === key || String(menu.id) === key) ||
    state.visibleMenus.find((menu) => menuKey(menu) === key || String(menu.id) === key) ||
    null
  );
}

function mobileFeaturedMenus(limit = 24) {
  return [...mobileLabMenus()]
    .sort((a, b) => mobileMenuScore(b) - mobileMenuScore(a) || String(a.title || "").localeCompare(String(b.title || "")))
    .slice(0, limit);
}

function mobileMenuScore(menu) {
  return (
    (menu?.imageUrl ? 6 : 0) +
    Math.min(Number(menu?.topDishes?.length || 0), 8) +
    Math.min(Number(menu?.priceCount || 0), 8) +
    Math.min(Number(menu?.matchCount || 0), 5) +
    (effectiveYear(menu) ? 2 : 0)
  );
}

function mobilePlaceLabel(menu) {
  return [menu?.city, menu?.state, menu?.country].filter(Boolean).join(", ") || "Place unknown";
}

function mobileDateConfidence(menu) {
  if (menu?.date) return menu.dateConfidence && menu.dateConfidence !== "unknown" ? menu.dateConfidence : "source date";
  const estimate = dateEstimateFor(menu);
  if (estimate) return `${estimate.confidence} estimate`;
  return "date unknown";
}

function mobileProvenanceParts(menu) {
  return [sourceLabel(menu), displayDateLabel(menu), mobilePlaceLabel(menu), mobileDateConfidence(menu)].filter(Boolean);
}

function renderMobileLab() {
  if (!state.mobileLab.enabled) return;
  const root = mobileLabRoot();
  root.replaceChildren();

  const screen = mobileEl("div", "mobile-lab-screen");
  screen.append(renderMobileLabHeader(), renderMobileLabContext(), renderMobileLabView());
  root.append(screen, renderMobileEvidenceTray(), renderMobileBottomNav());
  if (state.mobileLab.detailOpen) {
    root.append(renderMobileDetailBackdrop(), renderMobileDetailSheet());
  }
}

function renderMobileLabHeader() {
  const header = mobileEl("header", "mobile-lab-header");
  const copy = mobileEl("div", "mobile-lab-header__copy");
  const eyebrow = mobileEl("p", "mobile-lab-eyebrow", "Mobile Lab");
  const title = mobileEl("h1", "", "MenuGraph");
  const subtitle = mobileEl("span", "", "Pocket culinary time machine");
  copy.append(eyebrow, title, subtitle);

  const variants = mobileEl("nav", "mobile-variant-switcher");
  variants.setAttribute("aria-label", "Mobile lab variants");
  ["hybrid", "cards", "journey", "chat", "recipe"].forEach((variant) => {
    const link = mobileEl("a", "mobile-variant-chip", titleCase(variant));
    link.href = mobileLabHref(variant);
    link.setAttribute("aria-current", state.mobileLab.variant === variant ? "page" : "false");
    variants.appendChild(link);
  });

  header.append(copy, variants);
  return header;
}

function renderMobileLabContext() {
  const bar = mobileEl("div", "mobile-context-bar");
  const menus = mobileLabMenus();
  const datedYears = menus.map(effectiveYear).filter((year) => Number.isFinite(Number(year)));
  const sourceText = state.filters.source === "all" ? "All sources" : state.filters.source === "matched" ? "Matched records" : state.filters.source.toUpperCase();
  const chips = [
    `${menus.length.toLocaleString()} visible`,
    sourceText,
    datedYears.length ? `${Math.min(...datedYears)}-${Math.max(...datedYears)}` : "dates mixed",
    state.selectedOntologyTerm?.term ? titleCase(state.selectedOntologyTerm.term) : "",
    state.mobileLab.trayIds.length ? `${state.mobileLab.trayIds.length} in tray` : "",
  ].filter(Boolean);
  chips.forEach((chip) => bar.appendChild(mobileEl("span", "mobile-context-chip", chip)));
  if (state.filters.search || state.filters.decade || state.filters.type || state.filters.place || state.selectedOntologyTerm) {
    const clear = mobileEl("button", "mobile-context-clear", "Clear");
    clear.type = "button";
    clear.addEventListener("click", () => {
      state.filters.search = "";
      state.filters.decade = null;
      state.filters.type = null;
      state.filters.place = null;
      state.selectedOntologyTerm = null;
      state.selectedOntologyIds = null;
      els.searchInput.value = "";
      update();
    });
    bar.appendChild(clear);
  }
  return bar;
}

function renderMobileLabView() {
  const view = mobileEl("main", `mobile-lab-view mobile-lab-view--${state.mobileLab.mode}`);
  if (!state.allMenus.length) {
    const loading = mobileEl("div", "mobile-lab-loading");
    loading.append(mobileEl("strong", "", "Loading archive"));
    loading.append(mobileEl("span", "", "Preparing mobile experiment surfaces from static MenuGraph data."));
    view.appendChild(loading);
    return view;
  }
  const renderers = {
    discover: renderMobileDiscover,
    data: renderMobileData,
    menus: renderMobileMenus,
    ask: renderMobileAsk,
    inspire: renderMobileInspire,
  };
  view.appendChild((renderers[state.mobileLab.mode] || renderMobileDiscover)());
  return view;
}

function renderMobileCommandForm(compactMode = false) {
  const form = mobileEl("form", compactMode ? "mobile-command mobile-command--compact" : "mobile-command");
  const input = document.createElement("input");
  input.type = "search";
  input.value = state.mobileLab.command;
  input.placeholder = compactMode ? "Search menus, places, dishes..." : "lobster boston 1900 / ask oysters / inspire dinner";
  input.setAttribute("aria-label", "Mobile lab command");
  input.addEventListener("input", () => {
    state.mobileLab.command = input.value;
  });
  const button = mobileEl("button", "", compactMode ? "Go" : "Explore");
  button.type = "submit";
  form.append(input, button);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handleMobileCommand(input.value);
  });
  return form;
}

function handleMobileCommand(value) {
  const text = compact(value, "");
  state.mobileLab.command = text;
  if (!text) return;
  const normalized = text.toLowerCase();
  if (/\b(ask|why|how|compare|what)\b/.test(normalized)) {
    state.chatDraft = text.replace(/^ask\s+/i, "");
    state.mobileLab.mode = "ask";
    renderMobileLab();
    return;
  }
  if (/\b(inspire|cook|recipe|dinner|menu)\b/.test(normalized)) {
    state.filters.search = text.replace(/\b(inspire|cook|recipe|dinner|menu)\b/gi, "").trim();
    els.searchInput.value = state.filters.search;
    state.mobileLab.mode = "inspire";
    update();
    return;
  }
  if (/\b(price|prices|cost|costs|value)\b/.test(normalized)) {
    state.filters.search = text.replace(/\b(show|price|prices|cost|costs|value)\b/gi, "").trim();
    els.searchInput.value = state.filters.search;
    state.activeLens = "prices";
    activateLensButton("prices");
    state.mobileLab.mode = "data";
    update();
    return;
  }
  state.filters.search = text;
  els.searchInput.value = text;
  state.mobileLab.mode = "menus";
  update();
}

function renderMobileDiscover() {
  const wrap = mobileEl("section", "mobile-discover");
  const hero = mobileEl("div", "mobile-hero");
  const title = mobileEl("h2", "", "Start with a craving, a city, a decade, or a price mystery.");
  const stats = mobileEl("p", "", mobileCorpusLine());
  hero.append(title, stats, renderMobileCommandForm(false));

  const actions = mobileEl("div", "mobile-primary-actions");
  [
    ["Surprise me", () => openMobileLabDetail(randomMobileMenu())],
    ["Price shockers", () => activateMobileLabLens("prices")],
    ["Cook from evidence", () => setMobileLabMode("inspire")],
  ].forEach(([label, action]) => {
    const button = mobileEl("button", "", label);
    button.type = "button";
    button.addEventListener("click", action);
    actions.appendChild(button);
  });
  hero.appendChild(actions);
  wrap.appendChild(hero);

  const sparks = mobileEl("section", "mobile-section");
  sparks.appendChild(renderMobileSectionHeader("Archive sparks", "Fast routes into evidence, not generated facts."));
  const grid = mobileEl("div", "mobile-story-grid");
  mobileStoryCards().forEach((card) => grid.appendChild(renderMobileStoryCard(card)));
  sparks.appendChild(grid);
  wrap.appendChild(sparks);

  const preview = mobileEl("section", "mobile-section");
  preview.appendChild(renderMobileSectionHeader("Image-led finds", "Tap a card for a bottom-sheet inspection."));
  const rail = mobileEl("div", "mobile-card-rail");
  mobileFeaturedMenus(8).forEach((menu) => rail.appendChild(renderMobileMenuCard(menu, true)));
  preview.appendChild(rail);
  wrap.appendChild(preview);
  return wrap;
}

function mobileCorpusLine() {
  const menus = state.allMenus;
  const sources = uniqueCount(menus, (menu) => sourceLabel(menu))
    .slice(0, 2)
    .map((item) => `${item.name} ${item.count.toLocaleString()}`)
    .join(" / ");
  const years = menus.map(effectiveYear).filter((year) => Number.isFinite(Number(year)));
  const span = years.length ? `${Math.min(...years)}-${Math.max(...years)}` : "mixed dates";
  return `${menus.length.toLocaleString()} menus / ${sources || "source mix"} / ${span}`;
}

function randomMobileMenu() {
  const menus = mobileFeaturedMenus(80);
  return menus[Math.floor(Math.random() * Math.max(menus.length, 1))] || state.allMenus[0];
}

function mobileStoryCards() {
  const term = state.ontology?.categories?.ingredients?.[0] || state.ontology?.categories?.dishes?.[0];
  const priceCount = Number(state.prices?.summary?.total || 0);
  const matched = state.allMenus.filter((menu) => Number(menu.matchCount || 0)).length;
  return [
    {
      kicker: "Story mode",
      title: "What counted as luxury?",
      body: priceCount ? `${priceCount.toLocaleString()} extracted price observations can be browsed without treating fuzzy OCR as exact.` : "Use the price lens once the static price index loads.",
      actionLabel: "Open prices",
      action: () => activateMobileLabLens("prices"),
    },
    {
      kicker: "Food graph",
      title: term ? `Follow ${titleCase(term.term)}` : "Follow an ingredient trail",
      body: term ? `${Number(term.count || 0).toLocaleString()} indexed records carry this term across menus, decades, and sources.` : "Ontology terms become tappable trails as the food index loads.",
      actionLabel: "Open food",
      action: () => {
        if (term) selectOntologyTerm(term);
        activateMobileLabLens("ontology");
      },
    },
    {
      kicker: "Archive twins",
      title: "Compare cross-source echoes",
      body: matched ? `${matched.toLocaleString()} menus have candidate cross-source matches with caveats carried into detail sheets.` : "Matched menus will surface here when source relationships are available.",
      actionLabel: "Matched menus",
      action: () => {
        state.filters.source = "matched";
        state.mobileLab.mode = "menus";
        update();
      },
    },
  ];
}

function renderMobileStoryCard(card) {
  const item = mobileEl("article", "mobile-story-card");
  item.append(mobileEl("span", "mobile-kicker", card.kicker), mobileEl("h3", "", card.title), mobileEl("p", "", card.body));
  const button = mobileEl("button", "", card.actionLabel);
  button.type = "button";
  button.addEventListener("click", card.action);
  item.appendChild(button);
  return item;
}

function renderMobileData() {
  const wrap = mobileEl("section", "mobile-data");
  wrap.appendChild(renderMobileSectionHeader("Data lenses", "Swipe-sized summaries that can become filters or deeper views."));
  const grid = mobileEl("div", "mobile-lens-grid");
  [
    {
      lens: "time",
      title: "Time",
      body: "Decades and uncertain dates stay visible.",
      rows: uniqueCount(mobileLabMenus(), (menu) => effectiveDecade(menu)).slice(0, 8),
    },
    {
      lens: "place",
      title: "Place",
      body: "Cities, states, and countries are entry points.",
      rows: uniqueCount(mobileLabMenus(), (menu) => [menu.city, menu.state, menu.country]).slice(0, 8),
    },
    {
      lens: "ontology",
      title: "Food",
      body: "Ingredients and dishes act like knowledge-graph handles.",
      rows: (state.ontology?.categories?.[state.ontologyCategory] || []).slice(0, 8).map((term) => ({ name: titleCase(term.term), count: term.count })),
    },
    {
      lens: "prices",
      title: "Prices",
      body: "Indexed observations carry scale and confidence caveats.",
      rows: mobilePriceSummaryRows(),
    },
  ].forEach((card) => grid.appendChild(renderMobileLensCard(card)));
  wrap.appendChild(grid);
  return wrap;
}

function mobilePriceSummaryRows() {
  const records = priceRecordsForVisibleMenus();
  if (!records.length) return [{ name: "No indexed prices in view", count: 0 }];
  return uniqueCount(records, (record) => record.currency || "currency").slice(0, 8);
}

function renderMobileLensCard(card) {
  const item = mobileEl("article", "mobile-lens-card");
  item.dataset.mobileLens = card.lens;
  const head = mobileEl("div", "mobile-lens-card__head");
  head.append(mobileEl("span", "mobile-kicker", "Lens"), mobileEl("h3", "", card.title));
  const body = mobileEl("p", "", card.body);
  const bars = mobileEl("div", "mobile-mini-bars");
  const max = Math.max(...card.rows.map((row) => Number(row.count || 0)), 1);
  card.rows.forEach((row) => {
    const button = mobileEl("button", "", "");
    button.type = "button";
    button.style.setProperty("--bar", `${Math.max(6, (Number(row.count || 0) / max) * 100)}%`);
    const label = mobileEl("span", "", row.name || row.term || "Unknown");
    const count = mobileEl("strong", "", Number(row.count || 0).toLocaleString());
    button.append(label, count);
    button.addEventListener("click", () => {
      if (card.lens === "place") {
        state.filters.place = String(row.name || "").toLowerCase();
        state.mobileLab.mode = "menus";
        update();
      } else {
        activateMobileLabLens(card.lens);
      }
    });
    bars.appendChild(button);
  });
  const open = mobileEl("button", "mobile-lens-open", `Open ${card.title}`);
  open.type = "button";
  open.addEventListener("click", () => activateMobileLabLens(card.lens));
  item.append(head, body, bars, open);
  return item;
}

function activateMobileLabLens(lens) {
  state.activeLens = lens;
  activateLensButton(lens);
  renderViz();
  state.mobileLab.mode = "data";
  if (lens === "prices") describePricesLoaded();
  if (lens === "ontology" && state.ontology) describeOntologyLoaded(state.ontology);
  renderMobileLab();
}

function renderMobileMenus() {
  const wrap = mobileEl("section", "mobile-menus");
  wrap.append(renderMobileSectionHeader("Menu cards", "Image, provenance, evidence actions, then detail sheet."), renderMobileCommandForm(true));
  const deck = mobileEl("div", "mobile-menu-deck");
  mobileFeaturedMenus(28).forEach((menu) => deck.appendChild(renderMobileMenuCard(menu, false)));
  wrap.appendChild(deck);
  return wrap;
}

function renderMobileMenuCard(menu, compactCard = false) {
  const card = mobileEl("article", compactCard ? "mobile-menu-card mobile-menu-card--compact" : "mobile-menu-card");
  card.tabIndex = 0;
  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a")) return;
    openMobileLabDetail(menu);
  });
  card.addEventListener("keyup", (event) => {
    if (event.key === "Enter") openMobileLabDetail(menu);
  });

  const img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  setImageSource(img, menu.imageUrl, menu.title);
  const body = mobileEl("div", "mobile-menu-card__body");
  body.append(mobileEl("h3", "", menu.title || "Untitled menu"), renderMobileProvenance(menu));
  const dishes = (menu.topDishes || []).slice(0, compactCard ? 2 : 4);
  if (dishes.length) {
    const dishRow = mobileEl("div", "mobile-term-row");
    dishes.forEach((dish) => dishRow.appendChild(mobileEl("span", "", dish)));
    body.appendChild(dishRow);
  }
  const actions = mobileEl("div", "mobile-card-actions");
  const open = mobileEl("button", "", "Open");
  open.type = "button";
  open.addEventListener("click", () => openMobileLabDetail(menu));
  const tray = mobileEl("button", "", mobileTrayHas(menu) ? "Saved" : "Tray");
  tray.type = "button";
  tray.addEventListener("click", () => toggleMobileTray(menu));
  actions.append(open, tray);
  body.appendChild(actions);
  card.append(img, body);
  return card;
}

function renderMobileProvenance(menu) {
  const list = mobileEl("div", "mobile-provenance");
  mobileProvenanceParts(menu).forEach((part) => list.appendChild(mobileEl("span", "", part)));
  return list;
}

function renderMobileAsk() {
  const wrap = mobileEl("section", "mobile-lab-ask");
  wrap.appendChild(renderMobileSectionHeader("Ask", "First-class chat stays locked until the shared secret is provided."));
  if (!state.askUnlocked) {
    wrap.appendChild(renderMobileAskGate());
    return wrap;
  }

  const form = mobileEl("form", "mobile-ask-form chat-form");
  const input = document.createElement("input");
  input.type = "search";
  input.value = state.chatDraft;
  input.placeholder = "Ask about current filters, evidence, prices, places...";
  input.addEventListener("input", () => {
    state.chatDraft = input.value;
  });
  const button = mobileEl("button", "", state.chatBusy ? "Searching" : "Ask");
  button.type = "submit";
  button.disabled = state.chatBusy;
  form.append(input, button);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    askChat(input.value);
  });
  wrap.appendChild(form);

  const suggestions = mobileEl("div", "mobile-suggestion-row");
  mobileAskSuggestions().forEach((suggestion) => {
    const chip = mobileEl("button", "", suggestion);
    chip.type = "button";
    chip.addEventListener("click", () => askChat(suggestion));
    suggestions.appendChild(chip);
  });
  wrap.appendChild(suggestions);

  const messages = mobileEl("div", "mobile-chat-stack chat-messages");
  if (!state.chatMessages.length) messages.appendChild(mobileEl("div", "chat-empty", "Ask can reference visible filters, selected evidence, and price rows after unlock."));
  state.chatMessages.forEach((message) => messages.appendChild(renderChatMessage(message)));
  if (state.chatBusy) messages.appendChild(mobileEl("div", "chat-message chat-message--assistant", "Searching the static corpus..."));
  wrap.appendChild(messages);
  return wrap;
}

function renderMobileAskGate() {
  const gate = mobileEl("form", "ask-gate mobile-ask-gate");
  const copy = mobileEl("div", "");
  copy.append(mobileEl("strong", "", "Unlock Ask"), mobileEl("span", "", "The mobile lab reuses the existing shared-secret gate and static retrieval fallback."));
  const row = mobileEl("div", "ask-gate__row");
  const input = document.createElement("input");
  input.type = "password";
  input.autocomplete = "current-password";
  input.placeholder = "Shared secret";
  const button = mobileEl("button", "", "Enter");
  button.type = "submit";
  row.append(input, button);
  gate.append(copy, row);
  if (state.askError) gate.appendChild(mobileEl("small", "chat-warning", state.askError));
  gate.addEventListener("submit", async (event) => {
    event.preventDefault();
    button.disabled = true;
    button.textContent = "Checking";
    try {
      await unlockAsk(input.value);
      state.mobileLab.mode = "ask";
    } catch (error) {
      setActivity({ label: "Ask Locked", title: "Shared secret required", detail: error.message, progress: 1 });
    } finally {
      renderMobileLab();
    }
  });
  return gate;
}

function mobileAskSuggestions() {
  const menu = state.mobileLab.detailMenu || mobileTrayMenus()[0] || mobileFeaturedMenus(1)[0];
  const context = menu ? `${displayDateLabel(menu)} ${mobilePlaceLabel(menu)}` : "current filters";
  return [
    `compare prices in ${context}`,
    state.selectedOntologyTerm ? `where does ${state.selectedOntologyTerm.term} appear over time?` : "what dishes cluster by decade?",
    "show source evidence for oysters and champagne",
  ];
}

function renderMobileInspire() {
  const wrap = mobileEl("section", "mobile-inspire");
  wrap.appendChild(renderMobileSectionHeader("Cook From The Archive", "Evidence-backed prompts, not claims that menus contain exact recipes."));
  const caveat = mobileEl("div", "mobile-caveat", "Caveat: these are modern interpretation sketches inspired by menu evidence. Open the source menu before making historical claims.");
  wrap.appendChild(caveat);
  const grid = mobileEl("div", "mobile-inspiration-grid");
  mobileInspirationSeeds().forEach((seed, index) => grid.appendChild(renderMobileInspirationCard(seed, index)));
  wrap.appendChild(grid);
  return wrap;
}

function mobileInspirationSeeds() {
  const seeded = [
    state.mobileLab.detailMenu,
    ...mobileTrayMenus(),
    ...mobileFeaturedMenus(12),
  ].filter(Boolean);
  const seen = new Set();
  return seeded.filter((menu) => {
    const key = menuKey(menu);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function renderMobileInspirationCard(menu, index) {
  const dishes = (menu.topDishes || []).filter(Boolean);
  const lead = dishes[index % Math.max(dishes.length, 1)] || menu.restaurant || menu.types?.[0] || "archive menu";
  const support = dishes.filter((dish) => dish !== lead).slice(0, 3);
  const card = mobileEl("article", "mobile-inspiration-card");
  card.append(
    mobileEl("span", "mobile-kicker", "Inspired by menu evidence"),
    mobileEl("h3", "", `Modern sketch: ${titleCase(lead)}`),
    renderMobileProvenance(menu)
  );
  const prompt = mobileEl("p", "", support.length
    ? `Use the source menu as a prompt board: pair "${lead}" with visible menu terms like ${support.map((item) => `"${item}"`).join(", ")}.`
    : `Use the source menu as a prompt board for service style, naming, and period context before inventing ingredients.`
  );
  const caveat = mobileEl("p", "mobile-inspiration-card__caveat", "No exact recipe is asserted; this is a clearly labeled modern interpretation.");
  const evidence = mobileEl("div", "mobile-evidence-links");
  const open = mobileEl("button", "", "Open evidence");
  open.type = "button";
  open.addEventListener("click", () => openMobileLabDetail(menu));
  const tray = mobileEl("button", "", mobileTrayHas(menu) ? "Saved" : "Add evidence");
  tray.type = "button";
  tray.addEventListener("click", () => toggleMobileTray(menu));
  evidence.append(open, tray);
  if (menu.itemUrl) {
    const link = mobileEl("a", "", "Source link");
    link.href = menu.itemUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    evidence.appendChild(link);
  }
  card.append(prompt, caveat, evidence);
  return card;
}

function renderMobileBottomNav() {
  const nav = mobileEl("nav", "mobile-bottom-nav");
  nav.setAttribute("aria-label", "Mobile lab modes");
  [
    ["discover", "Discover"],
    ["data", "Data"],
    ["menus", "Menus"],
    ["ask", "Ask"],
    ["inspire", "Inspire"],
  ].forEach(([mode, label]) => {
    const button = mobileEl("button", "", label);
    button.type = "button";
    button.dataset.mobileMode = mode;
    button.setAttribute("aria-current", state.mobileLab.mode === mode ? "page" : "false");
    button.addEventListener("click", () => setMobileLabMode(mode));
    nav.appendChild(button);
  });
  return nav;
}

function renderMobileEvidenceTray() {
  const trayMenus = mobileTrayMenus();
  const tray = mobileEl("aside", "mobile-evidence-tray");
  tray.hidden = !trayMenus.length;
  if (!trayMenus.length) return tray;
  tray.appendChild(mobileEl("strong", "", `${trayMenus.length} evidence item${trayMenus.length === 1 ? "" : "s"}`));
  const rail = mobileEl("div", "mobile-evidence-tray__rail");
  trayMenus.forEach((menu) => {
    const button = mobileEl("button", "", menu.title || "Menu");
    button.type = "button";
    button.addEventListener("click", () => openMobileLabDetail(menu));
    rail.appendChild(button);
  });
  tray.appendChild(rail);
  return tray;
}

function mobileTrayMenus() {
  return state.mobileLab.trayIds.map(mobileFindMenuById).filter(Boolean);
}

function mobileTrayHas(menu) {
  return state.mobileLab.trayIds.includes(menuKey(menu));
}

function toggleMobileTray(menu) {
  const key = menuKey(menu);
  if (!key) return;
  if (state.mobileLab.trayIds.includes(key)) {
    state.mobileLab.trayIds = state.mobileLab.trayIds.filter((item) => item !== key);
  } else {
    state.mobileLab.trayIds = [...state.mobileLab.trayIds, key].slice(-6);
  }
  renderMobileLab();
}

async function openMobileLabDetail(menuOrId) {
  const menu = typeof menuOrId === "object" ? menuOrId : mobileFindMenuById(menuOrId);
  if (!menu) return;
  const key = menuKey(menu);
  state.mobileLab.detailId = key;
  state.mobileLab.detailMenu = menu;
  state.mobileLab.detailData = state.detailCache.get(key) || null;
  state.mobileLab.detailError = "";
  state.mobileLab.detailOpen = true;
  state.mobileLab.sheetState = "half";
  renderMobileLab();
  try {
    const detail = state.detailCache.get(key) || (await getJson(`/api/item/${encodeURIComponent(key)}`));
    state.detailCache.set(key, detail);
    if (state.mobileLab.detailId === key) {
      state.mobileLab.detailData = detail;
      renderMobileLab();
    }
  } catch (error) {
    if (state.mobileLab.detailId === key) {
      state.mobileLab.detailError = error.message;
      renderMobileLab();
    }
  }
}

function renderMobileDetailBackdrop() {
  const backdrop = mobileEl("button", "mobile-detail-backdrop");
  backdrop.type = "button";
  backdrop.setAttribute("aria-label", "Close detail sheet");
  backdrop.addEventListener("click", closeMobileLabDetail);
  return backdrop;
}

function closeMobileLabDetail() {
  state.mobileLab.detailOpen = false;
  renderMobileLab();
}

function renderMobileDetailSheet() {
  const menu = state.mobileLab.detailMenu || mobileFindMenuById(state.mobileLab.detailId);
  const detail = state.mobileLab.detailData;
  const sheet = mobileEl("section", `mobile-detail-sheet mobile-detail-sheet--${state.mobileLab.sheetState}`);
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", "Menu detail");

  const handle = mobileEl("div", "mobile-detail-sheet__handle");
  const bar = mobileEl("div", "mobile-detail-sheet__bar");
  const title = mobileEl("strong", "", menu?.title || detail?.title || "Menu detail");
  const controls = mobileEl("div", "");
  const resize = mobileEl("button", "", state.mobileLab.sheetState === "full" ? "Half" : "Full");
  resize.type = "button";
  resize.addEventListener("click", () => {
    state.mobileLab.sheetState = state.mobileLab.sheetState === "full" ? "half" : "full";
    renderMobileLab();
  });
  const close = mobileEl("button", "", "Close");
  close.type = "button";
  close.addEventListener("click", closeMobileLabDetail);
  controls.append(resize, close);
  bar.append(title, controls);

  const body = mobileEl("div", "mobile-detail-sheet__body");
  if (menu) {
    const img = document.createElement("img");
    img.alt = "";
    setImageSource(img, detailImageSource(detail?.imageUrl || menu.imageUrl, detail?.sourceKey || menu.sourceKey || "cia"), detail?.title || menu.title);
    body.appendChild(img);
    body.appendChild(renderMobileProvenance(menu));
  }
  if (state.mobileLab.detailError) {
    body.appendChild(mobileEl("p", "mobile-caveat", state.mobileLab.detailError));
  } else if (!detail) {
    body.appendChild(mobileEl("p", "mobile-caveat", "Loading source record, transcript sample, and source link..."));
  } else {
    const text = mobileEl("p", "mobile-detail-transcript", detail.text || "No transcript text available for this page.");
    body.appendChild(text);
  }

  const actions = mobileEl("div", "mobile-detail-actions");
  if (menu) {
    const tray = mobileEl("button", "", mobileTrayHas(menu) ? "Remove from tray" : "Save evidence");
    tray.type = "button";
    tray.addEventListener("click", () => toggleMobileTray(menu));
    const ask = mobileEl("button", "", "Ask about this");
    ask.type = "button";
    ask.addEventListener("click", () => {
      state.chatDraft = `What can MenuGraph tell me about ${menu.title}?`;
      state.mobileLab.mode = "ask";
      closeMobileLabDetail();
    });
    const inspire = mobileEl("button", "", "Inspire");
    inspire.type = "button";
    inspire.addEventListener("click", () => {
      state.mobileLab.mode = "inspire";
      closeMobileLabDetail();
    });
    actions.append(tray, ask, inspire);
  }
  if (detail?.sourceUrl || menu?.itemUrl) {
    const link = mobileEl("a", "", "Open source");
    link.href = detail?.sourceUrl || menu.itemUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    actions.appendChild(link);
  }
  body.appendChild(actions);
  sheet.append(handle, bar, body);
  return sheet;
}

function renderMobileSectionHeader(title, subtitle) {
  const header = mobileEl("div", "mobile-section-header");
  header.append(mobileEl("h2", "", title), mobileEl("p", "", subtitle));
  return header;
}

function describeOntologyLoaded(ontology) {
  const mode = ontology.mode === "transcript" ? "Transcript index" : "Metadata index";
  const coverage = ontology.coverage;
  const leading = ontology.categories?.[state.ontologyCategory]?.[0];
  const coverageText = coverage
    ? `${coverage.transcriptRecords.toLocaleString()} transcript records sampled across ${coverage.totalRecords.toLocaleString()} menus.`
    : "Metadata-derived terms are available instantly; text indexing adds OCR evidence.";
  setActivity({
    label: mode,
    title: leading ? `${titleCase(leading.term)} leads ${categoryLabels[state.ontologyCategory].toLowerCase()}` : "Ontology ready",
    detail: coverageText,
    progress: 1,
  });
}

function describePricesLoaded() {
  const summary = state.prices?.summary;
  if (!summary) return;
  const label =
    state.priceMode === "todayUsd"
      ? "Today Index"
      : state.priceMode === "relative"
        ? "Relative Value"
        : "Raw Prices";
  const title =
    state.priceMode === "todayUsd" && (summary.medianDefaultTodayUsd || summary.medianTodayUsd)
      ? `${formatMoney(summary.medianDefaultTodayUsd || summary.medianTodayUsd)} median indexed price`
      : `${Number(summary.total || 0).toLocaleString()} extracted price observations`;
  const detail =
    state.priceMode === "todayUsd"
      ? `${Number(summary.defaultNormalizedUsd || summary.normalizedUsd || 0).toLocaleString()} default prices have U.S. CPI-U bands; inferred cents and low-confidence rows are caveated.`
      : "Currency, place, and confidence filters keep uncertain values visible without presenting them as exact.";
  setActivity({
    label,
    title,
    detail,
    progress: 1,
  });
}

function describeOntologyJob(job) {
  const total = Number(job.total || 0);
  const indexed = Number(job.indexed || 0);
  const progress = total ? indexed / total : job.phase === "starting" ? 0.04 : 0.12;
  const phaseTitle =
    {
      starting: "Selecting a transcript sample",
      "fetching transcripts": job.currentTitle ? `Reading ${job.currentTitle}` : "Fetching transcript text",
      "building ontology": "Classifying menu language",
      complete: "Ontology refreshed",
      failed: "Ontology build failed",
    }[job.phase] || "Working on ontology";

  const detail =
    job.phase === "fetching transcripts"
      ? `${job.message} ${indexed.toLocaleString()} of ${Math.max(total, indexed).toLocaleString()} menus checked; ${Number(job.transcriptRecords || 0).toLocaleString()} yielded OCR text.`
      : job.message || "Updating term counts and trend data.";

  setActivity({
    label: "Text Index",
    title: phaseTitle,
    detail,
    progress: job.phase === "building ontology" ? 0.92 : progress,
    indeterminate: !total && job.phase !== "failed",
  });
}

function bindEvents() {
  els.filterToggle?.addEventListener("click", () => setFilterDrawerOpen(true));
  els.filterClose?.addEventListener("click", () => setFilterDrawerOpen(false));
  els.filterBackdrop?.addEventListener("click", () => setFilterDrawerOpen(false));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.filterDrawerOpen) setFilterDrawerOpen(false);
  });

  els.searchInput.addEventListener("input", () => {
    state.filters.search = els.searchInput.value;
    update();
  });

  els.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runArchiveSearch();
  });

  els.archiveSearch.addEventListener("click", runArchiveSearch);

  els.sourceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.filters.source = button.dataset.source || "all";
      renderSourceControls();
      update();
      setActivity({
        label: "Source Filter",
        title: button.textContent === "All" ? "All sources visible" : `${button.textContent} records visible`,
        detail: "The corpus keeps CIA and NYPL provenance separate while sharing the same menu, place, food, and price lenses.",
        progress: 1,
      });
    });
  });

  els.ontologyCategoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.ontologyCategory = button.dataset.category;
      state.activeLens = "ontology";
      activateLensButton("ontology");
      renderOntologyControls();
      renderViz();
      if (state.ontology) describeOntologyLoaded(state.ontology);
    });
  });

  els.priceModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.priceMode = button.dataset.priceMode;
      state.activeLens = "prices";
      activateLensButton("prices");
      renderPriceControls();
      renderViz();
      describePricesLoaded();
    });
  });

  els.lensButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.activeLens = button.dataset.lens;
      activateLensButton(state.activeLens);
      renderViz();
      if (state.activeLens === "prices") describePricesLoaded();
      if (state.activeLens === "ontology" && state.ontology) describeOntologyLoaded(state.ontology);
      if (state.activeLens === "chat") {
        setActivity({
          label: "Ask Lens",
          title: "Natural-language corpus questions",
          detail: "Static retrieval works on GitHub Pages; a local server can add Grok synthesis when GROK_API_KEY or XAI_API_KEY is set.",
          progress: 1,
        });
      }
    });
  });

  els.yearMin.addEventListener("input", update);
  els.yearMax.addEventListener("input", update);

  if (els.estimatedToggle) {
    els.estimatedToggle.checked = state.includeEstimatedDates;
    els.estimatedToggle.addEventListener("change", () => {
      state.includeEstimatedDates = els.estimatedToggle.checked;
      update();
      if (state.dateEstimates) {
        setActivity({
          label: "Date Estimates",
          title: state.includeEstimatedDates ? "Estimated dates included" : "Only source dates shown",
          detail: "A-C estimates can appear in the time lens; D and X records remain in the review count.",
          progress: 1,
        });
      }
    });
  }

  els.clearFilters.addEventListener("click", () => {
    if (state.archiveMode) {
      state.allMenus = state.fullMenus;
      state.archiveMode = false;
      els.recordCount.textContent = state.fullRecordLabel;
    }
    state.filters.search = "";
    state.filters.decade = null;
    state.filters.type = null;
    state.filters.place = null;
    state.filters.source = "all";
    state.selectedOntologyTerm = null;
    state.selectedOntologyIds = null;
    state.priceCurrency = null;
    state.priceConfidence = null;
    state.selectedPriceMenuIds = null;
    els.searchInput.value = "";
    update();
    if (isMobileLayout()) setFilterDrawerOpen(false);
  });

  els.sampleButton.addEventListener("click", () => {
    const menus = state.visibleMenus.length ? state.visibleMenus : state.allMenus;
    const menu = menus[Math.floor(Math.random() * menus.length)];
    if (menu) selectMenu(menuKey(menu));
  });

  configureOntologyBuildButton();
  els.refreshButton.addEventListener("click", () => loadMenus(true).catch(showFatal));
  els.ontologyBuild.addEventListener("click", () => buildOntologyTextIndex().catch(showFatal));
  window.addEventListener(
    "resize",
    debounce(() => {
      syncResponsiveState();
      renderViz();
    }, 100)
  );
  syncResponsiveState();
}

function activateLensButton(lens) {
  els.lensButtons.forEach((item) => item.classList.toggle("active", item.dataset.lens === lens));
}

function debounce(fn, wait) {
  let timeout = null;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

function showFatal(error) {
  els.recordCount.textContent = "Archive unavailable";
  els.viz.innerHTML = `<div class="loading">${error.message}</div>`;
  setActivity({
    label: "Error",
    title: "Archive workflow stopped",
    detail: error.message || "An unexpected error interrupted the current operation.",
    progress: 1,
  });
}

setupMobileLab();
bindEvents();
loadMenus().catch(showFatal);
