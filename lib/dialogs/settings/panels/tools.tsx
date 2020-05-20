import React, { FunctionComponent, Fragment } from 'react';
import { connect } from 'react-redux';

import actions from '../../../state/actions';
import PanelTitle from '../../../components/panel-title';
import ButtonGroup from '../../button-group';
import SettingsGroup, { Item } from '../../settings-group';
import { showDialog } from '../../../state/ui/actions';
import ToggleGroup from '../../toggle-settings-group';

import * as S from '../../../state';

type StateProps = {
  keyboardShortcuts: boolean;
  sendNotifications: boolean;
};

type DispatchProps = {
  exportNotes: () => any;
  requestNotifications: (sendNotifications: boolean) => any;
  showImportDialog: () => any;
  toggleShortcuts: () => any;
};

type Props = DispatchProps & StateProps;

const ToolsPanel: FunctionComponent<Props> = ({
  exportNotes,
  keyboardShortcuts,
  requestNotifications,
  sendNotifications,
  showImportDialog,
  toggleShortcuts,
}) => {
  const onSelectItem = (item) => {
    if (item.slug === 'import') {
      showImportDialog();
    } else if (item.slug === 'export') {
      exportNotes();
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

      <SettingsGroup
        slug="allowNotifications"
        activeSlug={sendNotifications ? 'allowNotifications' : ''}
        onChange={() => requestNotifications(!sendNotifications)}
        renderer={ToggleGroup}
      >
        <Item title="Notify on remote changes" slug="allowNotifications" />
      </SettingsGroup>
    </Fragment>
  );
};

const mapStateToProps: S.MapState<StateProps> = ({
  settings: { keyboardShortcuts, sendNotifications },
}) => ({
  keyboardShortcuts,
  sendNotifications,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  exportNotes: () => actions.data.exportNotes(),
  requestNotifications: (sendNotifications) => ({
    type: 'REQUEST_NOTIFICATIONS',
    sendNotifications,
  }),
  showImportDialog: () => showDialog('IMPORT'),
  toggleShortcuts: () => actions.settings.toggleKeyboardShortcuts(),
};

export default connect(mapStateToProps, mapDispatchToProps)(ToolsPanel);
