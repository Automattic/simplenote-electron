import { buildEditorFromExtensions } from '@lexical/extension';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type LexicalEditorWithDispose,
} from 'lexical';

import {
  $exportMarkdownString,
  $insertMarkdownPasteNodes,
  createMarkdownEditorExtension,
} from './extensions/index';
import { countEmptyRootParagraphs } from './markdown/gfm-test-helpers';

const NOTE_WITH_EXTRA_GAP = 'before\n\n\nafter';
const NOTE_WITH_PARAGRAPH_GAP = 'before\n\nafter';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
}

async function simulateNoteSwitchSavedContent({
  initialStoreContent,
  edit,
}: {
  initialStoreContent: string;
  edit: (editor: LexicalEditorWithDispose) => void | Promise<void>;
}): Promise<{ storeContent: string; reopened: string }> {
  const savedVersions: string[] = [];

  const editor1 = buildEditorFromExtensions(
    createMarkdownEditorExtension(initialStoreContent, (content) => {
      savedVersions.push(content);
    })
  );
  await flushMicrotasks();

  await edit(editor1);
  await flushMicrotasks();

  const storeContent = savedVersions.at(-1) ?? initialStoreContent;
  editor1.dispose();

  const editor2 = buildEditorFromExtensions(
    createMarkdownEditorExtension(storeContent)
  );
  await flushMicrotasks();

  const reopened = editor2.getEditorState().read(() => $exportMarkdownString());
  editor2.dispose();

  return { storeContent, reopened };
}

describe('note switch saved content', () => {
  it('persists pasted paragraph gaps through save and reopen', async () => {
    const { storeContent, reopened } = await simulateNoteSwitchSavedContent({
      initialStoreContent: '',
      edit: (editor) => {
        editor.update(
          () => {
            $getRoot().getFirstChild()?.selectStart();
            $insertMarkdownPasteNodes(NOTE_WITH_PARAGRAPH_GAP, null);
          },
          { discrete: true }
        );
      },
    });

    expect(storeContent).toBe(NOTE_WITH_PARAGRAPH_GAP);
    expect(reopened).toBe(NOTE_WITH_PARAGRAPH_GAP);

    const editor = buildEditorFromExtensions(
      createMarkdownEditorExtension(storeContent)
    );
    await flushMicrotasks();
    expect(countEmptyRootParagraphs(editor)).toBe(0);
    editor.dispose();
  });

  it('does not add a blank-line paragraph when pressing Enter twice', async () => {
    const { storeContent, reopened } = await simulateNoteSwitchSavedContent({
      initialStoreContent: 'before\n\nafter',
      edit: (editor) => {
        editor.update(
          () => {
            $getRoot().getFirstChild()?.selectEnd();
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.insertParagraph();
            }
          },
          { discrete: true }
        );
      },
    });

    expect(storeContent).toBe('before\n\nafter');
    expect(reopened).toBe('before\n\nafter');

    const editor = buildEditorFromExtensions(
      createMarkdownEditorExtension(storeContent)
    );
    await flushMicrotasks();
    expect(countEmptyRootParagraphs(editor)).toBe(0);
    editor.dispose();
  });
});
