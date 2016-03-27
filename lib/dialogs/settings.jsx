import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import TabbedDialog from '../tabbed-dialog';
import ToggleControl from '../controls/toggle';
import { viewExternalUrl } from '../utils/url-utils';
import TopRightArrowIcon from '../icons/arrow-top-right';
import { flowRight, fromPairs, pick, zip } from 'lodash';

import RadioGroup from './radio-settings-group';
import ToggleGroup from './toggle-settings-group';
import SettingsGroup from './settings-group';

import * as settingsActions from '../flux/actions-settings';

const displayTypes = [
	[ 'comfy', 'Comfy' ],
	[ 'condensed', 'Condensed' ],
	[ 'expanded', 'Expanded' ]
];
const settingTabs = [ 'account', 'display', 'writing' ];
const sortOrders = [
	[ 'reversed', 'Reversed' ]
];
const sortTypes = [
	[ 'modificationDate', 'Last Modified' ],
	[ 'creationDate', 'Last Created' ],
	[ 'alphabetical', 'Alphabetical' ]
];
const themeTypes = [
	[ 'light', 'Light' ],
	[ 'dark', 'Dark' ]
];

const addSettingNames = l => zip( [ 'groupTitle', 'groupSlug', 'items', 'activeItem', 'onChange', 'renderer' ], l );

export const SettingsDialog = React.createClass( {
	propTypes: {
		actions: PropTypes.object.isRequired,
		onSignOut: PropTypes.func.isRequired,
	},

	onDone() {
		this.props.actions.closeDialog( { key: this.props.dialog.key } );
	},

	onEditAccount() {
		viewExternalUrl( 'https://app.simplenote.com/settings' );
	},

	onUpdateSortType( event ) {
		this.onUpdateSettingValue( event );
		this.props.actions.loadNotes( {
			noteBucket: this.props.noteBucket
		} );
	},

	onUpdateSortReversed( event ) {
		this.onUpdateSettingBool( event );
		this.props.actions.loadNotes( {
			noteBucket: this.props.noteBucket
		} );
	},

	render() {
		var dialog = this.props.dialog;

		return (
			<TabbedDialog className="settings"
				title="Settings"
				tabs={settingTabs}
				onDone={this.onDone}
				renderTabName={this.renderTabName}
				renderTabContent={this.renderTabContent}
				{...dialog} />
		);
	},

	renderTabName( tabName ) {
		return tabName;
	},

	renderTabContent( tabName ) {
		const { accountName } = this.props.appState;
		const {
			activateTheme, activeTheme,
			setNoteDisplay, noteDisplay,
			setSortType, sortType,
			toggleMarkdown, markdownIsEnabled,
			toggleSortOrder, sortIsReversed
		} = this.props;

		const settingGroups = [
			[ 'Sort type', 'sortType', sortTypes, sortType, setSortType, RadioGroup ],
			[ 'Sort order', 'sortReversed', sortOrders, sortIsReversed ? 'reversed' : '', toggleSortOrder, ToggleGroup ],
			[ 'Note display', 'noteDisplay', displayTypes, noteDisplay, setNoteDisplay, RadioGroup ],
			[ 'Theme', 'theme', themeTypes, activeTheme, activateTheme, RadioGroup ]
		].map( flowRight( fromPairs, addSettingNames ) );

		switch ( tabName ) {
			case 'account':
				return (
					<div className="dialog-column settings-account">
						<h3 className="panel-title theme-color-fg-dim">Account</h3>
						<div className="settings-items theme-color-border">
							<div className="settings-item theme-color-border">
								<span className="settings-item-text-input transparent-input">{accountName}</span>
							</div>
						</div>

						<ul className="dialog-actions">
							<li><button type="button" className="button button-primary" onClick={this.props.onSignOut}>Log Out</button></li>
							<li><button type="button" className="button button button-borderless" onClick={this.onEditAccount}>Edit Account <TopRightArrowIcon /></button></li>
						</ul>
					</div>
				);

			case 'display':
				return (
					<div className="dialog-column settings-display">
						{ settingGroups.map( ( props, key ) => (
							<SettingsGroup { ...props } { ...{ key } } />
						) ) }
					</div>
				);

			case 'writing':
				return (
					<div className="dialog-column settings-writing">
						<div className="settings-group">
							<div className="settings-items theme-color-border">
								<label htmlFor="settings-field-markdown" className="settings-item theme-color-border">
									<div className="settings-item-label">
										Enable Markdown
									</div>
									<div className="settings-item-control">
										<ToggleControl name="markdownEnabled" value="enabled"
											id="settings-field-markdown"
											checked={ markdownIsEnabled }
											onChange={ toggleMarkdown } />
									</div>
								</label>
							</div>
							<p>
								Markdown lets you write notes with links, lists, and
								other styles using regular characters and
								punctuation marks. <a target="_blank" href="http://simplenote.com/help/#markdown">Learn more…</a>
							</p>
						</div>
					</div>
				);
		}
	}

} );

const mapStateToProps = ( { settings } ) => ( {
	activeTheme: settings.theme,
	markdownIsEnabled: settings.markdownEnabled,
	noteDisplay: settings.noteDisplay,
	sortType: settings.sortType,
	sortIsReversed: settings.sortReversed
} );

const mapDispatchToProps = pick( settingsActions, [
	'activateTheme',
	'setNoteDisplay',
	'setSortType',
	'toggleMarkdown',
	'toggleSortOrder'
] );

export default connect( mapStateToProps, mapDispatchToProps )( SettingsDialog );
