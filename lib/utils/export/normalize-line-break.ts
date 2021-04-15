/**
 * Normalize line break characters to CRLF
 * @param content string Content to normalize
 */
const normalizeLineBreak = (content: string) =>
  content.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');

export default normalizeLineBreak;
