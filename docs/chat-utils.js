(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.MenuGraphChat = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const STOP_WORDS = new Set([
    "about",
    "after",
    "all",
    "also",
    "and",
    "any",
    "are",
    "around",
    "ask",
    "before",
    "between",
    "can",
    "could",
    "dish",
    "dishes",
    "does",
    "find",
    "for",
    "from",
    "have",
    "in",
    "into",
    "is",
    "like",
    "menu",
    "menus",
    "mention",
    "mentions",
    "near",
    "not",
    "of",
    "or",
    "over",
    "price",
    "prices",
    "question",
    "show",
    "that",
    "the",
    "their",
    "there",
    "these",
    "they",
    "to",
    "under",
    "was",
    "were",
    "what",
    "where",
    "which",
    "with",
    "without",
  ]);

  const ALIAS_GROUPS = {
    beef: ["beef", "steak", "sirloin", "tenderloin", "filet mignon", "fillet mignon", "roast beef", "boeuf"],
    stew: ["stew", "ragout", "ragoût", "braise", "braised", "fricassee", "casserole", "pot au feu", "goulash"],
    carrot: ["carrot", "carrots", "carotte", "carottes"],
    potato: ["potato", "potatoes", "pomme", "pommes", "pommes de terre", "mashed potatoes", "hashed potatoes"],
    mushroom: ["mushroom", "mushrooms", "champignon", "champignons"],
    oyster: ["oyster", "oysters", "blue point", "bluepoint"],
    champagne: ["champagne", "pommery", "ruinart", "moet", "moët", "clicquot"],
    lobster: ["lobster", "lobsters", "homard"],
    fish: ["fish", "bass", "salmon", "sole", "cod", "halibut", "trout"],
    chicken: ["chicken", "fowl", "poulet", "capons", "capon"],
    lamb: ["lamb", "mutton", "agneau"],
    pork: ["pork", "ham", "bacon", "sausage"],
    dessert: ["dessert", "desserts", "cake", "cakes", "ice cream", "glace", "pudding", "pastry", "pie"],
    wine: ["wine", "wines", "claret", "burgundy", "bordeaux", "sherry", "amontillado"],
    coffee: ["coffee", "cafe", "café"],
    soup: ["soup", "soups", "consomme", "consommé", "bisque", "potage"],
    salad: ["salad", "salads", "lettuce"],
  };

  const GROUP_LABELS = {
    beef: "beef/steak",
    stew: "stew or braise",
    carrot: "carrots",
    potato: "potatoes",
    mushroom: "mushrooms",
    oyster: "oysters",
    champagne: "champagne",
    lobster: "lobster",
    fish: "fish",
    chicken: "chicken",
    lamb: "lamb",
    pork: "pork",
    dessert: "desserts",
    wine: "wine",
    coffee: "coffee",
    soup: "soups",
    salad: "salads",
  };

  const SUGGESTED_QUESTIONS = [
    "beef or steak dishes that are stew with carrots and potatoes, no mushrooms",
    "oysters and champagne in New York before 1920",
    "lobster prices in Boston and New York",
    "estimated 1980s French restaurants with desserts",
    "menus with wine lists and roast duck",
  ];

  let lastDocsKey = null;
  let lastDocs = null;

  function cleanValue(value) {
    if (Array.isArray(value)) return value.map(cleanValue).filter(Boolean).join("; ");
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeText(value) {
    return cleanValue(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s.-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function titleCase(value) {
    return cleanValue(value)
      .toLowerCase()
      .split(/\s+/)
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
      .join(" ");
  }

  function asArray(value) {
    return Array.isArray(value) ? value : value ? [value] : [];
  }

  function recordUid(menu) {
    return menu?.uid || menu?.id || (menu?.sourceKey ? `${menu.sourceKey}:${menu.sourceRecordId || menu.pointer}` : `cia:${menu?.pointer || menu?.id || ""}`);
  }

  function sourceLabel(menu) {
    return menu?.sourceShortLabel || menu?.sourceLabel || (menu?.sourceKey ? String(menu.sourceKey).toUpperCase() : "CIA");
  }

  function placeLabel(menu) {
    return [menu?.city, menu?.state, menu?.country].filter(Boolean).join(", ");
  }

  function dateLabel(menu, dateEstimate) {
    if (menu?.date) return menu.date;
    if (!dateEstimate) return "Undated";
    const start = dateEstimate.estimatedNotBefore ? dateEstimate.estimatedNotBefore.slice(0, 4) : "?";
    const end = dateEstimate.estimatedNotAfter ? dateEstimate.estimatedNotAfter.slice(0, 4) : "?";
    return start === end && start !== "?" ? `Estimated ${start}` : `Estimated ${start}-${end}`;
  }

  function effectiveYear(menu, dateEstimate) {
    if (menu?.year) return Number(menu.year);
    if (dateEstimate?.estimatedCenterYear && ["A", "B", "C"].includes(dateEstimate.confidence)) {
      return Number(dateEstimate.estimatedCenterYear);
    }
    return null;
  }

  function makeDateEstimateMap(dateEstimates) {
    const records = Array.isArray(dateEstimates) ? dateEstimates : dateEstimates?.records || dateEstimates?.estimates || [];
    const map = new Map();
    for (const estimate of records) {
      const keys = [estimate.menuId, estimate.uid, estimate.menuUid, estimate.sourceRecordId].filter(Boolean);
      for (const key of keys) map.set(String(key), estimate);
    }
    return map;
  }

  function dateEstimateFor(menu, estimateMap) {
    if (!menu || !estimateMap) return null;
    const keys = [recordUid(menu), menu.uid, menu.id, menu.pointer, menu.sourceRecordId];
    if ((menu.sourceKey || "cia") === "cia" && (menu.id || menu.pointer)) keys.push(`cia:${menu.id || menu.pointer}`);
    for (const key of keys.filter(Boolean)) {
      const estimate = estimateMap.get(String(key));
      if (estimate) return estimate;
    }
    return null;
  }

  function padded(value) {
    return ` ${normalizeText(value)} `;
  }

  function includesPhrase(text, phrase) {
    const normalized = normalizeText(phrase);
    if (!normalized) return false;
    const escaped = normalized.split(/\s+/).map(escapeRegExp).join("\\s+");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
  }

  function containsGroup(searchable, group) {
    const text = searchable.startsWith(" ") ? searchable : padded(searchable);
    return (ALIAS_GROUPS[group] || [group]).some((alias) => includesPhrase(text, alias));
  }

  function groupEvidence(searchable, groups) {
    return groups.filter((group) => containsGroup(searchable, group));
  }

  function extractYears(normalizedQuestion) {
    const yearMatches = [...normalizedQuestion.matchAll(/\b(18|19|20)\d{2}\b/g)].map((match) => Number(match[0]));
    const result = {
      beforeYear: null,
      afterYear: null,
      minYear: null,
      maxYear: null,
      decade: null,
    };
    const between = normalizedQuestion.match(/\bbetween\s+((?:18|19|20)\d{2})\s+(?:and|to|-)\s+((?:18|19|20)\d{2})\b/);
    if (between) {
      result.minYear = Number(between[1]);
      result.maxYear = Number(between[2]);
    }
    const before = normalizedQuestion.match(/\bbefore\s+((?:18|19|20)\d{2})\b/);
    if (before) result.maxYear = Number(before[1]) - 1;
    const after = normalizedQuestion.match(/\bafter\s+((?:18|19|20)\d{2})\b/);
    if (after) result.minYear = Number(after[1]) + 1;
    const inYear = normalizedQuestion.match(/\bin\s+((?:18|19|20)\d{2})\b/);
    if (inYear && !result.minYear && !result.maxYear) {
      result.minYear = Number(inYear[1]);
      result.maxYear = Number(inYear[1]);
    }
    const decade = normalizedQuestion.match(/\b((?:18|19|20)\d)0s\b/);
    if (decade) {
      result.decade = `${decade[1]}0s`;
      result.minYear = Number(`${decade[1]}0`);
      result.maxYear = Number(`${decade[1]}9`);
    }
    if (!result.minYear && yearMatches.length === 1 && /\b(around|circa|near)\b/.test(normalizedQuestion)) {
      result.minYear = yearMatches[0] - 5;
      result.maxYear = yearMatches[0] + 5;
    }
    return result;
  }

  function groupIsNegated(normalizedQuestion, group) {
    const aliases = ALIAS_GROUPS[group] || [group];
    for (const alias of aliases) {
      const normalizedAlias = normalizeText(alias);
      if (!normalizedAlias) continue;
      const pattern = new RegExp(`\\b(?:without|excluding|except|no|not)\\s+(?:\\w+\\s+){0,2}${escapeRegExp(normalizedAlias)}\\b`);
      if (pattern.test(normalizedQuestion)) return true;
    }
    return false;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function parseQuestion(question) {
    const normalizedQuestion = normalizeText(question);
    const mentionedGroups = [];
    const excludedGroups = [];

    for (const group of Object.keys(ALIAS_GROUPS)) {
      const mentioned = containsGroup(padded(normalizedQuestion), group);
      if (!mentioned) continue;
      if (groupIsNegated(normalizedQuestion, group)) excludedGroups.push(group);
      else mentionedGroups.push(group);
    }

    const aliasWords = new Set(
      Object.values(ALIAS_GROUPS)
        .flat()
        .flatMap((alias) => normalizeText(alias).split(/\s+/))
        .filter(Boolean)
    );
    const keywords = normalizedQuestion
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token) && !aliasWords.has(token) && !/^\d+$/.test(token))
      .slice(0, 10);

    return {
      raw: cleanValue(question),
      normalized: normalizedQuestion,
      requiredGroups: mentionedGroups,
      excludedGroups,
      keywords,
      wantsPrices: /\b(price|prices|cost|costs|priced|cheap|cheaper|expensive|value|inflation)\b/.test(normalizedQuestion),
      wantsDish: /\b(dish|dishes|item|items|course|courses)\b/.test(normalizedQuestion),
      wantsDates: /\b(date|dates|dated|when|decade|year|estimated)\b/.test(normalizedQuestion),
      date: extractYears(normalizedQuestion),
    };
  }

  function menuSearchFields(menu) {
    return [
      menu.title,
      menu.restaurant,
      menu.city,
      menu.state,
      menu.country,
      asArray(menu.types).join(" "),
      asArray(menu.cuisine).join(" "),
      asArray(menu.topDishes).join(" "),
      menu.notes,
      menu.source,
      menu.callNumber,
    ]
      .map(cleanValue)
      .filter(Boolean)
      .join(" | ");
  }

  function makeMenuResult(menu, estimate) {
    return {
      uid: String(recordUid(menu)),
      menuId: menu.id || menu.pointer || menu.sourceRecordId,
      title: cleanValue(menu.title) || "Untitled menu",
      restaurant: cleanValue(menu.restaurant),
      date: dateLabel(menu, estimate),
      year: effectiveYear(menu, estimate),
      place: placeLabel(menu),
      source: sourceLabel(menu),
      sourceKey: menu.sourceKey || "cia",
      url: menu.itemUrl,
      estimateConfidence: estimate?.confidence || null,
    };
  }

  function decadeForYear(year) {
    if (year === null || year === undefined || year === "") return "Undated";
    const value = Number(year);
    return Number.isFinite(value) ? `${Math.floor(value / 10) * 10}s` : "Undated";
  }

  function canonicalRestaurant(match) {
    const restaurant = normalizeText(match.restaurant);
    if (restaurant) return restaurant;
    return normalizeText(match.title)
      .replace(/\b(menu|daily|dinner|luncheon|lunch|supper|breakfast|a la carte)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function resultFamilyKey(match) {
    const item = normalizeText(match.item || match.snippet || match.title).replace(/\b(browed|brown)\b/g, "browned").slice(0, 100);
    const venue = canonicalRestaurant(match);
    const date = match.year || normalizeText(match.date).slice(0, 10);
    return [item, venue, date].join("|");
  }

  function dedupeCandidates(candidates) {
    const groups = new Map();
    for (const candidate of candidates) {
      const key = resultFamilyKey(candidate);
      const group = groups.get(key);
      if (!group) {
        groups.set(key, {
          best: candidate,
          count: 1,
          uids: new Set([candidate.uid].filter(Boolean)),
        });
        continue;
      }
      group.count += 1;
      if (candidate.uid) group.uids.add(candidate.uid);
      const current = group.best;
      const candidatePlaceKnown = candidate.place && !/unknown|\?/i.test(candidate.place);
      const currentPlaceKnown = current.place && !/unknown|\?/i.test(current.place);
      if (
        candidate.score > current.score ||
        (candidate.score === current.score && candidatePlaceKnown && !currentPlaceKnown) ||
        (candidate.score === current.score && candidate.kind === "price" && current.kind !== "price")
      ) {
        group.best = candidate;
      }
    }
    return [...groups.values()].map((group) => ({
      ...group.best,
      duplicateCount: group.count,
      relatedMenuCount: group.uids.size,
    }));
  }

  function diversifiedRank(candidate, selected, counts) {
    const decade = decadeForYear(candidate.year);
    const venue = canonicalRestaurant(candidate) || normalizeText(candidate.title);
    const place = normalizeText(candidate.place) || "unknown";
    const source = candidate.sourceKey || candidate.source || "source";
    let score = candidate.score;
    score -= (counts.venues.get(venue) || 0) * 9;
    score -= (counts.places.get(place) || 0) * 4;
    score -= (counts.decades.get(decade) || 0) * 4;
    score -= (counts.sources.get(source) || 0) * 1.5;
    score += Math.min(Number(candidate.duplicateCount || 1) - 1, 4) * 0.75;
    if (candidate.year && selected.some((item) => item.year)) {
      const nearest = Math.min(...selected.filter((item) => item.year).map((item) => Math.abs(item.year - candidate.year)));
      score += Math.min(nearest, 35) / 8;
    }
    return score;
  }

  function diversifyCandidates(candidates, limit) {
    const remaining = dedupeCandidates(candidates).sort(
      (a, b) =>
        b.score - a.score ||
        (b.duplicateCount || 1) - (a.duplicateCount || 1) ||
        normalizeText(a.title).localeCompare(normalizeText(b.title))
    );
    const selected = [];
    const counts = {
      venues: new Map(),
      places: new Map(),
      decades: new Map(),
      sources: new Map(),
    };
    while (selected.length < limit && remaining.length) {
      let bestIndex = 0;
      let bestScore = -Infinity;
      for (let index = 0; index < remaining.length; index += 1) {
        const rank = diversifiedRank(remaining[index], selected, counts);
        if (rank > bestScore) {
          bestScore = rank;
          bestIndex = index;
        }
      }
      const [candidate] = remaining.splice(bestIndex, 1);
      candidate.rankScore = Number(bestScore.toFixed(2));
      selected.push(candidate);
      const venue = canonicalRestaurant(candidate) || normalizeText(candidate.title);
      const place = normalizeText(candidate.place) || "unknown";
      const decade = decadeForYear(candidate.year);
      const source = candidate.sourceKey || candidate.source || "source";
      counts.venues.set(venue, (counts.venues.get(venue) || 0) + 1);
      counts.places.set(place, (counts.places.get(place) || 0) + 1);
      counts.decades.set(decade, (counts.decades.get(decade) || 0) + 1);
      counts.sources.set(source, (counts.sources.get(source) || 0) + 1);
    }
    return selected;
  }

  function buildSearchDocuments({ menus, prices, dateEstimates } = {}) {
    const menuList = Array.isArray(menus) ? menus : menus?.menus || [];
    const priceRecords = Array.isArray(prices) ? prices : prices?.records || [];
    const estimateMap = makeDateEstimateMap(dateEstimates);
    const menuMap = new Map();
    const docs = [];

    for (const menu of menuList) {
      const uid = String(recordUid(menu));
      const estimate = dateEstimateFor(menu, estimateMap);
      const base = makeMenuResult(menu, estimate);
      menuMap.set(uid, { menu, estimate, base });
      if (menu?.id || menu?.pointer) menuMap.set(String(menu.id || menu.pointer), { menu, estimate, base });
      if (menu?.sourceRecordId) menuMap.set(String(menu.sourceRecordId), { menu, estimate, base });

      docs.push({
        kind: "menu",
        item: "",
        snippet: asArray(menu.topDishes).slice(0, 5).join("; "),
        searchable: padded(menuSearchFields(menu)),
        base,
      });

      for (const dish of asArray(menu.topDishes).slice(0, 18)) {
        docs.push({
          kind: "dish",
          item: cleanValue(dish),
          snippet: cleanValue(dish),
          searchable: padded([dish, menu.title, menu.restaurant, placeLabel(menu), asArray(menu.types).join(" ")].join(" | ")),
          base,
        });
      }
    }

    for (const record of priceRecords) {
      const uid = String(record.menuUid || record.menuId || "");
      const linked = menuMap.get(uid) || menuMap.get(String(record.menuId || "")) || {};
      const menu = linked.menu || {
        id: record.menuId,
        uid,
        title: record.menuTitle,
        date: record.year ? String(record.year) : "",
        year: record.year,
        city: record.place,
        country: record.country,
        sourceKey: record.sourceKey,
        itemUrl: record.sourceUrl,
      };
      const base = linked.base || makeMenuResult(menu, linked.estimate);
      const priceLabel = record.rawPrice || (record.amount ? String(record.amount) : "");
      docs.push({
        kind: "price",
        item: cleanValue(record.item),
        snippet: cleanValue(record.rawLine || `${record.item} ${priceLabel}`),
        searchable: padded([record.item, record.rawLine, record.currency, record.place, record.country, base.title, base.restaurant].join(" | ")),
        base: {
          ...base,
          uid: uid || base.uid,
          year: Number(record.year) || base.year,
          place: cleanValue(record.place) || base.place,
        },
        price: {
          rawPrice: record.rawPrice,
          amount: record.amount,
          currency: record.currency,
          todayUsd: record.normalized?.todayUsd,
          confidence: record.confidence,
        },
      });
    }

    return docs;
  }

  function cacheKeyFor(inputs) {
    const menuCount = Array.isArray(inputs.menus) ? inputs.menus.length : inputs.menus?.menus?.length || 0;
    const priceCount = Array.isArray(inputs.prices) ? inputs.prices.length : inputs.prices?.records?.length || 0;
    const dateCount = Array.isArray(inputs.dateEstimates) ? inputs.dateEstimates.length : inputs.dateEstimates?.records?.length || 0;
    return `${menuCount}:${priceCount}:${dateCount}`;
  }

  function getSearchDocuments(inputs) {
    const key = cacheKeyFor(inputs);
    if (key === lastDocsKey && lastDocs) return lastDocs;
    lastDocsKey = key;
    lastDocs = buildSearchDocuments(inputs);
    return lastDocs;
  }

  function keywordScore(searchable, keywords) {
    let score = 0;
    const hits = [];
    for (const keyword of keywords) {
      if (includesPhrase(searchable, keyword)) {
        score += 2;
        hits.push(keyword);
      }
    }
    return { score, hits };
  }

  function datePasses(year, parsedDate) {
    if (!parsedDate?.minYear && !parsedDate?.maxYear) return true;
    if (!year) return false;
    if (parsedDate.minYear && year < parsedDate.minYear) return false;
    if (parsedDate.maxYear && year > parsedDate.maxYear) return false;
    return true;
  }

  function runSearch(docs, parsed, { minimumRequired = null, limit = 36, candidateLimit = 260 } = {}) {
    const required = parsed.requiredGroups || [];
    const minimum = minimumRequired === null ? required.length : minimumRequired;
    const candidates = [];
    const seen = new Set();

    for (const doc of docs) {
      if (parsed.wantsDish && required.length > 1 && doc.kind === "menu") continue;
      if (!datePasses(doc.base.year, parsed.date)) continue;
      const excludedHits = groupEvidence(doc.searchable, parsed.excludedGroups || []);
      if (excludedHits.length) continue;

      const groupHits = groupEvidence(doc.searchable, required);
      if (groupHits.length < minimum) continue;

      const keyword = keywordScore(doc.searchable, parsed.keywords || []);
      if (!required.length && keyword.score < 2) continue;

      let score = groupHits.length * 12 + keyword.score;
      if (minimum < required.length && required[0] && !groupHits.includes(required[0])) score -= 8;
      if (doc.kind === "dish") score += 5;
      if (doc.kind === "price") score += parsed.wantsPrices ? 8 : 2;
      if (doc.kind === "menu") score += 1;
      if (doc.base.estimateConfidence && ["A", "B", "C"].includes(doc.base.estimateConfidence)) score += 1;
      if (parsed.normalized && doc.item && normalizeText(doc.item).includes(parsed.normalized.slice(0, 32))) score += 3;

      const dedupeKey = `${doc.kind}:${doc.base.uid}:${normalizeText(doc.item || doc.snippet).slice(0, 80)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      candidates.push({
        ...doc.base,
        kind: doc.kind,
        item: doc.item,
        snippet: doc.snippet,
        score,
        reasons: [
          ...groupHits.map((group) => GROUP_LABELS[group] || group),
          ...keyword.hits.slice(0, 4),
          doc.kind === "price" ? "price row" : "",
        ].filter(Boolean),
        price: doc.price || null,
      });
    }

    const sorted = candidates
      .sort(
        (a, b) =>
          b.score - a.score ||
          normalizeText(a.title).localeCompare(normalizeText(b.title)) ||
          (a.year || 9999) - (b.year || 9999)
      )
      .slice(0, candidateLimit);
    const deduped = dedupeCandidates(sorted);
    return {
      matches: diversifyCandidates(sorted, limit),
      totalCandidates: candidates.length,
      dedupedCandidates: deduped.length,
      duplicateCandidates: Math.max(0, candidates.length - deduped.length),
    };
  }

  function searchDocuments(docs, parsed, options = {}) {
    return runSearch(docs, parsed, options).matches;
  }

  function answerIntro(parsed, exactCount, relaxed) {
    const required = parsed.requiredGroups.map((group) => GROUP_LABELS[group] || group);
    const excluded = parsed.excludedGroups.map((group) => GROUP_LABELS[group] || group);
    const constraints = [
      required.length ? `requiring ${required.join(", ")}` : "",
      excluded.length ? `excluding ${excluded.join(", ")}` : "",
      parsed.date?.minYear || parsed.date?.maxYear ? `within ${parsed.date.minYear || "start"}-${parsed.date.maxYear || "latest"}` : "",
    ].filter(Boolean);

    if (relaxed) {
      return `No exact candidate matched every constraint in the committed index. Showing ${exactCount.toLocaleString()} diversified candidate${exactCount === 1 ? "" : "s"} after relaxing one requirement.`;
    }
    if (exactCount) {
      return `Found ${exactCount.toLocaleString()} candidate${exactCount === 1 ? "" : "s"} ${constraints.length ? constraints.join("; ") : "for this question"}.`;
    }
    return `No matching candidate was found in the committed menu, dish, price, and metadata index.`;
  }

  function summarizeMatches(matches) {
    return matches
      .slice(0, 5)
      .map((match, index) => {
        const item = match.item || match.snippet || match.title;
        const when = match.year ? String(match.year) : match.date || "undated";
        const where = match.place ? `, ${match.place}` : "";
        const price = match.price?.rawPrice ? `; ${match.price.rawPrice} ${match.price.currency || ""}` : "";
        return `${index + 1}. ${item} - ${match.title} (${when}${where}, ${match.source})${price}`;
      })
      .join("\n");
  }

  function countFacet(matches, getter, limit = 10) {
    const counts = new Map();
    for (const match of matches || []) {
      const raw = getter(match);
      const values = Array.isArray(raw) ? raw : [raw];
      for (const value of values) {
        const label = cleanValue(value);
        if (!label) continue;
        const key = normalizeText(label) || label;
        const existing = counts.get(key) || { name: label, count: 0 };
        existing.count += 1;
        counts.set(key, existing);
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, limit);
  }

  function decadeSortValue(decade) {
    const match = String(decade || "").match(/\d{4}/);
    return match ? Number(match[0]) : 9999;
  }

  function buildResultFacets(matches) {
    const timeline = countFacet(matches, (match) => decadeForYear(match.year), 24).sort(
      (a, b) => decadeSortValue(a.name) - decadeSortValue(b.name)
    );
    const years = matches.map((match) => (match.year === null || match.year === undefined || match.year === "" ? NaN : Number(match.year))).filter(Number.isFinite);
    return {
      timeline,
      places: countFacet(matches, (match) => match.place || "Unknown", 10),
      restaurants: countFacet(matches, (match) => match.restaurant || match.title, 10),
      sources: countFacet(matches, (match) => match.source || "Source", 6),
      reasons: countFacet(matches, (match) => match.reasons || [], 10),
      yearMin: years.length ? Math.min(...years) : null,
      yearMax: years.length ? Math.max(...years) : null,
    };
  }

  function answerQuestion(inputs = {}) {
    const question = cleanValue(inputs.question);
    const parsed = parseQuestion(question);
    const docs = getSearchDocuments(inputs);
    const exactSearch = runSearch(docs, parsed, { limit: inputs.limit || 36 });
    const exactMatches = exactSearch.matches;
    const relaxedMinimum = parsed.requiredGroups.length > 1 ? parsed.requiredGroups.length - 1 : parsed.requiredGroups.length;
    const relaxedSearch = exactMatches.length
      ? { matches: [], totalCandidates: 0, dedupedCandidates: 0, duplicateCandidates: 0 }
      : runSearch(docs, parsed, { minimumRequired: relaxedMinimum, limit: inputs.limit || 36 });
    const relaxedMatches = relaxedSearch.matches;
    const matches = exactMatches.length ? exactMatches : relaxedMatches;
    const activeSearch = exactMatches.length ? exactSearch : relaxedSearch;
    const intro = answerIntro(parsed, activeSearch.dedupedCandidates || matches.length, !exactMatches.length && relaxedMatches.length);
    const body = matches.length
      ? `${intro}\n\n${summarizeMatches(matches)}`
      : `${intro}\n\nTry one fewer ingredient, a broader protein term, or a place/date constraint.`;
    const caveats = [
      "Static chat searches committed menu metadata, top dish summaries, structured NYPL dish rows, extracted price rows, and date estimate metadata.",
      "CIA OCR transcripts are only represented where they were already indexed into static snapshots or price/text-derived fields.",
      "Matches are evidence candidates, not full culinary assertions; open a menu to inspect the source image/transcription.",
    ];

    return {
      question,
      engine: "local-retrieval",
      answer: body,
      matches,
      facets: buildResultFacets(matches),
      parsed,
      searched: {
        documents: docs.length,
        exactMatches: exactSearch.dedupedCandidates,
        relaxedMatches: relaxedSearch.dedupedCandidates,
        returnedMatches: matches.length,
        duplicateCandidates: activeSearch.duplicateCandidates,
      },
      caveats,
      suggestions: SUGGESTED_QUESTIONS,
    };
  }

  return {
    aliases: ALIAS_GROUPS,
    answerQuestion,
    buildSearchDocuments,
    normalizeText,
    parseQuestion,
    searchDocuments,
    suggestedQuestions: SUGGESTED_QUESTIONS,
  };
});
