import { buildEditorFromExtensions } from '@lexical/extension';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  createEditor,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
} from '@lexical/table';

import {
  $exportMarkdownString,
  createMarkdownEditorExtension,
  registerMarkdownOnChange,
  REMOTE_CONTENT_TAG,
} from '../extensions/index';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
}

function appendParagraph(
  editor: ReturnType<typeof createEditor>,
  text: string
) {
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(text));
      $getRoot().append(paragraph);
    },
    { discrete: true }
  );
}

function replaceFirstParagraphText(
  editor: ReturnType<typeof createEditor>,
  text: string
) {
  editor.update(
    () => {
      const first = $getRoot().getFirstChild();
      if (!$isParagraphNode(first)) {
        throw new Error('Expected a paragraph');
      }
      first.clear();
      first.append($createTextNode(text));
    },
    { discrete: true }
  );
}

function selectFirstParagraph(editor: ReturnType<typeof createEditor>): void {
  editor.update(
    () => {
      const first = $getRoot().getFirstChild();
      if (!$isParagraphNode(first)) {
        throw new Error('Expected a paragraph');
      }
      first.select(0, first.getTextContentSize());
    },
    { discrete: true }
  );
}

function replaceTableCellText(
  editor: ReturnType<typeof createEditor>,
  rowIndex: number,
  cellIndex: number,
  text: string
): void {
  editor.update(
    () => {
      const table = $getRoot().getChildren().find($isTableNode);
      if (!table) {
        throw new Error('Expected a table');
      }
      const row = table.getChildAtIndex(rowIndex);
      if (!$isTableRowNode(row)) {
        throw new Error('Expected a table row');
      }
      const cell = row.getChildAtIndex(cellIndex);
      if (!$isTableCellNode(cell)) {
        throw new Error('Expected a table cell');
      }
      cell.clear();
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(text));
      cell.append(paragraph);
    },
    { discrete: true }
  );
}

async function expectOnChangeMatchesEditorAfterHistory(
  editor: ReturnType<typeof createEditor>,
  onChange: jest.Mock,
  command: typeof UNDO_COMMAND | typeof REDO_COMMAND
): Promise<void> {
  onChange.mockClear();
  editor.dispatchCommand(command, undefined);
  await flushMicrotasks();

  const markdown = editor.read(() => $exportMarkdownString());
  expect(onChange).toHaveBeenCalled();
  expect(onChange).toHaveBeenLastCalledWith(markdown);
}

describe('registerMarkdownOnChange', () => {
  let editor: ReturnType<typeof createEditor>;
  let onChange: jest.Mock;

  beforeEach(() => {
    editor = createEditor({
      onError: (error) => {
        throw error;
      },
    });
    onChange = jest.fn();
    registerMarkdownOnChange(editor, onChange);
  });

  it('serializes the document on content updates', async () => {
    appendParagraph(editor, 'hello');
    await flushMicrotasks();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('hello');

    appendParagraph(editor, 'world');
    await flushMicrotasks();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith('hello\n\nworld');
  });

  it('ignores remote-tagged updates', () => {
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('remote'));
        $getRoot().append(paragraph);
      },
      { discrete: true, tag: REMOTE_CONTENT_TAG }
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores updates without content changes', () => {
    appendParagraph(editor, 'hello');
    onChange.mockClear();

    // A selection-only update marks no nodes dirty.
    editor.update(
      () => {
        $getRoot().selectEnd();
      },
      { discrete: true }
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it('emits markdown matching the editor after undo reverts an in-place edit', async () => {
    const onUndoChange = jest.fn();
    const undoEditor = buildEditorFromExtensions(
      createMarkdownEditorExtension('hello', onUndoChange)
    );
    await flushMicrotasks();
    onUndoChange.mockClear();

    replaceFirstParagraphText(undoEditor, 'HELLO');
    await flushMicrotasks();
    expect(onUndoChange).toHaveBeenLastCalledWith('HELLO');

    await expectOnChangeMatchesEditorAfterHistory(
      undoEditor,
      onUndoChange,
      UNDO_COMMAND
    );
    expect(undoEditor.read(() => $exportMarkdownString())).toBe('hello');

    undoEditor.dispose();
  });

  it('emits markdown matching the editor after redo replays an in-place edit', async () => {
    const onUndoChange = jest.fn();
    const undoEditor = buildEditorFromExtensions(
      createMarkdownEditorExtension('hello', onUndoChange)
    );
    await flushMicrotasks();
    onUndoChange.mockClear();

    replaceFirstParagraphText(undoEditor, 'HELLO');
    await flushMicrotasks();
    undoEditor.dispatchCommand(UNDO_COMMAND, undefined);
    await flushMicrotasks();
    onUndoChange.mockClear();

    await expectOnChangeMatchesEditorAfterHistory(
      undoEditor,
      onUndoChange,
      REDO_COMMAND
    );
    expect(undoEditor.read(() => $exportMarkdownString())).toBe('HELLO');

    undoEditor.dispose();
  });

  it('emits markdown matching the editor after undo removes inline formatting', async () => {
    const onUndoChange = jest.fn();
    const undoEditor = buildEditorFromExtensions(
      createMarkdownEditorExtension('plain', onUndoChange)
    );
    await flushMicrotasks();
    onUndoChange.mockClear();

    selectFirstParagraph(undoEditor);
    undoEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
    await flushMicrotasks();
    expect(onUndoChange).toHaveBeenLastCalledWith('**plain**');

    await expectOnChangeMatchesEditorAfterHistory(
      undoEditor,
      onUndoChange,
      UNDO_COMMAND
    );
    expect(undoEditor.read(() => $exportMarkdownString())).toBe('plain');

    undoEditor.dispose();
  });

  it('emits markdown matching the editor after undo reverts a table cell edit', async () => {
    const tableMarkdown = ['| A | B |', '| --- | --- |', '| one | two |'].join(
      '\n'
    );
    const onUndoChange = jest.fn();
    const undoEditor = buildEditorFromExtensions(
      createMarkdownEditorExtension(tableMarkdown, onUndoChange)
    );
    await flushMicrotasks();
    onUndoChange.mockClear();

    replaceTableCellText(undoEditor, 1, 0, 'ONE');
    await flushMicrotasks();
    expect(onUndoChange).toHaveBeenLastCalledWith(
      ['| A | B |', '| --- | --- |', '| ONE | two |'].join('\n')
    );

    await expectOnChangeMatchesEditorAfterHistory(
      undoEditor,
      onUndoChange,
      UNDO_COMMAND
    );
    expect(undoEditor.read(() => $exportMarkdownString())).toBe(tableMarkdown);

    undoEditor.dispose();
  });
});
