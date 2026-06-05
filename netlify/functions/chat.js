const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { answerMenuGraphQuestion } = require("../../scripts/chat-service");

const JSON_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json; charset=utf-8",
};

const staticCache = new Map();
const DEFAULT_ASK_SECRET_HASH = "8f388ed94f5ff3d417b9b3f897bf9fc4d56a2d0dd6778905d8440a938558d30a";

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

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function timingSafeEqualText(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function askSecretHash() {
  if (process.env.MENUGRAPH_ASK_SECRET_HASH) return cleanValue(process.env.MENUGRAPH_ASK_SECRET_HASH);
  if (process.env.MENUGRAPH_ASK_SECRET) return sha256Hex(process.env.MENUGRAPH_ASK_SECRET);
  return DEFAULT_ASK_SECRET_HASH;
}

function hasValidAskSecret(body, headers = {}) {
  const expected = askSecretHash();
  const providedHash = cleanValue(body.askSecretHash || headers["x-menugraph-ask-secret-hash"]);
  if (providedHash && timingSafeEqualText(providedHash, expected)) return true;
  const providedSecret = cleanValue(body.askSecret || body.secret || headers["x-menugraph-ask-secret"]);
  return Boolean(providedSecret && timingSafeEqualText(sha256Hex(providedSecret), expected));
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

async function answerQuestion(question, options = {}) {
  return answerMenuGraphQuestion({
    question,
    readStaticJson,
    requireGrok: options.requireGrok,
    preferGrok: options.preferGrok,
  });
}

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: JSON_HEADERS, body: "" };
    }
    const body = event.httpMethod === "GET" ? {} : parseBody(event);
    const question = cleanValue(body.question || body.q || event.queryStringParameters?.q || event.queryStringParameters?.question);
    if (!question) return response(400, { error: "Chat question is required" });
    if (!hasValidAskSecret(body, event.headers || {})) return response(401, { error: "Ask secret required" });
    return response(200, await answerQuestion(question, {
      requireGrok: Boolean(body.requireGrok || body.forceGrok),
      preferGrok: body.preferGrok !== false,
    }));
  } catch (error) {
    return response(500, { error: error.message || "Unexpected Netlify chat error" });
  }
};
