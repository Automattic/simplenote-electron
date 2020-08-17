const { appCommandSender } = require('./utils');

const buildEditMenu = (settings, isAuthenticated) => {
  settings = settings || {};
  isAuthenticated = isAuthenticated || false;

  return {
    label: '&Edit',
    submenu: [
      {
        label: '&Undo',
        click: appCommandSender('editorCommand', { action: 'undo' }),
      },
      {
        label: '&Redo',
        click: appCommandSender('editorCommand', { action: 'redo' }),
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
        click: appCommandSender('editorCommand', { action: 'selectAll' }),
      },
      { type: 'separator' },
      {
        label: '&Trash Note',
        visible: isAuthenticated,
        click: appCommandSender('appCommnad', { action: 'trashNote' }),
      },
      { type: 'separator' },
      {
        label: 'Search &Notes…',
        visible: isAuthenticated,
        click: appCommandSender('appCommnad', { action: 'focusSearchField' }),
      },
      { type: 'separator' },
      {
        label: 'C&heck Spelling',
        visible: isAuthenticated,
        type: 'checkbox',
        checked: settings.spellCheckEnabled,
        click: appCommandSender('appCommnad', { action: 'toggleSpellCheck' }),
      },
    ],
  };
};

module.exports = buildEditMenu;
