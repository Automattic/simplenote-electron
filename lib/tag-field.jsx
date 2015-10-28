import React from 'react'
import TagChip from './tag-chip'
import classNames from 'classnames';

export default React.createClass({

	getDefaultProps: function() {
		return {
			tags: [],
			onUpdateTags: function(){}
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

	addTag: function(tag) {
		var tags = this.props.tags.concat([tag]);
		this.props.onUpdateTags(tags);
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

		this.props.onUpdateTags(tags);

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

	eachTag: function(cb) {
		return (this.props.tags || []).map(cb.bind(this));
	},

	render: function() {
		return (
			<div className={classNames('tag-editor', {'has-selection': this.hasSelection()})}
				tabIndex="-1"
				onKeyDown={this.onKeyDown}
				onBlur={this.onBlur}>
				<input className="hidden-tag" tabIndex="-1" ref="hiddenTag" onKeyDown={this.preventTyping} />
				{this.eachTag(function(tag, index) {
					var selected = index == this.state.selectedTag;
					var onSelectTag = this.onSelectTag;
					var onSelect = function(e) {
						onSelectTag(tag, index)
					};
					return (
						<TagChip key={tag} tag={tag} index={index} selected={selected} onSelect={onSelect} />
					)
				})}
				<div className="tag-field">
					<input ref="tag" type="text" tabIndex="0" placeholder="Add tags &hellip;" />
				</div>
			</div>
		);
	}

});