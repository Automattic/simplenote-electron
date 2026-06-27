import type {
  ElementTransformer,
  MultilineElementTransformer,
  Transformer,
} from '@lexical/markdown';

import { $isSelectionInTable } from './table-controls';

const blockShortcutBlocked = (isImport: boolean) =>
  !isImport && $isSelectionInTable();

/**
 * Table cells are Lexical shadow roots, so stock block markdown shortcuts
 * (`> `, `# `, ```, lists, …) would otherwise transform inside cells.
 * Import paths keep full transformers; only live typing is blocked.
 */
export function withTableSafeBlockShortcuts(
  transformers: Transformer[]
): Transformer[] {
  return transformers.map((transformer) => {
    if (transformer.type === 'element') {
      const { replace } = transformer;
      const wrapped: ElementTransformer = {
        ...transformer,
        replace: (parentNode, children, match, isImport) => {
          if (blockShortcutBlocked(isImport)) {
            return false;
          }
          return replace(parentNode, children, match, isImport);
        },
      };
      return wrapped;
    }

    if (transformer.type === 'multiline-element') {
      const { replace } = transformer;
      const wrapped: MultilineElementTransformer = {
        ...transformer,
        replace: (
          rootNode,
          children,
          startMatch,
          endMatch,
          linesInBetween,
          isImport
        ) => {
          if (blockShortcutBlocked(isImport)) {
            return false;
          }
          return replace(
            rootNode,
            children,
            startMatch,
            endMatch,
            linesInBetween,
            isImport
          );
        },
      };
      return wrapped;
    }

    return transformer;
  });
}
