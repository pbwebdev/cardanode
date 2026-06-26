#!/usr/bin/env node
// Final build step: replace the <link rel="stylesheet" href="/styles/main.css">
// in every HTML file under public/ with an inline <style>...</style> block
// containing the already-minified CSS. Kills the render-blocking CSS
// network request PSI flagged (Est savings ~300 ms).
//
// Trade-off: HTML payload grows by ~7 KB but cache-control is max-age=0 so
// HTML refetches every request anyway. Net win for the cold-load metric
// PSI measures; near-zero impact on repeat visits.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const PUBLIC = "public";
const CSS_PATH = join(PUBLIC, "styles/main.css");
const css = readFileSync(CSS_PATH, "utf8");
const styleTag = `<style>${css}</style>`;

// Match the link tag with or without a Worker-stamped ?v= query string.
const linkRe = /<link\s+rel="stylesheet"\s+href="\/styles\/main\.css(?:\?[^"]*)?">/g;

let walked = 0, patched = 0;
for (const file of walk(PUBLIC)) {
  if (!file.endsWith(".html")) continue;
  walked++;
  const html = readFileSync(file, "utf8");
  if (!linkRe.test(html)) { linkRe.lastIndex = 0; continue; }
  linkRe.lastIndex = 0;
  const out = html.replace(linkRe, styleTag);
  writeFileSync(file, out);
  patched++;
}

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

console.log(`✓ inlined ${css.length.toLocaleString()}B of CSS into ${patched} HTML pages (scanned ${walked}).`);
