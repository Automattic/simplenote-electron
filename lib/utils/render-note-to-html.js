import { sanitizeHtml } from './sanitize-html';

const enableCheckboxes = {
  type: 'output',
  regex: '<input type="checkbox" disabled',
  replace: '<input type="checkbox" ',
};

export const renderNoteToHtml = content => {
  return import(/* webpackChunkName: 'showdown' */ 'showdown').then(
    ({ default: showdown }) => {
      showdown.extension('enableCheckboxes', enableCheckboxes);
      const markdownConverter = new showdown.Converter({
        extensions: ['enableCheckboxes'],
      });
      markdownConverter.setFlavor('github');
      markdownConverter.setOption('simpleLineBreaks', false); // override GFM
      markdownConverter.setOption('ghMentions', false);

      return sanitizeHtml(markdownConverter.makeHtml(content));
    }
  );
};
