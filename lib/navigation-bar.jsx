import React from 'react'
import TagList from './tag-list'
import NotesIcon from './icons/notes'
import TrashIcon from './icons/trash'
import SettingsIcon from './icons/settings'
import { viewExternalUrl } from './utils/url-utils'
import classNames from 'classnames'

export default React.createClass( {

	getDefaultProps: function() {
		return {
			onSelectAllNotes: function() { },
			onSelectTrash: function() { }
		};
	},

	onHelpClicked: function() {
		viewExternalUrl( 'http://simplenote.com/help' );
	},

	// Determine if the selected class should be applied for the 'all notes' or 'trash' rows
	getNavigationItemClass: function( isTrashRow ) {
		const { showTrash, selectedTag } = this.props;
		const isItemSelected = isTrashRow === showTrash;

		return isItemSelected && ! selectedTag
			? 'navigation-folders-item-selected'
			: 'navigation-folders-item';
	},

	render: function() {
		const classes = classNames( 'button', 'button-borderless', 'theme-color-fg' );
		const allNotesClasses = classNames(
			this.getNavigationItemClass( false ),
			classes
		);
		const trashClasses = classNames(
			this.getNavigationItemClass( true ),
			classes
		);

		return (
			<div className="navigation theme-color-bg theme-color-fg theme-color-border">
				<div className="navigation-folders">
					<button type="button" className={allNotesClasses} onClick={this.props.onSelectAllNotes}>
						<span className="navigation-icon"><NotesIcon /></span>
						All Notes
					</button>
					<button type="button" className={trashClasses} onClick={this.props.onSelectTrash}>
						<span className="navigation-icon"><TrashIcon /></span>
						Trash
					</button>
				</div>
				<div className="navigation-tags theme-color-border">
					<TagList {...this.props} />
				</div>
				<div className="navigation-tools theme-color-border">
					<button type="button" className="navigation-tools-item button button-borderless theme-color-fg" onClick={this.props.onSettings}>
						<span className="navigation-icon"><SettingsIcon /></span>
						Settings
					</button>
				</div>
				<div className="navigation-footer">
					<button type="button" className="navigation-footer-item theme-color-fg-dim" onClick={this.onHelpClicked}>Help &amp; Support</button>
					<button type="button" className="navigation-footer-item theme-color-fg-dim" onClick={this.props.onAbout}>About</button>
				</div>
			</div>
		);
	}
} );
