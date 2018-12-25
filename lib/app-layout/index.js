import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { get } from 'lodash';

import NoteToolbarContainer from '../note-toolbar-container';
import NoteToolbar from '../note-toolbar';
import RevisionSelector from '../revision-selector';
import SearchBar from '../search-bar';
import SimplenoteCompactLogo from '../icons/simplenote-compact';
import TransitionDelayEnter from '../components/transition-delay-enter';

const NoteList = React.lazy(() =>
  import(/* webpackChunkName: 'note-list' */ '../note-list')
);

const NoteEditor = React.lazy(() =>
  import(/* webpackChunkName: 'note-editor' */ '../note-editor')
);

export const AppLayout = ({
  isFocusMode,
  isNavigationOpen,
  isNoteInfoOpen,
  isNoteOpen,
  isSmallScreen,
  note,
  noteBucket,
  revisions,
  onNoteClosed,
  onNoteOpened,
  onUpdateContent,
}) => {
  const mainClasses = classNames('app-layout', {
    'is-focus-mode': isFocusMode,
    'is-navigation-open': isNavigationOpen,
    'is-note-open': isNoteOpen,
    'is-showing-note-info': isNoteInfoOpen,
  });

  const placeholder = (
    <TransitionDelayEnter delay={1000}>
      <div className="app-layout__placeholder">
        <SimplenoteCompactLogo />
      </div>
    </TransitionDelayEnter>
  );

  return (
    <div className={mainClasses}>
      <Suspense fallback={placeholder}>
        <div className="app-layout__source-column theme-color-bg theme-color-fg">
          <SearchBar noteBucket={noteBucket} />
          <NoteList
            noteBucket={noteBucket}
            isSmallScreen={isSmallScreen}
            onNoteOpened={onNoteOpened}
          />
        </div>
        <div className="app-layout__note-column theme-color-bg theme-color-fg">
          <RevisionSelector
            note={note}
            revisions={revisions || []}
            onUpdateContent={onUpdateContent}
          />
          <NoteToolbarContainer
            onNoteClosed={onNoteClosed}
            noteBucket={noteBucket}
            toolbar={<NoteToolbar note={note} />}
          />
          <NoteEditor
            note={note}
            noteBucket={noteBucket}
            onUpdateContent={onUpdateContent}
            tags={
              get(note, 'data.tags', []) /* flattened to trigger re-render */
            }
          />
        </div>
      </Suspense>
    </div>
  );
};

AppLayout.propTypes = {
  isFocusMode: PropTypes.bool.isRequired,
  isNavigationOpen: PropTypes.bool.isRequired,
  isNoteInfoOpen: PropTypes.bool.isRequired,
  isNoteOpen: PropTypes.bool.isRequired,
  isSmallScreen: PropTypes.bool.isRequired,
  note: PropTypes.object,
  noteBucket: PropTypes.object.isRequired,
  revisions: PropTypes.array,
  onNoteClosed: PropTypes.func.isRequired,
  onNoteOpened: PropTypes.func.isRequired,
  onUpdateContent: PropTypes.func.isRequired,
};

export default AppLayout;
