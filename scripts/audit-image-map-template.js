const fs = require("fs");
const path = require("path");
const {
  argValue,
  countBy,
  generatedAt,
  parseCsv,
  pathFromArg,
  publicArtifactRef,
  readJson,
  redactPrivate,
  runIdFromArgs,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const defaultTemplatePath = path.join(root, "docs/data/product-evidence/exports/hybrid_ocr_image_map_template.csv");
const defaultAuditCsvPath = path.join(root, "docs/data/product-evidence/exports/hybrid_ocr_image_map_audit.csv");
const defaultAuditJsonPath = path.join(root, "docs/data/product-evidence/hybrid_ocr_image_map_audit.json");

function privatePathFor(row) {
  return String(row.processed_private_image_path || row.local_private_image_path || "").trim();
}

function extensionOk(filePath) {
  return /\.(jpe?g|png|webp|gif|tiff?|heic)$/i.test(String(filePath).split("?")[0]);
}

function keyCount(row) {
  return String(row.image_map_keys || "").split(";").filter(Boolean).length;
}

function auditStatusFor(privatePath, exists, extOk) {
  if (!privatePath) return "no_private_path_supplied";
  if (!exists) return "private_path_missing";
  if (!extOk) return "unsupported_image_extension";
  return "ready_for_capture";
}

function nextActionFor(status) {
  return {
    no_private_path_supplied: "Capture or crop the source privately, then fill local_private_image_path or processed_private_image_path.",
    private_path_missing: "Fix the private path or remove it before building image-map-input.json.",
    unsupported_image_extension: "Convert or export the crop to jpg, png, webp, gif, tiff, or heic before OCR.",
    ready_for_capture: "Build image-map-input.json, run capture, then run native OCR.",
  }[status] || "Review image-map row.";
}

function publicAuditRows(rows) {
  return rows.map((row) => {
    const privatePath = privatePathFor(row);
    const exists = Boolean(privatePath && fs.existsSync(privatePath));
    const extOk = Boolean(privatePath && extensionOk(privatePath));
    const auditStatus = auditStatusFor(privatePath, exists, extOk);
    return {
      run_id: row.run_id,
      evidence_id: row.evidence_id,
      product_id: row.product_id,
      product_name: row.product_name,
      vintage_label: row.vintage_label,
      source_domain: row.source_domain,
      source_url: row.source_url,
      source_type: row.source_type,
      ocr_gap_category: row.ocr_gap_category,
      ocr_priority: row.ocr_priority,
      capture_strategy: row.capture_strategy,
      key_count: keyCount(row),
      private_path_supplied: privatePath ? 1 : 0,
      private_path_exists: exists ? 1 : 0,
      extension_ok: extOk ? 1 : 0,
      audit_status: auditStatus,
      recommended_next_action: nextActionFor(auditStatus),
      candidate_only: 1,
      manual_verified: 0,
    };
  });
}

function groupedReadiness(rows, field, limit = 12) {
  const groups = new Map();
  for (const row of rows) {
    const key = String(row[field] || "unknown");
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        rows: 0,
        ready_for_capture: 0,
        no_private_path_supplied: 0,
        private_path_missing: 0,
        unsupported_image_extension: 0,
      });
    }
    const group = groups.get(key);
    group.rows += 1;
    group[row.audit_status] = (group[row.audit_status] || 0) + 1;
  }
  return [...groups.values()]
    .sort((a, b) => b.ready_for_capture - a.ready_for_capture || b.rows - a.rows || a.key.localeCompare(b.key))
    .slice(0, limit);
}

function summarizeAudit(runId, auditRows, options = {}) {
  const count = (status) => auditRows.filter((row) => row.audit_status === status).length;
  const keyTotal = auditRows.reduce((sum, row) => sum + Number(row.key_count || 0), 0);
  return redactPrivate({
    schema_version: "hybrid_ingredient_ocr_image_map_audit.v1",
    generated_at: generatedAt,
    run_id: runId,
    template_rows: auditRows.length,
    image_map_key_count: keyTotal,
    private_paths_supplied: auditRows.filter((row) => Number(row.private_path_supplied)).length,
    private_paths_existing: auditRows.filter((row) => Number(row.private_path_exists)).length,
    ready_for_capture: count("ready_for_capture"),
    no_private_path_supplied: count("no_private_path_supplied"),
    private_path_missing: count("private_path_missing"),
    unsupported_image_extension: count("unsupported_image_extension"),
    by_status: countBy(auditRows, "audit_status"),
    by_product: groupedReadiness(auditRows, "product_name"),
    by_source_domain: groupedReadiness(auditRows, "source_domain"),
    next_action: count("ready_for_capture")
      ? "Build the private image map and run capture/OCR on ready rows."
      : "Capture private panel crops and fill the image-map template before OCR.",
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      images_committed: false,
      manual_verified_created: false,
    },
    public_artifacts: {
      audit_summary_csv: options.publicAuditCsvRef || "",
      audit_summary_json: options.publicAuditJsonRef || "",
    },
  });
}

function writeAudit({ runId, templatePath, publicAuditCsvPath, publicAuditJsonPath, summaryField, pipelineSummaryPath }) {
  if (!fs.existsSync(templatePath)) throw new Error(`Image-map template not found: ${templatePath}`);
  const rows = parseCsv(fs.readFileSync(templatePath, "utf8"));
  const auditRows = publicAuditRows(rows);
  const auditSummary = summarizeAudit(runId, auditRows, {
    publicAuditCsvRef: publicArtifactRef(publicAuditCsvPath),
    publicAuditJsonRef: publicArtifactRef(publicAuditJsonPath),
  });

  writeCsv(publicAuditCsvPath, [
    "run_id",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_type",
    "ocr_gap_category",
    "ocr_priority",
    "capture_strategy",
    "key_count",
    "private_path_supplied",
    "private_path_exists",
    "extension_ok",
    "audit_status",
    "recommended_next_action",
    "candidate_only",
    "manual_verified",
  ], auditRows);
  writeJson(publicAuditJsonPath, auditSummary);

  if (pipelineSummaryPath) {
    const pipelineSummary = readJson(pipelineSummaryPath, {});
    pipelineSummary.image_map_audit = auditSummary;
    pipelineSummary.public_artifacts = pipelineSummary.public_artifacts || {};
    pipelineSummary.public_artifacts.image_map_audit_csv = publicArtifactRef(publicAuditCsvPath);
    pipelineSummary.public_artifacts.image_map_audit_json = publicArtifactRef(publicAuditJsonPath);
    writeJson(pipelineSummaryPath, pipelineSummary);
  }

  if (summaryField) {
    const siteSummary = readJson(summaryPath, {});
    siteSummary[summaryField] = auditSummary;
    if (pipelineSummaryPath) {
      const pipelineSummary = readJson(pipelineSummaryPath, {});
      const pipelineField = argValue("pipeline-summary-field") || (
        path.basename(pipelineSummaryPath) === "pilot_capture_pipeline_summary.json"
          ? "pilot_capture_pipeline_summary"
          : "hybrid_ocr_pipeline_summary"
      );
      siteSummary[pipelineField] = pipelineSummary;
      if (pipelineField === "hybrid_ocr_pipeline_summary") {
        siteSummary.ingredient_ocr_summary = siteSummary.ingredient_ocr_summary || {};
        siteSummary.ingredient_ocr_summary.hybrid_pipeline = pipelineSummary;
      }
    }
    writeJson(summaryPath, siteSummary);
  }

  return { auditRows, auditSummary };
}

function main() {
  const runId = runIdFromArgs("hybrid-ocr-v1");
  const templatePath = pathFromArg("template", defaultTemplatePath);
  const publicAuditCsvPath = pathFromArg("public-audit-summary", defaultAuditCsvPath);
  const publicAuditJsonPath = pathFromArg("public-audit-json", defaultAuditJsonPath);
  const pipelineSummaryArg = argValue("pipeline-summary", "docs/data/product-evidence/hybrid_ocr_pipeline_summary.json");
  const pipelineSummaryPath = pipelineSummaryArg ? pathFromArg("pipeline-summary", pipelineSummaryArg) : "";
  const summaryField = argValue("summary-field", "hybrid_ocr_image_map_audit");
  const result = writeAudit({
    runId,
    templatePath,
    publicAuditCsvPath,
    publicAuditJsonPath,
    summaryField,
    pipelineSummaryPath,
  });
  console.log(JSON.stringify({
    run_id: runId,
    template_rows: result.auditSummary.template_rows,
    ready_for_capture: result.auditSummary.ready_for_capture,
    no_private_path_supplied: result.auditSummary.no_private_path_supplied,
    private_path_missing: result.auditSummary.private_path_missing,
    unsupported_image_extension: result.auditSummary.unsupported_image_extension,
  }, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  auditStatusFor,
  publicAuditRows,
  summarizeAudit,
  writeAudit,
};
