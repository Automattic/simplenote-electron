import React from 'react';
import SimpleDecorator from 'draft-js-simpledecorator';

import { taskRegex } from '../note-detail/toggle-task/constants';

function strategy(contentBlock, callback) {
  const text = contentBlock.getText();

  let match;
  while ((match = taskRegex.exec(text)) !== null) {
    const leadingWhitespace = match[1];
    const taskPrefix = match[2];
    const start = match.index + get(leadingWhitespace, 'length', 0);
    const end = start + taskPrefix.length;
    callback(start, end);
  }
}

const checkboxDecorator = new SimpleDecorator(strategy, () => (
  <input type="checkbox" />
));

export default checkboxDecorator;
