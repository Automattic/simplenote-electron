import React, {
  Component,
  KeyboardEventHandler,
  MouseEvent,
  RefObject,
} from 'react';
import { connect } from 'react-redux';
import { Overlay } from 'react-overlays';
import isEmailTag from '../utils/is-email-tag';
import { updateNoteTags } from '../state/domain/notes';
import EmailToolTip from '../tag-email-tooltip';
import TagChip from '../components/tag-chip';
import TagInput from '../tag-input';
import classNames from 'classnames';
import analytics from '../analytics';
import { differenceBy, intersectionBy, invoke, negate, union } from 'lodash';

import * as S from '../state';
import * as T from '../types';

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
  allTags: T.TagEntity[];
  keyboardShortcuts: boolean;
  note: T.NoteEntity | null;
};

type DispatchProps = {
  updateNoteTags: (args: { note: T.NoteEntity; tags: T.TagEntity[] }) => any;
};

type Props = OwnProps & DispatchProps & StateProps;

const KEY_BACKSPACE = 8;
const KEY_TAB = 9;
const KEY_RIGHT = 39;

export class TagField extends Component<Props, OwnState> {
  focusInput?: () => any;
  hiddenTag?: RefObject<HTMLInputElement> | null;
  inputHasFocus?: () => boolean;
  tagInput?: RefObject<HTMLDivElement> | null;

  static displayName = 'TagField';

  state = {
    selectedTag: '',
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
    const { allTags, tags: existingTags } = this.props;

    const newTags = tags.trim().replace(/\s+/g, ',').split(',');

    if (newTags.some(isEmailTag)) {
      this.showEmailTooltip();
    }

    const allTagNames = allTags.map((tag) => tag.data.name);
    const nextTagList = union(
      existingTags, // tags already in note
      intersectionBy(allTagNames, newTags, (s) => s.toLocaleLowerCase()), // use existing case if tag known
      differenceBy(newTags, allTagNames, (s) => s.toLocaleLowerCase()) // add completely new tags
    );
    this.updateTags(nextTagList);
    this.storeTagInput('');
    invoke(this, 'tagInput.focus');
    analytics.tracks.recordEvent('editor_tag_added');
  };

  hasSelection = () =>
    this.state.selectedTag && !!this.state.selectedTag.length;

  deleteTag = (tagName: T.TagName) => {
    const { tags } = this.props;
    const { selectedTag } = this.state;

    this.updateTags(
      differenceBy(tags, [tagName], (s) => s.toLocaleLowerCase())
    );

    if (selectedTag === tagName) {
      this.setState({ selectedTag: '' }, () => this.tagInput?.current?.focus());
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

  interceptKeys: KeyboardEventHandler = (e) => {
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
      this.setState({ selectedTag: '' });
    }

    return true;
  };

  updateTags = (tags) =>
    this.props.updateNoteTags({ note: this.props.note, tags });

  selectLastTag = () =>
    this.setState({
      selectedTag: this.props.note?.data.tags.slice(-1).shift(),
    });

  selectTag = (event: MouseEvent<HTMLDivElement>) => {
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

  onKeyDown = (e: React.KeyboardEvent) => {
    if (this.state.showEmailTooltip) {
      this.hideEmailTooltip();
    }

    return this.interceptKeys(e);
  };

  storeFocusInput = (f) => (this.focusInput = f);

  storeHasFocus = (f) => (this.inputHasFocus = f);

  storeHiddenTag = (r) => (this.hiddenTag = r);

  storeInputRef = (r) => (this.tagInput = r);

  storeTagInput = (value: string, callback?: (...args: any) => any) =>
    this.setState({ tagInput: value }, callback);

  unselect = (event: React.KeyboardEvent) => {
    if (!this.state.selectedTag) {
      return;
    }

    if (this.hiddenTag?.current !== event.relatedTarget) {
      this.setState({ selectedTag: '' });
    }
  };

  render() {
    const { allTags, note } = this.props;
    const { selectedTag, showEmailTooltip, tagInput } = this.state;

    return (
      <div className="tag-field">
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
          {note?.data.tags.filter(negate(isEmailTag)).map((tag) => (
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
            tagNames={differenceBy(
              allTags.map((tag) => tag.data.name),
              note?.data.tags,
              (s) => s.toLocaleLowerCase()
            )}
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
            {() => <EmailToolTip />}
          </Overlay>
        </div>
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  allTags: state.tags,
  keyboardShortcuts: state.settings.keyboardShortcuts,
  note: state.ui.note,
});

export default connect(mapStateToProps, {
  updateNoteTags,
} as S.MapDispatch<DispatchProps>)(TagField);
