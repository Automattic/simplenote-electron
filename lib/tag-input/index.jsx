import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { identity, invoke, noop } from 'lodash';

const KEY_TAB = 9;
const KEY_ENTER = 13;
const KEY_RIGHT = 39;

const startsWith = prefix => text =>
  text
    .trim()
    .toLowerCase()
    .startsWith(prefix.trim().toLowerCase());

export class TagInput extends Component {
  static displayName = 'TagInput';

  static propTypes = {
    inputRef: PropTypes.func,
    onChange: PropTypes.func,
    onSelect: PropTypes.func,
    storeFocusInput: PropTypes.func,
    storeHasFocus: PropTypes.func,
    tagNames: PropTypes.arrayOf(PropTypes.string).isRequired,
    value: PropTypes.string.isRequired,
  };

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
  }

  componentWillUnmount() {
    invoke(
      this,
      'inputField.removeEventListener',
      'paste',
      this.removePastedFormatting,
      false
    );
  }

  completeSuggestion = (andThen = identity) => {
    const { onChange, tagNames, value } = this.props;

    if (!value.length) {
      return;
    }

    const suggestion = tagNames.find(startsWith(value));

    if (suggestion) {
      onChange(suggestion, () => {
        andThen(suggestion);
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
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  hasFocus = () => document.activeElement === this.inputField;

  interceptKeys = event =>
    invoke(
      {
        [KEY_ENTER]: this.submitTag,
        [KEY_TAB]: this.interceptTabPress,
        [KEY_RIGHT]: this.interceptRightArrow,
      },
      event.keyCode,
      event
    );

  interceptRightArrow = event => {
    const { value } = this.props;

    // if we aren't already at the right-most extreme
    // then don't complete the suggestion; we could
    // be moving the cursor around inside the input
    const caretPosition = window.getSelection().getRangeAt(0).endOffset;
    if (caretPosition !== value.length) {
      return;
    }

    this.completeSuggestion();

    event.preventDefault();
    event.stopPropagation();
  };

  interceptTabPress = event => {
    this.completeSuggestion(this.submitTag);

    event.preventDefault();
    event.stopPropagation();
  };

  onChange = ({ target: { textContent: value } }) => {
    if (this.state.isComposing) {
      return;
    }

    value.endsWith(',') && value.trim().length // commas should automatically insert non-zero tags
      ? this.props.onSelect(value.slice(0, -1).trim())
      : this.props.onChange(value.trim(), this.focusInput);
  };

  onCompositionEnd = () => {
    this.setState({ isComposing: false }, () =>
      this.onChange({ target: { textContent: this.inputField.textContent } })
    );
  };

  removePastedFormatting = event => {
    document.execCommand(
      'insertText',
      false, // don't show default UI - see execCommand docs for explanation
      event.clipboardData.getData('text/plain')
    );

    event.preventDefault();
    event.stopPropagation();
  };

  storeInput = ref => {
    this.inputField = ref;
    this.props.inputRef(ref);
    invoke(
      this,
      'inputField.addEventListener',
      'paste',
      this.removePastedFormatting,
      false
    );
  };

  submitTag = event => {
    const { onSelect, value } = this.props;

    value.trim().length && onSelect(value.trim());

    // safe invoke since event could be empty
    invoke(event, 'preventDefault');
    invoke(event, 'stopPropagation');
  };

  render() {
    const { value, tagNames } = this.props;

    const suggestion = value.length && tagNames.find(startsWith(value));

    return (
      <div className="tag-input" onClick={this.focusInput}>
        <div
          ref={this.storeInput}
          className="tag-input__entry"
          contentEditable="true"
          onCompositionStart={() => this.setState({ isComposing: true })}
          onCompositionEnd={this.onCompositionEnd}
          onInput={this.onChange}
          onKeyDown={this.interceptKeys}
          placeholder="Add a tag…"
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

export default TagInput;
