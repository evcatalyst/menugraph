const assert = require("assert");
const {
  buildPublicPhotoOcrIntake,
  expectedSurface,
  intakeRow,
  queueHeaders,
} = require("./build-public-photo-ocr-intake");

function assertNoPrivatePaths(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaked a private path`);
}

const product = {
  id: "sample_product",
  name: "Sample Product",
  brand: "Sample",
  category: "snacks",
  versions: [{
    id: "current",
    label: "Current SKU anchor",
    evidence_ids: ["sample_evidence"],
  }],
  evidence: [{
    id: "sample_evidence",
    title: "Sample package photo - Wikimedia Commons",
    source: "commons.wikimedia.org",
    url: "https://commons.wikimedia.org/wiki/File:Sample.jpg",
    status: "label_visible",
    kind: "licensed_package_photo",
    label_panel_state: "ingredient panel visible",
    photo_role: "ingredient panel candidate",
  }],
};

assert.strictEqual(expectedSurface(product.evidence[0]), "ingredient panel or ingredient text if visible");

const manifestRow = {
  product_id: "sample_product",
  product_name: "Sample Product",
  evidence_id: "sample_evidence",
  source_url: "https://commons.wikimedia.org/wiki/File:Sample.jpg",
  source_title: "Sample package photo - Wikimedia Commons",
  source_owner: "Wikimedia Commons / Sample Author",
  public_image_url: "https://upload.wikimedia.org/wikipedia/commons/1/11/Sample.jpg",
  thumbnail_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Sample.jpg/800px-Sample.jpg",
  rights_status: "Wikimedia Commons CC BY-SA 4.0",
  license_url: "https://creativecommons.org/licenses/by-sa/4.0",
  attribution_text: "Sample Author via Wikimedia Commons, CC BY-SA 4.0",
  image_display_policy: "embed_rights_cleared",
};

const row = intakeRow(manifestRow, { product, evidence: product.evidence[0] });
assert.strictEqual(row.ocr_access_state, "external_image_reference_ready");
assert.strictEqual(row.ocr_gap_category, "panel_capture_needed");
assert.strictEqual(row.ocr_priority, "high");
assert.strictEqual(row.proof_lane, "primary_ingredient_panel");
assert.strictEqual(Number(row.proof_lane_rank), 1);
assert.strictEqual(row.image_reference, manifestRow.public_image_url);
assert.strictEqual(row.candidate_only, 1);
assert.strictEqual(row.manual_verified, 0);
assert(row.promotion_blocker.includes("no ingredient claim promotion"), "row should preserve claim boundary");

const contextEvidence = {
  id: "context_evidence",
  title: "Sample front package photo - Wikimedia Commons",
  source: "commons.wikimedia.org",
  url: "https://commons.wikimedia.org/wiki/File:Sample_front.jpg",
  status: "usable_photo",
  kind: "licensed_package_photo",
  label_panel_state: "front package object visible",
  photo_role: "package front context",
  quality_note: "find_readable_ingredient_panel_photo",
};
const contextRow = intakeRow({ ...manifestRow, evidence_id: "context_evidence" }, { product, evidence: contextEvidence });
assert.strictEqual(contextRow.proof_lane, "secondary_product_context");
assert.strictEqual(Number(contextRow.proof_lane_rank), 2);
assert.strictEqual(contextRow.ocr_priority, "medium");
assert.strictEqual(contextRow.ocr_gap_category, "package_identity_review_needed");
assert(
  contextRow.ocr_recommended_action.includes("do not treat as ingredient proof"),
  "secondary context rows should preserve ingredient-proof boundary",
);

const pdfRow = intakeRow({
  ...manifestRow,
  public_image_url: "https://upload.wikimedia.org/wikipedia/commons/5/58/Product_Ingredient_Guide.pdf",
  thumbnail_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Product_Ingredient_Guide.pdf/page1-960px-Product_Ingredient_Guide.pdf.jpg",
  source_title: "Sample Product Ingredient Guide PDF",
}, { product, evidence: { ...product.evidence[0], title: "Sample Product Ingredient Guide PDF" } });
assert.strictEqual(pdfRow.proof_lane, "primary_ingredient_panel");
assert.strictEqual(pdfRow.image_reference.endsWith(".jpg"), true, "PDF rows should use rendered thumbnail images for OCR capture");
assert.strictEqual(pdfRow.public_image_url.endsWith(".pdf"), true, "PDF source should remain attributable in public_image_url");

const result = buildPublicPhotoOcrIntake({
  navigatorData: { products: [product] },
  publicPhotoManifest: {
    published_images: [
      manifestRow,
      { ...manifestRow, evidence_id: "not_embedded", image_display_policy: "source_link_only_no_public_image" },
    ],
  },
  captureRows: [{
    evidence_id: "sample_evidence",
    capture_status: "downloaded_direct_image",
    ready_for_ocr: "1",
  }],
  ocrRows: [{
    evidence_id: "sample_evidence",
    proof_lane: "primary_ingredient_panel",
    ocr_status: "ocr_succeeded",
    ingredient_signal_found: "1",
    private_image_present: "1",
  }],
});

assert.strictEqual(result.rows.length, 1, "only embed-rights-cleared rows should enter OCR intake");
assert.strictEqual(result.summary.queue_rows, 1);
assert.strictEqual(result.summary.product_count, 1);
assert.strictEqual(result.summary.primary_ingredient_panel_rows, 1);
assert.strictEqual(result.summary.secondary_product_context_rows, 0);
assert.strictEqual(result.summary.capture.ready_for_ocr, 1);
assert.strictEqual(result.summary.ocr.ocr_succeeded, 1);
assert.strictEqual(result.summary.ocr.primary_ocr_succeeded, 1);
assert.strictEqual(result.summary.ocr.ingredient_signal_found, 1);
assert.strictEqual(result.summary.ocr.primary_ingredient_signal_found, 1);
assert.strictEqual(result.summary.public_safety.ocr_text_committed, false);
assert.strictEqual(result.summary.public_safety.ingredient_claims_verified, false);
assert.strictEqual(result.summary.public_safety.manual_verified_created, false);
assert(queueHeaders().includes("image_reference"), "queue should expose image_reference for capture runner");
assert(queueHeaders().includes("ocr_expected_surface"), "queue should tell reviewers what surface OCR targets");
assert(queueHeaders().includes("proof_lane"), "queue should expose proof lane for panel-first routing");
assert(queueHeaders().includes("proof_lane_rank"), "queue should expose proof lane rank for batch ordering");
assertNoPrivatePaths(JSON.stringify(result), "public photo OCR intake result");

console.log("public photo OCR intake tests passed");
