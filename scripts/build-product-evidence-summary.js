const fs = require("fs/promises");
const path = require("path");

const DEFAULT_DEST = path.join(__dirname, "..", "docs", "data", "product-evidence", "summary.json");
const SOURCE_CANDIDATES = [
  process.env.PRODUCT_EVIDENCE_SOURCE,
  path.resolve(__dirname, "..", "..", "pricehistory", "runs", "product-discovery-v3", "product_discovery", "product_discovery_board.json"),
  "/Users/matthewlean/Documents/pricehistory/runs/product-discovery-v3/product_discovery/product_discovery_board.json",
].filter(Boolean);

const vintages = [
  "current_2020s",
  "2010s",
  "2000s",
  "1990s",
  "1980s_or_earlier",
  "earliest_verified_label",
];

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows || []) {
    const value = String(row?.[key] || "");
    if (!value) continue;
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function topRows(rows, limit) {
  return Array.isArray(rows) ? rows.slice(0, limit) : [];
}

function compactRows(rows, fields, limit) {
  return topRows(rows, limit).map((row) => {
    const item = {};
    for (const field of fields) {
      if (row[field] !== undefined && row[field] !== null) item[field] = row[field];
    }
    return item;
  });
}

async function firstExistingPath(candidates) {
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch (_error) {
      // Keep looking for another local source path.
    }
  }
  return "";
}

function buildProducts(board) {
  return (board.collection_opportunities || []).map((row) => ({
    ...row,
    vintage_statuses: Object.fromEntries(
      vintages.map((vintage) => [
        vintage,
        {
          status: row[`${vintage}_status`] || "unknown",
          source_count: Number(row[`${vintage}_source_count`] || 0),
        },
      ]),
    ),
  }));
}

function buildSourceBatches(rows) {
  const groups = new Map();
  for (const row of rows || []) {
    const key = [
      row.source_name || row.source_key || "",
      row.search_surface || "",
      row.category || "",
    ].join("\u001f");
    if (!groups.has(key)) {
      groups.set(key, {
        source: row.source_name || row.source_key || "",
        surface: row.search_surface || "",
        category: row.category || "",
        count: 0,
        priority: 0,
        statuses: {},
      });
    }
    const group = groups.get(key);
    group.count += 1;
    group.priority = Math.max(group.priority, Number(row.max_priority || 0));
    const status = row.batch_status || row.review_stage || "unknown";
    group.statuses[status] = (group.statuses[status] || 0) + 1;
  }
  return [...groups.values()].sort((a, b) => b.priority - a.priority || a.source.localeCompare(b.source));
}

async function main() {
  const sourcePath = argValue("source", "") || await firstExistingPath(SOURCE_CANDIDATES);
  const destPath = argValue("dest", DEFAULT_DEST);
  if (!sourcePath) {
    throw new Error("Missing product discovery board. Pass --source=/path/to/product_discovery_board.json or set PRODUCT_EVIDENCE_SOURCE.");
  }
  const board = JSON.parse(await fs.readFile(sourcePath, "utf8"));

  const products = buildProducts(board);
  const acquisition = board.evidence_acquisition_queue || [];
  const registry = board.evidence_registry || [];
  const photo = board.photo_evidence_matrix || [];
  const sweeps = board.common_crawl_sweep_plan || [];
  const runLogs = board.common_crawl_run_logs || [];
  const candidates = board.candidates || [];
  const campaignPackets = board.source_collection_campaign_packets || [];
  const campaigns = board.source_collection_campaigns || [];
  const massSearch = board.mass_search_pack || [];
  const currentWebManifests = board.current_web_harvest_manifest || [];

  const registryStatusCounts = countBy(registry, "evidence_status");
  const acquisitionStatusCounts = countBy(acquisition, "acquisition_status");

  const metrics = {
    targets: (board.targets || []).length,
    queries: (board.queries || []).length,
    candidates: candidates.length,
    photo_evidence_rows: photo.length,
    label_review_packets: (board.label_review_packets || []).length,
    collection_opportunities: products.length,
    current_web_manifests: currentWebManifests.length,
    common_crawl_sweeps: sweeps.length,
    common_crawl_run_logs: runLogs.length,
    acquisition_rows: acquisition.length,
    source_review_ready: acquisitionStatusCounts.ready_for_source_review || 0,
    current_web_search_ready: acquisitionStatusCounts.ready_for_current_web_search || 0,
    cdx_retry_ready: acquisitionStatusCounts.ready_for_cdx_retry || 0,
    cdx_sweep_ready: acquisitionStatusCounts.ready_for_cdx_sweep || 0,
    evidence_registry_rows: registry.length,
    unsupported_gap_records: registry.filter((row) => row.registry_record_type === "unsupported_gap").length,
    source_review_records: registryStatusCounts.source_review || 0,
    usable_photo_records: registryStatusCounts.usable_photo || 0,
    label_visible_records: registryStatusCounts.label_visible || 0,
    ocr_extracted_records: registryStatusCounts.ocr_extracted || 0,
    manual_verified_records: registryStatusCounts.manual_verified || 0,
    rejected_records: registryStatusCounts.rejected || 0,
    collection_campaigns: campaigns.length,
    collection_campaign_packets: campaignPackets.length,
    mass_search_tasks: massSearch.length,
  };

  const campaignFields = [
    "campaign_id",
    "campaign_status",
    "campaign_priority",
    "source_key",
    "source_name",
    "source_kind",
    "search_surface",
    "source_attribution_grade",
    "batch_count",
    "slot_count",
    "search_task_count",
    "product_count",
    "category_count",
    "vintage_count",
    "categories",
    "vintages",
    "top_blockers",
    "top_products",
    "sample_queries",
    "sample_search_urls",
    "sample_image_search_urls",
    "common_crawl_patterns",
    "cli_hints",
    "best_candidate_urls",
    "expected_evidence",
    "campaign_collection_action",
    "evidence_acceptance_rule",
    "import_shape",
    "import_hint",
  ];
  const packetFields = [
    "packet_id",
    "campaign_id",
    "packet_status",
    "campaign_priority",
    "source_key",
    "source_name",
    "source_kind",
    "search_surface",
    "source_attribution_grade",
    "search_task_count",
    "product_count",
    "slot_count",
    "categories",
    "vintages",
    "top_blockers",
    "top_products",
    "operator_goal",
    "collection_sequence",
    "search_queries_to_start",
    "search_urls_to_start",
    "image_urls_to_start",
    "common_crawl_patterns",
    "cli_hints",
    "acceptance_checklist",
    "reject_rules",
    "quality_gate",
    "candidate_jsonl_template",
    "evidence_acceptance_rule",
    "import_shape",
    "import_hint",
    "handoff_next_step",
  ];
  const taskFields = [
    "task_priority",
    "canonical_name",
    "display_name",
    "brand",
    "category",
    "subcategory",
    "vintage_label",
    "review_stage",
    "matched_candidate_count",
    "source_key",
    "source_name",
    "source_kind",
    "search_surface",
    "query_text",
    "search_url",
    "image_search_url",
    "common_crawl_patterns",
    "best_candidate_url",
    "expected_evidence",
    "required_photo_roles",
    "source_attribution_grade",
    "import_hint",
    "required_next_action",
    "cli_hint",
  ];
  const runLogFields = [
    "recorded_at_utc",
    "command",
    "query_contains",
    "targets_considered",
    "queries_run",
    "query_errors",
    "records_seen",
    "records_rejected",
    "candidates_inserted",
    "error_sample",
    "log_path",
    "query_errors_path",
  ];

  const summary = {
    generated_at_utc: new Date().toISOString(),
    source_run: "runs/product-discovery-v3/product_discovery",
    vintages,
    metrics,
    coverage_summary: board.coverage_summary || [],
    gap_summary: board.gap_summary || [],
    products,
    acquisition_queue: acquisition,
    photo_evidence: photo,
    common_crawl_sweeps: sweeps,
    common_crawl_run_logs: compactRows(
      [...runLogs].sort((a, b) => String(b.recorded_at_utc || "").localeCompare(String(a.recorded_at_utc || ""))),
      runLogFields,
      60,
    ),
    source_batches: buildSourceBatches(board.source_collection_batches || []),
    collection_campaigns: compactRows(campaigns, campaignFields, 80),
    collection_campaign_packets: compactRows(campaignPackets, packetFields, 80),
    mass_search_tasks: compactRows(massSearch, taskFields, 300),
    current_web_harvest_manifest: compactRows(currentWebManifests, [
      "manifest_id",
      "manifest_status",
      "manifest_priority",
      "category",
      "collection_track",
      "source_key",
      "source_name",
      "search_surface",
      "top_products",
      "browser_batch_urls",
      "acceptance_checklist",
      "candidate_jsonl_template",
      "handoff_next_step",
    ], 200),
    counts: {
      acquisition_statuses: countBy(acquisition, "acquisition_status"),
      surfaces: countBy(acquisition, "acquisition_surface"),
      sources: countBy(acquisition, "source_name"),
      categories: countBy(products, "category"),
      photo_statuses: countBy(photo, "evidence_status_label"),
      sweep_statuses: countBy(sweeps, "sweep_status"),
      crawl_run_commands: countBy(runLogs, "command"),
      crawl_run_queries: countBy(runLogs, "query_contains"),
      verification_gaps: countBy(photo, "promotion_blocker"),
      candidate_domains: countBy(candidates, "source_domain"),
      campaign_sources: countBy(campaigns, "source_key"),
      mass_search_surfaces: countBy(massSearch, "search_surface"),
    },
    first_urls: {
      dashboard: "product_discovery_dashboard.html",
      evidence_atlas: "product_evidence_atlas.html",
      mass_collection_dashboard: "mass_collection_dashboard.html",
      evidence_registry: "evidence_registry.csv",
    },
    evidence_registry_status_workflow: board.evidence_registry_status_workflow || [],
    evidence_registry_summary: board.evidence_registry_summary || [],
    evidence_registry: registry,
  };

  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ wrote: destPath, metrics }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
