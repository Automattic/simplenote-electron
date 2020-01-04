import TurndownService from 'turndown';
import { identity, startsWith } from 'lodash';

const mediaPlaceholderFor = node => {
  const alt = node.getAttribute('alt');
  const type = node.getAttribute('type') || 'media';
  return alt ? `${alt} (${type})` : `(${type})`;
};

const enmlToMarkdown = enml => {
  // Do not escape Markdown characters
  // https://github.com/domchristie/turndown#escaping-markdown-characters
  TurndownService.prototype.escape = identity;

  const turndownService = new TurndownService({
    blankReplacement: (content, node) => {
      if (node.nodeName === 'EN-MEDIA') {
        return mediaPlaceholderFor(node);
      }

      const imageLinks = Array.from(node.querySelectorAll('a'));
      if (imageLinks.length) {
        return imageLinks.map(() => content).join(' ');
      }

      return Array.from(node.querySelectorAll('en-media'))
        .map(mediaPlaceholderFor)
        .join(' ');
    },
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    headingStyle: 'atx',
  });

  turndownService
    .addRule('lineBreaks', {
      filter: 'br',
      replacement: () => '\n',
    })
    .addRule('divs', {
      filter: 'div',
      replacement: (content, node) => {
        // Trim obligatory divs inside line items
        if (node.parentNode.nodeName === 'LI') {
          return content;
        }

        // Code blocks
        if (/-en-codeblock:true/.test(node.getAttribute('style'))) {
          return '```\n' + content + '```\n';
        }

        return content + '\n';
      },
    })
    .addRule('links', {
      filter: 'a',
      replacement: (content, node) => {
        const href = node.getAttribute('href');
        if (!href || content === href) {
          return content;
        }
        return `[${content}](${href})`;
      },
    })
    .addRule('svgImages', {
      filter: node =>
        node.nodeName === 'IMG' &&
        startsWith(node.getAttribute('src'), 'data:image/svg'),
      replacement: (content, node) => {
        node.setAttribute('type', 'image/svg');
        return mediaPlaceholderFor(node);
      },
    })
    .addRule('lineItems', {
      // Taken and modified from Turndown source to override extra spaces
      // https://github.com/domchristie/turndown/issues/161
      filter: 'li',
      replacement: (content, node, options) => {
        content = content
          .replace(/^\n+/, '') // remove leading newlines
          .replace(/\n+$/, '\n') // replace trailing newlines with just a single one
          .replace(/\n/gm, '\n    '); // indent
        let prefix = options.bulletListMarker + ' ';
        const parent = node.parentNode;
        if (parent.nodeName === 'OL') {
          const start = parent.getAttribute('start');
          const index = Array.prototype.indexOf.call(parent.children, node);
          prefix = (start ? Number(start) + index : index + 1) + '. ';
        }
        return (
          prefix +
          content +
          (node.nextSibling && !/\n$/.test(content) ? '\n' : '')
        );
      },
    })
    .addRule('mediaItems', {
      filter: 'en-media',
      replacement: (content, node) => mediaPlaceholderFor(node),
    })
    .addRule('tasklistItems', {
      filter: 'en-todo',
      replacement: (content, node) => {
        const check = node.getAttribute('checked') === 'true' ? 'x' : ' ';
        const item = `- [${check}] ${content}`;
        return item.trim();
      },
    });

  return turndownService.turndown(enml);
};

export default enmlToMarkdown;
