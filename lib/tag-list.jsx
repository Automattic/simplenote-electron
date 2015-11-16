import React from 'react'
import classNames from 'classnames'
import TrashIcon from './icons/trash'
import DownArrow from './icons/down-arrow'

export default React.createClass({

	getDefaultProps: function() {
		return {
			onSelectTag: function(){},
			onEditTags: function(){},
			onUpdateTags: function(){},
			tags: []
		};
	},

	getInitialState: function() {
		return {
			reordering: false
		};
	},

	render: function() {
		return (
			<div className={classNames("tag-list", {"tag-list-editing": this.props.editingTags})}>
				<div className="tag-list-title">
					<h2>Tags</h2>
					<strong className="tag-list-edit-toggle textbutton" tabIndex="0" onClick={this.props.onEditTags}>
						{this.props.editingTags ? 'Done' : 'Edit' }
					</strong>
				</div>
				<ul className="tag-list-items" onMouseMove={this.onReorderMove} onTouchMove={this.onReorderMove}>
					{this.props.tags.map((tag, i) => 
						<li key={tag.id} className="tag-list-item">
							<span className="tag-list-item-left">
								<span className="tag-list-trash"
										tabIndex={this.props.editingTags ? "0" : "-1"}
										onClick={this.onTrashTag.bind(this, tag)}>
									<TrashIcon />
								</span>
								<span className="tag-list-input-holder">
									<input
										className="tag-list-input"
										readOnly={!this.props.editingTags}
										onClick={this.onSelectTag.bind(null, tag)}
										valueLink={{value: tag.data.name, requestChange: this.onRenameTag.bind(this, tag)}} />
								</span>
							</span>
							<span className="tag-list-reorder"
									tabIndex={this.props.editingTags ? "0" : "-1"}
									onDragStart={e => e.preventDefault()}
									onMouseDown={this.onReorderStart}
									onTouchStart={this.onReorderStart}
									onMouseUp={this.onReorderEnd}
									onTouchEnd={this.onReorderEnd}
									onTouchCancel={this.onReorderCancel}>
								<DownArrow />
							</span>
						</li>
					)}
				</ul>
			</div>
		);
	},

	onTrashTag: function(tag) {
		var index = this.props.tags.indexOf(tag);

		if (index !== -1) {
			var tags = this.props.tags.slice();
			tags.splice(index, 1);
			this.props.onUpdateTags(tags);
		}
	},

	onSelectTag: function(tag, event) {
		if (!this.props.editingTags) {
			event.preventDefault();
			this.props.onSelectTag(tag);
		}
	},

	onRenameTag: function(tag, newName) {
		console.log(tag, newName);
	},

	onReorderStart: function() {
		console.log('onReorderStart', this.props.tags);
		this.setState({ reordering: true });
	},

	onReorderMove: function() {
		if (!this.state.reordering) {
			return;
		}

		console.log('onReorderMove');
	},

	onReorderEnd: function() {
		console.log('onReorderEnd');
		this.setState({ reordering: false });
	},

	onReorderCancel: function() {
		console.log('onReorderCancel');
		this.setState({ reordering: false });
	}
});
