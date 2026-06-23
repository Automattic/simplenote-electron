import React from 'react';
import { defineExtension } from 'lexical';

import { MarkdownEditorToolbar } from './index';
import { registerToolbarEditorListeners } from './register';

export { bindToolbarUrlPanel, subscribeToolbarUndoRedo } from './register';

export function MarkdownToolbarPlugin() {
  return <MarkdownEditorToolbar />;
}

export const MarkdownToolbarExtension = defineExtension({
  name: '@simplenote/markdown-toolbar',
  register(editor) {
    return registerToolbarEditorListeners(editor);
  },
});
