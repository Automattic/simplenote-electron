import { renderNoteToHtml } from '../utils/render-note-to-html';

export const renderToNode = (node, content) => {
  node.innerHTML = renderNoteToHtml(content);

  const codeElements = node.querySelectorAll('pre code');

  // Only load syntax highlighter if code blocks exist
  if (codeElements.length) {
    import(/* webpackChunkName: 'highlight' */ 'highlight.js')
      .then(({ default: highlight }) => {
        codeElements.forEach(highlight.highlightBlock);
      })
      .catch(console.log);
  }
};

export default renderToNode;
