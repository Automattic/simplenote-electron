import {
  $createRangeSelection,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type EditorState,
  type LexicalEditor,
} from 'lexical';

export type UrlPanelSelectionSnapshot = {
  anchor: UrlPanelSelectionPointSnapshot;
  focus: UrlPanelSelectionPointSnapshot;
  format: number;
  style: string;
};

export type UrlPanelSelectionPointSnapshot = {
  key: string;
  offset: number;
  type: 'text' | 'element';
};

const snapshotSelectionPoint = ({
  key,
  offset,
  type,
}: UrlPanelSelectionPointSnapshot): UrlPanelSelectionPointSnapshot => ({
  key,
  offset,
  type,
});

export const snapshotSelection = (
  editor: LexicalEditor
): UrlPanelSelectionSnapshot | null =>
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return null;
    }

    return {
      anchor: snapshotSelectionPoint(selection.anchor),
      focus: snapshotSelectionPoint(selection.focus),
      format: selection.format,
      style: selection.style,
    };
  });

const canRestoreSelectionPoint = ({
  key,
  offset,
  type,
}: UrlPanelSelectionPointSnapshot): boolean => {
  const node = $getNodeByKey(key);
  if (type === 'text') {
    return $isTextNode(node) && offset <= node.getTextContentSize();
  }

  return $isElementNode(node) && offset <= node.getChildrenSize();
};

export const $restoreSelectionSnapshot = (
  snapshot: UrlPanelSelectionSnapshot
): boolean => {
  if (
    !canRestoreSelectionPoint(snapshot.anchor) ||
    !canRestoreSelectionPoint(snapshot.focus)
  ) {
    return false;
  }

  const selection = $createRangeSelection();
  selection.anchor.set(
    snapshot.anchor.key,
    snapshot.anchor.offset,
    snapshot.anchor.type
  );
  selection.focus.set(
    snapshot.focus.key,
    snapshot.focus.offset,
    snapshot.focus.type
  );
  selection.setFormat(snapshot.format);
  selection.setStyle(snapshot.style);
  $setSelection(selection);
  return true;
};

export const selectionChangedSinceSnapshot = (
  editorState: EditorState,
  snapshot: UrlPanelSelectionSnapshot
) =>
  editorState.read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return true;
    }

    return (
      selection.anchor.key !== snapshot.anchor.key ||
      selection.anchor.offset !== snapshot.anchor.offset ||
      selection.anchor.type !== snapshot.anchor.type ||
      selection.focus.key !== snapshot.focus.key ||
      selection.focus.offset !== snapshot.focus.offset ||
      selection.focus.type !== snapshot.focus.type
    );
  });
