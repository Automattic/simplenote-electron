import { $convertToMarkdownString } from '@lexical/markdown';
import { $isListItemNode, $isListNode } from '@lexical/list';
import { $getRoot, type LexicalEditorWithDispose } from 'lexical';

import { buildEditorFromExtensions } from '@lexical/extension';

import {
  createMarkdownEditorExtension,
  MARKDOWN_TRANSFORMERS,
} from './extensions';
import { importMarkdown } from './gfm-test-helpers';

// jsdom gaps for Lexical's CheckListExtension click hit testing:
// - getComputedStyle(elt, '::before') is unsupported (needs explicit width)
// - css zoom is not applied to getBoundingClientRect, so calculateZoomLevel()
//   reads empty zoom values and returns 0, breaking clientX / zoom math
function stubChecklistClickSupport(beforeWidth: string): () => void {
  const original = window.getComputedStyle.bind(window);
  window.getComputedStyle = ((
    element: Element,
    pseudoElement?: string | null
  ) => {
    if (pseudoElement === '::before') {
      return { width: beforeWidth } as CSSStyleDeclaration;
    }

    const style = original(element, pseudoElement);
    return new Proxy(style, {
      get(target, property, receiver) {
        if (property === 'getPropertyValue') {
          return (name: string) => {
            if (name === 'zoom') {
              const value = target.getPropertyValue(name);
              return value || '1';
            }
            return target.getPropertyValue(name);
          };
        }
        return Reflect.get(target, property, receiver);
      },
    });
  }) as typeof window.getComputedStyle;

  return () => {
    window.getComputedStyle = original;
  };
}

function mountMarkdownEditor(editor: LexicalEditorWithDispose): () => void {
  const shell = document.createElement('div');
  shell.className = 'note-detail-markdown lexical-md-editor';

  const input = document.createElement('div');
  input.className = 'lexical-md-editor__input';
  input.contentEditable = 'true';
  shell.appendChild(input);
  document.body.appendChild(shell);

  editor.setRootElement(input);

  return () => {
    editor.setRootElement(null);
    shell.remove();
  };
}

function makeMountedEditor(markdown: string): {
  editor: LexicalEditorWithDispose;
  unmount: () => void;
} {
  const editor = buildEditorFromExtensions(createMarkdownEditorExtension(''));
  importMarkdown(editor, markdown);
  const unmount = mountMarkdownEditor(editor);
  return {
    editor,
    unmount: () => {
      unmount();
      editor.dispose();
    },
  };
}

function getFirstCheckListItem(
  editor: LexicalEditorWithDispose
): HTMLLIElement {
  const root = editor.getRootElement();
  if (!root) {
    throw new Error('Editor root element is missing');
  }

  const listItem = root.querySelector(
    'li.task-list-item[role="checkbox"]'
  ) as HTMLLIElement | null;
  if (!listItem) {
    throw new Error('Expected a checklist item in the editor DOM');
  }

  return listItem;
}

function clickChecklistMarker(listItem: HTMLLIElement): void {
  const rect = listItem.getBoundingClientRect();

  // Lexical's CheckListExtension only toggles when the click lands within the
  // ::before pseudo-element width measured from the left edge of the <li>.
  const clickX = rect.left + 2;
  const clickY = rect.top + (rect.height > 0 ? rect.height / 2 : 12);

  listItem.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: clickX,
      clientY: clickY,
    })
  );
}

function getFirstItemChecked(editor: LexicalEditorWithDispose): boolean {
  return editor.getEditorState().read(() => {
    const list = $getRoot().getFirstChild();
    if (!$isListNode(list)) {
      throw new Error('Expected root child to be a list');
    }
    const item = list.getFirstChild();
    if (!$isListItemNode(item)) {
      throw new Error('Expected first list child to be a list item');
    }
    return item.getChecked() ?? false;
  });
}

// CheckListExtension toggles via a non-discrete editor.update(); the committed
// state is not visible from getEditorState() until the next microtask.
function flushEditorUpdates(): Promise<void> {
  return Promise.resolve();
}

describe('checklist toggle (click)', () => {
  let restoreComputedStyle: (() => void) | undefined;

  beforeEach(() => {
    restoreComputedStyle = stubChecklistClickSupport('16px');
  });

  afterEach(() => {
    restoreComputedStyle?.();
    restoreComputedStyle = undefined;
  });

  it('renders checklist items with Lexical checkbox attributes', () => {
    const { editor, unmount } = makeMountedEditor('- [ ] open task');

    const listItem = getFirstCheckListItem(editor);
    expect(listItem.getAttribute('role')).toBe('checkbox');
    expect(listItem.getAttribute('aria-checked')).toBe('false');
    expect(listItem.classList.contains('task-list-item')).toBe(true);
    expect(
      (listItem.parentElement as HTMLElement & { __lexicalListType?: string })
        .__lexicalListType
    ).toBe('check');

    unmount();
  });

  it('toggles an unchecked task item when clicking the checkbox marker', async () => {
    const { editor, unmount } = makeMountedEditor('- [ ] open task');

    expect(getFirstItemChecked(editor)).toBe(false);

    clickChecklistMarker(getFirstCheckListItem(editor));
    await flushEditorUpdates();

    expect(getFirstItemChecked(editor)).toBe(true);
    expect(getFirstCheckListItem(editor).getAttribute('aria-checked')).toBe(
      'true'
    );

    unmount();
  });

  it('toggles a checked task item when clicking the checkbox marker', async () => {
    const { editor, unmount } = makeMountedEditor('- [x] done task');

    expect(getFirstItemChecked(editor)).toBe(true);

    clickChecklistMarker(getFirstCheckListItem(editor));
    await flushEditorUpdates();

    expect(getFirstItemChecked(editor)).toBe(false);
    expect(getFirstCheckListItem(editor).getAttribute('aria-checked')).toBe(
      'false'
    );

    unmount();
  });

  it('exports toggled state to markdown', async () => {
    const { editor, unmount } = makeMountedEditor('- [ ] open task');

    clickChecklistMarker(getFirstCheckListItem(editor));
    await flushEditorUpdates();

    const markdown = editor
      .getEditorState()
      .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
    expect(markdown).toBe('- [x] open task');

    unmount();
  });
});
