import { buildEditorFromExtensions } from '@lexical/extension';
import type { LexicalEditorWithDispose } from 'lexical';

import { createMarkdownEditorExtension } from './extensions';
import { $findAnchorHeadingKey, slugifyHeading } from './heading-anchor';

describe('slugifyHeading', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugifyHeading('My Section')).toBe('my-section');
  });

  it('drops punctuation and collapses hyphens', () => {
    expect(slugifyHeading("What's new -- really?!")).toBe('whats-new-really');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugifyHeading('-- Intro --')).toBe('intro');
  });

  it('returns an empty string for punctuation-only text', () => {
    expect(slugifyHeading('???')).toBe('');
  });
});

describe('$findAnchorHeadingKey', () => {
  function findKey(
    markdown: string,
    slug: string
  ): { editor: LexicalEditorWithDispose; key: string | null } {
    const editor = buildEditorFromExtensions(
      createMarkdownEditorExtension(markdown)
    );
    const key = editor.read(() => $findAnchorHeadingKey(slug));
    return { editor, key };
  }

  it('finds a heading by its slug', () => {
    const { editor, key } = findKey(
      '# Intro\n\n## My Section\n\ntext',
      'my-section'
    );
    expect(key).not.toBeNull();
    editor.dispose();
  });

  it('returns null when no heading matches', () => {
    const { editor, key } = findKey('# Intro', 'missing');
    expect(key).toBeNull();
    editor.dispose();
  });

  it('dedupes repeated headings with -n suffixes', () => {
    const markdown = '## Heading\n\ntext\n\n## Heading\n\nmore';
    const { editor, key } = findKey(markdown, 'heading-1');
    expect(key).not.toBeNull();

    const first = editor.read(() => $findAnchorHeadingKey('heading'));
    expect(first).not.toBeNull();
    expect(first).not.toBe(key);
    editor.dispose();
  });
});
