import { getTerms } from '../utils/filter-notes';
import { renderNoteToHtml } from '../utils/render-note-to-html';

const markMatches = (sourceNode: Text, terms: string[]): void => {
  const parent = sourceNode.parentNode as Node;

  terms.forEach((term) => {
    // we only want to mark TEXT_NODE matches
    // it wouldn't work well to match "pan" inside of "<span>"
    parent.childNodes.forEach((node) => {
      if (
        node.nodeType !== Node.TEXT_NODE ||
        !node.textContent?.toLocaleLowerCase().includes(term)
      ) {
        return;
      }

      // split text node into | BEFORE | MATCH | AFTER
      const start = node.textContent
        ?.toLocaleLowerCase()
        .indexOf(term) as number;

      // we have to remember the MATCH because we'll replace it
      const match = (node as Text).splitText(start);

      const after = match.splitText(term.length);

      const marked = document.createElement('span');
      marked.setAttribute('class', 'search-match');
      match.parentNode?.replaceChild(marked, match);
      marked.appendChild(match);

      markMatches(after, terms);
    });
  });
};

export const renderToNode = (
  node: Element,
  content: string,
  searchQuery: string
) =>
  renderNoteToHtml(content)
    .then((html) => {
      node.innerHTML = html;
      return node;
    })
    .then((node) => {
      if (!searchQuery) {
        return node.querySelectorAll('pre code');
      }

      const terms = getTerms(searchQuery).map((s) => s.toLocaleLowerCase());
      if (!terms.length) {
        return node.querySelectorAll('pre code');
      }

      const treeWalker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function (textNode: Text) {
            return terms.some((term) =>
              textNode.textContent?.toLocaleLowerCase().includes(term)
            )
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          },
        },
        false
      );

      const nodes: Text[] = [];
      let currentNode: Node | null = treeWalker.currentNode;

      while (currentNode) {
        nodes.push(currentNode as Text);
        currentNode = treeWalker.nextNode();
      }

      nodes.forEach((textNode) => markMatches(textNode, terms));

      return node.querySelectorAll('pre code');
    })
    .then((codeElements) => {
      // Only load syntax highlighter if code blocks exist
      if (codeElements.length) {
        return import(/* webpackChunkName: 'highlight' */ 'highlight.js')
          .then(({ default: highlight }) => {
            codeElements.forEach(highlight.highlightElement);
          })
          .catch();
      }
    });

export default renderToNode;
