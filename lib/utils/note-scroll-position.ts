export type notePosition =
  | {
      scroll: number;
      line: number;
    }
  | undefined;

export type notePositions = {
  [key: string]: notePosition;
};

export const setNotePosition = (noteId: string, position: notePosition) => {
  const positions = getAllPositions();
  if (positions) {
    positions[noteId] = position;
    localStorage.setItem('note_positions', JSON.stringify(positions));
  }
};

export const getNotePosition = (noteId: string): notePosition | '' => {
  const positions = getAllPositions();
  if (positions) {
    return positions[noteId];
  } else {
    return '';
  }
};

export const removeNotePostion = (noteId: string) => {};

const getAllPositions = (): notePositions | '' => {
  const notePositions = localStorage.getItem('note_positions');
  let currentSavedPositions: notePositions;
  if (notePositions) {
    try {
      currentSavedPositions = JSON.parse(notePositions);
      return currentSavedPositions;
    } catch (e) {
      return '';
    }
  }
  return '';
};
