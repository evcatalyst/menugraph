const VERSION = 1;

const STOP_PHRASES = new Set([
  "the culinary institute",
  "copyright not evaluated",
  "holding institution",
  "contact information",
  "publisher digital",
  "all rights reserved",
]);

const MEALS = [
  ["breakfast", /\bbreakfast\b/],
  ["brunch", /\bbrunch\b/],
  ["luncheon", /\bluncheon\b|\blunch\b|\bdejeuner\b/],
  ["dinner", /\bdinner\b|\bdiner\b|\bdu diner\b/],
  ["supper", /\bsupper\b/],
  ["tea", /\bafternoon tea\b|\btea room\b|\bhigh tea\b/],
  ["dessert", /\bdessert\b|\bdesserts\b/],
  ["cocktails", /\bcocktail\b|\bcocktails\b/],
  ["banquet", /\bbanquet\b|\bfeast\b|\bgala\b/],
];

const INGREDIENTS = [
  "almond",
  "anchovy",
  "apple",
  "artichoke",
  "asparagus",
  "bacon",
  "banana",
  "bass",
  "beans",
  "beef",
  "beet",
  "berries",
  "butter",
  "cabbage",
  "carrot",
  "caviar",
  "celery",
  "cheese",
  "cherry",
  "chicken",
  "chocolate",
  "clam",
  "cod",
  "corn",
  "crab",
  "cream",
  "duck",
  "egg",
  "fish",
  "garlic",
  "ham",
  "lamb",
  "lemon",
  "lettuce",
  "lobster",
  "mushroom",
  "mutton",
  "olive",
  "onion",
  "orange",
  "oyster",
  "pea",
  "peach",
  "pineapple",
  "pork",
  "potato",
  "rice",
  "salmon",
  "sardine",
  "sausage",
  "shrimp",
  "sole",
  "spinach",
  "strawberry",
  "sweetbread",
  "tomato",
  "trout",
  "turkey",
  "veal",
  "venison",
];

const DISHES = [
  "baked alaska",
  "bisque",
  "bouillabaisse",
  "canape",
  "chicken a la king",
  "chop suey",
  "chowder",
  "club sandwich",
  "consomme",
  "curry",
  "filet mignon",
  "fruit cocktail",
  "hamburger",
  "ice cream",
  "lobster thermidor",
  "omelet",
  "oysters rockefeller",
  "pie",
  "pudding",
  "rarebit",
  "roast beef",
  "salad",
  "sandwich",
  "sherbet",
  "soup",
  "spaghetti",
  "steak",
  "souffle",
  "terrapin",
];

const BEVERAGES = [
  ["beer", /\bbeer\b|\bale\b|\blager\b/],
  ["bordeaux and claret", /\bchateau\b|\bclaret\b|\bbordeaux\b|\bcanet\b|\bcerons\b/],
  ["cafe", /\bcafe\b|\bcoffee\b/],
  ["champagne", /\bchampagne\b|\bbrut\b|\bsec\b|\bpommery\b|\bruinart\b/],
  ["cocktails", /\bcocktail\b|\bmartini\b|\bmanhattan\b/],
  ["liqueurs", /\bliqueur\b|\bliquer\b|\bliquers\b|\bliquors\b/],
  ["sherry", /\bsherry\b|\bamontillado\b/],
  ["tea", /\btea\b/],
  ["wine", /\bwine\b|\bport\b|\bsauterne\b|\bburgundy\b|\bchianti\b|\bmadeira\b/],
];

const STYLES = [
  ["a la carte", /\ba la carte\b/],
  ["airline", /\bairline\b|\bairways\b|\bflight\b/],
  ["banquet", /\bbanquet\b|\bgala\b|\btestimonial\b/],
  ["buffet", /\bbuffet\b/],
  ["children's menu", /\bchildren'?s\b|\bchildrens\b/],
  ["chinese", /\bchinese\b|\bcantonese\b|\bchop suey\b/],
  ["club dining", /\bclub\b|\bsociety\b|\bassociation\b/],
  ["continental", /\bcontinental\b/],
  ["creole", /\bcreole\b|\bcajun\b/],
  ["french", /\bfrench\b|\bfrancais\b|\bparis\b/],
  ["german", /\bgerman\b|\bdeutsch\b|\bberlin\b/],
  ["hotel dining", /\bhotel\b|\binn\b|\bresort\b|\bmotor hotel\b/],
  ["italian", /\bitalian\b|\bspaghetti\b|\bravioli\b/],
  ["japanese", /\bjapanese\b|\byakitori\b|\bsukiyaki\b/],
  ["mexican", /\bmexican\b|\btamale\b|\btaco\b/],
  ["prix fixe", /\bprix fixe\b/],
  ["railroad", /\brailroad\b|\brailway\b|\bpullman\b|\bdining car\b/],
  ["room service", /\broom service\b/],
  ["seafood", /\bseafood\b|\boyster\b|\blobster\b|\bclam\b|\bcrab\b|\bshrimp\b/],
  ["shipboard", /\bship\b|\bsteamship\b|\bocean liner\b|\bcruise\b|\bss\b/],
  ["swedish", /\bswedish\b|\bsmorgasbord\b/],
  ["table d'hote", /\btable d'?hote\b/],
  ["take out", /\btake out\b|\btakeout\b/],
  ["vegetarian", /\bvegetarian\b|\bvegan\b/],
  ["wine and spirits", /\bwine list\b|\bdrink list\b|\bcocktail\b|\bspirits\b/],
];

const CLUSTERS = [
  ["New York dining", (menu) => has(menu.state, "new york") || has(menu.city, "new york")],
  ["Resort and hotel menus", (menu, text) => /\bhotel\b|\binn\b|\bresort\b|\bmotor hotel\b/.test(text)],
  ["Travel dining", (menu, text) => /\brailroad\b|\brailway\b|\bpullman\b|\bship\b|\bsteamship\b|\bairline\b|\bcruise\b/.test(text)],
  ["Club and society events", (menu, text) => /\bclub\b|\bsociety\b|\bassociation\b|\bannual\b|\bbanquet\b|\bgala\b/.test(text)],
  ["International menus", (menu) => menu.country && !has(menu.country, "united states") && !has(menu.country, "unknown")],
  ["Seafood traditions", (menu, text) => /\bseafood\b|\boyster\b|\blobster\b|\bclam\b|\bcrab\b|\bshrimp\b|\bterrapin\b/.test(text)],
  ["Wine and cocktail culture", (menu, text) => /\bwine list\b|\bdrink list\b|\bcocktail\b|\bspirits\b|\bbar\b/.test(text)],
  ["Holiday and ceremonial meals", (menu, text) => /\bchristmas\b|\bthanksgiving\b|\beaster\b|\bnew year\b|\bmemorial\b|\brecognition\b|\btestimonial\b/.test(text)],
  ["CIA campus and institutional menus", (menu, text) => /\bhyde park\b|\balumni association\b/.test(text)],
  ["Chinese American menus", (menu, text) => /\bchinese\b|\bcantonese\b|\bchop suey\b|\bchow mein\b/.test(text)],
];

function buildMetadataOntology(menus) {
  return buildOntology(menus, new Map(), { mode: "metadata" });
}

function buildOntology(menus, textById = new Map(), options = {}) {
  const terms = new Map();
  const indexedRecords = [];
  const mode = options.mode || (textById.size ? "transcript" : "metadata");

  for (const menu of menus) {
    const transcript = textById.get(menu.id) || "";
    const text = normalizeText(
      [
        menu.title,
        menu.restaurant,
        menu.types?.join(" "),
        menu.cuisine?.join(" "),
        menu.illustrations?.join(" "),
        menu.digitalCollection,
        menu.source,
        transcript,
      ].join("\n")
    );

    const recordTermKeys = new Set();
    const add = (category, term, source = "metadata") => {
      addTerm(terms, category, term, menu, source);
      recordTermKeys.add(`${category}:${slug(term)}`);
    };

    for (const [term, pattern] of MEALS) {
      if (pattern.test(text)) add("meals", term);
    }
    for (const ingredient of INGREDIENTS) {
      if (wordPattern(ingredient).test(text)) add("ingredients", ingredient, transcript ? "transcript" : "metadata");
    }
    for (const dish of DISHES) {
      if (wordPattern(dish).test(text)) add("dishes", dish, transcript ? "transcript" : "metadata");
    }
    for (const [beverage, pattern] of BEVERAGES) {
      if (pattern.test(text)) add("beverages", beverage, transcript ? "transcript" : "metadata");
    }
    for (const cuisine of menu.cuisine || []) {
      if (cuisine) add("styles", cuisine);
    }
    for (const type of menu.types || []) {
      if (type) add("styles", normalizeLabel(type));
    }
    for (const [style, pattern] of STYLES) {
      if (pattern.test(text)) add("styles", style);
    }
    for (const lineItem of discoverLineItems(transcript)) {
      add(lineItem.category, lineItem.term, "line item");
    }
    for (const [cluster, test] of CLUSTERS) {
      if (test(menu, text)) add("clusters", cluster);
    }

    if (recordTermKeys.size) {
      indexedRecords.push({
        id: menu.id,
        year: menu.year,
        decade: cleanDimension(menu.decade),
        place: placeFor(menu),
        terms: [...recordTermKeys],
      });
    }
  }

  const termList = [...terms.values()].map(finalizeTerm).sort(sortTerms);
  const grouped = groupTerms(termList);
  return {
    version: VERSION,
    mode,
    createdAt: new Date().toISOString(),
    totalRecords: menus.length,
    indexedRecords: indexedRecords.length,
    transcriptRecords: textById.size,
    categories: {
      meals: topTerms(grouped.meals),
      dishes: topTerms(grouped.dishes),
      ingredients: topTerms(grouped.ingredients),
      beverages: topTerms(grouped.beverages),
      styles: topTerms(grouped.styles),
      clusters: topTerms(grouped.clusters),
    },
    termIndex: termList,
    insights: makeInsights(grouped, menus.length, textById.size),
  };
}

function addTerm(terms, category, rawTerm, menu, source) {
  const term = normalizeLabel(rawTerm);
  if (!term || term.length < 2) return;
  const key = `${category}:${slug(term)}`;
  const existing =
    terms.get(key) ||
    terms.set(key, {
      id: key,
      category,
      term,
      count: 0,
      recordIds: new Set(),
      decades: new Map(),
      places: new Map(),
      examples: [],
      sources: new Set(),
    }).get(key);

  if (existing.recordIds.has(menu.id)) return;
  existing.recordIds.add(menu.id);
  existing.count += 1;
  existing.sources.add(source);
  increment(existing.decades, cleanDimension(menu.decade));
  increment(existing.places, placeFor(menu));
  if (existing.examples.length < 4) {
    existing.examples.push({
      id: menu.id,
      title: menu.title,
      date: menu.date,
      place: placeFor(menu),
    });
  }
}

function finalizeTerm(term) {
  return {
    ...term,
    recordIds: [...term.recordIds].slice(0, 120),
    decades: Object.fromEntries([...term.decades.entries()].sort()),
    places: Object.fromEntries([...term.places.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)),
    sources: [...term.sources],
  };
}

function groupTerms(terms) {
  return terms.reduce(
    (acc, term) => {
      acc[term.category].push(term);
      return acc;
    },
    { meals: [], dishes: [], ingredients: [], beverages: [], styles: [], clusters: [] }
  );
}

function topTerms(terms, limit = 28) {
  return (terms || []).slice(0, limit);
}

function sortTerms(a, b) {
  return b.count - a.count || a.term.localeCompare(b.term);
}

function makeInsights(grouped, totalRecords, transcriptRecords) {
  const insights = [];
  const topMeal = grouped.meals[0];
  const topIngredient = grouped.ingredients[0];
  const topStyle = grouped.styles[0];
  const topCluster = grouped.clusters[0];
  const topDish = grouped.dishes[0];
  const topBeverage = grouped.beverages[0];

  if (topMeal) insights.push(`${titleCase(topMeal.term)} is the strongest indexed meal signal across ${topMeal.count.toLocaleString()} records.`);
  if (topIngredient) insights.push(`${titleCase(topIngredient.term)} is the most visible ingredient term, with concentrations in ${topPlaces(topIngredient)}.`);
  if (topDish) insights.push(`${titleCase(topDish.term)} leads the dish vocabulary in this index.`);
  if (topBeverage) insights.push(`${titleCase(topBeverage.term)} is the strongest beverage signal, useful for tracking pairings and wine-list culture.`);
  if (topStyle) insights.push(`${titleCase(topStyle.term)} is the most common style or service signal.`);
  if (topCluster) insights.push(`${topCluster.term} is the largest discovered cluster, covering ${topCluster.count.toLocaleString()} records.`);
  insights.push(
    transcriptRecords
      ? `${transcriptRecords.toLocaleString()} records include OCR-derived terms; metadata still anchors the rest of the archive.`
      : `This first pass is metadata-derived across ${totalRecords.toLocaleString()} records; run the text index to add OCR dish and ingredient evidence.`
  );
  return insights.slice(0, 5);
}

function topPlaces(term) {
  const places = Object.entries(term.places || {})
    .filter(([place]) => place !== "unknown")
    .slice(0, 2)
    .map(([place]) => titleCase(place));
  return places.length ? places.join(" and ") : "the indexed collection";
}

function discoverLineItems(text) {
  if (!text) return [];
  const found = new Map();
  const lines = text
    .split(/\n+/)
    .map(cleanLine)
    .filter(Boolean)
    .slice(0, 400);

  for (const line of lines) {
    for (const candidate of line.split(/\s{2,}| {0,1}[.;] {0,1}/)) {
      const phrase = cleanLine(candidate);
      const normalized = normalizeLabel(phrase);
      if (isBeveragePhrase(phrase)) found.set(`beverages:${normalized}`, { category: "beverages", term: normalized });
      else if (isDishPhrase(phrase)) found.set(`dishes:${normalized}`, { category: "dishes", term: normalized });
      if (found.size >= 50) return [...found.values()];
    }
  }
  return [...found.values()];
}

function isDishPhrase(phrase) {
  const normalized = normalizeText(phrase);
  if (normalized.length < 6 || normalized.length > 58) return false;
  if (STOP_PHRASES.has(normalized)) return false;
  if (/\d{2,}|menu|street|avenue|copyright|telephone|superior|restaurant|dinner|luncheon/.test(normalized)) return false;
  if (normalized.split(/\s+/).length > 6) return false;
  return (
    /\b(a la|au|with|sauce|roast|fried|broiled|baked|grilled|creamed|stewed|braised|sauteed|stuffed|boiled|filet|fillet|soup|salad|sandwich|steak|chop|cutlet|pudding|pie|cake|cream|omelet|consomme|chowder|ragout|fricassee|glace|sorbet)\b/.test(normalized) ||
    INGREDIENTS.some((ingredient) => wordPattern(ingredient).test(normalized))
  );
}

function isBeveragePhrase(phrase) {
  const normalized = normalizeText(phrase);
  if (!normalized || normalized.length > 42 || normalized.split(/\s+/).length > 5) return false;
  if (/\d{2,}|menu|street|avenue|restaurant/.test(normalized)) return false;
  return BEVERAGES.some(([, pattern]) => pattern.test(normalized));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLabel(value) {
  return normalizeText(value)
    .replace(/\bmenus?\b/g, "menu")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLine(value) {
  return String(value || "")
    .replace(/\$?\d+([.,]\d+)?/g, " ")
    .replace(/[_=*•|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDimension(value) {
  return normalizeLabel(value) || "unknown";
}

function placeFor(menu) {
  return cleanDimension(menu.city || menu.state || menu.country);
}

function slug(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function wordPattern(term) {
  const escaped = normalizeText(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}s?\\b`);
}

function has(value, term) {
  return normalizeText(value).includes(term);
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function titleCase(value) {
  return String(value || "")
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

const api = {
  VERSION,
  buildMetadataOntology,
  buildOntology,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.MenuGraphOntology = api;
}
