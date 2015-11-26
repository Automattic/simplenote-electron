import React, { PropTypes } from 'react'
import TagChip from './tag-chip'
import classNames from 'classnames';

export default React.createClass({

	propTypes: {
		tags: PropTypes.array,
		onUpdateNoteTags: PropTypes.func.isRequired
	},

	getDefaultProps: function() {
		return {
			tags: []
		};
	},

	getInitialState: function() {
		return {
			selectedTag: -1
		};
	},

	componentWillReceiveProps: function(nextProps, context) {
		this.setState({selectedTag: -1});
	},

	componentDidUpdate: function() {
		if (this.hasSelection()) {
			this.refs.hiddenTag.focus();
		}
	},

	clearTextField: function() {
		this.refs.tag.value = "";
	},

	addTag: function(tags) {
		tags = tags.trim().replace(/\s+/g, ',').split(',');
		tags = this.props.tags.concat(tags);
		this.props.onUpdateNoteTags(tags);
	},

	onSelectTag: function(tag, index) {
		this.setState({selectedTag: index});
	},

	hasSelection: function() {
		return this.state.selectedTag !== -1;
	},

	deleteTag: function(index) {
		var tags = this.props.tags.concat([]);
		tags.splice(this.state.selectedTag, 1);

		// var state = {tags: tags};
		var state = {};

		if (this.state.selectedTag == index) {
			state.selectedTag = -1;
		}

		this.props.onUpdateNoteTags(tags);

		this.setState(state);
	},

	deleteSelection: function() {
		if (!this.hasSelection()) return;

		this.deleteTag(this.state.selectedTag);
	},

	selectLastTag: function() {
		this.setState({selectedTag: this.props.tags.length -1});
	},

	preventTyping: function(e) {
		e.preventDefault();
	},

	onKeyDown: function(e) {
		var tag = this.refs.tag.value.trim();
		switch(e.which) {
		case 13: // return key
			// commit the value of the tag
			if (tag === "") return;
			this.addTag(tag);
			this.clearTextField();
			break;
		case 8: // backspace
			// if a tag is selected, delete it, if no tag is select select right-most tag
			if (this.hasSelection()) {
				this.deleteSelection();
			}
			if (tag !== '') return;
			// this.getDOMNode().focus();
			this.selectLastTag();
			e.preventDefault();
			break;
		default:
			break;
		}
	},

	onBlur: function() {
		// only deselect if we're not inside the hidden tag
		// this.setState({selectedTag: -1});
		setTimeout((function() {
			var h = this.refs.hiddenTag;
			if (h != document.activeElement) {
				this.setState({selectedTag: -1});
			}
		}).bind(this), 1);
	},

	render: function() {
		var { selectedTag } = this.state;

		return (
			<div className={classNames('tag-editor', {'has-selection': this.hasSelection()})}
				tabIndex="-1"
				onKeyDown={this.onKeyDown}
				onBlur={this.onBlur}>
				<input className="hidden-tag" tabIndex="-1" ref="hiddenTag" onKeyDown={this.preventTyping} />
				{this.props.tags.map( ( tag, index ) =>
					<TagChip key={tag} tag={tag}
						selected={index === selectedTag}
						onSelect={this.onSelectTag.bind(this, tag, index)} />
				)}
				<div className="tag-field">
					<input ref="tag" type="text" tabIndex="0" placeholder="Add tags &hellip;" />
				</div>
			</div>
		);
	}

});
