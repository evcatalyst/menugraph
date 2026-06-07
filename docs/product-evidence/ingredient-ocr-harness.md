# Ingredient OCR Harness

MenuGraph uses the same native OCR path for ingredient evidence that was used for price/photo text extraction: Apple Vision text recognition from a Swift harness.

The public repo stores source attribution and OCR queues, not external images. Local screenshots, downloaded collector images, and panel crops should stay private unless rights are clear.

## Build The Queue

```sh
npm run build:ingredient-ocr
```

Outputs:

- `docs/data/product-evidence/ingredient_ocr_manifest.json`
- `docs/data/product-evidence/exports/ten_product_pilot_ocr_queue.csv`

The queue identifies every OCR-relevant photo/page candidate across the 10-product pilot and records:

- product and evidence IDs;
- source URL, title, owner, and rights note;
- photo role and label-panel state;
- detected roles such as ingredient panel, nutrition panel, net weight, and panel-review need;
- OCR priority and the next action.

## Run Native OCR Locally

Create a private image map outside git:

```json
{
  "flickr_oreo_1993": "/private/path/to/oreo-1993-panel.jpg",
  "flickr_oreo_1960s": "/private/path/to/oreo-1960s-wrapper.jpg"
}
```

Run OCR:

```sh
node scripts/build-ingredient-ocr-queue.js --run --image-map=/private/path/ingredient-ocr-image-map.json
```

By default OCR results are written to `.cache/ingredient-ocr/`, which is ignored by git.

Direct single-image usage:

```sh
swift scripts/vision-ocr.swift /private/path/to/panel.jpg
```

## Claim Policy

OCR output is only a review candidate. It can move evidence from `label_visible` toward `ocr_extracted`, but no formulation claim is verified until a reviewer corrects the text, records attribution, and marks the label `manual_verified`.
