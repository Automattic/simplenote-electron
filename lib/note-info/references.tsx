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
    <div className="note-info-panel note-info-internal-link theme-color-border">
      <span className="note-info-item-text">
        <span className="note-info-name">References</span>
        {references.map((noteId) => (
          <Reference noteId={noteId} key={noteId} />
        ))}
      </span>
    </div>
  );
};

const mapStateToProps: S.MapState<StateProps, OwnProps> = (state) => ({
  references: getNoteReferences(state),
});

export default connect(mapStateToProps)(References);
