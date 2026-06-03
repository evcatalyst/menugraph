# Historical Menu and Recipe Dataset Evaluation

Date: 2026-06-02

## 1. Executive Summary

The strongest production strategy is to treat NYPL What's on the Menu as the structured analytical spine, the CIA Menu Collection as the primary inference target, and LAPL/Cornell/UH/Northwestern/regional menu collections as external evidence layers. Recipe datasets should be integrated as enrichment and modeling corpora, not as direct row-level joins to historical menus.

Highest-leverage conclusions:

- NYPL is the only large public source with dish-level historical transcriptions and prices at scale. It should anchor dish timelines, price models, cuisine shifts, and supervised training.
- CIA is broader and richer as an archive, especially for ships, railroads, airlines, international coverage, donor clusters, and unknown-date problems, but it needs OCR/layout extraction and evidence-based dating.
- LAPL, Cornell, UH, Northwestern, UNLV, UW, Tulane, Denver, and Milwaukee fill gaps in region, venue type, transport, early-period calibration, and visual design evidence. Most are metadata/image sources rather than dish-level analytic tables.
- Dotlas is the best modern structured menu analogue, but access/licensing risk is material. Use it for contemporary menu-item structure, product categorization, and modern price baselines only after terms are clear.
- Recipe1M+, RecipeNLG, Food.com, Epicurious, Yummly, The Sifter, RecipeDB, FlavorDB, FoodKG, FoodOn, and USDA FoodData Central should form a dish/ingredient/nutrition/context layer. They are best used to train embeddings, infer ingredient proxies, classify cuisine, normalize dish aliases, and reconstruct likely modern analogues.
- The project should use a four-layer architecture: bronze raw capture, silver normalized provenance tables, gold analytical/model marts, and serving surfaces split into structured search, graph traversal, and semantic/vector retrieval.
- Unknown CIA dating should be an ensemble problem, not a single-model problem. Combine OCR date clues, sibling clustering, venue history, price anchors, dish co-occurrence, visual style embeddings, phone/postal/payment markers, and human review.

Grok use: A sanitized Grok call was run with only public dataset names and high-level project goals. It was used for architecture critique and roadmap validation. Grok reinforced the separation of graph truth/provenance from vector similarity, the priority of NYPL as the only large public dish/price spine, and the importance of attaching provenance to every derived node and edge.

## 2. Per-Dataset Evaluation Matrix

Scoring is 1-10. Risk is scored as "low operational/legal risk"; higher is safer/easier.

| Dataset | DQ | Access | Coverage | Unique Value | Integration Fit | ML Ready | Risk | Recommendation |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| CIA Menu Collection | 6 | 7 | 9 | 10 | 10 | 8 | 6 | Primary unknown-date target and broad archival base. Use CONTENTdm metadata/images/OCR, then enrich with NYPL and external evidence. |
| NYPL What's on the Menu / Buttolph | 9 | 9 | 9 | 10 | 10 | 10 | 9 | Core analytic spine. Use its Menu, MenuPage, MenuItem, and Dish tables as the training and price/dish backbone. |
| LAPL Menu Collection | 7 | 5 | 8 | 8 | 8 | 6 | 5 | Add for Los Angeles, California, transport, address/phone/date/cuisine fields, and design history. Web/database access is useful but not clean bulk. |
| Cornell Nestle/SHA Menu Collection | 7 | 4 | 8 | 8 | 8 | 6 | 5 | High-value hospitality and event metadata. Strong for design, occasion, courses, cuisine, and elite/fine-dining evidence; likely partial/manual ingest. |
| UH 1850s-1860s Hotel and Restaurant Menus | 8 | 7 | 3 | 9 | 7 | 7 | 8 | Small but excellent mid-19th-century anchor. Use for early date calibration and hotel/steamship dish vocabulary. |
| Northwestern Transportation Library Menu Collection | 7 | 8 | 5 | 8 | 8 | 7 | 7 | Best transport-focused supplement. API/IIIF support makes it unusually pipeline-friendly for image and metadata ingest. |
| UNLV Menus: The Art of Dining | 7 | 5 | 6 | 7 | 7 | 6 | 5 | Strong design/facet source, especially 1870s-1930s menus and visual culture. Use after core sources. |
| UW Menus Collection | 6 | 5 | 5 | 7 | 6 | 5 | 6 | Useful Pacific Northwest and transport/local coverage, 1889-2003. Good regional evidence, not primary training. |
| Tulane Louisiana Menu Collection | 6 | 5 | 5 | 8 | 7 | 5 | 6 | High-value Louisiana/Creole/Cajun/regional evidence. Use for cuisine timelines and local entity resolution. |
| Denver Public Library Menu Collection | 6 | 4 | 5 | 7 | 6 | 4 | 5 | Rocky Mountain/Denver coverage, useful for regional price and venue history; likely higher ingest effort. |
| Milwaukee Public Library Historic Menus | 5 | 4 | 4 | 6 | 5 | 4 | 5 | Useful local complement. Ingest selectively for venue and regional examples. |
| Dotlas structured menu dataset | 9 | 4 | 8 | 9 | 9 | 8 | 4 | Excellent modern structured benchmark. Use only after licensing and Databricks/AWS access are settled. |
| Recipe1M+ | 8 | 5 | 8 | 8 | 8 | 9 | 5 | Best multimodal recipe/image corpus for food embeddings and dish-image linkage. Research/noncommercial diligence required. |
| RecipeNLG | 8 | 6 | 9 | 8 | 8 | 8 | 5 | Best large text recipe corpus for ingredient/entity extraction and recipe-style embeddings. Noncommercial terms must be respected. |
| Food.com Recipes and Interactions | 8 | 8 | 7 | 8 | 8 | 8 | 6 | Best recipe plus behavior corpus. Use for popularity, ratings, review language, and modern dish variation. |
| Epicurious Kaggle | 7 | 6 | 4 | 6 | 6 | 6 | 4 | Useful nutrition proxy and tag set; small and scraped. Keep enrichment-only and rights-flagged. |
| Yummly What's Cooking | 9 | 7 | 4 | 7 | 7 | 8 | 5 | Clean ingredient-list plus cuisine-label classifier seed. Great for cuisine classification, not broad historical analysis. |
| The Sifter | 8 | 7 | 10 | 9 | 9 | 7 | 8 | Best historical cookbook/recipe metadata partner. Use for historical ingredient/technique references and bibliographic provenance, not full recipe text. |

## 3. Dataset Notes

### CIA Menu Collection

Public descriptions report over 40,000 historical menus, all U.S. states, 80+ countries, and ship/rail/air coverage. It is valuable because it overlaps the exact inference target: dated and unknown-dated historical menus with images, donors, venues, menu types, countries, and OCR/full-text paths. It is weaker than NYPL for structured dish rows and prices. Integration should prioritize normalized metadata, image/page references, OCR text, donor/source-family clusters, and explicit date-evidence extraction.

### NYPL What's on the Menu / Buttolph

NYPL reports that the retired WOTM project transcribed 1,335,570 dishes from 17,562 menus, while the Kaggle snapshot exposes four files: Menu, MenuPage, MenuItem, and Dish. It is the best training set for dish occurrence, price extraction, price normalization, menu-page joins, and date-supervised models. Weaknesses include frozen data, crowd transcription noise, inconsistent dish aliases, incomplete geography, retired API, and image rights that must be checked separately from the CC0 data.

### LAPL

LAPL exposes a searchable database of menus from Los Angeles, other cities, steamships, airlines, and banquets. Records include restaurant address and telephone number, date, cuisine type, meal, and price range. This is high-signal for dating because phone/address formats and local restaurant history are useful external evidence. Lack of public bulk export makes it a medium-effort source.

### Cornell Nestle/SHA

Cornell's finding aid describes over 10,000 menus from 1851 to about 1990. The 1991 Cornell article is especially useful methodologically: its fields included host/restaurant, occasion, location, condition, language, cuisine, meal, number of courses, toasts, guest list, program, illustration, binding, printer, and comments. That metadata model should inform this project's silver schema. Cornell is high-value but less immediately ingestable than NYPL.

### UH 1850s-1860s

The UH collection contains 81 items, mostly explicitly dated hotel, restaurant, and steamship menus. Its size is small, but its time slice is rare and important for early vocabulary, dish ordering conventions, hotel/steamship menus, and Civil War-era calibration.

### Northwestern Transportation Library

Northwestern reports over 900 menus from 54 airline, cruise, and railroad carriers, dating from 1929 to the present, with a focus on mid-to-late 20th-century air transport. Its API and digital collections tooling make it attractive for automated ingest. Use it for transport-menu priors, visual identity/style dating, and carrier/route context.

### Regional Collections

UNLV, UW, Tulane, Denver, Milwaukee, and similar collections are not replacements for NYPL/CIA. They should be external evidence layers. They add regional restaurants, local cuisine terms, address/phone clues, event types, and visual design examples. Ingest them after the source registry and normalized schema are stable.

### Dotlas

Dotlas provides modern item-level restaurant menu data linked to verified restaurant IDs, categories, standardized product names, prices, and optional time-series/menu-event products. It is valuable as a modern schema and extraction-quality benchmark. It is not historical, not open, and should not be mixed with historical collections without explicit temporal and rights flags.

### Recipe Datasets

Recipe1M+ provides multimodal text/image training material. RecipeNLG adds large-scale cleaned recipe text and NER-like food entities. Food.com adds user interaction and popularity signals. Epicurious adds ratings/nutrition/tags at small scale. Yummly adds a clean cuisine-classification benchmark. The Sifter adds historical cookbook/manuscript metadata and exportable search results, but not full recipe texts. These should enrich canonical dishes and ingredients, not become direct menu rows.

## 4. Recommended Four-Layer Architecture

### Bronze: Raw, Immutable Capture

Store source-native data without interpretation:

- Original CSV/JSON/XML/EAD/IIIF/CONTENTdm payloads.
- Image URLs, manifests, thumbnails, OCR files, and checksums.
- Scrape/API request manifests with timestamps and request parameters.
- Rights/terms snapshots and source-specific notes.
- Raw Grok/LLM prompts and responses only when the source registry marks content as safe to export.

Storage: object storage or local data lake, partitioned by `source_id`, `ingest_date`, and `artifact_type`.

### Silver: Normalized, Provenance-First Tables

Core entities:

- `source_registry`
- `collection_item`
- `menu`
- `menu_page`
- `venue`
- `canonical_venue`
- `dish_mention`
- `canonical_dish`
- `price_observation`
- `date_evidence`
- `image_feature`
- `ocr_text`
- `embedding`
- `recipe`
- `ingredient`
- `technique`
- `nutrition_proxy`
- `entity_link`

Every row should include `source_id`, `source_record_id`, `provenance_json`, `extraction_method`, `confidence`, `created_at`, and `rights_category` where relevant.

### Gold: Analytics and Model Marts

Build derived tables for:

- Menu dating features and labels.
- Dish timelines and alias clusters.
- Price normalization and CPI/FX/context-adjusted bands.
- Venue/restaurant canonical clusters.
- Cuisine/style/topic time series.
- Visual typography/layout clusters.
- Ingredient and nutrition proxy mappings.
- Source quality and rights dashboards.

### Serving Layer

Expose three query surfaces:

- Structured/faceted: DuckDB/Postgres for filters, dashboards, exports, and reproducible analytics.
- Graph traversal: Kuzu or Neo4j for menu-venue-dish-date-evidence-provenance paths.
- Semantic/vector: pgvector, Qdrant, or Weaviate for menu similarity, dish alias discovery, image/style similarity, and RAG.

Do not force graph and vectors into one system. Use graph edges for auditable claims and vector neighbors for candidate generation.

## 5. Background OCR Enrichment Architecture

The project should add a local-first background enrichment layer that steadily converts menu images and OCR text into value-added structured data: dish mentions, dish sections, price observations, date evidence, layout/style features, confidence scores, and triage queues. This should run mostly on the Mac mini, with external Grok/LLM calls reserved for difficult or high-value cases.

### Why Local-First

Local processing is the cheapest scalable path. Most menus do not need external vision models if the task is OCR cleanup, price regex extraction, page quality scoring, line clustering, or dish-section detection. External models should be treated as scarce adjudicators, not the default OCR engine.

Current sizing anchors from the local snapshot:

- NYPL: 17,547 menus with 61,138 known page images, about 3.48 pages per menu.
- CIA: 6,011 menu records.
- CIA unknown year/decade: 2,549 menu records.
- Estimated CIA page images if it averages like NYPL: about 20,900 pages.
- Estimated unknown-date CIA page images at the same average: about 8,900 pages.
- Current combined local page-image workload: at least 67,000 images if CIA is one image per record; about 82,000 images if CIA averages like NYPL.

These counts should be treated as planning estimates until the CIA compound-object/page manifest is measured directly.

### Tiered Enrichment Flow

Use a tiered queue. Each tier writes artifacts, confidence, cost, and runtime to the silver layer.

| Tier | Processor | Input | Output | Route |
|---|---|---|---|---|
| 0 | Metadata/text parser | Existing metadata, existing OCR | date clues, venue clues, donor clusters, price regex, keyword sections | Run all records first |
| 1 | Local OCR/layout | Menu page images | OCR text, line boxes, page quality, table/section candidates | Default image path |
| 2 | Local extraction model | OCR plus page thumbnails | dish mentions, price observations, meal sections, confidence | Run when Tier 1 text is usable |
| 3 | Local vision/embedding | images and OCR text | style vectors, layout clusters, typography/design decade features | Run on dated training set plus unknowns |
| 4 | External LLM/VLM | sanitized crop/page/snippet | hard OCR repair, ambiguous price parsing, dish/date adjudication | Only high-value or hard cases |
| 5 | Human review | evidence bundle | accepted/rejected date/entity/price claims | Only conflicts and high-impact cases |

Recommended local tools to benchmark:

- OCR: Tesseract, PaddleOCR, docTR, Surya OCR, or Apple Vision where available.
- Layout/quality: OpenCV, scikit-image, layoutparser-style segmentation, page skew/contrast/blur heuristics.
- Local LLM/VLM: Ollama or MLX-compatible small models for JSON extraction from OCR text; avoid sending images externally by default.
- Embeddings: sentence-transformers for text; CLIP/DINO/Florence-style image embeddings for design/style similarity.

### Difficulty and Value Scoring

Every page/menu should receive two scores:

- `difficulty_score`: OCR confidence low, blur/skew/low contrast, dense layout, multiple columns, handwritten/decorative fonts, non-English text, price regex ambiguity, conflicting date clues, no existing transcript.
- `value_score`: unknown date, known rare decade, high menu-item density, many potential prices, important source/venue/donor, transport menu, regional gap, high similarity to known dated examples, strong atlas interest.

Then route by policy:

```text
external_priority = value_score * difficulty_score

local_only:
  difficulty < 0.45 or value < 0.35

local_retry:
  difficulty 0.45-0.70 and value < 0.70

external_llm:
  difficulty >= 0.70 and value >= 0.60

human_review:
  conflicting high-confidence evidence or external_llm confidence < threshold
```

### Cost Model

Provider prices change, so costs should live in a versioned `provider_price_snapshot` table or YAML file, not hard-coded. OpenAI documents that image inputs are converted to tokens and charged as token input, and that image token counts vary by model and image size. The project should therefore calculate costs from measured image dimensions, selected model, input token rate, output token estimate, and batch discounts where available.

Cost formula:

```text
page_cost =
  (image_input_tokens * input_price_per_1m / 1_000_000) +
  (text_input_tokens * input_price_per_1m / 1_000_000) +
  (output_tokens * output_price_per_1m / 1_000_000)
```

Planning examples for the current estimated 82,000 page workload:

| External route share | Cheap model at $0.002/page | Mid model at $0.010/page | High model at $0.050/page |
|---:|---:|---:|---:|
| 5% routed externally | about $8 | about $41 | about $205 |
| 15% routed externally | about $25 | about $123 | about $615 |
| 100% external all-pages | about $164 | about $820 | about $4,100 |

The target operating point should be 5-15% external routing after local enrichment. The first production guardrail should be a hard monthly budget and a per-source/per-run cap.

### Progressive Early Runs

Run enrichment progressively so each pass improves the next one:

1. Calibration sample: 200 known-date NYPL pages, 200 known-date CIA pages, 200 unknown-date CIA pages. Goal: benchmark OCR, price extraction, dish extraction, and date-evidence quality.
2. Unknown-first local pass: all 2,549 unknown-year/decade CIA records. Goal: generate OCR confidence, price/dish candidates, and difficulty/value scores.
3. External pilot: top 250-500 unknown CIA pages by `external_priority`. Goal: estimate true external lift per dollar before scaling.
4. Known-date training expansion: balanced dated menus across decades/sources. Goal: train visual/layout/style and text/date models.
5. Full CIA local pass: all 6,011 CIA records. Goal: enriched value layer over the core inference target.
6. Current combined corpus pass: all local CIA plus NYPL page references. Goal: static graph overlay and cross-source analytics.
7. External source expansion: LAPL, Cornell, UH, Northwestern, UNLV, UW, Tulane, Denver, Milwaukee. Goal: add evidence breadth after the pipeline is measured.

### Static Graph and Data Overlay

The background enricher should publish derived static artifacts alongside existing MenuGraph data:

- `docs/data/enrichment-status.json`: per-menu/page enrichment stage, confidence, last run, next action.
- `docs/data/ocr-spans.json`: bounded, compressed OCR spans and line-level confidence.
- `docs/data/dish-mentions.json`: extracted raw dishes, canonical candidates, section labels, confidence.
- `docs/data/price-observations.json`: printed price, parsed amount, currency, scale, confidence, context.
- `docs/data/triage-queue.json`: pages/menus ranked for external LLM or human review.
- `docs/data/graph-overlay.json`: new nodes/edges for date evidence, dish mentions, prices, and enrichment runs.

UI overlays should show:

- Enrichment status: raw, OCR complete, locally extracted, externally adjudicated, human reviewed.
- Extracted dish/price chips with confidence.
- Date evidence timeline with source and method.
- Similar dated menus by text, price, dish, and visual style.
- Triage reason: why this menu was routed or deferred.

This makes enrichment visible as a value-added layer without corrupting source metadata. Original collection data remains immutable; every enrichment is a derived, reversible claim.

## 6. Prioritized Methods

### A. Dating Unknown CIA Menus

1. Build a supervised baseline from NYPL and known-date CIA menus.
2. Create weak estimators:
   - OCR date regex and two-digit year disambiguation.
   - Phone, postal, payment-card, URL/email, and typography markers.
   - Price similarity to NYPL by dish category, cuisine, geography, and currency.
   - Dish co-occurrence and first/last observed dish signals.
   - Venue sibling clustering and donor/source-family clustering.
   - External venue history from city directories, newspaper ads, Wikidata, GeoNames, OSM, and collection metadata.
   - Visual embeddings for design, typography, page ratio, illustration style, and color.
3. Combine estimators into intervals with calibrated confidence grades.
4. Use human review for conflicts and high-impact uncertain estimates.

### B. Trend Analysis and Enrichment

1. Use NYPL MenuItem prices as the structured price backbone.
2. Extract CIA/LAPL/Cornell/regional prices from OCR only with confidence bands.
3. Normalize prices into separate columns: printed amount, source currency, normalized local index, USD estimate, today-indexed estimate, and caveats.
4. Link canonical dishes to recipe clusters and ingredients for ingredient evolution.
5. Add nutrition proxies only as approximate enrichment, never as exact historical claims.

### C. Unified Knowledge Atlas

Graph-first questions:

- Which venues served shrimp cocktail before 1950?
- Which menus contain early evidence of tiki, Creole, Chinese-American, or airline dining patterns?
- Which unknown CIA menus are most similar to dated NYPL/LAPL/Cornell menus by dish, price, and style?
- Which cookbook ingredients in The Sifter precede or follow menu appearances?

Vector-first tasks:

- Similar menu retrieval.
- Dish alias clustering.
- OCR error repair candidates.
- Image/style dating.
- Recipe analogue suggestions.

### D. Multi-Agent Automation

Recommended agents:

- Source profiler: reads source registry and proposes ingest plan.
- Ingest agent: fetches metadata/images with rate limits and checksums.
- OCR/layout agent: extracts page text, table-like structures, prices, and bounding boxes.
- Entity-linking agent: proposes canonical venues/dishes and flags merge conflicts.
- Date-evidence agent: emits date hypotheses with source-backed evidence.
- Rights agent: blocks unsafe export/use and populates public/restricted flags.
- Evaluation agent: runs holdouts, calibration reports, and ablations.
- Contribution agent: prepares cleaned metadata to contribute back to sources such as The Sifter where allowed.

Grok usage should be limited to sanitized, minimal, rights-cleared snippets. Cache all prompts, responses, model names, and source row IDs.

## 7. Phased Roadmap

### Short Term: 2-6 weeks

- Create `source_registry.yml`.
- Normalize current CIA and NYPL snapshots into silver tables.
- Add a canonical dish and canonical venue seed layer.
- Create date-estimation holdout split from known-date records.
- Add enrichment job tables, provider price snapshots, and local queue state.
- Run the calibration enrichment sample and unknown-first local CIA pass.
- Implement baseline text/metadata/date estimators.
- Add Food.com/Yummly/Epicurious as non-public-serving enrichment sandboxes.

### Medium Term: 2-4 months

- Add LAPL, Cornell, UH, Northwestern, UNLV, UW, Tulane, and Denver source manifests.
- Implement IIIF/CONTENTdm adapters where available.
- Add OCR/layout extraction and confidence scoring.
- Add triage routing for local retry, external LLM/VLM, and human review.
- Train dish-name and menu-text embeddings using NYPL plus recipe corpora.
- Add visual feature extraction for dated menus.
- Build Kuzu/Neo4j graph export and pgvector/Qdrant vector index.

### Long Term: 4-12 months

- Ensemble date model with calibration and review UI.
- The Sifter integration for historical cookbook metadata.
- Dotlas integration if license/access terms support project goals.
- Agentic research loop for venue history and newspaper/city-directory validation.
- Public atlas with structured facets, graph paths, semantic search, and source-provenance panels.

## 8. Sample Schemas and Code

### Source Registry YAML

```yaml
sources:
  nypl_wotm:
    name: "NYPL What's on the Menu"
    type: "historical_menu_structured"
    access_method: "static_csv"
    license: "CC0 for dataset; images follow NYPL item rights"
    bulk_available: true
    rights_category: "open_metadata_mixed_images"
    grok_safe_default: false
    refresh_cadence: "frozen_or_manual"
    priority: 1
  cia_menu_collection:
    name: "CIA Menu Collection"
    type: "historical_menu_images_metadata"
    access_method: "CONTENTdm"
    license: "source_item_rights"
    bulk_available: "api_paginated"
    rights_category: "mixed"
    grok_safe_default: false
    refresh_cadence: "monthly"
    priority: 1
```

### Silver Tables

```sql
create table source_registry (
  source_id text primary key,
  name text not null,
  source_type text not null,
  access_method text not null,
  license text,
  rights_category text not null,
  grok_safe_default boolean not null default false,
  bulk_available boolean,
  last_ingested_at timestamp,
  terms_url text,
  manifest_json jsonb not null default '{}'
);

create table menu (
  menu_id text primary key,
  source_id text references source_registry(source_id),
  source_record_id text not null,
  title text,
  date_text text,
  year int,
  lower_year int,
  upper_year int,
  date_confidence text,
  venue_id text,
  menu_type text,
  cuisine_tags text[],
  language text,
  provenance_json jsonb not null default '{}',
  unique(source_id, source_record_id)
);

create table dish_mention (
  mention_id text primary key,
  menu_id text references menu(menu_id),
  page_id text,
  raw_name text not null,
  normalized_name text,
  canonical_dish_id text,
  section_name text,
  bbox_json jsonb,
  extraction_method text not null,
  confidence numeric,
  provenance_json jsonb not null default '{}'
);

create table date_evidence (
  evidence_id text primary key,
  menu_id text references menu(menu_id),
  method text not null,
  lower_year int,
  upper_year int,
  point_year int,
  confidence text check (confidence in ('A','B','C','D','X')),
  evidence_json jsonb not null default '{}',
  source_id text references source_registry(source_id),
  created_at timestamp default now()
);

create table provider_price_snapshot (
  snapshot_id text primary key,
  provider text not null,
  model text not null,
  input_price_per_1m numeric not null,
  output_price_per_1m numeric not null,
  image_pricing_notes text,
  source_url text not null,
  effective_at timestamp not null,
  captured_at timestamp default now()
);

create table enrichment_job (
  job_id text primary key,
  menu_id text references menu(menu_id),
  page_id text,
  source_id text references source_registry(source_id),
  tier int not null,
  status text not null,
  processor text not null,
  input_artifact_uri text,
  output_artifact_uri text,
  difficulty_score numeric,
  value_score numeric,
  external_priority numeric,
  estimated_cost_usd numeric,
  actual_cost_usd numeric,
  started_at timestamp,
  finished_at timestamp,
  error_text text,
  provenance_json jsonb not null default '{}'
);

create table triage_decision (
  decision_id text primary key,
  menu_id text references menu(menu_id),
  page_id text,
  decision text not null,
  reason_codes text[] not null,
  difficulty_score numeric not null,
  value_score numeric not null,
  recommended_processor text,
  budget_bucket text,
  created_at timestamp default now()
);
```

### Date Hypothesis Dataclass

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

Confidence = Literal["A", "B", "C", "D", "X"]

@dataclass
class DateHypothesis:
    menu_id: str
    method: str
    lower: int | None
    upper: int | None
    point: int | None
    confidence: Confidence
    evidence: dict
    source: str
    created_at: datetime = field(default_factory=datetime.utcnow)

    def interval_width(self) -> int | None:
        if self.lower is None or self.upper is None:
            return None
        return self.upper - self.lower + 1
```

### Ensemble Aggregator Sketch

```python
def combine_date_hypotheses(hypotheses: list[DateHypothesis]) -> DateHypothesis:
    weights = {"A": 1.0, "B": 0.75, "C": 0.45, "D": 0.2, "X": 0.0}
    usable = [h for h in hypotheses if h.confidence != "X" and h.lower and h.upper]
    if not usable:
        return DateHypothesis("unknown", "ensemble", None, None, None, "X", {"reason": "no usable evidence"}, "system")

    years: dict[int, float] = {}
    for h in usable:
        width = max(1, h.upper - h.lower + 1)
        for year in range(h.lower, h.upper + 1):
            years[year] = years.get(year, 0.0) + weights[h.confidence] / width

    ranked = sorted(years.items(), key=lambda item: item[1], reverse=True)
    point = ranked[0][0]
    total = sum(years.values())
    selected, acc = [], 0.0
    for year, score in ranked:
        selected.append(year)
        acc += score
        if acc / total >= 0.8:
            break

    lower, upper = min(selected), max(selected)
    confidence = "B" if len(usable) >= 3 and upper - lower <= 10 else "C"
    return DateHypothesis(
        menu_id=usable[0].menu_id,
        method="ensemble",
        lower=lower,
        upper=upper,
        point=point,
        confidence=confidence,
        evidence={"inputs": [h.__dict__ for h in usable]},
        source="date_ensemble_v1",
    )
```

### Date Evaluation Harness Outline

```python
def evaluate_date_model(records, predict_fn):
    rows = []
    for record in records:
        if record.year is None:
            continue
        pred = predict_fn(record.without_date())
        covered = pred.lower is not None and pred.upper is not None and pred.lower <= record.year <= pred.upper
        mae = abs(pred.point - record.year) if pred.point is not None else None
        rows.append({
            "menu_id": record.menu_id,
            "true_year": record.year,
            "point_year": pred.point,
            "lower": pred.lower,
            "upper": pred.upper,
            "confidence": pred.confidence,
            "covered": covered,
            "mae": mae,
            "method": pred.method,
        })
    return summarize_date_metrics(rows)
```

### Safe Grok Prompt Template

```text
You are reviewing sanitized historical menu date evidence.
Do not infer beyond the provided evidence.
Return JSON only with: candidate_interval, confidence, reasons, conflicts, next_best_evidence.

Menu snippet:
{sanitized_ocr_excerpt}

Known extracted signals:
{date_evidence_json}

Comparable dated examples:
{small_rights_cleared_examples}
```

## 9. Risks, Mitigations, and Success Metrics

### Risks

- Licensing and reuse: recipe datasets and commercial menu data often have noncommercial, unknown, or contractual limits.
- Rights drift: metadata may be open while images are restricted.
- OCR/layout errors: historical typography, multilingual menus, decorative layouts, and damaged paper reduce extraction reliability.
- Entity-resolution overmerge: "chicken salad" or "Welsh rarebit" can change meaning over time.
- Temporal bias: surviving collections overrepresent hotels, fine dining, urban areas, donors, transport, and special events.
- False precision: unknown-date menus should not be forced into single years without evidence.
- External model export: Grok/LLM use must be controlled by source-level export flags.

### Mitigations

- Source registry as mandatory ingestion gate.
- Separate raw, normalized, and derived claims.
- Store confidence and provenance on every extracted and inferred row.
- Use confidence intervals and calibration plots for dates.
- Human review queues for high-impact merges and date claims.
- Rights-aware public exports.
- Version canonical entities and allow unmerge operations.

### Success Metrics

- Date model: mean absolute error, median absolute error, interval coverage, interval width, decade accuracy, calibration by confidence grade.
- Entity resolution: precision/recall on hand-labeled venue and dish links, merge rollback rate, reviewer agreement.
- OCR/layout: character error rate, word error rate, price extraction F1, dish mention F1, section detection F1.
- Trend validity: reproducibility from raw provenance, sensitivity to source exclusion, confidence bands by decade/source.
- Atlas usability: query latency, successful graph path explanations, source citation coverage, human review throughput.

## 10. Additional High-Value Sources and Gaps

Add next:

- USDA FoodData Central for nutrition grounding.
- FoodOn for ingredient ontology.
- Wikidata, GeoNames, OpenStreetMap, city directories, and Sanborn maps for venues and addresses.
- Chronicling America, Newspapers.com/library-access papers, and local newspaper archives for restaurant date bounds.
- Internet Archive, HathiTrust, MSU Feeding America, Iowa cookbooks, Virginia Tech culinary history collections, and CoReMa for historical recipe/cookbook context.
- RecipeDB, FlavorDB, and FoodKG for computational gastronomy patterns, ingredient mappings, nutrition, substitutions, and flavor relations.

Key gaps:

- Non-U.S. and non-English historical menus.
- Pre-1850 menu coverage.
- Low-cost licensed modern menu data.
- Ground-truth labeled historical OCR/layout datasets.
- Clear public benchmarks for historical menu date estimation.

## 11. Sources Consulted

- CIA Menu Collection: https://ciadigitalcollections.culinary.edu/digital/collection/p16940coll1
- CIA/New York Heritage summary: https://nyheritage.org/collections/culinary-institute-america-menu-collection
- NYPL What's on the Menu: https://www.nypl.org/research/support/whats-on-the-menu
- NYPL Kaggle WOTM: https://www.kaggle.com/datasets/nypl/whats-on-the-menu
- LAPL Menu Collection: https://www.lapl.org/collections-resources/visual-collections/menu-collection
- Cornell Menu Collection finding aid: https://rmc.library.cornell.edu/EAD/htmldocs/RMM06452.html
- Cornell "Menus: Their use and collection in an academic library": https://crln.acrl.org/index.php/crlnews/article/view/23682/31029
- UH 1850s and 1860s menus: https://digitalcollections.lib.uh.edu/collections/g158bj49n
- Northwestern Transportation Library Menu Collection: https://www.library.northwestern.edu/libraries-collections/distinctive-special-collections/transportation-library/collection/transportation-library.html
- Northwestern Digital Collections API: https://api.dc.library.northwestern.edu/docs/v2/
- Dotlas Restaurant Menus: https://catalog.dotlas.com/restaurants/menus/
- Recipe1M+ paper: https://arxiv.org/abs/1810.06553
- RecipeNLG paper: https://aclanthology.org/2020.inlg-1.4/
- RecipeNLG dataset card: https://huggingface.co/datasets/mbien/recipe_nlg
- Food.com interactions paper: https://aclanthology.org/D19-1613/
- The Sifter: https://thesifter.org/
- The Sifter tutorial/FAQ: https://thesifter.org/Home/TutorialFAQ
- RecipeDB: https://pmc.ncbi.nlm.nih.gov/articles/PMC7687679/
- FlavorDB: https://pmc.ncbi.nlm.nih.gov/articles/PMC5753196/
- FoodKG overview: https://foodkg.github.io/foodkg.html
- Yummly/Kaggle derived statistics: https://zenodo.org/records/10157609
- LAPL/TESSA collection note: https://tessa.lapl.org/c10
- University of Washington menus: https://content.lib.washington.edu/menusweb/
- Denver Public Library menu collection article: https://history.denverlibrary.org/news/denver/dpls-illustrious-menu-collection
- Tulane Louisiana menu collection article: https://news.tulane.edu/news/more-you-nola-whats-menu
- OpenAI API pricing and image-token notes: https://openai.com/api/pricing/
- OpenAI Images and Vision guide: https://developers.openai.com/api/docs/guides/images-vision
