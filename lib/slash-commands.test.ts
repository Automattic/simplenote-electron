import {
  getCommandPaletteKeyAction,
  getCommandPaletteSuggestions,
  getNextCommandPaletteIndex,
  isCommandPaletteShortcut,
} from './slash-commands';

describe('command palette', () => {
  describe('getCommandPaletteSuggestions', () => {
    it('returns all commands for an empty query', () => {
      expect(
        getCommandPaletteSuggestions('').map(({ command }) => command.id)
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
      const [first] = getCommandPaletteSuggestions('s');

      expect(first.command.id).toBe('search');
    });

    it('ranks prefix matches by command order', () => {
      const [first] = getCommandPaletteSuggestions('sh');

      expect(first.command.id).toBe('shortcuts');
    });

    it('matches command aliases for settings and new notes', () => {
      expect(getCommandPaletteSuggestions('pref')[0].command.id).toBe(
        'settings'
      );
      expect(getCommandPaletteSuggestions('create')[0].command.id).toBe('new');
    });

    it('matches command titles', () => {
      expect(getCommandPaletteSuggestions('keyboard')[0].command.id).toBe(
        'shortcuts'
      );
    });

    it('normalizes command palette queries', () => {
      expect(getCommandPaletteSuggestions('  SETTINGS  ')[0].command.id).toBe(
        'settings'
      );
    });
  });

  describe('getNextCommandPaletteIndex', () => {
    it('wraps forward through the available suggestions', () => {
      expect(getNextCommandPaletteIndex(5, 4, 1)).toBe(0);
    });

    it('wraps backward through the available suggestions', () => {
      expect(getNextCommandPaletteIndex(5, 0, -1)).toBe(4);
    });
  });

  describe('getCommandPaletteKeyAction', () => {
    it.each([
      ['Enter', 'execute'],
      ['ArrowDown', 'next'],
      ['ArrowUp', 'previous'],
      ['Escape', 'close'],
    ])('maps %s to %s while the command palette is active', (key, action) => {
      expect(getCommandPaletteKeyAction(key, false, true)).toBe(action);
    });

    it('does not intercept keys when the command palette is inactive', () => {
      expect(getCommandPaletteKeyAction('Enter', false, false)).toBeNull();
    });

    it('does not intercept keys during IME composition', () => {
      expect(getCommandPaletteKeyAction('Enter', true, true)).toBeNull();
    });

    it('ignores unrelated keys', () => {
      expect(getCommandPaletteKeyAction('a', false, true)).toBeNull();
    });
  });

  describe('isCommandPaletteShortcut', () => {
    const event = {
      altKey: false,
      ctrlKey: false,
      isComposing: false,
      key: 'k',
      metaKey: false,
      shiftKey: false,
    };

    it('matches Cmd+K and Ctrl+K', () => {
      expect(isCommandPaletteShortcut({ ...event, metaKey: true })).toBe(true);
      expect(isCommandPaletteShortcut({ ...event, ctrlKey: true })).toBe(true);
    });

    it('ignores modified, composing, and mixed modifier events', () => {
      expect(
        isCommandPaletteShortcut({
          ...event,
          metaKey: true,
          shiftKey: true,
        })
      ).toBe(false);
      expect(
        isCommandPaletteShortcut({
          ...event,
          ctrlKey: true,
          isComposing: true,
        })
      ).toBe(false);
      expect(
        isCommandPaletteShortcut({
          ...event,
          ctrlKey: true,
          metaKey: true,
        })
      ).toBe(false);
    });
  });
});
