# Roadmap

Tracks the eight phases from the build brief. Tick items as they land. The brief is the source of truth for decisions; this file tracks *progress*.

## Phase 0 — Scaffold ✅
- [x] Repo + git + GitHub (`pbwebdev/cardanode`)
- [x] esbuild + Worker stack (mirrors `drep-learncardano`)
- [x] `wrangler.jsonc` with `assets` binding + `run_worker_first`
- [x] Mesh SDK bundle pipeline (`build-mesh.js`, `vendor-mesh-entry.js`)
- [x] Brand: white bg, `#0693e3`, Raleway + Rubik
- [x] Mesh With Us ASCII art in `index.html` head + `README.md`
- [x] Console + "type mesh" easter egg
- [ ] aiagent-linux bootstrap (install wrangler, `npm install`)
- [ ] First deploy to `cardanode.workers.dev`

## Phase 1 — Content migration ✅
- [x] `scripts/migrate-posts.mjs` (JS port of `wxr-to-markdown.py` using fast-xml-parser + turndown)
- [x] YouTube URLs cleaned (`/embed//` → `/embed/`, quote/unicode noise stripped, https prefix added)
- [x] `src/content/posts/*.md` (82) + `src/content/comments/*.json` (28)
- [x] `scripts/pull-media.mjs` → `src/static/uploads/` (121 files / 4.7 MB; 1 dead PDF link logged to `_temp/media-missing.txt`)
- [x] `build-posts.js` renders 82 post pages + paginated `/blog/` (7 pages, 12/page)
- [x] Restructure: `src/static/` is source, `public/` is fully generated + gitignored
- [ ] Polish (Phase 2 candidates): dedup hero image vs first body image; strip leftover WP shortcode CSS; render `youtube.com/c/...` URLs as links not iframes

## Phase 2 — Blog
- [ ] `/blog/` index, category filter
- [ ] Post template: hero image, body, embeds, static comments, related posts, delegate CTA
- [ ] Responsive YouTube iframes; flag dead videos at build time (non-blocking)

## Phase 3 — Home (modernise)
- [ ] Reframe legacy "podcast" language → Learn Cardano YouTube + Builders Bench
- [ ] Drop dead Meetup link + CardanoPress card (confirm with Peter)

## Phase 4 — Delegation (MeshSDK)
- [ ] WalletConnect (CIP-30): Lace, Eternl primary; Nami/Yoroi mentioned only
- [ ] Detect stake key registration state via Koios `/account_info`
- [ ] Build delegation cert; include registration cert (2 ADA deposit) when needed
- [ ] Submit via wallet (or KoiosProvider); show Cardanoscan link
- [ ] Handle: already delegated, insufficient funds, user rejection

## Phase 5 — Live pool stats
- [x] `/api/pool-stats` via Koios `/pool_info`
- [x] ADAOZ bech32 pool ID hardcoded (`pool1vev8z03vh7jwx3mfrgzrt9fltt97nupaxv8ffj4r5r8mgwts5ze`)
- [x] Edge-injected first paint via HTMLRewriter
- [ ] Verify against live Koios once deployed

## Phase 6 — Contact form
- [ ] `/contact-us/` page with Turnstile widget
- [ ] Wire `/api/contact` to MailChannels or Resend
- [x] SpeakPipe voice widget: **dropped** (per Peter)

## Phase 7 — Cross-promo
- [ ] `CrossPromo` block in footer + post pages + home
- [ ] Footer socials: X (@astroboysoup / @cardanodeau), LinkedIn, YouTube, Discord, Telegram

## Phase 8 — SEO + DNS cutover
- [ ] Per-post `<title>`, meta description, OG/Twitter (mapped from Yoast)
- [ ] `sitemap.xml`, `robots.txt`, canonical tags at root-level slugs
- [ ] Confirm DNS cutover plan with Peter

---

## Open confirmations

- Repo: `pbwebdev/cardanode` (public) ✅
- DNS: cardanode.com.au already on Cloudflare ✅
- SpeakPipe widget: dropped ✅
- Logo + brand assets: pull from CDN, or source files? (TBC)
- The 36 EP0xx "podcast" posts — migrate-as-is, surface evergreen tutorials more prominently (default plan)

## Decisions made

| Topic | Decision |
|---|---|
| Stack | esbuild + Cloudflare Worker (mirrors drep-learncardano), not React+Vite+Pages |
| Theme | White background, `#0693e3` blue, Raleway + Rubik |
| Primary API | **Koios** (free, no key) — Blockfrost is optional fallback |
| Post URLs | Root-level slug `/<slug>/` (matches WP, zero SEO risk) |
| Drafts | 23 drafts skipped |
| Comments | Migrated as static read-only JSON, no new submissions |
| Deploy host | aiagent-linux at `/home/aiagent/.openclaw/workspace/cardano/cardanode` (shared mount with Z:\cardano\cardanode) |
