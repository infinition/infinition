#!/usr/bin/env node
/**
 * Build assets/repos-grid.svg from data/repos.json for the profile README.
 *
 * GitHub renders README images as flat <img>, so a nested <a> inside the SVG
 * is not clickable there. The whole graphic is instead wrapped in a single
 * markdown link back to the interactive #repos page; this script only needs
 * to look like that page, not behave like it.
 *
 * Usage: node scripts/build-repos-svg.mjs [--data data/repos.json] [--out assets/repos-grid.svg] [--limit 0]
 */

import { readFile, writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const argOf = (flag, dflt) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};

const DATA = argOf('--data', 'data/repos.json');
const OUT = argOf('--out', 'assets/repos-grid.svg');
const LIMIT = Number(argOf('--limit', '0')); // 0 = all repos

/* Same tokens as css/themes/infinition.css, kept in sync by hand. */
const COLOR = {
    bg: '#060606',
    grid: 'rgba(255,107,0,0.035)',
    card: '#0d1216',
    cardBorder: 'rgba(255,255,255,0.12)',
    orange: '#FF6B00',
    title: '#ffffff',
    label: '#d1d5db',
    meta: '#4b5563',
    sub: '#6b7280'
};
/* Double-quoted family names would break XML attribute quoting (font-family="...")
   once this is parsed strictly, e.g. by GitHub's own SVG renderer — single quotes only. */
const FONT_UI = "Inter, 'Segoe UI', system-ui, sans-serif";
const FONT_CODE = "'JetBrains Mono', Consolas, Menlo, monospace";

/* Deterministic fallback color for repos without a usable README image, same hash as repos.js. */
const PALETTE = [
    ['#FF6B00', '#7a2f00'], ['#13aff0', '#053b52'], ['#bd00ff', '#3d0052'],
    ['#0aff47', '#04521a'], ['#ff003c', '#520013'], ['#f5c518', '#4a3a00']
];
function hueFor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length][0];
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtStars = n => n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n || 0);

const truncate = (s, max) => s.length > max ? s.slice(0, max - 1) + '…' : s;

/* Icons only, no bounding card — same springboard-icon layout as the live
   #repos grid, just without the hover/click states a static image can't do. */
function buildSvg(repos, totalStars) {
    const COLS = 4;
    const CELL_W = 108, CELL_H = 100, GAP_X = 10, GAP_Y = 14, PAD = 24;
    const HEADER_H = 78, ICON = 56;

    const rows = Math.ceil(repos.length / COLS);
    const width = PAD * 2 + COLS * CELL_W + (COLS - 1) * GAP_X;
    const height = HEADER_H + rows * CELL_H + (rows - 1) * GAP_Y + PAD;

    let defs = '';
    let icons = '';

    repos.forEach((r, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = PAD + col * (CELL_W + GAP_X);
        const y = HEADER_H + row * (CELL_H + GAP_Y);
        const cx = x + CELL_W / 2;
        const iconX = cx - ICON / 2;
        const iconY = y;
        const clipId = `clip${i}`;
        const year = r.created_at ? new Date(r.created_at).getFullYear() : '';
        const lang = r.language || '—';

        defs += `<clipPath id="${clipId}"><rect x="${iconX}" y="${iconY}" width="${ICON}" height="${ICON}" rx="14"/></clipPath>`;

        let iconMarkup;
        if (r.image) {
            iconMarkup = `<image href="${esc(r.image)}" x="${iconX}" y="${iconY}" width="${ICON}" height="${ICON}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`;
        } else {
            const initial = esc((r.name[0] || '?').toUpperCase());
            iconMarkup = `<rect x="${iconX}" y="${iconY}" width="${ICON}" height="${ICON}" rx="14" fill="${COLOR.card}"/>
      <text x="${iconX + ICON / 2}" y="${iconY + ICON / 2 + 8}" text-anchor="middle" font-family="${FONT_UI}" font-size="22" font-weight="700" fill="${hueFor(r.name)}">${initial}</text>`;
        }

        icons += `
  <g>
    <rect x="${iconX - 1}" y="${iconY - 1}" width="${ICON + 2}" height="${ICON + 2}" rx="15" fill="none" stroke="${COLOR.cardBorder}" stroke-width="1"/>
    ${iconMarkup}
    <text x="${cx}" y="${iconY + ICON + 18}" text-anchor="middle" font-family="${FONT_CODE}" font-size="11" font-weight="600" fill="${COLOR.label}">${esc(truncate(r.name, 15))}</text>
    <text x="${cx}" y="${iconY + ICON + 32}" text-anchor="middle" font-family="${FONT_CODE}" font-size="9" fill="${COLOR.meta}">${year} // ${esc(lang)}</text>
  </g>`;
    });

    return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" font-family="${FONT_UI}">
  <defs>
    ${defs}
    <pattern id="gridlines" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="${COLOR.grid}" stroke-width="1"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="${COLOR.bg}"/>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#gridlines)"/>
  <text x="${PAD}" y="38" font-size="24" font-weight="800" fill="${COLOR.title}" letter-spacing="3">REPOS</text>
  <rect x="${PAD + 108}" y="16" width="118" height="24" rx="12" fill="rgba(255,107,0,0.07)" stroke="${COLOR.orange}" stroke-width="1"/>
  <text x="${PAD + 108 + 59}" y="32" text-anchor="middle" font-size="11.5" font-weight="700" fill="${COLOR.orange}" font-family="${FONT_CODE}">★ ${fmtStars(totalStars)} STARS</text>
  <text x="${PAD}" y="60" font-size="11" fill="${COLOR.sub}" font-family="${FONT_CODE}" letter-spacing="1">${repos.length} PUBLIC REPOSITORIES // GITHUB.COM/INFINITION</text>
  ${icons}
</svg>`;
}

async function main() {
    const raw = JSON.parse(await readFile(DATA, 'utf8'));
    let repos = (raw.repos || [])
        .filter(r => !r.missing && !r.is_fork && !r.is_archived)
        .sort((a, b) => b.stars - a.stars);
    if (LIMIT > 0) repos = repos.slice(0, LIMIT);

    const svg = buildSvg(repos, raw.total_stars || 0);
    await writeFile(OUT, svg);
    console.log(`wrote ${OUT}: ${repos.length} repos`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
