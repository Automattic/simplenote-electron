import React, { PropTypes } from 'react'
import classNames from 'classnames'
import EditableList from './editable-list'

export default React.createClass( {

	propTypes: {
		onSelectTag: PropTypes.func.isRequired,
		onEditTags: PropTypes.func.isRequired,
		onUpdateTags: PropTypes.func.isRequired,
		tags: PropTypes.array.isRequired
	},

	render() {
		var classes = classNames( 'tag-list', {
			'tag-list-editing': this.props.editingTags
		} );

		return (
			<div className={classes}>
				<div className="tag-list-title">
					<h2>Tags</h2>
					<strong className="tag-list-edit-toggle text-button" tabIndex="0" onClick={this.props.onEditTags}>
						{this.props.editingTags ? 'Done' : 'Edit' }
					</strong>
				</div>
				<EditableList
					className="tag-list-items"
					items={this.props.tags}
					editing={this.props.editingTags}
					renderItem={this.renderItem}
					onRemove={this.onTrashTag}
					onReorder={this.onReorderTags} />
			</div>
		);
	},

	renderItem( tag ) {
		var valueLink = {
			value: tag.data.name,
			requestChange: this.onRenameTag.bind( this, tag )
		};

		return (
			<input
				className="tag-list-input"
				readOnly={!this.props.editingTags}
				onClick={this.onSelectTag.bind( this, tag )}
				valueLink={valueLink} />
		);
	},

	onSelectTag( tag, event ) {
		if (!this.props.editingTags) {
			event.preventDefault();
			event.currentTarget.blur();
			this.props.onSelectTag( tag );
		}
	},

	onRenameTag( tag, newName ) {
		console.log(tag, newName);
	},

	onTrashTag( tag ) {
		var index = this.props.tags.indexOf(tag);

		if (index !== -1) {
			var tags = this.props.tags.slice();
			tags.splice(index, 1);
			this.props.onUpdateTags(tags);
		}
	},

	onReorderTags( tags ) {
	}

});
