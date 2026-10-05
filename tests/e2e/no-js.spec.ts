import { expect, test } from '@playwright/test';

/**
 * The site with JavaScript disabled.
 *
 * Runs under the `no-javascript` Playwright project. Everything asserted here
 * must work without a single byte of client JS -- which is the whole premise
 * of the architecture, and the property most likely to be eroded quietly by a
 * future change.
 */

test('the homepage renders its content without JavaScript', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('h1')).toHaveText('Max Pattillo');
  await expect(page.locator('h1')).toHaveCount(1);

  // Content, not just chrome.
  await expect(page.getByText('Hello there.')).toBeVisible();
});

test('primary navigation works without JavaScript', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Writing' }).click();

  await expect(page).toHaveURL('/writing/');
  await expect(page.locator('h1')).toHaveText('Writing');
});

test('an article is fully readable without JavaScript', async ({ page }) => {
  await page.goto('/writing/');

  const firstArticle = page.locator('main h2 a').first();
  test.skip((await firstArticle.count()) === 0, 'no Articles are published yet');
  const title = await firstArticle.textContent();
  await firstArticle.click();

  await expect(page.locator('h1')).toHaveText(title!.trim());
  // The rendered Markdown body, not just the header.
  await expect(page.locator('article .prose p').first()).toBeVisible();
});

test('breadcrumbs match the structured data trail', async ({ page }) => {
  await page.goto('/open-source/');

  const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('listitem');
  await expect(crumbs).toHaveCount(2); // Home / Open source

  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
  const graph = JSON.parse(jsonLd!)['@graph'] as Array<Record<string, unknown>>;
  const breadcrumb = graph.find((node) => node['@type'] === 'BreadcrumbList');

  expect(breadcrumb, 'no BreadcrumbList in the graph').toBeDefined();
  expect((breadcrumb!['itemListElement'] as unknown[]).length).toBe(2);
});

test('the skip link is reachable by keyboard and targets main', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('Tab');

  const focused = page.locator(':focus');
  await expect(focused).toHaveText('Skip to content');
  await expect(focused).toHaveAttribute('href', '#main');
  await expect(page.locator('main#main')).toHaveCount(1);
});

test('scripts are limited to the known set, on every path', async ({ page }) => {
  /*
   * The budget in tests/seo/javascript.spec.ts is a ceiling of one. This is
   * the per-path assertion that stops it becoming an allowance: when an account
   * is configured every page carries the CloseBot widget, and nothing else. A
   * second script anywhere fails HERE.
   *
   * WHY THE EXPECTED NUMBER IS DERIVED RATHER THAN LITERAL. The widget renders
   * only when CLOSEBOT_SOURCE is set at build time, so a contributor or a fork
   * building without that variable legitimately ships zero scripts, not one.
   * Hard-coding 1 would fail their checkout for doing nothing wrong, and the
   * usual reflex -- relaxing it to `toBeLessThanOrEqual(1)` -- would quietly
   * stop catching a script that is not the widget. Deriving the expectation
   * from whether the widget is present keeps the assertion exact in both cases.
   */
  const scripts = page.locator('script:not([type="application/ld+json"])');
  const widget = page.locator('script[src*="closebot.com"]');

  for (const path of ['/', '/writing/', '/open-source/']) {
    await page.goto(path);

    const expected = await widget.count();

    expect(
      await scripts.count(),
      `${path} ships an unexpected number of script tags; expected only the ` +
        'CloseBot widget, and only if configured',
    ).toBe(expected);

    expect(expected, `${path} exceeds the one-script budget`).toBeLessThanOrEqual(1);
  }
});

test('the only third-party script is the CloseBot widget', async ({ page }) => {
  /*
   * A named allowlist rather than a count. This is what actually stops an
   * analytics tag or a font CDN appearing later: a new third-party origin fails
   * even if the total script count happens to stay the same.
   */
  await page.goto('/');

  const external = await page
    .locator('script[src^="http"]')
    .evaluateAll((nodes) =>
      nodes.map((n) => new URL((n as HTMLScriptElement).src).origin),
    );

  for (const origin of external) {
    expect(origin, `unexpected third-party script origin: ${origin}`).toBe(
      'https://api.closebot.com',
    );
  }
});

test('every page renders dark, whatever the system preference', async ({ page }) => {
  /*
   * The site is dark-only. Runs in both projects, so it holds with and without
   * JavaScript -- there is no script left that could choose a palette, so the
   * answer has to come from CSS alone.
   *
   * The system preference is forced to LIGHT. A test run under a dark
   * preference would pass against a site that still had a light theme, which
   * is the exact regression this exists to catch.
   */
  await page.emulateMedia({ colorScheme: 'light' });

  for (const path of ['/', '/writing/', '/open-source/', '/no-such-page/']) {
    await page.goto(path);

    const { background, scheme } = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      scheme: getComputedStyle(document.documentElement).colorScheme,
    }));

    expect(scheme, `${path} does not declare color-scheme: dark`).toBe('dark');
    expect(
      relativeLuminance(background),
      `${path} has a light background (${background})`,
    ).toBeLessThan(0.05);
  }
});

/**
 * WCAG relative luminance of a computed colour. Chromium reports computed
 * colours as `rgb()` for sRGB values but keeps `oklch()` as authored, so both
 * are handled.
 */
function relativeLuminance(color: string): number {
  const oklch = /^oklch\(([\d.]+)%?\s/.exec(color);
  if (oklch) {
    // OKLCH lightness is perceptual; cubing it approximates linear luminance
    // closely enough to tell a near-black from anything a light theme uses.
    const L = Number(oklch[1]) > 1 ? Number(oklch[1]) / 100 : Number(oklch[1]);
    return L ** 3;
  }

  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (!rgb) throw new Error(`unrecognised colour: ${color}`);

  const [r = 0, g = 0, b = 0] = rgb.slice(1, 4).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
