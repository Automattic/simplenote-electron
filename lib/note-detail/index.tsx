import React, { Component, Suspense } from 'react';
import { connect } from 'react-redux';
import SimplenoteCompactLogo from '../icons/simplenote-compact';

const MarkdownNoteEditor = React.lazy(() =>
  import(
    /* webpackChunkName: 'markdown-note-editor' */ '../markdown-editor/note-editor'
  ).then((module) => ({ default: module.MarkdownNoteEditor }))
);

const PlainTextNoteEditor = React.lazy(
  () =>
    import(
      /* webpackChunkName: 'note-content-editor' */ '../note-content-editor'
    )
);

import * as S from '../state';
import * as T from '../types';

type OwnProps = {
  storeFocusEditor: Function;
  storeHasFocus: Function;
};

type StateProps = {
  isDialogOpen: boolean;
  keyboardShortcuts: boolean;
  note: T.Note | null;
  openedNote: T.EntityId | null;
};

type Props = OwnProps & StateProps;

export class NoteDetail extends Component<Props> {
  static displayName = 'NoteDetail';

  componentDidMount() {
    this.props.storeFocusEditor(this.focusEditor);
    this.props.storeHasFocus(this.hasFocus);
  }

  focusEditor = () => this.focusContentEditor && this.focusContentEditor();

  hasFocus = () => this.editorHasFocus?.();

  storeEditorHasFocus = (f) => (this.editorHasFocus = f);

  storeFocusContentEditor = (f) => (this.focusContentEditor = f);

  render() {
    const { note, openedNote } = this.props;
    const isMarkdown = note?.systemTags.includes('markdown') ?? false;
    const editorPlaceholder = (
      <div className="note-detail-placeholder">
        <SimplenoteCompactLogo />
      </div>
    );

    return (
      <div className="note-detail-wrapper">
        {!openedNote ? (
          editorPlaceholder
        ) : (
          <Suspense fallback={editorPlaceholder}>
            {isMarkdown ? (
              <MarkdownNoteEditor
                key={openedNote}
                storeFocusEditor={this.storeFocusContentEditor}
                storeHasFocus={this.storeEditorHasFocus}
              />
            ) : (
              <PlainTextNoteEditor
                key={openedNote}
                storeFocusEditor={this.storeFocusContentEditor}
                storeHasFocus={this.storeEditorHasFocus}
              />
            )}
          </Suspense>
        )}
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  isDialogOpen: state.ui.dialogs.length > 0,
  keyboardShortcuts: state.settings.keyboardShortcuts,
  note: state.data.notes.get(state.ui.openedNote) ?? null,
  openedNote: state.ui.openedNote,
});

export default connect(mapStateToProps)(NoteDetail);
