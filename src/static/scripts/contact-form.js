/*
  cardanode contact form (client).

  Anti-spam layers, in order:
   1. Server-signed HMAC token fetched from /api/contact/token on first form
      interaction (focus-in). We wait out the server's MIN_AGE (3.3s) before
      submitting so a fast human never hits the server's `early` fake-success
      drop.
   2. Hidden honeypot field `website` that bots fill and humans don't.
   3. Optional Cloudflare Turnstile widget if <meta name="turnstile-sitekey">
      is present on the page.

  The server also rate-limits by IP and checks Origin. All upstream errors are
  logged there and surfaced to us as a generic message; don't try to parse
  provider-specific details from the response.
*/

const FORM_TOKEN_MIN_AGE_MS = 3300; // slightly over server's 3000 to allow clock skew

const form = document.getElementById("contact-form");
if (form) initForm(form);

function initForm(form) {
  const statusEl = form.querySelector(".cf-status");
  const submitBtn = form.querySelector('button[type="submit"]');
  const widgetSlot = form.querySelector("[data-turnstile]");
  const siteKey = document.querySelector('meta[name="turnstile-sitekey"]')?.content;
  let widgetId = null;

  // Turnstile (optional)
  if (siteKey && widgetSlot) {
    loadTurnstile().then(() => {
      widgetId = window.turnstile.render(widgetSlot, {
        sitekey: siteKey,
        theme: "light",
      });
    }).catch(() => { /* script blocked; server will decide what to do */ });
  } else if (widgetSlot) {
    widgetSlot.remove();
  }

  // Lazy-warm the HMAC form token on first interaction. Readers who never
  // engage the form never pay for the token round-trip.
  let formToken = null;
  let formTokenFetchedAt = 0;
  let warming = null;
  function warmToken() {
    if (formToken || warming) return warming || Promise.resolve();
    warming = fetch("/api/contact/token", { credentials: "omit" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        if (j?.token) {
          formToken = j.token;
          formTokenFetchedAt = Date.now();
        }
      })
      .catch(() => { /* server will reject on missing token */ })
      .finally(() => { warming = null; });
    return warming;
  }
  form.addEventListener("focusin", warmToken, { once: true });
  // Also warm on pointer-over for mouse users who hover before focusing.
  form.addEventListener("pointerenter", warmToken, { once: true });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    try {
      // Make sure we have a token. If the user hit submit before any interaction
      // fired warm (unlikely but possible with autofill + submit), fetch now.
      if (!formToken) {
        await warmToken();
      }

      // Wait out the server's MIN_AGE from token issue. Without this a fast
      // submit would hit `early` and be dropped with a FAKE success.
      if (formToken) {
        const age = Date.now() - formTokenFetchedAt;
        const wait = FORM_TOKEN_MIN_AGE_MS - age;
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      }

      const data = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        message: form.elements.message.value.trim(),
        website: form.elements.website?.value || "",       // honeypot
        formToken: formToken || "",                         // HMAC token
        turnstile: widgetId != null ? window.turnstile?.getResponse(widgetId) : "",
      };

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
        credentials: "omit",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);

      setStatus("Thanks — message sent. Peter will be in touch.", "ok");
      form.reset();
      // Token is single-use in spirit (server allows re-use within MAX_AGE but
      // best to reset so the next submission gets a fresh one).
      formToken = null;
      formTokenFetchedAt = 0;
      if (widgetId != null) window.turnstile?.reset(widgetId);
    } catch (err) {
      setStatus(friendlyError(err.message), "error");
      // On any error, refresh the token so a retry starts clean.
      formToken = null;
      formTokenFetchedAt = 0;
      warmToken();
      if (widgetId != null) window.turnstile?.reset(widgetId);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send message";
    }
  });

  function setStatus(text, kind = "") {
    statusEl.textContent = text;
    statusEl.className = "cf-status" + (kind ? " " + kind : "");
  }
}

function loadTurnstile() {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function friendlyError(err) {
  const map = {
    invalid_name: "Please add your name.",
    invalid_email: "That email address doesn't look right.",
    invalid_message: "Message is too short (or too long).",
    token_missing: "This form needs JavaScript enabled. Please reload the page.",
    token_invalid: "Please reload the page and try again.",
    token_expired: "Please reload the page and try again.",
    turnstile_missing: "Please complete the bot check.",
    turnstile_failed: "Bot check failed. Refresh the page and try again.",
    rate_limited: "Too many attempts. Please wait a minute and try again.",
    payload_too_large: "Message is too long.",
    unsupported_media_type: "Please reload the page and try again.",
    forbidden: "Submission blocked.",
    server_error: "Something went wrong. Please try again in a minute.",
    server_config: "The form isn't available right now.",
    not_found: "Form endpoint unavailable.",
  };
  return map[err] || "Something went wrong. Please try again in a minute.";
}
