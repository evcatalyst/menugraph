const fs = require("fs/promises");
const path = require("path");
const { buildPriceSnapshot } = require("../docs/price-utils");
const { fetchMenuText, getMenus, getOntology, ontologyStatus, selectOntologySample, startOntologyBuild } = require("../server");

const CONTENTDM_HOST = "ciadigitalcollections.culinary.edu";
const COLLECTION = "p16940coll1";
const DATA_DIR = path.join(__dirname, "..", "docs", "data");
const REFERENCE_DIR = path.join(DATA_DIR, "reference");
const WORLD_BANK_COUNTRIES = ["USA", "CAN", "GBR", "FRA", "DEU", "MEX", "BHS", "ITA", "ESP", "CHE"];
const BLS_SERIES = "CUUR0000SA0";

const contextEvents = [
  {
    id: "wwi-trade",
    label: "War trade disruption",
    startYear: 1914,
    endYear: 1918,
    countries: ["global"],
    note: "Wartime shipping, rationing, and commodity disruption can distort relative menu values.",
  },
  {
    id: "us-prohibition",
    label: "Prohibition context",
    startYear: 1920,
    endYear: 1933,
    countries: ["United States", "USA"],
    terms: ["wine", "beer", "cocktail", "whiskey", "champagne", "liquor"],
    note: "Alcohol pricing and availability may reflect legal restrictions rather than ordinary restaurant inflation.",
  },
  {
    id: "great-depression",
    label: "Depression-era demand shock",
    startYear: 1929,
    endYear: 1939,
    countries: ["global"],
    note: "Depression-era prices may reflect weak demand, wage pressure, and deflationary conditions.",
  },
  {
    id: "wwii-rationing",
    label: "Wartime rationing",
    startYear: 1939,
    endYear: 1945,
    countries: ["global"],
    terms: ["beef", "butter", "sugar", "coffee", "meat", "steak", "ham", "bacon"],
    note: "Wartime rationing and supply controls can make menu prices less comparable to peacetime values.",
  },
  {
    id: "uk-postwar-rationing",
    label: "Postwar rationing",
    startYear: 1946,
    endYear: 1954,
    countries: ["United Kingdom", "GBR", "England", "Scotland"],
    note: "Some British food rationing persisted after WWII, affecting relative restaurant value.",
  },
  {
    id: "cuba-embargo",
    label: "Trade restriction context",
    startYear: 1960,
    endYear: 1965,
    countries: ["United States", "USA"],
    terms: ["sugar", "rum", "cuban", "cuba"],
    note: "Trade restrictions can affect sugar, rum, and Caribbean-linked pricing signals.",
  },
  {
    id: "oil-shock",
    label: "Energy shock context",
    startYear: 1973,
    endYear: 1975,
    countries: ["global"],
    note: "Energy and transport shocks may affect restaurant costs beyond ordinary CPI movement.",
  },
];

function argValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function directImageUrl(id) {
  return `https://${CONTENTDM_HOST}/digital/api/singleitem/image/${COLLECTION}/${id}/default.jpg`;
}

function publicMenu(menu) {
  return {
    ...menu,
    itemUrl: `https://${CONTENTDM_HOST}/digital/collection/${COLLECTION}/id/${menu.id}`,
    imageUrl: directImageUrl(menu.id),
  };
}

function publicOntology(ontology) {
  const { job, recordTexts, termIndex, ...rest } = ontology;
  return rest;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildTextOntology(limit) {
  startOntologyBuild(limit, true);
  let lastMessage = "";
  while (ontologyStatus().active) {
    const status = ontologyStatus();
    const message = `${status.phase}: ${status.indexed}/${status.total || "..."} checked, ${status.transcriptRecords} transcript records`;
    if (message !== lastMessage) {
      console.log(message);
      lastMessage = message;
    }
    await sleep(1000);
  }
  const status = ontologyStatus();
  if (status.error) throw new Error(status.error);
  return getOntology(false);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed ${response.status}: ${url}`);
  return response.json();
}

async function fetchBlsCpi() {
  const endYear = new Date().getFullYear();
  const annual = {};
  const monthly = [];
  for (let start = 1913; start <= endYear; start += 10) {
    const end = Math.min(start + 9, endYear);
    const url = `https://api.bls.gov/publicAPI/v2/timeseries/data/${BLS_SERIES}?startyear=${start}&endyear=${end}`;
    const payload = await fetchJson(url);
    const data = payload?.Results?.series?.[0]?.data || [];
    for (const item of data) {
      if (!/^M\d{2}$/.test(item.period) || item.value === "-") continue;
      monthly.push({
        year: Number(item.year),
        period: item.period,
        value: Number(item.value),
        latest: item.latest === "true",
      });
    }
  }

  const byYear = new Map();
  for (const item of monthly) {
    if (!byYear.has(item.year)) byYear.set(item.year, []);
    byYear.get(item.year).push(item.value);
  }
  for (const [year, values] of byYear) {
    if (values.length) annual[year] = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3));
  }

  const latest = monthly
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => b.year - a.year || Number(b.period.slice(1)) - Number(a.period.slice(1)))[0];

  return {
    source: "U.S. Bureau of Labor Statistics",
    sourceUrl: "https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SA0",
    seriesId: BLS_SERIES,
    title: "Consumer Price Index for All Urban Consumers: All Items in U.S. City Average",
    basis: "1982-84=100",
    fetchedAt: new Date().toISOString(),
    latestReferenceDate: latest ? `${latest.year}-${latest.period.slice(1).padStart(2, "0")}` : null,
    annual,
  };
}

async function fetchWorldBankCpi() {
  const countries = WORLD_BANK_COUNTRIES.join(";");
  const url = `https://api.worldbank.org/v2/country/${countries}/indicator/FP.CPI.TOTL?format=json&per_page=20000`;
  const payload = await fetchJson(url);
  const rows = Array.isArray(payload) ? payload[1] || [] : [];
  const output = {};
  for (const row of rows) {
    if (!row.value || !row.countryiso3code) continue;
    const iso = row.countryiso3code;
    if (!output[iso]) {
      output[iso] = {
        country: row.country?.value || iso,
        iso3: iso,
        annual: {},
      };
    }
    output[iso].annual[row.date] = Number(Number(row.value).toFixed(6));
  }
  for (const country of Object.values(output)) {
    country.latestReferenceYear = Object.entries(country.annual)
      .map(([year, value]) => [Number(year), Number(value)])
      .filter(([, value]) => Number.isFinite(value))
      .sort((a, b) => b[0] - a[0])[0]?.[0] || null;
  }
  return {
    source: "World Bank",
    sourceUrl: "https://api.worldbank.org/v2/country/{countries}/indicator/FP.CPI.TOTL",
    indicator: "FP.CPI.TOTL",
    title: "Consumer price index (2010 = 100)",
    fetchedAt: new Date().toISOString(),
    countries: output,
  };
}

function fxReference() {
  return {
    source: "Federal Reserve H.10",
    sourceUrl: "https://www.federalreserve.gov/releases/h10/",
    fetchedAt: new Date().toISOString(),
    rates: {},
    note: "Historical FX is not applied in this static build; non-U.S. prices use local CPI-relative indexing when available.",
  };
}

async function buildReferences() {
  await fs.mkdir(REFERENCE_DIR, { recursive: true });
  console.log("Fetching official price reference data...");
  const [cpiUs, cpiCountry] = await Promise.all([fetchBlsCpi(), fetchWorldBankCpi()]);
  const fx = fxReference();
  await fs.writeFile(path.join(REFERENCE_DIR, "cpi-us.json"), JSON.stringify(cpiUs), "utf8");
  await fs.writeFile(path.join(REFERENCE_DIR, "cpi-country.json"), JSON.stringify(cpiCountry), "utf8");
  await fs.writeFile(path.join(REFERENCE_DIR, "fx.json"), JSON.stringify(fx), "utf8");
  await fs.writeFile(path.join(REFERENCE_DIR, "context-events.json"), JSON.stringify(contextEvents), "utf8");
  return { cpiUs, cpiCountry, fx };
}

async function mapLimit(items, limit, mapper) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function buildPrices(menus, references, rawLimit) {
  const limit = rawLimit === "all" ? "all" : Math.max(Number(rawLimit) || 180, 25);
  const selected = selectOntologySample(menus, limit);
  const textsById = {};
  let fetched = 0;
  console.log(`Extracting prices from ${selected.length.toLocaleString()} transcript samples...`);
  await mapLimit(selected, 4, async (menu) => {
    try {
      const text = await fetchMenuText(menu.id);
      if (text) textsById[menu.id] = text;
    } catch (error) {
      // OCR availability is uneven; skipped menus still leave the static build usable.
    }
    fetched += 1;
    if (fetched % 25 === 0 || fetched === selected.length) {
      console.log(`price transcripts: ${fetched}/${selected.length}`);
    }
  });
  return buildPriceSnapshot({ menus, textsById, references, contextEvents });
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  console.log("Building static menu snapshot...");
  let publicMenusPayload = null;
  try {
    const menusPayload = await getMenus(true);
    publicMenusPayload = {
      ...menusPayload,
      menus: menusPayload.menus.map(publicMenu),
    };
  } catch (error) {
    console.warn(`CONTENTdm metadata refresh failed; reusing committed menus.json. ${error.message}`);
    publicMenusPayload = JSON.parse(await fs.readFile(path.join(DATA_DIR, "menus.json"), "utf8"));
  }
  await fs.writeFile(path.join(DATA_DIR, "menus.json"), JSON.stringify(publicMenusPayload), "utf8");
  console.log(`Wrote ${publicMenusPayload.menus.length.toLocaleString()} menus.`);

  const textLimit = argValue("text");
  let ontology = null;
  try {
    ontology = textLimit ? await buildTextOntology(textLimit) : await getOntology(true);
  } catch (error) {
    console.warn(`Ontology refresh failed; reusing committed ontology.json. ${error.message}`);
    ontology = JSON.parse(await fs.readFile(path.join(DATA_DIR, "ontology.json"), "utf8"));
  }
  await fs.writeFile(path.join(DATA_DIR, "ontology.json"), JSON.stringify(publicOntology(ontology)), "utf8");
  console.log(`Wrote ${ontology.mode} ontology with ${Number(ontology.transcriptRecords || 0).toLocaleString()} transcript records.`);

  const references = await buildReferences();
  const priceSnapshot = await buildPrices(publicMenusPayload.menus, references, argValue("prices"));
  await fs.writeFile(path.join(DATA_DIR, "prices.json"), JSON.stringify(priceSnapshot), "utf8");
  console.log(`Wrote ${priceSnapshot.records.length.toLocaleString()} price observations.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
