const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  buildManifest,
  publicImageUrlOk,
  rightsClear,
  writeManifest,
} = require("./build-public-photo-proof-manifest");

const root = path.join(__dirname, "..");
const navigatorData = {
  products: [{
    id: "oreo_original_chocolate_sandwich_cookies",
    name: "Oreo Original Chocolate Sandwich Cookies",
    evidence: [{
      id: "smartlabel_oreo_143",
      title: "Nabisco Oreo Sandwich Cookies 14.3 oz - SmartLabel",
      source: "smartlabel.mondelez.info",
      url: "https://smartlabel.mondelez.info/00044000033262-0001-en-US/index.html",
    }],
  }],
};

assert.strictEqual(publicImageUrlOk("https://example.org/oreo-panel.jpg"), true, "https image URLs should be public-safe");
assert.strictEqual(publicImageUrlOk("../assets/product-evidence/oreo.jpg"), true, "relative public assets should be allowed");
assert.strictEqual(publicImageUrlOk("/private/tmp/oreo.jpg"), false, "private paths must be rejected");
assert.strictEqual(rightsClear("Wikimedia Commons CC-BY 4.0"), true, "clear Creative Commons rights should pass");
assert.strictEqual(rightsClear("External source; rights note needed before reproducing imagery."), false, "unclear rights should fail");

const manifest = buildManifest({
  navigatorData,
  registryCsvPath: "docs/data/product-evidence/exports/test_public_photo_proof_registry.csv",
  manifestPath: "docs/data/product-evidence/test_public_photo_proof_manifest.json",
  registryRows: [
    {
      product_id: "oreo_original_chocolate_sandwich_cookies",
      evidence_id: "smartlabel_oreo_143",
      source_url: "https://smartlabel.mondelez.info/00044000033262-0001-en-US/index.html",
      public_image_url: "https://example.org/oreo-panel.jpg",
      rights_status: "Rights cleared by owner permission granted",
      attribution_text: "Example owner / used with permission",
      reviewer: "reviewer@example.org",
      reviewed_at: "2026-06-07",
      image_display_policy: "embed_rights_cleared",
    },
    {
      product_id: "oreo_original_chocolate_sandwich_cookies",
      evidence_id: "smartlabel_oreo_143",
      source_url: "https://smartlabel.mondelez.info/00044000033262-0001-en-US/index.html",
      public_image_url: "/private/tmp/secret.jpg",
      rights_status: "Rights cleared",
      attribution_text: "Example owner",
      reviewer: "reviewer@example.org",
      reviewed_at: "2026-06-07",
      image_display_policy: "embed_rights_cleared",
    },
    {
      product_id: "oreo_original_chocolate_sandwich_cookies",
      evidence_id: "missing_evidence",
      public_image_url: "https://example.org/missing.jpg",
      rights_status: "Rights cleared",
      attribution_text: "Example owner",
      reviewer: "reviewer@example.org",
      reviewed_at: "2026-06-07",
      image_display_policy: "embed_rights_cleared",
    },
  ],
});

assert.strictEqual(manifest.published_image_count, 1, "only fully reviewed public-safe rows should publish");
assert.strictEqual(manifest.pending_or_rejected_count, 2, "unsafe rows should remain pending/rejected");
assert.strictEqual(manifest.published_images[0].image_display_policy, "embed_rights_cleared", "published image policy should be explicit");
assert(!JSON.stringify(manifest).includes("/private/tmp"), "manifest should redact private paths");
assert(
  manifest.pending_or_rejected.some((row) => row.rejection_reasons.includes("public_image_url_not_public_safe")),
  "private image paths should be rejected",
);
assert(
  manifest.pending_or_rejected.some((row) => row.rejection_reasons.includes("evidence_not_found_in_navigator")),
  "unknown evidence IDs should be rejected",
);

const realManifest = writeManifest();
const manifestPath = path.join(root, "docs/data/product-evidence/public_photo_proof_manifest.json");
const registryPath = path.join(root, "docs/data/product-evidence/exports/public_photo_proof_registry.csv");
assert(fs.existsSync(manifestPath), "real public photo proof manifest should be written");
assert(fs.existsSync(registryPath), "real public photo proof registry CSV should exist");
assert.strictEqual(realManifest.public_safety.source_link_only_default, true, "source-link-only should remain default");
assert(!JSON.stringify(realManifest).includes("/private/"), "real manifest must not leak private paths");

console.log("public photo proof manifest tests passed");
