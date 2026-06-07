const assert = require("assert");
const fs = require("fs");
const {
  approvedSparkTaskTypes,
  publicHybridSummaryPath,
  publicModelSummaryCsvPath,
  publicReviewQueueCsvPath,
  publicRunSummaryCsvPath,
  readFullQueue,
  selectQueueRows,
} = require("./ingredient-ocr-pipeline-utils");
const { packetRows } = require("./build-spark-ocr-packets");
const { providerRegistry, reviewBatchPlan } = require("./model-assist-router");
const { buildImageMap, publicCaptureRow } = require("./capture-ingredient-ocr-assets");
const { buildReviewQueue } = require("./summarize-ingredient-ocr-run");

function assertNoPrivatePaths(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaked a private path`);
}

const rows = selectQueueRows(readFullQueue(), { limit: 60 });
assert.strictEqual(rows.length, 60, "expected queue test rows");

const packets = packetRows(rows, 15);
assert(packets.length > 0, "expected packets");
for (const packet of packets) {
  assert(approvedSparkTaskTypes.includes(packet.packet_type), `unexpected packet type ${packet.packet_type}`);
  assert(packet.source_rows.length <= 15, "packet size exceeded");
  assert.strictEqual(packet.model_route.primary_model, "gpt-5.3-codex-spark");
  assert.strictEqual(packet.model_route.quality_gate_model, "gpt-5.5");
  assert(packet.do_not_do.some((item) => item.includes("manual_verified")), "missing manual_verified guardrail");
  assert(packet.source_rows.every((row) => row.evidence_id), "packet row missing evidence_id");
}

process.env.xai_api = "test-secret";
const registry = providerRegistry();
assert.strictEqual(registry.providers.xai.api_key_present, true, "expected xAI key presence");
assert(!JSON.stringify(registry).includes("test-secret"), "registry leaked API key");
delete process.env.xai_api;

const reviewBatches = reviewBatchPlan(rows, 25);
assert(reviewBatches.length > 0, "expected GPT-5.5 review batch plan");
for (const batch of reviewBatches) {
  assert(!batch.allowed_statuses.includes("manual_verified"), "GPT-5.5 can set manual_verified");
  assert(batch.cannot_set_status.includes("manual_verified"), "missing cannot_set_status guardrail");
}

const publicCapture = publicCaptureRow(rows[0], {
  capture_status: "captured_local_image",
  processed_status: "processed_passthrough",
  original_sha256: "abc",
  processed_sha256: "def",
  original_private_path: "/private/tmp/secret.jpg",
  processed_private_path: "/private/tmp/secret-processed.jpg",
  cleanup_actions: ["copy_for_vision_ocr"],
  image_map_value: "/private/tmp/secret-processed.jpg",
});
assert.strictEqual(publicCapture.ready_for_ocr, 1, "expected ready_for_ocr public flag");
assertNoPrivatePaths(JSON.stringify(publicCapture), "public capture row");
const privateMap = buildImageMap([{ evidence_id: rows[0].evidence_id, image_map_value: "/private/tmp/secret-processed.jpg" }]);
assert.strictEqual(privateMap[rows[0].evidence_id], "/private/tmp/secret-processed.jpg", "private image map should retain paths");

const reviewQueue = buildReviewQueue(rows.slice(0, 5), [publicCapture], []);
assert.strictEqual(reviewQueue.length, 5, "expected review queue rows");
assert(reviewQueue.every((row) => Number(row.candidate_only) === 1), "review rows must be candidate-only");
assert(reviewQueue.every((row) => Number(row.manual_verified) === 0), "review rows cannot be manual verified");

for (const filePath of [
  publicHybridSummaryPath,
  publicModelSummaryCsvPath,
  publicRunSummaryCsvPath,
  publicReviewQueueCsvPath,
]) {
  assert(fs.existsSync(filePath), `${filePath} missing`);
  assertNoPrivatePaths(fs.readFileSync(filePath, "utf8"), filePath);
}

const publicSummary = JSON.parse(fs.readFileSync(publicHybridSummaryPath, "utf8"));
assert.strictEqual(publicSummary.public_safety.images_committed, false, "public summary should not publish images");
assert.strictEqual(publicSummary.public_safety.manual_verified_created, false, "manual verification should not be model-created");
assert(publicSummary.model_routes.spark_packets_generated > 0, "expected spark packet count");
assert(publicSummary.model_routes.gpt55_review_batches_planned > 0, "expected GPT-5.5 batch count");

console.log("hybrid OCR pipeline tests passed");
