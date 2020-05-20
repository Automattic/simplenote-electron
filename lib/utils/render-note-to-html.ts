import { sanitizeHtml } from './sanitize-html';

const enableCheckboxes = {
  type: 'output',
  regex: '<input type="checkbox" disabled',
  replace: '<input type="checkbox" ',
};

export const renderNoteToHtml = (content: string) => {
  return import(/* webpackChunkName: 'showdown' */ 'showdown').then(
    ({ default: showdown }) => {
      showdown.extension('enableCheckboxes', enableCheckboxes);
      const markdownConverter = new showdown.Converter({
        extensions: ['enableCheckboxes'],
      });
      markdownConverter.setFlavor('github');
      markdownConverter.setOption('simpleLineBreaks', false); // override GFM
      markdownConverter.setOption('ghMentions', false);
      markdownConverter.setOption('smoothLivePreview', true);

      const transformedContent = content.replace(
        /([ \t\u2000-\u200a]*)\u2022(\s)/gm,
        '$1-$2'
      ); // normalized bullets

      return sanitizeHtml(markdownConverter.makeHtml(transformedContent));
    }
  );
};
