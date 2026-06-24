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

describe('measureKeyboardInset', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 800,
        offsetTop: 0,
      },
    });
  });

  it('returns zero when the keyboard is closed', () => {
    expect(measureKeyboardInset()).toBe(0);
  });

  it('returns the obscured height when the keyboard is open', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 450,
        offsetTop: 0,
      },
    });

    expect(measureKeyboardInset()).toBe(350);
  });

  it('accounts for visual viewport offset', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 500,
        offsetTop: 50,
      },
    });

    expect(measureKeyboardInset()).toBe(250);
  });
});

describe('getKeyboardInsetForPadding', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
  });

  it('returns zero when the keyboard is closed', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 800,
        offsetTop: 0,
      },
    });

    expect(getKeyboardInsetForPadding()).toBe(0);
  });

  it('adds the Safari input accessory bar when the keyboard is open', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 450,
        offsetTop: 0,
      },
    });

    expect(getKeyboardInsetForPadding()).toBe(
      350 + MOBILE_INPUT_ACCESSORY_BAR_PX
    );
  });
});

describe('getVisualViewportOffsetTop', () => {
  it('returns zero when offsetTop is zero', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 800,
        offsetTop: 0,
      },
    });

    expect(getVisualViewportOffsetTop()).toBe(0);
  });

  it('returns visualViewport.offsetTop', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 500,
        offsetTop: 42,
      },
    });

    expect(getVisualViewportOffsetTop()).toBe(42);
  });
});

describe('applyMobileKeyboardChrome', () => {
  it('sets scroll padding and viewport pin state when the keyboard is open', () => {
    const frame = document.createElement('div');
    const shell = document.createElement('div');
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 450,
        offsetTop: 60,
      },
    });

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
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 800,
        offsetTop: 0,
      },
    });

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
  it('writes the measured inset as a CSS variable', () => {
    const element = document.createElement('div');
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 400,
        offsetTop: 0,
      },
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });

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
