# Confection Wrapper Capture Handoff

Generated: 2026-06-08T01:20:00Z
Run ID: confection-wrapper-capture-v1

This handoff converts Candy Wrapper Archive source-review tasks into private capture work. It is public-safe: it stores source URLs and review instructions, but no private screenshots, crops, OCR text, or verified ingredient claims.

## Rules

- Candy Wrapper Archive is prioritized for confection wrapper lineage before broad web hunting.
- Wrapper-front photos support product/package history only.
- Ingredient claims require a readable ingredient or nutrition panel, candidate OCR, corrected transcription, reviewer attribution, and manual verification.
- Collection pages must be reduced to item-level wrapper pages before capture/OCR.
- External images remain link-only unless rights are explicitly clear.

## Totals

- Capture rows: 13
- Products: 12
- High priority rows: 6
- Source-page capture rows: 10
- Source-discovery rows: 3

## Operator Flow

1. Open the source URL for an item or collection task.
2. For collection pages, select item-level wrapper records by decade before capture.
3. Capture private screenshots/crops only under `.cache/ingredient-ocr/runs/<run-id>/`.
4. Record photo role, panel readability, rights notes, and date/package cues.
5. Fill the private image-map path only for useful crops.
6. Run native OCR only when a readable ingredient/nutrition/document surface exists.

## First Rows

### Snickers Bar / collection_index_to_item_page_triage

- Evidence: `cwa_capture_snickers_bar_93cbad5c91`
- Source: https://www.candywrapperarchive.com/candy-collection/snickers/
- Crop target: Review the collection index for item-level wrapper pages by decade; capture only item-level pages or images, not the collection index as a label.
- Next action: Open the collection page, choose item-level wrapper records by decade, then create source-attributable capture rows for those item pages.

### Twix Bar / collection_index_to_item_page_triage

- Evidence: `cwa_capture_twix_bar_466db4696f`
- Source: https://www.candywrapperarchive.com/candy-collection/twix/
- Crop target: Review the collection index for item-level wrapper pages by decade; capture only item-level pages or images, not the collection index as a label.
- Next action: Open the collection page, choose item-level wrapper records by decade, then create source-attributable capture rows for those item pages.

### Tootsie Roll / item_page_screenshot_panel_triage

- Evidence: `cwa_capture_tootsie_roll_b225c9d1ee`
- Source: https://www.candywrapperarchive.com/candy-collector/1960s-tootsie-roll-2/
- Crop target: Capture a private source-page screenshot, then crop wrapper front/back/side panels separately; route to OCR only if ingredient or nutrition text is readable.
- Next action: Open the item page, capture a private screenshot/crop, classify photo role and panel readability, then fill the private image-map path only if a useful crop exists.

### Kit Kat Bar / collection_index_to_item_page_triage

- Evidence: `cwa_capture_kit_kat_bar_8d46703922`
- Source: https://www.candywrapperarchive.com/candy-collection/kit-kat/
- Crop target: Review the collection index for item-level wrapper pages by decade; capture only item-level pages or images, not the collection index as a label.
- Next action: Open the collection page, choose item-level wrapper records by decade, then create source-attributable capture rows for those item pages.

### Tootsie Roll / item_page_screenshot_panel_triage

- Evidence: `cwa_capture_tootsie_roll_d200029915`
- Source: https://www.candywrapperarchive.com/candy-collector/1940s-tootsie-roll/
- Crop target: Capture a private source-page screenshot, then crop wrapper front/back/side panels separately; route to OCR only if ingredient or nutrition text is readable.
- Next action: Open the item page, capture a private screenshot/crop, classify photo role and panel readability, then fill the private image-map path only if a useful crop exists.

### Milky Way Bar / collection_index_to_item_page_triage

- Evidence: `cwa_capture_milky_way_bar_07951f26df`
- Source: https://www.candywrapperarchive.com/candy-collection/milky-way/
- Crop target: Review the collection index for item-level wrapper pages by decade; capture only item-level pages or images, not the collection index as a label.
- Next action: Open the collection page, choose item-level wrapper records by decade, then create source-attributable capture rows for those item pages.

### Butterfinger Bar / collection_index_to_item_page_triage

- Evidence: `cwa_capture_butterfinger_bar_e390ec6ece`
- Source: https://www.candywrapperarchive.com/candy-collection/butterfinger/
- Crop target: Review the collection index for item-level wrapper pages by decade; capture only item-level pages or images, not the collection index as a label.
- Next action: Open the collection page, choose item-level wrapper records by decade, then create source-attributable capture rows for those item pages.

### Hershey's Milk Chocolate Bar / collection_index_to_item_page_triage

- Evidence: `cwa_capture_hersheys_milk_chocolate_bar_1e492997e3`
- Source: https://www.candywrapperarchive.com/candy-collection/hershey/
- Crop target: Review the collection index for item-level wrapper pages by decade; capture only item-level pages or images, not the collection index as a label.
- Next action: Open the collection page, choose item-level wrapper records by decade, then create source-attributable capture rows for those item pages.

### M&M's Milk Chocolate Candies / collection_index_to_item_page_triage

- Evidence: `cwa_capture_mms_milk_chocolate_3331ee0f8b`
- Source: https://www.candywrapperarchive.com/candy-collection/mms/
- Crop target: Review the collection index for item-level wrapper pages by decade; capture only item-level pages or images, not the collection index as a label.
- Next action: Open the collection page, choose item-level wrapper records by decade, then create source-attributable capture rows for those item pages.

### Reese's Peanut Butter Cups / collection_index_to_item_page_triage

- Evidence: `cwa_capture_reeses_peanut_butter_cups_c3b45584fa`
- Source: https://www.candywrapperarchive.com/candy-collection/resses/
- Crop target: Review the collection index for item-level wrapper pages by decade; capture only item-level pages or images, not the collection index as a label.
- Next action: Open the collection page, choose item-level wrapper records by decade, then create source-attributable capture rows for those item pages.

### Skittles Original / source_hunt_before_capture

- Evidence: `cwa_capture_skittles_original_4270c4207c`
- Source: site:candywrapperarchive.com/candy-collection "Skittles Original";site:candywrapperarchive.com/candy-collector "Skittles Original" wrapper;site:candywrapperarchive.com "Skittles Original" "Candy Wrapper Archive"
- Crop target: Find a Candy Wrapper Archive item or collection page with source-attributable wrapper photos before any capture.
- Next action: Run the constrained Candy Wrapper Archive search queries, attach the strongest source URL, then rebuild this handoff.

### Starburst Original / source_hunt_before_capture

- Evidence: `cwa_capture_starburst_original_57b7d936d3`
- Source: site:candywrapperarchive.com/candy-collection "Starburst Original";site:candywrapperarchive.com/candy-collector "Starburst Original" wrapper;site:candywrapperarchive.com "Starburst Original" "Candy Wrapper Archive"
- Crop target: Find a Candy Wrapper Archive item or collection page with source-attributable wrapper photos before any capture.
- Next action: Run the constrained Candy Wrapper Archive search queries, attach the strongest source URL, then rebuild this handoff.
