const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.join(__dirname, "..");
const dataPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const htmlPath = path.join(root, "docs/product-evidence/ingredient-navigator.html");
const jsPath = path.join(root, "docs/product-evidence/ingredient-navigator.js");
const cssPath = path.join(root, "docs/product-evidence/ingredient-navigator.css");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const html = fs.readFileSync(htmlPath, "utf8");
const js = fs.readFileSync(jsPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

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
const expectedPilotSet = new Set(expectedPilotProducts);

assert.strictEqual(data.products.length, 120, "navigator should expose the 120-product corpus");
assert.strictEqual(data.product_index.length, 120, "product_index should list the full corpus");
assert.deepStrictEqual(
  data.product_index.slice(0, expectedPilotProducts.length).map((row) => row.id),
  expectedPilotProducts,
  "product_index should keep the balanced story-rich pilot first",
);
assert.strictEqual(data.review_queue.length, 720, "each corpus product should expose six review queue rows");
assert.strictEqual(data.corpus_summary.product_count, 120, "corpus summary should cover 120 products");
assert.strictEqual(data.corpus_summary.story_rich_pilot_count, 10, "corpus summary should preserve ten story-rich pilots");
assert.strictEqual(data.corpus_summary.full_corpus_shell_count, 110, "corpus summary should add 110 proof shells");
assert.strictEqual(data.corpus_summary.embedded_public_images, 0, "public build should not embed uncleared photos");
assert(data.corpus_summary.link_only_photo_receipts >= 1000, "expected broad source-linked photo/evidence receipts");
assert(data.full_corpus_story_briefs_summary, "navigator should expose full-corpus story brief summary");
assert.strictEqual(data.full_corpus_story_briefs_summary.product_count, 120, "story brief summary should cover 120 products");
assert(data.full_corpus_story_briefs_summary.site_artifacts?.story_briefs_markdown, "story brief markdown link should be exposed");
assert(html.includes('id="corpus-mode"'), "navigator should expose corpus mode controls");
assert(js.includes('corpusMode: "full"'), "navigator should default to full-corpus mode");
assert(js.includes('data-corpus-mode="${escapeHtml(definition.id)}"'), "navigator should render selectable corpus modes");
assert(js.includes("renderProductProofRail"), "navigator should render a source-linked photo proof rail");
assert(js.includes("No product photos are embedded yet"), "navigator should explain why photos are source-linked instead of embedded");
assert(js.includes("-product corpus loaded"), "navigator should make the product corpus visible in the product strip");
assert(js.includes("Current public photo mode"), "navigator should expose the current public photo display mode");
assert(js.includes("Source receipts can sit beside ingredient candidates today"), "navigator should explain source receipts beside ingredient candidates");
assert(js.includes("Story Brief Exports"), "navigator should render full-corpus story brief exports");
assert(css.includes(".product-strip.mode-full"), "full corpus mode should use a grid product strip");
assert(css.includes(".proof-source-rail"), "photo proof rail should be styled");
assert(css.includes(".product-strip-ledger"), "corpus ledger should be styled");
assert(css.includes(".proof-display-gate"), "photo display gate should be styled");
assert(css.includes(".corpus-handoff-links"), "story export links should be styled");

const requiredStatuses = new Set([
  "story_ready",
  "confirmed_story_ready",
  "claim_ready",
  "full_corpus_selectable",
  "source_discovery_needed",
  "needs_photo_review",
  "needs_label_transcription",
  "needs_manual_verification",
  "gap_publishable",
  "source_link_only_rights_unclear",
  "embed_rights_cleared",
  "private_capture_only",
]);
const legend = new Set(data.status_legend.map((row) => row.key));
requiredStatuses.forEach((status) => assert(legend.has(status), `missing status legend: ${status}`));

function assertNoRawBlockedStatus(productId, objectId, status) {
  assert.notStrictEqual(status, "gap", `${productId}/${objectId} still has raw gap status`);
  assert.notStrictEqual(status, "blocked", `${productId}/${objectId} still has generic blocked status`);
}

function assertEvidenceImagePolicy(productId, row) {
  [
    "public_image_url",
    "thumbnail_url",
    "source_photo_url",
    "image_display_policy",
    "rights_status",
    "local_private_capture_path",
  ].forEach((field) => {
    assert(Object.prototype.hasOwnProperty.call(row, field), `${productId}/${row.id} missing ${field}`);
  });
  if (row.image_display_policy !== "embed_rights_cleared") {
    assert.strictEqual(row.public_image_url, "", `${productId}/${row.id} should not publish an uncleared image URL`);
    assert.strictEqual(row.thumbnail_url, "", `${productId}/${row.id} should not publish an uncleared thumbnail URL`);
  }
  assert(
    !/\/Users\/|\/private\/|\/tmp\/|file:/.test(row.local_private_capture_path || ""),
    `${productId}/${row.id} should not expose private local image paths`,
  );
}

data.products.forEach((product) => {
  assert(["story_rich_pilot", "full_corpus_shell"].includes(product.corpus_scope), `${product.id} has invalid corpus scope`);
  assert.strictEqual(product.versions.length, 6, `${product.id} should have six vintage slots`);
  assert(product.pilot_rollup_status, `${product.id} missing pilot rollup status`);
  assert(product.claim_rollup_status, `${product.id} missing claim rollup status`);
  assert(product.identity_scope, `${product.id} missing identity scope`);
  assert(product.maker_timeline, `${product.id} missing maker timeline`);
  assert(product.grok_research_assist, `${product.id} missing Grok research-assist policy`);
  assert(product.ingredient_ocr_summary, `${product.id} missing OCR summary`);
  assert(product.export_paths?.ocr_queue_csv, `${product.id} missing OCR queue export path`);
  assert(product.story_resolution, `${product.id} missing story resolution`);
  assert.strictEqual(product.review_queue.length, 6, `${product.id} should have product-level review queue rows`);
  assert(product.blocked_map.length >= 3, `${product.id} should expose blocked/gap lanes`);
  assert(product.facets.length >= 3, `${product.id} should expose facet/readiness lanes`);
  assert(!product.blocked_map.some((row) => row.status === "blocked" || row.status === "gap"), `${product.id} has raw blocked/gap lanes`);
  assert(!product.facets.some((row) => row.status === "blocked" || row.status === "gap"), `${product.id} has raw blocked/gap facets`);

  if (product.corpus_scope === "story_rich_pilot") {
    assert(expectedPilotSet.has(product.id), `unexpected story-rich pilot ${product.id}`);
    assert.strictEqual(product.pilot_rollup_status, "confirmed_story_ready", `${product.id} should be confirmed story-ready`);
    assert(product.export_paths?.timeline_json, `${product.id} missing timeline export path`);
    assert(product.export_paths?.gap_closure_csv, `${product.id} missing gap closure export path`);
    assert.strictEqual(product.story_resolution.outstanding_gap_count, 0, `${product.id} should have no raw outstanding gaps`);
    assert.strictEqual(product.story_resolution.resolved_slots, 6, `${product.id} should resolve all six slots`);
  } else {
    assert.strictEqual(product.pilot_rollup_status, "full_corpus_selectable", `${product.id} should be a selectable proof shell`);
    assert(product.export_paths?.full_corpus_ocr_queue_csv, `${product.id} missing full-corpus OCR queue export path`);
    assert(product.export_paths?.full_corpus_ocr_gap_csv, `${product.id} missing full-corpus OCR gap export path`);
  }

  const evidenceIds = new Set(product.evidence.map((row) => row.id));
  product.evidence.forEach((row) => {
    assertEvidenceImagePolicy(product.id, row);
    assertNoRawBlockedStatus(product.id, row.id, row.status);
  });

  product.versions.forEach((version) => {
    const versionEvidenceIds = version.evidence_ids || [];
    assert(version.status, `${product.id}/${version.id} missing status`);
    assertNoRawBlockedStatus(product.id, version.id, version.status);
    assert(version.photo_quality, `${product.id}/${version.id} missing photo quality`);
    assert(version.next_step, `${product.id}/${version.id} missing next step`);
    assert(version.validation_state, `${product.id}/${version.id} missing validation state`);
    if (versionEvidenceIds.length === 0) {
      assert(
        ["gap_publishable", "source_discovery_needed"].includes(version.status),
        `${product.id}/${version.id} without evidence must be a publishable gap or source-discovery slot`,
      );
      if (version.status === "gap_publishable") {
        assert.strictEqual(version.gap_resolution?.state, "resolved_publishable_gap", `${product.id}/${version.id} missing gap resolution`);
        assert(version.gap_resolution.cannot_say, `${product.id}/${version.id} missing cannot-say boundary`);
      }
    } else {
      versionEvidenceIds.forEach((id) => assert(evidenceIds.has(id), `${product.id}/${version.id} references missing evidence ${id}`));
    }
  });

  product.review_queue.forEach((row) => assertNoRawBlockedStatus(product.id, row.vintage, row.status));
  product.blocked_map.forEach((row) => assertNoRawBlockedStatus(product.id, row.lane, row.status));
  product.facets.forEach((row) => assertNoRawBlockedStatus(product.id, row.id, row.status));
  product.events.forEach((row) => assertNoRawBlockedStatus(product.id, row.label, row.status));

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
  "ten_product_pilot_gap_closure.csv",
  "ten_product_pilot_story_briefs.md",
  "full_corpus_ingredient_ocr_queue.csv",
  "full_corpus_ingredient_ocr_gap_report.csv",
].forEach((file) => {
  const exportPath = path.join(root, "docs/data/product-evidence/exports", file);
  assert(fs.existsSync(exportPath), `missing export ${file}`);
  assert(fs.statSync(exportPath).size > 0, `empty export ${file}`);
});

console.log("ingredient navigator full-corpus tests passed");
