const assert = require("assert");
const { INGREDIENT_TAGS, dishTypeFor, ingredientTagsFor, normalizeText } = require("../docs/food-taxonomy");

function run() {
  assert(INGREDIENT_TAGS.length >= 100, "taxonomy should cover more than the starter ingredient list");
  assert.deepStrictEqual(ingredientTagsFor("Broiled lobster with drawn butter").sort(), ["butter", "lobster"]);
  assert.deepStrictEqual(ingredientTagsFor("Prawns with ginger and spring onions").sort(), ["ginger", "onion", "scallion", "shrimp"]);
  assert.deepStrictEqual(ingredientTagsFor("Pommes frites with mayonnaise").sort(), ["egg", "mayonnaise", "potato"]);
  assert(ingredientTagsFor("Bagel with cream cheese").includes("bread"));
  assert.deepStrictEqual(ingredientTagsFor("Peach Melba").sort(), ["peach"]);
  assert(!ingredientTagsFor("Peach Melba").includes("pea"), "pea should not match inside peach");
  assert(ingredientTagsFor("Foie gras with truffles").includes("foie gras"));
  assert(ingredientTagsFor("Foie gras with truffles").includes("truffle"));

  assert.strictEqual(dishTypeFor("Martini cocktail"), "beverage");
  assert.strictEqual(dishTypeFor("Spaghetti marinara"), "pasta");
  assert.strictEqual(dishTypeFor("Club sandwich"), "sandwich");
  assert.strictEqual(dishTypeFor("Toasted bagel"), "bread");
  assert.strictEqual(dishTypeFor("Cheese omelet"), "egg");
  assert.strictEqual(dishTypeFor("Tomato sauce"), "sauce");
  assert.strictEqual(dishTypeFor("Welsh rarebit"), "cheese");
  assert.strictEqual(normalizeText("Crème de Tomates"), "creme de tomates");

  console.log("food taxonomy tests passed");
}

run();
