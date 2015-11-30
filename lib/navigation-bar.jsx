import React from 'react'
import TagList from './tag-list'
import NotesIcon from './icons/notes'
import TrashIcon from './icons/trash'

export default React.createClass( {

	getDefaultProps: function() {
		return {
			onSelectAllNotes: function() { },
			onSelectTrash: function() { }
		};
	},

	render: function() {
		return (
			<div className="navigation">
				<div className="navigation-folders">
					<div className="navigation-folders-item text-button" tabIndex="0" onClick={this.props.onSelectAllNotes}>
						<span className="navigation-icon"><NotesIcon /></span>
						All Notes
					</div>
					<div className="navigation-folders-item text-button" tabIndex="0" onClick={this.props.onSelectTrash}>
						<span className="navigation-icon"><TrashIcon /></span>
						Trash
					</div>
				</div>
				<div className="navigation-tags">
					<TagList {...this.props} />
				</div>
				<div className="navigation-tools">
					<div className="navigation-tools-item" tabIndex="0">
						<span className="navigation-icon"><NotesIcon /></span>
						Settings
					</div>
				</div>
				<div className="navigation-footer">
					<div className="navigation-footer-item" tabIndex="0">Help &amp; Support</div>
					<div className="navigation-footer-item" tabIndex="0">About</div>
				</div>
			</div>
		);
	}
} );
