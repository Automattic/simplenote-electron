import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import appState from '../../../flux/app-state';
import { IMPORT } from '../../../../shared/dialog-types';
import exportZipArchive from '../../../utils/export';

import PanelTitle from '../../../components/panel-title';
import ButtonGroup from '../../button-group';

const ToolsPanel = ({ showImportDialog }) => {
  const onSelectItem = item => {
    if (item.slug === 'import') {
      showImportDialog();
    } else if (item.slug === 'export') {
      exportZipArchive();
    }
  };

  return (
    <div className="settings-tools">
      <PanelTitle headingLevel="3">Tools</PanelTitle>
      <ButtonGroup
        items={[
          {
            name: 'Import Notes',
            slug: 'import',
          },
          {
            name: 'Export Notes',
            slug: 'export',
          },
        ]}
        onClickItem={onSelectItem}
      />
    </div>
  );
};

ToolsPanel.propTypes = {
  showImportDialog: PropTypes.func.isRequired,
};

const mapDispatchToProps = dispatch => {
  const { showDialog } = appState.actionCreators;
  return {
    showImportDialog: () => dispatch(showDialog({ dialog: IMPORT })),
  };
};

export default connect(null, mapDispatchToProps)(ToolsPanel);
