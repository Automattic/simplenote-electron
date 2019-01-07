import getIndexInText from './get-index-in-text';
import { selectors, taskRegex } from './constants';

export const toggleInLine = line => {
  const uncheckedRegex = /- \[\s?\]/;
  const checkedRegex = /- \[[xX]\]/;

  return checkedRegex.test(line)
    ? line.replace(checkedRegex, '- [ ]')
    : line.replace(uncheckedRegex, '- [x]');
};

export const toggleInText = ({ text, index: targetIndex }) => {
  let matchIndex = 0;

  return text.replace(taskRegex, match => {
    if (matchIndex++ === targetIndex) {
      return toggleInLine(match);
    }
    return match;
  });
};

/**
 * Returns the Markdown text with the task item toggled.
 *
 * @param {Object} arg
 * @param {HTMLElement} arg.taskNode - The task node that should be toggled.
 * @param {Object} arg.text - The Markdown source text.
 *
 * @return {Promise<string>} The resulting text with the task toggled.
 */
export const toggleTask = ({ taskNode, text }) => {
  const allTaskNodes = taskNode.ownerDocument.querySelectorAll(
    `${selectors.markdownRoot} ${selectors.taskNode}`
  );
  const countsDoNotMatch = text.match(taskRegex).length !== allTaskNodes.length;
  const taskNodeIndex = Array.from(allTaskNodes).indexOf(taskNode);

  // When the regex match count and the rendered task node count do not match,
  // it means that there is task-like syntax that is not being rendered, like
  // within a code block. In this case, we need to take extra steps to determine
  // the corresponding regex match index.
  if (countsDoNotMatch) {
    return getIndexInText({
      text,
      taskNodeIndex,
    }).then(indexInText =>
      toggleInText({
        text,
        index: indexInText,
      })
    );
  }

  return Promise.resolve(
    toggleInText({
      text,
      index: taskNodeIndex,
    })
  );
};

export default toggleTask;
