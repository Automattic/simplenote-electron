import { urlFromText } from './link-validator';

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
