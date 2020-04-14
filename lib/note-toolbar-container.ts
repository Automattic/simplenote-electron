import { Component, ReactElement, cloneElement } from 'react';
import { connect } from 'react-redux';

import analytics from './analytics';
import appState from './flux/app-state';
import { toggleFocusMode } from './state/settings/actions';
import { showDialog } from './state/ui/actions';

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

type ListChanger = NoteChanger & { previousIndex: number };

type DispatchProps = {
  deleteNoteForever: (args: ListChanger) => any;
  restoreNote: (args: ListChanger) => any;
  shareNote: () => any;
  showDialog: () => any;
  toggleFocusMode: () => any;
  trashNote: (args: ListChanger) => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export class NoteToolbarContainer extends Component<Props> {
  // Gets the index of the note located before the currently selected one
  getPreviousNoteIndex = (note: T.NoteEntity) => {
    const previousIndex = this.props.notes.findIndex(
      ({ id }) => note.id === id
    );

    return Math.max(previousIndex - 1, 0);
  };

  onTrashNote = (note: T.NoteEntity) => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
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

const { deleteNoteForever, restoreNote, trashNote } = appState.actionCreators;

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  deleteNoteForever: (args) => dispatch(deleteNoteForever(args)),
  restoreNote: (args) => dispatch(restoreNote(args)),
  shareNote: () => dispatch(showDialog('SHARE')),
  toggleFocusMode: () => dispatch(toggleFocusMode()),
  trashNote: (args) => dispatch(trashNote(args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NoteToolbarContainer);
