const crypto = require("crypto");
const fs = require("fs/promises");
const http = require("http");
const https = require("https");
const path = require("path");
const { cleanValue, normalizeText, recordUid } = require("../docs/multisource");
const { extractPricesFromText, normalizePrice, contextForEntry } = require("../docs/price-utils");
const { dishTypeFor, ingredientTagsFor } = require("../docs/food-taxonomy");
const { writeEnrichmentPayload } = require("./enrichment-shards");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data");
const ENRICHMENT_DIR = path.join(DATA_DIR, "enrichment");
const CACHE_DIR = path.join(ROOT_DIR, ".cache", "enrichment");
const TRANSCRIPT_CACHE_DIR = path.join(CACHE_DIR, "transcripts");
const CONTENTDM_HOST = "ciadigitalcollections.culinary.edu";
const CIA_COLLECTION = "p16940coll1";
const VERSION = 1;

const SECTION_PATTERNS = [
  ["soups", /\b(soups?|consommes?|broths?)\b/],
  ["fish", /\b(fish|seafood|shellfish|oysters?|clams?)\b/],
  ["meats", /\b(meats?|roasts?|entrees?|releves?)\b/],
  ["vegetables", /\b(vegetables?|salads?)\b/],
  ["desserts", /\b(desserts?|pastry|ices?)\b/],
  ["beverages", /\b(beverages?|drinks?|wines?|spirits?|cocktails?)\b/],
];

const NON_DISH_LINE =
  /\b(?:address|avenue|copyright|departure|fare|highway|library|menu collection|passenger|printed|publisher|railroad timetable|street|telephone|ticket|travel)\b/i;
const PRICE_TOKEN =
  /(?:US\$|\$|€|£|\bfrs?\.?|\bfrancs?|\bmarks?|\bmk\.?)\s*\d+(?:[.,]\d+)?|\b\d+(?:[.,]\d+)?\s*(?:¢|cents?|cts?\.?|c\.)\b|(?:^|\s)\d+[.,]\d{2}(?=\s|$)|(?:^|\s)\.\d{2}(?=\s|$)|(?:^|\s)\d{1,2}(?=\s|$)/gi;

function argValue(args, name, fallback = null) {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

function stableId(prefix, parts) {
  return `${prefix}:${crypto.createHash("sha1").update(parts.map((part) => cleanValue(part)).join("|")).digest("hex").slice(0, 16)}`;
}

function normalizedDishName(value) {
  return normalizeText(value)
    .replace(/\b(with|and|or|fresh|cold|hot|a la|au|aux|de|du|the|in|of)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96);
}

function titleish(value) {
  return cleanValue(value)
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

function sectionForLine(line) {
  const normalized = normalizeText(line);
  if (!normalized || normalized.length > 36) return "";
  const match = SECTION_PATTERNS.find(([, pattern]) => pattern.test(normalized));
  return match ? match[0] : "";
}

function isLikelyDishLine(line) {
  const text = cleanValue(line);
  if (text.length < 4 || text.length > 132) return false;
  if (NON_DISH_LINE.test(text)) return false;
  if (/^\d{4}\b/.test(text)) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  return true;
}

function lineDishLabel(line) {
  return cleanValue(line)
    .replace(PRICE_TOKEN, " ")
    .replace(/[_.,;:\-]{2,}/g, " ")
    .replace(/^[\W\d]+|[\W\d]+$/g, "")
    .replace(/\b(price|prix|preis)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96);
}

function confidenceForDish({ rawName, source, priceLinked }) {
  let score = source === "nypl_structured" ? 0.88 : source === "metadata_top_dish" ? 0.72 : 0.48;
  if (ingredientTagsFor(rawName).length) score += 0.08;
  if (dishTypeFor(rawName) !== "dish") score += 0.06;
  if (priceLinked) score += 0.12;
  if (rawName.length < 8) score -= 0.12;
  return Number(Math.max(0.18, Math.min(0.96, score)).toFixed(3));
}

function compactMenu(menu) {
  return {
    menuId: recordUid(menu),
    sourceKey: menu.sourceKey || "cia",
    title: cleanValue(menu.title),
    year: menu.year || null,
    decade: cleanValue(menu.decade || "unknown"),
    place: [menu.city, menu.state, menu.country].map(cleanValue).filter(Boolean).join(", "),
  };
}

function menuPriority(menu, dateEstimate = null) {
  let score = 0;
  if ((menu.sourceKey || "cia") === "cia") score += 10;
  if (!menu.year || menu.decade === "unknown") score += 20;
  if (dateEstimate?.confidence === "D" || dateEstimate?.confidence === "X") score += 8;
  if (!Number(menu.priceCount || 0)) score += 5;
  if (!Number(menu.itemCount || 0)) score += 4;
  if (/\b(menu|dinner|luncheon|hotel|restaurant)\b/i.test(menu.title || "")) score += 2;
  return score;
}

function selectMenus(menus, options, dateEstimateByMenu = new Map()) {
  const source = cleanValue(options.source || "all").toLowerCase();
  let candidates = menus.filter((menu) => source === "all" || (menu.sourceKey || "cia") === source);
  if (options.unknownOnly) {
    candidates = candidates.filter((menu) => !menu.year || menu.decade === "unknown" || ["D", "X"].includes(dateEstimateByMenu.get(recordUid(menu))?.confidence));
  }
  candidates.sort((a, b) => menuPriority(b, dateEstimateByMenu.get(recordUid(b))) - menuPriority(a, dateEstimateByMenu.get(recordUid(a))) || cleanValue(a.title).localeCompare(cleanValue(b.title)));
  return candidates.slice(0, options.limit);
}

function dishMentionFromName({ menu, rawName, source, sectionName = "", spanId = null, priceLinked = false }) {
  const normalizedName = normalizedDishName(rawName);
  if (!normalizedName) return null;
  const confidence = confidenceForDish({ rawName, source, priceLinked });
  return {
    id: stableId("dishmention", [recordUid(menu), normalizedName, source, sectionName]),
    menuId: recordUid(menu),
    sourceKey: menu.sourceKey || "cia",
    rawName: cleanValue(rawName),
    normalizedName,
    canonicalDishId: `dish:${normalizedName.replace(/\s+/g, "-").slice(0, 96)}`,
    sectionName,
    dishType: dishTypeFor(rawName),
    ingredientTags: ingredientTagsFor(rawName),
    extractionMethod: source,
    confidence,
    spanId,
    provenance: {
      sourceFile: source === "nypl_structured" ? "menus.json/prices.json" : "menus.json",
      sourceRecordId: cleanValue(menu.sourceRecordId || menu.pointer || menu.id),
    },
  };
}

function metadataDishMentions(menus) {
  const records = [];
  const seen = new Set();
  for (const menu of menus) {
    for (const rawName of menu.topDishes || []) {
      const mention = dishMentionFromName({ menu, rawName, source: menu.sourceKey === "nypl" ? "nypl_structured" : "metadata_top_dish" });
      if (!mention || seen.has(mention.id)) continue;
      seen.add(mention.id);
      records.push(mention);
    }
  }
  return records;
}

function textDishMentions(menu, text, maxRecords = 120) {
  const lines = String(text || "")
    .split(/\n+/)
    .map(cleanValue)
    .filter(Boolean)
    .slice(0, 1000);
  const records = [];
  const seen = new Set();
  let currentSection = "";
  for (const [lineNumber, line] of lines.entries()) {
    const section = sectionForLine(line);
    if (section) {
      currentSection = section;
      continue;
    }
    if (!isLikelyDishLine(line)) continue;
    const rawName = lineDishLabel(line);
    if (!rawName || rawName.length < 4) continue;
    const tags = ingredientTagsFor(rawName);
    const dishType = dishTypeFor(rawName);
    const priceLinked = PRICE_TOKEN.test(line);
    PRICE_TOKEN.lastIndex = 0;
    if (!tags.length && dishType === "dish" && !priceLinked) continue;
    const spanId = stableId("span", [recordUid(menu), lineNumber, rawName]);
    const mention = dishMentionFromName({
      menu,
      rawName,
      source: "local_transcript_regex",
      sectionName: currentSection,
      spanId,
      priceLinked,
    });
    if (!mention || seen.has(mention.id)) continue;
    mention.lineNumber = lineNumber + 1;
    mention.provenance.sourceFile = ".cache/enrichment/transcripts";
    seen.add(mention.id);
    records.push(mention);
    if (records.length >= maxRecords) break;
  }
  return records;
}

function enrichmentPriceObservation(record, references = {}, contextEvents = []) {
  const menuId = cleanValue(record.menuUid || record.menuId);
  const rawName = cleanValue(record.item);
  const normalizedName = normalizedDishName(rawName);
  return {
    id: stableId("priceobs", [menuId, rawName, record.rawPrice || record.amount, record.year || "", record.id || ""]),
    sourcePriceId: cleanValue(record.id),
    menuId,
    sourceKey: cleanValue(record.sourceKey || (String(menuId).startsWith("nypl:") ? "nypl" : "cia")),
    rawName,
    normalizedName,
    dishType: dishTypeFor(rawName),
    ingredientTags: ingredientTagsFor(rawName),
    rawPriceText: cleanValue(record.rawPrice || record.rawAmount || record.amount),
    amount: Number.isFinite(Number(record.amount)) ? Number(record.amount) : null,
    currencyCode: cleanValue(record.currency),
    priceScale: cleanValue(record.scale),
    normalized: record.normalized || normalizePrice(record, references),
    context: record.context || contextForEntry(record, contextEvents),
    confidence: cleanValue(record.confidence || "unknown"),
    confidenceScore: Number(record.score || 0) || null,
    extractionMethod: record.scale === "structured-nypl" || record.sourceKey === "nypl" ? "nypl_structured_price" : "local_price_regex",
    provenance: {
      sourceFile: "prices.json",
      sourceRecordId: cleanValue(record.sourceRecordId || record.menuId || record.menuUid),
    },
  };
}

function mergeUnique(records, key = "id") {
  const seen = new Set();
  const output = [];
  for (const record of records) {
    const id = record?.[key];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    output.push(record);
  }
  return output;
}

function rankDishMention(record) {
  let score = Number(record.confidence || 0) * 100;
  if (record.sourceKey === "cia") score += 25;
  if (record.extractionMethod === "local_transcript_regex") score += 18;
  if ((record.ingredientTags || []).length) score += 10 + Math.min(12, record.ingredientTags.length * 2);
  if (record.dishType && record.dishType !== "dish") score += 8;
  if (record.sectionName) score += 4;
  return score;
}

async function readJson(relativePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, relativePath), "utf8"));
  } catch (error) {
    return fallback;
  }
}

async function writeJson(relativePath, payload) {
  const filePath = path.join(DATA_DIR, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

async function writeMaybeShardedJson(relativePath, payload, options = {}) {
  return writeEnrichmentPayload(path.join(DATA_DIR, relativePath), payload, options);
}

function cacheFileForMenu(menu) {
  return path.join(TRANSCRIPT_CACHE_DIR, `${recordUid(menu).replace(/[^a-z0-9_-]+/gi, "_")}.txt`);
}

function withTimeout(promise, timeoutMs, label) {
  if (!timeoutMs) return promise;
  let timeout = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

async function cachedTranscript(menu, options) {
  const filePath = cacheFileForMenu(menu);
  if (options.transcriptCache !== false) {
    try {
      return await fs.readFile(filePath, "utf8");
    } catch (error) {
      if (!options.fetchCiaText || (menu.sourceKey || "cia") !== "cia") return "";
    }
  } else if (!options.fetchCiaText || (menu.sourceKey || "cia") !== "cia") {
    return "";
  }
  const text = await withTimeout(fetchCiaTranscriptBounded(menu, options), options.menuTimeoutMs, `transcript ${recordUid(menu)}`);
  if (text && options.transcriptCache !== false) {
    try {
      await fs.mkdir(TRANSCRIPT_CACHE_DIR, { recursive: true });
      await fs.writeFile(filePath, text, "utf8");
    } catch (error) {
      if (!["ENOSPC", "EDQUOT"].includes(error.code)) throw error;
      options.onProgress?.(`transcript cache skipped for ${recordUid(menu)}: ${error.code}`);
    }
  }
  return text || "";
}

async function fetchCiaTranscriptBounded(menu, options) {
  const id = cleanValue(menu.sourceRecordId || menu.pointer || menu.id);
  if (!id) return "";
  const item = await fetchCiaMetadata(id, options);
  const texts = [];
  if (item.text) texts.push(cleanValue(item.text));

  const rawParentId = Number(item.parentId);
  const parentId = Number.isFinite(rawParentId) && rawParentId > 0 ? String(rawParentId) : id;
  let pages = [];
  try {
    const compound = await fetchJsonLoose(
      `https://${CONTENTDM_HOST}/digital/bl/dmwebservices/index.php?q=dmGetCompoundObjectInfo/${CIA_COLLECTION}/${encodeURIComponent(parentId)}/json`,
      options.requestTimeoutMs
    );
    pages = Array.isArray(compound.page) ? compound.page : [];
  } catch (error) {
    pages = [];
  }

  for (const page of pages.slice(0, options.maxTranscriptPages)) {
    const pageId = cleanValue(page.pageptr || page.id);
    if (!pageId || pageId === id) continue;
    try {
      const pageItem = await fetchCiaMetadata(pageId, options);
      if (pageItem.text) texts.push(cleanValue(pageItem.text));
    } catch (error) {
      // Individual page OCR misses are common; keep the rest of the menu usable.
    }
  }

  return texts.filter(Boolean).join("\n");
}

function parseImageDimensions(buffer) {
  if (!buffer || buffer.length < 24) return {};
  if (buffer.toString("ascii", 1, 4) === "PNG") {
    return {
      mediaType: "image/png",
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length - 9) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) break;
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return {
          mediaType: "image/jpeg",
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
  }
  return {};
}

async function fetchBuffer(url, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "http:" ? http : https;
    let settled = false;
    let req = null;
    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(totalTimeout);
      callback(value);
    };
    const totalTimeout = setTimeout(() => {
      if (req) req.destroy(new Error(`request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    req = client.request(
      parsed,
      {
        method: "GET",
        timeout: timeoutMs,
        rejectUnauthorized: false,
        headers: { "User-Agent": "MenuGraph local image-header probe" },
      },
      (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          response.resume();
          fetchBuffer(new URL(response.headers.location, parsed).toString(), timeoutMs)
            .then((buffer) => settle(resolve, buffer))
            .catch((error) => settle(reject, error));
          return;
        }
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const buffer = Buffer.concat(chunks);
          if (response.statusCode >= 400) {
            settle(reject, new Error(`HTTP ${response.statusCode}`));
            return;
          }
          settle(resolve, buffer);
        });
        response.on("error", (error) => settle(reject, error));
      }
    );
    req.on("timeout", () => req.destroy(new Error(`request timed out after ${timeoutMs}ms`)));
    req.on("error", (error) => settle(reject, error));
    req.end();
  });
}

async function fetchJsonLoose(url, timeoutMs = 20000) {
  const buffer = await fetchBuffer(url, timeoutMs);
  return JSON.parse(buffer.toString("utf8"));
}

function contentdmUrl(pathname) {
  if (!pathname) return "";
  if (/^https?:\/\//i.test(pathname)) return pathname.replace(/^http:/i, "https:");
  return `https://${CONTENTDM_HOST}${pathname.startsWith("/") ? "" : "/"}${pathname}`;
}

async function resolveImageInfo(menu, options) {
  const sourceKey = menu.sourceKey || "cia";
  if (sourceKey !== "cia") return { imageUrl: menu.imageUrl };
  const id = cleanValue(menu.sourceRecordId || menu.pointer || menu.id);
  if (!id) return { imageUrl: menu.imageUrl };
  const metadata = await resolveCiaImageMetadata(id, options);
  const imageUrl = contentdmUrl(metadata.imageUri || metadata.downloadUri || menu.imageUrl);
  const iiifInfoUrl = contentdmUrl(metadata.iiifInfoUri);
  if (iiifInfoUrl) {
    try {
      const info = await fetchJsonLoose(iiifInfoUrl, options.requestTimeoutMs);
      const width = Number(info.width || info.sizes?.[0]?.width || 0);
      const height = Number(info.height || info.sizes?.[0]?.height || 0);
      if (width && height) {
        return {
          imageUrl,
          iiifInfoUrl,
          width,
          height,
          mediaType: "image/jpeg",
          method: "iiif_info",
        };
      }
    } catch (error) {
      return { imageUrl, iiifInfoUrl, iiifError: error.message };
    }
  }
  return { imageUrl, iiifInfoUrl };
}

async function fetchCiaMetadata(id, options) {
  return fetchJsonLoose(`https://${CONTENTDM_HOST}/digital/api/singleitem/collection/${CIA_COLLECTION}/id/${encodeURIComponent(id)}`, options.requestTimeoutMs);
}

async function firstCompoundPageId(id, metadata, options) {
  const directPage = metadata.objectInfo?.page?.[0]?.pageptr || metadata.objectInfo?.page?.[0]?.id;
  if (directPage) return cleanValue(directPage);
  try {
    const compound = await fetchJsonLoose(
      `https://${CONTENTDM_HOST}/digital/bl/dmwebservices/index.php?q=dmGetCompoundObjectInfo/${CIA_COLLECTION}/${encodeURIComponent(id)}/json`,
      options.requestTimeoutMs
    );
    return cleanValue(compound.page?.[0]?.pageptr || compound.page?.[0]?.id);
  } catch (error) {
    return "";
  }
}

async function resolveCiaImageMetadata(id, options) {
  const metadata = await fetchCiaMetadata(id, options);
  if (metadata.iiifInfoUri && /^image\//i.test(cleanValue(metadata.contentType))) return metadata;
  const pageId = await firstCompoundPageId(id, metadata, options);
  if (pageId && pageId !== id) {
    try {
      return await fetchCiaMetadata(pageId, options);
    } catch (error) {
      return metadata;
    }
  }
  return metadata;
}

async function assessImages(menus, options) {
  const selected = menus.filter((menu) => menu.imageUrl && /^https?:\/\//i.test(menu.imageUrl)).slice(0, options.imageLimit);
  const records = [];
  for (const [index, menu] of selected.entries()) {
    try {
      const resolved = await resolveImageInfo(menu, options);
      let buffer = null;
      let dimensions = {};
      if (resolved.width && resolved.height) {
        dimensions = {
          width: resolved.width,
          height: resolved.height,
          mediaType: resolved.mediaType || "image/jpeg",
        };
      } else {
        buffer = await fetchBuffer(resolved.imageUrl || menu.imageUrl, options.requestTimeoutMs);
        dimensions = parseImageDimensions(buffer);
      }
      const width = Number(dimensions.width || 0);
      const height = Number(dimensions.height || 0);
      records.push({
        id: stableId("imagefeature", [recordUid(menu), resolved.imageUrl || menu.imageUrl, resolved.method || "buffer"]),
        menuId: recordUid(menu),
        sourceKey: menu.sourceKey || "cia",
        featureType: "local_image_header",
        modelName: resolved.method === "iiif_info" ? "contentdm-iiif-info" : "node-buffer-image-header",
        modelVersion: "0.1.0",
        scalar: {
          width: width || null,
          height: height || null,
          aspectRatio: width && height ? Number((width / height).toFixed(3)) : null,
          orientation: width && height ? (width > height ? "landscape" : height > width ? "portrait" : "square") : "unknown",
          byteSize: buffer ? buffer.length : null,
          mediaType: dimensions.mediaType || "unknown",
          checksumSha256: buffer ? crypto.createHash("sha256").update(buffer).digest("hex") : null,
          iiifInfoUrl: resolved.iiifInfoUrl || null,
        },
        confidence: width && height ? 0.94 : 0.45,
        provenance: {
          sourceImageUrl: resolved.imageUrl || menu.imageUrl,
          sourceRecordId: cleanValue(menu.sourceRecordId || menu.pointer || menu.id),
        },
      });
      if (options.onProgress && ((index + 1) % 25 === 0 || index + 1 === selected.length)) {
        options.onProgress(`image assessment ${index + 1}/${selected.length}`);
      }
    } catch (error) {
      records.push({
        id: stableId("imagefeature", [recordUid(menu), menu.imageUrl, "error"]),
        menuId: recordUid(menu),
        sourceKey: menu.sourceKey || "cia",
        featureType: "local_image_header",
        modelName: "node-buffer-image-header",
        modelVersion: "0.1.0",
        scalar: { error: error.message },
        confidence: 0.05,
        provenance: {
          sourceImageUrl: menu.imageUrl,
          sourceRecordId: cleanValue(menu.sourceRecordId || menu.pointer || menu.id),
        },
      });
    }
  }
  return records;
}

async function fetchTextUrl(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.requestTimeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "MenuGraph enrichment probe; research metadata only" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function sampleMatches(html, pattern, limit = 12) {
  const records = [];
  let match = pattern.exec(html);
  while (match && records.length < limit) {
    records.push(match.slice(1).map((value) => cleanValue(value.replace(/<[^>]*>/g, " "))));
    match = pattern.exec(html);
  }
  return records;
}

async function probeExternalSources(options) {
  const probes = [];
  const pushProbe = (sourceId, payload) => probes.push({ sourceId, probedAt: new Date().toISOString(), ...payload });

  try {
    const url = "https://digitalcollections.lib.uh.edu/collections/g158bj49n";
    const html = await fetchTextUrl(url, options);
    const titleDateRows = sampleMatches(html, /<td[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>\s*<\/td>\s*<td[^>]*>(.*?)<\/td>/gis, 16).map(([href, title, date]) => ({
      title,
      date,
      itemUrl: href.startsWith("http") ? href : `https://digitalcollections.lib.uh.edu${href}`,
    }));
    pushProbe("uh_1850s_1860s_menus", {
      status: "ok",
      sourceUrl: url,
      publicItemCount: Number((html.match(/\b(\d+)\s+Items\b/i) || [])[1] || 81),
      sampleItems: titleDateRows,
      notes: "Metadata probe only; images and OCR not copied into public static artifacts.",
    });
  } catch (error) {
    pushProbe("uh_1850s_1860s_menus", { status: "error", error: error.message });
  }

  try {
    const url = "https://tessa.lapl.org/c10";
    const html = await fetchTextUrl(url, options);
    pushProbe("lapl_menu_collection", {
      status: "ok",
      sourceUrl: url,
      publicItemCount: Number((html.match(/\b([0-9,]+)\s+items?\b/i) || [])[1]?.replace(/,/g, "") || 0) || null,
      title: cleanValue((html.match(/<title[^>]*>(.*?)<\/title>/is) || [])[1]),
      notes: "TESSA page is public, but bulk/API terms need review before large image or row harvest.",
    });
  } catch (error) {
    pushProbe("lapl_menu_collection", { status: "error", error: error.message });
  }

  try {
    const response = await fetch("https://api.dc.library.northwestern.edu/api/v2/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _source: ["id", "title", "date_created", "work_type", "thumbnail"],
        size: 12,
        query: { match: { all_text: "menu transportation dining" } },
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const hits = payload.hits?.hits || payload.data || [];
    pushProbe("northwestern_transport_menus", {
      status: "ok",
      sourceUrl: "https://api.dc.library.northwestern.edu/docs/v2/index.html",
      publicItemCount: payload.hits?.total?.value || payload.total || null,
      sampleItems: hits.slice(0, 12).map((hit) => {
        const source = hit._source || hit;
        return {
          id: cleanValue(source.id || hit._id),
          title: cleanValue(source.title),
          date: cleanValue(source.date_created),
        };
      }),
      notes: "Northwestern provides documented JSON search and IIIF endpoints; suitable for a later bulk-safe connector.",
    });
  } catch (error) {
    pushProbe("northwestern_transport_menus", { status: "error", error: error.message });
  }

  try {
    const url = "https://rmc.library.cornell.edu/EAD/htmldocs/RMM06452.html";
    const html = await fetchTextUrl(url, options);
    pushProbe("cornell_nestle_menu_collection", {
      status: "ok",
      sourceUrl: url,
      title: cleanValue((html.match(/<title[^>]*>(.*?)<\/title>/is) || [])[1]),
      sampleTerms: sampleMatches(html, /<h[1-4][^>]*>(.*?)<\/h[1-4]>/gis, 10).map(([title]) => title),
      notes: "Finding-aid probe only; row/image ingestion needs collection-specific export review.",
    });
  } catch (error) {
    pushProbe("cornell_nestle_menu_collection", { status: "error", error: error.message });
  }

  return probes;
}

function summarize(records, getter) {
  const map = new Map();
  for (const record of records) {
    const key = getter(record) || "unknown";
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

async function buildLocalEnrichment(options = {}) {
  const startedAt = new Date().toISOString();
  const [menusPayload, prices, dateEstimates, cpiUs, cpiCountry, contextEvents] = await Promise.all([
    readJson("menus.json", { menus: [] }),
    readJson("prices.json", { records: [] }),
    readJson("date-estimates.json", { records: [] }),
    readJson("reference/cpi-us.json", {}),
    readJson("reference/cpi-country.json", {}),
    readJson("reference/context-events.json", []),
  ]);
  const menus = menusPayload.menus || [];
  const references = { cpiUs, cpiCountry };
  const dateEstimateByMenu = new Map((dateEstimates.records || []).map((record) => [cleanValue(record.menuId), record]));
  const selected = selectMenus(menus, options, dateEstimateByMenu);
  const textDishRecords = [];
  const textPriceRecords = [];
  const runEvents = [];
  const deadline = options.timeBudgetMs ? Date.now() + options.timeBudgetMs : Infinity;
  let textMenus = 0;
  let warningCount = 0;

  for (const [index, menu] of selected.entries()) {
    if (Date.now() > deadline) {
      runEvents.push({ level: "warn", message: "Time budget reached; remaining menus deferred.", processed: index, total: selected.length });
      break;
    }
    if (!options.fetchCiaText && (menu.sourceKey || "cia") === "cia") continue;
    try {
      const text = await cachedTranscript(menu, options);
      if (!text) continue;
      textMenus += 1;
      textDishRecords.push(...textDishMentions(menu, text, options.maxDishMentionsPerMenu));
      for (const price of extractPricesFromText(text, menu)) {
        const enriched = enrichmentPriceObservation(
          {
            ...price,
            menuUid: recordUid(menu),
            sourceKey: menu.sourceKey || "cia",
          },
          references,
          contextEvents
        );
        textPriceRecords.push(enriched);
      }
    } catch (error) {
      warningCount += 1;
      runEvents.push({ level: "warn", menuId: recordUid(menu), message: error.message });
    } finally {
      if (options.onProgress && ((index + 1) % 25 === 0 || index + 1 === selected.length)) {
        options.onProgress(
          [
            `text enrichment ${index + 1}/${selected.length} processed`,
            `${textMenus} with text`,
            `${textDishRecords.length} text dishes`,
            `${textPriceRecords.length} text prices`,
            `${warningCount} warnings`,
          ].join(", ")
        );
      }
    }
  }

  const metadataDishes = metadataDishMentions(menus);
  const priceObservations = mergeUnique([
    ...prices.records.map((record) => enrichmentPriceObservation(record, references, contextEvents)),
    ...textPriceRecords,
  ]);
  const allDishMentions = mergeUnique([...metadataDishes, ...textDishRecords]);
  const dishMentions = [...allDishMentions]
    .sort((a, b) => rankDishMention(b) - rankDishMention(a) || cleanValue(a.rawName).localeCompare(cleanValue(b.rawName)))
    .slice(0, options.publicDishLimit);
  const imageFeatures = options.imageLimit > 0 ? await assessImages(selected, options) : [];
  const sourceProbes = options.probeSources ? await probeExternalSources(options) : [];
  const finishedAt = new Date().toISOString();

  const status = {
    version: VERSION,
    startedAt,
    finishedAt,
    processor: {
      name: "local_enrichment_runner",
      version: "0.1.0",
      localOnly: true,
    },
    config: {
      source: options.source,
      limit: options.limit,
      unknownOnly: options.unknownOnly,
      fetchCiaText: options.fetchCiaText,
      transcriptCache: options.transcriptCache,
      imageLimit: options.imageLimit,
      probeSources: options.probeSources,
      timeBudgetMs: options.timeBudgetMs,
    },
    summary: {
      menusAvailable: menus.length,
      menusSelected: selected.length,
      dishMentionsAvailable: allDishMentions.length,
      dishMentions: dishMentions.length,
      priceObservations: priceObservations.length,
      imageFeatures: imageFeatures.length,
      sourceProbes: sourceProbes.length,
      dishMentionsBySource: summarize(dishMentions, (record) => record.sourceKey),
      priceObservationsBySource: summarize(priceObservations, (record) => record.sourceKey),
      dishTypes: summarize(dishMentions, (record) => record.dishType),
      ingredientTags: summarize(dishMentions.flatMap((record) => record.ingredientTags.map((tag) => ({ tag }))), (record) => record.tag),
      events: runEvents,
    },
    artifacts: [
      "enrichment/dish-mentions.json",
      "enrichment/price-observations.json",
      "enrichment/image-features.json",
      "enrichment/source-probes.json",
    ],
  };

  const dishPayload = {
    version: VERSION,
    generatedAt: finishedAt,
    summary: {
      total: dishMentions.length,
      totalAvailable: allDishMentions.length,
      publicCap: options.publicDishLimit,
      bySource: status.summary.dishMentionsBySource,
      byType: status.summary.dishTypes,
    },
    records: dishMentions,
  };
  const pricePayload = { version: VERSION, generatedAt: finishedAt, summary: { total: priceObservations.length, bySource: status.summary.priceObservationsBySource }, records: priceObservations };
  const imagePayload = { version: VERSION, generatedAt: finishedAt, summary: { total: imageFeatures.length, bySource: summarize(imageFeatures, (record) => record.sourceKey) }, records: imageFeatures };
  const probePayload = { version: VERSION, generatedAt: finishedAt, summary: { total: sourceProbes.length, byStatus: summarize(sourceProbes, (record) => record.status) }, records: sourceProbes };

  if (!options.dryRun) {
    await writeMaybeShardedJson("enrichment/dish-mentions.json", dishPayload, { shard: true });
    await writeMaybeShardedJson("enrichment/price-observations.json", pricePayload, { shard: true });
    await writeJson("enrichment/image-features.json", imagePayload);
    await writeJson("enrichment/source-probes.json", probePayload);
    await writeJson("enrichment-status.json", status);
  }

  return { status, dishPayload, pricePayload, imagePayload, probePayload };
}

function optionsFromArgs(args = process.argv.slice(2)) {
  const limit = Math.max(0, Number(argValue(args, "limit", "0")) || 0);
  const imageLimit = Math.max(0, Number(argValue(args, "image-limit", "0")) || 0);
  const timeBudgetMin = Number(argValue(args, "time-budget-min", "0")) || 0;
  return {
    source: argValue(args, "source", "all"),
    limit: limit || 250,
    unknownOnly: hasFlag(args, "unknown-only"),
    fetchCiaText: hasFlag(args, "fetch-cia-text"),
    transcriptCache: !hasFlag(args, "skip-transcript-cache"),
    imageLimit,
    probeSources: hasFlag(args, "probe-sources"),
    dryRun: hasFlag(args, "dry-run"),
    requestTimeoutMs: Math.max(2000, Number(argValue(args, "timeout-ms", "20000")) || 20000),
    menuTimeoutMs: Math.max(5000, Number(argValue(args, "menu-timeout-ms", "45000")) || 45000),
    maxTranscriptPages: Math.max(1, Number(argValue(args, "max-transcript-pages", "8")) || 8),
    timeBudgetMs: timeBudgetMin > 0 ? timeBudgetMin * 60 * 1000 : 0,
    maxDishMentionsPerMenu: Math.max(10, Number(argValue(args, "max-dish-mentions-per-menu", "120")) || 120),
    publicDishLimit: Math.max(1000, Number(argValue(args, "public-dish-limit", "60000")) || 60000),
    onProgress: (message) => console.log(message),
  };
}

async function main() {
  const result = await buildLocalEnrichment(optionsFromArgs());
  const summary = result.status.summary;
  console.log(
    [
      `Wrote enrichment snapshot: ${summary.dishMentions.toLocaleString()} public dish mentions (${summary.dishMentionsAvailable.toLocaleString()} available)`,
      `${summary.priceObservations.toLocaleString()} price observations`,
      `${summary.imageFeatures.toLocaleString()} image features`,
      `${summary.sourceProbes.toLocaleString()} source probes`,
    ].join(", ")
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildLocalEnrichment,
  dishTypeFor,
  ingredientTagsFor,
  metadataDishMentions,
  enrichmentPriceObservation,
  normalizedDishName,
  optionsFromArgs,
  parseImageDimensions,
  selectMenus,
  textDishMentions,
};
