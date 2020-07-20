import React, { Component } from 'react';
import { connect } from 'react-redux';

import actions from './state/actions';

import * as S from './state';
import * as T from './types';

type StateProps = {
  noteId: T.EntityId;
  note: T.Note;
  spellCheckEnabled: boolean;
};

type DispatchProps = {
  editNote: (noteId: T.EntityId, changes: Partial<T.Note>) => any;
};

type Props = StateProps & DispatchProps;

class NoteContentEditor extends Component<Props> {
  updateNote: React.FormEventHandler<HTMLTextAreaElement> = (event) => {
    const { editNote, noteId } = this.props;

    editNote(noteId, { content: event.currentTarget.value });
  };

  render() {
    return (
      <div className="note-content-editor-shell">
        <textarea
          value={this.props.note.content}
          dir="auto"
          onChange={this.updateNote}
          spellCheck={this.props.spellCheckEnabled}
        />
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  noteId: state.ui.openedNote,
  note: state.data.notes.get(state.ui.openedNote),
  spellCheckEnabled: state.settings.spellCheckEnabled,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  editNote: actions.data.editNote,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteContentEditor);
