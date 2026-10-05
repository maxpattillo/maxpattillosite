import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { sameAs } from '../../src/data/person';
import { allPages, manifest } from './manifest';

/**
 * The Person node as built, read from the homepage.
 *
 * The manifest records which types and `@id`s a page has, not their
 * properties, so this reads the emitted HTML the way the feed spec reads
 * dist/rss.xml. One page is enough: the node is defined once, at one `@id`,
 * which the test below asserts for every page.
 */
function builtPerson(): Record<string, unknown> {
  const html = readFileSync(join('dist', 'index.html'), 'utf8');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const nodes = blocks.flatMap((m) => JSON.parse(m[1]!)['@graph'] as Record<string, unknown>[]);
  const person = nodes.find((node) => node['@type'] === 'Person');
  if (!person) throw new Error('no Person node on the homepage');
  return person;
}

describe('structured data', () => {
  it.each(allPages.map((page) => [page.url, page] as const))(
    '%s emits JSON-LD that parses',
    (_url, page) => {
      expect(page.jsonLdParses, 'a JSON-LD block failed to parse').toBe(true);
      expect(page.schemaTypes.length, 'no structured data at all').toBeGreaterThan(0);
    },
  );

  it.each(allPages.map((page) => [page.url, page] as const))(
    '%s describes the canonical Person and WebSite',
    (_url, page) => {
      // Emitted by BaseLayout, so this holds for every page by construction.
      // The test guards against someone bypassing the layout.
      expect(page.schemaTypes).toContain('Person');
      expect(page.schemaTypes).toContain('WebSite');
    },
  );

  it.each(allPages.map((page) => [page.url, page] as const))(
    '%s resolves every @id it references',
    (_url, page) => {
      /*
       * The whole point of the @id scheme is that entities cross-reference a
       * single definition rather than each restating it. A reference pointing
       * at nothing means the graph is broken and consumers see an entity with
       * no properties.
       */
      const defined = new Set(page.schemaIds);
      const dangling = [...new Set(page.schemaRefs)].filter((id) => !defined.has(id));
      expect(dangling, 'these @id references have no matching node in the graph').toEqual([]);
    },
  );

  it('defines the Person and WebSite at one stable @id site-wide', () => {
    // Same entity, same identifier, on every page -- otherwise consumers see
    // one Person per page instead of one Person.
    const personIds = new Set<string>();
    const websiteIds = new Set<string>();

    for (const page of allPages) {
      for (const id of page.schemaIds) {
        if (id.endsWith('#person')) personIds.add(id);
        if (id.endsWith('#website')) websiteIds.add(id);
      }
    }

    expect([...personIds]).toEqual([`${manifest.site}/#person`]);
    expect([...websiteIds]).toEqual([`${manifest.site}/#website`]);
  });

  it('the Person claims no profile the site does not link to', () => {
    // Derived from the same array the footer renders. sameAs is an identity
    // claim, so an extra entry is a misidentification, not a harmless extra.
    expect(builtPerson()['sameAs']).toEqual([...sameAs]);
  });

  it('the Person claims no role or employer', () => {
    /*
     * Schema must describe what the page shows, and no page states a job title
     * or an employer as a fact about the Owner. Add these back only together
     * with visible content that says the same thing.
     */
    const person = builtPerson();
    expect(person).not.toHaveProperty('jobTitle');
    expect(person).not.toHaveProperty('worksFor');
  });

  it.each(allPages.map((page) => [page.url, page] as const))(
    '%s emits a BreadcrumbList only alongside a visible trail',
    (_url, page) => {
      /*
       * Breadcrumb markup describing a trail the user cannot see is the exact
       * "schema that does not match visible content" failure mode. Both come
       * from one array in BaseLayout; this asserts that stayed true.
       */
      const hasSchema = page.schemaTypes.includes('BreadcrumbList');
      const isNested = page.url !== '/' && page.url.split('/').filter(Boolean).length > 0;
      if (hasSchema) {
        expect(isNested, 'BreadcrumbList on a page with no trail to show').toBe(true);
      }
    },
  );

  it('the homepage does not emit a BreadcrumbList', () => {
    const home = allPages.find((page) => page.url === '/');
    expect(home?.schemaTypes).not.toContain('BreadcrumbList');
  });

  it('no page claims schema types the site has no data for', () => {
    /*
     * Guard against an agent adding aggregate ratings, reviews, or business
     * entities that nothing on the site actually substantiates. Fabricated
     * structured data is a manual-action risk, not a ranking shortcut.
     */
    const forbidden = ['AggregateRating', 'Review', 'Offer', 'LocalBusiness', 'Product'];
    const violations: string[] = [];

    for (const page of allPages) {
      for (const type of page.schemaTypes) {
        if (forbidden.includes(type)) violations.push(`${page.url}: ${type}`);
      }
    }

    expect(violations, 'these types require real data the site does not have').toEqual([]);
  });
});
