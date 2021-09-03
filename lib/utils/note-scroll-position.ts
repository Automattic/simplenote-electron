export type notePositions = {
  [key: string]: number;
};

export const setNotePosition = (noteId: string, position: number) => {
  const positions = getAllPositions();
  if (positions) {
    positions[noteId] = position;
    sessionStorage.setItem('note_positions', JSON.stringify(positions));
  }
};

export const getNotePosition = (noteId: string): number => {
  const positions = getAllPositions();
  if (positions) {
    return positions[noteId];
  } else {
    return 0;
  }
};

export const clearNotePositions = () => {
  sessionStorage.removeItem('note_positions');
};

const getAllPositions = (): notePositions => {
  const notePositions = sessionStorage.getItem('note_positions');
  let currentSavedPositions: notePositions;
  if (notePositions) {
    try {
      currentSavedPositions = JSON.parse(notePositions);
      return currentSavedPositions;
    } catch (e) {
      return {};
    }
  } else {
    currentSavedPositions = {};
  }
  return currentSavedPositions;
};
