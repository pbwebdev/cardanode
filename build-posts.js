/*
  Compiles src/content/posts/*.md into:
    - public/<slug>/index.html              one per post
    - public/blog/index.html                paginated post list, page 1
    - public/blog/page/<n>/index.html       additional pages
    - public/blog/category/<slug>/index.html per-category index

  Templates live in src/templates/{base,post,blog-index}.html.
*/
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const POSTS_DIR = "src/content/posts";
const COMMENTS_DIR = "src/content/comments";
const TEMPLATES_DIR = "src/templates";
const OUT = "public";
const SITE = "https://dev.cardanode.com.au"; // canonicals; flip to apex at launch
const PAGE_SIZE = 12;
const RELATED_COUNT = 3;

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

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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
      // Hero dedup: if the first <img> in the body matches ogImage, drop it
      // from the body so the hero (rendered separately) doesn't duplicate.
      let bodyMd = content;
      if (data.ogImage) {
        const firstImg = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
        if (firstImg && firstImg[1] === data.ogImage) {
          bodyMd = content.replace(firstImg[0], "").trimStart();
        }
      }
      return {
        ...data,
        slug,
        bodyHtml: marked.parse(bodyMd),
        comments,
        categoriesSlugged: (data.categories || []).map((c) => ({ name: c, slug: slugify(c) })),
      };
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function renderCategoryBadges(categories) {
  if (!categories?.length) return "";
  return categories
    .map((c) => `<a class="cat-badge" href="/blog/category/${c.slug}/">${escapeHtml(c.name)}</a>`)
    .join(" ");
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

function relatedFor(post, all) {
  const sameCats = new Set(post.categoriesSlugged.map((c) => c.slug));
  return all
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({
      post: p,
      overlap: p.categoriesSlugged.filter((c) => sameCats.has(c.slug)).length,
    }))
    .filter((x) => x.overlap > 0)
    .sort((a, b) =>
      b.overlap - a.overlap || String(b.post.date).localeCompare(String(a.post.date)),
    )
    .slice(0, RELATED_COUNT)
    .map((x) => x.post);
}

function renderRelated(related) {
  if (!related.length) return "";
  const cards = related
    .map(
      (p) => `    <article class="post-card related">
      <h3><a href="/${p.slug}/">${escapeHtml(p.title || p.slug)}</a></h3>
      <p class="meta">${escapeHtml(p.date || "")}</p>
    </article>`,
    )
    .join("\n");
  return `<section class="related" style="max-width:760px;margin:48px auto 0;">
  <h2>Related reading</h2>
  <div class="post-list">
${cards}
  </div>
</section>`;
}

function renderPost(post, all) {
  const dir = join(OUT, post.slug);
  mkdirSync(dir, { recursive: true });

  const categoriesLine = post.categoriesSlugged.length
    ? " · " + renderCategoryBadges(post.categoriesSlugged)
    : "";
  const heroImage = post.ogImage
    ? `<img class="hero" src="${escapeHtml(post.ogImage)}" alt="">`
    : "";
  const content =
    render(postTpl, {
      title: escapeHtml(post.title || post.slug),
      date: escapeHtml(post.date || ""),
      categoriesLine,
      heroImage,
      body: post.bodyHtml,
      commentsBlock: renderComments(post.comments),
    }) + renderRelated(relatedFor(post, all));

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

function renderIndexPage(posts, pageNum, totalPages, opts = {}) {
  const { categoryName, categorySlug, totalAll } = opts;
  const cards = posts
    .map(
      (p) => `    <article class="post-card">
      <h2><a href="/${p.slug}/">${escapeHtml(p.title || p.slug)}</a></h2>
      <p class="meta">${escapeHtml(p.date || "")}${p.categoriesSlugged.length ? " · " + renderCategoryBadges(p.categoriesSlugged) : ""}${p.comments?.length ? ` · ${p.comments.length} comment${p.comments.length === 1 ? "" : "s"}` : ""}</p>
      ${p.excerpt ? `<p>${escapeHtml(p.excerpt)}</p>` : ""}
    </article>`,
    )
    .join("\n");

  const basePath = categorySlug ? `/blog/category/${categorySlug}` : "/blog";
  const pagination = totalPages > 1 ? renderPagination(pageNum, totalPages, basePath) : "";

  const heading = categoryName
    ? `Blog · ${escapeHtml(categoryName)}`
    : "Blog";
  const intro = categoryName
    ? `${posts.length} of ${totalAll} articles in <strong>${escapeHtml(categoryName)}</strong>. <a href="/blog/">← All articles</a>`
    : `${totalAll} articles on Cardano staking, DeFi, NFTs, stake pool operations, and Learn Cardano podcast episodes.`;

  const content = render(indexTpl, {
    heading,
    intro,
    cards,
    categoryStrip,
    pagination,
  });

  const html = render(baseTpl, {
    title:
      pageNum === 1
        ? `${heading} · cardanode`
        : `${heading} · page ${pageNum} · cardanode`,
    description: categoryName
      ? `Posts tagged ${categoryName} on cardanode.`
      : "Articles on Cardano staking, DeFi, NFTs, stake pool operations, and Learn Cardano podcast episodes.",
    ogTitle: `${heading} · cardanode`,
    ogImage: "",
    canonical:
      pageNum === 1 ? `${SITE}${basePath}/` : `${SITE}${basePath}/page/${pageNum}/`,
    content,
  });

  const outDir =
    pageNum === 1
      ? join(OUT, ...(categorySlug ? ["blog", "category", categorySlug] : ["blog"]))
      : join(OUT, ...(categorySlug ? ["blog", "category", categorySlug, "page", String(pageNum)] : ["blog", "page", String(pageNum)]));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
}

function renderPagination(current, total, basePath) {
  const pageHref = (n) => (n === 1 ? `${basePath}/` : `${basePath}/page/${n}/`);
  const link = (n, label) =>
    n === current
      ? `<span class="page current">${label}</span>`
      : `<a class="page" href="${pageHref(n)}">${label}</a>`;
  const parts = [];
  if (current > 1) parts.push(link(current - 1, "← Newer"));
  for (let n = 1; n <= total; n++) parts.push(link(n, String(n)));
  if (current < total) parts.push(link(current + 1, "Older →"));
  return `<nav class="pagination" aria-label="Pagination">${parts.join(" ")}</nav>`;
}

/* ---------------- run ---------------- */

const posts = loadPosts();

// Build category index
const categoryMap = new Map();
for (const p of posts) {
  for (const c of p.categoriesSlugged) {
    if (!categoryMap.has(c.slug)) categoryMap.set(c.slug, { name: c.name, slug: c.slug, posts: [] });
    categoryMap.get(c.slug).posts.push(p);
  }
}
const categories = [...categoryMap.values()].sort((a, b) => b.posts.length - a.posts.length);

// Category strip rendered above blog cards
const categoryStrip = `<nav class="cat-strip" aria-label="Categories">
  <a class="cat-pill" href="/blog/">All <span class="n">${posts.length}</span></a>
${categories
  .map(
    (c) => `  <a class="cat-pill" href="/blog/category/${c.slug}/">${escapeHtml(c.name)} <span class="n">${c.posts.length}</span></a>`,
  )
  .join("\n")}
</nav>`;

// Per-post pages
posts.forEach((p) => renderPost(p, posts));

// Main blog index (paginated)
const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
for (let p = 1; p <= totalPages; p++) {
  const slice = posts.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  renderIndexPage(slice, p, totalPages, { totalAll: posts.length });
}

// Per-category index pages (paginated)
for (const cat of categories) {
  const catTotal = Math.max(1, Math.ceil(cat.posts.length / PAGE_SIZE));
  for (let p = 1; p <= catTotal; p++) {
    const slice = cat.posts.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
    renderIndexPage(slice, p, catTotal, {
      categoryName: cat.name,
      categorySlug: cat.slug,
      totalAll: posts.length,
    });
  }
}

console.log(
  `✓ Generated ${posts.length} post pages + ${totalPages} blog index pages + ${categories.length} category indexes.`,
);
