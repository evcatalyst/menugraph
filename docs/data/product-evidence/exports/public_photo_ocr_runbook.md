# Public Photo OCR Intake

Generated: 2026-06-07T20:30:00Z

This queue converts rights-cleared public photo proof into a private OCR run. It does not publish OCR text and cannot create verified ingredient claims.

- Queue rows: 31
- Products: 21
- Public photos: 31
- Primary ingredient-panel rows: 2
- Secondary product-context rows: 29
- High-priority panel/text candidates: 2
- Capture ready rows: 28
- OCR succeeded rows: 0
- Ingredient-signal rows: 0

Suggested run:

```sh
node scripts/capture-ingredient-ocr-assets.js --run-id=public-photo-ocr-v1 --queue=docs/data/product-evidence/exports/public_photo_ocr_intake_queue.csv --limit=31 --public-run-summary=docs/data/product-evidence/exports/public_photo_ocr_capture_summary.csv --public-image-map-template=docs/data/product-evidence/exports/public_photo_ocr_image_map_template.csv
node scripts/run-ingredient-ocr.js --run-id=public-photo-ocr-v1 --run-dir=<private-run-dir> --queue=docs/data/product-evidence/exports/public_photo_ocr_intake_queue.csv --limit=31 --image-map=<private-run-dir>/image-map.json --public-ocr-summary=docs/data/product-evidence/exports/public_photo_native_ocr_summary.csv
node scripts/build-public-photo-ocr-intake.js
```

Public artifacts contain counts, hashes, statuses, and source identifiers only. Private images and OCR text stay in the local private run directory.

