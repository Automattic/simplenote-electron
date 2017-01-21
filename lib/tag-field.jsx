import React, { PropTypes } from 'react'
import TagChip from './components/tag-chip';
import TagInput from './tag-input';
import classNames from 'classnames';
import analytics from './analytics';
import {
	differenceBy,
	intersectionBy,
	invoke,
	union,
} from 'lodash';

export default React.createClass( {

	propTypes: {
		unusedTags: PropTypes.arrayOf( PropTypes.string ),
		usedTags: PropTypes.arrayOf( PropTypes.string ),
		onUpdateNoteTags: PropTypes.func.isRequired
	},

	getDefaultProps: function() {
		return {
			tags: []
		};
	},

	getInitialState: function() {
		return {
			selectedTag: '',
			tagInput: '',
		};
	},

	componentDidMount() {
		document.addEventListener( 'click', this.unselect, true );
	},

	componentWillUnmount() {
		document.removeEventListener( 'click', this.unselect, true );
	},

	componentDidUpdate: function() {
		if ( this.hasSelection() ) {
			this.hiddenTag.focus();
		}
	},

	addTag: function( tags ) {
		const {
			allTags,
			tags: existingTags,
		} = this.props;

		const newTags = tags.trim().replace( /\s+/g, ',' ).split( ',' );

		const nextTagList = union(
			existingTags, // tags already in note
			intersectionBy( allTags, newTags, s => s.toLocaleLowerCase() ), // use existing case if tag known
			differenceBy( newTags, allTags, s => s.toLocaleLowerCase() ), // add completely new tags
		);
		this.props.onUpdateNoteTags( nextTagList );
		this.storeTagInput( '' );
		invoke( this, 'tagInput.focus' );
		analytics.tracks.recordEvent( 'editor_tag_added' );
	},

	hasSelection: function() {
		return !! this.state.selectedTag.length;
	},

	deleteTag: function( tagName ) {
		const { onUpdateNoteTags, tags } = this.props;
		const { selectedTag } = this.state;

		onUpdateNoteTags( differenceBy( tags, [ tagName ], s => s.toLocaleLowerCase() ) );

		if ( selectedTag === tagName ) {
			this.setState( { selectedTag: '' } );
		}

		invoke( this, 'tagInput.focus' );

		analytics.tracks.recordEvent( 'editor_tag_removed' );
	},

	deleteSelection: function() {
		if ( this.hasSelection() ) {
			this.deleteTag( this.state.selectedTag );
		}
	},

	selectLastTag: function() {
		this.setState( {
			selectedTag: this.props.tags.slice( -1 ).shift()
		} );
	},

	selectTag( event ) {
		const { target: { dataset: { tagName } } } = event;

		event.preventDefault();
		event.stopPropagation();

		this.deleteTag( tagName );
	},

	onKeyDown: function( e ) {
		// only handle backspace
		if ( 8 !== e.which ) {
			return;
		}

		if ( this.hasSelection() ) {
			this.deleteSelection();
		}

		if ( '' !== this.state.tagInput ) {
			return;
		}

		this.selectLastTag();
		e.preventDefault();
	},

	storeHiddenTag( r ) {
		this.hiddenTag = r;
	},

	storeInputRef( r ) {
		this.tagInput = r;
	},

	storeTagInput( value, callback ) {
		this.setState( {
			tagInput: value,
		}, callback );
	},

	unselect( event ) {
		if ( ! this.state.selectedTag ) {
			return;
		}

		if ( this.hiddenTag !== event.relatedTarget ) {
			this.setState( { selectedTag: '' } );
		}
	},

	render: function() {
		const { allTags, tags } = this.props;
		const { selectedTag, tagInput } = this.state;

		return (
			<div className="tag-entry theme-color-border">
				<div className={ classNames( 'tag-editor', { 'has-selection': this.hasSelection() } )}
					tabIndex="-1"
					onKeyDown={this.onKeyDown}
				>
					<input className="hidden-tag" tabIndex="-1" ref={ this.storeHiddenTag } />
					{ tags.map( tag =>
						<TagChip
							key={tag}
							tag={tag}
							selected={ tag === selectedTag }
							onSelect={ this.selectTag }
						/>
					) }
					<TagInput
						allTags={ allTags }
						inputRef={ this.storeInputRef }
						value={ tagInput }
						onChange={ this.storeTagInput }
						onSelect={ this.addTag }
						tagNames={ differenceBy( allTags, tags, s => s.toLocaleLowerCase() ) }
					/>
				</div>
			</div>
		);
	}

} );
