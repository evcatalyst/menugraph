const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dataPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");
const exportDir = path.join(root, "docs/data/product-evidence/exports");
const timelineExportPath = path.join(exportDir, "ten_product_pilot_timeline.json");
const reviewQueueExportPath = path.join(exportDir, "ten_product_pilot_review_queue.csv");
const gapClosureExportPath = path.join(exportDir, "ten_product_pilot_gap_closure.csv");
const storyBriefExportPath = path.join(exportDir, "ten_product_pilot_story_briefs.md");

const hardenedAt = "2026-06-07T18:00:00Z";
const gapClosureCsvHref = "../data/product-evidence/exports/ten_product_pilot_gap_closure.csv";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, headers, rows) {
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function ensureLegend(data) {
  data.status_legend = (data.status_legend || []).filter((row) => row.key !== "gap");
  const legendByKey = new Map(data.status_legend.map((row) => [row.key, row]));
  [
    {
      key: "confirmed_story_ready",
      label: "Confirmed story ready",
      meaning: "All slots are either source-backed or explicitly bounded as publishable gaps; formulation claims still require manual verification.",
    },
    {
      key: "gap_publishable",
      label: "Publishable gap",
      meaning: "The missing claim is explicit, bounded, and safe to show as a gap.",
    },
  ].forEach((row) => {
    if (legendByKey.has(row.key)) {
      Object.assign(legendByKey.get(row.key), row);
    } else {
      data.status_legend.push(row);
    }
  });
}

function normalizeVintageLabel(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function buildSourceTargetIndex(summary) {
  const index = new Map();
  (summary.mass_search_tasks || []).forEach((task) => {
    const productId = task.canonical_name;
    const vintage = normalizeVintageLabel(task.vintage_label);
    if (!productId || !vintage) return;
    const key = `${productId}::${vintage}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push({
      source_name: task.source_name || task.source_key || "Source target",
      source_kind: task.source_kind || "",
      search_surface: task.search_surface || "",
      search_url: task.search_url || task.best_candidate_url || "",
      expected_evidence: task.expected_evidence || "",
      required_photo_roles: task.required_photo_roles || "",
      attribution_grade: task.source_attribution_grade || "",
      import_hint: task.import_hint || "",
      next_action: task.required_next_action || task.cli_hint || "",
    });
  });
  return index;
}

function sourceTargetsFor(index, productId, version) {
  const keys = [
    `${productId}::${normalizeVintageLabel(version.vintage)}`,
    `${productId}::${normalizeVintageLabel(version.id)}`,
    `${productId}::${normalizeVintageLabel(version.label)}`,
  ];
  const seen = new Set();
  return keys.flatMap((key) => index.get(key) || [])
    .filter((target) => {
      const id = `${target.source_name}|${target.search_url}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 8);
}

function gapLanguage(product, version) {
  if (product.id === "oreo_original_chocolate_sandwich_cookies" && version.id === "origin_1912_gap") {
    return {
      reason: "historical_origin_label_unverified",
      canSay: "Oreo has an origin-year story, but the 1912 ingredient label is not verified in this evidence registry.",
      cannotSay: "Do not publish a 1912 ingredient list, original recipe, or original-to-current formulation diff.",
    };
  }
  return {
    reason: "no_source_attributable_evidence_in_current_registry",
    canSay: `${product.name} has no source-attributable evidence attached for the ${version.label} slot in this pilot registry.`,
    cannotSay: "Do not claim ingredient, package-size, manufacturer, or price changes for this slot until evidence is attached and reviewed.",
  };
}

function validationStateFor(version, evidenceCount) {
  if (version.status === "manual_verified") {
    return {
      state: "manual_verified",
      public_label: "Verified label",
      reviewer_required_for_claims: false,
      evidence_count: evidenceCount,
      note: "Reviewer-approved text can support scoped formulation claims.",
    };
  }
  if (version.status === "gap_publishable") {
    return {
      state: "confirmed_gap_boundary",
      public_label: "Publishable gap",
      reviewer_required_for_claims: true,
      evidence_count: evidenceCount,
      note: "This slot is complete as a claim boundary, not as ingredient evidence.",
    };
  }
  return {
    state: "source_backed_candidate",
    public_label: "Candidate evidence",
    reviewer_required_for_claims: true,
    evidence_count: evidenceCount,
    note: "Source presence can support the story path, but claims need corrected transcription and manual verification.",
  };
}

function actionableFacetStatus(facet) {
  const detail = `${facet.label} ${facet.detail}`.toLowerCase();
  if (detail.includes("transcription") || detail.includes("parse ") || detail.includes("panel text")) {
    return "needs_label_transcription";
  }
  return "needs_manual_verification";
}

function actionableLaneStatus(row) {
  if (row.status === "gap") return "gap_publishable";
  if (row.status !== "blocked") return row.status;
  const text = `${row.lane} ${row.why} ${row.photo_target}`.toLowerCase();
  if (text.includes("transcription") || text.includes("readable") || text.includes("panel")) {
    return "needs_label_transcription";
  }
  return "needs_manual_verification";
}

function hardenProduct(product, sourceTargetIndex) {
  const gapClosures = [];
  const oldGapSlots = product.versions.filter((version) => version.status === "gap").length;

  product.versions.forEach((version) => {
    const evidenceCount = (version.evidence_ids || []).length;
    if (version.status === "gap") {
      const sourceTargets = sourceTargetsFor(sourceTargetIndex, product.id, version);
      const language = gapLanguage(product, version);
      version.status = "gap_publishable";
      version.headline = `Publishable gap: ${version.label}`;
      version.ingredient_summary = `${language.canSay} This is a complete story boundary, not a formulation claim.`;
      version.photo_quality = {
        ...(version.photo_quality || {}),
        blocker: "Resolved as a publishable gap: no source-attributable label, photo, or document evidence is attached; source targets are queued for future review.",
      };
      version.gap_resolution = {
        state: "resolved_publishable_gap",
        resolved_at_utc: hardenedAt,
        reason: language.reason,
        can_say: language.canSay,
        cannot_say: language.cannotSay,
        confidence_scope: "High confidence in the evidence boundary; no confidence assigned to missing ingredient facts.",
        source_target_count: sourceTargets.length,
        source_targets: sourceTargets,
        next_verification_step: version.next_step,
      };
      gapClosures.push({
        product_id: product.id,
        product_name: product.name,
        vintage: version.vintage,
        version_id: version.id,
        label: version.label,
        status: version.status,
        reason: version.gap_resolution.reason,
        can_say: version.gap_resolution.can_say,
        cannot_say: version.gap_resolution.cannot_say,
        source_target_count: sourceTargets.length,
        first_source_target: sourceTargets[0]?.source_name || "",
        first_search_url: sourceTargets[0]?.search_url || "",
        next_verification_step: version.next_step,
      });
    }
    version.validation_state = validationStateFor(version, (version.evidence_ids || []).length);
  });

  product.review_queue = (product.review_queue || []).map((row) => {
    const matchingVersion = product.versions.find((version) => version.vintage === row.vintage || version.label === row.label);
    if (row.status !== "gap") return row;
    return {
      ...row,
      status: "gap_publishable",
      missing_fields: "resolved publishable gap; source-target URLs and queries are queued; no ingredient claim allowed",
      gap_resolution_state: matchingVersion?.gap_resolution?.state || "resolved_publishable_gap",
      source_target_count: matchingVersion?.gap_resolution?.source_target_count || 0,
    };
  });

  product.events = (product.events || []).map((event) => {
    if (event.status !== "gap") return event;
    return {
      ...event,
      status: "gap_publishable",
      detail: `${event.detail} This is now a publishable gap boundary, not a formulation claim.`,
    };
  });

  product.blocked_map = (product.blocked_map || []).map((row) => {
    const nextStatus = actionableLaneStatus(row);
    if (nextStatus === row.status) return row;
    return {
      ...row,
      status: nextStatus,
      resolution_state: nextStatus === "gap_publishable" ? "resolved_publishable_gap" : "work_unblocked_as_review_gate",
      why: nextStatus === "gap_publishable"
        ? `${row.why} This lane is now explicit enough to publish as a bounded gap.`
        : `${row.why} This is no longer a generic block; it is a review gate before claim promotion.`,
    };
  });

  product.facets = (product.facets || []).map((facet) => {
    if (facet.status !== "blocked") return facet;
    return {
      ...facet,
      status: actionableFacetStatus(facet),
      detail: `${facet.detail} Treat as an actionable review gate, not a publish blocker.`,
    };
  });

  product.clusters = (product.clusters || []).map((cluster) => {
    if (cluster.status !== "blocked") return cluster;
    return {
      ...cluster,
      status: "needs_manual_verification",
      detail: `${cluster.detail} Claim promotion waits for reviewer-approved text.`,
    };
  });

  const publishableGapSlots = product.versions.filter((version) => version.status === "gap_publishable").length;
  product.pilot_rollup_status = "confirmed_story_ready";
  product.story_resolution = {
    status: "confirmed_story_ready",
    resolved_at_utc: hardenedAt,
    resolved_slots: product.versions.length,
    source_backed_slots: product.source_backed_slots,
    publishable_gap_slots: publishableGapSlots,
    old_raw_gap_slots: oldGapSlots,
    outstanding_gap_count: 0,
    claim_gate: "No formulation claim is promoted without manual verification metadata.",
  };
  product.outstanding_gap_count = 0;
  product.resolved_gap_count = publishableGapSlots;
  product.resolved_story_slots = product.versions.length;
  product.story_resolution_coverage = 100;
  product.summary = product.summary.includes("All unsupported slots")
    ? product.summary
    : `${product.summary} All unsupported slots are now explicit publishable gap boundaries with queued source targets.`;
  product.photo_quality_summary = {
    ...(product.photo_quality_summary || {}),
    headline: `${product.photo_quality_summary?.headline || "Photo and evidence quality summary."} Gap handling is now confirmed.`,
    cannot_prove: `${product.photo_quality_summary?.cannot_prove || "Ingredient claims without verified label text."} Gap-closed slots still cannot prove ingredient facts.`,
  };
  product.export_paths = {
    ...(product.export_paths || {}),
    gap_closure_csv: gapClosureCsvHref,
  };

  return gapClosures;
}

function refreshRootReviewQueue(data) {
  data.review_queue = data.products.flatMap((product) => (
    (product.review_queue || []).map((row) => ({
      product_id: product.id,
      product_name: product.name,
      source_count: product.versions.find((version) => version.vintage === row.vintage || version.label === row.label)?.source_count || 0,
      ...row,
    }))
  ));
}

function refreshTimelineExport(data) {
  const timeline = data.products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    pilot_rollup_status: product.pilot_rollup_status,
    claim_rollup_status: product.claim_rollup_status,
    claim_boundary: product.claim_boundary,
    story_resolution: product.story_resolution,
    versions: product.versions.map((version) => ({
      vintage: version.vintage,
      year: version.year,
      status: version.status,
      headline: version.headline,
      source_count: version.source_count,
      evidence_ids: version.evidence_ids,
      validation_state: version.validation_state,
      gap_resolution: version.gap_resolution,
    })),
    blocked_map: product.blocked_map,
  }));
  writeJson(timelineExportPath, { generated_at_utc: hardenedAt, products: timeline });
}

function refreshReviewQueueExport(data) {
  writeCsv(reviewQueueExportPath, [
    "product_id",
    "vintage",
    "label",
    "status",
    "source_count",
    "missing_fields",
    "gap_resolution_state",
    "source_target_count",
    "next_action",
  ], data.review_queue.map((row) => ({
    product_id: row.product_id,
    vintage: row.vintage,
    label: row.label,
    status: row.status,
    source_count: row.source_count,
    missing_fields: row.missing_fields,
    gap_resolution_state: row.gap_resolution_state || "",
    source_target_count: row.source_target_count ?? "",
    next_action: row.next_action,
  })));
}

function refreshGapClosureExport(gapClosures) {
  writeCsv(gapClosureExportPath, [
    "product_id",
    "product_name",
    "vintage",
    "version_id",
    "label",
    "status",
    "reason",
    "can_say",
    "cannot_say",
    "source_target_count",
    "first_source_target",
    "first_search_url",
    "next_verification_step",
  ], gapClosures);
}

function refreshStoryBriefs(data) {
  const lines = [
    "# 10-Product Evidence Pilot Story Briefs",
    "",
    `Generated: ${hardenedAt}`,
    "",
  ];
  data.products.forEach((product) => {
    lines.push(`## ${product.name}`, "");
    lines.push(`- Story status: ${product.pilot_rollup_status}`);
    lines.push(`- Claim status: ${product.claim_rollup_status}`);
    lines.push(`- Boundary: ${product.claim_boundary}`);
    lines.push(`- Next unlock: ${product.next_unlock}`);
    lines.push(`- Source-backed slots: ${product.source_backed_slots}/${product.total_slots}`);
    lines.push(`- Resolved story slots: ${product.story_resolution.resolved_slots}/${product.total_slots}`);
    lines.push(`- Publishable gaps: ${product.story_resolution.publishable_gap_slots}`);
    lines.push(`- Outstanding raw gaps: ${product.story_resolution.outstanding_gap_count}`);
    lines.push("");
    lines.push("| Vintage | Status | Headline | Sources | Gap state |");
    lines.push("| --- | --- | --- | ---: | --- |");
    product.versions.forEach((version) => {
      lines.push(`| ${version.label} | ${version.status} | ${version.headline} | ${version.source_count} | ${version.gap_resolution?.state || version.validation_state?.state || ""} |`);
    });
    lines.push("");
  });
  fs.writeFileSync(storyBriefExportPath, `${lines.join("\n")}\n`);
}

function main() {
  const data = readJson(dataPath);
  const summary = readJson(summaryPath);
  const sourceTargetIndex = buildSourceTargetIndex(summary);
  ensureLegend(data);

  const gapClosures = data.products.flatMap((product) => hardenProduct(product, sourceTargetIndex));

  data.pilot_summary = {
    ...(data.pilot_summary || {}),
    confirmed_story_ready_products: data.products.length,
    resolved_story_slots: data.products.reduce((sum, product) => sum + product.story_resolution.resolved_slots, 0),
    publishable_gap_slots: gapClosures.length,
    outstanding_gap_slots: 0,
    generic_blocked_statuses: 0,
    status_hardening_note: "Raw gaps and generic blocked states have been converted to explicit publishable gaps or actionable review gates; no ingredient claims were promoted.",
  };
  data.generated_at_utc = hardenedAt;

  refreshRootReviewQueue(data);
  refreshTimelineExport(data);
  refreshReviewQueueExport(data);
  refreshGapClosureExport(gapClosures);
  refreshStoryBriefs(data);
  writeJson(dataPath, data);

  console.log(`Hardened ${gapClosures.length} publishable gap closures across ${data.products.length} products.`);
}

main();
