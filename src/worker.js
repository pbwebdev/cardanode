/*
  Cloudflare Worker — cardanode.com.au

  Endpoints:
    GET  /api/pool-stats   — ADAOZ pool stats via Koios (free, no key)
    POST /api/contact      — Turnstile-verified contact form
    GET  /api/blockfrost/* — OPTIONAL Blockfrost proxy (only if BLOCKFROST_KEY set)

  Everything else falls through to static assets (env.ASSETS).

  Edge HTML injection: build SHA + live pool stats are inlined into the
  home page via HTMLRewriter so first paint has no extra round-trips.
*/

import { VERSION } from "./version-data.js";

// ADAOZ pool. Koios /pool_info requires bech32; hex equivalent kept for reference.
const ADAOZ_POOL_BECH32 = "pool1vev8z03vh7jwx3mfrgzrt9fltt97nupaxv8ffj4r5r8mgwts5ze";
// hex: 6658713e2cbfa4e347691a0435953f5acbe9f03d330e94caa3a0cfb4

const KOIOS = "https://api.koios.rest/api/v1";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/pool-stats") return handlePoolStats(ctx);
    if (url.pathname === "/api/account-info") return handleAccountInfo(url, ctx);
    if (url.pathname === "/api/contact" && request.method === "POST")
      return handleContact(request, env);
    if (url.pathname.startsWith("/api/blockfrost/"))
      return handleBlockfrost(request, env, url);

    if (
      request.method === "GET" &&
      (url.pathname === "/" || url.pathname === "/index.html")
    ) {
      return handleRoot(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};

/* ---------------- HTML edge injection ---------------- */

async function handleRoot(request, env, ctx) {
  const assetRes = await env.ASSETS.fetch(request);
  const ct = assetRes.headers.get("content-type") || "";
  if (!assetRes.ok || !ct.includes("text/html")) return assetRes;

  const stats = await fetchPoolStats(ctx).catch(() => null);
  const liveStake = stats?.live_stake_ada != null
    ? compactAda(stats.live_stake_ada)
    : null;
  const blocks = stats?.block_count != null
    ? Number(stats.block_count).toLocaleString("en-US")
    : null;

  const margin = stats?.margin != null ? (stats.margin * 100).toFixed(stats.margin < 0.01 ? 2 : 1) + "%" : null;
  const pledge = stats?.pledge_ada != null ? Number(stats.pledge_ada).toLocaleString("en-US") + " ₳" : null;
  const fixedFee = stats?.fixed_cost_ada != null ? Number(stats.fixed_cost_ada).toLocaleString("en-US") + " ₳" : null;
  const saturation = stats?.live_saturation != null ? Number(stats.live_saturation).toFixed(1) + "%" : null;

  return new HTMLRewriter()
    .on('meta[name="build-sha"]', {
      element(el) { el.setAttribute("content", VERSION.sha); },
    })
    .on('[data-live="stake-ada"]', {
      element(el) { if (liveStake) el.setInnerContent(liveStake); },
    })
    .on('[data-live="blocks-minted"]', {
      element(el) { if (blocks) el.setInnerContent(blocks); },
    })
    .on('[data-live="margin"]', {
      element(el) { if (margin) el.setInnerContent(margin); },
    })
    .on('[data-live="pledge"]', {
      element(el) { if (pledge) el.setInnerContent(pledge); },
    })
    .on('[data-live="fixed-fee"]', {
      element(el) { if (fixedFee) el.setInnerContent(fixedFee); },
    })
    .on('[data-live="saturation"]', {
      element(el) { if (saturation) el.setInnerContent(saturation); },
    })
    .transform(assetRes);
}

/* ---------------- Pool stats (Koios) ---------------- */

async function handlePoolStats(ctx) {
  const data = await fetchPoolStats(ctx);
  return json(data ?? { error: "unavailable" }, data ? 200 : 503);
}

async function fetchPoolStats(ctx) {
  const cache = caches.default;
  const cacheKey = new Request("https://cache.local/pool-stats/v1");
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();

  const res = await fetch(`${KOIOS}/pool_info`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ _pool_bech32_ids: [ADAOZ_POOL_BECH32] }),
  });
  if (!res.ok) return null;
  const arr = await res.json();
  const p = Array.isArray(arr) ? arr[0] : null;
  if (!p) return null;

  const out = {
    pool_id: ADAOZ_POOL_BECH32,
    ticker: p.meta_json?.ticker || "ADAOZ",
    live_stake_ada: p.live_stake ? Math.round(Number(p.live_stake) / 1_000_000) : null,
    active_stake_ada: p.active_stake ? Math.round(Number(p.active_stake) / 1_000_000) : null,
    live_saturation: p.live_saturation ?? null,
    block_count: p.block_count ?? null,
    margin: p.margin ?? null,
    fixed_cost_ada: p.fixed_cost ? Math.round(Number(p.fixed_cost) / 1_000_000) : null,
    pledge_ada: p.pledge ? Math.round(Number(p.pledge) / 1_000_000) : null,
    fetched_at: new Date().toISOString(),
  };

  // Pool stats change slowly; cache at the edge for 24h.
  const cached = json(out, 200, { "cache-control": "public, max-age=86400" });
  ctx.waitUntil(cache.put(cacheKey, cached.clone()));
  return out;
}

/* ---------------- Account info (Koios) ---------------- */

async function handleAccountInfo(url, ctx) {
  const stake = url.searchParams.get("stake") || "";
  if (!/^stake1[0-9a-z]{50,}$/.test(stake)) {
    return json({ error: "invalid_stake_address" }, 400);
  }

  // Short edge cache (60s) — user may re-check after signing a tx.
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.local/account-info/${stake}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const res = await fetch(`${KOIOS}/account_info`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ _stake_addresses: [stake] }),
  });
  if (!res.ok) return json({ error: "koios_error", status: res.status }, 502);

  const arr = await res.json();
  const acc = Array.isArray(arr) ? arr[0] : null;

  // Koios returns an empty array (or an entry with status "not registered")
  // for a stake address that has never been registered on-chain.
  const out = {
    stake_address: stake,
    registered: acc ? acc.status === "registered" : false,
    delegated_pool: acc?.delegated_pool || null,
    is_delegated_to_adaoz: acc?.delegated_pool === ADAOZ_POOL_BECH32,
    total_balance_ada: acc?.total_balance ? Math.round(Number(acc.total_balance) / 1_000_000) : null,
    rewards_available_ada: acc?.rewards_available ? Math.round(Number(acc.rewards_available) / 1_000_000) : null,
    fetched_at: new Date().toISOString(),
  };

  const response = json(out, 200, { "cache-control": "public, max-age=60" });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

/* ---------------- Contact form ---------------- */

async function handleContact(request, env) {
  if (!env.TURNSTILE_SECRET)
    return json({ error: "turnstile_not_configured" }, 503);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "invalid_json" }, 400); }

  const { name, email, message, token } = body || {};
  if (!name || !email || !message || !token)
    return json({ error: "missing_fields" }, 400);

  const verify = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
        remoteip: request.headers.get("cf-connecting-ip") || "",
      }),
    },
  );
  const v = await verify.json();
  if (!v.success) return json({ error: "turnstile_failed" }, 403);

  // TODO Phase 6: actually send. Reference repo uses MailChannels or Resend.
  // For now, log to observability and accept.
  console.log("contact-form", { name, email, len: message.length });
  return json({ ok: true });
}

/* ---------------- Optional Blockfrost proxy ---------------- */

async function handleBlockfrost(request, env, url) {
  if (!env.BLOCKFROST_KEY)
    return json({ error: "blockfrost_not_configured" }, 503);
  const upstreamPath = url.pathname.replace(/^\/api\/blockfrost\//, "");
  const upstream = `https://cardano-mainnet.blockfrost.io/api/v0/${upstreamPath}${url.search}`;
  return fetch(upstream, {
    method: request.method,
    headers: { project_id: env.BLOCKFROST_KEY },
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
  });
}

/* ---------------- utils ---------------- */

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extra,
    },
  });
}

// "61,272,784" → "61.2M" (millions, 1dp). For values >= 1B uses "1.2B".
// Small values fall through to a plain locale string with no decimals.
function compactAda(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return Math.round(v).toLocaleString("en-US");
}
