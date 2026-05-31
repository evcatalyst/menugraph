const assert = require("assert");
const { handler } = require("../netlify/functions/chat");

async function run() {
  const savedGrok = process.env.GROK_API_KEY;
  const savedXai = process.env.XAI_API_KEY;
  delete process.env.GROK_API_KEY;
  delete process.env.XAI_API_KEY;

  try {
    const options = await handler({ httpMethod: "OPTIONS" });
    assert.strictEqual(options.statusCode, 204, "OPTIONS should return 204");

    const missing = await handler({ httpMethod: "POST", body: JSON.stringify({}) });
    assert.strictEqual(missing.statusCode, 400, "missing question should return 400");

    const answered = await handler({
      httpMethod: "POST",
      body: JSON.stringify({ question: "lobster prices in Boston" }),
    });
    assert.strictEqual(answered.statusCode, 200, "valid question should return 200");
    const payload = JSON.parse(answered.body);
    assert.strictEqual(payload.engine, "local-retrieval", "test should not call Grok");
    assert(Array.isArray(payload.matches), "chat payload should include matches array");
    assert(payload.searched?.documents > 0, "chat payload should search bundled documents");
  } finally {
    if (savedGrok) process.env.GROK_API_KEY = savedGrok;
    if (savedXai) process.env.XAI_API_KEY = savedXai;
  }
}

run().then(() => console.log("netlify chat tests passed"));
