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

    return serveAsset(request, env, url);
  },
};

// Wrap env.ASSETS.fetch with path-aware Cache-Control + sitewide security
// headers + noindex injection on non-production hosts.
async function serveAsset(request, env, url) {
  const res = await env.ASSETS.fetch(request);
  const out = withSecurityHeaders(withCacheHeaders(res, url.pathname));
  if (request.method !== "GET") return out;
  return isHtmlPath(url.pathname) ? maybeNoindex(out, url) : out;
}

function withCacheHeaders(res, pathname) {
  // Don't touch errors or non-OK responses
  if (!res.ok || res.status === 304) return res;

  let cc = null;
  if (pathname === "/" || pathname.endsWith("/") || pathname.endsWith(".html")) {
    // HTML: revalidate every request, no stale serving
    cc = "public, max-age=0, must-revalidate";
  } else if (/\.(?:jpe?g|png|webp|gif|svg|ico|avif)$/i.test(pathname)) {
    // Images: long-cache, content rarely changes; bump filename if needed
    cc = "public, max-age=31536000, immutable";
  } else if (/\.(?:woff2?|otf|ttf|eot)$/i.test(pathname)) {
    cc = "public, max-age=31536000, immutable";
  } else if (/\.(?:css|m?js)$/i.test(pathname)) {
    // CSS + JS: 1y immutable. Cache-busting is handled at the HTML layer
    // by appending ?v=<build-sha> to every local <link>/<script> URL on
    // each request (see transformHtml in handleRoot + serveAsset).
    cc = "public, max-age=31536000, immutable";
  } else if (pathname === "/sitemap.xml" || pathname === "/robots.txt") {
    cc = "public, max-age=3600";
  } else if (/\.(?:json|txt|xml|webmanifest)$/i.test(pathname)) {
    cc = "public, max-age=3600";
  }
  if (!cc) return res;

  const h = new Headers(res.headers);
  h.set("cache-control", cc);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

function withSecurityHeaders(res) {
  const h = new Headers(res.headers);
  // Defensible defaults; no CSP because the inline <script> blocks would
  // need hashing to keep working. Keep CSP out until we move scripts to
  // external files only (then add a strict CSP).
  if (!h.has("x-content-type-options")) h.set("x-content-type-options", "nosniff");
  if (!h.has("referrer-policy")) h.set("referrer-policy", "strict-origin-when-cross-origin");
  if (!h.has("permissions-policy"))
    h.set("permissions-policy", "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()");
  // HSTS: harmless to send; Cloudflare zone config usually adds it too.
  if (!h.has("strict-transport-security"))
    h.set("strict-transport-security", "max-age=31536000; includeSubDomains; preload");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

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

// Single HTML transform: per-deploy cache-busting on local CSS/JS URLs
// (so PSI sees 1y cache without staleness on deploy) + noindex on dev hosts.
function transformHtml(res, url) {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return res;
  const sha = VERSION.sha && VERSION.sha !== "dev" ? VERSION.sha : null;
  const onProd = isProdHost(url);
  if (!sha && onProd) return res; // nothing to rewrite

  let rw = new HTMLRewriter();
  if (sha) {
    rw = rw
      .on('link[rel~="stylesheet"][href^="/"]', {
        element(el) { stampVersion(el, "href", sha); },
      })
      .on('script[src^="/"]', {
        element(el) { stampVersion(el, "src", sha); },
      });
  }
  if (!onProd) {
    rw = rw.on('meta[name="robots"]', {
      element(el) { el.setAttribute("content", "noindex, nofollow"); },
    });
  }
  return rw.transform(res);
}

// Kept as alias for older callers — handleRoot used to call maybeNoindex.
const maybeNoindex = transformHtml;

function stampVersion(el, attr, sha) {
  const v = el.getAttribute(attr) || "";
  if (!v || v.includes("?")) return;            // skip if external or already versioned
  if (!v.match(/\.(?:css|m?js)$/i)) return;     // only CSS/JS
  el.setAttribute(attr, `${v}?v=${sha}`);
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
    .on('meta[name="turnstile-sitekey"]', {
      element(el) { if (env.TURNSTILE_SITEKEY) el.setAttribute("content", env.TURNSTILE_SITEKEY); },
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
  // Per-deploy ?v=<sha> versioning on local CSS/JS URLs so they can be
  // safely 1y-cached. SHA is dev/empty during local builds → skipped then.
  const sha = VERSION.sha && VERSION.sha !== "dev" ? VERSION.sha : null;
  if (sha) {
    rewriter
      .on('link[rel~="stylesheet"][href^="/"]', {
        element(el) { stampVersion(el, "href", sha); },
      })
      .on('script[src^="/"]', {
        element(el) { stampVersion(el, "src", sha); },
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
  const cacheKey = new Request("https://cache.local/pool-stats/v8");
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

  // Last 10 epochs power the headline trend chips; last 20 power the
  // sparkline bar chart. Trends stay 10-epoch so existing copy still reads
  // sensibly ("+12.7% over 10 epochs").
  const recent10 = history.slice(-10);
  const recent20 = history.slice(-20);
  const first10 = recent10[0];
  const last10 = recent10[recent10.length - 1];

  const stakeNow = p.live_stake ? Math.round(Number(p.live_stake) / 1_000_000) : null;
  const stake10Ago = first10?.active_stake ? Math.round(Number(first10.active_stake) / 1_000_000) : null;
  const stakePct10 = (stakeNow != null && stake10Ago) ? ((stakeNow - stake10Ago) / stake10Ago) * 100 : null;

  const delegatorsNow = last10?.delegator_cnt ?? null;
  const delegators10Ago = first10?.delegator_cnt ?? null;
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
    epoch_start: first10?.epoch_no ?? null,
    epoch_end: last10?.epoch_no ?? null,
    stake_pct_change_10: stakePct10,
    lifetime_roa: lifetimeRoa,
    recent_roa: recentRoa,
    sparkline: recent20.map((r) => ({
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
  // _v query param is a CF upstream cache buster — bump if a previous
  // failed response (e.g. a stale 403) got stuck in cache.
  const upstream =
    `https://www.googleapis.com/youtube/v3/playlistItems` +
    `?part=snippet&playlistId=${uploadsId}&maxResults=6&key=${env.YOUTUBE_API_KEY}&_v=5`;

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
  let body;
  try { body = await request.json(); }
  catch { return json({ error: "invalid_json" }, 400); }

  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim();
  const message = String(body?.message || "").trim();
  const token = body?.token || "";
  const honeypot = String(body?.website || "");

  // Honeypot: bots fill hidden fields. Real users leave them blank.
  if (honeypot) return json({ ok: true }); // pretend success, drop silently

  if (!name || name.length > 120) return json({ error: "invalid_name" }, 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200)
    return json({ error: "invalid_email" }, 400);
  if (!message || message.length < 5 || message.length > 5000)
    return json({ error: "invalid_message" }, 400);

  // Turnstile is optional but recommended. If TURNSTILE_SECRET is set,
  // the form-side widget is required and we verify here.
  if (env.TURNSTILE_SECRET) {
    if (!token) return json({ error: "missing_turnstile_token" }, 400);
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
    const v = await verify.json().catch(() => null);
    if (!v || !v.success) return json({ error: "turnstile_failed" }, 403);
  }

  // Compose a single submission payload reused across delivery backends.
  const submission = {
    name,
    email,
    message,
    ip: request.headers.get("cf-connecting-ip") || "unknown",
    country: request.headers.get("cf-ipcountry") || "??",
    ua: request.headers.get("user-agent") || "",
    at: new Date().toISOString(),
  };

  const tasks = [];
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID)
    tasks.push(sendTelegram(env, submission));
  if (env.RESEND_API_KEY) tasks.push(sendResend(env, submission));

  const results = await Promise.allSettled(tasks);
  const failures = results.filter((r) => r.status === "rejected").map((r) => String(r.reason));
  if (failures.length === results.length && results.length > 0) {
    // All backends failed — surface a server error so the form retries.
    console.error("contact-form: all backends failed", failures);
    return json({ error: "delivery_failed", detail: failures.slice(0, 2) }, 502);
  }

  // At least one backend succeeded, OR no backends are configured (logged-only).
  console.log("contact-form ok", { name, email, len: message.length, delivered: results.length - failures.length });
  return json({ ok: true });
}

async function sendTelegram(env, s) {
  // Telegram caps message text at 4096 chars. Keep room for headers + tags.
  const body = s.message.length > 3500 ? s.message.slice(0, 3500) + "… [truncated]" : s.message;
  const text =
    `📬 <b>New cardanode contact</b>  <code>${escAttr(s.country)}</code>\n` +
    `<b>From:</b> ${escAttr(s.name)} &lt;${escAttr(s.email)}&gt;\n` +
    `<b>At:</b> <code>${escAttr(s.at)}</code>\n` +
    `<b>IP:</b> <code>${escAttr(s.ip)}</code>\n` +
    `\n<pre>${escAttr(body)}</pre>`;
  const res = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`telegram ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const j = await res.json().catch(() => null);
  if (!j?.ok) throw new Error(`telegram api: ${JSON.stringify(j).slice(0, 200)}`);
}

async function sendResend(env, s) {
  const to = env.CONTACT_TO || "peter@meshwithus.com.au";
  const from = env.CONTACT_FROM || "contact@cardanode.com.au"; // must be a verified Resend sender domain
  const html = `<p><strong>From:</strong> ${escAttr(s.name)} &lt;${escAttr(s.email)}&gt;<br>
<strong>IP:</strong> ${escAttr(s.ip)} (${escAttr(s.country)})<br>
<strong>At:</strong> ${escAttr(s.at)}</p>
<hr>
<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;">${escAttr(s.message)}</pre>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `cardanode contact <${from}>`,
      to: [to],
      reply_to: s.email,
      subject: `cardanode contact: ${s.name}`,
      html,
      text: `From: ${s.name} <${s.email}>\nAt: ${s.at}\nIP: ${s.ip} (${s.country})\n\n${s.message}`,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

function escAttr(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
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

// Inline SVG bar chart of stake over the last N epochs. Bars carry rich
// data attrs so the JS tooltip can show prev-epoch delta + colour-code it.
function buildSparkline(points) {
  const W = 1000;
  const H = 260;
  const PAD_L = 16, PAD_R = 16, PAD_T = 30, PAD_B = 36;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const n = points.length;

  const ys = points.map((p) => Number(p.stake_ada) || 0);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  // Anchor the bars to a baseline a touch below yMin so even the smallest
  // bar still shows some height (no zero-height bars).
  const baseline = yMin - (yMax - yMin) * 0.08;
  const yRange = Math.max(1, yMax - baseline);

  // Bar geometry: thin gaps between bars, rounded top via rx on rect.
  const gapFrac = 0.18;
  const slotW = innerW / n;
  const barW = slotW * (1 - gapFrac);
  const barRx = Math.min(4, barW * 0.18);

  const grid = [0.25, 0.5, 0.75]
    .map((f) => {
      const y = PAD_T + innerH * f;
      return `<line x1="${PAD_L}" x2="${W - PAD_R}" y1="${y}" y2="${y}" stroke="#e3e8ef" stroke-width="1" stroke-dasharray="2 4"/>`;
    })
    .join("");

  const bars = points
    .map((p, i) => {
      const v = ys[i];
      const h = ((v - baseline) / yRange) * innerH;
      const x = PAD_L + i * slotW + (slotW * gapFrac) / 2;
      const y = PAD_T + innerH - h;
      const isLast = i === n - 1;
      const prev = i > 0 ? ys[i - 1] : null;
      const deltaAbs = prev != null ? v - prev : null;
      const deltaPct = prev != null && prev !== 0 ? ((v - prev) / prev) * 100 : null;
      const ada = compactAda(v) + " ₳";
      const deltaText = deltaPct == null
        ? ""
        : (deltaAbs > 0 ? "+" : "") + compactAda(Math.abs(deltaAbs)).replace("+", "") +
          " ₳ (" + (deltaPct > 0 ? "+" : "") + deltaPct.toFixed(2) + "%)";
      const deltaDir = deltaAbs == null ? "flat" : deltaAbs > 0 ? "up" : deltaAbs < 0 ? "down" : "flat";
      const fill = isLast ? "url(#sp-bar-last)" : "url(#sp-bar)";
      const titleId = `sp-t-${i}`;
      // Visible bar
      const bar = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="${barRx.toFixed(1)}" fill="${fill}"/>`;
      // Full-column hit target so cursor catches the bar even at the top.
      // Carries data attrs the JS tooltip consumes.
      const hit = `<rect class="sp-hit" x="${(x - slotW * gapFrac / 2).toFixed(1)}" y="${PAD_T}" width="${slotW.toFixed(1)}" height="${innerH}" fill="transparent" tabindex="0" role="button" aria-describedby="${titleId}" data-epoch="${p.epoch}" data-stake="${ada}" data-delta="${deltaText}" data-delta-dir="${deltaDir}"><title id="${titleId}">Epoch ${p.epoch}: ${ada}${deltaText ? " (" + (deltaAbs > 0 ? "+" : "−") + deltaPct.toFixed(2) + "% vs prev)" : ""}</title></rect>`;
      return bar + hit;
    })
    .join("");

  // Axis labels: first, ~1/3, ~2/3, last
  const idxs = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];
  const labels = idxs
    .map((i, slot) => {
      const x = PAD_L + i * slotW + slotW / 2;
      const anchor = slot === 0 ? "start" : slot === idxs.length - 1 ? "end" : "middle";
      return `<text x="${x.toFixed(1)}" y="${H - 12}" font-family="ui-monospace,Menlo,monospace" font-size="11" fill="#5b6477" text-anchor="${anchor}">E${points[i].epoch}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Live stake bar chart, ${n} epochs from E${points[0]?.epoch} to E${points[n - 1]?.epoch}">
    <defs>
      <linearGradient id="sp-bar" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#0033AD"/>
        <stop offset="100%" stop-color="#3d6dd6"/>
      </linearGradient>
      <linearGradient id="sp-bar-last" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#001f6e"/>
        <stop offset="100%" stop-color="#0033AD"/>
      </linearGradient>
    </defs>
    ${grid}
    ${bars}
    ${labels}
  </svg>`;
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
