#!/usr/bin/env node

import { mkdir, stat } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ICONS_DIR = resolve(ROOT, 'icons');

// Designed on a 128×128 canvas with the circle offset left/up to leave
// room for the magnifying-glass handle in the bottom-right corner.
//
// The "V" is a plain polygon so no font needs to be present on the machine
// — librsvg (used by sharp) renders text through system fonts that differ
// across OSes and CI environments.
//
// V polygon points, verified non-self-intersecting:
//   (22,24) – outer top-left
//   (40,24) – inner top-left   } left arm top (width 18)
//   (58,76) – inner bottom tip
//   (76,24) – inner top-right  } right arm top (width 18)
//   (94,24) – outer top-right
//   (58,88) – outer bottom tip
const SVG = `\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <!-- Teal circle — doubles as the magnifying-glass lens -->
  <circle cx="58" cy="54" r="50" fill="#0D9488"/>
  <!-- Dark handle extending from the lens edge toward the bottom-right corner -->
  <line x1="93" y1="89" x2="116" y2="112"
        stroke="#0F4C45" stroke-width="14" stroke-linecap="round"/>
  <!-- Bold white V (polygon, no font dependency) -->
  <polygon points="22,24 40,24 58,76 76,24 94,24 58,88" fill="white"/>
</svg>`;

const SIZES = [16, 32, 48, 128];

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });
  console.log('Generating VocaSpot icons…\n');

  const svgBuffer = Buffer.from(SVG);

  for (const size of SIZES) {
    const outPath = resolve(ICONS_DIR, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath);

    const { size: bytes } = await stat(outPath);
    console.log(`  icon-${String(size).padEnd(3)}.png   ${bytes.toLocaleString()} bytes`);
  }

  console.log('\nAll 4 icons written to icons/');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
