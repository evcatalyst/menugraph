const assert = require("assert");
const { retagDishRecord, retagExternalMenuRecord, retagExternalSourcePayload, retagPriceRecord } = require("./retag-enrichment");

function run() {
  const dish = retagDishRecord({
    id: "dish:1",
    menuId: "nypl:1",
    rawName: "Prawns with ginger and spring onions",
    dishType: "dish",
    ingredientTags: [],
  });
  assert.strictEqual(dish.dishType, "seafood");
  assert.deepStrictEqual(dish.ingredientTags.sort(), ["ginger", "onion", "scallion", "shrimp"]);

  const price = retagPriceRecord({
    id: "price:1",
    menuId: "cia:1",
    item: "Macaroni with cheese",
    dishType: "dish",
    ingredientTags: [],
  });
  assert.strictEqual(price.dishType, "pasta");
  assert(price.ingredientTags.includes("pasta"));
  assert(price.ingredientTags.includes("cheese"));

  const menu = retagExternalMenuRecord({
    id: "external:1",
    title: "Barcelona Wine Bar menu",
    descriptionSummary: "Tapas with shrimp, olives, peppers, and wine.",
    dishMentions: [
      { id: "d1", rawName: "shrimp tapas", dishType: "dish", ingredientTags: [] },
      { id: "d2", rawName: "pizza", dishType: "dish", ingredientTags: [] },
    ],
    priceObservations: [{ id: "p1", item: "olive plate", dishType: "dish", ingredientTags: [] }],
    ingredientTags: [],
  });
  assert(menu.ingredientTags.includes("shrimp"));
  assert(menu.ingredientTags.includes("olive"));
  assert(menu.ingredientTags.includes("wine"));
  assert.strictEqual(menu.dishMentions[0].dishType, "seafood");
  assert(menu.dishHints[0].ingredientTags.includes("shrimp"));
  assert.strictEqual(menu.dishMentions[1].dishType, "dish");
  assert(!menu.dishMentions[1].ingredientTags.includes("wine"));
  assert.strictEqual(menu.dishHints[1].rawName, "pizza");

  const payload = retagExternalSourcePayload({
    sourceId: "fixture",
    summary: {},
    records: [menu],
  });
  assert.strictEqual(payload.summary.total, 1);
  assert.strictEqual(payload.summary.dishMentions, 2);
  assert(payload.summary.ingredientTags.shrimp >= 1);

  console.log("retag enrichment tests passed");
}

run();
