import React, { Component, FocusEvent, MouseEvent } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import PanelTitle from '../components/panel-title';
import EditableList from '../editable-list';
import { get } from 'lodash';
import TagListInput from './input';
import { renameTag, reorderTags, trashTag } from '../state/domain/tags';
import { openTag, toggleTagEditing } from '../state/ui/actions';
import analytics from '../analytics';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  editingTags: boolean;
  tags: T.TagEntity[] | null;
  openedTag?: T.TagEntity;
};

type DispatchProps = {
  onEditTags: () => any;
  openTag: (tag: T.TagEntity) => any;
  renameTag: (args: { tag: T.TagEntity; name: T.TagName }) => any;
  reorderTags: (args: { tags: T.TagEntity[] }) => any;
  trashTag: (args: { tag: T.TagEntity }) => any;
};

type Props = StateProps & DispatchProps;

export class TagList extends Component<Props> {
  static displayName = 'TagList';

  renderItem = (tag: T.TagEntity) => {
    const { editingTags, openedTag } = this.props;
    const isSelected = tag.data.name === get(openedTag, 'data.name', '');

    const handleRenameTag = ({
      target: { value },
    }: FocusEvent<HTMLInputElement>) =>
      this.props.renameTag({ tag, name: value });

    return (
      <TagListInput
        editable={editingTags}
        isSelected={isSelected}
        onClick={this.openTag.bind(this, tag)}
        onDone={handleRenameTag}
        value={tag.data.name}
      />
    );
  };

  onReorderTags = (tags: T.TagEntity[]) => this.props.reorderTags({ tags });

  openTag = (tag: T.TagEntity, event: MouseEvent<HTMLInputElement>) => {
    if (!this.props.editingTags) {
      event.preventDefault();
      event.currentTarget.blur();
      this.props.openTag(tag);
    }
  };

  onTrashTag = (tag: T.TagEntity) => {
    this.props.trashTag({ tag });
    analytics.tracks.recordEvent('list_tag_deleted');
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
              tabIndex={0}
              onClick={onEditTags}
            >
              {editingTags ? 'Done' : 'Edit'}
            </button>
          )}
        </div>
        <EditableList
          className="tag-list-items"
          renderItem={this.renderItem}
          onRemove={this.onTrashTag}
          onReorder={this.onReorderTags}
        />
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = ({
  tags,
  ui: { editingTags, openedTag },
}) => ({
  editingTags,
  tags,
  openedTag,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  onEditTags: () => dispatch(toggleTagEditing()),
  openTag: (tag) => {
    dispatch(openTag(tag));
    analytics.tracks.recordEvent('list_tag_viewed');
  },
  renameTag: (arg) => dispatch(renameTag(arg)),
  reorderTags: (arg) => dispatch(reorderTags(arg)),
  trashTag: (arg) => dispatch(trashTag(arg)),
});

export default connect(mapStateToProps, mapDispatchToProps)(TagList);
