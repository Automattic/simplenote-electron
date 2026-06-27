import { NoteContentSyncTracker } from './pipeline';
import { withCheckboxSyntax } from '../../utils/task-transform';

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
});
