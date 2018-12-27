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

export const toggleTaskInNote = ({ taskNode, note }) => {
  const noteContent = note.data.content;
  const allTaskNodes = taskNode.ownerDocument.querySelectorAll(
    `${selectors.markdownRoot} ${selectors.taskNode}`
  );
  const countsDoNotMatch =
    noteContent.match(taskRegex).length !== allTaskNodes.length;
  const taskNodeIndex = Array.from(allTaskNodes).indexOf(taskNode);

  if (countsDoNotMatch) {
    return getIndexInText({
      text: noteContent,
      taskNodeIndex,
    }).then(indexInText =>
      toggleInText({
        text: noteContent,
        index: indexInText,
      })
    );
  }

  return Promise.resolve(
    toggleInText({
      text: noteContent,
      index: taskNodeIndex,
    })
  );
};

export default toggleTaskInNote;
