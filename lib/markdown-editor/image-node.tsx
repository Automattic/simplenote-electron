import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
  $getSelection,
  $isNodeSelection,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import React, { useEffect, useState } from 'react';

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

function EditorImage({
  alt,
  className,
  src,
  title,
}: {
  alt: string;
  className?: string;
  src: string;
  title?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    const label = alt.trim() || 'Image could not be loaded';

    return (
      <span
        aria-label={label}
        className="lexical-md-editor__image-broken"
        role="img"
      >
        {label}
      </span>
    );
  }

  return (
    <img
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      src={src}
      title={title}
    />
  );
}

function ImageDecorator({
  alt,
  brokenMarkdown,
  nodeKey,
  src,
  titleText,
}: {
  alt: string;
  brokenMarkdown?: string;
  nodeKey: NodeKey;
  src?: string;
  titleText: string;
}) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    const updateSelected = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isNodeSelection(selection)) {
          setIsSelected(false);
          return;
        }

        setIsSelected(
          selection.getNodes().some((node) => node.getKey() === nodeKey)
        );
      });
    };

    updateSelected();
    return editor.registerUpdateListener(() => {
      updateSelected();
    });
  }, [editor, nodeKey]);

  const shellClassName = [
    'lexical-md-editor__image-shell',
    isSelected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (brokenMarkdown) {
    return (
      <span className={shellClassName}>
        <span className="lexical-md-editor__image-fallback">
          {brokenMarkdown}
        </span>
      </span>
    );
  }

  return (
    <span className={shellClassName}>
      <EditorImage
        alt={alt}
        className="lexical-md-editor__image"
        src={src!}
        title={titleText || undefined}
      />
    </span>
  );
}

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

  setSrc(src: string): this {
    const writable = this.getWritable();
    writable.__src = src;
    return writable;
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
        <ImageDecorator
          alt={this.__altText}
          brokenMarkdown={this.getMarkdownSyntax()}
          nodeKey={this.getKey()}
          titleText={this.__titleText}
        />
      );
    }

    return (
      <ImageDecorator
        alt={this.__altText}
        nodeKey={this.getKey()}
        src={safeSrc}
        titleText={this.__titleText}
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
