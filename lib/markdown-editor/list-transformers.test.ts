import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  createEditor,
} from 'lexical';
import {
  ListNode,
  ListItemNode,
  $isListItemNode,
  $isListNode,
} from '@lexical/list';
import { $isLinkNode, LinkNode } from '@lexical/link';
import {
  $convertToMarkdownString,
  CHECK_LIST,
  HEADING,
  LINK,
  ORDERED_LIST,
  registerMarkdownShortcuts,
  UNORDERED_LIST,
} from '@lexical/markdown';

import { MARKDOWN_TRANSFORMERS, $importMarkdownString } from './extensions';
import {
  describeListTree,
  MIXED_NESTED_CHECK_LIST,
  MIXED_NESTED_ORDERED_LIST,
  MIXED_NESTED_UNORDERED_LIST,
  registerTaskListItemShortcuts,
  withMixedNestedListTransformers,
} from './list-transformers';

function importMarkdown(markdown: string) {
  const editor = createEditor({
    nodes: [ListNode, ListItemNode, LinkNode],
    onError: (error) => {
      throw error;
    },
  });
  editor.update(() => $importMarkdownString(markdown), { discrete: true });
  return editor;
}

function makeEditorWithShortcuts() {
  const editor = createEditor({
    nodes: [ListNode, ListItemNode, LinkNode],
    onError: (error) => {
      throw error;
    },
  });
  registerMarkdownShortcuts(editor, [
    MIXED_NESTED_CHECK_LIST,
    MIXED_NESTED_UNORDERED_LIST,
    MIXED_NESTED_ORDERED_LIST,
  ]);
  registerTaskListItemShortcuts(editor);
  return editor;
}

async function typeText(editor: ReturnType<typeof createEditor>, text: string) {
  for (const char of text) {
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(char);
        }
      },
      { discrete: true }
    );
  }

  await Promise.resolve();
}

async function typeAtLineStart(
  editor: ReturnType<typeof createEditor>,
  shortcut: string
) {
  editor.update(
    () => {
      $getRoot().clear();
      const paragraph = $createParagraphNode();
      $getRoot().append(paragraph);
      paragraph.selectStart();
    },
    { discrete: true }
  );

  for (const char of shortcut) {
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(char);
        }
      },
      { discrete: true }
    );
  }

  // Shortcut transforms run in a follow-up microtask.
  await Promise.resolve();
}

function expectReplaceCreatesList(
  transformer: typeof MIXED_NESTED_UNORDERED_LIST,
  markdown: string,
  listType: 'bullet' | 'number' | 'check'
) {
  const editor = createEditor({
    nodes: [ListNode, ListItemNode],
    onError: (error) => {
      throw error;
    },
  });

  editor.update(() => {
    const parent = $createParagraphNode();
    $getRoot().append(parent);
    const textNode = $createTextNode(markdown);
    parent.append(textNode);

    const match = markdown.match(transformer.regExp);
    expect(match).not.toBeNull();
    expect(transformer.replace(parent, [textNode], match!, false)).not.toBe(
      false
    );

    const list = $getRoot().getFirstChild();
    expect($isListNode(list)).toBe(true);
    if (!$isListNode(list)) {
      return;
    }
    expect(list.getListType()).toBe(listType);
  });
}

function expectReplaceSkipsImport(
  transformer: typeof MIXED_NESTED_UNORDERED_LIST,
  markdown: string
) {
  const editor = createEditor({
    nodes: [ListNode, ListItemNode],
    onError: (error) => {
      throw error;
    },
  });

  editor.update(() => {
    const parent = $createParagraphNode();
    $getRoot().append(parent);
    const match = markdown.match(transformer.regExp);
    expect(match).not.toBeNull();
    expect(transformer.replace(parent, [], match!, true)).toBe(false);
  });
}

describe('MIXED_NESTED_UNORDERED_LIST', () => {
  it('imports a flat bullet list', () => {
    const editor = importMarkdown('- one\n- two');
    editor.getEditorState().read(() => {
      expect(describeListTree($getRoot().getChildren())).toMatchInlineSnapshot(`
        "bullet
          item: "one"
          item: "two""
      `);
    });
  });

  it('imports nested bullet items under a single root list', () => {
    const editor = importMarkdown('- one\n  - nested');
    editor.getEditorState().read(() => {
      expect(describeListTree($getRoot().getChildren())).toMatchInlineSnapshot(`
        "bullet
          item: "one"
          item: ""
            bullet
              item: "nested""
      `);
    });
  });

  it('round-trips a flat bullet list', () => {
    const markdown = '- one\n- two';
    const editor = importMarkdown(markdown);
    editor.getEditorState().read(() => {
      expect($convertToMarkdownString(MARKDOWN_TRANSFORMERS)).toBe(markdown);
    });
  });

  it('creates a bullet list from the "- " markdown shortcut', async () => {
    const editor = makeEditorWithShortcuts();
    await typeAtLineStart(editor, '- ');

    editor.getEditorState().read(() => {
      const list = $getRoot().getFirstChild();
      expect($isListNode(list)).toBe(true);
      if ($isListNode(list)) {
        expect(list.getListType()).toBe('bullet');
      }
    });
  });

  it('delegates replace when typing and skips replace during import', () => {
    expectReplaceCreatesList(MIXED_NESTED_UNORDERED_LIST, '- item', 'bullet');
    expectReplaceSkipsImport(MIXED_NESTED_UNORDERED_LIST, '- item');
  });
});

describe('MIXED_NESTED_ORDERED_LIST', () => {
  it('imports a flat ordered list', () => {
    const editor = importMarkdown('1. one\n2. two');
    editor.getEditorState().read(() => {
      expect(describeListTree($getRoot().getChildren())).toMatchInlineSnapshot(`
        "number
          item: "one"
          item: "two""
      `);
    });
  });

  it('imports nested ordered items under a single root list', () => {
    const editor = importMarkdown('1. one\n  1. nested');
    editor.getEditorState().read(() => {
      expect(describeListTree($getRoot().getChildren())).toMatchInlineSnapshot(`
        "number
          item: "one"
          item: ""
            number
              item: "nested""
      `);
    });
  });

  it('round-trips a flat ordered list', () => {
    const markdown = '1. one\n2. two';
    const editor = importMarkdown(markdown);
    editor.getEditorState().read(() => {
      expect($convertToMarkdownString(MARKDOWN_TRANSFORMERS)).toBe(markdown);
    });
  });

  it('creates an ordered list from the "1. " markdown shortcut', async () => {
    const editor = makeEditorWithShortcuts();
    await typeAtLineStart(editor, '1. ');

    editor.getEditorState().read(() => {
      const list = $getRoot().getFirstChild();
      expect($isListNode(list)).toBe(true);
      if ($isListNode(list)) {
        expect(list.getListType()).toBe('number');
      }
    });
  });

  it('delegates replace when typing and skips replace during import', () => {
    expectReplaceCreatesList(MIXED_NESTED_ORDERED_LIST, '1. item', 'number');
    expectReplaceSkipsImport(MIXED_NESTED_ORDERED_LIST, '1. item');
  });
});

describe('MIXED_NESTED_CHECK_LIST', () => {
  it('imports checked and unchecked checklist items', () => {
    const editor = importMarkdown('- [ ] todo\n- [x] done');
    editor.getEditorState().read(() => {
      const list = $getRoot().getFirstChild();
      expect($isListNode(list)).toBe(true);
      if (!$isListNode(list)) {
        return;
      }
      expect(list.getListType()).toBe('check');

      const items = list.getChildren();
      expect(items).toHaveLength(2);
      const firstItem = items[0];
      const secondItem = items[1];
      expect($isListItemNode(firstItem)).toBe(true);
      expect($isListItemNode(secondItem)).toBe(true);
      if ($isListItemNode(firstItem) && $isListItemNode(secondItem)) {
        expect(firstItem.getChecked()).toBe(false);
        expect(secondItem.getChecked()).toBe(true);
      }
    });
  });

  it('round-trips checked and unchecked checklist items', () => {
    const markdown = '- [ ] todo\n- [x] done';
    const editor = importMarkdown(markdown);
    editor.getEditorState().read(() => {
      expect($convertToMarkdownString(MARKDOWN_TRANSFORMERS)).toBe(markdown);
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

  it('delegates replace when typing and skips replace during import', () => {
    expectReplaceCreatesList(MIXED_NESTED_CHECK_LIST, '- [ ] todo', 'check');
    expectReplaceSkipsImport(MIXED_NESTED_CHECK_LIST, '- [ ] todo');
  });
});

describe('task list item shortcuts', () => {
  async function startListThenTypeMarker(
    editor: ReturnType<typeof makeEditorWithShortcuts>,
    listShortcut: string,
    marker: string
  ) {
    await typeAtLineStart(editor, listShortcut);
    await typeText(editor, marker);
  }

  it.each([
    ['- ', '[] '],
    ['- ', '[ ] '],
    ['1. ', '[] '],
    ['1. ', '[ ] '],
  ])(
    'converts a list started with %j into a task list when typing %j',
    async (listShortcut, marker) => {
      const editor = makeEditorWithShortcuts();
      await startListThenTypeMarker(editor, listShortcut, marker);

      editor.getEditorState().read(() => {
        const list = $getRoot().getFirstChild();
        expect($isListNode(list)).toBe(true);
        if (!$isListNode(list)) {
          return;
        }
        expect(list.getListType()).toBe('check');

        const listItem = list.getFirstChild();
        expect($isListItemNode(listItem)).toBe(true);
        if ($isListItemNode(listItem)) {
          expect(listItem.getChecked()).toBe(false);
          expect(listItem.getTextContent()).toBe('');
        }

        expect($convertToMarkdownString(MARKDOWN_TRANSFORMERS)).toBe('- [ ] ');
      });
    }
  );
});

describe('withMixedNestedListTransformers', () => {
  it('substitutes mixed nested list transformers for the stock list transformers', () => {
    const input = [HEADING, CHECK_LIST, LINK, UNORDERED_LIST, ORDERED_LIST];
    const output = withMixedNestedListTransformers(input);

    expect(output).toHaveLength(input.length);
    expect(output[0]).toBe(HEADING);
    expect(output[1]).toBe(MIXED_NESTED_CHECK_LIST);
    expect(output[2]).toBe(LINK);
    expect(output[3]).toBe(MIXED_NESTED_UNORDERED_LIST);
    expect(output[4]).toBe(MIXED_NESTED_ORDERED_LIST);
  });

  it('leaves non-list transformers unchanged', () => {
    const input = [HEADING, LINK];
    expect(withMixedNestedListTransformers(input)).toEqual(input);
  });
});

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
