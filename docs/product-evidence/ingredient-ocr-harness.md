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
- `docs/data/product-evidence/full_corpus_ingredient_ocr_manifest.json`
- `docs/data/product-evidence/exports/full_corpus_ingredient_ocr_queue.csv`
- `docs/data/product-evidence/exports/full_corpus_ingredient_ocr_gap_report.csv`
- `docs/data/product-evidence/exports/full_corpus_ingredient_ocr_gap_report.md`

The pilot queue identifies every OCR-relevant photo/page candidate across the 10-product pilot. The full-corpus queue scales the same model to every evidence-registry row across the 100+ product corpus and records:

- product and evidence IDs;
- source URL, title, owner, and rights note;
- photo role and label-panel state;
- detected roles such as ingredient panel, nutrition panel, net weight, and panel-review need;
- OCR priority, access state, blocker category, and the next action.

Full-corpus access states are intentionally conservative:

- `local_image_ready`: a private local image/crop path was supplied through an image map and can be processed by Swift/Vision.
- `external_image_reference_ready`: a direct image reference exists, but it should be downloaded only into a private cache unless rights are clear.
- `source_page_capture_needed`: the public record has a source URL, but the repo does not contain a reproducible image crop.
- `source_discovery_needed`: the product/vintage slot still lacks source-attributable evidence.

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

To limit a private OCR execution:

```sh
node scripts/build-ingredient-ocr-queue.js --run --scope=pilot --image-map=/private/path/ingredient-ocr-image-map.json
node scripts/build-ingredient-ocr-queue.js --run --scope=full --image-map=/private/path/ingredient-ocr-image-map.json
```

By default OCR results are written to `.cache/ingredient-ocr/`, which is ignored by git.

Direct single-image usage:

```sh
swift scripts/vision-ocr.swift /private/path/to/panel.jpg
```

## Candy Wrapper Archive Visual Pass

The Candy Wrapper Archive lane has a repo-native collector for local visual previews:

```sh
npm run build:cwa-visuals
```

This fetches CWA source pages and candidate images into `.cache/ingredient-ocr/cwa/<run-id>/`, runs the Swift OCR harness, creates local crop previews, and writes the public-safe index:

- `docs/data/product-evidence/cwa_ingredient_visual_index.json`
- `source_family_timeline` inside `docs/data/product-evidence/navigator_data.json`

The public index stores source URLs, stable `visual_id` values, crop/OCR status, short candidate excerpts, and claim boundaries. It does not publish private paths, image pixels, raw OCR dumps, prompts, or downloaded source files. On localhost the navigator may request `/api/private/ingredient-crops/:visual_id`, which resolves through `.cache/ingredient-ocr/cwa/latest-private-manifest.json`.

## Flickr Package Archive Visual Pass

The first non-CWA expansion uses curated high-resolution Flickr package labels with readable ingredient or formula panels:

```sh
npm run build:flickr-visuals
```

This writes private source/crop artifacts under `.cache/ingredient-ocr/flickr/<run-id>/`, publishes `docs/data/product-evidence/flickr_ingredient_visual_index.json`, and merges a `Flickr Package Archive` lane into `source_family_timeline`. The public index carries source links, candidate text, status, and claim boundaries only. Local crop pixels are served through the same loopback-only `/api/private/ingredient-crops/:visual_id` endpoint when `.cache/ingredient-ocr/flickr/latest-private-manifest.json` exists.

## Claim Policy

OCR output is only a review candidate. It can move evidence from `label_visible` toward `ocr_extracted`, but no formulation claim is verified until a reviewer corrects the text, records attribution, and marks the label `manual_verified`.

## Future Run Playbook

The public full-corpus gap report is the handoff queue for future collection runs:

- `panel_capture_needed`: use the source URL to create a private crop of the visible ingredient or nutrition panel, then rerun the Swift harness.
- `readable_panel_photo_needed`: find a back-panel, side-panel, or higher-resolution package photo before OCR.
- `document_text_pipeline_needed`: for fast food and foodservice records, extract text from official PDFs, allergen pages, archived menus, or screenshots before treating them as package labels.
- `source_discovery_needed`: run targeted source discovery before OCR; there is no source object to process yet.
- `package_identity_review_needed`: confirm product identity, SKU, date cues, and package size before spending OCR effort.
