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
