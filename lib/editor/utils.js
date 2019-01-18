export function plainTextContent(editorState) {
  return editorState.getCurrentContent().getPlainText('\n');
}

export function getCurrentBlock(editorState) {
  const key = editorState.getSelection().getFocusKey();
  return editorState.getCurrentContent().getBlockForKey(key);
}
