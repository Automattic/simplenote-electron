import React, {
  Component,
  KeyboardEventHandler,
  MouseEvent,
  RefObject,
  createRef,
} from 'react';
import { connect } from 'react-redux';
import { Overlay } from 'react-overlays';
import isEmailTag from '../utils/is-email-tag';
import EmailToolTip from '../tag-email-tooltip';
import TagChip from '../components/tag-chip';
import TagInput from '../tag-input';
import classNames from 'classnames';
import analytics from '../analytics';
import { invoke, negate } from 'lodash';
import actions from '../state/actions';

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
  allTags: Map<T.EntityId, T.Tag>;
  keyboardShortcuts: boolean;
  noteId: T.EntityId;
  note: T.Note;
};

type DispatchProps = {
  editNote: (noteId: T.EntityId, changes: Partial<T.Note>) => any;
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
    const { note, noteId } = this.props;
    const newTags = tags.trim().replace(/\s+/g, ',').split(',');

    if (newTags.some(isEmailTag)) {
      this.showEmailTooltip();
    }

    const sameTags = new Set(note.tags.map((t) => t.toLocaleLowerCase()));
    const nextTags = [...note.tags];

    newTags.forEach((tag) => {
      if (sameTags.has(tag.toLocaleLowerCase())) {
        return;
      }

      sameTags.add(tag.toLocaleLowerCase());
      nextTags.push(tag);
    });

    this.props.editNote(noteId, { tags: nextTags });
    this.storeTagInput('');
    invoke(this, 'tagInput.focus');
    analytics.tracks.recordEvent('editor_tag_added');
  };

  hasSelection = () =>
    this.state.selectedTag && !!this.state.selectedTag.length;

  deleteTag = (tagName: T.TagName) => {
    const { note, noteId } = this.props;
    const { selectedTag } = this.state;

    this.props.editNote(noteId, {
      tags: note.tags.filter(
        (tag) => tag.toLocaleLowerCase() !== tagName.toLocaleLowerCase()
      ),
    });

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

  selectLastTag = () =>
    this.setState({
      selectedTag: this.props.note?.tags.slice(-1).shift(),
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
  allTags: state.data.tags[0],
  keyboardShortcuts: state.settings.keyboardShortcuts,
  noteId: state.ui.openedNote,
  note: state.data.notes.get(state.ui.openedNote),
});

export default connect(mapStateToProps, {
  editNote: actions.data.editNote,
} as S.MapDispatch<DispatchProps>)(TagField);
