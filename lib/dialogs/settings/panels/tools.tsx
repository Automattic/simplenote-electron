import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import appState from '../../../flux/app-state';
import exportZipArchive from '../../../utils/export';

import PanelTitle from '../../../components/panel-title';
import ButtonGroup from '../../button-group';

import { showDialog } from '../../../state/ui/actions';

import * as S from '../../../state';

type DispatchProps = {
  showDialog: () => any;
};

type Props = DispatchProps;

const ToolsPanel: FunctionComponent<Props> = ({ showDialog }) => {
  const onSelectItem = (item) => {
    if (item.slug === 'import') {
      showDialog();
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

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  showDialog: () => dispatch(showDialog('IMPORT')),
});

export default connect(null, mapDispatchToProps)(ToolsPanel);
