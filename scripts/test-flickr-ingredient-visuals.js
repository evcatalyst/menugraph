const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { resolvePrivateIngredientCropPath } = require("../server");

const root = path.join(__dirname, "..");
const visualIndexPath = path.join(root, "docs/data/product-evidence/flickr_ingredient_visual_index.json");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const privateManifestPath = path.join(root, ".cache/ingredient-ocr/flickr/latest-private-manifest.json");

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

const expectedFlickrProducts = new Set([
  "cheerios_original",
  "trix_cereal",
  "coca_cola_classic",
  "froot_loops",
  "tang_orange",
  "gatorade_lemon_lime",
  "dinty_moore_beef_stew",
  "sprite_original",
  "7up_original",
  "jello_strawberry_gelatin",
  "spam_classic",
  "philadelphia_cream_cheese_original",
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

assert.strictEqual(visualIndex.schema_version, 1, "Flickr visual index should be versioned");
assert.strictEqual(visualIndex.source_family.id, "flickr-package-archive", "Flickr source family id should be stable");
assert.strictEqual(visualIndex.totals.products, 12, "Flickr visual index should cover 12 products");
assert.strictEqual(visualIndex.totals.rows, 20, "Flickr visual index should cover 20 evidence rows");
assert.strictEqual(visualIndex.rows.length, 20, "Flickr public rows should match totals");
assert.strictEqual(visualIndex.totals.ingredient_signal_candidates, 18, "Flickr rows should expose 18 readable candidate texts");
assert.strictEqual(visualIndex.totals.readable_panel_still_needed, 2, "Curated Flickr lane should preserve known non-ingredient visual gaps");

visualIndex.products.forEach((product) => {
  assert(expectedFlickrProducts.has(product.product_id), `unexpected Flickr product ${product.product_id}`);
  assert(product.evidence_count > 0, `${product.product_id} should have Flickr rows`);
  assert(product.rows.length === product.evidence_count, `${product.product_id} row count mismatch`);
});

visualIndex.rows.forEach((row) => {
  assert(expectedFlickrProducts.has(row.product_id), `${row.evidence_id} has unexpected product ${row.product_id}`);
  assert(row.evidence_id, "Flickr row missing evidence id");
  assert(row.visual_id, `${row.evidence_id} missing visual id`);
  assert(/^\/api\/private\/ingredient-crops\/[a-z0-9_-]+$/.test(row.preview_endpoint), `${row.evidence_id} has unsafe preview endpoint`);
  assert.strictEqual(typeof row.local_upscaled_preview_available, "boolean", `${row.evidence_id} should expose upscaled availability without paths`);
  assert(["upscaled_crop", "base_crop", "none"].includes(row.preview_render_variant), `${row.evidence_id} has unknown preview render variant`);
  assert(/^https:\/\/www\.flickr\.com\//.test(row.source_url), `${row.evidence_id} source should remain a Flickr link`);
  assert(row.claim_boundary.includes("claim"), `${row.evidence_id} missing claim boundary`);
  assert(["ingredient_signal_found", "readable_panel_still_needed"].includes(row.ingredient_signal_status), `${row.evidence_id} has unknown ingredient signal status`);
  if (row.ingredient_signal_status === "ingredient_signal_found") {
    assert(row.ingredient_text, `${row.evidence_id} ingredient candidate should include public-safe text`);
    assert(row.ingredient_text_status.includes("candidate"), `${row.evidence_id} ingredient text should remain candidate-gated`);
    assert.strictEqual(row.crop_focus, "ingredient_text", `${row.evidence_id} should use ingredient crop focus`);
  } else {
    assert.strictEqual(row.product_id, "trix_cereal", `${row.evidence_id} should be a known pending Flickr transcription row`);
    assert.strictEqual(row.crop_focus, "visual_lineage", `${row.evidence_id} should be visual lineage only`);
    assert(row.candidate_excerpt.includes("promotion/top-flap panel only"), `${row.evidence_id} should identify the non-ingredient panel`);
    assert(row.candidate_excerpt.includes("readable ingredient panel still needed"), `${row.evidence_id} should explain the ingredient-panel gap`);
  }
});

const cheeriosRow = visualIndex.rows.find((row) => row.evidence_id === "cheerios_original__earliest_verified_label__368__1");
assert(cheeriosRow, "Flickr index should include the 1985 Cheerios row");
assert.strictEqual(cheeriosRow.ingredient_signal_status, "ingredient_signal_found", "Cheerios side panel should expose a review-gated ingredient candidate");
assert.strictEqual(cheeriosRow.crop_focus, "ingredient_text", "Cheerios crop should focus the ingredient block");
assert(cheeriosRow.ingredient_text.includes("whole grain oats"), "Cheerios candidate should include visible ingredient text");
assert(cheeriosRow.ingredient_text.includes("trisodium phosphate"), "Cheerios candidate should include the visible phosphate ingredient");

assert.deepStrictEqual(
  navigator.product_index.map((row) => row.id),
  expectedPilotProducts,
  "Flickr visual timeline must not change the 10-product pilot index",
);

const families = navigator.source_family_timeline?.families || [];
const cwaTimeline = families.find((row) => row.id === "candy-wrapper-archive");
const flickrTimeline = families.find((row) => row.id === "flickr-package-archive");
assert(cwaTimeline, "navigator should preserve the CWA timeline");
assert(flickrTimeline, "navigator should expose the Flickr source-family timeline");
assert.strictEqual(flickrTimeline.product_count, 12, "navigator Flickr timeline should cover 12 products");
assert.strictEqual(flickrTimeline.row_count, 20, "navigator Flickr timeline should cover 20 rows");
assert.strictEqual(flickrTimeline.products.length, 12, "navigator Flickr timeline should include 12 product groups");
assert.strictEqual(flickrTimeline.ingredient_signal_count, 18, "navigator Flickr timeline should expose candidate count");

const summaryFamily = navigator.source_family_summary?.families?.find((row) => row.id === "flickr-package-archive");
assert(summaryFamily, "navigator source-family summary should expose Flickr");
assert.strictEqual(summaryFamily.product_count, 12, "Flickr source-family summary should cover 12 products");
assert(summaryFamily.products.some((product) => product.product_id === "cheerios_original" && product.ingredient_panel_visible_count === 1 && product.readable_panel_photo_needed_count === 0), "Flickr summary should promote the review-gated Cheerios ingredient candidate");
assert(summaryFamily.products.some((product) => product.product_id === "trix_cereal" && product.readable_panel_photo_needed_count === 2), "Flickr summary should preserve the Trix transcription gaps");

assert.strictEqual(resolvePrivateIngredientCropPath("../bad"), null, "path traversal visual id should be rejected");
assert.strictEqual(resolvePrivateIngredientCropPath("bad/slash"), null, "slash visual id should be rejected");
assert.strictEqual(resolvePrivateIngredientCropPath("unknown_visual_id_000000"), null, "unknown visual id should not resolve");

if (fs.existsSync(privateManifestPath)) {
  const privateManifest = JSON.parse(fs.readFileSync(privateManifestPath, "utf8"));
  const preview = (privateManifest.rows || []).find((row) => row.upscaled_preview_path || row.preview_path);
  if (preview) {
    const resolved = resolvePrivateIngredientCropPath(preview.visual_id);
    assert(resolved, "known Flickr private visual id should resolve when cache is present");
    assert(fs.existsSync(resolved), "resolved Flickr private crop should exist");
    assert.strictEqual(path.resolve(resolved), path.resolve(preview.upscaled_preview_path || preview.preview_path), "resolver should prefer an upscaled private crop when present");
    assert(resolved.includes(`${path.sep}.cache${path.sep}ingredient-ocr${path.sep}flickr${path.sep}`), "resolved private crop should stay under the Flickr cache");
    if (preview.upscaled_preview_path) {
      assert(fs.existsSync(preview.upscaled_preview_path), "Flickr upscaled private crop should exist");
      assert.strictEqual(preview.upscaled_crop_status, "upscaled_crop_ready", "Flickr upscaled crop should be marked ready");
      assert(Number(preview.upscaled_output_pixels?.width || 0) >= 2200, "Flickr upscaled crop should record readable output width");
    }
  }
}

console.log("Flickr ingredient visual tests passed");
