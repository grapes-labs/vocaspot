#!/usr/bin/env node

import { mkdir, stat } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT  = resolve(__dirname, '..');
const DIST  = resolve(ROOT, 'dist');

// ─── Design tokens ───────────────────────────────────────────────────────────

const TEAL     = '#0D9488';
const TEAL_DRK = '#065F57';
const WHITE    = 'white';
const INK      = '#1a1a1a';
const MUTED    = '#555555';
const DIM      = '#888888';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// The V-in-magnifying-glass logo, native 128×128 canvas.
// Wrap in <g transform="translate(x,y) scale(s)"> to place and size it.
function logo() {
  return `<circle cx="58" cy="54" r="50" fill="${WHITE}" fill-opacity="0.18"/>
    <line x1="93" y1="89" x2="116" y2="112"
          stroke="${WHITE}" stroke-opacity="0.7" stroke-width="14" stroke-linecap="round"/>
    <polygon points="22,24 40,24 58,76 76,24 94,24 58,88" fill="${WHITE}"/>`;
}

// Tooltip card positioned at (x, y) with size (w × h).
// clipId must be unique within the SVG document.
// fs is the base font size; the word renders at fs+2.
function tooltipCard({ x, y, w, h, word, level, pos, def, example, fs = 12, clipId }) {
  const pad = 14;
  const lh  = fs * 1.6;                                        // line height
  const wordPx = (word.length * (fs + 2) * 0.59) | 0;         // rough word width
  const badgeX = x + pad + wordPx + 8;
  const badgeW = ((fs + 2) * 1.9) | 0;
  const badgeH = (fs + 2) + 4;

  return `
    <clipPath id="${clipId}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>
    </clipPath>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${WHITE}"/>
    <rect x="${x}" y="${y}" width="${w}" height="5" fill="${TEAL}" clip-path="url(#${clipId})"/>
    <text x="${x + pad}" y="${y + 7 + lh}"
          font-family="Arial, sans-serif" font-size="${fs + 2}"
          font-weight="bold" fill="${INK}">${word}</text>
    <rect x="${badgeX}" y="${y + 7}" width="${badgeW}" height="${badgeH}" rx="3" fill="${TEAL}"/>
    <text x="${badgeX + (badgeW / 2) | 0}" y="${y + 7 + fs + 2}"
          font-family="Arial, sans-serif" font-size="${fs - 1}"
          font-weight="bold" fill="${WHITE}" text-anchor="middle">${level}</text>
    <text x="${x + pad}" y="${y + 7 + lh * 2.4}"
          font-family="Arial, sans-serif" font-size="${fs}" fill="${MUTED}">${pos} · ${def}</text>
    ${example
      ? `<text x="${x + pad}" y="${y + 7 + lh * 3.45}"
          font-family="Arial, sans-serif" font-size="${fs - 1}"
          fill="${DIM}" font-style="italic">"${example}"</text>`
      : ''}`;
}

// Simulated article-text bars (rounded rects standing in for lines of text).
// Use fill=WHITE on teal backgrounds; fill='#6B7280' on white cards.
function textBars(items, fill = WHITE, opacity = 0.22) {
  return items.map(({ x, y, w, h = 9, rx = 4 }) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"` +
    ` fill="${fill}" opacity="${opacity}"/>`
  ).join('\n  ');
}

// ─── Image 1 — Small promotional tile 440 × 280 ──────────────────────────────

function smallSVG() {
  // Article text bars, left column (x 20–200)
  const ax = 20, ay = 116, sp = 20;
  const articleBars = [
    // line 1 — three segments
    { x: ax,       y: ay,          w: 52 },
    { x: ax + 58,  y: ay,          w: 78 },
    { x: ax + 144, y: ay,          w: 42 },
    // line 2 — before + after the highlighted word (gap 96–154)
    { x: ax,       y: ay + sp,     w: 88 },
    { x: ax + 162, y: ay + sp,     w: 30 },
    // line 3
    { x: ax,       y: ay + sp * 2, w: 128 },
    { x: ax + 136, y: ay + sp * 2, w: 52  },
    // line 4
    { x: ax,       y: ay + sp * 3, w: 104 },
  ];

  // Highlighted word "inflation" sits in line-2 gap
  const hlx = ax + 96, hly = ay + sp, hlw = 58;

  // Tooltip card (right half of content area)
  const ttX = 220, ttY = 108, ttW = 208, ttH = 124;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280">
  <defs>
    <linearGradient id="bg-sm" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${TEAL}"/>
      <stop offset="100%" stop-color="${TEAL_DRK}"/>
    </linearGradient>
  </defs>

  <rect width="440" height="280" fill="url(#bg-sm)"/>

  <!-- Logo: native 128px canvas scaled to 44px, placed at (20,14) -->
  <g transform="translate(20,14) scale(0.344)">
    ${logo()}
  </g>

  <!-- Title + subtitle -->
  <text x="76" y="50"
        font-family="Arial, sans-serif" font-size="30" font-weight="bold"
        fill="${WHITE}">VocaSpot</text>
  <text x="20" y="78"
        font-family="Arial, sans-serif" font-size="15"
        fill="${WHITE}" opacity="0.85">Spot vocabulary words at your level</text>

  <line x1="20" y1="96" x2="420" y2="96"
        stroke="${WHITE}" stroke-opacity="0.2" stroke-width="1"/>

  <!-- Article snippet: simulated text bars (left half) -->
  ${textBars(articleBars)}

  <!-- Highlighted word "inflation" in the article snippet -->
  <rect x="${hlx - 2}" y="${hly}" width="${hlw + 4}" height="13"
        rx="2" fill="${WHITE}" fill-opacity="0.12"/>
  <text x="${hlx}" y="${hly + 10}"
        font-family="Arial, sans-serif" font-size="11" font-weight="bold"
        fill="${WHITE}">inflation</text>
  <line x1="${hlx}" y1="${hly + 14}" x2="${hlx + hlw}" y2="${hly + 14}"
        stroke="${WHITE}" stroke-dasharray="3,2" stroke-width="1.5" opacity="0.9"/>

  <!-- Tooltip card (right half) -->
  ${tooltipCard({
    x: ttX, y: ttY, w: ttW, h: ttH,
    word: 'inflation', level: 'B2',
    pos: 'noun', def: 'general rise in prices',
    example: 'inflation reached 4.2%',
    fs: 12, clipId: 'tc-sm',
  })}
</svg>`;
}

// ─── Image 2 — Marquee banner 1400 × 560 ─────────────────────────────────────

function marqueeSVG() {
  // Right-side article card geometry
  const cx = 740, cy = 48, cw = 614, ch = 464, cp = 32;
  // Body text area inside card starts below headline
  const bx = cx + cp, by0 = cy + cp + 72, bw = cw - cp * 2;

  const cardBars = [
    // paragraph 1 — 4 lines
    { x: bx,       y: by0,        w: bw,         h: 11 },
    { x: bx,       y: by0 + 24,   w: bw - 40,    h: 11 },
    { x: bx,       y: by0 + 48,   w: bw,         h: 11 },
    { x: bx,       y: by0 + 72,   w: bw * 0.65,  h: 11 },
    // paragraph 2 — line with highlighted word (gap at bx+130, width ~126)
    { x: bx,       y: by0 + 112,  w: 122,        h: 11 },
    { x: bx + 264, y: by0 + 112,  w: bw - 264,   h: 11 },
    // continuation
    { x: bx,       y: by0 + 136,  w: bw,         h: 11 },
    { x: bx,       y: by0 + 160,  w: bw - 70,    h: 11 },
  ];

  // Highlighted word "fluctuations" in line of paragraph 2
  const hlx = bx + 130, hly = by0 + 112, hlw = 126;

  // Tooltip floats just below the highlighted word, anchored left to the card body
  const ttX = bx + 40, ttY = hly + 28, ttW = 332, ttH = 150;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="560">
  <defs>
    <linearGradient id="bg-mq" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${TEAL}"/>
      <stop offset="100%" stop-color="${TEAL_DRK}"/>
    </linearGradient>
  </defs>

  <rect width="1400" height="560" fill="url(#bg-mq)"/>

  <!-- Left panel: logo + name + tagline + feature list -->
  <!-- Logo: native 128px scaled to 72px, placed at (60,208) -->
  <g transform="translate(60,208) scale(0.5625)">
    ${logo()}
  </g>

  <text x="158" y="250"
        font-family="Arial, sans-serif" font-size="52" font-weight="bold"
        fill="${WHITE}">VocaSpot</text>
  <text x="62" y="294"
        font-family="Arial, sans-serif" font-size="22"
        fill="${WHITE}" opacity="0.9">Read news. Spot words. Learn naturally.</text>

  <rect x="62" y="314" width="280" height="3" rx="2" fill="${WHITE}" fill-opacity="0.28"/>

  <text x="72" y="356"
        font-family="Arial, sans-serif" font-size="17"
        fill="${WHITE}" opacity="0.82">• Words highlighted at your CEFR level</text>
  <text x="72" y="392"
        font-family="Arial, sans-serif" font-size="17"
        fill="${WHITE}" opacity="0.82">• Instant definitions — no paid APIs</text>
  <text x="72" y="428"
        font-family="Arial, sans-serif" font-size="17"
        fill="${WHITE}" opacity="0.82">• A1 to C2 — you choose the level</text>

  <!-- Right panel: article card mockup -->
  <rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="14" fill="${WHITE}"/>

  <!-- Card headline -->
  <text x="${cx + cp}" y="${cy + cp + 28}"
        font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${INK}">Markets React to Global Economic Shifts</text>
  <line x1="${cx + cp}" y1="${cy + cp + 42}"
        x2="${cx + cw - cp}" y2="${cy + cp + 42}"
        stroke="#E5E7EB" stroke-width="1"/>

  <!-- Body text bars (medium gray on white card) -->
  ${textBars(cardBars, '#6B7280', 0.45)}

  <!-- Highlighted word "fluctuations" -->
  <rect x="${hlx - 2}" y="${hly - 1}" width="${hlw + 4}" height="15"
        rx="2" fill="${TEAL}" fill-opacity="0.12"/>
  <text x="${hlx}" y="${hly + 11}"
        font-family="Arial, sans-serif" font-size="13" font-weight="bold"
        fill="${INK}">fluctuations</text>
  <line x1="${hlx}" y1="${hly + 15}" x2="${hlx + hlw}" y2="${hly + 15}"
        stroke="${TEAL}" stroke-dasharray="4,3" stroke-width="2"/>

  <!-- Tooltip card anchored below the highlighted word -->
  ${tooltipCard({
    x: ttX, y: ttY, w: ttW, h: ttH,
    word: 'fluctuations', level: 'C1',
    pos: 'noun', def: 'irregular rises and falls in value',
    example: 'currency fluctuations affect imports',
    fs: 14, clipId: 'tc-mq',
  })}
</svg>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await mkdir(DIST, { recursive: true });
  console.log('Generating Chrome Web Store promo images…\n');

  const images = [
    { name: 'promo-small-440x280.png',    svg: smallSVG(),   w: 440,  h: 280 },
    { name: 'promo-marquee-1400x560.png', svg: marqueeSVG(), w: 1400, h: 560 },
  ];

  for (const { name, svg, w, h } of images) {
    const out = resolve(DIST, name);
    await sharp(Buffer.from(svg))
      .resize(w, h)
      .png()
      .toFile(out);
    const { size } = await stat(out);
    console.log(`  ${name.padEnd(32)}  ${size.toLocaleString()} bytes`);
  }

  console.log('\nBoth images written to dist/');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
