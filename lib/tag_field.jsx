var React = require('react');
var TagChip = require('./tag_chip.jsx');

module.exports = React.createClass({

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

  clearTextField: function() {
    this.refs.tag.getDOMNode().value = "";
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

  onKeyDown: function(e) {
    var tag = this.refs.tag.getDOMNode().value.trim();
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
      this.getDOMNode().focus();
      this.selectLastTag();
      break;
    default:
      break;
    }
  },

  onBlur: function() {
    this.setState({selectedTag: -1});
  },

  eachTag: function(cb) {
    return (this.props.tags || []).map(cb.bind(this));
  },

  render: function() {
    return (
      <div tabIndex="-1" onKeyDown={this.onKeyDown} onBlur={this.onBlur} className="tag-editor">
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
          <input ref="tag" type="text" placeholder="Add tags &hellip;" />
        </div>
      </div>
    );
  }

});