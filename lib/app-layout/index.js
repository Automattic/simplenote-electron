import React, { Fragment, cloneElement } from 'react';
import PropTypes from 'prop-types';
import NoteToolbarContainer from '../note-toolbar-container';
import NoteToolbar from '../note-toolbar';
import RevisionSelector from '../revision-selector';

export const AppLayout = ({
  note,
  noteBucket,
  revisions,
  onUpdateContent,
  searchBar,
  noteList,
  noteEditor,
}) => {
  return (
    <Fragment>
      <div className="app-layout-source-column theme-color-bg theme-color-fg">
        {searchBar}
        {noteList}
      </div>
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
    </Fragment>
  );
};

AppLayout.propTypes = {
  note: PropTypes.object,
  noteBucket: PropTypes.object.isRequired,
  revisions: PropTypes.array,
  onUpdateContent: PropTypes.func.isRequired,
  searchBar: PropTypes.element.isRequired,
  noteList: PropTypes.element.isRequired,
  noteEditor: PropTypes.element.isRequired,
};

export default AppLayout;
