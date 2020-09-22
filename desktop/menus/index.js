const platform = require('../detect/platform');

const buildMacAppMenu = require('./mac-app-menu');
const buildFileMenu = require('./file-menu');
const buildEditMenu = require('./edit-menu');
const buildViewMenu = require('./view-menu');
const buildFormatMenu = require('./format-menu');
const buildHelpMenu = require('./help-menu');

function createMenuTemplate(args, mainWindow) {
  args = args || {};
  const settings = args['settings'] || {};
  const isAuthenticated = settings && 'accountName' in settings;
  const editMode = args['editMode'] || false;
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
    buildEditMenu(settings, isAuthenticated, editMode),
    buildViewMenu(settings, isAuthenticated),
    buildFormatMenu(isAuthenticated, editMode),
    platform.isOSX() ? windowMenu : null,
    buildHelpMenu(mainWindow, isAuthenticated),
  ].filter((menu) => menu !== null);
}

module.exports = createMenuTemplate;
