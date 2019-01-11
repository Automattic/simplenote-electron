import { Modifier } from 'draft-js';
import { get } from 'lodash';

import { getCurrentBlock } from './utils';
import { taskRegex } from '../note-detail/toggle-task/constants';

export const shouldRemoveCheckbox = (editorState, prevEditorState) => {
  const prevBlockText = getCurrentBlock(prevEditorState).text;
  const currentBlockText = getCurrentBlock(editorState).text;
  const backspaced = editorState.getLastChangeType() === 'backspace-character';
  const ceasedToBeTask =
    taskRegex.test(prevBlockText) && !currentBlockText.match(taskRegex);

  return backspaced && ceasedToBeTask;
};

export const removeCheckbox = (editorState, prevEditorState) => {
  const prevBlockText = getCurrentBlock(prevEditorState).text;
  const currentBlockText = getCurrentBlock(editorState).text;
  const lastChar = prevBlockText[prevBlockText.length - 1];

  if (/\S/.test(lastChar)) {
    return Modifier.insertText(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      ' '
    );
  }

  const firstHyphen = get(currentBlockText.match('-'), 'index', 0);
  return Modifier.removeRange(
    editorState.getCurrentContent(),
    editorState.getSelection().merge({
      anchorOffset: firstHyphen,
    }),
    'backward'
  );
};
