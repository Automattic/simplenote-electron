var React = require('react');
var TagChip = require('./tag_chip.jsx');

module.exports = React.createClass({

  getDefaultProps: function() {
    return {
      note: { id: null, tags: []}
    };
  },

  getInitialState: function() {
    return {
      tags: ['One', 'Two', 'Three'],
      selectedTag: -1
    };
  },

  clearTextField: function() {
    this.refs.tag.getDOMNode().value = "";
  },

  addTag: function(tag) {
    var tags = this.state.tags.concat([tag]);
    this.setState({tags: tags});
  },

  onSelectTag: function(tag, index) {
    this.setState({selectedTag: index});
  },

  hasSelection: function() {
    return this.state.selectedTag !== -1;
  },

  deleteTag: function(index) {
    var tags = this.state.tags.concat([]);
    tags.splice(this.state.selectedTag, 1);

    var state = {tags: tags};

    if (this.state.selectedTag == index) {
      state.selectedTag = -1;
    }

    this.setState(state);
  },

  deleteSelection: function() {
    if (!this.hasSelection()) return;

    this.deleteTag(this.state.selectedTag);
  },

  selectLastTag: function() {
    this.setState({selectedTag: this.state.tags.length -1});
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
      console.log(e.which);
    }
  },

  onBlur: function() {
    this.setState({selectedTag: -1});
  },

  render: function() {
    return (
      <div tabIndex="-1" onKeyDown={this.onKeyDown} onBlur={this.onBlur} className="tag-editor">
        {(this.state.tags || []).map((function(tag, index) {
          var selected = index == this.state.selectedTag;
          var onSelectTag = this.onSelectTag;
          var onSelect = function(e) {
            onSelectTag(tag, index)
          };
          return (
            <TagChip tag={tag} index={index} selected={selected} onSelect={onSelect} />
          )
        }).bind(this))}
        <div className="tag-field">
          <input ref="tag" type="text" placeholder="Add tags …" />
        </div>
      </div>
    );
  }

});