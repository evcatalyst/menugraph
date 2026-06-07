const https = require("https");
const path = require("path");
const {
  argValue,
  hasFlag,
  normalizeText,
  parseCsv,
  pathFromArg,
  publicArtifactRef,
  readJson,
  summaryPath: defaultSiteSummaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");
const {
  publicImageUrlOk,
  registryHeaders,
  rightsClear,
} = require("./build-public-photo-proof-manifest");

const root = path.join(__dirname, "..");
const defaultNavigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const defaultRegistryPath = path.join(root, "docs/data/product-evidence/exports/public_photo_proof_registry.csv");
const defaultSummaryPath = path.join(root, "docs/data/product-evidence/commons_photo_proof_import_summary.json");
const defaultCandidateCsvPath = path.join(root, "docs/data/product-evidence/exports/commons_photo_proof_import_candidates.csv");
const generatedAt = "2026-06-07T21:25:00Z";

function readCsvIfPresent(filePath) {
  try {
    const text = require("fs").readFileSync(filePath, "utf8");
    return normalizeText(text) ? parseCsv(text) : [];
  } catch (_error) {
    return [];
  }
}

function stripHtml(value) {
  return normalizeText(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function evidenceSourceUrl(evidence = {}) {
  return normalizeText(evidence.source_photo_url || evidence.url || evidence.source_url || evidence.archive_url);
}

function commonsFileName(sourceUrl) {
  const text = normalizeText(sourceUrl);
  if (!/commons\.wikimedia\.org\/wiki\/File/i.test(text)) return "";
  try {
    const url = new URL(text);
    const raw = decodeURIComponent(url.pathname.split("/wiki/")[1] || "");
    return raw.replace(/^File:/i, "").trim();
  } catch (_error) {
    const raw = decodeURIComponent(text.split("/wiki/")[1] || "");
    return raw.replace(/^File:/i, "").trim();
  }
}

function commonsTitle(sourceUrl) {
  const fileName = commonsFileName(sourceUrl);
  return fileName ? `File:${fileName}` : "";
}

function commonsEvidenceRows(navigatorData) {
  const rows = [];
  for (const product of navigatorData.products || []) {
    for (const evidence of product.evidence || []) {
      const sourceUrl = evidenceSourceUrl(evidence);
      const title = commonsTitle(sourceUrl);
      if (!title) continue;
      rows.push({
        product,
        evidence,
        source_url: sourceUrl,
        commons_title: title,
      });
    }
  }
  return rows;
}

function apiUrlForTitles(titles) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "800",
    titles: titles.join("|"),
  });
  return `https://commons.wikimedia.org/w/api.php?${params.toString()}`;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "MenuGraphProductEvidenceBot/0.1 (source-metadata import; https://github.com/evcatalyst/menugraph)",
      },
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Commons API returned ${response.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    }).on("error", reject);
  });
}

async function fetchCommonsMetadata(titles) {
  const batches = [];
  for (let index = 0; index < titles.length; index += 50) {
    batches.push(titles.slice(index, index + 50));
  }
  const pages = new Map();
  for (const batch of batches) {
    const payload = await fetchJson(apiUrlForTitles(batch));
    for (const page of Object.values(payload.query?.pages || {})) {
      pages.set(page.title, page);
    }
  }
  return pages;
}

function metadataValue(metadata = {}, key) {
  return normalizeText(metadata[key]?.value);
}

function metadataForPage(page = {}) {
  const info = page.imageinfo?.[0] || {};
  return {
    title: page.title || "",
    public_image_url: info.url || "",
    thumbnail_url: info.thumburl || info.url || "",
    description_url: info.descriptionurl || "",
    artist: stripHtml(metadataValue(info.extmetadata, "Artist")),
    credit: stripHtml(metadataValue(info.extmetadata, "Credit")),
    license_short_name: stripHtml(metadataValue(info.extmetadata, "LicenseShortName")),
    usage_terms: stripHtml(metadataValue(info.extmetadata, "UsageTerms")),
    license_url: stripHtml(metadataValue(info.extmetadata, "LicenseUrl")),
    original_date: stripHtml(metadataValue(info.extmetadata, "DateTimeOriginal")),
    object_name: stripHtml(metadataValue(info.extmetadata, "ObjectName")),
  };
}

function attributionText(metadata) {
  const parts = [metadata.artist, metadata.credit]
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
  const author = parts.join(" / ") || "Wikimedia Commons contributor";
  const license = metadata.license_short_name || metadata.usage_terms || "license recorded on Commons";
  return `${author} via Wikimedia Commons, ${license}`;
}

function rightsStatus(metadata) {
  const terms = [metadata.license_short_name, metadata.usage_terms]
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(" / ");
  return terms ? `Wikimedia Commons ${terms}` : "Wikimedia Commons license metadata missing";
}

function reviewedRegistryRow(candidate, metadata) {
  const sourceUrl = candidate.source_url;
  return {
    product_id: candidate.product.id,
    evidence_id: candidate.evidence.id,
    source_url: sourceUrl,
    source_title: candidate.evidence.title || metadata.object_name || candidate.commons_title,
    source_owner: `Wikimedia Commons${metadata.artist ? ` / ${metadata.artist}` : ""}`,
    claimed_product_date: [
      candidate.evidence.date_basis_state || "",
      metadata.original_date ? `Commons DateTimeOriginal ${metadata.original_date}` : "",
      "product/package date not independently verified by image import",
    ].filter(Boolean).join("; "),
    public_image_url: metadata.public_image_url,
    thumbnail_url: metadata.thumbnail_url || metadata.public_image_url,
    rights_status: rightsStatus(metadata),
    license_url: metadata.license_url,
    attribution_text: attributionText(metadata),
    reviewer: "codex_commons_metadata_import",
    reviewed_at: generatedAt.slice(0, 10),
    image_display_policy: "embed_rights_cleared",
    review_notes: "Imported from Wikimedia Commons API metadata for URL, license, attribution, and source page. Use as source-attributable photo/context proof only; not ingredient-label verification.",
  };
}

function candidateReportRow(candidate, metadata, reasons) {
  return {
    product_id: candidate.product.id,
    product_name: candidate.product.name,
    evidence_id: candidate.evidence.id,
    commons_title: candidate.commons_title,
    source_url: candidate.source_url,
    public_image_url: metadata.public_image_url || "",
    rights_status: rightsStatus(metadata),
    license_url: metadata.license_url || "",
    import_status: reasons.length ? "not_publishable" : "publishable",
    rejection_reasons: reasons.join("; "),
  };
}

function rejectionReasons(candidate, metadata) {
  const reasons = [];
  if (!metadata.public_image_url || !publicImageUrlOk(metadata.public_image_url)) {
    reasons.push("public_image_url_not_public_safe");
  }
  if (!rightsClear(rightsStatus(metadata))) {
    reasons.push("rights_status_not_clear");
  }
  if (!metadata.license_url && !/public domain|no known copyright restrictions|no restrictions/i.test(rightsStatus(metadata))) {
    reasons.push("missing_license_url");
  }
  if (!metadata.artist && !metadata.credit) {
    reasons.push("missing_attribution_source");
  }
  if (!candidate.product.id || !candidate.evidence.id) {
    reasons.push("missing_product_or_evidence_id");
  }
  return reasons;
}

function mergeRegistryRows(existingRows, generatedRows) {
  const byKey = new Map();
  for (const row of existingRows) {
    byKey.set(`${row.product_id}:${row.evidence_id}`, row);
  }
  for (const row of generatedRows) {
    byKey.set(`${row.product_id}:${row.evidence_id}`, row);
  }
  return [...byKey.values()].sort((a, b) => (
    String(a.product_id).localeCompare(String(b.product_id))
    || String(a.evidence_id).localeCompare(String(b.evidence_id))
  ));
}

function buildImport({ navigatorData, metadataPages, existingRegistryRows = [] }) {
  const candidates = commonsEvidenceRows(navigatorData);
  const generatedRows = [];
  const candidateRows = [];
  for (const candidate of candidates) {
    const page = metadataPages.get(candidate.commons_title) || metadataPages.get(candidate.commons_title.replace(/_/g, " "));
    const metadata = metadataForPage(page);
    const reasons = page?.missing ? ["commons_file_missing"] : rejectionReasons(candidate, metadata);
    candidateRows.push(candidateReportRow(candidate, metadata, reasons));
    if (!reasons.length) {
      generatedRows.push(reviewedRegistryRow(candidate, metadata));
    }
  }
  const registryRows = mergeRegistryRows(existingRegistryRows, generatedRows);
  const summary = {
    schema_version: "commons_photo_proof_import_summary.v1",
    generated_at: generatedAt,
    commons_candidate_count: candidates.length,
    publishable_import_count: generatedRows.length,
    not_publishable_count: candidateRows.filter((row) => row.import_status !== "publishable").length,
    registry_rows_after_merge: registryRows.length,
    public_safety: {
      source: "Wikimedia Commons API imageinfo extmetadata",
      ingredient_claims_verified: false,
      requires_registry_manifest_validation: true,
      rights_gate: "Only rows with public-safe image URLs, clear Commons rights metadata, and attribution are promoted.",
    },
  };
  return { candidates, candidateRows, generatedRows, registryRows, summary };
}

async function main() {
  const navigatorPath = pathFromArg("navigator", defaultNavigatorPath);
  const registryPath = pathFromArg("registry", defaultRegistryPath);
  const summaryPath = pathFromArg("summary", defaultSummaryPath);
  const siteSummaryPath = pathFromArg("site-summary", defaultSiteSummaryPath);
  const candidateCsvPath = pathFromArg("candidate-csv", defaultCandidateCsvPath);
  const dryRun = hasFlag("dry-run");
  const network = hasFlag("network");
  const navigatorData = readJson(navigatorPath, {});
  const candidates = commonsEvidenceRows(navigatorData);
  let metadataPages = new Map();
  const metadataPath = argValue("metadata-json", "");
  if (!network && !metadataPath) {
    throw new Error("Commons metadata import requires --network or --metadata-json=<path>");
  }
  if (network) {
    metadataPages = await fetchCommonsMetadata([...new Set(candidates.map((row) => row.commons_title))]);
  } else {
    const metadataPayload = readJson(path.resolve(metadataPath), {});
    metadataPages = new Map(Object.entries(metadataPayload.pages || metadataPayload));
  }
  const result = buildImport({
    navigatorData,
    metadataPages,
    existingRegistryRows: readCsvIfPresent(registryPath),
  });
  result.summary.public_artifacts = {
    candidate_csv: publicArtifactRef(candidateCsvPath),
    summary_json: publicArtifactRef(summaryPath),
    registry_csv: publicArtifactRef(registryPath),
  };
  writeCsv(candidateCsvPath, [
    "product_id",
    "product_name",
    "evidence_id",
    "commons_title",
    "source_url",
    "public_image_url",
    "rights_status",
    "license_url",
    "import_status",
    "rejection_reasons",
  ], result.candidateRows);
  writeJson(summaryPath, result.summary);
  const siteSummary = readJson(siteSummaryPath, {});
  siteSummary.commons_photo_proof_import_summary = result.summary;
  writeJson(siteSummaryPath, siteSummary);
  if (!dryRun) {
    writeCsv(registryPath, registryHeaders, result.registryRows);
  }
  console.log(JSON.stringify({
    commons_candidate_count: result.summary.commons_candidate_count,
    publishable_import_count: result.summary.publishable_import_count,
    not_publishable_count: result.summary.not_publishable_count,
    registry_rows_after_merge: result.summary.registry_rows_after_merge,
    dry_run: dryRun,
    network,
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  buildImport,
  commonsEvidenceRows,
  commonsTitle,
  metadataForPage,
  reviewedRegistryRow,
  rightsStatus,
  stripHtml,
};
