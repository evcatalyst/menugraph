// Ask handler for the Worker. Same request and response shape as the Netlify function.
// Secret and model values are read from bindings by name. This file never logs them.

const JSON_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type, X-Menugraph-Ask-Secret, X-Menugraph-Ask-Secret-Hash",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json; charset=utf-8",
};

const DEFAULT_ASK_SECRET_HASH = "8f388ed94f5ff3d417b9b3f897bf9fc4d56a2d0dd6778905d8440a938558d30a";
const R2_NAMES = {
  "menus.json": "menus.json",
  "prices.json": "prices.json",
  "matches.json": "matches.json",
};

const parsedCache = new Map();
const rateBuckets = new Map();

function cleanValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function json(status, payload, extraHeaders = {}) {
  return new Response(status === 204 ? null : JSON.stringify(payload), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value || "")));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualText(a, b) {
  const left = new TextEncoder().encode(String(a || ""));
  const right = new TextEncoder().encode(String(b || ""));
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

async function expectedAskHash(env) {
  if (env.MENUGRAPH_ASK_SECRET_HASH) return cleanValue(env.MENUGRAPH_ASK_SECRET_HASH);
  if (env.MENUGRAPH_ASK_SECRET) return sha256Hex(env.MENUGRAPH_ASK_SECRET);
  return DEFAULT_ASK_SECRET_HASH;
}

async function hasValidAskSecret(body, headers, env) {
  const expected = await expectedAskHash(env);
  const providedHash = cleanValue(body.askSecretHash || headers.get("x-menugraph-ask-secret-hash"));
  if (providedHash && timingSafeEqualText(providedHash, expected)) return true;
  const providedSecret = cleanValue(body.askSecret || body.secret || headers.get("x-menugraph-ask-secret"));
  return Boolean(providedSecret && timingSafeEqualText(await sha256Hex(providedSecret), expected));
}

function clientIp(request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
}

function rateLimit(request, env) {
  const max = Number(env.CHAT_RATE_LIMIT_MAX || 20);
  const windowMs = Number(env.CHAT_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
  const now = Date.now();
  const ip = clientIp(request);
  const bucket = (rateBuckets.get(ip) || []).filter((stamp) => now - stamp < windowMs);
  if (bucket.length >= max) {
    rateBuckets.set(ip, bucket);
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - bucket[0])) / 1000));
    return json(429, { error: "Rate limit exceeded" }, { "Retry-After": String(retryAfter) });
  }
  bucket.push(now);
  rateBuckets.set(ip, bucket);
  return null;
}

function chartMetricLabel(key) {
  if (key === "medianTodayUsd") return "median today-indexed USD";
  if (key === "medianRaw") return "median raw price";
  if (key === "medianRelative") return "median relative index";
  return "result count";
}

function chartDataQuality(option, rows) {
  if (!option || rows.length < 2) return "thin";
  if (option.chartType === "table") return rows.length < 6 ? "thin" : "usable";
  return rows.length < 4 ? "thin" : "usable";
}

function chartRenderManifest(answer) {
  const recommendation = answer.chartRecommendation;
  const options = recommendation?.options || [];
  const option = options.find((item) => item.id === recommendation?.defaultOptionId) || options[0] || null;
  const rows = option?.rows || [];
  const yKey = option?.spec?.y || "count";
  const quality = chartDataQuality(option, rows);
  return {
    available: Boolean(option),
    chartType: option?.chartType || "none",
    title: option?.label || "No chart rendered",
    metric: yKey,
    metricLabel: chartMetricLabel(yKey),
    rowsRendered: rows.length,
    labels: rows.slice(0, 8).map((row) => row.label).filter(Boolean),
    dataQuality: quality,
    omissions: [
      quality === "thin" ? "The retrieved evidence is too sparse for a strong visual claim." : "",
      Number(answer.searched?.duplicateCandidates || 0)
        ? `${Number(answer.searched.duplicateCandidates).toLocaleString()} near-duplicate candidates were collapsed before rendering.`
        : "",
    ].filter(Boolean),
    provenance: {
      source: "Committed MenuGraph snapshots, NYPL structured dish rows, extracted price rows, and date-estimate metadata where available.",
      candidates: Number(answer.matches?.length || 0),
      searchedDocuments: Number(answer.searched?.documents || 0),
      returnedMatches: Number(answer.searched?.returnedMatches || answer.matches?.length || 0),
    },
  };
}

function compactChatMatches(matches) {
  return (matches || []).slice(0, 12).map((match) => ({
    title: match.title,
    item: match.item,
    snippet: match.snippet,
    date: match.date,
    year: match.year,
    place: match.place,
    source: match.source,
    reasons: match.reasons,
    price: match.price,
    url: match.url,
  }));
}

async function readSnapshot(env, request, filename) {
  const cacheKey = `${filename}`;
  if (parsedCache.has(cacheKey)) return parsedCache.get(cacheKey);
  const r2Name = R2_NAMES[filename];
  if (r2Name && env.MENU_DATA) {
    const object = await env.MENU_DATA.get(r2Name);
    if (object) {
      const payload = JSON.parse(await object.text());
      parsedCache.set(cacheKey, payload);
      return payload;
    }
  }
  if (!env.ASSETS) throw new Error(`Static data file missing: ${filename}`);
  const origin = new URL(request.url).origin;
  const asset = await env.ASSETS.fetch(new Request(`${origin}/data/${filename}`));
  if (!asset.ok) throw new Error(`Static data file missing: ${filename}`);
  const payload = await asset.json();
  parsedCache.set(cacheKey, payload);
  return payload;
}

async function grokSynthesis(question, localAnswer, env) {
  if (env.CHAT_UPSTREAM === "stub") {
    return { answer: "Stubbed upstream answer.", model: "stub" };
  }
  const apiKey = env.GROK_API_KEY || env.XAI_API_KEY;
  if (!apiKey) return null;
  const base = String(env.GROK_API_BASE || "https://api.x.ai/v1").replace(/\/+$/, "");
  const model = env.GROK_MODEL || "grok-4.3";
  const context = {
    question,
    retrievalAnswer: localAnswer.answer,
    parsed: localAnswer.parsed,
    searched: localAnswer.searched,
    facets: localAnswer.facets,
    caveats: localAnswer.caveats,
    chartRenderManifest: chartRenderManifest(localAnswer),
    matches: compactChatMatches(localAnswer.matches),
  };
  const fetchImpl = env.CHAT_FETCH || fetch;
  const apiResponse = await fetchImpl(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You answer questions about historical menu data using only the supplied retrieval context. Be concise, cite candidate menu titles/dates in prose, preserve uncertainty, and do not invent external facts.",
        },
        { role: "user", content: JSON.stringify(context) },
      ],
    }),
  });
  const payload = await apiResponse.json().catch(() => ({}));
  if (!apiResponse.ok) {
    const detail = payload.error?.message || payload.message || apiResponse.statusText;
    throw new Error(`Grok request failed: ${detail}`);
  }
  const answer = payload.choices?.[0]?.message?.content;
  if (!answer) throw new Error("Grok response did not include an answer");
  return { answer, model };
}

export async function handleChat(request, env, chatApi) {
  if (request.method === "OPTIONS") return json(204, null);
  const limited = rateLimit(request, env);
  if (limited) return limited;
  const url = new URL(request.url);
  let body = {};
  if (request.method !== "GET") {
    const raw = await request.text();
    if (raw.trim()) body = JSON.parse(raw);
  }
  const question = cleanValue(body.question || body.q || url.searchParams.get("q") || url.searchParams.get("question"));
  if (!question) return json(400, { error: "Chat question is required" });
  if (!(await hasValidAskSecret(body, request.headers, env))) return json(401, { error: "Ask secret required" });

  const [menus, ontology, prices, dateEstimates, analytics] = await Promise.all([
    readSnapshot(env, request, "menus.json"),
    readSnapshot(env, request, "ontology.json").catch(() => null),
    readSnapshot(env, request, "prices.json").catch(() => ({ records: [] })),
    readSnapshot(env, request, "date-estimates.json").catch(() => ({ records: [] })),
    readSnapshot(env, request, "analytics.json").catch(() => null),
  ]);
  const localAnswer = chatApi.answerQuestion({ question, menus, ontology, prices, dateEstimates, analytics });
  const manifest = chartRenderManifest(localAnswer);
  try {
    const grok = await grokSynthesis(question, localAnswer, env);
    if (!grok) return json(200, { ...localAnswer, chartRenderManifest: manifest });
    return json(200, {
      ...localAnswer,
      engine: "grok",
      model: grok.model,
      answer: grok.answer,
      localAnswer: localAnswer.answer,
      chartRenderManifest: manifest,
    });
  } catch (error) {
    return json(200, {
      ...localAnswer,
      engine: "local-retrieval",
      llmError: error.message,
      chartRenderManifest: manifest,
    });
  }
}

export async function handleSnapshot(request, env) {
  const url = new URL(request.url);
  const filename = url.pathname.split("/").pop();
  const r2Name = R2_NAMES[filename];
  if (!r2Name) return null;
  if (env.MENU_DATA) {
    const object = await env.MENU_DATA.get(r2Name);
    if (object) {
      const headers = new Headers();
      object.writeHttpMetadata?.(headers);
      headers.set("content-type", "application/json; charset=utf-8");
      headers.set("cache-control", "public, max-age=300");
      headers.set("x-menugraph-data", "r2");
      return new Response(object.body, { headers });
    }
  }
  if (!env.ASSETS) return json(404, { error: "Snapshot is not in the data bucket yet" });
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return json(404, { error: "Snapshot is not in the data bucket yet" });
  const headers = new Headers(asset.headers);
  headers.set("x-menugraph-data", "asset-fallback");
  return new Response(asset.body, { status: asset.status, headers });
}

export function resetChatRuntime() {
  parsedCache.clear();
  rateBuckets.clear();
}
