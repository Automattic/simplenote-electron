import { ContentState, EditorState, SelectionState } from 'draft-js';
import { getEquivalentSelectionState, getSelectedText } from './utils';

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

describe('getEquivalentSelectionState', () => {
  const createEditorState = text =>
    EditorState.createWithContent(ContentState.createFromText(text));

  it('should preserve the offsets of the old state', () => {
    let oldEditorState = createEditorState('foo');
    const newEditorState = createEditorState('foo');
    const anchorOffset = 0;
    const focusOffset = 3;
    oldEditorState = EditorState.forceSelection(
      oldEditorState,
      oldEditorState.getSelection().merge({ anchorOffset, focusOffset })
    );

    const result = getEquivalentSelectionState(oldEditorState, newEditorState);
    expect(result.anchorOffset).toBe(anchorOffset);
    expect(result.focusOffset).toBe(focusOffset);
  });

  it('should preserve the hasFocus and isBackward of the old state', () => {
    let oldEditorState = createEditorState('foo');
    const newEditorState = createEditorState('foo');
    const hasFocus = true;
    const isBackward = true;
    oldEditorState = EditorState.forceSelection(
      oldEditorState,
      oldEditorState.getSelection().merge({ hasFocus, isBackward })
    );

    const result = getEquivalentSelectionState(oldEditorState, newEditorState);
    expect(result.hasFocus).toBe(hasFocus);
    expect(result.isBackward).toBe(isBackward);
  });

  it('should have an anchor & focus key that corresponds to their indices in the old state', () => {
    let oldEditorState = createEditorState('foo\nbar\nbaz');
    const newEditorState = createEditorState('foo\nbar\nbaz');
    const anchorBlockIndex = 1;
    const focusBlockIndex = 2;
    const oldBlocks = oldEditorState.getCurrentContent().getBlocksAsArray();
    oldEditorState = EditorState.forceSelection(
      oldEditorState,
      oldEditorState.getSelection().merge({
        anchorKey: oldBlocks[anchorBlockIndex].key,
        focusKey: oldBlocks[focusBlockIndex].key,
      })
    );

    const result = getEquivalentSelectionState(oldEditorState, newEditorState);
    const newBlocks = newEditorState.getCurrentContent().getBlocksAsArray();
    expect(result.anchorKey).toBe(newBlocks[anchorBlockIndex].key);
    expect(result.focusKey).toBe(newBlocks[focusBlockIndex].key);
  });

  it('should not go out of bounds if the offsets are invalid in the new state', () => {
    let oldEditorState = createEditorState('foo');
    const newEditorState = createEditorState('f');
    const anchorOffset = 3;
    const focusOffset = 3;
    oldEditorState = EditorState.forceSelection(
      oldEditorState,
      oldEditorState.getSelection().merge({ anchorOffset, focusOffset })
    );

    const result = getEquivalentSelectionState(oldEditorState, newEditorState);
    expect(result.anchorOffset).toBe(1);
    expect(result.focusOffset).toBe(1);
  });

  it('should not go out of bounds if the block indices are invalid in the new state', () => {
    let oldEditorState = createEditorState('foo\nbar');
    const newEditorState = createEditorState('foo');
    const anchorBlockIndex = 1;
    const focusBlockIndex = 1;
    const oldBlocks = oldEditorState.getCurrentContent().getBlocksAsArray();
    oldEditorState = EditorState.forceSelection(
      oldEditorState,
      oldEditorState.getSelection().merge({
        anchorKey: oldBlocks[anchorBlockIndex].key,
        focusKey: oldBlocks[focusBlockIndex].key,
      })
    );

    const result = getEquivalentSelectionState(oldEditorState, newEditorState);
    const newBlocks = newEditorState.getCurrentContent().getBlocksAsArray();
    expect(result.anchorKey).toBe(newBlocks[0].key);
    expect(result.focusKey).toBe(newBlocks[0].key);
  });
});
