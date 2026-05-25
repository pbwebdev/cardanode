#!/usr/bin/env node
/*
  Walks src/content/posts/*.md, collects every /uploads/... reference,
  downloads the original from cardanode.com.au, and writes it into
  src/static/uploads/ preserving the YYYY/MM/filename layout.

  - Gitignored on the way down (src/static/uploads/ is in .gitignore).
  - build.js copies src/static/ → public/ each build, so once pulled the
    media ships with `wrangler deploy`.
  - Skips files that already exist locally with the right size.
  - Logs 404s to _temp/media-missing.txt for Peter to review.

  Usage:
    node scripts/pull-media.mjs
*/
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

const POSTS_DIR = "src/content/posts";
const OUT_DIR = "src/static/uploads";
const MISSING_LOG = "_temp/media-missing.txt";
const CONCURRENCY = 6;
const ORIGIN = "https://cardanode.com.au/wp-content/uploads/";

if (!existsSync(POSTS_DIR)) {
  console.error(`${POSTS_DIR}/ does not exist. Run \`npm run migrate\` first.`);
  process.exit(1);
}

/* ---------------- collect URLs ---------------- */

const urls = new Set();
for (const f of readdirSync(POSTS_DIR)) {
  if (!f.endsWith(".md")) continue;
  const body = readFileSync(join(POSTS_DIR, f), "utf8");
  for (const m of body.matchAll(/\/uploads\/([^\s"')]+)/g)) {
    urls.add(m[1]);
  }
}
console.log(`Found ${urls.size} unique /uploads/ references across ${readdirSync(POSTS_DIR).length} post(s).`);

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync("_temp", { recursive: true });

/* ---------------- worker pool ---------------- */

const queue = [...urls];
const missing = [];
let done = 0;
let skipped = 0;
let downloaded = 0;
let failed = 0;

async function worker() {
  while (queue.length) {
    const rel = queue.shift();
    if (!rel) break;
    const out = join(OUT_DIR, rel);

    // Skip if already present and non-empty
    if (existsSync(out) && statSync(out).size > 0) {
      skipped++;
      done++;
      progress();
      continue;
    }

    const url = ORIGIN + rel;
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) {
        if (res.status === 404) missing.push(url);
        else console.warn(`! ${res.status} ${url}`);
        failed++;
      } else {
        const buf = Buffer.from(await res.arrayBuffer());
        mkdirSync(dirname(out), { recursive: true });
        writeFileSync(out, buf);
        downloaded++;
      }
    } catch (err) {
      console.warn(`! ${err.message} ${url}`);
      failed++;
    }
    done++;
    progress();
  }
}

function progress() {
  if (done % 20 === 0 || done === urls.size) {
    process.stdout.write(`\r  ${done}/${urls.size}  (↓${downloaded}  ⇉${skipped}  ✘${failed})    `);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
process.stdout.write("\n");

if (missing.length) {
  writeFileSync(MISSING_LOG, missing.join("\n") + "\n");
  console.log(`⚠  ${missing.length} URLs returned 404 — logged to ${MISSING_LOG}`);
}

console.log(`\n✓ ${downloaded} downloaded, ${skipped} already present, ${failed} failed.`);
console.log(`  Output: ${OUT_DIR}/  (gitignored; build.js copies into public/uploads/)`);
