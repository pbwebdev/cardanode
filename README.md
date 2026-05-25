<!--

███╗   ███╗███████╗███████╗██╗  ██╗    ██╗    ██╗██╗████████╗██╗  ██╗    ██╗   ██╗███████╗
████╗ ████║██╔════╝██╔════╝██║  ██║    ██║    ██║██║╚══██╔══╝██║  ██║    ██║   ██║██╔════╝
██╔████╔██║█████╗  ███████╗███████║    ██║ █╗ ██║██║   ██║   ███████║    ██║   ██║███████╗
██║╚██╔╝██║██╔══╝  ╚════██║██╔══██║    ██║███╗██║██║   ██║   ██╔══██║    ██║   ██║╚════██║
██║ ╚═╝ ██║███████╗███████║██║  ██║    ╚███╔███╔╝██║   ██║   ██║  ██║    ╚██████╔╝███████║
╚═╝     ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝     ╚══╝╚══╝ ╚═╝   ╚═╝   ╚═╝  ╚═╝     ╚═════╝ ╚══════╝

Built by Mesh With Us
https://meshwithus.com.au

-->

# cardanode

Static site + Cloudflare Worker for **cardanode.com.au** — ADAOZ stake pool, Learn Cardano content, on-chain delegation.

## Stack

- Static HTML in `public/` (mirrors `drep-learncardano` house style)
- **esbuild** bundles `@meshsdk/core` → `public/vendor/mesh.mjs` for CIP-30 wallet connect
- **Cloudflare Worker** (`src/worker.js`) serves the assets and exposes:
  - `GET  /api/pool-stats` — ADAOZ stats via [Koios](https://api.koios.rest) (free, no API key)
  - `POST /api/contact`    — Turnstile-verified contact form
  - `GET  /api/blockfrost/*` — optional fallback proxy (only if `BLOCKFROST_KEY` secret is set)
- Fonts: Raleway (body) + Rubik (display)
- Brand: `#0693e3` blue on white

## Scripts

```bash
npm install
npm run build      # version stamp + Mesh bundle + post pages
npm run dev        # wrangler dev
npm run deploy     # build + wrangler deploy
npm run migrate    # WXR → src/content/posts/*.md (Phase 1)
npm run media      # pull 378 media originals (Phase 1)
```

## Cloudflare secrets

Set once per environment with `wrangler secret put <NAME>`:

| Secret | Required? | Purpose |
|---|---|---|
| `TURNSTILE_SECRET` | for contact form | Verifies form submissions server-side |
| `BLOCKFROST_KEY`   | optional         | Fallback proxy only; Koios is the primary data source |
| `CONTACT_TO`       | for contact form | Email address that receives submissions |

Local dev secrets go in `.dev.vars` (gitignored).

## Deploy

This repo lives on a shared mount: `Z:\cardano\cardanode` on Windows ↔ `/home/aiagent/.openclaw/workspace/cardano/cardanode` on aiagent-linux. Commits push from either side; `wrangler deploy` runs on aiagent-linux.

## Phases

See [`docs/ROADMAP.md`](docs/ROADMAP.md).
