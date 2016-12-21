/**
 * External dependencies
 */
import React, { Component } from 'react';
import { connect } from 'react-redux'
import listensToClickOutside from 'react-onclickoutside/decorator';
import classNames from 'classnames';

/**
 * Internal dependencies
 */
import { actionCreators } from '../../flux/app-state';
import { viewExternalUrl } from '../../utils/url-utils'
import NotesIcon from '../../icons/notes';
import SettingsIcon from '../../icons/settings';
import TrashIcon from '../../icons/trash';
import TagList from './tag-list';

class NavigationBar extends Component {

	handleClickOutside() {
		this.props.onClickOutside();
	}

	onClickHelp() {
		viewExternalUrl( 'http://simplenote.com/help' );
	}

	getNavigationItemClass( isTrashRow ) {
		const { selectedTag, showTrash } = this.props;
		const isItemSelected = isTrashRow === showTrash;

		return isItemSelected && ! selectedTag
			? 'navigation-folders-item-selected'
			: 'navigation-folders-item';
	}

	render() {
		const {
			onClickAbout,
			onClickSettings,
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
						className={ allNotesClasses }
						onClick={ onSelectAllNotes }
						type="button"
					>
						<span className="navigation-icon">
							<NotesIcon />
						</span>
						All Notes
					</button>
					<button
						className={ trashClasses }
						onClick={ onSelectTrash }
						type="button"
					>
						<span className="navigation-icon">
							<TrashIcon />
						</span>
						Trash
					</button>
				</div>

				<div className="navigation-tags theme-color-border">
					<TagList
						noteBucket={ this.props.noteBucket }
						tagBucket={ this.props.tagBucket }
					/>
				</div>

				<div className="navigation-tools theme-color-border">
					<button
						className="navigation-tools-item button button-borderless theme-color-fg"
						onClick={ onClickSettings }
						type="button"
					>
						<span className="navigation-icon">
							<SettingsIcon />
						</span>
						Settings
					</button>
				</div>

				<div className="navigation-footer">
					<button
						className="navigation-footer-item theme-color-fg-dim"
						onClick={ this.onClickHelp }
						type="button"
					>
						Help &amp; Support
					</button>
					<button
						className="navigation-footer-item theme-color-fg-dim"
						onClick={ onClickAbout }
						type="button"
					>
						About
					</button>
				</div>

			</div>
		);
	}

}

const {
	selectAllNotes,
	selectTrash,
	showDialog,
	toggleNavigation,
} = actionCreators;

const mapDispatchToProps = dispatch => ( {
	onClickAbout: () => dispatch( showDialog( { dialog: {
		modal: true,
		single: true,
		type: 'About',
	} } ) ),
	onClickOutside: () => dispatch( toggleNavigation() ),
	onClickSettings: () => dispatch( showDialog( { dialog: {
		modal: true,
		single: true,
		type: 'Settings',
	} } ) ),
	onSelectAllNotes: () => dispatch( selectAllNotes() ),
	onSelectTrash: () => dispatch( selectTrash() ),
} );

export default connect( null, mapDispatchToProps )(
	listensToClickOutside( NavigationBar )
);
