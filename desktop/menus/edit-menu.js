const { appCommandSender } = require('./utils');

const buildEditMenu = (settings, isAuthenticated) => {
  settings = settings || {};
  isAuthenticated = isAuthenticated || false;

  return {
    label: '&Edit',
    submenu: [
      {
        label: '&Undo',
        role: 'undo',
      },
      {
        label: '&Redo',
        role: 'redo',
      },
      {
        type: 'separator',
      },
      {
        label: '&Cut',
        role: 'cut',
      },
      {
        label: 'C&opy',
        role: 'copy',
      },
      {
        label: '&Paste',
        role: 'paste',
      },
      {
        label: '&Select All',
        role: 'selectall',
      },
      ...(isAuthenticated ? [{ type: 'separator' }] : []),
      {
        label: '&Trash Note',
        visible: isAuthenticated,
        click: appCommandSender({ action: 'trashNote' }),
      },
      ...(isAuthenticated ? [{ type: 'separator' }] : []),
      {
        label: 'Search &Notes…',
        visible: isAuthenticated,
        click: appCommandSender({ action: 'focusSearchField' }),
      },
      ...(isAuthenticated ? [{ type: 'separator' }] : []),
      {
        label: 'C&heck Spelling',
        visible: isAuthenticated,
        type: 'checkbox',
        checked: settings.spellCheckEnabled,
        click: appCommandSender({ action: 'toggleSpellCheck' }),
      },
    ],
  };
};

module.exports = buildEditMenu;
