const fs = require("fs");
const path = require("path");
const {
  argValue,
  countBy,
  ensureRunDirs,
  generatedAt,
  numberArg,
  parseCsv,
  pathFromArg,
  publicArtifactRef,
  readJson,
  redactPrivate,
  runDirFromArgs,
  runIdFromArgs,
  slug,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const defaultPacketJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_capture_packets.json");
const defaultTemplatePath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority_image_map_template.csv");
const defaultPublicHandoffCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_private_run_handoff.csv");
const defaultPublicHandoffJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_private_run_handoff.json");
const defaultPublicRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_private_run_handoff_runbook.md");

function normalized(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesText(value, filter) {
  if (!filter) return true;
  return normalized(value) === normalized(filter);
}

function selectPackets(packets = [], options = {}) {
  const packetIds = new Set(String(options.packetId || "").split(",").map((item) => item.trim()).filter(Boolean));
  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : 0;
  const selected = packets
    .filter((packet) => !packetIds.size || packetIds.has(packet.packet_id))
    .filter((packet) => matchesText(packet.product_id, options.product) || matchesText(packet.product_name, options.product))
    .filter((packet) => matchesText(packet.vintage_label, options.vintage))
    .sort((a, b) => Number(a.packet_rank || 0) - Number(b.packet_rank || 0));
  return limit > 0 ? selected.slice(0, limit) : selected;
}

function templateByEvidenceId(templateRows = []) {
  return new Map(templateRows.map((row) => [row.evidence_id, row]));
}

function privateTemplateRows({ runId, packets = [], templateRows = [] }) {
  const byEvidenceId = templateByEvidenceId(templateRows);
  return packets.flatMap((packet) => (packet.rows || []).map((surface) => {
    const template = byEvidenceId.get(surface.evidence_id) || {};
    return {
      run_id: runId,
      packet_id: packet.packet_id,
      packet_rank: packet.packet_rank,
      source_packet_run_id: packet.run_id,
      product_id: packet.product_id,
      product_name: packet.product_name,
      vintage_label: packet.vintage_label,
      version_id: packet.version_id,
      source_domain: packet.source_domain,
      source_url: packet.source_url,
      source_title: packet.source_title,
      source_type: template.source_type || "collector_archive_page",
      evidence_id: surface.evidence_id,
      surface_id: surface.surface_id,
      surface_label: surface.surface_label,
      surface_rank: surface.surface_rank,
      ocr_gap_category: template.ocr_gap_category || "panel_capture_needed",
      ocr_priority: template.ocr_priority || "high",
      capture_strategy: surface.capture_strategy || template.capture_strategy || "",
      crop_target: surface.crop_target || template.crop_target || "",
      ocr_expected_surface: template.ocr_expected_surface || surface.surface_label || "",
      image_map_keys: surface.image_map_keys || template.image_map_keys || surface.evidence_id,
      local_private_image_path: "",
      processed_private_image_path: "",
      panel_crop_note: "",
      rights_review_status: template.rights_review_status || "rights_review_needed",
      publication_image_policy: packet.publication_image_policy || template.publication_image_policy || "source_link_only_until_rights_review_clears_reuse",
      candidate_only: 1,
      manual_verified: 0,
    };
  }));
}

function packetWorklistRows(packets = []) {
  return packets.map((packet) => ({
    packet_id: packet.packet_id,
    packet_rank: packet.packet_rank,
    product_id: packet.product_id,
    product_name: packet.product_name,
    vintage_label: packet.vintage_label,
    source_domain: packet.source_domain,
    source_url: packet.source_url,
    source_title: packet.source_title,
    surface_count: packet.surface_count,
    primary_text_rows: packet.primary_text_rows,
    support_text_rows: packet.support_text_rows,
    capture_surface_order: packet.capture_surface_order,
    ingredient_panel_evidence_id: packet.ingredient_panel_evidence_id,
    nutrition_panel_evidence_id: packet.nutrition_panel_evidence_id,
    recommended_next_action: packet.recommended_next_action,
    claim_gate: packet.claim_gate,
    publication_image_policy: packet.publication_image_policy,
    candidate_only: 1,
    manual_verified: 0,
  }));
}

function privateRunCommands({ runId, runDir, privateTemplatePath }) {
  const packetAuditCsv = path.join(runDir, "packet-audit.public.csv");
  const packetAuditJson = path.join(runDir, "packet-audit.public.json");
  const packetOcrQueue = path.join(runDir, "packet-ocr-queue.public.csv");
  const packetAuditRunbook = path.join(runDir, "packet-audit-runbook.public.md");
  const imageMapPath = path.join(runDir, "image-map.json");
  const ocrSummaryCsv = path.join(runDir, "packet-native-ocr-summary.public.csv");
  return [
    `node scripts/build-confection-wrapper-ingredient-packet-audit.js --run-id=${runId} --template="${privateTemplatePath}" --public-packet-audit-csv="${packetAuditCsv}" --public-packet-audit-json="${packetAuditJson}" --public-packet-ocr-queue="${packetOcrQueue}" --public-runbook="${packetAuditRunbook}" --summary-field=`,
    `node scripts/build-image-map-from-template.js --run-id=${runId} --run-dir="${runDir}" --template="${privateTemplatePath}" --output="${imageMapPath}"`,
    `node scripts/run-ingredient-ocr.js --run-id=${runId} --run-dir="${runDir}" --queue="${packetOcrQueue}" --image-map="${imageMapPath}" --public-ocr-summary="${ocrSummaryCsv}"`,
  ];
}

function renderPrivateRunbook({ runId, runDir, packets, privateTemplatePath }) {
  const commands = privateRunCommands({ runId, runDir, privateTemplatePath });
  const lines = [
    "# CWA Ingredient Packet Private OCR Run",
    "",
    `Generated: ${generatedAt}`,
    `Run ID: ${runId}`,
    "",
    "This file is intentionally private and lives under `.cache`. It may contain local paths after the operator fills the image-map template.",
    "",
    "## Operator Flow",
    "",
    "1. Open each packet source URL.",
    "2. Crop ingredient panel first, nutrition panel second, then optional support surfaces.",
    "3. Fill `local_private_image_path` or `processed_private_image_path` in the private image-map template.",
    "4. Run the packet audit. It will create a packet OCR queue only for ready crops.",
    "5. Build `image-map.json`, then run native OCR.",
    "",
    "## Commands",
    "",
    ...commands.map((command) => `\`\`\`sh\n${command}\n\`\`\``),
    "",
    "## Packets",
    "",
  ];
  for (const packet of packets) {
    lines.push(`### ${packet.packet_rank}. ${packet.product_name} / ${packet.vintage_label}`);
    lines.push("");
    lines.push(`- Source: ${packet.source_url}`);
    lines.push(`- Surface order: ${packet.capture_surface_order}`);
    lines.push(`- Ingredient evidence: \`${packet.ingredient_panel_evidence_id}\``);
    lines.push(`- Nutrition evidence: \`${packet.nutrition_panel_evidence_id}\``);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function renderPublicRunbook(summary = {}) {
  const lines = [
    "# CWA Ingredient Packet Private Run Handoff",
    "",
    `Generated: ${summary.generated_at || generatedAt}`,
    "",
    "This public-safe handoff describes how to start a private OCR run for selected Candy Wrapper Archive source packets. It treats CWA as the first source-site priority for confection wrapper lineage because the item pages already carry dated package photos. It does not include private local paths, images, OCR text, or verified ingredient claims.",
    "",
    "## Current Handoff",
    "",
    `- Selected packets: ${summary.selected_packets || 0}`,
    `- Selected surfaces: ${summary.selected_surface_rows || 0}`,
    `- Primary ingredient/nutrition surfaces: ${summary.primary_surface_rows || 0}`,
    `- Products: ${(summary.by_product || []).map((row) => `${row.key} (${row.count})`).join("; ") || "none"}`,
    "",
    "## Private Operator Commands",
    "",
    "Use the private runbook path printed by the scaffold command. It contains the exact local command paths for the private fillable template and OCR outputs.",
    "",
    "The command sequence is:",
    "",
    "1. `node scripts/build-confection-wrapper-ingredient-packet-audit.js --template=<private-template> ...`",
    "2. `node scripts/build-image-map-from-template.js --template=<private-template> --output=<private-image-map>`",
    "3. `node scripts/run-ingredient-ocr.js --queue=<packet-ocr-queue> --image-map=<private-image-map> ...`",
    "",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

function buildPublicSummary({ runId, packets = [], rows = [], publicHandoffCsvPath, publicHandoffJsonPath, publicRunbookPath }) {
  const selectedProducts = countBy(packets, "product_name");
  return redactPrivate({
    schema_version: "confection_wrapper_ingredient_private_run_handoff.v1",
    generated_at: generatedAt,
    run_id: runId,
    priority_strategy: "candy_wrapper_archive_source_site_first_panel_first",
    source_domain: "www.candywrapperarchive.com",
    selected_packets: packets.length,
    selected_surface_rows: rows.length,
    primary_surface_rows: rows.filter((row) => ["ingredient_panel", "nutrition_panel"].includes(row.surface_id)).length,
    support_surface_rows: rows.filter((row) => !["ingredient_panel", "nutrition_panel"].includes(row.surface_id)).length,
    selected_packet_ids: packets.map((packet) => packet.packet_id),
    selected_product_count: selectedProducts.length,
    selected_source_url_count: new Set(packets.map((packet) => packet.source_url).filter(Boolean)).size,
    by_product: selectedProducts,
    first_packets: packets.slice(0, 12).map((packet) => ({
      packet_id: packet.packet_id,
      packet_rank: packet.packet_rank,
      product_name: packet.product_name,
      vintage_label: packet.vintage_label,
      source_url: packet.source_url,
      capture_surface_order: packet.capture_surface_order,
    })),
    public_safety: {
      private_paths_committed: false,
      images_committed: false,
      ocr_text_committed: false,
      manual_verified_created: false,
      candidate_only: true,
    },
    public_artifacts: {
      handoff_csv: publicArtifactRef(publicHandoffCsvPath),
      handoff_json: publicArtifactRef(publicHandoffJsonPath),
      handoff_runbook_md: publicArtifactRef(publicRunbookPath),
    },
    private_artifacts_created: {
      private_template: "cwa-packet-image-map-template.private.csv",
      private_worklist_csv: "cwa-packet-worklist.private.csv",
      private_worklist_json: "cwa-packet-worklist.private.json",
      private_runbook: "private-runbook.md",
    },
  });
}

function writePrivateRunHandoff({
  runId,
  runDir,
  packetsPath,
  templatePath,
  publicHandoffCsvPath,
  publicHandoffJsonPath,
  publicRunbookPath,
  product,
  packetId,
  vintage,
  limit,
  summaryField,
}) {
  const dirs = ensureRunDirs(runDir);
  const packetManifest = readJson(packetsPath, {});
  const templateRows = parseCsv(fs.readFileSync(templatePath, "utf8"));
  const packets = selectPackets(packetManifest.packets || [], { product, packetId, vintage, limit });
  const rows = privateTemplateRows({ runId, packets, templateRows });
  const worklistRows = packetWorklistRows(packets);
  const privateTemplatePath = path.join(dirs.runDir, "cwa-packet-image-map-template.private.csv");
  const privateWorklistCsvPath = path.join(dirs.runDir, "cwa-packet-worklist.private.csv");
  const privateWorklistJsonPath = path.join(dirs.runDir, "cwa-packet-worklist.private.json");
  const privateRunbookPath = path.join(dirs.runDir, "private-runbook.md");

  writeCsv(privateTemplatePath, [
    "run_id",
    "packet_id",
    "packet_rank",
    "source_packet_run_id",
    "product_id",
    "product_name",
    "vintage_label",
    "version_id",
    "source_domain",
    "source_url",
    "source_title",
    "source_type",
    "evidence_id",
    "surface_id",
    "surface_label",
    "surface_rank",
    "ocr_gap_category",
    "ocr_priority",
    "capture_strategy",
    "crop_target",
    "ocr_expected_surface",
    "image_map_keys",
    "local_private_image_path",
    "processed_private_image_path",
    "panel_crop_note",
    "rights_review_status",
    "publication_image_policy",
    "candidate_only",
    "manual_verified",
  ], rows);
  writeCsv(privateWorklistCsvPath, [
    "packet_id",
    "packet_rank",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_title",
    "surface_count",
    "primary_text_rows",
    "support_text_rows",
    "capture_surface_order",
    "ingredient_panel_evidence_id",
    "nutrition_panel_evidence_id",
    "recommended_next_action",
    "claim_gate",
    "publication_image_policy",
    "candidate_only",
    "manual_verified",
  ], worklistRows);
  writeJson(privateWorklistJsonPath, { run_id: runId, generated_at: generatedAt, packets });
  fs.writeFileSync(privateRunbookPath, renderPrivateRunbook({ runId, runDir: dirs.runDir, packets, privateTemplatePath }));

  const summary = buildPublicSummary({
    runId,
    packets,
    rows,
    publicHandoffCsvPath,
    publicHandoffJsonPath,
    publicRunbookPath,
  });
  writeCsv(publicHandoffCsvPath, [
    "run_id",
    "packet_id",
    "packet_rank",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_title",
    "surface_count",
    "primary_text_rows",
    "support_text_rows",
    "capture_surface_order",
    "candidate_only",
    "manual_verified",
  ], worklistRows.map((row) => ({ run_id: runId, ...row })));
  writeJson(publicHandoffJsonPath, summary);
  fs.mkdirSync(path.dirname(publicRunbookPath), { recursive: true });
  fs.writeFileSync(publicRunbookPath, renderPublicRunbook(summary));

  if (summaryField) {
    const siteSummary = readJson(summaryPath, {});
    siteSummary[summaryField] = summary;
    siteSummary.confection_wrapper_ingredient_priority_summary = siteSummary.confection_wrapper_ingredient_priority_summary || {};
    siteSummary.confection_wrapper_ingredient_priority_summary.private_run_handoff_summary = summary;
    siteSummary.confection_wrapper_ingredient_priority_summary.artifacts = {
      ...(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts || {}),
      private_run_handoff_csv: publicArtifactRef(publicHandoffCsvPath),
      private_run_handoff_json: publicArtifactRef(publicHandoffJsonPath),
      private_run_handoff_runbook_md: publicArtifactRef(publicRunbookPath),
    };
    writeJson(summaryPath, siteSummary);
  }

  return {
    summary,
    packets,
    rows,
    privateArtifacts: {
      run_dir: dirs.runDir,
      private_template_path: privateTemplatePath,
      private_worklist_csv_path: privateWorklistCsvPath,
      private_worklist_json_path: privateWorklistJsonPath,
      private_runbook_path: privateRunbookPath,
    },
  };
}

function main() {
  const runId = runIdFromArgs("cwa-ingredient-private-run");
  const runDir = runDirFromArgs(runId);
  const result = writePrivateRunHandoff({
    runId,
    runDir,
    packetsPath: pathFromArg("packets", defaultPacketJsonPath),
    templatePath: pathFromArg("template", defaultTemplatePath),
    publicHandoffCsvPath: pathFromArg("public-handoff-csv", defaultPublicHandoffCsvPath),
    publicHandoffJsonPath: pathFromArg("public-handoff-json", defaultPublicHandoffJsonPath),
    publicRunbookPath: pathFromArg("public-runbook", defaultPublicRunbookPath),
    product: argValue("product", ""),
    packetId: argValue("packet-id", ""),
    vintage: argValue("vintage", ""),
    limit: numberArg("limit", 0),
    summaryField: argValue("summary-field", "confection_wrapper_ingredient_private_run_handoff_summary"),
  });
  console.log(JSON.stringify({
    run_id: runId,
    selected_packets: result.summary.selected_packets,
    selected_surface_rows: result.summary.selected_surface_rows,
    private_template: result.privateArtifacts.private_template_path,
    private_runbook: result.privateArtifacts.private_runbook_path,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  privateRunCommands,
  privateTemplateRows,
  selectPackets,
  writePrivateRunHandoff,
};
