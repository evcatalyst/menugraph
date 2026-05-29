# MenuGraph

MenuGraph is a deployable prototype for exploring the Culinary Institute of America's historical menu collection as a visual knowledge base.

The app uses a committed snapshot of the public CONTENTdm API for the CIA Menu Collection (`p16940coll1`) and builds a live in-memory index of all published menu records. It supports:

- A time lens for menu formats across known years.
- Place, type, and collector/source lineage lenses.
- Local filtering across the loaded collection.
- Remote transcript/metadata search through CONTENTdm.
- On-demand item detail with images, page thumbnails, OCR text, and source links.
- A culinary ontology index for meals, dishes, ingredients, beverages, styles, and discovered clusters.
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

The collection is exposed through CONTENTdm's read-only web services. MenuGraph uses `dmQuery` to page through all public records, then merges several five-field metadata passes because CONTENTdm limits each query response to five returned fields. Item detail is loaded only when a user selects a record.

The Pages build reads committed snapshots from `docs/data/menus.json` and `docs/data/ontology.json`, then tries live CONTENTdm calls only for enhancement paths such as full record OCR. The local Node server remains useful as a development proxy because command-line clients and some browser contexts reject the archive certificate chain, but it is not required for hosting the core interface.

## Ontology Index

MenuGraph builds an instant metadata-derived ontology from titles, places, cuisine terms, menu types, and collection metadata. The committed Pages ontology includes a small OCR-backed transcript sample. The in-app `Index Text` control can enrich that index further when the browser can reach the live CONTENTdm item endpoints.

Optional local server endpoints:

- `GET /api/ontology`
- `GET /api/ontology/build?limit=300`
- `GET /api/ontology/build?limit=all`
- `GET /api/ontology/status`

## Useful Sources

- CIA Menu Collection: https://ciadigitalcollections.culinary.edu/digital/collection/p16940coll1
- CONTENTdm API reference: https://help.oclc.org/Metadata_Services/CONTENTdm/Advanced_website_customization/API_Reference/CONTENTdm_API
