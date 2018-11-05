import { Component, cloneElement } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { get, includes } from 'lodash';

import analytics from './analytics';
import appState from './flux/app-state';
import { toggleFocusMode } from './state/settings/actions';
import DialogTypes from '../shared/dialog-types';
import filterNotes from './utils/filter-notes';

export class NoteToolbarContainer extends Component {
  static propTypes = {
    closeNote: PropTypes.func.isRequired,
    deleteNoteForever: PropTypes.func.isRequired,
    editorMode: PropTypes.oneOf(['edit', 'markdown']),
    noteBucket: PropTypes.object.isRequired,
    noteRevisions: PropTypes.func.isRequired,
    onNoteClosed: PropTypes.func.isRequired,
    restoreNote: PropTypes.func.isRequired,
    revisionOrNote: PropTypes.object,
    setEditorMode: PropTypes.func.isRequired,
    setIsViewingRevisions: PropTypes.func.isRequired,
    shareNote: PropTypes.func.isRequired,
    stateForFilterNotes: PropTypes.object.isRequired,
    toggleFocusMode: PropTypes.func.isRequired,
    toggleNoteInfo: PropTypes.func.isRequired,
    toolbar: PropTypes.element.isRequired,
    trashNote: PropTypes.func.isRequired,
  };

  static defaultProps = {
    editorMode: 'edit',
  };

  // Gets the index of the note located before the currently selected one
  getPreviousNoteIndex = note => {
    const filteredNotes = filterNotes(this.props.stateForFilterNotes);

    const noteIndex = function(filteredNote) {
      return note.id === filteredNote.id;
    };

    return Math.max(filteredNotes.findIndex(noteIndex) - 1, 0);
  };

  onCloseNote = () => {
    this.props.closeNote();
    this.props.onNoteClosed();
  };

  onTrashNote = note => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.trashNote({ noteBucket, note, previousIndex });
    analytics.tracks.recordEvent('editor_note_deleted');
  };

  onDeleteNoteForever = note => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.deleteNoteForever({ noteBucket, note, previousIndex });
  };

  onRestoreNote = note => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.restoreNote({ noteBucket, note, previousIndex });
    analytics.tracks.recordEvent('editor_note_restored');
  };

  onShowRevisions = note => {
    const { noteBucket } = this.props;
    this.props.noteRevisions({ noteBucket, note });
    analytics.tracks.recordEvent('editor_versions_accessed');
  };

  onShareNote = () => {
    this.props.shareNote();
    analytics.tracks.recordEvent('editor_share_dialog_viewed');
  };

  onSetEditorMode = mode => this.props.setEditorMode({ mode });

  render() {
    const { toolbar } = this.props;
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
    const { editorMode, revisionOrNote } = this.props;

    const systemTags = get(revisionOrNote, 'data.systemTags', []);
    const markdownEnabled = includes(systemTags, 'markdown');

    return cloneElement(toolbar, { ...handlers, editorMode, markdownEnabled });
  }
}

const mapStateToProps = ({ appState: state }) => ({
  editorMode: state.editorMode,
  revisionOrNote: state.revision || state.note,
  stateForFilterNotes: {
    filter: state.filter,
    notes: state.notes,
    showTrash: state.showTrash,
    tag: state.tag,
  },
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
  setIsViewingRevisions: isViewingRevisions => {
    dispatch(setIsViewingRevisions({ isViewingRevisions }));
  },
  shareNote: () => dispatch(showDialog({ dialog: DialogTypes.SHARE })),
  toggleFocusMode: () => dispatch(toggleFocusMode()),
  toggleNoteInfo: () => dispatch(toggleNoteInfo()),
  trashNote: args => dispatch(trashNote(args)),
});

export default connect(mapStateToProps, mapDispatchToProps)(
  NoteToolbarContainer
);
