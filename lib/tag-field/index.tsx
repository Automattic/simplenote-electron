import React, { Component, KeyboardEventHandler } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Overlay } from 'react-overlays';
import isEmailTag from '../utils/is-email-tag';
import { updateNoteTags } from '../state/domain/notes';
import EmailToolTip from '../tag-email-tooltip';
import TagChip from '../components/tag-chip';
import TagInput from '../tag-input';
import classNames from 'classnames';
import analytics from '../analytics';
import {
  differenceBy,
  intersectionBy,
  invoke,
  negate,
  noop,
  union,
} from 'lodash';

const KEY_BACKSPACE = 8;
const KEY_TAB = 9;
const KEY_RIGHT = 39;

export class TagField extends Component {
  static displayName = 'TagField';

  static propTypes = {
    allTags: PropTypes.array.isRequired,
    note: PropTypes.object.isRequired,
    storeFocusTagField: PropTypes.func,
    storeHasFocus: PropTypes.func,
    tags: PropTypes.array.isRequired,
    unusedTags: PropTypes.arrayOf(PropTypes.string),
    updateNoteTags: PropTypes.func.isRequired,
    usedTags: PropTypes.arrayOf(PropTypes.string),
  };

  static defaultProps = {
    storeFocusTagField: noop,
    storeHasFocus: noop,
    tags: [],
  };

  state = {
    selectedTag: '',
    tagInput: '',
  };

  componentDidMount() {
    this.props.storeFocusTagField(this.focusTagField);
    this.props.storeHasFocus(this.hasFocus);

    document.addEventListener('click', this.unselect, true);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.unselect, true);
  }

  componentDidUpdate() {
    if (this.hasSelection()) {
      this.hiddenTag.focus();
    }
  }

  addTag = tags => {
    const { allTags, tags: existingTags } = this.props;

    const newTags = tags
      .trim()
      .replace(/\s+/g, ',')
      .split(',');

    if (newTags.some(isEmailTag)) {
      this.showEmailTooltip();
    }

    const nextTagList = union(
      existingTags, // tags already in note
      intersectionBy(allTags, newTags, s => s.toLocaleLowerCase()), // use existing case if tag known
      differenceBy(newTags, allTags, s => s.toLocaleLowerCase()) // add completely new tags
    );
    this.updateTags(nextTagList);
    this.storeTagInput('');
    invoke(this, 'tagInput.focus');
    analytics.tracks.recordEvent('editor_tag_added');
  };

  hasSelection = () =>
    this.state.selectedTag && !!this.state.selectedTag.length;

  deleteTag = tagName => {
    const { tags } = this.props;
    const { selectedTag } = this.state;

    this.updateTags(differenceBy(tags, [tagName], s => s.toLocaleLowerCase()));

    if (selectedTag === tagName) {
      this.setState({ selectedTag: '' }, () => {
        invoke(this, 'tagInput.focus');
      });
    }

    analytics.tracks.recordEvent('editor_tag_removed');
  };

  deleteSelection = () => {
    if (this.hasSelection()) {
      this.deleteTag(this.state.selectedTag);
    }
  };

  hideEmailTooltip = () => this.setState({ showEmailTooltip: false });

  hasFocus = () => this.inputHasFocus && this.inputHasFocus();

  focusTagField = () => this.focusInput && this.focusInput();

  interceptKeys: KeyboardEventHandler<HTMLDivElement> = e => {
    if (KEY_BACKSPACE === e.which) {
      if (this.hasSelection()) {
        this.deleteSelection();
      }

      if ('' !== this.state.tagInput) {
        return;
      }

      this.selectLastTag();
      e.preventDefault();
      return;
    }
    if (KEY_RIGHT === e.which && this.hasSelection()) {
      this.unselect(e);
      this.focusTagField();
      return;
    }
    if (KEY_TAB === e.which && this.hasSelection()) {
      this.unselect(e);
      return;
    }
  };

  updateTags = tags =>
    this.props.updateNoteTags({ note: this.props.note, tags });

  selectLastTag = () =>
    this.setState({ selectedTag: this.props.tags.slice(-1).shift() });

  selectTag = event => {
    const {
      target: {
        dataset: { tagName },
      },
    } = event;

    event.preventDefault();
    event.stopPropagation();

    this.deleteTag(tagName);
  };

  showEmailTooltip = () => {
    this.setState({ showEmailTooltip: true });

    setTimeout(() => this.setState({ showEmailTooltip: false }), 5000);
  };

  onKeyDown = e => {
    if (this.state.showEmailTooltip) {
      this.hideEmailTooltip();
    }

    return this.interceptKeys(e);
  };

  storeFocusInput = f => (this.focusInput = f);

  storeHasFocus = f => (this.inputHasFocus = f);

  storeHiddenTag = r => (this.hiddenTag = r);

  storeInputRef = r => (this.tagInput = r);

  storeTagInput = (value, callback) =>
    this.setState({ tagInput: value }, callback);

  unselect = event => {
    if (!this.state.selectedTag) {
      return;
    }

    if (this.hiddenTag !== event.relatedTarget) {
      this.setState({ selectedTag: '' });
    }
  };

  render() {
    const { allTags, tags } = this.props;
    const { selectedTag, showEmailTooltip, tagInput } = this.state;

    return (
      <div className="tag-field">
        <div
          className={classNames('tag-editor', {
            'has-selection': this.hasSelection(),
          })}
          tabIndex="-1"
          onKeyDown={this.onKeyDown}
        >
          <input
            className="hidden-tag"
            tabIndex="-1"
            ref={this.storeHiddenTag}
          />
          {tags.filter(negate(isEmailTag)).map(tag => (
            <TagChip
              key={tag}
              tag={tag}
              selected={tag === selectedTag}
              onSelect={this.selectTag}
            />
          ))}
          <TagInput
            allTags={allTags}
            inputRef={this.storeInputRef}
            value={tagInput}
            onChange={this.storeTagInput}
            onSelect={this.addTag}
            storeFocusInput={this.storeFocusInput}
            storeHasFocus={this.storeHasFocus}
            tagNames={differenceBy(allTags, tags, s => s.toLocaleLowerCase())}
          />
          <Overlay
            container={this}
            onHide={this.hideEmailTooltip}
            placement="top"
            rootClose={true}
            shouldUpdatePosition={true}
            show={showEmailTooltip}
            target={this.tagInput}
          >
            {() => <EmailToolTip note={this.props.note} />}
          </Overlay>
        </div>
      </div>
    );
  }
}

export default connect(null, { updateNoteTags })(TagField);
