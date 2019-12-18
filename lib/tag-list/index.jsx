import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import PanelTitle from '../components/panel-title';
import EditableList from '../editable-list';
import { get } from 'lodash';
import TagListInput from './input';
import appState from '../flux/app-state';
import { renameTag, reorderTags, trashTag } from '../state/domain/tags';
import { tracks } from '../analytics';

const { editTags, selectTagAndSelectFirstNote } = appState.actionCreators;
const { recordEvent } = tracks;

export class TagList extends Component {
  static displayName = 'TagList';

  static propTypes = {
    editingTags: PropTypes.bool.isRequired,
    onSelectTag: PropTypes.func.isRequired,
    onEditTags: PropTypes.func.isRequired,
    renameTag: PropTypes.func.isRequired,
    reorderTags: PropTypes.func.isRequired,
    selectedTag: PropTypes.object,
    tags: PropTypes.array.isRequired,
    trashTag: PropTypes.func.isRequired,
  };

  renderItem = tag => {
    const { editingTags, selectedTag } = this.props;
    const isSelected = tag.data.name === get(selectedTag, 'data.name', '');

    const handleRenameTag = ({ target: { value } }) =>
      this.props.renameTag({ tag, name: value });

    return (
      <TagListInput
        editable={editingTags}
        isSelected={isSelected}
        onClick={this.onSelectTag.bind(this, tag)}
        onDone={handleRenameTag}
        value={tag.data.name}
      />
    );
  };

  onReorderTags = tags => this.props.reorderTags({ tags });

  onSelectTag = (tag, event) => {
    if (!this.props.editingTags) {
      event.preventDefault();
      event.currentTarget.blur();
      this.props.onSelectTag(tag);
    }
  };

  onTrashTag = tag => {
    this.props.trashTag({ tag });
    recordEvent('list_tag_deleted');
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
          items={tags}
          editing={editingTags}
          renderItem={this.renderItem}
          onRemove={this.onTrashTag}
          onReorder={this.onReorderTags}
        />
      </div>
    );
  }
}

const mapStateToProps = ({ appState: state }) => ({
  editingTags: state.editingTags,
  tags: state.tags,
  selectedTag: state.tag,
});

const mapDispatchToProps = dispatch => ({
  onEditTags: () => dispatch(editTags()),
  onSelectTag: tag => {
    dispatch(selectTagAndSelectFirstNote({ tag }));
    recordEvent('list_tag_viewed');
  },
  renameTag: arg => dispatch(renameTag(arg)),
  reorderTags: arg => dispatch(reorderTags(arg)),
  trashTag: arg => dispatch(trashTag(arg)),
});

export default connect(mapStateToProps, mapDispatchToProps)(TagList);
