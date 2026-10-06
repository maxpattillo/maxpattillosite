/**
 * The social share cards and the favicon, generated.
 *
 * WHAT IT WRITES
 *
 *   public/og/default.png            the fallback, for every non-article page
 *   public/og/writing/<slug>.png     one per published article
 *   public/favicon.svg               the Owner's initials on the accent
 *
 * IT NEEDS A BUILD FIRST, because the article cards are titled from each
 * page's real `<h1>` in `.seo/manifest.json` -- see og-articles.mjs for why.
 * `pnpm og` runs the build for you.
 *
 * After changing an article title the loop is: build, og, build. The second
 * build is what copies the regenerated PNG out of `public/` and into `dist/`.
 * `tests/seo/og-cards.spec.ts` fails if you skip any of it.
 *
 * GENERATED, NOT DRAWN. Committed output, and the build never runs this.
 * `sharp` is already a devDependency for Astro's image pipeline, so this adds
 * nothing to install.
 *
 * Layout and palette live in og-card.mjs. This file only decides what to draw
 * and where to put it.
 */
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  renderDefaultCard,
  renderArticleCard,
  renderFavicon,
  rasterise,
  CARD_W,
  CARD_H,
} from './og-card.mjs';
import { readArticles } from './og-articles.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = resolve(ROOT, 'public');
const OG_DIR = resolve(PUBLIC, 'og');
const ARTICLE_DIR = resolve(OG_DIR, 'writing');

const articles = readArticles();

mkdirSync(ARTICLE_DIR, { recursive: true });

const written = [];

const defaultPng = await rasterise(renderDefaultCard());
writeFileSync(resolve(OG_DIR, 'default.png'), defaultPng);
written.push(['og/default.png', defaultPng.length]);

const favicon = renderFavicon();
writeFileSync(resolve(PUBLIC, 'favicon.svg'), favicon);
written.push(['favicon.svg', Buffer.byteLength(favicon)]);

for (const article of articles) {
  const png = await rasterise(renderArticleCard(article));
  writeFileSync(resolve(ARTICLE_DIR, `${article.slug}.png`), png);
  written.push([`og/writing/${article.slug}.png`, png.length]);
}

/*
 * Delete cards for articles that no longer exist.
 *
 * Without this, unpublishing an article leaves its card committed forever --
 * a live URL, still crawlable, still unfurling, describing a page that now
 * 404s. Nothing else in the build would ever mention it again.
 */
const expected = new Set(articles.map((article) => `${article.slug}.png`));
const orphans = readdirSync(ARTICLE_DIR).filter(
  (file) => file.endsWith('.png') && !expected.has(file),
);
for (const orphan of orphans) {
  rmSync(resolve(ARTICLE_DIR, orphan));
}

const total = written.reduce((bytes, [, size]) => bytes + size, 0);
console.log(
  `og: ${CARD_W}x${CARD_H} cards and a favicon, ${written.length} files, ${(total / 1024).toFixed(1)} KB total` +
    (orphans.length ? ` (removed ${orphans.length} orphaned)` : ''),
);
for (const [name, bytes] of written) {
  console.log(`  public/${name} (${(bytes / 1024).toFixed(1)} KB)`);
}
