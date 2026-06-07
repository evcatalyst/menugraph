const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.join(__dirname, "..");
const manifestPath = path.join(root, "docs/data/product-evidence/pilot_photo_capture_batches.json");
const batchCsvPath = path.join(root, "docs/data/product-evidence/exports/pilot_photo_capture_batches.csv");
const rowCsvPath = path.join(root, "docs/data/product-evidence/exports/pilot_photo_capture_rows.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/pilot_photo_capture_runbook.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

const pilotProducts = [
  "oreo_original_chocolate_sandwich_cookies",
  "doritos_nacho_cheese",
  "cheerios_original",
  "coca_cola_classic",
  "campbells_tomato_soup",
  "heinz_tomato_ketchup",
  "poptarts_frosted_strawberry",
  "kraft_macaroni_and_cheese_original",
  "mcdonalds_big_mac",
  "mcdonalds_chicken_mcnuggets",
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') inQuotes = false;
      else value += char;
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") value += char;
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const headers = rows.shift() || [];
  return rows
    .filter((cells) => cells.some(Boolean))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function assertNoPrivatePaths(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaked a private path`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const batchRows = parseCsv(fs.readFileSync(batchCsvPath, "utf8"));
const captureRows = parseCsv(fs.readFileSync(rowCsvPath, "utf8"));
const runbook = fs.readFileSync(runbookPath, "utf8");

assert.strictEqual(manifest.schema_version, 1, "pilot capture manifest schema should be versioned");
assert.strictEqual(manifest.scope, "story_rich_pilot_photo_capture", "manifest should be pilot scoped");
assert.strictEqual(manifest.totals.products, 10, "all 10 story-rich pilots should be represented");
assert.strictEqual(manifest.totals.selected_rows, 101, "expected all story-rich pilot photo-proof rows");
assert.strictEqual(manifest.totals.panel_capture_needed, 94, "expected pilot panel-capture rows");
assert.strictEqual(manifest.totals.ingredient_signal_rows, 94, "expected pilot ingredient-signal rows");
assert(manifest.totals.batches > 0 && manifest.totals.batches <= 25, "batch count should be operator-sized");
assert.strictEqual(batchRows.length, manifest.totals.batches, "batch CSV should match manifest batch count");
assert.strictEqual(captureRows.length, manifest.totals.selected_rows, "row CSV should match selected rows");
assert(runbook.includes("Do not commit captures"), "runbook should include public-safety instructions");

const rollupProducts = new Set(manifest.product_rollups.map((product) => product.product_id));
pilotProducts.forEach((productId) => assert(rollupProducts.has(productId), `missing pilot product ${productId}`));

manifest.batches.forEach((batch) => {
  assert(batch.batch_id, "batch missing id");
  assert(pilotProducts.includes(batch.product_id), `unexpected batch product ${batch.product_id}`);
  assert(batch.public_safety.candidate_only, `${batch.batch_id} missing candidate-only guardrail`);
  assert.strictEqual(batch.public_safety.commit_images, false, `${batch.batch_id} allows image commits`);
  assert.strictEqual(batch.public_safety.expose_private_paths, false, `${batch.batch_id} allows private path exposure`);
  assert(batch.rows.length > 0, `${batch.batch_id} missing rows`);
  batch.rows.forEach((row) => {
    assert(row.evidence_id, `${batch.batch_id} row missing evidence id`);
    assert(row.source_url, `${row.evidence_id} missing source URL`);
    assert(row.capture_strategy, `${row.evidence_id} missing capture strategy`);
    assert(row.crop_target, `${row.evidence_id} missing crop target`);
    assert(row.ocr_expected_surface, `${row.evidence_id} missing expected OCR surface`);
    assert(row.private_image_map_keys.includes(row.evidence_id), `${row.evidence_id} missing evidence image-map key`);
    assert(row.allowed_public_output.includes("no private image path"), `${row.evidence_id} missing public-output guardrail`);
    assertNoPrivatePaths(JSON.stringify(row), row.evidence_id);
  });
});

assert(summary.pilot_photo_capture_summary, "summary missing pilot capture rollup");
assert.strictEqual(
  summary.pilot_photo_capture_summary.selected_row_count,
  manifest.totals.selected_rows,
  "summary selected rows should match manifest",
);
assert.strictEqual(
  summary.pilot_photo_capture_summary.batch_count,
  manifest.totals.batches,
  "summary batch count should match manifest",
);
["manifest_json", "batch_csv", "row_csv", "runbook_markdown"].forEach((field) => {
  assert(summary.pilot_photo_capture_summary.artifacts[field], `summary missing artifact ${field}`);
});

assertNoPrivatePaths(JSON.stringify(manifest), "pilot capture manifest");
assertNoPrivatePaths(fs.readFileSync(batchCsvPath, "utf8"), "pilot capture batch CSV");
assertNoPrivatePaths(fs.readFileSync(rowCsvPath, "utf8"), "pilot capture row CSV");
assertNoPrivatePaths(runbook, "pilot capture runbook");

console.log("pilot photo capture batch tests passed");
