import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import PanelTitle from '../../../components/panel-title';
import SettingsGroup, { Item } from '../../settings-group';
import ToggleGroup from '../../toggle-settings-group';
import TopRightArrowIcon from '../../../icons/arrow-top-right';
import { viewExternalUrl } from '../../../utils/url-utils';
import actions from '../../../state/actions';

import * as S from '../../../state';

type StateProps = {
  accountName: string;
  analyticsEnabled: boolean | null;
};

type DispatchProps = {
  logout: () => any;
  toggleAnalytics: () => any;
};

type Props = StateProps & DispatchProps;

const AccountPanel: FunctionComponent<Props> = ({
  accountName,
  analyticsEnabled,
  logout,
  toggleAnalytics,
}) => {
  const onEditAccount = () => {
    viewExternalUrl(`https://app.simplenote.com/settings/?from=react`);
  };

  return (
    <div className="settings-account">
      <PanelTitle headingLevel={3}>Account</PanelTitle>

      <div className="settings-items theme-color-border">
        <div className="settings-item theme-color-border">
          <span className="settings-account-name">{accountName}</span>
        </div>
      </div>

      <ul className="dialog-actions">
        <li>
          <button
            type="button"
            className="button button-borderless"
            onClick={onEditAccount}
          >
            Edit Account <TopRightArrowIcon />
          </button>
        </li>
        <li>
          <SettingsGroup
            title="Privacy"
            slug="shareAnalytics"
            activeSlug={analyticsEnabled ? 'enabled' : ''}
            description="Help us improve Simplenote by sharing usage data with our analytics tool."
            onChange={toggleAnalytics}
            learnMoreURL="https://automattic.com/cookies"
            renderer={ToggleGroup}
          >
            <Item title="Share analytics" slug="enabled" />
          </SettingsGroup>
        </li>
        <li>
          <button
            type="button"
            className="button button-primary"
            onClick={logout}
          >
            Log Out
          </button>
        </li>
      </ul>
    </div>
  );
};

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  accountName: state.settings.accountName,
  analyticsEnabled: state.data.analyticsAllowed,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  logout: actions.ui.logout,
  toggleAnalytics: actions.data.toggleAnalytics,
};

export default connect(mapStateToProps, mapDispatchToProps)(AccountPanel);
