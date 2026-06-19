import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  createEditor,
} from 'lexical';
import { registerSafeMarkdownShortcuts } from './register-safe-markdown-shortcuts';

describe('registerSafeMarkdownShortcuts', () => {
  it('does not hit the update cascade guard when typing quickly', async () => {
    const errors: Error[] = [];
    const editor = createEditor({
      onError: (error) => {
        errors.push(error);
      },
    });
    registerSafeMarkdownShortcuts(editor, []);

    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('hello '));
        $getRoot().append(paragraph);
        paragraph.selectEnd();
      },
      { discrete: true }
    );

    const text = 'world typing fast without discrete ';
    for (const char of text) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(char);
        }
      });
    }

    await Promise.resolve();
    await Promise.resolve();

    expect(errors).toHaveLength(0);
    editor.getEditorState().read(() => {
      expect($getRoot().getTextContent()).toBe(`hello ${text}`);
    });
  });

  it('defers nested updates from the upstream markdown listener', async () => {
    const errors: Error[] = [];
    const editor = createEditor({
      onError: (error) => {
        errors.push(error);
      },
    });

    // Raw upstream shortcuts without the defer wrapper should still cascade in
    // this scenario; the safe wrapper is what the app uses instead.
    registerSafeMarkdownShortcuts(editor, []);

    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);
        paragraph.selectStart();
      },
      { discrete: true }
    );

    for (const char of 'hello ') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(char);
        }
      });
    }

    await Promise.resolve();
    await Promise.resolve();

    expect(errors).toHaveLength(0);
  });
});
