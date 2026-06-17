const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { resolvePrivateIngredientCropPath } = require("../server");

const root = path.join(__dirname, "..");
const visualIndexPath = path.join(root, "docs/data/product-evidence/official_current_ingredient_visual_index.json");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const privateManifestPath = path.join(root, ".cache/ingredient-ocr/official-current-labels/latest-private-manifest.json");

const expectedProducts = new Set([
  "oreo_original_chocolate_sandwich_cookies",
  "doritos_nacho_cheese",
  "hersheys_milk_chocolate_bar",
  "ritz_original_crackers",
  "chips_ahoy_original",
  "triscuit_original",
  "wheat_thins_original",
  "fig_newtons",
  "teddy_grahams_honey",
  "lays_classic",
  "ruffles_original",
  "fritos_original",
  "gatorade_lemon_lime",
  "sunchips_harvest_cheddar",
  "cheetos_crunchy",
  "pepsi_cola",
  "mountain_dew_original",
  "quaker_old_fashioned_oats",
  "tostitos_original",
  "kit_kat_bar",
  "reeses_peanut_butter_cups",
  "hellmanns_mayonnaise_real",
  "life_cereal_original",
  "hebrew_national_franks",
  "twizzlers_strawberry",
  "banquet_chicken_pot_pie",
  "skippy_creamy_peanut_butter",
  "spam_classic",
  "dinty_moore_beef_stew",
  "hormel_chili_no_beans",
  "coca_cola_classic",
  "sprite_original",
  "heinz_tomato_ketchup",
  "kraft_singles_american",
  "cool_whip_original",
  "miracle_whip_original",
  "cheerios_original",
  "honey_nut_cheerios",
  "lucky_charms",
  "poptarts_frosted_strawberry",
  "poptarts_brown_sugar_cinnamon",
  "cheez_it_original",
  "jif_creamy_peanut_butter",
  "campbells_tomato_soup",
  "campbells_chicken_noodle_soup",
  "nutella_hazelnut_spread",
  "philadelphia_cream_cheese_original",
  "oscar_mayer_bologna",
  "kool_aid_cherry",
  "jello_strawberry_gelatin",
  "pringles_original",
  "eggo_homestyle_waffles",
  "chick_fil_a_chicken_sandwich",
  "mms_milk_chocolate",
  "tootsie_roll",
  "rice_krispies",
  "raisin_bran_kelloggs",
  "rice_krispies_treats_original",
  "betty_crocker_super_moist_yellow_cake_mix",
  "bisquick_original",
  "pillsbury_crescent_rolls",
  "pillsbury_toaster_strudel_strawberry",
  "stouffers_lasagna_meat_sauce",
  "lean_cuisine_salisbury_steak",
  "skittles_original",
  "starburst_original",
  "milky_way_bar",
  "spaghettios_original",
  "oscar_mayer_wieners",
  "smuckers_strawberry_preserves",
  "panera_broccoli_cheddar_soup",
  "twix_bar",
  "wheaties",
  "ball_park_franks",
  "frenchs_yellow_mustard",
  "pepperidge_farm_goldfish_cheddar",
  "hamburger_helper_cheeseburger_macaroni",
  "grape_nuts",
  "kraft_macaroni_and_cheese_original",
  "velveeta_shells_and_cheese",
  "totinos_pizza_rolls",
  "pizza_hut_original_pan_pepperoni",
  "cinnamon_toast_crunch",
  "hidden_valley_ranch_original",
  "butterfinger_bar",
  "wendys_daves_single",
  "wendys_chili",
  "taco_bell_crunchy_taco",
  "taco_bell_bean_burrito",
  "mcdonalds_big_mac",
  "mcdonalds_world_famous_fries",
  "mcdonalds_chicken_mcnuggets",
  "dominos_hand_tossed_pepperoni",
  "dunkin_glazed_donut",
  "popeyes_chicken_sandwich",
  "little_debbie_oatmeal_creme_pies",
]);

const allowedOfficialHosts = new Set([
  "smartlabel.conagra.com",
  "smartlabel.congra.net",
  "smartlabel.hersheys.com",
  "smartlabel.hormelfoods.com",
  "smartlabel.kelloggs.com",
  "smartlabel.mondelez.info",
  "smartlabel.pepsico.info",
  "smartlabel.unileverusa.com",
  "smartlabel.wkkellogg.com",
  "order.wendys.com",
  "tootsie.com",
  "www.bettycrocker.com",
  "www.butterfinger.com",
  "www.campbells.com",
  "www.campbellsfoodservice.com",
  "www.chick-fil-a.com",
  "www.cheerios.com",
  "www.cheezit.com",
  "www.coca-cola.com",
  "www.dominos.com",
  "www.dunkindonuts.com",
  "plk-use1-prod.sites.rbictg.com",
  "mckeefoodservice.com",
  "www.goodnes.com",
  "www.grapenuts.com",
  "www.generalmillsconvenience.com",
  "www.hamburgerhelper.com",
  "www.heinz.com",
  "www.hiddenvalley.com",
  "www.jif.com",
  "www.kraftheinz.com",
  "www.leggomyeggo.com",
  "www.luckycharms.com",
  "www.mcdonalds.com",
  "www.mccormick.com",
  "www.milkywaybar.com",
  "www.mms.com",
  "www.nutella.com",
  "www.oscarmayer.com",
  "www.paneraathome.com",
  "www.pepperidgefarm.com",
  "www.pizzahut.com",
  "www.poptarts.com",
  "www.pillsbury.com",
  "www.pringles.com",
  "www.skittles.com",
  "www.smuckers.com",
  "www.starburst.com",
  "www.tacobell.com",
  "www.twix.com",
  "www.tysonfoodservice.com",
  "www.totinos.com",
  "wheaties.com",
]);

const allowedProofBases = new Set([
  "official_source_text_proof_panel",
  "official_ingredient_label_image",
  "official_menu_or_api_text",
]);

function assertPublicSafe(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  assert(!text.includes(".cache"), `${filePath} exposes .cache path`);
  assert(!text.includes("/Volumes/"), `${filePath} exposes absolute volume path`);
  assert(!text.includes("local_image_path"), `${filePath} exposes local_image_path`);
  assert(!text.includes("source_html_path"), `${filePath} exposes source_html_path`);
  assert(!text.includes("ingredient_fragment_path"), `${filePath} exposes ingredient_fragment_path`);
  assert(!text.includes("product_image_path"), `${filePath} exposes product_image_path`);
  assert(!text.includes("source_image_path"), `${filePath} exposes source_image_path`);
  assert(!text.includes("source_document_preview_path"), `${filePath} exposes source_document_preview_path`);
  assert(!text.includes("preview_path"), `${filePath} exposes preview_path`);
  assert(!text.includes("ocr_path"), `${filePath} exposes ocr_path`);
  assert(!/data:image\//.test(text), `${filePath} exposes image data URI`);
  assert(!text.includes('"lines"'), `${filePath} exposes raw OCR lines`);
}

assertPublicSafe(visualIndexPath);
assertPublicSafe(navigatorPath);

const visualIndex = JSON.parse(fs.readFileSync(visualIndexPath, "utf8"));
const navigator = JSON.parse(fs.readFileSync(navigatorPath, "utf8"));

assert.strictEqual(visualIndex.schema_version, 1, "official-current visual index should be versioned");
assert.strictEqual(visualIndex.source_family.id, "official-current-labels", "official-current source family id should be stable");
assert.strictEqual(visualIndex.totals.products, 96, "official-current lane should cover 96 products");
assert.strictEqual(visualIndex.totals.rows, 96, "official-current lane should cover 96 rows");
assert.strictEqual(visualIndex.rows.length, 96, "official-current rows should match totals");
assert.strictEqual(visualIndex.totals.local_preview_available, 96, "official-current lane should expose local proof previews");
assert.strictEqual(visualIndex.totals.ingredient_signal_candidates, 96, "official-current lane should expose 96 ingredient text candidates");
assert.strictEqual(visualIndex.totals.readable_panel_still_needed, 0, "official-current rows should have extracted source text");

visualIndex.products.forEach((product) => {
  assert(expectedProducts.has(product.product_id), `unexpected official-current product ${product.product_id}`);
  assert.strictEqual(product.evidence_count, 1, `${product.product_id} should have one current-label row`);
  assert.strictEqual(product.ingredient_signal_count, 1, `${product.product_id} should have one ingredient signal`);
});

visualIndex.rows.forEach((row) => {
  assert(expectedProducts.has(row.product_id), `${row.evidence_id} has unexpected product ${row.product_id}`);
  assert(/^\/api\/private\/ingredient-crops\/[a-z0-9_-]+$/.test(row.preview_endpoint), `${row.evidence_id} has unsafe preview endpoint`);
  assert.strictEqual(row.crop_focus, "ingredient_text", `${row.evidence_id} should use ingredient text focus`);
  assert.strictEqual(row.ingredient_signal_status, "ingredient_signal_found", `${row.evidence_id} should have source ingredient text`);
  assert(row.ingredient_text_status.includes("candidate"), `${row.evidence_id} should remain candidate-gated`);
  assert(row.claim_boundary.includes("claim"), `${row.evidence_id} should carry a claim boundary`);
  assert(allowedOfficialHosts.has(new URL(row.source_url).hostname), `${row.evidence_id} source should remain an approved official URL`);
  assert.strictEqual(row.preview_render_variant, "upscaled_crop", `${row.evidence_id} should render the private proof crop`);
  assert.strictEqual(row.local_upscaled_preview_available, true, `${row.evidence_id} should expose upscaled availability only as a boolean`);
  assert(allowedProofBases.has(row.proof_visual_basis), `${row.evidence_id} should expose a public-safe proof visual basis`);
});

const oreo = visualIndex.rows.find((row) => row.product_id === "oreo_original_chocolate_sandwich_cookies");
const doritos = visualIndex.rows.find((row) => row.product_id === "doritos_nacho_cheese");
const hersheys = visualIndex.rows.find((row) => row.product_id === "hersheys_milk_chocolate_bar");
const triscuit = visualIndex.rows.find((row) => row.product_id === "triscuit_original");
const gatorade = visualIndex.rows.find((row) => row.product_id === "gatorade_lemon_lime");
const sunchips = visualIndex.rows.find((row) => row.product_id === "sunchips_harvest_cheddar");
const cheetos = visualIndex.rows.find((row) => row.product_id === "cheetos_crunchy");
const pepsi = visualIndex.rows.find((row) => row.product_id === "pepsi_cola");
const mountainDew = visualIndex.rows.find((row) => row.product_id === "mountain_dew_original");
const kitKat = visualIndex.rows.find((row) => row.product_id === "kit_kat_bar");
const reeses = visualIndex.rows.find((row) => row.product_id === "reeses_peanut_butter_cups");
const tostitos = visualIndex.rows.find((row) => row.product_id === "tostitos_original");
const life = visualIndex.rows.find((row) => row.product_id === "life_cereal_original");
const banquet = visualIndex.rows.find((row) => row.product_id === "banquet_chicken_pot_pie");
const skippy = visualIndex.rows.find((row) => row.product_id === "skippy_creamy_peanut_butter");
const spam = visualIndex.rows.find((row) => row.product_id === "spam_classic");
const dintyMoore = visualIndex.rows.find((row) => row.product_id === "dinty_moore_beef_stew");
const hormelChili = visualIndex.rows.find((row) => row.product_id === "hormel_chili_no_beans");
const cocaCola = visualIndex.rows.find((row) => row.product_id === "coca_cola_classic");
const sprite = visualIndex.rows.find((row) => row.product_id === "sprite_original");
const heinz = visualIndex.rows.find((row) => row.product_id === "heinz_tomato_ketchup");
const kraftSingles = visualIndex.rows.find((row) => row.product_id === "kraft_singles_american");
const coolWhip = visualIndex.rows.find((row) => row.product_id === "cool_whip_original");
const miracleWhip = visualIndex.rows.find((row) => row.product_id === "miracle_whip_original");
const cheerios = visualIndex.rows.find((row) => row.product_id === "cheerios_original");
const honeyNutCheerios = visualIndex.rows.find((row) => row.product_id === "honey_nut_cheerios");
const luckyCharms = visualIndex.rows.find((row) => row.product_id === "lucky_charms");
const popTartsStrawberry = visualIndex.rows.find((row) => row.product_id === "poptarts_frosted_strawberry");
const popTartsBrownSugar = visualIndex.rows.find((row) => row.product_id === "poptarts_brown_sugar_cinnamon");
const cheezIt = visualIndex.rows.find((row) => row.product_id === "cheez_it_original");
const jif = visualIndex.rows.find((row) => row.product_id === "jif_creamy_peanut_butter");
const campbellsTomato = visualIndex.rows.find((row) => row.product_id === "campbells_tomato_soup");
const campbellsChicken = visualIndex.rows.find((row) => row.product_id === "campbells_chicken_noodle_soup");
const nutella = visualIndex.rows.find((row) => row.product_id === "nutella_hazelnut_spread");
const philadelphia = visualIndex.rows.find((row) => row.product_id === "philadelphia_cream_cheese_original");
const oscarMayer = visualIndex.rows.find((row) => row.product_id === "oscar_mayer_bologna");
const koolAid = visualIndex.rows.find((row) => row.product_id === "kool_aid_cherry");
const jelloStrawberry = visualIndex.rows.find((row) => row.product_id === "jello_strawberry_gelatin");
const pringles = visualIndex.rows.find((row) => row.product_id === "pringles_original");
const eggo = visualIndex.rows.find((row) => row.product_id === "eggo_homestyle_waffles");
const chickFilA = visualIndex.rows.find((row) => row.product_id === "chick_fil_a_chicken_sandwich");
const mms = visualIndex.rows.find((row) => row.product_id === "mms_milk_chocolate");
const tootsie = visualIndex.rows.find((row) => row.product_id === "tootsie_roll");
const riceKrispies = visualIndex.rows.find((row) => row.product_id === "rice_krispies");
const raisinBran = visualIndex.rows.find((row) => row.product_id === "raisin_bran_kelloggs");
const riceKrispiesTreats = visualIndex.rows.find((row) => row.product_id === "rice_krispies_treats_original");
const bettyCrockerCake = visualIndex.rows.find((row) => row.product_id === "betty_crocker_super_moist_yellow_cake_mix");
const bisquick = visualIndex.rows.find((row) => row.product_id === "bisquick_original");
const pillsburyCrescents = visualIndex.rows.find((row) => row.product_id === "pillsbury_crescent_rolls");
const toasterStrudel = visualIndex.rows.find((row) => row.product_id === "pillsbury_toaster_strudel_strawberry");
const stouffersLasagna = visualIndex.rows.find((row) => row.product_id === "stouffers_lasagna_meat_sauce");
const leanCuisine = visualIndex.rows.find((row) => row.product_id === "lean_cuisine_salisbury_steak");
const skittles = visualIndex.rows.find((row) => row.product_id === "skittles_original");
const starburst = visualIndex.rows.find((row) => row.product_id === "starburst_original");
const milkyWay = visualIndex.rows.find((row) => row.product_id === "milky_way_bar");
const spaghettios = visualIndex.rows.find((row) => row.product_id === "spaghettios_original");
const oscarMayerWieners = visualIndex.rows.find((row) => row.product_id === "oscar_mayer_wieners");
const smuckers = visualIndex.rows.find((row) => row.product_id === "smuckers_strawberry_preserves");
const paneraSoup = visualIndex.rows.find((row) => row.product_id === "panera_broccoli_cheddar_soup");
const twix = visualIndex.rows.find((row) => row.product_id === "twix_bar");
const wheaties = visualIndex.rows.find((row) => row.product_id === "wheaties");
const ballPark = visualIndex.rows.find((row) => row.product_id === "ball_park_franks");
const frenchs = visualIndex.rows.find((row) => row.product_id === "frenchs_yellow_mustard");
const goldfish = visualIndex.rows.find((row) => row.product_id === "pepperidge_farm_goldfish_cheddar");
const hamburgerHelper = visualIndex.rows.find((row) => row.product_id === "hamburger_helper_cheeseburger_macaroni");
const grapeNuts = visualIndex.rows.find((row) => row.product_id === "grape_nuts");
const kraftMac = visualIndex.rows.find((row) => row.product_id === "kraft_macaroni_and_cheese_original");
const velveetaShells = visualIndex.rows.find((row) => row.product_id === "velveeta_shells_and_cheese");
const totinos = visualIndex.rows.find((row) => row.product_id === "totinos_pizza_rolls");
const pizzaHutPanPepperoni = visualIndex.rows.find((row) => row.product_id === "pizza_hut_original_pan_pepperoni");
const cinnamonToastCrunch = visualIndex.rows.find((row) => row.product_id === "cinnamon_toast_crunch");
const hiddenValley = visualIndex.rows.find((row) => row.product_id === "hidden_valley_ranch_original");
const butterfinger = visualIndex.rows.find((row) => row.product_id === "butterfinger_bar");
const wendysDavesSingle = visualIndex.rows.find((row) => row.product_id === "wendys_daves_single");
const wendysChili = visualIndex.rows.find((row) => row.product_id === "wendys_chili");
const tacoBellCrunchyTaco = visualIndex.rows.find((row) => row.product_id === "taco_bell_crunchy_taco");
const tacoBellBeanBurrito = visualIndex.rows.find((row) => row.product_id === "taco_bell_bean_burrito");
const bigMac = visualIndex.rows.find((row) => row.product_id === "mcdonalds_big_mac");
const fries = visualIndex.rows.find((row) => row.product_id === "mcdonalds_world_famous_fries");
const mcnuggets = visualIndex.rows.find((row) => row.product_id === "mcdonalds_chicken_mcnuggets");
const dominosHandTossedPepperoni = visualIndex.rows.find((row) => row.product_id === "dominos_hand_tossed_pepperoni");
const dunkinGlazedDonut = visualIndex.rows.find((row) => row.product_id === "dunkin_glazed_donut");
const popeyesChickenSandwich = visualIndex.rows.find((row) => row.product_id === "popeyes_chicken_sandwich");
const littleDebbieOatmeal = visualIndex.rows.find((row) => row.product_id === "little_debbie_oatmeal_creme_pies");
assert(oreo.ingredient_text.includes("HIGH FRUCTOSE CORN SYRUP"), "Oreo current label should expose source ingredient text");
assert(doritos.ingredient_text.includes("Monosodium Glutamate"), "Doritos current label should expose source ingredient text");
assert(hersheys.ingredient_text.includes("Cocoa Butter"), "Hershey's current label should expose source ingredient text");
assert(triscuit.ingredient_text.includes("WHOLE GRAIN WHEAT"), "Triscuit current label should expose source ingredient text");
assert(gatorade.ingredient_text.includes("Monopotassium Phosphate"), "Gatorade current label should expose source ingredient text");
assert(sunchips.ingredient_text.includes("Whole Grain Brown Rice Flour"), "SunChips current label should expose source ingredient text");
assert(cheetos.ingredient_text.includes("Enriched Corn Meal"), "Cheetos current label should expose source ingredient text");
assert(pepsi.ingredient_text.includes("Phosphoric Acid"), "Pepsi current label should expose source ingredient text");
assert(mountainDew.ingredient_text.includes("High Fructose Corn Syrup"), "Mountain Dew current label should expose source ingredient text");
assert(kitKat.ingredient_text.includes("Wheat Flour"), "Kit Kat current label should expose source ingredient text");
assert(reeses.ingredient_text.includes("Peanuts"), "Reese's current label should expose source ingredient text");
assert(reeses.ingredient_text.includes("Dextrose"), "Reese's current label should expose source ingredient text");
assert.strictEqual(reeses.source_url, "https://smartlabel.hersheys.com/034000004409-0011-en-US/index.html", "Reese's should use the current official SmartLabel URL");
assert.strictEqual(reeses.source_owner, "The Hershey Company", "Reese's should expose the official source owner");
assert(tostitos.ingredient_text.includes("Corn Oil"), "Tostitos current label should expose source ingredient text");
assert(life.ingredient_text.includes("Whole Grain Oat Flour"), "Life Cereal current label should expose source ingredient text");
assert(banquet.ingredient_text.includes("Cooked Chicken Roll"), "Banquet current label should expose source ingredient text");
assert(skippy.ingredient_text.includes("Roasted Peanuts"), "Skippy current label should expose source ingredient text");
assert(!skippy.ingredient_text.includes("Azúcar"), "Skippy current label should keep the English ingredient section clean");
assert(spam.ingredient_text.includes("Modified Potato Starch"), "SPAM current label should expose source ingredient text");
assert(dintyMoore.ingredient_text.includes("Beef Stock"), "Dinty Moore current label should expose source ingredient text");
assert(hormelChili.ingredient_text.includes("Textured Soy Flour"), "Hormel Chili current label should expose source ingredient text");
assert(cocaCola.ingredient_text.includes("CARBONATED WATER"), "Coca-Cola current label should expose source ingredient text");
assert(sprite.ingredient_text.includes("HIGH FRUCTOSE CORN SYRUP"), "Sprite current label should expose source ingredient text");
assert(sprite.ingredient_text.includes("SODIUM BENZOATE"), "Sprite current label should expose source ingredient text");
assert(heinz.ingredient_text.includes("TOMATO CONCENTRATE"), "Heinz current label should expose source ingredient text");
assert(kraftSingles.ingredient_text.includes("CHEDDAR CHEESE"), "Kraft Singles current label should expose source ingredient text");
assert(coolWhip.ingredient_text.includes("HYDROGENATED VEGETABLE OIL"), "Cool Whip current label should expose source ingredient text");
assert(miracleWhip.ingredient_text.includes("SOYBEAN OIL"), "Miracle Whip current label should expose source ingredient text");
assert(cheerios.ingredient_text.includes("Whole Grain Oats"), "Cheerios current label should expose source ingredient text");
assert(honeyNutCheerios.ingredient_text.includes("Natural Almond Flavor"), "Honey Nut Cheerios current label should expose source ingredient text");
assert(luckyCharms.ingredient_text.includes("Whole Grain Oats"), "Lucky Charms current label should expose source ingredient text");
assert(luckyCharms.ingredient_text.includes("Trisodium Phosphate"), "Lucky Charms current label should expose source ingredient text");
assert(luckyCharms.ingredient_text.includes("Vitamin D3"), "Lucky Charms current label should expose vitamins/minerals text");
assert.strictEqual(luckyCharms.source_url, "https://www.luckycharms.com/products/lucky-charms-jumbo-rainbow", "Lucky Charms should use the current canonical official product URL");
assert(popTartsStrawberry.ingredient_text.includes("dried strawberries"), "Pop-Tarts Strawberry current label should expose source ingredient text");
assert(popTartsBrownSugar.ingredient_text.includes("cinnamon"), "Pop-Tarts Brown Sugar Cinnamon current label should expose source ingredient text");
assert(cheezIt.ingredient_text.includes("cheese made with skim milk"), "Cheez-It current label should expose source ingredient text");
assert(jif.ingredient_text.includes("Molasses"), "Jif current label should expose source ingredient text");
assert(campbellsTomato.ingredient_text.includes("Tomato Puree"), "Campbell's Tomato Soup current label should expose source ingredient text");
assert(campbellsChicken.ingredient_text.includes("Chicken Stock"), "Campbell's Chicken Noodle Soup current label should expose source ingredient text");
assert(nutella.ingredient_text.includes("hazelnuts"), "Nutella current label should expose source ingredient text");
assert(philadelphia.ingredient_text.includes("PASTEURIZED MILK AND CREAM"), "Philadelphia current label should expose source ingredient text");
assert(oscarMayer.ingredient_text.includes("MECHANICALLY SEPARATED CHICKEN"), "Oscar Mayer current label should expose source ingredient text");
assert(koolAid.ingredient_text.includes("CITRIC ACID"), "Kool-Aid current label should expose source ingredient text");
assert(jelloStrawberry.ingredient_text.includes("GELATIN"), "Jell-O Strawberry current label should expose source ingredient text");
assert(jelloStrawberry.ingredient_text.includes("RED 40"), "Jell-O Strawberry current label should expose color ingredient text");
assert.strictEqual(jelloStrawberry.source_url, "https://www.kraftheinz.com/jell-o/products/00043000200018-strawberry-gelatin-dessert-mix", "Jell-O Strawberry should use the current official product URL");
assert.strictEqual(jelloStrawberry.source_owner, "The Kraft Heinz Company", "Jell-O Strawberry should expose the official source owner");
assert(pringles.ingredient_text.includes("DRIED POTATOES"), "Pringles current label should expose source ingredient text");
assert(eggo.ingredient_text.includes("Enriched flour"), "Eggo Homestyle Waffles current label should expose source ingredient text");
assert(eggo.ingredient_text.includes("soy lecithin"), "Eggo Homestyle Waffles current label should expose source ingredient text");
assert(eggo.ingredient_text.includes("Calcium carbonate"), "Eggo Homestyle Waffles current label should expose vitamins/minerals text");
assert(chickFilA.ingredient_text.includes("boneless, skinless chicken breast"), "Chick-fil-A current label should expose source ingredient text");
assert(chickFilA.ingredient_text.includes("monosodium glutamate"), "Chick-fil-A current label should expose source ingredient text");
assert(mms.ingredient_text.includes("Milk chocolate"), "M&M's current label should expose source ingredient text");
assert(mms.ingredient_text.includes("carnauba wax"), "M&M's current label should expose source ingredient text");
assert(tootsie.ingredient_text.includes("Corn Syrup"), "Tootsie Roll current label should expose source ingredient text");
assert(tootsie.ingredient_text.includes("Soy Lecithin"), "Tootsie Roll current label should expose source ingredient text");
assert(riceKrispies.ingredient_text.includes("Rice"), "Rice Krispies current label should expose source ingredient text");
assert(riceKrispies.ingredient_text.includes("malt flavor"), "Rice Krispies current label should expose source ingredient text");
assert(raisinBran.ingredient_text.includes("Whole grain wheat"), "Raisin Bran current label should expose source ingredient text");
assert(raisinBran.ingredient_text.includes("brown sugar syrup"), "Raisin Bran current label should expose source ingredient text");
assert(riceKrispiesTreats.ingredient_text.includes("Toasted rice cereal"), "Rice Krispies Treats current label should expose source ingredient text");
assert(riceKrispiesTreats.ingredient_text.includes("TBHQ for freshness"), "Rice Krispies Treats current label should expose source ingredient text");
assert(bettyCrockerCake.ingredient_text.includes("Modified Corn Starch"), "Betty Crocker cake mix current label should expose source ingredient text");
assert(bettyCrockerCake.ingredient_text.includes("Yellows 5 & 6"), "Betty Crocker cake mix current label should expose source ingredient text");
assert(bisquick.ingredient_text.includes("Dextrose"), "Bisquick current label should expose source ingredient text");
assert(bisquick.ingredient_text.includes("Monoglycerides"), "Bisquick current label should expose source ingredient text");
assert(pillsburyCrescents.ingredient_text.includes("Vegetable Shortening"), "Pillsbury Crescent Rolls current label should expose source ingredient text");
assert(pillsburyCrescents.ingredient_text.includes("Potassium Sorbate"), "Pillsbury Crescent Rolls current label should expose source ingredient text");
assert(toasterStrudel.ingredient_text.includes("High Fructose Corn Syrup"), "Pillsbury Toaster Strudel current label should expose source ingredient text");
assert(toasterStrudel.ingredient_text.includes("Strawberry Juice Concentrate"), "Pillsbury Toaster Strudel current label should expose source ingredient text");
assert(stouffersLasagna.ingredient_text.includes("TOMATO PUREE"), "Stouffer's Lasagna current label should expose source ingredient text");
assert(stouffersLasagna.ingredient_text.includes("COOKED BEEF"), "Stouffer's Lasagna current label should expose source ingredient text");
assert(leanCuisine.ingredient_text.includes("SALISBURY STEAK WITH GRAVY"), "Lean Cuisine current label should expose source ingredient text");
assert(leanCuisine.ingredient_text.includes("TEXTURED SOY FLOUR"), "Lean Cuisine current label should expose source ingredient text");
assert(skittles.ingredient_text.includes("Hydrogenated Palm Kernel Oil"), "Skittles current label should expose source ingredient text");
assert(skittles.ingredient_text.includes("Carnauba Wax"), "Skittles current label should expose source ingredient text");
assert(starburst.ingredient_text.includes("Apple Juice From Concentrate"), "Starburst current label should expose source ingredient text");
assert(starburst.ingredient_text.includes("Gelatin"), "Starburst current label should expose source ingredient text");
assert(milkyWay.ingredient_text.includes("Barley Malt Extract"), "Milky Way current label should expose source ingredient text");
assert(milkyWay.ingredient_text.includes("Egg Whites"), "Milky Way current label should expose source ingredient text");
assert(!milkyWay.ingredient_text.includes("CONTAINS MILK"), "Milky Way current label should keep allergen statement out of ingredient items");
assert(spaghettios.ingredient_text.includes("TOMATO PUREE"), "SpaghettiOs current label should expose source ingredient text");
assert(spaghettios.ingredient_text.includes("HIGH FRUCTOSE CORN SYRUP"), "SpaghettiOs current label should expose source ingredient text");
assert(oscarMayerWieners.ingredient_text.includes("MECHANICALLY SEPARATED TURKEY"), "Oscar Mayer Wieners current label should expose source ingredient text");
assert(oscarMayerWieners.ingredient_text.includes("SODIUM NITRITE"), "Oscar Mayer Wieners current label should expose source ingredient text");
assert(smuckers.ingredient_text.includes("Strawberries"), "Smucker's Strawberry Preserves current label should expose source ingredient text");
assert(smuckers.ingredient_text.includes("High Fructose Corn Syrup"), "Smucker's Strawberry Preserves current label should expose source ingredient text");
assert(paneraSoup.ingredient_text.includes("Chicken Stock"), "Panera Broccoli Cheddar Soup current label should expose source ingredient text");
assert(paneraSoup.ingredient_text.includes("Dijon Mustard"), "Panera Broccoli Cheddar Soup current label should expose source ingredient text");
assert(twix.ingredient_text.includes("Enriched Wheat Flour"), "Twix current label should expose source ingredient text");
assert(twix.ingredient_text.includes("Modified Corn Starch"), "Twix current label should expose source ingredient text");
assert(wheaties.ingredient_text.includes("Whole Grain Wheat"), "Wheaties current label should expose source ingredient text");
assert(wheaties.ingredient_text.includes("Vitamin B 12"), "Wheaties current label should expose source ingredient text");
assert(ballPark.ingredient_text.includes("hydrolyzed beef stock"), "Ball Park current label should expose source ingredient text");
assert(ballPark.ingredient_text.includes("sodium nitrite"), "Ball Park current label should expose source ingredient text");
assert(frenchs.ingredient_text.includes("Distilled Vinegar"), "French's current label should expose source ingredient text");
assert(frenchs.ingredient_text.includes("#1 Grade Mustard Seed"), "French's current label should expose source ingredient text");
assert(frenchs.source_image_match_status === "official_current_ingredient_label_image", "French's proof card should use the official ingredient-label image");
assert.strictEqual(frenchs.proof_visual_basis, "official_ingredient_label_image", "French's proof basis should identify an actual ingredient-label image");
assert(goldfish.ingredient_text.includes("Cheddar Cheese"), "Goldfish current label should expose source ingredient text");
assert(goldfish.ingredient_text.includes("Autolyzed Yeast Extract"), "Goldfish current label should expose source ingredient text");
assert.strictEqual(goldfish.source_url, "https://www.pepperidgefarm.com/product/goldfish-cheddar/", "Goldfish should use the current canonical official product URL");
assert(hamburgerHelper.ingredient_text.includes("Enriched Pasta"), "Hamburger Helper current label should expose source ingredient text");
assert(hamburgerHelper.ingredient_text.includes("Yeast Extract"), "Hamburger Helper current label should expose source ingredient text");
assert.strictEqual(hamburgerHelper.source_url, "https://www.hamburgerhelper.com/product/hamburger-helper-cheeseburger-macaroni-4-pack-microwave-cup/", "Hamburger Helper should use the current canonical official product URL");
assert(grapeNuts.ingredient_text.includes("Whole Grain Wheat Flour"), "Grape-Nuts current label should expose source ingredient text");
assert(grapeNuts.ingredient_text.includes("Reduced Iron"), "Grape-Nuts current label should expose source ingredient text");
assert.strictEqual(grapeNuts.source_url, "https://www.grapenuts.com/product/the-original/", "Grape-Nuts should use the current canonical official product URL");
assert(kraftMac.ingredient_text.includes("ENRICHED MACARONI"), "Kraft Mac & Cheese current label should expose source ingredient text");
assert(kraftMac.ingredient_text.includes("CHEESE SAUCE MIX"), "Kraft Mac & Cheese current label should expose source ingredient text");
assert.strictEqual(kraftMac.source_url, "https://www.kraftheinz.com/kraft-mac-and-cheese/products/00021000658831-original-mac-cheese-macaroni-and-cheese-dinner", "Kraft Mac & Cheese should use the current canonical official product URL");
assert.strictEqual(kraftMac.source_title, "Kraft Original Mac & Cheese official product page", "Kraft Mac & Cheese should not retain the retailer queue title");
assert.strictEqual(kraftMac.source_owner, "The Kraft Heinz Company", "Kraft Mac & Cheese should expose the official source owner");
assert(velveetaShells.ingredient_text.includes("ENRICHED MACARONI PRODUCT"), "Velveeta Shells & Cheese current label should expose source ingredient text");
assert(velveetaShells.ingredient_text.includes("SODIUM ALGINATE"), "Velveeta Shells & Cheese current label should expose source ingredient text");
assert.strictEqual(velveetaShells.source_url, "https://www.kraftheinz.com/velveeta/products/00021000658930-shells-cheese-original-shell-pasta-cheese-sauce-meal", "Velveeta Shells & Cheese should use the current canonical official product URL");
assert.strictEqual(velveetaShells.source_title, "Velveeta Shells & Cheese Original official product page", "Velveeta Shells & Cheese should not retain the retailer queue title");
assert.strictEqual(velveetaShells.source_owner, "The Kraft Heinz Company", "Velveeta Shells & Cheese should expose the official source owner");
assert(totinos.ingredient_text.includes("Enriched Flour"), "Totino's Pizza Rolls current label should expose source ingredient text");
assert(totinos.ingredient_text.includes("Tomato Puree"), "Totino's Pizza Rolls current label should expose source ingredient text");
assert(totinos.ingredient_text.includes("Pepperoni Seasoned Pork"), "Totino's Pizza Rolls current label should expose source ingredient text");
assert.strictEqual(totinos.source_url, "https://www.totinos.com/products/pepperoni-pizza-rolls", "Totino's Pizza Rolls should use the current canonical official product URL");
assert.strictEqual(totinos.source_title, "Totino's Pepperoni Pizza Rolls official product page", "Totino's Pizza Rolls should expose the official product page title");
assert.strictEqual(totinos.source_owner, "General Mills", "Totino's Pizza Rolls should expose the official source owner");
assert(pizzaHutPanPepperoni.ingredient_text.includes("Pepperoni topping: pork, beef"), "Pizza Hut Original Pan Pepperoni current evidence should expose pepperoni component text");
assert(pizzaHutPanPepperoni.ingredient_text.includes("natural spice extractives"), "Pizza Hut Original Pan Pepperoni current evidence should expose pepperoni component text");
assert.strictEqual(pizzaHutPanPepperoni.source_url, "https://www.pizzahut.com/c/content/pepperoni-pizza", "Pizza Hut Original Pan Pepperoni should use the official menu URL");
assert.strictEqual(pizzaHutPanPepperoni.source_title, "Pizza Hut Pepperoni Pizza official menu page", "Pizza Hut Original Pan Pepperoni should expose the official menu title");
assert.strictEqual(pizzaHutPanPepperoni.source_owner, "Pizza Hut", "Pizza Hut Original Pan Pepperoni should expose the official source owner");
assert.strictEqual(pizzaHutPanPepperoni.ingredient_text_source, "official_current_menu_page_text", "Pizza Hut Original Pan Pepperoni should identify menu page text as the source");
assert.strictEqual(pizzaHutPanPepperoni.proof_visual_basis, "official_menu_or_api_text", "Pizza Hut Original Pan Pepperoni proof basis should identify menu/API source text");
assert(Array.isArray(pizzaHutPanPepperoni.ingredient_items) && pizzaHutPanPepperoni.ingredient_items.length === 1, "Pizza Hut Original Pan Pepperoni should expose the pepperoni component without implying a full formula");
assert(cinnamonToastCrunch.ingredient_text.includes("Whole Grain Wheat"), "Cinnamon Toast Crunch current label should expose source ingredient text");
assert(cinnamonToastCrunch.ingredient_text.includes("Trisodium Phosphate"), "Cinnamon Toast Crunch current label should expose source ingredient text");
assert(cinnamonToastCrunch.ingredient_text.includes("BHT Added to Preserve Freshness"), "Cinnamon Toast Crunch current label should expose source ingredient text");
assert.strictEqual(cinnamonToastCrunch.source_url, "https://www.generalmillsconvenience.com/products/cinnamon-toast-crunch-12oz", "Cinnamon Toast Crunch should use the exact General Mills Convenience URL");
assert.strictEqual(cinnamonToastCrunch.source_title, "General Mills Convenience Cinnamon Toast Crunch 12 oz official product page", "Cinnamon Toast Crunch should expose the official product page title");
assert.strictEqual(cinnamonToastCrunch.source_owner, "General Mills Convenience", "Cinnamon Toast Crunch should expose the official source owner");
assert(hiddenValley.ingredient_text.includes("Vegetable Oil"), "Hidden Valley current label should expose source ingredient text");
assert(hiddenValley.ingredient_text.includes("Monosodium Glutamate"), "Hidden Valley current label should expose source ingredient text");
assert(hiddenValley.ingredient_text.includes("Disodium Inosinate & Guanylate"), "Hidden Valley current label should expose source ingredient text");
assert.strictEqual(hiddenValley.source_url, "https://www.hiddenvalley.com/products/ranch-condiments/original-ranch/original-bottled-ranch/", "Hidden Valley should use the current canonical official product URL");
assert.strictEqual(hiddenValley.source_title, "Hidden Valley Original Ranch official product page", "Hidden Valley should expose the official product page title");
assert.strictEqual(hiddenValley.source_owner, "Hidden Valley / The Clorox Company", "Hidden Valley should expose the official source owner");
assert.strictEqual(hiddenValley.source_image_match_status, "official_current_ingredient_label_image", "Hidden Valley proof should include the official ingredient-label image");
assert.strictEqual(hiddenValley.proof_visual_basis, "official_ingredient_label_image", "Hidden Valley proof basis should identify an actual ingredient-label image");
assert.strictEqual(hiddenValley.source_candidate_image_count, 2, "Hidden Valley should count product and label source visuals without exposing paths");
assert(butterfinger.ingredient_text.includes("Corn syrup"), "Butterfinger current label should expose source ingredient text");
assert(butterfinger.ingredient_text.includes("peanut flour"), "Butterfinger current label should expose source ingredient text");
assert(butterfinger.ingredient_text.includes("annatto color"), "Butterfinger current label should expose source ingredient text");
assert.strictEqual(butterfinger.source_url, "https://www.butterfinger.com/products/butterfinger", "Butterfinger should use the exact official product URL");
assert.strictEqual(butterfinger.source_title, "Butterfinger official product page", "Butterfinger should expose the official product page title");
assert.strictEqual(butterfinger.source_owner, "Butterfinger / Ferrero", "Butterfinger should expose the official source owner");
assert.strictEqual(butterfinger.source_image_match_status, "official_current_ingredient_label_image", "Butterfinger proof should include the official ingredient-label image");
assert.strictEqual(butterfinger.proof_visual_basis, "official_ingredient_label_image", "Butterfinger proof basis should identify an actual ingredient-label image");
assert.strictEqual(butterfinger.source_candidate_image_count, 2, "Butterfinger should count product and label source visuals without exposing paths");
assert(wendysDavesSingle.ingredient_text.includes("Potato Bun"), "Wendy's Dave's Single current evidence should expose bun component text");
assert(wendysDavesSingle.ingredient_text.includes("Ground Beef"), "Wendy's Dave's Single current evidence should expose beef component text");
assert(wendysDavesSingle.ingredient_text.includes("American Cheese Slice"), "Wendy's Dave's Single current evidence should expose cheese component text");
assert(!wendysDavesSingle.ingredient_text.includes("Applewood Smoked Bacon"), "Wendy's Dave's Single default proof should not include optional add-ons");
assert.strictEqual(wendysDavesSingle.source_url, "https://order.wendys.com/us/en/national/menu/hamburgers/daves-single", "Wendy's Dave's Single should use the exact official order URL");
assert.strictEqual(wendysDavesSingle.source_title, "Wendy's Dave's Single official menu page", "Wendy's Dave's Single should expose the official menu title");
assert.strictEqual(wendysDavesSingle.source_owner, "Wendy's", "Wendy's Dave's Single should expose the official source owner");
assert(wendysChili.ingredient_text.includes("Chili Sauce"), "Wendy's Chili current evidence should expose chili sauce text");
assert(wendysChili.ingredient_text.includes("Ground Beef"), "Wendy's Chili current evidence should expose beef text");
assert(wendysChili.ingredient_text.includes("Chili Beans"), "Wendy's Chili current evidence should expose bean text");
assert(!wendysChili.ingredient_text.includes("Cheddar Cheese, shredded"), "Wendy's Chili default proof should not include optional add-ons");
assert.strictEqual(wendysChili.source_url, "https://order.wendys.com/us/en/national/menu/fries-sides/chili", "Wendy's Chili should use the exact official order URL");
assert.strictEqual(wendysChili.source_title, "Wendy's Chili official menu page", "Wendy's Chili should expose the official menu title");
assert.strictEqual(wendysChili.source_owner, "Wendy's", "Wendy's Chili should expose the official source owner");
assert(tacoBellCrunchyTaco.ingredient_text.includes("Taco Shell: Ground corn"), "Taco Bell Crunchy Taco current evidence should expose shell component text");
assert(tacoBellCrunchyTaco.ingredient_text.includes("Seasoned Beef: Beef"), "Taco Bell Crunchy Taco current evidence should expose beef component text");
assert(tacoBellCrunchyTaco.ingredient_text.includes("Cheddar Cheese: Cheddar cheese"), "Taco Bell Crunchy Taco current evidence should expose cheese component text");
assert.strictEqual(tacoBellCrunchyTaco.source_url, "https://www.tacobell.com/food/menu-items/crunchy-taco", "Taco Bell Crunchy Taco should use the exact official item URL");
assert.strictEqual(tacoBellCrunchyTaco.source_title, "Taco Bell Crunchy Taco official menu page", "Taco Bell Crunchy Taco should expose the official menu title");
assert.strictEqual(tacoBellCrunchyTaco.source_owner, "Taco Bell", "Taco Bell Crunchy Taco should expose the official source owner");
assert.strictEqual(tacoBellCrunchyTaco.ingredient_text_source, "official_current_menu_ingredient_statement_table", "Taco Bell Crunchy Taco should identify the Nutritionix ingredient-statement table source");
assert.strictEqual(tacoBellCrunchyTaco.proof_visual_basis, "official_menu_or_api_text", "Taco Bell Crunchy Taco proof basis should identify menu/API source text");
assert(Array.isArray(tacoBellCrunchyTaco.ingredient_items) && tacoBellCrunchyTaco.ingredient_items.length === 4, "Taco Bell Crunchy Taco should expose four structured component ingredient items");
assert(tacoBellBeanBurrito.ingredient_text.includes("Flour Tortilla: Bleached enriched wheat flour"), "Taco Bell Bean Burrito current evidence should expose tortilla component text");
assert(tacoBellBeanBurrito.ingredient_text.includes("Seasoned Refried Beans: Pinto beans"), "Taco Bell Bean Burrito current evidence should expose bean component text");
assert(tacoBellBeanBurrito.ingredient_text.includes("Red Sauce: Water"), "Taco Bell Bean Burrito current evidence should expose red sauce component text");
assert(tacoBellBeanBurrito.ingredient_text.includes("Onions: Fresh onions"), "Taco Bell Bean Burrito current evidence should expose onion component text");
assert.strictEqual(tacoBellBeanBurrito.source_url, "https://www.tacobell.com/food/burritos/bean-burrito", "Taco Bell Bean Burrito should use the exact official item URL");
assert.strictEqual(tacoBellBeanBurrito.source_title, "Taco Bell Bean Burrito official menu page", "Taco Bell Bean Burrito should expose the official menu title");
assert.strictEqual(tacoBellBeanBurrito.source_owner, "Taco Bell", "Taco Bell Bean Burrito should expose the official source owner");
assert.strictEqual(tacoBellBeanBurrito.ingredient_text_source, "official_current_menu_ingredient_statement_table", "Taco Bell Bean Burrito should identify the Nutritionix ingredient-statement table source");
assert.strictEqual(tacoBellBeanBurrito.proof_visual_basis, "official_menu_or_api_text", "Taco Bell Bean Burrito proof basis should identify menu/API source text");
assert(Array.isArray(tacoBellBeanBurrito.ingredient_items) && tacoBellBeanBurrito.ingredient_items.length === 5, "Taco Bell Bean Burrito should expose five structured component ingredient items");
assert(bigMac.ingredient_text.includes("Big Mac Bun"), "Big Mac current ingredient evidence should expose component text");
assert(bigMac.ingredient_text.includes("100% Pure Usda Inspected Beef"), "Big Mac current ingredient evidence should expose beef-patty text");
assert(bigMac.ingredient_text.includes("Big Mac Sauce"), "Big Mac current ingredient evidence should expose sauce text");
assert(fries.ingredient_text.includes("Potatoes"), "McDonald's fries current ingredient evidence should expose potato text");
assert(fries.ingredient_text.includes("Natural Beef Flavor"), "McDonald's fries current ingredient evidence should expose flavor text");
assert(mcnuggets.ingredient_text.includes("White Boneless Chicken"), "McNuggets current ingredient evidence should expose chicken text");
assert(mcnuggets.ingredient_text.includes("Enriched Flour"), "McNuggets current ingredient evidence should expose breading text");
assert(dominosHandTossedPepperoni.ingredient_text.includes("HAND TOSSED CRUST: Enriched Flour"), "Domino's Hand Tossed Pepperoni current evidence should expose crust component text");
assert(dominosHandTossedPepperoni.ingredient_text.includes("PIZZA SAUCE (ROBUST INSPIRED TOMATO SAUCE): Water, Tomato Paste"), "Domino's Hand Tossed Pepperoni current evidence should expose sauce component text");
assert(dominosHandTossedPepperoni.ingredient_text.includes("PIZZA CHEESE: Part Skim Mozzarella Cheese"), "Domino's Hand Tossed Pepperoni current evidence should expose cheese component text");
assert(dominosHandTossedPepperoni.ingredient_text.includes("PEPPERONI: Pork and Beef"), "Domino's Hand Tossed Pepperoni current evidence should expose pepperoni component text");
assert.strictEqual(dominosHandTossedPepperoni.source_url, "https://www.dominos.com/en/pages/content/nutritional/ingredients", "Domino's Hand Tossed Pepperoni should use the official ingredients URL");
assert.strictEqual(dominosHandTossedPepperoni.source_title, "Domino's U.S. Pizza Ingredients official XML", "Domino's Hand Tossed Pepperoni should expose the official XML title");
assert.strictEqual(dominosHandTossedPepperoni.source_owner, "Domino's Pizza", "Domino's Hand Tossed Pepperoni should expose the official source owner");
assert.strictEqual(dominosHandTossedPepperoni.ingredient_text_source, "official_current_menu_ingredient_statement_xml", "Domino's Hand Tossed Pepperoni should identify official XML as the ingredient source");
assert.strictEqual(dominosHandTossedPepperoni.proof_visual_basis, "official_menu_or_api_text", "Domino's Hand Tossed Pepperoni proof basis should identify menu/API source text");
assert(Array.isArray(dominosHandTossedPepperoni.ingredient_items) && dominosHandTossedPepperoni.ingredient_items.length === 4, "Domino's Hand Tossed Pepperoni should expose four structured component ingredient items");
assert(dunkinGlazedDonut.ingredient_text.includes("Donut: Enriched Wheat Flour"), "Dunkin Glazed Donut current evidence should expose donut component text");
assert(dunkinGlazedDonut.ingredient_text.includes("Yeast Donut Concentrate"), "Dunkin Glazed Donut current evidence should expose donut concentrate text");
assert(dunkinGlazedDonut.ingredient_text.includes("Glaze: Sugar"), "Dunkin Glazed Donut current evidence should expose glaze component text");
assert(dunkinGlazedDonut.ingredient_text.includes("Potassium Sorbate"), "Dunkin Glazed Donut current evidence should expose glaze preservative text");
assert.strictEqual(dunkinGlazedDonut.source_url, "https://www.dunkindonuts.com/content/dam/dd/pdf/allergy_ingredient_guide.pdf", "Dunkin Glazed Donut should use the official ingredient PDF URL");
assert.strictEqual(dunkinGlazedDonut.source_detail_url, "https://www.dunkindonuts.com/content/dam/dd/pdf/allergy_ingredient_guide.pdf#page=82", "Dunkin Glazed Donut should deep-link to the extracted PDF page");
assert.strictEqual(dunkinGlazedDonut.source_title, "Dunkin' Allergen and Ingredient Guide official PDF", "Dunkin Glazed Donut should expose the official PDF title");
assert.strictEqual(dunkinGlazedDonut.source_owner, "Dunkin'", "Dunkin Glazed Donut should expose the official source owner");
assert.strictEqual(dunkinGlazedDonut.ingredient_text_source, "official_current_menu_ingredient_pdf", "Dunkin Glazed Donut should identify official PDF as the ingredient source");
assert.strictEqual(dunkinGlazedDonut.proof_visual_basis, "official_menu_or_api_text", "Dunkin Glazed Donut proof basis should identify menu/PDF source text");
assert(Array.isArray(dunkinGlazedDonut.ingredient_items) && dunkinGlazedDonut.ingredient_items.length >= 10, "Dunkin Glazed Donut should expose structured ingredient items from the PDF row");
assert(popeyesChickenSandwich.ingredient_text.includes("Chicken Filet: Boneless chicken breast meat"), "Popeyes Chicken Sandwich current evidence should expose chicken filet text");
assert(popeyesChickenSandwich.ingredient_text.includes("Buttermilk Batter: Water"), "Popeyes Chicken Sandwich current evidence should expose batter text");
assert(popeyesChickenSandwich.ingredient_text.includes("Brioche Bun: Enriched wheat flour"), "Popeyes Chicken Sandwich current evidence should expose bun text");
assert(popeyesChickenSandwich.ingredient_text.includes("Mayonnaise: Soybean oil"), "Popeyes Chicken Sandwich current evidence should expose mayonnaise text");
assert(popeyesChickenSandwich.ingredient_text.includes("Pickles: Cucumbers"), "Popeyes Chicken Sandwich current evidence should expose pickle text");
assert.strictEqual(popeyesChickenSandwich.source_url, "https://plk-use1-prod.sites.rbictg.com/nutrition/PLK_US_Ingredient_Information.pdf", "Popeyes Chicken Sandwich should use the official ingredient PDF URL");
assert.strictEqual(popeyesChickenSandwich.source_detail_url, "https://plk-use1-prod.sites.rbictg.com/nutrition/PLK_US_Ingredient_Information.pdf#page=1", "Popeyes Chicken Sandwich should deep-link to the extracted PDF page");
assert.strictEqual(popeyesChickenSandwich.source_title, "Popeyes U.S. Ingredient Information official PDF", "Popeyes Chicken Sandwich should expose the official PDF title");
assert.strictEqual(popeyesChickenSandwich.source_owner, "Popeyes / Restaurant Brands International", "Popeyes Chicken Sandwich should expose the official source owner");
assert.strictEqual(popeyesChickenSandwich.ingredient_text_source, "official_current_menu_ingredient_pdf", "Popeyes Chicken Sandwich should identify official PDF as the ingredient source");
assert.strictEqual(popeyesChickenSandwich.proof_visual_basis, "official_menu_or_api_text", "Popeyes Chicken Sandwich proof basis should identify menu/PDF source text");
assert(Array.isArray(popeyesChickenSandwich.ingredient_items) && popeyesChickenSandwich.ingredient_items.length === 8, "Popeyes Chicken Sandwich should expose eight component ingredient items from the PDF row");
assert(littleDebbieOatmeal.ingredient_text.includes("Corn Syrup"), "Little Debbie Oatmeal Creme Pies should expose source ingredient text");
assert(littleDebbieOatmeal.ingredient_text.includes("Whole Grain Rolled Oats"), "Little Debbie Oatmeal Creme Pies should expose oat ingredient text");
assert(littleDebbieOatmeal.ingredient_text.includes("TBHQ and Citric Acid"), "Little Debbie Oatmeal Creme Pies should expose preservative context");
assert(littleDebbieOatmeal.ingredient_text.includes("Sorbic Acid"), "Little Debbie Oatmeal Creme Pies should expose freshness preservative text");
assert.strictEqual(littleDebbieOatmeal.source_url, "https://mckeefoodservice.com/storage/app/media/Products/2026-spec-sheets/ld-dd-oatmeal-creme-pies-detail-sheet-1.pdf", "Little Debbie Oatmeal Creme Pies should use the official Foodservice PDF URL");
assert.strictEqual(littleDebbieOatmeal.source_detail_url, "https://mckeefoodservice.com/storage/app/media/Products/2026-spec-sheets/ld-dd-oatmeal-creme-pies-detail-sheet-1.pdf#page=1", "Little Debbie Oatmeal Creme Pies should deep-link to the extracted PDF page");
assert.strictEqual(littleDebbieOatmeal.source_title, "Little Debbie Double Decker Oatmeal Creme Pies official Foodservice detail sheet", "Little Debbie Oatmeal Creme Pies should expose the exact Foodservice sheet title");
assert.strictEqual(littleDebbieOatmeal.source_owner, "McKee Foodservice / McKee Foods", "Little Debbie Oatmeal Creme Pies should expose the official source owner");
assert.strictEqual(littleDebbieOatmeal.ingredient_text_source, "official_current_foodservice_ingredient_pdf", "Little Debbie Oatmeal Creme Pies should identify the Foodservice PDF ingredient source");
assert.strictEqual(littleDebbieOatmeal.proof_visual_basis, "official_source_text_proof_panel", "Little Debbie Oatmeal Creme Pies proof basis should remain a source-text proof panel");

const family = navigator.source_family_timeline?.families?.find((row) => row.id === "official-current-labels");
assert(family, "navigator should expose the official-current source-family timeline");
assert.strictEqual(family.product_count, 96, "navigator official-current timeline should cover 96 products");
assert.strictEqual(family.row_count, 96, "navigator official-current timeline should cover 96 rows");
assert.strictEqual(family.ingredient_signal_count, 96, "navigator official-current timeline should expose candidate count");
assert(family.products.every((product) => expectedProducts.has(product.product_id)), "navigator official-current timeline has unexpected products");

const summaryFamily = navigator.source_family_summary?.families?.find((row) => row.id === "official-current-labels");
assert(summaryFamily, "navigator source-family summary should expose official-current labels");
assert.strictEqual(summaryFamily.product_count, 96, "official-current summary should cover 96 products");
assert(summaryFamily.products.every((product) => product.ingredient_panel_visible_count === 1), "official-current summary should reflect current ingredient text candidates");

if (fs.existsSync(privateManifestPath)) {
  const privateManifest = JSON.parse(fs.readFileSync(privateManifestPath, "utf8"));
  assert.strictEqual(privateManifest.rows.length, 96, "official-current private manifest should have 96 rows");
  const hiddenValleyPrivate = privateManifest.rows.find((row) => row.product_id === "hidden_valley_ranch_original");
  const butterfingerPrivate = privateManifest.rows.find((row) => row.product_id === "butterfinger_bar");
  const dunkinPrivate = privateManifest.rows.find((row) => row.product_id === "dunkin_glazed_donut");
  const popeyesPrivate = privateManifest.rows.find((row) => row.product_id === "popeyes_chicken_sandwich");
  const littleDebbiePrivate = privateManifest.rows.find((row) => row.product_id === "little_debbie_oatmeal_creme_pies");
  assert(hiddenValleyPrivate.ingredient_label_image_path && fs.existsSync(hiddenValleyPrivate.ingredient_label_image_path), "Hidden Valley private manifest should retain the local label-panel image");
  assert(butterfingerPrivate.ingredient_label_image_path && fs.existsSync(butterfingerPrivate.ingredient_label_image_path), "Butterfinger private manifest should retain the local label-panel image");
  assert(dunkinPrivate.source_document_preview_path && fs.existsSync(dunkinPrivate.source_document_preview_path), "Dunkin private manifest should retain the local PDF source-page preview");
  assert(popeyesPrivate.source_document_preview_path && fs.existsSync(popeyesPrivate.source_document_preview_path), "Popeyes private manifest should retain the local PDF source-page preview");
  assert(littleDebbiePrivate.source_document_preview_path && fs.existsSync(littleDebbiePrivate.source_document_preview_path), "Little Debbie private manifest should retain the local PDF source-page preview");
  for (const row of privateManifest.rows) {
    const resolved = resolvePrivateIngredientCropPath(row.visual_id);
    assert(resolved, `${row.visual_id} should resolve through the shared private crop endpoint`);
    assert(fs.existsSync(resolved), `${row.visual_id} resolved crop should exist`);
    assert.strictEqual(path.resolve(resolved), path.resolve(row.upscaled_preview_path || row.preview_path), `${row.visual_id} should resolve to the upscaled proof crop`);
    assert(resolved.includes(`${path.sep}.cache${path.sep}ingredient-ocr${path.sep}official-current-labels${path.sep}`), "resolved official-current crop should stay under its private cache root");
    assert(row.ingredient_fragment_path && fs.existsSync(row.ingredient_fragment_path), `${row.visual_id} should keep a private ingredient fragment`);
  }
}

console.log("Official current label visual tests passed");
