import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  createEditor,
} from 'lexical';

import { installDeferredNestedUpdates } from './deferred-nested-updates';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
}

describe('installDeferredNestedUpdates', () => {
  it('allows markdown-style nested updates without hitting the cascade guard', async () => {
    const editor = createEditor({
      onError: (error) => {
        throw error;
      },
    });
    const unregisterDeferred = installDeferredNestedUpdates(editor);

    let nestedDuringListener = false;
    editor.registerUpdateListener(() => {
      if (!nestedDuringListener) {
        nestedDuringListener = true;
        editor.update(() => {
          nestedDuringListener = false;
        });
      }
    });

    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('hello'));
        $getRoot().append(paragraph);
        paragraph.selectEnd();
      },
      { discrete: true }
    );

    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertText('!');
      }
    });

    await flushMicrotasks();

    unregisterDeferred();
    expect(
      editor.getEditorState().read(() => $getRoot().getTextContent())
    ).toBe('hello!');
  });
});
