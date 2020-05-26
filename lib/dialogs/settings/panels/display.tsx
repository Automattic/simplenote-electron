import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';

import { isElectron, isMac } from '../../../utils/platform';
import RadioGroup from '../../radio-settings-group';
import SettingsGroup, { Item } from '../../settings-group';
import ToggleGroup from '../../toggle-settings-group';

import * as settingsActions from '../../../state/settings/actions';

const DisplayPanel = (props) => {
  const {
    actions,
    activeTheme,
    autoHideMenuBar,
    lineLength,
    noteDisplay,
    sortIsReversed,
    sortTagsAlpha,
    sortType,
  } = props;

  return (
    <Fragment>
      <SettingsGroup
        title="Note display"
        slug="noteDisplay"
        activeSlug={noteDisplay}
        onChange={actions.setNoteDisplay}
        renderer={RadioGroup}
      >
        <Item title="Comfy" slug="comfy" />
        <Item title="Condensed" slug="condensed" />
        <Item title="Expanded" slug="expanded" />
      </SettingsGroup>

      <SettingsGroup
        title="Line length"
        slug="lineLength"
        activeSlug={lineLength}
        onChange={actions.setLineLength}
        renderer={RadioGroup}
      >
        <Item title="Narrow" slug="narrow" />
        <Item title="Full" slug="full" />
      </SettingsGroup>

      <SettingsGroup
        title="Sort type"
        slug="sortType"
        activeSlug={sortType}
        onChange={(sortType) => actions.setSortType(sortType)}
        renderer={RadioGroup}
      >
        <Item title="Date modified" slug="modificationDate" />
        <Item title="Date created" slug="creationDate" />
        <Item title="Alphabetical" slug="alphabetical" />
      </SettingsGroup>

      <SettingsGroup
        title="Sort order"
        slug="sortOrder"
        activeSlug={sortIsReversed ? 'reversed' : ''}
        onChange={() => actions.toggleSortOrder()}
        renderer={ToggleGroup}
      >
        <Item title="Reversed" slug="reversed" />
      </SettingsGroup>

      <SettingsGroup
        title="Tags"
        slug="sortTagsAlpha"
        activeSlug={sortTagsAlpha ? 'alpha' : ''}
        onChange={() => actions.toggleSortTagsAlpha()}
        renderer={ToggleGroup}
      >
        <Item title="Sort Alphabetically" slug="alpha" />
      </SettingsGroup>

      <SettingsGroup
        title="Theme"
        slug="theme"
        activeSlug={activeTheme}
        onChange={actions.activateTheme}
        renderer={RadioGroup}
      >
        {navigator.userAgent.toLowerCase().indexOf(' electron/') === -1 && (
          <Item title="System" slug="system" />
        )}
        <Item title="Light" slug="light" />
        <Item title="Dark" slug="dark" />
      </SettingsGroup>

      {isElectron && !isMac && (
        <SettingsGroup
          title="Menu Bar"
          slug="autoHideMenuBar"
          activeSlug={autoHideMenuBar ? 'autoHide' : ''}
          description="When set to auto-hide, press the Alt key to toggle."
          onChange={actions.toggleAutoHideMenuBar}
          renderer={ToggleGroup}
        >
          <Item title="Hide Automatically" slug="autoHide" />
        </SettingsGroup>
      )}
    </Fragment>
  );
};

DisplayPanel.propTypes = {
  actions: PropTypes.object.isRequired,
  activeTheme: PropTypes.string.isRequired,
  autoHideMenuBar: PropTypes.bool,
  lineLength: PropTypes.string.isRequired,
  noteDisplay: PropTypes.string.isRequired,
  sortIsReversed: PropTypes.bool.isRequired,
  sortTagsAlpha: PropTypes.bool.isRequired,
  sortType: PropTypes.string.isRequired,
};

const mapStateToProps = ({ settings }) => {
  return {
    activeTheme: settings.theme,
    autoHideMenuBar: settings.autoHideMenuBar,
    lineLength: settings.lineLength,
    noteDisplay: settings.noteDisplay,
    sortIsReversed: settings.sortReversed,
    sortTagsAlpha: settings.sortTagsAlpha,
    sortType: settings.sortType,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    actions: bindActionCreators(settingsActions, dispatch),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DisplayPanel);
