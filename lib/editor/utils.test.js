import { ContentState, EditorState, SelectionState } from 'draft-js';
import { getSelectedText } from './utils';

describe('getSelectedText', () => {
  const sourceText = `
# My note

- [ ] task`;
  let editorState, contentState;

  beforeEach(() => {
    editorState = EditorState.createWithContent(
      ContentState.createFromText(sourceText)
    );
    contentState = editorState.getCurrentContent();
  });

  it('should return the selected content as text', () => {
    const lastBlock = contentState.getLastBlock();
    const selectionState = SelectionState.createEmpty(
      contentState.getFirstBlock().key
    ).merge({
      focusKey: lastBlock.key,
      focusOffset: lastBlock.getText().length,
    });
    const stateWithSelection = EditorState.acceptSelection(
      editorState,
      selectionState
    );
    expect(getSelectedText(stateWithSelection)).toBe(sourceText);
  });

  it('should handle partial selection', () => {
    const lastBlock = contentState.getLastBlock();
    const firstBlock = contentState.getFirstBlock();
    const selectionState = SelectionState.createEmpty(firstBlock.key).merge({
      anchorKey: contentState.getBlockAfter(firstBlock.key).key,
      anchorOffset: 1,
      focusKey: lastBlock.key,
      focusOffset: lastBlock.getText().length - 1,
    });
    const stateWithSelection = EditorState.acceptSelection(
      editorState,
      selectionState
    );
    expect(getSelectedText(stateWithSelection)).toBe(
      sourceText.trim().slice(1, sourceText.length - 2)
    );
  });
});
