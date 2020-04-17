const { appCommandSender } = require('./utils');

const buildEditMenu = settings => {
  settings = settings || {};

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
      { type: 'separator' },
      {
        label: '&Trash Note',
        click: appCommandSender({ action: 'trashNote' }),
      },
      { type: 'separator' },
      {
        label: 'Search &Notes…',
        click: appCommandSender({ action: 'focusSearchField' }),
      },
      { type: 'separator' },
      {
        label: 'C&heck Spelling',
        type: 'checkbox',
        checked: settings.spellCheckEnabled,
        click: appCommandSender({ action: 'toggleSpellCheck' }),
      },
    ],
  };
};

module.exports = buildEditMenu;
