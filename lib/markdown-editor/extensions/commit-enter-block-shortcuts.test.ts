import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
} from 'lexical';
import { $isHorizontalRuleNode } from '@lexical/extension';
import { $isListNode } from '@lexical/list';

import { $commitTriggerOnEnterBlockShortcut } from './commit-enter-block-shortcuts';
import {
  flushEditorUpdates,
  selectTextNode,
} from './block-cursor-test-helpers';
import { $markdownToNodes } from '../markdown/import-export';
import {
  contentRootChildren,
  makeGfmTestEditor,
} from '../markdown/gfm-test-helpers';

function setupParagraphWithSoftLineBreak(
  firstLine: string,
  secondLine: string
): void {
  const root = $getRoot();
  root.clear();
  const paragraph = $createParagraphNode();
  paragraph.append($createTextNode(firstLine));
  paragraph.append($createLineBreakNode());
  paragraph.append($createTextNode(secondLine));
  root.append(paragraph);
}

function setupUncommittedHorizontalRuleAboveList(
  editor: ReturnType<typeof makeGfmTestEditor>
): void {
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode('---'));
      root.append(paragraph);
      for (const node of $markdownToNodes('- item')) {
        root.append(node);
      }
      paragraph.selectEnd();
    },
    { discrete: true }
  );
}

describe('$commitTriggerOnEnterBlockShortcut', () => {
  it('replaces a trigger-only paragraph with a HorizontalRuleNode', async () => {
    const editor = makeGfmTestEditor();

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode('---'));
      root.append(paragraph);
      const result = $commitTriggerOnEnterBlockShortcut(paragraph);
      expect(result).toBe('---');
      expect(root.getChildrenSize()).toBe(1);
      expect($isHorizontalRuleNode(root.getFirstChild())).toBe(true);
    });

    await flushEditorUpdates(editor);

    editor.getEditorState().read(() => {
      expect($getRoot().getChildrenSize()).toBe(1);
      const children = contentRootChildren(editor);
      expect(children).toHaveLength(1);
      expect($isHorizontalRuleNode(children[0])).toBe(true);
    });

    editor.dispose();
  });

  it('commits a trigger-only line within a multi-line paragraph', async () => {
    const editor = makeGfmTestEditor();

    editor.update(() => {
      setupParagraphWithSoftLineBreak('---', 'jlkjkl');
      const result = $commitTriggerOnEnterBlockShortcut(
        $getRoot().getFirstChild()!
      );
      expect(result).toBe('---\njlkjkl');
    });

    await flushEditorUpdates(editor);

    editor.getEditorState().read(() => {
      const children = contentRootChildren(editor);
      expect(children).toHaveLength(2);
      expect($isHorizontalRuleNode(children[0])).toBe(true);
      expect($isParagraphNode(children[1])).toBe(true);
      expect(children[1]?.getTextContent()).toBe('jlkjkl');
    });

    editor.dispose();
  });

  it('ignores paragraphs that are not trigger-only', async () => {
    const editor = makeGfmTestEditor();

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode('--- still typing'));
      root.append(paragraph);
      expect($commitTriggerOnEnterBlockShortcut(paragraph)).toBeNull();
    });

    await flushEditorUpdates(editor);

    editor.getEditorState().read(() => {
      expect($isParagraphNode(contentRootChildren(editor)[0])).toBe(true);
    });

    editor.dispose();
  });
});

describe('commit enter block shortcuts on leave', () => {
  it('commits --- when selection moves to a list without Enter', async () => {
    const editor = makeGfmTestEditor();
    setupUncommittedHorizontalRuleAboveList(editor);
    await flushEditorUpdates(editor);

    selectTextNode(editor, 'item', 0);
    await flushEditorUpdates(editor);

    editor.getEditorState().read(() => {
      const children = contentRootChildren(editor);
      expect($isHorizontalRuleNode(children[0])).toBe(true);
      expect($isListNode(children[1])).toBe(true);
      expect(children[1]?.getTextContent()).toBe('item');
    });

    editor.dispose();
  });

  it('commits --- when moving selection into a code block without Enter', async () => {
    const editor = makeGfmTestEditor();

    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('---'));
        root.append(paragraph);
        for (const node of $markdownToNodes('```\ncode\n```\n- item')) {
          root.append(node);
        }
        paragraph.selectEnd();
      },
      { discrete: true }
    );
    await flushEditorUpdates(editor);

    selectTextNode(editor, 'code', 0);
    await flushEditorUpdates(editor);

    editor.getEditorState().read(() => {
      const children = contentRootChildren(editor);
      expect($isHorizontalRuleNode(children[0])).toBe(true);
      expect(children[1]?.getTextContent()).toBe('code');
      expect($isListNode(children[2])).toBe(true);
    });

    editor.dispose();
  });

  it('commits --- on the first soft line when leaving the paragraph', async () => {
    const editor = makeGfmTestEditor();

    editor.update(
      () => {
        setupParagraphWithSoftLineBreak('---', 'jlkjkl');
        for (const node of $markdownToNodes('- item')) {
          $getRoot().append(node);
        }
        $getRoot().getFirstChild()?.selectEnd();
      },
      { discrete: true }
    );
    await flushEditorUpdates(editor);

    selectTextNode(editor, 'item', 0);
    await flushEditorUpdates(editor);

    editor.getEditorState().read(() => {
      const children = contentRootChildren(editor);
      expect($isHorizontalRuleNode(children[0])).toBe(true);
      expect(children[1]?.getTextContent()).toBe('jlkjkl');
      expect($isListNode(children[2])).toBe(true);
    });

    editor.dispose();
  });

  it('does not split a soft-line paragraph when leaving for a list', async () => {
    const editor = makeGfmTestEditor();

    editor.update(
      () => {
        setupParagraphWithSoftLineBreak('one', 'two');
        for (const node of $markdownToNodes('- item')) {
          $getRoot().append(node);
        }
        $getRoot().getFirstChild()?.selectEnd();
      },
      { discrete: true }
    );
    await flushEditorUpdates(editor);

    selectTextNode(editor, 'item', 0);
    await flushEditorUpdates(editor);

    editor.getEditorState().read(() => {
      const children = contentRootChildren(editor);
      expect(children).toHaveLength(2);
      expect($isParagraphNode(children[0])).toBe(true);
      expect(children[0]?.getTextContent()).toBe('one\ntwo');
      expect($isListNode(children[1])).toBe(true);
    });

    editor.dispose();
  });

  it('does not commit when the paragraph is not trigger-only text', async () => {
    const editor = makeGfmTestEditor();

    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('---more'));
        root.append(paragraph);
        for (const node of $markdownToNodes('- item')) {
          root.append(node);
        }
        paragraph.selectEnd();
      },
      { discrete: true }
    );
    await flushEditorUpdates(editor);

    selectTextNode(editor, 'item', 0);
    await flushEditorUpdates(editor);

    editor.getEditorState().read(() => {
      const children = contentRootChildren(editor);
      expect($isParagraphNode(children[0])).toBe(true);
      expect(children[0]?.getTextContent()).toBe('---more');
    });

    editor.dispose();
  });
});
