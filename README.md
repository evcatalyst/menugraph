# MenuGraph

MenuGraph is a deployable prototype for exploring the Culinary Institute of America's historical menu collection as a visual knowledge base.

The app uses the public CONTENTdm API for the CIA Menu Collection (`p16940coll1`) and builds a live local cache of all published menu records. It supports:

- A time lens for menu formats across known years.
- Place, type, and collector/source lineage lenses.
- Local filtering across the loaded collection.
- Remote transcript/metadata search through CONTENTdm.
- On-demand item detail with images, page thumbnails, OCR text, and source links.
- A culinary ontology index for meals, dishes, ingredients, beverages, styles, and discovered clusters.
- A bottom activity rail that reports archive loading, OCR search, transcript indexing progress, current menu titles, and ontology coverage.

## Run

```bash
npm run dev
```

Open `http://127.0.0.1:4173`.

## Data Strategy

The collection is exposed through CONTENTdm's read-only web services. MenuGraph uses `dmQuery` to page through all public records, then merges several five-field metadata passes because CONTENTdm limits each query response to five returned fields. Item detail is loaded only when a user selects a record.

The local server proxies API calls and images because the archive currently presents a certificate chain that local command-line clients may reject. The app does not store or redistribute images; it requests them from the CIA Digital Collections on demand.

## Ontology Index

MenuGraph builds an instant metadata-derived ontology from titles, places, cuisine terms, menu types, and collection metadata. Use the in-app `Index Text` control to enrich that index with transcript evidence. The text build samples records across decades, fetches their page-level transcript text, separates dish/course lines from beverage lines, and persists the result to `.cache/ontology.json`.

Useful endpoints:

- `GET /api/ontology`
- `GET /api/ontology/build?limit=300`
- `GET /api/ontology/build?limit=all`
- `GET /api/ontology/status`

## Useful Sources

- CIA Menu Collection: https://ciadigitalcollections.culinary.edu/digital/collection/p16940coll1
- CONTENTdm API reference: https://help.oclc.org/Metadata_Services/CONTENTdm/Advanced_website_customization/API_Reference/CONTENTdm_API
