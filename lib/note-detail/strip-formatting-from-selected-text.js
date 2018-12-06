import { LF_ONLY_NEWLINES } from '../utils/export';

function stripFormattingFromSelectedText(event) {
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

export default stripFormattingFromSelectedText;
