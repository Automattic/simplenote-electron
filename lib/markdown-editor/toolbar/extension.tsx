import React from 'react';
import { defineExtension } from 'lexical';

import { MarkdownEditorToolbar } from './index';

export function MarkdownToolbar() {
  return <MarkdownEditorToolbar />;
}

export const MarkdownToolbarExtension = defineExtension({
  name: '@simplenote/markdown-toolbar',
  register() {
    return () => {};
  },
});
