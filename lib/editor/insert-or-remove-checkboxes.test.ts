import { ContentState, EditorState, Modifier, SelectionState } from 'draft-js';
import { plainTextContent } from './utils';
import insertOrRemoveCheckboxes, {
  adjustSelectionState,
  insertOrRemoveForBlock,
} from './insert-or-remove-checkboxes';

describe('insertOrRemoveCheckboxes', () => {
  it('should insert a checkbox to the current block', () => {
    const contentState = ContentState.createFromText('foo');
    const editorState = EditorState.createWithContent(contentState);
    const result = insertOrRemoveCheckboxes(editorState);
    expect(plainTextContent(result)).toBe('- [ ] foo');
  });

  it('should work with multiple lines selected', () => {
    const contentState = ContentState.createFromText('foo\n- [ ] bar');
    const editorState = EditorState.createWithContent(contentState);
    const anchorKey = contentState.getFirstBlock().key;
    const bothLinesSelected = EditorState.acceptSelection(
      editorState,
      editorState.getSelection().merge({
        anchorKey,
        focusKey: contentState.getBlockAfter(anchorKey),
      })
    );
    const result = insertOrRemoveCheckboxes(bothLinesSelected);
    expect(plainTextContent(result)).toBe('- [ ] foo\nbar');
  });
});

describe('insertOrRemoveForBlock', () => {
  const argsFromText = string => {
    const contentState = ContentState.createFromText(string);
    const blockKey = contentState.getFirstBlock().key;
    return [blockKey, contentState];
  };

  describe('insert', () => {
    it('should insert a task prefix to a non-task block', () => {
      const result = insertOrRemoveForBlock(...argsFromText('foo'));
      expect(result.getPlainText()).toBe('- [ ] foo');
    });

    it('should preserve the leading whitespace', () => {
      const tab = insertOrRemoveForBlock(...argsFromText('\tfoo'));
      expect(tab.getPlainText()).toBe('\t- [ ] foo');
      const spaces = insertOrRemoveForBlock(...argsFromText('  foo'));
      expect(spaces.getPlainText()).toBe('  - [ ] foo');
    });
  });

  describe('remove', () => {
    it('should remove the task prefix from an unchecked task block', () => {
      const unchecked = insertOrRemoveForBlock(...argsFromText('- [ ] foo'));
      expect(unchecked.getPlainText()).toBe('foo');
    });

    it('should remove the task prefix from an checked task block', () => {
      const checked = insertOrRemoveForBlock(...argsFromText('- [x] foo'));
      expect(checked.getPlainText()).toBe('foo');
    });

    it('should preserve the leading whitespace', () => {
      const result = insertOrRemoveForBlock(...argsFromText('  - [ ] foo'));
      expect(result.getPlainText()).toBe('  foo');
    });

    it('should work with no space before the task text', () => {
      const result = insertOrRemoveForBlock(...argsFromText('- [ ]foo'));
      expect(result.getPlainText()).toBe('foo');
    });

    it('should keep working with multiple calls', () => {
      const args = argsFromText('- [ ] foo');
      insertOrRemoveForBlock(...args);
      const secondResult = insertOrRemoveForBlock(...args);
      expect(secondResult.getPlainText()).toBe('foo');
    });
  });

  describe('adjustSelectionState', () => {
    const taskPrefix = '- [ ] ';
    const differenceLength = taskPrefix.length;

    const initialSelection = (blockKey, offset) =>
      SelectionState.createEmpty(blockKey).merge({
        anchorOffset: offset,
        focusOffset: offset,
      });

    it('should compensate for inserted text', () => {
      const contentState = ContentState.createFromText('foo');
      const blockKey = contentState.getFirstBlock().key;
      const initialOffset = 1;
      const selectionState = initialSelection(blockKey, initialOffset);
      const newContentState = Modifier.insertText(
        contentState,
        SelectionState.createEmpty(blockKey),
        taskPrefix
      );
      const result = adjustSelectionState(
        selectionState,
        contentState,
        newContentState
      );
      expect(result.anchorOffset).toBe(initialOffset + differenceLength);
      expect(result.focusOffset).toBe(initialOffset + differenceLength);
      expect(result.anchorKey).toBe(blockKey);
      expect(result.focusKey).toBe(blockKey);
    });

    it('should compensate for removed text', () => {
      const contentState = ContentState.createFromText('- [ ] foo');
      const blockKey = contentState.getFirstBlock().key;
      const initialOffset = 7;
      const selectionState = initialSelection(blockKey, initialOffset);
      const newContentState = Modifier.removeRange(
        contentState,
        SelectionState.createEmpty(blockKey).merge({
          focusOffset: differenceLength,
        }),
        'forward'
      );
      const result = adjustSelectionState(
        selectionState,
        contentState,
        newContentState
      );
      expect(result.anchorOffset).toBe(initialOffset - differenceLength);
      expect(result.focusOffset).toBe(initialOffset - differenceLength);
      expect(result.anchorKey).toBe(blockKey);
      expect(result.focusKey).toBe(blockKey);
    });
  });
});
