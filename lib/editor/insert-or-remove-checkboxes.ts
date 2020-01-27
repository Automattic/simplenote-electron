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

  const newEditorState = EditorState.push(
    editorState,
    newContentState,
    'insert-characters'
  );
  const adjustedSelection = adjustSelectionState(
    selection,
    contentState,
    newContentState
  );

  return EditorState.forceSelection(newEditorState, adjustedSelection);
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
    const leadingWhitespace = matches[1];
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

/**
 * Adjust the caret position to compensate for the checkbox manipulation
 *
 * @param {SelectionState} selectionState - The original selection state.
 * @param {ContentState} contentState - The original content state.
 * @param {ContentState} newContentState - The content state after checkbox manipulation.
 *
 * @returns {SelectionState} The adjusted selection state.
 */
export function adjustSelectionState(
  selectionState,
  contentState,
  newContentState
) {
  // Workaround for inconsistencies in whether `focusKey` returns a string or block
  const focusBlockKey = get(
    selectionState.focusKey,
    'key',
    selectionState.focusKey
  );

  const getFocusBlockLength = content =>
    content.getBlockForKey(focusBlockKey).getText().length;
  const lengthDifference =
    getFocusBlockLength(newContentState) - getFocusBlockLength(contentState);

  const adjustedOffset = selectionState.focusOffset + lengthDifference;

  return SelectionState.createEmpty(focusBlockKey).merge({
    anchorOffset: adjustedOffset,
    focusOffset: adjustedOffset,
  });
}
