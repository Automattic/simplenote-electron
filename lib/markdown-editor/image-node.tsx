import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import React from 'react';

import { normalizeSafeImageSrc } from '../utils/url-safety';
import {
  escapeImageAltText,
  escapeImageSrc,
  escapeImageTitleText,
} from './image-markdown';

export type SerializedImageNode = Spread<
  {
    altText: string;
    src: string;
    titleText?: string;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<React.JSX.Element> {
  __src: string;
  __altText: string;
  __titleText: string;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__titleText,
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode({
      altText: serializedNode.altText,
      src: serializedNode.src,
      titleText: serializedNode.titleText ?? '',
    });
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: (domNode): DOMConversionOutput | null => {
          const img = domNode as HTMLImageElement;
          const src = img.getAttribute('src');
          if (!src) {
            return null;
          }
          return {
            node: $createImageNode({
              altText: img.getAttribute('alt') ?? '',
              src,
              titleText: img.getAttribute('title') ?? '',
            }),
          };
        },
        priority: 0,
      }),
    };
  }

  constructor(src: string, altText: string, titleText = '', key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__titleText = titleText;
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.__altText,
      src: this.__src,
      ...(this.__titleText ? { titleText: this.__titleText } : {}),
      type: 'image',
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const safeSrc = normalizeSafeImageSrc(this.__src);
    if (!safeSrc) {
      return { element: document.createTextNode(this.getMarkdownSyntax()) };
    }

    const img = document.createElement('img');
    img.setAttribute('src', safeSrc);
    img.setAttribute('alt', this.__altText);
    if (this.__titleText) {
      img.setAttribute('title', this.__titleText);
    }
    return { element: img };
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'lexical-md-editor__image-wrapper';
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  getTitleText(): string {
    return this.__titleText;
  }

  getMarkdownSyntax(): string {
    const src = escapeImageSrc(this.__src);
    const title = this.__titleText
      ? ` "${escapeImageTitleText(this.__titleText)}"`
      : '';
    return `![${escapeImageAltText(this.__altText)}](${src}${title})`;
  }

  decorate(): React.JSX.Element {
    const safeSrc = normalizeSafeImageSrc(this.__src);
    if (!safeSrc) {
      return (
        <span className="lexical-md-editor__image-fallback">
          {this.getMarkdownSyntax()}
        </span>
      );
    }

    return (
      <img
        alt={this.__altText}
        className="lexical-md-editor__image"
        src={safeSrc}
        title={this.__titleText || undefined}
      />
    );
  }
}

export function $createImageNode({
  altText,
  src,
  titleText,
}: {
  altText: string;
  src: string;
  titleText?: string;
}): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText, titleText));
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode;
}
