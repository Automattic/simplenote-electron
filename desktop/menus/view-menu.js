var buildRadioGroup = function(activePredicate) {
  return function(item) {
    var label = item[0],
      prop = item[1],
      action = item[2];

    return {
      label: label,
      type: 'radio',
      checked: activePredicate(prop),
      click: appCommandSender(action),
    };
  };
};

var equalTo = function(a) {
  return function(b) {
    return a === b;
  };
};

const appCommandSender = arg => {
  return (item, focusedWindow) => {
    if (focusedWindow) {
      focusedWindow.webContents.send('appCommand', arg);
    }
  };
};

var buildViewMenu = function(settings) {
  settings = settings || {};

  return {
    label: '&View',
    submenu: [
      {
        label: '&Note Display',
        submenu: [
          [
            '&Comfy',
            'comfy',
            { action: 'setNoteDisplay', noteDisplay: 'comfy' },
          ],
          [
            'C&ondensed',
            'condensed',
            { action: 'setNoteDisplay', noteDisplay: 'condensed' },
          ],
          [
            '&Expanded',
            'expanded',
            { action: 'setNoteDisplay', noteDisplay: 'expanded' },
          ],
        ].map(buildRadioGroup(equalTo(settings.noteDisplay))),
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
        ],
      },
      {
        label: '&Sort Type',
        submenu: [
          [
            'Last &modified',
            'modificationDate',
            { action: 'setSortType', sortType: 'modificationDate' },
          ],
          [
            'Last &created',
            'creationDate',
            { action: 'setSortType', sortType: 'creationDate' },
          ],
          [
            '&Alphabetical',
            'alphabetical',
            { action: 'setSortType', sortType: 'alphabetical' },
          ],
        ]
          .map(buildRadioGroup(equalTo(settings.sortType)))
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
          ['&Light', 'light', { action: 'activateTheme', theme: 'light' }],
          ['&Dark', 'dark', { action: 'activateTheme', theme: 'dark' }],
        ].map(buildRadioGroup(equalTo(settings.theme))),
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
