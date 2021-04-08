import React, { CSSProperties, Component, ChangeEventHandler } from 'react';
import { connect } from 'react-redux';
import FocusTrap from 'focus-trap-react';
import format from 'date-fns/format';
import classNames from 'classnames';
import Slider from '../components/slider';
import ToggleControl from '../controls/toggle';
import actions from '../state/actions';

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
  showDeletedTags: boolean;
};

type DispatchProps = {
  openRevision: (noteId: T.EntityId, version: number) => any;
  cancelRevision: () => any;
  restoreRevision: (noteId: T.EntityId, version: number) => any;
  toggleDeletedTags: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export class RevisionSelector extends Component<Props> {
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
    const {
      isViewingRevisions,
      note,
      openedRevision,
      revisions,
      showDeletedTags,
      toggleDeletedTags,
    } = this.props;

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
      // Based on ((selected - min) * 100) / (max - min);
      // min is equal to 1
      // max is the number of size of revisions -1.
      (((selectedIndex === -1 ? revisions?.size - 1 : selectedIndex) - 1) *
        100) /
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
      'revision-selector theme-color-border theme-color-fg theme-color-bg',
      {
        'is-visible': isViewingRevisions,
      }
    );

    return (
      <FocusTrap
        focusTrapOptions={{
          clickOutsideDeactivates: true,
          // Fallback required due to RevisionSelect's placement within
          // Suspsense, which hides elements preventing focus. https://git.io/Jqep9
          fallbackFocus: 'body',
          onDeactivate: this.onCancelRevision,
        }}
      >
        <div
          className={mainClasses}
          role="dialog"
          aria-labelledby="revision-slider-title"
        >
          <div className="revision-selector-inner">
            <div id="revision-slider-title" className="revision-slider-title">
              History
            </div>
            <div
              aria-hidden
              className="revision-date"
              style={{ left: datePos }}
            >
              {revisionDate}
            </div>
            <div className="revision-slider">
              <Slider
                aria-valuetext={`Revision from ${revisionDate}`}
                disabled={!revisions || revisions.size === 0}
                min={
                  1 /* don't allow reverting to the very first version because that's a blank note */
                }
                max={revisions?.size - 1}
                value={selectedIndex > -1 ? selectedIndex : revisions?.size - 1}
                onChange={this.onSelectRevision}
              />
            </div>
            <section className="revision-actions">
              <div className="revision-deleted-tags-toggle">
                <ToggleControl
                  id="revision-deleted-tags-checkbox"
                  checked={showDeletedTags}
                  onChange={toggleDeletedTags}
                />
                <label
                  htmlFor="revision-deleted-tags-checkbox"
                  className="revision-deleted-tags-toggle-label"
                >
                  Restore deleted tags
                </label>
              </div>
              <div className="revision-buttons">
                <button
                  className="button button-secondary button-compact"
                  onClick={this.onCancelRevision}
                >
                  Cancel
                </button>
                <button
                  aria-label={`Restore revision from ${revisionDate}`}
                  disabled={isNewest}
                  className="button button-primary button-compact"
                  onClick={this.onAcceptRevision}
                >
                  Restore
                </button>
              </div>
            </section>
          </div>
        </div>
      </FocusTrap>
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
  showDeletedTags: state.ui.showDeletedTags,
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
  toggleDeletedTags: actions.ui.toggleDeletedTags,
};

export default connect(mapStateToProps, mapDispatchToProps)(RevisionSelector);
