const fs = require("fs/promises");
const path = require("path");
const { buildGraphOverlay } = require("./build-graph-overlay");
const { assessExternalImages } = require("./external-image-assessment");
const { buildLaplSource } = require("./lapl-source");
const { buildLocalEnrichment, optionsFromArgs } = require("./local-enrichment");
const { buildMilwaukeeSource } = require("./milwaukee-source");
const { buildNolaSource } = require("./nola-source");
const { buildNorthwesternSource } = require("./northwestern-source");
const { buildSeattleSource } = require("./seattle-source");
const { buildUhSource } = require("./uh-source");
const { buildUwSource } = require("./uw-source");
const { buildDenverSource } = require("./denver-source");
const { buildCornellSource } = require("./cornell-source");
const { retagEnrichment } = require("./retag-enrichment");

const ROOT_DIR = path.join(__dirname, "..");
const CACHE_DIR = path.join(ROOT_DIR, ".cache", "enrichment");
const STATUS_PATH = path.join(CACHE_DIR, "overnight-status.json");
const DEFAULT_ARGS = [
  "--fetch-cia-text",
  "--skip-transcript-cache",
  "--probe-sources",
  "--unknown-only",
  "--limit=1200",
  "--image-limit=200",
  "--time-budget-min=480",
  "--public-dish-limit=60000",
  "--external-sources",
  "--lapl-limit=500",
  "--northwestern-limit=160",
  "--uh-limit=100",
  "--milwaukee-limit=100",
  "--uw-limit=300",
  "--nola-limit=100",
  "--seattle-limit=300",
  "--denver-limit=100",
  "--cornell-limit=800",
];

function timestamp() {
  return new Date().toISOString();
}

async function writeStatus(payload) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(
    STATUS_PATH,
    `${JSON.stringify(
      {
        updatedAt: timestamp(),
        ...payload,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

function argValue(args, name, fallback = null) {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

function sourceLimit(args, name, fallback) {
  return Math.max(0, Number(argValue(args, name, String(fallback))) || 0);
}

async function runExternalSources(args) {
  if (hasFlag(args, "skip-external-sources")) {
    return { skipped: true, sources: [] };
  }

  const timeoutMs = Math.max(5000, Number(argValue(args, "external-timeout-ms", "30000")) || 30000);
  const dryRun = hasFlag(args, "dry-run");
  const sources = [
    {
      sourceId: "lapl_menu_collection",
      limit: sourceLimit(args, "lapl-limit", 100),
      run: (limit) => buildLaplSource({ limit, timeoutMs, dryRun }),
    },
    {
      sourceId: "northwestern_transport_menus",
      limit: sourceLimit(args, "northwestern-limit", 160),
      run: (limit) => buildNorthwesternSource({ limit, query: "menu transportation dining", timeoutMs, dryRun }),
    },
    {
      sourceId: "uh_1850s_1860s_menus",
      limit: sourceLimit(args, "uh-limit", 100),
      run: (limit) => buildUhSource({ limit, timeoutMs, dryRun }),
    },
    {
      sourceId: "milwaukee_historic_menus",
      limit: sourceLimit(args, "milwaukee-limit", 100),
      run: (limit) => buildMilwaukeeSource({ limit, timeoutMs, dryRun }),
    },
    {
      sourceId: "uw_menus_collection",
      limit: sourceLimit(args, "uw-limit", 300),
      run: (limit) => buildUwSource({ limit, timeoutMs, dryRun }),
    },
    {
      sourceId: "nola_menu_collection",
      limit: sourceLimit(args, "nola-limit", 100),
      run: (limit) => buildNolaSource({ limit, timeoutMs, dryRun }),
    },
    {
      sourceId: "seattle_room_menu_collection",
      limit: sourceLimit(args, "seattle-limit", 300),
      run: (limit) => buildSeattleSource({ limit, timeoutMs, dryRun }),
    },
    {
      sourceId: "denver_menu_collection",
      limit: sourceLimit(args, "denver-limit", 100),
      run: (limit) => buildDenverSource({ limit, timeoutMs, dryRun }),
    },
    {
      sourceId: "cornell_nestle_menu_collection",
      limit: sourceLimit(args, "cornell-limit", 800),
      run: (limit) => buildCornellSource({ limit, timeoutMs, dryRun }),
    },
  ];

  const results = [];
  for (const source of sources) {
    if (!source.limit) {
      results.push({ sourceId: source.sourceId, skipped: true, reason: "limit=0" });
      continue;
    }
    await writeStatus({
      status: "running",
      phase: "external-sources",
      pid: process.pid,
      args,
      currentSource: source.sourceId,
      externalSources: results,
    });
    console.log(`[${timestamp()}] Refreshing external source ${source.sourceId} with limit=${source.limit}`);
    try {
      const output = await source.run(source.limit);
      results.push({
        sourceId: source.sourceId,
        status: "ok",
        summary: output.summary,
        generatedAt: output.generatedAt,
      });
      console.log(`[${timestamp()}] External source complete ${source.sourceId}: ${JSON.stringify(output.summary)}`);
    } catch (error) {
      results.push({
        sourceId: source.sourceId,
        status: "error",
        error: error.message,
      });
      console.error(`[${timestamp()}] External source failed ${source.sourceId}: ${error.stack || error.message}`);
    }
  }
  return { skipped: false, sources: results };
}

async function runExternalImageAssessment(args) {
  if (hasFlag(args, "skip-external-image-assessment")) {
    return { skipped: true };
  }
  const timeoutMs = Math.max(3000, Number(argValue(args, "external-image-timeout-ms", argValue(args, "external-timeout-ms", "15000"))) || 15000);
  const dryRun = hasFlag(args, "dry-run");
  const limit = Math.max(0, Number(argValue(args, "external-image-limit", "0")) || 0);
  console.log(`[${timestamp()}] Assessing external IIIF image metadata${limit ? ` with limit=${limit}` : ""}`);
  return assessExternalImages({ timeoutMs, dryRun, limit, sources: [], refresh: hasFlag(args, "refresh-external-images") });
}

async function main() {
  const args = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_ARGS;
  const options = optionsFromArgs(args);
  options.onProgress = (message) => {
    console.log(`[${timestamp()}] ${message}`);
    writeStatus({
      status: "running",
      phase: "local-enrichment",
      pid: process.pid,
      args,
      lastProgress: message,
      progressAt: timestamp(),
    }).catch(() => {});
  };

  await writeStatus({
    status: "running",
    phase: "local-enrichment",
    pid: process.pid,
    args,
  });

  console.log(`[${timestamp()}] Starting local enrichment job with args: ${args.join(" ")}`);
  const enrichment = await buildLocalEnrichment(options);
  console.log(`[${timestamp()}] Local enrichment complete: ${JSON.stringify(enrichment.status.summary)}`);

  await writeStatus({
    status: "running",
    phase: "external-sources",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
  });

  const externalSources = await runExternalSources(args);

  await writeStatus({
    status: "running",
    phase: "external-image-assessment",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
    externalSources,
  });

  const externalImageAssessment = await runExternalImageAssessment(args);

  await writeStatus({
    status: "running",
    phase: "retag-enrichment",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
    externalSources,
    externalImageAssessment,
  });

  const retagged = await retagEnrichment({ dryRun: hasFlag(args, "dry-run") });
  console.log(`[${timestamp()}] Retag enrichment complete: ${JSON.stringify({ taxonomyVersion: retagged.taxonomyVersion, externalSources: retagged.externalSources.length })}`);

  await writeStatus({
    status: "running",
    phase: "graph-build",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
    externalSources,
    externalImageAssessment,
    retagged,
  });

  const graph = await buildGraphOverlay();
  console.log(`[${timestamp()}] Graph rebuild complete: ${JSON.stringify(graph.manifest.summary)}`);

  await writeStatus({
    status: "complete",
    phase: "complete",
    pid: process.pid,
    args,
    finishedAt: timestamp(),
    enrichmentSummary: enrichment.status.summary,
    externalSources,
    externalImageAssessment,
    retagged,
    graphSummary: graph.manifest.summary,
  });
}

main().catch(async (error) => {
  console.error(`[${timestamp()}] Overnight enrichment failed: ${error.stack || error.message}`);
  await writeStatus({
    status: "error",
    phase: "failed",
    pid: process.pid,
    error: error.message,
    stack: error.stack,
  }).catch(() => {});
  process.exitCode = 1;
});
