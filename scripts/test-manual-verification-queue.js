const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  buildManualVerificationQueue,
  buildManualVerificationRows,
  verificationLane,
} = require("./build-manual-verification-queue");
const { parseCsv, writeCsv } = require("./ingredient-ocr-pipeline-utils");

function assertNoPrivatePaths(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaked a private path`);
}

const candidateRows = [
  {
    run_id: "manual-review-test",
    evidence_id: "flickr_oreo_1993",
    product_id: "oreo_original_chocolate_sandwich_cookies",
    product_name: "Oreo Original Chocolate Sandwich Cookies",
    vintage_label: "1993 label candidate",
    source_domain: "www.flickr.com",
    source_url: "https://www.flickr.com/photos/example/1",
    review_status: "candidate_review_ready",
    candidate_field_count: "3",
    candidate_text_hash: "abc123",
    has_ingredient_text: "1",
    has_allergen_text: "1",
    has_manufacturer_or_distributor: "0",
    has_net_weight: "1",
    has_serving_size: "0",
    candidate_only: "1",
    manual_verified: "0",
    public_text_included: "0",
    rejection_reason: "",
  },
  {
    run_id: "manual-review-test",
    evidence_id: "needs_crop",
    product_id: "doritos_nacho_cheese",
    product_name: "Doritos Nacho Cheese",
    vintage_label: "2000s",
    source_domain: "www.flickr.com",
    source_url: "https://www.flickr.com/photos/example/2",
    review_status: "needs_better_crop",
    candidate_field_count: "1",
    candidate_text_hash: "def456",
    has_ingredient_text: "1",
    candidate_only: "1",
    manual_verified: "0",
    public_text_included: "0",
    rejection_reason: "",
  },
  {
    run_id: "manual-review-test",
    evidence_id: "rejected_candidate",
    product_id: "cheerios_original",
    product_name: "Cheerios Original",
    vintage_label: "1980s",
    source_domain: "www.flickr.com",
    source_url: "/private/tmp/should-redact.png",
    review_status: "reject_candidate",
    candidate_field_count: "1",
    candidate_text_hash: "ghi789",
    has_ingredient_text: "1",
    candidate_only: "1",
    manual_verified: "0",
    public_text_included: "0",
    rejection_reason: "candidate_text_not_supported_by_ocr",
  },
];

const reviewRows = [
  {
    product_id: "oreo_original_chocolate_sandwich_cookies",
    product_name: "Oreo Original Chocolate Sandwich Cookies",
    vintage_label: "1993 label candidate",
    evidence_id: "flickr_oreo_1993",
    source_domain: "www.flickr.com",
    source_url: "https://www.flickr.com/photos/example/1",
    capture_status: "source_page_capture_blocked_no_network",
    review_status: "needs_source_review",
    missing_fields: "reviewer,corrected_transcription",
  },
  {
    product_id: "coca_cola_classic",
    product_name: "Coca-Cola Classic",
    vintage_label: "current_2020s",
    evidence_id: "source_only",
    source_domain: "www.coca-cola.com",
    source_url: "https://www.coca-cola.com/us/en/brands/coca-cola/products/original",
    capture_status: "source_page_capture_blocked_no_network",
    review_status: "needs_source_review",
    missing_fields: "front_or_primary_panel,package_weight_or_size",
  },
];

assert.strictEqual(verificationLane(candidateRows[0], reviewRows[0]), "candidate_extract_review", "candidate with fields should enter extract review");
assert.strictEqual(verificationLane(candidateRows[1], {}), "needs_better_crop", "needs_better_crop should remain a crop lane");
assert.strictEqual(verificationLane(candidateRows[2], {}), "candidate_rejected_audit", "rejected candidates should remain audit rows");

const rows = buildManualVerificationRows({
  runId: "manual-review-test",
  candidateRows,
  reviewRows,
});
assert.strictEqual(rows.length, 4, "three candidate rows plus one unmatched source-review row expected");
assert(rows.some((row) => row.verification_lane === "candidate_extract_review"), "expected extract-review lane");
assert(rows.some((row) => row.verification_lane === "needs_better_crop"), "expected crop lane");
assert(rows.some((row) => row.verification_lane === "candidate_rejected_audit"), "expected rejected audit lane");
assert(rows.some((row) => row.verification_lane === "needs_source_review" && row.evidence_id === "source_only"), "expected source-only review lane");
assert(rows.every((row) => Number(row.manual_verified) === 0), "manual verification queue cannot mark verified");
assert(rows.every((row) => Number(row.claim_promotion_allowed) === 0), "manual verification queue cannot allow claim promotion");
assert(rows.every((row) => !row.reviewer && !row.reviewed_at && !row.reviewer_decision), "reviewer fields should be blank by default");
assert(rows.find((row) => row.evidence_id === "rejected_candidate").source_url === "[private_path_redacted]", "private source URL should be redacted");

const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "manual-verification-queue-"));
const candidateCsv = path.join(runDir, "candidates.csv");
const reviewCsv = path.join(runDir, "review.csv");
const publicCsv = path.join(runDir, "manual-review.csv");
const publicSummary = path.join(runDir, "manual-review.json");

writeCsv(candidateCsv, Object.keys(candidateRows[0]), candidateRows);
writeCsv(reviewCsv, Object.keys(reviewRows[0]), reviewRows);

const result = buildManualVerificationQueue({
  runId: "manual-review-test",
  candidateCsvPath: candidateCsv,
  reviewQueueCsvPath: reviewCsv,
  publicCsvPath: publicCsv,
  publicSummaryPath: publicSummary,
  updateSiteSummary: false,
});

assert.strictEqual(result.summary.verification_queue_rows, 4, "summary should count verification rows");
assert.strictEqual(result.summary.candidate_extract_review_rows, 1, "summary should count extract-review rows");
assert.strictEqual(result.summary.needs_source_review_rows, 1, "summary should count source-review rows");
assert.strictEqual(result.summary.public_safety.manual_verified_created, false, "summary cannot create manual verification");
assert.strictEqual(result.summary.public_safety.claim_promotion_allowed, false, "summary cannot allow claim promotion");

const publicCsvText = fs.readFileSync(publicCsv, "utf8");
const publicSummaryText = fs.readFileSync(publicSummary, "utf8");
const publicRows = parseCsv(publicCsvText);
assert.strictEqual(publicRows.length, 4, "public CSV should contain all queue rows");
assert(publicRows.every((row) => Number(row.manual_verified) === 0), "public CSV cannot mark manual verified");
assertNoPrivatePaths(publicCsvText, "manual verification CSV");
assertNoPrivatePaths(publicSummaryText, "manual verification summary");

const defaultPublicCsvPath = path.join(__dirname, "../docs/data/product-evidence/exports/hybrid_ocr_manual_verification_queue.csv");
const defaultPublicSummaryPath = path.join(__dirname, "../docs/data/product-evidence/hybrid_ocr_manual_verification_summary.json");
assert(fs.existsSync(defaultPublicCsvPath), "default manual verification queue CSV should exist");
assert(fs.existsSync(defaultPublicSummaryPath), "default manual verification summary should exist");

console.log("manual verification queue tests passed");
