import { Component, cloneElement } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import analytics from './analytics';
import appState from './flux/app-state';
import filterNotes from './utils/filter-notes';

export class NoteToolbarContainer extends Component {
  static propTypes = {
    noteBucket: PropTypes.object.isRequired,
    stateForFilterNotes: PropTypes.object.isRequired,
    toolbar: PropTypes.element.isRequired,
    trashNote: PropTypes.func.isRequired,
  };

  // Gets the index of the note located before the currently selected one
  getPreviousNoteIndex = note => {
    const filteredNotes = filterNotes(this.props.stateForFilterNotes);

    const noteIndex = function(filteredNote) {
      return note.id === filteredNote.id;
    };

    return Math.max(filteredNotes.findIndex(noteIndex) - 1, 0);
  };

  onTrashNote = note => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.trashNote({ noteBucket, note, previousIndex });
    analytics.tracks.recordEvent('editor_note_deleted');
  };

  render() {
    const { toolbar } = this.props;
    const handlers = {
      onTrashNote: this.onTrashNote,
    };

    return cloneElement(toolbar, handlers);
  }
}

const mapStateToProps = ({ appState: state }) => ({
  stateForFilterNotes: {
    filter: state.filter,
    notes: state.notes,
    showTrash: state.showTrash,
    tag: state.tag,
  },
});

const { trashNote } = appState.actionCreators;

const mapDispatchToProps = dispatch => ({
  trashNote: args => {
    dispatch(trashNote(args));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(
  NoteToolbarContainer
);
