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
					<button type="button" className="navigation-folders-item text-button" onClick={this.props.onSelectAllNotes}>
						<span className="navigation-icon"><NotesIcon /></span>
						All Notes
					</button>
					<button type="button" className="navigation-folders-item text-button" onClick={this.props.onSelectTrash}>
						<span className="navigation-icon"><TrashIcon /></span>
						Trash
					</button>
				</div>
				<div className="navigation-tags">
					<TagList {...this.props} />
				</div>
				<div className="navigation-tools">
					<button type="button" className="navigation-tools-item text-button" onClick={this.props.onSettings}>
						<span className="navigation-icon"><NotesIcon /></span>
						Settings
					</button>
				</div>
				<div className="navigation-footer">
					<button type="button" className="navigation-footer-item">Help &amp; Support</button>
					<button type="button" className="navigation-footer-item">About</button>
				</div>
			</div>
		);
	}
} );
