import React from 'react';
import PropTypes from 'prop-types';
import PanelTitle from '../../../components/panel-title';
import SettingsGroup, { Item } from '../../settings-group';
import ToggleGroup from '../../toggle-settings-group';
import TopRightArrowIcon from '../../../icons/arrow-top-right';
import { viewExternalUrl } from '../../../utils/url-utils';

const AccountPanel = props => {
  const {
    accountName,
    analyticsEnabled,
    requestSignOut,
    toggleShareAnalyticsPreference,
  } = props;

  const onEditAccount = () => {
    viewExternalUrl(`https://app.simplenote.com/settings/?from=react`);
  };

  return (
    <div className="settings-account">
      <PanelTitle headingLevel="3">Account</PanelTitle>

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
            onChange={toggleShareAnalyticsPreference}
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
            onClick={requestSignOut}
          >
            Log Out
          </button>
        </li>
      </ul>
    </div>
  );
};

AccountPanel.propTypes = {
  accountName: PropTypes.string.isRequired,
  analyticsEnabled: PropTypes.bool.isRequired,
  requestSignOut: PropTypes.func.isRequired,
  toggleShareAnalyticsPreference: PropTypes.func.isRequired,
};

export default AccountPanel;
