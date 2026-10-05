# maxpattillo.com

The personal site of Max Pattillo. Astro, deployed to Cloudflare Workers as
static assets.

Forked from [Bryce DeCora's site](https://github.com/closebotai/brycedecora).

The premise: **SEO and design requirements are build-time contracts, not
documented conventions.** A page cannot ship without validated metadata, a
self-referencing canonical, or structured data, because producing those is the
framework's job, not the page's.

The enforcement table at the end of [AGENTS.md](./AGENTS.md) maps every rule to
the thing that fails when it is broken. Rules that nothing checks are marked
_(judgement)_.

---

## Start here if you are an agent

Read these before editing anything. Most of what they describe fails the build:

| File | What it governs |
| --- | --- |
| [AGENTS.md](./AGENTS.md) | Rendering, metadata, URLs, structured data, links, the JavaScript budget, content |
| [DESIGN.md](./DESIGN.md) | The visual rules |
| [CONTEXT.md](./CONTEXT.md) | The domain vocabulary: Owner, CloseBot, Origin project, Article |

1. **Run `pnpm test` before you claim anything works.** It is
   `check` → `build` → the SEO suite, and it asserts against *real build
   output* in `.seo/manifest.json`, not against source.
2. **Changing an Article title or slug means `build → og → build`.** Share
   cards are generated and committed; `tests/seo/og-cards.spec.ts` fails if a
   committed card is stale.
3. **There is a JavaScript budget**, enforced by
   `tests/seo/javascript.spec.ts` and `tests/e2e/no-js.spec.ts`. Raising it
   happens in the same commit as the script that needs it, with a comment
   saying why.
4. **Do not hand-write metadata, JSON-LD, or a domain.** Pages supply `title`
   and `description`; the layout computes the rest. `SITE_URL` is defined once,
   in `src/data/site.ts`.

## Quick start

```bash
pnpm install
cp .env.example .env      # optional; see below
pnpm dev                  # http://localhost:4321
```

Node is pinned by `.nvmrc` (22). pnpm is pinned by `packageManager` in
`package.json`.

`.env` is optional and gitignored; `.env.example` documents every variable. The
only one is `CLOSEBOT_SOURCE`, the id of the Owner's CloseBot agent, which the
chat widget loads. Leave it empty and the widget does not render; the site and
the test suite work without it.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server. Drafts visible, dev toolbar apps available. |
| `pnpm check` | TypeScript + Astro diagnostics. Must be zero errors. |
| `pnpm build` | Static build to `dist/`, plus `.seo/manifest.json`. |
| `pnpm test` | `check` → `build` → SEO suite. Run before committing. |
| `pnpm test:seo` | SEO assertions against the build manifest. |
| `pnpm test:e2e` | Playwright against `wrangler dev`, the real Workers runtime. |
| `pnpm test:lighthouse` | Performance / a11y / SEO budgets. |
| `pnpm serve` | Serve `dist/` exactly as Cloudflare will. |
| `pnpm og` | Regenerate the social share cards. Builds first. |
| `pnpm deploy` | Build and deploy via Wrangler. |

## How it fits together

```
src/
  data/           person.ts — the Person entity. Never retype the name.
                  site.ts   — SITE_URL, URL policy, NOINDEX_ROUTES.
  schemas/seo.ts  The SEO contract. BaseLayout parses it; invalid input
                  fails the build.
  utils/schema.ts Typed JSON-LD builders. One @graph per page, entities
                  cross-referenced by stable @id.
  layouts/        BaseLayout owns <head>, the single <main>, and the single
                  <h1>. Pages pass data, never markup.
  content/        Articles, as Markdown.
  assets/media/   Article imagery, managed by the Media dev-toolbar app.
integrations/
  seo-manifest.ts Parses every built page into .seo/manifest.json.
  content-editor  Dev-only. Edit Articles from the browser.
  media-library   Dev-only. Import and annotate images from the browser.
scripts/          Generators for committed assets such as the share cards.
tests/seo/        Asserts against the manifest. No browser, so it is fast
                  enough to run on every commit.
tests/e2e/        What a manifest cannot see: Cloudflare's edge behaviour,
                  life without JavaScript, and phone viewports.
public/
  _headers        Security headers, consumed by Cloudflare (not served).
  _redirects      301s for renamed slugs.
```

## Running it locally

**`pnpm dev`** → <http://localhost:4321>, with fast HMR and drafts visible.

**`pnpm serve`** → <http://localhost:8787>, serving `dist/` through
`wrangler dev`, the real Workers runtime. This is the only way to see what
Cloudflare will actually do: trailing-slash redirects, real 404 status codes,
and asset headers. The dev server does **not** reproduce them.

```bash
pnpm build && pnpm serve
```

`pnpm dev` also adds two dev-toolbar apps, **Edit article** and **Media**. Both
are gated on `command === 'dev'`, and `tests/seo/dev-only.spec.ts` asserts that
none of either reaches `dist/`. They have no authentication, so do not run
`astro dev --host` on an untrusted network.

## Deployment

Cloudflare **Workers Builds** watches this repository and deploys it. GitHub
Actions runs CI on every push and PR but does not deploy, so no Cloudflare
credentials live in GitHub.

- Push to `main` → production deploy to `maxpattillo.com`
- Push any other branch / open a PR → preview deploy

Workers Builds settings:

| Setting | Value |
| --- | --- |
| Build command | `pnpm test` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |
| Production branch | `main` |

`pnpm test` runs `astro check` → `astro build` → the SEO suite, so a failing
SEO assertion blocks the deploy, not just the PR.

Build variables:

| Variable | Value |
| --- | --- |
| `PNPM_VERSION` | The version in `packageManager` in `package.json`. The build image's default pnpm ignores the `allowBuilds:` key in `pnpm-workspace.yaml`, and the build then fails downstream. |
| `CLOSEBOT_SOURCE` | The Owner's CloseBot agent id. Set it under both *Production* and *Previews Base*, or previews build without the widget. |

`CLOSEBOT_SOURCE` is documented in full, including where CI reads it from, in
`.env.example`.

The Worker is named `maxpattillo`, and the name in the dashboard must match
`name` in `wrangler.jsonc`.

### Zone settings that are not in this repo

Four things live in the Cloudflare dashboard and cannot be set from code,
because the site has no Worker runtime to run middleware in:

| Setting | Where | Why |
| --- | --- | --- |
| Always Use HTTPS | SSL/TLS → Edge Certificates | Without it `http://` serves the site in plaintext, and `http://www` dead-ends in a 522 |
| Minimum TLS Version 1.2 | SSL/TLS | TLS 1.0/1.1 were deprecated by RFC 8996 in 2021 |
| HSTS | SSL/TLS → Edge Certificates | Emitted at the edge on every response, including redirects, which `_headers` cannot reach |
| No-Sniff Header | inside the HSTS dialog | Same reason |

`public/_headers` carries the rest (`Referrer-Policy`, `X-Frame-Options`) and
documents the split so nobody sets the same header in two places.

**Enabling HSTS has a trap:** the Configure panel has an *Enable HSTS* toggle
above the max-age selector, and the dialog opens scrolled past it. Saving a
max-age without flipping that toggle persists the settings with
`"enabled": false` and no header is ever sent, while the UI looks like it
worked. Verify on the wire, not in the dashboard:

```bash
curl -sSI https://<domain>/ | grep -i strict-transport
```

### Deploying by hand

```bash
pnpm exec wrangler login   # once
pnpm deploy                # build + wrangler deploy
```

## Forking this

The repository is wired to one person and one domain. Deployed unchanged, it
publishes a copy of the Owner's identity: canonical tags, `Person` structured
data and a byline all pointing at them. Change these first:

| What | Where |
| --- | --- |
| Name, description, social profiles | `src/data/person.ts` |
| Domain, site name, source repository | `src/data/site.ts` |
| Chat widget | `CLOSEBOT_SOURCE` in your own `.env` and build variables |
| Articles, images, share cards | `src/content/`, `src/assets/`, `public/og/` |
| Worker name | `wrangler.jsonc` |

Then run `pnpm og` to regenerate the share cards and favicon from
your own values, and `pnpm test`.

## License

[MIT](./LICENSE) for the code. The content is not covered: `src/content/`,
`src/assets/media/` and `public/og/` remain Max Pattillo's. A fork replaces all
three anyway; see [Forking this](#forking-this).
