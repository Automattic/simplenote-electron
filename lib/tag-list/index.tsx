import React, { Component, FocusEvent, MouseEvent } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import PanelTitle from '../components/panel-title';
import EditableList from '../editable-list';
import { get } from 'lodash';
import TagListInput from './input';
import appState from '../flux/app-state';
import { renameTag, reorderTags, trashTag } from '../state/domain/tags';
import { toggleTagEditing } from '../state/ui/actions';
import analytics from '../analytics';

import * as S from '../state';
import * as T from '../types';

const { selectTagAndSelectFirstNote } = appState.actionCreators;

type StateProps = {
  editingTags: boolean;
  tags: T.TagEntity[] | null;
  selectedTag?: T.TagEntity;
};

type DispatchProps = {
  onEditTags: () => any;
  onSelectTag: (tag: T.TagEntity) => any;
  renameTag: (args: { tag: T.TagEntity; name: T.TagName }) => any;
  reorderTags: (args: { tags: T.TagEntity[] }) => any;
  trashTag: (args: { tag: T.TagEntity }) => any;
};

type Props = StateProps & DispatchProps;

export class TagList extends Component<Props> {
  static displayName = 'TagList';

  renderItem = (tag: T.TagEntity) => {
    const { editingTags, selectedTag } = this.props;
    const isSelected = tag.data.name === get(selectedTag, 'data.name', '');

    const handleRenameTag = ({
      target: { value },
    }: FocusEvent<HTMLInputElement>) =>
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

  onReorderTags = (tags: T.TagEntity[]) => this.props.reorderTags({ tags });

  onSelectTag = (tag: T.TagEntity, event: MouseEvent<HTMLInputElement>) => {
    if (!this.props.editingTags) {
      event.preventDefault();
      event.currentTarget.blur();
      this.props.onSelectTag(tag);
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
  appState: state,
  ui: { editingTags },
}) => ({
  editingTags,
  tags: state.tags,
  selectedTag: state.tag,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = dispatch => ({
  onEditTags: () => dispatch(toggleTagEditing()),
  onSelectTag: tag => {
    dispatch(selectTagAndSelectFirstNote({ tag }));
    analytics.tracks.recordEvent('list_tag_viewed');
  },
  renameTag: arg => dispatch(renameTag(arg)),
  reorderTags: arg => dispatch(reorderTags(arg)),
  trashTag: arg => dispatch(trashTag(arg)),
});

export default connect(mapStateToProps, mapDispatchToProps)(TagList);
