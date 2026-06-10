import {
  $getNodeByKey,
  $getRoot,
  defineExtension,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from 'lexical';

/**
 * Lexical cannot virtualize rendering (every node owns a DOM element), so for
 * large notes we lean on CSS `content-visibility: auto` instead: off-screen
 * top-level blocks skip layout and paint while staying in the DOM, keeping
 * selection, find-in-page, and accessibility intact.
 *
 * Known pitfalls that shape this implementation:
 *
 * - On small documents the optimization gains nothing but the intrinsic-size
 *   estimates cause visible layout jitter, so it only kicks in above a size
 *   threshold.
 * - With containment active, Chromium re-evaluates containment boundaries
 *   after edits, costing O(blocks-after-edit) per keystroke. So containment
 *   is dropped while the user is typing and restored once input goes idle.
 * - The scrollbar is computed from placeholder sizes of unrendered blocks, so
 *   a flat estimate (e.g. one line per block) makes the scroll height jump
 *   around during the first scroll-through. Each block therefore gets a
 *   content-derived `contain-intrinsic-size` estimate (line count plus a
 *   wrapping approximation, using the block's own font metrics). The `auto`
 *   keyword keeps the browser's remembered exact size once a block has been
 *   rendered, so estimates only matter until first render.
 */
export const LARGE_DOCUMENT_CHAR_THRESHOLD = 50_000;
const IDLE_RESTORE_MS = 500;

export const LARGE_DOCUMENT_CLASS = 'lexical-md-editor__input--large';

// Average glyph width as a fraction of font size; used to estimate how many
// characters fit on a line before wrapping.
const CHAR_WIDTH_RATIO = 0.55;
// Computed line-height resolves to 'normal' for some elements.
const NORMAL_LINE_HEIGHT_RATIO = 1.4;
const FALLBACK_CHARS_PER_LINE = 80;

/**
 * Estimated rendered line count of a block's text: one line per hard break,
 * plus wrapped lines for content wider than the column. `charsPerLine` of
 * Infinity means the block does not wrap (e.g. `white-space: pre`).
 */
export function estimateLineCount(text: string, charsPerLine: number): number {
  let lines = 0;
  for (const line of text.split('\n')) {
    lines += Math.max(1, Math.ceil(line.length / charsPerLine));
  }
  return lines;
}

interface BlockMetrics {
  lineHeight: number;
  fontSize: number;
  verticalPadding: number;
  wraps: boolean;
}

export function registerLargeDocumentOptimization(
  editor: LexicalEditor
): () => void {
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  // Top-level blocks touched since estimates were last applied.
  const pendingEstimateKeys = new Set<NodeKey>();
  // Font metrics are per block type, so cache them by tag name instead of
  // calling getComputedStyle for each of potentially thousands of blocks.
  const metricsByTag = new Map<string, BlockMetrics>();

  const $isLargeDocument = () =>
    $getRoot().getTextContentSize() >= LARGE_DOCUMENT_CHAR_THRESHOLD;

  const setContainment = (enabled: boolean) => {
    editor.getRootElement()?.classList.toggle(LARGE_DOCUMENT_CLASS, enabled);
  };

  const metricsFor = (element: HTMLElement): BlockMetrics => {
    const tag = element.tagName;
    let metrics = metricsByTag.get(tag);
    if (!metrics) {
      const style = getComputedStyle(element);
      const fontSize = parseFloat(style.fontSize) || 16;
      const parsedLineHeight = parseFloat(style.lineHeight);
      metrics = {
        fontSize,
        lineHeight: Number.isFinite(parsedLineHeight)
          ? parsedLineHeight
          : fontSize * NORMAL_LINE_HEIGHT_RATIO,
        verticalPadding:
          (parseFloat(style.paddingTop) || 0) +
          (parseFloat(style.paddingBottom) || 0),
        wraps: style.whiteSpace !== 'pre' && style.whiteSpace !== 'nowrap',
      };
      metricsByTag.set(tag, metrics);
    }
    return metrics;
  };

  const estimateBlockHeight = (
    element: HTMLElement,
    text: string,
    contentWidth: number
  ): number => {
    const metrics = metricsFor(element);
    const charsPerLine = !metrics.wraps
      ? Infinity
      : contentWidth > 0
        ? Math.max(20, contentWidth / (metrics.fontSize * CHAR_WIDTH_RATIO))
        : FALLBACK_CHARS_PER_LINE;
    return (
      estimateLineCount(text, charsPerLine) * metrics.lineHeight +
      metrics.verticalPadding
    );
  };

  /** Set content-derived intrinsic-size estimates; `null` means all blocks. */
  const applyEstimates = (keys: ReadonlySet<NodeKey> | null) => {
    const rootElement = editor.getRootElement();
    if (!rootElement) {
      return;
    }
    const rootStyle = getComputedStyle(rootElement);
    const contentWidth =
      rootElement.clientWidth -
      (parseFloat(rootStyle.paddingLeft) || 0) -
      (parseFloat(rootStyle.paddingRight) || 0);

    editor.getEditorState().read(() => {
      let blocks: LexicalNode[];
      if (keys === null) {
        blocks = $getRoot().getChildren();
      } else {
        const seen = new Set<NodeKey>();
        blocks = [];
        for (const key of keys) {
          const block = $getNodeByKey(key)?.getTopLevelElement();
          if (block && !seen.has(block.getKey())) {
            seen.add(block.getKey());
            blocks.push(block);
          }
        }
      }

      for (const block of blocks) {
        const element = editor.getElementByKey(block.getKey());
        if (element instanceof HTMLElement) {
          const height = estimateBlockHeight(
            element,
            block.getTextContent(),
            contentWidth
          );
          element.style.containIntrinsicSize = `auto ${Math.round(height)}px`;
        }
      }
    });
  };

  const cancelIdleTimer = () => {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  const removeRootListener = editor.registerRootListener((rootElement) => {
    metricsByTag.clear();
    if (rootElement && editor.getEditorState().read($isLargeDocument)) {
      applyEstimates(null);
      rootElement.classList.add(LARGE_DOCUMENT_CLASS);
    }
  });

  const removeUpdateListener = editor.registerUpdateListener(
    ({ dirtyElements, dirtyLeaves, editorState }) => {
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
        return;
      }

      // Text edits mark every ancestor element dirty, so the touched
      // top-level blocks are always represented here.
      for (const key of dirtyElements.keys()) {
        pendingEstimateKeys.add(key);
      }

      cancelIdleTimer();
      setContainment(false);

      if (!editorState.read($isLargeDocument)) {
        pendingEstimateKeys.clear();
        return;
      }

      idleTimer = setTimeout(() => {
        idleTimer = null;
        applyEstimates(pendingEstimateKeys);
        pendingEstimateKeys.clear();
        setContainment(true);
      }, IDLE_RESTORE_MS);
    }
  );

  return () => {
    cancelIdleTimer();
    removeRootListener();
    removeUpdateListener();
  };
}

export const LargeDocumentExtension = defineExtension({
  name: '@simplenote/large-document',
  register(editor) {
    return registerLargeDocumentOptimization(editor);
  },
});
