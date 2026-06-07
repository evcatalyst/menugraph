const fs = require("fs");
const path = require("path");
const {
  countBy,
  normalizeText,
  parseCsv,
  publicArtifactRef,
  readJson,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const photoQueuePath = path.join(root, "docs/data/product-evidence/exports/photo_proof_upgrade_queue.csv");
const priorityJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_source_priority.json");
const priorityCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_priority.csv");
const reportPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_source_priority.md");
const generatedAt = "2026-06-08T00:35:00Z";
const sourceDomain = "www.candywrapperarchive.com";

const knownArchiveCollectionSlugs = {
  "3 Musketeers": "3-musketeers",
  "Almond Joy": "almond-joy",
  "Baby Ruth": "baby-ruth",
  Butterfinger: "butterfinger",
  Heath: "heath",
  Hershey: "hershey",
  "Kit Kat": "kit-kat",
  "M&M": "mms",
  "Milky Way": "milky-way",
  PayDay: "payday",
  Reese: "resses",
  Snickers: "snickers",
  "Tootsie Roll": "tootsie-roll",
  Twix: "twix",
};

function isConfectionProduct(product = {}) {
  const category = String(product.category || "").toLowerCase();
  const name = String(product.name || "").toLowerCase();
  if (/candy|confection/.test(category)) return true;
  return /m&m|snickers|hershey|reese|kit kat|twix|butterfinger|milky way|skittles|starburst|tootsie|junior mints|heath|payday|almond joy|baby ruth|3 musketeers/.test(name);
}

function sourceUrl(row = {}) {
  return row.source_url || row.url || row.source_photo_url || "";
}

function isCandyWrapperArchiveRow(row = {}) {
  return /candywrapperarchive\.com/i.test(`${row.source_domain || ""} ${row.source_owner || ""} ${sourceUrl(row)}`);
}

function productSlugLead(productName = "") {
  const match = Object.entries(knownArchiveCollectionSlugs)
    .find(([name]) => productName.toLowerCase().includes(name.toLowerCase()));
  if (!match) return "";
  return `https://www.candywrapperarchive.com/candy-collection/${match[1]}/`;
}

function searchQueries(productName = "") {
  return [
    `site:candywrapperarchive.com/candy-collection "${productName}"`,
    `site:candywrapperarchive.com/candy-collector "${productName}" wrapper`,
    `site:candywrapperarchive.com "${productName}" "Candy Wrapper Archive"`,
  ];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function priorityTier(product, rows) {
  if (rows.length >= 4) return "existing_lineage_source";
  if (rows.length) return "existing_source_lead";
  if (productSlugLead(product.name)) return "collection_page_likely";
  return "source_search_priority";
}

function recommendedAction(tier, productName) {
  if (tier === "existing_lineage_source") {
    return "Open the Candy Wrapper Archive collection/page rows first; select item-level wrapper records by decade, then look for back/side-panel proof elsewhere.";
  }
  if (tier === "existing_source_lead") {
    return "Promote this product in wrapper-lineage review; inspect the existing Candy Wrapper Archive source rows for decade, net weight, maker, and rights notes.";
  }
  if (tier === "collection_page_likely") {
    return "Run a targeted Candy Wrapper Archive collection-page check before broader web search; keep results as package-lineage evidence until panels are visible.";
  }
  return `Run targeted Candy Wrapper Archive searches for ${productName}; use hits as wrapper-lineage leads, not ingredient verification.`;
}

function buildPriorityRows(products, photoRows) {
  const rowsByProduct = new Map();
  for (const row of photoRows.filter(isCandyWrapperArchiveRow)) {
    const key = row.product_id;
    if (!key) continue;
    if (!rowsByProduct.has(key)) rowsByProduct.set(key, []);
    rowsByProduct.get(key).push(row);
  }

  return products
    .filter(isConfectionProduct)
    .map((product) => {
      const cwaRows = rowsByProduct.get(product.id) || [];
      const tier = priorityTier(product, cwaRows);
      const urls = unique([
        ...cwaRows.map(sourceUrl),
        productSlugLead(product.name),
      ]);
      const vintages = unique(cwaRows.map((row) => row.vintage_label || row.version_label || row.vintage));
      const titles = unique(cwaRows.map((row) => row.source_title || row.title)).slice(0, 4);
      return {
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        corpus_scope: product.corpus_scope,
        source_backed_slots: product.source_backed_slots || 0,
        total_slots: product.total_slots || 6,
        priority_tier: tier,
        candy_wrapper_archive_rows: cwaRows.length,
        candy_wrapper_archive_vintage_slots: vintages.length,
        known_candy_wrapper_archive_urls: urls.join(";"),
        source_title_examples: titles.join(";"),
        source_role: "wrapper_lineage_secondary_context",
        ingredient_claim_rule: "Do not treat wrapper-front lineage photos as ingredient proof unless a readable ingredient/nutrition panel is visible and manually reviewed.",
        rights_rule: "Link out and store attribution first; do not republish external wrapper images unless rights are clear.",
        recommended_action: recommendedAction(tier, product.name),
        search_queries: searchQueries(product.name).join(";"),
      };
    })
    .sort((a, b) => (
      ({ existing_lineage_source: 0, existing_source_lead: 1, collection_page_likely: 2, source_search_priority: 3 })[a.priority_tier]
      - ({ existing_lineage_source: 0, existing_source_lead: 1, collection_page_likely: 2, source_search_priority: 3 })[b.priority_tier]
      || b.candy_wrapper_archive_rows - a.candy_wrapper_archive_rows
      || String(a.product_name).localeCompare(String(b.product_name))
    ));
}

function renderReport(manifest) {
  const lines = [
    "# Confection Wrapper Source Priority",
    "",
    `Generated: ${manifest.generated_at}`,
    "",
    "Candy Wrapper Archive is prioritized as a wrapper-lineage source for confection products. It can improve decade, format, weight, maker, and visual package history, but it does not verify ingredients unless the source image exposes a readable ingredient or nutrition panel.",
    "",
    "## Totals",
    "",
    `- Confection products: ${manifest.totals.confection_products}`,
    `- Products with existing Candy Wrapper Archive leads: ${manifest.totals.products_with_existing_candy_wrapper_archive_leads}`,
    `- Existing Candy Wrapper Archive source rows: ${manifest.totals.existing_candy_wrapper_archive_rows}`,
    `- Products with likely collection-page checks: ${manifest.totals.products_with_likely_collection_pages}`,
    "",
    "## First Targets",
    "",
  ];
  for (const row of manifest.top_targets.slice(0, 16)) {
    lines.push(`- ${row.product_name}: ${row.priority_tier}; ${row.candy_wrapper_archive_rows} existing rows; ${row.recommended_action}`);
  }
  lines.push("");
  lines.push("## Guardrail");
  lines.push("");
  lines.push("Wrapper images are secondary product-lineage proof until a readable ingredient/nutrition panel is captured, OCRed, corrected, and manually verified.");
  return `${lines.join("\n")}\n`;
}

function buildManifest({ products, priorityRows }) {
  const existingRows = priorityRows.filter((row) => row.candy_wrapper_archive_rows > 0);
  return {
    schema_version: "confection_wrapper_source_priority.v1",
    generated_at: generatedAt,
    source_domain: sourceDomain,
    source_role: "high-yield confection wrapper lineage source",
    public_policy: {
      primary_use: "Prioritize confection products for wrapper-history storytelling and source review.",
      ingredient_gate: "No ingredient claim is promoted from wrapper-front lineage photos unless a readable label panel is captured and manually reviewed.",
      publication_gate: "External images are link-only unless rights are clear.",
    },
    totals: {
      confection_products: priorityRows.length,
      products_with_existing_candy_wrapper_archive_leads: existingRows.length,
      existing_candy_wrapper_archive_rows: existingRows.reduce((sum, row) => sum + row.candy_wrapper_archive_rows, 0),
      products_with_likely_collection_pages: priorityRows.filter((row) => row.priority_tier === "collection_page_likely").length,
      products_requiring_targeted_search: priorityRows.filter((row) => row.priority_tier === "source_search_priority").length,
      full_corpus_products: products.length,
    },
    priority_tiers: countBy(priorityRows, "priority_tier"),
    top_targets: priorityRows.slice(0, 24),
    artifacts: {
      priority_json: publicArtifactRef(priorityJsonPath),
      priority_csv: publicArtifactRef(priorityCsvPath),
      report_markdown: publicArtifactRef(reportPath),
    },
  };
}

function main() {
  const data = readJson(navigatorPath, {});
  const products = data.products || [];
  const photoRows = fs.existsSync(photoQueuePath) ? parseCsv(fs.readFileSync(photoQueuePath, "utf8")) : [];
  const priorityRows = buildPriorityRows(products, photoRows);
  const manifest = buildManifest({ products, priorityRows });
  const summary = readJson(summaryPath, {});
  summary.confection_wrapper_source_priority_summary = {
    generated_at: manifest.generated_at,
    source_domain: manifest.source_domain,
    source_role: manifest.source_role,
    public_policy: manifest.public_policy,
    totals: manifest.totals,
    priority_tiers: manifest.priority_tiers,
    top_targets: manifest.top_targets.slice(0, 8),
    artifacts: manifest.artifacts,
  };

  writeJson(priorityJsonPath, manifest);
  writeCsv(priorityCsvPath, [
    "product_id",
    "product_name",
    "category",
    "corpus_scope",
    "source_backed_slots",
    "total_slots",
    "priority_tier",
    "candy_wrapper_archive_rows",
    "candy_wrapper_archive_vintage_slots",
    "known_candy_wrapper_archive_urls",
    "source_title_examples",
    "source_role",
    "ingredient_claim_rule",
    "rights_rule",
    "recommended_action",
    "search_queries",
  ], priorityRows);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, renderReport(manifest));
  writeJson(summaryPath, summary);

  console.log(JSON.stringify({
    confection_products: manifest.totals.confection_products,
    existing_lead_products: manifest.totals.products_with_existing_candy_wrapper_archive_leads,
    existing_source_rows: manifest.totals.existing_candy_wrapper_archive_rows,
    priority_csv: manifest.artifacts.priority_csv,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildPriorityRows,
  isConfectionProduct,
};
