/*
  cardanode delegation panel — vanilla JS state machine.

  Flow:
    idle → picking → connecting → connected → working → success
                                                      → already-adaoz
                                                      → error
  Mesh SDK (5.2 MB bundle) is dynamically imported on the first click so
  the rest of the homepage stays fast for visitors who never delegate.

  Worker endpoints used:
    GET /api/account-info?stake=stake1...   → registration + current pool
*/

const ADAOZ_POOL_BECH32 = "pool1vev8z03vh7jwx3mfrgzrt9fltt97nupaxv8ffj4r5r8mgwts5ze";

// Wallets we'll show first if installed (rest of detected wallets appear after).
const PRIORITY_WALLETS = ["lace", "eternl", "nami", "typhon", "nufi", "begin", "yoroi"];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const panel = $("#delegate-panel");
if (panel) initPanel();

function initPanel() {
  let mesh = null;
  let wallet = null;          // BrowserWallet instance once connected
  let stakeAddress = null;    // stake1...
  let changeAddress = null;
  let accountInfo = null;

  setState("idle");

  // Event delegation for buttons.
  panel.addEventListener("click", async (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "open-picker") return openPicker();
    if (action === "cancel") return setState("idle");
    if (action === "disconnect") return disconnect();
    if (action === "delegate") return startDelegation();
    if (action === "reset") return reset();
    if (action === "retry") return setState(wallet ? "connected" : "idle");
  });

  async function loadMesh() {
    if (!mesh) {
      setStatusBanner("Loading wallet SDK (~5 MB, one-time)…");
      mesh = await import("/vendor/mesh.mjs");
      setStatusBanner("");
    }
    return mesh;
  }

  async function openPicker() {
    try {
      const m = await loadMesh();
      const installed = m.BrowserWallet.getInstalledWallets();
      if (!installed.length) {
        return showError(
          "No Cardano wallet detected. Install <a href='https://www.lace.io/' target='_blank' rel='noopener noreferrer'>Lace</a> or <a href='https://eternl.io/' target='_blank' rel='noopener noreferrer'>Eternl</a> and refresh.",
        );
      }
      // Stable, deterministic ordering: priority list first, then rest alphabetical.
      const byPriority = (a, b) => {
        const ai = PRIORITY_WALLETS.indexOf(a.name.toLowerCase());
        const bi = PRIORITY_WALLETS.indexOf(b.name.toLowerCase());
        if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      };
      const sorted = [...installed].sort(byPriority);

      const list = $("#dp-wallets");
      list.innerHTML = "";
      for (const w of sorted) {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.className = "wallet-pick";
        btn.type = "button";
        btn.dataset.walletId = w.name;
        btn.setAttribute("aria-label", `Connect ${pretty(w.name)} wallet`);
        btn.innerHTML = `
          ${w.icon ? `<img src="${w.icon}" alt="" width="28" height="28">` : `<span class="wallet-fallback-icon" aria-hidden="true">${pretty(w.name).charAt(0)}</span>`}
          <span class="wallet-name">${pretty(w.name)}</span>
        `;
        btn.addEventListener("click", () => connect(w.name));
        li.appendChild(btn);
        list.appendChild(li);
      }
      setState("picking");
    } catch (err) {
      console.error(err);
      showError("Couldn't load the wallet SDK. Refresh and try again.");
    }
  }

  async function connect(walletId) {
    setState("connecting");
    setStatusBanner(`Connecting to ${pretty(walletId)}…`);
    try {
      const m = await loadMesh();
      wallet = await m.BrowserWallet.enable(walletId);
      const rewardAddresses = await wallet.getRewardAddresses();
      stakeAddress = rewardAddresses?.[0];
      changeAddress = await wallet.getChangeAddress();
      if (!stakeAddress) throw new Error("Wallet didn't return a stake address.");

      // Look up registration + current pool via Worker → Koios.
      const res = await fetch(`/api/account-info?stake=${encodeURIComponent(stakeAddress)}`);
      if (!res.ok) throw new Error(`Account lookup failed (${res.status})`);
      accountInfo = await res.json();

      renderConnected();
      setState("connected");
    } catch (err) {
      console.error(err);
      showError(err?.message?.includes("user declined")
        ? "Connection cancelled. No problem — click Connect when you're ready."
        : `Couldn't connect: ${escapeHtml(err?.message || "unknown error")}`);
    } finally {
      setStatusBanner("");
    }
  }

  function renderConnected() {
    $("#dp-stake-addr").textContent = shortAddr(stakeAddress);
    $("#dp-stake-addr").title = stakeAddress;

    const reg = accountInfo.registered;
    const adaoz = accountInfo.is_delegated_to_adaoz;
    const balance = accountInfo.total_balance_ada;
    const currentPool = accountInfo.delegated_pool;

    $("#dp-reg-status").innerHTML = reg
      ? "<span class='ok'>Registered</span>"
      : "<span class='warn'>Not registered (one-time 2 ₳ deposit required)</span>";

    $("#dp-current-pool").innerHTML = adaoz
      ? "<span class='ok'>ADAOZ 🎉</span>"
      : currentPool
        ? `Another pool (<code>${shortPool(currentPool)}</code>)`
        : "Not delegated yet";

    $("#dp-balance").textContent = balance != null
      ? balance.toLocaleString("en-US") + " ₳"
      : "—";

    // Big delegate button text adapts to context.
    const btn = $("#dp-delegate");
    if (adaoz) {
      btn.hidden = true;
    } else {
      btn.hidden = false;
      btn.textContent = reg ? "Delegate to ADAOZ" : "Register & delegate to ADAOZ";
    }
  }

  async function startDelegation() {
    if (accountInfo?.is_delegated_to_adaoz) {
      return setState("already-adaoz");
    }
    setState("working");
    setWorking("Building transaction", "Composing the delegation certificate…");
    try {
      const m = await loadMesh();
      const provider = new m.KoiosProvider("api");

      const tx = new m.MeshTxBuilder({
        fetcher: provider,
        submitter: provider,
        verbose: false,
      });

      // Stake-key registration cert first, only if needed (one-time 2 ₳ deposit).
      if (!accountInfo.registered) {
        tx.registerStakeCertificate(stakeAddress);
      }
      tx.delegateStakeCertificate(stakeAddress, ADAOZ_POOL_BECH32);

      const utxos = await wallet.getUtxos();
      tx.changeAddress(changeAddress).selectUtxosFrom(utxos);
      const unsignedTx = await tx.complete();

      setWorking("Sign in your wallet", "Your wallet will pop up — review and approve.");
      const signedTx = await wallet.signTx(unsignedTx);

      setWorking("Submitting", "Pushing the signed transaction to the network…");
      const txHash = await wallet.submitTx(signedTx);

      // Bust the account-info cache locally so future checks reflect the new state.
      accountInfo = { ...accountInfo, is_delegated_to_adaoz: true, delegated_pool: ADAOZ_POOL_BECH32, registered: true };

      const link = $("#dp-tx-link");
      link.href = `https://cardanoscan.io/transaction/${txHash}`;
      link.textContent = txHash;
      setState("success");
    } catch (err) {
      console.error(err);
      const msg = String(err?.message || err || "");
      if (/declined|user denied|cancel/i.test(msg)) {
        showError("Signature cancelled. Nothing was sent.");
      } else if (/insufficient|UTxO Balance|balance/i.test(msg)) {
        showError("Not enough ADA in this wallet to cover the deposit + fees (~3 ₳ for first-time delegators, otherwise ~0.2 ₳).");
      } else {
        showError(`Delegation failed: ${escapeHtml(msg.slice(0, 200))}`);
      }
    } finally {
      setWorking("", "");
    }
  }

  function disconnect() {
    wallet = null;
    stakeAddress = null;
    changeAddress = null;
    accountInfo = null;
    setState("idle");
  }

  function reset() {
    setState(wallet ? "connected" : "idle");
  }

  /* ---- state helpers ---- */

  function setState(name) {
    panel.dataset.state = name;
    $$("[data-show]", panel).forEach((el) => {
      el.hidden = el.dataset.show !== name;
    });
    // Move focus to the first heading of the new state, for screen readers.
    const visible = $(`[data-show="${name}"]`, panel);
    const focusTarget = visible?.querySelector("h3, button, [tabindex]");
    if (focusTarget && document.activeElement !== focusTarget) {
      // Don't yank focus on initial render
      if (name !== "idle") focusTarget.focus({ preventScroll: false });
    }
  }

  function setStatusBanner(text) {
    const el = $("#dp-status-banner");
    if (!el) return;
    el.textContent = text;
    el.hidden = !text;
  }

  function setWorking(title, msg) {
    $("#dp-working-title").textContent = title;
    $("#dp-working-msg").textContent = msg;
  }

  function showError(htmlMsg) {
    $("#dp-error-msg").innerHTML = htmlMsg;
    setState("error");
  }
}

/* ---- pure helpers ---- */

function pretty(name) {
  return String(name || "")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/_/g, " ");
}

function shortAddr(s) {
  if (!s) return "";
  return s.length > 22 ? `${s.slice(0, 12)}…${s.slice(-8)}` : s;
}

function shortPool(s) {
  if (!s) return "";
  return s.length > 22 ? `${s.slice(0, 10)}…${s.slice(-6)}` : s;
}

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
