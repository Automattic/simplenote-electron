import React from 'react';
import SimpleDecorator from 'draft-js-simpledecorator';

/**
 * Wrap tab characters in a span to prevent CJK-related crashes
 *
 * The sole purpose of this decorator is to prevent DraftJS from
 * crashing when dealing with CJK characters after a tab. The span somehow
 * prevents DraftJS's internal focus state from getting out of sync with the
 * visible caret. See below for steps to reproduce the original bug:
 * https://github.com/Automattic/simplenote-electron/issues/780#issuecomment-449771120
 *
 * TODO: This workaround can be removed when we update to Electron >3.0.0.
 */
const tabDecorator = () => {
  const strategy = (contentBlock, callback) => {
    const tabRegex = /\t/g;
    const text = contentBlock.getText();
    let match;

    while ((match = tabRegex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      callback(start, end);
    }
  };

  const WrappedTab = ({ children }) => <span>{children}</span>;

  return new SimpleDecorator(strategy, WrappedTab);
};

export default tabDecorator;
