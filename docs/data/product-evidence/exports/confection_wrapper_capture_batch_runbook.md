# Candy Wrapper Archive Private Capture Batches

Generated: 2026-06-07T20:30:00Z
Run ID: cwa-private-capture-round-1

This is the execution handoff for the first private capture pass over prioritized Candy Wrapper Archive item pages. It is public-safe: it publishes source URLs, crop instructions, and blank capture fields, but no images, private paths, OCR text, or verified ingredient claims.

## Rules

- Capture ingredient or nutrition panels first.
- If no panel is visible, crop wrapper back/side text, net weight, maker/distributor, and date cues before wrapper-front context.
- Wrapper-front images support package lineage only.
- Fill private paths locally; do not commit screenshots or crops.
- Route to native OCR only when a readable text crop exists.
- Keep model/OCR outputs candidate-only until corrected and manually verified.

## Totals

- Product batches: 6
- Capture rows: 35
- Source URLs: 35
- Readable for OCR now: 0

## First Batches

### 1. Butterfinger Bar (1930s-2009)

- Rows: 8
- First source: https://www.candywrapperarchive.com/candy-collector/1930s-butterfinger-2/
- Goal: Privately capture source item pages, crop ingredient/nutrition/back-side text before wrapper fronts, and keep all output candidate-only.
- Done when: Every row has private screenshot/crop paths filled locally or an explicit no-readable-panel note; readable text crops can then enter native OCR.

### 2. Reese's Peanut Butter Cups (1940s-2005)

- Rows: 7
- First source: https://www.candywrapperarchive.com/candy-collector/1940s-reeses-bag/
- Goal: Privately capture source item pages, crop ingredient/nutrition/back-side text before wrapper fronts, and keep all output candidate-only.
- Done when: Every row has private screenshot/crop paths filled locally or an explicit no-readable-panel note; readable text crops can then enter native OCR.

### 3. Hershey's Milk Chocolate Bar (1908-1960s)

- Rows: 6
- First source: https://www.candywrapperarchive.com/candy-collector/1908-hershey-wrapper/
- Goal: Privately capture source item pages, crop ingredient/nutrition/back-side text before wrapper fronts, and keep all output candidate-only.
- Done when: Every row has private screenshot/crop paths filled locally or an explicit no-readable-panel note; readable text crops can then enter native OCR.

### 4. Snickers Bar (1939-2002)

- Rows: 6
- First source: https://www.candywrapperarchive.com/candy-collector/1940s-snickers-2/
- Goal: Privately capture source item pages, crop ingredient/nutrition/back-side text before wrapper fronts, and keep all output candidate-only.
- Done when: Every row has private screenshot/crop paths filled locally or an explicit no-readable-panel note; readable text crops can then enter native OCR.

### 5. Kit Kat Bar (1960s-2007)

- Rows: 6
- First source: https://www.candywrapperarchive.com/candy-collector/1960s-kit-kat/
- Goal: Privately capture source item pages, crop ingredient/nutrition/back-side text before wrapper fronts, and keep all output candidate-only.
- Done when: Every row has private screenshot/crop paths filled locally or an explicit no-readable-panel note; readable text crops can then enter native OCR.

### 6. Tootsie Roll (1940s-1960s)

- Rows: 2
- First source: https://www.candywrapperarchive.com/candy-collector/1940s-tootsie-roll/
- Goal: Privately capture source item pages, crop ingredient/nutrition/back-side text before wrapper fronts, and keep all output candidate-only.
- Done when: Every row has private screenshot/crop paths filled locally or an explicit no-readable-panel note; readable text crops can then enter native OCR.

## Worksheet Fields To Fill Privately

- private_page_screenshot_path
- private_wrapper_front_crop_path
- private_wrapper_back_or_side_crop_path
- private_ingredient_panel_crop_path
- private_nutrition_panel_crop_path
- private_net_weight_crop_path
- private_maker_or_date_crop_path
- screenshot_hash
- crop_hashes
- text_readable_for_ocr
