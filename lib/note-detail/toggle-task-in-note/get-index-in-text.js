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

export const getIndexInText = ({ text, taskNodeIndex }) => {
  const { text: idedText, ids } = uniquelyIdTasks(text);

  return renderNoteToHtml(idedText).then(html => {
    const taskId = getIdOfTaskWithIndex({ html, taskNodeIndex });
    return ids.indexOf(taskId); // index in text
  });
};

export default getIndexInText;
