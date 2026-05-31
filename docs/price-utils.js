const MenuGraphPrices = (() => {
  const VERSION = 1;

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
      /US\$\s*\d+(?:[.,]\d+)?|\$\s*\d+(?:[.,]\d+)?/gi,
      /\b\d+(?:[.,]\d+)?\s*(?:¢|cents?|cts?\.?|c\.)\b/gi,
      /\b(?:frs?\.?|francs?)\s*\d+(?:[.,]\d+)?/gi,
      /€\s*\d+(?:[.,]\d+)?/gi,
      /£\s*\d+(?:[.,]\d+)?/gi,
    ];
    const key = countryKey(menu);
    if (/germany|austria/.test(key)) patterns.push(/\b(?:mk\.?|marks?)\s*\d+(?:[.,]\d+)?/gi);
    if (/united kingdom|england|scotland/.test(key)) {
      patterns.push(/\b\d+\s*s(?:\s*\d+\s*d)?\b/gi, /\b\d+\/\d+\b/g);
    }
    patterns.push(/\s\d+[.,]\d{2}\s*$/g);
    return patterns;
  }

  function cleanItemLabel(line, token) {
    const without = cleanText(line)
      .replace(token, " ")
      .replace(/[_.,;:\-]{2,}/g, " ")
      .replace(/\s+\d+[.,]\d{2}\s*$/g, " ")
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

  function confidenceFor(entry, line) {
    let score = 0.48;
    const reasons = [];
    if (/[£$€¢]|\b(?:frs?\.?|francs?|marks?|mk\.?)\b/i.test(entry.rawPrice)) {
      score += 0.25;
      reasons.push("currency token");
    }
    if (entry.year >= 1913 && entry.currency === "USD") {
      score += 0.12;
      reasons.push("U.S. CPI coverage");
    }
    if (entry.item && entry.item.length > 5) {
      score += 0.08;
      reasons.push("dish label");
    }
    if (/\s\d+[.,]\d{2}\s*$/.test(line) && !/[£$€¢]/.test(entry.rawPrice)) {
      score -= 0.18;
      reasons.push("bare decimal");
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

    for (const [lineIndex, line] of lines.entries()) {
      for (const pattern of pricePatterns(menu)) {
        pattern.lastIndex = 0;
        let match = pattern.exec(line);
        while (match) {
          const rawPrice = cleanText(match[0]);
          if (
            /\b(?:frs?\.?|francs?|mk\.?|marks?)\b|[£$€¢]/i.test(line) &&
            !/\b(?:frs?\.?|francs?|mk\.?|marks?)\b|[£$€¢]|\b(?:cents?|cts?\.?|c\.)\b/i.test(rawPrice)
          ) {
            match = pattern.exec(line);
            continue;
          }
          const amount = amountForToken(rawPrice, menu);
          if (amount && amount > 0 && amount < 10000) {
            const currency = currencyForToken(rawPrice, menu);
            const item = cleanItemLabel(line, match[0]) || menu.title || "Menu item";
            const key = `${lineIndex}:${rawPrice}:${item.toLowerCase()}`;
            if (!seen.has(key)) {
              const entry = {
                id: `${menu.id}-${lineIndex}-${records.length}`,
                menuId: menu.id,
                item,
                rawLine: line,
                rawPrice,
                amount: Number(amount.toFixed(4)),
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
          match = pattern.exec(line);
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
    const byCurrency = countBy(records, (record) => record.currency);
    const byConfidence = countBy(records, (record) => record.confidence);
    const years = records.map((record) => record.year).filter(Boolean);
    const medianToday = median(normalized.map((record) => record.normalized.todayUsd));
    return {
      total: records.length,
      normalizedUsd: normalized.length,
      yearMin: years.length ? Math.min(...years) : null,
      yearMax: years.length ? Math.max(...years) : null,
      currencies: byCurrency,
      confidence: byConfidence,
      medianTodayUsd: medianToday,
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
      methodology: "OCR menu prices are extracted with conservative regexes, inferred from currency symbols and menu location, then indexed with official CPI snapshots when coverage exists.",
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
