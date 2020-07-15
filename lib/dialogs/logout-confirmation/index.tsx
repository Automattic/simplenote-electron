import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import AttentionIcon from '../../icons/attention';
import Dialog from '../../dialog';
import { closeDialog } from '../../state/ui/actions';
import { getUnconfirmedChanges } from '../../state/simperium/functions/unconfirmed-changes';
import exportZipArchive from '../../utils/export';
import { noteTitleAndPreview } from '../../utils/note-utils';

import type * as S from '../../state';
import type * as T from '../../types';

type StateProps = {
  notes: Map<T.EntityId, T.Note>;
};

type DispatchProps = {
  closeDialog: () => any;
  reallyLogout: () => any;
};

type Props = StateProps & DispatchProps;

export class LogoutConfirmation extends Component<Props> {
  exportUnsyncedNotes = () => {
    const { closeDialog, notes } = this.props;

    exportZipArchive([...notes.values()]).then(closeDialog);
  };

  render() {
    const { closeDialog, notes, reallyLogout } = this.props;

    return (
      <div className="logoutConfirmation">
        <Dialog onDone={closeDialog} title="Unsynced Notes">
          <p className="explanation">
            {notes.size > 0
              ? 'Logging out will delete any unsynced notes.'
              : 'All notes have syncronized!'}
          </p>

          <p className="explanation-secondary">
            {notes.size > 0 && 'Possibly unsynchronized notes'}
          </p>
          {notes.size > 0 && (
            <section className="change-list">
              <ul>
                {[...notes.entries()].map(([noteId, note]) => {
                  const { title, preview } = noteTitleAndPreview(note);

                  return (
                    <li key={noteId}>
                      <AttentionIcon />
                      <span className="note-title">{title}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {notes.size > 0 && (
            <button
              className="export-unsyncronized"
              onClick={this.exportUnsyncedNotes}
            >
              Export unsynchronized notes
            </button>
          )}

          <section className="action-button">
            <button className="log-out" onClick={reallyLogout}>
              {notes.size > 0 ? 'Log out' : 'Safely log out'}
            </button>
          </section>
        </Dialog>
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => {
  const changes = getUnconfirmedChanges(state);
  const notes = new Map(
    changes.notes.map((noteId: T.EntityId) => [
      noteId,
      state.data.notes.get(noteId),
    ])
  );

  return {
    notes,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  closeDialog,
  reallyLogout: () => ({ type: 'REALLY_LOGOUT' }),
};

export default connect(mapStateToProps, mapDispatchToProps)(LogoutConfirmation);
