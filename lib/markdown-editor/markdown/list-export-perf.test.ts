/* eslint-disable no-console -- timing benchmarks log to CI output */
import { $exportMarkdownString } from '../extensions/index';
import { importMarkdown, makeGfmTestEditor } from './gfm-test-helpers';

function buildBulletList(count: number): string {
  return Array.from({ length: count }, (_, i) => `- Item ${i + 1}`).join('\n');
}

describe('list export performance', () => {
  it('exports 1000 list items quickly', () => {
    const markdown = buildBulletList(1000);
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    const start = performance.now();
    const exported = editor
      .getEditorState()
      .read(() => $exportMarkdownString());
    const ms = performance.now() - start;

    expect(exported).toBe(markdown);
    expect(ms).toBeLessThan(200);
    console.log(`1000-item list export: ${ms.toFixed(1)}ms`);

    editor.dispose();
  });
});
