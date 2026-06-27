import { $convertToMarkdownString } from '@lexical/markdown';
import { $isLinkNode } from '@lexical/link';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type LexicalEditorWithDispose,
} from 'lexical';

import { MARKDOWN_TRANSFORMERS } from '../extensions/index';
import {
  importMarkdown,
  makeGfmTestEditor,
} from '../markdown/gfm-test-helpers';
import {
  $getLinkAtSelection,
  $removeLink,
  $selectLinkNode,
  $updateLink,
  normalizeEditableLinkUrl,
} from './link-edit';
import { $findMatchingParent } from 'lexical';

function selectTextNode(
  editor: LexicalEditorWithDispose,
  text: string,
  offset = 0
) {
  editor.update(
    () => {
      const root = $getRoot();
      const walk = (node: typeof root): boolean => {
        if (node.getType() === 'text' && node.getTextContent() === text) {
          node.select(offset, offset);
          return true;
        }
        if ('getChildren' in node) {
          for (const child of node.getChildren()) {
            if (walk(child as typeof root)) {
              return true;
            }
          }
        }
        return false;
      };
      walk(root);
    },
    { discrete: true }
  );
}

describe('normalizeEditableLinkUrl', () => {
  it('accepts anchor links', () => {
    expect(normalizeEditableLinkUrl('#my-section')).toBe('#my-section');
  });

  it('accepts https links', () => {
    expect(normalizeEditableLinkUrl('https://example.com')).toBe(
      'https://example.com'
    );
  });
});

describe('link edit helpers', () => {
  it('returns the link when the selection is inside one link', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '[site](https://example.com)');
    selectTextNode(editor, 'site', 1);

    editor.read(() => {
      expect($getLinkAtSelection()?.getURL()).toBe('https://example.com');
    });
    editor.dispose();
  });

  it('selects the full link text', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '[site](https://example.com)');

    let selected = false;
    editor.update(
      () => {
        const link = $getRoot()
          .getChildren()[0]
          .getChildren()
          .find($isLinkNode);
        if (link) {
          $selectLinkNode(link);
          selected = true;
        }
      },
      { discrete: true }
    );
    expect(selected).toBe(true);

    expect(
      editor.read(() => {
        const selection = $getSelection();
        return $isRangeSelection(selection) ? selection.getTextContent() : null;
      })
    ).toBe('site');
    editor.dispose();
  });

  it('returns false for an invalid url without changing the link', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '[site](https://example.com)');

    let updated = false;
    editor.update(
      () => {
        const link = $findMatchingParent(
          $getRoot().getFirstDescendant()!,
          $isLinkNode
        )!;
        updated = $updateLink(link, {
          text: 'site',
          url: 'javascript:alert(1)',
        });
      },
      { discrete: true }
    );

    expect(updated).toBe(false);
    expect(
      editor.read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS))
    ).toBe('[site](https://example.com)');
    editor.dispose();
  });

  it('updates link text and url', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '[site](https://example.com)');

    let updated = false;
    editor.update(
      () => {
        const link = $findMatchingParent(
          $getRoot().getFirstDescendant()!,
          $isLinkNode
        )!;
        updated = $updateLink(link, {
          text: 'Example',
          url: 'https://example.org',
        });
      },
      { discrete: true }
    );
    expect(updated).toBe(true);

    expect(
      editor.read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS))
    ).toBe('[Example](https://example.org)');
    editor.dispose();
  });

  it('removes a link while keeping its text', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '[site](https://example.com)');

    editor.update(
      () => {
        const link = $findMatchingParent(
          $getRoot().getFirstDescendant()!,
          $isLinkNode
        )!;
        $removeLink(link);
      },
      { discrete: true }
    );

    expect(
      editor.read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS))
    ).toBe('site');
    editor.dispose();
  });
});
