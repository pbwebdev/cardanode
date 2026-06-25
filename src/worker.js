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
const YOUTUBE_CHANNEL_ID = "UCj-_2e7L2UgHaJLrGEOJRzA"; // Learn Cardano

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/pool-stats") return handlePoolStats(ctx);
    if (url.pathname === "/api/account-info") return handleAccountInfo(url, ctx);
    if (url.pathname === "/api/youtube") return handleYouTube(env, ctx);
    if (url.pathname === "/api/contact" && request.method === "POST")
      return handleContact(request, env);
    if (url.pathname.startsWith("/api/blockfrost/"))
      return handleBlockfrost(request, env, url);

    if (url.pathname === "/robots.txt") return handleRobots(url);

    if (
      request.method === "GET" &&
      (url.pathname === "/" || url.pathname === "/index.html")
    ) {
      return handleRoot(request, env, ctx);
    }

    // Every HTML response goes through the noindex injector on non-production
    // hosts so dev.cardanode.com.au and *.workers.dev never reach search.
    if (request.method === "GET" && isHtmlPath(url.pathname)) {
      const res = await env.ASSETS.fetch(request);
      return maybeNoindex(res, url);
    }

    return env.ASSETS.fetch(request);
  },
};

const PROD_HOST = "cardanode.com.au";

function isProdHost(url) {
  return url.hostname === PROD_HOST;
}

function isHtmlPath(pathname) {
  // HTML lives at root or anywhere ending in / (directory index)
  // or .html. Don't process /api/*, /styles/*, /images/*, etc.
  if (pathname.startsWith("/api/")) return false;
  if (/\.[a-z0-9]{2,5}$/i.test(pathname) && !pathname.endsWith(".html")) return false;
  return true;
}

function maybeNoindex(res, url) {
  if (isProdHost(url)) return res;
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return res;
  // Every static HTML page in this site has a <meta name="robots"> tag,
  // so we always replace rather than append (avoids ordering issues with
  // HTMLRewriter firing the <head> open event before inner elements).
  return new HTMLRewriter()
    .on('meta[name="robots"]', {
      element(el) { el.setAttribute("content", "noindex, nofollow"); },
    })
    .transform(res);
}

function handleRobots(url) {
  // Dev hosts get a hard disallow. Production gets the real robots.
  if (isProdHost(url)) {
    return new Response(
      `# cardanode.com.au\nUser-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://${PROD_HOST}/sitemap.xml\n`,
      { headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }
  return new Response(
    `# Dev / preview host — not for indexing.\nUser-agent: *\nDisallow: /\n`,
    { headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}

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
  const saturation = stats?.live_saturation != null ? Number(stats.live_saturation).toFixed(1) + "%" : null;
  const saturationPct = stats?.live_saturation != null ? Math.min(100, Number(stats.live_saturation)) : 0;
  const saturationBarStyle = `width:${saturationPct.toFixed(1)}%`;
  const delegators = stats?.delegators != null ? Number(stats.delegators).toLocaleString("en-US") : null;
  const delegatorsTrend = formatDelegatorsTrend(stats);
  const stakeTrend = formatStakeTrend(stats);
  const lifetimeRoa = stats?.lifetime_roa != null ? stats.lifetime_roa.toFixed(2) + "%" : null;
  const recentRoa = stats?.recent_roa != null ? `recent ${stats.recent_roa.toFixed(2)}%` : null;
  const poolIdShort = ADAOZ_POOL_BECH32;
  const sparklineSvg = stats?.sparkline?.length ? buildSparkline(stats.sparkline) : null;

  const rewriter = new HTMLRewriter()
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
    .on('[data-live="saturation"]', {
      element(el) { if (saturation) el.setInnerContent(saturation); },
    })
    .on('[data-live="saturation-bar"]', {
      element(el) { el.setAttribute("style", saturationBarStyle); },
    })
    .on('[data-live="delegators"]', {
      element(el) { if (delegators) el.setInnerContent(delegators); },
    })
    .on('[data-live="delegators-trend"]', {
      element(el) {
        if (delegatorsTrend) el.setInnerContent(delegatorsTrend.text);
        if (delegatorsTrend?.cls) el.setAttribute("class", `stat-trend ${delegatorsTrend.cls}`);
      },
    })
    .on('[data-live="stake-trend"]', {
      element(el) {
        if (stakeTrend) el.setInnerContent(stakeTrend.text);
        if (stakeTrend?.cls) el.setAttribute("class", `stat-trend ${stakeTrend.cls}`);
      },
    })
    .on('[data-live="lifetime-roa"]', {
      element(el) { if (lifetimeRoa) el.setInnerContent(lifetimeRoa); },
    })
    .on('[data-live="recent-roa"]', {
      element(el) { if (recentRoa) el.setInnerContent(recentRoa); },
    })
    .on('[data-live="pool-id"]', {
      element(el) { el.setInnerContent(poolIdShort); },
    })
    .on('[data-live="sparkline"]', {
      element(el) {
        if (sparklineSvg) el.setInnerContent(sparklineSvg, { html: true });
      },
    });

  const url = new URL(request.url);
  if (!isProdHost(url)) {
    rewriter.on('meta[name="robots"]', {
      element(el) { el.setAttribute("content", "noindex, nofollow"); },
    });
  }

  return rewriter.transform(assetRes);
}

/* ---------------- Pool stats (Koios) ---------------- */

async function handlePoolStats(ctx) {
  const data = await fetchPoolStats(ctx);
  return json(data ?? { error: "unavailable" }, data ? 200 : 503);
}

async function fetchPoolStats(ctx) {
  const cache = caches.default;
  const cacheKey = new Request("https://cache.local/pool-stats/v5");
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();

  // Fetch pool_info (POST + ids array) + pool_history (GET + singular id) in parallel.
  const [infoRes, histRes] = await Promise.all([
    fetch(`${KOIOS}/pool_info`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ _pool_bech32_ids: [ADAOZ_POOL_BECH32] }),
    }),
    fetch(`${KOIOS}/pool_history?_pool_bech32=${ADAOZ_POOL_BECH32}`, {
      method: "GET",
      headers: { accept: "application/json" },
    }),
  ]);

  if (!infoRes.ok) return null;
  const arr = await infoRes.json();
  const p = Array.isArray(arr) ? arr[0] : null;
  if (!p) return null;

  // pool_history may fail or be empty — graceful degradation.
  let history = [];
  try {
    if (histRes.ok) {
      const raw = await histRes.json();
      if (Array.isArray(raw)) {
        history = raw
          .filter((r) => r && Number.isFinite(Number(r.epoch_no)))
          .sort((a, b) => Number(a.epoch_no) - Number(b.epoch_no));
      }
    }
  } catch { /* swallow */ }

  // Last 10 epochs for the sparkline + 10-epoch deltas.
  const recent = history.slice(-10);
  const first = recent[0];
  const last = recent[recent.length - 1];

  const stakeNow = p.live_stake ? Math.round(Number(p.live_stake) / 1_000_000) : null;
  const stake10Ago = first?.active_stake ? Math.round(Number(first.active_stake) / 1_000_000) : null;
  const stakePct10 = (stakeNow != null && stake10Ago) ? ((stakeNow - stake10Ago) / stake10Ago) * 100 : null;

  const delegatorsNow = last?.delegator_cnt ?? null;
  const delegators10Ago = first?.delegator_cnt ?? null;
  const delegatorsDelta10 =
    delegatorsNow != null && delegators10Ago != null ? delegatorsNow - delegators10Ago : null;

  // Lifetime ROS: average of epoch_ros across all epochs that paid rewards.
  const rosVals = history
    .map((r) => Number(r.epoch_ros))
    .filter((v) => Number.isFinite(v) && v > 0);
  const lifetimeRoa = rosVals.length
    ? rosVals.reduce((a, b) => a + b, 0) / rosVals.length
    : null;
  const recentRoa = (() => {
    for (let i = history.length - 1; i >= 0; i--) {
      const v = Number(history[i].epoch_ros);
      if (Number.isFinite(v) && v > 0) return v;
    }
    return null;
  })();

  const out = {
    pool_id: ADAOZ_POOL_BECH32,
    ticker: p.meta_json?.ticker || "ADAOZ",
    live_stake_ada: stakeNow,
    active_stake_ada: p.active_stake ? Math.round(Number(p.active_stake) / 1_000_000) : null,
    live_saturation: p.live_saturation ?? null,
    block_count: p.block_count ?? null,
    margin: p.margin ?? null,
    fixed_cost_ada: p.fixed_cost ? Math.round(Number(p.fixed_cost) / 1_000_000) : null,
    pledge_ada: p.pledge ? Math.round(Number(p.pledge) / 1_000_000) : null,

    // Trends
    delegators: delegatorsNow,
    delegators_delta_10: delegatorsDelta10,
    epoch_start: first?.epoch_no ?? null,
    epoch_end: last?.epoch_no ?? null,
    stake_pct_change_10: stakePct10,
    lifetime_roa: lifetimeRoa,
    recent_roa: recentRoa,
    sparkline: recent.map((r) => ({
      epoch: Number(r.epoch_no),
      stake_ada: Math.round(Number(r.active_stake || 0) / 1_000_000),
    })),

    fetched_at: new Date().toISOString(),
  };

  // Pool stats change slowly; cache at the edge for 24h.
  const cached = json(out, 200, { "cache-control": "public, max-age=86400" });
  ctx.waitUntil(cache.put(cacheKey, cached.clone()));
  return out;
}

/* ---------------- YouTube (Data API v3) ---------------- */

async function handleYouTube(env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.local/youtube/v1/${YOUTUBE_CHANNEL_ID}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  if (!env.YOUTUBE_API_KEY) {
    return json({ error: "YOUTUBE_API_KEY secret not set on Worker" }, 503);
  }

  // The "uploads" playlist id for a channel is deterministic: UC… → UU…
  const uploadsId = "UU" + YOUTUBE_CHANNEL_ID.slice(2);
  const upstream =
    `https://www.googleapis.com/youtube/v3/playlistItems` +
    `?part=snippet&playlistId=${uploadsId}&maxResults=6&key=${env.YOUTUBE_API_KEY}`;

  let data;
  try {
    // The API key MUST have "Application restrictions: None" in Google Cloud
    // Console. Cloudflare Workers strip the Referer header from outgoing
    // subrequests (Fetch-spec forbidden header), so HTTP-referrer-restricted
    // keys will always get blocked. API-restriction (YouTube Data API v3
    // only) still applies; combined with the Worker secret storage, the key
    // can't be misused even if leaked.
    const res = await fetch(upstream, {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 21600, cacheEverything: true },
    });
    if (!res.ok) {
      const errBody = await res.text();
      return json({ error: `YouTube API ${res.status}`, detail: errBody.slice(0, 200) }, 502);
    }
    data = await res.json();
  } catch (err) {
    return json({ error: String(err?.message || err) }, 502);
  }

  const items = (data.items || []).map((it) => {
    const sn = it.snippet || {};
    const videoId = sn.resourceId?.videoId || "";
    const thumb =
      sn.thumbnails?.maxres?.url ||
      sn.thumbnails?.standard?.url ||
      sn.thumbnails?.high?.url ||
      sn.thumbnails?.medium?.url ||
      sn.thumbnails?.default?.url ||
      "";
    return {
      title: sn.title || "",
      videoId,
      link: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "",
      published: sn.publishedAt || "",
      thumbnail: thumb,
    };
  });

  const response = json({ items, fetched_at: new Date().toISOString() }, 200, {
    "cache-control": "public, max-age=21600",
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
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

function formatStakeTrend(stats) {
  const v = stats?.stake_pct_change_10;
  if (v == null) return null;
  const sign = v > 0 ? "+" : v < 0 ? "" : "";
  const arrow = v > 0.05 ? "▲" : v < -0.05 ? "▼" : "·";
  const cls = v > 0.05 ? "up" : v < -0.05 ? "down" : "flat";
  return { text: `${arrow} ${sign}${v.toFixed(1)}% over 10 epochs`, cls };
}

function formatDelegatorsTrend(stats) {
  const v = stats?.delegators_delta_10;
  const ep = stats?.epoch_start;
  if (v == null) return null;
  const sign = v > 0 ? "+" : v < 0 ? "" : "";
  const arrow = v > 0 ? "▲" : v < 0 ? "▼" : "·";
  const cls = v > 0 ? "up" : v < 0 ? "down" : "flat";
  const since = ep != null ? ` since epoch ${ep}` : " over 10 epochs";
  return { text: `${arrow} ${sign}${v}${since}`, cls };
}

// Inline SVG sparkline of stake over the last N epochs. No preserveAspectRatio
// override → scales uniformly so the curve isn't distorted on wide containers.
// Smooth Catmull-Rom-style curve, gradient area fill, axis ticks and current-
// value chip pinned to the last point.
function buildSparkline(points) {
  const W = 1000;
  const H = 260;
  const PAD_L = 16, PAD_R = 16, PAD_T = 32, PAD_B = 36;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const ys = points.map((p) => Number(p.stake_ada) || 0);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const yRange = Math.max(1, yMax - yMin);
  // Add a small headroom (5%) so the line doesn't kiss the top edge.
  const yRangeP = yRange * 1.1;
  const yMidShift = (yRangeP - yRange) / 2;

  const xStep = innerW / Math.max(1, points.length - 1);
  const project = (i, y) => [
    PAD_L + i * xStep,
    PAD_T + innerH - ((y - yMin + yMidShift) / yRangeP) * innerH,
  ];
  const coords = points.map((_, i) => project(i, ys[i]));

  // Smooth curve via centripetal Catmull-Rom → cubic bezier.
  const path = catmullRomPath(coords);
  const lastX = coords[coords.length - 1][0];
  const firstX = coords[0][0];
  const areaPath = `${path} L${lastX.toFixed(1)},${PAD_T + innerH} L${firstX.toFixed(1)},${PAD_T + innerH} Z`;

  // Light horizontal gridlines (3 of them, no labels)
  const grid = [0.25, 0.5, 0.75]
    .map((f) => {
      const y = PAD_T + innerH * f;
      return `<line x1="${PAD_L}" x2="${W - PAD_R}" y1="${y}" y2="${y}" stroke="#e3e8ef" stroke-width="1" stroke-dasharray="2 4"/>`;
    })
    .join("");

  // Dots: small markers + a large highlighted dot on the most recent point
  const dots = coords
    .map(([x, y], i) => {
      const isLast = i === coords.length - 1;
      if (isLast) {
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#0479b6" opacity="0.18"/>
                <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="#fff" stroke="#0479b6" stroke-width="2.5"/>`;
      }
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#0479b6"/>`;
    })
    .join("");

  // Current value chip above the last point
  const lastVal = compactAda(ys[ys.length - 1]) + " ₳";
  const [lx, ly] = coords[coords.length - 1];
  const chipW = 78, chipH = 22;
  const chipX = Math.min(W - PAD_R - chipW, Math.max(PAD_L, lx - chipW / 2));
  const chipY = Math.max(4, ly - chipH - 10);
  const chip = `
    <g>
      <rect x="${chipX}" y="${chipY}" width="${chipW}" height="${chipH}" rx="6" fill="#0479b6"/>
      <text x="${chipX + chipW / 2}" y="${chipY + 15}" font-family="Rubik,system-ui,sans-serif" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle">${lastVal}</text>
    </g>`;

  // Epoch axis labels: first, middle, last
  const midIdx = Math.floor(points.length / 2);
  const labels = [0, midIdx, points.length - 1]
    .map((i) => {
      const [x] = coords[i];
      const anchor = i === 0 ? "start" : i === points.length - 1 ? "end" : "middle";
      return `<text x="${x.toFixed(1)}" y="${H - 12}" font-family="ui-monospace,Menlo,monospace" font-size="11" fill="#5a6577" text-anchor="${anchor}">E${points[i].epoch}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Live stake trend, epoch ${points[0]?.epoch} to ${points[points.length - 1]?.epoch}, current ${lastVal}">
    <defs>
      <linearGradient id="sp-area" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#0693e3" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#0693e3" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${grid}
    <path d="${areaPath}" fill="url(#sp-area)"/>
    <path d="${path}" fill="none" stroke="#0479b6" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    ${chip}
    ${labels}
  </svg>`;
}

// Catmull-Rom (centripetal-ish) → cubic bezier path string.
function catmullRomPath(pts) {
  if (pts.length < 2) return "";
  const d = [`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`);
  }
  return d.join(" ");
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
