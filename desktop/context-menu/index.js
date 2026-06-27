'use strict';

/**
 * External dependencies
 */
const { Menu } = require('electron');

const { editorCommandSender } = require('../menus/utils');

module.exports = function (mainWindow, viewState) {
  viewState = viewState || { markdownEditorActive: false };

  mainWindow.webContents.on('context-menu', (event, params) => {
    const { editFlags } = params;
    const markdownEditorActive = viewState.markdownEditorActive === true;

    Menu.buildFromTemplate([
      {
        id: 'selectAll',
        label: 'Select All',
        click: editorCommandSender({ action: 'selectAll' }),
        enabled: editFlags.canSelectAll,
      },
      {
        id: 'cut',
        label: 'Cut',
        role: 'cut',
        enabled: editFlags.canCut,
      },
      {
        id: 'copy',
        label: 'Copy',
        role: 'copy',
        enabled: editFlags.canCopy,
      },
      ...(markdownEditorActive
        ? [
            {
              id: 'copyAsPlainText',
              label: 'Copy as Plain Text',
              click: editorCommandSender({ action: 'copyAsPlainText' }),
              enabled: editFlags.canCopy,
            },
          ]
        : []),
      {
        id: 'paste',
        label: 'Paste',
        role: 'paste',
        enabled: editFlags.canPaste,
      },
      {
        type: 'separator',
      },
    ]).popup({});
  });
};
