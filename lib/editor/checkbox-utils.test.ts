import { ContentState, EditorState, Modifier, SelectionState } from 'draft-js';
import { removeCheckbox, shouldRemoveCheckbox } from './checkbox-utils';

const removeChars = (editorState, { start, end, type }) => {
  const blockKey = editorState
    .getCurrentContent()
    .getFirstBlock()
    .getKey();
  const rangeToRemove = SelectionState.createEmpty(blockKey).merge({
    anchorOffset: start,
    focusOffset: end,
  });
  return EditorState.push(
    editorState,
    Modifier.removeRange(
      editorState.getCurrentContent(),
      rangeToRemove,
      'backward'
    ),
    type
  );
};

const getCurrentText = editorState =>
  editorState.getCurrentContent().getPlainText();

describe('checkbox-utils', () => {
  describe('shouldRemoveCheckbox', () => {
    it('should return false if the text content of the currently focused block has not changed', () => {
      const prevEditorState = EditorState.createWithContent(
        ContentState.createFromText('foo')
      );
      const editorState = EditorState.moveFocusToEnd(prevEditorState);
      const result = shouldRemoveCheckbox(editorState, prevEditorState);
      expect(result).toBe(false);
    });

    it('should return false if the currently focused block is empty', () => {
      const prevEditorState = EditorState.createWithContent(
        ContentState.createFromText('foo')
      );
      const editorState = EditorState.push(
        prevEditorState,
        Modifier.removeRange(
          prevEditorState.getCurrentContent(),
          prevEditorState.getSelection().merge({ focusOffset: 3 }),
          'forward'
        ),
        'remove-range'
      );
      const result = shouldRemoveCheckbox(editorState, prevEditorState);
      expect(result).toBe(false);
    });

    it('should return false if the currently focused block is still a valid tasklist item', () => {
      const prevEditorState = EditorState.createWithContent(
        ContentState.createFromText('- [ ] task')
      );
      const editorState = removeChars(prevEditorState, {
        start: 9,
        end: 10,
        type: 'remove-range',
      });
      expect(getCurrentText(editorState)).toBe('- [ ] tas');
      expect(shouldRemoveCheckbox(editorState, prevEditorState)).toBe(false);
    });

    it('should return true if a range of characters were removed and the currently focused block ceased to be a valid tasklist item', () => {
      const prevEditorState = EditorState.createWithContent(
        ContentState.createFromText('- [ ] task')
      );
      const editorState = removeChars(prevEditorState, {
        start: 5,
        end: 10,
        type: 'remove-range',
      });
      expect(getCurrentText(editorState)).toBe('- [ ]');
      expect(shouldRemoveCheckbox(editorState, prevEditorState)).toBe(true);
    });

    it('should return true if a character was backspaced and the currently focused block ceased to be a valid tasklist item', () => {
      const prevEditorState = EditorState.createWithContent(
        ContentState.createFromText('- [ ] ')
      );
      const editorState = removeChars(prevEditorState, {
        start: 5,
        end: 6,
        type: 'backspace-character',
      });
      expect(getCurrentText(editorState)).toBe('- [ ]');
      expect(shouldRemoveCheckbox(editorState, prevEditorState)).toBe(true);
    });
  });

  describe('removeCheckbox', () => {
    it('should remove the checkbox remnant in the currently focused block', () => {
      const prevEditorState = EditorState.createWithContent(
        ContentState.createFromText('- [ ] task')
      );
      const editorState = removeChars(prevEditorState, {
        start: 5,
        end: 10,
        type: 'remove-range',
      });
      expect(getCurrentText(editorState)).toBe('- [ ]');

      const resultingState = removeCheckbox(editorState, prevEditorState);
      expect(resultingState.constructor.name).toBe('ContentState');
      expect(resultingState.getPlainText()).toBe('');
    });

    it('should preserve leading whitespace', () => {
      const prevEditorState = EditorState.createWithContent(
        ContentState.createFromText('\t- [ ] task')
      );
      const editorState = removeChars(prevEditorState, {
        start: 6,
        end: 11,
        type: 'remove-range',
      });
      expect(getCurrentText(editorState)).toBe('\t- [ ]');

      const resultingState = removeCheckbox(editorState, prevEditorState);
      expect(resultingState.constructor.name).toBe('ContentState');
      expect(resultingState.getPlainText()).toBe('\t');
    });

    it('should preserve the checkbox when the user intent was probably to keep it', () => {
      const prevEditorState = EditorState.createWithContent(
        ContentState.createFromText('- [ ]task')
      );
      const editorState = removeChars(prevEditorState, {
        start: 5,
        end: 9,
        type: 'remove-range',
      });
      expect(getCurrentText(editorState)).toBe('- [ ]');

      const resultingState = removeCheckbox(editorState, prevEditorState);
      expect(resultingState.constructor.name).toBe('ContentState');
      expect(resultingState.getPlainText()).toBe('- [ ] ');
    });
  });
});
