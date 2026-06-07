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

For the hybrid capture pipeline, prefer the run-scoped OCR command after the capture step has produced `.cache/ingredient-ocr/runs/<run-id>/image-map.json`:

```sh
node scripts/run-ingredient-ocr.js --run-id=hybrid-ocr-v1 --limit=250
node scripts/summarize-ingredient-ocr-run.js --run-id=hybrid-ocr-v1
```

`run-ingredient-ocr.js` keeps full OCR lines and private image paths under the ignored run directory. The public CSV contains only evidence IDs, OCR status, line counts, ingredient-signal counts, confidence, hashes, and candidate-only flags.

Direct single-image usage:

```sh
swift scripts/vision-ocr.swift /private/path/to/panel.jpg
```

## Claim Policy

OCR output is only a review candidate. It can move evidence from `label_visible` toward `ocr_extracted`, but no formulation claim is verified until a reviewer corrects the text, records attribution, and marks the label `manual_verified`.

## Future Run Playbook

The public full-corpus gap report is the handoff queue for future collection runs:

- `panel_capture_needed`: use the source URL to create a private crop of the visible ingredient or nutrition panel, then rerun the Swift harness.
- `readable_panel_photo_needed`: find a back-panel, side-panel, or higher-resolution package photo before OCR.
- `document_text_pipeline_needed`: for fast food and foodservice records, extract text from official PDFs, allergen pages, archived menus, or screenshots before treating them as package labels.
- `source_discovery_needed`: run targeted source discovery before OCR; there is no source object to process yet.
- `package_identity_review_needed`: confirm product identity, SKU, date cues, and package size before spending OCR effort.

## Hybrid Model Pipeline

The capture-to-OCR pipeline now separates bounded model work from high-stakes review:

- `gpt-5.3-codex-spark`: packet generation, capture strategy, crop targets, OCR structuring, and reviewer-note drafts.
- `gpt-5.5`: compact batch review and quality gates after OCR/Spark has reduced the data.
- Grok/xAI: source hunting, validation advice, missing vintage leads, and source-domain strategy.

All model outputs are assistive candidates. They cannot create `manual_verified`, cannot invent ingredient text, and cannot publish unverified formulation claims.

Default top-250 run:

```sh
npm run build:ingredient-ocr
node scripts/build-spark-ocr-packets.js --run-id=hybrid-ocr-v1 --limit=250 --packet-size=20
node scripts/capture-ingredient-ocr-assets.js --run-id=hybrid-ocr-v1 --limit=250 --no-network --dry-run
node scripts/model-assist-router.js --run-id=hybrid-ocr-v1 --limit=250 --no-network --max-grok-calls=0 --max-gpt55-batches=5
node scripts/summarize-ingredient-ocr-run.js --run-id=hybrid-ocr-v1
node scripts/build-capture-task-manifest.js --run-id=hybrid-ocr-v1
```

The capture dry run writes a public-safe image-map starter CSV. It contains evidence IDs, source URLs, crop targets, rights/publication policy, and accepted image-map keys, but leaves private path fields blank. Fill those paths in a private copy only.

Private image-map run:

```sh
cp docs/data/product-evidence/exports/hybrid_ocr_image_map_template.csv .cache/ingredient-ocr/runs/hybrid-ocr-v1/image-map-template.private.csv
# Use docs/data/product-evidence/exports/hybrid_ocr_capture_task_runbook.md to choose the first source pages and panel targets.
# Fill local_private_image_path or processed_private_image_path in the private copy.
node scripts/audit-image-map-template.js --run-id=hybrid-ocr-v1 --template=.cache/ingredient-ocr/runs/hybrid-ocr-v1/image-map-template.private.csv --public-audit-summary=docs/data/product-evidence/exports/hybrid_ocr_image_map_audit.csv --public-audit-json=docs/data/product-evidence/hybrid_ocr_image_map_audit.json
node scripts/build-image-map-from-template.js --run-id=hybrid-ocr-v1 --template=.cache/ingredient-ocr/runs/hybrid-ocr-v1/image-map-template.private.csv --output=.cache/ingredient-ocr/runs/hybrid-ocr-v1/image-map-input.json
node scripts/capture-ingredient-ocr-assets.js --run-id=hybrid-ocr-v1 --limit=250 --image-map=.cache/ingredient-ocr/runs/hybrid-ocr-v1/image-map-input.json
node scripts/run-ingredient-ocr.js --run-id=hybrid-ocr-v1 --limit=250
node scripts/summarize-ingredient-ocr-run.js --run-id=hybrid-ocr-v1
node scripts/build-ocr-structuring-packets.js --run-id=hybrid-ocr-v1 --packet-size=10
node scripts/import-ocr-candidate-extracts.js --run-id=hybrid-ocr-v1
```

`build-ocr-structuring-packets.js` writes OCR text only to private packet JSON files under `.cache/ingredient-ocr/runs/<run-id>/spark-packets/ocr-structuring/`. The public CSV/JSON expose packet counts, evidence IDs, model route, and signal counts only.

`import-ocr-candidate-extracts.js` reads private Spark/GPT review output from `.cache/ingredient-ocr/runs/<run-id>/gpt55-review/ocr-candidate-extracts.jsonl` by default and writes a public-safe candidate manifest. It rejects rows that try to mark `manual_verified`, rows without an evidence ID, rows with private paths, and rows whose candidate text is contradicted by supplied OCR lines. By default it publishes only field presence, hashes, confidence, review status, and rejection reasons; use `--publish-candidate-text` only when the public page should show clearly labeled candidate OCR text.

Grok-assisted source hunting, when explicitly enabled:

```sh
xai_api=... node scripts/model-assist-router.js --run-id=hybrid-ocr-v1 --gap-category=source_discovery_needed --max-grok-calls=3
```

Public rollups may include counts, statuses, hashes, model names, and blockers. They must not include external images, local file paths, API keys, private prompts, or unverified ingredient claims.
