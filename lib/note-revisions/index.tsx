import React, { Component, createRef } from 'react';
import { connect } from 'react-redux';

import RevisionSelector from '../revision-selector';
import TagChip from '../components/tag-chip';
import renderToNode from '../note-detail/render-to-node';
import {
  buildPreviewClipboardPayload,
  buildSourceClipboardPayload,
  shouldCopyWholePreview,
  writeClipboardPayload,
} from '../utils/clipboard/copy';
import { warmMarkdownRenderer } from '../utils/render-note-to-html';
import { noteCanonicalTags } from '../state/selectors';
import { tagHashOf } from '../utils/tag-hash';
import { withCheckboxSyntax } from '../utils/task-transform';

import type * as S from '../state';
import type * as T from '../types';

type OwnProps = {
  noteId: T.EntityId | null;
  note?: T.Note | null;
};

type StateProps = {
  editMode: boolean;
  keyboardShortcuts: boolean;
  markdownEnabled: boolean;
  searchQuery: string;
  tags: Array<{ name: T.TagName; deleted: boolean }>;
  noteId: T.EntityId | null;
  note: T.Note | null;
};

type DispatchProps = {
  cancelRevision: () => any;
  toggleEditMode: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

type RevisionPreviewProps = {
  content: string;
  searchQuery: string;
};

export class RevisionPreview extends Component<RevisionPreviewProps> {
  static displayName = 'RevisionPreview';

  previewContent = createRef<HTMLDivElement>();
  renderVersion = 0;

  componentDidMount() {
    this.renderPreview();
  }

  componentDidUpdate(prevProps: RevisionPreviewProps) {
    if (
      prevProps.content !== this.props.content ||
      prevProps.searchQuery !== this.props.searchQuery
    ) {
      this.renderPreview();
    }
  }

  componentWillUnmount() {
    this.renderVersion++;
  }

  focus = () => {
    this.previewContent.current?.focus();
  };

  disablePreviewControls = () => {
    const previewContent = this.previewContent.current;

    previewContent?.querySelectorAll('a').forEach((link) => {
      link.setAttribute('aria-disabled', 'true');
      link.setAttribute('tabindex', '-1');
    });

    previewContent
      ?.querySelectorAll<HTMLInputElement>('input')
      .forEach((input) => {
        input.disabled = true;
        input.tabIndex = -1;
      });
  };

  handleInteractiveEvent = (event: React.SyntheticEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;

    if (!target?.closest('a, input')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  };

  handleCopy = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const previewContent = this.previewContent.current;

    if (
      !previewContent ||
      !event.clipboardData ||
      !shouldCopyWholePreview(
        previewContent,
        document.getSelection(),
        document.activeElement
      )
    ) {
      return;
    }

    const didWrite = writeClipboardPayload(
      event.clipboardData,
      buildPreviewClipboardPayload(
        this.props.content,
        true,
        previewContent.textContent ?? ''
      )
    );

    if (didWrite) {
      event.preventDefault();
    }
  };

  renderPreview = () => {
    const previewContent = this.previewContent.current;

    if (!previewContent) {
      return;
    }

    const renderVersion = ++this.renderVersion;
    const renderTarget = document.createElement('div');
    previewContent.textContent = '';
    warmMarkdownRenderer();

    renderToNode(renderTarget, this.props.content, this.props.searchQuery).then(
      () => {
        if (renderVersion !== this.renderVersion) {
          return;
        }

        previewContent.innerHTML = renderTarget.innerHTML;
        this.disablePreviewControls();
      }
    );
  };

  render() {
    return (
      <div
        ref={this.previewContent}
        aria-label="Revision preview"
        className="note-revisions-content note-revisions-preview note-detail-markdown note-preview"
        data-markdown-root
        onClickCapture={this.handleInteractiveEvent}
        onCopy={this.handleCopy}
        onKeyDownCapture={this.handleInteractiveEvent}
        role="region"
        tabIndex={0}
      />
    );
  }
}

export class NoteRevisions extends Component<Props> {
  static displayName = 'NoteRevisions';

  revisionContent = createRef<HTMLTextAreaElement>();
  revisionPreview = createRef<RevisionPreview>();

  componentDidMount() {
    this.focusActiveContent();
    this.warmMarkdownRendererIfNeeded();
  }

  componentDidUpdate(prevProps: Props) {
    if (this.shouldShowPreview(prevProps) !== this.shouldShowPreview()) {
      this.focusActiveContent();
    }

    if (
      prevProps.markdownEnabled !== this.props.markdownEnabled ||
      prevProps.noteId !== this.props.noteId
    ) {
      this.warmMarkdownRendererIfNeeded();
    }
  }

  warmMarkdownRendererIfNeeded = () => {
    if (this.props.markdownEnabled) {
      warmMarkdownRenderer();
    }
  };

  focusActiveContent = () => {
    if (this.shouldShowPreview()) {
      this.revisionPreview.current?.focus();
      return;
    }

    this.revisionContent.current?.focus();
  };

  shouldShowPreview = (props = this.props) => {
    return props.markdownEnabled && !props.editMode;
  };

  handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.props.cancelRevision();
      return;
    }

    if (
      !this.props.keyboardShortcuts ||
      !this.props.markdownEnabled ||
      !(event.ctrlKey || event.metaKey) ||
      !event.shiftKey ||
      event.key.toLowerCase() !== 'p'
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.props.toggleEditMode();
  };

  handleSourceCopy = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const source = event.currentTarget;
    const selectedContent = source.value.slice(
      source.selectionStart,
      source.selectionEnd
    );

    if (!selectedContent || !event.clipboardData) {
      return;
    }

    const didWrite = writeClipboardPayload(
      event.clipboardData,
      buildSourceClipboardPayload(selectedContent, this.props.markdownEnabled)
    );

    if (didWrite) {
      event.preventDefault();
    }
  };

  render() {
    const { note, searchQuery, tags } = this.props;
    const content = withCheckboxSyntax(note?.content ?? '');

    return (
      <section
        aria-label="History"
        className="note-revisions"
        onKeyDown={this.handleKeyDown}
      >
        {this.shouldShowPreview() ? (
          <RevisionPreview
            ref={this.revisionPreview}
            content={content}
            searchQuery={searchQuery}
          />
        ) : (
          <textarea
            ref={this.revisionContent}
            aria-label="Revision source"
            className="note-revisions-content"
            onCopy={this.handleSourceCopy}
            readOnly
            spellCheck={false}
            value={content}
          />
        )}
        <div className="note-revisions-tag-list">
          {tags.map(({ name, deleted }) => (
            <TagChip
              key={name}
              tagName={name}
              interactive={false}
              deleted={deleted}
            />
          ))}
        </div>
        <RevisionSelector />
      </section>
    );
  }
}

const mapStateToProps: S.MapState<StateProps, OwnProps> = (state, props) => {
  const noteId = props.noteId ?? state.ui.openedNote;
  const note =
    props.note ?? (noteId ? state.data.notes.get(noteId) : null) ?? null;
  const liveNote = noteId ? state.data.notes.get(noteId) : null;
  const restoreDeletedTags = state.ui.restoreDeletedTags;

  const tags = note
    ? noteCanonicalTags(state, note)
        .map((tagName) => {
          const tagHash = tagHashOf(tagName);
          return { name: tagName, deleted: !state.data.tags.has(tagHash) };
        })
        .filter((tag) => {
          return restoreDeletedTags || !tag.deleted;
        })
    : [];

  return {
    editMode: state.ui.editMode,
    keyboardShortcuts: state.settings.keyboardShortcuts,
    markdownEnabled: !!liveNote?.systemTags.includes('markdown'),
    searchQuery: state.ui.searchQuery,
    tags,
    noteId,
    note,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  cancelRevision: () => ({
    type: 'CLOSE_REVISION',
  }),
  toggleEditMode: () => ({
    type: 'TOGGLE_EDIT_MODE',
  }),
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteRevisions);
