function getScrollContentElement(shell: HTMLElement): Element {
  // Observe the element that actually grows with content.
  return (
    shell.querySelector('.lexical-md-editor__input') ??
    shell.firstElementChild ??
    shell
  );
}

/**
 * Tries to set `shell` to `position`, waiting for content layout if the
 * assignment is clamped. Returns a cleanup that disconnects any watcher.
 */
export function restoreScrollPosition(
  shell: HTMLElement,
  position: number
): () => void {
  // scrollTop assignments round to device pixels, so an exact read-back
  // comparison would misreport a successful restore as a clamp.
  shell.scrollTop = position;
  if (Math.abs(shell.scrollTop - position) < 1) {
    return () => {};
  }

  const observer = new ResizeObserver(() => {
    if (shell.scrollHeight - shell.clientHeight >= position) {
      shell.scrollTop = position;
      observer.disconnect();
    }
  });
  observer.observe(getScrollContentElement(shell));

  // The user scrolling means they took over; never yank the position
  // out from under them.
  const cancel = () => observer.disconnect();
  shell.addEventListener('wheel', cancel, { once: true, passive: true });
  shell.addEventListener('touchstart', cancel, {
    once: true,
    passive: true,
  });

  return () => {
    observer.disconnect();
    shell.removeEventListener('wheel', cancel);
    shell.removeEventListener('touchstart', cancel);
  };
}
