import { Component, ReactElement, cloneElement } from 'react';
import { connect } from 'react-redux';

import analytics from './analytics';
import appState from './flux/app-state';
import { closeNote } from './state/ui/actions';
import { toggleFocusMode } from './state/settings/actions';
import DialogTypes from '../shared/dialog-types';

import * as S from './state';
import * as T from './types';

type OwnProps = {
  noteBucket: T.Bucket<T.Note>;
  toolbar: ReactElement;
};

type StateProps = {
  isViewingRevisions: boolean;
  notes: T.NoteEntity[];
  revisionOrNote: T.NoteEntity | null;
};

type NoteChanger = {
  noteBucket: T.Bucket<T.Note>;
  note: T.NoteEntity;
};

type ListChanger = NoteChanger & { previousIndex: number };

type DispatchProps = {
  closeNote: () => any;
  deleteNoteForever: (args: ListChanger) => any;
  noteRevisions: (args: NoteChanger) => any;
  restoreNote: (args: ListChanger) => any;
  toggleRevisions: () => any;
  shareNote: () => any;
  toggleFocusMode: () => any;
  trashNote: (args: ListChanger) => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export class NoteToolbarContainer extends Component<Props> {
  // Gets the index of the note located before the currently selected one
  getPreviousNoteIndex = (note: T.NoteEntity) => {
    const noteIndex = this.props.notes.findIndex(({ id }) => note.id === id);

    return Math.max(noteIndex - 1, 0);
  };

  onTrashNote = (note: T.NoteEntity) => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.closeNote();
    this.props.trashNote({ noteBucket, note, previousIndex });
    analytics.tracks.recordEvent('editor_note_deleted');
  };

  onDeleteNoteForever = (note: T.NoteEntity) => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.deleteNoteForever({ noteBucket, note, previousIndex });
  };

  onRestoreNote = (note: T.NoteEntity) => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.restoreNote({ noteBucket, note, previousIndex });
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

  render() {
    const { isViewingRevisions, toolbar, revisionOrNote } = this.props;

    const handlers = {
      onDeleteNoteForever: this.onDeleteNoteForever,
      onRestoreNote: this.onRestoreNote,
      onShowRevisions: this.onShowRevisions,
      onShareNote: this.onShareNote,
      onTrashNote: this.onTrashNote,
      toggleFocusMode: this.props.toggleFocusMode,
    };

    if (isViewingRevisions) {
      return null;
    }

    const markdownEnabled = revisionOrNote
      ? revisionOrNote.data.systemTags.includes('markdown')
      : false;

    return cloneElement(toolbar, { ...handlers, markdownEnabled });
  }
}

const mapStateToProps: S.MapState<StateProps> = ({
  appState,
  ui: { filteredNotes, note, visiblePanes },
}) => ({
  isViewingRevisions: visiblePanes.has('revisions'),
  notes: filteredNotes,
  revisionOrNote: appState.revision || note,
});

const {
  deleteNoteForever,
  noteRevisions,
  restoreNote,
  showDialog,
  trashNote,
} = appState.actionCreators;

const mapDispatchToProps: S.MapDispatch<DispatchProps> = dispatch => ({
  closeNote: () => dispatch(closeNote()),
  deleteNoteForever: args => dispatch(deleteNoteForever(args)),
  noteRevisions: args => dispatch(noteRevisions(args)),
  restoreNote: args => dispatch(restoreNote(args)),
  shareNote: () => dispatch(showDialog({ dialog: DialogTypes.SHARE })),
  toggleFocusMode: () => dispatch(toggleFocusMode()),
  trashNote: args => dispatch(trashNote(args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NoteToolbarContainer);
