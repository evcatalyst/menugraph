(function () {
  "use strict";

  const STORAGE_KEY = "menugraph:pwa-lists:v1";
  const SOURCE_LABELS = { cia: "CIA", nypl: "NYPL", si: "Smithsonian", nara: "NARA" };
  const state = {
    menus: [],
    menuById: new Map(),
    institutions: { collections: [], pilotRecords: [] },
    mode: "deck",
    source: "all",
    query: "",
    deckIds: [],
    passedIds: new Set(),
    lists: loadLists(),
    listId: null,
    institutionId: null,
    pending: null,
    modal: null,
  };

  const app = document.querySelector("#app");
  const view = document.querySelector("#view");
  const modalRoot = document.querySelector("#modal-root");
  const menuCount = document.querySelector("#menu-count");
  const toast = document.querySelector("#toast");

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    return element;
  }

  function clean(value, fallback = "") {
    const result = String(value || "").replace(/\s+/g, " ").trim();
    return result || fallback;
  }

  function menuId(menu) {
    return String(menu?.uid || `${menu?.sourceKey || "cia"}:${menu?.sourceRecordId || menu?.id || menu?.pointer}`);
  }

  function sourceLabel(menu) {
    return menu?.sourceShortLabel || SOURCE_LABELS[menu?.sourceKey] || clean(menu?.sourceKey, "CIA").toUpperCase();
  }

  function placeLabel(menu) {
    const parts = [menu?.city, menu?.state, menu?.country]
      .map((value) => clean(value).replace(/^unknown$/i, ""))
      .filter(Boolean);
    const seen = new Set();
    return parts.filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).join(", ") || "Place unknown";
  }

  function dateLabel(menu) {
    return clean(menu?.date || menu?.decade, "Date unknown");
  }

  function placeholder(label) {
    const safe = clean(label, "Menu").slice(0, 42).replace(/[<>&]/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 900"><rect width="720" height="900" fill="#e7e0d8"/><rect x="70" y="70" width="580" height="760" rx="28" fill="#fffdf9"/><text x="360" y="420" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#17151d">MenuGraph</text><text x="360" y="466" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" fill="#746f7a">${safe}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function menuImage(menu) {
    const image = document.createElement("img");
    image.alt = "";
    image.loading = "lazy";
    image.draggable = false;
    image.onerror = () => {
      image.onerror = null;
      image.src = placeholder(menu?.title);
    };
    image.src = menu?.imageUrl || placeholder(menu?.title);
    return image;
  }

  function loadLists() {
    const fallback = [{ id: "favorites", name: "Favorites", menuIds: [], institutionalIds: [] }];
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!Array.isArray(stored) || !stored.length) return fallback;
      return stored.filter((list) => list?.id && list?.name).map((list) => ({
        id: String(list.id),
        name: clean(list.name, "Untitled list"),
        menuIds: [...new Set((list.menuIds || []).map(String))],
        institutionalIds: [...new Set((list.institutionalIds || []).map(String))],
      }));
    } catch (error) {
      return fallback;
    }
  }

  function persistLists() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lists));
    } catch (error) {
      announce("Saved for this session; persistent storage is unavailable.");
    }
  }

  function announce(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(announce.timer);
    announce.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
  }

  function score(menu) {
    return (menu?.imageUrl ? 8 : 0) + Math.min(menu?.topDishes?.length || 0, 8) + Math.min(Number(menu?.priceCount || 0), 6) + (menu?.date || menu?.year ? 2 : 0);
  }

  function defaultDeck() {
    return [...state.menus]
      .filter((menu) => menu?.imageUrl)
      .sort((a, b) => score(b) - score(a) || clean(a.title).localeCompare(clean(b.title)))
      .slice(0, 80)
      .map(menuId);
  }

  function activeDeck() {
    const ids = state.deckIds.length ? state.deckIds : defaultDeck();
    return ids.filter((id) => !state.passedIds.has(id)).map((id) => state.menuById.get(id)).filter(Boolean);
  }

  function institutionEntries() {
    return [...(state.institutions.collections || []), ...(state.institutions.pilotRecords || [])];
  }

  function institutionById(id) {
    return institutionEntries().find((entry) => entry.id === id) || null;
  }

  function setMode(mode) {
    state.mode = mode;
    if (mode !== "lists") state.listId = null;
    if (mode !== "search") state.institutionId = null;
    render();
  }

  function render() {
    view.dataset.mode = state.mode;
    view.replaceChildren();
    document.querySelectorAll(".bottom-nav button[data-mode]").forEach((button) => {
      button.setAttribute("aria-current", button.dataset.mode === state.mode ? "page" : "false");
    });
    if (!state.menus.length) {
      const loading = node("section", "loading");
      loading.append(node("span", "identity__mark", "M"), node("strong", "", "Opening the archive"), node("p", "", "Preparing menu cards and institutional sources."));
      view.appendChild(loading);
      return;
    }
    if (state.mode === "search") view.appendChild(state.institutionId ? renderInstitutionDetail(state.institutionId) : renderSearch());
    else if (state.mode === "lists") view.appendChild(state.listId ? renderListDetail(state.listId) : renderLists());
    else view.appendChild(renderDeck());
    window.requestAnimationFrame(() => view.focus({ preventScroll: true }));
  }

  function renderDeck() {
    const section = node("section", "deck-view");
    const heading = node("div", "deck-heading");
    const copy = node("div");
    copy.append(node("p", "overline", "Discover"), node("h1", "", "Find a menu worth saving"));
    const search = node("button", "icon-button", "⌕");
    search.type = "button";
    search.setAttribute("aria-label", "Search menus and collections");
    search.addEventListener("click", () => setMode("search"));
    heading.append(copy, search);
    section.appendChild(heading);

    const deck = activeDeck();
    if (!deck.length) {
      const empty = node("div", "empty");
      empty.append(node("h2", "", "You reached the end"), node("p", "", "Search for a place, dish, or decade to build another deck."));
      const button = node("button", "primary", "Search the archive");
      button.type = "button";
      button.addEventListener("click", () => setMode("search"));
      empty.appendChild(button);
      section.appendChild(empty);
      return section;
    }

    const current = deck[0];
    const stack = node("div", "card-stack");
    if (deck[1]) stack.appendChild(renderCard(deck[1], true));
    stack.appendChild(renderCard(current, false));
    section.appendChild(stack);
    section.appendChild(node("p", "gesture-hint", "Swipe left to pass · right to save"));
    const actions = node("div", "actions");
    [["pass", "×", `Pass ${current.title}`], ["info", "i", `Open ${current.title}`], ["save", "♥", `Save ${current.title}`]].forEach(([action, symbol, label]) => {
      const button = node("button", "round-action", symbol);
      button.type = "button";
      button.dataset.action = action;
      button.setAttribute("aria-label", label);
      button.addEventListener("click", () => handleCardAction(action, current));
      actions.appendChild(button);
    });
    section.appendChild(actions);
    return section;
  }

  function renderCard(menu, under) {
    const card = node("article", `menu-card${under ? " menu-card--under" : ""}`);
    card.dataset.menuId = menuId(menu);
    const image = node("div", "card-image");
    image.append(menuImage(menu), node("span", "swipe-badge swipe-badge--pass", "Pass"), node("span", "swipe-badge swipe-badge--save", "Save"), node("span", "source-badge", sourceLabel(menu)));
    const body = node("div", "card-body");
    body.append(node("h2", "", clean(menu.title, "Untitled menu")), node("p", "place", placeLabel(menu)));
    const facts = node("div", "facts");
    [dateLabel(menu), menu.types?.[0], menu.topDishes?.[0]].filter(Boolean).forEach((fact) => facts.appendChild(node("span", "", fact)));
    body.appendChild(facts);
    card.append(image, body);
    if (!under) bindSwipe(card, menu);
    return card;
  }

  function bindSwipe(card, menu) {
    let start = 0;
    let delta = 0;
    let dragging = false;
    card.tabIndex = 0;
    card.setAttribute("aria-label", `${menu.title}. Swipe left to pass or right to save.`);
    card.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      start = event.clientX;
      dragging = true;
      card.classList.add("is-dragging");
      card.setPointerCapture?.(event.pointerId);
    });
    card.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      delta = event.clientX - start;
      card.style.transform = `translateX(${delta}px) rotate(${Math.max(-8, Math.min(8, delta / 24))}deg)`;
      card.dataset.direction = Math.abs(delta) < 24 ? "" : delta > 0 ? "save" : "pass";
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      card.classList.remove("is-dragging");
      if (delta > 72) handleCardAction("save", menu);
      else if (delta < -72) handleCardAction("pass", menu);
      else {
        card.style.transform = "";
        card.dataset.direction = "";
      }
      delta = 0;
    };
    card.addEventListener("pointerup", release);
    card.addEventListener("pointercancel", release);
    card.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") handleCardAction("pass", menu);
      if (event.key === "ArrowRight") handleCardAction("save", menu);
      if (event.key === "Enter" || event.key === " ") handleCardAction("info", menu);
    });
  }

  function handleCardAction(action, menu) {
    if (action === "info") return openMenuDetail(menu);
    if (action === "save") return openSaveSheet({ kind: "menu", id: menuId(menu), advance: true });
    state.passedIds.add(menuId(menu));
    render();
  }

  function menuMatches(menu, query) {
    if (!query) return true;
    return [menu.title, menu.restaurant, menu.city, menu.state, menu.country, menu.date, ...(menu.types || []), ...(menu.topDishes || [])].join(" ").toLowerCase().includes(query);
  }

  function institutionMatches(entry, query) {
    if (!query) return true;
    return [entry.title, entry.description, entry.date, entry.dateRange, entry.place, ...(entry.places || []), ...(entry.types || []), ...(entry.themes || [])].join(" ").toLowerCase().includes(query);
  }

  function searchResults() {
    const query = clean(state.query).toLowerCase();
    const menus = state.menus.filter((menu) => {
      if (["cia", "nypl"].includes(state.source) && menu.sourceKey !== state.source) return false;
      if (["si", "nara"].includes(state.source)) return false;
      return menuMatches(menu, query);
    });
    const entries = institutionEntries().filter((entry) => {
      if (state.source !== "all" && entry.parentSourceKey !== state.source) return false;
      return institutionMatches(entry, query);
    });
    return {
      menus,
      collections: entries.filter((entry) => state.institutions.collections.some((collection) => collection.id === entry.id)),
      records: entries.filter((entry) => state.institutions.pilotRecords.some((record) => record.id === entry.id)),
    };
  }

  function renderSearch() {
    const section = node("section", "page search-page");
    section.append(node("p", "overline", "Search"), node("h1", "", "Build your own deck"));
    const form = node("form", "search-form");
    const input = document.createElement("input");
    input.type = "search";
    input.value = state.query;
    input.placeholder = "Try oysters, Chicago, 1950s…";
    input.setAttribute("aria-label", "Search menus and institutions");
    const submit = node("button", "", "Search");
    submit.type = "submit";
    form.append(input, submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      state.query = input.value;
      render();
    });
    section.appendChild(form);

    const filters = node("div", "source-filters");
    [["all", "All"], ["cia", "CIA"], ["nypl", "NYPL"], ["si", "Smithsonian"], ["nara", "NARA"]].forEach(([key, label]) => {
      const button = node("button", "", label);
      button.type = "button";
      button.dataset.source = key;
      button.setAttribute("aria-pressed", state.source === key ? "true" : "false");
      button.addEventListener("click", () => {
        state.source = key;
        render();
      });
      filters.appendChild(button);
    });
    section.appendChild(filters);

    const results = searchResults();
    const total = results.menus.length + results.collections.length + results.records.length;
    const head = node("div", "results-head");
    head.append(node("strong", "", `${total.toLocaleString()} result${total === 1 ? "" : "s"}`), node("span", "", "Source-linked evidence"));
    section.appendChild(head);

    if (results.menus.length) {
      const build = node("button", "primary build-deck", `Swipe ${Math.min(results.menus.length, 60)} matching menus`);
      build.type = "button";
      build.addEventListener("click", () => {
        state.deckIds = results.menus.slice(0, 60).map(menuId);
        state.passedIds.clear();
        setMode("deck");
      });
      section.appendChild(build);
      const list = node("div", "result-list");
      results.menus.slice(0, 20).forEach((menu) => list.appendChild(renderMenuResult(menu)));
      section.appendChild(list);
    }

    if (results.collections.length || results.records.length) {
      const label = node("div", "section-head");
      label.append(node("strong", "", "Institutional sources"), node("span", "", "Metadata-first · rights-aware"));
      section.appendChild(label);
      const list = node("div", "institution-list");
      results.collections.forEach((entry) => list.appendChild(renderInstitutionCard(entry, true)));
      results.records.forEach((entry) => list.appendChild(renderInstitutionCard(entry, false)));
      section.appendChild(list);
    }

    if (!total) {
      const empty = node("div", "empty empty--panel");
      empty.append(node("h2", "", "No source records found"), node("p", "", "Try a broader term or switch institutions."));
      section.appendChild(empty);
    }
    return section;
  }

  function renderMenuResult(menu) {
    const row = node("article", "menu-result");
    const copy = node("div");
    copy.append(node("span", "result-source", sourceLabel(menu)), node("h2", "", clean(menu.title, "Untitled menu")), node("p", "", `${dateLabel(menu)} · ${placeLabel(menu)}`));
    const open = node("button", "small-button", "Open");
    open.type = "button";
    open.addEventListener("click", () => openMenuDetail(menu));
    row.append(menuImage(menu), copy, open);
    return row;
  }

  function renderInstitutionCard(entry, collection) {
    const card = node("article", "institution-card");
    card.dataset.institutionId = entry.id;
    const top = node("div", "institution-top");
    const mark = node("span", `institution-mark${entry.parentSourceKey === "nara" ? " institution-mark--nara" : ""}`, entry.parentSourceKey === "si" ? "SI" : "N");
    const badges = node("div", "institution-badges");
    badges.append(node("span", "", collection ? "Collection guide" : "Pilot record"), node("span", "", entry.mediaStatus === "metadata-only" ? "Metadata only" : `${clean(entry.mediaStatus, "Limited")} media`));
    top.append(mark, badges);
    card.append(top, node("h2", "", entry.title), node("p", "", entry.description), node("span", "institution-date", entry.date || entry.dateRange || "Date varies"));
    const actions = node("div", "institution-actions");
    const explore = node("button", "", "Explore");
    explore.type = "button";
    explore.addEventListener("click", () => {
      state.institutionId = entry.id;
      render();
    });
    const save = node("button", "", "Save source");
    save.type = "button";
    save.addEventListener("click", () => openSaveSheet({ kind: "institution", id: entry.id, advance: false }));
    actions.append(explore, save);
    card.appendChild(actions);
    return card;
  }

  function renderInstitutionDetail(id) {
    const section = node("section", "page institution-detail");
    const back = node("button", "back", "← Search");
    back.type = "button";
    back.addEventListener("click", () => {
      state.institutionId = null;
      render();
    });
    section.appendChild(back);
    const entry = institutionById(id);
    if (!entry) {
      section.append(node("h1", "", "Source unavailable"), node("p", "intro", "This record is not in the published catalog."));
      return section;
    }
    section.append(node("span", `institution-mark${entry.parentSourceKey === "nara" ? " institution-mark--nara" : ""}`, entry.parentSourceKey === "si" ? "SI" : "N"), node("p", "overline", SOURCE_LABELS[entry.parentSourceKey]), node("h1", "", entry.title), node("p", "intro", entry.description));
    const facts = node("dl", "source-facts");
    [["Dates", entry.date || entry.dateRange], ["Extent", entry.countLabel], ["Record level", entry.recordGranularity], ["Media", entry.mediaStatus], ["Rights", entry.rights]].filter(([, value]) => value).forEach(([term, value]) => facts.append(node("dt", "", term), node("dd", "", value)));
    section.appendChild(facts);
    if (entry.themes?.length) {
      const themes = node("div", "theme-row");
      entry.themes.forEach((theme) => themes.appendChild(node("span", "", theme)));
      section.appendChild(themes);
    }
    const actions = node("div", "source-actions");
    const save = node("button", "primary", "Save to a list");
    save.type = "button";
    save.addEventListener("click", () => openSaveSheet({ kind: "institution", id: entry.id, advance: false }));
    const source = node("a", "secondary", "Open source record ↗");
    source.href = entry.accessUrl;
    source.target = "_blank";
    source.rel = "noreferrer";
    actions.append(save, source);
    section.appendChild(actions);
    const related = state.institutions.pilotRecords.filter((record) => record.collectionId === entry.id && record.id !== entry.id);
    if (related.length) {
      const label = node("div", "section-head");
      label.append(node("strong", "", "Catalogued pilot records"), node("span", "", `${related.length} records`));
      section.appendChild(label);
      const list = node("div", "institution-list");
      related.forEach((record) => list.appendChild(renderInstitutionCard(record, false)));
      section.appendChild(list);
    }
    return section;
  }

  function renderLists() {
    const section = node("section", "page lists-page");
    section.append(node("p", "overline", "Lists"), node("h1", "", "Your menu trails"), node("p", "intro", "Keep menus and source collections together for a meal, city, or research question."));
    const form = node("form", "create-form");
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 48;
    input.placeholder = "Name a new list";
    input.setAttribute("aria-label", "New list name");
    const create = node("button", "", "+ Create");
    create.type = "submit";
    form.append(input, create);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = clean(input.value);
      if (!name) return;
      const list = { id: `list-${Date.now().toString(36)}`, name, menuIds: [], institutionalIds: [] };
      state.lists.push(list);
      state.listId = list.id;
      persistLists();
      render();
    });
    section.appendChild(form);
    const grid = node("div", "list-grid");
    state.lists.forEach((list) => grid.appendChild(renderListCard(list)));
    section.appendChild(grid);
    return section;
  }

  function renderListCard(list) {
    const card = node("button", "list-card");
    card.type = "button";
    card.dataset.listId = list.id;
    const thumbs = node("span", "list-thumbs");
    list.menuIds.slice(0, 3).map((id) => state.menuById.get(id)).filter(Boolean).forEach((menu) => thumbs.appendChild(menuImage(menu)));
    while (thumbs.children.length < 3) thumbs.appendChild(node("span", "", thumbs.children.length ? "+" : "M"));
    const copy = node("span", "list-copy");
    const count = list.menuIds.length + list.institutionalIds.length;
    copy.append(node("strong", "", list.name), node("small", "", `${count} saved item${count === 1 ? "" : "s"}`));
    card.append(thumbs, copy, node("span", "", "→"));
    card.addEventListener("click", () => {
      state.listId = list.id;
      render();
    });
    return card;
  }

  function renderListDetail(id) {
    const list = state.lists.find((item) => item.id === id);
    if (!list) {
      state.listId = null;
      return renderLists();
    }
    const section = node("section", "page list-detail");
    const back = node("button", "back", "← All lists");
    back.type = "button";
    back.addEventListener("click", () => {
      state.listId = null;
      render();
    });
    const count = list.menuIds.length + list.institutionalIds.length;
    section.append(back, node("p", "overline", "Saved list"), node("h1", "", list.name), node("p", "intro", `${count} source-linked item${count === 1 ? "" : "s"}`));
    if (!count) {
      const empty = node("div", "empty empty--panel");
      empty.append(node("h2", "", "Nothing saved yet"), node("p", "", "Swipe right on a menu or save an institutional source."));
      const browse = node("button", "primary", "Browse the deck");
      browse.type = "button";
      browse.addEventListener("click", () => setMode("deck"));
      empty.appendChild(browse);
      section.appendChild(empty);
    }
    const items = node("div", "saved-items");
    list.menuIds.map((menuIdValue) => state.menuById.get(menuIdValue)).filter(Boolean).forEach((menu) => {
      const row = renderMenuResult(menu);
      const remove = node("button", "remove", "Remove");
      remove.type = "button";
      remove.addEventListener("click", () => removeFromList(list, "menu", menuId(menu)));
      row.appendChild(remove);
      items.appendChild(row);
    });
    list.institutionalIds.map(institutionById).filter(Boolean).forEach((entry) => {
      const row = node("article", "saved-source");
      const mark = node("span", `institution-mark${entry.parentSourceKey === "nara" ? " institution-mark--nara" : ""}`, entry.parentSourceKey === "si" ? "SI" : "N");
      const open = node("button");
      open.type = "button";
      open.append(node("strong", "", entry.title), node("small", "", `${SOURCE_LABELS[entry.parentSourceKey]} · ${entry.mediaStatus}`));
      open.addEventListener("click", () => {
        state.mode = "search";
        state.institutionId = entry.id;
        render();
      });
      const remove = node("button", "remove", "Remove");
      remove.type = "button";
      remove.addEventListener("click", () => removeFromList(list, "institution", entry.id));
      row.append(mark, open, remove);
      items.appendChild(row);
    });
    section.appendChild(items);
    return section;
  }

  function removeFromList(list, kind, id) {
    if (kind === "menu") list.menuIds = list.menuIds.filter((value) => value !== id);
    else list.institutionalIds = list.institutionalIds.filter((value) => value !== id);
    persistLists();
    render();
  }

  function backdrop(close) {
    const button = node("button", "backdrop");
    button.type = "button";
    button.setAttribute("aria-label", "Close dialog");
    button.addEventListener("click", close);
    return button;
  }

  function openSaveSheet(pending) {
    state.pending = pending;
    renderModal();
  }

  function renderModal() {
    modalRoot.replaceChildren();
    if (state.pending) return renderSaveSheet();
    if (state.modal?.kind === "menu") return renderMenuDetail(state.modal.menu);
  }

  function closeModal() {
    state.pending = null;
    state.modal = null;
    modalRoot.replaceChildren();
  }

  function renderSaveSheet() {
    const sheet = node("section", "sheet save-sheet");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "Save to a list");
    sheet.append(node("span", "sheet-handle"), node("p", "overline", "Save"), node("h2", "", "Choose a list"));
    const choices = node("div", "save-choices");
    state.lists.forEach((list) => {
      const saved = state.pending.kind === "menu" ? list.menuIds.includes(state.pending.id) : list.institutionalIds.includes(state.pending.id);
      const button = node("button");
      button.type = "button";
      button.dataset.saveListId = list.id;
      button.append(node("span", "", list.name), node("small", "", saved ? "Saved" : `${list.menuIds.length + list.institutionalIds.length} items`));
      button.addEventListener("click", () => savePending(list));
      choices.appendChild(button);
    });
    sheet.appendChild(choices);
    const form = node("form", "new-list-form");
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "New list name";
    input.setAttribute("aria-label", "New list name");
    const create = node("button", "", "Create & save");
    create.type = "submit";
    form.append(input, create);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = clean(input.value);
      if (!name) return;
      const list = { id: `list-${Date.now().toString(36)}`, name, menuIds: [], institutionalIds: [] };
      state.lists.push(list);
      savePending(list);
    });
    const cancel = node("button", "sheet-cancel", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", closeModal);
    sheet.append(form, cancel);
    modalRoot.append(backdrop(closeModal), sheet);
    sheet.querySelector("button")?.focus();
  }

  function savePending(list) {
    const pending = state.pending;
    if (!pending) return;
    if (pending.kind === "menu" && !list.menuIds.includes(pending.id)) list.menuIds.push(pending.id);
    if (pending.kind === "institution" && !list.institutionalIds.includes(pending.id)) list.institutionalIds.push(pending.id);
    if (pending.advance && pending.kind === "menu") state.passedIds.add(pending.id);
    persistLists();
    closeModal();
    render();
    announce(`Saved to ${list.name}`);
  }

  function openMenuDetail(menu) {
    state.modal = { kind: "menu", menu };
    renderModal();
  }

  function renderMenuDetail(menu) {
    const sheet = node("section", "sheet detail-sheet");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "Menu details");
    const close = node("button", "detail-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Close menu details");
    close.addEventListener("click", closeModal);
    const body = node("div", "detail-body");
    body.append(node("span", "result-source", sourceLabel(menu)), node("h2", "", clean(menu.title, "Untitled menu")), node("p", "place", placeLabel(menu)));
    const facts = node("div", "facts");
    [dateLabel(menu), ...(menu.types || []).slice(0, 2)].filter(Boolean).forEach((fact) => facts.appendChild(node("span", "", fact)));
    body.appendChild(facts);
    const dishes = (menu.topDishes || []).slice(0, 5);
    body.appendChild(node("p", "detail-copy", dishes.length ? `Menu evidence includes ${dishes.join(", ")}.` : "No structured dish transcription is available for this menu."));
    const actions = node("div", "detail-actions");
    const save = node("button", "primary", "♥ Save to list");
    save.type = "button";
    save.addEventListener("click", () => {
      state.modal = null;
      openSaveSheet({ kind: "menu", id: menuId(menu), advance: false });
    });
    actions.appendChild(save);
    if (menu.itemUrl) {
      const source = node("a", "secondary", "View original ↗");
      source.href = menu.itemUrl;
      source.target = "_blank";
      source.rel = "noreferrer";
      actions.appendChild(source);
    }
    body.appendChild(actions);
    sheet.append(close, menuImage(menu), body);
    modalRoot.append(backdrop(closeModal), sheet);
    close.focus();
  }

  async function load() {
    try {
      const [menuResponse, sourceResponse] = await Promise.all([
        fetch("../data/menus.json"),
        fetch("../data/institutional-sources.json"),
      ]);
      if (!menuResponse.ok) throw new Error(`Menu index returned ${menuResponse.status}`);
      const menuPayload = await menuResponse.json();
      state.menus = (menuPayload.menus || []).filter(Boolean);
      state.menuById = new Map(state.menus.map((menu) => [menuId(menu), menu]));
      if (sourceResponse.ok) state.institutions = await sourceResponse.json();
      menuCount.textContent = `${state.menus.length.toLocaleString()} menus`;
      app.setAttribute("aria-busy", "false");
      render();
    } catch (error) {
      menuCount.textContent = "Archive unavailable";
      view.replaceChildren();
      const failure = node("section", "empty");
      failure.append(node("h2", "", "The archive could not load"), node("p", "", `${error.message}. Reconnect and reload this page.`));
      view.appendChild(failure);
      app.setAttribute("aria-busy", "false");
    }
  }

  document.querySelector("#home-button").addEventListener("click", () => setMode("deck"));
  document.querySelectorAll(".bottom-nav button[data-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }

  load();
})();
