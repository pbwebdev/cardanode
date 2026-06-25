/*
  Latest YouTube videos for the Learn Cardano podcast section.
  Fetches /api/youtube (Worker → YouTube Data API v3, 6h edge cache).
  Lazy: only triggers when the section scrolls into view.
*/

const grid = document.getElementById("yt-grid");
if (grid) {
  whenVisible(grid, () => loadYouTube(grid));
}

function whenVisible(el, fn) {
  if (typeof IntersectionObserver === "undefined") { fn(); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { rootMargin: "300px 0px" });
  io.observe(el);
}

async function loadYouTube(target) {
  try {
    const res = await fetch("/api/youtube");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const items = (data.items || []).slice(0, 6);
    if (!items.length) throw new Error("No videos");
    target.innerHTML = items.map(renderCard).join("");
  } catch (err) {
    target.innerHTML = `<div class="yt-loading yt-error">Couldn't load latest videos right now. <a href="https://www.youtube.com/channel/UCj-_2e7L2UgHaJLrGEOJRzA" target="_blank" rel="noopener noreferrer">Visit the channel →</a></div>`;
  }
}

function renderCard(it) {
  const vid = it.videoId || (it.link.match(/[?&]v=([\w-]+)/) || [])[1] || "";
  const thumb = vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : it.thumbnail;
  const date = it.published ? new Date(it.published).toISOString().slice(0, 10) : "";
  return `<a class="yt-card" href="${esc(it.link)}" target="_blank" rel="noopener noreferrer" aria-label="Watch on YouTube (opens in new tab): ${esc(it.title)}">
    <div class="yt-thumb"><img loading="lazy" src="${esc(thumb)}" alt=""></div>
    <div class="yt-meta">
      <p class="yt-title">${esc(it.title)}</p>
      <div class="yt-date">${esc(date)}</div>
    </div>
  </a>`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
