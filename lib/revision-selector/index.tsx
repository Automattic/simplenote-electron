import React, { CSSProperties, Component, ChangeEventHandler } from 'react';
import { connect } from 'react-redux';
import onClickOutside from 'react-onclickoutside';
import format from 'date-fns/format';
import classNames from 'classnames';
import Slider from '../components/slider';

import * as S from '../state';
import * as T from '../types';

type OwnProps = {
  onUpdateContent: Function;
  resetIsViewingRevisions: Function;
  cancelRevision: Function;
  updateNoteTags: Function;
};

type StateProps = {
  isViewingRevisions: boolean;
  noteId: T.EntityId;
  note: T.Note | null;
  openedRevision: number | null;
  revisions: Map<number, T.Note> | null;
};

type DispatchProps = {
  openRevision: (noteId: T.EntityId, version: number) => any;
  cancelRevision: () => any;
  restoreRevision: (noteId: T.EntityId, version: number) => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export class RevisionSelector extends Component<Props> {
  handleClickOutside = () => this.onCancelRevision();

  onAcceptRevision = () => {
    const { noteId, openedRevision, restoreRevision } = this.props;
    restoreRevision(noteId, openedRevision);
  };

  onSelectRevision: ChangeEventHandler<HTMLInputElement> = ({
    target: { value },
  }) => {
    const { revisions } = this.props;

    const selection = parseInt(value, 10);
    const revision = [...revisions.keys()][selection];

    this.props.openRevision(this.props.noteId, revision);
  };

  onCancelRevision = () => {
    this.props.cancelRevision();
  };

  render() {
    const { isViewingRevisions, note, openedRevision, revisions } = this.props;

    if (!isViewingRevisions) {
      return null;
    }

    const selectedIndex =
      revisions && openedRevision
        ? [...revisions.keys()].indexOf(openedRevision)
        : -1;
    const isNewest =
      !openedRevision ||
      (openedRevision && selectedIndex === revisions?.size - 1);

    const leftPos = Number(
      (((selectedIndex === -1 ? revisions?.size : selectedIndex) - 1) * 100) /
        (revisions?.size - 2)
    );
    const datePos = `calc(${leftPos}% + (${8 - leftPos * 0.15}px))`;

    const revisionDate = format(
      (openedRevision
        ? revisions.get(openedRevision).modificationDate
        : note.modificationDate) * 1000,
      'MMM d, yyyy h:mm a'
    );

    const mainClasses = classNames(
      'revision-selector theme-color-border theme-color-fg',
      {
        'is-visible': isViewingRevisions,
      }
    );

    return (
      <div className={mainClasses}>
        <div className="revision-selector-inner">
          <div className="revision-slider-title">History</div>
          <div className="revision-date" style={{ left: datePos }}>
            {revisionDate}
          </div>
          <div className="revision-slider">
            <Slider
              disabled={!revisions || revisions.size === 0}
              min={
                1 /* don't allow reverting to the very first version because that's a blank note */
              }
              max={revisions?.size - 1}
              value={selectedIndex > -1 ? selectedIndex : revisions?.size - 1}
              list="revisionpoints"
              onChange={this.onSelectRevision}
            />
          </div>
          <div className="revision-buttons">
            <button
              className="button button-secondary button-compact"
              onClick={this.onCancelRevision}
            >
              Cancel
            </button>
            <button
              disabled={isNewest}
              className="button button-primary button-compact"
              onClick={this.onAcceptRevision}
            >
              Restore Note
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  isViewingRevisions: state.ui.showRevisions,
  noteId: state.ui.openedNote,
  note: state.data.notes.get(state.ui.openedNote) ?? null,
  openedRevision:
    state.ui.openedRevision?.[0] === state.ui.openedNote
      ? state.ui.openedRevision?.[1] ?? null
      : null,
  revisions: state.data.noteRevisions.get(state.ui.openedNote) ?? null,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  openRevision: (noteId, version) => ({
    type: 'OPEN_REVISION',
    noteId,
    version,
  }),
  cancelRevision: () => ({
    type: 'CLOSE_REVISION',
  }),
  restoreRevision: (noteId, version) => ({
    type: 'RESTORE_NOTE_REVISION',
    noteId,
    version,
  }),
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(onClickOutside(RevisionSelector));
