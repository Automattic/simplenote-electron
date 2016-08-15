import React, { PropTypes } from 'react';
import TabbedDialog from '../tabbed-dialog';
import ToggleControl from '../controls/toggle';
import { viewExternalUrl } from '../utils/url-utils';
import TopRightArrowIcon from '../icons/arrow-top-right';

import RadioGroup from './radio-settings-group';
import ToggleGroup from './toggle-settings-group';
import SettingsGroup, { Item } from './settings-group';

const settingTabs = [ 'account', 'display', 'writing' ];

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
			<TabbedDialog
				className="settings"
				title="Settings"
				tabs={ settingTabs }
				onDone={ this.onDone }
				renderTabName={ this.renderTabName }
				renderTabContent={ this.renderTabContent }
				{ ...dialog }
			/>
		);
	},

	renderTabName( tabName ) {
		return tabName;
	},

	renderTabContent( tabName ) {
		const {
			activateTheme,
			setNoteDisplay,
			setSortType,
			toggleMarkdown,
			toggleSortOrder,
		} = this.props;

		const { settings: {
			theme: activeTheme,
			markdownEnabled: markdownIsEnabled,
			noteDisplay,
			sortType,
			sortReversed: sortIsReversed,
			accountName
		} } = this.props;

		switch ( tabName ) {
			case 'account':
				return (
					<div className="dialog-column settings-account">
						<h3 className="panel-title theme-color-fg-dim">Account</h3>
						<div className="settings-items theme-color-border">
							<div className="settings-item theme-color-border">
								<span className="settings-account-name">{accountName}</span>
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
						<SettingsGroup
							title="Sort type"
							slug="sortType"
							activeSlug={ sortType }
							onChange={ setSortType }
							renderer={ RadioGroup }
						>
							<Item title="Last modified" slug="modificationDate" />
							<Item title="Last created" slug="creationDate" />
							<Item title="Alphabetical" slug="alphabetical" />
						</SettingsGroup>

						<SettingsGroup
							title="Sort order"
							slug="sortOrder"
							activeSlug={ sortIsReversed ? 'reversed' : '' }
							onChange={ toggleSortOrder }
							renderer={ ToggleGroup }
						>
							<Item title="Reversed" slug="reversed" />
						</SettingsGroup>

						<SettingsGroup
							title="Note display"
							slug="noteDisplay"
							activeSlug={ noteDisplay }
							onChange={ setNoteDisplay }
							renderer={ RadioGroup }
						>
							<Item title="Comfy" slug="comfy" />
							<Item title="Condensed" slug="condensed" />
							<Item title="Expanded" slug="expanded" />
						</SettingsGroup>

						<SettingsGroup
							title="Theme"
							slug="theme"
							activeSlug={ activeTheme }
							onChange={ activateTheme }
							renderer={ RadioGroup }
						>
							<Item title="Light" slug="light" />
							<Item title="Dark" slug="dark" />
						</SettingsGroup>
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

export default SettingsDialog;
