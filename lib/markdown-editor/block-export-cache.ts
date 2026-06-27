import {
  $getNodeByKey,
  $getRoot,
  type LexicalEditor,
  type NodeKey,
} from 'lexical';

import { $isTransientParagraphNode } from './transient-paragraph-node';

export type MarkdownExportContext = {
  dirtyElements: ReadonlySet<NodeKey>;
  dirtyLeaves: ReadonlySet<NodeKey>;
  editor: LexicalEditor;
};

type BlockExportCache = Map<NodeKey, string>;

const blockExportCaches = new WeakMap<LexicalEditor, BlockExportCache>();

export function getBlockExportCache(editor: LexicalEditor): BlockExportCache {
  let cache = blockExportCaches.get(editor);
  if (!cache) {
    cache = new Map();
    blockExportCaches.set(editor, cache);
  }
  return cache;
}

type ExportCacheClearer = (editor: LexicalEditor) => void;

const exportCacheClearers: ExportCacheClearer[] = [];

export function registerExportCacheClearer(clearer: ExportCacheClearer): void {
  exportCacheClearers.push(clearer);
}

export function clearBlockExportCache(editor: LexicalEditor): void {
  blockExportCaches.delete(editor);
  for (const clearer of exportCacheClearers) {
    clearer(editor);
  }
}

/** Walk a dirty node key up to its direct root child, if any. */
export function $rootChildKeyForDirtyKey(nodeKey: NodeKey): NodeKey | null {
  const node = $getNodeByKey(nodeKey);
  if (node === null) {
    return null;
  }

  let current = node;
  while (
    current.getParent() !== null &&
    current.getParent()?.getKey() !== $getRoot().getKey()
  ) {
    const parent = current.getParent();
    if (parent === null) {
      return null;
    }
    current = parent;
  }

  return current.getParent() === $getRoot() ? current.getKey() : null;
}

/** Map dirty element/leaf keys to the root-level blocks that must re-export. */
export function $collectDirtyRootBlockKeys(
  dirtyElements: ReadonlySet<NodeKey>,
  dirtyLeaves: ReadonlySet<NodeKey>
): Set<NodeKey> {
  const dirtyRootKeys = new Set<NodeKey>();

  for (const key of dirtyElements) {
    const rootKey = $rootChildKeyForDirtyKey(key);
    if (rootKey !== null) {
      dirtyRootKeys.add(rootKey);
    }
  }

  for (const key of dirtyLeaves) {
    const rootKey = $rootChildKeyForDirtyKey(key);
    if (rootKey !== null) {
      dirtyRootKeys.add(rootKey);
    }
  }

  return dirtyRootKeys;
}

/**
 * Block-boundary edits can change separators between neighbors. When in doubt,
 * re-export immediate root siblings alongside any dirty block.
 */
export function $expandDirtyRootBlockNeighbors(
  dirtyRootKeys: ReadonlySet<NodeKey>
): Set<NodeKey> {
  if (dirtyRootKeys.size === 0) {
    return new Set();
  }

  const rootChildren = $getRoot()
    .getChildren()
    .filter((node) => !$isTransientParagraphNode(node));
  const expanded = new Set<NodeKey>(dirtyRootKeys);

  for (const key of dirtyRootKeys) {
    const index = rootChildren.findIndex((child) => child.getKey() === key);
    if (index < 0) {
      continue;
    }

    if (index > 0) {
      expanded.add(rootChildren[index - 1].getKey());
    }

    if (index < rootChildren.length - 1) {
      expanded.add(rootChildren[index + 1].getKey());
    }
  }

  return expanded;
}

export function $resolveIncrementalExportKeys(
  context: MarkdownExportContext
): Set<NodeKey> {
  const dirtyRootKeys = $collectDirtyRootBlockKeys(
    context.dirtyElements,
    context.dirtyLeaves
  );
  return $expandDirtyRootBlockNeighbors(dirtyRootKeys);
}
