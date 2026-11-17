import assert from "node:assert/strict";
import { handleChat, handleSnapshot, resetChatRuntime } from "../src/chat-server.js";
import chatApi from "../docs/chat-utils.js";

const menus = {
  menus: [
    {
      id: "nypl:1",
      uid: "nypl:1",
      sourceKey: "nypl",
      title: "Boston supper",
      year: 1901,
      date: "1901-01-01",
      place: "Boston",
      city: "Boston",
      state: "Massachusetts",
      country: "United States",
    },
  ],
};
const prices = { records: [] };
const assets = new Map([
  ["/data/menus.json", JSON.stringify(menus)],
  ["/data/prices.json", JSON.stringify(prices)],
  ["/data/ontology.json", "null"],
  ["/data/date-estimates.json", JSON.stringify({ records: [] })],
  ["/data/analytics.json", "null"],
  ["/data/matches.json", JSON.stringify({ matches: [] })],
]);
const r2 = new Map();

function env(extra = {}) {
  return {
    MENU_DATA: {
      async get(key) {
        if (!r2.has(key)) return null;
        const text = r2.get(key);
        return { text: async () => text, body: text };
      },
    },
    ASSETS: {
      async fetch(request) {
        const body = assets.get(new URL(request.url).pathname);
        if (body == null) return new Response("missing", { status: 404 });
        return new Response(body, { headers: { "content-type": "application/json" } });
      },
    },
    MENUGRAPH_ASK_SECRET: "cf-test-ask",
    ...extra,
  };
}

function request(url, { method = "GET", body, headers = {}, ip = "203.0.113.10" } = {}) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json", "cf-connecting-ip": ip, ...headers },
    body: body == null ? undefined : JSON.stringify(body),
  });
}

async function main() {
  resetChatRuntime();
  const missing = await handleChat(request("https://menus.example/api/chat", { method: "POST", body: {} }), env(), chatApi);
  assert.equal(missing.status, 400);

  resetChatRuntime();
  const locked = await handleChat(
    request("https://menus.example/api/chat", { method: "POST", body: { question: "lobster" } }),
    env(),
    chatApi
  );
  assert.equal(locked.status, 401);

  resetChatRuntime();
  const calls = [];
  const stubFetch = async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ choices: [{ message: { content: "Stubbed upstream answer." } }] }), { status: 200 });
  };
  const unlocked = await handleChat(
    request("https://menus.example/api/chat", {
      method: "POST",
      body: { question: "Boston supper", secret: "cf-test-ask" },
    }),
    env({ XAI_API_KEY: "not-a-real-key", CHAT_FETCH: stubFetch, GROK_MODEL: "stub-model" }),
    chatApi
  );
  assert.equal(unlocked.status, 200);
  const payload = await unlocked.json();
  assert.equal(payload.engine, "grok");
  assert.equal(payload.model, "stub-model");
  assert.equal(payload.answer, "Stubbed upstream answer.");
  assert.equal(payload.localAnswer ? true : false, true);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].endsWith("/chat/completions"));

  resetChatRuntime();
  const limitedEnv = env({ CHAT_RATE_LIMIT_MAX: "2", CHAT_RATE_LIMIT_WINDOW_MS: "60000" });
  const first = await handleChat(request("https://menus.example/api/chat", { method: "POST", body: {} }), limitedEnv, chatApi);
  const second = await handleChat(request("https://menus.example/api/chat", { method: "POST", body: {} }), limitedEnv, chatApi);
  const third = await handleChat(request("https://menus.example/api/chat", { method: "POST", body: {} }), limitedEnv, chatApi);
  assert.equal(first.status, 400);
  assert.equal(second.status, 400);
  assert.equal(third.status, 429);

  resetChatRuntime();
  r2.set("menus.json", JSON.stringify({ menus: [{ id: "r2" }], from: "r2" }));
  const fromR2 = await handleSnapshot(request("https://menus.example/data/menus.json"), env());
  assert.equal(fromR2.headers.get("x-menugraph-data"), "r2");
  assert.equal((await fromR2.json()).from, "r2");
  r2.delete("menus.json");
  const fromAsset = await handleSnapshot(request("https://menus.example/data/menus.json"), env());
  assert.equal(fromAsset.headers.get("x-menugraph-data"), "asset-fallback");
  assert.ok(Array.isArray((await fromAsset.json()).menus));

  console.log("cf chat tests ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
