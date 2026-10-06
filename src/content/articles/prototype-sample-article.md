---
title: 'PROTOTYPE sample: what a long Article looks like here'
description: 'Throwaway draft for the neobrutalism prototype. Exercises headings, lists, code, quotes and tables so each variant can be judged on real prose.'
pubDate: 2026-10-01
draft: true
tags: [prototype]
---

This is a throwaway draft that exists only on the prototype branch. It is here so every variant can be judged against a page of actual reading, not just a hero.

## How does body copy hold up?

Neobrutalism is loud by design, and the risk is that the loudness leaks into the reading column. A paragraph should still read like a paragraph: comfortable measure, calm leading, links that are obvious without shouting. Here is [an inline link](/open-source/) and some `inline code` for comparison.

- A list item, short.
- A second, longer list item that wraps onto a new line on narrower screens so the hanging indent can be checked.
- A third.

> A pull quote. In the placeholder it is a quiet grey rule; here it becomes a bordered block with a lime spine.

## What about code and tables?

```ts
export function getVariant(url: URL) {
  return url.searchParams.get('variant') ?? 'A';
}
```

| Token | Value |
| --- | --- |
| Border | 3px ink |
| Shadow | 6px hard offset |
| Accent | acid lime |

### A third-level heading

One more paragraph to close the page out and show the space above the footer.
