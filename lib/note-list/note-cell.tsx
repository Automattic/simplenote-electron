import React, { Component, CSSProperties } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';

import PublishIcon from '../icons/feed';
import {
  checkboxDecorator,
  decorateWith,
  makeFilterDecorator,
} from './decorators';
import { getTerms } from '../utils/filter-notes';
import { noteTitleAndPreview } from '../utils/note-utils';
import actions from '../state/actions';

import * as S from '../state';
import * as T from '../types';

type OwnProps = {
  invalidateHeight: () => any;
  noteId: T.EntityId;
  style: CSSProperties;
};

type StateProps = {
  displayMode: T.ListDisplayMode;
  isOpened: boolean;
  note?: T.Note;
  searchQuery: string;
};

type DispatchProps = {
  openNote: (noteId: T.EntityId) => any;
  pinNote: (noteId: T.EntityId, shouldPin: boolean) => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export class NoteCell extends Component<Props> {
  componentDidUpdate(prevProps) {
    if (prevProps.note?.content !== this.props.note?.content) {
      this.props.invalidateHeight();
    }
  }

  render() {
    const {
      displayMode,
      isOpened,
      noteId,
      note,
      openNote,
      pinNote,
      searchQuery,
      style,
    } = this.props;

    if (!note) {
      return <div>Couldn't find note</div>;
    }

    const { title, preview } = noteTitleAndPreview(note);
    const isPinned = note.systemTags.includes('pinned');
    const isPublished = !!note.publishURL;
    const classes = classNames('note-list-item', {
      'note-list-item-selected': isOpened,
      'note-list-item-pinned': isPinned,
      'published-note': isPublished,
    });

    const terms = getTerms(searchQuery).map(makeFilterDecorator);
    const decorators = [checkboxDecorator, ...terms];

    return (
      <div style={style} className={classes}>
        <div
          className="note-list-item-pinner"
          tabIndex={0}
          onClick={() => pinNote(noteId, !isPinned)}
        />
        <div
          className="note-list-item-text theme-color-border"
          tabIndex={0}
          onClick={() => openNote(noteId)}
        >
          <div className="note-list-item-title">
            <span>{decorateWith(decorators, title)}</span>
            {isPublished && (
              <div className="note-list-item-published-icon">
                <PublishIcon />
              </div>
            )}
          </div>
          {'condensed' !== displayMode && preview.trim() && (
            <div className="note-list-item-excerpt">
              {decorateWith(decorators, preview)}
            </div>
          )}
        </div>
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps, OwnProps> = (
  state,
  { noteId }
) => ({
  displayMode: state.settings.noteDisplay,
  isOpened: state.ui.openedNote === noteId,
  note: state.data.notes.get(noteId),
  searchQuery: state.ui.searchQuery,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  openNote: actions.ui.openNote,
  pinNote: actions.data.pinNote,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteCell);
