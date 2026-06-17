const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const fullQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv");
const visualIndexPath = path.join(root, "docs/data/product-evidence/flickr_ingredient_visual_index.json");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const swiftCropPath = path.join(root, "scripts/crop-ocr-region.swift");
const flickrRoot = path.join(root, ".cache/ingredient-ocr/flickr");
const probeImageDir = path.join(flickrRoot, "probe/images");
const latestPrivateManifestPath = path.join(flickrRoot, "latest-private-manifest.json");
const sourceFamilyId = "flickr-package-archive";
const generatedAt = new Date().toISOString();

const curatedRows = {
  "cheerios_original__earliest_verified_label__368__1": {
    source_image_url: "https://live.staticflickr.com/3540/3523833856_0411e7b0c3_c.jpg",
    probe_file: "cheerios_b.jpg",
    source_image_title: "1985 General Mills Cheerios Cereal Box Back",
    source_image_year: 1985,
    source_detail_url: "https://www.flickr.com/photos/25692985@N07/3523833856",
    source_image_match_status: "source_record_date_matched",
    crop_box: { x: 0.034, y: 0.58, width: 0.262, height: 0.14 },
    crop_padding: 0.03,
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: whole grain oats, corn starch, sugar, salt, trisodium phosphate, calcium carbonate, wheat starch, vitamin E (mixed tocopherols) added to preserve freshness.",
  },
  "trix_cereal__earliest_verified_label__208__1": {
    source_image_url: "https://live.staticflickr.com/2286/2037147592_c157404936_b.jpg",
    probe_file: "trix_1978_b.jpg",
    source_image_title: "General Mills Trix Cereal Box with Back Panel, 1978",
    source_image_year: 1978,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/2037147592/",
    source_image_match_status: "source_record_date_matched",
    crop_box: { x: 0.49, y: 0.855, width: 0.285, height: 0.105 },
    crop_padding: 0.02,
    crop_rotation_degrees: 180,
    crop_focus: "visual_lineage",
    candidate_excerpt: "Visible promotion/top-flap panel only; readable ingredient panel still needed before ingredient claims.",
  },
  "trix_cereal__1980s_or_earlier__437__2": {
    source_image_url: "https://live.staticflickr.com/2083/2306104603_47cbace89a_b.jpg",
    probe_file: "trix_1987_b.jpg",
    source_image_title: "Trix Cereal Mr Men Little Miss stickers cereal box back, 1987",
    source_image_year: 1987,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/2306104603",
    source_image_match_status: "vintage_matched",
    crop_box: { x: 0.515, y: 0.865, width: 0.27, height: 0.10 },
    crop_padding: 0.02,
    crop_rotation_degrees: 180,
    crop_focus: "visual_lineage",
    candidate_excerpt: "Visible promotion/top-flap panel only; readable ingredient panel still needed before ingredient claims.",
  },
  "cocoa_puffs__2000s__423__2": {
    source_image_url: "https://live.staticflickr.com/2681/4053543678_af4e827c08_b.jpg",
    probe_file: "cocoa_puffs_2009_b.jpg",
    source_image_title: "General Mills Cocoa Puffs Box, 2009 Safeway Retro Cereal Boxes",
    source_image_year: 2009,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/4053543678/",
    source_image_match_status: "source_record_date_matched",
    crop_box: { x: 0.505, y: 0.10, width: 0.118, height: 0.79 },
    crop_padding: 0.02,
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: whole grain corn, sugar, corn syrup, modified corn starch, cocoa processed with alkali, canola and/or rice bran oil, color added, salt, fructose, tricalcium phosphate, corn starch, natural and artificial flavor, trisodium phosphate, wheat flour, BHT added to preserve freshness. Vitamins and minerals: calcium carbonate, zinc and iron (mineral nutrients), vitamin C (sodium ascorbate), a B vitamin (niacinamide), vitamin B6 (pyridoxine hydrochloride), vitamin B2 (riboflavin), vitamin B1 (thiamin mononitrate), vitamin A (palmitate), a B vitamin (folic acid), vitamin B12, vitamin D. Contains wheat ingredients.",
  },
  "doritos_nacho_cheese__earliest_verified_label__247__1": {
    source_image_url: "https://live.staticflickr.com/3542/3496903865_411f36c0fb_b.jpg",
    probe_file: "doritos_1970s_b.jpg",
    source_image_title: "Frito-Lay Doritos Nacho Cheese Flavor 1-ounce bag, 1970s",
    source_image_year: 1972,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/3496903865/",
    source_image_match_status: "earliest_available_source_image",
    crop_box: { x: 0.055, y: 0.10, width: 0.19, height: 0.20 },
    crop_padding: 0.025,
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: corn, vegetable oil with BHA and BHT as preservatives, processed Romano, Cheddar and Parmesan cheese, salt, flour, whey, tomato, buttermilk, onion and garlic powders, monosodium glutamate, disodium inosinate and guanylate, sugar, spices, flavorings, and artificial color.",
  },
  "doritos_nacho_cheese__1980s_or_earlier__247__1": {
    source_image_url: "https://live.staticflickr.com/3542/3496903865_411f36c0fb_b.jpg",
    probe_file: "doritos_1970s_b.jpg",
    source_image_title: "Frito-Lay Doritos Nacho Cheese Flavor 1-ounce bag, 1970s",
    source_image_year: 1972,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/3496903865/",
    source_image_match_status: "vintage_matched",
    crop_box: { x: 0.055, y: 0.10, width: 0.19, height: 0.20 },
    crop_padding: 0.025,
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: corn, vegetable oil with BHA and BHT as preservatives, processed Romano, Cheddar and Parmesan cheese, salt, flour, whey, tomato, buttermilk, onion and garlic powders, monosodium glutamate, disodium inosinate and guanylate, sugar, spices, flavorings, and artificial color.",
  },
  "coca_cola_classic__earliest_verified_label__725__1": {
    source_image_url: "https://live.staticflickr.com/8232/29453244726_e68bd34128_o.jpg",
    probe_file: "coca_cola_o.jpg",
    source_image_title: "1960s Coca-Cola syrup label",
    source_image_year: 1960,
    source_detail_url: "https://www.flickr.com/photos/studioz7/29453244726",
    source_image_match_status: "source_record_date_matched",
    crop_box: { x: 0.735, y: 0.49, width: 0.235, height: 0.245 },
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "A beverage syrup: Prepared with sugar and water; phosphoric acid, caffeine, extractives from coca leaves (cocaine removed) and cola nuts, and other flavoring material; colored with caramel.",
  },
  "coca_cola_classic__1980s_or_earlier__725__1": {
    source_image_url: "https://live.staticflickr.com/8232/29453244726_e68bd34128_o.jpg",
    probe_file: "coca_cola_o.jpg",
    source_image_title: "1960s Coca-Cola syrup label",
    source_image_year: 1960,
    source_detail_url: "https://www.flickr.com/photos/studioz7/29453244726",
    source_image_match_status: "nearest_available_before_range",
    crop_box: { x: 0.735, y: 0.49, width: 0.235, height: 0.245 },
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "A beverage syrup: Prepared with sugar and water; phosphoric acid, caffeine, extractives from coca leaves (cocaine removed) and cola nuts, and other flavoring material; colored with caramel.",
  },
  "froot_loops__earliest_verified_label__435__4": {
    source_image_url: "https://live.staticflickr.com/8001/7323343912_6973f45c7c_o.jpg",
    probe_file: "froot_loops_1982_o.jpg",
    source_image_title: "1982 Froot Loops 3D Nose box back",
    source_image_year: 1982,
    source_detail_url: "https://www.flickr.com/photos/bolio88/7323343912/",
    source_image_match_status: "earliest_available_source_image",
    crop_box: { x: 0.518, y: 0.28, width: 0.125, height: 0.18 },
    crop_padding: 0.02,
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: sugar; corn, wheat and oat flour; partially hydrogenated vegetable oil (one or more of: cottonseed, coconut, soybean and palm); salt; artificial coloring; sodium ascorbate (vitamin C); ascorbic acid (vitamin C); zinc oxide; reduced iron; natural orange, lemon, cherry with other natural flavorings; vitamin A palmitate; pyridoxine hydrochloride (B6); riboflavin (B2); thiamin hydrochloride (B1); folic acid; vitamin D3; BHT added to maintain product freshness.",
  },
  "froot_loops__1980s_or_earlier__435__2": {
    source_image_url: "https://live.staticflickr.com/8001/7323343912_6973f45c7c_o.jpg",
    probe_file: "froot_loops_1982_o.jpg",
    source_image_title: "1982 Froot Loops 3D Nose box back",
    source_image_year: 1982,
    source_detail_url: "https://www.flickr.com/photos/bolio88/7323343912/",
    source_image_match_status: "vintage_matched",
    crop_box: { x: 0.518, y: 0.28, width: 0.125, height: 0.18 },
    crop_padding: 0.02,
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: sugar; corn, wheat and oat flour; partially hydrogenated vegetable oil (one or more of: cottonseed, coconut, soybean and palm); salt; artificial coloring; sodium ascorbate (vitamin C); ascorbic acid (vitamin C); zinc oxide; reduced iron; natural orange, lemon, cherry with other natural flavorings; vitamin A palmitate; pyridoxine hydrochloride (B6); riboflavin (B2); thiamin hydrochloride (B1); folic acid; vitamin D3; BHT added to maintain product freshness.",
  },
  "tang_orange__earliest_verified_label__580__1": {
    source_image_url: "https://live.staticflickr.com/3162/2629548371_c6cddddb34_b.jpg",
    probe_file: "tang_b.jpg",
    source_image_title: "General Foods Tang label file copy, December 1971",
    source_image_year: 1971,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/2629548371",
    source_image_match_status: "source_record_date_matched",
    crop_box: { x: 0.075, y: 0.66, width: 0.13, height: 0.31 },
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: sugar, citric acid (for tartness), natural flavor, gum arabic (vegetable gum - provides body), monosodium phosphate and potassium citrate (regulate tartness), calcium phosphate (prevents caking), vitamin C, cellulose gum (vegetable gum), hydrogenated coconut oil, artificial flavor, artificial color, vitamin A, BHA (a preservative).",
  },
  "tang_orange__1980s_or_earlier__580__1": {
    source_image_url: "https://live.staticflickr.com/3162/2629548371_c6cddddb34_b.jpg",
    probe_file: "tang_b.jpg",
    source_image_title: "General Foods Tang label file copy, December 1971",
    source_image_year: 1971,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/2629548371",
    source_image_match_status: "vintage_matched",
    crop_box: { x: 0.075, y: 0.66, width: 0.13, height: 0.31 },
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: sugar, citric acid (for tartness), natural flavor, gum arabic (vegetable gum - provides body), monosodium phosphate and potassium citrate (regulate tartness), calcium phosphate (prevents caking), vitamin C, cellulose gum (vegetable gum), hydrogenated coconut oil, artificial flavor, artificial color, vitamin A, BHA (a preservative).",
  },
  "gatorade_lemon_lime__earliest_verified_label__191__1": {
    source_image_url: "https://live.staticflickr.com/1631/24471957900_51e4e6ee5f_b.jpg",
    probe_file: "gatorade_b.jpg",
    source_image_title: "Stokely Van Camp Gatorade Thirst Quencher 32 oz bottle label, 1960s",
    source_image_year: 1960,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/24471957900",
    source_image_match_status: "source_record_date_matched",
    crop_box: { x: 0.065, y: 0.15, width: 0.145, height: 0.83 },
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: water, glucose, citric acid, salt, .053% calcium cyclamate (non-nutritive), gum acacia, sodium bicarbonate, sodium orthophosphate, potassium orthophosphate, potassium chloride, natural and artificial flavor, .005% sodium saccharin (non-nutritive), artificial color.",
  },
  "dinty_moore_beef_stew__earliest_verified_label__1059__2": {
    source_image_url: "https://live.staticflickr.com/1577/24195451113_253d5e04f5_b.jpg",
    probe_file: "dinty_moore_b.jpg",
    source_image_title: "Hormel Dinty Moore beef stew 1 1/2 pound can label, 1968",
    source_image_year: 1968,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/24195451113/",
    source_image_match_status: "source_record_date_matched",
    crop_box: { x: 0.382, y: 0.40, width: 0.19, height: 0.24 },
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: beef broth, potatoes, beef, carrots, cooked beef, corn flour, beef fat, salt, tomato paste, sugar, caramel coloring, flavoring and monosodium glutamate.",
  },
  "dinty_moore_beef_stew__1980s_or_earlier__1059__2": {
    source_image_url: "https://live.staticflickr.com/1577/24195451113_253d5e04f5_b.jpg",
    probe_file: "dinty_moore_b.jpg",
    source_image_title: "Hormel Dinty Moore beef stew 1 1/2 pound can label, 1968",
    source_image_year: 1968,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/24195451113/",
    source_image_match_status: "vintage_matched",
    crop_box: { x: 0.382, y: 0.40, width: 0.19, height: 0.24 },
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: beef broth, potatoes, beef, carrots, cooked beef, corn flour, beef fat, salt, tomato paste, sugar, caramel coloring, flavoring and monosodium glutamate.",
  },
  "sprite_original__earliest_verified_label__417__1": {
    source_image_url: "https://live.staticflickr.com/1328/581987504_b7f6310bbf_b.jpg",
    probe_file: "sprite_b.jpg",
    source_image_title: "Sprite can unrolled flat, 1960s",
    source_image_year: 1960,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/581987504",
    source_image_match_status: "source_record_date_matched",
    crop_box: { x: 0.858, y: 0.43, width: 0.075, height: 0.45 },
    crop_rotation_degrees: 270,
    crop_focus: "ingredient_text",
    ingredient_text: "Label formula statement: 1/20 of 1% benzoate of soda as a preservative.",
  },
  "sprite_original__1980s_or_earlier__417__1": {
    source_image_url: "https://live.staticflickr.com/1328/581987504_b7f6310bbf_b.jpg",
    probe_file: "sprite_b.jpg",
    source_image_title: "Sprite can unrolled flat, 1960s",
    source_image_year: 1960,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/581987504",
    source_image_match_status: "vintage_matched",
    crop_box: { x: 0.858, y: 0.43, width: 0.075, height: 0.45 },
    crop_rotation_degrees: 270,
    crop_focus: "ingredient_text",
    ingredient_text: "Label formula statement: 1/20 of 1% benzoate of soda as a preservative.",
  },
  "7up_original__earliest_verified_label__273__1": {
    source_image_url: "https://live.staticflickr.com/1428/548698222_731c33587c_b.jpg",
    probe_file: "7up_b.jpg",
    source_image_title: "Unrolled Can Flat - 7UP, 1970s",
    source_image_year: 1970,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/548698222",
    source_image_match_status: "source_record_date_matched",
    crop_box: { x: 0.0, y: 0.08, width: 0.12, height: 0.89 },
    crop_rotation_degrees: 90,
    crop_focus: "ingredient_text",
    ingredient_text: "Seven-Up contains carbonated water, sugar, citric acid, sodium citrate, flavor derived from lemon and lime oils.",
  },
  "7up_original__1980s_or_earlier__273__1": {
    source_image_url: "https://live.staticflickr.com/1428/548698222_731c33587c_b.jpg",
    probe_file: "7up_b.jpg",
    source_image_title: "Unrolled Can Flat - 7UP, 1970s",
    source_image_year: 1970,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/548698222",
    source_image_match_status: "vintage_matched",
    crop_box: { x: 0.0, y: 0.08, width: 0.12, height: 0.89 },
    crop_rotation_degrees: 90,
    crop_focus: "ingredient_text",
    ingredient_text: "Seven-Up contains carbonated water, sugar, citric acid, sodium citrate, flavor derived from lemon and lime oils.",
  },
  "jello_strawberry_gelatin__earliest_verified_label__185__1": {
    source_image_url: "https://live.staticflickr.com/3174/2629782517_790454749e_b.jpg",
    probe_file: "jello_strawberry_b.jpg",
    source_image_title: "General Foods Jell-O Wild Strawberry Gelatin Dessert box file flat, August 1 1969",
    source_image_year: 1969,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/2629782517",
    source_image_match_status: "source_record_date_matched",
    crop_box: { x: 0.865, y: 0.16, width: 0.11, height: 0.29 },
    crop_rotation_degrees: 270,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: sugar, gelatin, adipic acid, sodium citrate, fumaric acid, artificial flavor, U.S. certified color.",
  },
  "jello_strawberry_gelatin__1980s_or_earlier__185__1": {
    source_image_url: "https://live.staticflickr.com/3174/2629782517_790454749e_b.jpg",
    probe_file: "jello_strawberry_b.jpg",
    source_image_title: "General Foods Jell-O Wild Strawberry Gelatin Dessert box file flat, August 1 1969",
    source_image_year: 1969,
    source_detail_url: "https://www.flickr.com/photos/jasonliebigstuff/2629782517",
    source_image_match_status: "vintage_matched",
    crop_box: { x: 0.865, y: 0.16, width: 0.11, height: 0.29 },
    crop_rotation_degrees: 270,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: sugar, gelatin, adipic acid, sodium citrate, fumaric acid, artificial flavor, U.S. certified color.",
  },
  "spam_classic__2010s__817__1": {
    source_image_url: "https://live.staticflickr.com/6153/6213763198_8a590da09a_o.jpg",
    probe_file: "spam_o.jpg",
    source_image_title: "SPAM can ingredients photo",
    source_image_year: 2010,
    source_detail_url: "https://www.flickr.com/photos/64712052@N00/6213763198/",
    source_image_match_status: "source_record_date_matched",
    crop_box: { x: 0.13, y: 0.24, width: 0.66, height: 0.48 },
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: pork with ham, salt, water, modified potato starch, sugar, sodium nitrite.",
  },
  "philadelphia_cream_cheese_original__2010s__211__1": {
    source_image_url: "https://live.staticflickr.com/2735/4282861742_5d6d5a9735_z.jpg",
    probe_file: "philadelphia_cream_cheese_z.jpg",
    source_image_title: "Philadelphia Cream Cheese Regular Package Label, 2010",
    source_image_year: 2010,
    source_detail_url: "https://www.flickr.com/photos/disneywizard/4282861742/in/photostream/",
    source_image_match_status: "source_record_date_matched",
    crop_box: { x: 0.09, y: 0.50, width: 0.84, height: 0.36 },
    crop_rotation_degrees: 0,
    crop_focus: "ingredient_text",
    ingredient_text: "Ingredients: pasteurized nonfat milk and milkfat, whey protein concentrate, cheese culture, salt, whey, stabilizers (xanthan and/or carob bean and/or guar gums), sorbic acid as a preservative, vitamin A palmitate. Contains: milk.",
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

function writeCsv(filePath, headers, rows) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${[
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n")}\n`);
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
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

function shortText(value, limit = 220) {
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

function readQueueRows() {
  const wanted = new Set(Object.keys(curatedRows));
  return parseCsv(fs.readFileSync(fullQueueCsvPath, "utf8"))
    .filter((row) => wanted.has(row.evidence_id));
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

async function localImageForReview(review, imageDir, noFetch) {
  const ext = extensionFor(review.source_image_url);
  const targetPath = path.join(imageDir, `${sha(review.source_image_url, 16)}.${ext}`);
  if (fs.existsSync(targetPath)) return { file_path: targetPath, status: "cached" };
  const probePath = path.join(probeImageDir, review.probe_file || "");
  if (review.probe_file && fs.existsSync(probePath)) {
    fs.copyFileSync(probePath, targetPath);
    return { file_path: targetPath, status: "copied_from_probe" };
  }
  if (noFetch) return { file_path: "", status: "missing_local_cache" };
  const response = await fetchWithTimeout(review.source_image_url, { headers: { Accept: "image/*,*/*" } });
  if (!response.ok) return { file_path: "", status: `download_failed_${response.status}` };
  const contentType = response.headers.get("content-type") || "";
  const downloadPath = path.join(imageDir, `${sha(review.source_image_url, 16)}.${extensionFor(review.source_image_url, contentType)}`);
  fs.writeFileSync(downloadPath, Buffer.from(await response.arrayBuffer()));
  return { file_path: downloadPath, status: "downloaded" };
}

function runCrop(imagePath, cropPath, box, moduleCachePath, padding = 0.05, minOutputWidth = 1800) {
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

function upscaledMinOutputWidth(focus = "ingredient_text") {
  if (focus === "ingredient_text") return 3200;
  if (focus === "panel_context") return 2600;
  return 2200;
}

function privateSafePreviewEndpoint(visualId) {
  return `/api/private/ingredient-crops/${visualId}`;
}

function publicClaimBoundary() {
  return "Manual visual transcription is a candidate only; do not publish an ingredient-change claim until corrected and manually verified.";
}

function panelClaimBoundary() {
  return "Visible package-panel imagery can support provenance only; a full corrected transcription is still needed before ingredient claims.";
}

function publicRowFor(row, review, visual) {
  const localPreviewAvailable = Boolean(visual.upscaled_preview_path || visual.preview_path);
  const hasIngredientText = Boolean(review.ingredient_text);
  const cropFocus = review.crop_focus || (hasIngredientText ? "ingredient_text" : "panel_context");
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
    visual_status: localPreviewAvailable
      ? hasIngredientText ? "local_ingredient_crop_ready" : cropFocus === "panel_context" ? "local_panel_context_crop_ready" : "local_visual_lineage_ready"
      : "source_capture_needed",
    local_preview_available: localPreviewAvailable,
    local_upscaled_preview_available: Boolean(visual.upscaled_preview_path),
    preview_render_variant: visual.upscaled_preview_path ? "upscaled_crop" : localPreviewAvailable ? "base_crop" : "none",
    ocr_status: "manual_visual_review",
    crop_status: visual.crop_status,
    source_image_title: review.source_image_title || "",
    source_image_year: review.source_image_year || "",
    source_detail_url: review.source_detail_url || row.source_url,
    source_image_match_status: review.source_image_match_status || "source_record_date_matched",
    crop_focus: cropFocus,
    crop_rotation_degrees: review.crop_rotation_degrees || 0,
    ingredient_text: review.ingredient_text || "",
    ingredient_text_source: hasIngredientText ? "manual_visual_read_candidate" : "",
    ingredient_text_status: hasIngredientText ? "manual_visual_read_candidate_needs_review" : "full_transcription_needed",
    candidate_excerpt: shortText(review.ingredient_text || review.candidate_excerpt || "", 220),
    candidate_status: hasIngredientText ? "ingredient_text_candidate_needs_review" : "full_transcription_needed",
    ingredient_signal_status: hasIngredientText ? "ingredient_signal_found" : "readable_panel_still_needed",
    source_capture_status: visual.source_capture_status,
    source_candidate_image_count: 1,
    claim_boundary: hasIngredientText ? publicClaimBoundary() : panelClaimBoundary(),
  };
}

function yearFromText(value) {
  const exact = String(value || "").match(/\b(19|20)\d{2}\b/);
  if (exact) return Number(exact[0]);
  const decade = String(value || "").match(/\b(19|20)(\d)0s\b/i);
  if (decade) return Number(`${decade[1]}${decade[2]}0`);
  return 9999;
}

function vintageSortValue(value) {
  const label = String(value || "");
  if (label === "earliest_verified_label") return 0;
  if (label === "1980s_or_earlier") return 1980;
  const year = yearFromText(label);
  return year || 9999;
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

function upsertFamily(families, family) {
  const existingIndex = families.findIndex((row) => row.id === family.id);
  if (existingIndex >= 0) families.splice(existingIndex, 1, family);
  else families.push(family);
  return families;
}

function updateNavigatorTimeline(visualIndex) {
  const data = JSON.parse(fs.readFileSync(navigatorPath, "utf8"));
  data.source_family_summary = data.source_family_summary || {
    schema_version: 1,
    generated_at_utc: visualIndex.generated_at_utc,
    private_scratch_policy: "Use the configured private scratch root for captures, crops, OCR text, model packets, and review manifests. Public files remain link/status only.",
    families: [],
  };
  data.source_family_summary.families = upsertFamily(data.source_family_summary.families || [], {
    id: sourceFamilyId,
    label: "Flickr Package Archive",
    strategy: "readable_label_crops_first",
    public_image_policy: visualIndex.public_image_policy,
    claim_policy: visualIndex.claim_policy,
    evidence_row_count: visualIndex.totals.rows,
    product_count: visualIndex.totals.products,
    top_domains: "www.flickr.com",
    gap_categories: "panel_capture_needed",
    products: visualIndex.products.map((product) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      brand: product.brand,
      category: product.category,
      evidence_count: product.evidence_count,
      vintages: product.vintages,
      source_urls: [...new Set(product.rows.map((row) => row.source_url).filter(Boolean))],
      ingredient_panel_visible_count: product.ingredient_signal_count,
      local_image_ready_count: product.local_preview_available_count,
      readable_panel_photo_needed_count: product.evidence_count - product.ingredient_signal_count,
      next_action: "review_manual_visual_read_candidate_ingredient_text",
      vintage_count: product.vintages.length,
    })),
  });

  const existingTimeline = data.source_family_timeline || {};
  data.source_family_timeline = {
    schema_version: visualIndex.schema_version,
    generated_at_utc: visualIndex.generated_at_utc,
    default_family: existingTimeline.default_family || "candy-wrapper-archive",
    public_image_policy: visualIndex.public_image_policy,
    claim_policy: visualIndex.claim_policy,
    families: upsertFamily(existingTimeline.families || [], {
      id: sourceFamilyId,
      label: "Flickr Package Archive",
      row_count: visualIndex.totals.rows,
      product_count: visualIndex.totals.products,
      local_preview_available_count: visualIndex.totals.local_preview_available,
      ingredient_signal_count: visualIndex.totals.ingredient_signal_candidates,
      products: visualIndex.products,
    }),
  };
  writeJson(navigatorPath, data);
}

async function build() {
  const noFetch = hasFlag("no-fetch");
  const runId = sanitizeId(argValue("run-id", "flickr_current")) || "flickr_current";
  const runDir = path.resolve(argValue("result-dir", path.join(flickrRoot, runId)));
  const imageDir = path.join(runDir, "images");
  const cropDir = path.join(runDir, "crops");
  const upscaledCropDir = path.join(cropDir, "upscaled");
  const moduleCachePath = path.join(runDir, "swift-module-cache");
  [runDir, imageDir, cropDir, upscaledCropDir, moduleCachePath].forEach(ensureDir);

  const rows = readQueueRows();
  const missingRows = Object.keys(curatedRows).filter((evidenceId) => !rows.some((row) => row.evidence_id === evidenceId));
  if (missingRows.length) {
    throw new Error(`Curated Flickr rows missing from queue: ${missingRows.join(", ")}`);
  }

  const privateVisuals = [];
  const publicRows = [];
  const sourceCaptures = new Map();

  for (const row of rows) {
    const review = curatedRows[row.evidence_id];
    const visualId = visualIdFor(row);
    const localImage = await localImageForReview(review, imageDir, noFetch);
    const visual = {
      visual_id: visualId,
      product_id: row.product_id,
      evidence_id: row.evidence_id,
      source_url: row.source_url,
      source_image_url: review.source_image_url,
      source_image_path: localImage.file_path || "",
      source_image_title: review.source_image_title || "",
      source_image_year: review.source_image_year || "",
      source_detail_url: review.source_detail_url || "",
      source_image_match_status: review.source_image_match_status || "",
      preview_path: "",
      upscaled_preview_path: "",
      upscaled_crop_status: "not_run",
      crop_output_pixels: null,
      upscaled_output_pixels: null,
      ocr_path: "",
      ocr_status: "manual_visual_review",
      crop_status: localImage.file_path ? "crop_not_run" : "no_local_image",
      crop_focus: review.crop_focus || "ingredient_text",
      crop_rotation_degrees: review.crop_rotation_degrees || 0,
      ingredient_text: review.ingredient_text || "",
      ingredient_text_source: "manual_visual_read_candidate",
      ingredient_signal_lines: review.ingredient_text ? [review.ingredient_text] : [],
      panel_context_lines: [],
      errors: [],
    };

    if (localImage.file_path) {
      const cropPath = path.join(cropDir, `${visualId}.png`);
      const crop = runCrop(localImage.file_path, cropPath, review.crop_box, moduleCachePath, review.crop_padding ?? 0.06, review.min_output_width || 1800);
      visual.crop_status = crop.status === "crop_ready"
        ? review.crop_focus === "panel_context" ? "panel_context_crop_ready" : "ingredient_crop_ready"
        : crop.status;
      if (crop.status === "crop_ready" && fs.existsSync(cropPath)) {
        visual.preview_path = cropPath;
        visual.crop_output_pixels = crop.output?.output_pixels || null;
        const upscaledPath = path.join(upscaledCropDir, `${visualId}.png`);
        const upscaled = runCrop(
          localImage.file_path,
          upscaledPath,
          review.crop_box,
          moduleCachePath,
          review.crop_padding ?? 0.06,
          review.upscaled_min_output_width || upscaledMinOutputWidth(review.crop_focus),
        );
        visual.upscaled_crop_status = upscaled.status === "crop_ready" ? "upscaled_crop_ready" : upscaled.status;
        if (upscaled.status === "crop_ready" && fs.existsSync(upscaledPath)) {
          visual.upscaled_preview_path = upscaledPath;
          visual.upscaled_output_pixels = upscaled.output?.output_pixels || null;
        } else {
          visual.errors.push(upscaled.error || "upscaled crop failed");
        }
      } else {
        visual.errors.push(crop.error || "crop failed");
      }
    } else {
      visual.errors.push(localImage.status);
    }

    if (!sourceCaptures.has(row.source_url)) {
      sourceCaptures.set(row.source_url, {
        source_url: row.source_url,
        status: localImage.file_path ? localImage.status : "source_capture_needed",
        candidates: [{ url: review.source_image_url, title: review.source_image_title || "", year: review.source_image_year || "" }],
        downloads: localImage.file_path ? [{ url: review.source_image_url, file_path: localImage.file_path, title: review.source_image_title || "" }] : [],
        public_error: localImage.file_path ? "" : localImage.status,
      });
    }

    privateVisuals.push(visual);
    publicRows.push(publicRowFor(row, review, {
      visual_id: visualId,
      preview_path: visual.preview_path,
      upscaled_preview_path: visual.upscaled_preview_path,
      crop_status: visual.crop_status,
      source_capture_status: localImage.status,
    }));
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

  const products = rowsByProduct(publicRows);
  const visualIndex = {
    schema_version: 1,
    generated_at_utc: generatedAt,
    source_family: {
      id: sourceFamilyId,
      label: "Flickr Package Archive",
      source_domain: "www.flickr.com",
    },
    public_image_policy: "Public artifacts stay link/status/text-only. Localhost may render cached crops through /api/private/ingredient-crops/:visual_id when a private cache exists.",
    claim_policy: "Manual visual transcription remains candidate evidence until corrected and manually verified.",
    totals: {
      products: products.length,
      rows: publicRows.length,
      unique_source_urls: new Set(publicRows.map((row) => row.source_url)).size,
      local_preview_available: publicRows.filter((row) => row.local_preview_available).length,
      ingredient_signal_candidates: publicRows.filter((row) => row.ingredient_signal_status === "ingredient_signal_found").length,
      readable_panel_still_needed: publicRows.filter((row) => row.ingredient_signal_status !== "ingredient_signal_found").length,
      ocr_extracted: 0,
      source_fetch_failed: [...sourceCaptures.values()].filter((row) => /failed/.test(row.status)).length,
    },
    sources: [...sourceCaptures.values()].map((capture) => ({
      source_url: capture.source_url,
      status: capture.status,
      candidate_image_count: capture.candidates.length,
      downloaded_image_count: capture.downloads.length,
      error: capture.public_error || "",
    })),
    products,
    rows: publicRows,
  };

  writeJson(visualIndexPath, visualIndex);
  updateNavigatorTimeline(visualIndex);

  console.log(JSON.stringify({
    run_id: runId,
    source_rows: rows.length,
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
