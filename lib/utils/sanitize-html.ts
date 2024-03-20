// import isemail from 'isemail';
import validUrl from 'valid-url';
import { filter } from 'lodash';

/**
 * Determine if a given tag is allowed
 *
 * @param node node being examined
 * @returns whether the tag is allowed
 */
const isAllowedTag = (node: Element) => {
  const tagName = node.nodeName.toLowerCase();

  if ('input' === tagName) {
    return 'checkbox' === node.getAttribute('type');
  }

  switch (tagName) {
    case '#text':
    case 'a':
    case 'article':
    case 'b':
    case 'br':
    case 'blockquote':
    case 'cite':
    case 'code':
    case 'dd':
    case 'del':
    case 'div':
    case 'dt':
    case 'em':
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
    case 'hr':
    case 'i':
    case 'img':
    case 'ins':
    case 'kbd':
    case 'li':
    case 'ol':
    case 'p':
    case 'pre':
    case 's':
    case 'span':
    case 'strong':
    case 'sub':
    case 'sup':
    case 'table':
    case 'tbody':
    case 'td':
    case 'th':
    case 'thead':
    case 'tr':
    case 'tt':
    case 'ul':
      return true;
    default:
      return false;
  }
};

/**
 * Determine if a given attribute is allowed
 *
 * Note! Before adding more attributes here
 *       make sure that we don't open up an
 *       attribute which could allow for a
 *       snippet of code to execute, such
 *       as `onclick` or `onmouseover`
 *
 * @param tagName name of tag on which attribute is found
 * @param attrName name of attribute under inspection
 * @returns whether the attribute is allowed
 */
const isAllowedAttr = (tagName: string, attrName: string, value: string) => {
  switch (tagName) {
    case 'a':
      switch (attrName) {
        case 'href':
          // disallow any protocol except for http://, https://, and simplenote://
          return ['http', 'https', 'simplenote'].includes(
            value.toLowerCase().trim().split('://')[0]
          );
        case 'alt':
        case 'rel':
        case 'title':
          return true;
        default:
          return false;
      }

    case 'img':
      switch (attrName) {
        case 'alt':
        case 'src':
        case 'title':
        case 'width':
          return true;
        default:
          return false;
      }

    case 'input':
      switch (attrName) {
        case 'disabled':
        case 'checked':
        case 'type':
          return true;
        default:
          return false;
      }

    // allow 'task-list-item' class for List items according to GFM
    case 'li':
      switch (attrName) {
        case 'class':
          switch (value) {
            case 'task-list-item':
              return true;
            default:
              return false;
          }
        default:
          return false;
      }

    case 'ol':
      switch (attrName) {
        case 'start':
          return true;
        default:
          return false;
      }

    case 'th':
    case 'td':
      switch (attrName) {
        case 'style':
          switch (value) {
            case 'text-align:center;':
            case 'text-align:left;':
            case 'text-align:right;':
              return true;
            default:
              return false;
          }
        default:
          return false;
      }

    default:
      return false;
  }
};

/**
 * Determine if the given tag and its children
 * should be removed entirely from the DOM tree
 *
 * @param node node being examined
 * @return whether the node is forbidden
 */
const isForbidden = (node: Element) => {
  const tagName = node.nodeName.toLowerCase();

  switch (tagName) {
    case 'head':
    case 'html':
    case 'iframe':
    case 'link':
    case 'meta':
    case 'object':
    case 'script':
    case 'style':
      return true;
    default:
      return false;
  }
};

/**
 * Sanitizes input HTML for security and styling
 *
 * @param content unverified HTML
 * @returns sanitized HTML
 */
export const sanitizeHtml = (content: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');

  // this will let us visit every single DOM node programmatically
  const walker = doc.createTreeWalker(
    doc.body,
    NodeFilter.SHOW_ALL,
    null,
    false // IE11 requires this last argument
  );

  /**
   * we don't want to remove nodes while walking the tree
   * or we'll invite data-race bugs. instead, we'll track
   * which ones we want to remove then drop them at the end
   *
   * @type {Array<Node>} List of nodes to remove
   */
  const removeList = [];

  /**
   * unlike the remove list, these should be entirely
   * eliminated and none of their children should be
   * inserted into the final document
   *
   * @type {Array<Node>} List of nodes to eliminate
   */
  const forbiddenList = [];

  // walk over every DOM node
  while (walker.nextNode()) {
    const node = walker.currentNode as Element;

    if (isForbidden(node)) {
      forbiddenList.push(node);
      continue;
    }

    if (!isAllowedTag(node)) {
      removeList.push(node);
      continue;
    }

    const tagName = node.nodeName.toLowerCase();

    // strip out anything not explicitly allowed
    //
    // Node.attributes is a NamedNodeMap, not an Array
    // so it has no Array methods and the Attr nodes' indexes may differ
    //
    // Note that we must iterate twice because Node.attributes is
    // a live collection and we will introduce bugs if we remove
    // as we go on the first pass.
    //
    // @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attributes
    filter(node.attributes, ({ name, value }) => {
      if (isAllowedAttr(tagName, name, value)) {
        return false;
      }

      // only valid http(s) URLs are allowed
      if (('href' === name || 'src' === name) && validUrl.isWebUri(value)) {
        return false;
      }

      // emails must be reasonably-verifiable email addresses
      if (
        'href' === name &&
        value.startsWith('mailto:')
        // TODO FIX MISSING POLYFILL
        // && isemail.validate(value.slice(7))
      ) {
        return false;
      }

      return true;
    }).forEach(({ name }) => node.removeAttribute(name));

    // of course, all links need to be normalized since
    // they now exist inside of our new context
    const hrefAttribute = 'a' === tagName && node.getAttribute('href');
    if (
      'a' === tagName &&
      'string' === typeof hrefAttribute &&
      !hrefAttribute.startsWith('mailto:')
    ) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'external noopener noreferrer');
    }

    // add `list-style:none` for 'task-list-item's
    if ('li' === tagName && node.getAttribute('class') === 'task-list-item') {
      node.setAttribute('style', 'list-style: none;');
    }
  }

  // eliminate the forbidden tags and drop their children
  forbiddenList.forEach((node) => {
    try {
      node?.parentNode?.removeChild(node);
    } catch (e) {
      // this one could have existed
      // under a node that we already removed,
      // which would lead to a failure right now
      // this is fine, just continue along
    }
  });

  // remove the unwanted tags and transfer
  // their children up a level in their place
  removeList.forEach((node) => {
    const parent = node.parentNode;
    let child;

    try {
      while ((child = node.firstChild)) {
        parent?.insertBefore(child, node);
      }

      parent?.removeChild(node);
    } catch (e) {
      // this one could have originally existed
      // under a node that we already removed,
      // which would lead to a failure right now
      // this is fine, just continue along
    }
  });

  return doc.body.innerHTML;
};
