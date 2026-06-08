# Ingredient OCR Capture Task Runbook

Generated: 2026-06-07T20:30:00Z
Run ID: cwa-ingredient-priority-v1

This runbook is public-safe. It contains source links, evidence IDs, crop targets, and template fields to fill, but no private image paths and no external image embeds.

## Totals

- Tasks: 245
- High priority: 98
- Capture-ready crops: 0
- Paths needed: 245
- Source discovery tasks: 0

## Operator Flow

1. Open the source URL for a task.
2. Capture or crop the ingredient/nutrition/package panel privately.
3. Fill `local_private_image_path` or `processed_private_image_path` in a private copy of the image-map template.
4. Run `scripts/audit-image-map-template.js` against the private template.
5. Convert the private template to `image-map-input.json`, then run capture and native OCR.

## First Tasks

### 1. Butterfinger Bar / 2009

- Evidence: `cwa_surface_06fb011e088d40`
- Source: https://www.candywrapperarchive.com/candy-collector/2009-butterfinger/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the nutrition panel and serving-size text if visible.
- Image-map keys: `cwa_surface_06fb011e088d40;butterfinger_bar:cwa_surface_06fb011e088d40;cwa_capture_round_46b6a1edde5b:nutrition_panel;https://www.candywrapperarchive.com/candy-collector/2009-butterfinger/#nutrition_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 2. Butterfinger Bar / 2002

- Evidence: `cwa_surface_0a1eeb650363ed`
- Source: https://www.candywrapperarchive.com/candy-collector/2002-butterfinger/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the nutrition panel and serving-size text if visible.
- Image-map keys: `cwa_surface_0a1eeb650363ed;butterfinger_bar:cwa_surface_0a1eeb650363ed;cwa_capture_round_a497fbb8b330:nutrition_panel;https://www.candywrapperarchive.com/candy-collector/2002-butterfinger/#nutrition_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 3. Butterfinger Bar / 1980s

- Evidence: `cwa_surface_11352cd6262a16`
- Source: https://www.candywrapperarchive.com/candy-collector/1980s-butterfinger/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the ingredient statement with enough package context to preserve product/date cues.
- Image-map keys: `cwa_surface_11352cd6262a16;butterfinger_bar:cwa_surface_11352cd6262a16;cwa_capture_round_add5694f379c:ingredient_panel;https://www.candywrapperarchive.com/candy-collector/1980s-butterfinger/#ingredient_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 4. Butterfinger Bar / 1950

- Evidence: `cwa_surface_14e84cbbae8fe9`
- Source: https://www.candywrapperarchive.com/candy-collector/1950-butterfinger-2/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the ingredient statement with enough package context to preserve product/date cues.
- Image-map keys: `cwa_surface_14e84cbbae8fe9;butterfinger_bar:cwa_surface_14e84cbbae8fe9;cwa_capture_round_4a02e8a42692:ingredient_panel;https://www.candywrapperarchive.com/candy-collector/1950-butterfinger-2/#ingredient_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 5. Butterfinger Bar / 1936

- Evidence: `cwa_surface_20807ca6246abf`
- Source: https://www.candywrapperarchive.com/candy-collector/1936-butterfinger/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the ingredient statement with enough package context to preserve product/date cues.
- Image-map keys: `cwa_surface_20807ca6246abf;butterfinger_bar:cwa_surface_20807ca6246abf;cwa_capture_round_7f9a71c59f94:ingredient_panel;https://www.candywrapperarchive.com/candy-collector/1936-butterfinger/#ingredient_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 6. Butterfinger Bar / 2009

- Evidence: `cwa_surface_29f395474ef684`
- Source: https://www.candywrapperarchive.com/candy-collector/2009-butterfinger/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the ingredient statement with enough package context to preserve product/date cues.
- Image-map keys: `cwa_surface_29f395474ef684;butterfinger_bar:cwa_surface_29f395474ef684;cwa_capture_round_46b6a1edde5b:ingredient_panel;https://www.candywrapperarchive.com/candy-collector/2009-butterfinger/#ingredient_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 7. Butterfinger Bar / 1964

- Evidence: `cwa_surface_2bf81d0b93b9ab`
- Source: https://www.candywrapperarchive.com/candy-collector/1964-butterfinger/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the nutrition panel and serving-size text if visible.
- Image-map keys: `cwa_surface_2bf81d0b93b9ab;butterfinger_bar:cwa_surface_2bf81d0b93b9ab;cwa_capture_round_af76a4c6c608:nutrition_panel;https://www.candywrapperarchive.com/candy-collector/1964-butterfinger/#nutrition_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 8. Butterfinger Bar / 1975

- Evidence: `cwa_surface_2f942468ca250f`
- Source: https://www.candywrapperarchive.com/candy-collector/1975-butterfinger/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the ingredient statement with enough package context to preserve product/date cues.
- Image-map keys: `cwa_surface_2f942468ca250f;butterfinger_bar:cwa_surface_2f942468ca250f;cwa_capture_round_9a000e6d1375:ingredient_panel;https://www.candywrapperarchive.com/candy-collector/1975-butterfinger/#ingredient_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 9. Butterfinger Bar / 1936

- Evidence: `cwa_surface_3e9fb8bd823a85`
- Source: https://www.candywrapperarchive.com/candy-collector/1936-butterfinger/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the nutrition panel and serving-size text if visible.
- Image-map keys: `cwa_surface_3e9fb8bd823a85;butterfinger_bar:cwa_surface_3e9fb8bd823a85;cwa_capture_round_7f9a71c59f94:nutrition_panel;https://www.candywrapperarchive.com/candy-collector/1936-butterfinger/#nutrition_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 10. Butterfinger Bar / 2002

- Evidence: `cwa_surface_60231b54b36cda`
- Source: https://www.candywrapperarchive.com/candy-collector/2002-butterfinger/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the ingredient statement with enough package context to preserve product/date cues.
- Image-map keys: `cwa_surface_60231b54b36cda;butterfinger_bar:cwa_surface_60231b54b36cda;cwa_capture_round_a497fbb8b330:ingredient_panel;https://www.candywrapperarchive.com/candy-collector/2002-butterfinger/#ingredient_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 11. Butterfinger Bar / 1975

- Evidence: `cwa_surface_6c45d30611861d`
- Source: https://www.candywrapperarchive.com/candy-collector/1975-butterfinger/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the nutrition panel and serving-size text if visible.
- Image-map keys: `cwa_surface_6c45d30611861d;butterfinger_bar:cwa_surface_6c45d30611861d;cwa_capture_round_9a000e6d1375:nutrition_panel;https://www.candywrapperarchive.com/candy-collector/1975-butterfinger/#nutrition_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 12. Butterfinger Bar / 1964

- Evidence: `cwa_surface_99e8305790e753`
- Source: https://www.candywrapperarchive.com/candy-collector/1964-butterfinger/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the ingredient statement with enough package context to preserve product/date cues.
- Image-map keys: `cwa_surface_99e8305790e753;butterfinger_bar:cwa_surface_99e8305790e753;cwa_capture_round_af76a4c6c608:ingredient_panel;https://www.candywrapperarchive.com/candy-collector/1964-butterfinger/#ingredient_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 13. Butterfinger Bar / 1930s

- Evidence: `cwa_surface_b363dd0d60335c`
- Source: https://www.candywrapperarchive.com/candy-collector/1930s-butterfinger-2/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the nutrition panel and serving-size text if visible.
- Image-map keys: `cwa_surface_b363dd0d60335c;butterfinger_bar:cwa_surface_b363dd0d60335c;cwa_capture_round_54bf4d9d9b8d:nutrition_panel;https://www.candywrapperarchive.com/candy-collector/1930s-butterfinger-2/#nutrition_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 14. Butterfinger Bar / 1930s

- Evidence: `cwa_surface_bdb8731dc7e98b`
- Source: https://www.candywrapperarchive.com/candy-collector/1930s-butterfinger-2/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the ingredient statement with enough package context to preserve product/date cues.
- Image-map keys: `cwa_surface_bdb8731dc7e98b;butterfinger_bar:cwa_surface_bdb8731dc7e98b;cwa_capture_round_54bf4d9d9b8d:ingredient_panel;https://www.candywrapperarchive.com/candy-collector/1930s-butterfinger-2/#ingredient_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 15. Butterfinger Bar / 1950

- Evidence: `cwa_surface_c7d30fed1ab8bd`
- Source: https://www.candywrapperarchive.com/candy-collector/1950-butterfinger-2/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the nutrition panel and serving-size text if visible.
- Image-map keys: `cwa_surface_c7d30fed1ab8bd;butterfinger_bar:cwa_surface_c7d30fed1ab8bd;cwa_capture_round_4a02e8a42692:nutrition_panel;https://www.candywrapperarchive.com/candy-collector/1950-butterfinger-2/#nutrition_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 16. Butterfinger Bar / 1980s

- Evidence: `cwa_surface_f44d9b4ffe1d8a`
- Source: https://www.candywrapperarchive.com/candy-collector/1980s-butterfinger/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the nutrition panel and serving-size text if visible.
- Image-map keys: `cwa_surface_f44d9b4ffe1d8a;butterfinger_bar:cwa_surface_f44d9b4ffe1d8a;cwa_capture_round_add5694f379c:nutrition_panel;https://www.candywrapperarchive.com/candy-collector/1980s-butterfinger/#nutrition_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 17. Hershey's Milk Chocolate Bar / 1908

- Evidence: `cwa_surface_0a9fae33f7f4ee`
- Source: https://www.candywrapperarchive.com/candy-collector/1908-hershey-wrapper/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the ingredient statement with enough package context to preserve product/date cues.
- Image-map keys: `cwa_surface_0a9fae33f7f4ee;hersheys_milk_chocolate_bar:cwa_surface_0a9fae33f7f4ee;cwa_capture_round_0116a57afe0f:ingredient_panel;https://www.candywrapperarchive.com/candy-collector/1908-hershey-wrapper/#ingredient_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 18. Hershey's Milk Chocolate Bar / 1950s

- Evidence: `cwa_surface_17b90b0b42f85c`
- Source: https://www.candywrapperarchive.com/candy-collector/1950s-hershey/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the nutrition panel and serving-size text if visible.
- Image-map keys: `cwa_surface_17b90b0b42f85c;hersheys_milk_chocolate_bar:cwa_surface_17b90b0b42f85c;cwa_capture_round_9e76a7bca726:nutrition_panel;https://www.candywrapperarchive.com/candy-collector/1950s-hershey/#nutrition_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 19. Hershey's Milk Chocolate Bar / 1930s

- Evidence: `cwa_surface_210c770b7ee45d`
- Source: https://www.candywrapperarchive.com/candy-collector/1930s-hershey/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the ingredient statement with enough package context to preserve product/date cues.
- Image-map keys: `cwa_surface_210c770b7ee45d;hersheys_milk_chocolate_bar:cwa_surface_210c770b7ee45d;cwa_capture_round_bde01a796e80:ingredient_panel;https://www.candywrapperarchive.com/candy-collector/1930s-hershey/#ingredient_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 20. Hershey's Milk Chocolate Bar / 1950s

- Evidence: `cwa_surface_2b941770eb841c`
- Source: https://www.candywrapperarchive.com/candy-collector/1950s-hershey/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the ingredient statement with enough package context to preserve product/date cues.
- Image-map keys: `cwa_surface_2b941770eb841c;hersheys_milk_chocolate_bar:cwa_surface_2b941770eb841c;cwa_capture_round_9e76a7bca726:ingredient_panel;https://www.candywrapperarchive.com/candy-collector/1950s-hershey/#ingredient_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 21. Hershey's Milk Chocolate Bar / 1910

- Evidence: `cwa_surface_680242000dbc33`
- Source: https://www.candywrapperarchive.com/candy-collector/1910-hershey/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the nutrition panel and serving-size text if visible.
- Image-map keys: `cwa_surface_680242000dbc33;hersheys_milk_chocolate_bar:cwa_surface_680242000dbc33;cwa_capture_round_cd0e7345f0d1:nutrition_panel;https://www.candywrapperarchive.com/candy-collector/1910-hershey/#nutrition_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 22. Hershey's Milk Chocolate Bar / 1940

- Evidence: `cwa_surface_6d6f67594ba20b`
- Source: https://www.candywrapperarchive.com/candy-collector/1940-hershey/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the nutrition panel and serving-size text if visible.
- Image-map keys: `cwa_surface_6d6f67594ba20b;hersheys_milk_chocolate_bar:cwa_surface_6d6f67594ba20b;cwa_capture_round_b60d1747ad76:nutrition_panel;https://www.candywrapperarchive.com/candy-collector/1940-hershey/#nutrition_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 23. Hershey's Milk Chocolate Bar / 1908

- Evidence: `cwa_surface_6e41e940f11522`
- Source: https://www.candywrapperarchive.com/candy-collector/1908-hershey-wrapper/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the nutrition panel and serving-size text if visible.
- Image-map keys: `cwa_surface_6e41e940f11522;hersheys_milk_chocolate_bar:cwa_surface_6e41e940f11522;cwa_capture_round_0116a57afe0f:nutrition_panel;https://www.candywrapperarchive.com/candy-collector/1908-hershey-wrapper/#nutrition_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 24. Hershey's Milk Chocolate Bar / 1940

- Evidence: `cwa_surface_836474c5ecb3ab`
- Source: https://www.candywrapperarchive.com/candy-collector/1940-hershey/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the ingredient statement with enough package context to preserve product/date cues.
- Image-map keys: `cwa_surface_836474c5ecb3ab;hersheys_milk_chocolate_bar:cwa_surface_836474c5ecb3ab;cwa_capture_round_b60d1747ad76:ingredient_panel;https://www.candywrapperarchive.com/candy-collector/1940-hershey/#ingredient_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 25. Hershey's Milk Chocolate Bar / 1960s

- Evidence: `cwa_surface_8b0ef422af9a79`
- Source: https://www.candywrapperarchive.com/candy-collector/1960s-hershey/
- Source domain: www.candywrapperarchive.com
- Crop target: Crop the nutrition panel and serving-size text if visible.
- Image-map keys: `cwa_surface_8b0ef422af9a79;hersheys_milk_chocolate_bar:cwa_surface_8b0ef422af9a79;cwa_capture_round_a44e3ee9ad86:nutrition_panel;https://www.candywrapperarchive.com/candy-collector/1960s-hershey/#nutrition_panel`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

