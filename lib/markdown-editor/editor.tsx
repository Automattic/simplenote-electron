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
  $exportMarkdownString,
  $importMarkdownString,
  MARKDOWN_TRANSFORMERS,
  MarkdownShortcutExtension,
  TRANSFORMERS,
  withMixedNestedListTransformers,
} from './extensions';
import { InternalLinkPlugin } from './internal-link-menu';
import { SearchHighlightPlugin } from './search-highlight-plugin';
import { MarkdownToolbarPlugin } from './toolbar/extension';

import './style.scss';

import type { EntityId } from '../types';

export type MarkdownEditorProps = {
  className?: string;
  clearSearch?: () => void;
  editorRef?: RefObject<LexicalEditor | null>;
  initialMarkdown?: string;
  noteId: EntityId;
  onChange?: (markdown: string) => void;
  onMatchCountChange?: (count: number) => void;
  onOpenInternalLink?: (noteId: EntityId) => void;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  searchQuery?: string;
  selectedSearchMatchIndex?: number | null;
};

export default function MarkdownEditor({
  className,
  clearSearch,
  editorRef,
  initialMarkdown = '',
  noteId,
  onChange,
  onMatchCountChange,
  onOpenInternalLink,
  scrollContainerRef,
  searchQuery = '',
  selectedSearchMatchIndex = null,
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
      {/* contentEditable={null} so the input can be placed below the toolbar;
          the composer otherwise renders it before any children. */}
      <LexicalExtensionComposer contentEditable={null} extension={extension}>
        <MarkdownToolbarPlugin />
        {/* autocomplete=off on a display:contents form plus editor hints reduce
            password-manager / AutoFill bars on mobile; iOS may still show them. */}
        <form
          autoComplete="off"
          className="lexical-md-editor__form"
          onSubmit={(event) => event.preventDefault()}
        >
          <ContentEditable
            aria-autocomplete="none"
            aria-label="Note content"
            autoCapitalize="sentences"
            autoComplete="off"
            autoCorrect="on"
            className="lexical-md-editor__input"
            data-1p-ignore
            data-form-type="other"
            data-lpignore="true"
            inputMode="text"
            placeholder={null}
            role="textbox"
            spellCheck
          />
        </form>
        {editorRef && <EditorRefPlugin editorRef={editorRef} />}
        <InternalLinkPlugin noteId={noteId} onOpenNote={onOpenInternalLink} />
        {onMatchCountChange && clearSearch && scrollContainerRef && (
          <SearchHighlightPlugin
            clearSearch={clearSearch}
            onMatchCountChange={onMatchCountChange}
            scrollContainerRef={scrollContainerRef}
            searchQuery={searchQuery}
            selectedSearchMatchIndex={selectedSearchMatchIndex}
          />
        )}
      </LexicalExtensionComposer>
    </div>
  );
}

export {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  $exportMarkdownString,
  $importMarkdownString,
  createMarkdownEditorExtension,
  MARKDOWN_TRANSFORMERS,
  MarkdownShortcutExtension,
  TRANSFORMERS,
  withMixedNestedListTransformers,
};
