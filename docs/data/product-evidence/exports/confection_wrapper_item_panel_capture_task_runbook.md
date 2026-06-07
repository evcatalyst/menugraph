# Ingredient OCR Capture Task Runbook

Generated: 2026-06-07T20:30:00Z
Run ID: confection-wrapper-item-panel-v1

This runbook is public-safe. It contains source links, evidence IDs, crop targets, and template fields to fill, but no private image paths and no external image embeds.

## Totals

- Tasks: 49
- High priority: 23
- Capture-ready crops: 0
- Paths needed: 49
- Source discovery tasks: 0

## Operator Flow

1. Open the source URL for a task.
2. Capture or crop the ingredient/nutrition/package panel privately.
3. Fill `local_private_image_path` or `processed_private_image_path` in a private copy of the image-map template.
4. Run `scripts/audit-image-map-template.js` against the private template.
5. Convert the private template to `image-map-input.json`, then run capture and native OCR.

## First Tasks

### 1. Kit Kat Bar / 2002

- Evidence: `cwa_item_triage_kit_kat_bar_048074b72f`
- Source: https://www.candywrapperarchive.com/candy-collector/2002-kit-kat/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_kit_kat_bar_048074b72f;kit_kat_bar:cwa_item_triage_kit_kat_bar_048074b72f;https://www.candywrapperarchive.com/candy-collector/2002-kit-kat/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 2. Kit Kat Bar / 1970s

- Evidence: `cwa_item_triage_kit_kat_bar_2a96c86c14`
- Source: https://www.candywrapperarchive.com/candy-collector/1970s-kit-kat/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_kit_kat_bar_2a96c86c14;kit_kat_bar:cwa_item_triage_kit_kat_bar_2a96c86c14;https://www.candywrapperarchive.com/candy-collector/1970s-kit-kat/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 3. Kit Kat Bar / 2007

- Evidence: `cwa_item_triage_kit_kat_bar_7d8d5f75c1`
- Source: https://www.candywrapperarchive.com/candy-collector/2007-kit-kat/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_kit_kat_bar_7d8d5f75c1;kit_kat_bar:cwa_item_triage_kit_kat_bar_7d8d5f75c1;https://www.candywrapperarchive.com/candy-collector/2007-kit-kat/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 4. Kit Kat Bar / 2000

- Evidence: `cwa_item_triage_kit_kat_bar_b6403000eb`
- Source: https://www.candywrapperarchive.com/candy-collector/2000-kit-kat/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_kit_kat_bar_b6403000eb;kit_kat_bar:cwa_item_triage_kit_kat_bar_b6403000eb;https://www.candywrapperarchive.com/candy-collector/2000-kit-kat/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 5. Kit Kat Bar / 2006

- Evidence: `cwa_item_triage_kit_kat_bar_c130111192`
- Source: https://www.candywrapperarchive.com/candy-collector/2006-kit-kat/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_kit_kat_bar_c130111192;kit_kat_bar:cwa_item_triage_kit_kat_bar_c130111192;https://www.candywrapperarchive.com/candy-collector/2006-kit-kat/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 6. Kit Kat Bar / 1960s

- Evidence: `cwa_item_triage_kit_kat_bar_cc86c0713b`
- Source: https://www.candywrapperarchive.com/candy-collector/1960s-kit-kat/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_kit_kat_bar_cc86c0713b;kit_kat_bar:cwa_item_triage_kit_kat_bar_cc86c0713b;https://www.candywrapperarchive.com/candy-collector/1960s-kit-kat/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 7. Milky Way Bar / 1950s

- Evidence: `cwa_item_triage_milky_way_bar_522c99a44a`
- Source: https://www.candywrapperarchive.com/candy-collector/1950s-milky-way-2/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_milky_way_bar_522c99a44a;milky_way_bar:cwa_item_triage_milky_way_bar_522c99a44a;https://www.candywrapperarchive.com/candy-collector/1950s-milky-way-2/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 8. Milky Way Bar / 1939

- Evidence: `cwa_item_triage_milky_way_bar_5b9a6ac660`
- Source: https://www.candywrapperarchive.com/candy-collector/1939-milky-way/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_milky_way_bar_5b9a6ac660;milky_way_bar:cwa_item_triage_milky_way_bar_5b9a6ac660;https://www.candywrapperarchive.com/candy-collector/1939-milky-way/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 9. Milky Way Bar / 1940s

- Evidence: `cwa_item_triage_milky_way_bar_95738b0020`
- Source: https://www.candywrapperarchive.com/candy-collector/1940s-milky-way/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_milky_way_bar_95738b0020;milky_way_bar:cwa_item_triage_milky_way_bar_95738b0020;https://www.candywrapperarchive.com/candy-collector/1940s-milky-way/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 10. Milky Way Bar / 1958

- Evidence: `cwa_item_triage_milky_way_bar_e949e52021`
- Source: https://www.candywrapperarchive.com/candy-collector/1958-milky-way/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_milky_way_bar_e949e52021;milky_way_bar:cwa_item_triage_milky_way_bar_e949e52021;https://www.candywrapperarchive.com/candy-collector/1958-milky-way/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 11. Snickers Bar / 1983

- Evidence: `cwa_item_triage_snickers_bar_08d83cf3a3`
- Source: https://www.candywrapperarchive.com/candy-collector/1983-snickers/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_snickers_bar_08d83cf3a3;snickers_bar:cwa_item_triage_snickers_bar_08d83cf3a3;https://www.candywrapperarchive.com/candy-collector/1983-snickers/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 12. Snickers Bar / 1950s

- Evidence: `cwa_item_triage_snickers_bar_0c0135e509`
- Source: https://www.candywrapperarchive.com/candy-collector/1950s-snickers/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_snickers_bar_0c0135e509;snickers_bar:cwa_item_triage_snickers_bar_0c0135e509;https://www.candywrapperarchive.com/candy-collector/1950s-snickers/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 13. Snickers Bar / 2002

- Evidence: `cwa_item_triage_snickers_bar_161988f704`
- Source: https://www.candywrapperarchive.com/candy-collector/2002-snickers/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_snickers_bar_161988f704;snickers_bar:cwa_item_triage_snickers_bar_161988f704;https://www.candywrapperarchive.com/candy-collector/2002-snickers/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 14. Snickers Bar / 1939

- Evidence: `cwa_item_triage_snickers_bar_cb2b9d2221`
- Source: https://www.candywrapperarchive.com/candy-collector/1940s-snickers/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_snickers_bar_cb2b9d2221;snickers_bar:cwa_item_triage_snickers_bar_cb2b9d2221;https://www.candywrapperarchive.com/candy-collector/1940s-snickers/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 15. Snickers Bar / 1940s

- Evidence: `cwa_item_triage_snickers_bar_e0fe0f670b`
- Source: https://www.candywrapperarchive.com/candy-collector/1940s-snickers-2/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_snickers_bar_e0fe0f670b;snickers_bar:cwa_item_triage_snickers_bar_e0fe0f670b;https://www.candywrapperarchive.com/candy-collector/1940s-snickers-2/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 16. Snickers Bar / 1990

- Evidence: `cwa_item_triage_snickers_bar_fcd9088312`
- Source: https://www.candywrapperarchive.com/candy-collector/1990-snickers/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_snickers_bar_fcd9088312;snickers_bar:cwa_item_triage_snickers_bar_fcd9088312;https://www.candywrapperarchive.com/candy-collector/1990-snickers/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 17. Tootsie Roll / 1940s

- Evidence: `cwa_item_triage_tootsie_roll_69b1a8d3ec`
- Source: https://www.candywrapperarchive.com/candy-collector/1940s-tootsie-roll/
- Source domain: www.candywrapperarchive.com
- Crop target: Use source image only as a private capture reference; crop wrapper front/back/side regions separately and OCR only if ingredient or nutrition text is readable.
- Image-map keys: `cwa_item_triage_tootsie_roll_69b1a8d3ec;tootsie_roll:cwa_item_triage_tootsie_roll_69b1a8d3ec;https://www.candywrapperarchive.com/candy-collector/1940s-tootsie-roll/;https://www.candywrapperarchive.com/wp-content/uploads/2013/02/Image209.jpg`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 18. Tootsie Roll / 1960s

- Evidence: `cwa_item_triage_tootsie_roll_d437c83146`
- Source: https://www.candywrapperarchive.com/candy-collector/1960s-tootsie-roll-2/
- Source domain: www.candywrapperarchive.com
- Crop target: Use source image only as a private capture reference; crop wrapper front/back/side regions separately and OCR only if ingredient or nutrition text is readable.
- Image-map keys: `cwa_item_triage_tootsie_roll_d437c83146;tootsie_roll:cwa_item_triage_tootsie_roll_d437c83146;https://www.candywrapperarchive.com/candy-collector/1960s-tootsie-roll-2/;https://www.candywrapperarchive.com/wp-content/uploads/2013/02/Image997.jpg`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 19. Twix Bar / 2009

- Evidence: `cwa_item_triage_twix_bar_14f904c119`
- Source: https://www.candywrapperarchive.com/candy-collector/2009-twix/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_twix_bar_14f904c119;twix_bar:cwa_item_triage_twix_bar_14f904c119;https://www.candywrapperarchive.com/candy-collector/2009-twix/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 20. Twix Bar / 2003

- Evidence: `cwa_item_triage_twix_bar_1f274f01fe`
- Source: https://www.candywrapperarchive.com/candy-collector/2003-twix/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_twix_bar_1f274f01fe;twix_bar:cwa_item_triage_twix_bar_1f274f01fe;https://www.candywrapperarchive.com/candy-collector/2003-twix/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 21. Twix Bar / 2002

- Evidence: `cwa_item_triage_twix_bar_6267499e6b`
- Source: https://www.candywrapperarchive.com/candy-collector/2002-twix/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_twix_bar_6267499e6b;twix_bar:cwa_item_triage_twix_bar_6267499e6b;https://www.candywrapperarchive.com/candy-collector/2002-twix/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 22. Twix Bar / 2006

- Evidence: `cwa_item_triage_twix_bar_7ae0543a5c`
- Source: https://www.candywrapperarchive.com/candy-collector/2006-twix/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_twix_bar_7ae0543a5c;twix_bar:cwa_item_triage_twix_bar_7ae0543a5c;https://www.candywrapperarchive.com/candy-collector/2006-twix/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 23. Twix Bar / 2004

- Evidence: `cwa_item_triage_twix_bar_c09c4471e1`
- Source: https://www.candywrapperarchive.com/candy-collector/2004-twix/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_twix_bar_c09c4471e1;twix_bar:cwa_item_triage_twix_bar_c09c4471e1;https://www.candywrapperarchive.com/candy-collector/2004-twix/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 24. Butterfinger Bar / 1975

- Evidence: `cwa_item_triage_butterfinger_bar_2e6e39dbff`
- Source: https://www.candywrapperarchive.com/candy-collector/1975-butterfinger/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_butterfinger_bar_2e6e39dbff;butterfinger_bar:cwa_item_triage_butterfinger_bar_2e6e39dbff;https://www.candywrapperarchive.com/candy-collector/1975-butterfinger/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

### 25. Butterfinger Bar / 1950

- Evidence: `cwa_item_triage_butterfinger_bar_2f332a9dd7`
- Source: https://www.candywrapperarchive.com/candy-collector/1950-butterfinger-2/
- Source domain: www.candywrapperarchive.com
- Crop target: Capture item page and wrapper image privately; crop visible wrapper surfaces and classify front, back, side, net weight, maker, date cue, ingredient panel, and nutrition panel visibility.
- Image-map keys: `cwa_item_triage_butterfinger_bar_2f332a9dd7;butterfinger_bar:cwa_item_triage_butterfinger_bar_2f332a9dd7;https://www.candywrapperarchive.com/candy-collector/1950-butterfinger-2/`
- Fill: `local_private_image_path or processed_private_image_path`
- Next action: Open source, capture a private panel crop, then fill the private template path.

