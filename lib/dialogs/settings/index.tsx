import React, { Component } from 'react';
import { connect } from 'react-redux';

import Dialog from '../../dialog';
import { isElectron } from '../../utils/platform';
import TabPanels from '../../components/tab-panels';

import AccountPanel from './panels/account';
import DisplayPanel from './panels/display';
import ToolsPanel from './panels/tools';

import { closeDialog } from '../../state/ui/actions';

import * as S from '../../state';

const settingTabs = ['account', 'display', 'tools'];

type OwnProps = {
  actions: object;
  onSignOut: () => any;
  settings: S.State['settings'];
  toggleShareAnalyticsPreference: (preferencesBucket: object) => any;
};

type StateProps = {
  analyticsEnabled: boolean;
};

type DispatchProps = {
  allowAnalytics: (analyticsAllowed: boolean) => any;
  closeDialog: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export class SettingsDialog extends Component<Props> {
  onToggleShareAnalyticsPreference = () => {
    this.props.toggleShareAnalyticsPreference();
  };

  signOut = () => {
    const { onSignOut } = this.props;

    onSignOut();

    if (isElectron) {
      const ipcRenderer = __non_webpack_require__('electron').ipcRenderer; // eslint-disable-line no-undef
      ipcRenderer.send('clearCookies');
    }
  };

  render() {
    const { closeDialog, settings } = this.props;
    const { analyticsEnabled } = this.props.preferences;

    return (
      <Dialog className="settings" title="Settings" onDone={closeDialog}>
        <TabPanels tabNames={settingTabs}>
          <AccountPanel
            accountName={settings.accountName}
            analyticsEnabled={analyticsEnabled}
            toggleShareAnalyticsPreference={
              this.onToggleShareAnalyticsPreference
            }
          />
          <DisplayPanel />
          <ToolsPanel />
        </TabPanels>
      </Dialog>
    );
  }
}

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  closeDialog: () => dispatch(closeDialog()),
  toggleShareAnalyticsPreference: (args) => {
    dispatch(toggleShareAnalyticsPreference(args));
  },
});

export default connect(null, mapDispatchToProps)(SettingsDialog);
