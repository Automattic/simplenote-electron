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
};

type NoteChanger = {
  noteBucket: T.Bucket<T.Note>;
  note: T.NoteEntity;
};

type DispatchProps = {
  closeNote: (noteIndex: number) => any;
  deleteNoteForever: (args: NoteChanger) => any;
  restoreNote: (args: NoteChanger) => any;
  shareNote: () => any;
  toggleFocusMode: () => any;
  trashNote: (args: NoteChanger) => any;
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
    this.props.closeNote(previousIndex);
    this.props.trashNote({ noteBucket, note });
    analytics.tracks.recordEvent('editor_note_deleted');
  };

  onDeleteNoteForever = (note: T.NoteEntity) => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.closeNote(previousIndex);
    this.props.deleteNoteForever({ noteBucket, note });
  };

  onRestoreNote = (note: T.NoteEntity) => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.closeNote(previousIndex);
    this.props.restoreNote({ noteBucket, note });
    analytics.tracks.recordEvent('editor_note_restored');
  };

  onShareNote = () => {
    this.props.shareNote();
    analytics.tracks.recordEvent('editor_share_dialog_viewed');
  };

  render() {
    const { isViewingRevisions, toolbar } = this.props;

    const handlers = {
      onDeleteNoteForever: this.onDeleteNoteForever,
      onRestoreNote: this.onRestoreNote,
      onShareNote: this.onShareNote,
      onTrashNote: this.onTrashNote,
      toggleFocusMode: this.props.toggleFocusMode,
    };

    if (isViewingRevisions) {
      return null;
    }

    return cloneElement(toolbar, { ...handlers });
  }
}

const mapStateToProps: S.MapState<StateProps> = ({
  ui: { filteredNotes, showRevisions },
}) => ({
  isViewingRevisions: showRevisions,
  notes: filteredNotes,
});

const {
  deleteNoteForever,
  restoreNote,
  showDialog,
  trashNote,
} = appState.actionCreators;

const mapDispatchToProps: S.MapDispatch<DispatchProps> = dispatch => ({
  closeNote: (noteIndex: number) => dispatch(closeNote(noteIndex)),
  deleteNoteForever: args => dispatch(deleteNoteForever(args)),
  restoreNote: args => dispatch(restoreNote(args)),
  shareNote: () => dispatch(showDialog({ dialog: DialogTypes.SHARE })),
  toggleFocusMode: () => dispatch(toggleFocusMode()),
  trashNote: args => dispatch(trashNote(args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NoteToolbarContainer);
