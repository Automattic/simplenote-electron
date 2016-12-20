/**
 * External dependencies
 */
import React, { Component } from 'react';
import { connect } from 'react-redux'
import classNames from 'classnames'

/**
 * Internal dependencies
 */
import { actionCreators } from '../../flux/app-state';
import EditableList from './editable-list';

class TagList extends Component {

	render() {
		const { editingTags, onEditTags } = this.props;

		const classes = classNames(
			'tag-list',
			{ 'tag-list-editing': editingTags }
		);

		return (
			<div className={ classes }>
				<div className="tag-list-title">
					<h2 className="panel-title theme-color-fg-dim">
						Tags
					</h2>
					<button
						className="tag-list-edit-toggle button button-borderless"
						onClick={ onEditTags }
						tabIndex="0"
					>
						{ editingTags ? 'Done' : 'Edit' }
					</button>
				</div>
				<EditableList
					className="tag-list-items"
					noteBucket={ this.props.noteBucket }
					tagBucket={ this.props.tagBucket }
				/>
			</div>
		);
	}

}

const { editTags } = actionCreators;

const mapStateToProps = ( { appState: state } ) => ( {
	editingTags: state.editingTags,
} );

const mapDispatchToProps = dispatch => ( {
	onEditTags: () => dispatch( editTags() ),
} );

export default connect(
	mapStateToProps, mapDispatchToProps
)( TagList );
