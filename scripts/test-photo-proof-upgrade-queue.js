const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.join(__dirname, "..");
const manifestPath = path.join(root, "docs/data/product-evidence/photo_proof_upgrade_manifest.json");
const queueJsonPath = path.join(root, "docs/data/product-evidence/exports/photo_proof_upgrade_queue.json");
const queueCsvPath = path.join(root, "docs/data/product-evidence/exports/photo_proof_upgrade_queue.csv");
const reportPath = path.join(root, "docs/data/product-evidence/exports/photo_proof_upgrade_report.md");
const summaryPath = path.join(root, "docs/data/product-evidence/summary.json");

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
const queueJson = JSON.parse(fs.readFileSync(queueJsonPath, "utf8"));
const queueCsv = parseCsv(fs.readFileSync(queueCsvPath, "utf8"));
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

assert.strictEqual(manifest.schema_version, 1, "photo proof manifest schema should be versioned");
assert.strictEqual(manifest.totals.products, 120, "photo proof queue should cover the full corpus");
assert(manifest.totals.evidence_rows >= 1500, "expected broad evidence-row coverage");
assert(manifest.totals.source_receipts_only >= 1200, "expected source-linked public receipts");
assert(manifest.totals.panel_capture_needed >= 1000, "expected panel-capture queue density");
assert(manifest.totals.source_discovery_needed >= 200, "expected explicit source-discovery gaps");
assert.strictEqual(manifest.totals.embed_ready, 0, "public fixture build should not embed uncleared external images");
assert.strictEqual(queueJson.length, manifest.totals.evidence_rows, "queue JSON count should match manifest");
assert.strictEqual(queueCsv.length, manifest.totals.evidence_rows, "queue CSV count should match manifest");
assert(fs.existsSync(reportPath), "photo proof markdown report should exist");
assert(fs.statSync(reportPath).size > 0, "photo proof markdown report should not be empty");

[
  "queue_csv",
  "queue_json",
  "report_markdown",
].forEach((field) => {
  assert(manifest.artifacts[field], `manifest missing artifact ${field}`);
  assert(summary.photo_proof_upgrade_summary.artifacts[field], `summary missing artifact ${field}`);
});

assert(summary.photo_proof_upgrade_summary, "summary missing photo proof upgrade rollup");
assert.strictEqual(
  summary.photo_proof_upgrade_summary.evidence_row_count,
  manifest.totals.evidence_rows,
  "summary rollup should match manifest evidence rows",
);
assert.strictEqual(
  summary.photo_proof_upgrade_summary.embed_ready_count,
  manifest.totals.embed_ready,
  "summary rollup should match embeddable image count",
);
assert(summary.photo_proof_upgrade_summary.top_queue.length > 0, "summary should expose top queue rows for the site");
assert(summary.photo_proof_upgrade_summary.top_products.length > 0, "summary should expose top product rows for the site");

const byEvidence = new Map(queueJson.map((row) => [row.evidence_id, row]));
const oreo1993 = byEvidence.get("flickr_oreo_1993");
assert(oreo1993, "Oreo 1993 photo candidate should appear in the photo proof queue");
assert.strictEqual(oreo1993.public_display_decision, "show_source_receipt_only", "Oreo 1993 should remain link-only");
assert(oreo1993.ingredient_signal, "Oreo 1993 should be an ingredient-signal row");
assert(oreo1993.next_action, "Oreo 1993 should have an actionable next step");

queueJson.forEach((row) => {
  assert(row.product_id, "queue row missing product id");
  assert(row.evidence_id, "queue row missing evidence id");
  assert(row.display_lane, `${row.evidence_id} missing display lane`);
  assert(row.public_display_decision, `${row.evidence_id} missing public display decision`);
  assert(row.next_action, `${row.evidence_id} missing next action`);
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:/.test(row.public_image_url || ""), `${row.evidence_id} exposes a private path as public image`);
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:/.test(row.thumbnail_url || ""), `${row.evidence_id} exposes a private path as thumbnail`);
  if (row.display_lane !== "embed_ready") {
    assert.strictEqual(row.public_image_url, "", `${row.evidence_id} should not expose public_image_url before embed-ready`);
    assert.strictEqual(row.thumbnail_url, "", `${row.evidence_id} should not expose thumbnail_url before embed-ready`);
  }
});

console.log("photo proof upgrade queue tests passed");
