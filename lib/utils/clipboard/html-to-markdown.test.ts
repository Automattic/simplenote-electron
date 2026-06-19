import {
  clipboardHtmlToMarkdown,
  clipboardItemsHtmlToMarkdown,
  htmlToMarkdown,
  insertMarkdownPaste,
  isFormattingFreeHtml,
  resolveClipboardPaste,
  SIMPLENOTE_SOURCE_HTML_MARKER,
} from './html-to-markdown';

describe('htmlToMarkdown', () => {
  it('converts currently supported Markdown block and inline features', () => {
    expect(
      htmlToMarkdown(`
        <h1>Trip Plan</h1>
        <p><strong>Bold</strong>, <em>italic</em>, <del>old</del>, <code>inline()</code></p>
        <blockquote>Bring layers</blockquote>
        <pre><code class="code language-js highlighted">const city = 'Oslo';</code></pre>
        <hr>
      `)
    ).toBe(
      [
        '# Trip Plan',
        '',
        '**Bold**, *italic*, ~~old~~, `inline()`',
        '',
        '> Bring layers',
        '',
        '```js',
        "const city = 'Oslo';",
        '```',
        '',
        '---',
      ].join('\n')
    );
  });

  it('converts lists and checklists into readable Markdown source', () => {
    expect(
      htmlToMarkdown(`
        <ul>
          <li><input type="checkbox" checked>Booked train</li>
          <li><input type="checkbox">Pack adapter</li>
          <li>Neighborhoods
            <ol start="3">
              <li>Grunerlokka</li>
            </ol>
          </li>
        </ul>
      `)
    ).toBe(
      [
        '- [x] Booked train',
        '- [ ] Pack adapter',
        '- Neighborhoods',
        '    3. Grunerlokka',
      ].join('\n')
    );
  });

  it('keeps safe links and images and drops unsafe link targets', () => {
    expect(
      htmlToMarkdown(`
        <p>
          <a href="https://example.com/path?q=1">safe</a>
          <a href="mailto:test@example.com">mail</a>
          <a href="simplenote://note/abc-123">note</a>
          <a href="javascript:alert(1)">unsafe</a>
          <img src="https://example.com/photo.jpg" alt="Photo">
          <img src="data:image/svg+xml;base64,abc" alt="Vector">
        </p>
      `)
    ).toBe(
      '[safe](https://example.com/path?q=1) [mail](mailto:test@example.com) [note](simplenote://note/abc-123) unsafe ![Photo](https://example.com/photo.jpg) Vector'
    );
  });

  it('drops unsafe images to escaped readable alt text', () => {
    expect(
      htmlToMarkdown(`
        <p>
          <img src="http://127.0.0.1/photo.jpg" alt="![tracker](https://example.com/pixel)">
          <img src="https://example.com/photo.jpg" alt="Photo [one]">
        </p>
      `)
    ).toBe(
      '!\\[tracker\\](https://example.com/pixel) ![Photo one](https://example.com/photo.jpg)'
    );
  });

  it('converts simple tables and falls back to tab-separated rows for irregular tables', () => {
    expect(
      htmlToMarkdown(`
        <table>
          <tr><th>City</th><th>Days</th></tr>
          <tr><td>Kyoto</td><td>3</td></tr>
        </table>
      `)
    ).toBe(['| City | Days |', '| --- | --- |', '| Kyoto | 3 |'].join('\n'));

    expect(
      htmlToMarkdown(`
        <table>
          <tr><td>One</td><td>Two</td></tr>
          <tr><td>Three</td></tr>
        </table>
      `)
    ).toBe('One\tTwo\nThree');
  });

  it('removes hostile or unsupported HTML without persisting raw tags', () => {
    expect(
      htmlToMarkdown(`
        <style>.x { color: red; }</style>
        <script>alert("x")</script>
        <iframe src="https://example.com"></iframe>
        <p onclick="alert(1)" style="color: red">Visible <span hidden>hidden</span></p>
        <svg><text>svg text</text></svg>
        <form><input value="secret"></form>
        <template><p>template text</p></template>
      `)
    ).toBe('Visible');
  });

  it('removes common hidden text patterns from rich HTML', () => {
    expect(
      htmlToMarkdown(`
        <p>Visible</p>
        <span style="display: none">display hidden</span>
        <span style="visibility: hidden">visibility hidden</span>
        <span style="opacity: 0">transparent</span>
        <span style="font-size: 0">zero font</span>
        <span inert>inert text</span>
        <span class="assistive visually-hidden text">class-hidden</span>
        <span style="clip: rect(0, 0, 0, 0)">clipped</span>
        <span style="clip-path: inset(50%)">clip path</span>
        <span style="position:absolute; left:-9999px">offscreen</span>
        <span style="position:fixed; text-indent:-1000px">indented</span>
        <span style="mso-hide: all">office hidden</span>
      `)
    ).toBe('Visible');
  });

  it('escapes literal Markdown from pasted text content', () => {
    expect(
      htmlToMarkdown(
        '<p># Not a heading and [not a link](https://bad.test)</p>'
      )
    ).toBe('\\# Not a heading and \\[not a link\\](https://bad.test)');
  });

  it('returns null for empty or unsupported content', () => {
    expect(htmlToMarkdown('')).toBe(null);
    expect(htmlToMarkdown('<script>alert(1)</script>')).toBe(null);
  });

  it('keeps browser article selections within supported Markdown features', () => {
    expect(
      htmlToMarkdown(`
        <article>
          <h1>Browser Article Clip</h1>
          <p><strong>Bold lead</strong> and <em>quiet emphasis</em> with <a href="https://example.com/route?q=1">safe route</a>.</p>
          <ul>
            <li>First browser bullet</li>
            <li>Second browser bullet</li>
          </ul>
          <table>
            <tr><th>City</th><th>Days</th></tr>
            <tr><td>Porto</td><td>2</td></tr>
          </table>
          <span hidden>hidden browser text</span>
        </article>
      `)
    ).toBe(
      [
        '# Browser Article Clip',
        '',
        '**Bold lead** and *quiet emphasis* with [safe route](https://example.com/route?q=1).',
        '',
        '- First browser bullet',
        '- Second browser bullet',
        '',
        '| City | Days |',
        '| --- | --- |',
        '| Porto | 2 |',
      ].join('\n')
    );
  });

  it('keeps document-editor fragments readable while dropping style-only HTML', () => {
    expect(
      htmlToMarkdown(`
        <h2 id="docs-internal-guid-test"><span style="font-weight:700">Document Editor Style Clip</span></h2>
        <p class="MsoNormal"><b>Confirmed booking</b> with <i>late arrival</i> and <s>old platform</s>.</p>
        <ol start="3"><li><span>Third train option</span></li></ol>
        <ul><li><input type="checkbox" checked>Visa scan uploaded</li></ul>
        <p><a href="javascript:alert(1)" style="color:red">unsafe doc link</a></p>
        <p><span style="font-size:24px;color:red">Styled text remains readable</span></p>
      `)
    ).toBe(
      [
        '## Document Editor Style Clip',
        '',
        '**Confirmed booking** with *late arrival* and ~~old platform~~.',
        '',
        '3. Third train option',
        '',
        '- [x] Visa scan uploaded',
        '',
        'unsafe doc link',
        '',
        'Styled text remains readable',
      ].join('\n')
    );
  });
});

describe('clipboardHtmlToMarkdown', () => {
  it('reads only text/html from clipboard data', () => {
    const clipboardData = {
      getData: jest.fn((format: string) =>
        format === 'text/html' ? '<h2>Heading</h2>' : '<h1>wrong</h1>'
      ),
    };

    expect(clipboardHtmlToMarkdown(clipboardData)).toBe('## Heading');
    expect(clipboardData.getData).toHaveBeenCalledWith('text/html');
    expect(clipboardData.getData).toHaveBeenCalledWith('text/plain');
  });

  it('prefers paired plain text for Simplenote-marked HTML', () => {
    const clipboardData = {
      getData: jest.fn((format: string) =>
        format === 'text/html'
          ? `${SIMPLENOTE_SOURCE_HTML_MARKER}<h1>Rendered</h1>`
          : '# Source'
      ),
    };

    expect(clipboardHtmlToMarkdown(clipboardData)).toBe('# Source');
  });

  it('does not convert marked HTML when paired plain text is empty', () => {
    const clipboardData = {
      getData: jest.fn((format: string) =>
        format === 'text/html'
          ? `${SIMPLENOTE_SOURCE_HTML_MARKER}<h1>Rendered</h1>`
          : ''
      ),
    };

    expect(clipboardHtmlToMarkdown(clipboardData)).toBe(null);
  });
});

describe('resolveClipboardPaste', () => {
  it('converts unmarked HTML before considering plain fallback', () => {
    expect(
      resolveClipboardPaste({ html: '<h2>Rich</h2>', plain: 'Plain' }, true)
    ).toBe('## Rich');
  });

  it('prefers plain text for formatting-free HTML such as terminal output', () => {
    const plain = '[info] Done\n[error] Failed';
    const html =
      '<meta charset="utf-8"><div>[info] Done</div><div>[error] Failed</div>';

    expect(isFormattingFreeHtml(html)).toBe(true);
    expect(resolveClipboardPaste({ html, plain })).toBe(plain);
  });

  it('falls back to plain text when requested and rich HTML is unusable', () => {
    expect(
      resolveClipboardPaste(
        { html: '<script>alert(1)</script>', plain: 'Plain' },
        true
      )
    ).toBe('Plain');
  });
});

describe('clipboardItemsHtmlToMarkdown', () => {
  it('reads the first supported text/html clipboard item', async () => {
    const plainTextItem = {
      types: ['text/plain'],
      getType: jest.fn(),
    };
    const htmlItem = {
      types: ['text/html', 'text/plain'],
      getType: jest.fn(async () => ({
        text: async () => '<h2>Heading</h2>',
      })),
    };
    const clipboardItems = [plainTextItem, htmlItem] as unknown as NonNullable<
      Parameters<typeof clipboardItemsHtmlToMarkdown>[0]
    >;

    await expect(clipboardItemsHtmlToMarkdown(clipboardItems)).resolves.toBe(
      '## Heading'
    );
    expect(plainTextItem.getType).not.toHaveBeenCalled();
    expect(htmlItem.getType).toHaveBeenCalledWith('text/html');
  });

  it('returns null when clipboard items have no usable rich text', async () => {
    const clipboardItems = [
      {
        types: ['text/plain'],
        getType: jest.fn(),
      },
      {
        types: ['text/html'],
        getType: jest.fn(async () => ({
          text: async () => '<script></script>',
        })),
      },
    ] as unknown as NonNullable<
      Parameters<typeof clipboardItemsHtmlToMarkdown>[0]
    >;

    await expect(clipboardItemsHtmlToMarkdown(clipboardItems)).resolves.toBe(
      null
    );
  });
});

describe('insertMarkdownPaste', () => {
  it('inserts converted Markdown into every editor selection as one undoable paste', () => {
    const selections = [
      {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 5,
      },
    ];
    const editor = {
      executeEdits: jest.fn(),
      getSelections: jest.fn(() => selections),
      pushUndoStop: jest.fn(),
    };

    expect(insertMarkdownPaste(editor, '- [ ] Pack adapter')).toBe(true);
    expect(editor.pushUndoStop).toHaveBeenCalledTimes(2);
    expect(editor.executeEdits).toHaveBeenCalledWith('richPaste', [
      {
        range: selections[0],
        text: '\ue000 Pack adapter',
        forceMoveMarkers: true,
      },
    ]);
  });

  it('does not intercept paste when the editor has no selection', () => {
    const editor = {
      executeEdits: jest.fn(),
      getSelections: jest.fn(() => null),
      pushUndoStop: jest.fn(),
    };

    expect(insertMarkdownPaste(editor, '# Heading')).toBe(false);
    expect(editor.executeEdits).not.toHaveBeenCalled();
    expect(editor.pushUndoStop).not.toHaveBeenCalled();
  });

  it('does not create an edit for an empty clipboard payload', () => {
    const editor = {
      executeEdits: jest.fn(),
      getSelections: jest.fn(() => [
        {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 5,
        },
      ]),
      pushUndoStop: jest.fn(),
    };

    expect(insertMarkdownPaste(editor, '')).toBe(false);
    expect(editor.getSelections).not.toHaveBeenCalled();
    expect(editor.executeEdits).not.toHaveBeenCalled();
    expect(editor.pushUndoStop).not.toHaveBeenCalled();
  });
});
