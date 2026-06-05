const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { buildProductIngredientJourney } = require("./build-product-ingredient-journey");

const ROOT_DIR = path.join(__dirname, "..");
const SUMMARY_PATH = path.join(ROOT_DIR, "docs", "data", "product-evidence", "summary.json");

function productById(journey, id) {
  const product = journey.products.find((item) => item.canonicalName === id);
  assert(product, `expected journey product ${id}`);
  return product;
}

function assertMilestone(product, year, urlPart) {
  const milestone = product.ownershipMilestones.find((item) => item.year === year);
  assert(milestone, `expected ${product.canonicalName} milestone ${year}`);
  assert(milestone.sourceUrl.includes(urlPart), `expected ${year} milestone source to include ${urlPart}`);
}

async function main() {
  const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, "utf8"));
  const journey = await buildProductIngredientJourney({ summary, dryRun: true });

  assert.strictEqual(journey.version, 1);
  assert.strictEqual(journey.view, "ingredient_journey");
  assert.strictEqual(journey.scope.recipeJourneyStatus, "not_published_until_recipe_rows_are_collected");
  assert(journey.products.length >= 8, "journey should include the core product set");
  assert.strictEqual(journey.products.length, journey.metrics.products);
  assert(journey.metrics.ingredientThemes > 10, "journey should expose ingredient review themes");

  const oreo = productById(journey, "oreo_original_chocolate_sandwich_cookies");
  assertMilestone(oreo, 2012, "mondelezinternational.com");

  const poptarts = productById(journey, "poptarts_frosted_strawberry");
  assertMilestone(poptarts, 2023, "wkkellogg.com");
  assertMilestone(poptarts, 2025, "mars.com");

  const kraft = productById(journey, "kraft_macaroni_and_cheese_original");
  assertMilestone(kraft, 2015, "kraftheinzcompany.com");

  const expectedTimelineLength = summary.vintages.length;
  for (const product of journey.products) {
    assert.strictEqual(product.timeline.length, expectedTimelineLength, `${product.canonicalName} should cover every vintage slot`);
    assert(Array.isArray(product.ingredientThemes), `${product.canonicalName} should expose ingredient themes`);
    for (const era of product.timeline) {
      assert(Array.isArray(era.photoEvidence), `${product.canonicalName}/${era.vintage} should expose progressive evidence leads`);
      assert(Number.isFinite(era.evidenceScore), `${product.canonicalName}/${era.vintage} should expose numeric evidence score`);
    }
  }

  const serialized = JSON.stringify(journey);
  assert(!serialized.includes("data:image/"), "journey artifact should not inline image blobs");
  assert(!serialized.includes("<html"), "journey artifact should not embed raw fetched pages");

  console.log(`Product ingredient journey contract ok: ${journey.metrics.products} products`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
