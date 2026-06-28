import {
  flushMarkdownEditor,
  makeGfmTestEditor,
  roundtrip,
} from './gfm-test-helpers';

// Exercises the production editor path: createMarkdownEditorExtension bootstrap
// import → export, without React or Redux.
describe('production markdown roundtrip', () => {
  it('preserves list sections from the comprehensive note', async () => {
    const markdown = [
      '- First bullet',
      '- Second bullet',
      '',
      '1. First ordered',
      '2. Second ordered',
      '',
      '- [ ] Open task',
      '- [x] Done task',
      '',
      '- test1',
      '',
      '- test2',
    ].join('\n');
    const editor = makeGfmTestEditor('');
    await flushMarkdownEditor(editor);
    expect(roundtrip(editor, markdown)).toBe(markdown);
    editor.dispose();
  });
});
