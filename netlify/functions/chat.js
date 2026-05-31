const fs = require("fs");
const path = require("path");
const chatApi = require("../../docs/chat-utils");

const JSON_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json; charset=utf-8",
};

const staticCache = new Map();

function response(statusCode, payload) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  };
}

function cleanValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function dataPath(filename) {
  const candidates = [
    path.join(process.cwd(), "docs", "data", filename),
    path.join(__dirname, "..", "..", "docs", "data", filename),
    path.join(__dirname, "docs", "data", filename),
    path.join(__dirname, "data", filename),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`Static data file missing from Netlify bundle: ${filename}`);
  return found;
}

function readStaticJson(filename, fallback = null) {
  try {
    const filePath = dataPath(filename);
    if (staticCache.has(filePath)) return staticCache.get(filePath);
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    staticCache.set(filePath, payload);
    return payload;
  } catch (error) {
    if (fallback !== null) return fallback;
    throw error;
  }
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

async function grokSynthesis(question, localAnswer) {
  const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  if (!apiKey) return null;

  const base = (process.env.GROK_API_BASE || "https://api.x.ai/v1").replace(/\/+$/, "");
  const model = process.env.GROK_MODEL || "grok-4.3";
  const context = {
    question,
    retrievalAnswer: localAnswer.answer,
    parsed: localAnswer.parsed,
    searched: localAnswer.searched,
    facets: localAnswer.facets,
    caveats: localAnswer.caveats,
    matches: compactChatMatches(localAnswer.matches),
  };

  const fetchImpl = globalThis.fetch;
  if (!fetchImpl) throw new Error("This Netlify function requires a Node runtime with fetch support");
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
        {
          role: "user",
          content: JSON.stringify(context),
        },
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

async function answerQuestion(question) {
  const [menus, ontology, prices, dateEstimates, analytics] = await Promise.all([
    readStaticJson("menus.json"),
    readStaticJson("ontology.json", null),
    readStaticJson("prices.json", { records: [] }),
    readStaticJson("date-estimates.json", { records: [] }),
    readStaticJson("analytics.json", null),
  ]);
  const localAnswer = chatApi.answerQuestion({
    question,
    menus,
    ontology,
    prices,
    dateEstimates,
    analytics,
  });

  try {
    const grok = await grokSynthesis(question, localAnswer);
    if (!grok) return localAnswer;
    return {
      ...localAnswer,
      engine: "grok",
      model: grok.model,
      answer: grok.answer,
      localAnswer: localAnswer.answer,
    };
  } catch (error) {
    return {
      ...localAnswer,
      engine: "local-retrieval",
      llmError: error.message,
    };
  }
}

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: JSON_HEADERS, body: "" };
    }
    const body = event.httpMethod === "GET" ? {} : parseBody(event);
    const question = cleanValue(body.question || body.q || event.queryStringParameters?.q || event.queryStringParameters?.question);
    if (!question) return response(400, { error: "Chat question is required" });
    return response(200, await answerQuestion(question));
  } catch (error) {
    return response(500, { error: error.message || "Unexpected Netlify chat error" });
  }
};
