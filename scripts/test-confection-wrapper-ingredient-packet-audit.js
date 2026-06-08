const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const { parseCsv, writeCsv } = require("./ingredient-ocr-pipeline-utils");
const { writePacketAudit } = require("./build-confection-wrapper-ingredient-packet-audit");

const root = path.join(__dirname, "..");
const packetJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_capture_packets.json");
const templatePath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority_image_map_template.csv");
const packetAuditCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_capture_packet_audit.csv");
const packetAuditJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_capture_packet_audit.json");
const packetOcrQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_packet_ocr_queue.csv");
const packetRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_capture_packet_audit_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertNoPrivatePaths(value, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(value), `${label} leaks an actual private path`);
}

const packetManifest = JSON.parse(fs.readFileSync(packetJsonPath, "utf8"));
const templateRows = parseCsv(fs.readFileSync(templatePath, "utf8"));
const packetAuditRows = parseCsv(fs.readFileSync(packetAuditCsvPath, "utf8"));
const packetAuditSummary = JSON.parse(fs.readFileSync(packetAuditJsonPath, "utf8"));
const packetOcrQueueRows = parseCsv(fs.readFileSync(packetOcrQueueCsvPath, "utf8"));
const packetRunbook = fs.readFileSync(packetRunbookPath, "utf8");
const siteSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(packetAuditSummary.schema_version, "confection_wrapper_ingredient_capture_packet_audit.v1", "packet audit should use expected schema");
assert.strictEqual(packetAuditSummary.packet_count, 49, "packet audit should cover every CWA source packet");
assert.strictEqual(packetAuditRows.length, 49, "packet audit CSV should contain one row per source packet");
assert.strictEqual(packetAuditSummary.surface_rows, 245, "packet audit should cover every capture surface");
assert.strictEqual(packetAuditSummary.primary_surface_rows, 98, "packet audit should count ingredient/nutrition surfaces");
assert.strictEqual(packetAuditSummary.ready_surface_rows, 0, "public packet audit should not mark rows ready");
assert.strictEqual(packetAuditSummary.packets_primary_ready_for_ocr, 0, "public packet audit should not mark packets ready");
assert.strictEqual(packetAuditSummary.packets_paths_needed, 49, "public packet audit should require private crops for every packet");
assert.strictEqual(packetAuditSummary.no_private_path_supplied, 245, "public packet audit should identify every missing private crop");
assert.strictEqual(packetAuditSummary.packet_path_errors, 0, "blank public template should not report path errors");
assert.strictEqual(packetAuditSummary.ocr_queue_rows, 0, "public OCR queue should be empty until private crops exist");
assert.strictEqual(packetOcrQueueRows.length, 0, "packet OCR queue CSV should have no public rows without private crops");
assert(packetRunbook.includes("Candy Wrapper Archive Packet OCR Readiness"), "packet audit runbook should identify OCR readiness");
assert(packetRunbook.includes("packet_primary_ready_for_ocr"), "packet audit runbook should explain primary-ready status");
assert(siteSummary.confection_wrapper_ingredient_capture_packet_audit_summary, "site summary should expose packet audit summary");
assert.strictEqual(
  siteSummary.confection_wrapper_ingredient_capture_packet_audit_summary.packet_count,
  packetAuditSummary.packet_count,
  "site summary packet audit should match packet audit JSON",
);
assert(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts.packet_audit_csv, "ingredient priority summary should link packet audit CSV");
assert(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts.packet_ocr_queue_csv, "ingredient priority summary should link packet OCR queue CSV");

packetAuditRows.forEach((row) => {
  assert.strictEqual(row.packet_audit_status, "packet_paths_needed", `${row.packet_id} should wait on private crop paths`);
  assert.strictEqual(row.primary_ready_for_ocr, "0", `${row.packet_id} should not be primary-ready in public state`);
  assert.strictEqual(row.candidate_only, "1", `${row.packet_id} should stay candidate-only`);
  assert.strictEqual(row.manual_verified, "0", `${row.packet_id} should not create manual verification`);
});

[
  packetAuditCsvPath,
  packetAuditJsonPath,
  packetOcrQueueCsvPath,
  packetRunbookPath,
  summaryPath,
].forEach((filePath) => assertNoPrivatePaths(fs.readFileSync(filePath, "utf8"), filePath));

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-packet-audit-"));
const fakeCropPath = path.join(tmpDir, "readable-panel-crop.png");
fs.writeFileSync(fakeCropPath, "fake image bytes; audit checks path and extension only");
const firstPacket = packetManifest.packets[0];
const primaryEvidenceIds = firstPacket.rows.slice(0, 2).map((row) => row.evidence_id);
const privateTemplateRows = templateRows.map((row) => (
  primaryEvidenceIds.includes(row.evidence_id)
    ? { ...row, local_private_image_path: fakeCropPath }
    : { ...row }
));
const privateTemplatePath = path.join(tmpDir, "private-template.csv");
const privatePacketAuditCsvPath = path.join(tmpDir, "packet-audit.csv");
const privatePacketAuditJsonPath = path.join(tmpDir, "packet-audit.json");
const privatePacketOcrQueuePath = path.join(tmpDir, "packet-ocr-queue.csv");
const privateRunbookPath = path.join(tmpDir, "packet-runbook.md");
writeCsv(privateTemplatePath, Object.keys(templateRows[0]), privateTemplateRows);

const simulated = writePacketAudit({
  runId: "unit-cwa-packet-audit",
  packetJsonPath,
  templatePath: privateTemplatePath,
  publicPacketAuditCsvPath: privatePacketAuditCsvPath,
  publicPacketAuditJsonPath: privatePacketAuditJsonPath,
  publicPacketOcrQueueCsvPath: privatePacketOcrQueuePath,
  publicRunbookPath: privateRunbookPath,
  summaryField: "",
});

const simulatedFirstPacket = simulated.packetAuditRows.find((row) => row.packet_id === firstPacket.packet_id);
assert.strictEqual(simulated.summary.packet_count, 49, "simulated private audit should still cover every packet");
assert.strictEqual(simulated.summary.ready_surface_rows, 2, "simulated private audit should mark two primary surfaces ready");
assert.strictEqual(simulated.summary.primary_ready_rows, 2, "simulated private audit should count two primary-ready rows");
assert.strictEqual(simulated.summary.packets_primary_ready_for_ocr, 1, "simulated private audit should mark one primary-ready packet");
assert.strictEqual(simulated.summary.packets_ready_all_surfaces, 0, "simulated private audit should not mark all surfaces ready");
assert.strictEqual(simulated.summary.packets_paths_needed, 48, "remaining packets should still need paths");
assert.strictEqual(simulated.summary.ocr_queue_rows, 2, "simulated private audit should create two OCR queue rows");
assert.strictEqual(simulatedFirstPacket.packet_audit_status, "packet_primary_ready_for_ocr", "first packet should become primary-ready");
assert.strictEqual(simulatedFirstPacket.primary_ready_for_ocr, 1, "first packet should expose primary OCR readiness");
assert.deepStrictEqual(
  simulated.ocrQueueRows.map((row) => row.surface_id),
  ["ingredient_panel", "nutrition_panel"],
  "simulated OCR queue should include ingredient then nutrition rows",
);
assertNoPrivatePaths(fs.readFileSync(privatePacketAuditCsvPath, "utf8"), "simulated packet audit CSV");
assertNoPrivatePaths(fs.readFileSync(privatePacketAuditJsonPath, "utf8"), "simulated packet audit JSON");
assertNoPrivatePaths(fs.readFileSync(privatePacketOcrQueuePath, "utf8"), "simulated packet OCR queue");
assertNoPrivatePaths(fs.readFileSync(privateRunbookPath, "utf8"), "simulated packet runbook");

console.log("confection wrapper ingredient packet audit tests passed");
