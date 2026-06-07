# Panel-First Capture Batch Runbook

Generated: 2026-06-07T23:55:00Z

This queue is built from the ingredient-panel acquisition board. It prioritizes ingredient, nutrition, allergen, SmartLabel, and disclosure panels before product-front/package context.

## Totals

- Selected panel tasks: 250
- Spark-sized batches: 14
- High priority rows: 36
- Pilot rows: 51
- Source discovery rows: 0

## Operator Flow

1. Run `node scripts/build-spark-ocr-packets.js --queue=docs/data/product-evidence/exports/panel_capture_ocr_queue.csv --run-id=panel-capture-v1 --limit=250 --packet-size=20 --group-mode=compact --public-model-summary=docs/data/product-evidence/exports/panel_capture_model_assist_summary.csv` to create private Spark packets.
2. Use Spark output only for crop/source-review notes. It cannot verify ingredients or create `manual_verified`.
3. Capture or crop source pages into `.cache/ingredient-ocr/runs/<run-id>/` only.
4. Run native OCR, then batch-review compact OCR candidates before publishing any candidate text.

## First Batches

### 1. mixed (11 domains) / panel_capture_needed

- Rows: 20
- Products: Cheerios Original; Coca-Cola Classic; Oreo Original Chocolate Sandwich Cookies; Campbell's Condensed Tomato Soup; Doritos Nacho Cheese; Heinz Tomato Ketchup; Kraft Macaroni & Cheese Original; McDonald's Big Mac; McDonald's Chicken McNuggets; Pop-Tarts Frosted Strawberry
- Goal: Use Spark for bounded crop/capture instructions, then capture private panel/document crops for native OCR.
- Safety: candidate-only; no private paths; no external image embeds; no manual_verified output

### 2. mixed (4 domains) / panel_capture_needed

- Rows: 6
- Products: McDonald's Big Mac; McDonald's Chicken McNuggets; Oreo Original Chocolate Sandwich Cookies; Pop-Tarts Frosted Strawberry
- Goal: Use Spark for bounded crop/capture instructions, then capture private panel/document crops for native OCR.
- Safety: candidate-only; no private paths; no external image embeds; no manual_verified output

### 3. mixed (5 domains) / readable_panel_photo_needed

- Rows: 20
- Products: Campbell's Condensed Tomato Soup; Cheerios Original; Coca-Cola Classic; Doritos Nacho Cheese; Heinz Tomato Ketchup; Kraft Macaroni & Cheese Original; McDonald's Big Mac; Pop-Tarts Frosted Strawberry; McDonald's Chicken McNuggets
- Goal: Use Spark for bounded crop/capture instructions, then capture private panel/document crops for native OCR.
- Safety: candidate-only; no private paths; no external image embeds; no manual_verified output

### 4. commons.wikimedia.org; flickr.com / readable_panel_photo_needed

- Rows: 5
- Products: Doritos Nacho Cheese; Heinz Tomato Ketchup; Kraft Macaroni & Cheese Original; Oreo Original Chocolate Sandwich Cookies; Pop-Tarts Frosted Strawberry
- Goal: Use Spark for bounded crop/capture instructions, then capture private panel/document crops for native OCR.
- Safety: candidate-only; no private paths; no external image embeds; no manual_verified output

### 5. mixed (10 domains) / panel_capture_needed

- Rows: 20
- Products: Wendy's Chili; Wendy's Dave's Single; Wheat Thins Original; Wheaties; 7UP Original; Cap'n Crunch Original; Dinty Moore Beef Stew; Jell-O Strawberry Gelatin; Kellogg's Froot Loops; Kellogg's Frosted Flakes; Lucky Charms; Pillsbury Crescent Rolls; SPAM Classic; Sprite Original; Tang Orange Drink Mix; Trix Cereal; Burger King Whopper; Chipotle Chicken Burrito; Ball Park Franks
- Goal: Use Spark for bounded crop/capture instructions, then capture private panel/document crops for native OCR.
- Safety: candidate-only; no private paths; no external image embeds; no manual_verified output

### 6. mixed (11 domains) / panel_capture_needed

- Rows: 20
- Products: Bisquick Original Pancake and Baking Mix; Cheetos Crunchy; Chips Ahoy! Original Cookies; Cinnamon Toast Crunch; Domino's Hand Tossed Pepperoni Pizza; Dr Pepper Original; Dunkin' Glazed Donut; Eggo Homestyle Waffles; Fig Newtons; French's Classic Yellow Mustard; Hidden Valley Original Ranch; Hormel Chili No Beans; Hostess Twinkies; Hot Pockets Pepperoni Pizza; KFC Famous Bowl; KFC Original Recipe Chicken; Kit Kat Bar; Lay's Classic Potato Chips; Lean Cuisine Salisbury Steak
- Goal: Use Spark for bounded crop/capture instructions, then capture private panel/document crops for native OCR.
- Safety: candidate-only; no private paths; no external image embeds; no manual_verified output

### 7. mixed (13 domains) / panel_capture_needed

- Rows: 20
- Products: Hellmann's Real Mayonnaise; Hershey's Milk Chocolate Bar; Hidden Valley Original Ranch; Honey Nut Cheerios; Hormel Chili No Beans; Hostess CupCakes; Hostess Twinkies; Hot Pockets Pepperoni Pizza; Jell-O Strawberry Gelatin; Jif Creamy Peanut Butter; Kellogg's Corn Flakes; Kellogg's Froot Loops; Kellogg's Frosted Flakes; Kellogg's Raisin Bran; Kellogg's Rice Krispies; KFC Famous Bowl; Kit Kat Bar; Kool-Aid Cherry Drink Mix; Kraft Singles American Cheese; Lay's Classic Potato Chips
- Goal: Use Spark for bounded crop/capture instructions, then capture private panel/document crops for native OCR.
- Safety: candidate-only; no private paths; no external image embeds; no manual_verified output

### 8. mixed (13 domains) / panel_capture_needed

- Rows: 19
- Products: Lucky Charms; McDonald's World Famous Fries; Nilla Wafers; Nutella Hazelnut Spread; Philadelphia Original Cream Cheese; Pillsbury Crescent Rolls; Pillsbury Toaster Strudel Strawberry; Pizza Hut Original Pan Pepperoni Pizza; Popeyes Chicken Sandwich; Post Grape-Nuts; Pringles Original Crisps; Quaker Old Fashioned Oats; Ritz Original Crackers
- Goal: Use Spark for bounded crop/capture instructions, then capture private panel/document crops for native OCR.
- Safety: candidate-only; no private paths; no external image embeds; no manual_verified output

### 9. mixed (13 domains) / panel_capture_needed

- Rows: 20
- Products: Lucky Charms; Pillsbury Toaster Strudel Strawberry; Pizza Hut Original Pan Pepperoni Pizza; Ritz Original Crackers; SPAM Classic; Sprite Original; Stouffer's Lasagna with Meat & Sauce; Taco Bell Bean Burrito; Tang Orange Drink Mix; Trix Cereal; Twizzlers Strawberry Twists; Velveeta Shells & Cheese; Wheaties; 7UP Original; Ball Park Franks; Banquet Chicken Pot Pie; Betty Crocker Super Moist Yellow Cake Mix; Bisquick Original Pancake and Baking Mix; Butterfinger Bar; Campbell's Chicken Noodle Soup
- Goal: Use Spark for bounded crop/capture instructions, then capture private panel/document crops for native OCR.
- Safety: candidate-only; no private paths; no external image embeds; no manual_verified output

### 10. mixed (15 domains) / panel_capture_needed

- Rows: 20
- Products: Starbucks Pumpkin Spice Latte; Starburst Original; Stouffer's Lasagna with Meat & Sauce; Subway Italian B.M.T.; Subway Tuna Sub; SunChips Harvest Cheddar; Taco Bell Bean Burrito; Taco Bell Crunchy Taco; Tang Orange Drink Mix; Teddy Grahams Honey; Tootsie Roll; Tostitos Original Restaurant Style; Totino's Pizza Rolls; Triscuit Original Crackers; Trix Cereal; Twix Bar; Twizzlers Strawberry Twists; Velveeta Shells & Cheese
- Goal: Use Spark for bounded crop/capture instructions, then capture private panel/document crops for native OCR.
- Safety: candidate-only; no private paths; no external image embeds; no manual_verified output

### 11. mixed (16 domains) / panel_capture_needed

- Rows: 20
- Products: Lean Cuisine Salisbury Steak; Life Cereal Original; Little Debbie Oatmeal Creme Pies; Little Debbie Swiss Rolls; Lucky Charms; M&M's Milk Chocolate Candies; McDonald's World Famous Fries; Milky Way Bar; Miracle Whip Original; Mountain Dew Original; Nilla Wafers; Nutella Hazelnut Spread; Oscar Mayer Bologna; Oscar Mayer Wieners; Panera Broccoli Cheddar Soup; Pearl Milling Company Original Pancake Mix; Pepperidge Farm Goldfish Cheddar; Pepsi Cola
- Goal: Use Spark for bounded crop/capture instructions, then capture private panel/document crops for native OCR.
- Safety: candidate-only; no private paths; no external image embeds; no manual_verified output

### 12. mixed (17 domains) / panel_capture_needed

- Rows: 20
- Products: Cap'n Crunch Original; Cheetos Crunchy; Cheez-It Original Crackers; Chef Boyardee Beefaroni; Chick-fil-A Chicken Sandwich; Chips Ahoy! Original Cookies; Cinnamon Toast Crunch; Cocoa Puffs; Cool Whip Original; Dinty Moore Beef Stew; Domino's Hand Tossed Pepperoni Pizza; Dr Pepper Original; Dunkin' Glazed Donut; Eggo Homestyle Waffles; Fig Newtons; French's Classic Yellow Mustard; Fritos Original Corn Chips; Gatorade Lemon-Lime; Hamburger Helper Cheeseburger Macaroni; Hebrew National Beef Franks
- Goal: Use Spark for bounded crop/capture instructions, then capture private panel/document crops for native OCR.
- Safety: candidate-only; no private paths; no external image embeds; no manual_verified output
