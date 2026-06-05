const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");
const QUEUE_PATH = path.join(ROOT_DIR, "docs", "data", "enrichment", "ocr-triage-queue.json");

function cleanValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function argValue(args, name, fallback = null) {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function argsFromNpmCommand(command = "") {
  const marker = " -- ";
  const index = command.indexOf(marker);
  if (index === -1) return [];
  return command
    .slice(index + marker.length)
    .split(/\s+/)
    .map(cleanValue)
    .filter(Boolean);
}

function setArg(args, name, value) {
  const prefix = `--${name}=`;
  const filtered = args.filter((arg) => !arg.startsWith(prefix));
  if (value === null || value === undefined || value === "") return filtered;
  filtered.push(`${prefix}${value}`);
  return filtered;
}

function addFlag(args, flag, enabled = true) {
  const next = args.filter((arg) => arg !== `--${flag}`);
  if (enabled) next.push(`--${flag}`);
  return next;
}

function chooseOcrRun(queueSummary = {}, preferredLabel = "") {
  const runs = queueSummary.progressiveRunPlan?.runs || [];
  const withWork = runs.filter((run) => Number(run.candidates || 0) > 0);
  if (preferredLabel) {
    const preferred = withWork.find((run) => cleanValue(run.label) === preferredLabel);
    if (preferred) return preferred;
  }
  const orderedLabels = [
    "continue_partial_second_pages",
    "retryable_local_failures",
    "phase1_easy_local",
    "phase1_medium_local",
    "backlog_local",
  ];
  for (const label of orderedLabels) {
    const run = withWork.find((item) => cleanValue(item.label) === label);
    if (run) return run;
  }
  return withWork.find((run) => /^source_price_gap_/.test(cleanValue(run.label))) || withWork[0] || null;
}

function ocrArgsForRun(run, options = {}) {
  let args = argsFromNpmCommand(run?.command || "");
  args = setArg(args, "limit", options.limit);
  args = setArg(args, "pages-per-menu", options.pagesPerMenu);
  args = setArg(args, "min-free-mb", options.minFreeMb);
  if (options.source && options.source !== "auto") args = setArg(args, "source", options.source);
  if (options.tier && options.tier !== "auto") args = setArg(args, "tier", options.tier);
  if (options.keepImages) args = addFlag(args, "keep-images", true);
  if (options.refreshImages) args = addFlag(args, "refresh-images", true);
  return args;
}

function command(step, script, args = []) {
  return {
    step,
    cmd: "node",
    args: [script, ...args],
  };
}

function buildCyclePlan(options = {}) {
  const queue = options.queue || readJson(QUEUE_PATH, { summary: {} });
  const selectedRun = chooseOcrRun(queue.summary || {}, options.runLabel || "");
  const ocrArgs = selectedRun ? ocrArgsForRun(selectedRun, options) : [];
  const triageArgs = [
    `--record-limit=${options.recordLimit}`,
    `--early-limit=${options.earlyLimit}`,
    `--pages-per-menu=${options.pagesPerMenu}`,
    `--external-cost-per-image=${options.externalCostPerImageUsd}`,
  ];
  if (options.source && options.source !== "auto") triageArgs.push(`--source=${options.source}`);
  const steps = [
    command("storage_preflight", "scripts/storage-preflight.js", [`--min-free-mb=${options.minFreeMb}`]),
    command("build_ocr_triage_before", "scripts/build-ocr-triage-queue.js", triageArgs),
  ];
  if (selectedRun) {
    steps.push(command(`local_ocr_${selectedRun.label}`, "scripts/local-vision-ocr-enrichment.js", ocrArgs));
  }
  steps.push(
    command("build_ocr_triage_after", "scripts/build-ocr-triage-queue.js", triageArgs),
    command("build_enrichment_coverage", "scripts/build-enrichment-coverage-report.js"),
    command("build_enrichment_run_plan", "scripts/build-enrichment-run-plan.js"),
    command("build_assimilation_plan", "scripts/build-assimilation-plan.js"),
    command("build_source_route_review", "scripts/build-source-route-review.js")
  );
  if (options.refreshRecipeBridge) steps.push(command("build_recipe_bridge", "scripts/build-recipe-bridge.js"));
  steps.push(command("build_graph_overlay", "scripts/build-graph-overlay.js"));
  return {
    selectedRun: selectedRun
      ? {
          label: selectedRun.label,
          candidates: Number(selectedRun.candidates || 0),
          estimatedImages: Number(selectedRun.estimatedImages || 0),
          topCandidateIds: selectedRun.topCandidateIds || [],
        }
      : null,
    steps,
  };
}

function runStep(step) {
  const result = spawnSync(step.cmd, step.args, {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${step.step} failed with exit code ${result.status}`);
  }
}

function optionsFromArgs(args = process.argv.slice(2)) {
  return {
    dryRun: hasFlag(args, "dry-run"),
    limit: Math.max(1, Number(argValue(args, "limit", "12")) || 12),
    pagesPerMenu: Math.max(1, Number(argValue(args, "pages-per-menu", "1")) || 1),
    minFreeMb: Math.max(256, Number(argValue(args, "min-free-mb", "1024")) || 1024),
    recordLimit: Math.max(1, Number(argValue(args, "record-limit", "10000")) || 10000),
    earlyLimit: Math.max(1, Number(argValue(args, "early-limit", "200")) || 200),
    externalCostPerImageUsd: Number(argValue(args, "external-cost-per-image", "0.01")) || 0,
    runLabel: cleanValue(argValue(args, "run-label", "")),
    source: cleanValue(argValue(args, "source", "auto")),
    tier: cleanValue(argValue(args, "tier", "auto")),
    keepImages: hasFlag(args, "keep-images"),
    refreshImages: hasFlag(args, "refresh-images"),
    refreshRecipeBridge: hasFlag(args, "refresh-recipe-bridge"),
  };
}

function runLocalOcrCycle(options = optionsFromArgs()) {
  const plan = buildCyclePlan(options);
  if (options.dryRun) {
    console.log(JSON.stringify({ dryRun: true, ...plan }, null, 2));
    return plan;
  }
  for (const step of plan.steps) runStep(step);
  return plan;
}

if (require.main === module) {
  try {
    const options = optionsFromArgs();
    const plan = runLocalOcrCycle(options);
    if (!options.dryRun) console.log(JSON.stringify({ dryRun: false, selectedRun: plan.selectedRun, steps: plan.steps.length }, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

module.exports = {
  argsFromNpmCommand,
  buildCyclePlan,
  chooseOcrRun,
  ocrArgsForRun,
  optionsFromArgs,
  runLocalOcrCycle,
};
