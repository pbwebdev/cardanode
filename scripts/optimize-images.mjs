#!/usr/bin/env node
/*
  Walk src/static/images/ + src/static/uploads/ and emit a .webp sibling for
  every .jpg / .jpeg / .png. Skip files that already have a .webp newer than
  the source. Print a summary of bytes saved.

  Run: npm run optimize

  The build pipeline references the original filename in HTML. <picture>
  tags in templates probe for the .webp sibling and prefer it when present;
  the original stays as fallback for browsers without WebP support (which
  in 2025+ is essentially nobody, but it costs nothing to keep).
*/
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import sharp from "sharp";

const ROOTS = ["src/static/images", "src/static/uploads"];
const EXTS = new Set([".jpg", ".jpeg", ".png"]);
const QUALITY = 75;

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile()) yield p;
  }
}

let scanned = 0, converted = 0, skipped = 0, failed = 0;
let bytesIn = 0, bytesOut = 0;
const failures = [];

for (const root of ROOTS) {
  for (const src of walk(root)) {
    const ext = extname(src).toLowerCase();
    if (!EXTS.has(ext)) continue;
    scanned++;
    const webp = src.replace(/\.(jpe?g|png)$/i, ".webp");
    const srcStat = statSync(src);
    if (existsSync(webp)) {
      const webpStat = statSync(webp);
      if (webpStat.mtimeMs >= srcStat.mtimeMs) {
        skipped++;
        bytesIn += srcStat.size;
        bytesOut += webpStat.size;
        continue;
      }
    }
    try {
      // PNGs with alpha keep lossless-style settings; JPEGs use lossy quality.
      const pipeline = sharp(src);
      const meta = await pipeline.metadata();
      const hasAlpha = meta.hasAlpha;
      await pipeline
        .webp({
          quality: QUALITY,
          alphaQuality: 90,
          effort: 5,
          smartSubsample: true,
          nearLossless: hasAlpha && ext === ".png",
        })
        .toFile(webp);
      const outStat = statSync(webp);
      bytesIn += srcStat.size;
      bytesOut += outStat.size;
      converted++;
      const saved = srcStat.size - outStat.size;
      const pct = ((saved / srcStat.size) * 100).toFixed(1);
      process.stdout.write(`  ${src.padEnd(56)} ${humanBytes(srcStat.size).padStart(8)} → ${humanBytes(outStat.size).padStart(8)}  (-${pct}%)\n`);
    } catch (err) {
      failed++;
      failures.push({ src, err: err?.message || String(err) });
    }
  }
}

function humanBytes(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " MB";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + " kB";
  return n + " B";
}

const totalSaved = bytesIn - bytesOut;
console.log(`\nScanned ${scanned} · converted ${converted} · skipped ${skipped} · failed ${failed}`);
console.log(`Total: ${humanBytes(bytesIn)} → ${humanBytes(bytesOut)} (-${humanBytes(totalSaved)}, ${((totalSaved / Math.max(1, bytesIn)) * 100).toFixed(1)}%)`);
if (failures.length) {
  console.log(`\nFailures:`);
  for (const f of failures) console.log(`  ${f.src}: ${f.err}`);
}
