import React, { Component } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import {
  SortableContainer,
  SortableElement,
  SortableHandle,
  SortEndHandler,
} from 'react-sortable-hoc';
import PanelTitle from '../components/panel-title';
import ReorderIcon from '../icons/reorder';
import TrashIcon from '../icons/trash';
import TagListInput from './input';
import { openTag, toggleTagEditing } from '../state/ui/actions';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  editingTags: boolean;
  openedTag: T.EntityId | null;
  sortTagsAlpha: boolean;
  tags: Map<T.EntityId, T.Tag>;
};

type DispatchProps = {
  onEditTags: () => any;
  openTag: (tagId: T.EntityId) => any;
  renameTag: (oldTagName: string, newTagName: string) => any;
  reorderTag: (tagName: string, newIndex: number) => any;
  trashTag: (tagName: string) => any;
};

type Props = StateProps & DispatchProps;

const TagHandle = SortableHandle(() => <ReorderIcon />);

const SortableTag = SortableElement(
  ({
    allowReordering,
    editingActive,
    isSelected,
    renameTag,
    selectTag,
    trashTag,
    value: [tagId, tag],
  }: {
    allowReordering: boolean;
    editingActive: boolean;
    isSelected: boolean;
    renameTag: (oldTagName: string, newTagName: string) => any;
    selectTag: (tagId: T.EntityId) => any;
    trashTag: (tagName: string) => any;
    value: [T.EntityId, T.Tag];
  }) => (
    <li key={tagId} className="tag-list-item" data-tag-name={tag.name}>
      {editingActive && <TrashIcon onClick={() => trashTag(tag.name)} />}
      <TagListInput
        editable={editingActive}
        isSelected={isSelected}
        onClick={() => !editingActive && selectTag(tagId)}
        onDone={(event) => {
          const newTagName = event.target?.value;

          if (newTagName && newTagName !== tag.name) {
            renameTag(tag.name, newTagName);
          }
        }}
        value={tag.name}
      />
      {editingActive && allowReordering && <TagHandle />}
    </li>
  )
);

const SortableTagList = SortableContainer(
  ({
    editingTags,
    items,
    openedTag,
    openTag,
    renameTheTag,
    sortTagsAlpha,
    trashTheTag,
  }: {
    editingTags: boolean;
    items: [T.EntityId, T.Tag][];
    openedTag: T.EntityId | null;
    openTag: (tagId: T.EntityId) => any;
    renameTheTag: (oldTagName: string, newTagName: string) => any;
    sortTagsAlpha: boolean;
    trashTheTag: (tagName: string) => any;
  }) => (
    <ul className="tag-list-items">
      {items.map((value, index) => (
        <SortableTag
          key={value[1].name}
          allowReordering={!sortTagsAlpha}
          editingActive={editingTags}
          index={index}
          isSelected={openedTag === value[0]}
          renameTag={renameTheTag}
          selectTag={openTag}
          trashTag={trashTheTag}
          value={value}
        />
      ))}
    </ul>
  )
);

export class TagList extends Component<Props> {
  static displayName = 'TagList';

  reorderTag: SortEndHandler = ({ newIndex, nodes, oldIndex }) => {
    const tagName = nodes[oldIndex].node.dataset.tagName;

    this.props.reorderTag(tagName, newIndex);
  };

  render() {
    const {
      editingTags,
      onEditTags,
      openTag,
      openedTag,
      renameTag,
      sortTagsAlpha,
      tags,
      trashTag,
    } = this.props;

    const classes = classNames('tag-list', {
      'tag-list-editing': this.props.editingTags,
    });

    const sortedTags = Array.from(tags).sort(([aId, aTag], [bId, bTag]) =>
      sortTagsAlpha
        ? aTag.name.localeCompare(bTag.name)
        : 'undefined' !== typeof aTag.index && 'undefined' !== typeof bTag.index
        ? aTag.index - bTag.index
        : 'undefined' === typeof aTag.index
        ? 1
        : -1
    );

    return (
      <div className={classes}>
        <div className="tag-list-title">
          <PanelTitle headingLevel={2}>Tags</PanelTitle>
          {tags.size > 0 && (
            <button
              className="tag-list-edit-toggle button button-borderless"
              tabIndex={0}
              onClick={onEditTags}
            >
              {editingTags ? 'Done' : 'Edit'}
            </button>
          )}
        </div>
        <SortableTagList
          editingTags={editingTags}
          lockAxis="y"
          openedTag={openedTag}
          openTag={openTag}
          items={sortedTags}
          renameTheTag={renameTag}
          sortTagsAlpha={sortTagsAlpha}
          onSortEnd={this.reorderTag}
          useDragHandle={true}
          trashTheTag={trashTag}
        />
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = ({
  data,
  settings: { sortTagsAlpha },
  ui: { editingTags, openedTag },
}) => ({
  editingTags,
  sortTagsAlpha,
  tags: data.tags[0],
  openedTag,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  onEditTags: toggleTagEditing,
  openTag: openTag,
  renameTag: (oldTagName, newTagName) => ({
    type: 'RENAME_TAG',
    oldTagName,
    newTagName,
  }),
  reorderTag: (tagName, newIndex) => ({
    type: 'REORDER_TAG',
    tagName,
    newIndex,
  }),
  trashTag: (tagName) => ({
    type: 'TRASH_TAG',
    tagName,
  }),
};

export default connect(mapStateToProps, mapDispatchToProps)(TagList);
