const fs = require("fs");
const path = require("path");
const {
  argValue,
  countBy,
  ensureRunDirs,
  generatedAt,
  hasFlag,
  numberArg,
  pathFromArg,
  publicArtifactRef,
  readJson,
  redactPrivate,
  runDirFromArgs,
  runIdFromArgs,
  shortHash,
  slug,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");
const { selectPackets } = require("./build-confection-wrapper-ingredient-private-run");

const root = path.join(__dirname, "..");
const defaultPacketJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_capture_packets.json");
const defaultPublicCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_image_intake.csv");
const defaultPublicJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_source_image_intake.json");
const defaultPublicRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_image_intake_runbook.md");

function attributesForTag(tag = "") {
  const attrs = {};
  const pattern = /([a-zA-Z_:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match = pattern.exec(tag);
  while (match) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    match = pattern.exec(tag);
  }
  return attrs;
}

function firstSrcsetUrl(value = "") {
  const first = String(value || "").split(",")[0] || "";
  return first.trim().split(/\s+/)[0] || "";
}

function resolveUrl(value = "", baseUrl = "") {
  if (!value || /^data:/i.test(value)) return "";
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return "";
  }
}

function looksLikeImageUrl(value = "") {
  return /\.(jpe?g|png|webp|gif|tiff?)(?:[?#].*)?$/i.test(value);
}

function tokensFor(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function scoreCandidate(candidate = {}, packet = {}) {
  const haystack = [
    candidate.url,
    candidate.alt,
    candidate.title,
    candidate.className,
    candidate.id,
    candidate.kind,
  ].join(" ").toLowerCase();
  let score = 0;
  if (candidate.kind === "meta_image") score += 42;
  if (candidate.kind === "img") score += 28;
  if (candidate.kind === "image_link") score += 16;
  if (looksLikeImageUrl(candidate.url)) score += 12;
  if (/wrapper|candy|collector|package|packaging/.test(haystack)) score += 16;
  if (/ingredient|nutrition|label|back|panel/.test(haystack)) score += 10;
  for (const token of tokensFor(packet.product_name)) {
    if (haystack.includes(token)) score += 6;
  }
  for (const token of tokensFor(packet.vintage_label)) {
    if (haystack.includes(token)) score += 8;
  }
  const width = Number(candidate.width || 0);
  const height = Number(candidate.height || 0);
  if (width >= 300 || height >= 300) score += 6;
  if (width >= 700 || height >= 700) score += 6;
  if (/logo|avatar|icon|sprite|gravatar|facebook|twitter|rss|placeholder|spacer|blank|pixel/.test(haystack)) score -= 50;
  return score;
}

function extractImageCandidates(html = "", packet = {}) {
  const candidates = [];
  const pushCandidate = (candidate) => {
    const url = resolveUrl(candidate.url, packet.source_url);
    if (!url) return;
    candidates.push({ ...candidate, url });
  };

  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = attributesForTag(tag);
    const key = String(attrs.property || attrs.name || "").toLowerCase();
    if (!/(^|:)(image|thumbnail)$/.test(key) && !/(og:image|twitter:image)/.test(key)) continue;
    pushCandidate({
      kind: "meta_image",
      url: attrs.content || "",
      alt: key,
      title: attrs.title || "",
      width: attrs.width || "",
      height: attrs.height || "",
      className: "",
      id: "",
    });
  }

  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const attrs = attributesForTag(tag);
    pushCandidate({
      kind: "img",
      url: attrs.src || attrs["data-src"] || attrs["data-lazy-src"] || attrs["data-original"] || firstSrcsetUrl(attrs.srcset),
      alt: attrs.alt || "",
      title: attrs.title || "",
      width: attrs.width || "",
      height: attrs.height || "",
      className: attrs.class || "",
      id: attrs.id || "",
    });
  }

  for (const tag of html.match(/<a\b[^>]*>/gi) || []) {
    const attrs = attributesForTag(tag);
    if (!looksLikeImageUrl(attrs.href || "")) continue;
    pushCandidate({
      kind: "image_link",
      url: attrs.href || "",
      alt: attrs["aria-label"] || "",
      title: attrs.title || "",
      width: "",
      height: "",
      className: attrs.class || "",
      id: attrs.id || "",
    });
  }

  const byUrl = new Map();
  for (const candidate of candidates) {
    const existing = byUrl.get(candidate.url);
    const scored = { ...candidate, score: scoreCandidate(candidate, packet) };
    if (!existing || scored.score > existing.score) byUrl.set(candidate.url, scored);
  }
  return [...byUrl.values()].sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
}

function htmlCachePath(packet = {}, htmlDir = "") {
  const product = slug(packet.product_id || packet.product_name || "product");
  const vintage = slug(packet.vintage_label || "vintage");
  const hash = shortHash(packet.source_url || packet.packet_id || `${product}:${vintage}`, 12);
  return path.join(htmlDir, `${product}__${vintage}__${hash}.html`);
}

async function sourceHtmlForPacket(packet, options) {
  const filePath = htmlCachePath(packet, options.htmlDir);
  if (fs.existsSync(filePath)) {
    return {
      status: "cached_html_available",
      html: fs.readFileSync(filePath, "utf8"),
      private_html_path: filePath,
      fetch_error: "",
    };
  }
  if (!options.allowNetwork) {
    return {
      status: "source_html_missing_no_network",
      html: "",
      private_html_path: filePath,
      fetch_error: "",
    };
  }
  try {
    const response = await fetch(packet.source_url, {
      headers: {
        "User-Agent": "MenuGraphProductEvidenceBot/0.1 (private source-page image intake; https://github.com/evcatalyst/menugraph)",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, html);
    return {
      status: "source_html_fetched",
      html,
      private_html_path: filePath,
      fetch_error: "",
    };
  } catch (error) {
    return {
      status: "source_html_fetch_failed",
      html: "",
      private_html_path: filePath,
      fetch_error: String(error?.message || error || "unknown").slice(0, 180),
    };
  }
}

function publicStatusFor(htmlStatus, candidateCount) {
  if (htmlStatus === "source_html_fetch_failed") return "source_html_fetch_failed";
  if (htmlStatus === "source_html_missing_no_network") return "source_html_needed";
  if (candidateCount > 0) return "image_candidate_found_needs_private_review";
  return "source_html_available_no_image_candidate";
}

function publicRowForPacket({ runId, packet, htmlStatus, candidates }) {
  const best = candidates[0] || {};
  const sourcePageStatus = publicStatusFor(htmlStatus.status, candidates.length);
  return {
    run_id: runId,
    packet_id: packet.packet_id,
    packet_rank: packet.packet_rank,
    product_id: packet.product_id,
    product_name: packet.product_name,
    vintage_label: packet.vintage_label,
    source_domain: packet.source_domain,
    source_url: packet.source_url,
    source_title: packet.source_title,
    source_html_status: htmlStatus.status,
    source_page_status: sourcePageStatus,
    image_candidate_count: candidates.length,
    top_candidate_kind: best.kind || "",
    top_candidate_score: best.score ?? "",
    primary_surface_goal: "ingredient_panel;nutrition_panel",
    next_action: candidates.length
      ? "Privately inspect the top image candidate, crop ingredient/nutrition panels if visible, then fill private image-map paths."
      : "Open the source page manually, identify whether a readable panel exists, and capture a private screenshot if useful.",
    candidate_only: 1,
    manual_verified: 0,
  };
}

function privateRowsForPacket({ runId, packet, htmlStatus, candidates }) {
  return candidates.map((candidate, index) => ({
    run_id: runId,
    packet_id: packet.packet_id,
    packet_rank: packet.packet_rank,
    product_id: packet.product_id,
    product_name: packet.product_name,
    vintage_label: packet.vintage_label,
    source_url: packet.source_url,
    source_title: packet.source_title,
    private_html_path: htmlStatus.private_html_path,
    candidate_rank: index + 1,
    candidate_kind: candidate.kind,
    candidate_score: candidate.score,
    image_candidate_url: candidate.url,
    image_candidate_alt: candidate.alt || "",
    image_candidate_title: candidate.title || "",
    image_candidate_width: candidate.width || "",
    image_candidate_height: candidate.height || "",
    review_state: "needs_private_visual_review",
    candidate_only: 1,
    manual_verified: 0,
  }));
}

function buildSummary({ runId, packets, publicRows, privateRows, publicCsvPath, publicJsonPath, publicRunbookPath, allowNetwork }) {
  const countStatus = (status) => publicRows.filter((row) => row.source_page_status === status).length;
  const summary = {
    schema_version: "confection_wrapper_source_image_intake.v1",
    generated_at: generatedAt,
    run_id: runId,
    source_domain: "www.candywrapperarchive.com",
    run_mode: allowNetwork ? "private_network_source_html_intake" : "offline_cached_html_intake",
    selected_packets: packets.length,
    source_pages_with_html: publicRows.filter((row) => ["cached_html_available", "source_html_fetched"].includes(row.source_html_status)).length,
    source_pages_fetched: publicRows.filter((row) => row.source_html_status === "source_html_fetched").length,
    source_pages_missing_html: publicRows.filter((row) => row.source_html_status === "source_html_missing_no_network").length,
    source_pages_fetch_failed: publicRows.filter((row) => row.source_html_status === "source_html_fetch_failed").length,
    source_pages_with_image_candidates: countStatus("image_candidate_found_needs_private_review"),
    private_image_candidate_count: privateRows.length,
    by_status: countBy(publicRows, "source_page_status"),
    by_product: countBy(publicRows, "product_name"),
    first_rows: publicRows.slice(0, 12).map((row) => ({
      packet_id: row.packet_id,
      packet_rank: row.packet_rank,
      product_name: row.product_name,
      vintage_label: row.vintage_label,
      source_url: row.source_url,
      source_page_status: row.source_page_status,
      image_candidate_count: row.image_candidate_count,
      next_action: row.next_action,
    })),
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      image_urls_committed: false,
      images_committed: false,
      ocr_text_committed: false,
      manual_verified_created: false,
    },
    public_artifacts: {
      source_image_intake_csv: publicArtifactRef(publicCsvPath),
      source_image_intake_json: publicArtifactRef(publicJsonPath),
      source_image_intake_runbook_md: publicArtifactRef(publicRunbookPath),
    },
  };
  return redactPrivate(summary);
}

function renderRunbook(summary = {}) {
  const lines = [
    "# Candy Wrapper Archive Source Image Intake",
    "",
    `Generated: ${summary.generated_at || generatedAt}`,
    `Run ID: ${summary.run_id || ""}`,
    "",
    "This public-safe artifact summarizes private source-page image discovery for Candy Wrapper Archive pages. It publishes source-page URLs and counts only; image candidate URLs, cached HTML paths, screenshots, crops, OCR text, and verification decisions stay private.",
    "",
    "## Why This Exists",
    "",
    "CWA pages are high-yield package-history sources, but ingredient claims still require readable ingredient or nutrition panels. This intake narrows each source page to likely private image candidates before panel crop review.",
    "",
    "## Current State",
    "",
    `- Selected packets: ${summary.selected_packets || 0}`,
    `- Source pages with HTML: ${summary.source_pages_with_html || 0}`,
    `- Source pages with image candidates: ${summary.source_pages_with_image_candidates || 0}`,
    `- Private image candidates: ${summary.private_image_candidate_count || 0}`,
    "",
    "## Operator Path",
    "",
    "1. Run with cached HTML or explicitly enable private network fetching.",
    "2. Open the private candidate manifest for image URLs and visual review.",
    "3. For each useful candidate, crop ingredient panel first and nutrition panel second.",
    "4. Fill the CWA private image-map template, then run packet readiness and native OCR.",
    "5. Keep all text candidate-only until manual verification.",
    "",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

async function writeSourceImageIntake({
  runId,
  runDir,
  packetsPath,
  publicCsvPath,
  publicJsonPath,
  publicRunbookPath,
  product,
  packetId,
  vintage,
  limit,
  allowNetwork,
  summaryField,
  htmlDir,
}) {
  const dirs = ensureRunDirs(runDir);
  const privateHtmlDir = htmlDir || path.join(dirs.runDir, "source-pages");
  fs.mkdirSync(privateHtmlDir, { recursive: true });
  const packetManifest = readJson(packetsPath, {});
  const packets = selectPackets(packetManifest.packets || [], { product, packetId, vintage, limit });
  const publicRows = [];
  const privateRows = [];
  const privateJsonRows = [];

  for (const packet of packets) {
    const htmlStatus = await sourceHtmlForPacket(packet, { htmlDir: privateHtmlDir, allowNetwork });
    const candidates = htmlStatus.html ? extractImageCandidates(htmlStatus.html, packet) : [];
    publicRows.push(publicRowForPacket({ runId, packet, htmlStatus, candidates }));
    const packetPrivateRows = privateRowsForPacket({ runId, packet, htmlStatus, candidates });
    privateRows.push(...packetPrivateRows);
    privateJsonRows.push({
      packet_id: packet.packet_id,
      product_id: packet.product_id,
      product_name: packet.product_name,
      vintage_label: packet.vintage_label,
      source_url: packet.source_url,
      source_title: packet.source_title,
      source_html_status: htmlStatus.status,
      private_html_path: htmlStatus.private_html_path,
      fetch_error: htmlStatus.fetch_error,
      candidates,
    });
  }

  const privateCsvPath = path.join(dirs.runDir, "cwa-source-image-intake.private.csv");
  const privateJsonPath = path.join(dirs.runDir, "cwa-source-image-intake.private.json");
  writeCsv(privateCsvPath, [
    "run_id",
    "packet_id",
    "packet_rank",
    "product_id",
    "product_name",
    "vintage_label",
    "source_url",
    "source_title",
    "private_html_path",
    "candidate_rank",
    "candidate_kind",
    "candidate_score",
    "image_candidate_url",
    "image_candidate_alt",
    "image_candidate_title",
    "image_candidate_width",
    "image_candidate_height",
    "review_state",
    "candidate_only",
    "manual_verified",
  ], privateRows);
  writeJson(privateJsonPath, {
    schema_version: "confection_wrapper_source_image_intake_private.v1",
    generated_at: generatedAt,
    run_id: runId,
    packets: privateJsonRows,
  });

  writeCsv(publicCsvPath, [
    "run_id",
    "packet_id",
    "packet_rank",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_title",
    "source_html_status",
    "source_page_status",
    "image_candidate_count",
    "top_candidate_kind",
    "top_candidate_score",
    "primary_surface_goal",
    "next_action",
    "candidate_only",
    "manual_verified",
  ], publicRows);
  const summary = buildSummary({
    runId,
    packets,
    publicRows,
    privateRows,
    publicCsvPath,
    publicJsonPath,
    publicRunbookPath,
    allowNetwork,
  });
  writeJson(publicJsonPath, summary);
  fs.mkdirSync(path.dirname(publicRunbookPath), { recursive: true });
  fs.writeFileSync(publicRunbookPath, renderRunbook(summary));

  if (summaryField) {
    const siteSummary = readJson(summaryPath, {});
    siteSummary[summaryField] = summary;
    siteSummary.confection_wrapper_ingredient_priority_summary = siteSummary.confection_wrapper_ingredient_priority_summary || {};
    siteSummary.confection_wrapper_ingredient_priority_summary.source_image_intake_summary = summary;
    siteSummary.confection_wrapper_ingredient_priority_summary.artifacts = {
      ...(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts || {}),
      source_image_intake_csv: publicArtifactRef(publicCsvPath),
      source_image_intake_json: publicArtifactRef(publicJsonPath),
      source_image_intake_runbook_md: publicArtifactRef(publicRunbookPath),
    };
    writeJson(summaryPath, siteSummary);
  }

  return {
    summary,
    publicRows,
    privateRows,
    privateArtifacts: {
      html_dir: privateHtmlDir,
      private_csv_path: privateCsvPath,
      private_json_path: privateJsonPath,
    },
  };
}

async function main() {
  const runId = runIdFromArgs("cwa-source-image-intake");
  const runDir = runDirFromArgs(runId);
  const result = await writeSourceImageIntake({
    runId,
    runDir,
    packetsPath: pathFromArg("packets", defaultPacketJsonPath),
    publicCsvPath: pathFromArg("public-csv", defaultPublicCsvPath),
    publicJsonPath: pathFromArg("public-json", defaultPublicJsonPath),
    publicRunbookPath: pathFromArg("public-runbook", defaultPublicRunbookPath),
    product: argValue("product", ""),
    packetId: argValue("packet-id", ""),
    vintage: argValue("vintage", ""),
    limit: numberArg("limit", 0),
    allowNetwork: hasFlag("allow-network"),
    htmlDir: argValue("html-dir", "") ? pathFromArg("html-dir", "") : "",
    summaryField: argValue("summary-field", "confection_wrapper_source_image_intake_summary"),
  });
  console.log(JSON.stringify({
    run_id: runId,
    selected_packets: result.summary.selected_packets,
    source_pages_with_html: result.summary.source_pages_with_html,
    source_pages_with_image_candidates: result.summary.source_pages_with_image_candidates,
    private_image_candidate_count: result.summary.private_image_candidate_count,
    private_candidate_manifest: result.privateArtifacts.private_json_path,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  attributesForTag,
  extractImageCandidates,
  htmlCachePath,
  publicRowForPacket,
  scoreCandidate,
  sourceHtmlForPacket,
  writeSourceImageIntake,
};
