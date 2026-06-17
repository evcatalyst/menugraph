const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { resolvePrivateCwaCropPath } = require("../server");

const root = path.join(__dirname, "..");
const visualIndexPath = path.join(root, "docs/data/product-evidence/cwa_ingredient_visual_index.json");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const privateManifestPath = path.join(root, ".cache/ingredient-ocr/cwa/latest-private-manifest.json");

const expectedPilotProducts = [
  "oreo_original_chocolate_sandwich_cookies",
  "doritos_nacho_cheese",
  "cheerios_original",
  "coca_cola_classic",
  "campbells_tomato_soup",
  "heinz_tomato_ketchup",
  "poptarts_frosted_strawberry",
  "kraft_macaroni_and_cheese_original",
  "mcdonalds_big_mac",
  "mcdonalds_chicken_mcnuggets",
];

const expectedCwaProducts = new Set([
  "snickers_bar",
  "twix_bar",
  "kit_kat_bar",
  "milky_way_bar",
  "tootsie_roll",
]);

function assertPublicSafe(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  assert(!text.includes(".cache"), `${filePath} exposes .cache path`);
  assert(!text.includes("/Volumes/"), `${filePath} exposes absolute volume path`);
  assert(!text.includes("local_image_path"), `${filePath} exposes local_image_path`);
  assert(!text.includes("source_image_path"), `${filePath} exposes source_image_path`);
  assert(!text.includes("preview_path"), `${filePath} exposes preview_path`);
  assert(!text.includes("ocr_path"), `${filePath} exposes ocr_path`);
  assert(!/data:image\//.test(text), `${filePath} exposes image data URI`);
  assert(!text.includes('"lines"'), `${filePath} exposes raw OCR lines`);
}

assertPublicSafe(visualIndexPath);
assertPublicSafe(navigatorPath);

const visualIndex = JSON.parse(fs.readFileSync(visualIndexPath, "utf8"));
const navigator = JSON.parse(fs.readFileSync(navigatorPath, "utf8"));

assert.strictEqual(visualIndex.schema_version, 1, "CWA visual index should be versioned");
assert.strictEqual(visualIndex.source_family.id, "candy-wrapper-archive", "CWA source family id should be stable");
assert.strictEqual(visualIndex.totals.products, 5, "CWA visual index should cover five products");
assert.strictEqual(visualIndex.totals.rows, 16, "CWA visual index should cover 16 evidence rows");
assert.strictEqual(visualIndex.rows.length, 16, "CWA public rows should match totals");
assert(visualIndex.totals.unique_source_urls >= 5, "CWA visual index should preserve source URL spread");
assert.strictEqual(visualIndex.totals.local_preview_available, 16, "CWA visual index should expose local preview availability for every row");
assert.strictEqual(visualIndex.totals.ingredient_signal_candidates, 14, "CWA visual index should expose reviewed ingredient text candidates");
assert.strictEqual(visualIndex.totals.readable_panel_still_needed, 2, "CWA visual index should preserve remaining readable-panel gaps");

visualIndex.products.forEach((product) => {
  assert(expectedCwaProducts.has(product.product_id), `unexpected CWA product ${product.product_id}`);
  assert(product.evidence_count > 0, `${product.product_id} should have CWA rows`);
  assert(product.rows.length === product.evidence_count, `${product.product_id} row count mismatch`);
});

visualIndex.rows.forEach((row) => {
  assert(expectedCwaProducts.has(row.product_id), `${row.evidence_id} has unexpected product ${row.product_id}`);
  assert(row.evidence_id, "CWA row missing evidence id");
  assert(row.visual_id, `${row.evidence_id} missing visual id`);
  assert(/^\/api\/private\/ingredient-crops\/[a-z0-9_-]+$/.test(row.preview_endpoint), `${row.evidence_id} has unsafe preview endpoint`);
  assert.strictEqual(typeof row.local_upscaled_preview_available, "boolean", `${row.evidence_id} should expose upscaled availability without paths`);
  assert(["upscaled_crop", "base_crop", "none"].includes(row.preview_render_variant), `${row.evidence_id} has unknown preview render variant`);
  assert(/^https:\/\/www\.candywrapperarchive\.com\//.test(row.source_url), `${row.evidence_id} source should remain a CWA link`);
  assert(row.claim_boundary.includes("claim"), `${row.evidence_id} missing claim boundary`);
  assert(["ingredient_signal_found", "readable_panel_still_needed"].includes(row.ingredient_signal_status), `${row.evidence_id} has unknown ingredient signal state`);
  assert(Number.isFinite(Number(row.crop_rotation_degrees || 0)), `${row.evidence_id} crop rotation should be numeric`);
  if (row.ingredient_signal_status === "ingredient_signal_found") {
    assert(row.ingredient_text, `${row.evidence_id} ingredient candidate should include public-safe ingredient text`);
    assert(Array.isArray(row.ingredient_items), `${row.evidence_id} should expose structured ingredient items`);
    assert(row.ingredient_items.length >= 3, `${row.evidence_id} should expose multiple structured ingredient items`);
    assert.strictEqual(row.ingredient_item_count, row.ingredient_items.length, `${row.evidence_id} ingredient item count should match item array`);
    assert(row.ingredient_text_status.includes("candidate"), `${row.evidence_id} ingredient text should remain candidate-gated`);
    assert.strictEqual(row.crop_focus, "ingredient_text", `${row.evidence_id} ingredient row should use ingredient crop focus`);
  } else {
    assert(Array.isArray(row.ingredient_items) && row.ingredient_items.length === 0, `${row.evidence_id} without ingredient text should not expose ingredient items`);
    assert.strictEqual(row.ingredient_item_count, 0, `${row.evidence_id} ingredient item count should remain zero`);
  }
});

const snickers2000s = visualIndex.rows.find((row) => row.evidence_id === "snickers_bar__2000s__174__1");
assert(snickers2000s, "CWA index should include the 2000s Snickers row");
assert(snickers2000s.ingredient_items.includes("peanuts"), "Snickers structured items should include peanuts");
assert(snickers2000s.ingredient_items.some((item) => item.includes("soybean oil")), "Snickers structured items should include soybean oil");

const kitKat2000s = visualIndex.rows.find((row) => row.evidence_id === "kit_kat_bar__2000s__173__1");
assert(kitKat2000s, "CWA index should include the 2000s Kit Kat row");
assert(kitKat2000s.ingredient_items.some((item) => item.includes("soy lecithin")), "Kit Kat structured items should preserve emulsifier text");

assert.deepStrictEqual(
  navigator.product_index.map((row) => row.id),
  expectedPilotProducts,
  "CWA visual timeline must not change the 10-product pilot index",
);

const timeline = navigator.source_family_timeline?.families?.find((row) => row.id === "candy-wrapper-archive");
assert(timeline, "navigator should expose the CWA source-family timeline");
assert.strictEqual(timeline.product_count, 5, "navigator CWA timeline should cover five products");
assert.strictEqual(timeline.row_count, 16, "navigator CWA timeline should cover 16 rows");
assert.strictEqual(timeline.products.length, 5, "navigator CWA timeline should include five product groups");
assert(timeline.products.every((product) => expectedCwaProducts.has(product.product_id)), "navigator CWA timeline has unexpected products");
assert.strictEqual(timeline.ingredient_signal_count, 14, "navigator CWA timeline should expose reviewed ingredient candidate count");

const summaryFamily = navigator.source_family_summary?.families?.find((row) => row.id === "candy-wrapper-archive");
assert(summaryFamily, "navigator source-family summary should expose CWA");
assert(summaryFamily.products.some((product) => product.ingredient_panel_visible_count > 0), "source-family summary should reflect ingredient text candidates");
assert(summaryFamily.products.some((product) => product.readable_panel_photo_needed_count > 0), "source-family summary should preserve remaining panel gaps");

assert.strictEqual(resolvePrivateCwaCropPath("../bad"), null, "path traversal visual id should be rejected");
assert.strictEqual(resolvePrivateCwaCropPath("bad/slash"), null, "slash visual id should be rejected");
assert.strictEqual(resolvePrivateCwaCropPath("unknown_visual_id_000000"), null, "unknown visual id should not resolve");
assert.strictEqual(
  resolvePrivateCwaCropPath("valid_visual_id", path.join(root, "missing-private-manifest.json")),
  null,
  "missing private manifest should return null",
);

if (fs.existsSync(privateManifestPath)) {
  const privateManifest = JSON.parse(fs.readFileSync(privateManifestPath, "utf8"));
  const preview = (privateManifest.rows || []).find((row) => row.upscaled_preview_path || row.preview_path);
  if (preview) {
    const resolved = resolvePrivateCwaCropPath(preview.visual_id);
    assert(resolved, "known private visual id should resolve when cache is present");
    assert(fs.existsSync(resolved), "resolved private crop should exist");
    assert.strictEqual(path.resolve(resolved), path.resolve(preview.upscaled_preview_path || preview.preview_path), "resolver should prefer an upscaled private crop when present");
    assert(resolved.includes(`${path.sep}.cache${path.sep}ingredient-ocr${path.sep}cwa${path.sep}`), "resolved private crop should stay under the CWA cache");
    if (preview.upscaled_preview_path) {
      assert(fs.existsSync(preview.upscaled_preview_path), "CWA upscaled private crop should exist");
      assert.strictEqual(preview.upscaled_crop_status, "upscaled_crop_ready", "CWA upscaled crop should be marked ready");
      assert(Number(preview.upscaled_output_pixels?.width || 0) >= 2200, "CWA upscaled crop should record readable output width");
    }
  }
}

console.log("CWA ingredient visual tests passed");
