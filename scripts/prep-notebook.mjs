// Prepares Zoya's handwritten notebook photos for the web:
//   1. Crops the screen/taskbar off the top of each photo.
//   2. Resizes and compresses so pages load fast on phones.
//
// Non-destructive: originals are moved to notebook-originals/ on first run and
// every later run re-processes from those, so it's safe to re-run after tweaking
// the crop values below.
//
// Usage: node scripts/prep-notebook.mjs
import { mkdir, rename, access, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = "public/notebook";
const ORIG_DIR = "notebook-originals";

// Fraction of the image height to trim off the TOP (removes the laptop screen /
// Windows taskbar visible above the paper). Tuned per photo.
const CROP_TOP = {
  cat: 0.045,
  basketball: 0.085,
  bird: 0.08,
  fridge: 0.1,
};

// Small trim off the other edges to tidy the desk/keyboard borders.
const CROP_SIDES = 0.01;
const CROP_BOTTOM = 0.01;

const MAX_WIDTH = 1200;
const QUALITY = 82;

await mkdir(ORIG_DIR, { recursive: true });

const names = Object.keys(CROP_TOP);
let done = 0;

for (const name of names) {
  const outPath = path.join(OUT_DIR, `${name}.jpg`);
  const origPath = path.join(ORIG_DIR, `${name}.jpg`);

  // First run: stash the original away so we always process from a pristine copy.
  if (!existsSync(origPath)) {
    if (!existsSync(outPath)) {
      console.log(`⏭  ${name}.jpg — not found, skipping`);
      continue;
    }
    await rename(outPath, origPath);
  }

  const image = sharp(origPath);
  const { width, height } = await image.metadata();
  if (!width || !height) {
    console.log(`⚠️  ${name}.jpg — unreadable, skipping`);
    continue;
  }

  const top = Math.round(height * CROP_TOP[name]);
  const left = Math.round(width * CROP_SIDES);
  const cropW = width - left * 2;
  const cropH = height - top - Math.round(height * CROP_BOTTOM);

  await image
    .extract({ top, left, width: cropW, height: cropH })
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(outPath);

  const before = (await sharp(origPath).metadata()).size ?? 0;
  const after = (await sharp(outPath).metadata()).size ?? 0;
  console.log(
    `✅ ${name}.jpg  ${width}×${height} → ${MAX_WIDTH}px wide  ` +
      `(${(before / 1e6).toFixed(1)}MB → ${(after / 1e3).toFixed(0)}KB)`,
  );
  done++;
}

const remaining = (await readdir(OUT_DIR)).filter((f) => f.endsWith(".jpg"));
console.log(`\n${done} processed. ${remaining.length} photo(s) in ${OUT_DIR}/`);
if (done === 0) {
  console.log(`\nSave the 4 photos into ${OUT_DIR}/ as: ${names.map((n) => n + ".jpg").join(", ")}`);
}
await access(OUT_DIR);
