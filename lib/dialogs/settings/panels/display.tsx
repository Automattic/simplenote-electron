import React, { Fragment, FunctionComponent } from 'react';
import { connect } from 'react-redux';

import { isElectron, isLinux, isMac } from '../../../utils/platform';
import RadioGroup from '../../radio-settings-group';
import SettingsGroup, { Item } from '../../settings-group';
import ToggleGroup from '../../toggle-settings-group';
import actions from '../../../state/actions';

import * as S from '../../../state';
import * as T from '../../../types';

type SortOption = {
  label: string;
  type: T.SortType;
  isReversed: boolean;
};

const sortTypes: SortOption[] = [
  {
    label: 'Name: A-Z',
    type: 'alphabetical',
    isReversed: false,
  },
  {
    label: 'Name: Z-A',
    type: 'alphabetical',
    isReversed: true,
  },
  {
    label: 'Created: Newest',
    type: 'creationDate',
    isReversed: false,
  },
  {
    label: 'Created: Oldest',
    type: 'creationDate',
    isReversed: true,
  },
  {
    label: 'Modified: Newest',
    type: 'modificationDate',
    isReversed: false,
  },
  {
    label: 'Modified: Oldest',
    type: 'modificationDate',
    isReversed: true,
  },
];

type StateProps = {
  activeTheme: T.Theme;
  autoHideMenuBar: boolean;
  lineLength: T.LineLength;
  noteDisplay: T.ListDisplayMode;
  sortReversed: boolean;
  sortTagsAlpha: boolean;
  sortType: T.SortType;
};

type DispatchProps = {
  setActiveTheme: (theme: T.Theme) => any;
  setLineLength: (lineLength: T.LineLength) => any;
  setNoteDisplay: (displayMode: T.ListDisplayMode) => any;
  setSortType: (sortType: T.SortType, sortReversed: boolean) => any;
  toggleAutoHideMenuBar: () => any;
  toggleSortTagsAlpha: () => any;
};

type Props = StateProps & DispatchProps;

const DisplayPanel: FunctionComponent<Props> = (props) => (
  <Fragment>
    <SettingsGroup
      title="Note display"
      slug="noteDisplay"
      activeSlug={props.noteDisplay}
      onChange={props.setNoteDisplay}
      renderer={RadioGroup}
    >
      <Item title="Comfy" slug="comfy" />
      <Item title="Condensed" slug="condensed" />
      <Item title="Expanded" slug="expanded" />
    </SettingsGroup>

    <SettingsGroup
      title="Line length"
      slug="lineLength"
      activeSlug={props.lineLength}
      onChange={props.setLineLength}
      renderer={RadioGroup}
    >
      <Item title="Narrow" slug="narrow" />
      <Item title="Full" slug="full" />
    </SettingsGroup>

    <SettingsGroup
      title="Sort by"
      slug="sortType"
      activeSlug={
        props.sortReversed ? props.sortType + '-reversed' : props.sortType
      }
      onChange={(slug) => {
        const isReversed = slug.includes('-reversed');
        const newSortType = slug.split('-');
        props.setSortType(newSortType[0], isReversed);
      }}
      renderer={RadioGroup}
    >
      {sortTypes.map((item) => {
        const slug = item.isReversed ? item.type + '-reversed' : item.type;
        return <Item key={slug} title={item.label} slug={slug} />;
      })}
    </SettingsGroup>

    <SettingsGroup
      title="Tags"
      slug="sortTagsAlpha"
      activeSlug={props.sortTagsAlpha ? 'alpha' : ''}
      onChange={props.toggleSortTagsAlpha}
      renderer={ToggleGroup}
    >
      <Item title="Sort Alphabetically" slug="alpha" />
    </SettingsGroup>

    <SettingsGroup
      title="Theme"
      slug="theme"
      activeSlug={props.activeTheme}
      onChange={props.setActiveTheme}
      renderer={RadioGroup}
    >
      {!isLinux && <Item title="System" slug="system" />}
      <Item title="Light" slug="light" />
      <Item title="Dark" slug="dark" />
    </SettingsGroup>

    {isElectron && !isMac && (
      <SettingsGroup
        title="Menu Bar"
        slug="autoHideMenuBar"
        activeSlug={props.autoHideMenuBar ? 'autoHide' : ''}
        description="When set to auto-hide, press the Alt key to toggle."
        onChange={props.toggleAutoHideMenuBar}
        renderer={ToggleGroup}
      >
        <Item title="Hide Automatically" slug="autoHide" />
      </SettingsGroup>
    )}
  </Fragment>
);

const mapStateToProps: S.MapState<StateProps> = ({ settings }) => ({
  activeTheme: settings.theme,
  autoHideMenuBar: settings.autoHideMenuBar,
  lineLength: settings.lineLength,
  noteDisplay: settings.noteDisplay,
  sortReversed: settings.sortReversed,
  sortTagsAlpha: settings.sortTagsAlpha,
  sortType: settings.sortType,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  setActiveTheme: actions.settings.activateTheme,
  setLineLength: actions.settings.setLineLength,
  setNoteDisplay: actions.settings.setNoteDisplay,
  setSortType: actions.settings.setSortType,
  toggleAutoHideMenuBar: actions.settings.toggleAutoHideMenuBar,
  toggleSortTagsAlpha: actions.settings.toggleSortTagsAlpha,
};

export default connect(mapStateToProps, mapDispatchToProps)(DisplayPanel);
