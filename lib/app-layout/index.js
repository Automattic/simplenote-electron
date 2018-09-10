import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

export const AppLayout = ({ searchBar, noteList, noteEditor }) => {
  return (
    <Fragment>
      <div className="source-list theme-color-bg theme-color-fg">
        {searchBar}
        {noteList}
      </div>
      {noteEditor}
    </Fragment>
  );
};

AppLayout.propTypes = {
  searchBar: PropTypes.element.isRequired,
  noteList: PropTypes.element.isRequired,
  noteEditor: PropTypes.element.isRequired,
};

export default AppLayout;
