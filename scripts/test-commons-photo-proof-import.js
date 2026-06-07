const assert = require("assert");
const {
  buildImport,
  commonsTitle,
  metadataForPage,
  reviewedRegistryRow,
  rightsStatus,
  stripHtml,
} = require("./import-commons-photo-proof");

assert.strictEqual(
  commonsTitle("https://commons.wikimedia.org/wiki/File%3ADoritos_bag.jpg"),
  "File:Doritos_bag.jpg",
  "encoded Commons file URLs should normalize",
);
assert.strictEqual(
  commonsTitle("https://commons.wikimedia.org/wiki/File:French%27s_classic_yellow_mustard.jpg"),
  "File:French's_classic_yellow_mustard.jpg",
  "literal Commons file URLs should normalize",
);
assert.strictEqual(stripHtml("<a href=\"#\">Amada44</a> &amp; Commons"), "Amada44 & Commons", "HTML metadata should be flattened");

const navigatorData = {
  products: [{
    id: "sample_product",
    name: "Sample Product",
    evidence: [{
      id: "sample_commons",
      title: "Sample product image - Wikimedia Commons",
      source: "commons.wikimedia.org",
      url: "https://commons.wikimedia.org/wiki/File%3ASample_product.jpg",
      source_photo_url: "https://commons.wikimedia.org/wiki/File%3ASample_product.jpg",
      date_basis_state: "2010s source lead",
    }],
  }, {
    id: "non_commons_product",
    name: "Non-Commons Product",
    evidence: [{
      id: "collector_photo",
      title: "Collector photo",
      url: "https://www.flickr.com/photos/example/1",
    }],
  }],
};

const publishablePage = {
  title: "File:Sample_product.jpg",
  imageinfo: [{
    url: "https://upload.wikimedia.org/wikipedia/commons/1/11/Sample_product.jpg",
    thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Sample_product.jpg/800px-Sample_product.jpg",
    descriptionurl: "https://commons.wikimedia.org/wiki/File:Sample_product.jpg",
    extmetadata: {
      Artist: { value: "<a>Sample Author</a>" },
      Credit: { value: "Own work" },
      LicenseShortName: { value: "CC BY-SA 4.0" },
      UsageTerms: { value: "Creative Commons Attribution-Share Alike 4.0" },
      LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0" },
      DateTimeOriginal: { value: "2014-01-01" },
      ObjectName: { value: "Sample product" },
    },
  }],
};

const metadata = metadataForPage(publishablePage);
assert.strictEqual(metadata.public_image_url, "https://upload.wikimedia.org/wikipedia/commons/1/11/Sample_product.jpg");
assert.strictEqual(rightsStatus(metadata), "Wikimedia Commons CC BY-SA 4.0 / Creative Commons Attribution-Share Alike 4.0");

const result = buildImport({
  navigatorData,
  metadataPages: new Map([[publishablePage.title, publishablePage]]),
  existingRegistryRows: [{
    product_id: "legacy_product",
    evidence_id: "legacy_evidence",
    public_image_url: "https://example.com/legacy.jpg",
  }],
});

assert.strictEqual(result.candidates.length, 1, "only Commons file evidence should be imported");
assert.strictEqual(result.generatedRows.length, 1, "publishable Commons metadata should generate one registry row");
assert.strictEqual(result.summary.commons_candidate_count, 1);
assert.strictEqual(result.summary.publishable_import_count, 1);
assert.strictEqual(result.summary.registry_rows_after_merge, 2, "existing registry rows should be preserved");

const row = reviewedRegistryRow(result.candidates[0], metadata);
assert.strictEqual(row.image_display_policy, "embed_rights_cleared");
assert.strictEqual(row.reviewer, "codex_commons_metadata_import");
assert(row.review_notes.includes("not ingredient-label verification"), "review note should preserve claim boundary");
assert(!JSON.stringify(result).includes("/private/"), "import output should not leak private paths");

const rejected = buildImport({
  navigatorData,
  metadataPages: new Map([["File:Sample_product.jpg", {
    title: "File:Sample_product.jpg",
    imageinfo: [{ url: "https://upload.wikimedia.org/wikipedia/commons/1/11/Sample_product.jpg", extmetadata: {} }],
  }]]),
});
assert.strictEqual(rejected.generatedRows.length, 0, "missing license/attribution metadata should not publish");
assert(
  rejected.candidateRows[0].rejection_reasons.includes("rights_status_not_clear"),
  "rejected rows should explain rights blockers",
);

console.log("Commons photo proof import tests passed");
