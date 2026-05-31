(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.MenuGraphMultiSource = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const SOURCE_DEFS = {
    cia: {
      key: "cia",
      label: "CIA Menu Collection",
      shortLabel: "CIA",
      rights: "Rights status supplied by CIA Digital Collections",
    },
    nypl: {
      key: "nypl",
      label: "NYPL What's on the Menu?",
      shortLabel: "NYPL",
      rights: "CC0/Public Domain dataset; image rights follow NYPL Digital Collections item metadata",
    },
  };

  const STATE_NAMES = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DC: "District of Columbia",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    IA: "Iowa",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    MA: "Massachusetts",
    MD: "Maryland",
    ME: "Maine",
    MI: "Michigan",
    MN: "Minnesota",
    MO: "Missouri",
    MS: "Mississippi",
    MT: "Montana",
    NC: "North Carolina",
    ND: "North Dakota",
    NE: "Nebraska",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NV: "Nevada",
    NY: "New York",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VA: "Virginia",
    VT: "Vermont",
    WA: "Washington",
    WI: "Wisconsin",
    WV: "West Virginia",
    WY: "Wyoming",
  };

  const STOP_TOKENS = new Set([
    "a",
    "and",
    "at",
    "bar",
    "breakfast",
    "cafe",
    "daily",
    "dining",
    "dinner",
    "grill",
    "hotel",
    "house",
    "inn",
    "lunch",
    "luncheon",
    "menu",
    "of",
    "restaurant",
    "room",
    "supper",
    "the",
  ]);

  function cleanValue(value) {
    if (Array.isArray(value)) return value.map(cleanValue).filter(Boolean).join("; ");
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function splitTerms(value) {
    if (!value) return [];
    return String(value)
      .split(";")
      .map(cleanValue)
      .filter(Boolean);
  }

  function normalizeText(value) {
    return cleanValue(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function titleCase(value) {
    return cleanValue(value)
      .toLowerCase()
      .split(/\s+/)
      .map((word) => {
        if (!word) return "";
        if (word.length <= 2 && STATE_NAMES[word.toUpperCase()]) return word.toUpperCase();
        return word[0].toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  function yearFromDate(value) {
    const match = String(value || "").match(/\b(18|19|20)\d{2}\b/);
    return match ? Number(match[0]) : null;
  }

  function decadeFromDate(value) {
    const year = typeof value === "number" ? value : yearFromDate(value);
    return year ? `${Math.floor(year / 10) * 10}s` : "unknown";
  }

  function uidFor(sourceKey, id) {
    return `${sourceKey}:${cleanValue(id)}`;
  }

  function sourceFor(menu) {
    return SOURCE_DEFS[menu?.sourceKey] || SOURCE_DEFS.cia;
  }

  function recordUid(menu) {
    return menu?.uid || uidFor(menu?.sourceKey || "cia", menu?.sourceRecordId || menu?.id || menu?.pointer);
  }

  function normalizeVenueName(value) {
    return normalizeText(String(value || "").replace(/\([^)]*\)/g, " "))
      .replace(/\b(restaurant|hotel|cafe|cafeteria|dining|room|grill|bar|the)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenSet(value) {
    const tokens = normalizeVenueName(value)
      .split(/\s+/)
      .filter((token) => token.length > 1 && !STOP_TOKENS.has(token));
    return new Set(tokens);
  }

  function jaccard(a, b) {
    if (!a.size || !b.size) return 0;
    let intersection = 0;
    for (const item of a) if (b.has(item)) intersection += 1;
    return intersection / (a.size + b.size - intersection);
  }

  function parseNyplPlace(place) {
    const raw = cleanValue(place).replace(/\[[^\]]*\]/g, "").replace(/;+$/g, "");
    if (!raw) return { city: "", state: "", country: "unknown" };
    const parts = raw
      .split(",")
      .map((part) => cleanValue(part).replace(/[".;]+$/g, ""))
      .filter(Boolean);
    const last = parts[parts.length - 1] || "";
    const stateCode = last.toUpperCase().replace(/[^A-Z]/g, "");
    const state = STATE_NAMES[stateCode] || "";
    if (parts.length > 1 && state) {
      return { city: titleCase(parts.slice(0, -1).join(", ")), state, country: "United States" };
    }
    if (/^(USA|UNITED STATES|U\.S\.A\.)$/i.test(last)) {
      return { city: titleCase(parts.slice(0, -1).join(", ")), state: "", country: "United States" };
    }
    if (parts.length > 1) {
      return { city: titleCase(parts[0]), state: "", country: titleCase(last) || "unknown" };
    }
    return { city: titleCase(raw), state: "", country: "unknown" };
  }

  function nyplImageUrl(imageId, size = "w") {
    const id = cleanValue(imageId);
    return id ? `https://images.nypl.org/index.php?id=${encodeURIComponent(id)}&t=${size}` : "";
  }

  function normalizeCiaMenu(menu) {
    const id = Number(menu.pointer || menu.sourceRecordId || menu.id);
    const uid = uidFor("cia", id);
    return {
      ...menu,
      id: Number.isFinite(id) ? id : menu.id,
      uid,
      sourceKey: "cia",
      sourceLabel: SOURCE_DEFS.cia.label,
      sourceShortLabel: SOURCE_DEFS.cia.shortLabel,
      sourceRecordId: String(id || menu.id || ""),
      sourceDataset: "CONTENTdm p16940coll1",
      sourceConfidence: "source",
      rights: menu.rights || SOURCE_DEFS.cia.rights,
      dateConfidence: menu.year ? "source" : "unknown",
      year: menu.year || yearFromDate(menu.date),
      decade: menu.decade && menu.decade !== "unknown" ? menu.decade : decadeFromDate(menu.date),
      types: menu.types || [],
      cuisine: menu.cuisine || [],
      illustrations: menu.illustrations || [],
      topDishes: menu.topDishes || [],
      itemCount: Number(menu.itemCount || 0),
      priceCount: Number(menu.priceCount || 0),
      matchCount: Number(menu.matchCount || 0),
    };
  }

  function normalizeNyplMenu(row, extras = {}) {
    const id = Number(row.id);
    const place = parseNyplPlace(row.place);
    const date = cleanValue(row.date);
    const year = yearFromDate(date);
    const restaurant = cleanValue(row.location || row.sponsor || row.name);
    const event = titleCase(row.event || "");
    const venue = titleCase(row.venue || "");
    const occasion = titleCase(row.occasion || "");
    const title = cleanValue(row.name) || [restaurant, event || occasion || "menu"].filter(Boolean).join(", ");
    const firstPage = extras.firstPage || {};
    const imageUrl = nyplImageUrl(firstPage.image_id, "w");
    const itemUrl = firstPage.uuid ? `https://digitalcollections.nypl.org/items/${firstPage.uuid}` : "https://www.nypl.org/research/support/whats-on-the-menu";

    return {
      id: uidFor("nypl", id),
      uid: uidFor("nypl", id),
      pointer: id,
      title: title || "Untitled NYPL menu",
      date,
      year,
      decade: decadeFromDate(date),
      restaurant,
      types: [event, venue, occasion].filter(Boolean),
      cuisine: [],
      illustrations: [],
      city: place.city,
      state: place.state,
      country: place.country,
      donor: "NYPL crowdsourcing contributors",
      source: `The New York Public Library What's on the Menu?${row.call_number ? `; ${row.call_number}` : ""}`,
      digitalCollection: "What's on the Menu?; Buttolph Collection of Menus",
      filetype: "nypl-image",
      find: cleanValue(firstPage.image_id),
      itemUrl,
      imageUrl,
      sourceKey: "nypl",
      sourceLabel: SOURCE_DEFS.nypl.label,
      sourceShortLabel: SOURCE_DEFS.nypl.shortLabel,
      sourceRecordId: String(id),
      sourceDataset: "NYPL WOTM CSV export",
      sourceConfidence: "crowdsourced transcript",
      rights: SOURCE_DEFS.nypl.rights,
      dateConfidence: year ? "source" : "unknown",
      pageCount: Number(row.page_count || 0),
      dishCount: Number(row.dish_count || 0),
      currency: cleanValue(row.currency),
      currencySymbol: cleanValue(row.currency_symbol),
      status: cleanValue(row.status),
      callNumber: cleanValue(row.call_number),
      physicalDescription: cleanValue(row.physical_description),
      notes: cleanValue(row.notes),
      topDishes: extras.topDishes || [],
      itemCount: Number(extras.itemCount || 0),
      priceCount: Number(extras.priceCount || 0),
      firstPage,
      matchCount: Number(extras.matchCount || 0),
    };
  }

  function countBy(menus, getter) {
    const counts = new Map();
    for (const menu of menus) {
      const values = getter(menu);
      for (const value of Array.isArray(values) ? values : [values]) {
        const key = cleanValue(value).toLowerCase();
        if (!key) continue;
        const label = cleanValue(value);
        const current = counts.get(key) || { name: label, count: 0 };
        current.count += 1;
        counts.set(key, current);
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  function summarizeMenus(menus, facets = []) {
    const knownYears = menus.map((menu) => menu.year).filter(Boolean);
    return {
      total: menus.length,
      yearMin: knownYears.length ? Math.min(...knownYears) : null,
      yearMax: knownYears.length ? Math.max(...knownYears) : null,
      facets,
      sources: countBy(menus, (menu) => menu.sourceLabel || sourceFor(menu).label),
      decades: countBy(menus, (menu) => menu.decade),
      countries: countBy(menus, (menu) => menu.country),
      states: countBy(menus, (menu) => menu.state),
      cities: countBy(menus, (menu) => menu.city),
      types: countBy(menus, (menu) => menu.types || []),
      donors: countBy(menus, (menu) => menu.donor),
      matched: menus.filter((menu) => Number(menu.matchCount || 0) > 0).length,
      bySource: countBy(menus, (menu) => menu.sourceKey || "cia"),
    };
  }

  function filterMenusBySource(payload, source) {
    const wanted = cleanValue(source || "all").toLowerCase();
    const menus = payload.menus || [];
    if (!wanted || wanted === "all") return payload;
    const filtered =
      wanted === "matched"
        ? menus.filter((menu) => Number(menu.matchCount || 0) > 0)
        : menus.filter((menu) => cleanValue(menu.sourceKey).toLowerCase() === wanted);
    return {
      ...payload,
      summary: summarizeMenus(filtered, payload.summary?.facets || []),
      menus: filtered,
    };
  }

  function buildMatchEvidence(ciaMenus, nyplMenus, limit = 3) {
    const nyplByToken = new Map();
    const preparedNypl = nyplMenus.map((menu) => prepareForMatch(menu));
    for (const entry of preparedNypl) {
      for (const token of entry.tokens) {
        if (!nyplByToken.has(token)) nyplByToken.set(token, []);
        nyplByToken.get(token).push(entry);
      }
    }

    const matchMap = {};
    const relationships = [];
    for (const cia of ciaMenus) {
      const ciaEntry = prepareForMatch(cia);
      if (!ciaEntry.tokens.size) continue;
      const candidates = new Map();
      for (const token of ciaEntry.tokens) {
        for (const nyplEntry of nyplByToken.get(token) || []) candidates.set(nyplEntry.uid, nyplEntry);
      }

      const scored = [...candidates.values()]
        .map((nyplEntry) => scoreMatch(ciaEntry, nyplEntry))
        .filter((match) => match.score >= 42)
        .sort((a, b) => b.score - a.score || Math.abs((cia.year || 0) - (a.year || 0)) - Math.abs((cia.year || 0) - (b.year || 0)))
        .slice(0, limit);

      if (!scored.length) continue;
      matchMap[ciaEntry.uid] = scored;
      for (const match of scored) {
        const inverse = {
          ...match,
          uid: ciaEntry.uid,
          sourceKey: cia.sourceKey,
          sourceLabel: cia.sourceLabel,
          sourceRecordId: cia.sourceRecordId,
          title: cia.title,
          restaurant: cia.restaurant,
          date: cia.date,
          year: cia.year,
          city: cia.city,
          state: cia.state,
          country: cia.country,
          itemUrl: cia.itemUrl,
          imageUrl: cia.imageUrl,
          evidence: match.evidence.map((item) => item.replace(/^NYPL/, "CIA")),
        };
        if (!matchMap[match.uid]) matchMap[match.uid] = [];
        matchMap[match.uid].push(inverse);
        relationships.push({
          source: ciaEntry.uid,
          target: match.uid,
          type: "same_venue_as",
          score: match.score,
          evidence: match.evidence,
        });
      }
    }

    for (const uid of Object.keys(matchMap)) {
      matchMap[uid] = matchMap[uid].sort((a, b) => b.score - a.score).slice(0, limit);
    }

    return { matchMap, relationships };
  }

  function prepareForMatch(menu) {
    const restaurant = cleanValue(menu.restaurant || menu.title);
    const venueText = restaurant || menu.title;
    return {
      uid: recordUid(menu),
      sourceKey: menu.sourceKey,
      sourceLabel: menu.sourceLabel,
      sourceRecordId: menu.sourceRecordId,
      title: menu.title,
      restaurant,
      date: menu.date,
      year: menu.year,
      decade: menu.decade,
      city: cleanValue(menu.city).toLowerCase(),
      state: cleanValue(menu.state).toLowerCase(),
      country: cleanValue(menu.country).toLowerCase(),
      itemUrl: menu.itemUrl,
      imageUrl: menu.imageUrl,
      tokens: tokenSet(venueText),
      dishTokens: tokenSet((menu.topDishes || []).join(" ")),
    };
  }

  function scoreMatch(a, b) {
    const venueOverlap = jaccard(a.tokens, b.tokens);
    const dishOverlap = jaccard(a.dishTokens, b.dishTokens);
    const sameCity = a.city && b.city && a.city === b.city;
    const sameState = a.state && b.state && a.state === b.state;
    const sameCountry = a.country && b.country && a.country === b.country;
    const yearDistance = a.year && b.year ? Math.abs(a.year - b.year) : null;
    let score = Math.round(venueOverlap * 62);
    if (sameCity) score += 22;
    else if (sameState) score += 12;
    else if (sameCountry) score += 5;
    if (yearDistance !== null) score += Math.max(0, 14 - Math.min(yearDistance, 14));
    else if (!a.year && b.year && venueOverlap >= 0.34) score += 9;
    if (dishOverlap) score += Math.round(dishOverlap * 10);

    const evidence = [];
    if (venueOverlap) evidence.push(`${Math.round(venueOverlap * 100)}% venue-name token overlap`);
    if (sameCity) evidence.push(`Same city: ${titleCase(a.city)}`);
    else if (sameState) evidence.push(`Same state: ${titleCase(a.state)}`);
    if (yearDistance !== null) evidence.push(`Dates are ${yearDistance} year${yearDistance === 1 ? "" : "s"} apart`);
    else if (!a.year && b.year) evidence.push(`NYPL dated comparator suggests ${b.decade || b.year}`);
    if (dishOverlap) evidence.push(`${Math.round(dishOverlap * 100)}% dish token overlap`);

    return {
      uid: b.uid,
      sourceKey: b.sourceKey,
      sourceLabel: b.sourceLabel,
      sourceRecordId: b.sourceRecordId,
      title: b.title,
      restaurant: b.restaurant,
      date: b.date,
      year: b.year,
      decade: b.decade,
      city: titleCase(b.city),
      state: titleCase(b.state),
      country: titleCase(b.country),
      itemUrl: b.itemUrl,
      imageUrl: b.imageUrl,
      score,
      evidence,
      suggestedDate: !a.year && b.year ? { year: b.year, decade: b.decade, confidence: Math.min(score, 95) } : null,
    };
  }

  return {
    SOURCE_DEFS,
    cleanValue,
    countBy,
    decadeFromDate,
    filterMenusBySource,
    buildMatchEvidence,
    jaccard,
    normalizeCiaMenu,
    normalizeNyplMenu,
    normalizeText,
    normalizeVenueName,
    nyplImageUrl,
    parseNyplPlace,
    recordUid,
    sourceFor,
    splitTerms,
    summarizeMenus,
    titleCase,
    tokenSet,
    uidFor,
    yearFromDate,
  };
});
