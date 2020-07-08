const platform = require('../detect/platform');

const macAppMenu = require('./mac-app-menu');
const fileMenu = require('./file-menu');
const buildEditMenu = require('./edit-menu');
const buildViewMenu = require('./view-menu');
const formatMenu = require('./format-menu');
const buildHelpMenu = require('./help-menu');

function createMenuTemplate(settings, mainWindow) {
  const windowMenu = {
    role: 'window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' },
      { type: 'separator' },
      { role: 'front' },
    ],
  };

  return [
    platform.isOSX() ? macAppMenu : null,
    fileMenu,
    buildEditMenu(settings),
    buildViewMenu(settings),
    formatMenu,
    platform.isOSX() ? windowMenu : null,
    buildHelpMenu(mainWindow),
  ].filter((menu) => menu !== null);
}

module.exports = createMenuTemplate;
