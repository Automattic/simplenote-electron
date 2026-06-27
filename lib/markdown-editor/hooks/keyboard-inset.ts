import { useLayoutEffect, type RefObject } from 'react';

export const KEYBOARD_INSET_VAR = '--keyboard-inset';
export const VISUAL_VIEWPORT_OFFSET_TOP_VAR = '--visual-viewport-offset-top';
export const KEYBOARD_OPEN_ATTR = 'data-keyboard-open';

/** Matches $single-column in scss/_variables.scss */
export const MOBILE_KEYBOARD_MEDIA = '(max-width: 750px)';

/** Safari's domain / Done bar above the on-screen keyboard. */
export const MOBILE_INPUT_ACCESSORY_BAR_PX = 20;

export type KeyboardInsetRefs = {
  frameRef: RefObject<HTMLElement | null>;
  shellRef: RefObject<HTMLElement | null>;
};

/**
 * Height of the layout viewport obscured by the on-screen keyboard (or other
 * chrome). Zero when the keyboard is closed.
 */
export function measureKeyboardInset(): number {
  const viewport = window.visualViewport;
  if (!viewport) {
    return 0;
  }

  return Math.max(0, window.innerHeight - viewport.offsetTop - viewport.height);
}

export function getVisualViewportOffsetTop(): number {
  return window.visualViewport?.offsetTop ?? 0;
}

/** Inset written to CSS, including Safari's input accessory bar when open. */
export function getKeyboardInsetForPadding(): number {
  const inset = measureKeyboardInset();
  if (inset <= 0) {
    return 0;
  }

  return inset + MOBILE_INPUT_ACCESSORY_BAR_PX;
}

export function applyKeyboardInset(shell: HTMLElement): void {
  shell.style.setProperty(
    KEYBOARD_INSET_VAR,
    `${getKeyboardInsetForPadding()}px`
  );
}

export function clearKeyboardInset(shell: HTMLElement): void {
  shell.style.setProperty(KEYBOARD_INSET_VAR, '0px');
}

/**
 * Syncs scroll padding and pins the formatting toolbar to the visual viewport
 * while the on-screen keyboard is open (Safari pans the layout viewport).
 */
export function applyMobileKeyboardChrome(
  frame: HTMLElement,
  shell: HTMLElement
): void {
  applyKeyboardInset(shell);

  if (measureKeyboardInset() > 0) {
    frame.style.setProperty(
      VISUAL_VIEWPORT_OFFSET_TOP_VAR,
      `${getVisualViewportOffsetTop()}px`
    );
    frame.setAttribute(KEYBOARD_OPEN_ATTR, '');
    return;
  }

  frame.style.removeProperty(VISUAL_VIEWPORT_OFFSET_TOP_VAR);
  frame.removeAttribute(KEYBOARD_OPEN_ATTR);
}

export function clearMobileKeyboardChrome(
  frame: HTMLElement,
  shell: HTMLElement
): void {
  clearKeyboardInset(shell);
  frame.style.removeProperty(VISUAL_VIEWPORT_OFFSET_TOP_VAR);
  frame.removeAttribute(KEYBOARD_OPEN_ATTR);
}

/** Keeps mobile keyboard chrome in sync with visualViewport. */
export function useKeyboardInset({
  frameRef,
  shellRef,
}: KeyboardInsetRefs): void {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(MOBILE_KEYBOARD_MEDIA);
    const viewport = window.visualViewport;

    let frame = 0;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const frameEl = frameRef.current;
        const shell = shellRef.current;
        if (!frameEl || !shell) {
          return;
        }

        if (!media.matches) {
          clearMobileKeyboardChrome(frameEl, shell);
          return;
        }

        applyMobileKeyboardChrome(frameEl, shell);
      });
    };

    media.addEventListener('change', sync);
    viewport?.addEventListener('resize', sync);
    viewport?.addEventListener('scroll', sync);
    sync();

    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener('change', sync);
      viewport?.removeEventListener('resize', sync);
      viewport?.removeEventListener('scroll', sync);

      const frameEl = frameRef.current;
      const shell = shellRef.current;
      if (frameEl && shell) {
        clearMobileKeyboardChrome(frameEl, shell);
      }
    };
  }, [frameRef, shellRef]);
}
