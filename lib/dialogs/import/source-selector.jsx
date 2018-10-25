import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

import PanelTitle from '../../components/panel-title';
import SourceGroup from '../source-group';

import sources from './sources';

const ImportSourceSelector = props => {
  return (
    <Fragment>
      <PanelTitle headingLevel="3">Import from</PanelTitle>
      <SourceGroup
        items={sources}
        onClickItem={source => props.selectSource(source)}
      />
    </Fragment>
  );
};

ImportSourceSelector.propTypes = {
  selectSource: PropTypes.func.isRequired,
};

export default ImportSourceSelector;
