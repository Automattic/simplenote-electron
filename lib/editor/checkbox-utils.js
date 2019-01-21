import { Modifier } from 'draft-js';
import { get, includes } from 'lodash';

import { getCurrentBlock } from './utils';
import { taskRegex } from '../note-detail/toggle-task/constants';

const getBlockText = (editorState, key) =>
  get(editorState.getCurrentContent().getBlockForKey(key), 'text', null);

/**
 * Determine whether there is a checkbox remnant that should be removed.
 *
 * @returns {bool}
 */
export const shouldRemoveCheckbox = (editorState, prevEditorState) => {
  const currentBlock = getCurrentBlock(editorState);
  const currentBlockText = currentBlock.text;
  const prevBlockText = getBlockText(prevEditorState, currentBlock.getKey());
  const contentHasChanged = currentBlockText !== prevBlockText;

  if (!contentHasChanged || currentBlockText === '') {
    return false;
  }

  const backspaced = includes(
    ['backspace-character', 'remove-range'],
    editorState.getLastChangeType()
  );
  const ceasedToBeTask =
    taskRegex.test(prevBlockText) && !currentBlockText.match(taskRegex);

  return backspaced && ceasedToBeTask;
};

/**
 * Remove the checkbox remnant.
 *
 * @returns {ContentState} A new ContentState with the checkbox removed.
 */
export const removeCheckbox = (editorState, prevEditorState) => {
  const currentBlock = getCurrentBlock(editorState);
  const currentBlockText = currentBlock.text;
  const prevBlockText = getBlockText(prevEditorState, currentBlock.getKey());

  const focusOffset = editorState.getSelection().focusOffset;
  const lastRemovedChar = prevBlockText[focusOffset];

  // This condition is for users who don't put a space between the checkbox
  // and the task text. Removing the final meaningful char (like the 't' in '- []t')
  // should simply insert a space to preserve the checkbox, rather than
  // removing the checkbox in one stroke.
  if (!/[ \]]/.test(lastRemovedChar)) {
    return Modifier.insertText(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      ' '
    );
  }

  const firstHyphenOffset = get(currentBlockText.match('-'), 'index', 0);
  return Modifier.removeRange(
    editorState.getCurrentContent(),
    editorState.getSelection().merge({
      anchorOffset: firstHyphenOffset,
    }),
    'backward'
  );
};
