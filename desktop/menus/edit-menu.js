const { appCommandSender, editorCommandSender } = require('./utils');

const buildEditMenu = (settings, isAuthenticated) => {
  settings = settings || {};
  isAuthenticated = isAuthenticated || false;

  const undo = {
    label: '&Undo',
    click: editorCommandSender({ action: 'undo' }),
    accelerator: 'CommandOrControl+Z',
  };
  const redo = {
    label: '&Redo',
    click: editorCommandSender({ action: 'redo' }),
    accelerator: 'CommandOrControl+Shift+Z',
  };
  const selectAll = {
    label: '&Select All',
    click: editorCommandSender({ action: 'selectAll' }),
    accelerator: 'CommandOrControl+A',
  };

  const editMenuOptions = [
    undo,
    redo,
    {
      type: 'separator',
    },
  ];

  let authenticatedMenuOptions = [];

  if (isAuthenticated) {
    authenticatedMenuOptions = [
      { type: 'separator' },
      {
        label: '&Trash Note',
        click: appCommandSender({ action: 'trashNote' }),
      },
      { type: 'separator' },
      {
        label: 'Search &Notes…',
        click: appCommandSender({ action: 'focusSearchField' }),
        accelerator: 'CommandOrControl+Shift+S',
      },
      {
        label: '&Find in Note',
        click: appCommandSender({ action: 'focusSearchField' }),
        accelerator: 'CommandOrControl+F',
      },
      {
        label: 'Find A&gain',
        click: editorCommandSender({ action: 'findAgain' }),
        accelerator: 'CommandOrControl+G',
      },
    ];
  }

  const defaultSubmenuAdditions = [
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
  ];

  const submenu = editMenuOptions
    .concat(defaultSubmenuAdditions)
    .concat(authenticatedMenuOptions);

  const fileMenu = {
    label: '&Edit',
    submenu,
  };

  return fileMenu;
};

module.exports = buildEditMenu;
