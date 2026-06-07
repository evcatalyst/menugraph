const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  buildPackets,
  publicPacketRows,
  selectedOcrRows,
  writeStructuringPackets,
} = require("./build-ocr-structuring-packets");
const { parseCsv } = require("./ingredient-ocr-pipeline-utils");

function assertNoPrivatePaths(text, label) {
  assert(!/\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(text), `${label} leaked a private path`);
}

const ocrRows = [
  {
    status: "ocr_succeeded",
    run_id: "ocr-struct-test",
    evidence_id: "flickr_oreo_1993",
    product_id: "oreo_original_chocolate_sandwich_cookies",
    product_name: "Oreo Original Chocolate Sandwich Cookies",
    vintage_label: "1990s",
    source_domain: "www.flickr.com",
    source_url: "https://www.flickr.com/photos/example/1",
    image_sha256: "abc",
    line_count: 3,
    average_confidence: 0.8,
    ingredient_signal_found: true,
    ingredient_signal_lines: ["INGREDIENTS: sugar, flour, oil"],
    output: {
      lines: [
        { text: "INGREDIENTS: sugar, flour, oil", confidence: 0.9 },
        { text: "CONTAINS: wheat, soy", confidence: 0.87 },
        { text: "NET WT 14.3 OZ", confidence: 0.8 },
      ],
    },
  },
  {
    status: "ocr_succeeded",
    evidence_id: "no_signal",
    product_name: "No Signal Product",
    ingredient_signal_found: false,
    output: {
      lines: [{ text: "Random package copy", confidence: 0.5 }],
    },
  },
  {
    status: "ocr_failed",
    evidence_id: "failed_row",
    output: { lines: [{ text: "INGREDIENTS should not be selected" }] },
  },
];

const selected = selectedOcrRows(ocrRows);
assert.strictEqual(selected.length, 1, "default selection should require successful OCR and ingredient signal");

const packets = buildPackets(selected, { runId: "ocr-struct-test", packetSize: 10 });
assert.strictEqual(packets.length, 1, "expected one packet");
assert.strictEqual(packets[0].source_rows[0].ocr_lines.length, 3, "private packet should include OCR lines");
assert(JSON.stringify(packets[0]).includes("INGREDIENTS: sugar, flour, oil"), "private packet should carry OCR text");
assert.strictEqual(packets[0].manual_verified, false, "packet cannot create manual verification");

const publicRows = publicPacketRows(packets);
assert.strictEqual(publicRows.length, 1, "expected one public summary row");
assert.strictEqual(publicRows[0].public_text_included, 0, "public packet summary must not include OCR text");
assert.strictEqual(publicRows[0].manual_verified, 0, "public packet summary cannot mark manual verified");
assert(!JSON.stringify(publicRows).includes("INGREDIENTS"), "public rows should not leak OCR text");

const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "ocr-structuring-"));
const privateJsonl = path.join(runDir, "ocr/ingredient_ocr_results.jsonl");
const packetDir = path.join(runDir, "spark-packets/ocr-structuring");
const publicCsv = path.join(runDir, "public-ocr-structuring.csv");
const publicSummary = path.join(runDir, "public-ocr-structuring.json");
fs.mkdirSync(path.dirname(privateJsonl), { recursive: true });
fs.writeFileSync(privateJsonl, `${ocrRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

const result = writeStructuringPackets({
  runId: "ocr-struct-test",
  runDir,
  privateOcrJsonlPath: privateJsonl,
  packetDir,
  publicCsvPath: publicCsv,
  publicSummaryPath: publicSummary,
  updateSiteSummary: false,
});

assert.strictEqual(result.summary.selected_ocr_rows, 1, "summary should count selected OCR rows");
assert.strictEqual(result.summary.packet_count, 1, "summary should count packets");
assert(fs.existsSync(path.join(packetDir, `${result.packets[0].packet_id}.json`)), "private packet file should be written");
assert(fs.readFileSync(path.join(packetDir, `${result.packets[0].packet_id}.json`), "utf8").includes("INGREDIENTS"), "private packet should contain OCR text");
const publicCsvText = fs.readFileSync(publicCsv, "utf8");
const publicSummaryText = fs.readFileSync(publicSummary, "utf8");
assert.strictEqual(parseCsv(publicCsvText).length, 1, "public CSV should contain one packet row");
assert(!publicCsvText.includes("INGREDIENTS"), "public CSV should not contain OCR text");
assert(!publicSummaryText.includes("INGREDIENTS"), "public summary should not contain OCR text");
assertNoPrivatePaths(publicCsvText, "public structuring CSV");
assertNoPrivatePaths(publicSummaryText, "public structuring summary");

console.log("OCR structuring packet tests passed");
