const fs = require("fs");
const path = require("path");
const {
  argValue,
  countBy,
  ensureRunDirs,
  generatedAt,
  numberArg,
  pathFromArg,
  publicArtifactRef,
  readJson,
  redactPrivate,
  runDirFromArgs,
  runIdFromArgs,
  shortHash,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const defaultPrivateManifestPath = path.join(root, ".cache/ingredient-ocr/runs/cwa-source-image-intake-v1/cwa-source-image-intake.private.json");
const defaultPublicCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_panel_candidate_review.csv");
const defaultPublicJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_source_panel_candidate_review.json");
const defaultPublicRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_panel_candidate_review_runbook.md");

function joinedCandidateText(candidate = {}, packet = {}) {
  const sourcePath = (() => {
    try {
      return new URL(candidate.url || "").pathname;
    } catch {
      return candidate.url || "";
    }
  })();
  return [
    sourcePath,
    candidate.alt,
    candidate.title,
    candidate.className,
    candidate.id,
    candidate.kind,
    packet.product_name,
    packet.vintage_label,
  ].join(" ").toLowerCase();
}

function isLowSignalCandidate(candidate = {}, packet = {}) {
  const text = joinedCandidateText(candidate, packet);
  const className = String(candidate.className || "").toLowerCase();
  return /cwa_title|ad_place_holder|avatar|gravatar|logo|icon|sprite|placeholder|spacer|blank|pixel|facebook|twitter|rss|comment/.test(text)
    || /\bads?\b/.test(className);
}

function panelSignal(candidate = {}, packet = {}) {
  const text = joinedCandidateText(candidate, packet);
  let score = 0;
  if (/ingredient|ingredients/.test(text)) score += 70;
  if (/nutrition|facts/.test(text)) score += 55;
  if (/\bback\b|reverse|verso/.test(text)) score += 45;
  if (/\bside\b|flap|panel|label/.test(text)) score += 35;
  if (/net\s*wt|net\s*weight|serving|manufactur|distribut/.test(text)) score += 25;
  if (/_th\b|_thumb|thumbnail|thumb-img/.test(text)) score -= 25;
  if (isLowSignalCandidate(candidate, packet)) score -= 80;
  return score;
}

function productContextSignal(candidate = {}, packet = {}) {
  const text = joinedCandidateText(candidate, packet);
  let score = 0;
  if (/wrapper|package|packaging|candy|bar|carton|box|bag|label/.test(text)) score += 40;
  if (String(candidate.alt || candidate.title || "").trim()) score += 12;
  if (Number(candidate.score || 0) >= 60) score += 10;
  if (/_th\b|_thumb|thumbnail|thumb-img/.test(text)) score -= 20;
  if (isLowSignalCandidate(candidate, packet)) score -= 80;
  return score;
}

function surfaceGuess(candidate = {}, packet = {}) {
  const text = joinedCandidateText(candidate, packet);
  if (isLowSignalCandidate(candidate, packet)) return "low_signal_exclude";
  if (/ingredient|ingredients/.test(text)) return "ingredient_panel_candidate";
  if (/nutrition|facts/.test(text)) return "nutrition_panel_candidate";
  if (/\bback\b|reverse|verso|\bside\b|flap|panel|label|net\s*wt|net\s*weight|serving/.test(text)) {
    return "back_or_side_panel_candidate";
  }
  if (productContextSignal(candidate, packet) > 0) return "wrapper_product_context_candidate";
  return "unknown_visual_candidate";
}

function proofLaneForGuess(guess) {
  if (["ingredient_panel_candidate", "nutrition_panel_candidate", "back_or_side_panel_candidate"].includes(guess)) {
    return "primary_panel_candidate";
  }
  if (guess === "wrapper_product_context_candidate") return "secondary_product_context";
  return "exclude_or_manual_source_review";
}

function reviewPriorityForCandidate(candidate = {}, packet = {}) {
  const guess = surfaceGuess(candidate, packet);
  const panel = panelSignal(candidate, packet);
  const context = productContextSignal(candidate, packet);
  if (guess === "ingredient_panel_candidate" || guess === "nutrition_panel_candidate") return "high";
  if (guess === "back_or_side_panel_candidate" && panel >= 35) return "high";
  if (guess === "wrapper_product_context_candidate" && context >= 35) return "medium";
  return "low";
}

function candidateReviewRows(privateManifest = {}, runId = "") {
  return (privateManifest.packets || []).flatMap((packet, packetIndex) => {
    const packetRank = packet.packet_rank || packet.packet_order || packetIndex + 1;
    return (
    (packet.candidates || []).map((candidate, index) => {
      const guess = surfaceGuess(candidate, packet);
      const panelScore = panelSignal(candidate, packet);
      const contextScore = productContextSignal(candidate, packet);
      return {
        run_id: runId,
        packet_id: packet.packet_id,
        packet_rank: packetRank,
        product_id: packet.product_id,
        product_name: packet.product_name,
        vintage_label: packet.vintage_label,
        source_url: packet.source_url,
        source_title: packet.source_title,
        source_html_status: packet.source_html_status,
        private_html_path: packet.private_html_path,
        candidate_rank: index + 1,
        image_candidate_url: candidate.url,
        image_candidate_url_hash: shortHash(candidate.url || `${packet.packet_id}:${index}`, 16),
        candidate_kind: candidate.kind,
        candidate_source_score: candidate.score ?? "",
        candidate_alt: candidate.alt || "",
        candidate_title: candidate.title || "",
        candidate_width: candidate.width || "",
        candidate_height: candidate.height || "",
        surface_guess: guess,
        proof_lane_guess: proofLaneForGuess(guess),
        panel_signal_score: panelScore,
        product_context_score: contextScore,
        review_priority: reviewPriorityForCandidate(candidate, packet),
        private_review_state: "needs_visual_panel_role_review",
        candidate_only: 1,
        manual_verified: 0,
      };
    })
    );
  }).sort((a, b) => (
    Number(a.packet_rank || 0) - Number(b.packet_rank || 0)
    || Number(b.panel_signal_score || 0) - Number(a.panel_signal_score || 0)
    || Number(b.product_context_score || 0) - Number(a.product_context_score || 0)
    || Number(a.candidate_rank || 0) - Number(b.candidate_rank || 0)
  ));
}

function publicRowForPacket(packet = {}, rows = [], packetIndex = 0) {
  const count = (predicate) => rows.filter(predicate).length;
  const explicitPanel = count((row) => row.proof_lane_guess === "primary_panel_candidate");
  const wrapperContext = count((row) => row.proof_lane_guess === "secondary_product_context");
  const lowSignal = count((row) => row.proof_lane_guess === "exclude_or_manual_source_review");
  const highPriority = count((row) => row.review_priority === "high");
  const top = rows.find((row) => row.proof_lane_guess === "primary_panel_candidate")
    || rows.find((row) => row.proof_lane_guess === "secondary_product_context")
    || rows[0]
    || {};
  const status = explicitPanel
    ? "panel_candidate_found_needs_private_crop_review"
    : wrapperContext
      ? "wrapper_context_found_needs_panel_visibility_review"
      : "manual_source_review_needed";
  return {
    run_id: top.run_id || "",
    packet_id: packet.packet_id,
    packet_rank: packet.packet_rank || packet.packet_order || packetIndex + 1,
    product_id: packet.product_id,
    product_name: packet.product_name,
    vintage_label: packet.vintage_label,
    source_url: packet.source_url,
    source_title: packet.source_title,
    source_html_status: packet.source_html_status,
    panel_candidate_status: status,
    image_candidate_count: rows.length,
    explicit_panel_signal_candidates: explicitPanel,
    high_priority_panel_candidates: highPriority,
    wrapper_context_candidates: wrapperContext,
    low_signal_candidates: lowSignal,
    top_surface_guess: top.surface_guess || "",
    top_review_priority: top.review_priority || "",
    primary_surface_goal: "ingredient_panel_first;nutrition_panel_second;product_wrapper_context_last",
    next_action: explicitPanel
      ? "Privately inspect panel-likely candidates and crop ingredient panel first, nutrition panel second."
      : wrapperContext
        ? "Privately inspect wrapper candidate for back/side/ingredient visibility; if no panel is visible, keep as product context and hunt a back-panel source."
        : "Open the source page manually; extracted images do not provide enough panel signal for OCR routing.",
    candidate_only: 1,
    manual_verified: 0,
  };
}

function publicRowsForPackets(privateManifest = {}, privateRows = []) {
  const rowsByPacket = new Map();
  for (const row of privateRows) {
    if (!rowsByPacket.has(row.packet_id)) rowsByPacket.set(row.packet_id, []);
    rowsByPacket.get(row.packet_id).push(row);
  }
  return (privateManifest.packets || []).map((packet, packetIndex) => (
    publicRowForPacket(packet, rowsByPacket.get(packet.packet_id) || [], packetIndex)
  ));
}

function buildSummary({ runId, privateManifest, privateRows, publicRows, publicCsvPath, publicJsonPath, publicRunbookPath }) {
  const countPackets = (predicate) => publicRows.filter(predicate).length;
  const countCandidates = (predicate) => privateRows.filter(predicate).length;
  return redactPrivate({
    schema_version: "confection_wrapper_source_panel_candidate_review.v1",
    generated_at: generatedAt,
    run_id: runId,
    source_manifest_schema: privateManifest.schema_version || "",
    source_domain: "www.candywrapperarchive.com",
    selected_packets: publicRows.length,
    private_image_candidate_count: privateRows.length,
    packets_with_explicit_panel_signal: countPackets((row) => Number(row.explicit_panel_signal_candidates || 0) > 0),
    packets_with_wrapper_context_only: countPackets((row) => Number(row.explicit_panel_signal_candidates || 0) === 0 && Number(row.wrapper_context_candidates || 0) > 0),
    packets_needing_manual_source_review: countPackets((row) => row.panel_candidate_status === "manual_source_review_needed"),
    explicit_panel_signal_candidates: countCandidates((row) => row.proof_lane_guess === "primary_panel_candidate"),
    high_priority_panel_candidates: countCandidates((row) => row.review_priority === "high"),
    wrapper_context_candidates: countCandidates((row) => row.proof_lane_guess === "secondary_product_context"),
    low_signal_candidates: countCandidates((row) => row.proof_lane_guess === "exclude_or_manual_source_review"),
    by_status: countBy(publicRows, "panel_candidate_status"),
    by_product: countBy(publicRows, "product_name"),
    by_surface_guess: countBy(privateRows, "surface_guess"),
    by_review_priority: countBy(privateRows, "review_priority"),
    first_rows: publicRows.slice(0, 12).map((row) => ({
      packet_id: row.packet_id,
      packet_rank: row.packet_rank,
      product_name: row.product_name,
      vintage_label: row.vintage_label,
      source_url: row.source_url,
      panel_candidate_status: row.panel_candidate_status,
      explicit_panel_signal_candidates: row.explicit_panel_signal_candidates,
      wrapper_context_candidates: row.wrapper_context_candidates,
      top_surface_guess: row.top_surface_guess,
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
      source_panel_candidate_review_csv: publicArtifactRef(publicCsvPath),
      source_panel_candidate_review_json: publicArtifactRef(publicJsonPath),
      source_panel_candidate_review_runbook_md: publicArtifactRef(publicRunbookPath),
    },
  });
}

function renderRunbook(summary = {}) {
  const lines = [
    "# Candy Wrapper Archive Source Panel Candidate Review",
    "",
    `Generated: ${summary.generated_at || generatedAt}`,
    `Run ID: ${summary.run_id || ""}`,
    "",
    "This public-safe artifact summarizes private visual triage of source-page image candidates. It does not publish image URLs, screenshots, crops, OCR text, or verified ingredient claims.",
    "",
    "## Why This Exists",
    "",
    "Candy Wrapper Archive is valuable because the product pages already provide dated wrapper lineage. That does not automatically make a wrapper photo ingredient evidence. Ingredient photos are primary, nutrition panels are second, and product-front wrapper photos are only secondary story context until a readable ingredient or nutrition surface is confirmed.",
    "",
    "## Current State",
    "",
    `- Source packets: ${summary.selected_packets || 0}`,
    `- Private image candidates: ${summary.private_image_candidate_count || 0}`,
    `- Packets with explicit panel signal: ${summary.packets_with_explicit_panel_signal || 0}`,
    `- Packets with wrapper context only: ${summary.packets_with_wrapper_context_only || 0}`,
    `- Packets needing manual source review: ${summary.packets_needing_manual_source_review || 0}`,
    "",
    "## Operator Path",
    "",
    "1. Open the private candidate review CSV or JSON for candidate image URLs.",
    "2. For each packet, inspect ingredient-panel candidates first, nutrition-panel candidates second, and wrapper/front candidates last.",
    "3. If a readable ingredient or nutrition panel is visible, crop that surface privately and fill the image-map template.",
    "4. If only a wrapper front is visible, mark it as product context and add a back-panel/source-hunt gap.",
    "5. Run native OCR only after a private crop path exists, then keep OCR text candidate-only until manual verification.",
    "",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

function writeSourcePanelCandidateReview({
  runId,
  runDir,
  privateManifestPath,
  publicCsvPath,
  publicJsonPath,
  publicRunbookPath,
  limit,
  summaryField,
}) {
  const dirs = ensureRunDirs(runDir);
  const privateManifest = readJson(privateManifestPath, null);
  if (!privateManifest) throw new Error(`Missing private source image intake manifest: ${privateManifestPath}`);
  const selectedManifest = {
    ...privateManifest,
    packets: Number(limit || 0) > 0 ? (privateManifest.packets || []).slice(0, Number(limit)) : (privateManifest.packets || []),
  };
  const privateRows = candidateReviewRows(selectedManifest, runId);
  const publicRows = publicRowsForPackets(selectedManifest, privateRows);
  const privateCsvPath = path.join(dirs.runDir, "cwa-source-panel-candidate-review.private.csv");
  const privateJsonPath = path.join(dirs.runDir, "cwa-source-panel-candidate-review.private.json");

  writeCsv(privateCsvPath, [
    "run_id",
    "packet_id",
    "packet_rank",
    "product_id",
    "product_name",
    "vintage_label",
    "source_url",
    "source_title",
    "source_html_status",
    "private_html_path",
    "candidate_rank",
    "image_candidate_url",
    "image_candidate_url_hash",
    "candidate_kind",
    "candidate_source_score",
    "candidate_alt",
    "candidate_title",
    "candidate_width",
    "candidate_height",
    "surface_guess",
    "proof_lane_guess",
    "panel_signal_score",
    "product_context_score",
    "review_priority",
    "private_review_state",
    "candidate_only",
    "manual_verified",
  ], privateRows);
  writeJson(privateJsonPath, {
    schema_version: "confection_wrapper_source_panel_candidate_review_private.v1",
    generated_at: generatedAt,
    run_id: runId,
    source_private_manifest: privateManifestPath,
    rows: privateRows,
  });

  writeCsv(publicCsvPath, [
    "run_id",
    "packet_id",
    "packet_rank",
    "product_id",
    "product_name",
    "vintage_label",
    "source_url",
    "source_title",
    "source_html_status",
    "panel_candidate_status",
    "image_candidate_count",
    "explicit_panel_signal_candidates",
    "high_priority_panel_candidates",
    "wrapper_context_candidates",
    "low_signal_candidates",
    "top_surface_guess",
    "top_review_priority",
    "primary_surface_goal",
    "next_action",
    "candidate_only",
    "manual_verified",
  ], publicRows);
  const summary = buildSummary({
    runId,
    privateManifest: selectedManifest,
    privateRows,
    publicRows,
    publicCsvPath,
    publicJsonPath,
    publicRunbookPath,
  });
  writeJson(publicJsonPath, summary);
  fs.mkdirSync(path.dirname(publicRunbookPath), { recursive: true });
  fs.writeFileSync(publicRunbookPath, renderRunbook(summary));

  if (summaryField) {
    const siteSummary = readJson(summaryPath, {});
    siteSummary[summaryField] = summary;
    siteSummary.confection_wrapper_source_image_intake_summary = siteSummary.confection_wrapper_source_image_intake_summary || {};
    siteSummary.confection_wrapper_source_image_intake_summary.source_panel_candidate_review_summary = summary;
    siteSummary.confection_wrapper_source_image_intake_summary.public_artifacts = {
      ...(siteSummary.confection_wrapper_source_image_intake_summary.public_artifacts || {}),
      ...summary.public_artifacts,
    };
    siteSummary.confection_wrapper_ingredient_priority_summary = siteSummary.confection_wrapper_ingredient_priority_summary || {};
    siteSummary.confection_wrapper_ingredient_priority_summary.source_panel_candidate_review_summary = summary;
    siteSummary.confection_wrapper_ingredient_priority_summary.artifacts = {
      ...(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts || {}),
      ...summary.public_artifacts,
    };
    writeJson(summaryPath, siteSummary);
  }

  return {
    summary,
    publicRows,
    privateRows,
    privateArtifacts: {
      private_csv_path: privateCsvPath,
      private_json_path: privateJsonPath,
    },
  };
}

function main() {
  const runId = runIdFromArgs("cwa-source-panel-candidate-review");
  const runDir = runDirFromArgs(runId);
  const result = writeSourcePanelCandidateReview({
    runId,
    runDir,
    privateManifestPath: pathFromArg("private-manifest", defaultPrivateManifestPath),
    publicCsvPath: pathFromArg("public-csv", defaultPublicCsvPath),
    publicJsonPath: pathFromArg("public-json", defaultPublicJsonPath),
    publicRunbookPath: pathFromArg("public-runbook", defaultPublicRunbookPath),
    limit: numberArg("limit", 0),
    summaryField: argValue("summary-field", "confection_wrapper_source_panel_candidate_review_summary"),
  });
  console.log(JSON.stringify({
    run_id: runId,
    selected_packets: result.summary.selected_packets,
    private_image_candidate_count: result.summary.private_image_candidate_count,
    packets_with_explicit_panel_signal: result.summary.packets_with_explicit_panel_signal,
    packets_with_wrapper_context_only: result.summary.packets_with_wrapper_context_only,
    private_candidate_review: result.privateArtifacts.private_json_path,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  candidateReviewRows,
  isLowSignalCandidate,
  panelSignal,
  productContextSignal,
  publicRowForPacket,
  publicRowsForPackets,
  surfaceGuess,
  writeSourcePanelCandidateReview,
};
