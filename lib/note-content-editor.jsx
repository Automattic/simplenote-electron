import React, { Component, PropTypes } from 'react';
import { includes, noop } from 'lodash';

import { LF_ONLY_NEWLINES } from './utils/export';

const addListBullet = (content, { selectionStart, selectionEnd }) => {
  if (selectionStart !== selectionEnd) {
    return content;
  }

  if (selectionStart === 0) {
    return content;
  }

  const prevNewline = content.lastIndexOf('\n', selectionStart - 1);
  const lineStart = Math.max(0, prevNewline + 1);

  const linePrefix = content.slice(lineStart, selectionStart);
  const trimmed = linePrefix.trim();

  const nextNewline = content.indexOf('\n', selectionStart);
  const lineEnd = nextNewline === -1 ? content.length : nextNewline;

  if (selectionStart < lineEnd) {
    return content;
  }

  if (trimmed === '-' || trimmed === '+' || trimmed === '*') {
    const before = content.slice(0, prevNewline);
    const after = content.slice(selectionStart);

    return before + '\n\n' + after;
  }

  const bulletMatch = linePrefix.match(/^(\s*[-+*]\s)/);
  if (selectionStart && bulletMatch) {
    const [, /* full match */ bullet] = bulletMatch;
    const before = content.slice(0, selectionStart);
    const after = content.slice(selectionStart);

    return before + '\n' + bullet + after;
  }

  return content;
};

const indentSelection = (content, { selectionStart, selectionEnd }) => {
  if (selectionStart === 0) {
    return ['\t' + content, 1, 1];
  }

  const startOffset =
    selectionStart !== selectionEnd && content[selectionStart] === '\n'
      ? selectionStart - 1
      : selectionStart;

  const prevNewline = content.lastIndexOf('\n', startOffset - 1);
  if (prevNewline === -1) {
    const before = content.slice(0, startOffset);
    const after = content.slice(startOffset);

    return [before + '\t' + after, 1, 1];
  }

  const linePrefix = content.slice(prevNewline, startOffset);

  if (selectionStart === selectionEnd) {
    const atStart = /^\s*(?:[-+*]\s*)?$/.test(linePrefix);

    if (atStart) {
      const before = content.slice(0, prevNewline + 1);
      const after = content.slice(prevNewline + 1);

      return [before + '\t' + after, 1, 1];
    } else {
      const before = content.slice(0, startOffset);
      const after = content.slice(startOffset);

      return [before + ' ' + after, 1, 1];
    }
  }

  const nextNewline = content.indexOf('\n', selectionEnd);
  const selection =
    nextNewline === -1
      ? content.slice(prevNewline + 1)
      : content.slice(prevNewline + 1, nextNewline);

  if (-1 === selection.indexOf('\n')) {
    const before = content.slice(0, selectionStart);
    const after = content.slice(selectionEnd);

    return [before + ' ' + after, 1, 1 + selectionStart - selectionEnd];
  }

  const before = content.slice(0, prevNewline);
  const after =
    nextNewline === -1
      ? content.slice(selectionEnd)
      : content.slice(nextNewline);

  const transformed =
    before + '\n\t' + selection.replace(/\n/g, '\n\t') + after;
  const delta = transformed.length - content.length;

  return [transformed, delta, delta];
};

const outdentSelection = (content, { selectionStart, selectionEnd }) => {
  const startOffset =
    content[selectionStart] === '\n' ? selectionStart - 1 : selectionStart;

  const prevNewline = content.lastIndexOf('\n', startOffset);
  const lineStart = Math.max(0, prevNewline);
  const firstChar = lineStart === 0 ? content[0] : content[lineStart + 1];

  if (selectionStart === selectionEnd && '\t' !== firstChar) {
    return [content, 0, 0];
  }

  const nextNewline = content.indexOf('\n', selectionEnd);
  const lineEnd = nextNewline === -1 ? content.length : nextNewline;

  const selection = content.slice(lineStart, lineEnd);
  const before = content.slice(0, lineStart);
  const after = content.slice(lineEnd);

  const transformed =
    before + selection.replace(/^\t/, '').replace(/\n\t/g, '\n') + after;
  const delta = transformed.length - content.length;

  return [transformed, delta, delta];
};

export default class NoteContentEditor extends Component {
  static propTypes = {
    content: PropTypes.string.isRequired,
    onChangeContent: PropTypes.func.isRequired,
    storeFocusEditor: PropTypes.func,
    storeHasFocus: PropTypes.func,
  };

  static defaultProps = {
    storeFocusEditor: noop,
    storeHasFocus: noop,
  };

  constructor(props) {
    super(props);

    this.state = { content: props.content };
  }

  componentDidMount() {
    this.props.storeFocusEditor(this.focus);
    this.props.storeHasFocus(this.hasFocus);

    if (this.props.content) {
      this.setState({ content: this.props.content });
    }

    document.addEventListener('copy', this.stripFormattingFromSelectedText);
    document.addEventListener('cut', this.stripFormattingFromSelectedText);
  }

  componentWillReceiveProps({ content }) {
    this.setState({ content });
  }

  componentWillUnmount() {
    document.removeEventListener('copy', this.stripFormattingFromSelectedText);
    document.removeEventListener('cut', this.stripFormattingFromSelectedText);
  }

  stripFormattingFromSelectedText(event) {
    if (
      event.path.filter(elem =>
        includes(elem.className, 'note-detail-textarea')
      ).length
    ) {
      const selectedText = window.getSelection().toString();
      // Replace \n with \r\n to keep line breaks on Windows
      event.clipboardData.setData(
        'text/plain',
        selectedText.replace(LF_ONLY_NEWLINES, '\r\n')
      );
      event.clipboardData.setData(
        'text/html',
        selectedText.replace(/(?:\r\n|\r|\n)/g, '<br />')
      );

      event.preventDefault();
    }
  }

  saveInput = ref => (this.input = ref);

  handleEnter = event => {
    const content = this.state.content;
    const { selectionStart, selectionEnd } = this.input;

    const transformed = addListBullet(content, {
      selectionStart,
      selectionEnd,
    });

    if (transformed === content) {
      return true;
    }

    event.stopPropagation();
    event.preventDefault();
    this.setState({ content: transformed }, () => {
      const delta = transformed.length - content.length;
      const index = selectionStart + delta;

      this.input.setSelectionRange(index, index);
    });
    return false;
  };

  handleTab = event => {
    const content = this.state.content;
    const { selectionStart, selectionEnd } = this.input;

    event.stopPropagation();
    event.preventDefault();

    const [transformed, deltaStart, deltaEnd] = event.shiftKey
      ? outdentSelection(content, { selectionStart, selectionEnd })
      : indentSelection(content, { selectionStart, selectionEnd });

    if (transformed === content) {
      this.setState({ content });
      return false;
    }

    this.setState({ content: transformed }, () =>
      this.input.setSelectionRange(
        selectionStart + deltaStart,
        selectionEnd + deltaEnd
      )
    );

    return false;
  };

  handleKeyPress = event => {
    const { keyCode } = event;

    if (9 === keyCode) {
      return this.handleTab(event);
    }

    if (13 === keyCode) {
      return this.handleEnter(event);
    }

    return true;
  };

  // problematic since we don't get the corresponding updates for three seconds
  changeContent = ({ target: { value } }) => this.props.onChangeContent(value);

  render() {
    return (
      <textarea
        ref={this.saveInput}
        style={{
          height: '100%',
          width: '100%',
        }}
        value={this.state.content}
        onChange={this.changeContent}
        onKeyDown={this.handleKeyPress}
      />
    );
  }
}
