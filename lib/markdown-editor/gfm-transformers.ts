import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleExtension,
  HorizontalRuleNode,
} from '@lexical/extension';
import { $isCodeNode, $plainifyCodeContent } from '@lexical/code-core';
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
import {
  $getState,
  $isParagraphNode,
  $isTextNode,
  $setState,
  createState,
  type ElementNode,
  type LexicalNode,
} from 'lexical';

import { $createImageNode, $isImageNode, ImageNode } from './image-node';
import { unescapeMarkdown } from './image-markdown';

const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/;
const TABLE_ROW_DIVIDER_REG_EXP =
  /^\|(?:\s*:?\s*-+\s*:?\s*(?:\|\s*:?\s*-+\s*:?\s*)*)\|?\s?$/;
const IMAGE_REG_EXP =
  /!\[((?:\\.|[^\]\\\n])*)\]\(((?:\\[()]|[^()\s])+)(?:\s+"((?:\\"|[^"])*)")?\)/;
const IMAGE_SHORTCUT_REG_EXP = new RegExp(`${IMAGE_REG_EXP.source}$`);

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

export type TableRowMarkdownExport = {
  columnCount: number;
  isHeaderRow: boolean;
  line: string;
};

export function $exportTableRowMarkdown(
  row: TableRowNode
): TableRowMarkdownExport {
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

  return {
    columnCount: rowOutput.length,
    isHeaderRow,
    line: `| ${rowOutput.join(' | ')} |`,
  };
}

export function $buildTableDividerLine(
  table: TableNode,
  columnCount: number
): string {
  const alignments = $getState(table, tableColumnAlignmentsState) ?? [];
  const dividerCells =
    alignments.length > 0
      ? alignments.map(({ alignment, explicitLeft }) =>
          formatDividerCell(alignment, explicitLeft)
        )
      : Array.from({ length: columnCount }, () => '---');

  return `| ${dividerCells.join(' | ')} |`;
}

export function $exportTableNodeMarkdown(table: TableNode): string {
  const output: string[] = [];
  let headerDividerEmitted = false;

  for (const row of table.getChildren()) {
    if (!$isTableRowNode(row)) {
      continue;
    }

    const { columnCount, isHeaderRow, line } = $exportTableRowMarkdown(row);
    output.push(line);

    if (isHeaderRow && !headerDividerEmitted) {
      output.push($buildTableDividerLine(table, columnCount));
      headerDividerEmitted = true;
    }
  }

  return output.join('\n');
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

export function getTableCellInlineTransformers(): Array<
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

    return node.getMarkdownSyntax();
  },
  importRegExp: IMAGE_REG_EXP,
  regExp: IMAGE_SHORTCUT_REG_EXP,
  replace: (textNode, match) => {
    const [, altText, src, titleText] = match;
    textNode.replace(
      $createImageNode({
        altText: unescapeMarkdown(altText),
        src: unescapeMarkdown(src),
        titleText: titleText ? unescapeMarkdown(titleText) : '',
      })
    );
  },
  trigger: ')',
  type: 'text-match',
};

export const TABLE: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) {
      return null;
    }

    return $exportTableNodeMarkdown(node);
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
    if (matchCells === null) {
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
      if (cells === null) {
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

    if (isImport || parentNode.getNextSibling() !== null) {
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

function $countTrailingEmptyCodeLines(lines: string[]): number {
  let count = 0;
  for (let index = lines.length - 1; index >= 0; index--) {
    if (lines[index].length !== 0) {
      break;
    }
    count++;
  }
  return count;
}

function $restoreCodeBlockText(codeNode: LexicalNode, text: string): void {
  if (!$isCodeNode(codeNode)) {
    return;
  }
  codeNode.splice(0, codeNode.getChildrenSize(), $plainifyCodeContent(text));
}

function $importCodeBlockPreservingEmptyLines(
  rootNode: ElementNode,
  children: LexicalNode[] | null,
  startMatch: string[],
  endMatch: string[] | null,
  linesInBetween: string[] | null,
  isImport: boolean
): void {
  if (!linesInBetween || linesInBetween.length <= 1) {
    CODE.replace(
      rootNode,
      children,
      startMatch,
      endMatch,
      linesInBetween,
      isImport
    );
    return;
  }

  const trailingEmptyLineCount = $countTrailingEmptyCodeLines(linesInBetween);
  const contentLines = linesInBetween.slice(
    0,
    linesInBetween.length - trailingEmptyLineCount
  );

  CODE.replace(
    rootNode,
    children,
    startMatch,
    endMatch,
    contentLines.length > 0 ? contentLines : [''],
    isImport
  );

  if (trailingEmptyLineCount === 0) {
    return;
  }

  const codeNode = rootNode.getLastChild();
  if (codeNode === null) {
    return;
  }

  const trailingNewlines = '\n'.repeat(trailingEmptyLineCount);
  $restoreCodeBlockText(
    codeNode,
    `${codeNode.getTextContent()}${trailingNewlines}`
  );
}

function $handleBacktickCodeImportAfterStartMatch({
  lines,
  rootNode,
  startLineIndex,
  startMatch,
}: {
  lines: string[];
  rootNode: ElementNode;
  startLineIndex: number;
  startMatch: RegExpMatchArray;
}): [boolean, number] {
  const fence = startMatch[1];
  const fenceLength = fence.trim().length;
  const currentLine = lines[startLineIndex];
  const afterFenceIndex = startMatch.index! + fence.length;
  const afterFence = currentLine.slice(afterFenceIndex);
  const singleLineEndRegex = new RegExp(`\`{${fenceLength},}$`);
  const multilineEndRegex = new RegExp(`^[ \\t]*\`{${fenceLength},}$`);

  if (singleLineEndRegex.test(afterFence)) {
    const endMatch = afterFence.match(singleLineEndRegex);
    const content = afterFence.slice(0, afterFence.lastIndexOf(endMatch![0]));
    const fakeStartMatch = [...startMatch] as RegExpMatchArray;
    fakeStartMatch[2] = '';
    $importCodeBlockPreservingEmptyLines(
      rootNode,
      null,
      fakeStartMatch,
      endMatch,
      [content],
      true
    );
    return [true, startLineIndex];
  }

  for (let index = startLineIndex + 1; index < lines.length; index++) {
    const line = lines[index];
    if (multilineEndRegex.test(line)) {
      const endMatch = line.match(multilineEndRegex);
      const linesInBetween = lines.slice(startLineIndex + 1, index);
      const afterFullMatch = currentLine.slice(startMatch[0].length);
      if (afterFullMatch.length > 0) {
        linesInBetween.unshift(afterFullMatch);
      }
      $importCodeBlockPreservingEmptyLines(
        rootNode,
        null,
        startMatch,
        endMatch,
        linesInBetween,
        true
      );
      return [true, index];
    }
  }

  const linesInBetween = lines.slice(startLineIndex + 1);
  const afterFullMatch = currentLine.slice(startMatch[0].length);
  if (afterFullMatch.length > 0) {
    linesInBetween.unshift(afterFullMatch);
  }
  $importCodeBlockPreservingEmptyLines(
    rootNode,
    null,
    startMatch,
    null,
    linesInBetween,
    true
  );
  return [true, lines.length - 1];
}

// Lexical's CODE.export ignores the selection callback and always emits fences
// around the full block. Partial in-block copies should stay raw source text.
export const SELECTION_AWARE_CODE: MultilineElementTransformer = {
  ...CODE,
  export: (node, traverseChildren, selection) => {
    if (!$isCodeNode(node)) {
      return null;
    }
    if (selection) {
      const selectedText = traverseChildren(node);
      if (selectedText !== node.getTextContent()) {
        return selectedText;
      }
    }
    return CODE.export!(node, traverseChildren, selection);
  },
  handleImportAfterStartMatch: $handleBacktickCodeImportAfterStartMatch,
  replace: $importCodeBlockPreservingEmptyLines,
};

export const TILDE_CODE: MultilineElementTransformer = {
  dependencies: CODE.dependencies,
  export: SELECTION_AWARE_CODE.export,
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
      $importCodeBlockPreservingEmptyLines(
        rootNode,
        null,
        startMatch,
        endMatch,
        linesInBetween,
        true
      );
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
  replace: $importCodeBlockPreservingEmptyLines,
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
