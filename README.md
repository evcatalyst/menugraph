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
- An Ask lens for natural-language questions across menu metadata, dish summaries, structured price rows, and date estimates.
- A bottom activity rail that reports archive loading, OCR search, transcript indexing progress, current menu titles, and ontology coverage.

## Run Locally

```bash
npm run dev
```

Open `http://127.0.0.1:4173`.

The Node server is optional local tooling. The deployable app is the static site in `docs/`, which can be hosted by GitHub Pages.

The Ask lens works on GitHub Pages by calling the private Netlify chat function for Grok synthesis, then falling back to deterministic static retrieval if that function is unavailable. To add local Grok synthesis without exposing a secret in the browser, start the server with an xAI key:

```bash
XAI_API_KEY=... npm run dev
```

`GROK_API_KEY` is also accepted. Set `GROK_MODEL` to override the default `grok-4.3` model.

Run static checks and responsive browser smoke tests with:

```bash
npm test
npm run test:e2e
```

## Deploy

This repository is configured for GitHub Pages from the `main` branch and `/docs` folder.

The published URL is:

```text
https://evcatalyst.github.io/menugraph/
```

The dedicated Ask MenuGraph experiment is query-routed so it can be tested without replacing the workbench:

```text
https://evcatalyst.github.io/menugraph/?askMenuGraph=1
```

Regenerate the committed Pages snapshot with:

```bash
npm run build:data
```

For a quick local smoke build, use `npm run build:data:sample`. For the full published index, use `npm run prepare:nypl` followed by `npm run build:data:full`.

## Netlify

`netlify.toml` is configured to publish `docs/` and serve `POST /api/chat` through `netlify/functions/chat.js`.

Use these settings when creating the Netlify site:

- Build command: leave blank, or use `npm test` if you want deploy-time validation.
- Publish directory: `docs`
- Functions directory: `netlify/functions`
- Environment variables: set `XAI_API_KEY` or `GROK_API_KEY` in the Netlify UI, not in `netlify.toml`.
- Optional environment variables: `GROK_MODEL` and `GROK_API_BASE`.

The same Ask lens URL path works in all modes:

- Netlify: `/api/chat` rewrites to the serverless function and can use Grok privately.
- GitHub Pages: the browser first calls the Netlify chat function so the key stays private, then falls back to static retrieval if the function is unavailable.
- Local Node server: `/api/chat` is served by `server.js`.

## Data Strategy

The CIA collection is exposed through CONTENTdm's read-only web services. MenuGraph uses `dmQuery` to page through all public records, then merges several five-field metadata passes because CONTENTdm limits each query response to five returned fields. Item detail is loaded only when a user selects a record.

NYPL What's on the Menu? is ingested from the public CSV export in `.cache/nypl/extract` when available. `npm run prepare:nypl` downloads the retired NYPL export into that ignored cache. The raw CSVs are not committed; the build writes bounded derived artifacts:

- `docs/data/menus.json` for normalized CIA and NYPL menu records with stable IDs such as `cia:1812` and `nypl:21075`.
- `docs/data/matches.json` for explainable cross-source venue candidates.
- `docs/data/analytics.json` for NYPL-backed dish and price trend aggregates.
- `docs/data/date-estimates.json` for conservative estimated-date evidence on weakly dated records.

The Pages build reads committed snapshots from `docs/data/menus.json`, `docs/data/ontology.json`, `docs/data/matches.json`, and related static artifacts, then tries live CONTENTdm calls only for enhancement paths such as full record OCR. The local Node server remains useful as a development proxy because command-line clients and some browser contexts reject the archive certificate chain, but it is not required for hosting the core interface.

Price trends are generated into `docs/data/prices.json` from OCR transcripts and NYPL structured item rows. The full data build reuses transcript text between ontology, price, and date-estimate steps so GitHub Actions does not crawl the same CIA records twice. The build also snapshots reference inputs under `docs/data/reference/`: BLS CPI-U for U.S. today-value estimates, World Bank country CPI for local relative indexes, a Federal Reserve H.10 metadata placeholder for future FX conversion, and curated context events for subtle historical caveats. These values are estimates, not exact historical purchasing-power claims.

## Ontology Index

MenuGraph builds an instant metadata-derived ontology from titles, places, cuisine terms, menu types, and collection metadata. The committed Pages ontology can also include OCR-backed transcript evidence generated at build time.

In public deployments the toolbar shows `Published Index`; it does not crawl CONTENTdm from the visitor's browser. On `localhost`, the same control becomes `Rebuild Index` and calls the local Node server endpoint for development sampling.

`.github/workflows/sync-data.yml` runs weekly and can also be started manually from GitHub Actions. It downloads the ignored NYPL CSV cache, rebuilds static JSON with `npm run build:data:full`, runs tests, and commits changed snapshots back to `main`. GitHub Pages and Netlify can then redeploy from the committed data.

Optional local server endpoints:

- `GET /api/menus?source=all|cia|nypl|matched`
- `GET /api/ontology`
- `GET /api/ontology/build?limit=300`
- `GET /api/ontology/build?limit=all`
- `GET /api/ontology/status`
- `GET /api/matches/:uid`
- `GET /api/analytics/dishes`
- `GET /api/date-estimates`
- `POST /api/chat`

## Useful Sources

- CIA Menu Collection: https://ciadigitalcollections.culinary.edu/digital/collection/p16940coll1
- NYPL What's on the Menu?: https://www.nypl.org/research/support/whats-on-the-menu
- NYPL Buttolph Collection: https://digitalcollections.nypl.org/collections/the-buttolph-collection-of-menus
- CONTENTdm API reference: https://help.oclc.org/Metadata_Services/CONTENTdm/Advanced_website_customization/API_Reference/CONTENTdm_API
- BLS Public Data API: https://www.bls.gov/developers/
- World Bank Indicators API: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation
- Federal Reserve H.10 release: https://www.federalreserve.gov/releases/h10/
