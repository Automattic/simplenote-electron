import { createEditor, $getRoot } from 'lexical';
import {
  ListNode,
  ListItemNode,
  $isListItemNode,
  $isListNode,
} from '@lexical/list';
import { $isLinkNode, LinkNode } from '@lexical/link';
import { $convertToMarkdownString } from '@lexical/markdown';

import { MARKDOWN_TRANSFORMERS, $importMarkdownString } from './extensions';
import { describeListTree } from './list-transformers';

function importMarkdown(markdown: string) {
  const editor = createEditor({ nodes: [ListNode, ListItemNode, LinkNode] });
  editor.update(() => $importMarkdownString(markdown), { discrete: true });
  return editor;
}

describe('mixed nested list markdown import', () => {
  const sample = `- test
  1. nested ol
  2. nested ol
- outer ul
  - [ ] todo nested`;

  it('parses mixed nested lists into a single root list tree per top-level item group', () => {
    const editor = importMarkdown(sample);
    editor.getEditorState().read(() => {
      expect($getRoot().getChildrenSize()).toBe(1);
      expect(describeListTree($getRoot().getChildren())).toMatchInlineSnapshot(`
        "bullet
          item: "test"
          item: ""
            number
              item: "nested ol"
              item: "nested ol"
          item: "outer ul"
          item: ""
            check
              item: "todo nested""
      `);
    });
  });

  it('round-trips without flattening nested list types', () => {
    const editor = importMarkdown(sample);
    editor.getEditorState().read(() => {
      const roundtrip = $convertToMarkdownString(MARKDOWN_TRANSFORMERS);
      expect(roundtrip).toContain('1. nested ol');
      expect(roundtrip).toContain('- [ ] todo nested');

      const rootList = $getRoot().getFirstChild();
      expect($isListNode(rootList)).toBe(true);
      const nestedOl = rootList
        ?.getChildren()
        .flatMap((item) => item.getChildren())
        .find($isListNode);
      expect(nestedOl?.getListType()).toBe('number');

      const nestedCheck = $getRoot()
        .getFirstChild()
        ?.getChildren()
        .flatMap((item) => item.getChildren())
        .filter($isListNode)
        .find((list) => list.getListType() === 'check');
      expect(nestedCheck?.getListType()).toBe('check');
    });
  });

  it('round-trips escaped asterisks in checklist item text', () => {
    const markdown = '- [ ] Pending with \\* label';
    const editor = importMarkdown(markdown);
    editor.getEditorState().read(() => {
      expect($convertToMarkdownString(MARKDOWN_TRANSFORMERS)).toBe(markdown);
    });
  });

  it('round-trips long backslash runs before asterisks in checklist items', () => {
    const backslashes = '\\'.repeat(64);
    const markdown = `- [ ] Pending with ${backslashes}\\* label`;
    const editor = importMarkdown(markdown);
    editor.getEditorState().read(() => {
      expect($convertToMarkdownString(MARKDOWN_TRANSFORMERS)).toBe(markdown);
    });
  });

  it('parses inline links in list item text', () => {
    const editor = importMarkdown('- [test in list](#link)');
    editor.getEditorState().read(() => {
      const listItem = $getRoot().getFirstChild()?.getFirstChild();
      expect($isListItemNode(listItem)).toBe(true);

      const link = listItem
        ?.getChildren()
        .find((child) => !$isListNode(child) && $isLinkNode(child));
      expect(link).toBeDefined();
      expect(link?.getTextContent()).toBe('test in list');
      expect(link?.getURL()).toBe('#link');
    });
  });
});
