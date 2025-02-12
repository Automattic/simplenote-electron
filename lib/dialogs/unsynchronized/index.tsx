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

type OwnProps = {
  description: string;
  unsafeAction: string;
  safeAction: string;
  action: () => any;
};

type StateProps = {
  notes: Map<T.EntityId, T.Note>;
};

type DispatchProps = {
  closeDialog: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export class UnsynchronizedConfirmation extends Component<Props> {
  exportUnsyncedNotes = () => {
    const { closeDialog, notes } = this.props;

    exportZipArchive(notes).then(closeDialog);
  };

  render() {
    const {
      description,
      unsafeAction,
      safeAction,
      closeDialog,
      action,
      notes,
    } = this.props;

    return (
      <div className="logout__confirmation">
        <Dialog onDone={closeDialog} title="Unsynchronized Notes">
          <p className="explanation">
            {notes.size > 0 ? description : 'All notes have synchronized!'}
          </p>

          {notes.size > 0 && (
            <Fragment>
              <p className="explanation-secondary">
                Possibly unsynchronized notes
              </p>
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
            </Fragment>
          )}
          {notes.size > 0 && (
            <button
              className="export-unsynchronized"
              onClick={this.exportUnsyncedNotes}
            >
              Export unsynchronized notes
            </button>
          )}

          <section className="action-button">
            <button className="log-out" onClick={action}>
              {notes.size > 0 ? unsafeAction : safeAction}
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
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(UnsynchronizedConfirmation);
