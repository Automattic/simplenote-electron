import React, { Component, RefObject, createRef } from 'react';
import { connect } from 'react-redux';
import { Overlay } from 'react-overlays';
import { invoke, negate } from 'lodash';

import isEmailTag from '../utils/is-email-tag';
import EmailToolTip from '../tag-email-tooltip';
import TagChip from '../components/tag-chip';
import TagInput from '../tag-input';
import classNames from 'classnames';
import analytics from '../analytics';
import { tagHashOf } from '../utils/tag-hash';

import type * as S from '../state';
import type * as T from '../types';

type OwnProps = {
  storeFocusTagField: (focusSetter: () => any) => any;
  storeHasFocus: (focusGetter: () => boolean) => any;
};

type OwnState = {
  selectedTag: T.TagName;
  showEmailTooltip?: boolean;
  tagInput: string;
};

type StateProps = {
  allTags: Map<T.TagHash, T.Tag>;
  keyboardShortcuts: boolean;
  noteId: T.EntityId;
  note: T.Note;
};

type DispatchProps = {
  addTag: (noteId: T.EntityId, tagName: T.TagName) => any;
  removeTag: (noteId: T.EntityId, tagName: T.TagName) => any;
};

type Props = OwnProps & DispatchProps & StateProps;

const KEY_BACKSPACE = 8;
const KEY_TAB = 9;
const KEY_RIGHT = 39;

export class TagField extends Component<Props, OwnState> {
  container = createRef<HTMLDivElement>();
  focusInput?: () => any;
  hiddenTag?: RefObject<HTMLInputElement> | null;
  inputHasFocus?: () => boolean;
  tagInput = createRef<HTMLDivElement>();

  static displayName = 'TagField';

  state = {
    selectedTag: '' as T.TagName,
    showEmailTooltip: false,
    tagInput: '',
  };

  componentDidMount() {
    this.props.storeFocusTagField(this.focusTagField);
    this.props.storeHasFocus(this.hasFocus);

    document.addEventListener('click', this.unselect, true);
    window.addEventListener('keydown', this.preventStealingFocus, true);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.unselect, true);
    window.removeEventListener('keydown', this.preventStealingFocus, true);
  }

  componentDidUpdate() {
    if (this.hasSelection()) {
      this.hiddenTag?.current?.focus();
    }
  }

  addTag = (tags: string) => {
    const { note, noteId } = this.props;
    const newTags = tags.trim().replace(/\s+/g, ',').split(',') as T.TagName[];

    if (newTags.some(isEmailTag)) {
      this.showEmailTooltip();
    }

    const sameTags = new Set(note.tags.map(tagHashOf));

    newTags.forEach((tag) => {
      if (sameTags.has(tagHashOf(tag))) {
        return;
      }

      sameTags.add(tagHashOf(tag));
      this.props.addTag(noteId, tag);
    });

    this.storeTagInput('');
    invoke(this, 'tagInput.focus');
    analytics.tracks.recordEvent('editor_tag_added');
  };

  hasSelection = () =>
    this.state.selectedTag && !!this.state.selectedTag.length;

  deleteTag = (tagName: T.TagName) => {
    const { noteId } = this.props;
    const { selectedTag } = this.state;

    this.props.removeTag(noteId, tagName);

    if (selectedTag === tagName) {
      this.setState({ selectedTag: '' as T.TagName }, () =>
        this.tagInput?.current?.focus()
      );
    }

    analytics.tracks.recordEvent('editor_tag_removed');
  };

  deleteSelection = () => {
    if (this.hasSelection()) {
      this.deleteTag(this.state.selectedTag as T.TagName);
    }
  };

  hideEmailTooltip = () => this.setState({ showEmailTooltip: false });

  hasFocus = () => !!this.inputHasFocus && this.inputHasFocus();

  focusTagField = () => this.focusInput && this.focusInput();

  interceptKeys: React.KeyboardEventHandler = (e) => {
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

  preventStealingFocus = ({
    ctrlKey,
    code,
    metaKey,
    shiftKey,
  }: KeyboardEvent) => {
    if (!this.props.keyboardShortcuts) {
      return;
    }
    const cmdOrCtrl = ctrlKey || metaKey;

    if (cmdOrCtrl && shiftKey && 'KeyY' === code) {
      this.setState({ selectedTag: '' as T.TagName });
    }

    return true;
  };

  selectLastTag = () =>
    this.setState({
      selectedTag: this.props.note?.tags.slice(-1).shift() as T.TagName,
    });

  selectTag = (event: React.MouseEvent<HTMLDivElement>) => {
    const {
      currentTarget: {
        dataset: { tagName },
      },
    } = event;

    event.preventDefault();
    event.stopPropagation();

    this.deleteTag(tagName as T.TagName);
  };

  showEmailTooltip = () => {
    this.setState({ showEmailTooltip: true });

    setTimeout(() => this.setState({ showEmailTooltip: false }), 5000);
  };

  onKeyDown = (e: React.KeyboardEvent) => {
    if (this.state.showEmailTooltip) {
      this.hideEmailTooltip();
    }

    return this.interceptKeys(e);
  };

  storeFocusInput = (f: () => any) => (this.focusInput = f);

  storeHasFocus = (f: () => any) => (this.inputHasFocus = f);

  storeHiddenTag = (r: RefObject<HTMLInputElement>) => (this.hiddenTag = r);

  storeInputRef = (r: RefObject<HTMLDivElement>) => (this.tagInput = r);

  storeTagInput = (value: string, callback?: (...args: any) => any) =>
    this.setState({ tagInput: value }, callback);

  unselect = (event: React.KeyboardEvent | MouseEvent) => {
    if (!this.state.selectedTag) {
      return;
    }

    if (this.hiddenTag?.current !== event.relatedTarget) {
      this.setState({ selectedTag: '' as T.TagName });
    }
  };

  render() {
    const { note } = this.props;
    const { selectedTag, showEmailTooltip, tagInput } = this.state;

    return (
      <div ref={this.container} className="tag-field">
        <div
          className={classNames('tag-editor', {
            'has-selection': this.hasSelection(),
          })}
          tabIndex={-1}
          onKeyDown={this.onKeyDown}
        >
          <input
            className="hidden-tag"
            tabIndex={-1}
            ref={this.storeHiddenTag}
          />
          {note?.tags.filter(negate(isEmailTag)).map((tag) => (
            <TagChip
              key={tag}
              tagName={tag}
              selected={tag === selectedTag}
              onSelect={this.selectTag}
            />
          ))}
          <TagInput
            inputRef={this.storeInputRef}
            value={tagInput}
            onChange={this.storeTagInput}
            onSelect={this.addTag}
            storeFocusInput={this.storeFocusInput}
            storeHasFocus={this.storeHasFocus}
          />
          <Overlay
            container={this.container.current}
            onHide={this.hideEmailTooltip}
            placement="top"
            rootClose={true}
            shouldUpdatePosition={true}
            show={showEmailTooltip}
            target={this.tagInput.current}
          >
            {() => <EmailToolTip />}
          </Overlay>
        </div>
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  allTags: state.data.tags,
  keyboardShortcuts: state.settings.keyboardShortcuts,
  noteId: state.ui.openedNote,
  note: state.data.notes.get(state.ui.openedNote),
});

export default connect(mapStateToProps, {
  addTag: (noteId, tagName) => ({
    type: 'ADD_NOTE_TAG',
    noteId,
    tagName,
  }),
  removeTag: (noteId, tagName) => ({
    type: 'REMOVE_NOTE_TAG',
    noteId,
    tagName,
  }),
} as S.MapDispatch<DispatchProps>)(TagField);
