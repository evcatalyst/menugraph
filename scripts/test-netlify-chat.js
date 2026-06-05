const assert = require("assert");
const { handler } = require("../netlify/functions/chat");

const ASK_HASH = "8f388ed94f5ff3d417b9b3f897bf9fc4d56a2d0dd6778905d8440a938558d30a";

async function run() {
  const savedGrok = process.env.GROK_API_KEY;
  const savedXai = process.env.XAI_API_KEY;
  const savedModel = process.env.GROK_MODEL;
  const savedFetch = globalThis.fetch;
  delete process.env.GROK_API_KEY;
  delete process.env.XAI_API_KEY;

  try {
    const options = await handler({ httpMethod: "OPTIONS" });
    assert.strictEqual(options.statusCode, 204, "OPTIONS should return 204");

    const missing = await handler({ httpMethod: "POST", body: JSON.stringify({}) });
    assert.strictEqual(missing.statusCode, 400, "missing question should return 400");

    const locked = await handler({
      httpMethod: "POST",
      body: JSON.stringify({ question: "lobster prices in Boston" }),
    });
    assert.strictEqual(locked.statusCode, 401, "chat should require the shared Ask secret");

    const answered = await handler({
      httpMethod: "POST",
      body: JSON.stringify({ question: "lobster prices in Boston", askSecretHash: ASK_HASH }),
    });
    assert.strictEqual(answered.statusCode, 200, "valid question should return 200");
    const payload = JSON.parse(answered.body);
    assert.strictEqual(payload.engine, "local-retrieval", "test should not call Grok");
    assert(Array.isArray(payload.matches), "chat payload should include matches array");
    assert(payload.searched?.documents > 0, "chat payload should search bundled documents");
    assert(payload.enrichmentContext?.status, "chat payload should include OCR/enrichment context");
    assert(payload.graphContext?.overlayRecords > 0, "chat payload should include hydrated graph overlay context");

    const grokRequests = [];
    process.env.GROK_API_KEY = "test-grok-key";
    process.env.GROK_MODEL = "grok-test";
    globalThis.fetch = async (url, options) => {
      grokRequests.push({ url, body: JSON.parse(options.body) });
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Mock Grok synthesis using enriched MenuGraph context." } }],
          usage: { prompt_tokens: 12, completion_tokens: 9 },
        }),
      };
    };
    const grokAnswered = await handler({
      httpMethod: "POST",
      body: JSON.stringify({ question: "compare lobster prices in Boston and New York", askSecretHash: ASK_HASH, requireGrok: true }),
    });
    assert.strictEqual(grokAnswered.statusCode, 200, "Grok-backed question should return 200");
    const grokPayload = JSON.parse(grokAnswered.body);
    assert.strictEqual(grokPayload.engine, "grok", "handler should call Grok when requireGrok and key are available");
    assert.strictEqual(grokPayload.grokStatus, "synthesized");
    assert.strictEqual(grokPayload.answer, "Mock Grok synthesis using enriched MenuGraph context.");
    assert.strictEqual(grokRequests.length, 1, "Grok should be called once");
    const grokContext = JSON.parse(grokRequests[0].body.messages[1].content);
    assert(grokContext.enrichmentContext?.status?.ocrProcessedPages >= 0, "Grok context should include OCR processing counts");
    assert(grokContext.graphContext?.overlayRecords > 0, "Grok context should include hydrated graph overlay counts");
  } finally {
    globalThis.fetch = savedFetch;
    if (savedGrok) process.env.GROK_API_KEY = savedGrok;
    else delete process.env.GROK_API_KEY;
    if (savedXai) process.env.XAI_API_KEY = savedXai;
    else delete process.env.XAI_API_KEY;
    if (savedModel) process.env.GROK_MODEL = savedModel;
    else delete process.env.GROK_MODEL;
  }
}

run().then(() => console.log("netlify chat tests passed"));
