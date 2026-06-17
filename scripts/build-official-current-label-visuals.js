const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const fullQueueCsvPath = path.join(root, "docs/data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv");
const visualIndexPath = path.join(root, "docs/data/product-evidence/official_current_ingredient_visual_index.json");
const navigatorPath = path.join(root, "docs/data/product-evidence/navigator_data.json");
const cacheRoot = path.join(root, ".cache/ingredient-ocr/official-current-labels");
const latestPrivateManifestPath = path.join(cacheRoot, "latest-private-manifest.json");
const sourceFamilyId = "official-current-labels";
const sourceFamilyLabel = "Official Current Labels";
const generatedAt = new Date().toISOString();

const curatedRows = {
  "oreo_original_chocolate_sandwich_cookies__current_2020s__1__5": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.mondelez.info/00044000033262-0001-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "doritos_nacho_cheese__current_2020s__727__4": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.pepsico.info/028400017305-0007-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "hersheys_milk_chocolate_bar__current_2020s__25__1": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.hersheys.com/034000290055-0051-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "ritz_original_crackers__current_2020s__30__2": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.mondelez.info/044000031121-0001-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "chips_ahoy_original__current_2020s__11__7": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.mondelez.info/044000073336-0001-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "triscuit_original__current_2020s__936__3": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.mondelez.info/044000050986-0002-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "wheat_thins_original__current_2020s__1000__5": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.mondelez.info/044000009625-0003-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "fig_newtons__current_2020s__58__4": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.mondelez.info/044000078348-0001-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "teddy_grahams_honey__current_2020s__841__4": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.mondelez.info/00044000045586-0001-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "lays_classic__current_2020s__28__2": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.pepsico.info/028400017145-0003-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "ruffles_original__current_2020s__79__3": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.pepsico.info/028400020893-0003-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "fritos_original__current_2020s__77__4": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.pepsico.info/028400017206-0003-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "gatorade_lemon_lime__current_2020s__81__3": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.pepsico.info/052000208054-0012-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "sunchips_harvest_cheddar__current_2020s__127__5": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.pepsico.info/028400160001-0003-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "cheetos_crunchy__current_2020s__495__3": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.pepsico.info/028400329453-0021-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "pepsi_cola__current_2020s__259__1": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.pepsico.info/012000192524-0014-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "mountain_dew_original__current_2020s__992__6": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.pepsico.info/012000002977-0001-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "quaker_old_fashioned_oats__current_2020s__1091__3": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.pepsico.info/030000010204-0004-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "tostitos_original__current_2020s__90__4": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.pepsico.info/028400517997-0005-en-US/index.html?stylekey=tostitos-10#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "kit_kat_bar__current_2020s__61__1": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.hersheys.com/034000002467-0011-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "reeses_peanut_butter_cups__current_2020s__35__1": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_fetch_url: "https://smartlabel.hersheys.com/034000004409-0011-en-US/index.html",
    source_url_override: "https://smartlabel.hersheys.com/034000004409-0011-en-US/index.html",
    source_detail_url: "https://smartlabel.hersheys.com/034000004409-0011-en-US/index.html#ingredients",
    source_title_override: "Reese's Peanut Butter Cups official SmartLabel page",
    source_owner_override: "The Hershey Company",
    source_image_match_status: "official_current_label_page",
  },
  "hellmanns_mayonnaise_real__current_2020s__850__6": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.unileverusa.com/048001213388-0001-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "life_cereal_original__current_2020s__121__2": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.pepsico.info/030000063545-0021-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "hebrew_national_franks__current_2020s__815__4": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.congra.net/074956184619-0002-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "twizzlers_strawberry__current_2020s__139__4": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.hersheys.com/034000544028-0050-en-US/index.html?cname=00034000544028-0050#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "banquet_chicken_pot_pie__current_2020s__625__5": {
    ingredient_fragment_strategy: "smartlabel_fragment",
    source_detail_url: "https://smartlabel.conagra.com/031000101015-0004-en-US/index.html#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "skippy_creamy_peanut_butter__current_2020s__872__8": {
    ingredient_fragment_strategy: "hormel_page",
    source_detail_url: "https://smartlabel.hormelfoods.com/product-info/00037600105538#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "spam_classic__current_2020s__788__10": {
    ingredient_fragment_strategy: "hormel_page",
    source_detail_url: "https://smartlabel.hormelfoods.com/product-info/00037600647786#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "dinty_moore_beef_stew__current_2020s__1058__5": {
    ingredient_fragment_strategy: "hormel_page",
    source_detail_url: "https://smartlabel.hormelfoods.com/product-info/00037600249348#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "hormel_chili_no_beans__current_2020s__385__8": {
    ingredient_fragment_strategy: "hormel_page",
    source_detail_url: "https://smartlabel.hormelfoods.com/product-info/00037600112895#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "coca_cola_classic__current_2020s__249__1": {
    ingredient_fragment_strategy: "coca_cola_page",
    source_detail_url: "https://www.coca-cola.com/us/en/brands/coca-cola/products/original?redirect=true#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "sprite_original__current_2020s__80__2": {
    ingredient_fragment_strategy: "coca_cola_sprite_products_page",
    source_detail_url: "https://www.coca-cola.com/us/en/brands/sprite/products#ingredients",
    source_image_url: "https://www.coca-cola.com/content/dam/onexp/us/en/brands/sprite/products/en_sprite_prod_12oz-can_750x750_v1.jpg",
    source_image_match_status: "official_current_product_page",
  },
  "heinz_tomato_ketchup__current_2020s__251__3": {
    ingredient_fragment_strategy: "kraft_heinz_json",
    source_detail_url: "https://www.heinz.com/products/00013000006408-tomato-ketchup#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "kraft_singles_american__current_2020s__78__4": {
    ingredient_fragment_strategy: "kraft_heinz_json",
    source_detail_url: "https://www.kraftheinz.com/kraft-singles/products/00021000604739-singles-american-pasteurized-prepared-cheese-product-slices/#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "cool_whip_original__current_2020s__118__4": {
    ingredient_fragment_strategy: "kraft_heinz_json",
    source_detail_url: "https://www.kraftheinz.com/cool-whip/products/00043000009604-original-whipped-topping#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "miracle_whip_original__current_2020s__955__3": {
    ingredient_fragment_strategy: "kraft_heinz_json",
    source_detail_url: "https://www.kraftheinz.com/miracle-whip/products/00021000647002-mayo-like-dressing#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "cheerios_original__current_2020s__10__1": {
    ingredient_fragment_strategy: "general_mills_page",
    source_detail_url: "https://www.cheerios.com/products/original-cheerios#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "honey_nut_cheerios__current_2020s__31__1": {
    ingredient_fragment_strategy: "general_mills_page",
    source_detail_url: "https://www.cheerios.com/products/honey-nut-cheerios#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "poptarts_frosted_strawberry__current_2020s__14__4": {
    ingredient_fragment_strategy: "kellanova_page",
    source_detail_url: "https://www.poptarts.com/en_US/products/all-flavors/pop-tarts-frosted-strawberry-product.html#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "poptarts_brown_sugar_cinnamon__current_2020s__537__1": {
    ingredient_fragment_strategy: "kellanova_page",
    source_detail_url: "https://www.poptarts.com/en_US/products/all-flavors/pop-tarts-frosted-brown-sugar-cinnamon-product.html#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "cheez_it_original__current_2020s__21__1": {
    ingredient_fragment_strategy: "kellanova_page",
    source_detail_url: "https://www.cheezit.com/en-us/products/cheez-it-original-crackers-product.html#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "jif_creamy_peanut_butter__current_2020s__60__3": {
    ingredient_fragment_strategy: "jif_page",
    source_detail_url: "https://www.jif.com/products/creamy/creamy-peanut-butter#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "campbells_tomato_soup__current_2020s__501__1": {
    ingredient_fragment_strategy: "campbells_page",
    source_detail_url: "https://www.campbells.com/products/condensed/tomato-soup/#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "campbells_chicken_noodle_soup__current_2020s__36__5": {
    ingredient_fragment_strategy: "campbells_page",
    source_detail_url: "https://www.campbells.com/products/condensed/chicken-noodle-soup/#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "nutella_hazelnut_spread__current_2020s__65__6": {
    ingredient_fragment_strategy: "nutella_page",
    source_detail_url: "https://www.nutella.com/us/en/products/spread/nutella#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "philadelphia_cream_cheese_original__current_2020s__948__3": {
    ingredient_fragment_strategy: "kraft_heinz_json",
    source_detail_url: "https://www.kraftheinz.com/philadelphia/products/00021000612239-original-cream-cheese#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "oscar_mayer_bologna__current_2020s__386__3": {
    ingredient_fragment_strategy: "kraft_heinz_json",
    source_detail_url: "https://www.kraftheinz.com/oscar-mayer/products/00044700008744-bologna-sliced-lunch-meat#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "kool_aid_cherry__current_2020s__106__4": {
    ingredient_fragment_strategy: "kraft_heinz_json",
    source_detail_url: "https://www.kraftheinz.com/kool-aid/products/00043000953532-sugar-sweetened-cherry-artificially-flavored-powdered-soft-drink-mix#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "jello_strawberry_gelatin__current_2020s__560__2": {
    ingredient_fragment_strategy: "kraft_heinz_json",
    source_fetch_url: "https://www.kraftheinz.com/jell-o/products/00043000200018-strawberry-gelatin-dessert-mix",
    source_url_override: "https://www.kraftheinz.com/jell-o/products/00043000200018-strawberry-gelatin-dessert-mix",
    source_detail_url: "https://www.kraftheinz.com/jell-o/products/00043000200018-strawberry-gelatin-dessert-mix#ingredients",
    source_title_override: "Jell-O Strawberry Gelatin Dessert Mix official product page",
    source_owner_override: "The Kraft Heinz Company",
    source_image_match_status: "official_current_product_page",
  },
  "pringles_original__current_2020s__996__7": {
    ingredient_fragment_strategy: "kellanova_page",
    source_fetch_url: "https://www.pringles.com/en-us/products/pringles-the-original-product.html",
    source_detail_url: "https://www.pringles.com/en-us/products/pringles-the-original-product.html#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "eggo_homestyle_waffles__current_2020s__626__4": {
    ingredient_fragment_strategy: "kellanova_page",
    source_detail_url: "https://www.leggomyeggo.com/en_US/eggo-homestyle-waffles-product.html#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "lucky_charms__current_2020s__42__1": {
    ingredient_fragment_strategy: "general_mills_marketing_page",
    source_fetch_url: "https://www.luckycharms.com/products/lucky-charms-jumbo-rainbow",
    source_url_override: "https://www.luckycharms.com/products/lucky-charms-jumbo-rainbow",
    source_detail_url: "https://www.luckycharms.com/products/lucky-charms-jumbo-rainbow#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "chick_fil_a_chicken_sandwich__current_2020s__946__2": {
    ingredient_fragment_strategy: "official_json_ingredients",
    source_detail_url: "https://www.chick-fil-a.com/menu/entrees/chick-fil-a-chicken-sandwich/#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "mms_milk_chocolate__current_2020s__497__2": {
    ingredient_fragment_strategy: "official_json_ingredients",
    source_detail_url: "https://www.mms.com/en-us/holiday-collection/mms-christmas-bulk-candy/ct1217-p.html#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "tootsie_roll__current_2020s__126__6": {
    ingredient_fragment_strategy: "tootsie_page",
    source_detail_url: "https://tootsie.com/products/tootsie-rolls/#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "rice_krispies__current_2020s__55__3": {
    ingredient_fragment_strategy: "wkkellogg_smartlabel",
    source_detail_url: "https://smartlabel.wkkellogg.com/Product/Index?gtin=00038000005657#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "raisin_bran_kelloggs__current_2020s__111__3": {
    ingredient_fragment_strategy: "wkkellogg_smartlabel",
    source_detail_url: "https://smartlabel.wkkellogg.com/Product/Index?gtin=00038000270840#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "rice_krispies_treats_original__current_2020s__112__2": {
    ingredient_fragment_strategy: "kelloggs_ingredients_list",
    source_detail_url: "https://smartlabel.kelloggs.com/Product/Index/038000126710#ingredients",
    source_image_match_status: "official_current_label_page",
  },
  "betty_crocker_super_moist_yellow_cake_mix__current_2020s__100__1": {
    ingredient_fragment_strategy: "general_mills_product_page",
    source_detail_url: "https://www.bettycrocker.com/products/betty-crocker-baking-and-cake-mixes/yellow#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "bisquick_original__current_2020s__101__5": {
    ingredient_fragment_strategy: "general_mills_product_page",
    source_detail_url: "https://www.bettycrocker.com/products/bisquick/bisquick-original#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "pillsbury_crescent_rolls__current_2020s__98__4": {
    ingredient_fragment_strategy: "general_mills_product_page",
    source_detail_url: "https://www.pillsbury.com/products/crescents/original#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "pillsbury_toaster_strudel_strawberry__current_2020s__135__2": {
    ingredient_fragment_strategy: "general_mills_product_page",
    source_detail_url: "https://www.pillsbury.com/products/toaster-strudel/strawberry-12ct#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "stouffers_lasagna_meat_sauce__current_2020s__949__5": {
    ingredient_fragment_strategy: "goodnes_page",
    source_fetch_url: "https://www.goodnes.com/stouffers/products/lasagna-with-meat-sauce-large-family-size",
    source_detail_url: "https://www.goodnes.com/stouffers/products/lasagna-with-meat-sauce-large-family-size#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "lean_cuisine_salisbury_steak__current_2020s__771__5": {
    ingredient_fragment_strategy: "goodnes_page",
    source_detail_url: "https://www.goodnes.com/lean-cuisine/products/salisbury-steak-macaroni-cheese-meal/#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "skittles_original__current_2020s__113__1": {
    ingredient_fragment_strategy: "mars_product_page",
    source_detail_url: "https://www.skittles.com/products/skittles-original-fruity-candy-single-pack-217-oz-skittles-chewy#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "starburst_original__current_2020s__124__1": {
    ingredient_fragment_strategy: "mars_product_page",
    source_detail_url: "https://www.starburst.com/products/candy/starburst-original-fruit-chews-candy-single-207-oz-chews#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "milky_way_bar__current_2020s__108__3": {
    ingredient_fragment_strategy: "mars_product_page",
    source_detail_url: "https://www.milkywaybar.com/products/chocolate/milky-way-milk-chocolate-single-candy-bar-184-oz-bars#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "spaghettios_original__current_2020s__491__2": {
    ingredient_fragment_strategy: "campbells_foodservice_page",
    source_detail_url: "https://www.campbellsfoodservice.com/product/spaghettios-original-4/#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "oscar_mayer_wieners__current_2020s__110__2": {
    ingredient_fragment_strategy: "official_json_ingredients",
    source_detail_url: "https://www.oscarmayer.com/products/00044700097014-classic-wieners-hot-dogs-mega-pack/#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "smuckers_strawberry_preserves__current_2020s__890__6": {
    ingredient_fragment_strategy: "smuckers_page",
    source_detail_url: "https://www.smuckers.com/fruit-spreads/preserves/strawberry-preserves#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "panera_broccoli_cheddar_soup__current_2020s__802__6": {
    ingredient_fragment_strategy: "panera_at_home_page",
    source_detail_url: "https://www.paneraathome.com/products/categories/soup-and-chili/broccoli-cheddar-soup#ingredients",
    source_image_url: "https://www.paneraathome.com/-/media/product-heros/c/cpg_2208_16ozsoup_broccolicheddar_1270x993.png?h=993&w=1280&hash=ef245f8267e26557c6e18741f549c896",
    source_image_match_status: "official_current_product_page",
  },
  "twix_bar__current_2020s__99__1": {
    ingredient_fragment_strategy: "mars_product_page",
    source_detail_url: "https://www.twix.com/products/chocolate/twix-bar-bars#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "wheaties__current_2020s__116__2": {
    ingredient_fragment_strategy: "wheaties_page",
    source_detail_url: "https://wheaties.com/nutrition#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "ball_park_franks__current_2020s__794__16": {
    ingredient_fragment_strategy: "tyson_foodservice_page",
    source_detail_url: "https://www.tysonfoodservice.com/products/ball-park/beef/hot-dogs/10054500167159#ingredients",
    source_image_match_status: "official_current_product_page",
  },
  "frenchs_yellow_mustard__current_2020s__119__3": {
    ingredient_fragment_strategy: "mccormick_shopify_page",
    source_detail_url: "https://www.mccormick.com/frenchs/products/mustard/classic-yellow-mustard#ingredients",
    source_title_override: "French's Classic Yellow Mustard official product page",
    source_image_url: "https://www.mccormick.com/cdn/shop/files/00041500007007_Ingredient_Information-2026-04-06.jpg?v=1775481032",
    source_image_match_status: "official_current_ingredient_label_image",
  },
  "pepperidge_farm_goldfish_cheddar__current_2020s__47__4": {
    ingredient_fragment_strategy: "pepperidge_farm_product_page",
    source_fetch_url: "https://www.pepperidgefarm.com/product/goldfish-cheddar/",
    source_url_override: "https://www.pepperidgefarm.com/product/goldfish-cheddar/",
    source_detail_url: "https://www.pepperidgefarm.com/product/goldfish-cheddar/#ingredients",
    source_title_override: "Goldfish Cheddar Baked Snack Crackers official product page",
    source_image_url: "https://images.salsify.com/image/upload/s--n_xrCX_v--/e_trim/c_pad,cs_srgb,h_528,w_600/nyu3zdyy1fznyvb4fm3b.jpg",
    source_image_match_status: "official_current_product_page",
  },
  "hamburger_helper_cheeseburger_macaroni__current_2020s__104__3": {
    ingredient_fragment_strategy: "hamburger_helper_page",
    source_fetch_url: "https://www.hamburgerhelper.com/product/hamburger-helper-cheeseburger-macaroni-4-pack-microwave-cup/",
    source_url_override: "https://www.hamburgerhelper.com/product/hamburger-helper-cheeseburger-macaroni-4-pack-microwave-cup/",
    source_detail_url: "https://www.hamburgerhelper.com/product/hamburger-helper-cheeseburger-macaroni-4-pack-microwave-cup/#ingredients",
    source_title_override: "Hamburger Helper Cheeseburger Macaroni official product page",
    source_image_match_status: "official_current_product_page",
  },
  "grape_nuts__current_2020s__120__2": {
    ingredient_fragment_strategy: "grape_nuts_page",
    source_fetch_url: "https://www.grapenuts.com/product/the-original/",
    source_url_override: "https://www.grapenuts.com/product/the-original/",
    source_detail_url: "https://www.grapenuts.com/product/the-original/#ingredients",
    source_title_override: "Grape-Nuts The Original official product page",
    source_image_match_status: "official_current_product_page",
  },
  "kraft_macaroni_and_cheese_original__current_2020s__6__4": {
    ingredient_fragment_strategy: "kraft_heinz_json",
    source_fetch_url: "https://www.kraftheinz.com/kraft-mac-and-cheese/products/00021000658831-original-mac-cheese-macaroni-and-cheese-dinner",
    source_url_override: "https://www.kraftheinz.com/kraft-mac-and-cheese/products/00021000658831-original-mac-cheese-macaroni-and-cheese-dinner",
    source_detail_url: "https://www.kraftheinz.com/kraft-mac-and-cheese/products/00021000658831-original-mac-cheese-macaroni-and-cheese-dinner#ingredients",
    source_title_override: "Kraft Original Mac & Cheese official product page",
    source_owner_override: "The Kraft Heinz Company",
    source_image_match_status: "official_current_product_page",
  },
  "velveeta_shells_and_cheese__current_2020s__94__2": {
    ingredient_fragment_strategy: "kraft_heinz_json",
    source_fetch_url: "https://www.kraftheinz.com/velveeta/products/00021000658930-shells-cheese-original-shell-pasta-cheese-sauce-meal",
    source_url_override: "https://www.kraftheinz.com/velveeta/products/00021000658930-shells-cheese-original-shell-pasta-cheese-sauce-meal",
    source_detail_url: "https://www.kraftheinz.com/velveeta/products/00021000658930-shells-cheese-original-shell-pasta-cheese-sauce-meal#ingredients",
    source_title_override: "Velveeta Shells & Cheese Original official product page",
    source_owner_override: "The Kraft Heinz Company",
    source_image_match_status: "official_current_product_page",
  },
  "totinos_pizza_rolls__current_2020s__91__3": {
    ingredient_fragment_strategy: "totinos_product_page",
    source_fetch_url: "https://www.totinos.com/products/pepperoni-pizza-rolls/",
    source_url_override: "https://www.totinos.com/products/pepperoni-pizza-rolls",
    source_detail_url: "https://www.totinos.com/products/pepperoni-pizza-rolls#ingredients",
    source_title_override: "Totino's Pepperoni Pizza Rolls official product page",
    source_owner_override: "General Mills",
    source_image_match_status: "official_current_product_page",
  },
  "cinnamon_toast_crunch__current_2020s__511__2": {
    ingredient_fragment_strategy: "general_mills_product_page",
    source_fetch_url: "https://www.generalmillsconvenience.com/products/cinnamon-toast-crunch-12oz",
    source_url_override: "https://www.generalmillsconvenience.com/products/cinnamon-toast-crunch-12oz",
    source_detail_url: "https://www.generalmillsconvenience.com/products/cinnamon-toast-crunch-12oz#ingredients",
    source_title_override: "General Mills Convenience Cinnamon Toast Crunch 12 oz official product page",
    source_owner_override: "General Mills Convenience",
    source_image_match_status: "official_current_product_page",
  },
  "hidden_valley_ranch_original__current_2020s__95__3": {
    ingredient_fragment_strategy: "manual_source_image_transcription",
    ingredient_statement_override: "Vegetable Oil (Soybean and/or Canola), Water, Buttermilk, Sugar, Salt, Less Than 1% of: Spices, Garlic, Onion, Vinegar, Phosphoric Acid, Xanthan Gum, Monosodium Glutamate, Natural Flavors, Disodium Phosphate, Sorbic Acid and Calcium Disodium EDTA Added to Preserve Freshness, Disodium Inosinate & Guanylate.",
    source_fetch_url: "https://www.hiddenvalley.com/products/ranch-condiments/original-ranch/original-bottled-ranch/",
    source_url_override: "https://www.hiddenvalley.com/products/ranch-condiments/original-ranch/original-bottled-ranch/",
    source_detail_url: "https://www.hiddenvalley.com/products/ranch-condiments/original-ranch/original-bottled-ranch/#ingredients",
    source_title_override: "Hidden Valley Original Ranch official product page",
    source_owner_override: "Hidden Valley / The Clorox Company",
    source_image_url: "https://images.ctfassets.net/j9gt1m2cyvgh/3gf3yMnhWHnufuZJZn5t7O/7454778816e4fe18f45e19011685d9be/Original-Ranch-dressing-product-hero-2.png",
    source_label_image_url: "https://images.ctfassets.net/j9gt1m2cyvgh/1cZSN1GDqDvhusWOdws1y7/8ca67a50918dabd9a1732bb3097b0944/HVR_ATF_Original-16oz-inverted-eagle-250th_NFP-LOI_1.jpg",
    source_image_match_status: "official_current_ingredient_label_image",
  },
  "butterfinger_bar__current_2020s__102__3": {
    ingredient_fragment_strategy: "manual_source_image_transcription",
    ingredient_statement_override: "Corn syrup, sugar, peanuts, vegetable oil (palm kernel and palm oil), peanut flour, nonfat milk, less than 2% of cocoa, milk, salt, soy lecithin, natural flavor, annatto color.",
    source_fetch_url: "https://www.butterfinger.com/products/butterfinger",
    source_url_override: "https://www.butterfinger.com/products/butterfinger",
    source_detail_url: "https://www.butterfinger.com/products/butterfinger#ingredients",
    source_title_override: "Butterfinger official product page",
    source_owner_override: "Butterfinger / Ferrero",
    source_image_url: "https://ferrero-kube-stack-prod-static.s3.eu-west-1.amazonaws.com/butterfinger-com/s3fs-public/styles/product_full/public/image/2019-10/butterfinger_productiamge_main_4.png?itok=oAAUTy2k",
    source_label_image_url: "https://ferrero-kube-stack-prod-static.s3.eu-west-1.amazonaws.com/butterfinger-com/s3fs-public/styles/gallery/public/image/2021-04/ingredients_4.png?itok=6cHb-Oze",
    source_image_match_status: "official_current_ingredient_label_image",
  },
  "wendys_daves_single__current_2020s__590__1": {
    ingredient_fragment_strategy: "wendys_order_page",
    source_fetch_url: "https://order.wendys.com/us/en/national/menu/hamburgers/daves-single",
    source_url_override: "https://order.wendys.com/us/en/national/menu/hamburgers/daves-single",
    source_detail_url: "https://order.wendys.com/us/en/national/menu/hamburgers/daves-single#ingredients",
    source_title_override: "Wendy's Dave's Single official menu page",
    source_owner_override: "Wendy's",
    source_image_url: "https://app.wendys.com/unified/assets/menu/cropped/3835_large_US_en.png",
    source_image_match_status: "official_current_product_page",
  },
  "wendys_chili__current_2020s__569__1": {
    ingredient_fragment_strategy: "wendys_order_page",
    source_fetch_url: "https://order.wendys.com/us/en/national/menu/fries-sides/chili",
    source_url_override: "https://order.wendys.com/us/en/national/menu/fries-sides/chili",
    source_detail_url: "https://order.wendys.com/us/en/national/menu/fries-sides/chili#ingredients",
    source_title_override: "Wendy's Chili official menu page",
    source_owner_override: "Wendy's",
    source_image_url: "https://app.wendys.com/unified/assets/menu/cropped/29_large_US_en.png",
    source_image_match_status: "official_current_product_page",
  },
  "taco_bell_crunchy_taco__current_2020s__620__3": {
    ingredient_fragment_strategy: "taco_bell_nutritionix_components",
    component_ingredient_names: ["Taco Shell", "Seasoned Beef", "Iceberg Lettuce", "Cheddar Cheese"],
    source_fetch_url: "https://www.nutritionix.com/taco-bell/ingredient-search/premium",
    source_url_override: "https://www.tacobell.com/food/menu-items/crunchy-taco",
    source_detail_url: "https://www.tacobell.com/food/menu-items/crunchy-taco#ingredients",
    source_title_override: "Taco Bell Crunchy Taco official menu page",
    source_owner_override: "Taco Bell",
    source_image_url: "https://www.tacobell.com/images/22100_crunchy_taco_1400x800.jpg",
    source_image_match_status: "official_current_menu_ingredient_statement_table",
  },
  "taco_bell_bean_burrito__current_2020s__568__3": {
    ingredient_fragment_strategy: "taco_bell_nutritionix_components",
    component_ingredient_names: ["Flour Tortilla", "Seasoned Refried Beans", "Red Sauce", "Onions", "Cheddar Cheese"],
    source_fetch_url: "https://www.nutritionix.com/taco-bell/ingredient-search/premium",
    source_url_override: "https://www.tacobell.com/food/burritos/bean-burrito",
    source_detail_url: "https://www.tacobell.com/food/burritos/bean-burrito#ingredients",
    source_title_override: "Taco Bell Bean Burrito official menu page",
    source_owner_override: "Taco Bell",
    source_image_url: "https://www.tacobell.com/images/22200_bean_burrito_1400x800.jpg",
    source_image_match_status: "official_current_menu_ingredient_statement_table",
  },
  "mcdonalds_big_mac__current_2020s__499__1": {
    ingredient_fragment_strategy: "mcdonalds_item_details",
    source_fetch_url: "https://www.mcdonalds.com/dnaapp/itemDetails?country=US&language=en&item=200463",
    source_detail_url: "https://www.mcdonalds.com/us/en-us/product/big-mac.html#ingredients",
    source_image_url: "https://s7d1.scene7.com/is/image/mcdonalds/DC_202302_0005-999_BigMac_1564x1564-1:nutrition-calculator-tile?resmode=sharp2",
    source_image_match_status: "official_current_product_api",
  },
  "mcdonalds_world_famous_fries__current_2020s__498__1": {
    ingredient_fragment_strategy: "mcdonalds_item_details",
    source_fetch_url: "https://www.mcdonalds.com/dnaapp/itemDetails?country=US&language=en&item=200066",
    source_detail_url: "https://www.mcdonalds.com/us/en-us/product/small-french-fries.html#ingredients",
    source_image_url: "https://s7d1.scene7.com/is/image/mcdonalds/DC_202408_6050_SmallFrenchFries_Standing_1564x1564:nutrition-calculator-tile?resmode=sharp2",
    source_image_match_status: "official_current_product_api",
  },
  "mcdonalds_chicken_mcnuggets__current_2020s__471__1": {
    ingredient_fragment_strategy: "mcdonalds_item_details",
    source_fetch_url: "https://www.mcdonalds.com/dnaapp/itemDetails?country=US&language=en&item=200692",
    source_detail_url: "https://www.mcdonalds.com/us/en-us/product/chicken-mcnuggets-4-piece.html#ingredients",
    source_image_url: "https://s7d1.scene7.com/is/image/mcdonalds/DC_202006_0483_4McNuggets_Stacked_1564x1564-1:nutrition-calculator-tile?resmode=sharp2",
    source_image_match_status: "official_current_product_api",
  },
};

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeTextIfChanged(filePath, value) {
  ensureDir(path.dirname(filePath));
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === value) return false;
  fs.writeFileSync(filePath, value);
  return true;
}

function writeCsv(filePath, headers, rows) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${[
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n")}\n`);
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sha(value, length = 16) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, length);
}

function sanitizeId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);
}

function shortText(value, limit = 240) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trim()}...` : text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const headers = rows.shift() || [];
  return rows
    .filter((cells) => cells.some(Boolean))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function readQueueRows() {
  const wanted = new Set(Object.keys(curatedRows));
  return parseCsv(fs.readFileSync(fullQueueCsvPath, "utf8"))
    .filter((row) => wanted.has(row.evidence_id));
}

function extensionFor(url, contentType = "") {
  const fromUrl = String(new URL(url).pathname).match(/\.(jpe?g|png|webp|avif)$/i);
  if (fromUrl) {
    const ext = fromUrl[1].toLowerCase();
    return ext === "jpeg" ? "jpg" : ext;
  }
  if (/png/i.test(contentType)) return "png";
  if (/webp/i.test(contentType)) return "webp";
  if (/avif/i.test(contentType)) return "avif";
  return "jpg";
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 30000));
  try {
    return await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "MenuGraph ingredient OCR collector (local research cache)",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTextToCache(url, targetPath, noFetch) {
  if (fs.existsSync(targetPath)) return { file_path: targetPath, status: "cached", text: fs.readFileSync(targetPath, "utf8") };
  if (noFetch) return { file_path: "", status: "missing_local_cache", text: "" };
  const response = await fetchWithTimeout(url, { headers: { Accept: "text/html,*/*" } });
  if (!response.ok) return { file_path: "", status: `download_failed_${response.status}`, text: "" };
  const text = await response.text();
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, text);
  return { file_path: targetPath, status: "downloaded", text };
}

async function fetchBinaryToCache(url, targetPath, noFetch) {
  if (fs.existsSync(targetPath)) return { file_path: targetPath, status: "cached" };
  const inferredPath = targetPath.replace(/\.[^.]+$/, `.${extensionFor(url)}`);
  if (fs.existsSync(inferredPath)) return { file_path: inferredPath, status: "cached" };
  if (noFetch) return { file_path: "", status: "missing_local_cache" };
  const response = await fetchWithTimeout(url, { headers: { Accept: "image/*,*/*" } });
  if (!response.ok) return { file_path: "", status: `download_failed_${response.status}` };
  const contentType = response.headers.get("content-type") || "";
  const finalPath = targetPath.replace(/\.[^.]+$/, `.${extensionFor(url, contentType)}`);
  ensureDir(path.dirname(finalPath));
  fs.writeFileSync(finalPath, Buffer.from(await response.arrayBuffer()));
  return { file_path: finalPath, status: "downloaded" };
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&reg;/g, "®")
    .replace(/&trade;/g, "™")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value) {
  return decodeEntities(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function visibleTextFromHtml(html) {
  return stripTags(String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " "));
}

function decodeJsonString(value) {
  const text = String(value || "");
  try {
    return JSON.parse(`"${text.replace(/"/g, '\\"')}"`);
  } catch {
    return decodeEntities(text.replace(/\\\//g, "/").replace(/\\"/g, '"'));
  }
}

function decodeNextFlightText(html) {
  const chunks = [];
  const regex = /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g;
  let match;
  while ((match = regex.exec(String(html || "")))) {
    chunks.push(decodeJsonString(match[1]));
  }
  return chunks.join("\n");
}

function jsonStringValues(html, key) {
  const values = [];
  const regex = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "gi");
  let match;
  while ((match = regex.exec(String(html || "")))) {
    const value = decodeJsonString(match[1])
      .replace(/\s+/g, " ")
      .trim();
    if (value && value.toLowerCase() !== key.toLowerCase() && !values.includes(value)) {
      values.push(value);
    }
  }
  return values;
}

function htmlAttr(html, pattern) {
  const match = html.match(pattern);
  return match ? decodeEntities(match[1]) : "";
}

function absoluteUrl(baseUrl, maybeRelative) {
  if (!maybeRelative) return "";
  return new URL(maybeRelative, baseUrl).toString();
}

function attrValue(tag, name) {
  return htmlAttr(tag, new RegExp(`\\b${name}=["']([^"']+)["']`, "i"));
}

function firstImageSrcByClass(html, sourceUrl, classPattern) {
  const regex = /<img\b[^>]*>/gi;
  let match;
  while ((match = regex.exec(String(html || "")))) {
    const tag = match[0];
    const className = attrValue(tag, "class");
    if (!classPattern.test(className)) continue;
    const source = attrValue(tag, "src") || attrValue(tag, "data-src");
    if (source && !source.startsWith("data:")) return absoluteUrl(sourceUrl, source);
  }
  return "";
}

function productIdFromMainHtml(html) {
  return htmlAttr(html, /id=["']productId["'][^>]*value=["']([^"']+)["']/i)
    || htmlAttr(html, /name=["']productId["'][^>]*value=["']([^"']+)["']/i);
}

function titleFromMainHtml(html) {
  return stripTags(htmlAttr(html, /<title[^>]*>([\s\S]*?)<\/title>/i)).replace(/\s+-\s+SmartLabel[™\u2122]*$/i, "");
}

function imageUrlFromMainHtml(html, sourceUrl) {
  return absoluteUrl(sourceUrl, htmlAttr(html, /property=["']og:image["'][^>]*content=["']([^"']+)["']/i))
    || firstImageSrcByClass(html, sourceUrl, /\b(product-image|carouselHeroImage)\b/i)
    || absoluteUrl(sourceUrl, htmlAttr(html, /<img\b[^>]*class=["'][^"']*\bproduct-image\b[^"']*["'][^>]*src=["']([^"']+)["']/i))
    || absoluteUrl(sourceUrl, htmlAttr(html, /"(https?:\\\/\\\/cdn\.media\.amplience\.net\\\/i\\\/[^"]+)"/i).replace(/\\\//g, "/"))
    || absoluteUrl(sourceUrl, htmlAttr(html, /(https?:\/\/cdn\.media\.amplience\.net\/i\/[^"'<>\s]+)/i))
    || absoluteUrl(sourceUrl, htmlAttr(html, /"(https?:\\\/\\\/images\.salsify\.com\\\/image\\\/upload\\\/[^"]+)"/i).replace(/\\\//g, "/"))
    || absoluteUrl(sourceUrl, htmlAttr(html, /(https?:\/\/images\.salsify\.com\/image\/upload\/[^"'<>\s]+)/i));
}

function smartLabelFragmentUrl(sourceUrl, productId) {
  const url = new URL(sourceUrl);
  const base = url.toString().replace(/\/index\.html(?:[#?].*)?$/i, "/").replace(/[#?].*$/, "/");
  return `${base}${productId}-ingredients.html`;
}

function ingredientItemsFromFragment(fragmentHtml) {
  const items = [];
  const seen = new Set();
  const regex = /<(?:div|span)\b[^>]*class=["'][^"']*\blist-title\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span)>/gi;
  let match;
  while ((match = regex.exec(fragmentHtml))) {
    const item = stripTags(match[1])
      .replace(/\s+:/g, ":")
      .replace(/\s+,/g, ",")
      .trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

function isNonIngredientSmartLabelItem(item) {
  const text = String(item || "").trim();
  return /^[A-Za-z ]+ Contains$/i.test(text)
    || /^(Bioengineered Food Disclosure|Kosher Status|Claims|Certifications|Health & Safety|Product Instructions|Recipes|Feeding Happiness|USDA MyPlate|Dietary Guidelines for Americans|Sustainability)$/i.test(text)
    || /^(WK Kellogg Co|About Kellogg's|About Kellanova)$/i.test(text);
}

function ingredientItemsFromWkKelloggSmartLabel(html) {
  return ingredientItemsFromFragment(html)
    .map((item) => item
      .replace(/^ingredients?:\s*/i, "")
      .replace(/\s+:/g, ":")
      .replace(/\s+/g, " ")
      .trim())
    .filter((item) => item && !isNonIngredientSmartLabelItem(item))
    .filter(Boolean);
}

function ingredientItemsFromKelloggsIngredientsList(html) {
  const ingredientListMatch = String(html || "").match(/<ul\b[^>]*id=["']ingredients-list["'][^>]*>([\s\S]*?)<\/ul>/i);
  const sourceHtml = ingredientListMatch ? ingredientListMatch[1] : html;
  return ingredientItemsFromFragment(sourceHtml)
    .map((item) => item
      .replace(/^ingredients?:\s*/i, "")
      .replace(/\s+:/g, ":")
      .replace(/\s+/g, " ")
      .trim())
    .filter((item) => item && !isNonIngredientSmartLabelItem(item))
    .filter(Boolean);
}

function ingredientItemsFromHormelPage(html) {
  const tabMatch = String(html || "").match(/<main\b[^>]*id=["']ingredientsTab["'][^>]*>([\s\S]*?)<\/main>/i);
  const tabHtml = tabMatch ? tabMatch[1] : "";
  const items = [];
  const seen = new Set();
  const regex = /<li\b[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = regex.exec(tabHtml))) {
    const rawItem = stripTags(match[1]);
    const beginsSpanishIngredients = /\bIngredientes?:/i.test(rawItem);
    const item = rawItem
      .replace(/\s*\.?\s*Ingredientes?:.*$/i, "")
      .replace(/^Ingredientes?:\s*/i, "")
      .replace(/\s+:/g, ":")
      .replace(/\s+,/g, ",")
      .trim();
    if (item && !/^(to prevent separation|para evitar la separaci[oó]n)$/i.test(item)) {
      const key = item.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        items.push(item);
      }
    }
    if (beginsSpanishIngredients) break;
  }
  return items;
}

function ingredientItemsFromMcdonaldsItemDetails(jsonText) {
  let payload;
  try {
    payload = JSON.parse(String(jsonText || ""));
  } catch {
    return [];
  }
  const components = payload?.item?.components?.component;
  if (!Array.isArray(components)) return [];
  const items = [];
  const seen = new Set();
  for (const component of components) {
    const statement = stripTags(component.ingredient_statement || "")
      .replace(/^ingredients?:\s*/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[.;\s]+$/, "");
    if (!statement) continue;
    const componentName = stripTags(component.product_name || component.name || "");
    const item = componentName ? `${componentName}: ${statement}` : statement;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

function extractBalancedJsonObject(text, objectStart) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  const source = String(text || "");
  for (let index = objectStart; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(objectStart, index + 1);
    }
  }
  return "";
}

function wendysProductObjectsFromOrderPage(html) {
  const flightText = decodeNextFlightText(html);
  const products = [];
  const regex = /\[\["\d+",\{/g;
  let match;
  while ((match = regex.exec(flightText))) {
    const objectStart = flightText.indexOf("{", match.index);
    const objectText = extractBalancedJsonObject(flightText, objectStart);
    if (!objectText) continue;
    try {
      const product = JSON.parse(objectText);
      if (product?.name && product?.imageId && product?.modifiers) products.push(product);
    } catch {
      // Ignore non-product flight chunks that look similar but are not standalone JSON objects.
    }
  }
  return products;
}

function cleanWendysIngredientDescription(value) {
  return stripTags(value)
    .replace(/\s+CONTAINS?:[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;\s]+$/, "");
}

function ingredientItemsFromWendysOrderPage(html) {
  const product = wendysProductObjectsFromOrderPage(html)[0];
  if (!product) return [];
  const items = [];
  const seen = new Set();
  const addItem = (name, description) => {
    const itemName = stripTags(name).replace(/\s+/g, " ").trim();
    const statement = cleanWendysIngredientDescription(description);
    if (!itemName || !statement || /^please see individual packet/i.test(statement)) return;
    const item = `${itemName}: ${statement}`;
    const key = item.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  if (product.modifiers?.base) addItem(product.modifiers.base.name, product.modifiers.base.description);

  for (const modifier of product.modifiers?.default || []) {
    if (Array.isArray(modifier.options)) {
      const selected = modifier.options.find((option) => String(option.id) === String(modifier.defaultOptionId))
        || modifier.options[0];
      if (selected) addItem(selected.name, selected.description);
    } else {
      addItem(modifier.name, modifier.description);
    }
  }

  return items;
}

function ingredientStatementsFromTacoBellNutritionix(html) {
  const statements = new Map();
  const regex = /<div class="modifierName">([\s\S]*?)<\/div>[\s\S]*?<span class="ingredientStatement">([\s\S]*?)<\/span>/g;
  let match;
  while ((match = regex.exec(String(html || "")))) {
    const name = stripTags(match[1]).replace(/\s+/g, " ").trim();
    const statement = stripTags(match[2])
      .replace(/\s+/g, " ")
      .replace(/\s*\[certified (?:vegan|vegetarian)\]/gi, "")
      .trim()
      .replace(/[.;\s]+$/, "");
    if (name && statement) statements.set(name.toLowerCase(), { name, statement });
  }
  return statements;
}

function ingredientItemsFromTacoBellNutritionixComponents(html, componentNames = []) {
  const statements = ingredientStatementsFromTacoBellNutritionix(html);
  const items = [];
  const seen = new Set();
  for (const componentName of componentNames) {
    const record = statements.get(String(componentName || "").toLowerCase());
    if (!record) continue;
    const item = `${record.name}: ${record.statement}`;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

function ingredientTextFromItems(items) {
  return `Ingredients: ${items.join(", ")}.`;
}

function ingredientItemsFromStatement(statement) {
  const text = String(statement || "")
    .replace(/^ingredients?:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;\s]+$/, "");
  const items = [];
  let value = "";
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if ("([{".includes(char)) depth += 1;
    else if (")]}" .includes(char) && depth > 0) depth -= 1;
    if ((char === "," || char === ";") && depth === 0) {
      const item = value.trim();
      if (item) items.push(item);
      value = "";
    } else {
      value += char;
    }
  }
  const tail = value.trim();
  if (tail) items.push(tail);
  return items.map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function statementBetween(text, startRegex, endRegexes) {
  const source = String(text || "");
  const startMatch = source.match(startRegex);
  if (!startMatch) return "";
  let start = startMatch.index + startMatch[0].length;
  if (startMatch[1] && startMatch[0].endsWith(startMatch[1])) {
    start = startMatch.index + startMatch[0].length - startMatch[1].length;
  }
  let end = source.length;
  const rest = source.slice(start);
  for (const endRegex of endRegexes) {
    const endMatch = rest.match(endRegex);
    if (endMatch && endMatch.index >= 0) {
      end = Math.min(end, start + endMatch.index);
    }
  }
  return source.slice(start, end)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^ingredients?:\s*/i, "")
    .replace(/[.;\s]+$/, "");
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ingredientStatementFromCocaColaProductSection(html, productTitle) {
  const source = String(html || "");
  const titlePattern = new RegExp(
    `<h3\\b[^>]*class=["'][^"']*\\bcmp-title__text\\b[^"']*["'][^>]*>\\s*${escapeRegExp(productTitle)}\\s*<\\/h3>`,
    "i",
  );
  const titleMatch = source.match(titlePattern);
  if (!titleMatch) return "";
  const start = titleMatch.index + titleMatch[0].length;
  const nextProductMatch = source.slice(start).match(/<div\b[^>]*class=["'][^"']*\bproduct-information\b[^"']*["'][^>]*>/i);
  const end = nextProductMatch ? start + nextProductMatch.index : source.length;
  const section = source.slice(start, end);
  const ingredientMatch = section.match(/<h3>\s*Ingredients\s*<\/h3>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i);
  return stripTags(ingredientMatch ? ingredientMatch[1] : "")
    .replace(/^ingredients?:\s*/i, "")
    .replace(/[.;\s]+$/, "");
}

function ingredientStatementFromMccormickShopifyPage(html) {
  const source = String(html || "");
  const fieldRegex = /<span\b[^>]*class=["'][^"']*\bmetafield-multi_line_text_field\b[^"']*["'][^>]*>\s*(INGREDIENTS:[\s\S]*?)<\/span>/gi;
  let match;
  while ((match = fieldRegex.exec(source))) {
    const fieldText = stripTags(match[1]);
    if (!/^ingredients?:/i.test(fieldText)) continue;
    return fieldText
      .replace(/^ingredients?:\s*/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[.;\s]+$/, "");
  }
  return "";
}

function firstClassText(html, className) {
  const match = String(html || "").match(new RegExp(`<[^>]+class=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i"));
  return stripTags(match ? match[1] : "");
}

function ingredientStatementFromHamburgerHelperPage(html) {
  const blockMatch = String(html || "").match(/<div\b[^>]*class=["'][^"']*\bproduct-block\b[^"']*\bingredients\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  const block = blockMatch ? blockMatch[1] : "";
  const expanded = stripTags(htmlAttr(block, /<div\b[^>]*class=["'][^"']*\bexpanded\b[^"']*["'][^>]*>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i));
  return expanded
    .replace(/^ingredients?:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;\s]+$/, "");
}

function ingredientStatementFromGrapeNutsPage(html) {
  const ingredients = firstClassText(html, "ingredients");
  const vitamins = firstClassText(html, "vitamins-and-minerals");
  return [ingredients, vitamins]
    .filter(Boolean)
    .map((item) => item.replace(/[.;\s]+$/, ""))
    .join(", ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;\s]+$/, "");
}

function ingredientStatementFromGeneralMillsMarketingPage(html) {
  return statementBetween(visibleTextFromHtml(html), /\bIngredients\s+(Whole Grain\b|Enriched\b|Corn\b|Rice\b|Sugar\b|Wheat\b)/i, [
    /\s+Does not contain declaration obligatory allergens/i,
    /\s+Contains declaration obligatory allergens/i,
    /\s+Allergens\s*\/\s*Disclaimers\b/i,
    /\s+Nutrition Facts\b/i,
    /\s+Benefits\s*\/\s*Consumer Statements\b/i,
  ])
    .replace(/\.\s+Contains 2% or less of:/i, ", Contains 2% or less of:")
    .replace(/\.\s+Vitamin E\b/i, ", Vitamin E")
    .replace(/\.\s+Vitamins and Minerals:/i, ", Vitamins and Minerals:")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;\s]+$/, "");
}

function statementsFromIngredientHeadings(text, endRegexes) {
  const source = String(text || "");
  const statements = [];
  const startRegex = /\bIngredients\s+/gi;
  let startMatch;
  while ((startMatch = startRegex.exec(source))) {
    const start = startMatch.index + startMatch[0].length;
    let end = source.length;
    const rest = source.slice(start);
    for (const endRegex of endRegexes) {
      const endMatch = rest.match(endRegex);
      if (endMatch && endMatch.index >= 0) {
        end = Math.min(end, start + endMatch.index);
      }
    }
    const statement = source.slice(start, end)
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^ingredients?:\s*/i, "")
      .replace(/[.;\s]+$/, "");
    if (statement) statements.push(statement);
  }
  return statements;
}

function ingredientStatementForStrategy(strategy, html, fragmentHtml) {
  const visibleText = visibleTextFromHtml(html);
  if (strategy === "smartlabel_fragment" || strategy === "hormel_page") return "";
  if (strategy === "kraft_heinz_json" || strategy === "official_json_ingredients") {
    const jsonStatement = jsonStringValues(html, "ingredients")[0] || "";
    if (jsonStatement) return jsonStatement;
  }
  if (strategy === "general_mills_product_page") {
    return jsonStringValues(html, "ingredientDeclaration")[0]
      || stripTags(htmlAttr(html, /<p\b[^>]*class=["'][^"']*\bproductIngredientsContent\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i));
  }
  if (strategy === "tootsie_page") {
    return statementBetween(visibleText, /\bIngredients\s+/i, [/\s+Contains Milk and Soy/i, /\s+Contains a bioengineered/i, /\s+Weight and Product/i]);
  }
  if (strategy === "goodnes_page") {
    return statementBetween(visibleText, /\bIngredients\s+/i, [/\s+Allergens\b/i, /\s+\*Please refer to the label/i, /\s+Cooking Instructions/i]);
  }
  if (strategy === "mars_product_page") {
    return statementBetween(visibleText, /\bINGREDIENTS:\s*/i, [
      /\s+CONTAINS\b/i,
      /\s+Ingredients listed above reflect/i,
      /\s+Please refer to the product label/i,
      /\s+MORE PRODUCTS LIKE THIS/i,
    ]);
  }
  if (strategy === "campbells_foodservice_page") {
    return statementBetween(visibleText, /\bIngredients\s+(WATER\b)/i, [/\s+Allergens\b/i, /\s+Dietary Needs\b/i, /\s+Nutrition Facts\b/i]);
  }
  if (strategy === "smuckers_page") {
    return statementBetween(visibleText, /\bIngredients\s+/i, [/\s+Product Information\b/i, /\s+Product Reviews\b/i]);
  }
  if (strategy === "panera_at_home_page") {
    return statementBetween(visibleText, /\bDetailed Ingredients\s+/i, [/\s+Allergens\s*:/i, /\s+Serving Size\b/i]);
  }
  if (strategy === "wheaties_page") {
    return statementBetween(visibleText, /\bIngredients\s+/i, [/\s+4\s+G\s+Fiber\s+Per\s+Serving/i, /\s+Nutrition Facts\b/i]);
  }
  if (strategy === "tyson_foodservice_page") {
    return htmlAttr(html, /<meta\b[^>]*name=["']ingredients["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  }
  if (strategy === "mccormick_shopify_page") {
    return ingredientStatementFromMccormickShopifyPage(html);
  }
  if (strategy === "pepperidge_farm_product_page") {
    return jsonStringValues(html, "product_ingredients")[0]
      || jsonStringValues(html, "ingredients").find((value) => /CHEDDAR CHEESE|WHEAT FLOUR/i.test(value))
      || "";
  }
  if (strategy === "hamburger_helper_page") {
    return ingredientStatementFromHamburgerHelperPage(html);
  }
  if (strategy === "grape_nuts_page") {
    return ingredientStatementFromGrapeNutsPage(html);
  }
  if (strategy === "general_mills_marketing_page") {
    return ingredientStatementFromGeneralMillsMarketingPage(html);
  }
  if (strategy === "totinos_product_page") {
    return jsonStringValues(html, "ingredientDeclaration")[0]
      || statementBetween(visibleText, /\bIngredients\s+(Enriched Flour\b)/i, [/\s+Contains wheat/i, /\s+Nutrition Facts/i]);
  }
  if (strategy === "coca_cola_page") {
    return statementBetween(visibleText, /\bProtein\s+0g\s+-\s+Ingredients\s+/i, [/\s+\*\s+Not a significant source/i, /\s+Shop Now/i]);
  }
  if (strategy === "coca_cola_sprite_products_page") {
    return ingredientStatementFromCocaColaProductSection(html, "Sprite");
  }
  if (strategy === "general_mills_page") {
    return statementBetween(visibleText, /\bCONTAINS:\s+One\s+.{0,500}?\s+Ingredients\s+/i, [/\s+Nutrition Facts/i, /\s+Ingredients, nutrition facts/i]);
  }
  if (strategy === "kellanova_page") {
    return statementBetween(visibleText, /\bIngredients\s+Ingredients:\s*/i, [/\s+For full nutrition/i, /\s+Nutrition Facts/i])
      || statementBetween(visibleText, /\bINGREDIENTS:\s*/i, [/\s+For full nutrition/i, /\s+Nutrition Facts/i, /\s+Amount Per Serving/i]);
  }
  if (strategy === "jif_page") {
    return statementBetween(visibleText, /\bIngredients\s+/i, [/\s+Product Information/i, /\s+Allergens/i]);
  }
  if (strategy === "campbells_page") {
    return statementsFromIngredientHeadings(visibleText, [/\s+You May Also Like/i, /\s+Tomato Soup Recipes/i, /\s+Chicken Noodle/i])
      .find((statement) => /^(Tomato Puree|Chicken Stock)\b/i.test(statement)) || "";
  }
  if (strategy === "nutella_page") {
    return statementBetween(visibleText, /\bWHAT'S INSIDE\s+Ingredients\s+/i, [/\s+Nutritional information/i, /\s+Serving Size/i]);
  }
  return fragmentHtml ? "" : "";
}

function ingredientItemsForStrategy(strategy, mainHtml, fragmentHtml, review = {}) {
  if (strategy === "hormel_page") return ingredientItemsFromHormelPage(mainHtml);
  if (strategy === "wkkellogg_smartlabel") return ingredientItemsFromWkKelloggSmartLabel(mainHtml);
  if (strategy === "kelloggs_ingredients_list") return ingredientItemsFromKelloggsIngredientsList(mainHtml);
  if (strategy === "mcdonalds_item_details") return ingredientItemsFromMcdonaldsItemDetails(mainHtml);
  if (strategy === "wendys_order_page") return ingredientItemsFromWendysOrderPage(mainHtml);
  if (strategy === "taco_bell_nutritionix_components") {
    return ingredientItemsFromTacoBellNutritionixComponents(mainHtml, review.component_ingredient_names || []);
  }
  if (strategy === "smartlabel_fragment") return ingredientItemsFromFragment(fragmentHtml);
  return ingredientItemsFromStatement(ingredientStatementForStrategy(strategy, mainHtml, fragmentHtml));
}

function visualIdFor(row) {
  return `${sanitizeId(row.product_id)}__${sanitizeId(row.vintage_label)}__${sha(`${row.evidence_id}|${row.source_url}`, 10)}`;
}

function privateSafePreviewEndpoint(visualId) {
  return `/api/private/ingredient-crops/${visualId}`;
}

function publicClaimBoundary() {
  return "Official current-label text is candidate current evidence only; do not infer a historical ingredient-change claim without dated package-label review.";
}

function proofVisualBasisFor(review, visual, hasIngredientText) {
  if (visual.ingredient_label_image_url || review.source_image_match_status === "official_current_ingredient_label_image") {
    return "official_ingredient_label_image";
  }
  if (review.source_image_match_status === "official_current_menu_ingredient_statement_table"
    || review.source_image_match_status === "official_current_product_api") {
    return "official_menu_or_api_text";
  }
  if (hasIngredientText) return "official_source_text_proof_panel";
  return "source_visual_lineage_only";
}

function ingredientTextSourceForStrategy(strategy) {
  if (strategy === "hormel_page") return "official_current_label_page";
  if (strategy === "smartlabel_fragment") return "official_current_label_fragment";
  if (strategy === "wkkellogg_smartlabel") return "official_current_label_page";
  if (strategy === "kelloggs_ingredients_list") return "official_current_label_page";
  if (strategy === "mcdonalds_item_details") return "official_current_product_api_json";
  if (strategy === "wendys_order_page") return "official_current_menu_page_json";
  if (strategy === "taco_bell_nutritionix_components") return "official_current_menu_ingredient_statement_table";
  if (strategy === "manual_source_image_transcription") return "official_current_ingredient_label_image_manual_transcription";
  if (strategy === "kraft_heinz_json" || strategy === "official_json_ingredients" || strategy === "totinos_product_page") return "official_current_product_page_json";
  return "official_current_product_page_text";
}

function fileDataUri(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return "";
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  if (ext === ".avif") return `data:image/avif;base64,${fs.readFileSync(filePath).toString("base64")}`;
  return `data:${contentType};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function proofHtml(row, sourceTitle, sourceDomain, items, imagePath, ingredientImagePath = "") {
  const productImage = fileDataUri(imagePath);
  const ingredientPanelImage = fileDataUri(ingredientImagePath);
  const itemRows = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  :root { color-scheme: light; }
  body {
    margin: 0;
    background: #f5f0e6;
    color: #1d1f1b;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .proof-panel {
    width: 1280px;
    min-height: 820px;
    padding: 42px;
    background: #fffaf0;
    border: 1px solid #d4c7aa;
  }
  .proof-layout {
    display: grid;
    grid-template-columns: 410px minmax(0, 1fr);
    gap: 36px;
    align-items: start;
  }
  .proof-visual {
    display: grid;
    gap: 12px;
    align-content: start;
  }
  .visual-frame {
    display: grid;
    width: 410px;
    height: 370px;
    place-items: center;
    background: #f7f7f7;
    border: 1px solid #d7d7d7;
    box-sizing: border-box;
    overflow: hidden;
    padding: 18px;
  }
  .visual-frame--label {
    height: 410px;
    background: #ffffff;
  }
  .product-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
  .visual-label {
    margin: 0;
    color: #6c665b;
    font-size: 18px;
    line-height: 1.25;
    font-weight: 720;
  }
  .proof-copy {
    min-width: 0;
  }
  .proof-kicker {
    margin: 0 0 10px;
    color: #7d2c1f;
    font-size: 24px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    font-size: 48px;
    line-height: 1.02;
    letter-spacing: 0;
  }
  .source {
    margin: 14px 0 0;
    color: #5d564a;
    font-size: 22px;
    line-height: 1.35;
  }
  .ingredients {
    columns: 2;
    column-gap: 34px;
    margin: 26px 0 0;
    padding: 0;
    list-style: none;
    border-top: 4px solid #1d1f1b;
    padding-top: 24px;
  }
  .ingredients li {
    break-inside: avoid;
    margin: 0 0 9px;
    border-bottom: 1px solid #e4dccd;
    padding: 0 0 9px;
    font-size: 25px;
    line-height: 1.15;
    font-weight: 720;
  }
  .footer {
    margin-top: 28px;
    color: #6c665b;
    font-size: 20px;
    line-height: 1.35;
  }
</style>
</head>
<body>
  <main class="proof-panel">
    <section class="proof-layout">
      <div class="proof-visual">
        <div class="visual-frame">
          ${productImage ? `<img class="product-image" alt="" src="${productImage}">` : ""}
        </div>
        <p class="visual-label">Official source visual</p>
        ${ingredientPanelImage ? `
        <div class="visual-frame visual-frame--label">
          <img class="product-image" alt="" src="${ingredientPanelImage}">
        </div>
        <p class="visual-label">Official ingredient panel visual</p>` : ""}
      </div>
      <div class="proof-copy">
        <p class="proof-kicker">Official Current Ingredient Page</p>
        <h1>${escapeHtml(row.product_name)}</h1>
        <p class="source">${escapeHtml(sourceTitle || row.source_title)} · ${escapeHtml(sourceDomain || row.source_domain)}</p>
        <ol class="ingredients">${itemRows}</ol>
        <p class="footer">Source-derived local proof panel. Current label evidence remains claim-gated until manually reviewed against the package label.</p>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

async function renderProofImage(htmlPath, outputPath, noRender) {
  if (fs.existsSync(outputPath)) {
    const outputStat = fs.statSync(outputPath);
    const htmlStat = fs.existsSync(htmlPath) ? fs.statSync(htmlPath) : null;
    if (!htmlStat || outputStat.mtimeMs >= htmlStat.mtimeMs) {
      return { status: "cached", output_pixels: null };
    }
  }
  if (noRender) return { status: "render_skipped", output_pixels: null };
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1400, height: 1100 },
      deviceScaleFactor: 2,
    });
    await page.goto(`file://${htmlPath}`);
    const panel = page.locator(".proof-panel");
    await panel.waitFor();
    ensureDir(path.dirname(outputPath));
    await panel.screenshot({ path: outputPath });
    const dimensions = await page.evaluate(() => {
      const image = document.querySelector(".proof-panel");
      const rect = image.getBoundingClientRect();
      return { width: Math.round(rect.width * window.devicePixelRatio), height: Math.round(rect.height * window.devicePixelRatio) };
    });
    return { status: "upscaled_crop_ready", output_pixels: dimensions };
  } finally {
    await browser.close();
  }
}

function rowsByProduct(publicRows) {
  const products = new Map();
  for (const row of publicRows) {
    if (!products.has(row.product_id)) {
      products.set(row.product_id, {
        product_id: row.product_id,
        product_name: row.product_name,
        brand: row.brand,
        category: row.category,
        source_family: sourceFamilyId,
        evidence_count: 0,
        local_preview_available_count: 0,
        ingredient_signal_count: 0,
        vintages: [],
        rows: [],
      });
    }
    const product = products.get(row.product_id);
    product.evidence_count += 1;
    if (row.local_preview_available) product.local_preview_available_count += 1;
    if (row.ingredient_signal_status === "ingredient_signal_found") product.ingredient_signal_count += 1;
    product.vintages.push(row.vintage_label);
    product.rows.push(row);
  }
  return [...products.values()].map((product) => ({
    ...product,
    vintages: [...new Set(product.vintages)].sort(),
    rows: product.rows.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id)),
  })).sort((a, b) => b.evidence_count - a.evidence_count || a.product_name.localeCompare(b.product_name));
}

function upsertFamily(families, family) {
  const existingIndex = families.findIndex((row) => row.id === family.id);
  if (existingIndex >= 0) families.splice(existingIndex, 1, family);
  else families.push(family);
  return families;
}

function updateNavigatorTimeline(visualIndex) {
  const data = JSON.parse(fs.readFileSync(navigatorPath, "utf8"));
  data.source_family_summary = data.source_family_summary || {
    schema_version: 1,
    generated_at_utc: visualIndex.generated_at_utc,
    private_scratch_policy: "Use the configured private scratch root for captures, crops, OCR text, model packets, and review manifests. Public files remain link/status only.",
    families: [],
  };
  data.source_family_summary.families = upsertFamily(data.source_family_summary.families || [], {
    id: sourceFamilyId,
    label: sourceFamilyLabel,
    strategy: "official_current_ingredient_fragments",
    public_image_policy: visualIndex.public_image_policy,
    claim_policy: visualIndex.claim_policy,
    evidence_row_count: visualIndex.totals.rows,
    product_count: visualIndex.totals.products,
    top_domains: visualIndex.source_family.source_domain,
    gap_categories: "panel_capture_needed",
    products: visualIndex.products.map((product) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      brand: product.brand,
      category: product.category,
      evidence_count: product.evidence_count,
      vintages: product.vintages,
      source_urls: [...new Set(product.rows.map((row) => row.source_url).filter(Boolean))],
      ingredient_panel_visible_count: product.ingredient_signal_count,
      local_image_ready_count: product.local_preview_available_count,
      readable_panel_photo_needed_count: product.evidence_count - product.ingredient_signal_count,
      next_action: "review_current_official_label_against_package_panel",
      vintage_count: product.vintages.length,
    })),
  });

  const existingTimeline = data.source_family_timeline || {};
  data.source_family_timeline = {
    schema_version: visualIndex.schema_version,
    generated_at_utc: visualIndex.generated_at_utc,
    default_family: sourceFamilyId,
    public_image_policy: visualIndex.public_image_policy,
    claim_policy: visualIndex.claim_policy,
    families: upsertFamily(existingTimeline.families || [], {
      id: sourceFamilyId,
      label: sourceFamilyLabel,
      row_count: visualIndex.totals.rows,
      product_count: visualIndex.totals.products,
      local_preview_available_count: visualIndex.totals.local_preview_available,
      ingredient_signal_count: visualIndex.totals.ingredient_signal_candidates,
      products: visualIndex.products,
    }),
  };
  writeJson(navigatorPath, data);
}

function publicRowFor(row, review, visual, ingredientText, sourceTitle, ingredientItems = []) {
  const localPreviewAvailable = Boolean(visual.upscaled_preview_path || visual.preview_path);
  const hasIngredientText = Boolean(ingredientText);
  const publicSourceUrl = review.source_url_override || row.source_url;
  return {
    product_id: row.product_id,
    product_name: row.product_name,
    brand: row.brand,
    category: row.category,
    vintage_label: row.vintage_label,
    vintage_start: row.vintage_start,
    vintage_end: row.vintage_end,
    evidence_id: row.evidence_id,
    ocr_priority: row.ocr_priority,
    ocr_gap_category: row.ocr_gap_category,
    source_domain: new URL(publicSourceUrl).hostname,
    source_url: publicSourceUrl,
    source_title: sourceTitle || row.source_title,
    source_owner: review.source_owner_override || row.source_owner,
    rights_note: row.rights_note,
    visual_id: visual.visual_id,
    preview_endpoint: privateSafePreviewEndpoint(visual.visual_id),
    visual_status: localPreviewAvailable ? "local_ingredient_crop_ready" : "source_capture_needed",
    local_preview_available: localPreviewAvailable,
    local_upscaled_preview_available: Boolean(visual.upscaled_preview_path),
    preview_render_variant: visual.upscaled_preview_path ? "upscaled_crop" : localPreviewAvailable ? "base_crop" : "none",
    ocr_status: "source_html_text_extracted",
    crop_status: visual.crop_status,
    source_image_title: sourceTitle || row.source_title,
    source_image_year: row.vintage_start ? String(row.vintage_start).slice(0, 4) : "current",
    source_detail_url: review.source_detail_url || row.source_url,
    source_image_match_status: review.source_image_match_status || "official_current_label_page",
    proof_visual_basis: proofVisualBasisFor(review, visual, hasIngredientText),
    crop_focus: "ingredient_text",
    crop_rotation_degrees: 0,
    ingredient_text: ingredientText,
    ingredient_items: ingredientItems,
    ingredient_text_source: visual.ingredient_text_source || "official_current_label_fragment",
    ingredient_text_status: hasIngredientText ? "official_current_label_candidate_needs_review" : "readable_ingredient_text_needed",
    candidate_excerpt: shortText(ingredientText, 240),
    candidate_status: hasIngredientText ? "ingredient_text_candidate_needs_review" : "readable_ingredient_text_needed",
    ingredient_signal_status: hasIngredientText ? "ingredient_signal_found" : "readable_panel_photo_needed",
    source_capture_status: visual.source_capture_status,
    source_candidate_image_count: Number(Boolean(visual.product_image_url)) + Number(Boolean(visual.ingredient_label_image_url)),
    claim_boundary: publicClaimBoundary(),
  };
}

async function build() {
  const noFetch = hasFlag("no-fetch");
  const noRender = hasFlag("no-render");
  const runId = sanitizeId(argValue("run-id", "official_current")) || "official_current";
  const runDir = path.resolve(argValue("result-dir", path.join(cacheRoot, runId)));
  const htmlDir = path.join(runDir, "source-html");
  const imageDir = path.join(runDir, "images");
  const proofHtmlDir = path.join(runDir, "proof-html");
  const cropDir = path.join(runDir, "crops");
  const upscaledCropDir = path.join(cropDir, "upscaled");
  [runDir, htmlDir, imageDir, proofHtmlDir, cropDir, upscaledCropDir].forEach(ensureDir);

  const rows = readQueueRows();
  const missingRows = Object.keys(curatedRows).filter((evidenceId) => !rows.some((row) => row.evidence_id === evidenceId));
  if (missingRows.length) {
    throw new Error(`Curated official-current rows missing from queue: ${missingRows.join(", ")}`);
  }

  const privateVisuals = [];
  const publicRows = [];
  const sourceCaptures = new Map();

  for (const row of rows) {
    const review = curatedRows[row.evidence_id];
    const visualId = visualIdFor(row);
    const publicSourceUrl = review.source_url_override || row.source_url;
    const sourceFetchUrl = review.source_fetch_url || row.source_url;
    const mainHtmlPath = path.join(htmlDir, `${visualId}-${sha(sourceFetchUrl, 8)}-main.html`);
    const mainCapture = await fetchTextToCache(sourceFetchUrl, mainHtmlPath, noFetch);
    const strategy = review.ingredient_fragment_strategy || "smartlabel_fragment";
    const productId = strategy === "smartlabel_fragment" ? productIdFromMainHtml(mainCapture.text) : "";
    const fragmentUrl = strategy === "smartlabel_fragment"
      ? productId ? smartLabelFragmentUrl(sourceFetchUrl, productId) : ""
      : sourceFetchUrl;
    const fragmentPath = path.join(htmlDir, `${visualId}-ingredients.html`);
    const fragmentCapture = strategy !== "smartlabel_fragment"
      ? { file_path: mainCapture.file_path, status: mainCapture.status, text: mainCapture.text }
      : fragmentUrl
      ? await fetchTextToCache(fragmentUrl, fragmentPath, noFetch)
      : { file_path: "", status: "missing_product_id", text: "" };
    const sourceTitle = review.source_title_override || titleFromMainHtml(mainCapture.text) || row.source_title;
    const productImageUrl = review.source_image_url || imageUrlFromMainHtml(mainCapture.text, sourceFetchUrl);
    const productImage = productImageUrl
      ? await fetchBinaryToCache(productImageUrl, path.join(imageDir, `${sha(productImageUrl, 16)}.jpg`), noFetch)
      : { file_path: "", status: "no_product_image" };
    const ingredientLabelImageUrl = review.source_label_image_url || "";
    const ingredientLabelImage = ingredientLabelImageUrl
      ? await fetchBinaryToCache(ingredientLabelImageUrl, path.join(imageDir, `${sha(ingredientLabelImageUrl, 16)}.jpg`), noFetch)
      : { file_path: "", status: "no_ingredient_label_image" };
    const items = review.ingredient_statement_override
      ? ingredientItemsFromStatement(review.ingredient_statement_override)
      : ingredientItemsForStrategy(strategy, mainCapture.text, fragmentCapture.text, review);
    const ingredientText = items.length ? ingredientTextFromItems(items) : "";
    const proofPath = path.join(proofHtmlDir, `${visualId}.html`);
    writeTextIfChanged(proofPath, proofHtml(
      row,
      sourceTitle,
      new URL(publicSourceUrl).hostname,
      items,
      productImage.file_path,
      ingredientLabelImage.file_path,
    ));

    const previewPath = path.join(cropDir, `${visualId}.png`);
    const upscaledPath = path.join(upscaledCropDir, `${visualId}.png`);
    const render = ingredientText
      ? await renderProofImage(proofPath, upscaledPath, noRender)
      : { status: "no_ingredient_text", output_pixels: null };

    const visual = {
      visual_id: visualId,
      product_id: row.product_id,
      evidence_id: row.evidence_id,
      source_url: publicSourceUrl,
      source_fetch_url: sourceFetchUrl,
      source_html_path: mainCapture.file_path,
      ingredient_fragment_url: fragmentUrl,
      ingredient_fragment_path: fragmentCapture.file_path,
      product_image_url: productImageUrl,
      product_image_path: productImage.file_path,
      ingredient_label_image_url: ingredientLabelImageUrl,
      ingredient_label_image_path: ingredientLabelImage.file_path,
      source_image_title: sourceTitle,
      source_image_year: row.vintage_start ? String(row.vintage_start).slice(0, 4) : "current",
      source_detail_url: review.source_detail_url || row.source_url,
      source_image_match_status: review.source_image_match_status || "official_current_label_page",
      preview_path: fs.existsSync(previewPath) ? previewPath : "",
      upscaled_preview_path: render.status === "upscaled_crop_ready" || render.status === "cached" ? upscaledPath : "",
      upscaled_crop_status: render.status,
      crop_output_pixels: null,
      upscaled_output_pixels: render.output_pixels,
      ocr_path: "",
      ocr_status: "source_html_text_extracted",
      crop_status: render.status === "upscaled_crop_ready" || render.status === "cached" ? "ingredient_source_fragment_ready" : render.status,
      crop_focus: "ingredient_text",
      crop_rotation_degrees: 0,
      ingredient_text: ingredientText,
      ingredient_text_source: ingredientTextSourceForStrategy(strategy),
      ingredient_signal_lines: ingredientText ? [ingredientText] : [],
      panel_context_lines: [],
      errors: [
        mainCapture.status.startsWith("download_failed") ? mainCapture.status : "",
        fragmentCapture.status.startsWith("download_failed") ? fragmentCapture.status : "",
        productImage.status.startsWith("download_failed") ? productImage.status : "",
        ingredientLabelImage.status.startsWith("download_failed") ? ingredientLabelImage.status : "",
        !ingredientText ? "ingredient_fragment_empty" : "",
      ].filter(Boolean),
    };

    if (!sourceCaptures.has(publicSourceUrl)) {
      sourceCaptures.set(publicSourceUrl, {
        source_url: publicSourceUrl,
        status: mainCapture.file_path && fragmentCapture.file_path ? "source_fragment_ready" : mainCapture.status || fragmentCapture.status,
        candidates: [{ url: fragmentUrl, title: `${sourceTitle} ingredients`, year: "current" }],
        downloads: [
          mainCapture.file_path ? { url: sourceFetchUrl, file_path: mainCapture.file_path, title: sourceTitle } : null,
          fragmentCapture.file_path ? { url: fragmentUrl, file_path: fragmentCapture.file_path, title: `${sourceTitle} ingredients` } : null,
          productImage.file_path ? { url: productImageUrl, file_path: productImage.file_path, title: `${sourceTitle} product image` } : null,
          ingredientLabelImage.file_path ? { url: ingredientLabelImageUrl, file_path: ingredientLabelImage.file_path, title: `${sourceTitle} ingredient label image` } : null,
        ].filter(Boolean),
        public_error: mainCapture.file_path && fragmentCapture.file_path ? "" : mainCapture.status || fragmentCapture.status,
      });
    }

    privateVisuals.push(visual);
    publicRows.push(publicRowFor(row, review, {
      visual_id: visualId,
      preview_path: visual.preview_path,
      upscaled_preview_path: visual.upscaled_preview_path,
      crop_status: visual.crop_status,
      source_capture_status: sourceCaptures.get(publicSourceUrl)?.status || "source_capture_needed",
      product_image_url: productImageUrl || ingredientLabelImageUrl,
      ingredient_label_image_url: ingredientLabelImageUrl,
      ingredient_text_source: visual.ingredient_text_source,
    }, ingredientText, sourceTitle, items));
  }

  const privateManifest = {
    schema_version: 1,
    generated_at_utc: generatedAt,
    run_id: runId,
    run_dir: runDir,
    source_family: sourceFamilyId,
    rows: privateVisuals,
    source_captures: [...sourceCaptures.values()],
  };
  writeJson(path.join(runDir, "private-manifest.json"), privateManifest);
  writeJson(latestPrivateManifestPath, privateManifest);
  writeCsv(path.join(runDir, "image-map.csv"), [
    "product_id",
    "evidence_id",
    "visual_id",
    "source_url",
    "source_html_path",
    "ingredient_fragment_path",
    "product_image_path",
    "ingredient_label_image_path",
    "preview_path",
    "upscaled_preview_path",
    "ocr_status",
    "crop_status",
    "upscaled_crop_status",
  ], privateVisuals);

  const products = rowsByProduct(publicRows);
  const visualIndex = {
    schema_version: 1,
    generated_at_utc: generatedAt,
    source_family: {
      id: sourceFamilyId,
      label: sourceFamilyLabel,
      source_domain: [...new Set(publicRows.map((row) => row.source_domain || new URL(row.source_url).hostname))]
        .sort()
        .join("; "),
    },
    public_image_policy: "Public artifacts stay link/status/text-only. Localhost may render cached proof screenshots through /api/private/ingredient-crops/:visual_id when a private cache exists.",
    claim_policy: "Official current ingredient text remains candidate current-label evidence until manually reviewed against package labeling.",
    totals: {
      products: products.length,
      rows: publicRows.length,
      unique_source_urls: new Set(publicRows.map((row) => row.source_url)).size,
      local_preview_available: publicRows.filter((row) => row.local_preview_available).length,
      ingredient_signal_candidates: publicRows.filter((row) => row.ingredient_signal_status === "ingredient_signal_found").length,
      readable_panel_still_needed: publicRows.filter((row) => row.ingredient_signal_status !== "ingredient_signal_found").length,
      ocr_extracted: 0,
      source_fetch_failed: [...sourceCaptures.values()].filter((row) => /failed|missing/.test(row.status)).length,
    },
    sources: [...sourceCaptures.values()].map((capture) => ({
      source_url: capture.source_url,
      status: capture.status,
      candidate_image_count: capture.candidates.length,
      downloaded_image_count: capture.downloads.length,
      error: capture.public_error || "",
    })),
    products,
    rows: publicRows,
  };

  writeJson(visualIndexPath, visualIndex);
  updateNavigatorTimeline(visualIndex);

  console.log(JSON.stringify({
    run_id: runId,
    source_rows: rows.length,
    local_preview_available: visualIndex.totals.local_preview_available,
    ingredient_signal_candidates: visualIndex.totals.ingredient_signal_candidates,
    visual_index: visualIndexPath,
    private_manifest: latestPrivateManifestPath,
  }, null, 2));
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
