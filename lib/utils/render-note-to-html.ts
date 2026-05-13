import { sanitizeHtml } from './sanitize-html';

type Showdown = typeof import('showdown');

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

let showdownModule: Showdown | null = null;
let showdownPromise: Promise<Showdown> | null = null;

const loadShowdown = () => {
  if (showdownModule) {
    return Promise.resolve(showdownModule);
  }

  if (!showdownPromise) {
    showdownPromise = import(
      /* webpackChunkName: 'showdown' */ 'showdown'
    ).then((module) => {
      const showdown = ((module as any).default ?? module) as Showdown;

      showdown.extension('enableCheckboxes', enableCheckboxes);
      showdown.extension('removeLineBreaks', removeLineBreaks);
      showdownModule = showdown;

      return showdown;
    });
  }

  return showdownPromise;
};

const makeMarkdownConverter = (showdown: Showdown) => {
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

  return markdownConverter;
};

const normalizeMarkdownBullets = (content: string) =>
  content.replace(/([ \t\u2000-\u200a]*)\u2022(\s)/gm, '$1-$2');

const renderWithShowdown = (showdown: Showdown, content: string) => {
  const markdownConverter = makeMarkdownConverter(showdown);
  const transformedContent = normalizeMarkdownBullets(content);

  return sanitizeHtml(markdownConverter.makeHtml(transformedContent));
};

export const warmMarkdownRenderer = () => loadShowdown().then(() => undefined);

export const renderNoteToHtmlIfReady = (content: string): string | null => {
  if (!showdownModule) {
    return null;
  }

  return renderWithShowdown(showdownModule, content);
};

export const renderNoteToHtml = (content: string) => {
  return loadShowdown().then((showdown) =>
    renderWithShowdown(showdown, content)
  );
};
