const chatApi = require("../docs/chat-utils");

function cleanValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function readOptional(readStaticJson, filename, fallback = null) {
  try {
    return await readStaticJson(filename);
  } catch (error) {
    return fallback;
  }
}

async function hydrateShardList(readStaticJson, shards = []) {
  const records = {};
  for (const shard of shards || []) {
    const file = cleanValue(shard.file).replace(/^\/+/, "");
    if (!file) continue;
    const payload = await readOptional(readStaticJson, file, { records: {} });
    if (payload?.subshards?.length) {
      Object.assign(records, await hydrateShardList(readStaticJson, payload.subshards));
      continue;
    }
    Object.assign(records, payload?.records || {});
  }
  return records;
}

async function loadGraphOverlay(readStaticJson) {
  const [manifest, sourceCapabilities, menuOverlays, evidenceIndex] = await Promise.all([
    readOptional(readStaticJson, "graph/manifest.json", null),
    readOptional(readStaticJson, "graph/source-capabilities.json", null),
    readOptional(readStaticJson, "graph/menu-overlays.json", null),
    readOptional(readStaticJson, "graph/evidence-index.json", null),
  ]);
  if (!manifest && !menuOverlays && !evidenceIndex) return null;

  const hydratedMenuOverlays = menuOverlays?.shards?.length
    ? {
        ...menuOverlays,
        records: await hydrateShardList(readStaticJson, menuOverlays.shards),
        hydrated: true,
      }
    : menuOverlays;

  const hydratedEvidenceIndex = evidenceIndex?.shards?.length
    ? {
        ...evidenceIndex,
        hydrated: true,
        ...(await hydrateEvidenceShards(readStaticJson, evidenceIndex.shards)),
      }
    : evidenceIndex;

  return {
    manifest,
    sourceCapabilities,
    menuOverlays: hydratedMenuOverlays,
    evidenceIndex: hydratedEvidenceIndex,
  };
}

async function hydrateEvidenceShards(readStaticJson, shards = []) {
  const output = {};
  for (const shard of shards || []) {
    const evidenceType = cleanValue(shard.evidenceType);
    const file = cleanValue(shard.file).replace(/^\/+/, "");
    if (!evidenceType || !file) continue;
    const payload = await readOptional(readStaticJson, file, { records: {} });
    output[evidenceType] = payload?.records || {};
  }
  return output;
}

function countObject(value) {
  return value && typeof value === "object" ? Object.keys(value).length : 0;
}

function compactTopCounts(counts = {}, limit = 12) {
  return Object.entries(counts || {})
    .map(([label, count]) => ({ label, count: Number(count || 0) }))
    .filter((row) => row.label && row.count)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function compactGraphContext(graphOverlay) {
  const manifest = graphOverlay?.manifest || {};
  const overlays = graphOverlay?.menuOverlays || {};
  const evidenceIndex = graphOverlay?.evidenceIndex || {};
  return {
    generatedAt: manifest.generatedAt || overlays.generatedAt || null,
    summary: manifest.summary || {},
    overlayRecords: countObject(overlays.records),
    hydrated: Boolean(overlays.hydrated || evidenceIndex.hydrated),
    evidenceCounts: {
      dishMentions: countObject(evidenceIndex.dishMentions),
      priceObservations: countObject(evidenceIndex.priceObservations),
      dateEvidence: countObject(evidenceIndex.dateEvidence),
      ocrCandidates: countObject(evidenceIndex.ocrCandidates),
      ocrFailures: countObject(evidenceIndex.ocrFailures),
      recipeClusters: countObject(evidenceIndex.recipeClusters),
      enrichmentGaps: countObject(evidenceIndex.enrichmentGaps),
    },
  };
}

function compactEnrichmentContext(inputs = {}) {
  const status = inputs.enrichmentStatus?.summary || {};
  const runPlan = inputs.runPlan?.summary || {};
  const coverage = inputs.coverageReport?.summary || {};
  const sourceRouteReview = inputs.sourceRouteReview?.summary || {};
  const productJourney = inputs.productJourney || {};
  const recipeBridge = inputs.recipeBridge || {};
  return {
    status: {
      menusAvailable: Number(status.menusAvailable || 0),
      dishMentions: Number(status.dishMentions || 0),
      priceObservations: Number(status.priceObservations || 0),
      ocrProcessedPages: Number(status.ocrProcessedPages || 0),
      ocrTextSpans: Number(status.ocrTextSpans || 0),
      ocrDishMentions: Number(status.ocrDishMentions || 0),
      ocrPriceObservations: Number(status.ocrPriceObservations || 0),
      ocrPagesFailed: Number(status.ocrPagesFailed || 0),
      topIngredients: compactTopCounts(status.ingredientTags, 10),
      ocrLastBatch: status.ocrLastBatch || null,
    },
    ocrQueue: {
      pendingCandidates: Number(runPlan.pendingCandidates || inputs.ocrQueue?.summary?.processing?.pendingCandidates || 0),
      pendingEstimatedImages: Number(runPlan.pendingEstimatedImages || inputs.ocrQueue?.summary?.processing?.pendingEstimatedImages || 0),
      byRoute: inputs.ocrQueue?.summary?.byRoute || {},
      progressiveRunPlan: inputs.ocrQueue?.summary?.progressiveRunPlan?.runs?.slice(0, 6) || runPlan.progressiveRunPlan?.runs?.slice?.(0, 6) || [],
    },
    coverage: {
      sources: Number(coverage.sources || 0),
      menus: Number(coverage.menus || 0),
      ocrCandidates: Number(coverage.ocrCandidates || 0),
      ocrFailures: Number(coverage.ocrFailures || 0),
    },
    routeReview: {
      imageRouteReviewSources: Number(sourceRouteReview.imageRouteReviewSources || 0),
      reviewRows: Number(sourceRouteReview.total || sourceRouteReview.rows || 0),
    },
    productJourney: {
      products: Number(productJourney.metrics?.products || 0),
      ownershipMilestones: Number(productJourney.metrics?.ownershipMilestones || 0),
      evidencePhotoLinks: Number(productJourney.metrics?.evidencePhotoLinks || 0),
    },
    recipeBridge: {
      clusters: Number(recipeBridge.summary?.clusters || recipeBridge.metrics?.clusters || 0),
      dishLinks: Number(recipeBridge.summary?.dishLinks || recipeBridge.metrics?.dishLinks || 0),
      status: cleanValue(recipeBridge.scope?.recipeJourneyStatus || "derived_bridge_only"),
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
    graphEvidenceCounts: match.graphEvidenceCounts,
  }));
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
      Number(answer.searched?.duplicateCandidates || 0) ? `${Number(answer.searched.duplicateCandidates).toLocaleString()} near-duplicate candidates were collapsed before rendering.` : "",
    ].filter(Boolean),
    provenance: {
      source: "Committed MenuGraph snapshots, graph overlays, local Vision OCR dish/price evidence, NYPL structured rows, and date-estimate metadata where available.",
      candidates: Number(answer.matches?.length || 0),
      searchedDocuments: Number(answer.searched?.documents || 0),
      returnedMatches: Number(answer.searched?.returnedMatches || answer.matches?.length || 0),
      graphOverlayRecords: Number(answer.graphContext?.overlayRecords || 0),
      ocrProcessedPages: Number(answer.enrichmentContext?.status?.ocrProcessedPages || 0),
    },
  };
}

function grokApiKey(env = process.env) {
  return env.GROK_API_KEY || env.XAI_API_KEY || "";
}

async function grokSynthesis(question, localAnswer, options = {}) {
  const apiKey = options.apiKey || grokApiKey(options.env || process.env);
  if (!apiKey) return null;

  const base = (options.apiBase || process.env.GROK_API_BASE || "https://api.x.ai/v1").replace(/\/+$/, "");
  const model = options.model || process.env.GROK_MODEL || "grok-4.3";
  const context = {
    question,
    retrievalAnswer: localAnswer.answer,
    parsed: localAnswer.parsed,
    searched: localAnswer.searched,
    facets: localAnswer.facets,
    analysis: localAnswer.analysis,
    caveats: localAnswer.caveats,
    chartRenderManifest: chartRenderManifest(localAnswer),
    graphContext: localAnswer.graphContext,
    enrichmentContext: localAnswer.enrichmentContext,
    matches: compactChatMatches(localAnswer.matches),
  };

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (!fetchImpl) throw new Error("Grok synthesis requires a fetch-capable Node runtime");
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
            "You answer questions about historical menu data using only the supplied MenuGraph retrieval, graph, and enrichment context. Use local Vision OCR evidence when present, distinguish candidate evidence from verified facts, cite candidate menu titles/dates in prose, preserve uncertainty, and do not invent external facts.",
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
  return {
    answer,
    model,
    usage: payload.usage || null,
  };
}

async function loadChatInputs(readStaticJson) {
  const [
    menus,
    ontology,
    prices,
    dateEstimates,
    analytics,
    graphOverlay,
    enrichmentStatus,
    runPlan,
    coverageReport,
    sourceRouteReview,
    ocrQueue,
    productJourney,
    recipeBridge,
  ] = await Promise.all([
    readStaticJson("menus.json"),
    readOptional(readStaticJson, "ontology.json", null),
    readOptional(readStaticJson, "prices.json", { records: [] }),
    readOptional(readStaticJson, "date-estimates.json", { records: [] }),
    readOptional(readStaticJson, "analytics.json", null),
    loadGraphOverlay(readStaticJson),
    readOptional(readStaticJson, "enrichment-status.json", { summary: {} }),
    readOptional(readStaticJson, "enrichment/run-plan.json", { summary: {} }),
    readOptional(readStaticJson, "enrichment/coverage-report.json", { summary: {} }),
    readOptional(readStaticJson, "enrichment/source-route-review.json", { summary: {} }),
    readOptional(readStaticJson, "enrichment/ocr-triage-queue.json", { summary: {} }),
    readOptional(readStaticJson, "product-evidence/ingredient-journey.json", { metrics: {} }),
    readOptional(readStaticJson, "enrichment/recipe-bridge.json", { summary: {} }),
  ]);
  return {
    menus,
    ontology,
    prices,
    dateEstimates,
    analytics,
    graphOverlay,
    enrichmentContext: compactEnrichmentContext({
      enrichmentStatus,
      runPlan,
      coverageReport,
      sourceRouteReview,
      ocrQueue,
      productJourney,
      recipeBridge,
    }),
    graphContext: compactGraphContext(graphOverlay),
  };
}

async function answerMenuGraphQuestion(options = {}) {
  const question = cleanValue(options.question);
  if (!question) throw new Error("Chat question is required");
  if (typeof options.readStaticJson !== "function") throw new Error("readStaticJson is required");

  const inputs = await loadChatInputs(options.readStaticJson);
  const localAnswer = {
    ...chatApi.answerQuestion({
      question,
      menus: inputs.menus,
      ontology: inputs.ontology,
      prices: inputs.prices,
      dateEstimates: inputs.dateEstimates,
      analytics: inputs.analytics,
      graphOverlay: inputs.graphOverlay,
    }),
    graphContext: inputs.graphContext,
    enrichmentContext: inputs.enrichmentContext,
  };
  localAnswer.caveats = [
    ...(localAnswer.caveats || []),
    "Ask context includes graph overlays and local Vision OCR derived dish, price, ingredient, and text-span evidence where those rows have been committed.",
  ];
  const manifest = chartRenderManifest(localAnswer);
  const preferGrok = options.preferGrok !== false;
  const requireGrok = Boolean(options.requireGrok);

  if (!preferGrok && !requireGrok) {
    return { ...localAnswer, chartRenderManifest: manifest, grokStatus: "not_requested" };
  }

  try {
    const grok = await grokSynthesis(question, localAnswer, options);
    if (!grok) {
      return {
        ...localAnswer,
        chartRenderManifest: manifest,
        grokStatus: requireGrok ? "missing_api_key_required" : "missing_api_key",
        llmError: requireGrok ? "Grok API key is not configured; returned enriched static retrieval instead." : undefined,
      };
    }
    return {
      ...localAnswer,
      engine: "grok",
      model: grok.model,
      usage: grok.usage,
      answer: grok.answer,
      localAnswer: localAnswer.answer,
      chartRenderManifest: manifest,
      grokStatus: "synthesized",
    };
  } catch (error) {
    return {
      ...localAnswer,
      engine: "local-retrieval",
      llmError: error.message,
      chartRenderManifest: manifest,
      grokStatus: requireGrok ? "grok_error_required" : "grok_error",
    };
  }
}

module.exports = {
  answerMenuGraphQuestion,
  chartRenderManifest,
  compactEnrichmentContext,
  compactGraphContext,
  grokSynthesis,
  hydrateShardList,
  loadChatInputs,
};
