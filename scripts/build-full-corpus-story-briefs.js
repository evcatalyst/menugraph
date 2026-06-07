const path = require("path");
const {
  argValue,
  normalizeText,
  pathFromArg,
  publicArtifactRef,
  readJson,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");
const defaultJsonPath = path.join(root, "docs/data/product-evidence/exports/full_corpus_story_briefs.json");
const defaultCsvPath = path.join(root, "docs/data/product-evidence/exports/full_corpus_story_briefs.csv");
const defaultMarkdownPath = path.join(root, "docs/data/product-evidence/exports/full_corpus_story_briefs.md");
const defaultSummaryPath = path.join(root, "docs/data/product-evidence/full_corpus_story_briefs_summary.json");
const generatedAt = "2026-06-07T20:45:00Z";

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function siteHref(filePath) {
  return publicArtifactRef(filePath).replace(/^docs\/data\//, "../data/");
}

function sourceUrl(row = {}) {
  return normalizeText(row.source_photo_url || row.url || row.source_url || row.archive_url);
}

function displayPolicy(row = {}) {
  return normalizeText(row.image_display_policy || (sourceUrl(row) ? "source_link_only_no_public_image" : "missing_source_image"));
}

function sourceHost(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return normalizeText(value).replace(/^https?:\/\//, "").split("/")[0];
  }
}

function versionEvidence(product, version) {
  const ids = new Set(version.evidence_ids || []);
  return (product.evidence || []).filter((row) => ids.has(row.id));
}

function canSay(product, version, evidenceRows) {
  if (version.gap_resolution?.can_say) return version.gap_resolution.can_say;
  if (numeric(version.source_count) > 0) {
    return `${product.name} has ${version.source_count} source-linked receipt${version.source_count === 1 ? "" : "s"} for ${version.label}; this supports story/navigation context only.`;
  }
  return `${product.name} has no source-attributable evidence for ${version.label} in the current registry.`;
}

function cannotSay(product, version) {
  if (version.gap_resolution?.cannot_say) return version.gap_resolution.cannot_say;
  if (version.status === "manual_verified") return "Do not generalize beyond the verified SKU/package/date scope.";
  return "Do not publish ingredient changes, original recipes, or formulation diffs until label text is manually verified.";
}

function nextProof(version, evidenceRows) {
  if (version.next_step) return version.next_step;
  if (evidenceRows.some((row) => /label|ingredient/i.test(`${row.label_panel_state || ""} ${row.photo_role || ""}`))) {
    return "Capture a readable panel crop, run OCR/manual correction, and record reviewer attribution.";
  }
  return "Find or review source-attributable package, document, archive, menu, or catalog evidence.";
}

function chapterFromVersion(product, version) {
  const evidenceRows = versionEvidence(product, version);
  const sourceRows = evidenceRows.filter((row) => sourceUrl(row));
  const embedRows = evidenceRows.filter((row) => displayPolicy(row) === "embed_rights_cleared");
  const linkOnlyRows = evidenceRows.filter((row) => /link_only|source_link/.test(displayPolicy(row)));
  const candidateText = Boolean(version.label_extract) || evidenceRows.some((row) => row.visible_extract);
  return {
    id: version.id,
    vintage: version.vintage,
    label: version.label,
    year: version.year,
    status: version.status,
    confidence: numeric(version.confidence),
    source_count: numeric(version.source_count || evidenceRows.length),
    source_receipts: sourceRows.length,
    public_embeds: embedRows.length,
    link_only_receipts: linkOnlyRows.length,
    candidate_text: candidateText,
    photo_role: version.photo_quality?.role || "not classified",
    panel_state: version.photo_quality?.label_panel || "not reviewed",
    package_context: version.package_context || "",
    price_weight_context: version.price_weight_context || "",
    headline: version.headline || version.label,
    can_say: canSay(product, version, evidenceRows),
    cannot_say: cannotSay(product, version),
    next_proof: nextProof(version, evidenceRows),
    source_hosts: [...new Set(sourceRows.map((row) => sourceHost(sourceUrl(row))).filter(Boolean))].slice(0, 6),
  };
}

function productStory(product) {
  const evidenceRows = product.evidence || [];
  const chapters = (product.versions || []).map((version) => chapterFromVersion(product, version));
  const publicEmbeds = evidenceRows.filter((row) => displayPolicy(row) === "embed_rights_cleared").length;
  const sourceReceipts = evidenceRows.filter((row) => sourceUrl(row)).length;
  const linkOnlyReceipts = evidenceRows.filter((row) => /link_only|source_link/.test(displayPolicy(row))).length;
  const candidateTextChapters = chapters.filter((row) => row.candidate_text).length;
  const sourceGaps = chapters.filter((row) => row.status === "source_discovery_needed" || row.status === "gap_publishable").length;
  return {
    product_id: product.id,
    product_name: product.name,
    brand: product.brand || "",
    category: product.category || "",
    corpus_scope: product.corpus_scope,
    story_status: product.pilot_rollup_status || product.story_resolution?.status || "story_ready",
    claim_status: product.claim_rollup_status || "needs_manual_verification",
    source_backed_slots: numeric(product.source_backed_slots),
    total_slots: numeric(product.total_slots || chapters.length),
    coverage: numeric(product.coverage),
    verified_labels: numeric(product.verified_labels),
    candidate_count: numeric(product.candidate_count),
    candidate_text_chapters: candidateTextChapters,
    source_receipts: sourceReceipts,
    link_only_receipts: linkOnlyReceipts,
    public_embeds: publicEmbeds,
    source_gaps: sourceGaps,
    public_photo_mode: publicEmbeds ? "mixed_embed_and_source_receipts" : "source_receipts_only",
    identity_scope: product.identity_scope || "",
    maker_timeline: product.maker_timeline || "",
    claim_boundary: product.claim_boundary || "No formulation claim is promoted without manual verification metadata.",
    next_unlock: product.next_unlock || "Review source receipts, capture readable panels, and record reviewer attribution.",
    summary: product.summary || "",
    story_thesis: product.story_thesis || "",
    blocked_lanes: (product.blocked_map || []).map((row) => ({
      lane: row.lane,
      status: row.status,
      why: row.why,
      photo_target: row.photo_target,
    })),
    chapters,
  };
}

function csvHeaders() {
  return [
    "product_id",
    "product_name",
    "category",
    "corpus_scope",
    "story_status",
    "claim_status",
    "source_backed_slots",
    "total_slots",
    "coverage",
    "verified_labels",
    "candidate_text_chapters",
    "source_receipts",
    "link_only_receipts",
    "public_embeds",
    "source_gaps",
    "public_photo_mode",
    "claim_boundary",
    "next_unlock",
  ];
}

function csvRows(stories) {
  return stories.map((story) => Object.fromEntries(csvHeaders().map((header) => [header, story[header]])));
}

function markdownEscape(value) {
  return normalizeText(value).replace(/\|/g, "\\|");
}

function markdownForStory(story) {
  const lines = [
    `## ${story.product_name}`,
    "",
    `- Scope: ${story.corpus_scope}`,
    `- Story status: ${story.story_status}`,
    `- Claim status: ${story.claim_status}`,
    `- Source-backed slots: ${story.source_backed_slots}/${story.total_slots}`,
    `- Public photo mode: ${story.public_photo_mode}`,
    `- Source receipts: ${story.source_receipts}`,
    `- Candidate text chapters: ${story.candidate_text_chapters}`,
    `- Public image embeds: ${story.public_embeds}`,
    `- Boundary: ${story.claim_boundary}`,
    `- Next unlock: ${story.next_unlock}`,
    "",
    "| Era | Status | Source receipts | Candidate text | Can say | Cannot say | Next proof |",
    "| --- | --- | ---: | --- | --- | --- | --- |",
    ...story.chapters.map((chapter) => [
      markdownEscape(chapter.label),
      markdownEscape(chapter.status),
      chapter.source_receipts,
      chapter.candidate_text ? "yes" : "no",
      markdownEscape(chapter.can_say),
      markdownEscape(chapter.cannot_say),
      markdownEscape(chapter.next_proof),
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |")),
    "",
    "Blocked lanes:",
    ...(story.blocked_lanes.length
      ? story.blocked_lanes.map((lane) => `- ${lane.lane}: ${lane.status}. ${lane.why} Next photo target: ${lane.photo_target}`)
      : ["- No blocked lane map recorded."]),
    "",
  ];
  return lines.join("\n");
}

function markdownDocument(stories) {
  return [
    "# Full-Corpus Product Evidence Story Briefs",
    "",
    `Generated: ${generatedAt}`,
    "",
    "These briefs are source/story handoffs. Ingredient text remains candidate-only unless a chapter is explicitly manual-verified.",
    "",
    ...stories.map(markdownForStory),
  ].join("\n");
}

function buildSummary({ stories, jsonPath, csvPath, markdownPath }) {
  const publicEmbeds = stories.reduce((sum, story) => sum + story.public_embeds, 0);
  const linkOnlyReceipts = stories.reduce((sum, story) => sum + story.link_only_receipts, 0);
  return {
    schema_version: "full_corpus_story_briefs_summary.v1",
    generated_at: generatedAt,
    product_count: stories.length,
    story_rich_pilot_count: stories.filter((story) => story.corpus_scope === "story_rich_pilot").length,
    proof_shell_count: stories.filter((story) => story.corpus_scope === "full_corpus_shell").length,
    products_with_candidate_text: stories.filter((story) => story.candidate_text_chapters > 0).length,
    products_with_source_gaps: stories.filter((story) => story.source_gaps > 0).length,
    source_receipts: stories.reduce((sum, story) => sum + story.source_receipts, 0),
    link_only_receipts: linkOnlyReceipts,
    public_embeds: publicEmbeds,
    public_safety: {
      candidate_only: true,
      manual_verified_created: false,
      claim_promotion_allowed: false,
      only_embed_rights_cleared_images: true,
      external_images_published: publicEmbeds > 0,
      private_paths_committed: false,
    },
    public_policy: "Story briefs can show source receipts and candidate text state. Ingredient claims still require manual verification; external photos remain link-only unless marked embed_rights_cleared.",
    public_artifacts: {
      story_briefs_json: publicArtifactRef(jsonPath),
      story_briefs_csv: publicArtifactRef(csvPath),
      story_briefs_markdown: publicArtifactRef(markdownPath),
    },
    site_artifacts: {
      story_briefs_json: siteHref(jsonPath),
      story_briefs_csv: siteHref(csvPath),
      story_briefs_markdown: siteHref(markdownPath),
    },
  };
}

function buildFullCorpusStoryBriefs({
  navigatorDataPath = navigatorPath,
  siteSummaryPath = summaryPath,
  publicJsonPath = defaultJsonPath,
  publicCsvPath = defaultCsvPath,
  publicMarkdownPath = defaultMarkdownPath,
  publicSummaryPath = defaultSummaryPath,
  updateSiteData = true,
} = {}) {
  const navigator = readJson(navigatorDataPath, {});
  const stories = (navigator.products || []).map(productStory);
  const payload = {
    schema_version: "full_corpus_story_briefs.v1",
    generated_at: generatedAt,
    stories,
  };
  writeJson(publicJsonPath, payload);
  writeCsv(publicCsvPath, csvHeaders(), csvRows(stories));
  require("fs").mkdirSync(path.dirname(publicMarkdownPath), { recursive: true });
  require("fs").writeFileSync(publicMarkdownPath, `${markdownDocument(stories)}\n`);
  const summary = buildSummary({ stories, jsonPath: publicJsonPath, csvPath: publicCsvPath, markdownPath: publicMarkdownPath });
  writeJson(publicSummaryPath, summary);

  if (updateSiteData) {
    navigator.full_corpus_story_briefs_summary = summary;
    writeJson(navigatorDataPath, navigator);
    const siteSummary = readJson(siteSummaryPath, {});
    siteSummary.full_corpus_story_briefs_summary = summary;
    writeJson(siteSummaryPath, siteSummary);
  }
  return { stories, summary };
}

function main() {
  const result = buildFullCorpusStoryBriefs({
    navigatorDataPath: pathFromArg("navigator", navigatorPath),
    siteSummaryPath: pathFromArg("site-summary", summaryPath),
    publicJsonPath: pathFromArg("json", defaultJsonPath),
    publicCsvPath: pathFromArg("csv", defaultCsvPath),
    publicMarkdownPath: pathFromArg("markdown", defaultMarkdownPath),
    publicSummaryPath: pathFromArg("summary", defaultSummaryPath),
    updateSiteData: argValue("update-site-data", "1") !== "0",
  });
  console.log(JSON.stringify({
    product_count: result.summary.product_count,
    proof_shell_count: result.summary.proof_shell_count,
    source_receipts: result.summary.source_receipts,
    public_embeds: result.summary.public_embeds,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildFullCorpusStoryBriefs,
  productStory,
  chapterFromVersion,
};
