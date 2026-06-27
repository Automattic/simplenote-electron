import {
  applyKeyboardInset,
  applyMobileKeyboardChrome,
  clearKeyboardInset,
  clearMobileKeyboardChrome,
  getKeyboardInsetForPadding,
  getVisualViewportOffsetTop,
  KEYBOARD_INSET_VAR,
  KEYBOARD_OPEN_ATTR,
  measureKeyboardInset,
  MOBILE_INPUT_ACCESSORY_BAR_PX,
  VISUAL_VIEWPORT_OFFSET_TOP_VAR,
} from './keyboard-inset';

type MockVisualViewport = {
  height: number;
  offsetTop: number;
};

// Node 20 (CI) rejects a second defineProperty on window.visualViewport; install
// once per test via delete + define, then mutate the shared viewport object.
function installWindowLayout(
  innerHeight: number,
  viewport: MockVisualViewport
): void {
  delete (window as Window & { innerHeight?: number }).innerHeight;
  delete (window as Window & { visualViewport?: MockVisualViewport })
    .visualViewport;

  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: innerHeight,
  });
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: viewport,
  });
}

describe('measureKeyboardInset', () => {
  const viewport = { height: 800, offsetTop: 0 };

  beforeEach(() => {
    viewport.height = 800;
    viewport.offsetTop = 0;
    installWindowLayout(800, viewport);
  });

  it('returns zero when the keyboard is closed', () => {
    expect(measureKeyboardInset()).toBe(0);
  });

  it('returns the obscured height when the keyboard is open', () => {
    viewport.height = 450;

    expect(measureKeyboardInset()).toBe(350);
  });

  it('accounts for visual viewport offset', () => {
    viewport.height = 500;
    viewport.offsetTop = 50;

    expect(measureKeyboardInset()).toBe(250);
  });
});

describe('getKeyboardInsetForPadding', () => {
  const viewport = { height: 800, offsetTop: 0 };

  beforeEach(() => {
    viewport.height = 800;
    viewport.offsetTop = 0;
    installWindowLayout(800, viewport);
  });

  it('returns zero when the keyboard is closed', () => {
    expect(getKeyboardInsetForPadding()).toBe(0);
  });

  it('adds the Safari input accessory bar when the keyboard is open', () => {
    viewport.height = 450;

    expect(getKeyboardInsetForPadding()).toBe(
      350 + MOBILE_INPUT_ACCESSORY_BAR_PX
    );
  });
});

describe('getVisualViewportOffsetTop', () => {
  const viewport = { height: 800, offsetTop: 0 };

  beforeEach(() => {
    viewport.height = 800;
    viewport.offsetTop = 0;
    installWindowLayout(800, viewport);
  });

  it('returns zero when offsetTop is zero', () => {
    expect(getVisualViewportOffsetTop()).toBe(0);
  });

  it('returns visualViewport.offsetTop', () => {
    viewport.offsetTop = 42;

    expect(getVisualViewportOffsetTop()).toBe(42);
  });
});

describe('applyMobileKeyboardChrome', () => {
  const viewport = { height: 800, offsetTop: 0 };

  it('sets scroll padding and viewport pin state when the keyboard is open', () => {
    const frame = document.createElement('div');
    const shell = document.createElement('div');
    viewport.height = 450;
    viewport.offsetTop = 60;
    installWindowLayout(800, viewport);

    applyMobileKeyboardChrome(frame, shell);

    expect(shell.style.getPropertyValue(KEYBOARD_INSET_VAR)).toBe(
      `${290 + MOBILE_INPUT_ACCESSORY_BAR_PX}px`
    );
    expect(frame.style.getPropertyValue(VISUAL_VIEWPORT_OFFSET_TOP_VAR)).toBe(
      '60px'
    );
    expect(frame.hasAttribute(KEYBOARD_OPEN_ATTR)).toBe(true);
  });

  it('clears chrome when the keyboard is closed', () => {
    const frame = document.createElement('div');
    const shell = document.createElement('div');
    frame.setAttribute(KEYBOARD_OPEN_ATTR, '');
    frame.style.setProperty(VISUAL_VIEWPORT_OFFSET_TOP_VAR, '60px');
    viewport.height = 800;
    viewport.offsetTop = 0;
    installWindowLayout(800, viewport);

    applyMobileKeyboardChrome(frame, shell);

    expect(shell.style.getPropertyValue(KEYBOARD_INSET_VAR)).toBe('0px');
    expect(frame.style.getPropertyValue(VISUAL_VIEWPORT_OFFSET_TOP_VAR)).toBe(
      ''
    );
    expect(frame.hasAttribute(KEYBOARD_OPEN_ATTR)).toBe(false);
  });
});

describe('clearMobileKeyboardChrome', () => {
  it('removes inset, offset, and keyboard-open state', () => {
    const frame = document.createElement('div');
    const shell = document.createElement('div');
    frame.setAttribute(KEYBOARD_OPEN_ATTR, '');
    frame.style.setProperty(VISUAL_VIEWPORT_OFFSET_TOP_VAR, '60px');
    shell.style.setProperty(KEYBOARD_INSET_VAR, '200px');

    clearMobileKeyboardChrome(frame, shell);

    expect(shell.style.getPropertyValue(KEYBOARD_INSET_VAR)).toBe('0px');
    expect(frame.style.getPropertyValue(VISUAL_VIEWPORT_OFFSET_TOP_VAR)).toBe(
      ''
    );
    expect(frame.hasAttribute(KEYBOARD_OPEN_ATTR)).toBe(false);
  });
});

describe('applyKeyboardInset', () => {
  const viewport = { height: 400, offsetTop: 0 };

  it('writes the measured inset as a CSS variable', () => {
    const element = document.createElement('div');
    installWindowLayout(800, viewport);

    applyKeyboardInset(element);

    expect(element.style.getPropertyValue(KEYBOARD_INSET_VAR)).toBe(
      `${400 + MOBILE_INPUT_ACCESSORY_BAR_PX}px`
    );
  });

  it('clears the inset to zero', () => {
    const element = document.createElement('div');
    element.style.setProperty(KEYBOARD_INSET_VAR, '200px');

    clearKeyboardInset(element);

    expect(element.style.getPropertyValue(KEYBOARD_INSET_VAR)).toBe('0px');
  });
});
