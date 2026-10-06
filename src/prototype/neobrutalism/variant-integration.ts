/**
 * PROTOTYPE — dev-only bridge for `?variant=`.
 *
 * Astro strips the query string AND headers from prerendered pages, even in
 * dev (core/request.js), so a static page cannot read `?variant=` itself.
 * This middleware reads it off each document request before Astro renders
 * and parks it on globalThis. Single-user dev server, so the race is moot.
 */
import type { AstroIntegration } from 'astro';

export function prototypeVariant(): AstroIntegration {
  return {
    name: 'prototype-neobrutalism-variant',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, _res, next) => {
          if (req.headers.accept?.includes('text/html')) {
            const url = new URL(req.url ?? '/', 'http://x');
            (globalThis as { __protoVariant?: string }).__protoVariant =
              url.searchParams.get('variant') ?? 'A';
          }
          next();
        });
      },
    },
  };
}
