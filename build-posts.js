/*
  Compiles src/content/posts/*.md into static HTML in public/<slug>/index.html,
  plus a paginated /blog/ index. Frontmatter is parsed with gray-matter, body
  is rendered with marked. Templates live in src/templates/.

  Phase 0: scaffold only — emits a placeholder page if no posts exist yet so
  the build never breaks. Phase 1 fills src/content/ via the migration script.
*/
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const POSTS_DIR = "src/content/posts";
const COMMENTS_DIR = "src/content/comments";
const OUT = "public";

const baseTpl = readTplOr("base.html", DEFAULT_BASE);
const postTpl = readTplOr("post.html", DEFAULT_POST);
const indexTpl = readTplOr("blog-index.html", DEFAULT_INDEX);

function readTplOr(name, fallback) {
  const p = join("src/templates", name);
  return existsSync(p) ? readFileSync(p, "utf8") : fallback;
}

function render(template, data) {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) =>
    k.split(".").reduce((o, kk) => (o == null ? "" : o[kk]), data) ?? "",
  );
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
      return { ...data, slug, body: marked.parse(content), comments };
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function writePost(post) {
  const dir = join(OUT, post.slug);
  mkdirSync(dir, { recursive: true });
  const html = render(baseTpl, {
    title: `${post.title} · cardanode`,
    description: post.metaDescription || post.excerpt || "",
    ogImage: post.ogImage || "",
    content: render(postTpl, post),
  });
  writeFileSync(join(dir, "index.html"), html);
}

function writeBlogIndex(posts) {
  mkdirSync(join(OUT, "blog"), { recursive: true });
  const cards = posts
    .map(
      (p) => `<article class="post-card">
  <h2><a href="/${p.slug}/">${escapeHtml(p.title || p.slug)}</a></h2>
  <p class="meta">${p.date || ""}${p.categories?.length ? " · " + p.categories.map(escapeHtml).join(", ") : ""}</p>
  ${p.excerpt ? `<p>${escapeHtml(p.excerpt)}</p>` : ""}
</article>`,
    )
    .join("\n");
  const html = render(baseTpl, {
    title: "Blog · cardanode",
    description: "Articles on Cardano staking, DeFi, NFTs, and stake pool operations.",
    ogImage: "",
    content: render(indexTpl, { cards, count: posts.length }),
  });
  writeFileSync(join(OUT, "blog", "index.html"), html);
}

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const posts = loadPosts();
posts.forEach(writePost);
writeBlogIndex(posts);
console.log(`✓ Generated ${posts.length} post page(s) + /blog/ index.`);

/* ---------------- fallback templates (used until src/templates/ is filled) ---------------- */

const HEAD_COMMON = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{{title}}</title><meta name="description" content="{{description}}"><link rel="stylesheet" href="/styles/main.css"></head><body>`;
const FOOT_COMMON = `</body></html>`;

function _b() { return ""; } // placeholder so the const declarations below stay tidy
const DEFAULT_BASE_inner = `${HEAD_COMMON}<main class="container">{{content}}</main>${FOOT_COMMON}`;
export const DEFAULT_BASE = DEFAULT_BASE_inner;
export const DEFAULT_POST = `<article class="post"><h1>{{title}}</h1><p class="meta">{{date}}</p>{{body}}</article>`;
export const DEFAULT_INDEX = `<h1>Blog</h1><p>{{count}} posts</p><div class="post-list">{{cards}}</div>`;
