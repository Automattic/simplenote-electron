import React, {
  Component,
  CompositionEvent,
  KeyboardEvent,
  forwardRef,
} from 'react';

import * as T from '../types';

const startsWith = (prefix: string) => (text: string): boolean =>
  text
    .trim()
    .toLowerCase()
    .startsWith(prefix.trim().toLowerCase());

type OwnProps = {
  inputRef: React.RefObject<HTMLDivElement>;
  onChange: (tagName: string, callback: () => any) => any;
  onSelect: (tagName: string) => any;
  tagNames: T.TagName[];
  value: string;
};

type Props = OwnProps;

type OwnState = {
  isComposing: boolean;
};

export class TagInput extends Component<Props, OwnState> {
  inputObserver?: MutationObserver;

  static displayName = 'TagInput';

  state = {
    isComposing: false,
  };

  componentDidMount() {
    const { inputRef } = this.props;

    inputRef.current!.addEventListener(
      'paste',
      this.removePastedFormatting,
      false
    );

    // Necessary for IE11 support, because contenteditable elements
    // do not fire input or change events in IE11.
    this.inputObserver = new MutationObserver(this.onInputMutation);
    this.inputObserver.observe(inputRef.current!, {
      characterData: true,
      childList: true,
      subtree: true,
    });
  }

  componentWillUnmount() {
    this.props.inputRef.current?.removeEventListener(
      'paste',
      this.removePastedFormatting,
      false
    );
    this.inputObserver!.disconnect();
  }

  completeSuggestion = (andThen?: Function) => {
    const { onChange, tagNames, value } = this.props;

    if (!value.length) {
      return;
    }

    const suggestion = tagNames.find(startsWith(value));

    if (suggestion) {
      onChange(suggestion, () => {
        andThen?.(suggestion);
        this.focusInput();
      });
    }
  };

  focusInput = () => {
    const { inputRef } = this.props;

    if (!inputRef.current) {
      return;
    }

    inputRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(inputRef.current);
    range.collapse(false);
    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(range);
  };

  interceptKeys = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case 'Comma':
        return this.submitTag(event);

      case 'Tab':
        return this.interceptTabPress(event);

      case 'ArrowRight':
        return this.interceptRightArrow(event);
    }
  };

  interceptRightArrow = (event: KeyboardEvent) => {
    const { value } = this.props;

    // if we aren't already at the right-most extreme
    // then don't complete the suggestion; we could
    // be moving the cursor around inside the input
    const caretPosition = window.getSelection()?.getRangeAt(0).endOffset;
    if (caretPosition !== value.length) {
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
    mutationList.forEach(mutation => {
      const isNodeList =
        mutation.type === 'childList' && mutation.addedNodes.length;

      const value = isNodeList
        ? (mutation.target as Node).innerText
        : (mutation.target as CharacterData).data;

      this.onInput(value || '');
    });
  };

  onInput = (value: string) => {
    if (this.state.isComposing) {
      return;
    }

    this.props.onChange(value.trim(), this.focusInput);
  };

  onCompositionEnd = (e: CompositionEvent) => {
    const value = e.target.textContent;
    this.setState({ isComposing: false }, () => this.onInput(value));
  };

  removePastedFormatting = (event: ClipboardEvent) => {
    const clipboardText =
      event.clipboardData?.getData('text/plain') ??
      window.clipboardData?.getData?.('Text');

    this.onInput(clipboardText);

    event.preventDefault();
    event.stopPropagation();
  };

  submitTag = (event?: KeyboardEvent) => {
    const { onSelect, value } = this.props;

    value.trim().length && onSelect(value.trim());

    // safe invoke since event could be empty
    event?.preventDefault();
    event?.stopPropagation();
  };

  render() {
    const { value, tagNames } = this.props;

    const suggestion = value.length && tagNames.find(startsWith(value));
    const shouldShowPlaceholder = value === '' && !this.state.isComposing;

    return (
      <div className="tag-input" onClick={this.focusInput}>
        {shouldShowPlaceholder && (
          <span aria-hidden className="tag-input__placeholder">
            Add a tag…
          </span>
        )}
        <div
          aria-label="Add a tag…"
          ref={this.props.inputRef}
          className="tag-input__entry"
          contentEditable="true"
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

export default forwardRef<HTMLDivElement, Props>((props, ref) => (
  <TagInput inputRef={ref} {...props} />
));
