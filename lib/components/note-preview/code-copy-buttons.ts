export const codeBlockClassName = 'note-preview__code-block';
export const copyCodeButtonClassName = 'note-preview__copy-code-button';

const copyLabel = 'Copy';
const copiedLabel = 'Copied!';
const copyDescription = 'Copy code to clipboard';
const copiedDescription = 'Copied code to clipboard';
const copiedResetDelay = 2000;

const resetTimers = new WeakMap<
  HTMLButtonElement,
  ReturnType<typeof setTimeout>
>();

const canWriteToClipboard = () =>
  typeof navigator !== 'undefined' &&
  typeof navigator.clipboard?.writeText === 'function';

const setButtonState = (button: HTMLButtonElement, isCopied: boolean) => {
  const description = isCopied ? copiedDescription : copyDescription;

  button.textContent = isCopied ? copiedLabel : copyLabel;
  button.title = description;
  button.setAttribute('aria-label', description);
};

/**
 * Wraps every top-level code block in the rendered Markdown with a container
 * holding a "Copy" button. The buttons are plain DOM nodes so they can be
 * added to the HTML produced by the Markdown renderer; clicks on them are
 * handled by delegating to `copyCodeBlock()`.
 */
export const addCodeCopyButtons = (root: Element): void => {
  if (!canWriteToClipboard()) {
    return;
  }

  root.querySelectorAll('pre').forEach((pre) => {
    const parent = pre.parentElement;

    if (
      !parent ||
      parent.closest('pre') ||
      parent.classList.contains(codeBlockClassName)
    ) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = codeBlockClassName;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = copyCodeButtonClassName;
    setButtonState(button, false);

    parent.insertBefore(wrapper, pre);
    wrapper.append(pre, button);
  });
};

export const copyCodeBlock = (button: HTMLButtonElement): Promise<void> => {
  const pre = button.parentElement?.querySelector('pre');

  if (!pre || !canWriteToClipboard()) {
    return Promise.resolve();
  }

  return navigator.clipboard.writeText(pre.textContent ?? '').then(
    () => {
      clearTimeout(resetTimers.get(button));
      setButtonState(button, true);
      resetTimers.set(
        button,
        setTimeout(() => {
          resetTimers.delete(button);
          setButtonState(button, false);
        }, copiedResetDelay)
      );
    },
    () => {
      // Leave the button untouched if the clipboard rejects the write so
      // that we never claim to have copied something we didn't.
    }
  );
};
