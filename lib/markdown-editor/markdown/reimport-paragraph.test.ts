import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
} from 'lexical';
import {
  $exportTopLevelBlockMarkdown,
  $importRootBlockMarkdown,
  $reimportRootParagraphIfNeeded,
} from './import-export';
import { makeGfmTestEditor } from './gfm-test-helpers';

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

describe('$reimportRootParagraphIfNeeded', () => {
  it('imports hello world as one paragraph node', () => {
    const editor = makeGfmTestEditor();

    editor.update(() => {
      expect($importRootBlockMarkdown('hello world')).toHaveLength(1);
    });

    editor.dispose();
  });

  it('exports soft-line --- markdown for reimport', () => {
    const editor = makeGfmTestEditor();

    editor.update(() => {
      setupParagraphWithSoftLineBreak('---', 'jlkjkl');
      const paragraph = $getRoot().getFirstChild()!;
      const markdown = $exportTopLevelBlockMarkdown(paragraph);
      expect(markdown).toBe('---\njlkjkl');
      expect(
        $importRootBlockMarkdown(markdown).map((node) => node.getType())
      ).toEqual(['horizontalrule', 'paragraph']);
    });

    editor.dispose();
  });

  it('splits --- on a soft line into a horizontal rule', () => {
    const editor = makeGfmTestEditor();

    editor.update(() => {
      setupParagraphWithSoftLineBreak('---', 'jlkjkl');
      expect($reimportRootParagraphIfNeeded($getRoot().getFirstChild()!)).toBe(
        true
      );
      expect(
        $getRoot()
          .getChildren()
          .map((child) => child.getType())
      ).toEqual(['horizontalrule', 'paragraph']);
      expect($getRoot().getLastChild()?.getTextContent()).toBe('jlkjkl');
    });

    editor.dispose();
  });

  it('leaves plain paragraphs unchanged', () => {
    const editor = makeGfmTestEditor();

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode('hello world'));
      root.append(paragraph);
      expect($reimportRootParagraphIfNeeded(paragraph)).toBe(false);
      expect(paragraph.isAttached()).toBe(true);
      expect(paragraph.getTextContent()).toBe('hello world');
    });

    editor.dispose();
  });

  it('keeps shift+enter hard breaks in one paragraph on reimport', () => {
    const editor = makeGfmTestEditor();

    editor.update(() => {
      setupParagraphWithSoftLineBreak('hello', '**world**');
      const paragraph = $getRoot().getFirstChild()!;
      expect($exportTopLevelBlockMarkdown(paragraph)).toBe('hello\n**world**');
      expect($reimportRootParagraphIfNeeded(paragraph)).toBe(false);
      expect($getRoot().getChildren()).toHaveLength(1);
      expect($getRoot().getFirstChild()?.getTextContent()).toBe('hello\nworld');
    });

    editor.dispose();
  });

  it('keeps plain shift+enter hard breaks in one paragraph on reimport', () => {
    const editor = makeGfmTestEditor();

    editor.update(() => {
      setupParagraphWithSoftLineBreak('test', 'test2');
      const paragraph = $getRoot().getFirstChild()!;
      expect($reimportRootParagraphIfNeeded(paragraph)).toBe(false);
      expect($getRoot().getChildren()).toHaveLength(1);
      expect(paragraph.getTextContent()).toBe('test\ntest2');
    });

    editor.dispose();
  });

  it('reimports --- on a soft line when a list follows at root', () => {
    const editor = makeGfmTestEditor();

    editor.update(() => {
      setupParagraphWithSoftLineBreak('---', 'jlkjkl');
      for (const node of $importRootBlockMarkdown('- item')) {
        $getRoot().append(node);
      }
      expect($reimportRootParagraphIfNeeded($getRoot().getFirstChild()!)).toBe(
        true
      );
      expect(
        $getRoot()
          .getChildren()
          .map((child) => child.getType())
      ).toEqual(['horizontalrule', 'paragraph', 'list']);
    });

    editor.dispose();
  });
});
