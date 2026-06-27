import { buildEditorFromExtensions } from '@lexical/extension';

import {
  $exportMarkdownString,
  createMarkdownEditorExtension,
} from '../extensions/index';
import { countEmptyRootParagraphs, markdownWithGap } from './gfm-test-helpers';

async function flush(): Promise<void> {
  await Promise.resolve();
}

describe('empty line count through note switches', () => {
  it.each([0, 1, 2, 3, 4])(
    'preserves %i empty lines between paragraphs',
    async (emptyLineCount) => {
      const markdown = markdownWithGap('three', emptyLineCount, 'four');

      let storeContent = markdown;
      for (let cycle = 0; cycle < 2; cycle++) {
        const editor = buildEditorFromExtensions(
          createMarkdownEditorExtension(storeContent)
        );
        await flush();

        expect(countEmptyRootParagraphs(editor)).toBe(emptyLineCount);

        storeContent = editor
          .getEditorState()
          .read(() => $exportMarkdownString());
        editor.dispose();
      }

      expect(storeContent).toBe(markdown);
    }
  );
});
