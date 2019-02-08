export function plainTextContent(editorState) {
  return editorState.getCurrentContent().getPlainText('\n');
}

export function getCurrentBlock(editorState) {
  let key = editorState.getSelection().getFocusKey();

  // There seems to be a bug in DraftJS where getFocusKey() can return a
  // ContentBlock instead of the key string.
  if (typeof key !== 'string') {
    key = key.key;
  }
  return editorState.getCurrentContent().getBlockForKey(key);
}

export function getSelectedText(editorState) {
  const contentState = editorState.getCurrentContent();
  const selectionState = editorState.getSelection();

  const startKey = selectionState.getStartKey();
  const startBlock = editorState.getCurrentContent().getBlockForKey(startKey);
  const start = selectionState.getStartOffset();
  const endKey = selectionState.getEndKey();
  const end = selectionState.getEndOffset();

  if (startKey === endKey) {
    return startBlock.getText().slice(start, end);
  }

  let selectedText = '';
  selectedText += startBlock.getText().slice(start) + '\n';

  const endBlock = editorState.getCurrentContent().getBlockForKey(endKey);

  let thisBlock = startBlock;

  while ((thisBlock = contentState.getBlockAfter(thisBlock.key))) {
    if (thisBlock.key === endKey) {
      break;
    }
    selectedText += thisBlock.getText() + '\n';
  }

  selectedText += endBlock.getText().slice(0, end);

  return selectedText;
}

export function getEquivalentSelectionState(oldEditorState, newEditorState) {
  // Find the block index for the old focus/anchor keys
  // Use the new focus/anchor keys at that index with the old focus/anchor offsets
  const oldEditorSelection = oldEditorState.getSelection();
  const oldAnchorKey = oldEditorSelection.getAnchorKey();
  const oldFocusKey = oldEditorSelection.getFocusKey();
  const oldEditorBlocks = oldEditorState.getCurrentContent().getBlocksAsArray();
  let oldAnchorPosition;
  let oldFocusPosition;
  for (let i = 0; i < oldEditorBlocks.length; i++) {
    if (oldEditorBlocks[i].getKey() === oldAnchorKey) {
      oldAnchorPosition = i;
    }
    if (oldEditorBlocks[i].getKey() === oldFocusKey) {
      oldFocusPosition = i;
    }
  }
  const newEditorBlocks = newEditorState.getCurrentContent().getBlocksAsArray();

  // Ensure that indices and offsets don't go beyond the new upper bounds
  const lastBlockPosition = newEditorBlocks.length - 1;
  const adjustedAnchorPosition = Math.min(oldAnchorPosition, lastBlockPosition);
  const adjustedFocusPosition = Math.min(oldFocusPosition, lastBlockPosition);
  const adjustedAnchorOffset = Math.min(
    oldEditorSelection.getAnchorOffset(),
    newEditorBlocks[adjustedAnchorPosition].getLength()
  );
  const adjustedFocusOffset = Math.min(
    oldEditorSelection.getFocusOffset(),
    newEditorBlocks[adjustedFocusPosition].getLength()
  );

  return newEditorState.getSelection().merge({
    anchorKey: newEditorBlocks[adjustedAnchorPosition].getKey(),
    anchorOffset: adjustedAnchorOffset,
    focusKey: newEditorBlocks[adjustedFocusPosition].getKey(),
    focusOffset: adjustedFocusOffset,
    isBackward: oldEditorSelection.getIsBackward(),
    hasFocus: oldEditorSelection.getHasFocus(),
  });
}
