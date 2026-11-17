# MenuGraph on Cloudflare (phases 1–2)

Build-only packet. Nothing in this branch deploys, creates a bucket, attaches DNS, or writes a secret.

GitHub Pages (`/docs` on `main`) and the existing Netlify Ask function stay as they are.

## What was built

A Worker named `menugraph` on the Canal account named in the absorb-and-publish plan (`account_id` `3d66aba1` in `wrangler.toml`).

- Static assets come from `.cf-assets`, a hardlink mirror of `docs/` produced by `scripts/prepare-cf-assets.js`.
- `menus.json`, `prices.json`, and `matches.json` are omitted from that mirror. `GET /data/menus.json`, `/data/prices.json`, and `/data/matches.json` read the `MENU_DATA` R2 binding (`menugraph-snapshots`, object keys of the same filenames). If the object is missing, the Worker falls back to the asset copy when one is present.
- `POST /api/chat` (plus `GET` and `OPTIONS`) matches the Netlify function: same question fields, ask-secret check, local retrieval, then Grok synthesis. The Grok key is read from the `XAI_API_KEY` or `GROK_API_KEY` binding by name. Requests are limited to 20 per 10 minutes per `CF-Connecting-IP` inside one isolate.
- `workers_dev` and preview URLs are off. There is no route and no custom domain.

Other large snapshots (graph overlays, product-evidence summaries) stay in the asset directory. Moving them is an open question, not this packet.

## Dry run

```bash
npm run cf:assets
npm run cf:dry-run
```

`cf:assets` only rebuilds `.cf-assets`. `cf:dry-run` runs `wrangler deploy --dry-run` (wrangler 4.50.0) and writes the bundle under `.cf-dry`. That directory is gitignored. Delete it after recording the size. The dry run must not be followed by a real deploy from this packet.

Measured on this branch, with the three large snapshots omitted from assets:

- Worker upload: 61.68 KiB, gzip 16.00 KiB. Bindings: `MENU_DATA` (`menugraph-snapshots`) and `ASSETS`.
- Asset mirror: 52,093,911 bytes. The omitted snapshots are `menus.json` 35,104,800 bytes, `prices.json` 28,877,190 bytes, and `matches.json` 6,426,705 bytes.

Local smoke, still with no remote bucket:

```bash
npm run test:cf
npm run test:cf:e2e
```

`test:cf` stubs the chat upstream. `test:cf:e2e` runs Playwright against `wrangler dev` on `127.0.0.1:8787` with tiny snapshot fixtures in `.cf-assets` only.

## What a later deploy needs

These stay with Platform Infra after a separate OK:

1. Hostname. The plan's suggested default is `menus.canalandcountry.com`. No DNS is attached here.
2. Confirm the Canal account, or name a different one before changing `account_id`.
3. Create the R2 bucket `menugraph-snapshots` and upload `menus.json`, `prices.json`, and `matches.json` under those keys.
4. `wrangler secret put` for `XAI_API_KEY` or `GROK_API_KEY`. Optional names: `GROK_MODEL`, `GROK_API_BASE`, `MENUGRAPH_ASK_SECRET_HASH`.
5. Decide whether GitHub Pages should keep calling the current Netlify Ask host or the new `/api/chat`.
6. A typed deploy OK. This branch does not run `wrangler deploy`.

## Open questions carried from the plan

1. Hostname and account: Canal `menus.canalandcountry.com`, a capitaldistrict.io host, or something else?
2. Scope now: MenuGraph only, or fold mealbandit in later?
3. Images stay linked to CIA and NYPL until a rights pass, or may a later phase cache them in R2?
4. When, if ever, to redirect the GitHub Pages site and retire Netlify?
5. Should product-evidence and graph JSON over 1 MB also leave the asset bundle?
6. Chat loads `menus.json` and `prices.json` into the isolate (about 64 MB together). Is that acceptable on the paid plan, or should a later phase pre-index?

The meeting-docs `menu-image` hook is not used. This branch does not enqueue OCR or change any civic agent.
