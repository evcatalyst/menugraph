const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.join(__dirname, "..");
const manifestPath = path.join(root, "docs/data/product-evidence/ingredient_ocr_manifest.json");
const queueCsvPath = path.join(root, "docs/data/product-evidence/exports/ten_product_pilot_ocr_queue.csv");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");

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
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
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
    } else if (char !== "\r") {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const headers = rows.shift();
  return rows
    .filter((cells) => cells.some(Boolean))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const navigator = JSON.parse(fs.readFileSync(navigatorPath, "utf8"));
const queue = parseCsv(fs.readFileSync(queueCsvPath, "utf8"));

assert.strictEqual(manifest.schema_version, 1, "manifest schema should be versioned");
assert.strictEqual(manifest.products.length, 10, "manifest should cover the 10-product pilot");
assert.strictEqual(manifest.totals.products, 10, "manifest totals should cover 10 products");
assert.strictEqual(queue.length, manifest.totals.ocr_candidates, "CSV and manifest candidate counts should match");
assert(manifest.totals.ocr_candidates >= 80, "expected broad OCR queue coverage across product evidence");
assert(manifest.totals.high_priority >= 25, "expected high-priority ingredient OCR candidates");

const productIds = new Set(navigator.products.map((product) => product.id));
manifest.products.forEach((product) => {
  assert(productIds.has(product.id), `unexpected product ${product.id}`);
  assert(product.ocr_candidate_count > 0, `${product.id} should have OCR candidates`);
});

const byEvidence = new Map(queue.map((row) => [row.evidence_id, row]));
const oreo1993 = byEvidence.get("flickr_oreo_1993");
assert(oreo1993, "Oreo 1993 photo should be in the OCR queue");
assert.strictEqual(oreo1993.ocr_priority, "high", "Oreo 1993 photo should be high-priority");
assert.strictEqual(oreo1993.ingredient_panel_visible, "true", "Oreo 1993 should preserve panel visibility");

queue.forEach((row) => {
  assert(row.product_id, "queue row missing product id");
  assert(row.evidence_id, "queue row missing evidence id");
  assert(row.source_url, `${row.evidence_id} missing source URL`);
  assert(row.source_title, `${row.evidence_id} missing source title`);
  assert(row.rights_note, `${row.evidence_id} missing rights note`);
  assert(row.ocr_recommended_action, `${row.evidence_id} missing recommended action`);
});

navigator.products.forEach((product) => {
  assert(product.ingredient_ocr_summary, `${product.id} missing OCR summary`);
  assert(product.export_paths?.ocr_queue_csv, `${product.id} missing OCR queue export path`);
});

console.log("ingredient OCR queue tests passed");
