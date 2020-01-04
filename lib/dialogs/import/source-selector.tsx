import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { reject } from 'lodash';

import PanelTitle from '../../components/panel-title';
import ButtonGroup from '../button-group';

import sources from './sources';

const ImportSourceSelector = ({ isElectron, selectSource }) => {
  return (
    <Fragment>
      <PanelTitle headingLevel="3">Import from</PanelTitle>
      <ButtonGroup
        items={
          isElectron ? sources : reject(sources, item => item.electronOnly)
        }
        onClickItem={source => selectSource(source)}
      />
    </Fragment>
  );
};

ImportSourceSelector.propTypes = {
  isElectron: PropTypes.bool.isRequired,
  selectSource: PropTypes.func.isRequired,
};

export default ImportSourceSelector;
