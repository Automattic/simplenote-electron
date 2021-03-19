import React, {
  ClipboardEvent,
  Component,
  CompositionEvent,
  KeyboardEvent,
  RefObject,
} from 'react';
import { connect } from 'react-redux';
import { get, identity, invoke, noop } from 'lodash';

import type * as S from '../state';
import type * as T from '../types';

const KEY_TAB = 9;
const KEY_ENTER = 13;
const KEY_SPACE = 32;
const KEY_RIGHT = 39;
const KEY_COMMA = 188;

const getCaretPosition = (
  element?: React.RefObject<HTMLDivElement> | Node | null
) => {
  if (!element || !window.getSelection) {
    return 0;
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount < 1) {
    return 0;
  }

  const originalRange = selection.getRangeAt(0);
  const range = originalRange.cloneRange();
  range.selectNodeContents(element as Node);
  range.setEnd(originalRange.endContainer, originalRange.endOffset);
  return range.toString().length;
};

type OwnProps = {
  inputRef: (ref: RefObject<HTMLDivElement>) => any;
  onChange: (tagName: string, callback: () => any) => any;
  onSelect: (tagName: string) => any;
  storeFocusInput: (focusSetter: () => any) => any;
  storeHasFocus: (focusGetter: () => boolean) => any;
  value: string;
};

type StateProps = {
  note: T.Note;
  tags: Map<T.TagHash, T.Tag>;
};

type Props = OwnProps & StateProps;

export class TagInput extends Component<Props> {
  inputField?: RefObject<HTMLDivElement> | null;
  inputObserver?: MutationObserver;

  static displayName = 'TagInput';
  caretPosition = 0;

  static defaultProps = {
    inputRef: identity,
    onChange: identity,
    onSelect: identity,
    storeFocusInput: noop,
    storeHasFocus: noop,
  };

  state = {
    isComposing: false,
  };

  componentDidMount() {
    this.props.storeFocusInput(this.focusInput);
    this.props.storeHasFocus(this.hasFocus);

    // Necessary for IE11 support, because contenteditable elements
    // do not fire input or change events in IE11.
    this.inputObserver = new MutationObserver(this.onInputMutation);
    this.inputObserver.observe(this.inputField, {
      characterData: true,
      childList: true,
      subtree: true,
    });
  }

  componentWillUnmount() {
    invoke(
      this,
      'inputField.removeEventListener',
      'paste',
      this.parsePastedInput,
      false
    );
    this.inputObserver.disconnect();
  }

  completeSuggestion = (andThen: (...args: any[]) => any = identity) => {
    const { onChange, note, tags, value } = this.props;

    if (!value.length) {
      return;
    }

    let suggestion: string | null = null;
    for (const tag of tags.values()) {
      if (note.tags.includes(tag.name) || !tag.name.startsWith(value)) {
        continue;
      }

      suggestion = tag.name;
      break;
    }

    if (suggestion) {
      onChange(suggestion, () => {
        andThen(suggestion);
        this.caretPosition = suggestion?.length || 0;
        this.focusInput();
      });
    }
  };

  focusInput = () => {
    if (!this.inputField) {
      return;
    }

    const input = this.inputField;

    input.focus();
    const range = document.createRange();
    range.selectNodeContents(input);
    // If the cached caret position is still reachable, restore that position
    if (
      input.firstChild !== null &&
      range.toString().length > this.caretPosition
    ) {
      range.setEnd(input.firstChild, this.caretPosition);
    }
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  hasFocus = () => document.activeElement === this.inputField;

  interceptKeys = (event: KeyboardEvent) =>
    invoke(
      {
        [KEY_ENTER]: this.submitTag,
        [KEY_SPACE]: this.submitTag,
        [KEY_COMMA]: this.submitTag,
        [KEY_TAB]: this.interceptTabPress,
        [KEY_RIGHT]: this.interceptRightArrow,
      },
      event.keyCode,
      event
    );

  interceptRightArrow = (event: KeyboardEvent) => {
    const { value } = this.props;
    // if we aren't already at the right-most extreme
    // then don't complete the suggestion; we could
    // be moving the cursor around inside the input
    if (getCaretPosition(event.currentTarget) !== value.length) {
      return;
    }

    this.completeSuggestion();

    event.preventDefault();
    event.stopPropagation();
  };

  interceptTabPress = (event: KeyboardEvent) => {
    this.completeSuggestion(this.submitTag);

    event.preventDefault();
    event.stopPropagation();
  };

  onInputMutation = (mutationList: MutationRecord[]) => {
    mutationList.forEach((mutation) => {
      let value = get(mutation, 'target.data', '');

      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        value = get(mutation, 'target.innerText', '');
      }

      this.onInput(value);
    });
  };

  onInput = (value: string, { moveCaretToEndOfValue = false } = {}) => {
    if (this.state.isComposing) {
      return;
    }

    this.caretPosition = moveCaretToEndOfValue
      ? value.length
      : getCaretPosition(this.inputField);
    this.props.onChange(value.trim(), this.focusInput);
  };

  onCompositionEnd = (e: CompositionEvent) => {
    const value = e.target.textContent;
    this.setState({ isComposing: false }, () => this.onInput(value));
  };

  parsePastedInput = (event: ClipboardEvent) => {
    let clipboardText;

    // Remove pasted formatting
    if (get(event, 'clipboardData.getData')) {
      clipboardText = event.clipboardData.getData('text/plain');
    } else if (get(window, 'clipboardData.getData')) {
      clipboardText = window.clipboardData.getData('Text'); // IE11
    }

    // Convert spaces/commans to submitted tags
    const tags = clipboardText.split(/\s|,|\n/);
    const submittedTags = tags.slice(0, tags.length - 1);
    const [pendingTag] = tags.slice(tags.length - 1);
    submittedTags.filter(Boolean).forEach(this.props.onSelect);
    this.onInput(pendingTag, { moveCaretToEndOfValue: true });

    event.preventDefault();
    event.stopPropagation();
  };

  storeInput = (ref: RefObject<HTMLDivElement> | null) => {
    this.inputField = ref;
    this.props.inputRef(ref);
    invoke(
      this,
      'inputField.addEventListener',
      'paste',
      this.parsePastedInput,
      false
    );
  };

  submitTag = (event?: KeyboardEvent) => {
    const { onSelect, value } = this.props;

    value.trim().length && onSelect(value.trim());

    // safe invoke since event could be empty
    invoke(event, 'preventDefault');
    invoke(event, 'stopPropagation');
  };

  render() {
    const { note, tags, value } = this.props;

    let suggestion: string | null = null;
    if (value.length > 0) {
      for (const tag of tags.values()) {
        if (note.tags.includes(tag.name) || !tag.name.startsWith(value)) {
          continue;
        }

        suggestion = tag.name;
        break;
      }
    }

    const shouldShowPlaceholder = value === '' && !this.state.isComposing;

    return (
      <div
        className="tag-input"
        onClick={() => {
          this.caretPosition = getCaretPosition(this.inputField);
          this.focusInput();
        }}
      >
        {shouldShowPlaceholder && (
          <span
            aria-hidden
            className="tag-input__placeholder theme-color-fg-dim"
          >
            Add tag…
          </span>
        )}
        <div
          aria-label="Add tag…"
          ref={this.storeInput}
          className="tag-input__entry"
          contentEditable="true"
          onBlur={this.submitTag}
          onCompositionStart={() => this.setState({ isComposing: true })}
          onCompositionEnd={this.onCompositionEnd}
          onKeyDown={this.interceptKeys}
          spellCheck={false}
          suppressContentEditableWarning
        >
          {value}
        </div>
        <div className="tag-input__suggestion" disabled type="text">
          {suggestion ? suggestion.substring(value.length) : ''}
        </div>
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  note: state.data.notes.get(state.ui.openedNote),
  tags: state.data.tags,
});

export default connect(mapStateToProps)(TagInput);
