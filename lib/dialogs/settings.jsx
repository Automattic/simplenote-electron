import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import TabbedDialog from '../tabbed-dialog';
import ToggleControl from '../controls/toggle';
import CheckboxControl from '../controls/checkbox';
import { viewExternalUrl } from '../utils/url-utils';
import TopRightArrowIcon from '../icons/arrow-top-right';

import {
	activateTheme,
	setNoteDisplay,
	setSortType,
	toggleMarkdown,
	toggleSortOrder,
} from '../flux/actions-settings';

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

	onUpdateSettingValue( event ) {
		this.props.actions.updateSettings( {
			[event.currentTarget.name]: event.currentTarget.value
		} );
	},

	onUpdateSettingBool( event ) {
		this.props.actions.updateSettings( {
			[event.currentTarget.name]: event.currentTarget.checked
		} );
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
		var state = this.props.appState;
		var { accountName } = state;
		const {
			activateTheme, activeTheme,
			setNoteDisplay, noteDisplay,
			setSortType, sortType,
			toggleMarkdown, markdownIsEnabled,
			toggleSortOrder, sortIsReversed
		} = this.props;

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
						<div className="settings-group">
							<h3 className="panel-title theme-color-fg-dim">Sort type</h3>
							<div className="settings-items theme-color-border">
								<label htmlFor="settings-field-sordType-last-modified" className="settings-item theme-color-border">
									<div className="settings-item-label">
										Last modified
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="sortType" value="modificationDate"
											id="settings-field-sordType-modificationDate"
											checked={ sortType === 'modificationDate' }
											onChange={ () => setSortType( 'modificationDate' ) } />
									</div>
								</label>
								<label htmlFor="settings-field-sordType-creationDate" className="settings-item theme-color-border">
									<div className="settings-item-label">
										Last created
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="sortType" value="creationDate"
											id="settings-field-sordType-creationDate"
											checked={ sortType === 'creationDate' }
											onChange={ () => setSortType( 'creationDate' ) } />
									</div>
								</label>
								<label htmlFor="settings-field-sordType-alphabetical" className="settings-item theme-color-border">
									<div className="settings-item-label">
										Alphabetical
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="sortType" value="alphabetical"
											id="settings-field-sordType-alphabetical"
											checked={ sortType === 'alphabetical' }
											onChange={ () => setSortType( 'alphabetical' ) } />
									</div>
								</label>
							</div>
						</div>
						<div className="settings-group">
							<h3 className="panel-title theme-color-fg-dim">Sort order</h3>
							<div className="settings-items theme-color-border">
								<label htmlFor="settings-field-sortReversed" className="settings-item theme-color-border">
									<div className="settings-item-label">
										Reversed
									</div>
									<div className="settings-item-control">
										<ToggleControl name="sortReversed" value="reversed"
											id="settings-field-sortReversed"
											checked={ sortIsReversed }
											onChange={ toggleSortOrder } />
									</div>
								</label>
							</div>
						</div>
						<div className="settings-group">
							<h3 className="panel-title theme-color-fg-dim">Note display</h3>
							<div className="settings-items theme-color-border">
								<label htmlFor="settings-field-noteDisplay-comfy" className="settings-item theme-color-border">
									<div className="settings-item-label">
										Comfy
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="noteDisplay" value="comfy"
											id="settings-field-noteDisplay-comfy"
											checked={ noteDisplay === 'comfy' }
											onChange={ () => setNoteDisplay( 'comfy' ) } />
									</div>
								</label>
								<label htmlFor="settings-field-noteDisplay-condensed" className="settings-item theme-color-border">
									<div className="settings-item-label">
										Condensed
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="noteDisplay" value="condensed"
											id="settings-field-noteDisplay-condensed"
											checked={ noteDisplay === 'condensed' }
											onChange={ () => setNoteDisplay( 'condensed' ) } />
									</div>
								</label>
								<label htmlFor="settings-field-noteDisplay-expanded" className="settings-item theme-color-border">
									<div className="settings-item-label">
										Expanded
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="noteDisplay" value="expanded"
											id="settings-field-noteDisplay-expanded"
											checked={ noteDisplay === 'expanded' }
											onChange={ () => setNoteDisplay( 'expanded' ) } />
									</div>
								</label>
							</div>
						</div>
						<div className="settings-group">
							<h3 className="panel-title theme-color-fg-dim">Theme</h3>
							<div className="settings-items theme-color-border">
								<label htmlFor="settings-field-theme-light" className="settings-item theme-color-border">
									<div className="settings-item-label">
										Light
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="theme" value="light"
											id="settings-field-theme-light"
											checked={ activeTheme === 'light'}
											onChange={ () => activateTheme( 'light' ) } />
									</div>
								</label>
								<label htmlFor="settings-field-theme-dark" className="settings-item theme-color-border">
									<div className="settings-item-label">
										Dark
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="theme" value="dark"
											id="settings-field-theme-dark"
											checked={ activeTheme === 'dark'}
											onChange={ () => activateTheme( 'dark' ) } />
									</div>
								</label>
							</div>
						</div>
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

const mapDispatchToProps = {
	activateTheme,
	setNoteDisplay,
	setSortType,
	toggleMarkdown,
	toggleSortOrder
};

export default connect( mapStateToProps, mapDispatchToProps )( SettingsDialog );
