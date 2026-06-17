const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { ingredientItemsFromStatement } = require("./ingredient-statement-utils");

const root = path.join(__dirname, "..");
const fullQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv");
const visualIndexPath = path.join(root, "docs/data/product-evidence/cwa_ingredient_visual_index.json");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const swiftOcrPath = path.join(root, "scripts/vision-ocr.swift");
const swiftCropPath = path.join(root, "scripts/crop-ocr-region.swift");
const cwaRoot = path.join(root, ".cache/ingredient-ocr/cwa");
const latestPrivateManifestPath = path.join(cwaRoot, "latest-private-manifest.json");
const sourceFamilyId = "candy-wrapper-archive";
const generatedAt = new Date().toISOString();

const ingredientTextPatterns = [
  /\bingredients?\s*[:;]/i,
  /\bmay contain\b/i,
  /\ballergy information\b/i,
  /\ballergens?\b/i,
  /\bcontains\s*[:;]\s*/i,
  /\bcontains\s+(?:milk|soy|peanuts?|tree nuts?|wheat|eggs?|almonds?|coconut|sesame)\b/i,
];

const panelContextPatterns = [
  ...ingredientTextPatterns,
  /\bnutrition facts\b/i,
  /\bserving size\b/i,
  /\bnet\s*(wt|weight)\b/i,
  /\bmanufactured by\b/i,
  /\bdistributed by\b/i,
  /\bupc\b/i,
];

const curatedIngredientReviews = {
  "snickers_bar__earliest_verified_label__174__1": {
    source: "manual_visual_read_candidate",
    crop_box: { x: 0.30, y: 0.19, width: 0.42, height: 0.20 },
    crop_rotation_degrees: 0,
    ingredient_text: "White sugar, sweet milk chocolate, corn syrup, peanuts, milk condensed with sugar, coconut oil, malted milk, whites of eggs and salt.",
  },
  "snickers_bar__1980s_or_earlier__174__1": {
    source: "manual_visual_read_candidate",
    crop_box: { x: 0.07, y: 0.01, width: 0.64, height: 0.18 },
    crop_rotation_degrees: 180,
    ingredient_text: "Milk chocolate, peanuts, corn syrup, sugar, milk, butter, salt, egg whites, soybean oil, chocolate, lecithin, natural and artificial flavors.",
  },
  "snickers_bar__1990s__174__1": {
    source: "manual_visual_read_candidate",
    crop_box: { x: 0.26, y: 0.00, width: 0.48, height: 0.22 },
    crop_rotation_degrees: 180,
    ingredient_text: "Milk chocolate (sugar, cocoa butter, chocolate, skim milk, lactose, milkfat, soy lecithin and artificial flavor), peanut butter (peanuts, salt, hydrogenated vegetable oil), monoglycerides, sugar, corn syrup, egg whites, soy protein, propyl gallate to maintain freshness.",
  },
  "snickers_bar__2000s__174__1": {
    source: "manual_visual_read_candidate",
    crop_box: { x: 0.28, y: 0.00, width: 0.52, height: 0.24 },
    crop_rotation_degrees: 180,
    ingredient_text: "Milk chocolate (sugar, cocoa butter, chocolate, skim milk, lactose, milkfat, soy lecithin, artificial flavor), peanuts, corn syrup, sugar, milk, butter, partially hydrogenated soybean oil, salt, egg whites, chocolate, natural and artificial flavors.",
  },
  "kit_kat_bar__1980s_or_earlier__173__3": {
    source: "manual_visual_read_candidate",
    crop_box: { x: 0.01, y: 0.04, width: 0.86, height: 0.35 },
    crop_rotation_degrees: 0,
    ingredient_text: "Ingredients: milk chocolate (contains condensed milk, cocoa butter, chocolate, sugar, soya lecithin, natural and artificial flavour), sugar, flour, hydrogenated vegetable oil, chocolate, yeast, sodium bicarbonate, calcium sulphate, salt, ammonium chloride, potassium bromate, citric acid, natural and artificial flavour.",
  },
  "kit_kat_bar__2000s__173__1": {
    source: "manual_visual_read_candidate",
    crop_box: { x: 0.34, y: 0.21, width: 0.55, height: 0.24 },
    crop_rotation_degrees: 0,
    ingredient_text: "Ingredients: sugar, wheat flour, cocoa butter, nonfat milk, chocolate, refined palm kernel oil, lactose (milk), milk fat. Contains 2% or less of: soy lecithin, PGPR (emulsifier), yeast, artificial flavor, salt, and sodium bicarbonate. Allergy information: manufactured in a facility that processes peanuts.",
  },
  "twix_bar__earliest_verified_label__551__4": {
    source: "manual_visual_read_candidate_nearest_image",
    crop_box: { x: 0.18, y: 0.00, width: 0.62, height: 0.30 },
    crop_rotation_degrees: 180,
    ingredient_text: "Milk chocolate (sugar, cocoa butter, chocolate, skim milk, lactose, milkfat, soy lecithin, artificial flavor), sugar, enriched wheat flour, palm oil, corn syrup, skim milk, dextrose, salt, cocoa powder, baking soda, soy lecithin, artificial flavor.",
  },
  "twix_bar__1980s_or_earlier__551__4": {
    source: "manual_visual_read_candidate_nearest_image",
    crop_box: { x: 0.18, y: 0.00, width: 0.62, height: 0.30 },
    crop_rotation_degrees: 180,
    ingredient_text: "Milk chocolate (sugar, cocoa butter, chocolate, skim milk, lactose, milkfat, soy lecithin, artificial flavor), sugar, enriched wheat flour, palm oil, corn syrup, skim milk, dextrose, salt, cocoa powder, baking soda, soy lecithin, artificial flavor.",
  },
  "twix_bar__1990s__551__1": {
    source: "manual_visual_read_candidate_nearest_image",
    crop_box: { x: 0.18, y: 0.00, width: 0.62, height: 0.30 },
    crop_rotation_degrees: 180,
    ingredient_text: "Milk chocolate (sugar, cocoa butter, chocolate, skim milk, lactose, milkfat, soy lecithin, artificial flavor), sugar, enriched wheat flour, palm oil, corn syrup, skim milk, dextrose, salt, cocoa powder, baking soda, soy lecithin, artificial flavor.",
  },
  "twix_bar__2000s__551__1": {
    source: "manual_visual_read_candidate",
    crop_box: { x: 0.18, y: 0.00, width: 0.64, height: 0.32 },
    crop_rotation_degrees: 180,
    ingredient_text: "Ingredients: milk chocolate (sugar, cocoa butter, chocolate, skim milk, lactose, milkfat, soy lecithin, PGPR, artificial flavor), sugar, enriched wheat flour, palm oil, corn syrup, skim milk, dextrose, salt, cocoa powder, baking soda, soy lecithin, artificial flavor.",
  },
  "milky_way_bar__earliest_verified_label__175__3": {
    source: "manual_visual_read_candidate",
    crop_box: { x: 0.32, y: 0.18, width: 0.34, height: 0.24 },
    crop_rotation_degrees: 0,
    ingredient_text: "White sugar, sweet milk chocolate, corn syrup, milk, sugar, malted milk, coconut oil, whites of eggs, breakfast cocoa and salt.",
  },
  "milky_way_bar__1980s_or_earlier__175__3": {
    source: "manual_visual_read_candidate",
    crop_box: { x: 0.30, y: 0.23, width: 0.44, height: 0.18 },
    crop_rotation_degrees: 0,
    ingredient_text: "Milk chocolate, sugar, corn syrup, malted milk, sweetened condensed whole milk, vegetable oil, egg whites, cocoa, salt, lecithin.",
  },
  "tootsie_roll__earliest_verified_label__601__4": {
    source: "manual_visual_read_candidate",
    crop_box: { x: 0.28, y: 0.64, width: 0.42, height: 0.17 },
    crop_rotation_degrees: 180,
    ingredient_text: "Ingredients: sugar, corn syrup, vegetable oil, condensed milk, cocoa, salt, lecithin, natural and artificial flavors.",
  },
  "tootsie_roll__earliest_verified_label__602__1": {
    source: "manual_visual_read_candidate",
    crop_box: { x: 0.24, y: 0.22, width: 0.36, height: 0.21 },
    crop_rotation_degrees: 0,
    ingredient_text: "Ingredients: sugar, corn syrup, vegetable oil, cocoa, condensed skim milk, whey powder, salt, vegetable lecithin, natural and artificial flavors.",
  },
  "tootsie_roll__1980s_or_earlier__602__1": {
    source: "manual_visual_read_candidate",
    crop_box: { x: 0.24, y: 0.22, width: 0.36, height: 0.21 },
    crop_rotation_degrees: 0,
    ingredient_text: "Ingredients: sugar, corn syrup, vegetable oil, cocoa, condensed skim milk, whey powder, salt, vegetable lecithin, natural and artificial flavors.",
  },
};

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha(value, length = 16) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, length);
}

function sanitizeId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);
}

function shortText(value, limit = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trim()}...` : text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const headers = rows.shift() || [];
  return rows
    .filter((cells) => cells.some(Boolean))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, headers, rows) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(
    filePath,
    `${[
      headers.join(","),
      ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
    ].join("\n")}\n`,
  );
}

function readQueueRows() {
  return parseCsv(fs.readFileSync(fullQueueCsvPath, "utf8")).filter((row) => (
    /candywrapperarchive\.com/i.test(`${row.source_domain} ${row.source_url} ${row.source_title}`)
  ));
}

function sourceUrls(rows) {
  return [...new Set(rows.map((row) => row.source_url).filter(Boolean))].sort();
}

function cachedSourceCapturesByUrl() {
  const latest = readJsonIfExists(latestPrivateManifestPath);
  return new Map((latest?.source_captures || [])
    .filter((capture) => capture.source_url)
    .map((capture) => [capture.source_url, capture]));
}

function htmlDecode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function absoluteUrl(value, base) {
  try {
    return new URL(htmlDecode(value), base).href;
  } catch (error) {
    return "";
  }
}

function imageUrlScore(url) {
  const text = String(url || "").toLowerCase();
  let score = 0;
  if (text.includes("/wp-content/uploads/")) score += 60;
  if (/logo|favicon|avatar|spinner|blank|placeholder|icon|cwa_title|ad_place_holder/.test(text)) score -= 500;
  if (/_th\.(?:jpe?g|png|webp)/.test(text)) score -= 60;
  const dimensionMatch = text.match(/-(\d{2,4})x(\d{2,4})\.(?:jpe?g|png|webp)/);
  if (dimensionMatch) score += Number(dimensionMatch[1]) + Number(dimensionMatch[2]);
  if (/\.(?:jpe?g|png|webp)(?:[?#].*)?$/i.test(text)) score += 20;
  if (/-150x150\./.test(text)) score -= 80;
  return score;
}

function attrValue(markup, name) {
  const match = String(markup || "").match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"));
  return match ? htmlDecode(match[1]) : "";
}

function yearFromText(value) {
  const text = String(value || "");
  const exact = text.match(/\b(19|20)\d{2}\b/);
  if (exact) return Number(exact[0]);
  const decade = text.match(/\b(19|20)(\d)0s\b/i);
  if (decade) return Number(`${decade[1]}${decade[2]}0`);
  return null;
}

function originalImageUrl(url) {
  return String(url || "").replace(/_th(\.(?:jpe?g|png|webp)(?:[?#].*)?)$/i, "$1");
}

function isDecorativeImage(url, title = "") {
  return /logo|favicon|avatar|spinner|blank|placeholder|icon|cwa_title|ad_place_holder/i.test(`${url} ${title}`);
}

function candidateKey(candidate) {
  return candidate.url;
}

function imageUrlVariants(url) {
  const variants = [originalImageUrl(url), url].filter(Boolean);
  return [...new Set(variants)];
}

function extractImageCandidates(html, baseUrl) {
  const candidates = [];
  let sourceOrder = 0;
  const linkedImagePattern = /<a\b([^>]*)>\s*<img\b([^>]*)>/gi;
  let match;
  while ((match = linkedImagePattern.exec(html))) {
    const detailUrl = absoluteUrl(attrValue(match[1], "href"), baseUrl);
    const src = absoluteUrl(attrValue(match[2], "src") || attrValue(match[2], "data-src"), baseUrl);
    const title = attrValue(match[2], "title") || attrValue(match[2], "alt");
    if (!src || isDecorativeImage(src, title)) continue;
    const url = originalImageUrl(src);
    candidates.push({
      url,
      fallback_url: src,
      image_urls: imageUrlVariants(src),
      title,
      detail_url: detailUrl,
      year: yearFromText(`${title} ${detailUrl}`),
      source_order: sourceOrder,
    });
    sourceOrder += 1;
  }

  const attrPattern = /\b(?:src|data-src|data-large-file|data-full-url|data-orig-file|data-lazy-src|href)=["']([^"']+)["']/gi;
  while ((match = attrPattern.exec(html))) {
    const src = absoluteUrl(match[1], baseUrl);
    if (!src || isDecorativeImage(src)) continue;
    if (!/\.(?:jpe?g|png|webp)(?:[?#].*)?$/i.test(src)) continue;
    candidates.push({
      url: originalImageUrl(src),
      fallback_url: src,
      image_urls: imageUrlVariants(src),
      title: "",
      detail_url: "",
      year: yearFromText(src),
      source_order: sourceOrder,
    });
    sourceOrder += 1;
  }

  const srcsetPattern = /\bsrcset=["']([^"']+)["']/gi;
  while ((match = srcsetPattern.exec(html))) {
    String(match[1]).split(",").forEach((part) => {
      const src = absoluteUrl(part.trim().split(/\s+/)[0], baseUrl);
      if (!src || isDecorativeImage(src)) return;
      candidates.push({
        url: originalImageUrl(src),
        fallback_url: src,
        image_urls: imageUrlVariants(src),
        title: "",
        detail_url: "",
        year: yearFromText(src),
        source_order: sourceOrder,
      });
      sourceOrder += 1;
    });
  }

  const seen = new Set();
  return candidates
    .filter((candidate) => /^https?:\/\//i.test(candidate.url))
    .filter((candidate) => /\.(?:jpe?g|png|webp)(?:[?#].*)?$/i.test(candidate.url))
    .filter((candidate) => imageUrlScore(candidate.url) > -100)
    .filter((candidate) => {
      const key = candidateKey(candidate);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.source_order - b.source_order || imageUrlScore(b.url) - imageUrlScore(a.url));
}

function extensionFor(url, contentType = "") {
  const fromUrl = String(new URL(url).pathname).match(/\.(jpe?g|png|webp)$/i);
  if (fromUrl) {
    const ext = fromUrl[1].toLowerCase();
    return ext === "jpeg" ? "jpg" : ext;
  }
  if (/png/i.test(contentType)) return "png";
  if (/webp/i.test(contentType)) return "webp";
  return "jpg";
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 25000));
  try {
    return await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "MenuGraph ingredient OCR collector (local research cache)",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPage(url, filePath) {
  if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf8");
  const response = await fetchWithTimeout(url, { headers: { Accept: "text/html,*/*" } });
  if (!response.ok) throw new Error(`page returned ${response.status}`);
  const html = await response.text();
  fs.writeFileSync(filePath, html);
  return html;
}

async function downloadImage(url, filePrefix) {
  const cachedExt = extensionFor(url, "");
  const cachedPath = `${filePrefix}.${cachedExt}`;
  if (fs.existsSync(cachedPath)) {
    return { url, file_path: cachedPath, content_type: "cached", bytes: fs.statSync(cachedPath).size };
  }
  const response = await fetchWithTimeout(url, { headers: { Accept: "image/*,*/*" } });
  if (!response.ok) throw new Error(`image returned ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  const ext = extensionFor(url, contentType);
  const filePath = `${filePrefix}.${ext}`;
  if (!fs.existsSync(filePath)) {
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
  }
  return { url, file_path: filePath, content_type: contentType, bytes: fs.statSync(filePath).size };
}

function runVisionOcr(imagePath, moduleCachePath) {
  const swiftTempPath = path.join(moduleCachePath, "tmp");
  ensureDir(swiftTempPath);
  const run = spawnSync("swift", ["-module-cache-path", moduleCachePath, swiftOcrPath, imagePath], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      CLANG_MODULE_CACHE_PATH: moduleCachePath,
      SWIFT_MODULE_CACHE_PATH: moduleCachePath,
      TMPDIR: swiftTempPath,
    },
    maxBuffer: 1024 * 1024 * 16,
  });
  if (run.status !== 0) {
    return { status: "ocr_failed", error: shortText(run.stderr || run.stdout, 300), output: null };
  }
  try {
    return { status: "ocr_extracted", error: "", output: JSON.parse(run.stdout) };
  } catch (error) {
    return { status: "ocr_failed", error: `could not parse OCR output: ${error.message}`, output: null };
  }
}

function lineMatchesIngredientSignal(line) {
  return ingredientTextPatterns.some((pattern) => pattern.test(line.text || ""));
}

function lineMatchesPanelContext(line) {
  return panelContextPatterns.some((pattern) => pattern.test(line.text || ""));
}

function unionBoxes(lines) {
  if (!lines.length) return null;
  const minX = Math.max(0, Math.min(...lines.map((line) => Number(line.bbox.x) || 0)));
  const minY = Math.max(0, Math.min(...lines.map((line) => Number(line.bbox.y) || 0)));
  const maxX = Math.min(1, Math.max(...lines.map((line) => (Number(line.bbox.x) || 0) + (Number(line.bbox.width) || 0))));
  const maxY = Math.min(1, Math.max(...lines.map((line) => (Number(line.bbox.y) || 0) + (Number(line.bbox.height) || 0))));
  if (maxX <= minX || maxY <= minY) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function signalRegionBox(lines = [], matchLine = lineMatchesIngredientSignal, trailingLines = 12) {
  const signalIndexes = lines
    .map((line, index) => [line, index])
    .filter(([line]) => matchLine(line))
    .map(([, index]) => index);
  if (!signalIndexes.length) return null;
  const selected = new Set();
  for (const index of signalIndexes) {
    for (let offset = 0; offset <= trailingLines && index + offset < lines.length; offset += 1) {
      selected.add(index + offset);
    }
  }
  return unionBoxes([...selected].sort((a, b) => a - b).map((index) => lines[index]));
}

function focusedRegion(lines = []) {
  const ingredientBox = signalRegionBox(lines, lineMatchesIngredientSignal, 12);
  if (ingredientBox) return { box: ingredientBox, focus: "ingredient_text" };
  const panelBox = signalRegionBox(lines, lineMatchesPanelContext, 8);
  if (panelBox) return { box: panelBox, focus: "panel_context" };
  return { box: null, focus: "whole_wrapper" };
}

function wholeImageBox() {
  return { x: 0, y: 0, width: 1, height: 1 };
}

function runCrop(imagePath, cropPath, box, moduleCachePath, padding = 0.05, minOutputWidth = 1000, rotationDegrees = 0) {
  const swiftTempPath = path.join(moduleCachePath, "tmp");
  ensureDir(swiftTempPath);
  const run = spawnSync("swift", [
    "-module-cache-path",
    moduleCachePath,
    swiftCropPath,
    imagePath,
    cropPath,
    String(box.x),
    String(box.y),
    String(box.width),
    String(box.height),
    String(padding),
    String(minOutputWidth),
    String(rotationDegrees || 0),
  ], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      CLANG_MODULE_CACHE_PATH: moduleCachePath,
      SWIFT_MODULE_CACHE_PATH: moduleCachePath,
      TMPDIR: swiftTempPath,
    },
    maxBuffer: 1024 * 1024 * 4,
  });
  if (run.status !== 0) {
    return { status: "crop_failed", error: shortText(run.stderr || run.stdout, 300) };
  }
  let output = null;
  try {
    output = JSON.parse(run.stdout || "{}");
  } catch (error) {
    output = null;
  }
  return { status: "crop_ready", error: "", output };
}

function visualIdFor(row) {
  return `${sanitizeId(row.product_id)}__${sanitizeId(row.vintage_label)}__${sha(`${row.evidence_id}|${row.source_url}`, 10)}`;
}

function upscaledMinOutputWidth(focus = "whole_wrapper") {
  if (focus === "ingredient_text") return 3200;
  if (focus === "panel_context") return 2600;
  return 2200;
}

function publicClaimBoundary(row, hasIngredientSignal) {
  if (hasIngredientSignal) {
    return "OCR text is a candidate only; do not publish an ingredient claim until corrected and manually verified.";
  }
  return "Wrapper imagery can support visual lineage only; a readable back/side ingredient panel is still needed before ingredient claims.";
}

function gapSourceRequirements(row, hasIngredientSignal) {
  if (hasIngredientSignal) {
    return { status: "", next_step: "", accepted: [], rejected: [] };
  }
  return {
    status: "same_era_readable_panel_required",
    next_step: `Find a same-era ${row.product_name} back or side wrapper image with readable ingredient text before promoting ${row.vintage_label} ingredients.`,
    accepted: [
      "same-era back or side wrapper photo with ingredients visible",
      "higher-resolution Candy Wrapper Archive image exposing the ingredient panel",
      "source-attributed package label scan with date or era evidence",
    ],
    rejected: [
      "front-only wrapper art",
      "nearby-decade wrapper used as an exact formulation claim",
      "unsourced ingredient text without package imagery",
    ],
  };
}

function privateSafePreviewEndpoint(visualId) {
  return `/api/private/ingredient-crops/${visualId}`;
}

function vintageTarget(row) {
  const sourceRecord = sourceRecordTarget(row);
  if (sourceRecord) return sourceRecord;
  const label = String(row.vintage_label || "");
  if (label === "2000s") return { start: 2000, end: 2009, target: 2004 };
  if (label === "1990s") return { start: 1990, end: 1999, target: 1994 };
  if (label === "1980s_or_earlier") return { start: 1900, end: 1989, target: 1983 };
  if (label === "earliest_verified_label") return { earliest: true, target: 1900 };
  const startYear = yearFromText(row.vintage_start);
  const endYear = yearFromText(row.vintage_end);
  if (startYear || endYear) {
    const start = startYear || endYear;
    const end = endYear || startYear;
    return { start, end, target: Math.round((start + end) / 2) };
  }
  return { target: 2000 };
}

function sourceRecordTarget(row) {
  if (!/\/candy-collector\//i.test(row.source_url || "")) return null;
  const text = `${row.source_title || ""} ${row.source_url || ""}`;
  const decade = text.match(/\b(19|20)(\d)0s\b/i);
  if (decade) {
    const start = Number(`${decade[1]}${decade[2]}0`);
    return { start, end: start + 9, target: start, source_record: true };
  }
  const year = yearFromText(text);
  if (!Number.isFinite(year)) return null;
  return { start: year, end: year, target: year, source_record: true };
}

function vintageDistance(row, image) {
  const year = Number(image.year);
  if (!Number.isFinite(year)) return Number.POSITIVE_INFINITY;
  const target = vintageTarget(row);
  if (target.earliest) return year;
  if (Number.isFinite(target.start) && Number.isFinite(target.end)) {
    if (year >= target.start && year <= target.end) return 0;
    return Math.min(Math.abs(year - target.start), Math.abs(year - target.end));
  }
  return Math.abs(year - target.target);
}

function vintageScore(row, image) {
  const year = Number(image.year);
  if (!Number.isFinite(year)) return 0;
  const target = vintageTarget(row);
  if (target.earliest) return 10000 - year;
  if (Number.isFinite(target.start) && Number.isFinite(target.end) && year >= target.start && year <= target.end) {
    return 8000 - Math.abs(year - target.target) * 18;
  }
  return 3500 - vintageDistance(row, image) * 14;
}

function imageMatchStatus(row, image) {
  const year = Number(image.year);
  if (!Number.isFinite(year)) return "source_image_date_unknown";
  const target = vintageTarget(row);
  if (target.earliest) return "earliest_available_source_image";
  if (Number.isFinite(target.start) && Number.isFinite(target.end)) {
    if (year >= target.start && year <= target.end) {
      return target.source_record ? "source_record_date_matched" : "vintage_matched";
    }
    return year < target.start ? "nearest_available_before_range" : "nearest_available_after_range";
  }
  return "nearest_available_source_image";
}

function bestVintageCandidates(row, images) {
  const withYear = images.filter((image) => Number.isFinite(Number(image.year)));
  if (!withYear.length) return images;
  const target = vintageTarget(row);
  if (target.earliest) {
    const earliestYear = Math.min(...withYear.map((image) => Number(image.year)));
    return withYear.filter((image) => Number(image.year) === earliestYear);
  }
  if (Number.isFinite(target.start) && Number.isFinite(target.end)) {
    const inRange = withYear.filter((image) => Number(image.year) >= target.start && Number(image.year) <= target.end);
    if (inRange.length) return inRange;
    const nearestDistance = Math.min(...withYear.map((image) => vintageDistance(row, image)));
    return withYear.filter((image) => vintageDistance(row, image) === nearestDistance);
  }
  return withYear;
}

function rowImageScore(row, image, usedImageUrls = new Set()) {
  const ingredientSignalCount = image.ingredientSignalLines?.length || 0;
  const panelContextCount = image.panelContextLines?.length || 0;
  const duplicatePenalty = usedImageUrls.has(image.url) ? 120 : 0;
  return ingredientSignalCount * 240
    + panelContextCount * 70
    + vintageScore(row, image)
    + imageUrlScore(image.url)
    + (image.title ? 90 : -140)
    + (image.bytes || 0) / 12000
    - (image.source_order || 0) * 2
    - duplicatePenalty;
}

function pickImageForRow(row, images, usedImageUrls) {
  if (!images.length) return null;
  return bestVintageCandidates(row, images)
    .sort((a, b) => rowImageScore(row, b, usedImageUrls) - rowImageScore(row, a, usedImageUrls)
      || (a.source_order || 0) - (b.source_order || 0)
      || String(a.url).localeCompare(String(b.url)))[0];
}

function vintageSortValue(value) {
  const label = String(value || "");
  if (label === "earliest_verified_label") return 0;
  if (label === "1980s_or_earlier") return 1980;
  const year = yearFromText(label);
  if (year) return year;
  return 9999;
}

function rowsByProduct(publicRows) {
  const products = new Map();
  for (const row of publicRows) {
    if (!products.has(row.product_id)) {
      products.set(row.product_id, {
        product_id: row.product_id,
        product_name: row.product_name,
        brand: row.brand,
        category: row.category,
        source_family: sourceFamilyId,
        evidence_count: 0,
        local_preview_available_count: 0,
        ingredient_signal_count: 0,
        vintages: [],
        rows: [],
      });
    }
    const product = products.get(row.product_id);
    product.evidence_count += 1;
    if (row.local_preview_available) product.local_preview_available_count += 1;
    if (row.ingredient_signal_status === "ingredient_signal_found") product.ingredient_signal_count += 1;
    product.vintages.push(row.vintage_label);
    product.rows.push(row);
  }
  return [...products.values()].map((product) => ({
    ...product,
    vintages: [...new Set(product.vintages)].sort(),
    rows: product.rows.sort((a, b) => vintageSortValue(a.vintage_label) - vintageSortValue(b.vintage_label) || a.evidence_id.localeCompare(b.evidence_id)),
  })).sort((a, b) => b.evidence_count - a.evidence_count || a.product_name.localeCompare(b.product_name));
}

function sourceSummaryForRows(rows, sourceCaptures) {
  return sourceUrls(rows).map((url) => {
    const capture = sourceCaptures.get(url) || {};
    return {
      source_url: url,
      status: capture.status || "source_not_fetched",
      candidate_image_count: capture.candidates?.length || 0,
      downloaded_image_count: capture.downloads?.length || 0,
      error: capture.public_error || "",
    };
  });
}

function updateNavigatorTimeline(visualIndex) {
  const data = JSON.parse(fs.readFileSync(navigatorPath, "utf8"));
  data.source_family_summary = data.source_family_summary || {
    schema_version: 1,
    generated_at_utc: visualIndex.generated_at_utc,
    private_scratch_policy: "Use the configured private scratch root for captures, crops, OCR text, model packets, and review manifests. Public files remain link/status only.",
    families: [],
  };
  data.source_family_summary.families = data.source_family_summary.families || [];
  let summaryFamily = data.source_family_summary.families.find((family) => family.id === sourceFamilyId);
  if (!summaryFamily) {
    summaryFamily = {
      id: sourceFamilyId,
      label: "Candy Wrapper Archive",
      strategy: "visual_lineage_first",
      public_image_policy: visualIndex.public_image_policy,
      claim_policy: visualIndex.claim_policy,
      products: [],
    };
    data.source_family_summary.families.push(summaryFamily);
  }
  if (summaryFamily) {
    summaryFamily.product_count = visualIndex.totals.products;
    summaryFamily.evidence_row_count = visualIndex.totals.rows;
    summaryFamily.products = visualIndex.products.map((product) => {
      const readablePanelNeeded = product.evidence_count - product.ingredient_signal_count;
      const current = (summaryFamily.products || []).find((row) => row.product_id === product.product_id) || {};
      return {
        ...current,
        product_id: product.product_id,
        product_name: product.product_name,
        brand: product.brand,
        category: product.category,
        evidence_count: product.evidence_count,
        vintages: product.vintages,
        source_urls: [...new Set(product.rows.map((row) => row.source_url).filter(Boolean))],
        ingredient_panel_visible_count: product.ingredient_signal_count,
        local_image_ready_count: product.local_preview_available_count,
        readable_panel_photo_needed_count: readablePanelNeeded,
        next_action: readablePanelNeeded > 0
          ? "fill_remaining_readable_ingredient_panel_photos"
          : "review_manual_visual_read_candidate_ingredient_text",
        vintage_count: product.vintages.length,
      };
    });
  }
  const existingTimeline = data.source_family_timeline || {};
  const existingFamilies = existingTimeline.families || [];
  const familyTimeline = {
    id: sourceFamilyId,
    label: "Candy Wrapper Archive",
    row_count: visualIndex.totals.rows,
    product_count: visualIndex.totals.products,
    local_preview_available_count: visualIndex.totals.local_preview_available,
    ingredient_signal_count: visualIndex.totals.ingredient_signal_candidates,
    products: visualIndex.products,
  };
  const families = [
    familyTimeline,
    ...existingFamilies.filter((family) => family.id !== sourceFamilyId),
  ];
  data.source_family_timeline = {
    schema_version: visualIndex.schema_version,
    generated_at_utc: visualIndex.generated_at_utc,
    default_family: existingTimeline.default_family || sourceFamilyId,
    public_image_policy: "Public artifacts stay link/status/text-only. Localhost may render cached proof screenshots or crops through /api/private/ingredient-crops/:visual_id when a private cache exists.",
    claim_policy: "Ingredient text remains candidate evidence until manually reviewed against source labeling and package context.",
    families,
  };
  writeJson(navigatorPath, data);
}

function publicRowFor(row, visual, sourceCapture) {
  const hasIngredientSignal = Boolean(visual.ingredient_signal_lines?.length || visual.ingredient_text);
  const localPreviewAvailable = Boolean(visual.upscaled_preview_path || visual.preview_path);
  const ingredientItems = visual.ingredient_text ? ingredientItemsFromStatement(visual.ingredient_text) : [];
  const gapRequirements = gapSourceRequirements(row, hasIngredientSignal);
  const visualStatus = localPreviewAvailable
    ? hasIngredientSignal ? "local_ingredient_crop_ready" : visual.crop_focus === "panel_context" ? "local_panel_context_crop_ready" : "local_visual_lineage_ready"
    : "source_capture_needed";
  return {
    product_id: row.product_id,
    product_name: row.product_name,
    brand: row.brand,
    category: row.category,
    vintage_label: row.vintage_label,
    vintage_start: row.vintage_start,
    vintage_end: row.vintage_end,
    evidence_id: row.evidence_id,
    ocr_priority: row.ocr_priority,
    ocr_gap_category: row.ocr_gap_category,
    source_domain: row.source_domain,
    source_url: row.source_url,
    source_title: row.source_title,
    source_owner: row.source_owner,
    rights_note: row.rights_note,
    visual_id: visual.visual_id,
    preview_endpoint: privateSafePreviewEndpoint(visual.visual_id),
    visual_status: visualStatus,
    local_preview_available: localPreviewAvailable,
    local_upscaled_preview_available: Boolean(visual.upscaled_preview_path),
    preview_render_variant: visual.upscaled_preview_path ? "upscaled_crop" : localPreviewAvailable ? "base_crop" : "none",
    ocr_status: visual.ocr_status,
    crop_status: visual.crop_status,
    source_image_title: visual.source_image_title || "",
    source_image_year: visual.source_image_year || "",
    source_detail_url: visual.source_detail_url || "",
    source_image_match_status: visual.source_image_match_status || "",
    proof_visual_basis: hasIngredientSignal ? "archive_ingredient_label_crop" : "source_visual_lineage_only",
    crop_focus: visual.crop_focus || "",
    crop_rotation_degrees: visual.crop_rotation_degrees || 0,
    ingredient_text: visual.ingredient_text || "",
    ingredient_items: ingredientItems,
    ingredient_item_count: ingredientItems.length,
    ingredient_text_source: visual.ingredient_text_source || "",
    ingredient_text_status: visual.ingredient_text
      ? "manual_visual_read_candidate_needs_review"
      : hasIngredientSignal ? "ocr_text_candidate_needs_review" : "readable_panel_still_needed",
    candidate_excerpt: shortText(visual.ingredient_text || (visual.ingredient_signal_lines || []).slice(0, 2).join(" "), 220),
    candidate_status: hasIngredientSignal ? "ingredient_text_candidate_needs_review" : "readable_panel_still_needed",
    ingredient_signal_status: hasIngredientSignal ? "ingredient_signal_found" : "readable_panel_still_needed",
    gap_source_status: gapRequirements.status,
    gap_next_step: gapRequirements.next_step,
    gap_accepted_source_types: gapRequirements.accepted,
    gap_rejected_source_types: gapRequirements.rejected,
    source_capture_status: sourceCapture?.status || "source_not_fetched",
    source_candidate_image_count: sourceCapture?.candidates?.length || 0,
    claim_boundary: publicClaimBoundary(row, hasIngredientSignal),
  };
}

async function build() {
  const noFetch = hasFlag("no-fetch");
  const skipOcr = hasFlag("skip-ocr");
  const limitImages = Math.max(1, Number(argValue("limit-images", "36")) || 36);
  const runId = sanitizeId(argValue("run-id", new Date().toISOString().replace(/\.\d+Z$/, "Z"))) || "cwa_run";
  const runDir = path.resolve(argValue("result-dir", path.join(cwaRoot, runId)));
  const pageDir = path.join(runDir, "pages");
  const imageDir = path.join(runDir, "images");
  const cropDir = path.join(runDir, "crops");
  const upscaledCropDir = path.join(cropDir, "upscaled");
  const ocrDir = path.join(runDir, "ocr");
  const moduleCachePath = path.join(runDir, "swift-module-cache");
  [runDir, pageDir, imageDir, cropDir, upscaledCropDir, ocrDir, moduleCachePath].forEach(ensureDir);

  const rows = readQueueRows();
  const sourceCaptures = new Map();
  const cachedSourceCaptures = noFetch ? cachedSourceCapturesByUrl() : new Map();

  for (const url of sourceUrls(rows)) {
    const cachedCapture = cachedSourceCaptures.get(url);
    if (noFetch && cachedCapture) {
      sourceCaptures.set(url, cachedCapture);
      continue;
    }
    const pageHash = sha(url, 14);
    const pagePath = path.join(pageDir, `${pageHash}.html`);
    const capture = {
      source_url: url,
      status: noFetch ? "fetch_skipped" : "source_not_fetched",
      page_path: "",
      candidates: [],
      downloads: [],
      public_error: "",
    };
    if (!noFetch) {
      try {
        const html = await fetchPage(url, pagePath);
        capture.status = "source_page_cached";
        capture.page_path = pagePath;
        capture.candidates = extractImageCandidates(html, url).slice(0, limitImages);
        for (const candidate of capture.candidates) {
          let downloaded = null;
          const errors = [];
          for (const candidateUrl of candidate.image_urls || [candidate.url]) {
            try {
              const imageHash = sha(candidateUrl, 16);
              downloaded = await downloadImage(candidateUrl, path.join(imageDir, imageHash));
              break;
            } catch (error) {
              errors.push(`${candidateUrl}: ${shortText(error.message, 120)}`);
            }
          }
          if (downloaded) {
            capture.downloads.push({
              ...downloaded,
              title: candidate.title || "",
              detail_url: candidate.detail_url || "",
              year: candidate.year || "",
              source_order: candidate.source_order,
              fallback_url: candidate.fallback_url || "",
            });
          } else {
            capture.downloads.push({
              url: candidate.url,
              file_path: "",
              content_type: "",
              bytes: 0,
              title: candidate.title || "",
              detail_url: candidate.detail_url || "",
              year: candidate.year || "",
              source_order: candidate.source_order,
              error: errors.join("; ") || "image download failed",
            });
          }
        }
      } catch (error) {
        capture.status = "source_fetch_failed";
        capture.public_error = shortText(error.message, 220);
      }
    }
    sourceCaptures.set(url, capture);
  }

  const ocrResults = new Map();
  const analyzedImages = new Map();
  const privateVisuals = [];
  const publicRows = [];

  function analyzeImage(image) {
    if (analyzedImages.has(image.file_path)) return analyzedImages.get(image.file_path);
    let ocr = ocrResults.get(image.file_path);
    if (!ocr) {
      ocr = skipOcr
        ? { status: "ocr_skipped", error: "", output: null }
        : runVisionOcr(image.file_path, moduleCachePath);
      ocrResults.set(image.file_path, ocr);
      const ocrPath = path.join(ocrDir, `${sha(image.file_path, 16)}.json`);
      writeJson(ocrPath, {
        image_url: image.url,
        image_path: image.file_path,
        title: image.title || "",
        detail_url: image.detail_url || "",
        year: image.year || "",
        status: ocr.status,
        error: ocr.error,
        output: ocr.output,
      });
      ocr.ocr_path = ocrPath;
    }
    const lines = ocr.output?.lines || [];
    const analyzed = {
      ...image,
      ocr,
      lines,
      ingredientSignalLines: lines.filter(lineMatchesIngredientSignal),
      panelContextLines: lines.filter(lineMatchesPanelContext),
    };
    analyzedImages.set(image.file_path, analyzed);
    return analyzed;
  }

  const usedBySource = new Map();

  for (const row of rows) {
    const visualId = visualIdFor(row);
    const sourceCapture = sourceCaptures.get(row.source_url);
    const downloadedImages = (sourceCapture?.downloads || []).filter((download) => download.file_path && fs.existsSync(download.file_path));
    const visual = {
      visual_id: visualId,
      product_id: row.product_id,
      evidence_id: row.evidence_id,
      source_url: row.source_url,
      source_image_url: "",
      source_image_path: "",
      source_image_title: "",
      source_image_year: "",
      source_detail_url: "",
      source_image_match_status: "",
      preview_path: "",
      upscaled_preview_path: "",
      upscaled_crop_status: "not_run",
      crop_output_pixels: null,
      upscaled_output_pixels: null,
      ocr_path: "",
      ocr_status: downloadedImages.length ? "ocr_not_run" : "no_local_image",
      crop_status: downloadedImages.length ? "crop_not_run" : "no_local_image",
      crop_focus: "",
      crop_rotation_degrees: 0,
      ingredient_text: "",
      ingredient_text_source: "",
      ingredient_signal_lines: [],
      panel_context_lines: [],
      errors: [],
    };

    const sourceUsed = usedBySource.get(row.source_url) || new Set();
    const best = pickImageForRow(row, downloadedImages.map(analyzeImage), sourceUsed);

    if (best) {
      sourceUsed.add(best.url);
      usedBySource.set(row.source_url, sourceUsed);
      visual.source_image_url = best.url;
      visual.source_image_path = best.file_path;
      visual.source_image_title = best.title || "";
      visual.source_image_year = best.year || "";
      visual.source_detail_url = best.detail_url || "";
      visual.source_image_match_status = imageMatchStatus(row, best);
      visual.ocr_path = best.ocr.ocr_path || "";
      visual.ocr_status = best.ocr.status;
      visual.ingredient_signal_lines = best.ingredientSignalLines.map((line) => line.text);
      visual.panel_context_lines = best.panelContextLines.map((line) => line.text);
      if (best.ocr.error) visual.errors.push(best.ocr.error);
      const curatedReview = curatedIngredientReviews[row.evidence_id];
      if (curatedReview) {
        visual.crop_focus = "ingredient_text";
        visual.crop_rotation_degrees = curatedReview.crop_rotation_degrees || 0;
        visual.ingredient_text = curatedReview.ingredient_text || "";
        visual.ingredient_text_source = curatedReview.source || "manual_visual_read_candidate";
        visual.ingredient_signal_lines = visual.ingredient_text ? [visual.ingredient_text] : visual.ingredient_signal_lines;
      }
      const focus = curatedReview
        ? { box: curatedReview.crop_box, focus: "ingredient_text" }
        : focusedRegion(best.lines);
      visual.crop_focus = focus.focus;
      const box = focus.box || wholeImageBox();
      const cropPath = path.join(cropDir, `${visualId}.png`);
      const cropPadding = focus.focus === "ingredient_text" ? 0.07 : focus.focus === "panel_context" ? 0.06 : 0;
      const cropMinOutputWidth = focus.focus === "ingredient_text" ? 1800 : focus.focus === "panel_context" ? 1500 : 1000;
      const crop = runCrop(
        best.file_path,
        cropPath,
        box,
        moduleCachePath,
        cropPadding,
        cropMinOutputWidth,
        visual.crop_rotation_degrees || 0,
      );
      visual.crop_status = focus.focus === "ingredient_text"
        ? "ingredient_crop_ready"
        : focus.focus === "panel_context"
          ? "panel_context_crop_ready"
          : "visual_lineage_preview_ready";
      if (crop.status === "crop_ready" && fs.existsSync(cropPath)) {
        visual.preview_path = cropPath;
        visual.crop_output_pixels = crop.output?.output_pixels || null;
        const upscaledPath = path.join(upscaledCropDir, `${visualId}.png`);
        const upscaled = runCrop(
          best.file_path,
          upscaledPath,
          box,
          moduleCachePath,
          cropPadding,
          upscaledMinOutputWidth(focus.focus),
          visual.crop_rotation_degrees || 0,
        );
        visual.upscaled_crop_status = upscaled.status === "crop_ready" ? "upscaled_crop_ready" : upscaled.status;
        if (upscaled.status === "crop_ready" && fs.existsSync(upscaledPath)) {
          visual.upscaled_preview_path = upscaledPath;
          visual.upscaled_output_pixels = upscaled.output?.output_pixels || null;
        } else {
          visual.errors.push(upscaled.error || "upscaled crop failed");
        }
      } else {
        visual.crop_status = crop.status;
        visual.errors.push(crop.error || "crop failed");
      }
    }

    privateVisuals.push(visual);
    publicRows.push(publicRowFor(row, visual, sourceCapture));
  }

  const privateManifest = {
    schema_version: 1,
    generated_at_utc: generatedAt,
    run_id: runId,
    run_dir: runDir,
    source_family: sourceFamilyId,
    rows: privateVisuals,
    source_captures: [...sourceCaptures.values()],
  };
  writeJson(path.join(runDir, "private-manifest.json"), privateManifest);
  writeJson(latestPrivateManifestPath, privateManifest);
  writeCsv(path.join(runDir, "image-map.csv"), [
    "product_id",
    "evidence_id",
    "visual_id",
    "source_url",
    "source_image_path",
    "preview_path",
    "upscaled_preview_path",
    "ocr_status",
    "crop_status",
    "upscaled_crop_status",
  ], privateVisuals);
  writeJson(path.join(runDir, "ingredient-ocr-image-map.json"), Object.fromEntries(
    privateVisuals
      .filter((visual) => visual.source_image_path)
      .flatMap((visual) => [
        [visual.evidence_id, visual.source_image_path],
        [`${visual.product_id}:${visual.evidence_id}`, visual.source_image_path],
        [visual.source_url, visual.source_image_path],
      ]),
  ));

  const products = rowsByProduct(publicRows);
  const visualIndex = {
    schema_version: 1,
    generated_at_utc: generatedAt,
    source_family: {
      id: sourceFamilyId,
      label: "Candy Wrapper Archive",
      source_domain: "www.candywrapperarchive.com",
    },
    public_image_policy: "Public artifacts stay link/status-only. Localhost may render cached crops through /api/private/ingredient-crops/:visual_id when a private cache exists.",
    claim_policy: "Wrapper lineage can support visual provenance only. OCR output remains candidate evidence until corrected and manually verified.",
    totals: {
      products: products.length,
      rows: publicRows.length,
      unique_source_urls: sourceUrls(rows).length,
      local_preview_available: publicRows.filter((row) => row.local_preview_available).length,
      ingredient_signal_candidates: publicRows.filter((row) => row.ingredient_signal_status === "ingredient_signal_found").length,
      readable_panel_still_needed: publicRows.filter((row) => row.ingredient_signal_status !== "ingredient_signal_found").length,
      ocr_extracted: publicRows.filter((row) => row.ocr_status === "ocr_extracted").length,
      source_fetch_failed: [...sourceCaptures.values()].filter((row) => row.status === "source_fetch_failed").length,
    },
    sources: sourceSummaryForRows(rows, sourceCaptures),
    products,
    rows: publicRows,
  };

  writeJson(visualIndexPath, visualIndex);
  updateNavigatorTimeline(visualIndex);

  console.log(JSON.stringify({
    run_id: runId,
    source_rows: rows.length,
    unique_source_urls: sourceUrls(rows).length,
    local_preview_available: visualIndex.totals.local_preview_available,
    ingredient_signal_candidates: visualIndex.totals.ingredient_signal_candidates,
    visual_index: visualIndexPath,
    private_manifest: latestPrivateManifestPath,
  }, null, 2));
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
