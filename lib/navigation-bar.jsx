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
			<div className="navigation theme-color-bg theme-color-fg theme-color-border">
				<div className="navigation-folders">
					<button type="button" className="navigation-folders-item text-button theme-color-fg" onClick={this.props.onSelectAllNotes}>
						<span className="navigation-icon"><NotesIcon /></span>
						All Notes
					</button>
					<button type="button" className="navigation-folders-item text-button theme-color-fg" onClick={this.props.onSelectTrash}>
						<span className="navigation-icon"><TrashIcon /></span>
						Trash
					</button>
				</div>
				<div className="navigation-tags theme-color-border">
					<TagList {...this.props} />
				</div>
				<div className="navigation-tools theme-color-border">
					<button type="button" className="navigation-tools-item text-button theme-color-fg" onClick={this.props.onSettings}>
						<span className="navigation-icon"><NotesIcon /></span>
						Settings
					</button>
				</div>
				<div className="navigation-footer">
					<button type="button" className="navigation-footer-item theme-color-fg-dim">Help &amp; Support</button>
					<button type="button" className="navigation-footer-item theme-color-fg-dim" onClick={this.props.onAbout}>About</button>
				</div>
			</div>
		);
	}
} );
