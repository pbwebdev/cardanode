/*
  cardanode contact form
  - Loads Cloudflare Turnstile only if a site key is exposed via
    <meta name="turnstile-sitekey" content="..."> (otherwise skipped).
  - Posts JSON to /api/contact. The Worker handles Turnstile verify +
    Discord webhook + Resend email (whichever secrets are set).
  - Honeypot field "website" is hidden via CSS; bots fill it, Worker drops.
*/

const form = document.getElementById("contact-form");
if (form) initForm(form);

function initForm(form) {
  const statusEl = form.querySelector(".cf-status");
  const submitBtn = form.querySelector('button[type="submit"]');
  const widgetSlot = form.querySelector("[data-turnstile]");
  const siteKey = document.querySelector('meta[name="turnstile-sitekey"]')?.content;
  let widgetId = null;

  if (siteKey && widgetSlot) {
    loadTurnstile().then(() => {
      widgetId = window.turnstile.render(widgetSlot, {
        sitekey: siteKey,
        theme: "light",
      });
    }).catch(() => { /* widget script blocked; submit will fail Worker check */ });
  } else if (widgetSlot) {
    widgetSlot.remove();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    const data = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      message: form.elements.message.value.trim(),
      website: form.elements.website?.value || "",
      token: widgetId != null ? window.turnstile?.getResponse(widgetId) : "",
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setStatus("Thanks — message sent. Peter will be in touch.", "ok");
      form.reset();
      if (widgetId != null) window.turnstile?.reset(widgetId);
    } catch (err) {
      setStatus(friendlyError(err.message), "error");
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
    missing_turnstile_token: "Please complete the bot check.",
    turnstile_failed: "Bot check failed — refresh and try again.",
    delivery_failed: "Couldn't send right now. Try again in a minute.",
  };
  return map[err] || "Something went wrong — try again in a minute.";
}
