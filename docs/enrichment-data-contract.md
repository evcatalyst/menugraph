# Enrichment Data Contract

This contract defines how future OCR, local ML, external LLM, and human-review enrichment should contribute structured data to MenuGraph without forcing schema rewrites.

## Principle

Source collection records are immutable. Enrichment produces derived claims. Every derived claim must point back to:

- `source_registry.source_id`
- `menu.menu_id`
- optionally `menu_page.page_id`
- optionally `extracted_text_span.span_id`
- `extraction_run.extraction_run_id`
- confidence, method, and provenance JSON

The enricher should never overwrite source metadata directly. It should write new rows or supersede previous derived rows through versioned extraction runs.

## Future Enricher Write Targets

| Enricher output | Required table | Notes |
|---|---|---|
| OCR line or block | `extracted_text_span` | Keep compact text spans. Do not cache full images unless routed to review. |
| Dish candidate | `dish_mention` | Include raw name, normalized name, section, method, confidence. |
| Price candidate | `price_observation` | Include raw price text, parsed amount, scale, currency, confidence. |
| Date clue | `date_evidence` | Include interval/point year, method, confidence, hard-bound flag. |
| Layout/style feature | `image_feature` | Store scalar features locally and large vectors by reference. |
| OCR routing candidate | `extraction_run` metrics or queue artifact | Store page counts, difficulty, expected yield, and route; no OCR text or image blobs. |
| Text/image vector | `embedding` | Store vector references, not giant blobs in static JSON. |
| Canonical link | `entity_link` | Use candidate links before changing canonical dish/venue entities. |
| Review decision | `entity_link` or evidence row update | Preserve machine output and reviewer decision. |

## Minimal OCR Enricher Output

For each processed page, the local OCR enricher should emit JSON like:

```json
{
  "extraction_run": {
    "processor_name": "local_ocr_enricher",
    "processor_version": "0.1.0",
    "processor_type": "local_ocr_layout",
    "run_tier": 1,
    "local_only": true
  },
  "menu_id": "cia:1234",
  "page_id": "cia:1234:p1",
  "text_spans": [
    {
      "span_type": "line",
      "text": "Broiled Lobster 1.25",
      "line_number": 42,
      "bbox": {"x": 120, "y": 640, "w": 520, "h": 34},
      "ocr_confidence": 0.86
    }
  ],
  "dish_mentions": [
    {
      "raw_name": "Broiled Lobster",
      "normalized_name": "broiled lobster",
      "section_name": "fish",
      "dish_type": "seafood",
      "confidence": 0.81,
      "span_ref": 0
    }
  ],
  "price_observations": [
    {
      "raw_price_text": "1.25",
      "amount": 1.25,
      "currency_symbol": "$",
      "price_scale": "decimal_dollars",
      "confidence": 0.84,
      "dish_ref": 0,
      "span_ref": 0
    }
  ],
  "date_evidence": []
}
```

## Routing Rules

Local processing is the default. External LLM/VLM routing is allowed only when the source registry permits it and the payload is sanitized.

Use this order:

1. Metadata/date parser.
2. Local OCR/layout.
3. Local dish/price/date extraction.
4. Local confidence scoring and candidate linking.
5. External adjudication for high-value hard cases only.
6. Human review for conflicts or important low-confidence claims.

## Static Overlay Rules

The static app should publish compact derived overlays, not raw processing artifacts:

- publish dish/price/date evidence with source links and confidence
- publish enrichment status and next action
- publish graph edges for derived claims
- avoid publishing large OCR dumps
- avoid publishing image crops unless rights-cleared

Recommended static artifacts:

- `docs/data/enrichment-status.json`
- `docs/data/enrichment/ocr-triage-queue.json`
- `docs/data/dish-mentions.json`
- `docs/data/price-observations.json`
- `docs/data/date-evidence-overlay.json`
- `docs/data/graph-overlay.json`

These files should be generated from silver tables, not hand-maintained.

## Versioning

Each model or OCR processor run gets a new `extraction_run` row. If a later run improves a claim, keep the older row and mark the newer row as the preferred current claim in the gold layer or static overlay. This preserves auditability and makes model comparison possible.
