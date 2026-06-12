import {
  CURSOR_PASTE_DEBUG_PLAIN,
  CURSOR_PASTE_HTML_VARIANTS,
  getShowdownSanitizedClipboardHtml,
} from './cursor-paste-html-variants';

describe('cursor paste HTML debug variants', () => {
  it('documents the Lexical native HTML shape', () => {
    const native = CURSOR_PASTE_HTML_VARIANTS.find(
      (variant) => variant.id === 'lexical-native'
    );

    expect(native?.html).toContain('role="checkbox"');
    expect(native?.html).toContain('__lexicallisttype="check"');
    expect(native?.html).toContain('white-space: pre-wrap');
  });

  it('records sanitized Showdown clipboard HTML for comparison', async () => {
    const html = await getShowdownSanitizedClipboardHtml(
      CURSOR_PASTE_DEBUG_PLAIN
    );

    expect(html).toContain('<!--simplenote-clipboard-source:v1-->');
    expect(html).toMatch(/checkbox/i);
    expect(html).not.toContain('role="checkbox"');
    expect(html).not.toContain('__lexicallisttype');
    expect(html).toBe(
      '<!--simplenote-clipboard-source:v1--><ul><li><input type="checkbox" disabled=""> Sample task text for Cursor paste debugging</li></ul>'
    );
  });
});
