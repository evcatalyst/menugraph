# Ingredient OCR Capture Task Runbook

Generated: 2026-06-07T20:30:00Z
Run ID: pilot-photo-capture-dry-run

This runbook is public-safe. It contains source links, evidence IDs, crop targets, and template fields to fill, but no private image paths and no external image embeds.

## Totals

- Tasks: 101
- High priority: 83
- Capture-ready crops: 0
- Paths needed: 101
- Source discovery tasks: 0

## Operator Flow

1. Open the source URL for a task.
2. Capture or crop the ingredient/nutrition/package panel privately.
3. Fill `local_private_image_path` or `processed_private_image_path` in a private copy of the image-map template.
4. Run `scripts/audit-image-map-template.js` against the private template.
5. Convert the private template to `image-map-input.json`, then run capture and native OCR.

## First Tasks

### 1. Campbell's Condensed Tomato Soup / earliest_verified_label

- Evidence: `campbells_tomato_soup_evidence_0`
- Source: https://www.flickr.com/photos/pennstate_harrisburg_archives/29079862112/in/album-72157719415160219/
- Source domain: www.flickr.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `campbells_tomato_soup_evidence_0;campbells_tomato_soup:campbells_tomato_soup_evidence_0;https://www.flickr.com/photos/pennstate_harrisburg_archives/29079862112/in/album-72157719415160219/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 2. Campbell's Condensed Tomato Soup / earliest_verified_label;1980s_or_earlier

- Evidence: `campbells_tomato_soup_evidence_1`
- Source: https://commons.wikimedia.org/wiki/File%3ACampbell%27s_Condensed_Tomato_Soup%2C_1905.jpg
- Source domain: commons.wikimedia.org
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `campbells_tomato_soup_evidence_1;campbells_tomato_soup:campbells_tomato_soup_evidence_1;https://commons.wikimedia.org/wiki/File%3ACampbell%27s_Condensed_Tomato_Soup%2C_1905.jpg`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 3. Campbell's Condensed Tomato Soup / current_2020s

- Evidence: `campbells_tomato_soup_evidence_10`
- Source: https://www.campbellsfoodservice.com/product/tomato-soup-2/?product-pdf=_
- Source domain: www.campbellsfoodservice.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `campbells_tomato_soup_evidence_10;campbells_tomato_soup:campbells_tomato_soup_evidence_10;https://www.campbellsfoodservice.com/product/tomato-soup-2/?product-pdf=_`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 4. Campbell's Condensed Tomato Soup / earliest_verified_label

- Evidence: `campbells_tomato_soup_evidence_2`
- Source: https://www.flickr.com/photos/library_of_congress/50251904946
- Source domain: www.flickr.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `campbells_tomato_soup_evidence_2;campbells_tomato_soup:campbells_tomato_soup_evidence_2;https://www.flickr.com/photos/library_of_congress/50251904946`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 5. Campbell's Condensed Tomato Soup / earliest_verified_label;1980s_or_earlier

- Evidence: `campbells_tomato_soup_evidence_3`
- Source: https://www.loc.gov/pictures/item/2020736882/
- Source domain: www.loc.gov
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `campbells_tomato_soup_evidence_3;campbells_tomato_soup:campbells_tomato_soup_evidence_3;https://www.loc.gov/pictures/item/2020736882/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 6. Campbell's Condensed Tomato Soup / 1980s_or_earlier

- Evidence: `campbells_tomato_soup_evidence_5`
- Source: https://www.ingredientinspector.org/home/campbells-tomato-soup-ingredients
- Source domain: www.ingredientinspector.org
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `campbells_tomato_soup_evidence_5;campbells_tomato_soup:campbells_tomato_soup_evidence_5;https://www.ingredientinspector.org/home/campbells-tomato-soup-ingredients`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 7. Campbell's Condensed Tomato Soup / current_2020s

- Evidence: `campbells_tomato_soup_evidence_7`
- Source: https://www.campbells.com/products/condensed/tomato-soup/
- Source domain: www.campbells.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `campbells_tomato_soup_evidence_7;campbells_tomato_soup:campbells_tomato_soup_evidence_7;https://www.campbells.com/products/condensed/tomato-soup/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 8. Campbell's Condensed Tomato Soup / current_2020s

- Evidence: `campbells_tomato_soup_evidence_8`
- Source: https://www.campbells.com/products/condensed/family-size-tomato-soup/
- Source domain: www.campbells.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `campbells_tomato_soup_evidence_8;campbells_tomato_soup:campbells_tomato_soup_evidence_8;https://www.campbells.com/products/condensed/family-size-tomato-soup/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 9. Campbell's Condensed Tomato Soup / current_2020s

- Evidence: `campbells_tomato_soup_evidence_9`
- Source: https://www.campbells.com/tomato-soup/
- Source domain: www.campbells.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `campbells_tomato_soup_evidence_9;campbells_tomato_soup:campbells_tomato_soup_evidence_9;https://www.campbells.com/tomato-soup/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 10. Cheerios Original / earliest_verified_label;1980s_or_earlier

- Evidence: `cheerios_original_evidence_0`
- Source: https://www.flickr.com/photos/25692985%40N07/5938738892
- Source domain: www.flickr.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `cheerios_original_evidence_0;cheerios_original:cheerios_original_evidence_0;https://www.flickr.com/photos/25692985%40N07/5938738892`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 11. Cheerios Original / earliest_verified_label;1980s_or_earlier

- Evidence: `cheerios_original_evidence_1`
- Source: https://www.flickr.com/photos/25692985%40N07/3523833856
- Source domain: www.flickr.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `cheerios_original_evidence_1;cheerios_original:cheerios_original_evidence_1;https://www.flickr.com/photos/25692985%40N07/3523833856`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 12. Cheerios Original / earliest_verified_label;1980s_or_earlier

- Evidence: `cheerios_original_evidence_2`
- Source: https://www.flickr.com/photos/25692985%40N07/3523028765/
- Source domain: www.flickr.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `cheerios_original_evidence_2;cheerios_original:cheerios_original_evidence_2;https://www.flickr.com/photos/25692985%40N07/3523028765/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 13. Cheerios Original / earliest_verified_label

- Evidence: `cheerios_original_evidence_3`
- Source: https://www.flickr.com/photos/jasonliebigstuff/4350285509
- Source domain: www.flickr.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `cheerios_original_evidence_3;cheerios_original:cheerios_original_evidence_3;https://www.flickr.com/photos/jasonliebigstuff/4350285509`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 14. Cheerios Original / 1980s_or_earlier

- Evidence: `cheerios_original_evidence_4`
- Source: https://www.flickr.com/photos/jasonliebigstuff/533392194
- Source domain: www.flickr.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `cheerios_original_evidence_4;cheerios_original:cheerios_original_evidence_4;https://www.flickr.com/photos/jasonliebigstuff/533392194`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 15. Cheerios Original / 1990s

- Evidence: `cheerios_original_evidence_5`
- Source: https://theimaginaryworld.com/cbarch.html
- Source domain: theimaginaryworld.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `cheerios_original_evidence_5;cheerios_original:cheerios_original_evidence_5;https://theimaginaryworld.com/cbarch.html`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 16. Cheerios Original / 1990s

- Evidence: `cheerios_original_evidence_6`
- Source: https://www.flickr.com/photos/jasonliebigstuff/albums/72157613304350260/
- Source domain: www.flickr.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `cheerios_original_evidence_6;cheerios_original:cheerios_original_evidence_6;https://www.flickr.com/photos/jasonliebigstuff/albums/72157613304350260/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 17. Cheerios Original / current_2020s

- Evidence: `cheerios_original_evidence_8`
- Source: https://www.cheerios.com/products/original-cheerios
- Source domain: www.cheerios.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `cheerios_original_evidence_8;cheerios_original:cheerios_original_evidence_8;https://www.cheerios.com/products/original-cheerios`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 18. Coca-Cola Classic / earliest_verified_label;1980s_or_earlier

- Evidence: `coca_cola_classic_evidence_0`
- Source: https://commons.wikimedia.org/wiki/File%3AOld_coca_cola_cans_1952.jpg
- Source domain: commons.wikimedia.org
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `coca_cola_classic_evidence_0;coca_cola_classic:coca_cola_classic_evidence_0;https://commons.wikimedia.org/wiki/File%3AOld_coca_cola_cans_1952.jpg`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 19. Coca-Cola Classic / earliest_verified_label;1980s_or_earlier

- Evidence: `coca_cola_classic_evidence_1`
- Source: https://www.flickr.com/photos/studioz7/29453244726
- Source domain: www.flickr.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `coca_cola_classic_evidence_1;coca_cola_classic:coca_cola_classic_evidence_1;https://www.flickr.com/photos/studioz7/29453244726`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 20. Coca-Cola Classic / earliest_verified_label;2000s

- Evidence: `coca_cola_classic_evidence_2`
- Source: https://www.flickr.com/photos/jasonliebigstuff/3267332145/
- Source domain: www.flickr.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `coca_cola_classic_evidence_2;coca_cola_classic:coca_cola_classic_evidence_2;https://www.flickr.com/photos/jasonliebigstuff/3267332145/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 21. Coca-Cola Classic / earliest_verified_label;2000s

- Evidence: `coca_cola_classic_evidence_3`
- Source: https://www.flickr.com/photos/roitberg/6351768138
- Source domain: www.flickr.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `coca_cola_classic_evidence_3;coca_cola_classic:coca_cola_classic_evidence_3;https://www.flickr.com/photos/roitberg/6351768138`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 22. Coca-Cola Classic / 1990s

- Evidence: `coca_cola_classic_evidence_4`
- Source: https://www.flickr.com/photos/therog77/3200756272/
- Source domain: www.flickr.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `coca_cola_classic_evidence_4;coca_cola_classic:coca_cola_classic_evidence_4;https://www.flickr.com/photos/therog77/3200756272/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 23. Coca-Cola Classic / current_2020s

- Evidence: `coca_cola_classic_evidence_6`
- Source: https://www.coca-cola.com/us/en/brands/coca-cola/products/original?redirect=true
- Source domain: www.coca-cola.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `coca_cola_classic_evidence_6;coca_cola_classic:coca_cola_classic_evidence_6;https://www.coca-cola.com/us/en/brands/coca-cola/products/original?redirect=true`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 24. Doritos Nacho Cheese / earliest_verified_label;1980s_or_earlier

- Evidence: `doritos_nacho_cheese_evidence_0`
- Source: https://www.flickr.com/photos/jasonliebigstuff/3496903865
- Source domain: www.flickr.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `doritos_nacho_cheese_evidence_0;doritos_nacho_cheese:doritos_nacho_cheese_evidence_0;https://www.flickr.com/photos/jasonliebigstuff/3496903865`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 25. Doritos Nacho Cheese / earliest_verified_label;1990s

- Evidence: `doritos_nacho_cheese_evidence_1`
- Source: https://www.flickr.com/photos/jasonliebigstuff/4319728854/
- Source domain: www.flickr.com
- Crop target: ingredient/nutrition panel crop, including serving size and net-weight if visible
- Image-map keys: `doritos_nacho_cheese_evidence_1;doritos_nacho_cheese:doritos_nacho_cheese_evidence_1;https://www.flickr.com/photos/jasonliebigstuff/4319728854/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

