/**
 * The share card, as a pure function: spec in, SVG out.
 *
 * Separated from generate-og.mjs so the test suite can render a card without
 * writing one. `tests/seo/og-cards.spec.ts` imports this module, renders what
 * each card *should* look like from the current build, and compares it against
 * the committed PNG -- which is the whole reason the cards can be generated
 * artefacts without silently going stale when an article title changes.
 *
 * The favicon is drawn here too, from the same font and the same accent, so the
 * tab and the link preview cannot drift apart.
 *
 * Nothing here touches the filesystem except reading global.css for the
 * palette and site.ts for the name, and nothing here writes.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { layoutText, textWidth, textHeight, ADVANCE, GLYPH_H } from './pixel-font.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ---- Palette: read, not retyped ---------------------------------------- */

/**
 * Pull the colour tokens straight out of global.css.
 *
 * Hard-coding hex values here would work exactly once. The tokens are the
 * single source of truth for colour, and a share card whose palette drifts
 * from the site's is worse than no share card, because nobody would ever
 * notice.
 *
 * The site is dark-only, so each token has exactly one definition to find.
 */
function readTokens() {
  const css = readFileSync(resolve(ROOT, 'src/styles/global.css'), 'utf8');

  return (name) => {
    const match = css.match(
      new RegExp(`--color-${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`),
    );
    if (!match) {
      throw new Error(
        `og-card: --color-${name} not found in the @theme block of ` +
          `src/styles/global.css. If the token was renamed, rename it here too.`,
      );
    }
    return oklchToHex(Number(match[1]), Number(match[2]), Number(match[3]));
  };
}

/**
 * OKLCH to sRGB hex.
 *
 * The tokens are authored in OKLCH and librsvg only speaks sRGB, so the
 * conversion has to happen somewhere. Doing it here rather than pasting hex
 * into this file is what lets the palette above be *read* instead of copied.
 *
 * Björn Ottosson's published matrices, unmodified.
 */
function oklchToHex(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  const hex = linear
    .map((v) => {
      // Gamma-encode, then clamp. Clamping after encoding rather than before
      // keeps in-gamut channels exact; all of our colours are inside sRGB.
      const encoded = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
      const byte = Math.round(Math.min(1, Math.max(0, encoded)) * 255);
      return byte.toString(16).padStart(2, '0');
    })
    .join('');

  return `#${hex}`;
}

const token = readTokens();
const COLOR = {
  surface: token('surface'),
  surfaceRaised: token('surface-raised'),
  ink: token('ink'),
  accent: token('accent'),
};

/* ---- The name: read, not retyped --------------------------------------- */

/**
 * The Owner's name, from `SITE_NAME` in src/data/site.ts.
 *
 * Read with a pattern for the same reason as the palette: that file is
 * TypeScript and this one runs under plain Node, and a second copy of the name
 * here is how a fork ends up sharing someone else's face.
 */
function readSiteName() {
  const ts = readFileSync(resolve(ROOT, 'src/data/site.ts'), 'utf8');
  const match = ts.match(/export const SITE_NAME = '([^']+)';/);
  if (!match) {
    throw new Error(
      `og-card: SITE_NAME not found in src/data/site.ts. If it was renamed or ` +
        `reshaped, update the pattern here too.`,
    );
  }
  return match[1];
}

const NAME = readSiteName();

/* ---- Geometry ----------------------------------------------------------- */

export const CARD_W = 1200;
export const CARD_H = 630;

/*
 * The block. Thick border and a hard offset shadow, never a blur. Scaled for a
 * card that Slack renders at a third of its size: a hairline would vanish.
 */
const BORDER = 8;
const SHADOW = 20;
const PAD = 48; // content inset inside the border

/** Clear space between the block (with its shadow) and the card edge. */
const MARGIN = 40;

/** The tallest the block's content may be and still clear the card edges. */
const MAX_CONTENT_H = CARD_H - 2 * MARGIN - SHADOW - 2 * (BORDER + PAD);

/* ---- The square safe zone ----------------------------------------------- */

/*
 * THE CENTRE SQUARE, AND WHY THE TYPE IS COMPOSED INSIDE IT.
 *
 * A 1.91:1 card is what the large unfurl wants, and it is what we emit. But a
 * link posted in a Facebook comment, a WhatsApp reply, or an iMessage bubble is
 * previewed as a SQUARE THUMBNAIL, and the platform gets that square by centre-
 * cropping this image to 630x630 -- taking x 285..915 and discarding a third of
 * the card from each side.
 *
 * So the rule is: ANYTHING THAT MUST BE READ GOES INSIDE THE SAFE ZONE. The
 * block's border and shadow may run outside it, because they crop to a
 * fragment of themselves rather than to a fragment of a word.
 *
 * This is also why every card is centred: left-aligned type is outside the
 * window at every size, and centring is the only position stable under a
 * symmetric crop.
 */
const SAFE_W = CARD_H; // a 1:1 crop takes the full height, so the square is H x H
const SAFE_X = Math.round((CARD_W - SAFE_W) / 2);
/*
 * Air between the type and the edge of the crop.
 *
 * Not cosmetic: it is the tolerance for platforms that do not crop exactly
 * centred. Type that merely *fits* the square is one rounding difference away
 * from touching the edge, so the bound below is the padded box, not the square.
 */
const SAFE_PAD = 48;
/** Widest a line may be and still clear the crop on both sides. */
const SAFE_MEASURE = SAFE_W - SAFE_PAD * 2;

/**
 * Throws if a string set at `x` would be clipped by the square crop.
 *
 * The check is here rather than in a test because this file is the only thing
 * that knows where a string was placed, and because the failure it catches is
 * one nobody would see: the full card looks right, and the crop is only ever
 * rendered by someone else's server.
 */
function assertInSafeZone(label, x, width) {
  /*
   * Checked against the PADDED box. A centred line only breaches the raw
   * square once it is wider than the whole 630px of it, so an unpadded check
   * would let the name fill the crop edge to edge and still pass. The padding
   * is the tolerance, so the padding is the bound.
   */
  const left = SAFE_X + SAFE_PAD;
  const right = SAFE_X + SAFE_W - SAFE_PAD;
  if (x >= left && x + width <= right) return;
  throw new Error(
    `og-card: ${label} spans ${x}..${x + width}, outside the square safe zone ` +
      `${left}..${right} (a ${SAFE_W}px centre crop, less ${SAFE_PAD}px of air). ` +
      `It would be cut in a Facebook comment or a WhatsApp preview. Shorten it, ` +
      `or set it at a smaller scale.`,
  );
}

/* ---- Drawing primitives ------------------------------------------------- */

/**
 * A card under construction. Every draw call pushes an SVG node.
 *
 * Rects rather than a canvas because the output has to be an SVG string for
 * sharp to rasterise, and because every mark on the card is an axis-aligned
 * rectangle -- there is not a curve in the design.
 */
function newCard() {
  return { parts: [] };
}

const rect = (card, x, y, w, h, fill) =>
  card.parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);

/** Pixel type, emitted as one path per string. */
const text = (card, str, x, y, scale, fill) => {
  const d = layoutText(str, x, y, scale)
    .map((r) => `M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`)
    .join('');
  card.parts.push(`<path d="${d}" fill="${fill}"/>`);
};

/** Height of `count` lines of pixel type set `step` apart at `scale`. */
const linesHeight = (count, scale, step) => (count - 1) * step + textHeight(scale);

/** Left edge that centres a string of `width` on the card's vertical axis. */
const CENTER_X = Math.round(CARD_W / 2);
const centerX = (width) => CENTER_X - Math.round(width / 2);

/**
 * Centred lines of pixel type, each checked against the square crop.
 * Returns the y just below the last line.
 */
function drawLines(card, lines, y, scale, step, fill, label) {
  lines.forEach((line, i) => {
    const width = textWidth(line, scale);
    const x = centerX(width);
    text(card, line, x, y + i * step, scale, fill);
    assertInSafeZone(`${label} ${JSON.stringify(line)}`, x, width);
  });
  return y + linesHeight(lines.length, scale, step);
}

/**
 * The page, the accent shadow, and the bordered block, centred on the card
 * around a content box of `contentW` x `contentH`. Returns the content box's
 * top edge; the caller sets the type inside it.
 */
function drawBlock(card, contentW, contentH) {
  // The name's scale is chosen by width alone, so a long name could still run
  // off the card vertically. Nobody re-opens a generated PNG, so throw.
  if (contentH > MAX_CONTENT_H) {
    throw new Error(
      `og-card: content is ${contentH}px tall, more than the ${MAX_CONTENT_H}px the block ` +
        `can hold. Shorten it, or set it at a smaller scale.`,
    );
  }
  const w = contentW + 2 * (BORDER + PAD);
  const h = contentH + 2 * (BORDER + PAD);
  const x = centerX(w);
  // Centre the block and its shadow together, so the pair sits level.
  const y = Math.round((CARD_H - h - SHADOW) / 2);

  rect(card, 0, 0, CARD_W, CARD_H, COLOR.surface);
  rect(card, x + SHADOW, y + SHADOW, w, h, COLOR.accent);
  rect(card, x, y, w, h, COLOR.ink);
  rect(card, x + BORDER, y + BORDER, w - 2 * BORDER, h - 2 * BORDER, COLOR.surfaceRaised);

  return y + BORDER + PAD;
}

function toSvg(card) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" shape-rendering="crispEdges">
${card.parts.join('\n')}
</svg>
`;
}

/* ---- Text fitting ------------------------------------------------------- */

/**
 * Greedy word wrap at a given scale. Returns null if any single word is too
 * wide to fit on a line of its own -- the caller then tries a smaller scale.
 */
function wrap(words, scale, maxWidth) {
  const lines = [];
  let line = '';

  for (const word of words) {
    if (textWidth(word, scale) > maxWidth) return null;
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, scale) <= maxWidth) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);

  return lines;
}

/**
 * Pick the largest scale at which `str` fits the given box.
 *
 * Article titles are written for the page, not for this card, so their length
 * varies by a factor of two. Choosing the scale per title is what keeps a
 * short title from looking timid and a long one from overflowing -- and it
 * means a new article never needs anyone to revisit this file.
 *
 * Throws rather than overflowing. A card with its title running off the edge
 * would ship, because nobody re-opens a generated PNG.
 */
function fitText(str, { maxWidth, maxHeight, scales, lineStep }) {
  const words = String(str).split(/\s+/).filter(Boolean);

  for (const scale of scales) {
    const lines = wrap(words, scale, maxWidth);
    if (!lines) continue;

    const step = lineStep(scale);
    const height = linesHeight(lines.length, scale, step);
    if (height <= maxHeight) return { lines, scale, step };
  }

  throw new Error(
    `og-card: cannot fit ${JSON.stringify(str)} in ${maxWidth}x${maxHeight} at any ` +
      `scale down to ${scales[scales.length - 1]}. Shorten the title, or add a smaller scale.`,
  );
}

/*
 * Leading, in font units, where the glyph box is 7.
 *
 * TWO VALUES, because the two cards set different things. A name is two words
 * and one unit of gap makes it a block. An article title is a sentence that
 * has to be *read* off a thumbnail, and at one unit its lines visibly fuse.
 */
const nameStep = (scale) => 8 * scale;
const titleStep = (scale) => 9 * scale;

/* ---- The cards ---------------------------------------------------------- */

/*
 * NO NUMBERS. A committed PNG cannot be re-derived from build output, so any
 * figure baked into one becomes a fabricated metric the moment it changes,
 * with no test watching -- see AGENTS.md.
 */

/*
 * The display scale for the name. The longest word sets the ceiling: it has
 * to clear the padded square crop, and one scale step larger does not.
 */
const NAME_LINES = NAME.split(/\s+/);
const NAME_SCALE = Math.floor(
  SAFE_MEASURE / Math.max(...NAME_LINES.map((line) => textWidth(line, 1))),
);

/** The fallback card: the Owner's name, alone, in the block. */
export function renderDefaultCard() {
  const card = newCard();

  const contentW = Math.max(...NAME_LINES.map((line) => textWidth(line, NAME_SCALE)));
  const contentH = linesHeight(NAME_LINES.length, NAME_SCALE, nameStep(NAME_SCALE));

  const top = drawBlock(card, contentW, contentH);
  drawLines(card, NAME_LINES, top, NAME_SCALE, nameStep(NAME_SCALE), COLOR.ink, 'the name line');

  return toSvg(card);
}

/** The byline under an article title: small, and in the accent. */
const BYLINE_SCALE = 4;
const BYLINE_GAP = 36;

/**
 * An article's card. The title takes the display slot, because the thing being
 * shared is the writing; the name drops to a byline beneath it.
 *
 * `title` is the page's real `<h1>`, read out of the build manifest by
 * generate-og.mjs -- not re-derived from frontmatter. The card and the page
 * cannot disagree about what the article is called.
 *
 * The block is always the full safe measure wide, so a short title and a long
 * one produce the same silhouette rather than two attempts at one design.
 */
export function renderArticleCard({ title }) {
  const card = newCard();

  const bylineH = textHeight(BYLINE_SCALE);
  const fit = fitText(title, {
    maxWidth: SAFE_MEASURE,
    maxHeight: MAX_CONTENT_H - BYLINE_GAP - bylineH,
    // Never as large as the name: a title is a sentence, and a sentence at the
    // name's scale would wrap to six lines of two words.
    scales: [10, 9, 8, 7, 6, 5],
    lineStep: titleStep,
  });

  const titleH = linesHeight(fit.lines.length, fit.scale, fit.step);
  const top = drawBlock(card, SAFE_MEASURE, titleH + BYLINE_GAP + bylineH);

  const titleBottom = drawLines(card, fit.lines, top, fit.scale, fit.step, COLOR.ink, 'the title line');
  drawLines(card, [NAME], titleBottom + BYLINE_GAP, BYLINE_SCALE, 0, COLOR.accent, 'the byline');

  return toSvg(card);
}

/* ---- The favicon -------------------------------------------------------- */

/**
 * An accent square with the Owner's initials in black.
 *
 * Two 5x7 glyphs and their one-unit gap are 11 units wide, so a 15-unit square
 * centres them exactly with 2 units either side and 4 above and below. An even
 * viewBox would put the initials half a pixel off centre, and at 16px that
 * half pixel is the whole difference between crisp and smeared.
 */
export function renderFavicon() {
  const initials = NAME_LINES.map((word) => word[0]).join('');
  const pad = 2;
  const size = textWidth(initials, 1) + 2 * pad;
  const y = (size - GLYPH_H) / 2;

  const d = layoutText(initials, pad, y, 1)
    .map((r) => `M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
<rect width="${size}" height="${size}" fill="${COLOR.accent}"/>
<path d="${d}" fill="${COLOR.surface}"/>
</svg>
`;
}

/* ---- Rasterisation ------------------------------------------------------ */

/**
 * SVG string to PNG buffer.
 *
 * Indexed PNG: a card is a handful of flat colours with no gradients and no
 * curves, so a palette costs nothing visually and roughly quarters the file. A
 * share image is fetched by a crawler on a timeout; small is a feature.
 */
export async function rasterise(svg) {
  return sharp(Buffer.from(svg)).png({ palette: true, effort: 10 }).toBuffer();
}

/**
 * Decode an image to raw RGB pixels, for comparing two cards.
 *
 * The test compares PIXELS, not encoded bytes. PNG encoding is a function of
 * the libvips build, so byte equality would turn a routine `sharp` upgrade
 * into a suite-wide failure that says nothing about the design. Every mark on
 * a card is an axis-aligned rect under `shape-rendering: crispEdges`, so the
 * rasterised pixels are stable in a way the compressed bytes are not.
 */
export async function toPixels(input) {
  return sharp(input).removeAlpha().raw().toBuffer();
}

export { COLOR, ADVANCE };
