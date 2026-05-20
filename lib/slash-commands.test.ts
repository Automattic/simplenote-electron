import {
  getSlashCommandSuggestions,
  getSlashCommandTrigger,
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

    it('ignores command queries with punctuation', () => {
      expect(getSlashCommandTrigger('/search?', 9)).toBeNull();
    });
  });

  describe('getSlashCommandSuggestions', () => {
    it('returns all commands for an empty query', () => {
      expect(
        getSlashCommandSuggestions('').map(({ command }) => command.id)
      ).toEqual(['search', 'shortcuts', 'focus', 'pref', 'export']);
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

    it('does not show ghost text for an exact command', () => {
      const [first] = getSlashCommandSuggestions('export');

      expect(first.command.id).toBe('export');
      expect(first.completion).toBe('');
      expect(first.exactMatch).toBe(true);
    });
  });
});
