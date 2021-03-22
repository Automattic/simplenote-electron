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

  const editModeMenuOptions = editMode
    ? [
        undo,
        redo,
        {
          type: 'separator',
        },
      ]
    : [];

  // menu items with roles don't respect visibility, so we have to do this the hard way
  if (!editMode) {
    selectAll['role'] = 'selectAll';
  }

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

  const submenu = editModeMenuOptions
    .concat(defaultSubmenuAdditions)
    .concat(authenticatedMenuOptions);

  const fileMenu = {
    label: '&Edit',
    submenu,
  };

  return fileMenu;
};

module.exports = buildEditMenu;
