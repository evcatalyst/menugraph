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
const { publicAuditRows } = require("./audit-image-map-template");

const root = path.join(__dirname, "..");
const defaultPacketJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_capture_packets.json");
const defaultTemplatePath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_priority_image_map_template.csv");
const defaultPacketAuditCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_capture_packet_audit.csv");
const defaultPacketAuditJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_ingredient_capture_packet_audit.json");
const defaultPacketOcrQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_packet_ocr_queue.csv");
const defaultPacketRunbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_ingredient_capture_packet_audit_runbook.md");

const primarySurfaceIds = new Set(["ingredient_panel", "nutrition_panel"]);

function rowByEvidenceId(rows = []) {
  return new Map(rows.map((row) => [row.evidence_id, row]));
}

function packetAuditStatus({ primaryRows, readyRows, pathErrors, surfaceRows }) {
  if (pathErrors > 0) return "packet_path_error";
  if (surfaceRows > 0 && readyRows === surfaceRows) return "packet_ready_all_surfaces";
  if (primaryRows.length > 0 && primaryRows.every((row) => row.audit_status === "ready_for_capture")) {
    return "packet_primary_ready_for_ocr";
  }
  if (readyRows > 0) return "packet_partial_ready_for_ocr";
  return "packet_paths_needed";
}

function packetNextAction(status) {
  return {
    packet_path_error: "Fix missing private paths or unsupported crop extensions before OCR.",
    packet_ready_all_surfaces: "Build the private image map and run native OCR for every surface in this packet.",
    packet_primary_ready_for_ocr: "Run native OCR for ingredient and nutrition crops, then continue optional support crops.",
    packet_partial_ready_for_ocr: "Run OCR for ready crops, but keep the packet blocked until ingredient and nutrition crops are ready.",
    packet_paths_needed: "Open the source page and privately crop ingredient panel first, nutrition panel second, then support text surfaces.",
  }[status] || "Review packet capture readiness.";
}

function auditRowsForPacket(packet = {}, auditById = new Map()) {
  return (packet.rows || []).map((surface) => ({
    ...surface,
    ...(auditById.get(surface.evidence_id) || {
      audit_status: "no_private_path_supplied",
      private_path_supplied: 0,
      private_path_exists: 0,
      extension_ok: 0,
    }),
  }));
}

function buildPacketAuditRows({ runId, packets = [], imageAuditRows = [] }) {
  const auditById = rowByEvidenceId(imageAuditRows);
  return packets.map((packet) => {
    const surfaceRows = auditRowsForPacket(packet, auditById);
    const primaryRows = surfaceRows.filter((row) => primarySurfaceIds.has(row.surface_id));
    const readySurfaceRows = surfaceRows.filter((row) => row.audit_status === "ready_for_capture");
    const primaryReadyRows = primaryRows.filter((row) => row.audit_status === "ready_for_capture");
    const pathErrors = surfaceRows.filter((row) => ["private_path_missing", "unsupported_image_extension"].includes(row.audit_status)).length;
    const status = packetAuditStatus({
      primaryRows,
      readyRows: readySurfaceRows.length,
      pathErrors,
      surfaceRows: surfaceRows.length,
    });
    const blockedRows = surfaceRows.filter((row) => row.audit_status !== "ready_for_capture");
    const ingredientRow = surfaceRows.find((row) => row.surface_id === "ingredient_panel") || {};
    const nutritionRow = surfaceRows.find((row) => row.surface_id === "nutrition_panel") || {};
    return {
      run_id: runId || packet.run_id,
      source_packet_run_id: packet.run_id,
      packet_id: packet.packet_id,
      packet_rank: packet.packet_rank,
      packet_audit_status: status,
      product_id: packet.product_id,
      product_name: packet.product_name,
      vintage_label: packet.vintage_label,
      version_id: packet.version_id,
      source_domain: packet.source_domain,
      source_url: packet.source_url,
      source_title: packet.source_title,
      surface_count: surfaceRows.length,
      primary_surface_count: primaryRows.length,
      support_surface_count: Math.max(0, surfaceRows.length - primaryRows.length),
      private_paths_supplied: surfaceRows.filter((row) => Number(row.private_path_supplied)).length,
      private_paths_existing: surfaceRows.filter((row) => Number(row.private_path_exists)).length,
      ready_surface_count: readySurfaceRows.length,
      primary_ready_count: primaryReadyRows.length,
      support_ready_count: readySurfaceRows.filter((row) => !primarySurfaceIds.has(row.surface_id)).length,
      no_private_path_supplied: surfaceRows.filter((row) => row.audit_status === "no_private_path_supplied").length,
      private_path_missing: surfaceRows.filter((row) => row.audit_status === "private_path_missing").length,
      unsupported_image_extension: surfaceRows.filter((row) => row.audit_status === "unsupported_image_extension").length,
      ingredient_panel_audit_status: ingredientRow.audit_status || "no_private_path_supplied",
      nutrition_panel_audit_status: nutritionRow.audit_status || "no_private_path_supplied",
      primary_ready_for_ocr: primaryRows.length > 0 && primaryReadyRows.length === primaryRows.length ? 1 : 0,
      all_surfaces_ready_for_ocr: surfaceRows.length > 0 && readySurfaceRows.length === surfaceRows.length ? 1 : 0,
      ready_evidence_ids: readySurfaceRows.map((row) => row.evidence_id).filter(Boolean).join(";"),
      blocked_evidence_ids: blockedRows.map((row) => row.evidence_id).filter(Boolean).join(";"),
      recommended_next_action: packetNextAction(status),
      claim_gate: packet.claim_gate || "blocked_until_private_readable_crop_ocr_correction_and_manual_verification",
      publication_image_policy: packet.publication_image_policy || "source_link_only_until_rights_review_clears_reuse",
      candidate_only: 1,
      manual_verified: 0,
    };
  });
}

function buildPacketOcrQueueRows({ runId, packets = [], packetAuditRows = [], templateRows = [], imageAuditRows = [] }) {
  const packetAuditById = new Map(packetAuditRows.map((row) => [row.packet_id, row]));
  const templateById = rowByEvidenceId(templateRows);
  const auditById = rowByEvidenceId(imageAuditRows);
  const rows = [];
  for (const packet of packets) {
    const packetAudit = packetAuditById.get(packet.packet_id) || {};
    for (const surface of packet.rows || []) {
      const imageAudit = auditById.get(surface.evidence_id) || {};
      if (imageAudit.audit_status !== "ready_for_capture") continue;
      const template = templateById.get(surface.evidence_id) || {};
      rows.push({
        run_id: runId || packet.run_id,
        source_packet_run_id: packet.run_id,
        packet_id: packet.packet_id,
        packet_rank: packet.packet_rank,
        packet_audit_status: packetAudit.packet_audit_status || "",
        evidence_id: surface.evidence_id,
        product_id: packet.product_id,
        product_name: packet.product_name,
        vintage_label: packet.vintage_label,
        source_domain: packet.source_domain,
        source_url: packet.source_url,
        source_title: packet.source_title,
        surface_id: surface.surface_id,
        surface_label: surface.surface_label,
        ocr_gap_category: template.ocr_gap_category || "panel_capture_needed",
        ocr_priority: template.ocr_priority || "high",
        capture_strategy: surface.capture_strategy || template.capture_strategy || "",
        crop_target: surface.crop_target || template.crop_target || "",
        ocr_expected_surface: template.ocr_expected_surface || surface.surface_label || "",
        image_map_keys: surface.image_map_keys || template.image_map_keys || surface.evidence_id,
        ocr_queue_status: "ready_for_native_ocr",
        claim_gate: packet.claim_gate || "blocked_until_manual_verification",
        candidate_only: 1,
        manual_verified: 0,
      });
    }
  }
  return rows;
}

function groupedPackets(rows, field, limit = 12) {
  const groups = new Map();
  for (const row of rows) {
    const key = row[field] || "unknown";
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        packets: 0,
        primary_ready_for_ocr: 0,
        all_surfaces_ready_for_ocr: 0,
        paths_needed: 0,
        path_errors: 0,
      });
    }
    const group = groups.get(key);
    group.packets += 1;
    group.primary_ready_for_ocr += Number(row.primary_ready_for_ocr || 0);
    group.all_surfaces_ready_for_ocr += Number(row.all_surfaces_ready_for_ocr || 0);
    if (row.packet_audit_status === "packet_paths_needed") group.paths_needed += 1;
    if (row.packet_audit_status === "packet_path_error") group.path_errors += 1;
  }
  return [...groups.values()]
    .sort((a, b) => b.primary_ready_for_ocr - a.primary_ready_for_ocr || b.packets - a.packets || a.key.localeCompare(b.key))
    .slice(0, limit);
}

function summarizePacketAudit({ runId, packetAuditRows = [], ocrQueueRows = [], publicPacketAuditCsvPath, publicPacketAuditJsonPath, publicPacketOcrQueueCsvPath, publicRunbookPath }) {
  const count = (status) => packetAuditRows.filter((row) => row.packet_audit_status === status).length;
  const summary = {
    schema_version: "confection_wrapper_ingredient_capture_packet_audit.v1",
    generated_at: generatedAt,
    run_id: runId,
    packet_count: packetAuditRows.length,
    surface_rows: packetAuditRows.reduce((sum, row) => sum + Number(row.surface_count || 0), 0),
    ready_surface_rows: packetAuditRows.reduce((sum, row) => sum + Number(row.ready_surface_count || 0), 0),
    primary_surface_rows: packetAuditRows.reduce((sum, row) => sum + Number(row.primary_surface_count || 0), 0),
    primary_ready_rows: packetAuditRows.reduce((sum, row) => sum + Number(row.primary_ready_count || 0), 0),
    support_ready_rows: packetAuditRows.reduce((sum, row) => sum + Number(row.support_ready_count || 0), 0),
    packets_ready_all_surfaces: count("packet_ready_all_surfaces"),
    packets_primary_ready_for_ocr: packetAuditRows.filter((row) => Number(row.primary_ready_for_ocr)).length,
    packets_partial_ready_for_ocr: count("packet_partial_ready_for_ocr"),
    packets_paths_needed: count("packet_paths_needed"),
    packet_path_errors: count("packet_path_error"),
    no_private_path_supplied: packetAuditRows.reduce((sum, row) => sum + Number(row.no_private_path_supplied || 0), 0),
    private_path_missing: packetAuditRows.reduce((sum, row) => sum + Number(row.private_path_missing || 0), 0),
    unsupported_image_extension: packetAuditRows.reduce((sum, row) => sum + Number(row.unsupported_image_extension || 0), 0),
    ocr_queue_rows: ocrQueueRows.length,
    by_status: countBy(packetAuditRows, "packet_audit_status"),
    by_product: groupedPackets(packetAuditRows, "product_name"),
    first_packets: packetAuditRows.slice(0, 12).map((row) => ({
      packet_id: row.packet_id,
      packet_rank: row.packet_rank,
      packet_audit_status: row.packet_audit_status,
      product_name: row.product_name,
      vintage_label: row.vintage_label,
      source_url: row.source_url,
      primary_ready_count: row.primary_ready_count,
      ready_surface_count: row.ready_surface_count,
      recommended_next_action: row.recommended_next_action,
    })),
    public_safety: {
      candidate_only: true,
      private_paths_committed: false,
      images_committed: false,
      ocr_text_committed: false,
      manual_verified_created: false,
    },
    public_artifacts: {
      packet_audit_csv: publicArtifactRef(publicPacketAuditCsvPath),
      packet_audit_json: publicArtifactRef(publicPacketAuditJsonPath),
      packet_ocr_queue_csv: publicArtifactRef(publicPacketOcrQueueCsvPath),
      packet_audit_runbook_md: publicArtifactRef(publicRunbookPath),
    },
  };
  return redactPrivate(summary);
}

function renderRunbook(summary = {}, packetAuditRows = []) {
  const lines = [
    "# Candy Wrapper Archive Packet OCR Readiness",
    "",
    `Generated: ${summary.generated_at || generatedAt}`,
    `Run ID: ${summary.run_id || ""}`,
    "",
    "This public-safe audit rolls private crop readiness up from surface rows to source-page packets. It does not include local image paths, OCR text, external image embeds, or verified ingredient claims.",
    "",
    "## Status Rules",
    "",
    "- `packet_ready_all_surfaces`: every packet surface has an existing private crop with a supported image extension.",
    "- `packet_primary_ready_for_ocr`: ingredient and nutrition surfaces are ready, but optional support surfaces are not all ready.",
    "- `packet_partial_ready_for_ocr`: at least one surface is ready, but ingredient/nutrition are still incomplete.",
    "- `packet_paths_needed`: no ready private crops have been supplied for the packet.",
    "- `packet_path_error`: a supplied private path is missing or uses an unsupported extension.",
    "",
    "## Totals",
    "",
    `- Packets: ${summary.packet_count || 0}`,
    `- Primary-ready packets: ${summary.packets_primary_ready_for_ocr || 0}`,
    `- All-surface-ready packets: ${summary.packets_ready_all_surfaces || 0}`,
    `- Packet path errors: ${summary.packet_path_errors || 0}`,
    `- OCR queue rows: ${summary.ocr_queue_rows || 0}`,
    "",
    "## First Packets",
    "",
  ];
  for (const row of packetAuditRows.slice(0, 25)) {
    lines.push(`### ${row.packet_rank}. ${row.product_name} / ${row.vintage_label}`);
    lines.push("");
    lines.push(`- Status: \`${row.packet_audit_status}\``);
    lines.push(`- Source: ${row.source_url || "source needed"}`);
    lines.push(`- Primary ready: ${row.primary_ready_count}/${row.primary_surface_count}`);
    lines.push(`- Surfaces ready: ${row.ready_surface_count}/${row.surface_count}`);
    lines.push(`- Next action: ${row.recommended_next_action}`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function writePacketAudit({
  runId,
  packetJsonPath,
  templatePath,
  publicPacketAuditCsvPath,
  publicPacketAuditJsonPath,
  publicPacketOcrQueueCsvPath,
  publicRunbookPath,
  summaryField,
}) {
  if (!fs.existsSync(packetJsonPath)) throw new Error(`Packet JSON not found: ${packetJsonPath}`);
  if (!fs.existsSync(templatePath)) throw new Error(`Image-map template not found: ${templatePath}`);
  const packetManifest = readJson(packetJsonPath, {});
  const packets = packetManifest.packets || [];
  const templateRows = parseCsv(fs.readFileSync(templatePath, "utf8"));
  const imageAuditRows = publicAuditRows(templateRows);
  const packetAuditRows = buildPacketAuditRows({ runId, packets, imageAuditRows });
  const ocrQueueRows = buildPacketOcrQueueRows({ runId, packets, packetAuditRows, templateRows, imageAuditRows });
  const summary = summarizePacketAudit({
    runId,
    packetAuditRows,
    ocrQueueRows,
    publicPacketAuditCsvPath,
    publicPacketAuditJsonPath,
    publicPacketOcrQueueCsvPath,
    publicRunbookPath,
  });

  writeCsv(publicPacketAuditCsvPath, [
    "run_id",
    "source_packet_run_id",
    "packet_id",
    "packet_rank",
    "packet_audit_status",
    "product_id",
    "product_name",
    "vintage_label",
    "version_id",
    "source_domain",
    "source_url",
    "source_title",
    "surface_count",
    "primary_surface_count",
    "support_surface_count",
    "private_paths_supplied",
    "private_paths_existing",
    "ready_surface_count",
    "primary_ready_count",
    "support_ready_count",
    "no_private_path_supplied",
    "private_path_missing",
    "unsupported_image_extension",
    "ingredient_panel_audit_status",
    "nutrition_panel_audit_status",
    "primary_ready_for_ocr",
    "all_surfaces_ready_for_ocr",
    "ready_evidence_ids",
    "blocked_evidence_ids",
    "recommended_next_action",
    "claim_gate",
    "publication_image_policy",
    "candidate_only",
    "manual_verified",
  ], packetAuditRows);

  writeCsv(publicPacketOcrQueueCsvPath, [
    "run_id",
    "source_packet_run_id",
    "packet_id",
    "packet_rank",
    "packet_audit_status",
    "evidence_id",
    "product_id",
    "product_name",
    "vintage_label",
    "source_domain",
    "source_url",
    "source_title",
    "surface_id",
    "surface_label",
    "ocr_gap_category",
    "ocr_priority",
    "capture_strategy",
    "crop_target",
    "ocr_expected_surface",
    "image_map_keys",
    "ocr_queue_status",
    "claim_gate",
    "candidate_only",
    "manual_verified",
  ], ocrQueueRows);

  writeJson(publicPacketAuditJsonPath, summary);
  fs.mkdirSync(path.dirname(publicRunbookPath), { recursive: true });
  fs.writeFileSync(publicRunbookPath, renderRunbook(summary, packetAuditRows));

  if (summaryField) {
    const siteSummary = readJson(summaryPath, {});
    siteSummary[summaryField] = summary;
    siteSummary.confection_wrapper_ingredient_priority_summary = siteSummary.confection_wrapper_ingredient_priority_summary || {};
    siteSummary.confection_wrapper_ingredient_priority_summary.capture_packet_audit_summary = summary;
    siteSummary.confection_wrapper_ingredient_priority_summary.artifacts = {
      ...(siteSummary.confection_wrapper_ingredient_priority_summary.artifacts || {}),
      packet_audit_csv: publicArtifactRef(publicPacketAuditCsvPath),
      packet_audit_json: publicArtifactRef(publicPacketAuditJsonPath),
      packet_ocr_queue_csv: publicArtifactRef(publicPacketOcrQueueCsvPath),
      packet_audit_runbook_md: publicArtifactRef(publicRunbookPath),
    };
    writeJson(summaryPath, siteSummary);
  }

  return { packetAuditRows, ocrQueueRows, summary };
}

function main() {
  const runId = runIdFromArgs("cwa-ingredient-packet-audit");
  const result = writePacketAudit({
    runId,
    packetJsonPath: pathFromArg("packets", defaultPacketJsonPath),
    templatePath: pathFromArg("template", defaultTemplatePath),
    publicPacketAuditCsvPath: pathFromArg("public-packet-audit-csv", defaultPacketAuditCsvPath),
    publicPacketAuditJsonPath: pathFromArg("public-packet-audit-json", defaultPacketAuditJsonPath),
    publicPacketOcrQueueCsvPath: pathFromArg("public-packet-ocr-queue", defaultPacketOcrQueueCsvPath),
    publicRunbookPath: pathFromArg("public-runbook", defaultPacketRunbookPath),
    summaryField: argValue("summary-field", "confection_wrapper_ingredient_capture_packet_audit_summary"),
  });
  console.log(JSON.stringify({
    run_id: result.summary.run_id,
    packet_count: result.summary.packet_count,
    packets_primary_ready_for_ocr: result.summary.packets_primary_ready_for_ocr,
    packets_paths_needed: result.summary.packets_paths_needed,
    packet_path_errors: result.summary.packet_path_errors,
    ocr_queue_rows: result.summary.ocr_queue_rows,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildPacketAuditRows,
  buildPacketOcrQueueRows,
  packetAuditStatus,
  summarizePacketAudit,
  writePacketAudit,
};
