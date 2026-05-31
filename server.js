const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const chatApi = require("./docs/chat-utils");
const { buildMetadataOntology, buildOntology } = require("./docs/ontology");
const { filterMenusBySource, normalizeCiaMenu, recordUid, summarizeMenus } = require("./docs/multisource");

const PORT = Number(process.env.PORT || 4173);
const HOST = "127.0.0.1";
const CONTENTDM_HOST = "ciadigitalcollections.culinary.edu";
const COLLECTION = "p16940coll1";
const PUBLIC_DIR = path.join(__dirname, "docs");
const CACHE_TTL_MS = 1000 * 60 * 30;
const PAGE_SIZE = 1024;
const ONTOLOGY_CACHE_PATH = path.join(__dirname, ".cache", "ontology.json");
const DATA_DIR = path.join(PUBLIC_DIR, "data");

const fieldBundles = [
  "title!date!restau!typea!decade",
  "title!locati!state!countr!donor",
  "title!source!digita!cuisin!illust",
];

let menusCache = null;
let schemaCache = null;
let ontologyCache = null;
let dateEstimatesCache = null;
let staticJsonCache = new Map();
let ontologyJob = {
  active: false,
  phase: "idle",
  indexed: 0,
  total: 0,
  transcriptRecords: 0,
  currentId: null,
  currentTitle: "",
  message: "Ready",
  startedAt: null,
  finishedAt: null,
  error: null,
};

function sendJson(res, data, status = 200, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(body);
}

function sendText(res, text, status = 200) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(text);
}

function notFound(res) {
  sendJson(res, { error: "Not found" }, 404);
}

async function readStaticJson(filename, refresh = false) {
  const filePath = path.join(DATA_DIR, filename);
  if (!refresh && staticJsonCache.has(filePath)) return staticJsonCache.get(filePath);
  const payload = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
  staticJsonCache.set(filePath, payload);
  return payload;
}

function readJsonBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    if (req.method === "GET" || req.method === "HEAD") {
      resolve({});
      return;
    }
    let body = "";
    let rejected = false;
    req.on("data", (chunk) => {
      if (rejected) return;
      body += chunk;
      if (body.length > limitBytes) {
        rejected = true;
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (rejected) return;
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Request body must be valid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function normalizeQueryParam(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "+")
    .replace(/\//g, " ");
}

function cdmPath(query) {
  return `/digital/bl/dmwebservices/index.php?q=${query}`;
}

function requestBuffer(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: CONTENTDM_HOST,
        method: "GET",
        rejectUnauthorized: false,
        timeout: 20000,
        ...options,
      },
      (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          requestBuffer({ path: response.headers.location }).then(resolve).catch(reject);
          response.resume();
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks);
          if (response.statusCode >= 400) {
            reject(new Error(`CONTENTdm returned ${response.statusCode}: ${body.toString("utf8", 0, 220)}`));
            return;
          }
          resolve({ body, headers: response.headers, statusCode: response.statusCode });
        });
      }
    );

    req.on("timeout", () => req.destroy(new Error("CONTENTdm request timed out")));
    req.on("error", reject);
    req.end();
  });
}

async function requestJson(pathname) {
  const { body } = await requestBuffer({ path: pathname });
  return JSON.parse(body.toString("utf8"));
}

function splitTerms(value) {
  if (!value) return [];
  return String(value)
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanValue(value) {
  if (Array.isArray(value)) return value.join("; ");
  return String(value || "").replace(/\s+/g, " ").trim();
}

function coerceRecord(record) {
  const pointer = Number(record.pointer || record.dmrecord);
  const title = cleanValue(record.title) || "Untitled menu";
  const date = cleanValue(record.date);
  const rawDecade = splitTerms(record.decade)[0];
  const decade = rawDecade && rawDecade.toLowerCase() !== "unknown" ? rawDecade : decadeFromDate(date) || rawDecade || "unknown";
  const country = splitTerms(record.countr)[0] || "unknown";
  const state = splitTerms(record.state)[0] || "";
  const city = splitTerms(record.locati)[0] || "";

  return {
    id: pointer,
    pointer,
    title,
    date,
    year: yearFromDate(date),
    decade,
    restaurant: cleanValue(record.restau),
    types: splitTerms(record.typea),
    cuisine: splitTerms(record.cuisin),
    illustrations: splitTerms(record.illust),
    city,
    state,
    country,
    donor: cleanValue(record.donor),
    source: cleanValue(record.source),
    digitalCollection: cleanValue(record.digita),
    filetype: cleanValue(record.filetype),
    find: cleanValue(record.find),
    itemUrl: `https://${CONTENTDM_HOST}/digital/collection/${COLLECTION}/id/${pointer}`,
    imageUrl: `/api/image/${pointer}`,
  };
}

function yearFromDate(value) {
  const match = String(value || "").match(/\b(18|19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function decadeFromDate(value) {
  const year = yearFromDate(value);
  return year ? `${Math.floor(year / 10) * 10}s` : null;
}

function mergeRecords(base, incoming) {
  const normalized = coerceRecord(incoming);
  const prefer = (next, previous, empty = "") => (next && next !== empty ? next : previous || empty);
  const preferArray = (next, previous) => (next.length ? next : previous || []);

  return {
    id: normalized.id || base.id,
    pointer: normalized.pointer || base.pointer,
    title: prefer(normalized.title, base.title, "Untitled menu"),
    date: prefer(normalized.date, base.date),
    year: normalized.year || base.year || null,
    decade: prefer(normalized.decade, base.decade, "unknown"),
    restaurant: prefer(normalized.restaurant, base.restaurant),
    types: preferArray(normalized.types, base.types),
    cuisine: preferArray(normalized.cuisine, base.cuisine),
    illustrations: preferArray(normalized.illustrations, base.illustrations),
    city: prefer(normalized.city, base.city),
    state: prefer(normalized.state, base.state),
    country: prefer(normalized.country, base.country, "unknown"),
    donor: prefer(normalized.donor, base.donor),
    source: prefer(normalized.source, base.source),
    digitalCollection: prefer(normalized.digitalCollection, base.digitalCollection),
    filetype: prefer(normalized.filetype, base.filetype),
    find: prefer(normalized.find, base.find),
    itemUrl: normalized.itemUrl || base.itemUrl,
    imageUrl: normalized.imageUrl || base.imageUrl,
  };
}

async function fetchDmQuery({ fields, start = 1, max = PAGE_SIZE, search = "0", sort = "title", facets = "0" }) {
  const query = [
    "dmQuery",
    COLLECTION,
    search,
    fields,
    sort,
    max,
    start,
    1,
    0,
    0,
    facets,
    0,
    1,
    "json",
  ].join("/");

  return requestJson(cdmPath(query));
}

async function getSchema() {
  if (schemaCache) return schemaCache;
  const schema = await requestJson(cdmPath(`dmGetCollectionFieldInfo/${COLLECTION}/json`));
  schemaCache = schema.filter((field) => field.hide !== 1);
  return schemaCache;
}

function summarize(menus, facets = []) {
  const countBy = (getter) => {
    const counts = new Map();
    for (const menu of menus) {
      const values = getter(menu);
      for (const value of Array.isArray(values) ? values : [values]) {
        const key = cleanValue(value).toLowerCase();
        if (!key) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  };

  const knownYears = menus.map((menu) => menu.year).filter(Boolean);
  return {
    total: menus.length,
    yearMin: knownYears.length ? Math.min(...knownYears) : null,
    yearMax: knownYears.length ? Math.max(...knownYears) : null,
    facets,
    decades: countBy((menu) => menu.decade),
    countries: countBy((menu) => menu.country),
    states: countBy((menu) => menu.state),
    cities: countBy((menu) => menu.city),
    types: countBy((menu) => menu.types),
    donors: countBy((menu) => menu.donor),
  };
}

async function getMenus(refresh = false) {
  if (!refresh && menusCache && Date.now() - menusCache.createdAt < CACHE_TTL_MS) {
    return menusCache.payload;
  }

  const firstPage = await fetchDmQuery({
    fields: fieldBundles[0],
    start: 1,
    max: PAGE_SIZE,
    facets: "decade!typea!locati!state!countr",
  });
  const total = Number(firstPage.pager?.total || firstPage.records?.length || 0);
  const starts = [];
  for (let start = 1; start <= total; start += PAGE_SIZE) starts.push(start);

  const merged = new Map();
  for (const record of firstPage.records || []) {
    merged.set(Number(record.pointer), coerceRecord(record));
  }

  const tasks = [];
  for (const [bundleIndex, fields] of fieldBundles.entries()) {
    for (const start of starts) {
      if (bundleIndex === 0 && start === 1) continue;
      tasks.push(fetchDmQuery({ fields, start, max: PAGE_SIZE }));
    }
  }

  const pages = await Promise.all(tasks);
  for (const page of pages) {
    for (const record of page.records || []) {
      const pointer = Number(record.pointer);
      merged.set(pointer, mergeRecords(merged.get(pointer) || {}, record));
    }
  }

  const menus = [...merged.values()].sort((a, b) => {
    const aYear = a.year || 9999;
    const bYear = b.year || 9999;
    return aYear - bYear || a.title.localeCompare(b.title);
  });

  const payload = {
    collection: {
      alias: COLLECTION,
      name: "CIA Menu Collection",
      sourceUrl: `https://${CONTENTDM_HOST}/digital/collection/${COLLECTION}`,
      apiUrl: `https://${CONTENTDM_HOST}/digital/bl/dmwebservices/index.php`,
    },
    fetchedAt: new Date().toISOString(),
    summary: summarize(menus, firstPage.facets || []),
    menus,
  };

  menusCache = { createdAt: Date.now(), payload };
  return payload;
}

async function readOntologyCache() {
  if (ontologyCache) return ontologyCache;
  try {
    const raw = await fs.promises.readFile(ONTOLOGY_CACHE_PATH, "utf8");
    ontologyCache = JSON.parse(raw);
    return ontologyCache;
  } catch (error) {
    return null;
  }
}

async function writeOntologyCache(ontology) {
  await fs.promises.mkdir(path.dirname(ONTOLOGY_CACHE_PATH), { recursive: true });
  await fs.promises.writeFile(ONTOLOGY_CACHE_PATH, JSON.stringify(ontology), "utf8");
}

async function getOntology(refresh = false) {
  if (!refresh) {
    const cached = await readOntologyCache();
    if (cached) return withOntologyStatus(cached);
  }
  const payload = await getMenus(false);
  const ontology = buildMetadataOntology(payload.menus);
  ontologyCache = ontology;
  return withOntologyStatus(ontology);
}

async function getDateEstimates(refresh = false) {
  if (!refresh && dateEstimatesCache) return dateEstimatesCache;
  const raw = await fs.promises.readFile(path.join(PUBLIC_DIR, "data", "date-estimates.json"), "utf8");
  dateEstimatesCache = JSON.parse(raw);
  return dateEstimatesCache;
}

function withOntologyStatus(ontology) {
  const { recordTexts, termIndex, ...publicOntology } = ontology;
  return {
    ...publicOntology,
    job: { ...ontologyJob },
  };
}

function ontologyStatus() {
  return {
    ...ontologyJob,
    cached: ontologyCache
      ? {
          createdAt: ontologyCache.createdAt,
          mode: ontologyCache.mode,
          indexedRecords: ontologyCache.indexedRecords,
          transcriptRecords: ontologyCache.transcriptRecords,
          totalRecords: ontologyCache.totalRecords,
        }
      : null,
  };
}

function startOntologyBuild(rawLimit, refresh = false) {
  if (ontologyJob.active) return ontologyStatus();
  ontologyJob = {
    active: true,
    phase: "starting",
    indexed: 0,
    total: 0,
    transcriptRecords: 0,
    currentId: null,
    currentTitle: "",
    message: "Loading menu metadata and selecting a decade-balanced transcript sample.",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  };
  runOntologyBuild(rawLimit, refresh).catch((error) => {
    ontologyJob.active = false;
    ontologyJob.phase = "failed";
    ontologyJob.finishedAt = new Date().toISOString();
    ontologyJob.error = error.message || "Ontology build failed";
    console.error(error);
  });
  return ontologyStatus();
}

async function runOntologyBuild(rawLimit, refresh) {
  const payload = await getMenus(false);
  const selected = selectOntologySample(payload.menus, rawLimit);
  const textById = new Map();
  ontologyJob.total = selected.length;
  ontologyJob.phase = "fetching transcripts";
  ontologyJob.message = "Fetching page-level OCR from CONTENTdm and reading compound menu pages.";

  for (const menu of selected) {
    ontologyJob.currentId = menu.id;
    ontologyJob.currentTitle = menu.title;
    if (!refresh && ontologyCache?.recordTexts?.[menu.id]) {
      textById.set(menu.id, ontologyCache.recordTexts[menu.id]);
      ontologyJob.message = "Reusing cached transcript text for this menu.";
    } else {
      ontologyJob.message = "Fetching transcript text and page structure for this menu.";
      const text = await fetchMenuText(menu.id);
      if (text) {
        textById.set(menu.id, text);
        ontologyJob.transcriptRecords = textById.size;
      }
    }
    ontologyJob.indexed += 1;
  }

  ontologyJob.phase = "building ontology";
  ontologyJob.currentId = null;
  ontologyJob.currentTitle = "";
  ontologyJob.message = "Classifying transcript lines into meals, dishes, ingredients, beverages, styles, and clusters.";
  const ontology = buildOntology(payload.menus, textById, { mode: "transcript" });
  ontology.coverage = {
    selectedRecords: selected.length,
    transcriptRecords: textById.size,
    totalRecords: payload.menus.length,
    sampleMode: selected.length >= payload.menus.length ? "full" : "stratified",
  };
  ontology.recordTexts = Object.fromEntries(textById);
  ontologyCache = ontology;
  await writeOntologyCache(ontology);
  ontologyJob.active = false;
  ontologyJob.phase = "complete";
  ontologyJob.message = `Indexed ${textById.size.toLocaleString()} transcript records and refreshed ontology trends.`;
  ontologyJob.finishedAt = new Date().toISOString();
}

function selectOntologySample(menus, rawLimit) {
  const limit =
    rawLimit === "all"
      ? menus.length
      : Math.min(Math.max(Number(rawLimit) || 300, 25), menus.length);
  if (limit >= menus.length) return menus;

  const buckets = new Map();
  for (const menu of menus) {
    const key = cleanValue(menu.decade || "unknown").toLowerCase();
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(menu);
  }

  const selected = [];
  const sortedBuckets = [...buckets.values()].sort((a, b) => b.length - a.length);
  let bucketIndex = 0;
  while (selected.length < limit && sortedBuckets.some((bucket) => bucket.length)) {
    const bucket = sortedBuckets[bucketIndex % sortedBuckets.length];
    if (bucket.length) {
      const index = Math.floor(bucket.length / 2);
      selected.push(bucket.splice(index, 1)[0]);
    }
    bucketIndex += 1;
  }
  return selected;
}

async function fetchMenuText(id) {
  const pointer = Number(id);
  const item = await requestJson(`/digital/api/singleitem/collection/${COLLECTION}/id/${pointer}`);
  const rawParentId = Number(item.parentId);
  const parentId = Number.isFinite(rawParentId) && rawParentId > 0 ? rawParentId : pointer;
  let pages = [];

  try {
    const objectInfo = await requestJson(cdmPath(`dmGetCompoundObjectInfo/${COLLECTION}/${parentId}/json`));
    pages = objectInfo?.page || [];
  } catch (error) {
    pages = [];
  }

  const texts = [];
  if (item.text) texts.push(item.text);
  for (const page of pages) {
    const pageId = Number(page.pageptr);
    if (!Number.isFinite(pageId) || pageId === pointer) continue;
    try {
      const pageItem = await requestJson(`/digital/api/singleitem/collection/${COLLECTION}/id/${pageId}`);
      if (pageItem.text) texts.push(pageItem.text);
    } catch (error) {
      // Some records have page structures without OCR. Keep indexing the rest.
    }
  }
  return texts.join("\n");
}

async function searchMenus(term, field = "transc", mode = "all", limit = 300) {
  const safeTerm = normalizeQueryParam(term);
  if (!safeTerm) return { term: "", menus: [], summary: summarize([]) };

  const safeField = ["transc", "title", "restau", "descri", "typea", "locati", "state", "countr", "date"].includes(field)
    ? field
    : "transc";
  const safeMode = ["all", "any", "exact", "none"].includes(mode) ? mode : "all";
  const max = Math.min(Math.max(Number(limit) || 300, 1), 1024);
  const search = `${safeField}^${safeTerm}^${safeMode}^and`;
  const page = await fetchDmQuery({
    fields: fieldBundles[0],
    start: 1,
    max,
    search,
    sort: "nosort",
    facets: "decade!typea!locati!state!countr",
  });

  const menus = (page.records || []).map(coerceRecord);
  return {
    term: term,
    field: safeField,
    total: Number(page.pager?.total || menus.length),
    summary: summarize(menus, page.facets || []),
    menus,
  };
}

function itemFieldsToObject(fields = []) {
  return fields.reduce((acc, field) => {
    acc[field.key] = {
      label: field.label,
      value: cleanValue(field.value),
    };
    return acc;
  }, {});
}

async function getItem(id) {
  const pointer = Number(id);
  if (!Number.isFinite(pointer)) throw new Error("Invalid item id");
  const item = await requestJson(`/digital/api/singleitem/collection/${COLLECTION}/id/${pointer}`);
  const rawParentId = Number(item.parentId);
  const parentId = Number.isFinite(rawParentId) && rawParentId > 0 ? rawParentId : pointer;
  let objectInfo = null;

  try {
    objectInfo = await requestJson(cdmPath(`dmGetCompoundObjectInfo/${COLLECTION}/${parentId}/json`));
  } catch (error) {
    objectInfo = null;
  }

  const fields = itemFieldsToObject(item.fields || []);
  const pages = objectInfo?.page
    ? objectInfo.page.map((page) => ({
        title: page.pagetitle,
        file: page.pagefile,
        id: Number(page.pageptr),
        imageUrl: `/api/image/${page.pageptr}`,
      }))
    : [];
  const primaryImageId = pointer === parentId && pages.length ? pages[0].id : pointer;
  let text = item.text || "";
  if (!text && primaryImageId !== pointer) {
    try {
      const pageItem = await requestJson(`/digital/api/singleitem/collection/${COLLECTION}/id/${primaryImageId}`);
      text = pageItem.text || "";
    } catch (error) {
      text = "";
    }
  }

  return {
    id: pointer,
    parentId,
    title: fields.title?.value || item.title || "Menu",
    text,
    fields,
    contentType: item.contentType,
    imageUrl: `/api/image/${primaryImageId}`,
    iiifInfoUri: item.iiifInfoUri,
    sourceUrl: `https://${CONTENTDM_HOST}/digital/collection/${COLLECTION}/id/${parentId}`,
    pages,
  };
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
    }[ext] || "application/octet-stream"
  );
}

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    notFound(res);
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      notFound(res);
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentTypeFor(filePath),
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
}

async function proxyImage(req, res, id) {
  const pointer = Number(id);
  if (!Number.isFinite(pointer)) {
    notFound(res);
    return;
  }
  const imagePath = `/digital/api/singleitem/image/${COLLECTION}/${pointer}/default.jpg`;
  const upstream = await requestBuffer({ path: imagePath });
  res.writeHead(200, {
    "Content-Type": upstream.headers["content-type"] || "image/jpeg",
    "Cache-Control": "public, max-age=86400",
  });
  res.end(upstream.body);
}

async function getPublicMenus({ refresh = false, source = "all" } = {}) {
  if (!refresh) {
    try {
      const payload = await readStaticJson("menus.json");
      const menus = (payload.menus || []).map((menu) => (menu.sourceKey ? menu : normalizeCiaMenu(menu)));
      return filterMenusBySource(
        {
          ...payload,
          menus,
          summary: payload.summary || summarizeMenus(menus),
        },
        source
      );
    } catch (error) {
      // Fall through to live CIA data when the committed Pages snapshot is absent.
    }
  }
  const payload = await getMenus(refresh);
  const menus = payload.menus.map(normalizeCiaMenu);
  return filterMenusBySource({ ...payload, menus, summary: summarizeMenus(menus, payload.summary?.facets || []) }, source);
}

function sourceIdParts(id) {
  const decoded = decodeURIComponent(String(id || ""));
  const match = decoded.match(/^([a-z]+):(.*)$/i);
  return match ? { sourceKey: match[1].toLowerCase(), id: match[2], uid: decoded } : { sourceKey: "cia", id: decoded, uid: decoded };
}

async function getStaticItem(uid) {
  const parts = sourceIdParts(uid);
  const payload = await getPublicMenus({ source: "all" });
  const menu = payload.menus.find((item) => recordUid(item) === parts.uid || String(item.id) === String(parts.id));
  if (!menu) throw new Error("Menu detail unavailable in static snapshot");
  const text =
    menu.sourceKey === "nypl"
      ? nyplTranscriptText(menu, await nyplPriceRowsForMenu(menu))
      : "Full OCR text requires live access to the CIA Digital Collections item endpoint. The static Pages snapshot keeps the metadata, ontology, source link, and image pointer available without a server.";
  return {
    id: menu.id,
    uid: recordUid(menu),
    sourceKey: menu.sourceKey || "cia",
    parentId: menu.pointer || menu.id,
    title: menu.title,
    text,
    fields: {
      title: { label: "Title", value: menu.title },
      date: { label: "Date", value: menu.date },
      restau: { label: "Restaurant", value: menu.restaurant },
      typea: { label: "Type", value: menu.types?.join("; ") },
      locati: { label: "City", value: menu.city },
      state: { label: "State", value: menu.state },
      countr: { label: "Country", value: menu.country },
      sourceLabel: { label: "Corpus", value: menu.sourceLabel },
      source: { label: "Source", value: menu.source },
      donor: { label: "Donor", value: menu.donor },
      rights: { label: "Rights", value: menu.rights },
      callNumber: { label: "Call Number", value: menu.callNumber },
    },
    contentType: menu.filetype,
    imageUrl: menu.imageUrl,
    iiifInfoUri: "",
    sourceUrl: menu.itemUrl,
    pages: [],
  };
}

async function nyplPriceRowsForMenu(menu) {
  const uid = recordUid(menu);
  try {
    const snapshot = await readStaticJson("prices.json");
    return (snapshot.records || [])
      .filter((row) => row.sourceKey === "nypl" && (row.menuUid === uid || row.menuId === uid || String(row.sourceRecordId) === String(menu.pointer)))
      .sort((a, b) => String(a.item || "").localeCompare(String(b.item || "")))
      .slice(0, 18);
  } catch (error) {
    return [];
  }
}

function nyplTranscriptText(menu, priceRows) {
  const seen = new Set();
  const sampleItems = [];
  for (const row of priceRows) {
    const item = cleanValue(row.item);
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sampleItems.push(row.rawPrice ? `${item} - ${row.rawPrice}` : item);
  }
  for (const dish of menu.topDishes || []) {
    const item = cleanValue(dish);
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    sampleItems.push(item);
    if (sampleItems.length >= 18) break;
  }

  const counts = [
    menu.itemCount ? `${Number(menu.itemCount).toLocaleString()} transcribed item rows` : "",
    menu.priceCount ? `${Number(menu.priceCount).toLocaleString()} priced rows` : "",
    menu.pageCount ? `${Number(menu.pageCount).toLocaleString()} pages` : "",
  ].filter(Boolean);

  return [
    "NYPL crowdsourced transcription sample",
    counts.length ? counts.join(" / ") : "",
    sampleItems.length ? `Sample item rows:\n${sampleItems.map((item) => `- ${item}`).join("\n")}` : "",
    menu.notes ? `Notes: ${menu.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function getPublicItem(id) {
  const parts = sourceIdParts(id);
  if (parts.sourceKey !== "cia") return getStaticItem(parts.uid);
  try {
    const detail = await getItem(parts.id);
    return { ...detail, uid: `cia:${parts.id}`, sourceKey: "cia" };
  } catch (error) {
    return getStaticItem(parts.uid);
  }
}

async function getMatchesFor(uid, refresh = false) {
  const payload = await readStaticJson("matches.json", refresh);
  const decoded = decodeURIComponent(String(uid || ""));
  return {
    uid: decoded,
    source: payload.source,
    matches: payload.matches?.[decoded] || [],
    relationships: payload.relationships || [],
  };
}

async function readOptionalStaticJson(filename, fallback) {
  try {
    return await readStaticJson(filename);
  } catch (error) {
    return fallback;
  }
}

function compactChatMatches(matches) {
  return (matches || []).slice(0, 12).map((match) => ({
    title: match.title,
    item: match.item,
    snippet: match.snippet,
    date: match.date,
    year: match.year,
    place: match.place,
    source: match.source,
    reasons: match.reasons,
    price: match.price,
    url: match.url,
  }));
}

async function grokSynthesis(question, localAnswer) {
  const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  if (!apiKey) return null;

  const base = (process.env.GROK_API_BASE || "https://api.x.ai/v1").replace(/\/+$/, "");
  const model = process.env.GROK_MODEL || "grok-4.3";
  const context = {
    question,
    retrievalAnswer: localAnswer.answer,
    parsed: localAnswer.parsed,
    searched: localAnswer.searched,
    caveats: localAnswer.caveats,
    matches: compactChatMatches(localAnswer.matches),
  };

  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You answer questions about historical menu data using only the supplied retrieval context. Be concise, cite candidate menu titles/dates in prose, preserve uncertainty, and do not invent external facts.",
        },
        {
          role: "user",
          content: JSON.stringify(context),
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.error?.message || payload.message || response.statusText;
    throw new Error(`Grok request failed: ${detail}`);
  }
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Grok response did not include an answer");
  return { answer: content, model };
}

async function answerChat(req, url) {
  const body = req.method === "GET" ? {} : await readJsonBody(req);
  const question = cleanValue(body.question || body.q || url.searchParams.get("q") || url.searchParams.get("question"));
  if (!question) return { error: "Chat question is required" };

  const [menus, ontology, prices, dateEstimates, analytics] = await Promise.all([
    readStaticJson("menus.json"),
    readOptionalStaticJson("ontology.json", null),
    readOptionalStaticJson("prices.json", { records: [] }),
    readOptionalStaticJson("date-estimates.json", { records: [] }),
    readOptionalStaticJson("analytics.json", null),
  ]);
  const localAnswer = chatApi.answerQuestion({
    question,
    menus,
    ontology,
    prices,
    dateEstimates,
    analytics,
  });

  try {
    const grok = await grokSynthesis(question, localAnswer);
    if (!grok) return localAnswer;
    return {
      ...localAnswer,
      engine: "grok",
      model: grok.model,
      answer: grok.answer,
      localAnswer: localAnswer.answer,
    };
  } catch (error) {
    return {
      ...localAnswer,
      engine: "local-retrieval",
      llmError: error.message,
    };
  }
}

async function handleApi(req, res, url) {
  try {
    if (url.pathname === "/api/health") {
      sendJson(res, { ok: true, collection: COLLECTION, sources: ["cia", "nypl"] });
      return;
    }

    if (url.pathname === "/api/schema") {
      sendJson(res, await getSchema());
      return;
    }

    if (url.pathname === "/api/menus") {
      sendJson(
        res,
        await getPublicMenus({
          refresh: url.searchParams.get("refresh") === "1",
          source: url.searchParams.get("source") || "all",
        })
      );
      return;
    }

    if (url.pathname === "/api/ontology") {
      sendJson(res, await getOntology(url.searchParams.get("refresh") === "1"));
      return;
    }

    if (url.pathname === "/api/date-estimates") {
      sendJson(res, await getDateEstimates(url.searchParams.get("refresh") === "1"));
      return;
    }

    if (url.pathname === "/api/ontology/build") {
      sendJson(res, startOntologyBuild(url.searchParams.get("limit"), url.searchParams.get("refresh") === "1"));
      return;
    }

    if (url.pathname === "/api/ontology/status") {
      sendJson(res, ontologyStatus());
      return;
    }

    if (url.pathname === "/api/prices") {
      sendJson(res, await readStaticJson("prices.json", url.searchParams.get("refresh") === "1"));
      return;
    }

    if (url.pathname === "/api/analytics/dishes") {
      sendJson(res, await readStaticJson("analytics.json", url.searchParams.get("refresh") === "1"));
      return;
    }

    if (url.pathname === "/api/chat") {
      const answer = await answerChat(req, url);
      sendJson(res, answer.error ? answer : answer, answer.error ? 400 : 200);
      return;
    }

    if (url.pathname === "/api/search") {
      sendJson(
        res,
        await searchMenus(
          url.searchParams.get("term"),
          url.searchParams.get("field") || "transc",
          url.searchParams.get("mode") || "all",
          url.searchParams.get("limit") || 300
        )
      );
      return;
    }

    const matchesMatch = url.pathname.match(/^\/api\/matches\/(.+)$/);
    if (matchesMatch) {
      sendJson(res, await getMatchesFor(matchesMatch[1], url.searchParams.get("refresh") === "1"));
      return;
    }

    const itemMatch = url.pathname.match(/^\/api\/item\/(.+)$/);
    if (itemMatch) {
      sendJson(res, await getPublicItem(itemMatch[1]));
      return;
    }

    const imageMatch = url.pathname.match(/^\/api\/image\/(\d+)$/);
    if (imageMatch) {
      await proxyImage(req, res, imageMatch[1]);
      return;
    }

    notFound(res);
  } catch (error) {
    console.error(error);
    sendJson(res, { error: error.message || "Unexpected server error" }, 500);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  if (url.pathname.startsWith("/api/")) {
    await handleApi(req, res, url);
    return;
  }
  if (url.pathname === "/robots.txt") {
    sendText(res, "User-agent: *\nDisallow:\n");
    return;
  }
  serveStatic(req, res, url.pathname);
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`MenuGraph running at http://${HOST}:${PORT}`);
  });
}

module.exports = {
  fetchMenuText,
  getMenus,
  getOntology,
  getDateEstimates,
  ontologyStatus,
  searchMenus,
  selectOntologySample,
  startOntologyBuild,
};
