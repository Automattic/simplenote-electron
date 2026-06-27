import { $isHeadingNode } from '@lexical/rich-text';
import { $getRoot } from 'lexical';

import type { NodeKey } from 'lexical';

// GitHub-style heading slug, so `[link](#my-section)` matches `## My Section`.
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Finds the heading matching an anchor slug, deduping repeated headings
 * GitHub-style (`heading`, `heading-1`, …). Must run inside editor.read().
 */
export function $findAnchorHeadingKey(slug: string): NodeKey | null {
  const slugCounts = new Map<string, number>();

  for (const node of $getRoot().getChildren()) {
    if (!$isHeadingNode(node)) {
      continue;
    }

    const base = slugifyHeading(node.getTextContent());
    if (!base) {
      continue;
    }

    const count = slugCounts.get(base) ?? 0;
    slugCounts.set(base, count + 1);

    if ((count === 0 ? base : `${base}-${count}`) === slug) {
      return node.getKey();
    }
  }

  return null;
}
