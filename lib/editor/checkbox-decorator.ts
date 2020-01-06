import { SelectionState } from 'draft-js';
import SimpleDecorator from 'draft-js-simpledecorator';
import { get } from 'lodash';

import Checkbox from '../components/checkbox';
import { toggleInLine } from '../note-detail/toggle-task';
import { taskRegex } from '../note-detail/toggle-task/constants';

const checkboxDecorator = replaceRangeWithText => {
  const strategy = (contentBlock, callback) => {
    const text = contentBlock.getText();
    let match;

    while ((match = taskRegex.exec(text)) !== null) {
      const leadingWhitespace = match[1];
      const taskPrefix = match[2];

      const start = match.index + get(leadingWhitespace, 'length', 0);
      const end = start + taskPrefix.length;

      const checked = /[xX]/.test(taskPrefix);

      const rangeToReplace = SelectionState.createEmpty(
        contentBlock.getKey()
      ).merge({
        anchorOffset: start,
        focusOffset: end,
      });

      const newText = toggleInLine(taskPrefix);

      callback(start, end, {
        checked,
        onChange: () => replaceRangeWithText(rangeToReplace, newText),
      });
    }
  };

  return new SimpleDecorator(strategy, Checkbox);
};

export default checkboxDecorator;
