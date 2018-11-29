import { sanitizeHtml } from './sanitize-html';

export const renderNoteToHtml = content => {
  return import(/* webpackChunkName: 'showdown' */ 'showdown').then(
    ({ default: showdown }) => {
      const markdownConverter = new showdown.Converter();
      markdownConverter.setFlavor('github');

      return sanitizeHtml(markdownConverter.makeHtml(content));
    }
  );
};
