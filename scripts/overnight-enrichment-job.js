const fs = require("fs/promises");
const path = require("path");
const { buildGraphOverlay } = require("./build-graph-overlay");
const { buildLocalEnrichment, optionsFromArgs } = require("./local-enrichment");

const ROOT_DIR = path.join(__dirname, "..");
const CACHE_DIR = path.join(ROOT_DIR, ".cache", "enrichment");
const STATUS_PATH = path.join(CACHE_DIR, "overnight-status.json");
const DEFAULT_ARGS = [
  "--fetch-cia-text",
  "--probe-sources",
  "--unknown-only",
  "--limit=1200",
  "--image-limit=200",
  "--time-budget-min=480",
  "--public-dish-limit=60000",
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
    phase: "graph-build",
    pid: process.pid,
    args,
    enrichmentSummary: enrichment.status.summary,
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
