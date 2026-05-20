export type SlashCommandId =
  | 'search'
  | 'shortcuts'
  | 'focus'
  | 'pref'
  | 'export';

export type SlashCommand = {
  id: SlashCommandId;
  name: string;
  aliases: string[];
  title: string;
  detail: string;
};

export type SlashCommandTrigger = {
  token: string;
  query: string;
  startColumn: number;
  endColumn: number;
};

export type SlashCommandSuggestion = {
  command: SlashCommand;
  completion: string;
  exactMatch: boolean;
};

export type SlashCommandKeyAction =
  | 'complete'
  | 'execute'
  | 'next'
  | 'previous'
  | 'cancel'
  | 'cancel-and-type';

export const slashCommands: SlashCommand[] = [
  {
    id: 'search',
    name: 'search',
    aliases: ['s'],
    title: 'Search notes',
    detail: 'Focus the notes search field',
  },
  {
    id: 'shortcuts',
    name: 'shortcuts',
    aliases: [],
    title: 'Keyboard shortcuts',
    detail: 'Show available keyboard shortcuts',
  },
  {
    id: 'focus',
    name: 'focus',
    aliases: [],
    title: 'Focus mode',
    detail: 'Toggle focus mode',
  },
  {
    id: 'pref',
    name: 'pref',
    aliases: [],
    title: 'Preferences',
    detail: 'Open app preferences',
  },
  {
    id: 'export',
    name: 'export',
    aliases: [],
    title: 'Export notes',
    detail: 'Start the notes export flow',
  },
];

export const getSlashCommandTrigger = (
  line: string,
  column: number
): SlashCommandTrigger | null => {
  const textBeforeCursor = line.slice(0, column - 1);
  const token = /\S*$/.exec(textBeforeCursor)?.[0] ?? '';
  const startIndex = textBeforeCursor.length - token.length;
  const nextCharacter = line[column - 1];

  if (
    !token.startsWith('/') ||
    ('undefined' !== typeof nextCharacter && !/\s/.test(nextCharacter))
  ) {
    return null;
  }

  const query = token.slice(1).toLowerCase();

  if (!/^[a-z]*$/.test(query)) {
    return null;
  }

  return {
    token,
    query,
    startColumn: startIndex + 1,
    endColumn: column,
  };
};

const scoreCommand = (command: SlashCommand, query: string): number | null => {
  if (query.length === 0) {
    return 10;
  }

  if (command.name === query) {
    return 0;
  }

  if (command.aliases.includes(query)) {
    return 1;
  }

  if (command.name.startsWith(query)) {
    return 2;
  }

  if (command.aliases.some((alias) => alias.startsWith(query))) {
    return 3;
  }

  if (command.title.toLowerCase().includes(query)) {
    return 4;
  }

  return null;
};

export const getSlashCommandSuggestions = (
  query: string
): SlashCommandSuggestion[] =>
  slashCommands
    .map((command, index) => ({
      command,
      index,
      score: scoreCommand(command, query),
    }))
    .filter(
      (
        result
      ): result is {
        command: SlashCommand;
        index: number;
        score: number;
      } => result.score !== null
    )
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(({ command }) => {
      const exactMatch =
        command.name === query || command.aliases.includes(query);
      const completion = command.name.startsWith(query)
        ? command.name.slice(query.length)
        : command.name;

      return {
        command,
        completion,
        exactMatch,
      };
    });

export const getNextSlashCommandIndex = (
  suggestionsLength: number,
  selectedIndex: number,
  offset: number
) => (suggestionsLength + selectedIndex + offset) % suggestionsLength;

export const getSlashCommandKeyAction = (
  key: string,
  isComposing: boolean,
  isActive: boolean
): SlashCommandKeyAction | null => {
  if (!isActive || isComposing) {
    return null;
  }

  switch (key) {
    case 'Tab':
      return 'complete';
    case 'Enter':
      return 'execute';
    case 'ArrowDown':
      return 'next';
    case 'ArrowUp':
      return 'previous';
    case 'Escape':
      return 'cancel';
    case ' ':
    case 'Spacebar':
      return 'cancel-and-type';
    default:
      return null;
  }
};

export const isSlashCommandPaletteShortcut = ({
  altKey,
  ctrlKey,
  isComposing,
  key,
  metaKey,
  shiftKey,
}: Pick<
  KeyboardEvent,
  'altKey' | 'ctrlKey' | 'isComposing' | 'key' | 'metaKey' | 'shiftKey'
>) => {
  const cmdOrCtrl = (ctrlKey || metaKey) && ctrlKey !== metaKey;

  return (
    cmdOrCtrl &&
    !altKey &&
    !shiftKey &&
    !isComposing &&
    key.toLowerCase() === 'k'
  );
};
