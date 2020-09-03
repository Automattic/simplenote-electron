const { appCommandSender, editorCommandSender } = require('./utils');

const buildEditMenu = (settings, isAuthenticated) => {
  settings = settings || {};
  isAuthenticated = isAuthenticated || false;

  return {
    label: '&Edit',
    submenu: [
      {
        label: '&Undo',
        click: editorCommandSender({ action: 'undo' }),
        accelerator: 'CommandOrControl+Z',
      },
      {
        label: '&Redo',
        click: editorCommandSender({ action: 'redo' }),
        accelerator: 'CommandOrControl+Shift+Z',
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
        click: editorCommandSender({ action: 'selectAll' }),
        accelerator: 'CommandOrControl+A',
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
        accelerator: 'CommandOrControl+Shift+S',
      },
      {
        label: '&Find in Note',
        visible: isAuthenticated,
        click: editorCommandSender({ action: 'find' }),
        accelerator: 'CommandOrControl+F',
      },
      {
        label: 'Find A&gain',
        visible: isAuthenticated,
        click: editorCommandSender({ action: 'findAgain' }),
        accelerator: 'CommandOrControl+G',
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
