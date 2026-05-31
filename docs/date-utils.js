(function () {
  const VERSION = 1;
  const CURRENT_YEAR = new Date().getFullYear();
  const EARLIEST_YEAR = 1700;
  const LATEST_YEAR = Math.max(CURRENT_YEAR, 2026);
  const CONFIDENCE_RANK = { A: 4, B: 3, C: 2, D: 1, X: 0 };

  function cleanValue(value) {
    if (Array.isArray(value)) return value.join("; ");
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeText(value) {
    return cleanValue(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function normalizeKey(value) {
    return normalizeText(value)
      .replace(/\([^)]*\)/g, " ")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\b(restaurant|restaurants|hotel|hotels|cafe|bar|grill|room|rooms|the)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function safeYear(value) {
    const year = Number(value);
    if (!Number.isInteger(year) || year < EARLIEST_YEAR || year > LATEST_YEAR) return null;
    return year;
  }

  function yearFromDate(value) {
    const match = cleanValue(value).match(/\b(17|18|19|20)\d{2}\b/);
    return match ? safeYear(match[0]) : null;
  }

  function decadeFromYear(value) {
    const year = safeYear(value);
    return year ? `${Math.floor(year / 10) * 10}s` : null;
  }

  function rangeFromDecade(value) {
    const match = cleanValue(value).match(/\b(17|18|19|20)\d0s\b/i);
    if (!match) return null;
    const start = safeYear(match[0].slice(0, 4));
    return start ? { min: start, max: start + 9, center: start + 5 } : null;
  }

  function sourceFamily(source) {
    const match = cleanValue(source).match(/Menu Collection;\s*([^;]+)/i);
    return match ? normalizeKey(match[1]) : "";
  }

  function menuSeries(source) {
    const match = cleanValue(source).match(/\b(?:menu|cia)\s+(\d{1,3})-/i);
    return match ? match[1] : "";
  }

  function restaurantKey(menu) {
    const key = normalizeKey(menu.restaurant || "");
    if (key && key !== "unidentified menu") return key;
    return "";
  }

  function clusterKey(menu) {
    const family = sourceFamily(menu.source);
    const series = menuSeries(menu.source);
    return family && series ? `${family}::${series}` : "";
  }

  function placeText(menu) {
    return [menu.city, menu.state, menu.country].map(cleanValue).filter(Boolean).join(", ");
  }

  function menuText(menu, includeSource = true) {
    const fields = [
      menu.title,
      menu.restaurant,
      menu.date,
      menu.city,
      menu.state,
      menu.country,
      menu.types?.join(" "),
      menu.cuisine?.join(" "),
    ];
    if (includeSource) fields.push(menu.source, menu.donor);
    return fields.map(cleanValue).filter(Boolean).join(" ");
  }

  function median(values) {
    const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    if (!sorted.length) return null;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  function statsFromYears(years) {
    const clean = years.map(safeYear).filter(Boolean).sort((a, b) => a - b);
    if (!clean.length) return null;
    const min = clean[0];
    const max = clean[clean.length - 1];
    return {
      count: clean.length,
      min,
      max,
      center: median(clean),
      width: max - min,
      years: clean,
    };
  }

  function buildStats(menus, keyGetter) {
    const buckets = new Map();
    for (const menu of menus) {
      const year = safeYear(menu.year) || yearFromDate(menu.date);
      const key = keyGetter(menu);
      if (!year || !key) continue;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(year);
    }
    const stats = new Map();
    for (const [key, years] of buckets) {
      const stat = statsFromYears(years);
      if (stat) stats.set(key, stat);
    }
    return stats;
  }

  function confidenceMin(a, b) {
    return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
  }

  function addEvidence(evidence, item) {
    evidence.push({
      type: item.type,
      value: item.value,
      effect: item.effect,
      source: item.source || "MenuGraph date inference",
      confidence: item.confidence || "C",
    });
  }

  function addMethod(methods, method) {
    if (method && !methods.includes(method)) methods.push(method);
  }

  function addCandidate(candidates, candidate) {
    const min = safeYear(candidate.min);
    const max = safeYear(candidate.max);
    if (!min || !max || min > max) return;
    candidates.push({
      min,
      max,
      center: safeYear(candidate.center) || median([min, max]),
      confidence: candidate.confidence || "C",
      method: candidate.method,
      source: candidate.source || "",
      weight: Number(candidate.weight || 1),
    });
  }

  function applyBound(bounds, type, year, evidence, item) {
    const safe = safeYear(year);
    if (!safe) return;
    if (type === "lower") bounds.lower = Math.max(bounds.lower || EARLIEST_YEAR, safe);
    if (type === "upper") bounds.upper = Math.min(bounds.upper || LATEST_YEAR, safe);
    addEvidence(evidence, { ...item, effect: `${type === "lower" ? "not before" : "not after"} ${safe}` });
  }

  function parseDirectDateClues(menu, evidence, candidates, bounds, methods) {
    const titleAndDate = normalizeText([menu.title, menu.date].join(" "));
    const source = normalizeText(menu.source);
    const directPatterns = [
      /\b(?:thanksgiving|christmas|easter|new year'?s eve|new year'?s day|world'?s fair|bicentennial)\b.{0,36}\b((?:17|18|19|20)\d{2})\b/g,
      /\b(?:copyright|revised|rev\.?|effective|dated|printed|postmark|opened|closed|established|since|ca\.?|circa)\s*(?:in|on|about|around)?\s*((?:17|18|19|20)\d{2})\b/g,
      /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2},?\s+((?:17|18|19|20)\d{2})\b/g,
      /\b\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+((?:17|18|19|20)\d{2})\b/g,
    ];

    for (const pattern of directPatterns) {
      for (const match of titleAndDate.matchAll(pattern)) {
        const year = safeYear(match[1]);
        if (!year) continue;
        addCandidate(candidates, {
          min: year,
          max: year,
          center: year,
          confidence: "A",
          method: "direct-date-clue",
          weight: 5,
        });
        addEvidence(evidence, {
          type: "direct_date",
          value: match[0],
          effect: `candidate year ${year}`,
          source: "menu title/date metadata",
          confidence: "A",
        });
        addMethod(methods, "direct-date-clue");
      }
    }

    for (const match of source.matchAll(/\b(?:copyright|revised|effective|dated|printed|postmark|opened|closed|since|ca\.?|circa)\s*(?:in|on|about|around)?\s*((?:17|18|19|20)\d{2})\b/g)) {
      const year = safeYear(match[1]);
      if (!year) continue;
      addCandidate(candidates, {
        min: year,
        max: year,
        center: year,
        confidence: "B",
        method: "source-date-clue",
        weight: 3,
      });
      addEvidence(evidence, {
        type: "source_date",
        value: match[0],
        effect: `candidate year ${year}`,
        source: "source metadata",
        confidence: "B",
      });
      addMethod(methods, "source-date-clue");
    }

    for (const match of titleAndDate.matchAll(/\bopened\s+(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/g)) {
      const rawYear = Number(match[3]);
      const year = safeYear(rawYear < 100 ? 1900 + rawYear : rawYear);
      if (!year) continue;
      applyBound(bounds, "lower", year, evidence, {
        type: "opening_note",
        value: match[0],
        source: "menu title/date metadata",
        confidence: "B",
      });
      addMethod(methods, "direct-date-bound");
    }
  }

  function applyCatalogDecade(menu, evidence, candidates, methods) {
    const originalDecade = cleanValue(menu.decade);
    if (!originalDecade || originalDecade.toLowerCase() === "unknown") return;
    const range = rangeFromDecade(originalDecade);
    if (!range) return;
    addCandidate(candidates, {
      ...range,
      confidence: "B",
      method: "source-decade",
      weight: 4,
    });
    addEvidence(evidence, {
      type: "catalog_decade",
      value: originalDecade,
      effect: `${range.min}-${range.max}`,
      source: "CIA metadata decade",
      confidence: "B",
    });
    addMethod(methods, "source-decade");
  }

  function entryMatchesMenu(menu, entry) {
    const haystack = normalizeText([menu.restaurant, menu.title].join(" "));
    const needle = normalizeText(entry.restaurant || entry.name || "");
    if (!needle || !haystack.includes(needle)) return false;
    if (entry.city && normalizeText(menu.city) && normalizeText(menu.city) !== normalizeText(entry.city)) return false;
    if (entry.state && normalizeText(menu.state) && normalizeText(menu.state) !== normalizeText(entry.state)) return false;
    if (entry.country && normalizeText(menu.country) && normalizeText(menu.country) !== normalizeText(entry.country)) return false;
    return true;
  }

  function applyRestaurantRanges(menu, references, evidence, candidates, bounds, methods) {
    for (const entry of references.restaurantRanges || []) {
      if (!entryMatchesMenu(menu, entry)) continue;
      const min = safeYear(entry.notBefore);
      const max = safeYear(entry.notAfter);
      if (min) {
        applyBound(bounds, "lower", min, evidence, {
          type: "restaurant_history",
          value: entry.label || entry.restaurant,
          source: entry.source || "curated restaurant range",
          confidence: entry.confidence || "B",
        });
      }
      if (max) {
        applyBound(bounds, "upper", max, evidence, {
          type: "restaurant_history",
          value: entry.label || entry.restaurant,
          source: entry.source || "curated restaurant range",
          confidence: entry.confidence || "B",
        });
      }
      if (min && max) {
        addCandidate(candidates, {
          min,
          max,
          center: safeYear(entry.centerYear) || median([min, max]),
          confidence: entry.confidence || "B",
          method: "restaurant-history",
          weight: Number(entry.weight || 3),
          source: entry.source,
        });
      }
      addMethod(methods, "restaurant-history");
    }
  }

  function applyClueRules(menu, references, evidence, candidates, bounds, methods) {
    const text = normalizeText(menuText(menu));
    const place = normalizeText(placeText(menu));

    for (const clue of references.dateClues?.lowerBounds || []) {
      const terms = clue.terms || [];
      const regexes = clue.patterns || [];
      const matchedTerm = terms.find((term) => text.includes(normalizeText(term)));
      const matchedPattern = regexes.find((pattern) => new RegExp(pattern, "i").test(menuText(menu)));
      if (!matchedTerm && !matchedPattern) continue;
      applyBound(bounds, "lower", clue.notBefore, evidence, {
        type: clue.type || "metadata_clue",
        value: matchedTerm || clue.label,
        source: clue.source || "date clue dictionary",
        confidence: clue.confidence || "C",
      });
      addMethod(methods, clue.method || "date-clue");
    }

    if (/\b[A-Z]{2}\s+\d{5}-\d{4}\b/.test(menuText(menu))) {
      applyBound(bounds, "lower", 1983, evidence, {
        type: "postal_clue",
        value: "ZIP+4 format",
        source: "date clue dictionary",
        confidence: "B",
      });
      addMethod(methods, "postal-clue");
    } else if (/\b[A-Z]{2}\s+\d{5}\b/.test(menuText(menu))) {
      applyBound(bounds, "lower", 1963, evidence, {
        type: "postal_clue",
        value: "U.S. ZIP code format",
        source: "date clue dictionary",
        confidence: "B",
      });
      addMethod(methods, "postal-clue");
    }

    if (/\b[A-Z]{2,3}\s?\d[- ]\d{4}\b/.test(menuText(menu))) {
      addCandidate(candidates, {
        min: 1940,
        max: 1975,
        center: 1960,
        confidence: "C",
        method: "phone-exchange",
        weight: 1.5,
      });
      addEvidence(evidence, {
        type: "phone_clue",
        value: "telephone exchange format",
        effect: "soft 1940-1975 cue",
        source: "date clue dictionary",
        confidence: "C",
      });
      addMethod(methods, "phone-exchange");
    }

    if (/\b(?:https?:\/\/|www\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i.test(menuText(menu))) {
      applyBound(bounds, "lower", 1993, evidence, {
        type: "digital_contact_clue",
        value: "website/email printed",
        source: "date clue dictionary",
        confidence: "B",
      });
      addMethod(methods, "digital-contact");
    }

    if (place.includes("hyde park") || /\b(escoffier room|epicurean room|american bounty|caterina de medici|apple pie bakery|st\.? andrew'?s cafe)\b/.test(text)) {
      applyBound(bounds, "lower", 1972, evidence, {
        type: "institutional_history",
        value: "CIA Hyde Park venue/location",
        source: "date clue dictionary",
        confidence: "B",
      });
      addMethod(methods, "institutional-history");
    }
  }

  function applyContextStats(menu, context, evidence, candidates, methods) {
    const restaurant = restaurantKey(menu);
    const restaurantStats = restaurant ? context.restaurantStats.get(restaurant) : null;
    if (restaurantStats) {
      const confidence = restaurantStats.count >= 2 && restaurantStats.width <= 25 ? "B" : "C";
      const weight = restaurantStats.count >= 2 ? 2.5 : 1.5;
      addCandidate(candidates, {
        min: restaurantStats.min,
        max: restaurantStats.max,
        center: restaurantStats.center,
        confidence,
        method: "same-restaurant-siblings",
        weight,
      });
      addEvidence(evidence, {
        type: "same_restaurant",
        value: cleanValue(menu.restaurant),
        effect: `${restaurantStats.count} dated sibling${restaurantStats.count === 1 ? "" : "s"} span ${restaurantStats.min}-${restaurantStats.max}`,
        source: "dated records in CIA snapshot",
        confidence,
      });
      addMethod(methods, "same-restaurant-siblings");
    }

    const cluster = clusterKey(menu);
    const clusterStats = cluster ? context.clusterStats.get(cluster) : null;
    if (clusterStats && clusterStats.count >= 5 && clusterStats.width <= 40) {
      addCandidate(candidates, {
        min: clusterStats.min,
        max: clusterStats.max,
        center: clusterStats.center,
        confidence: "C",
        method: "donor-series-cluster",
        weight: 1.2,
      });
      addEvidence(evidence, {
        type: "donor_series",
        value: cluster,
        effect: `${clusterStats.count} dated records in series span ${clusterStats.min}-${clusterStats.max}`,
        source: "dated records in CIA snapshot",
        confidence: "C",
      });
      addMethod(methods, "donor-series-cluster");
    }
  }

  function pickCandidate(candidates, bounds) {
    const lower = bounds.lower || EARLIEST_YEAR;
    const upper = bounds.upper || LATEST_YEAR;
    const viable = candidates
      .map((candidate) => {
        const min = Math.max(candidate.min, lower);
        const max = Math.min(candidate.max, upper);
        if (min > max) return null;
        return { ...candidate, min, max, center: clampYear(candidate.center, min, max), width: max - min };
      })
      .filter(Boolean);
    viable.sort((a, b) => {
      const rank = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
      if (rank) return rank;
      const weight = b.weight - a.weight;
      if (weight) return weight;
      return a.width - b.width;
    });
    return viable[0] || null;
  }

  function clampYear(year, min, max) {
    const safe = safeYear(year) || median([min, max]);
    return Math.min(Math.max(safe, min), max);
  }

  function confidenceForBoundedRange(min, max) {
    const width = max - min;
    if (width <= 10) return "B";
    if (width <= 35) return "C";
    return "D";
  }

  function finalizeUnknown(menu, evidence, methods, candidates, bounds) {
    if (bounds.lower && bounds.upper && bounds.lower > bounds.upper) {
      return {
        menuId: menu.id,
        title: menu.title,
        restaurant: menu.restaurant,
        place: placeText(menu),
        originalDate: cleanValue(menu.date),
        originalYear: safeYear(menu.year),
        originalDecade: cleanValue(menu.decade) || "unknown",
        dateBasis: "conflict",
        estimatedNotBefore: bounds.lower,
        estimatedNotAfter: bounds.upper,
        estimatedCenterYear: null,
        estimatedDecade: null,
        confidence: "X",
        methods,
        evidence,
        reviewStatus: "needs_review",
      };
    }

    const candidate = pickCandidate(candidates, bounds);
    let min = candidate?.min || bounds.lower || null;
    let max = candidate?.max || bounds.upper || null;
    let center = candidate?.center || null;
    let confidence = candidate?.confidence || null;
    let dateBasis = candidate?.method === "source-decade" ? "source-decade" : candidate ? "inferred" : "unknown";

    if (min && max && !center && max - min <= 35) center = median([min, max]);
    if (min && max && !confidence) confidence = confidenceForBoundedRange(min, max);
    if ((min || max) && !confidence) confidence = "D";
    if (!min && !max && !center) {
      confidence = "D";
      dateBasis = "unknown";
    }

    const width = min && max ? max - min : null;
    const estimatedDecade = center && width !== null && width <= 35 ? decadeFromYear(center) : null;

    return {
      menuId: menu.id,
      title: menu.title,
      restaurant: menu.restaurant,
      place: placeText(menu),
      originalDate: cleanValue(menu.date),
      originalYear: safeYear(menu.year),
      originalDecade: cleanValue(menu.decade) || "unknown",
      dateBasis,
      estimatedNotBefore: min,
      estimatedNotAfter: max,
      estimatedCenterYear: center && estimatedDecade ? center : null,
      estimatedDecade,
      confidence: confidence || "D",
      methods,
      evidence,
      reviewStatus: confidence === "X" || confidence === "D" ? "needs_review" : "machine_inferred",
    };
  }

  function estimateDateForMenu(menu, context = {}) {
    const originalYear = safeYear(menu.year) || yearFromDate(menu.date);
    const originalDecade = cleanValue(menu.decade) || "unknown";
    if (originalYear) {
      return {
        menuId: menu.id,
        title: menu.title,
        restaurant: menu.restaurant,
        place: placeText(menu),
        originalDate: cleanValue(menu.date),
        originalYear,
        originalDecade,
        dateBasis: "source",
        estimatedNotBefore: originalYear,
        estimatedNotAfter: originalYear,
        estimatedCenterYear: originalYear,
        estimatedDecade: decadeFromYear(originalYear),
        confidence: "A",
        methods: ["source-date"],
        evidence: [
          {
            type: "source_date",
            value: cleanValue(menu.date) || String(originalYear),
            effect: `source year ${originalYear}`,
            source: "CIA metadata date",
            confidence: "A",
          },
        ],
        reviewStatus: "source_provided",
      };
    }

    const references = context.references || {};
    const evidence = [];
    const methods = [];
    const candidates = [];
    const bounds = { lower: null, upper: null };

    parseDirectDateClues(menu, evidence, candidates, bounds, methods);
    applyCatalogDecade(menu, evidence, candidates, methods);
    applyRestaurantRanges(menu, references, evidence, candidates, bounds, methods);
    applyClueRules(menu, references, evidence, candidates, bounds, methods);
    applyContextStats(menu, context, evidence, candidates, methods);

    return finalizeUnknown(menu, evidence, methods, candidates, bounds);
  }

  function countBy(records, getter) {
    const map = new Map();
    for (const record of records) {
      const value = getter(record);
      const key = cleanValue(value || "unknown");
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Object.fromEntries([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }

  function buildDateEstimateSnapshot({ menus, references = {}, generatedAt = new Date().toISOString() } = {}) {
    const safeMenus = Array.isArray(menus) ? menus : [];
    const context = {
      references,
      restaurantStats: buildStats(safeMenus, restaurantKey),
      clusterStats: buildStats(safeMenus, clusterKey),
    };
    const records = safeMenus.map((menu) => estimateDateForMenu(menu, context));
    const sourceYear = records.filter((record) => record.dateBasis === "source").length;
    const sourceDecade = records.filter((record) => record.dateBasis === "source-decade").length;
    const inferred = records.filter((record) => record.dateBasis === "inferred").length;
    const inferredUnknowns = records.filter((record) => !record.originalYear && record.dateBasis === "inferred").length;
    const enrichedUnknowns = records.filter((record) => !record.originalYear && ["inferred", "source-decade"].includes(record.dateBasis)).length;
    const remainingUnknown = records.filter((record) => !record.estimatedDecade && record.confidence !== "A").length;

    return {
      version: VERSION,
      createdAt: generatedAt,
      totalRecords: records.length,
      records,
      summary: {
        total: records.length,
        sourceYear,
        sourceDecade,
        inferred,
        inferredUnknowns,
        enrichedUnknowns,
        remainingUnknown,
        confidence: countBy(records, (record) => record.confidence),
        methods: countBy(records.flatMap((record) => record.methods.map((method) => ({ method }))), (record) => record.method),
        sourceDecadeCorrections: records.filter((record) => record.originalYear && record.originalDecade.toLowerCase() === "unknown").length,
      },
      sources: {
        dateClues: references.dateClues?.source || "MenuGraph date clue dictionary",
        restaurantRanges: references.restaurantRangesSource || "Curated restaurant ranges seeded from agent research notes",
        siblingStats: "Dated records in docs/data/menus.json",
      },
    };
  }

  const api = {
    VERSION,
    buildDateEstimateSnapshot,
    decadeFromYear,
    estimateDateForMenu,
    normalizeKey,
    yearFromDate,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.MenuGraphDates = api;
  }
})();
