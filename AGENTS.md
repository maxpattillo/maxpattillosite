# Engineering constitution

Rules for anyone — human or agent — working on this codebase.

The organising principle:

> **You supply data. The framework supplies implementation.**

A page declares a title and a description. Canonical URLs, Open Graph tags,
robots directives, breadcrumbs, and structured data are computed by the layout.
If you find yourself hand-writing a meta tag or a JSON-LD blob in a page, stop:
the architecture is being worked around, and the next page will get it wrong.

Most of what follows is **mechanically enforced** — see [What is actually
enforced](#what-is-actually-enforced). Rules that are not enforced are marked
_(judgement)_ and need a human.

Visual decisions live in [DESIGN.md](./DESIGN.md). For now it records the
agreed direction only; the full system is pending a prototype.

---

## Rendering

All indexable content must exist in the initial HTML response.

- Prefer static generation. It is the default and it is almost always correct.
- Use server rendering only when request-time data is genuinely required.
- Never rely on client-side rendering for indexable content: headings, body
  copy, navigation, descriptions, internal links, or structured data.

This is **not** a rule that everything must be SSR. Static output satisfies the
requirement better than SSR does, and costs less.

The site currently has no adapter installed. Adding on-demand rendering means
installing `@astrojs/cloudflare` and adding a `main` entry to `wrangler.jsonc`.
Do not do this casually — it converts a free static deploy into a Worker
invocation per request.

## Page architecture

- Every public page renders through `BaseLayout`, directly or via a more
  specific layout.
- Every page supplies a `seo` object. It is a required prop, validated against
  `seoInputSchema`. There is no way to opt out.
- Exactly one `<main>` per document. `BaseLayout` owns it; never add another.
- Exactly one `<h1>` per page. Layouts own it — pass `heading`, do not write an
  `<h1>` in a page.
- Heading hierarchy descends one level at a time. `h2` may follow `h1`; `h3`
  may not.

### Semantic HTML

Use the element that describes the content, not the one that looks structural:

- `<header>` — introductory content for the site or a section
- `<nav>` — navigation, with an `aria-label` when there is more than one
- `<article>` — content that stands alone outside this page
- `<section>` — a thematic group that **has an accessible heading**. If it would
  not warrant a heading, use a `<div>`
- `<aside>` — genuinely supplementary content
- `<footer>` — footer content

Do not sprinkle landmarks for their own sake. Tag soup is worse than divs.

## Metadata

Every indexable URL gets a unique title, a unique description, a
self-referencing canonical, the full Open Graph set, and a robots directive.
All of these are produced by `<SEO>`; you supply `title` and `description`.

**Never hard-code the domain.** It is defined once, in `SITE_URL`
(`src/data/site.ts`), and reaches pages through `Astro.site`. Hard-coded
origins break preview deploys and local development.

### On the length limits

`seoInputSchema` bounds titles to 10–60 characters and descriptions to 50–160.

These are **editorial guardrails, not Google requirements.** Google does not
enforce a 60-character title limit and routinely rewrites titles it finds
unhelpful. The bounds exist to stop `<title>Home</title>` and missing
descriptions. If a genuinely better title runs slightly long, widening the
bound is a reasonable change. Removing the minimums is not.

## URLs

- Lowercase, hyphen-separated.
- Trailing slash, always. This is enforced in three places that must agree:
  `build.format: 'directory'` and `trailingSlash: 'always'` in
  `astro.config.ts`, and `html_handling: "force-trailing-slash"` in
  `wrangler.jsonc`.
- Internal links must already be in canonical form. Linking to `/writing` costs a
  redirect before the page is served.
- Never expose `.html` in a URL.
- Never create two indexable routes serving the same content.

**Changing the trailing-slash policy after launch means redirecting every
indexed URL.** Treat it as fixed.

## Images

Use Astro's `<Image />`. It emits width, height, and a responsive `srcset` in
modern formats automatically — which is why the rule is "use the component",
not "remember to add dimensions".

Image files live in `src/assets/` — Article imagery in `src/assets/media/`,
managed by the Media app in the dev toolbar. Never `public/`, which is copied
verbatim and therefore arrives with no dimensions at all. See
[Adding images](#adding-images).

- Every image declares `alt`. An **empty** `alt=""` is correct and required for
  decorative imagery; it tells a screen reader to skip the image. A *missing*
  `alt` is the defect.
- Never lazy-load the LCP image. Load the first/hero image eagerly with
  `fetchpriority="high"`.
- Lazy-load everything below the fold.
- Do not force a specific output format. Let the image pipeline choose.

## Structured data

- JSON-LD is generated server-side, from the typed builders in
  `src/utils/schema.ts`. Do not hand-write JSON-LD in a page.
- One `@graph` per page. Entities cross-reference by `@id` rather than
  restating themselves.
- The Person entity is defined once, in `src/data/person.ts`. Every reference
  to the name, role, or contact details reads from it.
- **Schema must describe content the page actually shows.** A `BreadcrumbList`
  requires a visible trail; an `Article` requires an article.
- **Never fabricate.** No ratings, reviews, prices, counts, or awards without a
  real source. There are deliberately no builders for these, and
  `structured-data.spec.ts` fails the build if they appear.
- `sameAs` in `person.ts` takes only verified profile URLs. A wrong one is an
  entity-resolution problem, not a harmless placeholder.

## Internal links

- Plain `<a href>`. Never JavaScript-driven navigation.
- Root-relative paths (`/writing/`), never absolute URLs to our own domain.
- Descriptive anchor text. Not "click here", not a bare URL.
- Relationships belong in the content model (`relatedArticles` in
  frontmatter), not invented per template. `reference()`
  validates them at build time, so they cannot 404.
- Every page should be reachable from at least two others. Deliberate
  exceptions go in `ORPHAN_ALLOWLIST` (`src/data/navigation.ts`).

## Performance and JavaScript

**The hydration budget is one script per page**, enforced by
`javascript.spec.ts`. Astro ships no JavaScript by default, so the budget
starts at zero and every script is a deliberate decision. The one is the
**CloseBot chat widget** — `async`, and the one third-party script on the site.
See below.

It renders only when `CLOSEBOT_SOURCE` is set at build time, so a checkout
without that variable legitimately ships **zero** scripts, not one. The id is
kept out of the repository so a fork cannot silently load someone else's agent.
`tests/e2e/no-js.spec.ts` derives the expected count from whether the widget is
present rather than hard-coding one, which keeps the assertion exact either way.

That budget is a ceiling, not a target, and with the widget configured there is
no slack in it. `tests/e2e/no-js.spec.ts` asserts the count per path, so a
second script on any single page fails there.

### The third-party script

"Avoid third-party scripts" still stands, and the CloseBot widget is the single
deliberate exception: it is the Owner's own agent, built on the product of
CloseBot, the Owner's employer. That is a different trade from an analytics tag
or a font CDN.

The terms of the exception:

- It is `async`, so it never blocks parsing or rendering.
- Nothing on the site depends on it. If it fails to load, no content and no
  navigation is affected.
- It is the only script whose cost is **not** under our control, which makes it
  the first thing to examine if the Lighthouse performance budget slips.
- `tests/e2e/no-js.spec.ts` allowlists its origin by name. A second third-party
  origin fails that test even if the total script count does not change — which
  is what actually stops an analytics tag arriving later.

No framework integration is installed — the widget is a bare `<script>` tag in
`BaseLayout.astro`, not an island. Adding a `client:*` directive would mean
installing one, and that is a much larger decision than the widget was.

A `client:*` directive is justified only when the interaction cannot reasonably
be built with native HTML and CSS. Before reaching for one:

1. Can native HTML do it? `<details>`/`<summary>` is a disclosure. `<dialog>`
   is a modal. A link is navigation.
2. Can CSS do it? `:target`, `:focus-within`, and container queries cover a lot.
3. Only then, an island — and the narrowest one possible. Hydrate the widget,
   never the page.

The header is the worked example: it has no mobile-menu island because the
name and its one primary link fit on a phone, and if they stopped fitting the
next step would be `<details>`, not React. Social profiles and the source link
live in the footer only; the header is `sticky`, so every line it wraps to
costs a fixed slice of every viewport for the whole scroll.

If you do add an island, raise `MAX_SCRIPTS_PER_PAGE` in
`tests/seo/javascript.spec.ts` **in the same commit**, with a comment saying
why. Never as a follow-up fix to a red build. Lower it the same way when a
script goes: a number that only ever ratchets upward stops being a budget,
because the next island silently inherits whatever headroom the last one left
behind.

Also: avoid third-party scripts, avoid layout shift, avoid render-blocking
resources.

### Web fonts

No web font is loaded; the placeholder styling uses system stacks. The agreed
direction names its families, and the decision to load them — subsetting,
preloading, fallbacks, and what it costs against the Lighthouse budget —
belongs to the pending design work. See [DESIGN.md](./DESIGN.md). Until that
lands, adding a web font is not covered by any decision here.

## Accessibility

- Interactive controls must be keyboard reachable and operable.
- Use native elements. A `<button>` is a button; a `<div>` with a click handler
  is not.
- Visible focus indicators. The global `:focus-visible` style is a floor, not a
  suggestion to remove.
- Form controls have associated `<label>`s.
- Colour is never the only way information is conveyed. _(judgement)_
- Respect `prefers-reduced-motion`.

## Code quality

- TypeScript strict. `astro check` must report zero errors.
- No duplicated layout code. If two pages share structure, that is a layout.
- No duplicated business data. The Person entity is the single source.
- No hard-coded URLs, domains, or environment-specific values.
- No inline styles except where genuinely unavoidable.
- Comments explain *why*. The code already says what.

## Content

_(judgement — none of this is enforceable, and it is what actually matters)_

- Do not generate near-duplicate pages. Ten thin variations on a theme are
  worth less than one page worth reading, and they are a recognised spam
  pattern.
- Do not write for a keyword. Write for someone with a question.
- A page that exists only to rank should not exist.

The technical foundation guarantees crawlability, rendering, canonicalisation,
metadata, schema validity, performance, and link mechanics. It cannot
manufacture search intent, topical authority, or credibility. Those come from
the writing.

### Writing about CloseBot

Articles here will regularly touch CloseBot, where the Owner works. Two rules,
and the first is not negotiable.

**Disclose in the Article, not just sitewide.** The first time a piece
references CloseBot, say the relationship in the prose — "I work at CloseBot",
"I'm a developer at CloseBot". An Article read in a feed reader, an AI answer,
or a syndicated excerpt arrives without any surrounding page to explain it.

This is not a compliance tax. First-hand experience is the one E-E-A-T signal
that cannot be manufactured, and it is the site's advantage over the vendor
blogs occupying these queries. Hiding the relationship throws it away and turns
an honest account from the inside into something that reads like undisclosed
promotion when someone works it out.

**Link where a link helps the reader, and nowhere else.** A link to a CloseBot
page is appropriate when it is the natural next step for someone who has just
read the argument. It is not appropriate as a quota. Google's link spam policy
does not prohibit linking to your employer; it prohibits links whose purpose is
ranking rather than the reader, and the difference is visible in the writing.

Never invent a metric. Use CloseBot's published figures or third-party data
with attribution. A number nobody can check is worth less than no number, and
it is the fastest way to lose the credibility the rest of this is built on.

### Structure for extraction

_(judgement, but with a concrete rationale)_

Start with the answer. Use `templates/article.md`, which encodes this.

Two findings drive it:

- Of 100 sampled Google AI Overview citations, **55% came from the first 30%**
  of the source page. Burying the point costs you the citation.
- Retrieval systems chunk pages and rank the chunks. A section that only makes
  sense after the three above it retrieves badly, and gets quoted out of
  context when it retrieves at all.

So: answer in the opening paragraph, headings phrased as the question the
section answers, one idea per paragraph, terms defined on first use, and claims
specific enough to check ("deprecated in May 2026", not "recently deprecated").

This is not a trick, and it is not separate from writing well. It is the same
structure good technical writing already has.

**Freshness matters, honestly.** Set `updatedDate` when you make a substantive
revision — new information, a corrected claim, a changed recommendation. It
drives `dateModified` and a visible "Updated" line. Do not touch it for typos,
and never backdate: the signal is only worth anything while it is true.

### Do not build these

Checked against primary sources on 2026-09-29. Each is widely recommended
online and each is, for this site, waste:

| | Why not |
| --- | --- |
| `llms.txt` | 0.1% of AI-crawler traffic requests it. Google confirmed it does not support the file and has no plans to; no major AI vendor has committed to reading it. Among the 50 most AI-cited domains, one had one. |
| `FAQPage` schema | Rich result **fully deprecated May 2026** — no longer shown for any site. |
| `HowTo` schema | Deprecated 2023; documentation removed. |
| Special "AEO" markup | Google: *"There are no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary… You don't need to create new machine readable files, AI text files, or markup."* |

The actionable version of all four: there is no AEO channel separate from
doing the ordinary things well. Be indexable, be fast, be structured, be
accurate, be current.

---

## What is actually enforced

A rule nobody checks is a suggestion. This maps each mechanical rule to the
thing that fails when it is broken.

| Rule | Enforced by |
| --- | --- |
| Valid SEO object on every page | `seoInputSchema` via `BaseLayout` — build fails |
| Title/description present, bounded, unique | `tests/seo/metadata.spec.ts` |
| Homepage title and description are the agreed ones | `tests/seo/metadata.spec.ts` |
| One self-referencing canonical per page | `tests/seo/metadata.spec.ts` |
| Full Open Graph set; `og:image` actually exists | `tests/seo/metadata.spec.ts` |
| Default share card matches the generator | `tests/seo/og-cards.spec.ts` |
| Share cards match the Articles they title | `tests/seo/og-cards.spec.ts` |
| Every Article has its own share card | `tests/seo/og-cards.spec.ts` |
| Declared `og:image` dimensions match the file | `tests/seo/og-cards.spec.ts` |
| Exactly one descriptive `h1`; the homepage's is the Owner's name | `tests/seo/headings.spec.ts` |
| Heading hierarchy never skips a level | `tests/seo/headings.spec.ts` |
| No broken internal links | `tests/seo/links.spec.ts` |
| No internal links to redirects | `tests/seo/links.spec.ts` |
| No hard-coded domain in links | `tests/seo/links.spec.ts` |
| No links to removed routes (`/about/`, `/thanks/`) | `tests/seo/links.spec.ts` |
| No orphaned or weakly-linked pages | `tests/seo/links.spec.ts` |
| Social profile URLs are absolute and https | `tests/seo/links.spec.ts` |
| No Origin-project residue in built pages | **pending #5** — not yet written |
| Every image declares `alt` | `tests/seo/images.spec.ts` |
| Every image declares dimensions | `tests/seo/images.spec.ts` |
| LCP image not lazy-loaded | `tests/seo/images.spec.ts` |
| JSON-LD parses; `@id`s resolve | `tests/seo/structured-data.spec.ts` |
| One Person/WebSite `@id` site-wide | `tests/seo/structured-data.spec.ts` |
| Person `sameAs` matches the declared profiles | `tests/seo/structured-data.spec.ts` |
| Every page links to every declared social profile | `tests/seo/links.spec.ts` |
| Person claims no role or employer | `tests/seo/structured-data.spec.ts` |
| No fabricated schema types | `tests/seo/structured-data.spec.ts` |
| Breadcrumb schema matches a visible trail | `tests/seo/structured-data.spec.ts` |
| No accidental `noindex` | `tests/seo/indexability.spec.ts` |
| Sitemap agrees with indexability | `tests/seo/indexability.spec.ts` |
| Client JavaScript within budget (1) | `tests/seo/javascript.spec.ts` |
| Lighthouse budget URLs exist in the build | `tests/seo/lighthouse-urls.spec.ts` |
| Feed lists exactly the published Articles | `tests/seo/feed.spec.ts` |
| Feed is discoverable from every page | `tests/seo/feed.spec.ts` |
| No dev-only tooling in `dist/` | `tests/seo/dev-only.spec.ts` |
| Build stays purely static | `tests/seo/dev-only.spec.ts` |
| Trailing-slash redirect works at the edge | `tests/e2e/edge.spec.ts` |
| Unknown and removed URLs return a real 404 | `tests/e2e/edge.spec.ts` |
| Site works with JavaScript disabled | `tests/e2e/no-js.spec.ts` |
| Only the CloseBot widget ships script, per path; its origin is the only third party | `tests/e2e/no-js.spec.ts` |
| Every page renders dark, whatever the system preference | `tests/e2e/no-js.spec.ts` |
| Pages fit a 375px phone; the header stays one line | `tests/e2e/mobile.spec.ts` |
| Related links resolve to real Articles | `reference()` in `src/content.config.ts` |
| Cover images have alt text | content schema refinement |
| Type safety | `astro check` |
| Performance / accessibility budgets | Lighthouse CI |

Everything marked _(judgement)_ above is **not** on this list. That is the
point of the distinction.

---

## Working on this codebase

```bash
pnpm dev          # dev server (drafts visible)
pnpm check        # TypeScript + Astro diagnostics
pnpm build        # static build; also writes .seo/manifest.json
pnpm test         # check + build + SEO suite
pnpm test:seo     # SEO assertions against the build manifest (fast)
pnpm test:e2e     # Playwright against wrangler dev (real Workers runtime)
pnpm serve        # serve dist exactly as Cloudflare will

pnpm og           # regenerate the social share cards (builds first)
```

`og` is **not** part of the build. It writes committed PNGs into `public/og/`,
so the deploy has no generation step and no new dependency. Run it by hand and
commit the output in the same change.

`og` builds first, because each Article's card is titled from that page's real
`<h1>` in `.seo/manifest.json` rather than from frontmatter. **After changing
an Article title the loop is `build → og → build`**: the second build is what
copies the regenerated PNG out of `public/`. `tests/seo/og-cards.spec.ts`
re-renders every card and fails if one is stale, so skipping a step is caught
rather than shipped.

Always run `pnpm test` before committing. `pnpm test:seo` requires a build —
it asserts against real output, not source.

### Editing Articles in the browser

`pnpm dev` adds an **Edit article** app to the dev toolbar. Open any page under
`/writing/`, toggle it, and the panel loads that Article's raw frontmatter and
Markdown. Save writes the file and the page behind reloads.

Two textareas of raw text, not parsed fields and not a rich editor. Anything
that re-serialises would reorder YAML keys or reflow hand-wrapped prose, so a
one-word change would produce a hundred-line diff. Raw text round-trips
byte-for-byte — verify with `git diff` after a save.

**It cannot touch production, for four independent reasons.** Production is
static files on Cloudflare with no Node, no filesystem and no endpoint;
registration is gated on `command === 'dev'`; the handlers live on
`astro:server:setup`, which never runs in a build; and writes are confined to
`src/content/articles/` by a slug pattern that makes traversal unrepresentable.

`tests/seo/dev-only.spec.ts` asserts after every build that none of it reached
`dist/`. That test is what catches someone later removing the `command` guard —
do not weaken it.

Frontmatter is validated by Astro on reload, not by the panel, and there is no
undo. Commit before a long editing session.

The panel owns its own **Close** button, and `Esc` closes it. That is not a
nicety: Astro parks its dev toolbar at `bottom: -40px` and only slides it up on
hover, so with a full-height panel open the toolbar button that opened it is
off-screen. A panel without a close control of its own is a panel with no way
out.

### Adding images

`pnpm dev` also adds a **Media** app to the dev toolbar. It browses
`src/assets/media/`, imports files into it, stores the alt text and title for
each one, and hands Markdown to the Article editor. Same four-layer dev-only
argument as the editor, and the same `tests/seo/dev-only.spec.ts` proof that
none of it reaches `dist/`.

**Images go in `src/assets/media/`, never `public/`.** This is the whole reason
the tool exists rather than a folder and a text editor. `public/` is copied
verbatim — no dimensions, no `srcset`, no format conversion — and
`images.spec.ts` fails a build where an image has no `width` and `height`.
Under `src/assets/`, a plain Markdown `![alt](../../assets/media/x.png)` comes
out of the pipeline as a sized, lazy-loaded WebP with nothing hand-written.

An image here has exactly seven attributes worth setting, and only four are
editable because the pipeline decides the rest — correctly:

| | Set where |
| --- | --- |
| `alt` | the panel, stored per file and offered on every insert |
| `title` | the panel — the tooltip in `![alt](src "title")` |
| filename | the panel, at import; the one moment it is free to change |
| cover role | the panel's **Use as cover**; this is what sets `og:image` |
| dimensions | automatic — Astro reads them from the file |
| format | automatic — the pipeline picks, and `<Image>` is told not to |
| `loading` | automatic — a cover is eager, a body image is lazy |

If a field feels missing, check that table before adding one. There is nothing
else an `<img>` on this site carries.

**The first image in an Article must be the cover.** Markdown emits
`loading="lazy"` unconditionally and offers no way to override it, while
`images.spec.ts` fails any page whose first `<img>` is lazy. So a body image in
an Article with no cover breaks the build — not at save time, at `pnpm test`.
The panel knows this and refuses the insert, pointing at **Use as cover**,
which the Article layout loads eagerly with `fetchpriority="high"`.

Two smaller decisions worth knowing:

- **SVG is rejected.** Astro passes it through without rasterising, so it
  arrives with no intrinsic dimensions and fails the build. Place an SVG by
  hand with an explicit `<Image>` or `<img width height>` if you need one.
- **Imports wider than 2400px are downscaled**, in the same format, and the
  panel says so. Templates request at most 1200px, so the rest is bytes the
  repository would carry forever and the pipeline would discard anyway.

There is no delete. An image the panel shows as `unused` is one `git rm` away
from gone, and one that reports which Articles reference it is telling you what
would break — which is more useful than a button that has to re-derive the same
answer before it is safe to press.

`src/assets/media/` is excluded from Vite's file watcher. Writing image
metadata must not be able to reload the page, because that would discard
unsaved prose in the Article editor.

### Auditing the whole site

`.seo/manifest.json` describes every page after a build: titles, descriptions,
canonicals, heading outlines, schema types and `@id`s, inbound and outbound
link counts, images, and script counts.

Read it to answer questions about the site as a whole — duplicate titles,
weakly-linked pages, thin metadata — instead of opening pages one at a time.

### Adding a page

1. Article → copy `templates/article.md` into `src/content/articles/`. The
   schema validates it and the route generates itself.
2. Standalone page → copy `templates/page.astro` into `src/pages/`.
3. Link to it from at least two places, or allowlist it.
4. For an Article, run `pnpm og` to draw its share card, then commit the PNG.
   A new Article has no card until you do, and its `og:image` will 404.
5. Run `pnpm test`.

The templates carry the structural conventions inline. Start from them rather
than copying an existing page, which propagates whatever that page got wrong.

### Before launch

- [x] ~~Fill in `sameAs` in `src/data/person.ts` with verified profile URLs~~ —
      GitHub. Read the note on `socialProfiles` before adding another
- [x] ~~Confirm `SITE_URL` matches the domain actually being deployed~~
- [ ] Verify the site in Google Search Console and submit the sitemap
- [ ] Add the Owner's LinkedIn to `socialProfiles` once verified
- [ ] Choose a public contact email; until then the Person has no `email` and
      there is no `security.txt`
