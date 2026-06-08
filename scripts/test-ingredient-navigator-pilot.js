const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.join(__dirname, "..");
const dataPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const htmlPath = path.join(root, "docs/product-evidence/ingredient-navigator.html");
const jsPath = path.join(root, "docs/product-evidence/ingredient-navigator.js");
const cssPath = path.join(root, "docs/product-evidence/ingredient-navigator.css");
const publicPhotoManifestPath = path.join(root, "docs/data/product-evidence/public_photo_proof_manifest.json");
const cwaCapturePacketsPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_capture_packets.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const publicPhotoManifest = JSON.parse(fs.readFileSync(publicPhotoManifestPath, "utf8"));
const cwaCapturePackets = JSON.parse(fs.readFileSync(cwaCapturePacketsPath, "utf8"));
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
assert.strictEqual(data.full_corpus_story_briefs_summary.public_embeds, 31, "story brief summary should count reviewed public image embeds");
assert(data.full_corpus_story_briefs_summary.site_artifacts?.story_briefs_markdown, "story brief markdown link should be exposed");
assert.strictEqual(publicPhotoManifest.published_image_count, 31, "public photo proof manifest should publish reviewed Commons images");
assert(
  publicPhotoManifest.published_images.every((row) => row.image_display_policy === "embed_rights_cleared"),
  "published public photo rows must be rights-cleared embeds",
);
assert.strictEqual(cwaCapturePackets.packet_count, 49, "CWA source-page packet manifest should expose 49 packets");
assert.strictEqual(
  cwaCapturePackets.packets.filter((packet) => packet.product_id === "tootsie_roll").length,
  2,
  "Tootsie Roll should have source-page packet leads from CWA",
);
assert(
  cwaCapturePackets.packets.every((packet) => packet.rows[0].surface_id === "ingredient_panel" && packet.rows[1].surface_id === "nutrition_panel"),
  "CWA source-page packets should order ingredient and nutrition surfaces first",
);
assert(html.includes('id="corpus-mode"'), "navigator should expose corpus mode controls");
assert(html.includes('id="corpus-directory"'), "navigator should expose all-product directory");
assert(js.includes('corpusMode: "full"'), "navigator should default to full-corpus mode");
assert(js.includes('data-corpus-mode="${escapeHtml(definition.id)}"'), "navigator should render selectable corpus modes");
assert(js.includes("renderCorpusDirectory"), "navigator should render the all-product directory");
assert(js.includes("renderProductProofRail"), "navigator should render a source-linked photo proof rail");
assert(js.includes("renderIngredientPanelProofRail"), "navigator should render ingredient-panel proof before product context");
assert(js.includes("renderProofSourceThumb"), "navigator should render proof thumbnails for public image rows");
assert(js.includes("Primary Proof: Ingredient Panels"), "navigator should make ingredient panels the primary proof lane");
assert(js.includes("Secondary Proof: Product / Package Context"), "navigator should make product photos secondary context");
assert(js.includes("-product corpus loaded"), "navigator should make the product corpus visible in the product strip");
assert(js.includes("Primary Display Gate"), "navigator should expose the ingredient-panel display gate");
assert(js.includes("Product-front photos are only context unless they expose label text"), "navigator should explain the panel-first proof hierarchy");
assert(js.includes("Public Photo OCR Run"), "navigator should expose public photo OCR run status");
assert(js.includes("Vision runtime nilError"), "navigator should explain local Vision OCR runtime blockers");
assert(js.includes("Candidate Text CSV"), "navigator should link public candidate OCR text artifacts");
assert(js.includes("never as verified formulation claims"), "navigator should preserve OCR candidate claim boundary");
assert(js.includes("Story Brief Exports"), "navigator should render full-corpus story brief exports");
assert(js.includes("Candy Wrapper Archive OCR Pipeline"), "navigator should expose CWA OCR pipeline status");
assert(js.includes("Candy Wrapper Archive first capture tasks"), "navigator should render CWA first capture tasks");
assert(js.includes("Candy Wrapper Archive panel review questions"), "navigator should render CWA panel-review questions");
assert(js.includes("Panel reviews"), "navigator should expose CWA panel-review count");
assert(js.includes("Panel Review CSV"), "navigator should link CWA panel-review worksheet");
assert(js.includes("Panel Review Runbook"), "navigator should link CWA panel-review runbook");
assert(js.includes("Candy Wrapper Archive Item Lineage"), "navigator should expose CWA item-lineage priority");
assert(js.includes("Candy Wrapper Archive product lineage priorities"), "navigator should render CWA product-lineage priorities");
assert(js.includes("Lineage Priority CSV"), "navigator should link CWA lineage-priority exports");
assert(js.includes("Candy Wrapper Archive focus products"), "navigator should keep focused CWA products visible");
assert(js.includes("Candy Wrapper Archive Capture Queue"), "navigator should expose CWA capture queue");
assert(js.includes("Candy Wrapper Archive capture batches"), "navigator should render CWA capture batches");
assert(js.includes("Capture Worksheet CSV"), "navigator should link CWA capture worksheet");
assert(js.includes("Capture Batch Runbook"), "navigator should link CWA capture runbook");
assert(js.includes("Candy Wrapper Archive Surface OCR Map"), "navigator should expose CWA surface OCR map");
assert(js.includes("Candy Wrapper Archive OCR surfaces"), "navigator should render CWA OCR surface counts");
assert(js.includes("Surface OCR Queue CSV"), "navigator should link CWA surface OCR queue");
assert(js.includes("Surface Image Map Template"), "navigator should link CWA surface image-map template");
assert(js.includes("Candy Wrapper Archive Story Seeds"), "navigator should expose CWA story seed status");
assert(js.includes("Candy Wrapper Archive story seed products"), "navigator should render CWA story seed products");
assert(js.includes("Story Seeds CSV"), "navigator should link CWA story seed CSV");
assert(js.includes("Story Seed Runbook"), "navigator should link CWA story seed runbook");
assert(js.includes("Candy Wrapper Archive product story seed"), "navigator should render product-level CWA story seeds");
assert(js.includes("cwaStorySeedForProduct"), "navigator should map CWA story seeds to selected products");
assert(js.includes("confection_wrapper_story_seeds.json"), "navigator should fetch full CWA story seed timelines");
assert(js.includes("Candy Wrapper Archive Ingredient-First Priority"), "navigator should expose CWA ingredient-first priority summary");
assert(js.includes("CWA Ingredient-First Capture Priority"), "navigator should render selected-product CWA ingredient priority");
assert(js.includes("cwaIngredientPriorityForProduct"), "navigator should map CWA ingredient priorities to selected products");
assert(js.includes("confection_wrapper_ingredient_priority.json"), "navigator should fetch CWA ingredient priority rows");
assert(js.includes("CWA Source-Page Capture Packets"), "navigator should render selected-product CWA source-page capture packets");
assert(js.includes("cwaIngredientCapturePacketsForProduct"), "navigator should map CWA source-page packets to selected products");
assert(js.includes("confection_wrapper_ingredient_capture_packets.json"), "navigator should fetch CWA source-page capture packets");
assert(js.includes("Open one CWA page"), "navigator should explain the source-page packet workflow");
assert(js.includes("Ingredient Priority CSV"), "navigator should link CWA ingredient priority CSV");
assert(js.includes("private image-map handoff"), "navigator should explain CWA private image-map handoff");
assert(js.includes("Priority Image Map Template"), "navigator should link CWA priority image-map template");
assert(js.includes("Ingredient Capture Tasks CSV"), "navigator should link CWA ingredient capture tasks");
assert(js.includes("Ingredient Capture Runbook"), "navigator should link CWA ingredient capture runbook");
assert(js.includes("Source Capture Packets CSV"), "navigator should link CWA source-page capture packets");
assert(js.includes("Source Capture Packet Runbook"), "navigator should link CWA source-page packet runbook");
assert(js.includes("Capture Tasks CSV"), "navigator should link CWA capture task exports");
assert(js.includes("Capture Runbook"), "navigator should link CWA capture runbook");
assert(css.includes(".product-strip.mode-full"), "full corpus mode should use a grid product strip");
assert(css.includes(".corpus-directory-grid"), "all-product directory should be styled");
assert(css.includes(".proof-source-rail"), "photo proof rail should be styled");
assert(css.includes(".proof-source-rail-primary"), "primary ingredient-panel rail should be styled");
assert(css.includes(".proof-source-rail-secondary"), "secondary product-context rail should be styled");
assert(css.includes(".proof-source-rail-cwa-story"), "CWA product story seed rail should be styled");
assert(css.includes(".cwa-story-timeline"), "CWA product story seed timeline should be styled");
assert(css.includes(".proof-source-rail-cwa-ingredient-priority"), "CWA ingredient priority rail should be styled");
assert(css.includes(".cwa-ingredient-priority-list"), "CWA ingredient priority list should be styled");
assert(css.includes(".proof-source-rail-cwa-source-packets"), "CWA source-page packet rail should be styled");
assert(css.includes(".cwa-source-packet-list"), "CWA source-page packet list should be styled");
assert(css.includes(".cwa-source-surface-order"), "CWA source-page surface order should be styled");
assert(css.includes(".proof-source-thumb"), "public photo thumbnails should be styled");
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
