(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.MenuGraphFoodTaxonomy = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const VERSION = 1;

  const INGREDIENTS = [
    ["almond", "nut", ["almond", "almonds", "amandine"]],
    ["anchovy", "seafood", ["anchovy", "anchovies"]],
    ["apple", "fruit", ["apple", "apples", "applesauce", "cider"]],
    ["apricot", "fruit", ["apricot", "apricots"]],
    ["artichoke", "vegetable", ["artichoke", "artichokes"]],
    ["asparagus", "vegetable", ["asparagus"]],
    ["avocado", "fruit", ["avocado", "avocados"]],
    ["bacon", "pork", ["bacon"]],
    ["banana", "fruit", ["banana", "bananas"]],
    ["barley", "grain", ["barley"]],
    ["bass", "seafood", ["bass", "sea bass"]],
    ["beans", "legume", ["bean", "beans", "haricot", "kidney beans", "lima beans", "string beans"]],
    ["beef", "meat", ["beef", "boeuf", "steak", "filet mignon", "sirloin", "tenderloin", "roast beef", "corned beef"]],
    ["beer", "beverage", ["beer", "ale", "lager", "stout"]],
    ["beet", "vegetable", ["beet", "beets", "beetroot"]],
    ["berries", "fruit", ["berries", "berry", "blackberries", "blackberry"]],
    ["blueberry", "fruit", ["blueberry", "blueberries"]],
    ["bread", "grain", ["bread", "toast", "roll", "rolls", "biscuit", "biscuits", "bagel", "bagels"]],
    ["butter", "dairy", ["butter", "buttered", "butterscotch"]],
    ["cabbage", "vegetable", ["cabbage", "sauerkraut"]],
    ["caper", "condiment", ["caper", "capers"]],
    ["carrot", "vegetable", ["carrot", "carrots"]],
    ["caviar", "seafood", ["caviar"]],
    ["celery", "vegetable", ["celery", "celeriac"]],
    ["cheese", "dairy", ["cheese", "cheddar", "swiss cheese", "parmesan", "gruyere", "roquefort", "camembert", "brie"]],
    ["cherry", "fruit", ["cherry", "cherries"]],
    ["chicken", "poultry", ["chicken", "chickens", "poulet", "fowl"]],
    ["chocolate", "sweet", ["chocolate", "cocoa", "cacao"]],
    ["clam", "seafood", ["clam", "clams", "cherrystone", "littleneck"]],
    ["coconut", "fruit", ["coconut", "cocoanut"]],
    ["cod", "seafood", ["cod", "codfish"]],
    ["coffee", "beverage", ["coffee", "cafe", "espresso", "mocha"]],
    ["corn", "vegetable", ["corn", "maize", "hominy", "polenta"]],
    ["crab", "seafood", ["crab", "crabs", "crabmeat"]],
    ["cream", "dairy", ["cream", "creme", "creamed", "ice cream", "sour cream"]],
    ["cucumber", "vegetable", ["cucumber", "cucumbers", "pickle", "pickles"]],
    ["duck", "poultry", ["duck", "duckling", "canard"]],
    ["egg", "egg", ["egg", "eggs", "omelet", "omelette", "mayonnaise", "hollandaise"]],
    ["fish", "seafood", ["fish", "whitefish", "haddock", "hake", "perch", "pike", "snapper"]],
    ["flour", "grain", ["flour", "farina"]],
    ["foie gras", "poultry", ["foie gras", "pate de foie gras"]],
    ["garlic", "allium", ["garlic", "ail"]],
    ["ginger", "spice", ["ginger", "gingerbread"]],
    ["grape", "fruit", ["grape", "grapes", "raisin", "raisins"]],
    ["grapefruit", "fruit", ["grapefruit"]],
    ["ham", "pork", ["ham", "jambon", "prosciutto"]],
    ["hazelnut", "nut", ["hazelnut", "hazelnuts", "filbert", "filberts"]],
    ["honey", "sweet", ["honey"]],
    ["basil", "herb", ["basil"]],
    ["chili", "spice", ["chili", "chile", "chilies", "chilli"]],
    ["cinnamon", "spice", ["cinnamon"]],
    ["curry", "spice", ["curry"]],
    ["dill", "herb", ["dill"]],
    ["horseradish", "condiment", ["horseradish"]],
    ["lamb", "meat", ["lamb", "agneau"]],
    ["leek", "allium", ["leek", "leeks"]],
    ["lemon", "fruit", ["lemon", "lemons", "lemonade"]],
    ["lettuce", "vegetable", ["lettuce", "romaine", "endive", "chicory"]],
    ["lime", "fruit", ["lime", "limes"]],
    ["lobster", "seafood", ["lobster", "lobsters", "langouste"]],
    ["maple", "sweet", ["maple", "maple syrup"]],
    ["mayonnaise", "condiment", ["mayonnaise", "mayo"]],
    ["melon", "fruit", ["melon", "melons", "cantaloupe", "honeydew", "watermelon"]],
    ["milk", "dairy", ["milk", "buttermilk"]],
    ["mint", "herb", ["mint", "peppermint"]],
    ["mushroom", "fungus", ["mushroom", "mushrooms", "champignon", "champignons"]],
    ["mustard", "condiment", ["mustard"]],
    ["mussel", "seafood", ["mussel", "mussels"]],
    ["mutton", "meat", ["mutton"]],
    ["noodle", "grain", ["noodle", "noodles", "chow mein"]],
    ["nutmeg", "spice", ["nutmeg"]],
    ["olive", "fruit", ["olive", "olives"]],
    ["onion", "allium", ["onion", "onions", "shallot", "shallots"]],
    ["orange", "fruit", ["orange", "oranges", "mandarin", "tangerine"]],
    ["oyster", "seafood", ["oyster", "oysters"]],
    ["pasta", "grain", ["pasta", "spaghetti", "macaroni", "ravioli", "lasagna", "linguine", "vermicelli"]],
    ["parsley", "herb", ["parsley"]],
    ["pea", "legume", ["pea", "peas", "petit pois", "split pea"]],
    ["peach", "fruit", ["peach", "peaches"]],
    ["peanut", "nut", ["peanut", "peanuts"]],
    ["pear", "fruit", ["pear", "pears"]],
    ["pepper", "vegetable", ["pepper", "peppers", "pimento", "pimientos", "paprika"]],
    ["pineapple", "fruit", ["pineapple", "pineapples"]],
    ["pork", "pork", ["pork", "pig", "spareribs", "spare ribs"]],
    ["potato", "vegetable", ["potato", "potatoes", "pommes frites", "french fries", "chips"]],
    ["punch", "beverage", ["punch", "fruit punch"]],
    ["rabbit", "game", ["rabbit", "lapin"]],
    ["raspberry", "fruit", ["raspberry", "raspberries"]],
    ["rice", "grain", ["rice", "risotto"]],
    ["rosemary", "herb", ["rosemary"]],
    ["sage", "herb", ["sage"]],
    ["salmon", "seafood", ["salmon", "lox"]],
    ["sardine", "seafood", ["sardine", "sardines"]],
    ["sausage", "meat", ["sausage", "sausages", "frankfurter", "bockwurst", "wurst"]],
    ["scallion", "allium", ["scallion", "scallions", "spring onion", "spring onions", "green onion", "green onions"]],
    ["scallop", "seafood", ["scallop", "scallops"]],
    ["shad", "seafood", ["shad"]],
    ["shellfish", "seafood", ["shellfish"]],
    ["shrimp", "seafood", ["shrimp", "shrimps", "prawn", "prawns", "crevette", "crevettes"]],
    ["sole", "seafood", ["sole", "filet of sole"]],
    ["soy sauce", "condiment", ["soy sauce", "soya sauce"]],
    ["soda", "beverage", ["soda", "soft drink", "soft drinks", "ginger ale", "root beer"]],
    ["spinach", "vegetable", ["spinach", "epinard", "epinards"]],
    ["spirits", "beverage", ["whiskey", "whisky", "brandy", "gin", "rum", "vodka", "liqueur", "cordial", "vermouth", "absinthe", "sake", "martini"]],
    ["strawberry", "fruit", ["strawberry", "strawberries"]],
    ["sugar", "sweet", ["sugar", "caramel", "molasses"]],
    ["sweetbread", "meat", ["sweetbread", "sweetbreads"]],
    ["tarragon", "herb", ["tarragon"]],
    ["tea", "beverage", ["tea"]],
    ["terrapin", "game", ["terrapin", "turtle"]],
    ["thyme", "herb", ["thyme"]],
    ["tomato", "vegetable", ["tomato", "tomatoes", "tomatoe"]],
    ["truffle", "fungus", ["truffle", "truffles"]],
    ["trout", "seafood", ["trout"]],
    ["tuna", "seafood", ["tuna"]],
    ["turkey", "poultry", ["turkey", "dinde"]],
    ["veal", "meat", ["veal", "veau"]],
    ["vanilla", "spice", ["vanilla"]],
    ["venison", "game", ["venison", "deer"]],
    ["vinegar", "condiment", ["vinegar", "vinaigrette"]],
    ["walnut", "nut", ["walnut", "walnuts"]],
    ["water", "beverage", ["mineral water", "sparkling water", "seltzer"]],
    ["wine", "beverage", ["wine", "claret", "bordeaux", "burgundy", "champagne", "sherry", "port", "sauterne", "madeira"]],
    ["yogurt", "dairy", ["yogurt", "yoghurt"]],
  ];

  const DISH_TYPES = [
    ["beverage", /\b(coffee|tea|wine|beer|ale|lager|stout|cocktail|champagne|whiskey|whisky|brandy|gin|rum|vodka|liqueur|cordial|vermouth|absinthe|sake|martini|cider|soda|water(?!\s+chestnuts?)|milk(?![-\s]+fed)|buttermilk|punch|lemonade)\b/],
    ["dessert", /\b(ice cream|cake|pie|pudding|sherbet|dessert|pastry|tart|fruit|compote|custard|souffle|mousse|parfait)\b/],
    ["soup", /\b(soup|consomme|bisque|chowder|broth|bouillon|potage|gumbo)\b/],
    ["seafood", /\b(seafood|oyster|lobster|clam|crab|fish|salmon|shrimp|shrimps|prawn|prawns|crevette|crevettes|sole|cod|bass|trout|halibut|scallop|mussel|sardine|tuna|shellfish)\b/],
    ["poultry", /\b(chicken|turkey|duck|duckling|squab|fowl|poulet|canard)\b/],
    ["meat", /\b(beef|steak|mutton|lamb|veal|pork|bacon|ham|venison|chop|roast|sausage|sweetbread|filet mignon)\b/],
    ["sandwich", /\b(sandwich|club sandwich|hamburger|burger|toastie)\b/],
    ["pasta", /\b(spaghetti|macaroni|ravioli|lasagna|linguine|noodle|chow mein|pasta)\b/],
    ["egg", /\b(egg|eggs|omelet|omelette|shirred eggs|scrambled)\b/],
    ["salad", /\b(salad|slaw|lettuce|celery|tomato aspic)\b/],
    ["vegetable", /\b(asparagus|potato|spinach|pea|beans|corn|carrot|beet|cabbage|mushroom|onion|vegetable|vegetarian|vegan)\b/],
    ["bread", /\b(bread|roll|toast|muffin|biscuit|waffle|pancake|popover|bagel)\b/],
    ["sauce", /\b(sauce|gravy|relish|chutney|mayonnaise|hollandaise|bearnaise)\b/],
    ["cheese", /\b(cheese|rarebit|welsh rabbit|welsh rarebit)\b/],
  ];

  const INGREDIENT_TAGS = INGREDIENTS.map(([id]) => id);
  const INGREDIENT_META = Object.fromEntries(INGREDIENTS.map(([id, category, aliases]) => [id, { id, category, aliases }]));

  function cleanValue(value) {
    if (Array.isArray(value)) return value.map(cleanValue).filter(Boolean).join(" ");
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeText(value) {
    return cleanValue(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function aliasPattern(alias) {
    const escaped = normalizeText(alias).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`\\b${escaped}(?:s|es)?\\b`, "i");
  }

  const INGREDIENT_PATTERNS = INGREDIENTS.map(([id, category, aliases]) => ({
    id,
    category,
    aliases,
    patterns: aliases.map(aliasPattern),
  }));

  function ingredientTagsFor(value) {
    const normalized = normalizeText(value).replace(/\bmilk[-\s]+fed\b/g, " ");
    if (!normalized) return [];
    const tags = [];
    for (const ingredient of INGREDIENT_PATTERNS) {
      if (ingredient.patterns.some((pattern) => pattern.test(normalized))) tags.push(ingredient.id);
    }
    return tags;
  }

  function dishTypeFor(value) {
    const normalized = normalizeText(value);
    const match = DISH_TYPES.find(([, pattern]) => pattern.test(normalized));
    return match ? match[0] : "dish";
  }

  return {
    VERSION,
    INGREDIENT_META,
    INGREDIENT_TAGS,
    ingredientTagsFor,
    dishTypeFor,
    normalizeText,
  };
});
