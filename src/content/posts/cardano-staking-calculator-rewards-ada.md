---
title: "Cardano Staking Calculator — Project Your ADA Rewards"
slug: "cardano-staking-calculator-rewards-ada"
date: "2021-06-06"
categories: ["Staking"]
excerpt: "Cardano staking calculator. Project compounding ADA rewards over time at the ADAOZ pool's live APR — and compare against any other pool."
metaDescription: "Project compounding ADA staking rewards at the ADAOZ Cardano stake pool's live APR. Adjust your stake and horizon, compare against any other pool by ID or ticker."
ogTitle: "Cardano Staking Calculator — Project Your ADA Rewards"
ogImage: ""
youtube: []
---
Work out what your ADA could earn over time. Defaults to **ADAOZ's lifetime average ROA** (pulled live from Koios). Enter your stake, drag the slider for time horizon, and optionally compare against another pool by ticker or pool ID.

<div id="staking-calc" class="staking-calc"><div class="sc-grid"><div class="sc-inputs"><div class="sc-field"><label for="sc-amount">Your ADA</label><input id="sc-amount" type="number" min="0" step="1" value="10000" inputmode="decimal"></div><div class="sc-field"><label for="sc-years">Time horizon</label><div class="sc-slider-wrap"><input id="sc-years" type="range" min="1" max="120" step="1" value="36" aria-describedby="sc-years-label"><span id="sc-years-label" class="sc-horizon-out">3 years</span></div></div></div><div class="sc-results has-compare" aria-live="polite"><div class="sc-card adaoz"><div class="sc-card-head"><div class="sc-card-name">ADAOZ · Australia's Cardano stake pool</div><div class="sc-card-apr"><span id="sc-adaoz-apr">—</span> APR</div></div><div class="sc-card-final" id="sc-adaoz-final">—</div><div class="sc-card-rewards">incl. <strong id="sc-adaoz-rewards">—</strong> in rewards</div><div class="sc-card-mini"><div>Per epoch (5 days)<strong id="sc-adaoz-per-epoch">—</strong></div><div>Per year (avg.)<strong id="sc-adaoz-per-year">—</strong></div></div></div><div class="sc-card" id="sc-compare-card" hidden><div class="sc-card-head"><div class="sc-card-name" id="sc-compare-name">—</div><div class="sc-card-apr"><span id="sc-compare-apr">—</span> APR</div></div><div class="sc-card-final" id="sc-compare-final">—</div><div class="sc-card-rewards">incl. <strong id="sc-compare-rewards">—</strong> in rewards</div><div id="sc-compare-delta" class="sc-delta flat">—</div></div></div><div class="sc-compare-block"><label for="sc-compare-input" class="sc-compare-label">Compare another pool</label><div class="sc-compare-input-row"><input id="sc-compare-input" type="text" placeholder="Ticker (e.g. ADAOZ) or pool ID (pool1…)" autocomplete="off"><button id="sc-compare-btn" class="btn" type="button">Compare</button></div><p id="sc-compare-status" class="sc-status"></p></div><p class="sc-foot">APR is the pool's <strong>lifetime average ROA</strong> from Koios — every epoch since the pool began producing blocks. Compounding assumes rewards are restaked each epoch (Cardano rewards auto-compound, so this matches reality). Doesn't include the one-off 2 ₳ stake-key registration deposit or ~0.2 ₳ delegation fee — both are refundable / paid once.</p></div></div>

<script type="module" src="/scripts/staking-calculator.js"></script>

## How to use this calculator

- **Your ADA** — enter the amount you plan to stake. Defaults to 10,000 ₳ as a worked example.
- **Time horizon** — drag the slider from 1 month up to 10 years.
- **Compare another pool** — paste a `pool1…` bech32 pool ID, or just type a ticker (e.g. `IOG1`, `NORTH`). The Worker queries Koios and pulls that pool's lifetime ROA so you can see ADAOZ side-by-side.

The calculator uses each pool's **lifetime average ROA** as its annual yield, then compounds per-epoch (73 epochs/year, ~5 days each). It's a realistic projection: Cardano staking rewards auto-compound on-chain, so what you see is what you'd see in your wallet.

## What's not factored in

- **Pool fees.** The ROA figures already net out the pool operator's margin and fixed fee per epoch, so you don't double-count. Read more in [understanding stake pool fees](/fixed-variable-cardano-ada-staking-fees/).
- **ADA price movement.** This is a pure ADA-denominated projection — your USD/AUD value depends on the ADA price at the time.
- **Network changes.** Cardano protocol parameters (k, d, treasury take) can change via governance and affect ROA going forward.

## Disclaimer

This is a guide, not a guarantee. A pool's "luck" and uptime each epoch affect block production, and historical performance doesn't promise future returns. If your pool starts missing blocks or its operator goes dark, re-delegate — there's no cost beyond a single transaction fee.

## Want to delegate to ADAOZ?

[Connect your wallet and delegate on-chain in two clicks](/#delegate). First-time delegators pay a one-off 2 ₳ stake-key registration deposit, refunded if you ever de-register.
