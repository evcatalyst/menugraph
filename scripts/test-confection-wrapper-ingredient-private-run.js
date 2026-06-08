const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");
const { writePrivateRunHandoff } = require("./build-confection-wrapper-ingredient-private-run");

const root = path.join(__dirname, "..");
const packetJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_capture_packets.json");
const templatePath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority_image_map_template.csv");
const handoffCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_private_run_handoff.csv");
const handoffJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_private_run_handoff.json");
const handoffRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_private_run_handoff_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

function assertNoActualPrivatePath(value, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\//.test(value), `${label} leaks an actual private path`);
}

const handoff = JSON.parse(fs.readFileSync(handoffJsonPath, "utf8"));
const handoffRows = parseCsv(fs.readFileSync(handoffCsvPath, "utf8"));
const handoffRunbook = fs.readFileSync(handoffRunbookPath, "utf8");
const siteSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(handoff.schema_version, "confection_wrapper_ingredient_private_run_handoff.v1", "handoff should use expected schema");
assert.strictEqual(handoff.priority_strategy, "candy_wrapper_archive_source_site_first_panel_first", "handoff should prioritize CWA source pages");
assert.strictEqual(handoff.source_domain, "www.candywrapperarchive.com", "handoff should stay CWA-specific");
assert.strictEqual(handoff.selected_packets, 49, "default public handoff should select every known CWA source packet");
assert.strictEqual(handoff.selected_surface_rows, 245, "all CWA packets should produce 245 surface rows");
assert.strictEqual(handoff.primary_surface_rows, 98, "all CWA packets should include ingredient/nutrition rows first");
assert.strictEqual(handoff.support_surface_rows, 147, "all CWA packets should include support context rows");
assert.strictEqual(handoff.selected_product_count, 9, "default handoff should cover every known CWA lineage product");
assert.strictEqual(handoff.selected_source_url_count, 49, "default handoff should cover every known CWA source page");
assert.strictEqual(handoff.by_product[0].key, "Butterfinger Bar", "default handoff should start with the densest CWA lineage product");
assert.strictEqual(handoff.public_safety.private_paths_committed, false, "handoff must not commit private paths");
assert.strictEqual(handoff.public_safety.images_committed, false, "handoff must not commit images");
assert.strictEqual(handoff.public_safety.ocr_text_committed, false, "handoff must not commit OCR text");
assert.strictEqual(handoff.public_safety.manual_verified_created, false, "handoff must not create verification");
assert.strictEqual(handoffRows.length, 49, "handoff CSV should contain selected packets");
assert(handoffRows.every((row) => row.capture_surface_order.startsWith("ingredient_panel;nutrition_panel")), "packet handoff should order ingredient/nutrition first");
assert(handoffRows.every((row) => row.candidate_only === "1" && row.manual_verified === "0"), "handoff rows should stay candidate-only");
assert(handoffRunbook.includes("CWA Ingredient Packet Private Run Handoff"), "public runbook should identify the handoff");
assert(handoffRunbook.includes("first source-site priority"), "public runbook should explain the CWA-first strategy");
assert(handoffRunbook.includes("<private-template>"), "public runbook should use placeholders, not local paths");
assert(siteSummary.confection_wrapper_ingredient_private_run_handoff_summary, "site summary should expose private run handoff");
assert.strictEqual(
  siteSummary.confection_wrapper_ingredient_private_run_handoff_summary.selected_packets,
  handoff.selected_packets,
  "site summary handoff should match generated handoff",
);
assert(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts.private_run_handoff_csv, "ingredient priority summary should link handoff CSV");
assert(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts.private_run_handoff_runbook_md, "ingredient priority summary should link handoff runbook");

[
  handoffCsvPath,
  handoffJsonPath,
  handoffRunbookPath,
  summaryPath,
].forEach((filePath) => assertNoActualPrivatePath(fs.readFileSync(filePath, "utf8"), filePath));

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cwa-private-run-"));
const simulatedFullRun = writePrivateRunHandoff({
  runId: "unit-cwa-private-run-all",
  runDir: path.join(tmpDir, "run-all"),
  packetsPath: packetJsonPath,
  templatePath,
  publicHandoffCsvPath: path.join(tmpDir, "handoff-all.csv"),
  publicHandoffJsonPath: path.join(tmpDir, "handoff-all.json"),
  publicRunbookPath: path.join(tmpDir, "handoff-all.md"),
  product: "",
  packetId: "",
  vintage: "",
  limit: 0,
  summaryField: "",
});
assert.strictEqual(simulatedFullRun.summary.selected_packets, 49, "full private run should select every CWA packet");
assert.strictEqual(simulatedFullRun.summary.selected_surface_rows, 245, "full private run should produce one row per packet surface");
assert(fs.existsSync(simulatedFullRun.privateArtifacts.private_template_path), "full private run should write a private template");
assert(fs.existsSync(simulatedFullRun.privateArtifacts.private_runbook_path), "full private run should write a private runbook");
const fullPrivateRows = parseCsv(fs.readFileSync(simulatedFullRun.privateArtifacts.private_template_path, "utf8"));
assert.strictEqual(fullPrivateRows.length, 245, "private template should contain one row per selected surface");
assert.strictEqual(fullPrivateRows[0].surface_id, "ingredient_panel", "private template should start each packet with ingredient panel");
assert.strictEqual(fullPrivateRows[1].surface_id, "nutrition_panel", "private template should capture nutrition second");
assert(fullPrivateRows.every((row) => row.local_private_image_path === "" && row.processed_private_image_path === ""), "private template should start with blank crop paths");
assertNoActualPrivatePath(fs.readFileSync(path.join(tmpDir, "handoff-all.csv"), "utf8"), "full public handoff CSV");
assertNoActualPrivatePath(fs.readFileSync(path.join(tmpDir, "handoff-all.json"), "utf8"), "full public handoff JSON");
assertNoActualPrivatePath(fs.readFileSync(path.join(tmpDir, "handoff-all.md"), "utf8"), "full public handoff runbook");

const simulated = writePrivateRunHandoff({
  runId: "unit-cwa-private-run",
  runDir: path.join(tmpDir, "run-filtered"),
  packetsPath: packetJsonPath,
  templatePath,
  publicHandoffCsvPath: path.join(tmpDir, "handoff.csv"),
  publicHandoffJsonPath: path.join(tmpDir, "handoff.json"),
  publicRunbookPath: path.join(tmpDir, "handoff.md"),
  product: "tootsie_roll",
  packetId: "",
  vintage: "",
  limit: 1,
  summaryField: "",
});
assert.strictEqual(simulated.summary.selected_packets, 1, "filtered private run should select one packet");
assert.strictEqual(simulated.summary.selected_surface_rows, 5, "one packet should produce five surface rows");
assert.strictEqual(simulated.packets[0].product_id, "tootsie_roll", "filtered private run should honor product id");
assert.deepStrictEqual(
  simulated.rows.slice(0, 2).map((row) => row.surface_id),
  ["ingredient_panel", "nutrition_panel"],
  "filtered private run should keep ingredient/nutrition first",
);
assert(fs.existsSync(simulated.privateArtifacts.private_template_path), "filtered private run should write a private template");
assert(fs.existsSync(simulated.privateArtifacts.private_runbook_path), "filtered private run should write a private runbook");
assertNoActualPrivatePath(fs.readFileSync(path.join(tmpDir, "handoff.csv"), "utf8"), "filtered public handoff CSV");
assertNoActualPrivatePath(fs.readFileSync(path.join(tmpDir, "handoff.json"), "utf8"), "filtered public handoff JSON");
assertNoActualPrivatePath(fs.readFileSync(path.join(tmpDir, "handoff.md"), "utf8"), "filtered public handoff runbook");

console.log("confection wrapper ingredient private run tests passed");
