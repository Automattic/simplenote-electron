import {
  getNextSlashCommandIndex,
  getSlashCommandKeyAction,
  getSlashCommandSuggestions,
  getSlashCommandTrigger,
  isSlashCommandPaletteShortcut,
} from './slash-commands';

describe('slash commands', () => {
  describe('getSlashCommandTrigger', () => {
    it('detects a slash command token at the cursor', () => {
      expect(getSlashCommandTrigger('Run /sh', 8)).toEqual({
        token: '/sh',
        query: 'sh',
        startColumn: 5,
        endColumn: 8,
      });
    });

    it('detects an empty slash command query', () => {
      expect(getSlashCommandTrigger('/', 2)).toEqual({
        token: '/',
        query: '',
        startColumn: 1,
        endColumn: 2,
      });
    });

    it('ignores slashes that are part of another token', () => {
      expect(getSlashCommandTrigger('https://simplenote.com', 9)).toBeNull();
      expect(getSlashCommandTrigger('hello/search', 13)).toBeNull();
    });

    it('stops matching once the user types whitespace', () => {
      expect(getSlashCommandTrigger('/search ', 9)).toBeNull();
    });

    it('only detects a slash command at the end of the token', () => {
      expect(getSlashCommandTrigger('/search', 3)).toBeNull();
    });

    it('ignores command queries with punctuation', () => {
      expect(getSlashCommandTrigger('/search?', 9)).toBeNull();
    });
  });

  describe('getSlashCommandSuggestions', () => {
    it('returns all commands for an empty query', () => {
      expect(
        getSlashCommandSuggestions('').map(({ command }) => command.id)
      ).toEqual([
        'new',
        'search',
        'all-notes',
        'untagged-notes',
        'trash',
        'settings',
        'shortcuts',
        'help',
        'about',
        'focus',
        'export',
      ]);
    });

    it('ranks exact aliases ahead of prefix matches', () => {
      const [first] = getSlashCommandSuggestions('s');

      expect(first.command.id).toBe('search');
      expect(first.completion).toBe('earch');
      expect(first.exactMatch).toBe(true);
    });

    it('returns ghost text for the best prefix match', () => {
      const [first] = getSlashCommandSuggestions('sh');

      expect(first.command.id).toBe('shortcuts');
      expect(first.completion).toBe('ortcuts');
      expect(first.exactMatch).toBe(false);
    });

    it('matches command aliases for settings and new notes', () => {
      expect(getSlashCommandSuggestions('pref')[0].command.id).toBe('settings');
      expect(getSlashCommandSuggestions('create')[0].command.id).toBe('new');
    });

    it('does not show ghost text for an exact command', () => {
      const [first] = getSlashCommandSuggestions('export');

      expect(first.command.id).toBe('export');
      expect(first.completion).toBe('');
      expect(first.exactMatch).toBe(true);
    });
  });

  describe('getNextSlashCommandIndex', () => {
    it('wraps forward through the available suggestions', () => {
      expect(getNextSlashCommandIndex(5, 4, 1)).toBe(0);
    });

    it('wraps backward through the available suggestions', () => {
      expect(getNextSlashCommandIndex(5, 0, -1)).toBe(4);
    });
  });

  describe('getSlashCommandKeyAction', () => {
    it.each([
      ['Tab', 'complete'],
      ['Enter', 'execute'],
      ['ArrowDown', 'next'],
      ['ArrowUp', 'previous'],
      ['Escape', 'cancel'],
      [' ', 'cancel-and-type'],
      ['Spacebar', 'cancel-and-type'],
    ])('maps %s to %s while slash commands are active', (key, action) => {
      expect(getSlashCommandKeyAction(key, false, true)).toBe(action);
    });

    it('does not intercept keys when slash commands are inactive', () => {
      expect(getSlashCommandKeyAction('Enter', false, false)).toBeNull();
    });

    it('does not intercept keys during IME composition', () => {
      expect(getSlashCommandKeyAction('Enter', true, true)).toBeNull();
    });

    it('ignores unrelated keys', () => {
      expect(getSlashCommandKeyAction('a', false, true)).toBeNull();
    });
  });

  describe('isSlashCommandPaletteShortcut', () => {
    const event = {
      altKey: false,
      ctrlKey: false,
      isComposing: false,
      key: 'k',
      metaKey: false,
      shiftKey: false,
    };

    it('matches Cmd+K and Ctrl+K', () => {
      expect(isSlashCommandPaletteShortcut({ ...event, metaKey: true })).toBe(
        true
      );
      expect(isSlashCommandPaletteShortcut({ ...event, ctrlKey: true })).toBe(
        true
      );
    });

    it('ignores modified, composing, and mixed modifier events', () => {
      expect(
        isSlashCommandPaletteShortcut({
          ...event,
          metaKey: true,
          shiftKey: true,
        })
      ).toBe(false);
      expect(
        isSlashCommandPaletteShortcut({
          ...event,
          ctrlKey: true,
          isComposing: true,
        })
      ).toBe(false);
      expect(
        isSlashCommandPaletteShortcut({
          ...event,
          ctrlKey: true,
          metaKey: true,
        })
      ).toBe(false);
    });
  });
});
