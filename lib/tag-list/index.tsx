import React, { Component, FocusEvent, MouseEvent } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import PanelTitle from '../components/panel-title';
import TagListInput from './input';
import { renameTag, reorderTags, trashTag } from '../state/domain/tags';
import { openTag, toggleTagEditing } from '../state/ui/actions';
import analytics from '../analytics';

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
  renameTag: (args: { tagId: T.EntityId; name: T.TagName }) => any;
  reorderTags: (args: { tags: T.TagEntity[] }) => any;
  trashTag: (args: { tag: T.TagEntity }) => any;
};

type Props = StateProps & DispatchProps;

export class TagList extends Component<Props> {
  static displayName = 'TagList';

  render() {
    const { editingTags, openTag, openedTag, sortTagsAlpha, tags } = this.props;

    const classes = classNames('tag-list', {
      'tag-list-editing': this.props.editingTags,
    });

    const sortedTags = sortTagsAlpha
      ? [...tags.entries()].sort(([aId, aTag], [bId, bTag]) =>
          aTag.name.localeCompare(bTag.name)
        )
      : [...tags.entries()];

    return (
      <div className={classes}>
        <div className="tag-list-title">
          <PanelTitle headingLevel={2}>Tags</PanelTitle>
          {tags.size > 0 && (
            <button
              className="tag-list-edit-toggle button button-borderless"
              tabIndex={0}
              onClick={() => {}}
            >
              {editingTags ? 'Done' : 'Edit'}
            </button>
          )}
        </div>
        <ul className="tag-list-items editable-list">
          {sortedTags.map(([tagId, tag]) => (
            <li key={tagId} className="editable-list-item">
              <span className="editable-list-item-left">
                <span className="editable-list-trash" />
                <span className="editable-list-item-content">
                  <TagListInput
                    editable={editingTags}
                    isSelected={openedTag === tagId}
                    onClick={() => openTag(tagId)}
                    onDone={() => {}}
                    value={tag.name}
                  />
                </span>
              </span>
            </li>
          ))}
        </ul>
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

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  onEditTags: () => dispatch(toggleTagEditing()),
  openTag: (tagId) => {
    dispatch(openTag(tagId));
    analytics.tracks.recordEvent('list_tag_viewed');
  },
  renameTag: (arg) => dispatch(renameTag(arg)),
  reorderTags: (arg) => dispatch(reorderTags(arg)),
  trashTag: (arg) => dispatch(trashTag(arg)),
});

export default connect(mapStateToProps, mapDispatchToProps)(TagList);
