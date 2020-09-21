import React, { Fragment, FunctionComponent } from 'react';
import { connect } from 'react-redux';
import i18n from 'i18n-calypso';

import { isElectron, isMac } from '../../../utils/platform';
import RadioGroup from '../../radio-settings-group';
import SettingsGroup, { Item } from '../../settings-group';
import ToggleGroup from '../../toggle-settings-group';
import actions from '../../../state/actions';

import * as S from '../../../state';
import * as T from '../../../types';

type StateProps = {
  activeTheme: T.Theme;
  autoHideMenuBar: boolean;
  lineLength: T.LineLength;
  noteDisplay: T.ListDisplayMode;
  sortIsReversed: boolean;
  sortTagsAlpha: boolean;
  sortType: T.SortType;
};

type DispatchProps = {
  setActiveTheme: (theme: T.Theme) => any;
  setLineLength: (lineLength: T.LineLength) => any;
  setNoteDisplay: (displayMode: T.ListDisplayMode) => any;
  setSortType: (sortType: T.SortType) => any;
  toggleAutoHideMenuBar: () => any;
  toggleSortOrder: () => any;
  toggleSortTagsAlpha: () => any;
};

type Props = StateProps & DispatchProps;

const DisplayPanel: FunctionComponent<Props> = (props) => (
  <Fragment>
    <SettingsGroup
      title={i18n.translate('Note display')}
      slug="noteDisplay"
      activeSlug={props.noteDisplay}
      onChange={props.setNoteDisplay}
      renderer={RadioGroup}
    >
      <Item title={i18n.translate('Comfy')} slug="comfy" />
      <Item title={i18n.translate('Condensed')} slug="condensed" />
      <Item title={i18n.translate('Expanded')} slug="expanded" />
    </SettingsGroup>

    <SettingsGroup
      title={i18n.translate('Line length')}
      slug="lineLength"
      activeSlug={props.lineLength}
      onChange={props.setLineLength}
      renderer={RadioGroup}
    >
      <Item title={i18n.translate('Narrow')} slug="narrow" />
      <Item title={i18n.translate('Full')} slug="full" />
    </SettingsGroup>

    <SettingsGroup
      title={i18n.translate('Sort type')}
      slug="sortType"
      activeSlug={props.sortType}
      onChange={props.setSortType}
      renderer={RadioGroup}
    >
      <Item title={i18n.translate('Date modified')} slug="modificationDate" />
      <Item title={i18n.translate('Date created')} slug="creationDate" />
      <Item title={i18n.translate('Alphabetical')} slug="alphabetical" />
    </SettingsGroup>

    <SettingsGroup
      title={i18n.translate('Sort order')}
      slug="sortOrder"
      activeSlug={props.sortIsReversed ? 'reversed' : ''}
      onChange={props.toggleSortOrder}
      renderer={ToggleGroup}
    >
      <Item title={i18n.translate('Reversed')} slug="reversed" />
    </SettingsGroup>

    <SettingsGroup
      title={i18n.translate('Tags')}
      slug="sortTagsAlpha"
      activeSlug={props.sortTagsAlpha ? 'alpha' : ''}
      onChange={props.toggleSortTagsAlpha}
      renderer={ToggleGroup}
    >
      <Item title={i18n.translate('Sort Alphabetically')} slug="alpha" />
    </SettingsGroup>

    <SettingsGroup
      title={i18n.translate('Theme')}
      slug="theme"
      activeSlug={props.activeTheme}
      onChange={props.setActiveTheme}
      renderer={RadioGroup}
    >
      {navigator.userAgent.toLowerCase().indexOf(' electron/') === -1 && (
        <Item title={i18n.translate('System')} slug="system" />
      )}
      <Item title={i18n.translate('Light')} slug="light" />
      <Item title={i18n.translate('Dark')} slug="dark" />
    </SettingsGroup>

    {isElectron && !isMac && (
      <SettingsGroup
        title={i18n.translate('Menu Bar')}
        slug="autoHideMenuBar"
        activeSlug={props.autoHideMenuBar ? 'autoHide' : ''}
        description={i18n.translate(
          'When set to auto-hide, press the Alt key to toggle.'
        )}
        onChange={props.toggleAutoHideMenuBar}
        renderer={ToggleGroup}
      >
        <Item title={i18n.translate('Hide Automatically')} slug="autoHide" />
      </SettingsGroup>
    )}
  </Fragment>
);

const mapStateToProps: S.MapState<StateProps> = ({ settings }) => ({
  activeTheme: settings.theme,
  autoHideMenuBar: settings.autoHideMenuBar,
  lineLength: settings.lineLength,
  noteDisplay: settings.noteDisplay,
  sortIsReversed: settings.sortReversed,
  sortTagsAlpha: settings.sortTagsAlpha,
  sortType: settings.sortType,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  setActiveTheme: actions.settings.activateTheme,
  setLineLength: actions.settings.setLineLength,
  setNoteDisplay: actions.settings.setNoteDisplay,
  setSortType: actions.settings.setSortType,
  toggleAutoHideMenuBar: actions.settings.toggleAutoHideMenuBar,
  toggleSortOrder: actions.settings.toggleSortOrder,
  toggleSortTagsAlpha: actions.settings.toggleSortTagsAlpha,
};

export default connect(mapStateToProps, mapDispatchToProps)(DisplayPanel);
