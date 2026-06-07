# Ingredient OCR Capture Task Runbook

Generated: 2026-06-07T20:30:00Z
Run ID: hybrid-ocr-v1

This runbook is public-safe. It contains source links, evidence IDs, crop targets, and template fields to fill, but no private image paths and no external image embeds.

## Totals

- Tasks: 250
- High priority: 250
- Capture-ready crops: 0
- Paths needed: 250
- Source discovery tasks: 0

## Operator Flow

1. Open the source URL for a task.
2. Capture or crop the ingredient/nutrition/package panel privately.
3. Fill `local_private_image_path` or `processed_private_image_path` in a private copy of the image-map template.
4. Run `scripts/audit-image-map-template.js` against the private template.
5. Convert the private template to `image-map-input.json`, then run capture and native OCR.

## First Tasks

### 1. Campbell's Chicken Noodle Soup / current_2020s

- Evidence: `campbells_chicken_noodle_soup__current_2020s__312__1`
- Source: https://www.walmart.com/ip/10321674
- Source domain: www.walmart.com
- Crop target: manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `campbells_chicken_noodle_soup__current_2020s__312__1;campbells_chicken_noodle_soup:campbells_chicken_noodle_soup__current_2020s__312__1;https://www.walmart.com/ip/10321674`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 2. Campbell's Chicken Noodle Soup / current_2020s

- Evidence: `campbells_chicken_noodle_soup__current_2020s__36__5`
- Source: https://www.campbells.com/products/condensed/chicken-noodle-soup/
- Source domain: www.campbells.com
- Crop target: front_or_primary_panel,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `campbells_chicken_noodle_soup__current_2020s__36__5;campbells_chicken_noodle_soup:campbells_chicken_noodle_soup__current_2020s__36__5;https://www.campbells.com/products/condensed/chicken-noodle-soup/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 3. Campbell's Chicken Noodle Soup / current_2020s

- Evidence: `campbells_chicken_noodle_soup__current_2020s__37__4`
- Source: https://www.walmart.com/ip/Campbell-s-Condensed-Chicken-Noodle-Soup-10-75-oz-Can/10321681
- Source domain: www.walmart.com
- Crop target: front_or_primary_panel,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `campbells_chicken_noodle_soup__current_2020s__37__4;campbells_chicken_noodle_soup:campbells_chicken_noodle_soup__current_2020s__37__4;https://www.walmart.com/ip/Campbell-s-Condensed-Chicken-Noodle-Soup-10-75-oz-Can/10321681`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 4. Campbell's Chicken Noodle Soup / current_2020s

- Evidence: `campbells_chicken_noodle_soup__current_2020s__529__3`
- Source: https://www.thefreshgrocer.com/product/campbells-condensed-chicken-noodle-soup-1075-oz-00051000012517
- Source domain: www.thefreshgrocer.com
- Crop target: front_or_primary_panel,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `campbells_chicken_noodle_soup__current_2020s__529__3;campbells_chicken_noodle_soup:campbells_chicken_noodle_soup__current_2020s__529__3;https://www.thefreshgrocer.com/product/campbells-condensed-chicken-noodle-soup-1075-oz-00051000012517`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 5. Campbell's Chicken Noodle Soup / current_2020s

- Evidence: `campbells_chicken_noodle_soup__current_2020s__858__6`
- Source: https://www.thefreshgrocer.com/sm/pickup/rsid/2000/product/campbells-condensed-chicken-noodle-soup-1075-oz-id-00051000012511
- Source domain: www.thefreshgrocer.com
- Crop target: front_or_primary_panel,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `campbells_chicken_noodle_soup__current_2020s__858__6;campbells_chicken_noodle_soup:campbells_chicken_noodle_soup__current_2020s__858__6;https://www.thefreshgrocer.com/sm/pickup/rsid/2000/product/campbells-condensed-chicken-noodle-soup-1075-oz-id-00051000012511`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 6. Campbell's Condensed Tomato Soup / 1980s_or_earlier

- Evidence: `campbells_tomato_soup__1980s_or_earlier__971__4`
- Source: https://www.ingredientinspector.org/home/campbells-tomato-soup-ingredients
- Source domain: www.ingredientinspector.org
- Crop target: front_or_primary_panel,package_weight_or_size,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `campbells_tomato_soup__1980s_or_earlier__971__4;campbells_tomato_soup:campbells_tomato_soup__1980s_or_earlier__971__4;https://www.ingredientinspector.org/home/campbells-tomato-soup-ingredients`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 7. Campbell's Condensed Tomato Soup / current_2020s

- Evidence: `campbells_tomato_soup__current_2020s__1077__9`
- Source: https://www.campbells.com/tomato-soup/
- Source domain: www.campbells.com
- Crop target: package_weight_or_size,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `campbells_tomato_soup__current_2020s__1077__9;campbells_tomato_soup:campbells_tomato_soup__current_2020s__1077__9;https://www.campbells.com/tomato-soup/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 8. Campbell's Condensed Tomato Soup / current_2020s

- Evidence: `campbells_tomato_soup__current_2020s__281__3`
- Source: https://www.walmart.com/ip/10321636
- Source domain: www.walmart.com
- Crop target: manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `campbells_tomato_soup__current_2020s__281__3;campbells_tomato_soup:campbells_tomato_soup__current_2020s__281__3;https://www.walmart.com/ip/10321636`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 9. Campbell's Condensed Tomato Soup / current_2020s

- Evidence: `campbells_tomato_soup__current_2020s__501__1`
- Source: https://www.campbells.com/products/condensed/tomato-soup/
- Source domain: www.campbells.com
- Crop target: manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `campbells_tomato_soup__current_2020s__501__1;campbells_tomato_soup:campbells_tomato_soup__current_2020s__501__1;https://www.campbells.com/products/condensed/tomato-soup/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 10. Campbell's Condensed Tomato Soup / current_2020s

- Evidence: `campbells_tomato_soup__current_2020s__726__8`
- Source: https://www.campbells.com/products/condensed/family-size-tomato-soup/
- Source domain: www.campbells.com
- Crop target: front_or_primary_panel,package_weight_or_size,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `campbells_tomato_soup__current_2020s__726__8;campbells_tomato_soup:campbells_tomato_soup__current_2020s__726__8;https://www.campbells.com/products/condensed/family-size-tomato-soup/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 11. Campbell's Condensed Tomato Soup / current_2020s

- Evidence: `campbells_tomato_soup__current_2020s__845__2`
- Source: https://www.walmart.com/ip/43346748
- Source domain: www.walmart.com
- Crop target: manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `campbells_tomato_soup__current_2020s__845__2;campbells_tomato_soup:campbells_tomato_soup__current_2020s__845__2;https://www.walmart.com/ip/43346748`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 12. Campbell's Condensed Tomato Soup / current_2020s

- Evidence: `campbells_tomato_soup__current_2020s__971__10`
- Source: https://www.ingredientinspector.org/home/campbells-tomato-soup-ingredients
- Source domain: www.ingredientinspector.org
- Crop target: front_or_primary_panel,package_weight_or_size,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `campbells_tomato_soup__current_2020s__971__10;campbells_tomato_soup:campbells_tomato_soup__current_2020s__971__10;https://www.ingredientinspector.org/home/campbells-tomato-soup-ingredients`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 13. Cap'n Crunch Original / 1990s

- Evidence: `capn_crunch_original__1990s__440__2`
- Source: https://underunderstood.com/podcast/episode/capn-crunch-smaller/
- Source domain: underunderstood.com
- Crop target: front_or_primary_panel,package_weight_or_size,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `capn_crunch_original__1990s__440__2;capn_crunch_original:capn_crunch_original__1990s__440__2;https://underunderstood.com/podcast/episode/capn-crunch-smaller/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 14. Cap'n Crunch Original / current_2020s

- Evidence: `capn_crunch_original__current_2020s__440__3`
- Source: https://underunderstood.com/podcast/episode/capn-crunch-smaller/
- Source domain: underunderstood.com
- Crop target: front_or_primary_panel,package_weight_or_size,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `capn_crunch_original__current_2020s__440__3;capn_crunch_original:capn_crunch_original__current_2020s__440__3;https://underunderstood.com/podcast/episode/capn-crunch-smaller/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 15. Cap'n Crunch Original / current_2020s

- Evidence: `capn_crunch_original__current_2020s__50__2`
- Source: https://www.capncrunch.com/products/cap-n-crunch-original
- Source domain: www.capncrunch.com
- Crop target: package_weight_or_size,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `capn_crunch_original__current_2020s__50__2;capn_crunch_original:capn_crunch_original__current_2020s__50__2;https://www.capncrunch.com/products/cap-n-crunch-original`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 16. Cap'n Crunch Original / current_2020s

- Evidence: `capn_crunch_original__current_2020s__51__1`
- Source: https://www.kroger.com/p/cap-n-crunch-original-bag-cereal/0003000031378
- Source domain: www.kroger.com
- Crop target: manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `capn_crunch_original__current_2020s__51__1;capn_crunch_original:capn_crunch_original__current_2020s__51__1;https://www.kroger.com/p/cap-n-crunch-original-bag-cereal/0003000031378`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 17. Cap'n Crunch Original / earliest_verified_label

- Evidence: `capn_crunch_original__earliest_verified_label__1084__6`
- Source: https://www.reddit.com/r/GrandmasPantry/comments/1t9hrxl/old_capn_crunch/
- Source domain: www.reddit.com
- Crop target: transcribed_label_text,package_weight_or_size,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `capn_crunch_original__earliest_verified_label__1084__6;capn_crunch_original:capn_crunch_original__earliest_verified_label__1084__6;https://www.reddit.com/r/GrandmasPantry/comments/1t9hrxl/old_capn_crunch/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 18. Cap'n Crunch Original / earliest_verified_label

- Evidence: `capn_crunch_original__earliest_verified_label__277__4`
- Source: https://www.flickr.com/photos/25692985%40N07/3461366520
- Source domain: www.flickr.com
- Crop target: transcribed_label_text,package_weight_or_size,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `capn_crunch_original__earliest_verified_label__277__4;capn_crunch_original:capn_crunch_original__earliest_verified_label__277__4;https://www.flickr.com/photos/25692985%40N07/3461366520`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 19. Cap'n Crunch Original / earliest_verified_label

- Evidence: `capn_crunch_original__earliest_verified_label__440__7`
- Source: https://underunderstood.com/podcast/episode/capn-crunch-smaller/
- Source domain: underunderstood.com
- Crop target: front_or_primary_panel,package_weight_or_size,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `capn_crunch_original__earliest_verified_label__440__7;capn_crunch_original:capn_crunch_original__earliest_verified_label__440__7;https://underunderstood.com/podcast/episode/capn-crunch-smaller/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 20. Cheerios Original / 1980s_or_earlier

- Evidence: `cheerios_original__1980s_or_earlier__368__1`
- Source: https://www.flickr.com/photos/25692985%40N07/3523833856
- Source domain: www.flickr.com
- Crop target: transcribed_label_text,package_weight_or_size,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `cheerios_original__1980s_or_earlier__368__1;cheerios_original:cheerios_original__1980s_or_earlier__368__1;https://www.flickr.com/photos/25692985%40N07/3523833856`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 21. Cheerios Original / current_2020s

- Evidence: `cheerios_original__current_2020s__10__1`
- Source: https://www.cheerios.com/products/original-cheerios
- Source domain: www.cheerios.com
- Crop target: manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `cheerios_original__current_2020s__10__1;cheerios_original:cheerios_original__current_2020s__10__1;https://www.cheerios.com/products/original-cheerios`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 22. Cheerios Original / earliest_verified_label

- Evidence: `cheerios_original__earliest_verified_label__368__1`
- Source: https://www.flickr.com/photos/25692985%40N07/3523833856
- Source domain: www.flickr.com
- Crop target: transcribed_label_text,package_weight_or_size,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `cheerios_original__earliest_verified_label__368__1;cheerios_original:cheerios_original__earliest_verified_label__368__1;https://www.flickr.com/photos/25692985%40N07/3523833856`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 23. Cheerios Original / earliest_verified_label

- Evidence: `cheerios_original__earliest_verified_label__460__11`
- Source: https://www.mashed.com/1561524/first-cheerios-unrecognizable/
- Source domain: www.mashed.com
- Crop target: front_or_primary_panel,package_weight_or_size,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `cheerios_original__earliest_verified_label__460__11;cheerios_original:cheerios_original__earliest_verified_label__460__11;https://www.mashed.com/1561524/first-cheerios-unrecognizable/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 24. Cheetos Crunchy / current_2020s

- Evidence: `cheetos_crunchy__current_2020s__267__1`
- Source: https://www.walmart.com/ip/16306222837
- Source domain: www.walmart.com
- Crop target: manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `cheetos_crunchy__current_2020s__267__1;cheetos_crunchy:cheetos_crunchy__current_2020s__267__1;https://www.walmart.com/ip/16306222837`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 25. Cheetos Crunchy / current_2020s

- Evidence: `cheetos_crunchy__current_2020s__38__2`
- Source: https://smartlabel.pepsico.info/028400589501-0001-en-US/index.html
- Source domain: smartlabel.pepsico.info
- Crop target: front_or_primary_panel,manufacturer_or_distributor,archive_or_capture_coordinates
- Image-map keys: `cheetos_crunchy__current_2020s__38__2;cheetos_crunchy:cheetos_crunchy__current_2020s__38__2;https://smartlabel.pepsico.info/028400589501-0001-en-US/index.html`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

