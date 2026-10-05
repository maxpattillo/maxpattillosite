import { describe, expect, it } from 'vitest';

import { allPages } from './manifest';

/**
 * The hydration budget.
 *
 * Astro ships no JavaScript unless a component asks for it, so the budget
 * starts at zero and every script is a deliberate decision. This test is the
 * thing that makes that decision visible: adding an island is fine, but it
 * cannot happen by accident or go unnoticed in review.
 *
 * Raise this number when there is a real reason to, in the same commit that
 * introduces the island -- never as a follow-up fix to a red build.
 */
/*
 * Lowered from 3 to 1. The widget callout and the theme bootstrap were the
 * Origin project's, and both went when the site became dark-only: with one
 * palette there is nothing for a bootstrap to choose before first paint, and
 * no callout is wanted pointing at the launcher. The budget came down in the
 * same commit, because a number that only ratchets upward stops being a
 * budget -- the next island would inherit the headroom.
 *
 * The one script left is the CloseBot chat widget, `async`, on every page. It
 * is the Owner's own agent, built on the product of the Owner's employer, and
 * the only third-party script on the site. Its cost is not under our control,
 * so it is the first thing to look at if the Lighthouse performance budget
 * ever slips. It renders only when CLOSEBOT_SOURCE is set at build time, so a
 * checkout without that variable ships zero.
 *
 * None of this is an island -- no framework integration is installed.
 *
 * This is a CEILING, not an allowance, and with the widget configured there
 * is no slack in it. tests/e2e/no-js.spec.ts asserts the count per path.
 */
const MAX_SCRIPTS_PER_PAGE = 1;

describe('client JavaScript', () => {
  it.each(allPages.map((page) => [page.url, page] as const))(
    '%s stays within the hydration budget',
    (_url, page) => {
      expect(
        page.scriptCount,
        `${page.url} ships ${page.scriptCount} script tag(s); budget is ${MAX_SCRIPTS_PER_PAGE}. ` +
          'If this island is justified, raise MAX_SCRIPTS_PER_PAGE in the same commit and say why.',
      ).toBeLessThanOrEqual(MAX_SCRIPTS_PER_PAGE);
    },
  );

  it.each(allPages.map((page) => [page.url, page] as const))(
    '%s navigation works without JavaScript',
    (_url, page) => {
      /*
       * Every page must expose at least one real <a href> to another page.
       * Navigation driven by click handlers is invisible to crawlers that do
       * not execute JS and broken for anyone whose JS fails to load.
       */
      expect(
        page.internalLinksOut.length,
        'no plain internal links -- navigation may depend on JavaScript',
      ).toBeGreaterThan(0);
    },
  );
});
