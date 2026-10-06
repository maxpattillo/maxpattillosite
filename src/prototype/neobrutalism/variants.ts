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
 * Accent candidates, round two: the Owner picked Bone and asked for darker,
 * more minimal neighbours. All near-neutral (chroma <= 0.05), stepping down in
 * lightness from Bone. None goes below L 0.62, so the near-black on-accent
 * text keeps a usable contrast. Applied client-side via `?accent=`.
 */
export const ACCENTS = {
  bone: { label: 'Bone', value: 'oklch(0.90 0.03 90)' },
  parchment: { label: 'Parchment', value: 'oklch(0.85 0.035 85)' },
  linen: { label: 'Linen', value: 'oklch(0.80 0.025 75)' },
  stone: { label: 'Stone', value: 'oklch(0.75 0.02 80)' },
  ash: { label: 'Ash', value: 'oklch(0.70 0.01 90)' },
  taupe: { label: 'Taupe', value: 'oklch(0.68 0.03 60)' },
  clay: { label: 'Clay', value: 'oklch(0.66 0.05 45)' },
  fog: { label: 'Fog (cool)', value: 'oklch(0.78 0.012 240)' },
  smoke: { label: 'Smoke (cool)', value: 'oklch(0.66 0.01 250)' },
} as const;
