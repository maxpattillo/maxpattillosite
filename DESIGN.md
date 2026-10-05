# Design

The visual rules for this site. The companion to [AGENTS.md](./AGENTS.md),
which governs everything else.

**The full design system is pending a prototype.** This file records the agreed
direction so that nobody — human or agent — falls back to defaults, or to any
earlier design, while it is being worked out. When the prototype settles the
tokens, components and rationale, they replace this placeholder.

## The direction

- **Dark-only.** One palette. No light theme, no `prefers-color-scheme` branch,
  no toggle. `tests/e2e/no-js.spec.ts` fails a page that renders light.
- **Neobrutalism.** Flat, loud, structural. The construction is the decoration.
- **Acid-lime accent** on near-black.
- **Type:** Space Grotesk for text and display, JetBrains Mono for labels and
  code. Neither is loaded yet; see "Web fonts" in [AGENTS.md](./AGENTS.md).
- **Square corners.** No border radius.
- **Thick borders.**
- **Hard offset shadows.** Solid, never blurred.

## Until the prototype lands

The current styling in `src/styles/global.css` is a neutral placeholder: grey
on near-black, system fonts, no hue. It exists so the prototype starts from a
clean base. Do not add character to it piecemeal — design work belongs in the
prototype, and changes made here in the meantime will be thrown away.

Components reference semantic tokens, never literal values, so the real
palette can replace the placeholder without touching a component.
