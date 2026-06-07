const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.join(__dirname, "..");
const dataPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const expectedProducts = [
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

assert.strictEqual(data.products.length, 10, "navigator should expose the 10-product pilot");
assert.deepStrictEqual(
  data.product_index.map((row) => row.id),
  expectedProducts,
  "product_index should list the balanced pilot in order",
);
assert.strictEqual(data.review_queue.length, 60, "each pilot product should expose six review queue rows");

const requiredStatuses = new Set([
  "story_ready",
  "claim_ready",
  "needs_photo_review",
  "needs_label_transcription",
  "needs_manual_verification",
  "gap_publishable",
]);
const legend = new Set(data.status_legend.map((row) => row.key));
requiredStatuses.forEach((status) => assert(legend.has(status), `missing status legend: ${status}`));

data.products.forEach((product) => {
  assert(expectedProducts.includes(product.id), `unexpected product ${product.id}`);
  assert.strictEqual(product.versions.length, 6, `${product.id} should have six vintage slots`);
  assert(product.pilot_rollup_status, `${product.id} missing pilot rollup status`);
  assert(product.claim_rollup_status, `${product.id} missing claim rollup status`);
  assert(product.identity_scope, `${product.id} missing identity scope`);
  assert(product.maker_timeline, `${product.id} missing maker timeline`);
  assert(product.grok_research_assist, `${product.id} missing Grok research-assist policy`);
  assert(product.export_paths?.timeline_json, `${product.id} missing export paths`);
  assert.strictEqual(product.review_queue.length, 6, `${product.id} should have product-level review queue rows`);
  assert(product.blocked_map.length >= 4, `${product.id} should expose blocked/gap lanes`);

  const evidenceIds = new Set(product.evidence.map((row) => row.id));
  product.versions.forEach((version) => {
    assert(version.status, `${product.id}/${version.id} missing status`);
    assert(version.photo_quality, `${product.id}/${version.id} missing photo quality`);
    assert(version.next_step, `${product.id}/${version.id} missing next step`);
    if (version.status !== "gap") {
      assert(version.evidence_ids.length > 0, `${product.id}/${version.id} needs evidence ids or should be a gap`);
      version.evidence_ids.forEach((id) => assert(evidenceIds.has(id), `${product.id}/${version.id} references missing evidence ${id}`));
    }
  });

  if (product.verified_labels > 0) {
    const manualEvidence = product.evidence.some((row) => row.status === "manual_verified");
    assert(manualEvidence, `${product.id} reports verified labels without manual-verified evidence`);
  }
});

[
  "ten_product_pilot_timeline.json",
  "ten_product_pilot_evidence.csv",
  "ten_product_pilot_visible_extracts.csv",
  "ten_product_pilot_review_queue.csv",
  "ten_product_pilot_story_briefs.md",
].forEach((file) => {
  const exportPath = path.join(root, "docs/data/product-evidence/exports", file);
  assert(fs.existsSync(exportPath), `missing export ${file}`);
  assert(fs.statSync(exportPath).size > 0, `empty export ${file}`);
});

console.log("ingredient navigator pilot tests passed");
