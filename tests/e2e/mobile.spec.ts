import { expect, test } from '@playwright/test';

import { SITE_NAME } from '../../src/data/site';

/**
 * The site on a phone.
 *
 * The manifest has no viewport and every other check runs at a desktop size,
 * so this is the only place a page that is too wide for a phone can fail. The
 * header is `sticky`, which makes it the likeliest culprit: every line it wraps
 * to costs a fixed slice of every viewport for the whole scroll.
 *
 * 375px is the iPhone SE / mini width, the narrowest phone still in common use.
 */
const PHONE = { width: 375, height: 667 };

const PATHS = ['/', '/writing/', '/open-source/', '/no-such-page/'];

for (const path of PATHS) {
  test(`${path} fits a 375px phone without scrolling sideways`, async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(path);

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(scrollWidth, `${path} is ${scrollWidth}px wide on a ${clientWidth}px screen`).toBe(
      clientWidth,
    );
  });
}

test('the header stays one line on a 375px phone', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto('/');

  /*
   * The name and the primary nav sit on one row. If they ever wrap, the header
   * doubles in height and takes that space from every screen of every page --
   * see the note in Header.astro for what to do instead.
   */
  const header = page.locator('body > header');
  const name = header.getByRole('link', { name: SITE_NAME });
  const nav = header.getByRole('navigation', { name: 'Primary' });

  const [nameBox, navBox] = await Promise.all([name.boundingBox(), nav.boundingBox()]);
  expect(nameBox && navBox, 'header name or primary nav did not render').toBeTruthy();
  expect(Math.abs(nameBox!.y - navBox!.y), 'the header wrapped onto a second line').toBeLessThan(
    nameBox!.height,
  );
});
