import { sanitizeHtml } from './sanitize-html';

const enableCheckboxes = {
  type: 'output',
  regex: '<input type="checkbox" disabled',
  replace: '<input type="checkbox" ',
};

const removeLineBreaks = {
  type: 'output',
  regex: '>\n',
  replace: '>',
};

const removeParagraphIndent = {
  type: 'output',
  regex: 'longtext',
  replace: 'REMOVED',
};

export const renderNoteToHtml = (content: string) => {
  return import(/* webpackChunkName: 'showdown' */ 'showdown').then(
    ({ default: showdown }) => {
      console.log(content);
      showdown.extension('enableCheckboxes', enableCheckboxes);
      showdown.extension('removeLineBreaks', removeLineBreaks);
      showdown.extension('removeParagraphIndent', removeParagraphIndent);
      const markdownConverter = new showdown.Converter({
        extensions: ['enableCheckboxes', 'removeLineBreaks'],
      });
      markdownConverter.setFlavor('github');
      markdownConverter.setOption('ghMentions', false);
      markdownConverter.setOption('literalMidWordUnderscores', true);
      markdownConverter.setOption('simpleLineBreaks', false); // override GFM
      markdownConverter.setOption('smoothLivePreview', true);
      markdownConverter.setOption('splitAdjacentBlockquotes', true);
      markdownConverter.setOption('strikethrough', true); // ~~strikethrough~~
      markdownConverter.setOption('tables', true); // table syntax

      let transformedContent = content.replace(
        /([ \t\u2000-\u200a]*)\u2022(\s)/gm,
        '$1-$2'
      ); // normalized bullets

      // remove tab indentation on paragraphs
      // TODO this is very naive and fragile and will break in a lot of cases, such as:
      // - different size indentations
      // - paragraphs that begin with a number or a list character
      // - list characters other than - and *
      transformedContent = content.replace(
        /\n {4}(([^-*\d]))/g,
        '\n&nbsp;&nbsp;&nbsp;$1'
      );

      return sanitizeHtml(markdownConverter.makeHtml(transformedContent));
    }
  );
};
