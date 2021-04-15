import normalizeLineBreak from '../normalize-line-break';

describe('Normalize line break', () => {
  const text = 'Line 1\nLine 2\r\nLine 3\n\r\nLine 5\r\n\nLine 5';
  const normalizedText =
    'Line 1\r\nLine 2\r\nLine 3\r\n\r\nLine 5\r\n\r\nLine 5';

  it('should convert LF to CRLF', () => {
    expect(normalizeLineBreak(text)).toBe(normalizedText);
  });
});
