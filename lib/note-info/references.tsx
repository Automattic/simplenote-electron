import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

import { getNoteReferences } from '../utils/get-note-references';

import Reference from './reference';

import type * as S from '../state';
import type * as T from '../types';

type StateProps = {
  references: T.EntityId[];
};

type Props = StateProps;

export const References: FunctionComponent<Props> = ({ references }) => {
  if (!references.length) {
    return null;
  }

  return (
    <div className="note-references note-info-panel note-info-internal-link theme-color-border">
      <div className="note-info-item">
        <span className="note-info-item-text">
          <span className="note-info-name theme-color-fg-dim">
            Referenced In
          </span>
          {references.map((noteId) => (
            <Reference noteId={noteId} key={noteId} />
          ))}
        </span>
      </div>
    </div>
  );
};

const mapStateToProps: S.MapState<StateProps, OwnProps> = (state) => ({
  references: getNoteReferences(state),
});

export default connect(mapStateToProps)(References);
