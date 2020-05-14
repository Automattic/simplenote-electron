import React, { FunctionComponent, Fragment } from 'react';
import { connect } from 'react-redux';

import exportZipArchive from '../../../utils/export';

import PanelTitle from '../../../components/panel-title';
import ButtonGroup from '../../button-group';
import SettingsGroup, { Item } from '../../settings-group';
import { showDialog } from '../../../state/ui/actions';
import ToggleGroup from '../../toggle-settings-group';
import { toggleKeyboardShortcuts } from '../../../state/settings/actions';

import * as S from '../../../state';

type DispatchProps = {
  showImportDialog: () => any;
  toggleShortcuts: () => any;
};

type StateProps = {
  keyboardShortcuts: boolean;
};

type Props = DispatchProps & StateProps;

const ToolsPanel: FunctionComponent<Props> = ({
  keyboardShortcuts,
  showImportDialog,
  toggleShortcuts,
}) => {
  const onSelectItem = (item) => {
    if (item.slug === 'import') {
      showImportDialog();
    } else if (item.slug === 'export') {
      exportZipArchive();
    }
  };

  return (
    <Fragment>
      <div className="settings-tools">
        <PanelTitle headingLevel={3}>Tools</PanelTitle>
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
      <SettingsGroup
        slug="keyboardShortcuts"
        activeSlug={keyboardShortcuts ? 'keyboardShortcuts' : ''}
        onChange={toggleShortcuts}
        renderer={ToggleGroup}
      >
        <Item title="Keyboard Shortcuts" slug="keyboardShortcuts" />
      </SettingsGroup>
    </Fragment>
  );
};

const mapStateToProps: S.MapState<StateProps> = ({
  settings: { keyboardShortcuts },
}) => ({
  keyboardShortcuts,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  showImportDialog: () => dispatch(showDialog('IMPORT')),
  toggleShortcuts: () => dispatch(toggleKeyboardShortcuts()),
});

export default connect(mapStateToProps, mapDispatchToProps)(ToolsPanel);
