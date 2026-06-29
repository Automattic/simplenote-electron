import {
  $getRoot,
  $hasUpdateTag,
  ParagraphNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';

import {
  $createEmptyLineParagraphNode,
  $isEmptyLineParagraphNode,
  $promoteEmptyLineParagraphIfNeeded,
} from '../nodes/empty-line-paragraph-node';
import { isEmptyRootParagraph } from '../memory/selection-lexical-helpers';
import { IMPORT_MARKDOWN_TAG, REMOTE_CONTENT_TAG } from '../markdown/on-change';
import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';

export const EMPTY_LINE_RECONCILE_TAG = 'empty-line-reconcile';

function $shouldUseEmptyLineParagraph(node: LexicalNode): boolean {
  if (!isEmptyRootParagraph(node) || $isTransientParagraphNode(node)) {
    return false;
  }

  if (node.getParent()?.getType() !== 'root') {
    return false;
  }

  const previous = node.getPreviousSibling();
  const next = node.getNextSibling();
  return (
    previous !== null &&
    next !== null &&
    !$isTransientParagraphNode(previous) &&
    !$isTransientParagraphNode(next)
  );
}

function $shouldSkipEmptyLinePromotion(): boolean {
  return (
    $hasUpdateTag(IMPORT_MARKDOWN_TAG) ||
    $hasUpdateTag(REMOTE_CONTENT_TAG) ||
    $hasUpdateTag(EMPTY_LINE_RECONCILE_TAG)
  );
}

function $promoteEmptyLineParagraphsWithContent(): void {
  for (const child of $getRoot().getChildren()) {
    if ($isEmptyLineParagraphNode(child)) {
      $promoteEmptyLineParagraphIfNeeded(child);
    }
  }
}

export function registerEmptyLineParagraph(editor: LexicalEditor): () => void {
  const removeParagraphTransform = editor.registerNodeTransform(
    ParagraphNode,
    (node) => {
      if (
        $shouldSkipEmptyLinePromotion() ||
        !$shouldUseEmptyLineParagraph(node)
      ) {
        return;
      }

      node.replace($createEmptyLineParagraphNode());
    }
  );

  const removeUpdateListener = editor.registerUpdateListener(({ tags }) => {
    if (tags.has(EMPTY_LINE_RECONCILE_TAG)) {
      return;
    }

    editor.update(
      () => {
        $promoteEmptyLineParagraphsWithContent();
      },
      { tag: EMPTY_LINE_RECONCILE_TAG }
    );
  });

  return () => {
    removeParagraphTransform();
    removeUpdateListener();
  };
}
