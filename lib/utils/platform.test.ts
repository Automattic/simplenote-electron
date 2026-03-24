import {
  canUseMonacoContextMenu,
  canUseMonacoPasteShortcut,
  isFirefoxUserAgent,
  isSafariUserAgent,
} from './platform';

describe('platform user-agent detection', () => {
  it('detects Firefox user agents', () => {
    expect(
      isFirefoxUserAgent(
        'Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0'
      )
    ).toBe(true);
  });

  it('detects Firefox for iOS user agents', () => {
    expect(
      isFirefoxUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/150.0 Mobile/15E148 Safari/605.1.15'
      )
    ).toBe(true);
  });

  it('does not detect Chromium as Firefox', () => {
    expect(
      isFirefoxUserAgent(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });

  it('keeps Safari detection separate from Chromium', () => {
    expect(
      isSafariUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
      )
    ).toBe(true);
    expect(
      isSafariUserAgent(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });

  it('disables Monaco paste shortcut in Firefox web mode', () => {
    expect(
      canUseMonacoPasteShortcut(
        false,
        'Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0'
      )
    ).toBe(false);
  });

  it('keeps Monaco paste shortcut enabled in Electron mode', () => {
    expect(
      canUseMonacoPasteShortcut(
        true,
        'Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0'
      )
    ).toBe(true);
  });

  it('keeps Monaco paste shortcut enabled outside Firefox web mode', () => {
    expect(
      canUseMonacoPasteShortcut(
        false,
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
      )
    ).toBe(true);
  });

  it('disables Monaco context menu in Firefox web mode', () => {
    expect(
      canUseMonacoContextMenu(
        false,
        'Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0'
      )
    ).toBe(false);
  });

  it('keeps Monaco context menu enabled in Electron mode', () => {
    expect(
      canUseMonacoContextMenu(
        true,
        'Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0'
      )
    ).toBe(true);
  });

  it('keeps Monaco context menu enabled outside Firefox web mode', () => {
    expect(
      canUseMonacoContextMenu(
        false,
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
      )
    ).toBe(true);
  });
});
