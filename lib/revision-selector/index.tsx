import React, { Component, ChangeEventHandler } from 'react';
import { connect } from 'react-redux';
import { format } from 'date-fns/format';
import classNames from 'classnames';
import IconButton from '../icon-button';
import SmallHelpIcon from '../icons/help-small';
import Slider from '../components/slider';
import CheckboxControl from '../controls/checkbox';
import actions from '../state/actions';
import { getRevision } from '../state/selectors';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  isViewingRevisions: boolean;
  noteId: T.EntityId | null;
  note: T.Note | null;
  openedRevision: number | null;
  revision: T.Note | null;
  revisions: Map<number, T.Note> | null;
  restoreDeletedTags: boolean;
};

type DispatchProps = {
  openRevision: (noteId: T.EntityId, version: number) => any;
  cancelRevision: () => any;
  restoreRevision: (noteId: T.EntityId, note: T.Note) => any;
  toggleRestoringDeletedTags: () => any;
};

type Props = StateProps & DispatchProps;

export class RevisionSelector extends Component<Props> {
  onAcceptRevision = () => {
    const { noteId, revision, restoreRevision } = this.props;

    if (!noteId || !revision) {
      return;
    }

    restoreRevision(noteId, revision);
  };

  onSelectRevision: ChangeEventHandler<HTMLInputElement> = ({
    target: { value },
  }) => {
    const { noteId, revisions } = this.props;

    const selection = parseInt(value, 10);
    const revision = revisions ? [...revisions.keys()][selection] : null;

    if (!noteId || !revision) {
      return;
    }

    this.props.openRevision(noteId, revision);
  };

  onCancelRevision = () => {
    this.props.cancelRevision();
  };

  render() {
    const {
      isViewingRevisions,
      note,
      openedRevision,
      revisions,
      restoreDeletedTags,
      toggleRestoringDeletedTags,
    } = this.props;

    if (!isViewingRevisions || !revisions) {
      return null;
    }

    const revisionKeys = [...revisions.keys()];
    const selectedIndex = openedRevision
      ? revisionKeys.indexOf(openedRevision)
      : -1;
    const maxIndex = Math.max(revisionKeys.length - 1, 1);
    const sliderValue = selectedIndex > -1 ? selectedIndex : maxIndex;
    const isNewest =
      !openedRevision || revisionKeys.length <= 1 || selectedIndex === maxIndex;

    const leftPos = Number(
      // Based on ((selected - min) * 100) / (max - min);
      // min is equal to 1
      // max is the number of size of revisions -1.
      revisionKeys.length > 2
        ? (((sliderValue - 1) * 100) / (revisionKeys.length - 2)).toFixed(2)
        : 100
    );

    const datePos = `calc(${leftPos}% + (${8 - leftPos * 0.15}px))`;

    const revisionNote = openedRevision ? revisions.get(openedRevision) : note;
    const revisionDate = format(
      (revisionNote?.modificationDate ?? note?.modificationDate ?? 0) * 1000,
      'MMM d, yyyy h:mm a'
    );

    const mainClasses = classNames('revision-selector', {
      'is-visible': isViewingRevisions,
    });

    return (
      <div className={mainClasses} role="group" aria-label="History controls">
        <div className="revision-selector-inner">
          <div id="revision-slider-title" className="revision-slider-title">
            History
          </div>
          <div aria-hidden className="revision-date" style={{ left: datePos }}>
            {revisionDate}
          </div>
          <div className="revision-slider">
            <Slider
              aria-valuetext={`Revision from ${revisionDate}`}
              disabled={revisionKeys.length <= 1}
              min={
                1 /* don't allow reverting to the very first version because that's a blank note */
              }
              max={maxIndex}
              value={sliderValue}
              onChange={this.onSelectRevision}
            />
          </div>
          <section className="revision-actions">
            <label
              className="revision-deleted-tags-label"
              htmlFor="revision-deleted-tags-checkbox"
            >
              <CheckboxControl
                id="revision-deleted-tags-checkbox"
                checked={restoreDeletedTags}
                isStandard
                onChange={toggleRestoringDeletedTags}
              />
              <span className="revision-deleted-tags-text">
                Restore deleted tags
              </span>
              <span>
                <IconButton
                  icon={<SmallHelpIcon />}
                  title="Any deleted tags associated with the restored version of this note will be re-added to your list of tags."
                />
              </span>
            </label>
            <div className="revision-buttons">
              <button
                className="button button-secondary button-compact"
                onClick={this.onCancelRevision}
              >
                Cancel
              </button>
              <button
                aria-label={`Restore revision from ${revisionDate}`}
                disabled={!!isNewest}
                className="button button-primary button-compact"
                onClick={this.onAcceptRevision}
              >
                Restore
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => {
  const noteId = state.ui.openedNote;
  const openedRevision =
    state.ui.openedRevision?.[0] === state.ui.openedNote
      ? (state.ui.openedRevision?.[1] ?? null)
      : null;
  const restoreDeletedTags = state.ui.restoreDeletedTags;

  return {
    isViewingRevisions: state.ui.showRevisions,
    noteId,
    note: state.data.notes.get(noteId) ?? null,
    openedRevision,
    revision:
      noteId && openedRevision
        ? getRevision(state, noteId, openedRevision, restoreDeletedTags)
        : null,
    revisions: state.data.noteRevisions.get(noteId) ?? null,
    restoreDeletedTags,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  openRevision: (noteId, version) => ({
    type: 'OPEN_REVISION',
    noteId,
    version,
  }),
  cancelRevision: () => ({
    type: 'CLOSE_REVISION',
  }),
  restoreRevision: (noteId, note) => ({
    type: 'RESTORE_NOTE_REVISION',
    noteId,
    note,
  }),
  toggleRestoringDeletedTags: actions.ui.toggleRestoringDeletedTags,
};

export default connect(mapStateToProps, mapDispatchToProps)(RevisionSelector);
