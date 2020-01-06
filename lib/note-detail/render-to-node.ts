import { renderNoteToHtml } from '../utils/render-note-to-html';

export const renderToNode = (node, content) => {
  renderNoteToHtml(content)
    .then(html => {
      node.innerHTML = html;
      return node.querySelectorAll('pre code');
    })
    .then(codeElements => {
      // Only load syntax highlighter if code blocks exist
      if (codeElements.length) {
        return import(/* webpackChunkName: 'highlight' */ 'highlight.js')
          .then(({ default: highlight }) => {
            codeElements.forEach(highlight.highlightBlock);
          })
          .catch();
      }
    });
};

export default renderToNode;
