const emptyList = [];
const emptyObject = {};

const patches = (state = emptyList, action) =>
  'NOTE_PATCH' === action.type ? [...state, action.operations] : state;

export const reducer = (state = emptyObject, action) => {
  const { noteId } = action;

  if (!action.noteId) {
    return state;
  }

  const noteState = state[noteId];

  const nextPatches = patches(
    noteState ? noteState.patches : noteState,
    action
  );

  if (noteState && nextPatches === noteState.patches) {
    return state;
  }

  return {
    ...state,
    [noteId]: {
      patches: nextPatches,
    },
  };
};

export const getLastPatch = (state, noteId) => {
  const note = state.notes[noteId];

  if (!note) {
    return emptyList;
  }

  const notePatches = note.patches;
  if (!notePatches) {
    return emptyList;
  }

  return notePatches[notePatches.length - 1];
};
