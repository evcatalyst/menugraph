const assert = require("assert");
const { answerMenuGraphQuestion } = require("./chat-service");

const files = {
  "menus.json": {
    menus: [
      {
        uid: "cia:graph-only",
        id: "graph-only",
        title: "Graph Overlay Menu",
        date: "1911",
        year: 1911,
        city: "Boston",
        country: "United States",
        sourceKey: "cia",
        sourceShortLabel: "CIA",
        topDishes: [],
      },
    ],
  },
  "prices.json": { records: [] },
  "date-estimates.json": { records: [] },
  "graph/manifest.json": { generatedAt: "2026-06-05T00:00:00.000Z", summary: { overlays: { withOcrCandidates: 1 } } },
  "graph/source-capabilities.json": { nodes: [] },
  "graph/menu-overlays.json": {
    records: {
      "cia:graph-only": {
        counts: { dishMentions: 2, priceObservations: 1, ingredientTags: 1, ocrCandidates: 1 },
        topDishes: ["Eggs with truffle sauce"],
        ingredientTags: ["truffle"],
      },
    },
  },
  "graph/evidence-index.json": { priceObservations: {}, dishMentions: {}, dateEvidence: {} },
  "enrichment-status.json": {
    summary: {
      dishMentions: 12,
      priceObservations: 4,
      ocrProcessedPages: 5,
      ocrTextSpans: 22,
      ocrDishMentions: 8,
      ocrPriceObservations: 3,
      ingredientTags: { truffle: 2, egg: 4 },
    },
  },
  "enrichment/run-plan.json": { summary: { pendingCandidates: 9, pendingEstimatedImages: 10 } },
  "enrichment/coverage-report.json": { summary: { sources: 2, menus: 20, ocrCandidates: 9, ocrFailures: 1 } },
  "enrichment/source-route-review.json": { summary: { imageRouteReviewSources: 1, total: 2 } },
  "enrichment/ocr-triage-queue.json": { summary: { byRoute: { local_ocr: 9 }, progressiveRunPlan: { runs: [{ label: "backlog_local", candidates: 9 }] } } },
  "product-evidence/ingredient-journey.json": { metrics: { products: 10, ownershipMilestones: 7, evidencePhotoLinks: 55 } },
  "enrichment/recipe-bridge.json": { summary: { clusters: 3, dishLinks: 4 } },
};

async function readStaticJson(filename) {
  if (!(filename in files)) throw new Error(`missing ${filename}`);
  return files[filename];
}

async function run() {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Grok synthesized graph and OCR enrichment context." } }],
        usage: { prompt_tokens: 10, completion_tokens: 8 },
      }),
    };
  };

  const answer = await answerMenuGraphQuestion({
    question: "truffle evidence before 1920",
    readStaticJson,
    requireGrok: true,
    apiKey: "test-key",
    model: "grok-test",
    fetchImpl,
  });

  assert.strictEqual(answer.engine, "grok");
  assert.strictEqual(answer.model, "grok-test");
  assert.strictEqual(answer.grokStatus, "synthesized");
  assert.strictEqual(answer.enrichmentContext.status.ocrProcessedPages, 5);
  assert.strictEqual(answer.graphContext.overlayRecords, 1);
  assert(answer.localAnswer.includes("truffle") || answer.localAnswer.includes("candidate"), "local answer should be preserved");
  assert.strictEqual(requests.length, 1, "Grok API should be called once when required and keyed");
  const grokContext = JSON.parse(requests[0].body.messages[1].content);
  assert.strictEqual(grokContext.enrichmentContext.status.ocrProcessedPages, 5);
  assert.strictEqual(grokContext.graphContext.overlayRecords, 1);
  assert(grokContext.matches.some((match) => match.graphEvidenceCounts?.ocrCandidates === 1), "Grok context should include graph evidence counts");

  const missingKey = await answerMenuGraphQuestion({
    question: "truffle evidence before 1920",
    readStaticJson,
    requireGrok: true,
    env: {},
    fetchImpl,
  });
  assert.strictEqual(missingKey.engine, "local-retrieval");
  assert.strictEqual(missingKey.grokStatus, "missing_api_key_required");
  assert(missingKey.llmError.includes("Grok API key is not configured"));
}

run().then(() => console.log("chat service tests passed"));
