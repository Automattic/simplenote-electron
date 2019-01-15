const platform = require('../detect/platform');

const macAppMenu = require('./mac-app-menu');
const fileMenu = require('./file-menu');
const buildEditMenu = require('./edit-menu');
const buildViewMenu = require('./view-menu');
const helpMenu = require('./help-menu');

function createMenuTemplate(settings) {
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
    platform.isOSX() ? windowMenu : null,
    helpMenu,
  ].filter(menu => menu !== null);
}

module.exports = createMenuTemplate;
