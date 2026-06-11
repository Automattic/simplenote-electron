import { $createLinkNode, $isLinkNode } from '@lexical/link';
import { $isCodeNode } from '@lexical/code-core';
import {
  $createTextNode,
  $findMatchingParent,
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  isDOMNode,
  type LexicalEditor,
} from 'lexical';

import { searchNotes, tagsFromSearch } from '../search';
import { getTerms } from '../utils/filter-notes';
import { noteTitleAndPreview } from '../utils/note-utils';

import type * as T from '../types';

const SIMPLENOTE_NOTE_URL = /^simplenote:\/\/note\/([a-zA-Z0-9-]+)$/;

// Caret is inside `(...` of `[text](...` — group 1 is the link text,
// group 2 the partial URL typed so far. `!` excludes image syntax.
const PAREN_MODE = /(?<!!)\[([^\]]+)\]\(([^)]*)$/;

export type LinkCompletionMatch = {
  // Search query for finding notes to link.
  query: string;
  // Characters before the caret to replace, starting at the `[`.
  length: number;
  // Link text typed by the user.
  linkText: string;
};

export type LinkableNote = {
  noteId: T.EntityId;
  title: string;
  isPinned: boolean;
};

export function noteIdFromUrl(url: string): T.EntityId | null {
  const match = SIMPLENOTE_NOTE_URL.exec(url);
  return match ? (match[1] as T.EntityId) : null;
}

export function getLinkCompletionMatch(
  textBeforeCaret: string
): LinkCompletionMatch | null {
  const paren = PAREN_MODE.exec(textBeforeCaret);
  if (!paren) {
    return null;
  }

  // Once the URL position looks like a real URL, stop suggesting.
  if (/[:/]/.test(paren[2])) {
    return null;
  }

  return {
    query: paren[2],
    length: paren[0].length,
    linkText: paren[1],
  };
}

export function findLinkableNotes(
  query: string,
  excludeNoteId: T.EntityId | null,
  limit = 5
): LinkableNote[] {
  return searchNotes(
    {
      collection: { type: 'all' },
      excludeIDs: excludeNoteId ? [excludeNoteId] : [],
      searchTags: tagsFromSearch(query),
      searchTerms: getTerms(query),
      titleOnly: true,
    },
    limit
  )
    .filter((entry): entry is [T.EntityId, T.Note] => entry[1] !== undefined)
    .map(([noteId, note]) => ({
      noteId,
      title: noteTitleAndPreview(note).title,
      isPinned: note.systemTags.includes('pinned'),
    }));
}

/**
 * Returns the completion match at the caret, or null when the selection
 * isn't a collapsed text caret eligible for link completion.
 */
export function $getSelectionCompletionMatch(): LinkCompletionMatch | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const { anchor } = selection;
  if (anchor.type !== 'text') {
    return null;
  }

  const node = anchor.getNode();
  if (!$isTextNode(node) || node.hasFormat('code')) {
    return null;
  }

  const parent = node.getParent();
  if ($isCodeNode(parent) || $isLinkNode(parent)) {
    return null;
  }

  return getLinkCompletionMatch(node.getTextContent().slice(0, anchor.offset));
}

/**
 * Replaces the completion match before the caret with a LinkNode pointing
 * at the given note. Must run inside editor.update().
 */
export function $insertInternalLink(note: { noteId: T.EntityId }): boolean {
  const match = $getSelectionCompletionMatch();
  if (!match) {
    return false;
  }

  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const { anchor } = selection;
  // Extend the selection backwards over the match, then replace it.
  selection.anchor.set(
    anchor.getNode().getKey(),
    anchor.offset - match.length,
    'text'
  );

  const link = $createLinkNode(`simplenote://note/${note.noteId}`);
  link.append($createTextNode(match.linkText));
  selection.insertNodes([link]);
  return true;
}

/**
 * Opens internal `simplenote://note/…` links on click. The rendered DOM
 * href is `about:blank` (Lexical sanitizes unknown protocols), so the URL
 * is read from the LinkNode itself.
 */
export function registerInternalLinkClick(
  editor: LexicalEditor,
  onOpenNote: (noteId: T.EntityId) => void
): () => void {
  const onClick = (event: MouseEvent) => {
    const url = editor.read(() => {
      if (!isDOMNode(event.target)) {
        return null;
      }
      const node = $getNearestNodeFromDOMNode(event.target);
      const link = node && $findMatchingParent(node, $isLinkNode);
      return link ? link.getURL() : null;
    });

    const noteId = url === null ? null : noteIdFromUrl(url);
    if (!noteId) {
      return;
    }

    event.preventDefault();
    onOpenNote(noteId);
  };

  return editor.registerRootListener((root, prevRoot) => {
    prevRoot?.removeEventListener('click', onClick);
    root?.addEventListener('click', onClick);
  });
}
