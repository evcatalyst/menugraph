(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.MenuGraphContract = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const VERSION = 1;
  const VALID_NODE_TYPES = new Set([
    "Source",
    "Capability",
    "Menu",
    "Venue",
    "Dish",
    "Term",
    "DateEvidence",
    "PriceObservation",
    "MatchEvidence",
  ]);
  const VALID_EDGE_TYPES = new Set([
    "SUPPORTS_CAPABILITY",
    "HAS_MENU",
    "SERVED_AT",
    "MENTIONS_DISH",
    "HAS_PRICE",
    "HAS_DATE_EVIDENCE",
    "MATCHES_MENU",
    "HAS_ONTOLOGY_TERM",
  ]);
  const VALID_DATE_CONFIDENCE = new Set(["A", "B", "C", "D", "X"]);
  const STATIC_ARTIFACT_BUDGET_BYTES = 8 * 1024 * 1024;

  function cleanValue(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function hasRequiredNodeFields(node) {
    return Boolean(
      cleanValue(node?.id) &&
        VALID_NODE_TYPES.has(node?.type) &&
        cleanValue(node?.label) &&
        cleanValue(node?.source) &&
        Number.isFinite(Number(node?.confidence)) &&
        node?.provenance &&
        typeof node.provenance === "object"
    );
  }

  function hasRequiredEdgeFields(edge) {
    return Boolean(
      cleanValue(edge?.id) &&
        VALID_EDGE_TYPES.has(edge?.type) &&
        cleanValue(edge?.from) &&
        cleanValue(edge?.to) &&
        Number.isFinite(Number(edge?.weight)) &&
        Number.isFinite(Number(edge?.confidence)) &&
        edge?.provenance &&
        typeof edge.provenance === "object"
    );
  }

  function validateScores(source) {
    const errors = [];
    const scores = source?.scores || {};
    for (const [key, value] of Object.entries(scores)) {
      const number = Number(value);
      if (!Number.isFinite(number) || number < 1 || number > 10) {
        errors.push(`source ${source?.id || "unknown"} score ${key} must be 1-10`);
      }
    }
    return errors;
  }

  function validateGraph(graph, options = {}) {
    const errors = [];
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    const nodeIds = new Set();

    for (const node of nodes) {
      if (!hasRequiredNodeFields(node)) errors.push(`invalid node ${node?.id || "(missing id)"}`);
      if (nodeIds.has(node.id)) errors.push(`duplicate node ${node.id}`);
      nodeIds.add(node.id);
      if (node.type === "DateEvidence" && node.dateConfidence && !VALID_DATE_CONFIDENCE.has(node.dateConfidence)) {
        errors.push(`invalid date confidence on ${node.id}`);
      }
    }

    for (const edge of edges) {
      if (!hasRequiredEdgeFields(edge)) errors.push(`invalid edge ${edge?.id || "(missing id)"}`);
      if (!nodeIds.has(edge.from)) errors.push(`edge ${edge.id} missing from node ${edge.from}`);
      if (!nodeIds.has(edge.to)) errors.push(`edge ${edge.id} missing to node ${edge.to}`);
    }

    if (options.maxBytes && Buffer.byteLength(JSON.stringify(graph), "utf8") > options.maxBytes) {
      errors.push(`graph exceeds ${options.maxBytes} byte budget`);
    }

    return errors;
  }

  function validateSourceEvaluations(payload) {
    const errors = [];
    const capabilities = new Set((payload?.capabilities || []).map((item) => item.id));
    if (!capabilities.size) errors.push("source evaluations must include capabilities");
    for (const source of payload?.sources || []) {
      if (!cleanValue(source.id) || !cleanValue(source.label)) errors.push("source evaluation missing id or label");
      errors.push(...validateScores(source));
      for (const [capability, value] of Object.entries(source.capabilityWeights || {})) {
        const number = Number(value);
        if (!capabilities.has(capability)) errors.push(`source ${source.id} references unknown capability ${capability}`);
        if (!Number.isFinite(number) || number < 1 || number > 10) errors.push(`source ${source.id} capability ${capability} must be 1-10`);
      }
    }
    return errors;
  }

  return {
    VERSION,
    STATIC_ARTIFACT_BUDGET_BYTES,
    VALID_NODE_TYPES,
    VALID_EDGE_TYPES,
    VALID_DATE_CONFIDENCE,
    hasRequiredNodeFields,
    hasRequiredEdgeFields,
    validateGraph,
    validateSourceEvaluations,
  };
});
