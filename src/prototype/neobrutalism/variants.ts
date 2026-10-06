/**
 * PROTOTYPE — throwaway. Lives on `prototype/neobrutalism-site`, never main.
 *
 * Question: what should the whole site look like in the neobrutalism.dev
 * style? Four structurally different site shells, switchable via `?variant=`
 * on every real route (home, /writing/, /open-source/, a draft Article).
 *
 * Dev only: `getVariant` returns null in a build, so production renders the
 * existing placeholder markup untouched.
 */
export const VARIANTS = {
  A: 'Sticker board',
  B: 'Sidebar rail',
  C: 'Bento poster',
  D: 'Index ledger',
} as const;

export type VariantKey = keyof typeof VARIANTS;

export const VARIANT_KEYS = Object.keys(VARIANTS) as VariantKey[];

// `_url` kept for the call sites; the value really arrives via the dev
// middleware in variant-integration.ts, since Astro strips the query.
export function getVariant(_url: URL): VariantKey | null {
  if (!import.meta.env.DEV) return null;
  const raw = ((globalThis as { __protoVariant?: string }).__protoVariant ?? 'A').toUpperCase();
  return (VARIANT_KEYS as string[]).includes(raw) ? (raw as VariantKey) : 'A';
}

/**
 * Accent candidates, after "A, but the lime is too bright". Applied client-side
 * as a CSS variable via `?accent=`, so switching needs no reload. All are light
 * enough to carry the near-black on-accent text.
 */
export const ACCENTS = {
  acid: { label: 'Acid lime (current)', value: 'oklch(0.93 0.23 126)' },
  soft: { label: 'Soft lime', value: 'oklch(0.87 0.17 125)' },
  chartreuse: { label: 'Muted chartreuse', value: 'oklch(0.82 0.13 118)' },
  pale: { label: 'Pale lime', value: 'oklch(0.91 0.10 115)' },
  moss: { label: 'Moss', value: 'oklch(0.74 0.12 125)' },
  sage: { label: 'Sage', value: 'oklch(0.80 0.07 150)' },
  amber: { label: 'Amber', value: 'oklch(0.80 0.14 75)' },
  bone: { label: 'Bone', value: 'oklch(0.90 0.03 90)' },
} as const;
