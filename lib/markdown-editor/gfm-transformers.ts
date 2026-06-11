import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleExtension,
  HorizontalRuleNode,
} from '@lexical/extension';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CODE,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  LINK,
  STRIKETHROUGH,
  type ElementTransformer,
  type MultilineElementTransformer,
  type TextFormatTransformer,
  type TextMatchTransformer,
} from '@lexical/markdown';
import {
  $createAutoLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  AutoLinkNode,
} from '@lexical/link';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import { $isCodeNode } from '@lexical/code-core';
import {
  $createTextNode,
  $findMatchingParent,
  $getState,
  $isParagraphNode,
  $isTextNode,
  $setState,
  createState,
  type LexicalNode,
} from 'lexical';

import { $createImageNode, $isImageNode, ImageNode } from './image-node';

const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/;
const TABLE_ROW_DIVIDER_REG_EXP =
  /^\|(?:\s*:?\s*-+\s*:?\s*(?:\|\s*:?\s*-+\s*:?\s*)*)\|?\s?$/;

type ColumnAlignment = 'left' | 'center' | 'right';

const tableColumnAlignmentsState = createState<
  Array<{ alignment: ColumnAlignment; explicitLeft: boolean }>
>('gfmTableColumnAlignments', {
  parse: (value) => (Array.isArray(value) ? value : []),
});

export function isTableRowDivider(text: string): boolean {
  return TABLE_ROW_DIVIDER_REG_EXP.test(text);
}

function parseDividerAlignment(cell: string): {
  alignment: ColumnAlignment;
  explicitLeft: boolean;
} {
  const trimmed = cell.trim();
  const starts = trimmed.startsWith(':');
  const ends = trimmed.endsWith(':');

  if (starts && ends) {
    return { alignment: 'center', explicitLeft: false };
  }
  if (ends) {
    return { alignment: 'right', explicitLeft: false };
  }
  if (starts) {
    return { alignment: 'left', explicitLeft: true };
  }
  return { alignment: 'left', explicitLeft: false };
}

function formatDividerCell(
  alignment: ColumnAlignment,
  explicitLeft = false
): string {
  switch (alignment) {
    case 'center':
      return ':---:';
    case 'right':
      return '---:';
    default:
      return explicitLeft ? ':---' : '---';
  }
}

function $createTableCell(textContent: string): TableCellNode {
  const normalized = textContent.replace(/\\n/g, '\n').trim();
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
  if (normalized.length > 0) {
    $convertFromMarkdownString(
      normalized,
      getTableCellInlineTransformers(),
      cell
    );
  }
  return cell;
}

function mapToTableCells(textContent: string): Array<TableCellNode> | null {
  const match = textContent.match(TABLE_ROW_REG_EXP);
  if (!match?.[1]) {
    return null;
  }

  return match[1].split('|').map((text) => $createTableCell(text));
}

function getTableColumnsSize(table: TableNode): number {
  const row = table.getFirstChild();
  return $isTableRowNode(row) ? row.getChildrenSize() : 0;
}

function getTableCellInlineTransformers(): Array<
  TextFormatTransformer | TextMatchTransformer
> {
  return [
    INLINE_CODE,
    BOLD_ITALIC_STAR,
    BOLD_ITALIC_UNDERSCORE,
    BOLD_STAR,
    BOLD_UNDERSCORE,
    ITALIC_STAR,
    ITALIC_UNDERSCORE,
    STRIKETHROUGH,
    LINK,
    IMAGE,
    AUTOLINK,
  ];
}

function applyColumnAlignmentToTable(table: TableNode): void {
  const alignments = $getState(table, tableColumnAlignmentsState) ?? [];
  if (alignments.length === 0) {
    return;
  }

  for (const row of table.getChildren()) {
    if (!$isTableRowNode(row)) {
      continue;
    }

    row.getChildren().forEach((cell, columnIndex) => {
      if (!$isTableCellNode(cell)) {
        return;
      }

      const column = alignments[columnIndex];
      if (!column) {
        return;
      }

      const shouldApply =
        column.alignment === 'center' ||
        column.alignment === 'right' ||
        (column.alignment === 'left' && column.explicitLeft);

      if (!shouldApply) {
        return;
      }

      for (const child of cell.getChildren()) {
        if ($isParagraphNode(child)) {
          child.setFormat(column.alignment);
        }
      }
    });
  }
}

function applyDividerRow(table: TableNode, dividerLine: string): void {
  const cells = dividerLine
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => /^:?-+:?$/.test(cell));

  if (cells.length === 0) {
    return;
  }

  const alignments = cells.map(parseDividerAlignment);

  $setState(table, tableColumnAlignmentsState, alignments);

  const rows = table.getChildren();
  const lastRow = rows[rows.length - 1];
  if (!$isTableRowNode(lastRow)) {
    return;
  }

  lastRow.getChildren().forEach((cell) => {
    if ($isTableCellNode(cell)) {
      cell.setHeaderStyles(
        TableCellHeaderStates.ROW,
        TableCellHeaderStates.ROW
      );
    }
  });

  applyColumnAlignmentToTable(table);
}

export const IMAGE: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (!$isImageNode(node)) {
      return null;
    }

    return `![${node.getAltText()}](${node.getSrc()})`;
  },
  importRegExp: /!\[([^[]*)\]\(([^)]+)\)/,
  regExp: /!\[([^[]*)\]\(([^)]+)\)$/,
  replace: (textNode, match) => {
    const [, altText, src] = match;
    textNode.replace(
      $createImageNode({
        altText,
        src,
      })
    );
  },
  trigger: ')',
  type: 'text-match',
};

const URL_IN_PARENS = /(?:https?:\/\/[^\s<>\[\]()]+)/;
const ANGLE_AUTOLINK = /<((?:https?:\/\/|mailto:)[^>\s]+)>/;

export const AUTOLINK: TextMatchTransformer = {
  dependencies: [AutoLinkNode],
  export: (node, exportChildren) => {
    if (!$isAutoLinkNode(node)) {
      return null;
    }

    return exportChildren(node);
  },
  importRegExp: new RegExp(
    `${ANGLE_AUTOLINK.source}|(${URL_IN_PARENS.source})`
  ),
  regExp: new RegExp(`${ANGLE_AUTOLINK.source}|(${URL_IN_PARENS.source})$`),
  replace: (textNode, match) => {
    if ($findMatchingParent(textNode, $isLinkNode)) {
      return;
    }
    if ($findMatchingParent(textNode, $isCodeNode)) {
      return;
    }
    if (textNode.hasFormat('code')) {
      return;
    }

    const matchIndex = match.index ?? 0;
    const before = textNode.getTextContent().slice(0, matchIndex);
    if ((before.match(/`/g) ?? []).length % 2 === 1) {
      return;
    }

    const url = match[1] ?? match[2];
    if (!url) {
      return;
    }

    const parent = textNode.getParent();
    if ($isParagraphNode(parent)) {
      const content = parent.getTextContent();
      const urlIndex = content.indexOf(url);
      if (
        urlIndex >= 0 &&
        (content.slice(0, urlIndex).match(/`/g) ?? []).length % 2 === 1
      ) {
        return;
      }
    }

    const linkNode = $createAutoLinkNode(url, { rel: 'noreferrer' });
    const linkText = $createTextNode(url);
    linkText.setFormat(textNode.getFormat());
    linkNode.append(linkText);
    textNode.replace(linkNode);
    return linkText;
  },
  type: 'text-match',
};

export const TABLE: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) {
      return null;
    }

    const output: string[] = [];
    const alignments = $getState(node, tableColumnAlignmentsState) ?? [];
    let headerDividerEmitted = false;

    for (const row of node.getChildren()) {
      if (!$isTableRowNode(row)) {
        continue;
      }

      const rowOutput: string[] = [];
      let isHeaderRow = false;

      for (const cell of row.getChildren()) {
        if (!$isTableCellNode(cell)) {
          continue;
        }

        rowOutput.push(
          $convertToMarkdownString(getTableCellInlineTransformers(), cell)
            .replace(/\n/g, '\\n')
            .trim()
        );

        if (cell.getHeaderStyles() === TableCellHeaderStates.ROW) {
          isHeaderRow = true;
        }
      }

      output.push(`| ${rowOutput.join(' | ')} |`);

      if (isHeaderRow && !headerDividerEmitted) {
        const dividerCells =
          alignments.length > 0
            ? alignments.map(({ alignment, explicitLeft }) =>
                formatDividerCell(alignment, explicitLeft)
              )
            : rowOutput.map(() => '---');
        output.push(`| ${dividerCells.join(' | ')} |`);
        headerDividerEmitted = true;
      }
    }

    return output.join('\n');
  },
  regExp: TABLE_ROW_REG_EXP,
  replace: (parentNode, _children, match) => {
    if (isTableRowDivider(match[0])) {
      const table = parentNode.getPreviousSibling();
      if ($isTableNode(table)) {
        applyDividerRow(table, match[0]);
      }
      parentNode.remove();
      return;
    }

    const matchCells = mapToTableCells(match[0]);
    if (matchCells == null) {
      return;
    }

    const rows = [matchCells];
    let sibling = parentNode.getPreviousSibling();
    let maxCells = matchCells.length;

    while (sibling) {
      if (!$isParagraphNode(sibling) || sibling.getChildrenSize() !== 1) {
        break;
      }

      const firstChild = sibling.getFirstChild();
      if (!$isTextNode(firstChild)) {
        break;
      }

      const siblingText = firstChild.getTextContent();
      if (isTableRowDivider(siblingText)) {
        break;
      }

      const cells = mapToTableCells(siblingText);
      if (cells == null) {
        break;
      }

      maxCells = Math.max(maxCells, cells.length);
      rows.unshift(cells);
      const previousSibling = sibling.getPreviousSibling();
      sibling.remove();
      sibling = previousSibling;
    }

    const table = $createTableNode();

    for (const cells of rows) {
      const tableRow = $createTableRowNode();
      table.append(tableRow);

      for (let i = 0; i < maxCells; i++) {
        tableRow.append(i < cells.length ? cells[i] : $createTableCell(''));
      }
    }

    const previousSibling = parentNode.getPreviousSibling();
    if (
      $isTableNode(previousSibling) &&
      getTableColumnsSize(previousSibling) === maxCells
    ) {
      previousSibling.append(...table.getChildren());
      applyColumnAlignmentToTable(previousSibling);
      parentNode.remove();
    } else {
      parentNode.replace(table);
    }

    table.selectEnd();
  },
  type: 'element',
};

export const HR: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => {
    return $isHorizontalRuleNode(node) ? '---' : null;
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _children, _match, isImport) => {
    const line = $createHorizontalRuleNode();

    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }

    line.selectNext();
  },
  triggerOnEnter: true,
  type: 'element',
};

const TILDE_CODE_START_REGEX = /^([ \t]*~{3,})([\w-]+)?[ \t]?/;
const TILDE_CODE_END_REGEX = /^[ \t]*~{3,}$/;

export const TILDE_CODE: MultilineElementTransformer = {
  dependencies: CODE.dependencies,
  export: CODE.export,
  handleImportAfterStartMatch: ({
    lines,
    rootNode,
    startLineIndex,
    startMatch,
  }) => {
    const fence = startMatch[1];
    const fenceLength = fence.trim().length;
    const currentLine = lines[startLineIndex];
    const afterFenceIndex = startMatch.index! + fence.length;
    const afterFence = currentLine.slice(afterFenceIndex);
    const multilineEndRegex = new RegExp(`^[ \\t]*~{${fenceLength},}$`);

    const runReplace = (
      endMatch: RegExpMatchArray | null,
      linesInBetween: string[]
    ) => {
      CODE.replace(rootNode, null, startMatch, endMatch, linesInBetween, true);
    };

    for (let i = startLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (multilineEndRegex.test(line)) {
        const endMatch = line.match(multilineEndRegex);
        const linesInBetween = lines.slice(startLineIndex + 1, i);
        const afterFullMatch = currentLine.slice(startMatch[0].length);
        if (afterFullMatch.length > 0) {
          linesInBetween.unshift(afterFullMatch);
        }
        runReplace(endMatch, linesInBetween);
        return [true, i] as [boolean, number];
      }
    }

    const linesInBetween = lines.slice(startLineIndex + 1);
    const afterFullMatch = currentLine.slice(startMatch[0].length);
    if (afterFullMatch.length > 0) {
      linesInBetween.unshift(afterFullMatch);
    }
    runReplace(null, linesInBetween);
    return [true, lines.length - 1] as [boolean, number];
  },
  regExpEnd: {
    optional: true,
    regExp: TILDE_CODE_END_REGEX,
  },
  regExpStart: TILDE_CODE_START_REGEX,
  replace: CODE.replace,
  type: 'multiline-element',
};

export {
  HorizontalRuleExtension,
  HorizontalRuleNode,
  ImageNode,
  TableCellNode,
  TableNode,
  TableRowNode,
};
