import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux';
import classNames from 'classnames'
import {
	get,
} from 'lodash';

import EditableList from './editable-list'
import { getTags } from './state/tags/selectors';
import { selectTag } from './state/ui/actions';

export class TagList extends Component {
	static propTypes = {
		onSelectTag: PropTypes.func.isRequired,
		onEditTags: PropTypes.func.isRequired,
		onRenameTag: PropTypes.func.isRequired,
		onTrashTag: PropTypes.func.isRequired,
		onReorderTags: PropTypes.func.isRequired,
		tags: PropTypes.array.isRequired
	};

	renderItem = ( tag ) => {
		const {
			onRenameTag,
			selectedTag,
		} = this.props;
		const isSelected = tag.data.name === get( selectedTag, 'data.name', '' );
		const classes = classNames( 'tag-list-input', 'theme-color-fg', {
			active: isSelected
		} );

		const renameTag = ( { target: { value } } ) => onRenameTag( tag, value );

		return (
			<input
				className={classes}
				readOnly={!this.props.editingTags}
				onClick={this.onSelectTag.bind( this, tag )}
				value={ tag.data.name }
				onChange={ renameTag }
			/>
		);
	};

	onSelectTag = ( tag, event ) => {
		if ( !this.props.editingTags ) {
			event.preventDefault();
			event.currentTarget.blur();
			this.props.onSelectTag( tag );
		}
	};

	render() {
		var classes = classNames( 'tag-list', {
			'tag-list-editing': this.props.editingTags
		} );

		return (
			<div className={classes}>
				<div className="tag-list-title">
					<h2 className="panel-title theme-color-fg-dim">Tags</h2>
					<button className="tag-list-edit-toggle button button-borderless" tabIndex="0" onClick={this.props.onEditTags}>
						{this.props.editingTags ? 'Done' : 'Edit' }
					</button>
				</div>
				<EditableList
					className="tag-list-items"
					items={this.props.tags}
					editing={this.props.editingTags}
					renderItem={this.renderItem}
					onRemove={this.props.onTrashTag}
					onReorder={this.props.onReorderTags}
					selectedTag={this.props.selectedTag} />
			</div>
		);
	}
}

const mapStateToProps = state => ( {
	tags: getTags( state ),
} );

const mapDispatchToProps = ( dispatch, { onSelectTag } ) => ( {
	selectTag: tag => {
		dispatch( selectTag( tag ) );
		onSelectTag( tag )
	},
} );

export default connect( mapStateToProps, mapDispatchToProps )( TagList );
