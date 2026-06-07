const fs = require("fs");
const path = require("path");
const {
  countBy,
  publicArtifactRef,
  readJson,
  shortHash,
  slug,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const captureHandoffPath = path.join(root, "docs/data/product-evidence/confection_wrapper_capture_handoff.json");
const itemCandidateJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_item_candidates.json");
const itemCandidateCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_candidates.csv");
const itemGapCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_candidate_gaps.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_item_candidate_runbook.md");
const generatedAt = "2026-06-08T01:50:00Z";
const sourceDomain = "www.candywrapperarchive.com";

const collectionItemSeeds = {
  "https://www.candywrapperarchive.com/candy-collection/snickers/": [
    ["1939 Snickers", "https://www.candywrapperarchive.com/candy-collector/1940s-snickers/", "/wp-content/uploads/2013/02/Image167_th.jpg"],
    ["1940s Snickers", "https://www.candywrapperarchive.com/candy-collector/1940s-snickers-2/", "/wp-content/uploads/2013/02/Image363_th.jpg"],
    ["1950s Snickers", "https://www.candywrapperarchive.com/candy-collector/1950s-snickers/", "/wp-content/uploads/2013/02/Image1039_th.jpg"],
    ["1983 Snickers", "https://www.candywrapperarchive.com/candy-collector/1983-snickers/", "/wp-content/uploads/2013/02/Image530_th.jpg"],
    ["1990 Snickers", "https://www.candywrapperarchive.com/candy-collector/1990-snickers/", "/wp-content/uploads/2013/02/Image88_th.jpg"],
    ["2002 Snickers", "https://www.candywrapperarchive.com/candy-collector/2002-snickers/", "/wp-content/uploads/2013/02/Image467_th.jpg"],
  ],
  "https://www.candywrapperarchive.com/candy-collection/twix/": [
    ["2002 Twix", "https://www.candywrapperarchive.com/candy-collector/2002-twix/", "/wp-content/uploads/2013/02/Image289_th.jpg"],
    ["2003 Twix", "https://www.candywrapperarchive.com/candy-collector/2003-twix/", "/wp-content/uploads/2013/02/Image602_th.jpg"],
    ["2004 Twix", "https://www.candywrapperarchive.com/candy-collector/2004-twix/", "/wp-content/uploads/2013/02/Image575_th.jpg"],
    ["2006 Twix", "https://www.candywrapperarchive.com/candy-collector/2006-twix/", "/wp-content/uploads/2013/02/Image600_th.jpg"],
    ["2009 Twix", "https://www.candywrapperarchive.com/candy-collector/2009-twix/", "/wp-content/uploads/2013/02/Image789_th.jpg"],
  ],
  "https://www.candywrapperarchive.com/candy-collection/kit-kat/": [
    ["1960s Kit Kat", "https://www.candywrapperarchive.com/candy-collector/1960s-kit-kat/", "/wp-content/uploads/2013/02/Image25_th.jpg"],
    ["1970s Kit Kat", "https://www.candywrapperarchive.com/candy-collector/1970s-kit-kat/", "/wp-content/uploads/2013/02/Image29_th.jpg"],
    ["2000 Kit Kat", "https://www.candywrapperarchive.com/candy-collector/2000-kit-kat/", "/wp-content/uploads/2013/02/Image412_th.jpg"],
    ["2002 Kit Kat", "https://www.candywrapperarchive.com/candy-collector/2002-kit-kat/", "/wp-content/uploads/2013/02/Image258_th.jpg"],
    ["2006 Kit Kat", "https://www.candywrapperarchive.com/candy-collector/2006-kit-kat/", "/wp-content/uploads/2013/02/Image682_th.jpg"],
    ["2007 Kit Kat", "https://www.candywrapperarchive.com/candy-collector/2007-kit-kat/", "/wp-content/uploads/2013/02/Image433_th.jpg"],
  ],
  "https://www.candywrapperarchive.com/candy-collection/milky-way/": [
    ["1939 Milky Way", "https://www.candywrapperarchive.com/candy-collector/1939-milky-way/", "/wp-content/uploads/2013/02/Image403_th.jpg"],
    ["1940s Milky Way", "https://www.candywrapperarchive.com/candy-collector/1940s-milky-way/", "/wp-content/uploads/2013/02/Image722_th.jpg"],
    ["1950s Milky Way", "https://www.candywrapperarchive.com/candy-collector/1950s-milky-way-2/", "/wp-content/uploads/2013/02/Image80_th.jpg"],
    ["1958 Milky Way", "https://www.candywrapperarchive.com/candy-collector/1958-milky-way/", "/wp-content/uploads/2013/04/Image1175_th.jpg"],
  ],
  "https://www.candywrapperarchive.com/candy-collection/butterfinger/": [
    ["1930s Butterfinger", "https://www.candywrapperarchive.com/candy-collector/1930s-butterfinger-2/", "/wp-content/uploads/2013/02/Image17_th.jpg"],
    ["1936 Butterfinger", "https://www.candywrapperarchive.com/candy-collector/1936-butterfinger/", "/wp-content/uploads/2013/02/Image394_th.jpg"],
    ["1950 Butterfinger", "https://www.candywrapperarchive.com/candy-collector/1950-butterfinger-2/", "/wp-content/uploads/2013/02/Image380_th.jpg"],
    ["1964 Butterfinger", "https://www.candywrapperarchive.com/candy-collector/1964-butterfinger/", "/wp-content/uploads/2013/02/Image295_th.jpg"],
    ["1975 Butterfinger", "https://www.candywrapperarchive.com/candy-collector/1975-butterfinger/", "/wp-content/uploads/2013/02/Image540_th.jpg"],
    ["1980s Butterfinger", "https://www.candywrapperarchive.com/candy-collector/1980s-butterfinger/", "/wp-content/uploads/2013/02/Image172_th.jpg"],
    ["2002 Butterfinger", "https://www.candywrapperarchive.com/candy-collector/2002-butterfinger/", "/wp-content/uploads/2013/02/Image482_th.jpg"],
    ["2009 Butterfinger", "https://www.candywrapperarchive.com/candy-collector/2009-butterfinger/", "/wp-content/uploads/2013/02/Image408_th.jpg"],
  ],
  "https://www.candywrapperarchive.com/candy-collection/hershey/": [
    ["1908 Hershey", "https://www.candywrapperarchive.com/candy-collector/1908-hershey-wrapper/", "/wp-content/uploads/2013/02/Image11_th.jpg"],
    ["1910 Hershey", "https://www.candywrapperarchive.com/candy-collector/1910-hershey/", "/wp-content/uploads/2013/04/Image1192_th.jpg"],
    ["1930s Hershey", "https://www.candywrapperarchive.com/candy-collector/1930s-hershey/", "/wp-content/uploads/2013/04/Image1189_th.jpg"],
    ["1940 Hershey", "https://www.candywrapperarchive.com/candy-collector/1940-hershey/", "/wp-content/uploads/2013/02/Image963_th.jpg"],
    ["1950s Hershey", "https://www.candywrapperarchive.com/candy-collector/1950s-hershey/", "/wp-content/uploads/2013/02/Image161_th.jpg"],
    ["1960s Hershey", "https://www.candywrapperarchive.com/candy-collector/1960s-hershey/", "/wp-content/uploads/2013/02/Image32_th.jpg"],
  ],
  "https://www.candywrapperarchive.com/candy-collection/mms/": [
    ["1970s M&Ms", "https://www.candywrapperarchive.com/candy-collector/1970s-mms/", "/wp-content/uploads/2013/02/Image1121_th.jpg"],
    ["1997 M&M", "https://www.candywrapperarchive.com/candy-collector/1997-mm/", "/wp-content/uploads/2013/02/Image55_th.jpg"],
    ["1997 M&M", "https://www.candywrapperarchive.com/candy-collector/1997-mm-2/", "/wp-content/uploads/2013/02/Image56_th.jpg"],
    ["1998 M&M", "https://www.candywrapperarchive.com/candy-collector/1998-mm/", "/wp-content/uploads/2013/02/Image45_th.jpg"],
    ["1998 M&M", "https://www.candywrapperarchive.com/candy-collector/1998-mm-2/", "/wp-content/uploads/2013/02/Image51_th.jpg"],
  ],
  "https://www.candywrapperarchive.com/candy-collection/resses/": [
    ["1940s Reeses Bag", "https://www.candywrapperarchive.com/candy-collector/1940s-reeses-bag/", "/wp-content/uploads/2013/02/Image50_th.jpg"],
    ["1970s Reeses", "https://www.candywrapperarchive.com/candy-collector/1970s-reeses/", "/wp-content/uploads/2013/02/Image78_th.jpg"],
    ["1980s Reeses", "https://www.candywrapperarchive.com/candy-collector/1980s-reeses/", "/wp-content/uploads/2013/02/Image26_th.jpg"],
    ["1991 Reeses", "https://www.candywrapperarchive.com/candy-collector/1991-reeses/", "/wp-content/uploads/2013/02/Image623_th.jpg"],
    ["2002 Reeses", "https://www.candywrapperarchive.com/candy-collector/2002-reeses/", "/wp-content/uploads/2013/02/Image275_th.jpg"],
    ["2003 Reeses", "https://www.candywrapperarchive.com/candy-collector/2003-reeses/", "/wp-content/uploads/2013/02/Image269_th.jpg"],
    ["2005 Reeses", "https://www.candywrapperarchive.com/candy-collector/2005-reeses/", "/wp-content/uploads/2013/02/Image270_th.jpg"],
  ],
};

const itemPageDetails = {
  "https://www.candywrapperarchive.com/candy-collector/1960s-tootsie-roll-2/": {
    item_title: "1960s Tootsie Roll",
    thumbnail_url: "https://www.candywrapperarchive.com/wp-content/uploads/2013/02/Image997_th.jpg",
    source_image_url: "https://www.candywrapperarchive.com/wp-content/uploads/2013/02/Image997.jpg",
    claimed_date_text: "1960s",
    source_note: "Item page states: 1960s, Tootsie Roll, Tootsie Roll Industries Inc, USA, 1 3/4oz.",
  },
  "https://www.candywrapperarchive.com/candy-collector/1940s-tootsie-roll/": {
    item_title: "1940s Tootsie Roll",
    thumbnail_url: "https://www.candywrapperarchive.com/wp-content/uploads/2013/02/Image209_th.jpg",
    source_image_url: "https://www.candywrapperarchive.com/wp-content/uploads/2013/02/Image209.jpg",
    claimed_date_text: "1940s",
    source_note: "Item page states: 1940s, Tootsie Roll, Sweets Company of America Inc, USA, 1 1/2oz.",
  },
};

function absoluteArchiveUrl(value = "") {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${sourceDomain}${value.startsWith("/") ? "" : "/"}${value}`;
}

function claimedDate(title = "") {
  const exact = title.match(/\b(19|20)\d{2}\b/);
  if (exact) return { claimed_year: exact[0], claimed_decade: `${exact[0].slice(0, 3)}0s` };
  const decade = title.match(/\b(19|20)\d0s\b/);
  return { claimed_year: "", claimed_decade: decade ? decade[0] : "" };
}

function candidateId(parentRow = {}, itemUrl = "") {
  return `cwa_item_${slug(parentRow.product_id)}_${shortHash(`${parentRow.evidence_id}:${itemUrl}`, 10)}`;
}

function candidatePriority(parentRow = {}, seedIndex = 0) {
  const base = { high: 100, medium: 70, low: 45 }[parentRow.ocr_priority] || 35;
  const laneBonus = parentRow.panel_acquisition_state === "item_page_screenshot_panel_triage" ? 20 : 0;
  const earlyBonus = seedIndex < 2 ? 8 : 0;
  return base + laneBonus + earlyBonus;
}

function candidateFromSeed(parentRow, seed, seedIndex) {
  const [itemTitle, itemUrl, thumbnailUrl] = seed;
  const dates = claimedDate(itemTitle);
  return {
    candidate_id: candidateId(parentRow, itemUrl),
    parent_capture_evidence_id: parentRow.evidence_id,
    parent_source_review_task_id: parentRow.source_review_task_id,
    product_id: parentRow.product_id,
    product_name: parentRow.product_name,
    source_domain: sourceDomain,
    source_collection_url: parentRow.source_url,
    item_url: itemUrl,
    item_title: itemTitle,
    claimed_date_text: dates.claimed_year || dates.claimed_decade || itemTitle,
    claimed_year: dates.claimed_year,
    claimed_decade: dates.claimed_decade,
    thumbnail_url: absoluteArchiveUrl(thumbnailUrl),
    source_image_url: "",
    candidate_type: "collection_item_candidate",
    candidate_rank: seedIndex + 1,
    candidate_priority_score: candidatePriority(parentRow, seedIndex),
    panel_review_state: "needs_panel_readability_review",
    photo_role_expected: "wrapper_front_or_package_context_first",
    capture_strategy: "open_item_page_then_private_screenshot_panel_triage",
    ingredient_claim_status: "blocked_pending_readable_panel",
    next_action: "Open item page, capture private page/wrapper crop, classify whether any ingredient or nutrition panel is readable.",
    publication_image_policy: "source_link_only_no_public_image",
    rights_review_status: "rights_review_needed",
    candidate_only: 1,
    manual_verified: 0,
  };
}

function candidateFromItemPage(parentRow) {
  const details = itemPageDetails[parentRow.source_url] || {};
  const itemTitle = details.item_title || parentRow.source_title;
  const dates = claimedDate(details.claimed_date_text || itemTitle);
  return {
    candidate_id: candidateId(parentRow, parentRow.source_url),
    parent_capture_evidence_id: parentRow.evidence_id,
    parent_source_review_task_id: parentRow.source_review_task_id,
    product_id: parentRow.product_id,
    product_name: parentRow.product_name,
    source_domain: sourceDomain,
    source_collection_url: "",
    item_url: parentRow.source_url,
    item_title: itemTitle,
    claimed_date_text: details.claimed_date_text || dates.claimed_year || dates.claimed_decade || itemTitle,
    claimed_year: dates.claimed_year,
    claimed_decade: dates.claimed_decade,
    thumbnail_url: details.thumbnail_url || "",
    source_image_url: details.source_image_url || "",
    candidate_type: "existing_item_page_candidate",
    candidate_rank: 1,
    candidate_priority_score: candidatePriority(parentRow, 0),
    panel_review_state: "needs_panel_readability_review",
    photo_role_expected: "wrapper_item_page_with_possible_package_text",
    capture_strategy: "private_item_page_screenshot_then_panel_triage",
    ingredient_claim_status: "blocked_pending_readable_panel",
    next_action: "Capture private screenshot/crop and classify visible wrapper text, net weight, maker, date cue, and panel readability.",
    publication_image_policy: "source_link_only_no_public_image",
    rights_review_status: "rights_review_needed",
    source_note: details.source_note || "",
    candidate_only: 1,
    manual_verified: 0,
  };
}

function gapFromRow(parentRow) {
  return {
    gap_id: `cwa_item_gap_${slug(parentRow.product_id)}_${shortHash(parentRow.evidence_id, 8)}`,
    parent_capture_evidence_id: parentRow.evidence_id,
    product_id: parentRow.product_id,
    product_name: parentRow.product_name,
    gap_type: "source_hunt_before_item_candidate",
    source_domain: sourceDomain,
    search_queries: parentRow.search_queries || "",
    reason: "No Candy Wrapper Archive item or collection URL has been attached yet.",
    next_action: "Run constrained archive search, attach a source URL, then regenerate item candidates.",
    candidate_only: 1,
    manual_verified: 0,
  };
}

function buildItemCandidates(captureManifest = {}) {
  const candidates = [];
  const gaps = [];
  for (const row of captureManifest.rows || []) {
    if (row.panel_acquisition_state === "source_hunt_before_capture") {
      gaps.push(gapFromRow(row));
      continue;
    }
    if (row.panel_acquisition_state === "item_page_screenshot_panel_triage") {
      candidates.push(candidateFromItemPage(row));
      continue;
    }
    const seeds = collectionItemSeeds[row.source_url] || [];
    seeds.forEach((seed, index) => candidates.push(candidateFromSeed(row, seed, index)));
  }
  return {
    candidates: candidates.sort((a, b) => (
      b.candidate_priority_score - a.candidate_priority_score
      || a.product_name.localeCompare(b.product_name)
      || a.item_url.localeCompare(b.item_url)
    )),
    gaps,
  };
}

function buildManifest(candidates, gaps, captureManifest = {}) {
  return {
    schema_version: "confection_wrapper_item_candidates.v1",
    generated_at: generatedAt,
    source_domain: sourceDomain,
    source_capture_handoff: captureManifest.artifacts?.handoff_json || publicArtifactRef(captureHandoffPath),
    selection_policy: {
      scope: "Item-level Candy Wrapper Archive candidates for confection products with collection or item-page leads.",
      source_policy: "Use item links as source-attributable review targets; do not republish archive images unless rights are clear.",
      ingredient_gate: "Candidates do not support ingredient claims until a readable ingredient/nutrition panel is reviewed, OCRed, corrected, and manually verified.",
      network_policy: "This v1 artifact is generated from curated source-page observations; live fetching can refresh candidates in a future private run.",
    },
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      external_images_committed: false,
      thumbnail_urls_are_link_references_only: true,
      manual_verified_created: false,
    },
    totals: {
      item_candidates: candidates.length,
      products_with_item_candidates: new Set(candidates.map((row) => row.product_id)).size,
      collection_item_candidates: candidates.filter((row) => row.candidate_type === "collection_item_candidate").length,
      existing_item_page_candidates: candidates.filter((row) => row.candidate_type === "existing_item_page_candidate").length,
      source_hunt_gaps: gaps.length,
      high_priority_candidates: candidates.filter((row) => row.candidate_priority_score >= 100).length,
    },
    candidate_types: countBy(candidates, "candidate_type"),
    product_counts: countBy(candidates, "product_name"),
    gap_product_counts: countBy(gaps, "product_name"),
    first_candidates: candidates.slice(0, 16),
    source_hunt_gaps: gaps,
    artifacts: {
      item_candidates_json: publicArtifactRef(itemCandidateJsonPath),
      item_candidates_csv: publicArtifactRef(itemCandidateCsvPath),
      item_candidate_gaps_csv: publicArtifactRef(itemGapCsvPath),
      runbook_markdown: publicArtifactRef(runbookPath),
    },
    candidates,
  };
}

function renderRunbook(manifest = {}) {
  const lines = [
    "# Confection Wrapper Item Candidates",
    "",
    `Generated: ${manifest.generated_at}`,
    "",
    "This artifact reduces Candy Wrapper Archive collection leads into item-level review targets. It is a source-handoff layer, not ingredient verification.",
    "",
    "## Rules",
    "",
    "- Open item pages before private capture or OCR.",
    "- Treat thumbnail and source image URLs as link references only.",
    "- Classify wrapper front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility during review.",
    "- Do not promote ingredient claims without readable panel OCR, corrected transcription, reviewer attribution, and manual verification.",
    "",
    "## Totals",
    "",
    `- Item candidates: ${manifest.totals.item_candidates}`,
    `- Products with candidates: ${manifest.totals.products_with_item_candidates}`,
    `- Source-hunt gaps: ${manifest.totals.source_hunt_gaps}`,
    "",
    "## First Candidates",
    "",
  ];
  for (const row of manifest.first_candidates.slice(0, 12)) {
    lines.push(`- ${row.product_name}: ${row.item_title}; ${row.item_url}; ${row.next_action}`);
  }
  if (manifest.source_hunt_gaps.length) {
    lines.push("");
    lines.push("## Gaps");
    lines.push("");
    for (const gap of manifest.source_hunt_gaps) {
      lines.push(`- ${gap.product_name}: ${gap.next_action}`);
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function writeItemCandidates() {
  const captureManifest = readJson(captureHandoffPath, {});
  const { candidates, gaps } = buildItemCandidates(captureManifest);
  const manifest = buildManifest(candidates, gaps, captureManifest);
  const summary = readJson(summaryPath, {});
  summary.confection_wrapper_item_candidate_summary = {
    generated_at: manifest.generated_at,
    source_domain: manifest.source_domain,
    source_capture_handoff: manifest.source_capture_handoff,
    selection_policy: manifest.selection_policy,
    public_safety: manifest.public_safety,
    totals: manifest.totals,
    candidate_types: manifest.candidate_types,
    product_counts: manifest.product_counts,
    gap_product_counts: manifest.gap_product_counts,
    first_candidates: manifest.first_candidates.slice(0, 8),
    source_hunt_gaps: manifest.source_hunt_gaps,
    artifacts: manifest.artifacts,
  };

  writeJson(itemCandidateJsonPath, manifest);
  writeCsv(itemCandidateCsvPath, [
    "candidate_id",
    "parent_capture_evidence_id",
    "parent_source_review_task_id",
    "product_id",
    "product_name",
    "source_domain",
    "source_collection_url",
    "item_url",
    "item_title",
    "claimed_date_text",
    "claimed_year",
    "claimed_decade",
    "thumbnail_url",
    "source_image_url",
    "candidate_type",
    "candidate_rank",
    "candidate_priority_score",
    "panel_review_state",
    "photo_role_expected",
    "capture_strategy",
    "ingredient_claim_status",
    "next_action",
    "publication_image_policy",
    "rights_review_status",
    "source_note",
    "candidate_only",
    "manual_verified",
  ], candidates);
  writeCsv(itemGapCsvPath, [
    "gap_id",
    "parent_capture_evidence_id",
    "product_id",
    "product_name",
    "gap_type",
    "source_domain",
    "search_queries",
    "reason",
    "next_action",
    "candidate_only",
    "manual_verified",
  ], gaps);
  fs.mkdirSync(path.dirname(runbookPath), { recursive: true });
  fs.writeFileSync(runbookPath, renderRunbook(manifest));
  writeJson(summaryPath, summary);
  return manifest;
}

function main() {
  const manifest = writeItemCandidates();
  console.log(JSON.stringify({
    item_candidates: manifest.totals.item_candidates,
    products_with_item_candidates: manifest.totals.products_with_item_candidates,
    source_hunt_gaps: manifest.totals.source_hunt_gaps,
    item_candidates_csv: manifest.artifacts.item_candidates_csv,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildItemCandidates,
  buildManifest,
  collectionItemSeeds,
  writeItemCandidates,
};
