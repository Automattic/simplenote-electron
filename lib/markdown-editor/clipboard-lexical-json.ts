/** Prepended to Lexical JSON so VS Code/Cursor ignore valid editor payloads on paste. */
export const LEXICAL_CLIPBOARD_JSON_PREFIX = 'PREFIX';

/** Minimal shape Lexical expects from clipboard JSON node arrays. */
export type SerializedLexicalClipboardNode = {
  type: string;
  version: number;
  children?: SerializedLexicalClipboardNode[];
};

export type NamespacedLexicalClipboardPayload = {
  namespace: string;
  nodes: SerializedLexicalClipboardNode[];
};

export const stripLexicalClipboardJsonPrefix = (data: string): string =>
  data.startsWith(LEXICAL_CLIPBOARD_JSON_PREFIX)
    ? data.slice(LEXICAL_CLIPBOARD_JSON_PREFIX.length)
    : data;

export const wrapLexicalClipboardJsonPrefix = (json: string): string =>
  `${LEXICAL_CLIPBOARD_JSON_PREFIX}${json}`;

const isSerializedLexicalClipboardNode = (
  value: unknown
): value is SerializedLexicalClipboardNode => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const node = value as Record<string, unknown>;
  if (typeof node.type !== 'string' || typeof node.version !== 'number') {
    return false;
  }

  if (node.children === undefined) {
    return true;
  }

  return (
    Array.isArray(node.children) &&
    node.children.every(isSerializedLexicalClipboardNode)
  );
};

const parseSerializedLexicalClipboardNodes = (
  value: unknown
): SerializedLexicalClipboardNode[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  if (!value.every(isSerializedLexicalClipboardNode)) {
    return null;
  }

  return value;
};

export const parseNamespacedLexicalClipboardJson = (
  data: string,
  namespace: string
): NamespacedLexicalClipboardPayload | null => {
  try {
    const payload = JSON.parse(stripLexicalClipboardJsonPrefix(data));
    if (!payload || typeof payload.namespace !== 'string') {
      return null;
    }

    if (payload.namespace !== namespace) {
      return null;
    }

    const nodes = parseSerializedLexicalClipboardNodes(payload.nodes);
    if (!nodes) {
      return null;
    }

    return { namespace: payload.namespace, nodes };
  } catch {
    return null;
  }
};
