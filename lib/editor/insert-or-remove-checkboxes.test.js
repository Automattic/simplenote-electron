import { ContentState, EditorState } from 'draft-js';
import { plainTextContent } from './utils';
import insertOrRemoveCheckboxes, {
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
});
