#!/usr/bin/env node
// Renders src/static/favicon.svg to every PNG variant Google + Apple +
// Android Chrome expect, plus a real favicon.ico (PNG embedded in an
// ICO wrapper so it passes Google's "must be .ico or .png" check).
//
// Also re-encodes src/static/images/opengraph.png to a tighter PNG so
// the 1.8 MB source ships as something social platforms actually fetch.
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SVG = "src/static/favicon.svg";
const OUT = "src/static";
const svgBuf = readFileSync(SVG);

// PNG variants for Google search, manifest, and Apple touch-icon.
const sizes = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
];

for (const { name, size } of sizes) {
  const out = join(OUT, name);
  await sharp(svgBuf, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 95, compressionLevel: 9, adaptiveFiltering: true })
    .toFile(out);
  console.log(`  ✓ ${name.padEnd(30)} ${size}×${size}`);
}

// favicon.ico: a single 32×32 PNG wrapped in a valid ICO container.
const png32 = await sharp(svgBuf, { density: 256 })
  .resize(32, 32)
  .png({ compressionLevel: 9 })
  .toBuffer();
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type = icon
header.writeUInt16LE(1, 4); // image count
const entry = Buffer.alloc(16);
entry[0] = 32;                       // width (32; 0 = 256)
entry[1] = 32;                       // height
entry[2] = 0;                        // palette
entry[3] = 0;                        // reserved
entry.writeUInt16LE(1, 4);           // colour planes
entry.writeUInt16LE(32, 6);          // bits per pixel
entry.writeUInt32LE(png32.length, 8); // image size
entry.writeUInt32LE(22, 12);         // offset (6 + 16)
writeFileSync(join(OUT, "favicon.ico"), Buffer.concat([header, entry, png32]));
console.log(`  ✓ favicon.ico                  PNG-in-ICO wrapper, ${(22 + png32.length).toLocaleString()} B`);

// Re-encode opengraph.png if it's larger than ~500 KB.
const ogPath = join(OUT, "images/opengraph.png");
if (existsSync(ogPath)) {
  const before = statSync(ogPath).size;
  if (before > 500_000) {
    await sharp(ogPath)
      .png({ quality: 90, compressionLevel: 9, palette: true })
      .toFile(ogPath + ".tmp");
    const after = statSync(ogPath + ".tmp").size;
    if (after < before) {
      writeFileSync(ogPath, readFileSync(ogPath + ".tmp"));
      console.log(`  ✓ images/opengraph.png         ${(before / 1024).toFixed(0)} kB → ${(after / 1024).toFixed(0)} kB`);
    }
    try { (await import("node:fs/promises")).unlink(ogPath + ".tmp").catch(() => {}); } catch {}
  }
}
