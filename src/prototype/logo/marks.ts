/**
 * PROTOTYPE: throwaway. Belongs on a `prototype/logo` branch, never main.
 *
 * Question: what should the logo (favicon + header mark) be on the
 * neobrutalist site? Five structurally different marks, switchable via
 * `?variant=` on every real route. Dev only.
 *
 * Hex values are the tokens in global.css, converted the way og-card.mjs
 * does. The winner gets drawn in og-card.mjs from the tokens, not from here.
 */
const SURFACE = '#0b0b0b';
const INK = '#f5f5f5';
const ACCENT = '#8e9398';
const ON_ACCENT = '#080808';

/** Pixel rows ('#' = on) to one SVG path at offset (x, y). */
function pixels(rows: string[], x: number, y: number): string {
  let d = '';
  rows.forEach((row, r) => {
    [...row].forEach((c, col) => {
      if (c === '#') d += `M${x + col} ${y + r}h1v1h-1z`;
    });
  });
  return d;
}

const svg = (size: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${body}</svg>`;

const rect = (x: number, y: number, w: number, h: number, fill: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;

const path = (d: string, fill: string) => `<path d="${d}" fill="${fill}"/>`;

/* The 5x7 glyphs from scripts/pixel-font.mjs. */
const M = ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'];
const P = ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'];
const MP = M.map((row, i) => `${row}.${P[i]}`);

/* M and P sharing a stem: the M's right leg is the P's spine. 9x7. */
const LIGATURE = [
  '#...####.',
  '##.##...#',
  '#.#.#...#',
  '#.#.####.',
  '#...#....',
  '#...#....',
  '#...#....',
];

/* One chunky M with 3px legs, built to fill a 16px tab. 12x10. */
const BIG_M = [
  '###......###',
  '####....####',
  '#####..#####',
  '###.####.###',
  '###..##..###',
  '###......###',
  '###......###',
  '###......###',
  '###......###',
  '###......###',
];

export const VARIANTS = {
  A: {
    name: 'Current: MP on smoke',
    note: 'What ships today. A flat accent square with no border or shadow, so none of the site\'s construction.',
    svg: svg(15, rect(0, 0, 15, 15, ACCENT) + path(pixels(MP, 2, 4), SURFACE)),
  },
  B: {
    name: 'Mini panel',
    note: 'The share card at 16px: a dark block, an ink border, a smoke offset shadow, and white MP. The same object as the header and the share card.',
    // Panel 15x15 at the origin, 1px ink border, smoke shadow 2px down-right.
    svg: svg(
      17,
      rect(2, 2, 15, 15, ACCENT) +
        rect(0, 0, 15, 15, INK) +
        rect(1, 1, 13, 13, SURFACE) +
        path(pixels(MP, 2, 4), INK),
    ),
  },
  C: {
    name: 'Ligature + highlight',
    note: 'M and P share a stem, so it reads as one mark rather than two letters. The smoke bar under it is the .highlight band from reading-page titles.',
    svg: svg(
      13,
      rect(0, 0, 13, 13, SURFACE) + path(pixels(LIGATURE, 2, 2), INK) + rect(2, 10, 9, 2, ACCENT),
    ),
  },
  D: {
    name: 'Big M sticker',
    note: 'One letter set as large as the tab allows: chunky legs, an ink border, smoke fill. It gives up the P to stay legible at 16px.',
    svg: svg(
      16,
      rect(0, 0, 16, 16, INK) + rect(1, 1, 14, 14, ACCENT) + path(pixels(BIG_M, 2, 3), ON_ACCENT),
    ),
  },
  E: {
    name: 'Pressed block',
    note: 'No letters. The site\'s whole construction (bordered block, hard offset shadow) used as the mark, so it never has to be legible.',
    svg: svg(16, rect(5, 5, 11, 11, ACCENT) + rect(0, 0, 11, 11, INK) + rect(2, 2, 7, 7, SURFACE)),
  },
} as const;

export type VariantKey = keyof typeof VARIANTS;
