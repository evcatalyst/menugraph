const assert = require("assert");
const {
  argsFromNpmCommand,
  buildCyclePlan,
  chooseOcrRun,
  ocrArgsForRun,
  optionsFromArgs,
} = require("./run-local-ocr-cycle");

const queue = {
  summary: {
    progressiveRunPlan: {
      runs: [
        {
          label: "phase1_easy_local",
          candidates: 0,
          estimatedImages: 0,
          command: "npm run enrich:ocr:local -- --limit=25 --batch=phase1 --tier=easy --pages-per-menu=1",
        },
        {
          label: "continue_partial_second_pages",
          candidates: 3,
          estimatedImages: 3,
          topCandidateIds: ["ocrtriage:a"],
          command: "npm run enrich:ocr:local -- --limit=25 --batch=all --continue-partial --pages-per-menu=2",
        },
        {
          label: "source_price_gap_northwestern",
          candidates: 7,
          estimatedImages: 7,
          command: "npm run enrich:ocr:local -- --limit=25 --batch=all --source=northwestern --tier=easy --pages-per-menu=1",
        },
      ],
    },
  },
};

assert.deepStrictEqual(argsFromNpmCommand("npm run enrich:ocr:local -- --limit=25 --batch=all"), ["--limit=25", "--batch=all"]);
assert.strictEqual(chooseOcrRun(queue.summary).label, "continue_partial_second_pages");
assert.strictEqual(chooseOcrRun(queue.summary, "source_price_gap_northwestern").label, "source_price_gap_northwestern");

const shapedArgs = ocrArgsForRun(chooseOcrRun(queue.summary), {
  limit: 4,
  pagesPerMenu: 1,
  minFreeMb: 512,
  source: "auto",
  tier: "easy",
});
assert(shapedArgs.includes("--limit=4"));
assert(shapedArgs.includes("--pages-per-menu=1"));
assert(shapedArgs.includes("--min-free-mb=512"));
assert(shapedArgs.includes("--continue-partial"));
assert(shapedArgs.includes("--tier=easy"));

const options = optionsFromArgs(["--dry-run", "--limit=6", "--pages-per-menu=1", "--min-free-mb=768", "--source=northwestern"]);
assert.strictEqual(options.dryRun, true);
assert.strictEqual(options.limit, 6);
assert.strictEqual(options.minFreeMb, 768);
assert.strictEqual(options.source, "northwestern");

const plan = buildCyclePlan({ ...options, queue, recordLimit: 100, earlyLimit: 10, externalCostPerImageUsd: 0.01 });
assert.strictEqual(plan.selectedRun.label, "continue_partial_second_pages");
assert(plan.steps.some((step) => step.step === "build_ocr_triage_before"));
assert(plan.steps.some((step) => step.step === "build_ocr_triage_after"));
assert(plan.steps.some((step) => step.step === "build_graph_overlay"));
assert(plan.steps.find((step) => step.step.startsWith("local_ocr_")).args.includes("--source=northwestern"));

console.log("local OCR cycle tests passed");
