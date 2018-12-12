import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';

import RadioGroup from '../../radio-settings-group';
import SettingsGroup, { Item } from '../../settings-group';
import ToggleGroup from '../../toggle-settings-group';

import * as settingsActions from '../../../state/settings/actions';

const DisplayPanel = props => {
  const {
    actions,
    activeTheme,
    lineLength,
    noteDisplay,
    sortIsReversed,
    sortTagsAlpha,
    sortType,
  } = props;

  return (
    <div className="dialog-column settings-display">
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
        onChange={actions.setSortType}
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
        onChange={actions.toggleSortOrder}
        renderer={ToggleGroup}
      >
        <Item title="Reversed" slug="reversed" />
      </SettingsGroup>

      <SettingsGroup
        title="Tags"
        slug="sortTagsAlpha"
        activeSlug={sortTagsAlpha ? 'alpha' : ''}
        onChange={actions.toggleSortTagsAlpha}
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
        <Item title="Light" slug="light" />
        <Item title="Dark" slug="dark" />
      </SettingsGroup>
    </div>
  );
};

DisplayPanel.propTypes = {
  actions: PropTypes.object.isRequired,
  activeTheme: PropTypes.string.isRequired,
  lineLength: PropTypes.string.isRequired,
  noteDisplay: PropTypes.string.isRequired,
  sortIsReversed: PropTypes.bool.isRequired,
  sortTagsAlpha: PropTypes.bool.isRequired,
  sortType: PropTypes.string.isRequired,
};

const mapStateToProps = ({ settings }) => {
  return {
    activeTheme: settings.theme,
    lineLength: settings.lineLength,
    noteDisplay: settings.noteDisplay,
    sortIsReversed: settings.sortReversed,
    sortTagsAlpha: settings.sortTagsAlpha,
    sortType: settings.sortType,
  };
};

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators(settingsActions, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(DisplayPanel);
