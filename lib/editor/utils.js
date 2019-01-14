export function plainTextContent(editorState) {
  return editorState.getCurrentContent().getPlainText('\n');
}

export function getCurrentBlock(editorState) {
  const key = editorState.getSelection().getFocusKey();
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
