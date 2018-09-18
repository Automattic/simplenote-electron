import React, { cloneElement } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import NoteToolbarContainer from '../note-toolbar-container';
import NoteToolbar from '../note-toolbar';
import RevisionSelector from '../revision-selector';

export const AppLayout = ({
  isNavigationOpen,
  isNoteInfoOpen,
  isNoteOpen,
  note,
  noteBucket,
  revisions,
  onUpdateContent,
  searchBar,
  noteList,
  noteEditor,
}) => {
  const mainClasses = classNames('app-layout', {
    'is-navigation-open': isNavigationOpen,
    'is-note-open': isNoteOpen,
    'is-showing-note-info': isNoteInfoOpen,
  });

  return (
    <div className={mainClasses}>
      <div className="app-layout__source-column theme-color-bg theme-color-fg">
        {searchBar}
        {noteList}
      </div>
      <div className="app-layout__note-column theme-color-bg theme-color-fg">
        <RevisionSelector
          note={note}
          revisions={revisions || []}
          onUpdateContent={onUpdateContent}
        />
        <NoteToolbarContainer
          noteBucket={noteBucket}
          toolbar={<NoteToolbar note={note} />}
        />
        {cloneElement(noteEditor, { note, noteBucket, onUpdateContent })}
      </div>
    </div>
  );
};

AppLayout.propTypes = {
  isNavigationOpen: PropTypes.bool.isRequired,
  isNoteInfoOpen: PropTypes.bool.isRequired,
  isNoteOpen: PropTypes.bool.isRequired,
  note: PropTypes.object,
  noteBucket: PropTypes.object.isRequired,
  revisions: PropTypes.array,
  onUpdateContent: PropTypes.func.isRequired,
  searchBar: PropTypes.element.isRequired,
  noteList: PropTypes.element.isRequired,
  noteEditor: PropTypes.element.isRequired,
};

export default AppLayout;
