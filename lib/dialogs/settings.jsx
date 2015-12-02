import React, { PropTypes } from 'react';
import TabbedDialog from '../tabbed-dialog';
import ToggleControl from '../controls/toggle';
import CheckboxControl from '../controls/checkbox';

const settingTabs = [ 'account', 'display', 'writing' ];

export default React.createClass( {

	propTypes: {
		actions: PropTypes.object.isRequired,
		onSignOut: PropTypes.func.isRequired,
	},

	onDone() {
		this.props.actions.closeDialog( { key: this.props.dialog.key } );
	},

	onEditAccount() {
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
		var settings = this.props.settings;
		var { accountName } = state;

		switch ( tabName ) {
			case 'account':
				return (
					<div className="dialog-column settings-account">
						<h3 className="panel-title">Account</h3>
						<div className="settings-items">
							<label htmlFor="" className="settings-item">
								<span className="settings-item-text-input">{accountName}</span>
							</label>
						</div>

						<ul className="dialog-actions">
							<li><button type="button" className="basic-button" onClick={this.props.onSignOut}>Sign Out</button></li>
							<li><button type="button" className="basic-button" onClick={this.onEditAccount}>Edit Account</button></li>
						</ul>
					</div>
				);

			case 'display':
				return (
					<div className="dialog-column settings-display">
						<div className="settings-group">
							<h3 className="panel-title">Sort type</h3>
							<div className="settings-items">
								<label htmlFor="settings-field-sordType-last-modified" className="settings-item">
									<div className="settings-item-label">
										Last modified
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="sortType" value="last-modified"
											id="settings-field-sordType-last-modified"
											checked={settings.sortType === 'last-modified'}
											onChange={this.onUpdateSettingValue} />
									</div>
								</label>
								<label htmlFor="settings-field-sordType-last-created" className="settings-item">
									<div className="settings-item-label">
										Last created
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="sortType" value="last-created"
											id="settings-field-sordType-last-created"
											checked={settings.sortType === 'last-created'}
											onChange={this.onUpdateSettingValue} />
									</div>
								</label>
								<label htmlFor="settings-field-sordType-alphabetical" className="settings-item">
									<div className="settings-item-label">
										Alphabetical
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="sortType" value="alphabetical"
											id="settings-field-sordType-alphabetical"
											checked={settings.sortType === 'alphabetical'}
											onChange={this.onUpdateSettingValue} />
									</div>
								</label>
							</div>
						</div>
						<div className="settings-group">
							<h3 className="panel-title">Sort order</h3>
							<div className="settings-items">
								<label htmlFor="settings-field-sortReversed" className="settings-item">
									<div className="settings-item-label">
										Reversed
									</div>
									<div className="settings-item-control">
										<ToggleControl name="sortReversed" value="reversed"
											id="settings-field-sortReversed"
											checked={!!settings.sortReversed}
											onChange={this.onUpdateSettingBool} />
									</div>
								</label>
							</div>
						</div>
						<div className="settings-group">
							<h3 className="panel-title">Note display</h3>
							<div className="settings-items">
								<label htmlFor="settings-field-noteDisplay-comfy" className="settings-item">
									<div className="settings-item-label">
										Comfy
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="noteDisplay" value="comfy"
											id="settings-field-noteDisplay-comfy"
											checked={settings.noteDisplay === 'comfy'}
											onChange={this.onUpdateSettingValue} />
									</div>
								</label>
								<label htmlFor="settings-field-noteDisplay-condensed" className="settings-item">
									<div className="settings-item-label">
										Condensed
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="noteDisplay" value="condensed"
											id="settings-field-noteDisplay-condensed"
											checked={settings.noteDisplay === 'condensed'}
											onChange={this.onUpdateSettingValue} />
									</div>
								</label>
								<label htmlFor="settings-field-noteDisplay-expanded" className="settings-item">
									<div className="settings-item-label">
										Expanded
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="noteDisplay" value="expanded"
											id="settings-field-noteDisplay-expanded"
											checked={settings.noteDisplay === 'expanded'}
											onChange={this.onUpdateSettingValue} />
									</div>
								</label>
							</div>
						</div>
						<div className="settings-group">
							<h3 className="panel-title">Theme</h3>
							<div className="settings-items">
								<label htmlFor="settings-field-theme-light" className="settings-item">
									<div className="settings-item-label">
										Light
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="theme" value="light"
											id="settings-field-theme-light"
											checked={settings.theme === 'light'}
											onChange={this.onUpdateSettingValue} />
									</div>
								</label>
								<label htmlFor="settings-field-theme-dark" className="settings-item">
									<div className="settings-item-label">
										Dark
									</div>
									<div className="settings-item-control">
										<CheckboxControl type="radio" name="theme" value="dark"
											id="settings-field-theme-dark"
											checked={settings.theme === 'dark'}
											onChange={this.onUpdateSettingValue} />
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
							<div className="settings-items">
								<label htmlFor="settings-field-markdown" className="settings-item">
									<div className="settings-item-label">
										Enable Markdown
									</div>
									<div className="settings-item-control">
										<ToggleControl name="markdownEnabled" value="enabled"
											id="settings-field-markdown"
											checked={!!settings.markdownEnabled}
											onChange={this.onUpdateSettingBool} />
									</div>
								</label>
							</div>
							<p>
								Markdown lets you write notes with links, lists, and
								other styles using regular characters and
								punctuation marks. Learn more…
							</p>
						</div>
					</div>
				);
		}
	}

} );
