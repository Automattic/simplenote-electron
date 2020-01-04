import { noop } from 'lodash';
import appState from './app-state';

jest.mock('../utils/filter-notes', () => {
  return (state, newNotes) => newNotes;
});

describe('appState action creators', () => {
  describe('loadPreferences', () => {
    const { loadPreferences } = appState.actionCreators;
    let preferencesBucket, preferences, dispatch;

    beforeEach(() => {
      dispatch = noop;
      preferences = {
        data: { analytics_enabled: 0 },
      };
      preferencesBucket = {
        get: (key, callback) => {
          callback(null, preferences);
        },
        update: jest.fn(),
      };
    });

    // Necessary for legacy compatibility with the iOS version
    it('should cast 0/1 values for analytics_enabled to boolean', () => {
      loadPreferences({ preferencesBucket })(dispatch);
      expect(global.analyticsEnabled).toStrictEqual(false);
      preferences.data.analytics_enabled = 1;
      loadPreferences({ preferencesBucket })(dispatch);
      expect(global.analyticsEnabled).toStrictEqual(true);
    });

    it('should create a empty preferences object if necessary', () => {
      preferences = undefined;
      loadPreferences({ preferencesBucket })(dispatch);
      expect(preferencesBucket.update).toHaveBeenCalledWith(
        'preferences-key',
        {}
      );
    });
  });
});

describe('appState action reducers', () => {
  describe('notesLoaded', () => {
    const notesLoaded = appState.actionReducers['App.notesLoaded'];

    describe('when a note is currently selected', () => {
      it('should load the newest version of the selected note', () => {
        const oldState = {
          notes: [{}],
          note: { id: 'foo', data: { content: 'old', systemTags: [] } },
        };
        const newNote = { id: 'foo', data: { content: 'new', systemTags: [] } };
        const newNoteArray = [newNote];
        const newState = notesLoaded(oldState, {
          notes: newNoteArray,
        });
        expect(newState.notes).toEqual(newNoteArray);
        expect(newState.note).toEqual(newNote);
      });
    });

    describe('when no note is currently selected', () => {
      it('should load the first filtered note if there is no valid previousIndex', () => {
        const oldState = {
          notes: [],
          note: null,
          previousIndex: -1,
        };
        const firstNote = {
          id: 'foo',
          data: { content: 'first', systemTags: [] },
        };
        const newNoteArray = [
          firstNote,
          { id: 'bar', data: { content: 'boo', systemTags: [] } },
        ];
        const newState = notesLoaded(oldState, {
          notes: newNoteArray,
        });
        expect(newState.notes).toEqual(newNoteArray);
        expect(newState.note).toEqual(firstNote);
      });

      it('should load the previousIndex note if there is a previousIndex', () => {
        const oldState = {
          notes: [],
          note: null,
          previousIndex: 1,
        };
        const previousIndexNote = {
          id: 'foo',
          data: { content: 'previous', systemTags: [] },
        };
        const newNoteArray = [
          { id: 'bar', data: { content: 'boo', systemTags: [] } },
          previousIndexNote,
        ];
        const newState = notesLoaded(oldState, {
          notes: newNoteArray,
        });
        expect(newState.notes).toEqual(newNoteArray);
        expect(newState.note).toEqual(previousIndexNote);
      });
    });
  });
});
