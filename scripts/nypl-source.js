const fs = require("fs/promises");
const path = require("path");
const {
  buildMatchEvidence,
  cleanValue,
  normalizeCiaMenu,
  normalizeNyplMenu,
  normalizeText,
  recordUid,
  summarizeMenus,
  titleCase,
  uidFor,
  yearFromDate,
} = require("../docs/multisource");

const DEFAULT_EXPORT_DIR = path.join(__dirname, "..", ".cache", "nypl", "extract");
const WOTM_SOURCE_URL = "https://www.nypl.org/research/support/whats-on-the-menu";
const PRICE_RECORDS_PER_DECADE = 1600;

function argValue(args, name) {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function parseCsvRecords(text) {
  const records = [];
  let field = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      records.push(row);
      field = "";
      row = [];
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    records.push(row);
  }
  return records;
}

async function readCsv(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const [header, ...records] = parseCsvRecords(text);
  return records
    .filter((record) => record.length && record.some(Boolean))
    .map((record) =>
      header.reduce((row, key, index) => {
        row[key] = record[index] || "";
        return row;
      }, {})
    );
}

function finitePrice(value) {
  const text = cleanValue(value);
  if (!text) return null;
  const number = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function percentile(values, q) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * q)));
  return Number(sorted[index].toFixed(2));
}

function addStat(bucket, price) {
  bucket.count += 1;
  if (price !== null) {
    bucket.priceCount += 1;
    bucket.prices.push(price);
  }
}

function finalizePriceBucket(bucket) {
  const avg = bucket.priceCount ? bucket.prices.reduce((sum, price) => sum + price, 0) / bucket.priceCount : null;
  return {
    count: bucket.count,
    priceCount: bucket.priceCount,
    avgPrice: avg === null ? null : Number(avg.toFixed(2)),
    medianPrice: percentile(bucket.prices, 0.5),
    p90Price: percentile(bucket.prices, 0.9),
  };
}

function statBucket() {
  return { count: 0, priceCount: 0, prices: [] };
}

function decadeFromYear(year) {
  return year ? `${Math.floor(year / 10) * 10}s` : "unknown";
}

function shouldUseDollarPrice(menu) {
  const currency = cleanValue(menu.currency).toLowerCase();
  const symbol = cleanValue(menu.currencySymbol || menu.currency_symbol);
  return !currency || currency === "dollars" || symbol === "$";
}

function simplifyDishName(name) {
  return normalizeText(name)
    .replace(/\b(with|and|or|fresh|cold|hot|a la|au|de|du|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function dishCategory(name) {
  const normalized = normalizeText(name);
  if (/\b(coffee|tea|wine|beer|ale|cocktail|champagne|whiskey|whisky|brandy|cider|soda|water)\b/.test(normalized)) return "beverages";
  if (/\b(ice cream|cake|pie|pudding|sherbet|dessert|pastry|tart)\b/.test(normalized)) return "desserts";
  if (/\b(oyster|lobster|clam|crab|fish|salmon|shrimp|sole|cod)\b/.test(normalized)) return "seafood";
  if (/\b(beef|steak|mutton|lamb|veal|pork|chicken|turkey|duck|ham)\b/.test(normalized)) return "mains";
  if (/\b(soup|consomme|bisque|chowder)\b/.test(normalized)) return "soups";
  if (/\b(salad|lettuce|celery|tomato)\b/.test(normalized)) return "salads";
  return "dishes";
}

function topEntries(map, limit) {
  return [...map.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function buildAnalytics({ menus, dishStats, priceStats, relationships }) {
  const sourceCounts = summarizeMenus(menus).sources;
  const topDishes = topEntries(dishStats, 80).map((entry) => ({
    name: entry.name,
    normalized: entry.normalized,
    category: entry.category,
    count: entry.count,
    menus: entry.menus.size,
    firstYear: entry.years.length ? Math.min(...entry.years) : null,
    lastYear: entry.years.length ? Math.max(...entry.years) : null,
    decades: Object.fromEntries([...entry.decades.entries()].sort()),
    sources: Object.fromEntries([...entry.sources.entries()].sort()),
  }));

  const priceByDecade = Object.fromEntries(
    [...priceStats.byDecade.entries()]
      .sort()
      .map(([decade, bucket]) => [decade, finalizePriceBucket(bucket)])
  );
  const priceByDish = Object.fromEntries(
    [...priceStats.byDish.entries()]
      .sort((a, b) => b[1].priceCount - a[1].priceCount)
      .slice(0, 60)
      .map(([dish, bucket]) => [dish, finalizePriceBucket(bucket)])
  );

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    sourceUrl: WOTM_SOURCE_URL,
    summary: {
      totalMenus: menus.length,
      sourceCounts,
      matchedRelationships: relationships.length,
    },
    topDishes,
    priceStats: {
      currency: "Dollars or source-blank NYPL rows treated as comparable dollars",
      byDecade: priceByDecade,
      byDish: priceByDish,
    },
    graph: {
      nodes: menus
        .filter((menu) => Number(menu.matchCount || 0) > 0)
        .slice(0, 300)
        .map((menu) => ({
          id: recordUid(menu),
          label: menu.restaurant || menu.title,
          source: menu.sourceKey,
          year: menu.year,
          place: [menu.city, menu.state, menu.country].filter(Boolean).join(", "),
        })),
      relationships: relationships.slice(0, 500),
    },
  };
}

async function loadNyplExport(exportDir = DEFAULT_EXPORT_DIR) {
  const [menus, pages, dishes, items] = await Promise.all([
    readCsv(path.join(exportDir, "Menu.csv")),
    readCsv(path.join(exportDir, "MenuPage.csv")),
    readCsv(path.join(exportDir, "Dish.csv")),
    readCsv(path.join(exportDir, "MenuItem.csv")),
  ]);
  return { menus, pages, dishes, items };
}

function buildNyplFromRows({ menus, pages, dishes, items }) {
  const menuRows = new Map(menus.map((menu) => [String(menu.id), menu]));
  const dishRows = new Map(dishes.map((dish) => [String(dish.id), dish]));
  const pageRows = new Map();
  const firstPageByMenu = new Map();
  for (const page of pages) {
    pageRows.set(String(page.id), page);
    const menuId = String(page.menu_id);
    const previous = firstPageByMenu.get(menuId);
    if (!previous || Number(page.page_number || 9999) < Number(previous.page_number || 9999)) {
      firstPageByMenu.set(menuId, page);
    }
  }

  const dishStats = new Map();
  const priceStats = { byDecade: new Map(), byDish: new Map() };
  const priceRecordsByDecade = new Map();
  const priceRecordBuckets = new Map();
  const menuExtras = new Map();

  for (const item of items) {
    const page = pageRows.get(String(item.menu_page_id));
    if (!page) continue;
    const menu = menuRows.get(String(page.menu_id));
    const dish = dishRows.get(String(item.dish_id));
    if (!menu || !dish) continue;

    const menuId = String(menu.id);
    const dishName = cleanValue(dish.name);
    const normalizedDish = simplifyDishName(dishName);
    const year = yearFromDate(menu.date);
    const decade = decadeFromYear(year);
    const sourceKey = "nypl";
    const price = shouldUseDollarPrice(menu) ? finitePrice(item.price) : null;

    const extras =
      menuExtras.get(menuId) ||
      menuExtras.set(menuId, {
        itemCount: 0,
        priceCount: 0,
        dishCounts: new Map(),
      }).get(menuId);
    extras.itemCount += 1;
    if (price !== null) extras.priceCount += 1;
    if (dishName && extras.dishCounts.size < 40) {
      extras.dishCounts.set(dishName, (extras.dishCounts.get(dishName) || 0) + 1);
    }

    if (normalizedDish) {
      const stat =
        dishStats.get(normalizedDish) ||
        dishStats.set(normalizedDish, {
          name: titleCase(normalizedDish),
          normalized: normalizedDish,
          category: dishCategory(normalizedDish),
          count: 0,
          menus: new Set(),
          years: [],
          decades: new Map(),
          sources: new Map(),
        }).get(normalizedDish);
      stat.count += 1;
      stat.menus.add(menuId);
      if (year) stat.years.push(year);
      stat.decades.set(decade, (stat.decades.get(decade) || 0) + 1);
      stat.sources.set(sourceKey, (stat.sources.get(sourceKey) || 0) + 1);
    }

    if (price !== null && normalizedDish) {
      const decadeBucket = priceStats.byDecade.get(decade) || statBucket();
      addStat(decadeBucket, price);
      priceStats.byDecade.set(decade, decadeBucket);
      const dishBucket = priceStats.byDish.get(normalizedDish) || statBucket();
      addStat(dishBucket, price);
      priceStats.byDish.set(normalizedDish, dishBucket);

      const recordBucket = `${decade}:${normalizedDish.slice(0, 24)}`;
      const bucketCount = priceRecordBuckets.get(recordBucket) || 0;
      const decadeRecords = priceRecordsByDecade.get(decade) || [];
      if (decadeRecords.length < PRICE_RECORDS_PER_DECADE && bucketCount < 8) {
        priceRecordBuckets.set(recordBucket, bucketCount + 1);
        decadeRecords.push({
          id: `nypl-${item.id}`,
          menuId: uidFor("nypl", menuId),
          menuUid: uidFor("nypl", menuId),
          sourceKey,
          sourceRecordId: menuId,
          item: dishName,
          rawLine: `${dishName} ${item.price}${item.high_price ? `-${item.high_price}` : ""}`,
          rawPrice: item.price,
          rawAmount: price,
          amount: Number(price.toFixed(4)),
          scale: "structured-nypl",
          scaleConfidence: "high",
          scaleReason: "NYPL What's on the Menu? structured transcription",
          currency: "USD",
          currencyLabel: "U.S. dollars",
          country: "United States",
          iso3: "USA",
          place: cleanValue(menu.place) || "unknown",
          year,
          decade,
          menuTitle: cleanValue(menu.name) || "NYPL menu",
          menuType: [cleanValue(menu.event), cleanValue(menu.venue), cleanValue(menu.occasion)].filter(Boolean),
          sourceUrl: WOTM_SOURCE_URL,
          score: 0.92,
          confidence: "high",
          reasons: ["NYPL structured row", "transcribed dish", "source price"],
          context: [],
        });
        priceRecordsByDecade.set(decade, decadeRecords);
      }
    }
  }

  const nyplMenus = menus.map((menu) => {
    const extras = menuExtras.get(String(menu.id)) || { itemCount: 0, priceCount: 0, dishCounts: new Map() };
    const topDishes = [...extras.dishCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([name]) => name);
    return normalizeNyplMenu(menu, {
      firstPage: firstPageByMenu.get(String(menu.id)),
      topDishes,
      itemCount: extras.itemCount,
      priceCount: extras.priceCount,
    });
  });

  const priceRecords = [...priceRecordsByDecade.entries()]
    .sort((a, b) => decadeSortValue(a[0]) - decadeSortValue(b[0]))
    .flatMap(([, records]) => records);

  return { nyplMenus, dishStats, priceStats, priceRecords };
}

function decadeSortValue(decade) {
  const match = String(decade || "").match(/\d{4}/);
  return match ? Number(match[0]) : 9999;
}

function withMatchCounts(menus, matchMap) {
  return menus.map((menu) => ({
    ...menu,
    matchCount: (matchMap[recordUid(menu)] || []).length,
  }));
}

function combineSources({ ciaMenus, nyplMenus }) {
  const normalizedCia = ciaMenus.map(normalizeCiaMenu);
  const { matchMap, relationships } = buildMatchEvidence(normalizedCia, nyplMenus, 4);
  const menus = withMatchCounts([...normalizedCia, ...nyplMenus], matchMap).sort((a, b) => {
    const aYear = a.year || 9999;
    const bYear = b.year || 9999;
    return aYear - bYear || cleanValue(a.title).localeCompare(cleanValue(b.title));
  });
  return { menus, matchMap, relationships };
}

module.exports = {
  DEFAULT_EXPORT_DIR,
  argValue,
  buildAnalytics,
  buildNyplFromRows,
  combineSources,
  loadNyplExport,
  parseCsvRecords,
  readCsv,
};
