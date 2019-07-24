export const getNoteIdFromUrl = () => {
  if (!window.location.pathname.split('/')[0] === 'note') {
    return false;
  }
  const noteIndex = window.location.pathname.split('/').indexOf('note');
  return window.location.pathname.split('/')[noteIndex + 1];
};

export const isInfoPanelOpen = () => {
  if (!window.location.pathname.includes('/note/')) {
    return false;
  }
  const noteIndex = window.location.pathname.split('/').indexOf('note');
  return window.location.pathname.split('/')[noteIndex + 1];
};
