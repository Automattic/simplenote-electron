import {
  SKIP_DOM_SELECTION_TAG,
  SKIP_SCROLL_INTO_VIEW_TAG,
  CLEAR_HISTORY_COMMAND,
  type LexicalEditor,
} from 'lexical';

import { $exportMarkdownString, $importRemoteMarkdown } from './import-export';
import { REMOTE_CONTENT_TAG } from './on-change';
import { restoreScrollPosition } from '../memory/scroll-memory';
import { withCheckboxSyntax } from '../../utils/task-transform';

export type RemoteUpdateDecision =
  | 'skip-dispatched'
  | 'skip-pushed'
  | 'skip-local-export'
  | 'apply';

export class NoteContentSyncTracker {
  private lastPushed = '';
  private lastDispatched: string | null = null;
  private lastLocalExport = '';

  resetForNote(content: string): void {
    const normalized = withCheckboxSyntax(content);
    this.lastPushed = normalized;
    this.lastLocalExport = normalized;
    this.lastDispatched = null;
  }

  shouldSkipRemoteUpdate(
    rawNoteContent: string,
    remote: string
  ): RemoteUpdateDecision {
    if (rawNoteContent === this.lastDispatched) {
      return 'skip-dispatched';
    }
    if (remote === this.lastPushed) {
      return 'skip-pushed';
    }
    if (remote === this.lastLocalExport) {
      return 'skip-local-export';
    }
    return 'apply';
  }

  recordRemoteLocalExportMatch(remote: string): void {
    this.lastPushed = remote;
  }

  recordRemoteApplied(remote: string): void {
    this.lastPushed = remote;
    this.lastLocalExport = remote;
  }

  shouldSkipLocalChange(content: string): boolean {
    return content === this.lastPushed;
  }

  recordLocalDispatch(content: string): void {
    this.lastPushed = content;
    this.lastDispatched = content;
    this.lastLocalExport = content;
  }
}

export function applyRemoteMarkdownUpdate(
  editor: LexicalEditor | null,
  rawNoteContent: string,
  tracker: NoteContentSyncTracker,
  options: {
    editorFocused: boolean;
    scrollShell: HTMLElement | null;
    scrollTop: number;
    isCancelled: () => boolean;
  }
): () => void {
  const remote = withCheckboxSyntax(rawNoteContent);
  const decision = tracker.shouldSkipRemoteUpdate(rawNoteContent, remote);

  if (decision === 'skip-dispatched' || decision === 'skip-pushed') {
    return () => {};
  }

  if (decision === 'skip-local-export') {
    tracker.recordRemoteLocalExportMatch(remote);
    return () => {};
  }

  if (!editor) {
    return () => {};
  }

  const { editorFocused, scrollShell, scrollTop, isCancelled } = options;
  let cancelRestore: (() => void) | undefined;

  queueMicrotask(() => {
    if (isCancelled()) {
      return;
    }

    editor.update(
      () => {
        const local = $exportMarkdownString();
        if (remote === local) {
          return;
        }

        $importRemoteMarkdown(remote, local, {
          preserveSelection: editorFocused,
        });
      },
      {
        discrete: true,
        tag: editorFocused
          ? [REMOTE_CONTENT_TAG, SKIP_SCROLL_INTO_VIEW_TAG]
          : [REMOTE_CONTENT_TAG, SKIP_DOM_SELECTION_TAG],
        onUpdate: () => {
          if (scrollShell) {
            cancelRestore = restoreScrollPosition(scrollShell, scrollTop);
          }
          tracker.recordRemoteApplied(remote);
          editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
        },
      }
    );
  });

  return () => {
    cancelRestore?.();
  };
}
