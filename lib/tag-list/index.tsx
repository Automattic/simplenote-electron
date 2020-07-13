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

import type * as S from '../state';
import type * as T from '../types';

type StateProps = {
  editingTags: boolean;
  openedTag: T.TagHash | null;
  sortTagsAlpha: boolean;
  tags: Map<T.TagHash, T.Tag>;
};

type DispatchProps = {
  onEditTags: () => any;
  openTag: (tagName: T.TagName) => any;
  renameTag: (oldTagName: T.TagName, newTagName: T.TagName) => any;
  reorderTag: (tagName: T.TagName, newIndex: number) => any;
  trashTag: (tagName: T.TagName) => any;
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
    value: [tagHash, tag],
  }: {
    allowReordering: boolean;
    editingActive: boolean;
    isSelected: boolean;
    renameTag: (oldTagName: T.TagName, newTagName: T.TagName) => any;
    selectTag: (tagName: T.TagName) => any;
    trashTag: (tagName: T.TagName) => any;
    value: [T.TagHash, T.Tag];
  }) => (
    <li key={tagHash} className="tag-list-item" data-tag-name={tag.name}>
      {editingActive && <TrashIcon onClick={() => trashTag(tag.name)} />}
      <TagListInput
        editable={editingActive}
        isSelected={isSelected}
        onClick={() => !editingActive && selectTag(tag.name)}
        onDone={(event) => {
          const newTagName = event.target?.value as T.TagName;

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
    items: [T.TagHash, T.Tag][];
    openedTag: T.TagHash | null;
    openTag: (tagName: T.TagName) => any;
    renameTheTag: (oldTagName: T.TagName, newTagName: T.TagName) => any;
    sortTagsAlpha: boolean;
    trashTheTag: (tagName: T.TagName) => any;
  }) => (
    <ul className="tag-list-items">
      {items.map((value, index) => (
        <SortableTag
          key={value[0]}
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
  tags: data.tags,
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
