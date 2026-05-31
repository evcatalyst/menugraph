(function () {
  const CONTENTDM_HOST = "ciadigitalcollections.culinary.edu";
  const COLLECTION = "p16940coll1";
  const PAGE_SIZE = 1024;
  const CACHE_TTL_MS = 1000 * 60 * 30;
  const ONTOLOGY_STORAGE_KEY = "menugraph:ontology:v1";

  const fieldBundles = [
    "title!date!restau!typea!decade",
    "title!locati!state!countr!donor",
    "title!source!digita!cuisin!illust",
  ];

  let menusCache = null;
  let ontologyCache = null;
  let pricesCache = null;

  function sourceUrl(id) {
    return `https://${CONTENTDM_HOST}/digital/collection/${COLLECTION}/id/${id}`;
  }

  function imageUrl(id) {
    return `https://${CONTENTDM_HOST}/digital/api/singleitem/image/${COLLECTION}/${id}/default.jpg`;
  }

  function contentUrl(pathname) {
    return pathname.startsWith("http") ? pathname : `https://${CONTENTDM_HOST}${pathname}`;
  }

  async function requestStaticJson(file, refresh = false) {
    const url = new URL(`./data/${file}`, document.baseURI);
    if (refresh) url.searchParams.set("v", Date.now().toString());
    const response = await fetch(url, { cache: refresh ? "reload" : "default" });
    if (!response.ok) throw new Error(`Static data unavailable: ${file}`);
    return response.json();
  }

  async function requestJson(pathname) {
    const response = await fetch(contentUrl(pathname), { mode: "cors" });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`CONTENTdm returned ${response.status}: ${text.slice(0, 160) || response.statusText}`);
    }
    return response.json();
  }

  function cdmPath(query) {
    return `/digital/bl/dmwebservices/index.php?${new URLSearchParams({ q: query })}`;
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

  function yearFromDate(value) {
    const match = String(value || "").match(/\b(18|19|20)\d{2}\b/);
    return match ? Number(match[0]) : null;
  }

  function decadeFromDate(value) {
    const year = yearFromDate(value);
    return year ? `${Math.floor(year / 10) * 10}s` : null;
  }

  function coerceRecord(record) {
    const pointer = Number(record.pointer || record.dmrecord);
    const title = cleanValue(record.title) || "Untitled menu";
    const date = cleanValue(record.date);
    const decade = splitTerms(record.decade)[0] || decadeFromDate(date) || "unknown";
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
      itemUrl: sourceUrl(pointer),
      imageUrl: imageUrl(pointer),
    };
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

  function reportProgress(onProgress, payload) {
    if (typeof onProgress === "function") onProgress(payload);
  }

  async function getMenus({ refresh = false, onProgress } = {}) {
    if (!refresh && menusCache && Date.now() - menusCache.createdAt < CACHE_TTL_MS) {
      return menusCache.payload;
    }

    try {
      reportProgress(onProgress, {
        label: "Loading Archive",
        title: "Reading static Pages snapshot",
        detail: "Loading the committed menu index from this GitHub Pages site before attempting any live archive calls.",
        progress: 0.18,
      });
      const payload = await requestStaticJson("menus.json", refresh);
      menusCache = { createdAt: Date.now(), payload };
      return payload;
    } catch (error) {
      reportProgress(onProgress, {
        label: "Live Archive",
        title: "Static snapshot unavailable",
        detail: "Falling back to CONTENTdm web services and rebuilding the menu index in the browser.",
        progress: 0.22,
      });
    }

    reportProgress(onProgress, {
      label: "Loading Archive",
      title: "Requesting first metadata page",
      detail: "CONTENTdm returns five fields per pass, so MenuGraph builds the full record set from several paged requests.",
      progress: 0.04,
    });

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
        tasks.push({ fields, start, max: PAGE_SIZE });
      }
    }

    let completed = 1;
    const totalRequests = tasks.length + 1;
    const pages = await Promise.all(
      tasks.map(async (task) => {
        const page = await fetchDmQuery(task);
        completed += 1;
        reportProgress(onProgress, {
          label: "Loading Archive",
          title: `Metadata pass ${completed} of ${totalRequests}`,
          detail: `Merged ${merged.size.toLocaleString()} records so far; fetching ${task.fields.replace(/!/g, ", ")} from CONTENTdm.`,
          progress: Math.min(completed / totalRequests, 0.94),
        });
        return page;
      })
    );

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

  function normalizeQueryParam(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, "+")
      .replace(/\//g, " ");
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
    try {
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
        term,
        field: safeField,
        total: Number(page.pager?.total || menus.length),
        summary: summarize(menus, page.facets || []),
        menus,
        remote: true,
      };
    } catch (error) {
      return searchStaticMenus(term, safeField, max);
    }
  }

  async function searchStaticMenus(term, field, limit) {
    const lower = String(term || "").toLowerCase();
    const payload = await getMenus({ refresh: false });
    const valuesFor = (menu) => {
      const all = [
        menu.title,
        menu.restaurant,
        menu.date,
        menu.city,
        menu.state,
        menu.country,
        menu.source,
        menu.donor,
        menu.types?.join(" "),
        menu.cuisine?.join(" "),
      ];
      const byField = {
        title: [menu.title],
        restau: [menu.restaurant],
        descri: all,
        typea: menu.types || [],
        locati: [menu.city],
        state: [menu.state],
        countr: [menu.country],
        date: [menu.date],
        transc: all,
      };
      return byField[field] || all;
    };
    const matches = payload.menus.filter((menu) =>
      valuesFor(menu)
        .join(" ")
        .toLowerCase()
        .includes(lower)
    );
    const menus = matches.slice(0, limit);
    return {
      term,
      field,
      total: matches.length,
      summary: summarize(menus),
      menus,
      remote: false,
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

  async function compoundPages(parentId) {
    try {
      const objectInfo = await requestJson(cdmPath(`dmGetCompoundObjectInfo/${COLLECTION}/${parentId}/json`));
      return objectInfo?.page || [];
    } catch (error) {
      return [];
    }
  }

  async function getItem(id) {
    const pointer = Number(id);
    if (!Number.isFinite(pointer)) throw new Error("Invalid item id");
    let item = null;
    try {
      item = await requestJson(`/digital/api/singleitem/collection/${COLLECTION}/id/${pointer}`);
    } catch (error) {
      return getStaticItem(pointer);
    }
    const rawParentId = Number(item.parentId);
    const parentId = Number.isFinite(rawParentId) && rawParentId > 0 ? rawParentId : pointer;
    const objectPages = await compoundPages(parentId);
    const fields = itemFieldsToObject(item.fields || []);
    const pages = objectPages.map((page) => ({
      title: page.pagetitle,
      file: page.pagefile,
      id: Number(page.pageptr),
      imageUrl: imageUrl(page.pageptr),
    }));
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
      imageUrl: imageUrl(primaryImageId),
      iiifInfoUri: item.iiifInfoUri,
      sourceUrl: sourceUrl(parentId),
      pages,
    };
  }

  async function getStaticItem(pointer) {
    const payload = await getMenus({ refresh: false });
    const menu = payload.menus.find((item) => Number(item.id) === Number(pointer));
    if (!menu) throw new Error("Menu detail unavailable in static snapshot");
    return {
      id: pointer,
      parentId: pointer,
      title: menu.title,
      text: "Full OCR text requires live access to the CIA Digital Collections item endpoint. The static Pages snapshot keeps the metadata, ontology, source link, and image pointer available without a server.",
      fields: {
        title: { label: "Title", value: menu.title },
        date: { label: "Date", value: menu.date },
        restau: { label: "Restaurant", value: menu.restaurant },
        typea: { label: "Type", value: menu.types?.join("; ") },
        locati: { label: "City", value: menu.city },
        state: { label: "State", value: menu.state },
        countr: { label: "Country", value: menu.country },
        source: { label: "Source", value: menu.source },
        donor: { label: "Donor", value: menu.donor },
      },
      contentType: menu.filetype,
      imageUrl: menu.imageUrl,
      iiifInfoUri: "",
      sourceUrl: menu.itemUrl,
      pages: [],
    };
  }

  function publicOntology(ontology, job = idleJob()) {
    const { recordTexts, termIndex, ...rest } = ontology;
    return { ...rest, job };
  }

  function idleJob() {
    return {
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
  }

  function ontologyApi() {
    if (!window.MenuGraphOntology) throw new Error("Ontology library did not load");
    return window.MenuGraphOntology;
  }

  function readStoredOntology() {
    if (ontologyCache) return ontologyCache;
    try {
      const raw = localStorage.getItem(ONTOLOGY_STORAGE_KEY);
      if (!raw) return null;
      ontologyCache = JSON.parse(raw);
      return ontologyCache;
    } catch (error) {
      return null;
    }
  }

  function storeOntology(ontology) {
    ontologyCache = ontology;
    try {
      localStorage.setItem(ONTOLOGY_STORAGE_KEY, JSON.stringify(ontology));
    } catch (error) {
      // Browser storage is an optimization only; the index can be rebuilt on demand.
    }
  }

  async function getOntology({ refresh = false } = {}) {
    if (!refresh) {
      const cached = readStoredOntology();
      if (cached) return publicOntology(cached);
    }
    try {
      const staticOntology = await requestStaticJson("ontology.json", refresh);
      ontologyCache = staticOntology;
      return publicOntology(staticOntology);
    } catch (error) {
      // Fall through and derive a metadata ontology from whatever menu source is available.
    }
    const payload = await getMenus({ refresh: false });
    const ontology = ontologyApi().buildMetadataOntology(payload.menus);
    ontologyCache = ontology;
    return publicOntology(ontology);
  }

  async function getPrices({ refresh = false } = {}) {
    if (!refresh && pricesCache) return pricesCache;
    pricesCache = await requestStaticJson("prices.json", refresh);
    return pricesCache;
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
    const pages = await compoundPages(parentId);
    const texts = [];
    if (item.text) texts.push(item.text);
    for (const page of pages) {
      const pageId = Number(page.pageptr);
      if (!Number.isFinite(pageId) || pageId === pointer) continue;
      try {
        const pageItem = await requestJson(`/digital/api/singleitem/collection/${COLLECTION}/id/${pageId}`);
        if (pageItem.text) texts.push(pageItem.text);
      } catch (error) {
        // Some compound records have page entries without OCR text.
      }
    }
    return texts.join("\n");
  }

  async function buildTextIndex({ limit = 300, refresh = false, onProgress } = {}) {
    const payload = await getMenus({ refresh: false });
    const selected = selectOntologySample(payload.menus, limit);
    const textById = new Map();
    const startedAt = new Date().toISOString();

    for (const [index, menu] of selected.entries()) {
      const baseJob = {
        active: true,
        phase: "fetching transcripts",
        indexed: index,
        total: selected.length,
        transcriptRecords: textById.size,
        currentId: menu.id,
        currentTitle: menu.title,
        message: refresh ? "Refreshing transcript text from CONTENTdm." : "Fetching transcript text and page structure for this menu.",
        startedAt,
        finishedAt: null,
        error: null,
      };
      reportProgress(onProgress, baseJob);
      try {
        const text = await fetchMenuText(menu.id);
        if (text) textById.set(menu.id, text);
      } catch (error) {
        // Continue the sample; failed records should not stop the full ontology build.
      }
      reportProgress(onProgress, {
        ...baseJob,
        indexed: index + 1,
        transcriptRecords: textById.size,
      });
    }

    reportProgress(onProgress, {
      active: true,
      phase: "building ontology",
      indexed: selected.length,
      total: selected.length,
      transcriptRecords: textById.size,
      currentId: null,
      currentTitle: "",
      message: "Classifying transcript lines into meals, dishes, ingredients, beverages, styles, and clusters.",
      startedAt,
      finishedAt: null,
      error: null,
    });

    const ontology = ontologyApi().buildOntology(payload.menus, textById, { mode: "transcript" });
    ontology.coverage = {
      selectedRecords: selected.length,
      transcriptRecords: textById.size,
      totalRecords: payload.menus.length,
      sampleMode: selected.length >= payload.menus.length ? "full" : "stratified",
    };
    storeOntology(ontology);

    return publicOntology(ontology, {
      active: false,
      phase: "complete",
      indexed: selected.length,
      total: selected.length,
      transcriptRecords: textById.size,
      currentId: null,
      currentTitle: "",
      message: `Indexed ${textById.size.toLocaleString()} transcript records and refreshed ontology trends.`,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: null,
    });
  }

  async function handle(pathname, options = {}) {
    const url = new URL(pathname, "https://menugraph.local");
    if (url.pathname === "/api/menus") {
      return getMenus({ refresh: url.searchParams.get("refresh") === "1", onProgress: options.onProgress });
    }
    if (url.pathname === "/api/ontology") {
      return getOntology({ refresh: url.searchParams.get("refresh") === "1" });
    }
    if (url.pathname === "/api/prices") {
      return getPrices({ refresh: url.searchParams.get("refresh") === "1" });
    }
    if (url.pathname === "/api/search") {
      return searchMenus(
        url.searchParams.get("term"),
        url.searchParams.get("field") || "transc",
        url.searchParams.get("mode") || "all",
        url.searchParams.get("limit") || 300
      );
    }
    const itemMatch = url.pathname.match(/^\/api\/item\/(\d+)$/);
    if (itemMatch) return getItem(itemMatch[1]);
    if (url.pathname === "/api/ontology/build") {
      return buildTextIndex({
        limit: url.searchParams.get("limit") || 300,
        refresh: url.searchParams.get("refresh") === "1",
        onProgress: options.onProgress,
      });
    }
    throw new Error(`Unsupported static API route: ${url.pathname}`);
  }

  window.MenuGraphArchive = {
    buildTextIndex,
    getItem,
    getMenus,
    getOntology,
    getPrices,
    handle,
    imageUrl,
    searchMenus,
    sourceUrl,
  };
})();
