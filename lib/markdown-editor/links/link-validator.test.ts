import {
  isAllowedLinkHref,
  normalizeLinkHref,
  urlFromText,
} from './link-validator';

describe('isAllowedLinkHref', () => {
  it.each([
    'https://example.com',
    'http://example.com/path',
    'mailto:user@example.com',
    'simplenote://note/abc-123',
  ])('allows %s', (href) => {
    expect(isAllowedLinkHref(href)).toBe(true);
  });

  it.each(['javascript:alert(1)', 'data:text/html,evil', ''])(
    'rejects %s',
    (href) => {
      expect(isAllowedLinkHref(href)).toBe(false);
    }
  );
});

describe('normalizeLinkHref', () => {
  it('preserves simplenote note links', () => {
    expect(normalizeLinkHref('simplenote://note/abc-123')).toBe(
      'simplenote://note/abc-123'
    );
  });

  it('normalizes safe http links', () => {
    expect(normalizeLinkHref('https://example.com')).toBe(
      'https://example.com'
    );
  });

  it('rejects unsafe schemes', () => {
    expect(normalizeLinkHref('javascript:alert(1)')).toBe(null);
  });
});

describe('urlFromText', () => {
  it.each([
    ['https://example.com', 'https://example.com'],
    ['http://example.com/path?q=1', 'http://example.com/path?q=1'],
    ['  https://example.com  ', 'https://example.com'],
    ['mailto:user@example.com', 'mailto:user@example.com'],
    ['simplenote://note/abc-123', 'simplenote://note/abc-123'],
    ['example.com', 'https://example.com'],
    ['sub.example.com/path', 'https://sub.example.com/path'],
  ])('detects %s', (text, expected) => {
    expect(urlFromText(text)).toBe(expected);
  });

  it.each([
    [''],
    ['   '],
    ['just some words'],
    ['https://exa mple.com'],
    ['hello'],
    ['v1.2'],
  ])('rejects %s', (text) => {
    expect(urlFromText(text)).toBe(null);
  });
});
