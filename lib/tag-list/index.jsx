import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import PanelTitle from '../components/panel-title';
import EditableList from '../editable-list';
import { get } from 'lodash';
import appState from '../flux/app-state';
import { tracks } from '../analytics';

const {
  editTags,
  renameTag,
  reorderTags,
  selectTagAndSelectFirstNote,
  trashTag,
} = appState.actionCreators;
const { recordEvent } = tracks;

export class TagList extends Component {
  static displayName = 'TagList';

  static propTypes = {
    onSelectTag: PropTypes.func.isRequired,
    onEditTags: PropTypes.func.isRequired,
    onRenameTag: PropTypes.func.isRequired,
    onTrashTag: PropTypes.func.isRequired,
    onReorderTags: PropTypes.func.isRequired,
    tags: PropTypes.array.isRequired,
  };

  renderItem = tag => {
    const { onRenameTag, selectedTag } = this.props;
    const isSelected = tag.data.name === get(selectedTag, 'data.name', '');
    const classes = classNames('tag-list-input', 'theme-color-fg', {
      active: isSelected,
    });

    const handleRenameTag = ({ target: { value } }) => onRenameTag(tag, value);

    return (
      <input
        className={classes}
        readOnly={!this.props.editingTags}
        onClick={this.onSelectTag.bind(this, tag)}
        value={tag.data.name}
        onChange={handleRenameTag}
        spellCheck={false}
      />
    );
  };

  onSelectTag = (tag, event) => {
    if (!this.props.editingTags) {
      event.preventDefault();
      event.currentTarget.blur();
      this.props.onSelectTag(tag);
    }
  };

  render() {
    const { editingTags, onEditTags, tags } = this.props;

    const classes = classNames('tag-list', {
      'tag-list-editing': this.props.editingTags,
    });

    return (
      <div className={classes}>
        <div className="tag-list-title">
          <PanelTitle headingLevel="2">Tags</PanelTitle>
          {tags.length > 0 && (
            <button
              className="tag-list-edit-toggle button button-borderless"
              tabIndex="0"
              onClick={onEditTags}
            >
              {editingTags ? 'Done' : 'Edit'}
            </button>
          )}
        </div>
        <EditableList
          className="tag-list-items"
          items={this.props.tags}
          editing={this.props.editingTags}
          renderItem={this.renderItem}
          onRemove={this.props.onTrashTag}
          onReorder={this.props.onReorderTags}
          selectedTag={this.props.selectedTag}
        />
      </div>
    );
  }
}

const mapStateToProps = ({ appState: state }) => ({
  editingTags: state.editingTags,
  selectedTag: state.tag,
  tags: state.tags,
});

const mapDispatchToProps = (dispatch, { noteBucket, tagBucket }) => ({
  onEditTags: () => dispatch(editTags()),
  onRenameTag: (tag, name) =>
    dispatch(
      renameTag({
        name,
        noteBucket,
        tag,
        tagBucket,
      })
    ),
  onReorderTags: tags =>
    dispatch(
      reorderTags({
        tags,
        tagBucket,
      })
    ),
  onSelectTag: tag => {
    dispatch(selectTagAndSelectFirstNote({ tag }));
    recordEvent('list_tag_viewed');
  },
  onTrashTag: tag => {
    dispatch(
      trashTag({
        noteBucket,
        tag,
        tagBucket,
      })
    );
    recordEvent('list_tag_deleted');
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(TagList);
