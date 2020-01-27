import { Component, ReactElement, cloneElement } from 'react';
import { connect } from 'react-redux';

import analytics from './analytics';
import appState from './flux/app-state';
import { toggleFocusMode } from './state/settings/actions';
import DialogTypes from '../shared/dialog-types';

import * as T from './types';
import { State } from './state';

type ExternalProps = {
  noteBucket: T.Bucket<T.Note>;
  onNoteClosed: Function;
  toolbar: ReactElement;
};

type ConnectedProps = ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>;

type Props = ExternalProps & ConnectedProps;

export class NoteToolbarContainer extends Component<Props> {
  // Gets the index of the note located before the currently selected one
  getPreviousNoteIndex = (note: T.NoteEntity) => {
    const noteIndex = this.props.notes.findIndex(({ id }) => note.id === id);

    return Math.max(noteIndex - 1, 0);
  };

  onCloseNote = () => {
    this.props.closeNote();
    this.props.onNoteClosed();
  };

  onTrashNote = (note: T.NoteEntity) => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.trashNote({ noteBucket, note, previousIndex });
    this.props.onNoteClosed();
    analytics.tracks.recordEvent('editor_note_deleted');
  };

  onDeleteNoteForever = (note: T.NoteEntity) => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.deleteNoteForever({ noteBucket, note, previousIndex });
    this.props.onNoteClosed();
  };

  onRestoreNote = (note: T.NoteEntity) => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.restoreNote({ noteBucket, note, previousIndex });
    this.props.onNoteClosed();
    analytics.tracks.recordEvent('editor_note_restored');
  };

  onShowRevisions = (note: T.NoteEntity) => {
    const { noteBucket } = this.props;
    this.props.noteRevisions({ noteBucket, note });
    analytics.tracks.recordEvent('editor_versions_accessed');
  };

  onShareNote = () => {
    this.props.shareNote();
    analytics.tracks.recordEvent('editor_share_dialog_viewed');
  };

  onSetEditorMode = (mode: T.EditorMode) => this.props.setEditorMode({ mode });

  render() {
    const {
      editorMode,
      isViewingRevisions,
      toolbar,
      revisionOrNote,
    } = this.props;

    const handlers = {
      onCloseNote: this.onCloseNote,
      onDeleteNoteForever: this.onDeleteNoteForever,
      onRestoreNote: this.onRestoreNote,
      onSetEditorMode: this.onSetEditorMode,
      onShowNoteInfo: this.props.toggleNoteInfo,
      onShowRevisions: this.onShowRevisions,
      onShareNote: this.onShareNote,
      onTrashNote: this.onTrashNote,
      setIsViewingRevisions: this.props.setIsViewingRevisions,
      toggleFocusMode: this.props.toggleFocusMode,
    };

    if (isViewingRevisions) {
      return null;
    }

    const markdownEnabled = revisionOrNote
      ? revisionOrNote.data.systemTags.includes('markdown')
      : false;

    return cloneElement(toolbar, { ...handlers, editorMode, markdownEnabled });
  }
}

const mapStateToProps = ({
  appState: state,
  ui: { filteredNotes },
}: State) => ({
  isViewingRevisions: state.isViewingRevisions,
  editorMode: state.editorMode,
  notes: filteredNotes,
  revisionOrNote: state.revision || state.note,
});

const {
  closeNote,
  deleteNoteForever,
  noteRevisions,
  restoreNote,
  setEditorMode,
  setIsViewingRevisions,
  showDialog,
  toggleNoteInfo,
  trashNote,
} = appState.actionCreators;

const mapDispatchToProps = dispatch => ({
  closeNote: () => dispatch(closeNote()),
  deleteNoteForever: args => dispatch(deleteNoteForever(args)),
  noteRevisions: args => dispatch(noteRevisions(args)),
  restoreNote: args => dispatch(restoreNote(args)),
  setEditorMode: args => dispatch(setEditorMode(args)),
  setIsViewingRevisions: (isViewingRevisions: boolean) => {
    dispatch(setIsViewingRevisions({ isViewingRevisions }));
  },
  shareNote: () => dispatch(showDialog({ dialog: DialogTypes.SHARE })),
  toggleFocusMode: () => dispatch(toggleFocusMode()),
  toggleNoteInfo: () => dispatch(toggleNoteInfo()),
  trashNote: args => dispatch(trashNote(args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NoteToolbarContainer);
