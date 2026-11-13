import {
  addCodeCopyButtons,
  codeBlockClassName,
  copyCodeBlock,
  copyCodeButtonClassName,
} from './code-copy-buttons';

describe('code copy buttons', () => {
  let writeText: jest.Mock;

  const renderPreview = (html: string) => {
    const root = document.createElement('div');
    root.innerHTML = html;
    return root;
  };

  const getButtons = (root: Element) =>
    Array.from(
      root.querySelectorAll<HTMLButtonElement>(`.${copyCodeButtonClassName}`)
    );

  beforeEach(() => {
    writeText = jest.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (navigator as { clipboard?: Clipboard }).clipboard;
  });

  describe('addCodeCopyButtons', () => {
    it('wraps each code block with a copy button', () => {
      const root = renderPreview(
        '<p>Intro</p><pre><code>first()</code></pre><pre><code>second()</code></pre>'
      );

      addCodeCopyButtons(root);

      const blocks = root.querySelectorAll(`.${codeBlockClassName}`);
      expect(blocks).toHaveLength(2);
      blocks.forEach((block) => {
        expect(block.children[0].tagName).toBe('PRE');
        expect(block.children[1].tagName).toBe('BUTTON');
      });

      const [button] = getButtons(root);
      expect(button.type).toBe('button');
      expect(button.textContent).toBe('Copy');
      expect(button.getAttribute('aria-label')).toBe('Copy code to clipboard');
      expect(root.firstElementChild?.tagName).toBe('P');
    });

    it('ignores inline code', () => {
      const root = renderPreview('<p>Run <code>npm test</code> first</p>');

      addCodeCopyButtons(root);

      expect(getButtons(root)).toHaveLength(0);
    });

    it('does not add a second button when run again', () => {
      const root = renderPreview('<pre><code>once()</code></pre>');

      addCodeCopyButtons(root);
      addCodeCopyButtons(root);

      expect(getButtons(root)).toHaveLength(1);
    });

    it('only adds a button to the outermost code block', () => {
      const root = renderPreview('<pre>outer<pre>inner</pre></pre>');

      addCodeCopyButtons(root);

      expect(getButtons(root)).toHaveLength(1);
    });

    it('adds nothing when the clipboard is unavailable', () => {
      delete (navigator as { clipboard?: Clipboard }).clipboard;
      const root = renderPreview('<pre><code>code()</code></pre>');

      addCodeCopyButtons(root);

      expect(getButtons(root)).toHaveLength(0);
    });
  });

  describe('copyCodeBlock', () => {
    it('copies the code text and briefly confirms the copy', async () => {
      jest.useFakeTimers();
      const root = renderPreview(
        '<pre><code class="language-js"><span class="hljs-keyword">const</span> a = 1;\nconsole.log(a);</code></pre>'
      );
      addCodeCopyButtons(root);
      const [button] = getButtons(root);

      await copyCodeBlock(button);

      expect(writeText).toHaveBeenCalledWith('const a = 1;\nconsole.log(a);');
      expect(button.textContent).toBe('Copied!');
      expect(button.getAttribute('aria-label')).toBe(
        'Copied code to clipboard'
      );

      jest.advanceTimersByTime(2000);

      expect(button.textContent).toBe('Copy');
      expect(button.getAttribute('aria-label')).toBe('Copy code to clipboard');
    });

    it('restarts the confirmation when copying again', async () => {
      jest.useFakeTimers();
      const root = renderPreview('<pre><code>again()</code></pre>');
      addCodeCopyButtons(root);
      const [button] = getButtons(root);

      await copyCodeBlock(button);
      jest.advanceTimersByTime(1500);
      await copyCodeBlock(button);
      jest.advanceTimersByTime(1500);

      expect(button.textContent).toBe('Copied!');

      jest.advanceTimersByTime(500);

      expect(button.textContent).toBe('Copy');
    });

    it('leaves the button unchanged when the clipboard write fails', async () => {
      writeText.mockImplementation(() => Promise.reject(new Error('denied')));
      const root = renderPreview('<pre><code>secret()</code></pre>');
      addCodeCopyButtons(root);
      const [button] = getButtons(root);

      await copyCodeBlock(button);

      expect(button.textContent).toBe('Copy');
    });
  });
});
