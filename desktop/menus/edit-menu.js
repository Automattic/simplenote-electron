const { appCommandSender, editorCommandSender } = require('./utils');

const buildEditMenu = (settings, isAuthenticated, editMode) => {
  settings = settings || {};
  isAuthenticated = isAuthenticated || false;
  editMode = editMode || false;

  let undo = {
    label: '&Undo',
    click: editorCommandSender({ action: 'undo' }),
    accelerator: 'CommandOrControl+Z',
    visible: editMode,
  };
  let redo = {
    label: '&Redo',
    click: editorCommandSender({ action: 'redo' }),
    accelerator: 'CommandOrControl+Shift+Z',
    visible: editMode,
  };
  let selectAll = {
    label: '&Select All',
    click: editorCommandSender({ action: 'selectAll' }),
    accelerator: 'CommandOrControl+A',
  };

  // menu items with roles don't respect visibility, so we have to do this the hard way
  if (!editMode) {
    selectAll['role'] = 'selectAll';
  }

  return {
    label: '&Edit',
    submenu: [
      undo,
      redo,
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
      selectAll,
      { type: 'separator' },
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
        accelerator: 'CommandOrControl+Shift+S',
      },
      {
        label: '&Find in Note',
        visible: isAuthenticated,
        click: appCommandSender({ action: 'focusSearchField' }),
        accelerator: 'CommandOrControl+F',
      },
      {
        label: 'Find A&gain',
        visible: isAuthenticated,
        click: editorCommandSender({ action: 'findAgain' }),
        accelerator: 'CommandOrControl+G',
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
