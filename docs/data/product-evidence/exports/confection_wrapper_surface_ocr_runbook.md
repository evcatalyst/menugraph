# Candy Wrapper Archive Surface OCR Map

Generated: 2026-06-07T20:30:00Z
Run ID: cwa-surface-ocr-v1

This artifact converts the CWA private capture worksheet into surface-level OCR rows and a matching image-map template. It is public-safe: private paths are blank in committed artifacts.

## Surface Order

1. Ingredient panel
2. Nutrition panel
3. Wrapper back/side text
4. Net weight
5. Maker/distributor/date cue
6. Wrapper front context, excluded from OCR by default

## Operator Flow

1. Fill private crop paths in the surface image-map template after capture.
2. Run `node scripts/build-image-map-from-template.js --template=<private-template.csv> --output=<run-dir>/image-map.json`.
3. Run native OCR with `node scripts/run-ingredient-ocr.js --queue=docs/data/product-evidence/exports/confection_wrapper_surface_ocr_queue.csv --run-id=cwa-surface-ocr-v1 --image-map=<run-dir>/image-map.json`.
4. Keep OCR text candidate-only until corrected and manually verified.

## Totals

- Capture rows: 35
- Surface template rows: 210
- OCR queue rows: 175
- Ready for capture now: 0
