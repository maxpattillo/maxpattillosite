# Design

The visual rules for this site. The companion to [AGENTS.md](./AGENTS.md),
which governs everything else.

Decided by prototype on 2026-10-06: four neobrutalist site shells were
compared on the real pages, and the Owner picked **"Sticker board"** with a
**smoke** accent. The losing shells and the accent rounds live on the
`prototype/neobrutalism-site` branch.

## The direction

- **Dark-only.** One palette. No light theme, no `prefers-color-scheme` branch,
  no toggle. `tests/e2e/no-js.spec.ts` fails a page that renders light.
- **Neobrutalism, kept dark and quiet.** Flat and structural; the construction
  is the decoration. The accent is a near-neutral cool grey, not a bright
  colour. The Owner chose it over acid lime as "too bright".
- **Square corners.** No border radius. The focus ring's 2px is the only one.
- **Thick borders, hard offset shadows.** 3px ink borders; 6px solid
  shadows, never blurred.

## Tokens

All in `src/styles/global.css`. Components reference these, never literals.

| Token | Value | For |
| --- | --- | --- |
| `--color-surface` | `oklch(0.15 0 0)` | The page |
| `--color-surface-raised` | `oklch(0.21 0 0)` | Code blocks, the chat widget |
| `--color-ink` / `--color-line` | `oklch(0.97 0 0)` | Text; borders and shadows |
| `--color-ink-muted` | `oklch(0.78 0 0)` | Secondary text, never body copy |
| `--color-rule` | `oklch(0.42 0 0)` | Soft rules inside prose |
| `--color-accent` | `oklch(0.66 0.01 250)` | Smoke. Fills, the lead shadow, link underlines |
| `--color-on-accent` | `oklch(0.13 0 0)` | Text set on an accent fill |
| `--border-heavy` | `3px` | Every structural border |
| `--shadow-offset` | `6px` | Every panel shadow |

The share card and favicon read `--color-accent`, `--color-ink` and the surfaces
from the same file (`scripts/og-card.mjs`). After changing them, run `pnpm og`.

The favicon is the **pressed block**: an ink-bordered dark block on a smoke
offset shadow, with no letters. Picked by prototype on 2026-10-06 over the
initials, which smear at 16px. The candidates live on `prototype/logo`.

## Type

- **Space Grotesk** for text and display. **JetBrains Mono** for labels,
  buttons, dates and code: anything machine-adjacent.
- Both are self-hosted variable fonts from `@fontsource-variable`, imported in
  `BaseLayout`. No font CDN. See "Web fonts" in [AGENTS.md](./AGENTS.md).
- Two registers. `display` (the homepage) uses a huge `<h1>` with leading below 1.
  `reading` (everything else) puts the `<h1>` on an accent `.highlight` band.

## Components

Defined in `global.css`, `@layer components`.

| Class | What it is |
| --- | --- |
| `.panel` | Ink border and ink offset shadow. The basic unit |
| `.panel-accent` | The panel's shadow in the accent. One per page, on the lead panel |
| `.button`, `.button-ghost` | Mono, uppercase, pressable. Accent-filled, or surface-filled |
| `.tag` | A small accent-filled mono label: the site name, the homepage greeting |
| `.highlight` | The accent band behind a reading-register title |
| `.sticker`, `.sticker-grid` | Homepage navigation tiles, tilted by position |

The header is a floating panel with the name as a tag and the nav as ghost
buttons. The footer is the one large accent slab, with dark chips for links.

## Motion

Colour transitions, plus one gesture: the **press**. Hovering a `.button` or
`.sticker`, or a button being the current page, moves it onto its own shadow
(100ms). There are no fades and no scroll effects, and `prefers-reduced-motion`
clamps all of it.
