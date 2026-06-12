import { renderNoteToHtmlIfReady } from '../render-note-to-html';

import {
  buildMarkdownClipboardHtml,
  buildPreviewClipboardPayload,
  buildSourceClipboardPayload,
  sanitizeClipboardHtml,
  shouldCopyWholePreview,
  writeClipboardPayload,
  writePlainTextOnlyClipboard,
} from './copy';
import { SIMPLENOTE_SOURCE_HTML_MARKER } from './html-to-markdown';

jest.mock('../render-note-to-html', () => ({
  renderNoteToHtmlIfReady: jest.fn(),
}));

const mockedRenderNoteToHtmlIfReady =
  renderNoteToHtmlIfReady as jest.MockedFunction<
    typeof renderNoteToHtmlIfReady
  >;

const createClipboardData = () => {
  const data = new Map<string, string>();

  return {
    clearData: jest.fn((format: string) => data.delete(format)),
    getData: jest.fn((format: string) => data.get(format) ?? ''),
    setData: jest.fn((format: string, value: string) =>
      data.set(format, value)
    ),
  };
};

describe('clipboard copy helpers', () => {
  beforeEach(() => {
    mockedRenderNoteToHtmlIfReady.mockReset();
  });

  it('builds standard checklist HTML for outbound clipboard', () => {
    mockedRenderNoteToHtmlIfReady.mockReturnValue(
      '<ul><li><input type="checkbox" disabled>Pack adapter</li></ul>'
    );

    const html = buildMarkdownClipboardHtml('- [ ] Pack adapter');

    expect(html).toContain(SIMPLENOTE_SOURCE_HTML_MARKER);
    expect(html).toContain('checkbox');
    expect(html).not.toContain('role="checkbox"');
  });

  it('falls back to escaped plain HTML when the renderer is cold', () => {
    mockedRenderNoteToHtmlIfReady.mockReturnValue(null);

    expect(buildMarkdownClipboardHtml('- [ ] task')).toBe('<p>- [ ] task</p>');
  });

  it('writes plain text as the only clipboard type', () => {
    const clipboardData = {
      types: ['text/plain', 'text/html', 'application/x-lexical-editor'],
      clearData: jest.fn(function (this: { types: string[] }, format: string) {
        this.types = this.types.filter((type) => type !== format);
      }),
      setData: jest.fn(function (this: { types: string[] }, format: string) {
        if (!this.types.includes(format)) {
          this.types.push(format);
        }
      }),
      getData: jest.fn(),
    };

    expect(
      writePlainTextOnlyClipboard(
        clipboardData as unknown as DataTransfer,
        '- [ ] task'
      )
    ).toBe(true);
    expect(clipboardData.types).toEqual(['text/plain']);
    expect(clipboardData.setData).toHaveBeenCalledWith(
      'text/plain',
      '- [ ] task'
    );
    expect(clipboardData.clearData).toHaveBeenCalledTimes(3);
  });

  it('writes exact source text and clears Monaco HTML metadata', () => {
    mockedRenderNoteToHtmlIfReady.mockReturnValue('<h1>Heading</h1>');

    const clipboardData = createClipboardData();
    const payload = buildSourceClipboardPayload('\ue000 task\n# Heading', true);

    expect(writeClipboardPayload(clipboardData, payload)).toBe(true);
    expect(clipboardData.clearData).toHaveBeenCalledWith('text/html');
    expect(clipboardData.clearData).toHaveBeenCalledWith('vscode-editor-data');
    expect(clipboardData.getData('text/plain')).toBe('- [ ] task\n# Heading');
    expect(clipboardData.getData('text/html')).toContain(
      SIMPLENOTE_SOURCE_HTML_MARKER
    );
    expect(clipboardData.getData('text/html')).toContain('<h1>Heading</h1>');
  });

  it('keeps plaintext notes plain-only', () => {
    const payload = buildSourceClipboardPayload('plain text', false);

    expect(payload).toEqual({ plain: 'plain text' });
    expect(mockedRenderNoteToHtmlIfReady).not.toHaveBeenCalled();
  });

  it('falls back to source-only copy when the renderer is cold', () => {
    mockedRenderNoteToHtmlIfReady.mockReturnValue(null);

    expect(buildSourceClipboardPayload('# Heading', true)).toEqual({
      html: null,
      plain: '# Heading',
    });
  });

  it('sanitizes outbound clipboard HTML more strictly than preview markup', () => {
    const html = sanitizeClipboardHtml(`
        <h1 class="search-match" onclick="alert(1)">Heading</h1>
        <p style="color: red">Body</p>
        <img src="http://127.0.0.1/pixel.jpg" alt="Local tracker">
        <img src="https://example.com/photo.jpg" alt="Photo" data-id="1">
        <script>alert(1)</script>
        <template><p>template text</p></template>
      `);

    expect(html).toContain('<h1>Heading</h1>');
    expect(html).toContain('<p>Body</p>');
    expect(html).toContain('Local tracker');
    expect(html).toContain(
      '<img src="https://example.com/photo.jpg" alt="Photo">'
    );
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('style=');
    expect(html).not.toContain('data-id');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<template');
    expect(html).not.toContain('alert(1)');
    expect(html).not.toContain('template text');
  });

  it('removes hidden outbound clipboard elements', () => {
    const html = sanitizeClipboardHtml(`
        <p>Visible</p>
        <span style="display: none">display hidden</span>
        <span style="visibility: hidden">visibility hidden</span>
        <span style="opacity: 0">opacity hidden</span>
      `);

    expect(html).toContain('<p>Visible</p>');
    expect(html).not.toContain('display hidden');
    expect(html).not.toContain('visibility hidden');
    expect(html).not.toContain('opacity hidden');
  });

  it('builds readable preview text without marking preview HTML as source', () => {
    mockedRenderNoteToHtmlIfReady.mockReturnValue(
      '<h1>Heading</h1><p><strong>Bold</strong></p>'
    );

    const payload = buildPreviewClipboardPayload('# Heading\n\n**Bold**', true);

    expect(payload.plain).toBe('# Heading\n\n**Bold**');
    expect(payload.html).toBe('<h1>Heading</h1><p><strong>Bold</strong></p>');
    expect(payload.html).not.toContain(SIMPLENOTE_SOURCE_HTML_MARKER);
  });

  it('only whole-copies previews when focus or selection is inside the preview', () => {
    const preview = document.createElement('div');
    const outside = document.createElement('button');
    preview.tabIndex = 0;
    document.body.append(preview, outside);

    preview.focus();
    expect(
      shouldCopyWholePreview(preview, document.getSelection(), preview)
    ).toBe(true);

    outside.focus();
    expect(
      shouldCopyWholePreview(preview, document.getSelection(), outside)
    ).toBe(false);

    preview.remove();
    outside.remove();
  });
});
