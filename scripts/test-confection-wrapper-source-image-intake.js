const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");
const {
  extractImageCandidates,
  htmlCachePath,
  writeSourceImageIntake,
} = require("./build-confection-wrapper-source-image-intake");

const root = path.join(__dirname, "..");
const packetJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_capture_packets.json");
const publicCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_image_intake.csv");
const publicJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_source_image_intake.json");
const publicRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_image_intake_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertPublicSafe(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaks a private path`);
}

const fixtureHtml = `
<!doctype html>
<html>
  <head>
    <meta property="og:image" content="/images/1930s-butterfinger-wrapper-large.jpg">
    <meta name="twitter:image" content="https://cdn.example.test/social-card.png">
  </head>
  <body>
    <img src="/assets/site-logo.png" alt="Site logo" width="120" height="40">
    <img src="/photos/1930s-butterfinger-candy-wrapper-back-panel.jpg" alt="1930s Butterfinger candy wrapper back panel" width="1200" height="800">
    <a href="/scans/1930s-butterfinger-wrapper-detail.webp" title="Butterfinger wrapper scan">scan</a>
  </body>
</html>
`;

const packetManifest = JSON.parse(fs.readFileSync(packetJsonPath, "utf8"));
const firstPacket = packetManifest.packets[0];
const candidates = extractImageCandidates(fixtureHtml, firstPacket);
assert(candidates.length >= 3, "fixture should expose image candidates");
assert.strictEqual(candidates[0].url, "https://www.candywrapperarchive.com/photos/1930s-butterfinger-candy-wrapper-back-panel.jpg", "highest score should prefer the wrapper/back-panel image");
assert(candidates[0].score > candidates[candidates.length - 1].score, "candidate scoring should rank useful wrapper images above low-signal images");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-source-image-intake-"));
const htmlDir = path.join(tmpDir, "html");
fs.mkdirSync(htmlDir, { recursive: true });
fs.writeFileSync(htmlCachePath(firstPacket, htmlDir), fixtureHtml);

(async () => {
  const result = await writeSourceImageIntake({
    runId: "unit-cwa-source-image-intake",
    runDir: path.join(tmpDir, "run"),
    packetsPath: packetJsonPath,
    publicCsvPath: path.join(tmpDir, "intake.csv"),
    publicJsonPath: path.join(tmpDir, "intake.json"),
    publicRunbookPath: path.join(tmpDir, "intake.md"),
    product: firstPacket.product_id,
    packetId: firstPacket.packet_id,
    vintage: "",
    limit: 1,
    allowNetwork: false,
    htmlDir,
    summaryField: "",
  });
  assert.strictEqual(result.summary.selected_packets, 1, "fixture run should select one packet");
  assert.strictEqual(result.summary.source_pages_with_html, 1, "fixture run should use cached HTML");
  assert.strictEqual(result.summary.source_pages_with_image_candidates, 1, "fixture run should find image candidates");
  assert(result.summary.private_image_candidate_count >= 3, "fixture run should keep image candidates private");
  assert.strictEqual(result.publicRows[0].source_page_status, "image_candidate_found_needs_private_review", "public row should require private review");
  assert.strictEqual(result.publicRows[0].image_candidate_count, result.privateRows.length, "public row should publish candidate counts only");
  assert(fs.readFileSync(result.privateArtifacts.private_json_path, "utf8").includes("1930s-butterfinger-candy-wrapper-back-panel.jpg"), "private manifest should contain candidate image URLs");
  assert(!fs.readFileSync(path.join(tmpDir, "intake.json"), "utf8").includes("1930s-butterfinger-candy-wrapper-back-panel.jpg"), "public summary must not contain candidate image URLs");
  assertPublicSafe(fs.readFileSync(path.join(tmpDir, "intake.csv"), "utf8"), "fixture public CSV");
  assertPublicSafe(fs.readFileSync(path.join(tmpDir, "intake.json"), "utf8"), "fixture public JSON");
  assertPublicSafe(fs.readFileSync(path.join(tmpDir, "intake.md"), "utf8"), "fixture public runbook");

  const generatedSummary = JSON.parse(fs.readFileSync(publicJsonPath, "utf8"));
  const generatedRows = parseCsv(fs.readFileSync(publicCsvPath, "utf8"));
  const generatedRunbook = fs.readFileSync(publicRunbookPath, "utf8");
  const siteSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  assert.strictEqual(generatedSummary.schema_version, "confection_wrapper_source_image_intake.v1", "generated summary should use expected schema");
  assert.strictEqual(generatedSummary.selected_packets, 49, "generated summary should cover all known CWA source packets");
  assert.strictEqual(generatedRows.length, 49, "generated public CSV should have one row per CWA source packet");
  assert.strictEqual(generatedSummary.public_safety.image_urls_committed, false, "public summary must not commit image URLs");
  assert.strictEqual(generatedSummary.public_safety.images_committed, false, "public summary must not commit images");
  assert.strictEqual(generatedSummary.public_safety.manual_verified_created, false, "source image intake cannot create manual verification");
  assert(generatedRunbook.includes("Source Image Intake"), "runbook should identify source image intake");
  assert(siteSummary.confection_wrapper_source_image_intake_summary, "site summary should expose source image intake");
  assert(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts.source_image_intake_csv, "ingredient priority summary should link source image intake CSV");
  assertPublicSafe(fs.readFileSync(publicCsvPath, "utf8"), "generated public CSV");
  assertPublicSafe(fs.readFileSync(publicJsonPath, "utf8"), "generated public JSON");
  assertPublicSafe(generatedRunbook, "generated public runbook");

  console.log("confection wrapper source image intake tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
