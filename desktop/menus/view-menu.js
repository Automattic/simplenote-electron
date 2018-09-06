const { buildRadioGroup, appCommandSender } = require('./utils');

const buildViewMenu = settings => {
  settings = settings || {};

  return {
    label: '&View',
    submenu: [
      {
        label: '&Note Display',
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
        label: 'Note &Editor',
        submenu: [
          {
            label: '&Font Size',
            submenu: [
              // For the oddity with "Command" vs "Cmd"
              // Cite: https://github.com/atom/electron/issues/1507
              {
                label: '&Bigger',
                accelerator: 'CommandOrControl+=',
                click: appCommandSender({ action: 'increaseFontSize' }),
              },
              {
                label: '&Smaller',
                accelerator: 'CommandOrControl+-',
                click: appCommandSender({ action: 'decreaseFontSize' }),
              },
              {
                label: '&Reset',
                accelerator: 'CommandOrControl+0',
                click: appCommandSender({ action: 'resetFontSize' }),
              },
            ],
          },
          {
            label: '&Line Length',
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
        ],
      },
      {
        label: '&Sort Type',
        submenu: [
          {
            label: 'Last &modified',
            id: 'modificationDate',
          },
          {
            label: 'Last &created',
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
        label: '&Theme',
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
      {
        type: 'separator',
      },
      {
        label: 'T&oggle Full Screen',
        accelerator: (function() {
          if (process.platform === 'darwin') {
            return 'Ctrl+Command+F';
          }
          return 'F11';
        })(),
        click(item, focusedWindow) {
          if (focusedWindow) {
            focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
          }
        },
      },
    ],
  };
};

module.exports = buildViewMenu;
