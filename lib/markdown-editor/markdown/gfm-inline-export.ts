import { $isLinkNode } from '@lexical/link';
import { $isListNode } from '@lexical/list';
import {
  $getNodeByKey,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
  type PointType,
  type TextNode,
} from 'lexical';

import { $isImageNode } from '../nodes/image-node';
import { GFM_HARD_LINE_BREAK } from './block-gaps';

export type InlineMarkdownExportOptions = {
  reimportLineBreaks?: boolean;
};

function exportLineBreakForInlineExport(reimportLineBreaks: boolean): string {
  return reimportLineBreaks ? '\n' : GFM_HARD_LINE_BREAK;
}

function applyInlineFormats(text: string, node: TextNode): string {
  if (node.hasFormat('code')) {
    text = `\`${text}\``;
  }
  if (node.hasFormat('bold')) {
    text = `**${text}**`;
  }
  if (node.hasFormat('italic')) {
    text = `*${text}*`;
  }
  if (node.hasFormat('strikethrough')) {
    text = `~~${text}~~`;
  }
  return text;
}

function exportTextNodeInline(node: TextNode): string {
  return applyInlineFormats(node.getTextContent(), node);
}

function exportTextNodeInlinePrefix(node: TextNode, endOffset: number): string {
  if (endOffset >= node.getTextContentSize()) {
    return exportTextNodeInline(node);
  }

  return applyInlineFormats(node.getTextContent().slice(0, endOffset), node);
}

function nodeContainsPoint(node: LexicalNode, point: PointType): boolean {
  if (point.key === node.getKey()) {
    return true;
  }

  const pointNode = $getNodeByKey(point.key);
  if (pointNode === null) {
    return false;
  }

  return node.isParentOf(pointNode);
}

function exportInlineChildren(
  node: ElementNode,
  options: InlineMarkdownExportOptions | undefined,
  point: PointType | null,
  stopAtPoint: boolean
): string {
  const lineBreak = exportLineBreakForInlineExport(
    options?.reimportLineBreaks ?? false
  );

  const chunks: string[] = [];
  for (const child of node.getChildren()) {
    if ($isListNode(child)) {
      continue;
    }

    if (stopAtPoint && point !== null) {
      if (nodeContainsPoint(child, point)) {
        if ($isParagraphNode(child) || $isElementNode(child)) {
          chunks.push(exportInlineChildren(child, options, point, true));
        } else if ($isTextNode(child) && point.type === 'text') {
          chunks.push(exportTextNodeInlinePrefix(child, point.offset));
        } else if ($isLineBreakNode(child)) {
          chunks.push(lineBreak);
        } else if ($isLinkNode(child)) {
          chunks.push(`[${child.getTextContent()}](${child.getURL()})`);
        } else if ($isImageNode(child)) {
          chunks.push(child.getMarkdownSyntax());
        }
        return chunks.join('');
      }

      const pointNode = $getNodeByKey(point.key);
      if (pointNode !== null && !child.isParentOf(pointNode)) {
        const childIndex = node.getChildren().indexOf(child);
        const pointParent = pointNode.getParent();
        if (pointParent !== null) {
          const pointContainerIndex = node.getChildren().indexOf(pointParent);
          if (pointContainerIndex >= 0 && childIndex > pointContainerIndex) {
            return chunks.join('');
          }
        }
      }
    }

    if ($isParagraphNode(child)) {
      chunks.push(exportInlineChildren(child, options, point, stopAtPoint));
      continue;
    }
    if ($isLinkNode(child)) {
      chunks.push(`[${child.getTextContent()}](${child.getURL()})`);
      continue;
    }
    if ($isImageNode(child)) {
      chunks.push(child.getMarkdownSyntax());
      continue;
    }
    if ($isLineBreakNode(child)) {
      chunks.push(lineBreak);
      continue;
    }
    if ($isTextNode(child)) {
      chunks.push(exportTextNodeInline(child));
      continue;
    }
    if ($isElementNode(child)) {
      chunks.push(exportInlineChildren(child, options, point, stopAtPoint));
    }
  }

  return chunks.join('');
}

export function $exportElementInlineMarkdown(
  node: ElementNode,
  options?: InlineMarkdownExportOptions
): string {
  if ($isListNode(node)) {
    return '';
  }

  return exportInlineChildren(node, options, null, false);
}

export function $exportElementInlineMarkdownPrefix(
  node: ElementNode,
  point: PointType,
  options?: InlineMarkdownExportOptions
): string {
  if ($isListNode(node)) {
    return '';
  }

  return exportInlineChildren(node, options, point, true);
}
