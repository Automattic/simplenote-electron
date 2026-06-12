import {
  LEXICAL_CLIPBOARD_JSON_PREFIX,
  parseNamespacedLexicalClipboardJson,
  stripLexicalClipboardJsonPrefix,
  wrapLexicalClipboardJsonPrefix,
} from './clipboard-lexical-json';

describe('clipboard Lexical JSON prefix', () => {
  const payload = {
    namespace: 'SimplenoteMarkdownEditor',
    nodes: [{ type: 'paragraph', version: 1 }],
  };
  const json = JSON.stringify(payload);

  it('wraps and strips the export prefix', () => {
    expect(wrapLexicalClipboardJsonPrefix(json)).toBe(
      `${LEXICAL_CLIPBOARD_JSON_PREFIX}${json}`
    );
    expect(
      stripLexicalClipboardJsonPrefix(`${LEXICAL_CLIPBOARD_JSON_PREFIX}${json}`)
    ).toBe(json);
  });

  it('parses namespaced payloads with or without the prefix', () => {
    expect(
      parseNamespacedLexicalClipboardJson(json, 'SimplenoteMarkdownEditor')
    ).toEqual(payload);
    expect(
      parseNamespacedLexicalClipboardJson(
        wrapLexicalClipboardJsonPrefix(json),
        'SimplenoteMarkdownEditor'
      )
    ).toEqual(payload);
  });

  it('returns null for invalid or mismatched payloads', () => {
    expect(
      parseNamespacedLexicalClipboardJson(
        'PREFIX{}',
        'SimplenoteMarkdownEditor'
      )
    ).toBeNull();
    expect(parseNamespacedLexicalClipboardJson(json, 'OtherEditor')).toBeNull();
    expect(
      parseNamespacedLexicalClipboardJson(
        wrapLexicalClipboardJsonPrefix(
          JSON.stringify({
            namespace: 'SimplenoteMarkdownEditor',
            nodes: [{ type: 'paragraph' }],
          })
        ),
        'SimplenoteMarkdownEditor'
      )
    ).toBeNull();
  });
});
