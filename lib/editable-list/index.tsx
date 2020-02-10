import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import SmallCrossOutlineIcon from '../icons/cross-outline-small';
import ReorderIcon from '../icons/reorder';

import * as S from '../state';
import * as T from '../types';

type OwnProps = {
  className: string;
  getItemKey: (item: T.TagEntity) => T.EntityId;
  onRemove: (tag: T.TagEntity) => any;
  onReorder: (tags: T.TagEntity[]) => any;
  renderItem: (tag: T.TagEntity) => React.ReactNode;
};

type StateProps = {
  editing: boolean;
  items: T.TagEntity[] | null;
  sortTagsAlpha: boolean;
};

type Props = OwnProps & StateProps;

export class EditableList extends Component<Props> {
  static displayName = 'EditableList';

  reorderingElement: HTMLElement | null = null;
  reorderingClientY: number = 0;
  reorderingOffsetY: number = 0;
  reorderingTranslateY: number = 0;

  static propTypes = {
    editing: PropTypes.bool.isRequired,
  };

  static defaultProps = {
    getItemKey: (item: T.TagEntity) => item.id,
  };

  state = {
    items: [],
    reorderedItems: [],
    reorderingId: null,
  };

  componentWillMount() {
    this.setState({
      items: this.props.items,
      reorderedItems: this.props.items ? this.props.items.slice() : [],
    });
  }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.items !== this.state.items) {
      this.stopReordering();

      this.setState({
        items: nextProps.items,
        reorderedItems: nextProps.items ? nextProps.items.slice() : [],
      });
    }
  }

  componentWillUnmount() {
    this.unbindReorderingListeners();
  }

  bindReorderingListeners = () => {
    this.unbindReorderingListeners();
    window.addEventListener('mouseup', this.onReorderEnd);
    window.addEventListener('touchend', this.onReorderEnd);
    window.addEventListener('touchcancel', this.onReorderCancel);
    window.addEventListener('keydown', this.onKeyDown);
  };

  unbindReorderingListeners = () => {
    window.removeEventListener('mouseup', this.onReorderEnd);
    window.removeEventListener('touchend', this.onReorderEnd);
    window.removeEventListener('touchcancel', this.onReorderCancel);
    window.removeEventListener('keydown', this.onKeyDown);
  };

  render() {
    const { editing, onRemove, onReorder, sortTagsAlpha } = this.props;
    const { reorderedItems, reorderingId } = this.state;
    const classes = classNames('editable-list', this.props.className, {
      'editable-list-editing': this.props.editing,
      'editable-list-removable': onRemove,
      'editable-list-reorderable': onReorder,
      'editable-list-reordering': reorderingId,
    });

    return (
      <ul className={classes}>
        {reorderedItems.map(item => {
          const itemId = this.props.getItemKey(item);

          return (
            <li
              key={itemId}
              ref={this.setReorderingElementRef.bind(this, itemId)}
              className={classNames('editable-list-item', {
                'editable-list-item-reordering': itemId === reorderingId,
              })}
              onMouseMove={this.onReorderMove.bind(this, itemId)}
              onTouchMove={this.onReorderMove.bind(this, itemId)}
            >
              <span className="editable-list-item-left">
                {onRemove && (
                  <span
                    className="editable-list-trash"
                    tabIndex={editing ? 0 : -1}
                    onClick={onRemove.bind(null, item)}
                  >
                    <SmallCrossOutlineIcon />
                  </span>
                )}

                <span className="editable-list-item-content">
                  {this.props.renderItem(item)}
                </span>
              </span>

              {onReorder && !sortTagsAlpha && (
                <span
                  className="editable-list-reorder"
                  tabIndex={editing ? 0 : -1}
                  onDragStart={e => e.preventDefault()}
                  onMouseDown={this.onReorderStart.bind(this, itemId)}
                  onTouchStart={this.onReorderStart.bind(this, itemId)}
                  onKeyDown={this.onReorderKeyDown.bind(this, itemId)}
                >
                  <ReorderIcon />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  setReorderingElementRef = (
    reorderingId: T.EntityId,
    element: HTMLElement
  ) => {
    if (reorderingId !== this.state.reorderingId) {
      return;
    }

    if (this.reorderingElement !== element) {
      this.unsetReorderingElement();
      this.reorderingTranslateY = 0;
    }

    this.reorderingElement = element;
    this.bindReorderingListeners();
    this.positionReorderingElement();
  };

  positionReorderingElement = () => {
    if (!this.reorderingElement) {
      return;
    }
    let rect = this.reorderingElement.getBoundingClientRect();
    let offsetY =
      this.reorderingClientY - (rect.top - this.reorderingTranslateY);
    let translateY = offsetY - this.reorderingOffsetY;

    if (translateY < 0 && !this.reorderingElement.previousSibling) {
      translateY = 0;
    } else if (translateY > 0 && !this.reorderingElement.nextSibling) {
      translateY = 0;
    }

    this.reorderingTranslateY = translateY;

    let transform = `translateY(${translateY}px)`;
    this.reorderingElement.style.transform = transform;
    this.reorderingElement.style.msTransform = transform;
    this.reorderingElement.style.webkitTransform = transform;
  };

  unsetReorderingElement = () => {
    this.unbindReorderingListeners();

    if (!this.reorderingElement) {
      return;
    }

    this.reorderingElement.style.transform = '';
    this.reorderingElement.style.msTransform = '';
    this.reorderingElement.style.webkitTransform = '';
    this.reorderingElement = null;
  };

  stopReordering = (resetOrdering = false) => {
    this.unsetReorderingElement();

    if (resetOrdering) {
      this.setState({
        reorderedItems: this.props.items ? this.props.items.slice() : [],
        reorderingId: null,
      });
    } else {
      this.setState({
        reorderingId: null,
      });
    }
  };

  reorderItemById = (
    reorderingId: T.EntityId | null,
    offset: number,
    targetReorderingId: T.EntityId | null = null
  ) => {
    const { getItemKey } = this.props;
    const { reorderedItems } = this.state;
    let reorderingIndex = null;
    let targetIndex = null;

    if (targetReorderingId === null) {
      targetReorderingId = reorderingId;
    }

    for (let i = 0; i < reorderedItems.length; ++i) {
      let itemId = getItemKey(reorderedItems[i]);

      if (itemId === reorderingId) {
        reorderingIndex = i;
      }
      if (itemId === targetReorderingId) {
        targetIndex = i;
      }
    }

    return this.reorderItemByIndex(reorderingIndex, targetIndex + offset);
  };

  reorderItemByIndex = (
    reorderingIndex: number | null,
    targetIndex: number | null
  ) => {
    if (reorderingIndex === targetIndex) {
      return;
    }

    if (reorderingIndex === null || reorderingIndex < 0) {
      return;
    }

    if (targetIndex === null || targetIndex < 0) {
      return;
    }

    let reorderedItems = this.state.reorderedItems.slice();
    let spliced = reorderedItems.splice(reorderingIndex, 1);
    reorderedItems.splice(targetIndex, 0, ...spliced);

    this.setState({ reorderedItems });
  };

  onReorderStart = (
    reorderingId: T.EntityId,
    event: T.XOR<
      React.MouseEvent<HTMLSpanElement>,
      React.TouchEvent<HTMLSpanElement>
    >
  ) => {
    event.preventDefault();
    event.currentTarget.focus();

    let clientY =
      event.clientY ||
      (event.touches && event.touches[0] && event.touches[0].clientY);
    this.reorderingClientY = clientY;

    let rect = event.currentTarget.getBoundingClientRect();
    this.reorderingOffsetY = clientY - rect.top;
    this.reorderingTranslateY = 0;

    this.setState({ reorderingId });
    this.bindReorderingListeners();
  };

  onReorderMove = (
    targetReorderingId: T.EntityId,
    event: T.XOR<
      React.MouseEvent<HTMLLIElement>,
      React.TouchEvent<HTMLLIElement>
    >
  ) => {
    if (!this.reorderingElement || !this.props.editing) {
      return;
    }

    let clientY =
      event.clientY ||
      (event.touches && event.touches[0] && event.touches[0].clientY);
    this.reorderingClientY = clientY;

    if (targetReorderingId !== this.state.reorderingId) {
      let rect = event.currentTarget.getBoundingClientRect();
      let centerY = rect.height * 0.5 + rect.top;

      this.reorderItemById(
        this.state.reorderingId,
        clientY < centerY ? 0 : 1,
        targetReorderingId
      );
    }

    this.positionReorderingElement();
  };

  onReorderEnd = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    this.stopReordering();
    this.props.onReorder(this.state.reorderedItems);
  };

  onReorderCancel = () => this.stopReordering(true);

  onReorderKeyDown = (
    reorderingId: T.EntityId,
    event: React.KeyboardEvent<HTMLSpanElement>
  ) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.reorderItemById(reorderingId, -1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.reorderItemById(reorderingId, 1);
    }
  };

  onKeyDown = (event: KeyboardEvent) => {
    const keyCode = event.keyCode || event.which;

    if (keyCode === 27) {
      event.preventDefault();
      this.onReorderCancel();
    }
  };
}

const mapStateToProps: S.MapState<StateProps> = ({
  appState: { editingTags, tags },
  settings: { sortTagsAlpha },
}) => ({
  editing: editingTags,
  items: tags,
  sortTagsAlpha,
});

export default connect(mapStateToProps)(EditableList);
