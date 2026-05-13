import React, { FunctionComponent, useEffect, useRef } from 'react';
import { connect } from 'react-redux';

import { checkboxRegex } from '../../utils/task-transform';
import {
  buildPreviewClipboardPayload,
  shouldCopyWholePreview,
  writeClipboardPayload,
} from '../../utils/clipboard/copy';
import renderToNode from '../../note-detail/render-to-node';
import { viewExternalUrl } from '../../utils/url-utils';
import { withCheckboxCharacters } from '../../utils/task-transform';
import {
  isSameDocumentLink,
  normalizeSafeLinkHref,
} from '../../utils/url-safety';
import { warmMarkdownRenderer } from '../../utils/render-note-to-html';

import actions from '../../state/actions';

import * as S from '../../state';
import * as T from '../../types';

type OwnProps = {
  noteId?: T.EntityId | null;
};

type StateProps = {
  isFocused: boolean;
  note: T.Note | null;
  noteId: T.EntityId | null;
  notes: Map<T.EntityId, T.Note>;
  searchQuery: string;
  showRenderedView: boolean;
};

type DispatchProps = {
  editNote: (noteId: T.EntityId, changes: Partial<T.Note>) => any;
  openNote: (noteId: T.EntityId) => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export const NotePreview: FunctionComponent<Props> = ({
  editNote,
  isFocused,
  note,
  noteId,
  notes,
  openNote,
  searchQuery,
  showRenderedView,
}) => {
  const previewNode = useRef<HTMLDivElement | null>(null);
  const renderVersion = useRef(0);
  useEffect(() => {
    const copyRenderedNote = (event: ClipboardEvent) => {
      const preview = previewNode.current;

      if (
        !isFocused ||
        !note ||
        !preview ||
        !event.clipboardData ||
        !shouldCopyWholePreview(
          preview,
          document.getSelection(),
          document.activeElement
        )
      ) {
        return;
      }

      const didWrite = writeClipboardPayload(
        event.clipboardData,
        buildPreviewClipboardPayload(
          note.content,
          showRenderedView,
          preview.textContent ?? ''
        )
      );

      if (didWrite) {
        event.preventDefault();
      }
    };

    document.addEventListener('copy', copyRenderedNote, false);
    return () => document.removeEventListener('copy', copyRenderedNote, false);
  }, [isFocused, note?.content, showRenderedView]);

  useEffect(() => {
    const preview = previewNode.current;
    const handleClick = (event: MouseEvent) => {
      for (
        let node = event.target as Node | null;
        node !== null;
        node = node.parentNode
      ) {
        if (!(node instanceof HTMLElement)) {
          continue;
        }

        if (node.tagName === 'A') {
          event.preventDefault();
          event.stopPropagation();

          const tag = node as HTMLAnchorElement;

          // Intercept internal links
          if (tag.href.startsWith('simplenote://note/')) {
            const match = /^simplenote:\/\/note\/(.+)$/.exec(tag.href);
            if (!match) {
              return;
            }

            const [fullMatch, linkedNoteId] = match;
            // if we try to open a note that doesn't exist in local state,
            // then we annoyingly close the open note without opening anything else
            // implicit else: links that aren't openable will just do nothing
            if (notes.has(linkedNoteId as T.EntityId)) {
              openNote(linkedNoteId as T.EntityId);
            }
            return;
          }

          // skip internal note links (e.g. anchor links, footnotes)
          if (!isSameDocumentLink(tag.href)) {
            const href = normalizeSafeLinkHref(tag.href);

            if (href) {
              viewExternalUrl(href);
            }
          }

          return;
        }
      }

      // There are times when showdown will put lists inside of the same
      // UL as a tasklist. This causes those lists to look like they are
      // checkboxes. This insures that we are only getting true checkboxes.
      const target = event.target;
      const element =
        target instanceof HTMLInputElement
          ? target.parentElement
          : target instanceof HTMLElement
            ? target
            : null;
      if (element?.children[0]?.tagName === 'INPUT') {
        if (!note || !noteId) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const allTasks = preview!.querySelectorAll(
          '[data-markdown-root] .task-list-item'
        );
        const taskIndex = Array.prototype.indexOf.call(allTasks, element);

        let matchCount = 0;
        const content = note.content.replace(
          checkboxRegex,
          (match, prespace, inside, postspace) => {
            const newCheckbox =
              matchCount++ === taskIndex
                ? inside === ' '
                  ? '- [x]'
                  : '- [ ]'
                : inside === ' '
                  ? '- [ ]'
                  : '- [x]';
            return prespace + newCheckbox + postspace;
          }
        );

        editNote(noteId, { content });
        return;
      }
    };
    preview?.addEventListener('click', handleClick, true);
    return () => preview?.removeEventListener('click', handleClick, true);
  }, [editNote, note?.content, noteId, notes, openNote]);

  useEffect(() => {
    if (!previewNode.current) {
      return;
    }

    const renderTarget = previewNode.current;
    const version = ++renderVersion.current;

    if (note?.content && showRenderedView) {
      warmMarkdownRenderer();

      const nextPreview = document.createElement('div');
      renderTarget.textContent = '';
      renderToNode(nextPreview, note!.content, searchQuery).then(() => {
        if (version === renderVersion.current) {
          renderTarget.innerHTML = nextPreview.innerHTML;
        }
      });
    } else {
      renderTarget.innerText = withCheckboxCharacters(note?.content ?? '');
    }
  }, [note?.content, searchQuery, showRenderedView]);

  return (
    <div className="note-detail-wrapper">
      <div className="note-detail note-detail-preview">
        <div
          ref={previewNode}
          aria-label="Note preview"
          className="note-detail-markdown note-preview"
          data-markdown-root
          tabIndex={0}
        >
          {!showRenderedView && withCheckboxCharacters(note?.content ?? '')}
        </div>
      </div>
    </div>
  );
};

const mapStateToProps: S.MapState<StateProps, OwnProps> = (state, props) => {
  const noteId = props.noteId ?? state.ui.openedNote;
  const note = (noteId ? state.data.notes.get(noteId) : null) ?? null;

  return {
    isFocused: state.ui.dialogs.length === 0 && !state.ui.showNoteActions,
    note,
    noteId,
    notes: state.data.notes,
    searchQuery: state.ui.searchQuery,
    showRenderedView:
      !!note?.systemTags.includes('markdown') && !state.ui.editMode,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  editNote: actions.data.editNote,
  openNote: actions.ui.selectNote,
};

export default connect(mapStateToProps, mapDispatchToProps)(NotePreview);
