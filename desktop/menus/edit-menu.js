const { appCommandSender, editCommandSender } = require('./utils');

const buildEditMenu = (settings, isAuthenticated) => {
  settings = settings || {};
  isAuthenticated = isAuthenticated || false;

  return {
    label: '&Edit',
    submenu: [
      {
        label: '&Undo',
        click: editCommandSender({ action: 'undo' }),
      },
      {
        label: '&Redo',
        click: editCommandSender({ action: 'redo' }),
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
        click: editCommandSender({ action: 'selectAll' }),
      },
      { type: 'separator' },
      {
        label: '&Trash Note',
        visible: isAuthenticated,
        click: appCommandSender({ action: 'trashNote' }),
      },
      { type: 'separator' },
      {
        label: 'Search &Notes…',
        visible: isAuthenticated,
        click: appCommandSender({ action: 'focusSearchField' }),
      },
      { type: 'separator' },
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
