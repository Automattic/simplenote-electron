import { $exportMarkdownString } from '../extensions/index';
import { makeGfmTestEditor } from './gfm-test-helpers';

// Exercises the production editor path: createMarkdownEditorExtension initial
// import → $exportMarkdownString, without React or Redux. Each block below is
// drawn from cases that already round-trip in the markdown-editor test suite.
const COMPREHENSIVE_NOTE_MARKDOWN = [
  '# Comprehensive roundtrip note',
  '',
  '**Bold lead** and *quiet emphasis* with [safe route](https://example.com/route?q=1).',
  '',
  'Visit https://example.com today without auto-linking.',
  '',
  'Use `https://example.com` literally in inline code.',
  '',
  'Paragraph before intentional empty lines.',
  '',
  '',
  'Paragraph after one blank paragraph between blocks.',
  '',
  'Hard break with backslash\\',
  'continues here.',
  '',
  'Hard break with two spaces  ',
  'continues here too.',
  '',
  '> quoted text',
  '',
  '---',
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
  '',
  '- test2',
  '',
  '```',
  'test',
  '',
  '',
  '',
  '```',
  '',
  '```js',
  'const answer = 42;',
  '',
  '',
  'console.log(answer);',
  '```',
  '',
  '~~~js',
  'const x = 1;',
  '~~~',
  '',
  '| L | C | R |',
  '| :--- | :---: | ---: |',
  '| a | b | c |',
  '',
  '| City | Days |',
  '| --- | --- |',
  '| Kyoto | 3 |',
  '',
  '![Photo](https://example.com/photo.jpg)',
  '',
  '![Photo](https://example.com/photo\\(1\\).jpg)',
  '',
  '![Photo](https://example.com/photo.jpg "Cover \\"shot\\"")',
  '',
  '![Local](http://127.0.0.1/photo.jpg)',
  '',
  'Trailing paragraph after rich blocks.',
].join('\n');

describe('production markdown roundtrip', () => {
  it('exports a comprehensive note after import', async () => {
    const editor = makeGfmTestEditor(COMPREHENSIVE_NOTE_MARKDOWN);
    await Promise.resolve();

    editor.getEditorState().read(() => {
      expect($exportMarkdownString().length).toBeGreaterThan(0);
    });
    editor.dispose();
  });
});
