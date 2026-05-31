const MenuGraphDateEstimates = (() => {
  const VERSION = 1;
  const VALID_CONFIDENCE = new Set(["A", "B", "C", "D", "X"]);
  const PLOTTABLE_CONFIDENCE = new Set(["A", "B", "C"]);
  const MONTHS = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };

  const DEFAULT_DATE_CLUES = [
    {
      id: "zip-plus-four",
      method: "postal_format",
      label: "ZIP+4 printed",
      notBefore: 1983,
      confidence: "B",
      sourceUrl: "https://postalmuseum.si.edu/the-20th-century-from-zone-codes-to-zip-codes",
      effect: "sets not before 1983",
    },
    {
      id: "us-zip",
      method: "postal_format",
      label: "U.S. ZIP code printed",
      notBefore: 1963,
      confidence: "B",
      sourceUrl: "https://postalmuseum.si.edu/the-20th-century-from-zone-codes-to-zip-codes",
      effect: "sets not before 1963",
    },
    {
      id: "phone-exchange",
      method: "phone_format",
      label: "Telephone exchange name",
      notBefore: 1940,
      notAfter: 1975,
      confidence: "C",
      sourceUrl: "https://en.wikipedia.org/wiki/Telephone_exchange_names",
      effect: "sets a mid-century phone-format range",
    },
    {
      id: "area-code",
      method: "phone_format",
      label: "North American area code",
      notBefore: 1951,
      confidence: "C",
      sourceUrl: "https://www.nanpa.com/about",
      effect: "sets not before 1951",
    },
    {
      id: "diners-club",
      method: "payment_marker",
      label: "Diners Club accepted",
      notBefore: 1950,
      confidence: "B",
      sourceUrl: "https://www.dinersclub.com/about-us/history/",
      effect: "sets not before 1950",
    },
    {
      id: "american-express",
      method: "payment_marker",
      label: "American Express accepted",
      notBefore: 1958,
      confidence: "B",
      sourceUrl: "https://www.americanexpress.com/",
      effect: "sets not before 1958",
    },
    {
      id: "bankamericard",
      method: "payment_marker",
      label: "BankAmericard accepted",
      notBefore: 1958,
      notAfter: 1976,
      confidence: "B",
      sourceUrl: "https://www.si.edu/object/credit-card:nmah_1448554",
      effect: "sets BankAmericard-era bounds",
    },
    {
      id: "visa",
      method: "payment_marker",
      label: "Visa accepted",
      notBefore: 1976,
      confidence: "B",
      sourceUrl: "https://www.si.edu/object/credit-card:nmah_1448554",
      effect: "sets not before 1976",
    },
    {
      id: "master-charge",
      method: "payment_marker",
      label: "Master Charge accepted",
      notBefore: 1969,
      notAfter: 1979,
      confidence: "B",
      sourceUrl: "https://www.si.edu/object/credit-card:nmah_1448554",
      effect: "sets Master Charge-era bounds",
    },
    {
      id: "mastercard",
      method: "payment_marker",
      label: "MasterCard accepted",
      notBefore: 1979,
      confidence: "B",
      sourceUrl: "https://www.si.edu/object/credit-card:nmah_1448554",
      effect: "sets not before 1979",
    },
    {
      id: "web-or-email",
      method: "postal_format",
      label: "Website or email printed",
      notBefore: 1993,
      confidence: "C",
      sourceUrl: "https://www.w3.org/History.html",
      effect: "sets not before 1993",
    },
  ];

  function cleanText(value) {
    return String(value || "")
      .replace(/[“”]/g, '"')
      .replace(/[’]/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanSnippet(value, fallback = "") {
    const text = cleanText(value || fallback);
    return text.length > 140 ? `${text.slice(0, 137)}...` : text;
  }

  function numericYear(value) {
    const year = Number(value);
    return Number.isInteger(year) && year >= 1800 && year <= 2035 ? year : null;
  }

  function yearFromDate(value) {
    const match = String(value || "").match(/\b(18|19|20)\d{2}\b/);
    return match ? numericYear(match[0]) : null;
  }

  function twoDigitYear(value) {
    const year = Number(value);
    if (!Number.isInteger(year) || year < 0 || year > 99) return null;
    return year >= 35 ? 1900 + year : 2000 + year;
  }

  function decadeFromYear(value) {
    const year = numericYear(value);
    return year ? `${Math.floor(year / 10) * 10}s` : null;
  }

  function isUnknownDecade(value) {
    const text = cleanText(value).toLowerCase();
    return !text || text === "unknown";
  }

  function dateStart(year) {
    return `${year}-01-01`;
  }

  function dateEnd(year) {
    return `${year}-12-31`;
  }

  function yearFromIso(value) {
    return yearFromDate(value);
  }

  function normalized(value) {
    return cleanText(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\b(?:restaurant|restau|menu|hotel|cafe|bar|grill|room|the)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function restaurantKey(menu) {
    const value = normalized(menu.restaurant);
    if (!value || /^(unidentified|unknown|untitled)$/.test(value)) return "";
    return value;
  }

  function donorKey(menu) {
    const value = normalized(menu.donor || sourceFamily(menu.source));
    return value && value !== "unknown" ? value : "";
  }

  function sourceFamily(source) {
    const match = String(source || "").match(/Menu Collection;\s*([^;]+)/i);
    return match ? match[1].trim() : "";
  }

  function menuNumberPrefix(source) {
    const match = String(source || "").match(/\bmenu\s+([A-Za-z]?\d{1,4})[-;]/i);
    return match ? match[1].toLowerCase() : "";
  }

  function confidenceRank(confidence) {
    return { A: 4, B: 3, C: 2, D: 1, X: 0 }[confidence] || 0;
  }

  function strongestConfidence(values) {
    return values.filter((item) => VALID_CONFIDENCE.has(item)).sort((a, b) => confidenceRank(b) - confidenceRank(a))[0] || "D";
  }

  function clueIndex(dateClues) {
    const fromFile = Array.isArray(dateClues?.rules) ? dateClues.rules : Array.isArray(dateClues) ? dateClues : [];
    const map = new Map();
    for (const clue of [...DEFAULT_DATE_CLUES, ...fromFile]) {
      map.set(clue.id, clue);
    }
    return map;
  }

  function makeEstimateBuilder(menu) {
    return {
      menuId: recordId(menu),
      lower: null,
      upper: null,
      hardLower: null,
      hardUpper: null,
      centerHint: null,
      evidence: [],
      methods: new Set(),
      confidenceHints: [],
      conflict: false,
    };
  }

  function recordId(menu) {
    return menu.uid || menu.id || menu.pointer;
  }

  function addEvidence(builder, evidence) {
    const method = evidence.method || evidence.type || "unknown";
    builder.methods.add(method);
    builder.confidenceHints.push(evidence.confidence || "D");
    builder.evidence.push({
      method,
      source: cleanSnippet(evidence.source || ""),
      snippet: cleanSnippet(evidence.snippet || evidence.label || ""),
      effect: cleanSnippet(evidence.effect || ""),
      confidence: VALID_CONFIDENCE.has(evidence.confidence) ? evidence.confidence : "D",
      sourceUrl: evidence.sourceUrl || undefined,
    });
  }

  function applyRange(builder, range, evidence) {
    const lower = numericYear(range.notBefore);
    const upper = numericYear(range.notAfter);
    const hard = range.hard !== false;
    if (lower) {
      builder.lower = builder.lower ? Math.max(builder.lower, lower) : lower;
      if (hard) builder.hardLower = builder.hardLower ? Math.max(builder.hardLower, lower) : lower;
    }
    if (upper) {
      builder.upper = builder.upper ? Math.min(builder.upper, upper) : upper;
      if (hard) builder.hardUpper = builder.hardUpper ? Math.min(builder.hardUpper, upper) : upper;
    }
    if (range.centerYear) builder.centerHint = numericYear(range.centerYear) || builder.centerHint;
    addEvidence(builder, evidence);
    if (builder.lower && builder.upper && builder.lower > builder.upper) builder.conflict = true;
    if (builder.hardLower && builder.hardUpper && builder.hardLower > builder.hardUpper) builder.conflict = true;
  }

  function applyExactYear(builder, year, evidence) {
    const safeYear = numericYear(year);
    if (!safeYear) return;
    applyRange(
      builder,
      {
        notBefore: safeYear,
        notAfter: safeYear,
        centerYear: safeYear,
      },
      evidence
    );
  }

  function snippetAround(text, start, length) {
    const source = String(text || "");
    const left = Math.max(start - 44, 0);
    const right = Math.min(start + length + 44, source.length);
    return source.slice(left, right);
  }

  function parseMonthName(value) {
    return MONTHS[String(value || "").toLowerCase().replace(/\.$/, "")] || null;
  }

  function extractExplicitDatesFromText(text, source, options = {}) {
    const results = [];
    const value = String(text || "");
    const fullMonth = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+((?:18|19|20)\d{2})\b/gi;
    const dayMonth = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,]?\s+((?:18|19|20)\d{2})\b/gi;
    const numeric = /\b(\d{1,2})[/-](\d{1,2})[/-]((?:18|19|20)\d{2}|\d{2})\b/g;
    const monthYear = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+((?:18|19|20)\d{2})\b/gi;
    const contextualYear =
      /\b(?:thanksgiving|christmas|new year's eve|new year|easter|valentine|labor day|memorial day|bicentennial|world'?s fair|copyright|revised|revision|effective|printed|dated|date|opened|opening|closed|established|anniversary|banquet|dinner|luncheon|commencement|convention)\b.{0,36}?\b((?:18|19|20)\d{2})\b/gi;

    const exactConfidence = options.strong ? "A" : "B";
    for (const pattern of [fullMonth, dayMonth]) {
      let match = pattern.exec(value);
      while (match) {
        const year = numericYear(match[3]);
        const month = parseMonthName(pattern === fullMonth ? match[1] : match[2]);
        const day = Number(pattern === fullMonth ? match[2] : match[1]);
        if (year && month && day >= 1 && day <= 31) {
          results.push({
            year,
            method: "transcript_date",
            confidence: exactConfidence,
            source,
            snippet: snippetAround(value, match.index, match[0].length),
            effect: `sets explicit date ${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          });
        }
        match = pattern.exec(value);
      }
    }

    let match = numeric.exec(value);
    while (match) {
      const year = numericYear(match[3]) || twoDigitYear(match[3]);
      const first = Number(match[1]);
      const second = Number(match[2]);
      if (year && first >= 1 && first <= 12 && second >= 1 && second <= 31) {
        const snippet = snippetAround(value, match.index, match[0].length);
        const lowerBoundOnly = /\b(?:opened|opening|established|since)\b/i.test(snippet);
        results.push({
          year,
          notBefore: lowerBoundOnly ? year : undefined,
          method: "transcript_date",
          confidence: lowerBoundOnly ? "B" : exactConfidence,
          source,
          snippet,
          effect: lowerBoundOnly ? `sets not before ${year}` : `sets explicit numeric date in ${year}`,
        });
      }
      match = numeric.exec(value);
    }

    match = monthYear.exec(value);
    while (match) {
      const year = numericYear(match[2]);
      if (year) {
        results.push({
          year,
          method: "transcript_date",
          confidence: options.strong ? "A" : "B",
          source,
          snippet: snippetAround(value, match.index, match[0].length),
          effect: `sets month-year evidence in ${year}`,
        });
      }
      match = monthYear.exec(value);
    }

    match = contextualYear.exec(value);
    while (match) {
      const year = numericYear(match[1]);
      if (year) {
        const snippet = snippetAround(value, match.index, match[0].length);
        const lowerBoundOnly = /\b(?:opened|opening|established|since)\b/i.test(match[0]);
        results.push({
          year,
          notBefore: lowerBoundOnly ? year : undefined,
          method: "transcript_date",
          confidence: lowerBoundOnly ? "B" : options.strong ? "A" : "B",
          source,
          snippet,
          effect: lowerBoundOnly ? `sets not before ${year}` : `sets contextual date evidence in ${year}`,
        });
      }
      match = contextualYear.exec(value);
    }

    return dedupeDateEvidence(results);
  }

  function dedupeDateEvidence(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = `${item.year || item.notBefore}-${item.method}-${cleanSnippet(item.snippet).toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function applyExplicitDates(builder, menu, text) {
    const metadataYear = yearFromDate(menu.date);
    if (metadataYear && isUnknownDecade(menu.decade)) {
      applyExactYear(builder, metadataYear, {
        method: "metadata_date",
        source: "CIA metadata date",
        snippet: menu.date,
        effect: `derives ${decadeFromYear(metadataYear)} from source date`,
        confidence: "A",
      });
    }

    if (!menu.year) {
      const titleYears = extractExplicitDatesFromText(menu.title, "title", { strong: false });
      const metadataDates = extractExplicitDatesFromText([menu.date, menu.source].filter(Boolean).join(" "), "metadata fields", {
        strong: true,
      });
      const transcriptDates = extractExplicitDatesFromText(text, "OCR transcript", { strong: true });
      for (const item of [...titleYears, ...metadataDates, ...transcriptDates].slice(0, 8)) {
        if (item.notBefore) {
          applyRange(
            builder,
            { notBefore: item.notBefore },
            {
              method: item.method,
              source: item.source,
              snippet: item.snippet,
              effect: item.effect,
              confidence: item.confidence,
            }
          );
        } else {
          applyExactYear(builder, item.year, {
            method: item.method,
            source: item.source,
            snippet: item.snippet,
            effect: item.effect,
            confidence: item.confidence,
          });
        }
      }
    }
  }

  function applyPatternClues(builder, menu, text, clueMap) {
    const haystack = [menu.title, menu.restaurant, menu.city, menu.state, menu.country, menu.source, menu.donor, text]
      .filter(Boolean)
      .join("\n");
    const checks = [
      { id: "zip-plus-four", pattern: /\b\d{5}-\d{4}\b/i },
      {
        id: "us-zip",
        pattern:
          /\b(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY|N\.Y\.|Calif\.|Penn\.|Mass\.)\s+\d{5}\b/i,
      },
      { id: "phone-exchange", pattern: /\b[A-Z][A-Z][A-Za-z]{0,10}\s?\d[- ]\d{4}\b/ },
      { id: "area-code", pattern: /\(\d{3}\)\s*\d{3}[-.\s]\d{4}\b|\b\d{3}[-.]\d{3}[-.]\d{4}\b/ },
      { id: "diners-club", pattern: /\bdiners\s+club\b/i },
      { id: "american-express", pattern: /\bamerican\s+express\b|\bamex\b/i },
      { id: "bankamericard", pattern: /\bbankamericard\b/i },
      { id: "visa", pattern: /\bvisa\b/i },
      { id: "master-charge", pattern: /\bmaster\s+charge\b/i },
      { id: "mastercard", pattern: /\bmastercard\b|\bmaster\s+card\b/i },
      { id: "web-or-email", pattern: /\b(?:www\.|https?:\/\/|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i },
    ];

    for (const check of checks) {
      const match = haystack.match(check.pattern);
      if (!match) continue;
      const clue = clueMap.get(check.id);
      if (!clue) continue;
      applyRange(
        builder,
        {
          notBefore: clue.notBefore,
          notAfter: clue.notAfter,
          hard: clue.hard !== false,
        },
        {
          method: clue.method,
          source: clue.label,
          snippet: match[0],
          effect: clue.effect || rangeEffect(clue),
          confidence: clue.confidence,
          sourceUrl: clue.sourceUrl,
        }
      );
    }
  }

  function rangeEffect(range) {
    const lower = numericYear(range.notBefore);
    const upper = numericYear(range.notAfter);
    if (lower && upper) return `sets ${lower}-${upper}`;
    if (lower) return `sets not before ${lower}`;
    if (upper) return `sets not after ${upper}`;
    return "adds date clue";
  }

  function yearsForRange(start, end) {
    const lower = yearFromIso(start);
    const upper = yearFromIso(end);
    return { lower, upper };
  }

  function matchRestaurantRange(menu, range) {
    const labels = Array.isArray(range.labels) ? range.labels : [range.label || range.name || range.id];
    const menuText = normalized([menu.restaurant, menu.title].filter(Boolean).join(" "));
    const placeText = normalized([menu.city, menu.state, menu.country].filter(Boolean).join(" "));
    if (!menuText) return false;
    const labelMatch = labels.some((label) => {
      const key = normalized(label);
      return key && (menuText.includes(key) || key.includes(menuText));
    });
    if (!labelMatch) return false;
    if (range.places?.length) {
      const placeMatch = range.places.some((place) => placeText.includes(normalized(place)));
      if (!placeMatch) return false;
    }
    return true;
  }

  function applyRestaurantRanges(builder, menu, restaurantRanges) {
    const ranges = Array.isArray(restaurantRanges?.ranges)
      ? restaurantRanges.ranges
      : Array.isArray(restaurantRanges)
        ? restaurantRanges
        : [];
    for (const range of ranges) {
      if (!matchRestaurantRange(menu, range)) continue;
      const years = yearsForRange(range.notBefore, range.notAfter);
      applyRange(
        builder,
        {
          notBefore: years.lower,
          notAfter: years.upper,
          centerYear: range.centerYear,
          hard: range.boundType !== "soft",
        },
        {
          method: "restaurant_history",
          source: range.label || range.id || "restaurant range",
          snippet: range.note || [range.notBefore, range.notAfter].filter(Boolean).join(" - "),
          effect: rangeEffect({ notBefore: years.lower, notAfter: years.upper }),
          confidence: range.confidence || (range.boundType === "soft" ? "C" : "B"),
          sourceUrl: range.sourceUrl,
        }
      );
    }
  }

  function buildSiblingIndexes(menus) {
    const restaurants = new Map();
    const clusters = new Map();
    for (const menu of menus) {
      const year = numericYear(menu.year);
      if (!year) continue;
      const key = restaurantKey(menu);
      if (key) {
        if (!restaurants.has(key)) restaurants.set(key, []);
        restaurants.get(key).push(year);
      }
      const donor = donorKey(menu);
      const prefix = menuNumberPrefix(menu.source);
      if (donor && prefix) {
        const clusterKey = `${donor}|${prefix}`;
        if (!clusters.has(clusterKey)) clusters.set(clusterKey, []);
        clusters.get(clusterKey).push(year);
      }
    }
    const compress = (map) => {
      for (const [key, years] of map) {
        years.sort((a, b) => a - b);
        map.set(key, {
          years,
          count: years.length,
          min: years[0],
          max: years[years.length - 1],
        });
      }
      return map;
    };
    return { restaurants: compress(restaurants), clusters: compress(clusters) };
  }

  function applySameRestaurantSiblings(builder, menu, indexes) {
    const key = restaurantKey(menu);
    if (!key) return;
    const bucket = indexes.restaurants.get(key);
    if (!bucket || !bucket.count) return;
    const span = bucket.max - bucket.min;
    const confidence = bucket.count >= 2 && span <= 25 ? "B" : bucket.count >= 2 && span <= 60 ? "C" : "D";
    const lower = bucket.count === 1 ? bucket.min - 5 : bucket.min;
    const upper = bucket.count === 1 ? bucket.max + 5 : bucket.max;
    applyRange(
      builder,
      {
        notBefore: Math.max(lower, 1800),
        notAfter: Math.min(upper, 2035),
        hard: false,
      },
      {
        method: "same_restaurant_sibling",
        source: "dated records with same restaurant",
        snippet: `${bucket.count} dated sibling${bucket.count === 1 ? "" : "s"} span ${bucket.min}-${bucket.max}`,
        effect: `adds ${Math.max(lower, 1800)}-${Math.min(upper, 2035)} sibling prior`,
        confidence,
      }
    );
  }

  function applyDonorCluster(builder, menu, indexes) {
    const donor = donorKey(menu);
    const prefix = menuNumberPrefix(menu.source);
    if (!donor || !prefix) return;
    const bucket = indexes.clusters.get(`${donor}|${prefix}`);
    if (!bucket || bucket.count < 4) return;
    const span = bucket.max - bucket.min;
    if (span > 80) return;
    applyRange(
      builder,
      {
        notBefore: bucket.min,
        notAfter: bucket.max,
        hard: false,
      },
      {
        method: "donor_cluster",
        source: "donor/menu-number cluster",
        snippet: `${bucket.count} dated ${sourceFamily(menu.source) || menu.donor || "cluster"} records with prefix ${prefix}`,
        effect: `adds ${bucket.min}-${bucket.max} cluster prior`,
        confidence: span <= 40 ? "C" : "D",
      }
    );
  }

  function applyPriceSupport(builder, menu, priceRecordsByMenu) {
    if (!priceRecordsByMenu || !priceRecordsByMenu.has(Number(menu.id))) return;
    if (!builder.evidence.length || !builder.lower || !builder.upper) return;
    const records = priceRecordsByMenu.get(Number(menu.id));
    addEvidence(builder, {
      method: "price_similarity",
      source: "price extraction",
      snippet: `${records.length} extracted price observation${records.length === 1 ? "" : "s"}`,
      effect: "support only; not used as a hard date bound",
      confidence: "D",
    });
  }

  function finalizeEstimate(builder, menu) {
    if (!builder.evidence.length) return null;
    let confidence = builder.conflict ? "X" : inferConfidence(builder, menu);
    if (!VALID_CONFIDENCE.has(confidence)) confidence = "D";
    const hasRange = builder.lower && builder.upper && builder.lower <= builder.upper;
    const centerYear = hasRange
      ? builder.centerHint && builder.centerHint >= builder.lower && builder.centerHint <= builder.upper
        ? builder.centerHint
        : Math.round((builder.lower + builder.upper) / 2)
      : null;
    const notBefore = builder.lower ? dateStart(builder.lower) : null;
    const notAfter = builder.upper ? dateEnd(builder.upper) : null;
    return {
      menuId: recordId(menu),
      estimatedNotBefore: notBefore,
      estimatedNotAfter: notAfter,
      estimatedCenterYear: centerYear,
      estimatedDecade: decadeFromYear(centerYear),
      confidence,
      methods: [...builder.methods].sort(),
      evidence: builder.evidence.slice(0, 8),
      reviewStatus: confidence === "X" ? "needs_review" : "machine_inferred",
    };
  }

  function inferConfidence(builder, menu) {
    if (builder.methods.has("metadata_date")) return "A";
    if (builder.methods.has("transcript_date") && builder.lower && builder.upper && builder.lower === builder.upper) return "A";
    if (builder.methods.has("restaurant_history") && builder.lower && builder.upper && builder.upper - builder.lower <= 35) return "B";
    if (builder.methods.has("same_restaurant_sibling")) {
      const hint = strongestConfidence(builder.confidenceHints);
      if (hint === "B") return "B";
      if (hint === "C") return "C";
    }
    const nonSupportMethods = [...builder.methods].filter((method) => method !== "price_similarity");
    if (nonSupportMethods.length >= 2 && builder.lower && builder.upper && builder.upper - builder.lower <= 70) return "C";
    const strongest = strongestConfidence(builder.confidenceHints);
    if (strongest === "B" && builder.lower && builder.upper && builder.upper - builder.lower <= 50) return "B";
    if (strongest === "B" || strongest === "C") return "C";
    return "D";
  }

  function estimateMenuDate(menu, context = {}) {
    const builder = makeEstimateBuilder(menu);
    const text = context.text || "";
    const clueMap = clueIndex(context.dateClues);
    applyExplicitDates(builder, menu, text);
    if (!menu.year) {
      applyPatternClues(builder, menu, text, clueMap);
      applyRestaurantRanges(builder, menu, context.restaurantRanges);
      applySameRestaurantSiblings(builder, menu, context.indexes || { restaurants: new Map(), clusters: new Map() });
      applyDonorCluster(builder, menu, context.indexes || { restaurants: new Map(), clusters: new Map() });
      applyPriceSupport(builder, menu, context.priceRecordsByMenu);
    }
    return finalizeEstimate(builder, menu);
  }

  function priceRecordsByMenu(priceSnapshot) {
    const map = new Map();
    for (const record of priceSnapshot?.records || []) {
      const id = Number(record.menuId);
      if (!Number.isFinite(id)) continue;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(record);
    }
    return map;
  }

  function summarize(records, menus) {
    const byConfidence = {};
    const byMethod = {};
    const menuLookup = menusById(menus);
    for (const record of records) {
      byConfidence[record.confidence] = (byConfidence[record.confidence] || 0) + 1;
      for (const method of record.methods) {
        byMethod[method] = (byMethod[method] || 0) + 1;
      }
    }
    const sourceUnknownYears = menus.filter((menu) => !numericYear(menu.year)).length;
    const plottableEstimated = records.filter(
      (record) => !numericYear(menuLookup.get(record.menuId)?.year) && PLOTTABLE_CONFIDENCE.has(record.confidence) && record.estimatedCenterYear
    ).length;
    const needsReview = records.filter((record) => record.confidence === "X" || record.confidence === "D").length;
    return {
      totalMenus: menus.length,
      sourceUnknownYears,
      records: records.length,
      knownDateDecadeFixes: records.filter((record) => record.methods.includes("metadata_date")).length,
      estimatedUnknownYears: records.filter((record) => record.estimatedCenterYear).length,
      plottableEstimated,
      undatedAfterEstimates: Math.max(sourceUnknownYears - plottableEstimated, 0),
      needsReview,
      byConfidence,
      byMethod,
    };
  }

  function menusById(menus) {
    const map = new Map();
    for (const menu of menus) {
      map.set(recordId(menu), menu);
      map.set(String(recordId(menu)), menu);
      if (Number.isFinite(Number(menu.id))) map.set(Number(menu.id), menu);
    }
    return map;
  }

  function validateEstimateSnapshot(snapshot) {
    const errors = [];
    if (!snapshot || !Array.isArray(snapshot.records)) errors.push("records must be an array");
    for (const [index, record] of (snapshot?.records || []).entries()) {
      if (record.menuId === undefined || record.menuId === null || String(record.menuId) === "") errors.push(`records[${index}].menuId missing`);
      if (!VALID_CONFIDENCE.has(record.confidence)) errors.push(`records[${index}].confidence invalid`);
      if (!Array.isArray(record.methods) || !record.methods.length) errors.push(`records[${index}].methods missing`);
      if (!Array.isArray(record.evidence) || !record.evidence.length) errors.push(`records[${index}].evidence missing`);
      if (!record.reviewStatus) errors.push(`records[${index}].reviewStatus missing`);
      if (record.estimatedCenterYear && !record.estimatedDecade) errors.push(`records[${index}].estimatedDecade missing`);
    }
    return errors;
  }

  function buildDateEstimateSnapshot({ menus, textsById = {}, dateClues = {}, restaurantRanges = {}, priceSnapshot = null, generatedAt = new Date().toISOString() }) {
    const indexes = buildSiblingIndexes(menus);
    const priceMap = priceRecordsByMenu(priceSnapshot);
    const records = [];
    for (const menu of menus) {
      if (!menu.year || isUnknownDecade(menu.decade)) {
        const estimate = estimateMenuDate(menu, {
          text: textsById[menu.id] || textsById[String(menu.id)] || "",
          dateClues,
          restaurantRanges,
          indexes,
          priceRecordsByMenu: priceMap,
        });
        if (estimate) records.push(estimate);
      }
    }
    records.sort((a, b) => String(a.menuId).localeCompare(String(b.menuId), undefined, { numeric: true }));
    const snapshot = {
      version: VERSION,
      generatedAt,
      methodology:
        "Deterministic date estimates preserve source metadata and add conservative ranges from metadata dates, OCR/title dates, postal/phone/payment markers, curated restaurant ranges, same-restaurant siblings, donor clusters, and price support.",
      sources: {
        dateClues: "./reference/date-clues.json",
        restaurantRanges: "./reference/restaurant-ranges.json",
      },
      summary: summarize(records, menus),
      records,
    };
    const errors = validateEstimateSnapshot(snapshot);
    if (errors.length) {
      throw new Error(`Invalid date estimate snapshot: ${errors.slice(0, 5).join("; ")}`);
    }
    return snapshot;
  }

  return {
    VERSION,
    buildDateEstimateSnapshot,
    decadeFromYear,
    estimateMenuDate,
    extractExplicitDatesFromText,
    isUnknownDecade,
    validateEstimateSnapshot,
    yearFromDate,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = MenuGraphDateEstimates;
}

if (typeof window !== "undefined") {
  window.MenuGraphDateEstimates = MenuGraphDateEstimates;
}
