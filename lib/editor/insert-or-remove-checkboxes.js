import { EditorState, Modifier, SelectionState } from 'draft-js';
import { get } from 'lodash';

import { taskRegex } from '../note-detail/toggle-task/constants';

/**
 * Insert/remove checkbox on current line(s)
 *
 * @param {EditorState} editorState - The current editor state.
 * @returns {EditorState} The new editor state.
 */
export default function insertOrRemoveCheckboxes(editorState) {
  const contentState = editorState.getCurrentContent();
  const selection = editorState.getSelection();
  let blockKey = selection.getStartKey();
  const endBlockKey = selection.getEndKey();
  let newContentState = contentState;

  while (blockKey) {
    newContentState = insertOrRemoveForBlock(blockKey, newContentState);

    if (blockKey === endBlockKey) {
      break;
    }

    blockKey = contentState.getKeyAfter(blockKey);
  }

  return EditorState.push(editorState, newContentState, 'insert-characters');
}

/**
 * Insert/remove checkbox in a given ContentBlock
 *
 * @param {string} blockKey - The key of the target ContentBlock.
 * @param {ContentState} contentState - The current content state.
 *
 * @returns {ContentState} The new content state.
 */
export function insertOrRemoveForBlock(blockKey, contentState) {
  const text = contentState.getBlockForKey(blockKey).getText();
  taskRegex.lastIndex = 0; // Reset the search
  const matches = taskRegex.exec(text);
  let newContentState;

  if (matches) {
    // Remove task prefix
    const leadingWhitespace = get(matches, '1', '');
    const taskPrefix = matches[2];
    const spacesToTrim = matches[3].match(/^\s*/)[0].length;
    const anchorOffset = leadingWhitespace.length;
    const rangeToRemove = SelectionState.createEmpty(blockKey).merge({
      anchorOffset,
      focusOffset: anchorOffset + taskPrefix.length + spacesToTrim,
    });
    newContentState = Modifier.removeRange(
      contentState,
      rangeToRemove,
      'backward'
    );
  } else {
    // Insert task prefix (preserving leading whitespace)
    const leadingWhitespaceLength = text.match(/^\s*/)[0].length;
    const targetRange = SelectionState.createEmpty(blockKey).merge({
      anchorOffset: leadingWhitespaceLength,
      focusOffset: leadingWhitespaceLength,
    });
    newContentState = Modifier.insertText(contentState, targetRange, '- [ ] ');
  }

  return newContentState;
}
