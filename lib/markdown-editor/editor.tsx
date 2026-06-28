import React, { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import type { LexicalEditor } from 'lexical';

import { createMarkdownEditorExtension } from './extensions/index';
import { InternalLinkPlugin } from './plugins/internal-link-menu';
import { useNoteViewScrollTracking } from './memory/note-view-memory';
import { SearchHighlightPlugin } from './plugins/search-highlight-plugin';
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
  onEditorReady?: () => void;
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
  onEditorReady,
  onMatchCountChange,
  onOpenInternalLink,
  scrollContainerRef,
  searchQuery = '',
  selectedSearchMatchIndex = null,
}: MarkdownEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const scrollTopRef = useNoteViewScrollTracking({
    noteId,
    scrollContainerRef,
  });

  // initialMarkdown is intentionally omitted: key={noteId} remounts the composer.
  const extension = useMemo(
    () =>
      createMarkdownEditorExtension(
        initialMarkdown,
        (value) => {
          onChangeRef.current?.(value);
        },
        {
          getScrollContainer: () => scrollContainerRef?.current ?? null,
          getScrollTop: () =>
            scrollContainerRef?.current?.scrollTop ?? scrollTopRef.current,
          noteId,
        }
      ),
    [noteId]
  );

  return (
    <div className={['lexical-md-editor', className].filter(Boolean).join(' ')}>
      {/* contentEditable={null} so the input can be placed below the toolbar;
          the composer otherwise renders it before any children. */}
      <LexicalExtensionComposer contentEditable={null} extension={extension}>
        <div className="lexical-md-editor-chrome__column">
          <MarkdownToolbarPlugin />
          <div ref={scrollContainerRef} className="lexical-md-editor-shell">
            <div className="lexical-md-editor__body">
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
              {onEditorReady && <EditorReadyPlugin onReady={onEditorReady} />}
              <InternalLinkPlugin
                noteId={noteId}
                onOpenNote={onOpenInternalLink}
              />
              {onMatchCountChange && clearSearch && scrollContainerRef && (
                <SearchHighlightPlugin
                  clearSearch={clearSearch}
                  onMatchCountChange={onMatchCountChange}
                  scrollContainerRef={scrollContainerRef}
                  searchQuery={searchQuery}
                  selectedSearchMatchIndex={selectedSearchMatchIndex}
                />
              )}
            </div>
          </div>
        </div>
      </LexicalExtensionComposer>
    </div>
  );
}

function EditorReadyPlugin({ onReady }: { onReady: () => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onReady();
  }, [editor, onReady]);

  return null;
}
