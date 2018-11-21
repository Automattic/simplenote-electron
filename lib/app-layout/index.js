import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { get } from 'lodash';

import NoteEditor from '../note-editor';
import NoteToolbarContainer from '../note-toolbar-container';
import NoteToolbar from '../note-toolbar';
import RevisionSelector from '../revision-selector';
import SearchBar from '../search-bar';

const NoteList = React.lazy(() =>
  import(/* webpackChunkName: 'note-list' */ '../note-list')
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
  onUpdateNoteTags,
}) => {
  const mainClasses = classNames('app-layout', {
    'is-focus-mode': isFocusMode,
    'is-navigation-open': isNavigationOpen,
    'is-note-open': isNoteOpen,
    'is-showing-note-info': isNoteInfoOpen,
  });

  return (
    <div className={mainClasses}>
      <div className="app-layout__source-column theme-color-bg theme-color-fg">
        <SearchBar noteBucket={noteBucket} />
        <Suspense fallback={<p>Loading</p>}>
          <NoteList
            noteBucket={noteBucket}
            isSmallScreen={isSmallScreen}
            onNoteOpened={onNoteOpened}
          />
        </Suspense>
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
          onUpdateNoteTags={onUpdateNoteTags}
          tags={get(note, 'data.tags', []) /* flattened to trigger re-render */}
        />
      </div>
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
  onUpdateNoteTags: PropTypes.func.isRequired,
};

export default AppLayout;
