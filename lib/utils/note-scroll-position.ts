export type StructuredPointSnapshot = {
  rootIndex: number;
  path: number[];
  textOffset: number;
  transientGapAfterRootIndex?: number;
};

export type StructuredSelectionSnapshot = {
  anchor: StructuredPointSnapshot;
  focus: StructuredPointSnapshot;
  direction: 'LTR' | 'RTL';
};

export type NoteViewState = {
  scrollTop: number;
  /** Lexical tree selection saved by the markdown editor on note switch. */
  structuredSelection?: StructuredSelectionSnapshot;
  /** Markdown exported when structuredSelection was captured (for remap on restore). */
  localMarkdown?: string;
  /** Container text at capture time (for remap when localMarkdown !== current content). */
  localTexts?: {
    anchor: string | null;
    focus: string | null;
  };
  monacoSelection?: {
    position: { lineNumber: number; column: number };
    selection?: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    };
  };
};

export type NotePositions = {
  [key: string]: number | NoteViewState;
};

const isNoteViewState = (value: unknown): value is NoteViewState =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as NoteViewState).scrollTop === 'number';

export const setNotePosition = (noteId: string, position: number) => {
  const positions = getAllPositions();
  const existing = positions[noteId];
  if (existing !== undefined && isNoteViewState(existing)) {
    positions[noteId] = { ...existing, scrollTop: position };
  } else {
    positions[noteId] = position;
  }
  sessionStorage.setItem('note_positions', JSON.stringify(positions));
};

export const getNotePosition = (noteId: string): number => {
  const positions = getAllPositions();
  const value = positions[noteId];
  if (value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  return value.scrollTop;
};

export const getNoteViewState = (noteId: string): NoteViewState | null => {
  const positions = getAllPositions();
  const value = positions[noteId];
  if (value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return { scrollTop: value };
  }
  return value;
};

export const setNoteViewState = (noteId: string, state: NoteViewState) => {
  const positions = getAllPositions();
  positions[noteId] = state;
  sessionStorage.setItem('note_positions', JSON.stringify(positions));
};

export const clearNotePositions = () => {
  sessionStorage.removeItem('note_positions');
};

const getAllPositions = (): NotePositions => {
  const notePositions = sessionStorage.getItem('note_positions');
  if (notePositions) {
    try {
      const parsed = JSON.parse(notePositions) as NotePositions;
      return parsed ?? {};
    } catch (e) {
      return {};
    }
  }
  return {};
};
