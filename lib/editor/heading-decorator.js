import SimpleDecorator from 'draft-js-simpledecorator';

import Heading from '../components/heading';

const headingRegex = /^([#]{1,6})(\s+)([^\s]+)/g;

const headingDecorator = () => {
  const strategy = (contentBlock, callback) => {
    const text = contentBlock.getText();
    let match;

    while ((match = headingRegex.exec(text)) !== null) {
      const fullText = text;
      const headingLevel = match[1].length;

      const start = match.index;
      const end = start + fullText.length;

      callback(start, end, { headingLevel, children: fullText });
    }
  };

  return new SimpleDecorator(strategy, Heading);
};

export default headingDecorator;
