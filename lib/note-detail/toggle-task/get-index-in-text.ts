import cryptoRandomString from '../../utils/crypto-random-string';
import { renderNoteToHtml } from '../../utils/render-note-to-html';
import { selectors, taskRegex } from './constants';

const uniquelyIdTasks = text => {
  const textWithIds = {
    text: '',
    ids: [],
  };

  textWithIds.text = text.replace(taskRegex, match => {
    const id = cryptoRandomString(8);
    textWithIds.ids.push(id);

    // $1 is the leading whitespace
    return match.replace(taskRegex, '$1' + `- [ ] ${id}`);
  });

  return textWithIds;
};

const getIdOfTaskWithIndex = ({ html, taskNodeIndex }) => {
  const allTaskNodes = new DOMParser()
    .parseFromString(html, 'text/html')
    .querySelectorAll(selectors.taskNode);
  return Array.from(allTaskNodes)[taskNodeIndex].textContent.trim();
};

/**
 * Finds the index of the task-like item in Markdown text that corresponds to
 * the n-th rendered task node.
 *
 * The problem with a naive regex is that it will also match task-like syntax
 * which actually won't be rendered as tasks in HTML (e.g. inside code fences).
 * This function should be used to accurately determine the index of the naive
 * regex matches that corresponds to the index of the actual rendered task node.
 *
 * @param {Object} arg
 * @param {string} arg.text - The Markdown source text.
 * @param {number} arg.taskNodeIndex - The index of the rendered task node.
 *
 * @return {Promise<number>} Index of the corresponding task-like item in the source text.
 */
export const getIndexInText = ({ text, taskNodeIndex }) => {
  const { text: identifiedText, ids } = uniquelyIdTasks(text);

  return renderNoteToHtml(identifiedText).then(html => {
    const taskId = getIdOfTaskWithIndex({ html, taskNodeIndex });
    return ids.indexOf(taskId); // index in text
  });
};

export default getIndexInText;
