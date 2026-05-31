const state = {
  allMenus: [],
  fullMenus: [],
  fullRecordLabel: "",
  visibleMenus: [],
  activeLens: "time",
  archiveMode: false,
  ontology: null,
  prices: null,
  ontologyCategory: "ingredients",
  priceMode: "todayUsd",
  priceCurrency: null,
  priceConfidence: null,
  selectedOntologyTerm: null,
  selectedOntologyIds: null,
  selectedPriceMenuIds: null,
  ontologyPoll: null,
  filters: {
    search: "",
    decade: null,
    type: null,
    place: null,
    minYear: 1800,
    maxYear: 2020,
  },
  selectedId: null,
  detailCache: new Map(),
};

const els = {
  recordCount: document.querySelector("#record-count"),
  searchInput: document.querySelector("#search-input"),
  fieldSelect: document.querySelector("#field-select"),
  archiveSearch: document.querySelector("#archive-search"),
  lensButtons: [...document.querySelectorAll(".lens-switch button")],
  yearMin: document.querySelector("#year-min"),
  yearMax: document.querySelector("#year-max"),
  yearLabel: document.querySelector("#year-label"),
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
  detailText: document.querySelector("#detail-text"),
  detailLink: document.querySelector("#detail-link"),
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
  state.fullRecordLabel = `${payload.summary.total.toLocaleString()} menus loaded`;
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
    detail: `Known dates run ${min} - ${max}. Facets are ready for decade, place, type, and ontology exploration.`,
    progress: 1,
  });
  update();
  loadOntology().catch(() => {
    els.ontologyStatus.textContent = "offline";
  });
  loadPrices().catch(() => {
    if (els.priceStatus) els.priceStatus.textContent = "offline";
  });
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

function filteredMenus() {
  const search = state.filters.search.trim().toLowerCase();
  return state.allMenus.filter((menu) => {
    const menuYear = menu.year;
    if (menuYear && (menuYear < state.filters.minYear || menuYear > state.filters.maxYear)) return false;
    if (state.filters.decade && compact(menu.decade).toLowerCase() !== state.filters.decade) return false;
    if (state.filters.type && !menu.types.some((type) => type.toLowerCase() === state.filters.type)) return false;
    if (state.selectedOntologyIds && !state.selectedOntologyIds.has(menu.id)) return false;
    if (state.selectedPriceMenuIds && !state.selectedPriceMenuIds.has(menu.id)) return false;
    if (
      state.filters.place &&
      ![menu.city, menu.state, menu.country].some((place) => compact(place, "").toLowerCase() === state.filters.place)
    ) {
      return false;
    }
    if (search) {
      const haystack = [menu.title, menu.restaurant, menu.city, menu.state, menu.country, menu.types.join(" "), menu.source]
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
  renderFacets();
  renderOntologyControls();
  renderPriceControls();
  renderViz();
  renderResults();
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
  const decadeCounts = uniqueCount(base.decade, (menu) => menu.decade).slice(0, 12);
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
  const visibleIds = new Set(state.visibleMenus.map((menu) => menu.id));
  return (state.prices?.records || []).filter((record) => {
    if (!visibleIds.has(record.menuId)) return false;
    if (state.priceCurrency && record.currency !== state.priceCurrency) return false;
    if (state.priceConfidence && record.confidence !== state.priceConfidence) return false;
    if (record.year && (record.year < state.filters.minYear || record.year > state.filters.maxYear)) return false;
    return valueForPriceRecord(record) !== null;
  });
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
  state.selectedOntologyIds = term ? new Set(term.recordIds || []) : null;
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

function svgEl(name, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

function renderViz() {
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
  };
  const [label, title] = copies[state.activeLens];
  els.lensLabel.textContent = label;
  els.resultTitle.textContent = title;
}

function priceLensTitle() {
  if (state.priceMode === "raw") return "Historical Menu Prices";
  if (state.priceMode === "relative") return "Relative Local Value";
  return "Prices Indexed To Today";
}

function colorFor(value) {
  let hash = 0;
  for (const char of String(value || "")) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return palette[hash % palette.length];
}

function renderTimeLens(svg, width, height) {
  lensCopy();
  const menus = state.visibleMenus;
  const pad = { top: 38, right: 28, bottom: 52, left: 58 };
  const minYear = state.filters.minYear;
  const maxYear = state.filters.maxYear;
  const known = menus.filter((menu) => menu.year);
  const rows = ["A la carte menus", "Set menus", "Drink lists", "Wine lists", "Other"];
  const rowFor = (menu) => rows.find((row) => menu.types.some((type) => type.toLowerCase().includes(row.toLowerCase().split(" ")[0]))) || "Other";
  const x = (year) => pad.left + ((year - minYear) / Math.max(maxYear - minYear, 1)) * (width - pad.left - pad.right);
  const y = (row) => pad.top + (rows.indexOf(row) + 0.5) * ((height - pad.top - pad.bottom) / rows.length);

  for (let i = 0; i <= 5; i++) {
    const year = Math.round(minYear + ((maxYear - minYear) * i) / 5);
    const gx = x(year);
    svg.appendChild(svgEl("line", { x1: gx, y1: pad.top, x2: gx, y2: height - pad.bottom, class: "grid-line" }));
    const text = svgEl("text", { x: gx, y: height - 22, "text-anchor": "middle", class: "axis-label" });
    text.textContent = year;
    svg.appendChild(text);
  }

  rows.forEach((row) => {
    const yy = y(row);
    svg.appendChild(svgEl("line", { x1: pad.left, y1: yy, x2: width - pad.right, y2: yy, class: "grid-line" }));
    const text = svgEl("text", { x: 16, y: yy + 4, class: "axis-label" });
    text.textContent = row.replace(" menus", "");
    svg.appendChild(text);
  });

  const jitter = new Map();
  known.slice(0, 1600).forEach((menu) => {
    const row = rowFor(menu);
    const key = `${menu.year}-${row}`;
    const offset = (jitter.get(key) || 0) + 1;
    jitter.set(key, offset);
    const dot = svgEl("circle", {
      cx: x(menu.year),
      cy: y(row) + ((offset % 11) - 5) * 3.5,
      r: state.selectedId === menu.id ? 7 : 4.6,
      fill: colorFor(menu.country || row),
      class: "menu-dot",
      tabindex: 0,
    });
    bindMenuNode(dot, menu);
    svg.appendChild(dot);
  });

  drawUnknownBadge(svg, menus.length - known.length, width, height);
}

function drawUnknownBadge(svg, count, width, height) {
  if (!count) return;
  const group = svgEl("g");
  group.appendChild(svgEl("rect", { x: width - 182, y: 16, width: 158, height: 34, rx: 7, fill: "rgba(47,58,63,0.08)" }));
  const text = svgEl("text", { x: width - 103, y: 38, "text-anchor": "middle", class: "axis-label" });
  text.textContent = `${count.toLocaleString()} undated`;
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
  const counts = uniqueCount(state.visibleMenus, (menu) => menu.donor || sourceFamily(menu.source)).slice(0, 22);
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
    dot.addEventListener("click", () => selectMenu(record.menuId));
    dot.addEventListener("keyup", (event) => {
      if (event.key === "Enter") selectMenu(record.menuId);
    });
    dot.addEventListener("mousemove", (event) => {
      const context = record.context?.[0]?.label ? `<br><em>${record.context[0].label}: ${record.context[0].note}</em>` : "";
      showTooltip(
        event,
        `<strong>${titleCase(record.item)}</strong>${record.rawPrice} in ${record.year} (${record.currency})<br>${priceValueLabel(record)}<br>${record.confidence} confidence - ${record.normalized?.method || "raw"}${context}`
      );
    });
    dot.addEventListener("mouseleave", removeTooltip);
    svg.appendChild(dot);
  });

  const note = svgEl("text", { x: width - pad.right, y: pad.top - 16, "text-anchor": "end", class: "price-note" });
  note.textContent = `${records.length.toLocaleString()} observations; estimates use bands and CPI snapshots`;
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
  node.addEventListener("click", () => selectMenu(menu.id));
  node.addEventListener("keyup", (event) => {
    if (event.key === "Enter") selectMenu(menu.id);
  });
  node.addEventListener("mousemove", (event) => {
    const where = [menu.city, menu.state, menu.country].filter(Boolean).join(", ");
    showTooltip(
      event,
      `<strong>${menu.title}</strong>${compact(menu.date, "Undated")} ${where ? `- ${titleCase(where)}` : ""}`
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
          <span>${compact(menu.date, "Undated")} ${compact(menu.city || menu.country, "")}</span>
        </span>
      `;
      setImageSource(button.querySelector("img"), menu.imageUrl, menu.title);
      button.addEventListener("click", () => selectMenu(menu.id));
      return button;
    })
  );
}

async function selectMenu(id) {
  state.selectedId = id;
  renderViz();
  const summary = state.allMenus.find((menu) => menu.id === id) || state.visibleMenus.find((menu) => menu.id === id);
  renderDetailSkeleton(summary);
  try {
    const detail = state.detailCache.get(id) || (await getJson(`/api/item/${id}`));
    state.detailCache.set(id, detail);
    renderDetail(detail, summary);
  } catch (error) {
    els.detailText.textContent = error.message;
  }
}

function renderDetailSkeleton(menu) {
  els.detailEmpty.classList.add("hidden");
  els.detailCard.classList.remove("hidden");
  els.detailImage.alt = menu?.title || "Selected menu";
  setImageSource(els.detailImage, menu?.imageUrl, menu?.title);
  els.detailKicker.textContent = [compact(menu?.date, "Undated"), compact(menu?.country, "")].filter(Boolean).join(" / ");
  els.detailTitle.textContent = menu?.title || "Loading menu";
  els.detailMeta.replaceChildren();
  els.detailText.textContent = "Loading full record...";
  els.detailLink.href = menu?.itemUrl || "#";
  els.pageStrip.replaceChildren();
}

function renderDetail(detail, menu) {
  els.detailImage.alt = detail.title;
  setImageSource(els.detailImage, detail.imageUrl, detail.title || menu?.title);
  els.detailTitle.textContent = detail.title || menu?.title || "Menu";
  els.detailKicker.textContent = [fieldValue(detail, "date") || menu?.date || "Undated", fieldValue(detail, "countr") || menu?.country]
    .filter(Boolean)
    .join(" / ");
  els.detailLink.href = detail.sourceUrl;

  const rows = [
    ["Restaurant", fieldValue(detail, "restau") || menu?.restaurant],
    ["Type", fieldValue(detail, "typea") || menu?.types?.join(", ")],
    ["Place", [fieldValue(detail, "locati") || menu?.city, fieldValue(detail, "state") || menu?.state, fieldValue(detail, "countr") || menu?.country].filter(Boolean).join(", ")],
    ["Source", fieldValue(detail, "source") || menu?.source],
    ["Donor", fieldValue(detail, "donor") || menu?.donor],
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
      img.addEventListener("click", () => selectMenu(page.id));
      return img;
    })
  );
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

async function buildOntologyTextIndex() {
  els.ontologyBuild.disabled = true;
  els.ontologyBuild.textContent = "Indexing...";
  if (window.MenuGraphArchive?.buildTextIndex) {
    try {
      const ontology = await window.MenuGraphArchive.buildTextIndex({
        limit: 300,
        onProgress: updateOntologyStatus,
      });
      state.ontology = ontology;
      updateOntologyStatus(ontology.job);
      renderOntologyControls();
      renderInsights();
      describeOntologyLoaded(ontology);
      if (state.activeLens === "ontology") renderViz();
    } finally {
      els.ontologyBuild.disabled = false;
      els.ontologyBuild.textContent = "Index Text";
    }
    return;
  }
  const status = await getJson("/api/ontology/build?limit=300");
  updateOntologyStatus(status);
  startOntologyPolling();
}

function startOntologyPolling() {
  clearInterval(state.ontologyPoll);
  state.ontologyPoll = setInterval(async () => {
    const next = await getJson("/api/ontology/status");
    updateOntologyStatus(next);
    if (!next.active) {
      clearInterval(state.ontologyPoll);
      state.ontologyPoll = null;
      els.ontologyBuild.disabled = false;
      els.ontologyBuild.textContent = "Index Text";
      await loadOntology();
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
    state.priceMode === "todayUsd" && summary.medianTodayUsd
      ? `${formatMoney(summary.medianTodayUsd)} median indexed price`
      : `${Number(summary.total || 0).toLocaleString()} extracted price observations`;
  const detail =
    state.priceMode === "todayUsd"
      ? `${Number(summary.normalizedUsd || 0).toLocaleString()} prices have U.S. CPI-U bands; non-U.S. prices remain caveated unless local CPI coverage exists.`
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
  els.searchInput.addEventListener("input", () => {
    state.filters.search = els.searchInput.value;
    update();
  });

  els.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runArchiveSearch();
  });

  els.archiveSearch.addEventListener("click", runArchiveSearch);

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
    });
  });

  els.yearMin.addEventListener("input", update);
  els.yearMax.addEventListener("input", update);

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
    state.selectedOntologyTerm = null;
    state.selectedOntologyIds = null;
    state.priceCurrency = null;
    state.priceConfidence = null;
    state.selectedPriceMenuIds = null;
    els.searchInput.value = "";
    update();
  });

  els.sampleButton.addEventListener("click", () => {
    const menus = state.visibleMenus.length ? state.visibleMenus : state.allMenus;
    const menu = menus[Math.floor(Math.random() * menus.length)];
    if (menu) selectMenu(menu.id);
  });

  els.refreshButton.addEventListener("click", () => loadMenus(true).catch(showFatal));
  els.ontologyBuild.addEventListener("click", () => buildOntologyTextIndex().catch(showFatal));
  window.addEventListener("resize", debounce(renderViz, 100));
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

bindEvents();
loadMenus().catch(showFatal);
