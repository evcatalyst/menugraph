const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { buildFullCorpusStoryBriefs } = require("./build-full-corpus-story-briefs");

function assertNoPrivatePaths(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaked a private path`);
}

const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "full-corpus-story-briefs-"));
const fixtureNavigator = path.join(runDir, "navigator.json");
const fixtureSummary = path.join(runDir, "summary.json");
const outputJson = path.join(runDir, "stories.json");
const outputCsv = path.join(runDir, "stories.csv");
const outputMd = path.join(runDir, "stories.md");
const outputSummary = path.join(runDir, "stories-summary.json");

fs.writeFileSync(fixtureNavigator, `${JSON.stringify({
  products: [
    {
      id: "sample_cookie",
      name: "Sample Cookie",
      brand: "Sample",
      category: "cookies",
      corpus_scope: "full_corpus_shell",
      pilot_rollup_status: "full_corpus_selectable",
      claim_rollup_status: "needs_manual_verification",
      source_backed_slots: 1,
      total_slots: 2,
      coverage: 50,
      candidate_count: 2,
      verified_labels: 0,
      claim_boundary: "Candidate label only; no formulation claim.",
      next_unlock: "Review panel crop.",
      versions: [
        {
          id: "current",
          vintage: "current_2020s",
          label: "Current SKU anchor",
          year: 2026,
          status: "label_text_candidate",
          source_count: 1,
          evidence_ids: ["sample_source"],
          label_extract: { observed_text: "candidate text" },
          photo_quality: { role: "package page", label_panel: "ingredient text signal" },
          next_step: "Correct OCR and record reviewer.",
        },
        {
          id: "gap",
          vintage: "1990s",
          label: "1990s bridge",
          year: 1993,
          status: "source_discovery_needed",
          source_count: 0,
          evidence_ids: [],
        },
      ],
      evidence: [
        {
          id: "sample_source",
          url: "https://example.com/sample-cookie",
          source_photo_url: "https://example.com/sample-cookie",
          image_display_policy: "source_link_only_no_public_image",
          label_panel_state: "ingredient text candidate",
        },
      ],
      blocked_map: [
        {
          lane: "Ingredient transcription",
          status: "needs_label_transcription",
          why: "Needs corrected OCR.",
          photo_target: "Ingredient panel crop.",
        },
      ],
    },
  ],
}, null, 2)}\n`);
fs.writeFileSync(fixtureSummary, "{}\n");

const result = buildFullCorpusStoryBriefs({
  navigatorDataPath: fixtureNavigator,
  siteSummaryPath: fixtureSummary,
  publicJsonPath: outputJson,
  publicCsvPath: outputCsv,
  publicMarkdownPath: outputMd,
  publicSummaryPath: outputSummary,
  updateSiteData: false,
});

assert.strictEqual(result.summary.product_count, 1, "fixture should produce one story");
assert.strictEqual(result.summary.public_embeds, 0, "fixture should not publish external images");
assert.strictEqual(result.summary.public_safety.manual_verified_created, false, "story briefs cannot create manual verification");
assert.strictEqual(result.summary.public_safety.claim_promotion_allowed, false, "story briefs cannot allow claim promotion");
assert.strictEqual(result.stories[0].candidate_text_chapters, 1, "candidate text chapter should be counted");
assert.strictEqual(result.stories[0].public_photo_mode, "source_receipts_only", "source-only photo mode expected");
assert(fs.readFileSync(outputMd, "utf8").includes("Sample Cookie"), "markdown should include product story");
assert(fs.readFileSync(outputCsv, "utf8").includes("source_receipts_only"), "CSV should include public photo mode");
assertNoPrivatePaths(fs.readFileSync(outputJson, "utf8"), "fixture JSON");
assertNoPrivatePaths(fs.readFileSync(outputCsv, "utf8"), "fixture CSV");
assertNoPrivatePaths(fs.readFileSync(outputMd, "utf8"), "fixture Markdown");

const root = path.join(__dirname, "..");
const defaultJson = path.join(root, "docs/data/product-evidence/exports/full_corpus_story_briefs.json");
const defaultCsv = path.join(root, "docs/data/product-evidence/exports/full_corpus_story_briefs.csv");
const defaultMd = path.join(root, "docs/data/product-evidence/exports/full_corpus_story_briefs.md");
const defaultSummary = path.join(root, "docs/data/product-evidence/full_corpus_story_briefs_summary.json");
assert(fs.existsSync(defaultJson), "default full-corpus story JSON should exist");
assert(fs.existsSync(defaultCsv), "default full-corpus story CSV should exist");
assert(fs.existsSync(defaultMd), "default full-corpus story Markdown should exist");
assert(fs.existsSync(defaultSummary), "default full-corpus story summary should exist");
const defaultPayload = JSON.parse(fs.readFileSync(defaultJson, "utf8"));
const defaultSummaryPayload = JSON.parse(fs.readFileSync(defaultSummary, "utf8"));
assert.strictEqual(defaultPayload.stories.length, 120, "default story export should cover the 120-product corpus");
assert.strictEqual(defaultSummaryPayload.product_count, 120, "default summary should cover the 120-product corpus");
assert.strictEqual(defaultSummaryPayload.public_safety.manual_verified_created, false, "default story export cannot create manual verification");
assert.strictEqual(defaultSummaryPayload.public_safety.claim_promotion_allowed, false, "default story export cannot allow claim promotion");
assertNoPrivatePaths(fs.readFileSync(defaultJson, "utf8"), "default JSON");
assertNoPrivatePaths(fs.readFileSync(defaultCsv, "utf8"), "default CSV");
assertNoPrivatePaths(fs.readFileSync(defaultMd, "utf8"), "default Markdown");

console.log("full-corpus story brief tests passed");
