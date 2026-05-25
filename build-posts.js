/*
  Compiles src/content/posts/*.md into:
    - public/<slug>/index.html        (one per post)
    - public/blog/index.html          (paginated post list, page 1)
    - public/blog/page/<n>/index.html (additional pages)

  Templates live in src/templates/{base,post,blog-index}.html and use {{var}}
  placeholders. Frontmatter is parsed with gray-matter, body with marked.
  Comments come from src/content/comments/<slug>.json (PII-stripped JSON).

  Phase 0: ran with 0 posts as a sanity check. Phase 1 onwards populates
  src/content/ via `npm run migrate`.
*/
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const POSTS_DIR = "src/content/posts";
const COMMENTS_DIR = "src/content/comments";
const TEMPLATES_DIR = "src/templates";
const OUT = "public";
const SITE = "https://cardanode.com.au";
const PAGE_SIZE = 12;

marked.setOptions({ mangle: false, headerIds: true });

const baseTpl = readTpl("base.html");
const postTpl = readTpl("post.html");
const indexTpl = readTpl("blog-index.html");

function readTpl(name) {
  const p = join(TEMPLATES_DIR, name);
  if (!existsSync(p)) throw new Error(`Missing template: ${p}`);
  return readFileSync(p, "utf8");
}

function render(template, data) {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = k.split(".").reduce((o, kk) => (o == null ? "" : o[kk]), data);
    return v == null ? "" : String(v);
  });
}

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadPosts() {
  if (!existsSync(POSTS_DIR)) return [];
  return readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = readFileSync(join(POSTS_DIR, f), "utf8");
      const { data, content } = matter(raw);
      const slug = data.slug || f.replace(/\.md$/, "");
      let comments = [];
      const cp = join(COMMENTS_DIR, `${slug}.json`);
      if (existsSync(cp)) {
        try { comments = JSON.parse(readFileSync(cp, "utf8")); } catch { /* ignore */ }
      }
      return {
        ...data,
        slug,
        bodyMd: content,
        bodyHtml: marked.parse(content),
        comments,
      };
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function renderComments(comments) {
  if (!comments?.length) return "";
  const items = comments
    .map(
      (c) => `  <li class="comment">
    <header><strong>${escapeHtml(c.author || "Anonymous")}</strong> <span class="meta">· ${escapeHtml((c.date || "").slice(0, 10))}</span></header>
    <div class="comment-body">${marked.parseInline(c.content || "")}</div>
  </li>`,
    )
    .join("\n");
  return `<section class="comments">
  <h2>Comments (${comments.length})</h2>
  <p class="meta">Comments migrated from the original site. New comments aren't accepted here — drop a note via the <a href="/contact-us/">contact page</a> instead.</p>
  <ul class="comment-list">
${items}
  </ul>
</section>`;
}

function renderPost(post) {
  const dir = join(OUT, post.slug);
  mkdirSync(dir, { recursive: true });

  const categoriesLine = post.categories?.length
    ? " · " + post.categories.map(escapeHtml).join(", ")
    : "";
  const heroImage = post.ogImage
    ? `<img class="hero" src="${escapeHtml(post.ogImage)}" alt="">`
    : "";
  const content = render(postTpl, {
    title: escapeHtml(post.title || post.slug),
    date: escapeHtml(post.date || ""),
    categoriesLine,
    heroImage,
    body: post.bodyHtml,
    commentsBlock: renderComments(post.comments),
  });

  const html = render(baseTpl, {
    title: `${post.title || post.slug} · cardanode`,
    description: post.metaDescription || post.excerpt || post.title || "",
    ogTitle: post.ogTitle || post.title || "",
    ogImage: post.ogImage || "",
    canonical: `${SITE}/${post.slug}/`,
    content,
  });

  writeFileSync(join(dir, "index.html"), html);
}

function renderIndexPage(posts, pageNum, totalPages) {
  const cards = posts
    .map(
      (p) => `    <article class="post-card">
      <h2><a href="/${p.slug}/">${escapeHtml(p.title || p.slug)}</a></h2>
      <p class="meta">${escapeHtml(p.date || "")}${p.categories?.length ? " · " + p.categories.map(escapeHtml).join(", ") : ""}${p.comments?.length ? ` · ${p.comments.length} comment${p.comments.length === 1 ? "" : "s"}` : ""}</p>
      ${p.excerpt ? `<p>${escapeHtml(p.excerpt)}</p>` : ""}
    </article>`,
    )
    .join("\n");

  const pagination = totalPages > 1 ? renderPagination(pageNum, totalPages) : "";

  const content = render(indexTpl, {
    cards,
    count: String(allPostsCount),
    pagination,
  });

  const html = render(baseTpl, {
    title:
      pageNum === 1
        ? "Blog · cardanode"
        : `Blog · page ${pageNum} · cardanode`,
    description:
      "Articles on Cardano staking, DeFi, NFTs, stake pool operations, and Learn Cardano podcast episodes.",
    ogTitle: "Blog · cardanode",
    ogImage: "",
    canonical:
      pageNum === 1 ? `${SITE}/blog/` : `${SITE}/blog/page/${pageNum}/`,
    content,
  });

  const outDir =
    pageNum === 1 ? join(OUT, "blog") : join(OUT, "blog", "page", String(pageNum));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
}

function renderPagination(current, total) {
  const link = (n, label) =>
    n === current
      ? `<span class="page current">${label}</span>`
      : `<a class="page" href="${n === 1 ? "/blog/" : `/blog/page/${n}/`}">${label}</a>`;
  const parts = [];
  if (current > 1) parts.push(link(current - 1, "← Newer"));
  for (let n = 1; n <= total; n++) parts.push(link(n, String(n)));
  if (current < total) parts.push(link(current + 1, "Older →"));
  return `<nav class="pagination" aria-label="Blog pagination">${parts.join(" ")}</nav>`;
}

/* ---------------- run ---------------- */

const posts = loadPosts();
const allPostsCount = posts.length;

posts.forEach(renderPost);

const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
for (let p = 1; p <= totalPages; p++) {
  const slice = posts.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  renderIndexPage(slice, p, totalPages);
}

console.log(`✓ Generated ${posts.length} post page(s) + ${totalPages} blog index page(s).`);
