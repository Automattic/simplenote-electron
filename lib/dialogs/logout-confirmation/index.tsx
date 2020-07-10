import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
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
        <Dialog onDone={closeDialog} title="Unsynchronized Notes Found">
          <section>
            <h1>Are you sure you want to logout?</h1>
          </section>

          {notes.size > 0 && (
            <p className="explanation">
              If you logout now Simplenote will not be able to remember any of
              your unsynchronized changes. If you wait a few more seconds it
              might catch up with the changes but if it doesn't you can always
              export a copy of the notes with those changes just to be safe.
            </p>
          )}

          <section className="change-list">
            {notes.size > 0 ? (
              <Fragment>
                <h2>Possibly unsynchronized notes</h2>
                <ul>
                  {[...notes.entries()].map(([noteId, note]) => {
                    const { title, preview } = noteTitleAndPreview(note);

                    return (
                      <li key={noteId}>
                        <span className="note-title">{title}</span>
                        {preview.replace(/\n/g, ' ¶ ')}
                      </li>
                    );
                  })}
                </ul>
              </Fragment>
            ) : (
              <h2 style={{ textAlign: 'center' }}>
                All notes have syncronized!
              </h2>
            )}
          </section>

          <section className="action-buttons">
            <button onClick={reallyLogout}>
              {notes.size > 0 ? 'Lose changes and logout' : 'Safely logout'}
            </button>
            <button onClick={closeDialog}>Don't logout yet</button>
            <button
              onClick={this.exportUnsyncedNotes}
              disabled={notes.size === 0}
            >
              Export unsynchronized notes
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
