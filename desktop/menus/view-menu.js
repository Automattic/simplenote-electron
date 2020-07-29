const { buildRadioGroup, appCommandSender } = require('./utils');
const platform = require('../detect/platform');

const buildViewMenu = (settings, isAuthenticated) => {
  settings = settings || {};
  isAuthenticated = isAuthenticated || false;

  const menu = {
    label: '&View',
    submenu: [
      {
        label: '&Sort Type',
        visible: isAuthenticated,
        submenu: [
          {
            label: 'Date &modified',
            id: 'modificationDate',
          },
          {
            label: 'Date &created',
            id: 'creationDate',
          },
          {
            label: '&Alphabetical',
            id: 'alphabetical',
          },
        ]
          .map(
            buildRadioGroup({
              action: 'setSortType',
              propName: 'sortType',
              settings,
            })
          )
          .concat([
            {
              type: 'separator',
            },
            {
              label: '&Reversed',
              type: 'checkbox',
              checked: settings.sortReversed,
              click: appCommandSender({ action: 'toggleSortOrder' }),
            },
          ]),
      },
      {
        label: '&Note Display',
        visible: isAuthenticated,
        submenu: [
          {
            label: '&Comfy',
            id: 'comfy',
          },
          {
            label: 'C&ondensed',
            id: 'condensed',
          },
          {
            label: '&Expanded',
            id: 'expanded',
          },
        ].map(
          buildRadioGroup({
            action: 'setNoteDisplay',
            propName: 'noteDisplay',
            settings,
          })
        ),
      },
      {
        label: '&Line Length',
        visible: isAuthenticated,
        submenu: [
          {
            label: '&Narrow',
            id: 'narrow',
          },
          {
            label: '&Full',
            id: 'full',
          },
        ].map(
          buildRadioGroup({
            action: 'setLineLength',
            propName: 'lineLength',
            settings,
          })
        ),
      },
      {
        label: '&Tags',
        visible: isAuthenticated,
        submenu: [
          {
            label: '&Sort Alphabetically',
            type: 'checkbox',
            checked: settings.sortTagsAlpha,
            click: appCommandSender({ action: 'toggleSortTagsAlpha' }),
          },
        ],
      },
      {
        label: 'T&heme',
        visible: isAuthenticated,
        submenu: [
          {
            label: '&Light',
            id: 'light',
          },
          {
            label: '&Dark',
            id: 'dark',
          },
        ].map(
          buildRadioGroup({
            action: 'activateTheme',
            propName: 'theme',
            settings,
          })
        ),
      },
      ...(isAuthenticated ? [{ type: 'separator' }] : []),
      {
        label: 'Zoom &In',
        visible: isAuthenticated,
        accelerator: 'CommandOrControl+=',
        click: appCommandSender({ action: 'increaseFontSize' }),
      },
      {
        label: 'Zoom &Out',
        visible: isAuthenticated,
        accelerator: 'CommandOrControl+-',
        click: appCommandSender({ action: 'decreaseFontSize' }),
      },
      {
        label: '&Actual Size',
        visible: isAuthenticated,
        accelerator: 'CommandOrControl+0',
        click: appCommandSender({ action: 'resetFontSize' }),
      },
      ...(isAuthenticated ? [{ type: 'separator' }] : []),
      {
        label: 'Focus Mode',
        visible: isAuthenticated,
        accelerator: 'CommandOrControl+Shift+F',
        type: 'checkbox',
        checked: settings.focusModeEnabled,
        click: appCommandSender({ action: 'toggleFocusMode' }),
      },
      {
        type: 'separator',
      },
      {
        label: 'Toggle &Full Screen',
        accelerator: platform.isOSX() ? 'Ctrl+Command+F' : 'F11',
        click(item, focusedWindow) {
          if (focusedWindow) {
            focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
          }
        },
      },
    ],
  };

  return menu;
};

module.exports = buildViewMenu;
