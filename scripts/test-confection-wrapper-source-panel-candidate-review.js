const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");
const {
  candidateReviewRows,
  surfaceGuess,
  writeSourcePanelCandidateReview,
} = require("./build-confection-wrapper-source-panel-candidate-review");

const root = path.join(__dirname, "..");
const publicCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_panel_candidate_review.csv");
const publicJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_source_panel_candidate_review.json");
const publicRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_panel_candidate_review_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertPublicSafe(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaks a private path`);
  assert(!/image_candidate_url/.test(text), `${label} leaks private image candidate field names`);
  assert(!/ingredient-panel-back\.jpg|wrapper-front\.jpg/.test(text), `${label} leaks fixture image URLs`);
}

const fixtureManifest = {
  schema_version: "confection_wrapper_source_image_intake_private.v1",
  generated_at: "2026-06-07T20:30:00Z",
  run_id: "fixture-source-image-intake",
  packets: [
    {
      packet_id: "fixture_packet_panel",
      packet_rank: 1,
      product_id: "fixture_bar",
      product_name: "Fixture Bar",
      vintage_label: "1970s",
      source_url: "https://www.candywrapperarchive.com/candy-collector/1970s-fixture-bar/",
      source_title: "1970s Fixture Bar source page",
      source_html_status: "source_html_fetched",
      private_html_path: "/private/fixture/source-page.html",
      candidates: [
        {
          kind: "img",
          url: "https://images.example.test/ingredient-panel-back.jpg",
          alt: "1970s Fixture Bar back ingredient panel",
          title: "Ingredient panel",
          className: "aligncenter size-full",
          id: "",
          score: 90,
        },
        {
          kind: "img",
          url: "https://images.example.test/wrapper-front.jpg",
          alt: "1970s Fixture Bar candy wrapper",
          title: "Wrapper front",
          className: "aligncenter size-full",
          id: "",
          score: 70,
        },
        {
          kind: "img",
          url: "https://images.example.test/cwa_title.png",
          alt: "",
          title: "",
          className: "",
          id: "",
          score: 56,
        },
      ],
    },
  ],
};

assert.strictEqual(surfaceGuess(fixtureManifest.packets[0].candidates[0], fixtureManifest.packets[0]), "ingredient_panel_candidate", "ingredient text should produce a primary panel candidate");
assert.strictEqual(surfaceGuess(fixtureManifest.packets[0].candidates[1], fixtureManifest.packets[0]), "wrapper_product_context_candidate", "wrapper-only text should stay secondary context");
assert.strictEqual(surfaceGuess(fixtureManifest.packets[0].candidates[2], fixtureManifest.packets[0]), "low_signal_exclude", "site chrome should be excluded");

const fixtureRows = candidateReviewRows(fixtureManifest, "fixture-panel-review");
assert.strictEqual(fixtureRows[0].surface_guess, "ingredient_panel_candidate", "ingredient panels should sort ahead of wrapper context");
assert.strictEqual(fixtureRows[0].review_priority, "high", "ingredient panel candidates should be high priority");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-source-panel-review-"));
const fixturePrivateManifestPath = path.join(tmpDir, "private-source-image-intake.json");
fs.writeFileSync(fixturePrivateManifestPath, JSON.stringify(fixtureManifest, null, 2));

const result = writeSourcePanelCandidateReview({
  runId: "unit-cwa-source-panel-candidate-review",
  runDir: path.join(tmpDir, "run"),
  privateManifestPath: fixturePrivateManifestPath,
  publicCsvPath: path.join(tmpDir, "panel-review.csv"),
  publicJsonPath: path.join(tmpDir, "panel-review.json"),
  publicRunbookPath: path.join(tmpDir, "panel-review.md"),
  limit: 0,
  summaryField: "",
});

assert.strictEqual(result.summary.selected_packets, 1, "fixture should summarize one packet");
assert.strictEqual(result.summary.packets_with_explicit_panel_signal, 1, "fixture should expose one packet with panel signal");
assert.strictEqual(result.summary.explicit_panel_signal_candidates, 1, "fixture should count one panel candidate");
assert.strictEqual(result.summary.wrapper_context_candidates, 1, "fixture should count one wrapper-context candidate");
assert.strictEqual(result.summary.low_signal_candidates, 1, "fixture should count one low-signal candidate");
assert(fs.readFileSync(result.privateArtifacts.private_json_path, "utf8").includes("ingredient-panel-back.jpg"), "private artifact should retain image URLs");
assert(!fs.readFileSync(path.join(tmpDir, "panel-review.json"), "utf8").includes("ingredient-panel-back.jpg"), "public JSON must not retain image URLs");
assertPublicSafe(fs.readFileSync(path.join(tmpDir, "panel-review.csv"), "utf8"), "fixture public CSV");
assertPublicSafe(fs.readFileSync(path.join(tmpDir, "panel-review.json"), "utf8"), "fixture public JSON");
assertPublicSafe(fs.readFileSync(path.join(tmpDir, "panel-review.md"), "utf8"), "fixture public runbook");

const generatedSummary = JSON.parse(fs.readFileSync(publicJsonPath, "utf8"));
const generatedRows = parseCsv(fs.readFileSync(publicCsvPath, "utf8"));
const generatedRunbook = fs.readFileSync(publicRunbookPath, "utf8");
const siteSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
assert.strictEqual(generatedSummary.schema_version, "confection_wrapper_source_panel_candidate_review.v1", "generated summary should use expected schema");
assert.strictEqual(generatedSummary.selected_packets, 49, "generated review should cover all CWA source packets");
assert.strictEqual(generatedRows.length, 49, "generated public CSV should have one row per source packet");
assert.strictEqual(generatedSummary.public_safety.image_urls_committed, false, "public summary must not commit image URLs");
assert.strictEqual(generatedSummary.public_safety.manual_verified_created, false, "candidate review cannot create manual verification");
assert(generatedRunbook.includes("Ingredient photos are primary"), "runbook should state ingredient-photo priority");
assert(siteSummary.confection_wrapper_source_panel_candidate_review_summary, "site summary should expose panel candidate review");
assert(siteSummary.confection_wrapper_source_image_intake_summary.source_panel_candidate_review_summary, "source image intake summary should nest panel candidate review");
assert(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts.source_panel_candidate_review_csv, "ingredient priority artifacts should link panel candidate review CSV");
assertPublicSafe(fs.readFileSync(publicCsvPath, "utf8"), "generated public CSV");
assertPublicSafe(fs.readFileSync(publicJsonPath, "utf8"), "generated public JSON");
assertPublicSafe(generatedRunbook, "generated public runbook");

console.log("confection wrapper source panel candidate review tests passed");
