const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const boardPath = path.join(root, "docs/data/product-evidence/ingredient_panel_acquisition_board.json");
const slotCsvPath = path.join(root, "docs/data/product-evidence/exports/ingredient_panel_acquisition_slots.csv");
const productCsvPath = path.join(root, "docs/data/product-evidence/exports/ingredient_panel_acquisition_products.csv");
const reportPath = path.join(root, "docs/data/product-evidence/exports/ingredient_panel_acquisition_report.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

const board = JSON.parse(fs.readFileSync(boardPath, "utf8"));
const slotRows = parseCsv(fs.readFileSync(slotCsvPath, "utf8"));
const productRows = parseCsv(fs.readFileSync(productCsvPath, "utf8"));
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(board.schema_version, "ingredient_panel_acquisition_board.v1", "board schema should be versioned");
assert.strictEqual(board.totals.products, 120, "board should cover the full corpus");
assert.strictEqual(board.totals.slots, 720, "board should cover six vintage slots for each product");
assert.strictEqual(board.totals.story_rich_pilot_products, 10, "board should preserve the 10-product pilot rollup");
assert.strictEqual(slotRows.length, board.totals.slots, "slot CSV should match board slot count");
assert.strictEqual(productRows.length, board.totals.products, "product CSV should match board product count");
assert(fs.existsSync(reportPath), "markdown report should exist");
assert(fs.statSync(reportPath).size > 0, "markdown report should not be empty");

assert.strictEqual(board.totals.manual_verified_slots, 0, "board must not invent manually verified labels");
assert(board.totals.public_panel_embed_slots >= 1, "board should expose current public primary panel/document embeds");
assert(board.totals.needs_panel_acquisition_slots > 600, "board should make the remaining acquisition gap explicit");
assert(board.totals.missing_primary_panel_slots > 400, "board should identify slots with no primary panel candidate");
assert(board.totals.pilot_needs_panel_acquisition_slots > 40, "pilot products should still show substantial acquisition work");

[
  "board_json",
  "slot_csv",
  "product_csv",
  "report_markdown",
].forEach((field) => {
  assert(board.artifacts[field], `board missing artifact ${field}`);
  assert(summary.ingredient_panel_acquisition_summary.artifacts[field], `summary missing artifact ${field}`);
});

assert.deepStrictEqual(
  summary.ingredient_panel_acquisition_summary.totals,
  board.totals,
  "summary totals should match board totals",
);
assert.strictEqual(
  board.totals.public_panel_embed_slots,
  summary.public_photo_ocr_summary.primary_ingredient_panel_rows,
  "public primary panel slots should align with public photo OCR primary rows",
);

const bySlot = new Map(slotRows.map((row) => [`${row.product_id}:${row.version_id}`, row]));
const oreo1993 = bySlot.get("oreo_original_chocolate_sandwich_cookies:package_1993");
assert(oreo1993, "Oreo 1993 slot should appear in acquisition board");
assert.strictEqual(oreo1993.panel_acquisition_state, "panel_source_candidate", "Oreo 1993 should be a panel source candidate");
assert.strictEqual(oreo1993.public_panel_embed_count, "0", "Oreo 1993 should not be treated as a public panel embed");
assert.strictEqual(oreo1993.needs_panel_acquisition, "1", "Oreo 1993 should remain in the acquisition worklist");
assert(/OCR|crop/i.test(oreo1993.next_action), "Oreo 1993 next action should call for crop/OCR work");

const doritosEarliest = bySlot.get("doritos_nacho_cheese:earliest_verified_label");
assert(doritosEarliest, "Doritos earliest slot should appear in acquisition board");
assert.strictEqual(doritosEarliest.panel_acquisition_state, "secondary_context_only", "front/package-only Doritos evidence should remain secondary context");
assert.strictEqual(doritosEarliest.missing_primary_panel, "1", "front/package-only Doritos evidence should require primary panel acquisition");

slotRows.forEach((row) => {
  assert(row.product_id, "slot row missing product id");
  assert(row.version_id, `${row.product_id} missing version id`);
  assert(row.panel_acquisition_state, `${row.product_id}/${row.version_id} missing panel acquisition state`);
  assert(row.next_action, `${row.product_id}/${row.version_id} missing next action`);
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:|\.cache\//.test(JSON.stringify(row)), `${row.product_id}/${row.version_id} leaks a private path`);
});

console.log("ingredient panel acquisition board tests passed");
