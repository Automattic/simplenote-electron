import SimpleDecorator from 'draft-js-simpledecorator';
import { get } from 'lodash';

import Checkbox from '../components/checkbox';
import { taskRegex } from '../note-detail/toggle-task/constants';

function strategy(contentBlock, callback) {
  const text = contentBlock.getText();

  let match;
  while ((match = taskRegex.exec(text)) !== null) {
    const leadingWhitespace = match[1];
    const taskPrefix = match[2];
    const start = match.index + get(leadingWhitespace, 'length', 0);
    const end = start + taskPrefix.length;
    callback(start, end, { checked: true, onChange: console.log });
  }
}

const checkboxDecorator = new SimpleDecorator(strategy, Checkbox);

export default checkboxDecorator;
