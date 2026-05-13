import {
  isLocalOrPrivateHostname,
  isSameDocumentLink,
  normalizeSafeImageSrc,
  normalizeSafeLinkHref,
} from './url-safety';

describe('url-safety', () => {
  it('normalizes safe links and rejects executable links', () => {
    expect(normalizeSafeLinkHref('https://example.com/a')).toBe(
      'https://example.com/a'
    );
    expect(normalizeSafeLinkHref('mailto:test@example.com')).toBe(
      'mailto:test@example.com'
    );
    expect(normalizeSafeLinkHref('simplenote://note/abc-123')).toBe(
      'simplenote://note/abc-123'
    );
    expect(normalizeSafeLinkHref('javascript:alert(1)')).toBe(null);
  });

  it('allows only public-looking HTTPS image sources', () => {
    expect(normalizeSafeImageSrc('https://example.com/photo.jpg')).toBe(
      'https://example.com/photo.jpg'
    );
    expect(normalizeSafeImageSrc('http://example.com/photo.jpg')).toBe(null);
    expect(normalizeSafeImageSrc('https://user@example.com/photo.jpg')).toBe(
      null
    );
    expect(normalizeSafeImageSrc('https://localhost/photo.jpg')).toBe(null);
    expect(normalizeSafeImageSrc('https://127.0.0.1/photo.jpg')).toBe(null);
    expect(normalizeSafeImageSrc('https://192.168.1.10/photo.jpg')).toBe(null);
    expect(normalizeSafeImageSrc('data:image/png;base64,abc')).toBe(null);
  });

  it('detects local and private hostnames', () => {
    expect(isLocalOrPrivateHostname('localhost')).toBe(true);
    expect(isLocalOrPrivateHostname('127.0.0.1')).toBe(true);
    expect(isLocalOrPrivateHostname('10.1.2.3')).toBe(true);
    expect(isLocalOrPrivateHostname('172.20.1.1')).toBe(true);
    expect(isLocalOrPrivateHostname('192.168.1.1')).toBe(true);
    expect(isLocalOrPrivateHostname('::1')).toBe(true);
    expect(isLocalOrPrivateHostname('::ffff:7f00:1')).toBe(true);
    expect(isLocalOrPrivateHostname('fe80::1')).toBe(true);
    expect(isLocalOrPrivateHostname('example.com')).toBe(false);
  });

  it('recognizes same-document anchor links', () => {
    expect(
      isSameDocumentLink(
        'http://localhost:4000/#heading',
        'http://localhost:4000/'
      )
    ).toBe(true);
    expect(
      isSameDocumentLink(
        'http://localhost:4000/other#heading',
        'http://localhost:4000/'
      )
    ).toBe(false);
  });
});
