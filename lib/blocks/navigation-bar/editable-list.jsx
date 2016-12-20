/**
 * External dependencies
 */
import React, { Component } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { get } from 'lodash';

/**
 * Internal dependencies
 */
import { actionCreators } from '../../flux/app-state';
import { tracks } from '../../analytics'
import ReorderIcon from '../../icons/reorder'
import SmallCrossOutlineIcon from '../../icons/cross-outline-small'

class EditableList extends Component {

	state = {
		items: [],
		reorderedItems: [],
		reorderingId: null,
	};

	componentWillMount() {
		const { items } = this.props;
		this.setState( {
			items,
			reorderedItems: items.slice(),
		} );
	}

	componentWillReceiveProps( nextProps ) {
		const { items } = nextProps;
		if ( items !== this.state.items ) {
			this.stopReordering();
			this.setState( {
				items,
				reorderedItems: items.slice(),
			} );
		}
	}

	componentWillUnmount() {
		this.unbindReorderingListeners();
	}

	bindReorderingListeners() {
		this.unbindReorderingListeners();
		window.addEventListener( 'mouseup', this.onReorderEnd );
		window.addEventListener( 'touchend', this.onReorderEnd );
		window.addEventListener( 'touchcancel', this.onReorderCancel );
		window.addEventListener( 'keydown', this.onKeyDown );
	}

	unbindReorderingListeners() {
		window.removeEventListener( 'mouseup', this.onReorderEnd );
		window.removeEventListener( 'touchend', this.onReorderEnd );
		window.removeEventListener( 'touchcancel', this.onReorderCancel );
		window.removeEventListener( 'keydown', this.onKeyDown );
	}

	setReorderingElementRef = ( reorderingId, element ) => {
		if ( reorderingId !== this.state.reorderingId ) {
			return;
		}

		if ( this.reorderingElement !== element ) {
			this.unsetReorderingElement();
			this.reorderingTranslateY = 0;
		}

		this.reorderingElement = element;
		this.bindReorderingListeners();
		this.positionReorderingElement();
	}

	positionReorderingElement = () => {
		if ( this.reorderingElement != null ) {
			const rect = this.reorderingElement.getBoundingClientRect();
			const offsetY = this.reorderingClientY - ( rect.top - this.reorderingTranslateY );
			let translateY = offsetY - this.reorderingOffsetY;

			if (
				( translateY < 0 && this.reorderingElement.previousSibling == null ) ||
				( translateY > 0 && this.reorderingElement.nextSibling == null )
			) {
				translateY = 0;
			}

			this.reorderingTranslateY = translateY;

			const transform = `translateY(${ translateY }px)`;
			this.reorderingElement.style.transform = transform;
			this.reorderingElement.style.msTransform = transform;
			this.reorderingElement.style.webkitTransform = transform;
		}
	}

	unsetReorderingElement = () => {
		this.unbindReorderingListeners();

		if ( this.reorderingElement != null ) {
			this.reorderingElement.style.transform = '';
			this.reorderingElement.style.msTransform = '';
			this.reorderingElement.style.webkitTransform = '';
			this.reorderingElement = null;
		}
	}

	stopReordering = resetOrdering => {
		this.unsetReorderingElement();

		if ( resetOrdering ) {
			this.setState( {
				reorderedItems: this.props.items.slice(),
				reorderingId: null,
			} );
		} else {
			this.setState( { reorderingId: null } );
		}
	}

	reorderItemById = ( reorderingId, offset, targetReorderingId ) => {
		const { reorderedItems } = this.state;
		let reorderingIndex;
		let targetIndex;

		if ( targetReorderingId == null ) {
			targetReorderingId = reorderingId;
		}

		reorderedItems.forEach( ( item, index ) => {
			if ( item.id === reorderingId ) {
				reorderingIndex = index;
			}
			if ( item.id === targetReorderingId ) {
				targetIndex = index;
			}
		} );

		return this.reorderItemByIndex( reorderingIndex, targetIndex + offset );
	}

	reorderItemByIndex = ( reorderingIndex, targetIndex ) => {
		if (
			reorderingIndex === targetIndex ||
			reorderingIndex == null ||
			reorderingIndex < 0 ||
			targetIndex == null ||
			targetIndex < 0
		) {
			return;
		}

		let reorderedItems = this.state.reorderedItems.slice();
		const spliced = reorderedItems.splice( reorderingIndex, 1 );
		reorderedItems.splice( targetIndex, 0, ...spliced );

		this.setState( { reorderedItems } );
	}

	onReorderStart = ( reorderingId, event ) => {
		event.preventDefault();
		event.currentTarget.focus();

		const clientY = event.clientY || ( event.touches && event.touches[ 0 ] && event.touces[ 0 ].clientY );
		this.reorderingClientY = clientY;

		const rect = event.currentTarget.getBoundingClientRect();
		this.reorderingOffsetY = clientY - rect.top;
		this.reorderingTranslateY = 0;

		this.setState( { reorderingId } );
		this.bindReorderingListeners();
	}

	onReorderMove = ( targetReorderingId, event ) => {
		if ( this.reorderingElement == null || ! this.props.editing ) {
			return;
		}

		const { reorderingId } = this.state;
		const clientY = event.clientY || ( event.touches && event.touches[ 0 ] && event.touces[ 0 ].clientY );
		this.reorderingClientY = clientY;

		if ( targetReorderingId !== reorderingId ) {
			const rect = event.currentTarget.getBoundingClientRect();
			const centerY = rect.height * 0.5 + rect.top;

			this.reorderItemById(
				reorderingId,
				( clientY < centerY ) ? 0 : 1,
				targetReorderingId
			);
		}

		this.positionReorderingElement();
	}

	onReorderEnd = event => {
		event.preventDefault();
		this.stopReordering();
		this.props.onReorder( this.state.reorderedItems );
	}

	onReorderCancel = () => {
		this.stopReordering( true );
	}

	onReorderKeyDown = ( reorderingId, event ) => {
		if ( event.key === 'ArrowUp' ) {
			event.preventDefault();
			this.reorderItemById( reorderingId, -1 );
		} else if ( event.key === 'ArrowDown' ) {
			event.preventDefault();
			this.reorderItemById( reorderingId, 1 );
		}
	}

	onKeyDown = event => {
		const keyCode = event.keyCode || event.which;
		if ( keyCode === 27 ) {
			event.preventDefault();
			this.onReorderCancel();
		}
	}

	renderItem = tag => {
		const {
			editingTags,
			onRenameTag,
			onSelectTag,
		} = this.props;
		const isSelected = tag.data.name === get( onSelectTag, 'data.name', '' );
		const classes = classNames(
			'tag-list-input',
			'theme-color-fg',
			{ active: isSelected }
		);
		const renameTag = ( { target: { value } } ) => onRenameTag( tag, value );

		return (
			<input
				className={ classes }
				onChange={ renameTag }
				onClick={ () => onSelectTag( tag ) }
				readOnly={ ! editingTags }
				value={ tag.data.name }
			/>
		);
	}

	render() {
		const {
			className,
			editing,
			onRemove,
			onReorder,
		} = this.props;
		const { reorderedItems, reorderingId } = this.state;

		const classes = classNames( className, 'editable-list', {
			'editable-list-editing': editing,
			'editable-list-removable': onRemove,
			'editable-list-reorderable': onReorder,
			'editable-list-reordering': reorderingId,
		} );

		return (
			<ul className={ classes }>
				{ reorderedItems.map( item =>
					<li
						className={ classNames(
							'editable-list-item',
							{ 'editable-list-item-reordering': item.id === reorderingId },
						) }
						key={ item.id }
						onMouseMove={ event => this.onReorderMove( item.id, event ) }
						onTouchMove={ event => this.onReorderMove( item.id, event ) }
						ref={ element => this.setReorderingElementRef( item.id, element ) }
					>

						<span className="editable-list-item-left">
							{ onRemove &&
								<span
									className="editable-list-trash"
									onClick={ () => onRemove( item ) }
									tabIndex={ editing ? '0' : '-1' }
								>
									<SmallCrossOutlineIcon />
								</span>
							}
							<span className="editable-list-item-content">
								{ this.renderItem( item ) }
							</span>
						</span>

						{ onReorder &&
							<span
								className="editable-list-reorder"
								onDragStart={ event => event.preventDefault() }
								onKeyDown={ event => this.onReorderKeyDown( item.id, event ) }
								onMouseDown={ event => this.onReorderStart( item.id, event ) }
								onTouchStart={ event => this.onReorderStart( item.id, event ) }
								tabIndex={ editing ? '0' : '-1' }
							>
								<ReorderIcon />
							</span>
						}
					</li>
				) }
			</ul>
		);
	}

}

const {
	renameTag,
	reorderTags,
	selectTag,
	trashTag,
} = actionCreators;
const { recordEvent } = tracks;

const mapStateToProps = ( { appState: state } ) => ( {
	editing: state.editingTags,
	items: state.tags,
	selectedTag: state.tag,
} );

const mapDispatchToProps = ( dispatch, { noteBucket, tagBucket } ) => ( {
	onRemove: tag => {
		dispatch( trashTag( {
			noteBucket,
			tag,
			tagBucket,
		} ) );
		recordEvent( 'list_trash_viewed' );
	},
	onRenameTag: ( tag, name ) => dispatch( renameTag( {
		name,
		noteBucket,
		tag,
		tagBucket,
	} ) ),
	onReorder: tags => dispatch( reorderTags( {
		tagBucket,
		tags,
	} ) ),
	onSelectTag: tag => {
		dispatch( selectTag( { tag } ) );
		recordEvent( 'list_tag_viewed' );
	},
} );

export default connect( mapStateToProps, mapDispatchToProps )( EditableList );
