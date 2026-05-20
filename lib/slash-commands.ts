export type CommandPaletteCommandId =
  | 'new'
  | 'search'
  | 'all-notes'
  | 'untagged-notes'
  | 'trash'
  | 'settings'
  | 'shortcuts'
  | 'help'
  | 'about'
  | 'focus'
  | 'export';

export type CommandPaletteCommand = {
  id: CommandPaletteCommandId;
  name: string;
  aliases: string[];
  title: string;
  detail: string;
};

export type CommandPaletteSuggestion = {
  command: CommandPaletteCommand;
};

export type CommandPaletteKeyAction = 'execute' | 'next' | 'previous' | 'close';

export const commandPaletteCommands: CommandPaletteCommand[] = [
  {
    id: 'new',
    name: 'new',
    aliases: ['create'],
    title: 'New note',
    detail: 'Create a new note',
  },
  {
    id: 'search',
    name: 'search',
    aliases: ['s'],
    title: 'Search notes',
    detail: 'Focus the notes search field',
  },
  {
    id: 'all-notes',
    name: 'all',
    aliases: ['allnotes'],
    title: 'All notes',
    detail: 'Show all notes',
  },
  {
    id: 'untagged-notes',
    name: 'untagged',
    aliases: ['untaggednotes'],
    title: 'Untagged notes',
    detail: 'Show notes without tags',
  },
  {
    id: 'trash',
    name: 'trash',
    aliases: [],
    title: 'Trash',
    detail: 'Show trashed notes',
  },
  {
    id: 'settings',
    name: 'settings',
    aliases: ['pref', 'preferences'],
    title: 'Settings',
    detail: 'Open app settings',
  },
  {
    id: 'shortcuts',
    name: 'shortcuts',
    aliases: [],
    title: 'Keyboard shortcuts',
    detail: 'Show available keyboard shortcuts',
  },
  {
    id: 'help',
    name: 'help',
    aliases: ['support'],
    title: 'Help & Support',
    detail: 'Open Simplenote help',
  },
  {
    id: 'about',
    name: 'about',
    aliases: [],
    title: 'About',
    detail: 'Show app information',
  },
  {
    id: 'focus',
    name: 'focus',
    aliases: [],
    title: 'Focus mode',
    detail: 'Toggle focus mode',
  },
  {
    id: 'export',
    name: 'export',
    aliases: [],
    title: 'Export notes',
    detail: 'Start the notes export flow',
  },
];

const normalizeQuery = (query: string) => query.trim().toLowerCase();

const scoreCommand = (
  command: CommandPaletteCommand,
  query: string
): number | null => {
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

export const getCommandPaletteSuggestions = (
  query: string
): CommandPaletteSuggestion[] => {
  const normalizedQuery = normalizeQuery(query);

  return commandPaletteCommands
    .map((command, index) => ({
      command,
      index,
      score: scoreCommand(command, normalizedQuery),
    }))
    .filter(
      (
        result
      ): result is {
        command: CommandPaletteCommand;
        index: number;
        score: number;
      } => result.score !== null
    )
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(({ command }) => ({ command }));
};

export const getNextCommandPaletteIndex = (
  suggestionsLength: number,
  selectedIndex: number,
  offset: number
) => (suggestionsLength + selectedIndex + offset) % suggestionsLength;

export const getCommandPaletteKeyAction = (
  key: string,
  isComposing: boolean,
  isActive: boolean
): CommandPaletteKeyAction | null => {
  if (!isActive || isComposing) {
    return null;
  }

  switch (key) {
    case 'Enter':
      return 'execute';
    case 'ArrowDown':
      return 'next';
    case 'ArrowUp':
      return 'previous';
    case 'Escape':
      return 'close';
    default:
      return null;
  }
};

export const isCommandPaletteShortcut = ({
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
