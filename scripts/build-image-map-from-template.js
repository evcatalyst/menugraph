const fs = require("fs");
const path = require("path");
const {
  argValue,
  parseCsv,
  pathFromArg,
  runDirFromArgs,
  runIdFromArgs,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

function splitKeys(value) {
  return String(value || "")
    .split(";")
    .map((key) => key.trim())
    .filter(Boolean);
}

function privatePathFor(row) {
  return String(row.processed_private_image_path || row.local_private_image_path || "").trim();
}

function buildImageMapFromTemplate(rows, { requireExists = true } = {}) {
  const imageMap = {};
  const missingPaths = [];
  let mappedRows = 0;

  for (const row of rows) {
    const privatePath = privatePathFor(row);
    if (!privatePath) continue;
    if (requireExists && !fs.existsSync(privatePath)) {
      missingPaths.push({
        evidence_id: row.evidence_id,
        path_supplied: true,
      });
      continue;
    }
    const keys = splitKeys(row.image_map_keys);
    if (!keys.length && row.evidence_id) keys.push(row.evidence_id);
    for (const key of keys) imageMap[key] = privatePath;
    mappedRows += 1;
  }

  return {
    imageMap,
    summary: {
      template_rows: rows.length,
      mapped_rows: mappedRows,
      image_map_key_count: Object.keys(imageMap).length,
      missing_path_rows: missingPaths.length,
      candidate_only: true,
      manual_verified_created: false,
    },
    missingPaths,
  };
}

function main() {
  const runId = runIdFromArgs("hybrid-ocr");
  const runDir = runDirFromArgs(runId);
  const templatePath = pathFromArg("template", path.join(runDir, "image-map-template.private.csv"));
  const outputPath = pathFromArg("output", path.join(runDir, "image-map-input.json"));
  const allowMissing = process.argv.includes("--allow-missing");
  if (!fs.existsSync(templatePath)) throw new Error(`Template CSV not found: ${templatePath}`);

  const rows = parseCsv(fs.readFileSync(templatePath, "utf8"));
  const result = buildImageMapFromTemplate(rows, { requireExists: !allowMissing });
  if (result.missingPaths.length) {
    throw new Error(`${result.missingPaths.length} template rows reference missing private image paths. Use --allow-missing only for planning.`);
  }
  writeJson(outputPath, result.imageMap);

  console.log(JSON.stringify({
    run_id: runId,
    output: path.basename(outputPath),
    ...result.summary,
  }, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  buildImageMapFromTemplate,
  splitKeys,
};
