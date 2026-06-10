import { estimateLineCount } from './large-document-extension';

describe('estimateLineCount', () => {
  it('counts one line for short single-line text', () => {
    expect(estimateLineCount('hello', 80)).toBe(1);
  });

  it('counts empty text as one line', () => {
    expect(estimateLineCount('', 80)).toBe(1);
  });

  it('counts hard line breaks', () => {
    expect(estimateLineCount('one\ntwo\nthree', 80)).toBe(3);
  });

  it('adds wrapped lines for long content', () => {
    expect(estimateLineCount('x'.repeat(200), 80)).toBe(3);
  });

  it('combines hard breaks and wrapping', () => {
    const text = `${'x'.repeat(100)}\nshort\n${'y'.repeat(160)}`;
    expect(estimateLineCount(text, 80)).toBe(2 + 1 + 2);
  });

  it('never wraps when charsPerLine is Infinity (white-space: pre)', () => {
    expect(estimateLineCount('x'.repeat(500), Infinity)).toBe(1);
    expect(estimateLineCount(`${'x'.repeat(500)}\ny`, Infinity)).toBe(2);
  });
});
