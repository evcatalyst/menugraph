# MenuGraph

MenuGraph is a deployable prototype for exploring historical menu collections as a visual knowledge base.

The app uses a committed snapshot of the public CONTENTdm API for the CIA Menu Collection (`p16940coll1`) and a derived snapshot from NYPL's public What's on the Menu? export. It supports:

- Source filtering across CIA, NYPL, all records, and cross-source matches.
- A time lens for menu formats across source and estimated years.
- Place, type, and collector/source lineage lenses.
- Local filtering across the loaded collection.
- Remote transcript/metadata search through CONTENTdm.
- On-demand item detail with images, page thumbnails, OCR text, source links, and cross-source evidence.
- A culinary ontology index for meals, dishes, ingredients, beverages, styles, and discovered clusters, with NYPL dish transcription signals.
- A price lens for extracted menu prices, conservative confidence bands, and today-indexed relative value signals.
- A bottom activity rail that reports archive loading, OCR search, transcript indexing progress, current menu titles, and ontology coverage.

## Run Locally

```bash
npm run dev
```

Open `http://127.0.0.1:4173`.

The Node server is optional local tooling. The deployable app is the static site in `docs/`, which can be hosted by GitHub Pages.

## Deploy

This repository is configured for GitHub Pages from the `main` branch and `/docs` folder.

The published URL is:

```text
https://evcatalyst.github.io/menugraph/
```

Regenerate the committed Pages snapshot with:

```bash
npm run build:data
```

## Data Strategy

The CIA collection is exposed through CONTENTdm's read-only web services. MenuGraph uses `dmQuery` to page through all public records, then merges several five-field metadata passes because CONTENTdm limits each query response to five returned fields. Item detail is loaded only when a user selects a record.

NYPL What's on the Menu? is ingested from the public CSV export in `.cache/nypl/extract` when available. The raw CSVs are not committed; the build writes bounded derived artifacts:

- `docs/data/menus.json` for normalized CIA and NYPL menu records with stable IDs such as `cia:1812` and `nypl:21075`.
- `docs/data/matches.json` for explainable cross-source venue candidates.
- `docs/data/analytics.json` for NYPL-backed dish and price trend aggregates.
- `docs/data/date-estimates.json` for conservative estimated-date evidence on weakly dated records.

The Pages build reads committed snapshots from `docs/data/menus.json`, `docs/data/ontology.json`, `docs/data/matches.json`, and related static artifacts, then tries live CONTENTdm calls only for enhancement paths such as full record OCR. The local Node server remains useful as a development proxy because command-line clients and some browser contexts reject the archive certificate chain, but it is not required for hosting the core interface.

Price trends are generated into `docs/data/prices.json` from a stratified OCR transcript sample. The build also snapshots reference inputs under `docs/data/reference/`: BLS CPI-U for U.S. today-value estimates, World Bank country CPI for local relative indexes, a Federal Reserve H.10 metadata placeholder for future FX conversion, and curated context events for subtle historical caveats. These values are estimates, not exact historical purchasing-power claims.

## Ontology Index

MenuGraph builds an instant metadata-derived ontology from titles, places, cuisine terms, menu types, and collection metadata. The committed Pages ontology includes a small OCR-backed transcript sample. The in-app `Index Text` control can enrich that index further when the browser can reach the live CONTENTdm item endpoints.

Optional local server endpoints:

- `GET /api/menus?source=all|cia|nypl|matched`
- `GET /api/ontology`
- `GET /api/ontology/build?limit=300`
- `GET /api/ontology/build?limit=all`
- `GET /api/ontology/status`
- `GET /api/matches/:uid`
- `GET /api/analytics/dishes`
- `GET /api/date-estimates`

## Useful Sources

- CIA Menu Collection: https://ciadigitalcollections.culinary.edu/digital/collection/p16940coll1
- NYPL What's on the Menu?: https://www.nypl.org/research/support/whats-on-the-menu
- NYPL Buttolph Collection: https://digitalcollections.nypl.org/collections/the-buttolph-collection-of-menus
- CONTENTdm API reference: https://help.oclc.org/Metadata_Services/CONTENTdm/Advanced_website_customization/API_Reference/CONTENTdm_API
- BLS Public Data API: https://www.bls.gov/developers/
- World Bank Indicators API: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation
- Federal Reserve H.10 release: https://www.federalreserve.gov/releases/h10/
