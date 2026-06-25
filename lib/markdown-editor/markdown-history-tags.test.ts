import { HEADING } from '@lexical/markdown';
import {
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
  type LexicalEditor,
} from 'lexical';

import {
  $isElementSyntaxTriggerOnly,
  $reconcileShortcutHistoryPush,
  $shouldMergeShortcutHistory,
} from './markdown-history-tags';

type EditorWithUpdateTags = LexicalEditor & { _updateTags: Set<string> };

function editorWithPushTag(): EditorWithUpdateTags {
  return {
    _updateTags: new Set([HISTORY_PUSH_TAG]),
  } as EditorWithUpdateTags;
}

describe('$shouldMergeShortcutHistory', () => {
  it('merges when export is unchanged', () => {
    expect($shouldMergeShortcutHistory('*italic*', '*italic*')).toBe(true);
  });

  it('merges when a block shortcut consumed only its trigger text', () => {
    expect($shouldMergeShortcutHistory('## ', '', '## ')).toBe(true);
  });

  it('does not merge when block content changed', () => {
    expect($shouldMergeShortcutHistory('## test', '## tes', '## ')).toBe(false);
  });

  it('does not merge unrelated export changes', () => {
    expect($shouldMergeShortcutHistory('hello', 'hello!')).toBe(false);
  });
});

describe('$isElementSyntaxTriggerOnly', () => {
  const elementTransformers = [HEADING];

  it('detects heading trigger-only text', () => {
    expect($isElementSyntaxTriggerOnly('## ', elementTransformers)).toBe(true);
  });

  it('ignores heading syntax with body text', () => {
    expect($isElementSyntaxTriggerOnly('## title', elementTransformers)).toBe(
      false
    );
  });
});

describe('$reconcileShortcutHistoryPush', () => {
  it('swaps push for merge when history should merge', () => {
    const editor = editorWithPushTag();

    $reconcileShortcutHistoryPush('## ', '', editor, '## ');

    expect(editor._updateTags.has(HISTORY_PUSH_TAG)).toBe(false);
    expect(editor._updateTags.has(HISTORY_MERGE_TAG)).toBe(true);
  });

  it('leaves push in place when export changed meaningfully', () => {
    const editor = editorWithPushTag();

    $reconcileShortcutHistoryPush('hello', 'hello!', editor);

    expect(editor._updateTags.has(HISTORY_PUSH_TAG)).toBe(true);
    expect(editor._updateTags.has(HISTORY_MERGE_TAG)).toBe(false);
  });
});
