import { $exportMarkdownString } from '../extensions/index';
import { withCheckboxSyntax } from '../../utils/task-transform';
import { importMarkdown, makeGfmTestEditor } from './gfm-test-helpers';
import { applyRemoteMarkdownUpdate, NoteContentSyncTracker } from './pipeline';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('NoteContentSyncTracker', () => {
  it('resetForNote normalizes pushed/local export and clears dispatched', () => {
    const tracker = new NoteContentSyncTracker();
    tracker.recordLocalDispatch('hello');
    tracker.resetForNote('- [ ] task');

    expect(
      tracker.shouldSkipRemoteUpdate(
        '- [ ] task',
        withCheckboxSyntax('- [ ] task')
      )
    ).toBe('skip-pushed');
    expect(
      tracker.shouldSkipRemoteUpdate('other', withCheckboxSyntax('other'))
    ).toBe('apply');
  });

  it('skips remote update when content matches last dispatch echo', () => {
    const tracker = new NoteContentSyncTracker();
    tracker.resetForNote('hello');
    tracker.recordLocalDispatch('hello world');

    expect(
      tracker.shouldSkipRemoteUpdate(
        'hello world',
        withCheckboxSyntax('hello world')
      )
    ).toBe('skip-dispatched');
  });

  it('skips remote update when remote matches last pushed', () => {
    const tracker = new NoteContentSyncTracker();
    tracker.resetForNote('hello');

    expect(
      tracker.shouldSkipRemoteUpdate('hello', withCheckboxSyntax('hello'))
    ).toBe('skip-pushed');
  });

  it('detects local-export match without applying import', () => {
    const tracker = new NoteContentSyncTracker();
    tracker.resetForNote('alpha');
    tracker.recordLocalDispatch('alpha beta');
    tracker.recordRemoteLocalExportMatch('out of sync');

    const remote = withCheckboxSyntax('alpha beta');
    expect(tracker.shouldSkipRemoteUpdate('store content', remote)).toBe(
      'skip-local-export'
    );

    tracker.recordRemoteLocalExportMatch(remote);
    expect(tracker.shouldSkipRemoteUpdate('store content', remote)).toBe(
      'skip-pushed'
    );
  });

  it('recordLocalDispatch updates all refs with raw export strings', () => {
    const tracker = new NoteContentSyncTracker();
    tracker.resetForNote('');
    tracker.recordLocalDispatch('raw export');

    expect(tracker.shouldSkipLocalChange('raw export')).toBe(true);
    expect(
      tracker.shouldSkipRemoteUpdate(
        'raw export',
        withCheckboxSyntax('raw export')
      )
    ).toBe('skip-dispatched');
  });

  it('skips local change when export matches recorded editor export but not stored bytes', () => {
    const tracker = new NoteContentSyncTracker();
    tracker.resetForNote('- test\n---\n- test');
    tracker.recordEditorExport('- test\n\n---\n\n- test');

    expect(tracker.shouldSkipLocalChange('- test\n---\n- test')).toBe(true);
    expect(tracker.shouldSkipLocalChange('- test\n\n---\n\n- test')).toBe(true);
    expect(tracker.shouldSkipLocalChange('- test\n\n---\n\n- test2')).toBe(
      false
    );
  });
});

describe('applyRemoteMarkdownUpdate', () => {
  it('records editor export on skip-pushed so canonical re-export does not sync', async () => {
    const compact = '- test\n---\n- test';
    const canonical = '- test\n\n---\n\n- test';
    const tracker = new NoteContentSyncTracker();
    tracker.resetForNote(compact);
    const editor = makeGfmTestEditor();
    importMarkdown(editor, compact);

    await new Promise<void>((resolve) => {
      applyRemoteMarkdownUpdate(editor, compact, tracker, {
        editorFocused: false,
        isCancelled: () => false,
        scrollShell: null,
        scrollTop: 0,
      });
      queueMicrotask(async () => {
        await flushMicrotasks();
        resolve();
      });
    });

    expect(tracker.shouldSkipLocalChange(canonical)).toBe(true);
    expect(tracker.shouldSkipLocalChange(compact)).toBe(true);

    editor.dispose();
  });

  it('records the applied remote so an identical follow-up update is skipped', async () => {
    const tracker = new NoteContentSyncTracker();
    tracker.resetForNote('hello');
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello');

    await new Promise<void>((resolve) => {
      applyRemoteMarkdownUpdate(editor, 'goodbye', tracker, {
        editorFocused: false,
        isCancelled: () => false,
        scrollShell: null,
        scrollTop: 0,
      });
      queueMicrotask(async () => {
        await flushMicrotasks();
        resolve();
      });
    });

    expect(editor.read(() => $exportMarkdownString())).toBe('goodbye');
    expect(
      tracker.shouldSkipRemoteUpdate(
        'store echo',
        withCheckboxSyntax('goodbye')
      )
    ).toBe('skip-pushed');

    editor.dispose();
  });
});
