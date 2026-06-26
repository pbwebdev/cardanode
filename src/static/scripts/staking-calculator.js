/*
  Cardano staking rewards calculator.

  - Default pool: ADAOZ (data fetched once from /api/pool-stats — same
    cached source as the homepage hero stats).
  - User inputs an ADA amount + selects a horizon via slider.
  - Output: projected balance + total rewards earned + APR used.
  - Comparison: optional pool ID or ticker lookup via /api/pool-info.

  Math: Cardano epochs are 5 days, so ~73 per year. We treat the pool's
  lifetime average ROA as the annualised yield, apply discrete per-epoch
  compounding: balance = principal × (1 + apr/100/73)^(years × 73).
*/

const root = document.getElementById("staking-calc");
if (root) initCalc(root);

function initCalc(el) {
  const $ = (sel) => el.querySelector(sel);
  const amountEl = $("#sc-amount");
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
  const adaozPerEpochEl = $("#sc-adaoz-per-epoch");
  const adaozPerYearEl = $("#sc-adaoz-per-year");

  let adaozApr = null;
  let comparePool = null; // { apr, ticker, name, poolId }

  // 1. Load ADAOZ stats (same endpoint the homepage uses)
  fetch("/api/pool-stats")
    .then((r) => r.json())
    .then((d) => {
      adaozApr = d?.lifetime_roa ?? d?.recent_roa ?? 3.3;
      render();
    })
    .catch(() => { adaozApr = 3.3; render(); }); // sensible default

  // 2. Wire inputs
  amountEl.addEventListener("input", render);
  yearsEl.addEventListener("input", render);
  compareBtnEl.addEventListener("click", onCompare);
  compareInputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); onCompare(); } });

  render();

  async function onCompare() {
    const q = compareInputEl.value.trim();
    if (!q) {
      comparePool = null;
      compareWrapperEl.hidden = true;
      compareStatusEl.textContent = "";
      return;
    }
    compareStatusEl.textContent = "Looking up…";
    compareStatusEl.className = "sc-status loading";
    try {
      const isBech = /^pool1[0-9a-z]{50,}$/.test(q);
      const url = isBech ? `/api/pool-info?id=${encodeURIComponent(q)}` : `/api/pool-info?ticker=${encodeURIComponent(q.toUpperCase())}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.error) {
        comparePool = null;
        compareWrapperEl.hidden = true;
        compareStatusEl.textContent = friendlyError(data.error || `HTTP ${res.status}`, q);
        compareStatusEl.className = "sc-status error";
        return;
      }
      const apr = data.lifetime_roa ?? data.recent_roa;
      if (apr == null) {
        comparePool = null;
        compareWrapperEl.hidden = true;
        compareStatusEl.textContent = "Found the pool but no historical reward data yet. Try another pool.";
        compareStatusEl.className = "sc-status error";
        return;
      }
      comparePool = { apr, ticker: data.ticker || "?", name: data.name || data.ticker || data.pool_id.slice(0, 10) + "…", poolId: data.pool_id };
      compareWrapperEl.hidden = false;
      compareStatusEl.textContent = "";
      render();
    } catch (err) {
      comparePool = null;
      compareWrapperEl.hidden = true;
      compareStatusEl.textContent = "Network hiccup, try again.";
      compareStatusEl.className = "sc-status error";
    }
  }

  function render() {
    const amount = Math.max(0, Number(amountEl.value) || 0);
    const years = Number(yearsEl.value) / 12;
    yearsLabelEl.textContent = formatHorizon(Number(yearsEl.value));
    if (adaozApr != null) {
      const r = project(amount, adaozApr, years);
      adaozAprEl.textContent = adaozApr.toFixed(2) + "%";
      adaozFinalEl.textContent = formatAda(r.final);
      adaozRewardsEl.textContent = formatAda(r.rewards);
      adaozPerEpochEl.textContent = formatAda(r.perEpoch);
      adaozPerYearEl.textContent = formatAda(r.perYear);
    }
    if (comparePool) {
      const r = project(amount, comparePool.apr, years);
      compareNameEl.textContent = `${comparePool.ticker} · ${comparePool.name}`;
      compareAprEl.textContent = comparePool.apr.toFixed(2) + "%";
      compareFinalEl.textContent = formatAda(r.final);
      compareRewardsEl.textContent = formatAda(r.rewards);
      if (adaozApr != null) {
        const adaozR = project(amount, adaozApr, years);
        const diff = adaozR.rewards - r.rewards;
        const sign = diff > 0 ? "+" : "";
        compareDeltaEl.textContent = `ADAOZ earns ${sign}${formatAda(diff)} ${diff >= 0 ? "more" : "less"} over the same period`;
        compareDeltaEl.className = "sc-delta " + (diff > 0 ? "up" : diff < 0 ? "down" : "flat");
      }
    }
  }
}

function project(amount, aprPct, years) {
  const epochsPerYear = 73;
  const epochs = Math.round(years * epochsPerYear);
  const perEpochRate = aprPct / 100 / epochsPerYear;
  const final = amount * Math.pow(1 + perEpochRate, epochs);
  const rewards = final - amount;
  const perEpoch = amount * perEpochRate;
  const perYear = amount * (aprPct / 100);
  return { final, rewards, perEpoch, perYear };
}

function formatAda(n) {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M ₳";
  if (Math.abs(n) >= 10_000) return Math.round(n).toLocaleString("en-US") + " ₳";
  if (Math.abs(n) >= 100) return n.toLocaleString("en-US", { maximumFractionDigits: 1 }) + " ₳";
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 }) + " ₳";
}

function formatHorizon(months) {
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = months / 12;
  if (Number.isInteger(years)) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years.toFixed(1)} years`;
}

function friendlyError(code, q) {
  if (code === "ticker_not_found") return `Couldn't find a pool with ticker "${q}". Check the spelling.`;
  if (code === "invalid_pool_id") return "That doesn't look like a pool ID. Try the bech32 pool1… form, or a ticker.";
  if (code === "invalid_ticker") return "Tickers are 1–8 letters/digits.";
  if (code === "pool_not_found") return "No pool found for that ID.";
  return `Couldn't fetch pool data (${code}). Try again.`;
}
