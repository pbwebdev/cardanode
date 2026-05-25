#!/usr/bin/env node
/*
  WordPress WXR → src/content/posts/*.md + src/content/comments/*.json

  Source: _temp/adaaustraliaadaoz.WordPress.*.xml (gitignored)
  - Skips drafts; only `wp:status === "publish"` posts are emitted.
  - Comments are migrated as static JSON, PII stripped (no emails, no
    gravatar hashes), unapproved comments skipped.
  - YouTube URLs in the post body are cleaned (double-slash `/embed//`,
    trailing `'` / `"` / `"`, querystring junk) so iframes render.
  - Pulls Yoast SEO fields: meta description, OG title, OG image.
  - Rewrites WordPress upload URLs to `/uploads/...` so we own the path.

  Usage:
    node scripts/migrate-posts.mjs                    # auto-finds _temp/*.xml
    node scripts/migrate-posts.mjs path/to/export.xml
*/
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { XMLParser } from "fast-xml-parser";
import TurndownService from "turndown";

const POSTS_DIR = "src/content/posts";
const COMMENTS_DIR = "src/content/comments";
const MANIFEST_PATH = "src/content/post-manifest.json";
/* ---------------- [spreaker] shortcode -> Spreaker iframe ---------------- */

function spreakerIframeFor(episodeId) {
  // Mirrors the original WordPress shortcode params (light theme, no autoplay,
  // hide download, etc). Spreaker hosts the audio; no external mapping needed.
  const src = `https://widget.spreaker.com/player?episode_id=${episodeId}&theme=light&playlist=false&playlist-continuous=false&autoplay=false&live-autoplay=false&chapters-image=true&episode_image_position=right&hide-logo=false&hide-likes=false&hide-comments=false&hide-sharing=false&hide-download=true`;
  return `<iframe class="podcast-embed" src="${src}" width="100%" height="200" frameborder="0" loading="lazy"></iframe>`;
}

function replaceSpreakerShortcodes(html) {
  // [spreaker ... episode_id=NNNN ... ] in the raw WP HTML (un-escaped).
  return String(html).replace(
    /\[spreaker[^\]]*episode_id=(\d+)[^\]]*\]/gi,
    (_m, id) => spreakerIframeFor(id),
  );
}

/* ---------------- locate WXR ---------------- */

const argPath = process.argv[2];
let wxrFiles;
if (argPath) {
  wxrFiles = [resolve(argPath)];
} else if (existsSync("_temp")) {
  wxrFiles = readdirSync("_temp")
    .filter((f) => f.endsWith(".xml"))
    .map((f) => resolve("_temp", f));
} else {
  console.error("No WXR file given and _temp/ not found.");
  process.exit(1);
}

if (!wxrFiles.length) {
  console.error("No .xml files in _temp/ to process.");
  process.exit(1);
}

// Use the largest XML file as the content source. The smaller "(1).xml" is
// the media-only export per the brief, but we read both in case the larger
// is the media-only one.
wxrFiles.sort((a, b) => statSync(b).size - statSync(a).size);
const wxrPath = wxrFiles[0];
console.log("Reading WXR:", wxrPath);

/* ---------------- parse ---------------- */

const xml = readFileSync(wxrPath, "utf8");
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  trimValues: false,
  // Force category to always be an array (a post with 1 category otherwise
  // parses as a single object, not an array).
  isArray: (name) =>
    ["item", "category", "wp:postmeta", "wp:comment"].includes(name),
});
const doc = parser.parse(xml);
const items = doc?.rss?.channel?.item ?? [];

/* ---------------- helpers ---------------- */

const td = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "_",
});

// Preserve iframes verbatim (turndown otherwise strips them).
// YouTube iframes get a normalised src + responsive attrs; everything
// else (Spotify, etc) is emitted as-is with its original attributes.
td.addRule("preserveIframe", {
  filter: ["iframe"],
  replacement: (_content, node) => {
    const src = node.getAttribute("src") || "";
    if (!src) return "";
    const isYouTube = /youtu(be\.com|\.be)/i.test(src);
    if (isYouTube) {
      return `\n\n<iframe src="${cleanYoutubeUrl(src)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\n\n`;
    }
    // Preserve every original attribute for non-YouTube iframes.
    const attrs = Array.from(node.attributes || [])
      .map((a) => `${a.name}="${String(a.value).replace(/"/g, "&quot;")}"`)
      .join(" ");
    return `\n\n<iframe ${attrs}></iframe>\n\n`;
  },
});

// Clean a YouTube URL: collapse `/embed//id` → `/embed/id`, strip trailing
// quote chars and unicode quote sequences from the manifest noise.
function cleanYoutubeUrl(u) {
  let s = String(u).trim();
  // Strip surrounding/trailing quote characters and unicode " sequences.
  s = s.replace(/\\u0022/g, "").replace(/['"]+$/g, "").replace(/^['"]+/g, "");
  // youtube.com/embed//ID → youtube.com/embed/ID
  s = s.replace(/(youtube\.com\/embed)\/+/, "$1/");
  // Bare youtu.be / youtube.com without protocol → add https://
  if (/^(www\.)?youtu(be\.com|\.be)/i.test(s)) s = "https://" + s;
  if (s.startsWith("//")) s = "https:" + s;
  return s;
}

// Rewrite WP upload URLs (both http and the cdn rewrite) → /uploads/ paths.
function rewriteMedia(html) {
  return String(html)
    .replace(/https?:\/\/cardanode\.com\.au\/wp-content\/uploads\//g, "/uploads/")
    .replace(/https?:\/\/cdn\.cardanode\.com\.au\/wp-content\/uploads\//g, "/uploads/")
    .replace(/https?:\/\/cdn\.cardanode\.com\.au\//g, "/uploads/");
}

// Clean every YouTube URL inside an HTML body before turndown sees it.
function cleanYoutubeInHtml(html) {
  return String(html).replace(
    /(src|href)=("|')([^"']*youtu[^"']*)\2/gi,
    (_m, attr, q, url) => `${attr}=${q}${cleanYoutubeUrl(url)}${q}`,
  );
}

function extractCdata(node) {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "object" && "__cdata" in node) return node.__cdata ?? "";
  if (typeof node === "object" && "#text" in node) return node["#text"] ?? "";
  return "";
}

function yamlEscape(s) {
  if (s == null) return '""';
  const str = String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${str}"`;
}

function firstImageSrc(html) {
  const m = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

/* ---------------- migrate ---------------- */

mkdirSync(POSTS_DIR, { recursive: true });
mkdirSync(COMMENTS_DIR, { recursive: true });

let written = 0;
let skipped = 0;
const manifest = [];
const ytFlagged = []; // dead-or-suspicious YouTube URLs for Peter to review

for (const item of items) {
  const postType = extractCdata(item["wp:post_type"]);
  if (postType !== "post") continue;

  const status = extractCdata(item["wp:status"]);
  if (status !== "publish") {
    skipped++;
    continue;
  }

  const slug = extractCdata(item["wp:post_name"]);
  const title = extractCdata(item.title).trim();
  const date = (extractCdata(item["wp:post_date"]) || "").slice(0, 10);
  const excerpt = extractCdata(item["excerpt:encoded"]).trim();
  const rawContent = extractCdata(item["content:encoded"]);

  // Categories (skip post_tag)
  const categories = (item.category || [])
    .filter((c) => c["@_domain"] === "category")
    .map((c) => extractCdata(c));

  // Yoast meta
  let ogImage = null;
  let ogTitle = null;
  let metaDesc = null;
  const postmeta = item["wp:postmeta"] || [];
  for (const pm of postmeta) {
    const k = extractCdata(pm["wp:meta_key"]);
    const v = extractCdata(pm["wp:meta_value"]);
    if (!v) continue;
    if (k === "_yoast_wpseo_metadesc") metaDesc = v.trim();
    else if (k === "_yoast_wpseo_title") ogTitle = v.trim();
    else if (k === "_yoast_wpseo_opengraph-image") ogImage = v.trim();
  }

  // Strip WP-embedded <style> and <script> blocks entirely — they bled
  // into post bodies as text paragraphs through turndown.
  const noStyle = String(rawContent)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

  // Spreaker shortcodes → Spotify iframes (per-episode if mapped, show otherwise)
  const noSpreaker = replaceSpreakerShortcodes(noStyle);

  // Clean YouTube URLs in the raw HTML before any transform
  const cleanedHtml = cleanYoutubeInHtml(noSpreaker);

  // First image as OG fallback
  if (!ogImage) ogImage = firstImageSrc(cleanedHtml);

  // Collect any cleaned YouTube URLs for the frontmatter
  const ytSet = new Set();
  for (const m of cleanedHtml.matchAll(/(?:https?:)?\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s"'<)]+/gi)) {
    ytSet.add(cleanYoutubeUrl(m[0]));
  }
  const youtube = [...ytSet].sort();

  // Flag suspicious URLs (no recognisable video ID after the path)
  for (const u of youtube) {
    if (!/[A-Za-z0-9_-]{8,}/.test(u.split(/[\/?=]/).pop() || "")) {
      ytFlagged.push({ slug, url: u });
    }
  }

  // HTML → markdown, rewrite media paths
  let body = td.turndown(rewriteMedia(cleanedHtml)).trim();

  if (ogImage) ogImage = rewriteMedia(ogImage);

  // Build frontmatter
  const fm = [
    "---",
    `title: ${yamlEscape(title)}`,
    `slug: ${yamlEscape(slug)}`,
    `date: ${yamlEscape(date)}`,
    `categories: [${categories.map(yamlEscape).join(", ")}]`,
    `excerpt: ${yamlEscape(excerpt.slice(0, 300))}`,
    `metaDescription: ${yamlEscape(metaDesc || excerpt.slice(0, 155) || title)}`,
    `ogTitle: ${yamlEscape(ogTitle || title)}`,
    `ogImage: ${yamlEscape(ogImage || "")}`,
    `youtube: [${youtube.map(yamlEscape).join(", ")}]`,
    "---",
    "",
  ];

  writeFileSync(join(POSTS_DIR, `${slug}.md`), fm.join("\n") + body + "\n");

  // Comments: approved only, PII stripped
  const rawComments = item["wp:comment"] || [];
  const comments = rawComments
    .filter((c) => extractCdata(c["wp:comment_approved"]) === "1")
    .map((c) => ({
      id: extractCdata(c["wp:comment_id"]),
      parent: extractCdata(c["wp:comment_parent"]),
      author: extractCdata(c["wp:comment_author"]).trim(),
      date: extractCdata(c["wp:comment_date"]),
      content: extractCdata(c["wp:comment_content"]).trim(),
    }));
  if (comments.length) {
    writeFileSync(join(COMMENTS_DIR, `${slug}.json`), JSON.stringify(comments, null, 2));
  }

  manifest.push({
    slug,
    title,
    date,
    categories,
    comments: comments.length,
    youtube_count: youtube.length,
  });
  written++;
}

manifest.sort((a, b) => String(b.date).localeCompare(String(a.date)));
mkdirSync("src/content", { recursive: true });
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

console.log(`\n✓ Wrote ${written} posts, skipped ${skipped} drafts.`);
console.log(`  Markdown:  ${POSTS_DIR}/`);
console.log(`  Comments:  ${COMMENTS_DIR}/`);
console.log(`  Manifest:  ${MANIFEST_PATH}`);

if (ytFlagged.length) {
  console.log(`\n⚠  ${ytFlagged.length} YouTube URL(s) look suspicious (review):`);
  for (const f of ytFlagged.slice(0, 20)) console.log(`     ${f.slug}: ${f.url}`);
  if (ytFlagged.length > 20) console.log(`     ... (+${ytFlagged.length - 20} more)`);
}
