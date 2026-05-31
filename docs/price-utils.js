const MenuGraphPrices = (() => {
  const VERSION = 2;

  const COUNTRY_TO_ISO3 = {
    "united states": "USA",
    canada: "CAN",
    "united kingdom": "GBR",
    england: "GBR",
    scotland: "GBR",
    france: "FRA",
    germany: "DEU",
    mexico: "MEX",
    bahamas: "BHS",
    italy: "ITA",
    spain: "ESP",
    switzerland: "CHE",
  };

  const COUNTRY_TO_CURRENCY = {
    "united states": "USD",
    canada: "CAD",
    "united kingdom": "GBP",
    england: "GBP",
    scotland: "GBP",
    france: "FRF",
    germany: "DEM",
    mexico: "MXN",
    bahamas: "BSD",
    italy: "ITL",
    spain: "ESP",
    switzerland: "CHF",
  };

  const CURRENCY_LABELS = {
    USD: "U.S. dollars",
    CAD: "Canadian dollars",
    GBP: "British pounds",
    FRF: "French francs",
    DEM: "German marks",
    MXN: "Mexican pesos",
    BSD: "Bahamian dollars",
    ITL: "Italian lire",
    ESP: "Spanish pesetas",
    CHF: "Swiss francs",
    EUR: "Euros",
    UNKNOWN: "Unknown currency",
  };

  function titleCase(value) {
    return String(value || "")
      .split(/\s+/)
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
      .join(" ");
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/[“”]/g, '"')
      .replace(/[’]/g, "'")
      .replace(/[•·]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function numeric(value) {
    const normalized = String(value || "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  }

  const FOOD_SIGNAL =
    /\b(?:appetizers?|bacon|bass|beef|beer|bisque|brandy|bread|breakfast|brie|broiled|brut|burgundy|cake|cakes|caviar|champagne|cheese|chicken|chop|chops|chowder|clam|clams|cocktail|coffee|consomme|crab|cream|dessert|dinner|duck|egg|eggs|fish|filet|fillet|fried|fruit|glace|grilled|ham|ice cream|lamb|lobster|luncheon|mackerels?|meal|mignon|milk|oil|oyster|oysters|pie|port|potatoes|pudding|rice|roast|salad|salmon|sandwich|sauce|sauterne|sherry|shrimp|sirloin|soup|steak|stew|tea|tenderloin|tomato|tomatoes|trout|turkey|veal|vegetable|vegetables|wine)\b/i;

  const NON_MENU_SIGNAL =
    /\b(?:address|avenue|birth rate|copyright|departure|fare|health|highway|miles|passenger|population|production|publisher|railroad|railway|street|telephone|ticket|timetable|travel|value production)\b/i;

  function countryKey(menu) {
    return String(menu?.country || "").trim().toLowerCase();
  }

  function iso3ForMenu(menu) {
    return COUNTRY_TO_ISO3[countryKey(menu)] || "";
  }

  function defaultCurrencyForMenu(menu) {
    return COUNTRY_TO_CURRENCY[countryKey(menu)] || "UNKNOWN";
  }

  function currencyForToken(token, menu) {
    const raw = String(token || "").toLowerCase();
    if (raw.includes("$") || /(?:cents?|cts?|¢)\b/.test(raw)) return defaultCurrencyForMenu(menu) === "CAD" ? "CAD" : "USD";
    if (raw.includes("£") || /\b\d+\s*s(?:\s*\d+\s*d)?\b/.test(raw) || /\b\d+\/\d+\b/.test(raw)) return "GBP";
    if (/\bfrs?\.?|\bfrancs?\b/.test(raw)) return countryKey(menu).includes("switzerland") ? "CHF" : "FRF";
    if (/\b(?:mk|marks?)\.?/.test(raw)) return "DEM";
    if (raw.includes("€")) return "EUR";
    return defaultCurrencyForMenu(menu);
  }

  function parseSterling(token) {
    const value = String(token || "").toLowerCase();
    const pound = value.match(/£\s*(\d+(?:[.,]\d+)?)/);
    if (pound) return numeric(pound[1]);
    const shilling = value.match(/\b(\d+)\s*s(?:\s*(\d+)\s*d)?\b/);
    if (shilling) {
      return Number(shilling[1]) / 20 + Number(shilling[2] || 0) / 240;
    }
    const slash = value.match(/\b(\d+)\/(\d+)\b/);
    if (slash) return Number(slash[1]) / 20 + Number(slash[2]) / 240;
    const pence = value.match(/\b(\d+)\s*d\b/);
    if (pence) return Number(pence[1]) / 240;
    return null;
  }

  function amountForToken(token, menu) {
    const raw = String(token || "");
    if (/£|\b\d+\s*s|\b\d+\/\d+\b|\b\d+\s*d\b/i.test(raw)) return parseSterling(raw);
    const cents = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:¢|cents?|cts?\.?|c\.)\b/i);
    if (cents) return Number(cents[1].replace(",", ".")) / 100;
    const symbol = raw.match(/(?:US\$|\$|€|frs?\.?|francs?|mk\.?|marks?)\s*(\d+(?:[.,]\d+)?)/i);
    if (symbol) return numeric(symbol[1]);
    const bare = raw.match(/\b(\d+[.,]\d{2})\b/);
    if (bare && defaultCurrencyForMenu(menu) !== "UNKNOWN") return numeric(bare[1]);
    return null;
  }

  function pricePatterns(menu) {
    const patterns = [
      { kind: "explicit-currency", priority: 1, pattern: /US\$\s*\d+(?:\.\d{1,2})?(?![,\d])|\$\s*\d+(?:\.\d{1,2})?(?![,\d])/gi },
      { kind: "explicit-cents", priority: 1, pattern: /\b\d+(?:[.,]\d+)?\s*(?:¢|cents?|cts?\.?|c\.)\b/gi },
      { kind: "explicit-currency", priority: 1, pattern: /\b(?:frs?\.?|francs?)\s*\d+(?:[.,]\d+)?/gi },
      { kind: "explicit-currency", priority: 1, pattern: /€\s*\d+(?:[.,]\d+)?/gi },
      { kind: "explicit-currency", priority: 1, pattern: /£\s*\d+(?:[.,]\d+)?/gi },
    ];
    const key = countryKey(menu);
    if (/germany|austria/.test(key)) {
      patterns.push({ kind: "explicit-currency", priority: 1, pattern: /\b(?:mk\.?|marks?)\s*\d+(?:[.,]\d+)?/gi });
    }
    if (/united kingdom|england|scotland/.test(key)) {
      patterns.push(
        { kind: "explicit-currency", priority: 1, pattern: /\b\d+\s*s(?:\s*\d+\s*d)?\b/gi },
        { kind: "explicit-currency", priority: 1, pattern: /\b\d+\/\d+\b/g }
      );
    }
    patterns.push(
      { kind: "leading-decimal", priority: 3, pattern: /(?:^|\s)\.\d{2}(?=\s|$)/g },
      { kind: "bare-decimal", priority: 4, pattern: /(?:^|\s)\d+[.,]\d{2}(?=\s|$)/g },
      { kind: "bare-integer", priority: 5, pattern: /(?:^|\s)\d{1,2}(?=\s|$)/g }
    );
    return patterns;
  }

  function cleanItemLabel(line, token) {
    const without = cleanText(line)
      .replace(token, " ")
      .replace(/[_.,;:\-]{2,}/g, " ")
      .replace(/\b\d+(?:[.,]\d+)?\s*(?:¢|cents?|cts?\.?|c\.)\b/gi, " ")
      .replace(/\s+\.\d{2}\b/g, " ")
      .replace(/\s+\d+[.,]\d{2}\b/g, " ")
      .replace(/\s+\d+[.,]\d{2}\s*$/g, " ")
      .replace(/\s+\d{1,2}\s*$/g, " ")
      .replace(/\b(price|prix|preis)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return without.slice(0, 86);
  }

  function isLikelyMenuLine(line) {
    const text = cleanText(line);
    if (text.length < 4 || text.length > 140) return false;
    if (/\b(?:telephone|copyright|avenue|street|printed|publisher|all rights|menu collection)\b/i.test(text)) return false;
    if (/^\d{4}\b/.test(text)) return false;
    return true;
  }

  function hasFoodSignal(value) {
    return FOOD_SIGNAL.test(cleanText(value));
  }

  function hasNonMenuSignal(value) {
    return NON_MENU_SIGNAL.test(cleanText(value));
  }

  function allCapsShortLabel(value) {
    const text = cleanText(value).replace(/[^A-Za-z\s]/g, " ").replace(/\s+/g, " ").trim();
    if (!text || text.length > 32) return false;
    const words = text.split(/\s+/);
    if (words.length > 4) return false;
    return text === text.toUpperCase() || words.every((word) => /^[A-Z][a-z]+$/.test(word));
  }

  function isExplicitToken(token) {
    return /\b(?:frs?\.?|francs?|mk\.?|marks?)\b|[£$€¢]|\b(?:cents?|cts?\.?|c\.)\b|\b\d+\s*s(?:\s*\d+\s*d)?\b|\b\d+\/\d+\b/i.test(token);
  }

  function collectPriceCandidates(line, menu) {
    const candidates = [];
    for (const spec of pricePatterns(menu)) {
      spec.pattern.lastIndex = 0;
      let match = spec.pattern.exec(line);
      while (match) {
        const matched = match[0];
        const leading = matched.match(/^\s*/)?.[0]?.length || 0;
        const rawPrice = cleanText(matched);
        const index = match.index + leading;
        candidates.push({
          kind: spec.kind,
          priority: spec.priority,
          rawPrice,
          rawMatch: matched,
          index,
          end: index + rawPrice.length,
        });
        match = spec.pattern.exec(line);
      }
    }

    return candidates
      .sort((a, b) => a.index - b.index || a.priority - b.priority || b.rawPrice.length - a.rawPrice.length)
      .reduce((accepted, candidate) => {
        if (!candidate.rawPrice || accepted.some((current) => candidate.index < current.end && current.index < candidate.end)) return accepted;
        accepted.push(candidate);
        return accepted;
      }, []);
  }

  function inferMenuScale(lines, menu) {
    let foodBareIntegers = 0;
    let foodDecimals = 0;
    let explicitCurrency = 0;
    let explicitCents = 0;
    for (const line of lines) {
      if (hasNonMenuSignal(line)) continue;
      const foodLine = hasFoodSignal(line);
      for (const candidate of collectPriceCandidates(line, menu)) {
        if (candidate.kind === "explicit-cents") explicitCents += 1;
        if (candidate.kind === "explicit-currency") explicitCurrency += 1;
        if (candidate.kind === "bare-integer" && foodLine && Number(candidate.rawPrice) >= 5) foodBareIntegers += 1;
        if ((candidate.kind === "bare-decimal" || candidate.kind === "leading-decimal") && foodLine) foodDecimals += 1;
      }
    }
    return {
      integerCentsMode: foodBareIntegers >= 3 && foodBareIntegers >= foodDecimals,
      foodBareIntegers,
      foodDecimals,
      explicitCurrency,
      explicitCents,
    };
  }

  function candidateItemLabel(line, candidates, index, menu) {
    const candidate = candidates[index];
    const previous = candidates[index - 1];
    const segmentStart = previous ? previous.end : 0;
    const segment = cleanText(line.slice(segmentStart, candidate.index))
      .replace(/^[;:,\-.]+/, "")
      .replace(/[;:,\-.]+$/, "")
      .trim();
    if (segment && /[A-Za-z]/.test(segment)) return segment.slice(0, 86);
    return cleanItemLabel(line, candidate.rawPrice) || menu.title || "Menu item";
  }

  function parsePriceCandidate(candidate, line, item, menu, scaleContext) {
    const raw = candidate.rawPrice;
    const bareNumber = numeric(raw);
    const foodLine = hasFoodSignal(`${item} ${line}`);

    if (/\$\s*\d{1,3}(?:,\d{3})+/.test(raw) || /\$\s*\d{1,3}(?:,\d{3})+/.test(line)) {
      return null;
    }

    if (/£|\b\d+\s*s|\b\d+\/\d+\b|\b\d+\s*d\b/i.test(raw)) {
      const amount = parseSterling(raw);
      return amount ? { amount, scale: "explicit-currency", scaleConfidence: "high", scaleReason: "Sterling token" } : null;
    }

    const cents = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:¢|cents?|cts?\.?|c\.)\b/i);
    if (cents) {
      return {
        amount: Number(cents[1].replace(",", ".")) / 100,
        scale: "explicit-cents",
        scaleConfidence: "high",
        scaleReason: "Explicit cents marker",
      };
    }

    const symbol = raw.match(/(?:US\$|\$|€|frs?\.?|francs?|mk\.?|marks?)\s*(\d+(?:[.,]\d+)?)/i);
    if (symbol) {
      const amount = numeric(symbol[1]);
      return amount ? { amount, scale: "explicit-currency", scaleConfidence: "high", scaleReason: "Explicit currency marker" } : null;
    }

    if (candidate.kind === "leading-decimal") {
      return {
        amount: bareNumber,
        scale: "decimal-dollars",
        scaleConfidence: "high",
        scaleReason: "Leading decimal price",
      };
    }

    if (candidate.kind === "bare-integer") {
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0 || value > 99) return null;
      if (scaleContext.integerCentsMode || (foodLine && value >= 5)) {
        return {
          amount: value / 100,
          scale: "inferred-cents",
          scaleConfidence: scaleContext.integerCentsMode ? "high" : "medium",
          scaleReason: scaleContext.integerCentsMode ? "Menu uses repeated bare cent prices" : "Dish line has bare integer price",
        };
      }
      return null;
    }

    if (candidate.kind === "bare-decimal") {
      if (!Number.isFinite(bareNumber) || bareNumber <= 0) return null;
      const decimalLooksLikePaddedCents = bareNumber >= 10 && bareNumber <= 99 && /\.00$/.test(raw) && scaleContext.integerCentsMode && foodLine;
      if (decimalLooksLikePaddedCents) {
        return {
          amount: bareNumber / 100,
          scale: "inferred-cents",
          scaleConfidence: "medium",
          scaleReason: "Bare .00 value in cents-style menu",
        };
      }
      return {
        amount: bareNumber,
        scale: "decimal-dollars",
        scaleConfidence: bareNumber >= 10 && !foodLine ? "low" : "medium",
        scaleReason: "Bare decimal price",
      };
    }

    const amount = amountForToken(raw, menu);
    return amount ? { amount, scale: "explicit-currency", scaleConfidence: "medium", scaleReason: "Parsed price token" } : null;
  }

  function isNonMenuPriceLine(line, item, candidate, parsed) {
    if (hasNonMenuSignal(line)) return true;
    const strippedLine = cleanItemLabel(line, candidate.rawPrice);
    if (allCapsShortLabel(item) && !hasFoodSignal(item) && strippedLine.toLowerCase() === cleanText(item).toLowerCase()) return true;
    if (!isExplicitToken(candidate.rawPrice) && Number(parsed.amount) >= 10 && !hasFoodSignal(`${item} ${line}`)) return true;
    if (Number(parsed.amount) >= 10 && allCapsShortLabel(item) && !hasFoodSignal(item)) return true;
    return false;
  }

  function confidenceFor(entry, line) {
    let score = 0.48;
    const reasons = [];
    if (entry.scale === "explicit-cents") {
      score += 0.28;
      reasons.push("explicit cents");
    } else if (/[£$€¢]|\b(?:frs?\.?|francs?|marks?|mk\.?)\b/i.test(entry.rawPrice)) {
      score += 0.25;
      reasons.push("currency token");
    }
    if (entry.scale === "inferred-cents") {
      score += entry.scaleConfidence === "high" ? 0.18 : 0.1;
      reasons.push("inferred cents");
    }
    if (entry.year >= 1913 && entry.currency === "USD") {
      score += 0.12;
      reasons.push("U.S. CPI coverage");
    }
    if (entry.item && entry.item.length > 5) {
      score += 0.08;
      reasons.push("dish label");
    }
    if (entry.scale === "decimal-dollars" && !/[£$€¢]/.test(entry.rawPrice)) {
      score -= 0.18;
      reasons.push("bare decimal");
    }
    if (entry.scaleConfidence === "low") {
      score -= 0.18;
      reasons.push("low scale confidence");
    }
    if (entry.currency === "UNKNOWN") score -= 0.18;
    const confidence = score >= 0.78 ? "high" : score >= 0.58 ? "medium" : "low";
    return { score: Math.max(0.1, Math.min(0.98, score)), confidence, reasons };
  }

  function extractPricesFromText(text, menu) {
    const records = [];
    const seen = new Set();
    const lines = String(text || "")
      .split(/\n+/)
      .map(cleanText)
      .filter(isLikelyMenuLine)
      .slice(0, 700);
    const scaleContext = inferMenuScale(lines, menu);

    for (const [lineIndex, line] of lines.entries()) {
      const candidates = collectPriceCandidates(line, menu);
      for (const [candidateIndex, candidate] of candidates.entries()) {
        if (/\b(?:frs?\.?|francs?|mk\.?|marks?)\b|[£$€¢]/i.test(line) && !isExplicitToken(candidate.rawPrice)) continue;
        const item = candidateItemLabel(line, candidates, candidateIndex, menu);
        const parsed = parsePriceCandidate(candidate, line, item, menu, scaleContext);
        if (!parsed || !parsed.amount || parsed.amount <= 0 || parsed.amount >= 10000) continue;
        if (isNonMenuPriceLine(line, item, candidate, parsed)) continue;

        const currency = currencyForToken(candidate.rawPrice, menu);
        const key = `${lineIndex}:${candidate.index}:${candidate.rawPrice}:${item.toLowerCase()}`;
        if (!seen.has(key)) {
          const entry = {
            id: `${menu.id}-${lineIndex}-${records.length}`,
            menuId: menu.id,
            item,
            rawLine: line,
            rawPrice: candidate.rawPrice,
            rawAmount: numeric(candidate.rawPrice),
            amount: Number(parsed.amount.toFixed(4)),
            scale: parsed.scale,
            scaleConfidence: parsed.scaleConfidence,
            scaleReason: parsed.scaleReason,
            currency,
            currencyLabel: CURRENCY_LABELS[currency] || currency,
            country: menu.country || "unknown",
            iso3: iso3ForMenu(menu),
            place: [menu.city, menu.state, menu.country].filter(Boolean).join(", "),
            year: menu.year || null,
            decade: menu.decade || "unknown",
            menuTitle: menu.title,
            menuType: menu.types || [],
            sourceUrl: menu.itemUrl,
          };
          Object.assign(entry, confidenceFor(entry, line));
          records.push(entry);
          seen.add(key);
        }
      }
    }
    return records;
  }

  function latestPoint(series = {}) {
    return Object.entries(series)
      .map(([year, value]) => [Number(year), Number(value)])
      .filter(([year, value]) => Number.isFinite(year) && Number.isFinite(value))
      .sort((a, b) => b[0] - a[0])[0];
  }

  function normalizePrice(entry, references = {}) {
    const year = Number(entry.year);
    const usSeries = references?.cpiUs?.annual || {};
    const countrySeries = references?.cpiCountry?.countries?.[entry.iso3]?.annual || {};
    const latestUs = latestPoint(usSeries);
    const latestCountry = latestPoint(countrySeries);
    const result = {
      method: "raw",
      caveat: "No safe inflation index for this year/currency in the static snapshot.",
      todayUsd: null,
      todayLow: null,
      todayHigh: null,
      localToday: null,
      relativeIndex: null,
      referenceYear: latestUs?.[0] || latestCountry?.[0] || null,
    };

    if (!Number.isFinite(year) || !entry.amount) return result;

    if (entry.currency === "USD" && Number(usSeries[year]) && latestUs) {
      const today = entry.amount * (latestUs[1] / Number(usSeries[year]));
      const spread = entry.confidence === "high" ? 0.08 : entry.confidence === "medium" ? 0.18 : 0.32;
      return {
        method: "BLS CPI-U",
        caveat: `Adjusted with U.S. CPI-U through ${latestUs[0]}; local purchasing power and menu context still vary.`,
        todayUsd: roundMoney(today),
        todayLow: roundMoney(today * (1 - spread)),
        todayHigh: roundMoney(today * (1 + spread)),
        localToday: null,
        relativeIndex: roundMoney(today),
        referenceYear: latestUs[0],
      };
    }

    if (Number(countrySeries[year]) && latestCountry) {
      const localToday = entry.amount * (latestCountry[1] / Number(countrySeries[year]));
      return {
        method: "World Bank local CPI",
        caveat: `Local CPI index through ${latestCountry[0]}; not converted to USD because historical FX is not applied.`,
        todayUsd: null,
        todayLow: null,
        todayHigh: null,
        localToday: roundMoney(localToday),
        relativeIndex: roundMoney(localToday),
        referenceYear: latestCountry[0],
      };
    }

    return result;
  }

  function roundMoney(value) {
    if (!Number.isFinite(value)) return null;
    return Number(value.toFixed(value >= 100 ? 0 : 2));
  }

  function contextForEntry(entry, events = []) {
    return events
      .filter((event) => {
        const year = Number(entry.year);
        if (!Number.isFinite(year) || year < event.startYear || year > event.endYear) return false;
        const countries = event.countries || [];
        const currencies = event.currencies || [];
        const terms = event.terms || [];
        const countryMatch = !countries.length || countries.includes(entry.country) || countries.includes(entry.iso3) || countries.includes("global");
        const currencyMatch = !currencies.length || currencies.includes(entry.currency);
        const text = `${entry.item} ${entry.rawLine}`.toLowerCase();
        const termMatch = !terms.length || terms.some((term) => text.includes(String(term).toLowerCase()));
        return countryMatch && currencyMatch && termMatch;
      })
      .slice(0, 2)
      .map((event) => ({
        id: event.id,
        label: event.label,
        note: event.note,
      }));
  }

  function summarizePrices(records, references = {}) {
    const normalized = records.filter((record) => record.normalized?.todayUsd);
    const defaultNormalized = normalized.filter((record) => record.confidence !== "low");
    const byCurrency = countBy(records, (record) => record.currency);
    const byConfidence = countBy(records, (record) => record.confidence);
    const byScale = countBy(records, (record) => record.scale);
    const years = records.map((record) => record.year).filter(Boolean);
    const medianToday = median(normalized.map((record) => record.normalized.todayUsd));
    const medianDefaultToday = median(defaultNormalized.map((record) => record.normalized.todayUsd));
    return {
      total: records.length,
      normalizedUsd: normalized.length,
      defaultNormalizedUsd: defaultNormalized.length,
      yearMin: years.length ? Math.min(...years) : null,
      yearMax: years.length ? Math.max(...years) : null,
      currencies: byCurrency,
      confidence: byConfidence,
      scale: byScale,
      medianTodayUsd: medianToday,
      medianDefaultTodayUsd: medianDefaultToday || medianToday,
      referenceYear: references?.cpiUs?.latestReferenceDate || null,
    };
  }

  function countBy(records, getter) {
    const counts = new Map();
    for (const record of records) {
      const key = getter(record) || "unknown";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name)));
  }

  function median(values) {
    const nums = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!nums.length) return null;
    const middle = Math.floor(nums.length / 2);
    return nums.length % 2 ? nums[middle] : roundMoney((nums[middle - 1] + nums[middle]) / 2);
  }

  function buildPriceSnapshot({ menus, textsById, references, contextEvents, generatedAt = new Date().toISOString() }) {
    const menuById = new Map((menus || []).map((menu) => [Number(menu.id), menu]));
    const records = [];
    for (const [rawId, text] of Object.entries(textsById || {})) {
      const menu = menuById.get(Number(rawId));
      if (!menu || !text) continue;
      records.push(...extractPricesFromText(text, menu));
    }
    for (const record of records) {
      record.normalized = normalizePrice(record, references);
      record.context = contextForEntry(record, contextEvents);
    }
    records.sort((a, b) => (a.year || 9999) - (b.year || 9999) || a.item.localeCompare(b.item));
    return {
      version: VERSION,
      generatedAt,
      methodology: "OCR menu prices are extracted with conservative regexes, scaled from explicit currency or inferred cents when menu context supports it, then indexed with official CPI snapshots when coverage exists.",
      records,
      summary: summarizePrices(records, references),
      sources: {
        cpiUs: references?.cpiUs?.sourceUrl || "",
        cpiCountry: references?.cpiCountry?.sourceUrl || "",
        fx: references?.fx?.sourceUrl || "",
      },
    };
  }

  return {
    VERSION,
    CURRENCY_LABELS,
    buildPriceSnapshot,
    contextForEntry,
    extractPricesFromText,
    normalizePrice,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = MenuGraphPrices;
}

if (typeof window !== "undefined") {
  window.MenuGraphPrices = MenuGraphPrices;
}
