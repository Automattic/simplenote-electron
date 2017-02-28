import React from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';

import TagList from './tag-list'
import NotesIcon from './icons/notes'
import TrashIcon from './icons/trash'
import SettingsIcon from './icons/settings'
import {
	selectAllNotes,
	selectTrashedNotes,
} from './state/ui/actions';
import { viewExternalUrl } from './utils/url-utils'

export const NavigationBar = React.createClass( {

	getDefaultProps: function() {
		return {
			onSelectAllNotes: function() { },
			onSelectTrash: function() { }
		};
	},

	mixins: [
		require( 'react-onclickoutside' )
	],

	handleClickOutside: function() {
		this.props.onOutsideClick( true );
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
		const {
			onSelectAllNotes,
			onSelectTrash,
		} = this.props;

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
					<button
						type="button"
						className={allNotesClasses}
						onClick={ onSelectAllNotes }
					>
						<span className="navigation-icon"><NotesIcon /></span>
						All Notes
					</button>
					<button
						type="button"
						className={trashClasses}
						onClick={ onSelectTrash }
					>
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

const mapDispatchToProps = ( dispatch, { onSelectAllNotes, onSelectTrash } ) => ( {
	onSelectAllNotes: () => {
		dispatch( selectAllNotes() );
		onSelectAllNotes();
	},
	onSelectTrash: () => {
		dispatch( selectTrashedNotes() );
		onSelectTrash();
	},
} );

export default connect( null, mapDispatchToProps )( NavigationBar );
