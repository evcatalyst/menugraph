const fs = require("fs");
const path = require("path");
const {
  argValue,
  generatedAt,
  parseCsv,
  publicArtifactRef,
  readJson,
  redactPrivate,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const defaultNavigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const defaultRegistryCsvPath = path.join(root, "docs/data/product-evidence/exports/public_photo_proof_registry.csv");
const defaultManifestPath = path.join(root, "docs/data/product-evidence/public_photo_proof_manifest.json");

const registryHeaders = [
  "product_id",
  "evidence_id",
  "source_url",
  "source_title",
  "source_owner",
  "claimed_product_date",
  "public_image_url",
  "thumbnail_url",
  "rights_status",
  "license_url",
  "attribution_text",
  "reviewer",
  "reviewed_at",
  "image_display_policy",
  "review_notes",
];

function normalizeText(value) {
  return String(value ?? "").trim();
}

function readCsvIfPresent(filePath) {
  if (!fs.existsSync(filePath)) {
    writeCsv(filePath, registryHeaders, []);
    return [];
  }
  const text = fs.readFileSync(filePath, "utf8");
  if (!normalizeText(text)) return [];
  return parseCsv(text);
}

function hasPrivatePath(value) {
  return /\/Users\/|\/private\/|\/tmp\/|file:\/\/|\.cache\//.test(normalizeText(value));
}

function publicImageUrlOk(value) {
  const text = normalizeText(value);
  if (!text || hasPrivatePath(text)) return false;
  if (/^https:\/\//i.test(text)) return true;
  if (/^(\.\/|\.\.\/|\/?assets\/|\/?images\/|\/?product-evidence\/)/i.test(text)) return true;
  return false;
}

function rightsClear(value) {
  const text = normalizeText(value).toLowerCase();
  return /public domain|no known copyright restrictions|no restrictions|cc[- ]?by|creative commons|wikimedia commons|owned image|rights cleared|permission granted/.test(text)
    && !/inspect|unclear|needed|pending|before reuse|external source only|collector photo/.test(text);
}

function sourceUrlFor(row) {
  return normalizeText(row.source_photo_url || row.url || row.source_url || row.archive_url);
}

function navigatorEvidenceIndex(navigatorData) {
  const byEvidenceId = new Map();
  const byProductEvidenceId = new Map();
  for (const product of navigatorData.products || []) {
    for (const evidence of product.evidence || []) {
      byEvidenceId.set(evidence.id, { product, evidence });
      byProductEvidenceId.set(`${product.id}:${evidence.id}`, { product, evidence });
    }
  }
  return { byEvidenceId, byProductEvidenceId };
}

function validateRegistryRow(row, index, evidenceIndex) {
  const productId = normalizeText(row.product_id);
  const evidenceId = normalizeText(row.evidence_id);
  const imageDisplayPolicy = normalizeText(row.image_display_policy || "source_link_only_no_public_image");
  const publicImageUrl = normalizeText(row.public_image_url);
  const rightsStatus = normalizeText(row.rights_status);
  const reviewer = normalizeText(row.reviewer);
  const reviewedAt = normalizeText(row.reviewed_at);
  const attributionText = normalizeText(row.attribution_text);
  const sourceUrl = normalizeText(row.source_url);
  const found = evidenceIndex.byProductEvidenceId.get(`${productId}:${evidenceId}`)
    || evidenceIndex.byEvidenceId.get(evidenceId);
  const reasons = [];

  if (!productId) reasons.push("missing_product_id");
  if (!evidenceId) reasons.push("missing_evidence_id");
  if (!found) reasons.push("evidence_not_found_in_navigator");
  if (imageDisplayPolicy !== "embed_rights_cleared") reasons.push("policy_not_embed_rights_cleared");
  if (!publicImageUrlOk(publicImageUrl)) reasons.push("public_image_url_not_public_safe");
  if (!rightsClear(rightsStatus)) reasons.push("rights_status_not_clear");
  if (!reviewer) reasons.push("missing_reviewer");
  if (!reviewedAt) reasons.push("missing_reviewed_at");
  if (!attributionText) reasons.push("missing_attribution_text");
  if (hasPrivatePath(JSON.stringify(row))) reasons.push("private_path_detected");

  const expectedSourceUrl = found ? sourceUrlFor(found.evidence) : "";
  if (found && sourceUrl && expectedSourceUrl && sourceUrl !== expectedSourceUrl) {
    reasons.push("source_url_mismatch");
  }

  return {
    row_index: index + 1,
    product_id: productId,
    product_name: found?.product?.name || "",
    evidence_id: evidenceId,
    evidence_title: found?.evidence?.title || "",
    source_url: sourceUrl || expectedSourceUrl,
    source_title: normalizeText(row.source_title) || found?.evidence?.title || "",
    source_owner: normalizeText(row.source_owner) || found?.evidence?.source || "",
    claimed_product_date: normalizeText(row.claimed_product_date),
    public_image_url: publicImageUrl,
    thumbnail_url: normalizeText(row.thumbnail_url) || publicImageUrl,
    rights_status: rightsStatus,
    license_url: normalizeText(row.license_url),
    attribution_text: attributionText,
    reviewer,
    reviewed_at: reviewedAt,
    image_display_policy: imageDisplayPolicy,
    review_notes: normalizeText(row.review_notes),
    can_publish_image: reasons.length === 0,
    rejection_reasons: reasons,
  };
}

function buildManifest({ navigatorData, registryRows, registryCsvPath, manifestPath }) {
  const evidenceIndex = navigatorEvidenceIndex(navigatorData);
  const reviewedRows = registryRows.map((row, index) => validateRegistryRow(row, index, evidenceIndex));
  const publishedImages = reviewedRows
    .filter((row) => row.can_publish_image)
    .map((row) => ({
      product_id: row.product_id,
      product_name: row.product_name,
      evidence_id: row.evidence_id,
      evidence_title: row.evidence_title,
      source_url: row.source_url,
      source_title: row.source_title,
      source_owner: row.source_owner,
      claimed_product_date: row.claimed_product_date,
      public_image_url: row.public_image_url,
      thumbnail_url: row.thumbnail_url,
      rights_status: row.rights_status,
      license_url: row.license_url,
      attribution_text: row.attribution_text,
      reviewer: row.reviewer,
      reviewed_at: row.reviewed_at,
      image_display_policy: "embed_rights_cleared",
      review_notes: row.review_notes,
    }));
  const pendingRows = reviewedRows.filter((row) => !row.can_publish_image);
  const manifest = {
    schema_version: "public_photo_proof_manifest.v1",
    generated_at: generatedAt,
    registry_csv: publicArtifactRef(registryCsvPath),
    manifest_json: publicArtifactRef(manifestPath),
    registry_rows: reviewedRows.length,
    published_image_count: publishedImages.length,
    pending_or_rejected_count: pendingRows.length,
    public_safety: {
      private_paths_committed: false,
      model_or_ocr_can_clear_rights: false,
      requires_reviewer: true,
      requires_rights_clear_status: true,
      source_link_only_default: true,
    },
    published_images: publishedImages,
    pending_or_rejected: pendingRows.map((row) => ({
      row_index: row.row_index,
      product_id: row.product_id,
      evidence_id: row.evidence_id,
      source_url: row.source_url,
      image_display_policy: row.image_display_policy,
      rejection_reasons: row.rejection_reasons,
      review_notes: row.review_notes,
    })),
  };
  return redactPrivate(manifest);
}

function writeManifest({ navigatorPath = defaultNavigatorPath, registryCsvPath = defaultRegistryCsvPath, manifestPath = defaultManifestPath } = {}) {
  const navigatorData = readJson(navigatorPath, {});
  const registryRows = readCsvIfPresent(registryCsvPath);
  const manifest = buildManifest({ navigatorData, registryRows, registryCsvPath, manifestPath });
  writeJson(manifestPath, manifest);

  const summary = readJson(summaryPath, {});
  summary.public_photo_proof_summary = {
    schema_version: manifest.schema_version,
    generated_at: manifest.generated_at,
    registry_rows: manifest.registry_rows,
    published_image_count: manifest.published_image_count,
    pending_or_rejected_count: manifest.pending_or_rejected_count,
    registry_csv: manifest.registry_csv,
    manifest_json: manifest.manifest_json,
    public_safety: manifest.public_safety,
  };
  writeJson(summaryPath, summary);
  return manifest;
}

function main() {
  const registryCsvPath = path.resolve(argValue("registry", defaultRegistryCsvPath));
  const navigatorPath = path.resolve(argValue("navigator", defaultNavigatorPath));
  const manifestPath = path.resolve(argValue("manifest", defaultManifestPath));
  const manifest = writeManifest({ navigatorPath, registryCsvPath, manifestPath });
  console.log(JSON.stringify({
    registry_rows: manifest.registry_rows,
    published_image_count: manifest.published_image_count,
    pending_or_rejected_count: manifest.pending_or_rejected_count,
    manifest_json: manifest.manifest_json,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildManifest,
  publicImageUrlOk,
  registryHeaders,
  rightsClear,
  validateRegistryRow,
  writeManifest,
};
