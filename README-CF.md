# MenuGraph on Cloudflare (phases 1–2)

Build-only packet. Nothing in this branch deploys, creates a bucket, attaches DNS, or writes a secret.

GitHub Pages (`/docs` on `main`) and the existing Netlify Ask function stay as they are.

## What was built

A Worker named `menugraph` on the Canal account named in the absorb-and-publish plan. The plan cites the prefix `3d66aba1`. `wrangler.toml` uses the full account id `3d66aba1b55e8517ec6ef87f2c8c8e4f`. No other account id is set.

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

A local call of the same handler against the real `menus.json` and `prices.json` snapshots returned 200, `local-retrieval`, 192,683 searched documents, and 36 matches in about 1.5 seconds. Process RSS was 531 MB. A Worker isolate is limited to 128 MB, so that full Ask does not fit on the isolate until retrieval is reduced. Streaming the three objects to the browser does not parse them in the isolate.

## What a later deploy needs

These stay with Platform Infra after a separate OK:

1. Hostname. The plan's suggested default is `menus.canalandcountry.com`. No DNS is attached here.
2. Confirm the Canal account, or name a different one before changing `account_id`.
3. Create the R2 bucket `menugraph-snapshots` and upload `menus.json`, `prices.json`, and `matches.json` under those keys.
4. `wrangler secret put` for `XAI_API_KEY` or `GROK_API_KEY`. Optional names: `GROK_MODEL`, `GROK_API_BASE`, `MENUGRAPH_ASK_SECRET_HASH`.
5. Decide whether GitHub Pages should keep calling the current Netlify Ask host or the new `/api/chat`.
6. A typed deploy OK. This branch does not run `wrangler deploy`.

## Open questions carried from the plan

These are still open:

1. Hostname and account: Canal `menus.canalandcountry.com` (suggested default), a capitaldistrict.io host, or something else?
2. Scope now: MenuGraph only, or fold mealbandit in later?
3. Confirm: do not enqueue through meeting-docs `menu-image`; build the separate workstream instead?
4. May images be cached in R2, or should the UI keep linking to source URLs until a rights pass?
5. Pilot sample: how many pages, and CIA vs NYPL vs product-evidence wrappers first?
6. Engine: keep civic `auto`, or force Vision or Tesseract?
7. Should the unpublished upstate.lol `menu_ocr` design share this workstream later, or stay a third queue?
8. When, if ever, to redirect evcatalyst.github.io/menugraph and retire Netlify?

Also still open, from this build: product-evidence and graph JSON over 1 MB stay in the asset directory for now. Full-corpus Ask needs a smaller retrieval path before `/api/chat` can run on the Worker.

The meeting-docs `menu-image` hook is not used. This branch does not enqueue OCR or change any civic agent.
