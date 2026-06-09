import React, { useMemo, useRef, type RefObject } from 'react';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import type { LexicalEditor } from 'lexical';

import {
  createMarkdownEditorExtension,
  $importMarkdownString,
  MARKDOWN_TRANSFORMERS,
  MarkdownShortcutExtension,
  TRANSFORMERS,
  withMixedNestedListTransformers,
} from './extensions';
import EditorPlaceholder from './placeholder';

import './style.scss';

import type { EntityId } from '../types';

export type MarkdownEditorProps = {
  className?: string;
  editorRef?: RefObject<LexicalEditor | null>;
  initialMarkdown?: string;
  noteId: EntityId;
  onChange?: (markdown: string) => void;
  placeholder?: string;
};

const contentEditable = (
  <ContentEditable className="lexical-md-editor__input" placeholder={null} />
);

export default function MarkdownEditor({
  className,
  editorRef,
  initialMarkdown = '',
  noteId,
  onChange,
  placeholder = 'Start typing…',
}: MarkdownEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const extension = useMemo(
    () =>
      createMarkdownEditorExtension(initialMarkdown, (value) => {
        onChangeRef.current?.(value);
      }),
    [noteId]
  );

  return (
    <div className={['lexical-md-editor', className].filter(Boolean).join(' ')}>
      <LexicalExtensionComposer
        contentEditable={contentEditable}
        extension={extension}
      >
        {editorRef && <EditorRefPlugin editorRef={editorRef} />}
        <EditorPlaceholder text={placeholder} />
      </LexicalExtensionComposer>
    </div>
  );
}

export {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  $importMarkdownString,
  createMarkdownEditorExtension,
  MARKDOWN_TRANSFORMERS,
  MarkdownShortcutExtension,
  TRANSFORMERS,
  withMixedNestedListTransformers,
};
