import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ORPHAN_ALLOWLIST } from '../../src/data/navigation';
import { person, sameAs } from '../../src/data/person';
import { allPages, emittedFiles, indexablePages, pagesByUrl } from './manifest';

/** Routes the Origin project had and this site deliberately does not. */
const REMOVED_ROUTES = ['/about/', '/thanks/'];

/**
 * Strings that only the Origin project would put in the built site: its
 * author's name, its domain, and its contact address. Matched as plain
 * case-insensitive substrings, with one exception: "decora" is a prefix of
 * "decoration", and every page ships `text-decoration`.
 */
const ORIGIN_RESIDUE = ['bryce', 'decora', 'brycedecora', 'info@closebot.ai'];

const escape = (literal: string) => literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const residuePatterns = ORIGIN_RESIDUE.map(
  (needle) =>
    [needle, new RegExp(needle === 'decora' ? 'decora(?!tion)' : escape(needle), 'i')] as const,
);

/** Text-ish files only; a substring hit inside a font or PNG means nothing. */
const TEXT_FILE = /\.(html|js|mjs|css|json|xml|txt|svg)$/i;

const readBuilt = (file: string) => readFileSync(join('dist', file.slice(1)), 'utf8');

const residueIn = (contents: string) =>
  residuePatterns.filter(([, pattern]) => pattern.test(contents)).map(([needle]) => needle);

/** A link target resolves if it is a built page or any other emitted file. */
const resolves = (path: string, href: string) =>
  pagesByUrl.has(path) || emittedFiles.has(path) || emittedFiles.has(href.split(/[?#]/)[0] ?? href);

describe('internal links', () => {
  it.each(allPages.map((page) => [page.url, page] as const))(
    '%s has no broken internal links',
    (_url, page) => {
      const broken = page.internalLinksOut.filter((link) => !resolves(link.path, link.href));
      expect(broken.map((l) => l.href), 'these hrefs do not match any emitted file').toEqual([]);
    },
  );

  it.each(allPages.map((page) => [page.url, page] as const))(
    '%s never links to a URL that would redirect',
    (_url, page) => {
      /*
       * Under `html_handling: force-trailing-slash`, linking to /about costs a
       * redirect before the page is served. Every hop dilutes crawl budget and
       * slows the user down for no reason, so internal links must already be
       * in canonical form.
       */
      const redirecting = page.internalLinksOut.filter((link) => !link.isCanonicalForm);
      expect(
        redirecting.map((l) => l.href),
        'these internal links are not in canonical (trailing-slash) form',
      ).toEqual([]);
    },
  );

  it.each(allPages.map((page) => [page.url, page] as const))(
    '%s never hard-codes the production origin in a link',
    (_url, page) => {
      /*
       * Hard-coded origins break preview deployments and local development,
       * and they scatter the domain across files. The domain is defined once,
       * in src/data/site.ts.
       */
      expect(page.hardCodedOriginLinks, 'use root-relative paths instead').toEqual([]);
    },
  );

  it.each(allPages.map((page) => [page.url, page] as const))(
    '%s carries no trace of the Origin project',
    (_url, page) => {
      /*
       * The site was forked, and the Origin project's identity leaks through
       * places nobody reads: an og:image:alt, a JSON-LD string, a comment. The
       * whole raw document is scanned, not the visible text, for that reason.
       * The credit lives in the LICENSE and README, which are never built.
       */
      expect(residueIn(readBuilt(page.file)), 'Origin project residue in the built page').toEqual([]);
    },
  );

  it('no other built text file carries a trace of the Origin project', () => {
    // Feeds, sitemaps, robots.txt and the favicon are
    // fetched by machines that never render a page, so they are checked too.
    const pageFiles = new Set(allPages.map((page) => page.file));
    const hits = [...emittedFiles]
      .filter((file) => TEXT_FILE.test(file) && !pageFiles.has(file))
      .flatMap((file) => residueIn(readBuilt(file)).map((needle) => `${file}: ${needle}`));
    expect(hits, 'Origin project residue in a built file').toEqual([]);
  });

  it.each(allPages.map((page) => [page.url, page] as const))(
    '%s never links to a removed route',
    (_url, page) => {
      /*
       * /about/ and /thanks/ belonged to the Origin project and were deleted
       * rather than redirected. The broken-link check above already fails a
       * link to them while they are absent; this one names the cause, and
       * keeps failing if someone rebuilds either page with old copy.
       */
      const removed = page.internalLinksOut
        .map((link) => link.path)
        .filter((path) => REMOVED_ROUTES.includes(path));
      expect(removed, 'these routes were removed and must not be linked').toEqual([]);
    },
  );
});

describe('site graph', () => {
  it('has no orphaned pages', () => {
    /*
     * A page nothing links to is one crawlers may never find and users
     * certainly will not. Intentional exceptions are declared in
     * ORPHAN_ALLOWLIST rather than silently tolerated here.
     */
    const orphans = allPages
      .filter((page) => page.internalLinksIn === 0)
      .filter((page) => !ORPHAN_ALLOWLIST.includes(page.url))
      .map((page) => page.url);

    expect(orphans, 'add a link to these pages, or allowlist them deliberately').toEqual([]);
  });

  it.each(allPages.map((page) => [page.url, page] as const))(
    '%s links to every declared social profile',
    (_url, page) => {
      /*
       * The footer and the schema.org `sameAs` are generated from one array
       * (person.socialProfiles), so they cannot disagree by construction.
       * This asserts the rendering half still happens -- a broken Footer would
       * otherwise leave `sameAs` claiming profiles the site never links to,
       * which is exactly the "schema does not match visible content" failure
       * the architecture is meant to prevent.
       *
       * Vacuous until profiles are added. That is intended: no profiles means
       * no links and no sameAs.
       */
      const missing = person.socialProfiles
        .map((profile) => profile.url)
        .filter((url) => !page.externalLinksOut.includes(url));

      expect(missing, 'declared in socialProfiles but not linked in the footer').toEqual([]);
    },
  );

  it('every social profile URL is absolute and https', () => {
    const bad = sameAs.filter((url) => !/^https:\/\/./.test(url));
    expect(bad, 'sameAs entries must be absolute https URLs').toEqual([]);
  });

  it('every indexable page is reachable from at least two others', () => {
    /*
     * One inbound link is technically reachable but fragile -- delete that one
     * page and the target is orphaned. Two is the cheapest meaningful margin.
     */
    const weak = indexablePages
      .filter((page) => page.internalLinksIn < 2)
      .filter((page) => !ORPHAN_ALLOWLIST.includes(page.url))
      .map((page) => `${page.url} (${page.internalLinksIn} inbound)`);

    expect(weak, 'these pages are weakly linked').toEqual([]);
  });
});
