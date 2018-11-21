import React, { cloneElement, Suspense } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { get } from 'lodash';
import NoteToolbarContainer from '../note-toolbar-container';
import NoteToolbar from '../note-toolbar';
import RevisionSelector from '../revision-selector';

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
  searchBar,
  noteEditor,
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
        {searchBar}
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
        {cloneElement(noteEditor, {
          note,
          noteBucket,
          onUpdateContent,
          // Tags are flattened here as a separate prop to trigger a re-render
          // in the tree when the tags are changed
          tags: get(note, 'data.tags', []),
        })}
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
  searchBar: PropTypes.element.isRequired,
  noteEditor: PropTypes.element.isRequired,
};

export default AppLayout;
