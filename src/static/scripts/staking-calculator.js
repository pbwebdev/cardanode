/*
  Cardano staking rewards calculator.

  Inputs:
    - starting ADA balance (principal)
    - weekly DCA contribution (extra ADA added every week from pay etc.)
    - time horizon (months, via slider)
  Output:
    - ADAOZ projection card (lifetime ROA from /api/pool-stats)
    - optional compare-pool card (looked up via /api/pool-info?ticker= or ?id=)
    - area chart of ADA balance over time, ADAOZ filled, optional compare line

  Math: Cardano epochs are ~5 days, 73/year. APR = lifetime average ROA.
  Per-epoch rate i = APR/100/73. Per-epoch DCA c_e = weekly × 52/73.
  Balance at epoch n = P·(1+i)^n  +  c_e · ((1+i)^n − 1) / i  (annuity FV)
  When i = 0 we degrade to simple linear contribution.
*/

const root = document.getElementById("staking-calc");
if (root) initCalc(root);

function initCalc(el) {
  const $ = (sel) => el.querySelector(sel);

  const amountEl = $("#sc-amount");
  const weeklyEl = $("#sc-weekly");
  const yearsEl = $("#sc-years");
  const yearsLabelEl = $("#sc-years-label");
  const compareInputEl = $("#sc-compare-input");
  const compareBtnEl = $("#sc-compare-btn");
  const compareStatusEl = $("#sc-compare-status");
  const compareWrapperEl = $("#sc-compare-card");
  const compareNameEl = $("#sc-compare-name");
  const compareAprEl = $("#sc-compare-apr");
  const compareFinalEl = $("#sc-compare-final");
  const compareRewardsEl = $("#sc-compare-rewards");
  const compareDeltaEl = $("#sc-compare-delta");
  const adaozAprEl = $("#sc-adaoz-apr");
  const adaozFinalEl = $("#sc-adaoz-final");
  const adaozRewardsEl = $("#sc-adaoz-rewards");
  const adaozContribEl = $("#sc-adaoz-contrib");
  const adaozPerEpochEl = $("#sc-adaoz-per-epoch");
  const adaozPerYearEl = $("#sc-adaoz-per-year");
  const chartEl = $("#sc-chart");
  const legCompareEl = $("#sc-leg-compare");
  const legCompareNameEl = $("#sc-leg-compare-name");

  let adaozApr = null;
  let comparePool = null;

  fetch("/api/pool-stats")
    .then((r) => r.json())
    .then((d) => { adaozApr = d?.lifetime_roa ?? d?.recent_roa ?? 3.3; render(); })
    .catch(() => { adaozApr = 3.3; render(); });

  amountEl.addEventListener("input", render);
  weeklyEl.addEventListener("input", render);
  yearsEl.addEventListener("input", render);
  compareBtnEl.addEventListener("click", onCompare);
  compareInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); onCompare(); }
  });

  render();

  async function onCompare() {
    const q = compareInputEl.value.trim();
    if (!q) {
      comparePool = null;
      compareWrapperEl.hidden = true;
      legCompareEl.hidden = true;
      compareStatusEl.textContent = "";
      render();
      return;
    }
    compareStatusEl.textContent = "Looking up…";
    compareStatusEl.className = "sc-status loading";
    try {
      const isBech = /^pool1[0-9a-z]{50,}$/.test(q);
      const url = isBech
        ? `/api/pool-info?id=${encodeURIComponent(q)}`
        : `/api/pool-info?ticker=${encodeURIComponent(q.toUpperCase())}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.error) {
        comparePool = null;
        compareWrapperEl.hidden = true;
        legCompareEl.hidden = true;
        compareStatusEl.textContent = friendlyError(data.error || `HTTP ${res.status}`, q);
        compareStatusEl.className = "sc-status error";
        render();
        return;
      }
      const apr = data.lifetime_roa ?? data.recent_roa;
      if (apr == null) {
        comparePool = null;
        compareWrapperEl.hidden = true;
        legCompareEl.hidden = true;
        compareStatusEl.textContent = "Found the pool but no historical reward data yet.";
        compareStatusEl.className = "sc-status error";
        render();
        return;
      }
      comparePool = {
        apr,
        ticker: data.ticker || "?",
        name: data.name || data.ticker || data.pool_id.slice(0, 10) + "…",
        poolId: data.pool_id,
      };
      compareWrapperEl.hidden = false;
      legCompareEl.hidden = false;
      legCompareNameEl.textContent = comparePool.ticker;
      compareStatusEl.textContent = "";
      render();
    } catch {
      comparePool = null;
      compareWrapperEl.hidden = true;
      legCompareEl.hidden = true;
      compareStatusEl.textContent = "Network hiccup, try again.";
      compareStatusEl.className = "sc-status error";
      render();
    }
  }

  function render() {
    const amount = Math.max(0, Number(amountEl.value) || 0);
    const weekly = Math.max(0, Number(weeklyEl.value) || 0);
    const months = Number(yearsEl.value);
    const years = months / 12;
    yearsLabelEl.textContent = formatHorizon(months);

    if (adaozApr != null) {
      const r = project(amount, weekly, adaozApr, years);
      adaozAprEl.textContent = adaozApr.toFixed(2) + "%";
      adaozFinalEl.textContent = formatAda(r.final);
      adaozRewardsEl.textContent = formatAda(r.rewards);
      adaozContribEl.textContent = weekly > 0
        ? ` (incl. ${formatAda(r.contributed)} of your DCA)`
        : "";
      adaozPerEpochEl.textContent = formatAda(r.avgPerEpoch);
      adaozPerYearEl.textContent = formatAda(r.avgPerYear);
    }
    if (comparePool) {
      const r = project(amount, weekly, comparePool.apr, years);
      compareNameEl.textContent = `${comparePool.ticker} · ${comparePool.name}`.slice(0, 60);
      compareAprEl.textContent = comparePool.apr.toFixed(2) + "%";
      compareFinalEl.textContent = formatAda(r.final);
      compareRewardsEl.textContent = formatAda(r.rewards);
      if (adaozApr != null) {
        const adaozR = project(amount, weekly, adaozApr, years);
        const diff = adaozR.rewards - r.rewards;
        const sign = diff >= 0 ? "+" : "−";
        compareDeltaEl.textContent = `ADAOZ earns ${sign}${formatAda(Math.abs(diff))} ${diff >= 0 ? "more" : "less"} over this period`;
        compareDeltaEl.className = "sc-delta " + (diff > 0 ? "up" : diff < 0 ? "down" : "flat");
      }
    }

    if (chartEl && adaozApr != null) {
      chartEl.innerHTML = buildChart(amount, weekly, adaozApr, comparePool?.apr, months, comparePool?.ticker);
    }
  }
}

// Continuous-DCA + compounding balance at a given number of epochs.
function balanceAtEpoch(P, weekly, aprPct, epochs) {
  const i = aprPct / 100 / 73;
  const ce = weekly * 52 / 73;
  if (i === 0) return P + ce * epochs;
  const growth = Math.pow(1 + i, epochs);
  return P * growth + ce * (growth - 1) / i;
}

function project(amount, weekly, aprPct, years) {
  const epochs = years * 73;
  const final = balanceAtEpoch(amount, weekly, aprPct, epochs);
  const contributed = weekly * 52 * years;
  const rewards = final - amount - contributed;
  return {
    final,
    contributed,
    rewards,
    avgPerEpoch: rewards / Math.max(1, epochs),
    avgPerYear: rewards / Math.max(0.01, years),
  };
}

// SVG area chart of ADA balance over the horizon, monthly sampling.
// ADAOZ as filled area in brand blue, compare as a line in amber.
function buildChart(amount, weekly, aprAdaoz, aprCompare, months, compareTicker) {
  // Wider viewBox so the chart reads as a proper landscape area chart
  // when given the full container width.
  const W = 1200, H = 380;
  const PAD_L = 96, PAD_R = 32, PAD_T = 32, PAD_B = 48;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const n = Math.max(1, months);

  // Sample monthly
  const adaozSeries = [];
  const compareSeries = aprCompare != null ? [] : null;
  let yMax = amount || 1;
  for (let m = 0; m <= n; m++) {
    const epochs = (m / 12) * 73;
    const a = balanceAtEpoch(amount, weekly, aprAdaoz, epochs);
    adaozSeries.push(a);
    if (a > yMax) yMax = a;
    if (compareSeries) {
      const c = balanceAtEpoch(amount, weekly, aprCompare, epochs);
      compareSeries.push(c);
      if (c > yMax) yMax = c;
    }
  }
  yMax = yMax * 1.06; // 6% headroom
  const yMin = 0;

  const xStep = innerW / n;
  const yScale = (v) => PAD_T + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const pts = (series) => series.map((v, i) => [PAD_L + i * xStep, yScale(v)]);

  const linePath = (p) =>
    p.map(([x, y], i) => (i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`)).join(" ");
  const areaPath = (p) =>
    linePath(p) + ` L${p[p.length - 1][0].toFixed(1)},${PAD_T + innerH} L${p[0][0].toFixed(1)},${PAD_T + innerH} Z`;

  const adaozPts = pts(adaozSeries);
  const comparePts = compareSeries ? pts(compareSeries) : null;

  // Y axis ticks (4 lines)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => yMin + (yMax - yMin) * f);
  const gridY = yTicks.map((v) => {
    const y = yScale(v);
    return `<line x1="${PAD_L}" x2="${W - PAD_R}" y1="${y}" y2="${y}" stroke="#e3e8ef" stroke-width="1" stroke-dasharray="2 4"/>
            <text x="${PAD_L - 10}" y="${y + 4}" text-anchor="end" font-family="JetBrains Mono,ui-monospace,monospace" font-size="22" fill="#5b6477">${formatAdaShort(v)}</text>`;
  }).join("");

  // X axis ticks (start, mid, end)
  const xTickIdxs = [0, Math.floor(n / 2), n];
  const xTicks = xTickIdxs.map((m) => {
    const x = PAD_L + m * xStep;
    const label = m === 0 ? "today" : formatHorizonShort(m);
    return `<text x="${x.toFixed(1)}" y="${H - 10}" text-anchor="${m === 0 ? "start" : m === n ? "end" : "middle"}" font-family="JetBrains Mono,ui-monospace,monospace" font-size="22" fill="#5b6477">${label}</text>`;
  }).join("");

  const compareLayer = comparePts
    ? `<path d="${linePath(comparePts)}" fill="none" stroke="#c9523f" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="6 4"/>`
    : "";

  // Final-value chip on the ADAOZ line
  const lastA = adaozPts[adaozPts.length - 1];
  const chipW = 140, chipH = 36;
  const chipX = Math.min(W - PAD_R - chipW, Math.max(PAD_L, lastA[0] - chipW - 8));
  const chipY = Math.max(PAD_T, lastA[1] - chipH / 2);

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Projected ADA balance over time">
    <defs>
      <linearGradient id="sc-area-fill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#0033AD" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#0033AD" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${gridY}
    <path d="${areaPath(adaozPts)}" fill="url(#sc-area-fill)"/>
    <path d="${linePath(adaozPts)}" fill="none" stroke="#0033AD" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${compareLayer}
    <g>
      <rect x="${chipX}" y="${chipY}" width="${chipW}" height="${chipH}" rx="6" fill="#0033AD"/>
      <text x="${chipX + chipW / 2}" y="${chipY + 24}" font-family="Poppins,system-ui,sans-serif" font-size="22" font-weight="600" fill="#ffffff" text-anchor="middle">${formatAdaShort(adaozSeries[adaozSeries.length - 1])} ₳</text>
    </g>
    ${xTicks}
  </svg>`;
}

function formatAda(n) {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M ₳";
  if (Math.abs(n) >= 10_000) return Math.round(n).toLocaleString("en-US") + " ₳";
  if (Math.abs(n) >= 100) return n.toLocaleString("en-US", { maximumFractionDigits: 1 }) + " ₳";
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 }) + " ₳";
}
function formatAdaShort(n) {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return Math.round(n).toString();
}
function formatHorizon(months) {
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = months / 12;
  if (Number.isInteger(years)) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years.toFixed(1)} years`;
}
function formatHorizonShort(months) {
  if (months < 12) return `${months}m`;
  const years = months / 12;
  return Number.isInteger(years) ? `${years}y` : `${years.toFixed(1)}y`;
}
function friendlyError(code, q) {
  if (code === "ticker_not_found") return `Couldn't find a pool with ticker "${q}". Check the spelling.`;
  if (code === "invalid_pool_id") return "That doesn't look like a pool ID. Try the bech32 pool1… form, or a ticker.";
  if (code === "invalid_ticker") return "Tickers are 1–8 letters/digits.";
  if (code === "pool_not_found") return "No pool found for that ID.";
  return `Couldn't fetch pool data (${code}). Try again.`;
}
