const platform = require('../detect/platform');

const buildMacAppMenu = require('./mac-app-menu');
const buildFileMenu = require('./file-menu');
const buildEditMenu = require('./edit-menu');
const buildViewMenu = require('./view-menu');
const buildFormatMenu = require('./format-menu');
const buildHelpMenu = require('./help-menu');

function createMenuTemplate(settings, mainWindow) {
  const isAuthenticated = settings && 'accountName' in settings;
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
    platform.isOSX() ? buildMacAppMenu(isAuthenticated) : null,
    buildFileMenu(isAuthenticated),
    buildEditMenu(settings, isAuthenticated),
    buildViewMenu(settings, isAuthenticated),
    buildFormatMenu(isAuthenticated),
    platform.isOSX() ? windowMenu : null,
    buildHelpMenu(mainWindow),
  ].filter((menu) => menu !== null);
}

module.exports = createMenuTemplate;
