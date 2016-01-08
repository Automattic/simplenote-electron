import React, { PropTypes } from 'react'
import classNames from 'classnames'
import EditableList from './editable-list'

export default React.createClass( {

	propTypes: {
		onSelectTag: PropTypes.func.isRequired,
		onEditTags: PropTypes.func.isRequired,
		onRenameTag: PropTypes.func.isRequired,
		onTrashTag: PropTypes.func.isRequired,
		onReorderTags: PropTypes.func.isRequired,
		tags: PropTypes.array.isRequired
	},

	render() {
		var classes = classNames( 'tag-list', {
			'tag-list-editing': this.props.editingTags
		} );

		return (
			<div className={classes}>
				<div className="tag-list-title">
					<h2 className="panel-title color-fg-dim">Tags</h2>
					<button className="tag-list-edit-toggle button text-button" tabIndex="0" onClick={this.props.onEditTags}>
						{this.props.editingTags ? 'Done' : 'Edit' }
					</button>
				</div>
				<EditableList
					className="tag-list-items"
					items={this.props.tags}
					editing={this.props.editingTags}
					renderItem={this.renderItem}
					onRemove={this.props.onTrashTag}
					onReorder={this.props.onReorderTags} />
			</div>
		);
	},

	renderItem( tag ) {
		var valueLink = {
			value: tag.data.name,
			requestChange: this.props.onRenameTag.bind( null, tag )
		};

		return (
			<input
				className="tag-list-input color-fg"
				readOnly={!this.props.editingTags}
				onClick={this.onSelectTag.bind( this, tag )}
				valueLink={valueLink} />
		);
	},

	onSelectTag( tag, event ) {
		if ( !this.props.editingTags ) {
			event.preventDefault();
			event.currentTarget.blur();
			this.props.onSelectTag( tag );
		}
	}
} );
