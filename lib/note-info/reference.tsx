import React, { Fragment, FunctionComponent } from 'react';
import { connect } from 'react-redux';
import format from 'date-fns/format';

import actions from '../state/actions';
import { getNoteReference } from '../utils/get-note-references';

import type * as S from '../state';
import type * as T from '../types';

type OwnProps = {
  noteId: T.EntityId;
};

type StateProps = {
  reference:
    | {
        count: number;
        noteId: T.EntityId;
        modificationDate: T.SecondsEpoch;
        title: string;
      }
    | undefined;
};

type DispatchProps = {
  openNote: () => any;
};

type Props = StateProps & DispatchProps;

export const Reference: FunctionComponent<Props> = ({
  openNote,
  reference,
}) => {
  if (!reference) {
    return null;
  }

  return (
    <button className="reference-link" onClick={openNote}>
      <span className="reference-title note-info-name">{reference.title}</span>
      <span>
        {reference.count} Reference{reference.count > 1 ? 's' : ''}
        {reference.modificationDate && ', last modified '}
        {reference.modificationDate && (
          <time
            dateTime={new Date(reference.modificationDate * 1000).toISOString()}
          >
            {new Date(reference.modificationDate * 1000).toLocaleString([], {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
            })}
          </time>
        )}
      </span>
    </button>
  );
};

const mapStateToProps: S.MapState<StateProps, OwnProps> = (
  state,
  { noteId }
) => ({
  reference: getNoteReference(state, noteId),
});

const mapDispatchToProps: S.MapDispatch<DispatchProps, OwnProps> = (
  dispatch,
  { noteId }
) => ({
  openNote: () => dispatch(actions.ui.selectNote(noteId)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Reference);
