'use strict';

const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Menu,
  session,
} = require('electron');

const path = require('path');
const windowStateKeeper = require('electron-window-state');

const config = require('./config');
const createMenuTemplate = require('./menus');
const platform = require('./detect/platform');
const updater = require('./updater');
const { isDev } = require('./env');
const spellcheck = require('./spellchecker');

require('module').globalPaths.push(path.resolve(path.join(__dirname)));

module.exports = function main() {
  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is GCed.
  let mainWindow = null;

  app.on('will-finish-launching', function () {
    setTimeout(updater.ping.bind(updater), config.updater.delay);
    app.on('open-url', function (event, url) {
      event.preventDefault();
      mainWindow.webContents.send('wpLogin', url);
    });
  });

  const url =
    isDev && process.env.DEV_SERVER
      ? 'http://localhost:4000' // TODO: find a solution to use host and port based on make config.
      : 'file://' + path.join(__dirname, '..', 'dist', 'index.html');

  const activateWindow = function () {
    // Only allow a single window
    // to be open at any given time
    if (mainWindow) {
      return;
    }

    const mainWindowState = windowStateKeeper({
      defaultWidth: 1024,
      defaultHeight: 768,
    });

    mainWindow = new BrowserWindow({
      backgroundColor: '#fff',
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      minWidth: 370,
      minHeight: 520,
      titleBarStyle: 'hidden',
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, './preload.js'),
      },
    });

    // and load the index of the app.
    if (typeof mainWindow.loadURL === 'function') {
      mainWindow.loadURL(url);
    } else {
      mainWindow.loadUrl(url);
    }

    spellcheck(mainWindow);

    if (
      'test' !== process.env.NODE_ENV &&
      (isDev || process.argv.includes('--devtools'))
    ) {
      mainWindow.openDevTools({ mode: 'detach' });
    }

    // Configure and set the application menu
    const menuTemplate = createMenuTemplate();
    const appMenu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(appMenu);

    ipcMain.on('settingsUpdate', function (event, settings) {
      Menu.setApplicationMenu(
        Menu.buildFromTemplate(createMenuTemplate(settings))
      );
    });

    ipcMain.on('clearCookies', function () {
      // Removes any cookies stored in the app. We're particularly interested in
      // removing the WordPress.com cookies that may have been set during sign in.
      session.defaultSession.cookies.get({}, (error, cookies) => {
        cookies.forEach((cookie) => {
          // Reconstruct the url to pass to the cookies.remove function
          let cookieUrl = '';
          cookieUrl += cookie.secure ? 'https://' : 'http://';
          cookieUrl += cookie.domain.charAt(0) === '.' ? 'www' : '';
          cookieUrl += cookie.domain;
          cookieUrl += cookie.path;

          session.defaultSession.cookies.remove(
            cookieUrl,
            cookie.name,
            () => {} // Ignore callback
          );
        });
      });
      mainWindow.reload();
    });

    ipcMain.on('setAutoHideMenuBar', function (event, autoHideMenuBar) {
      mainWindow.setAutoHideMenuBar(autoHideMenuBar || false);
      mainWindow.setMenuBarVisibility(!autoHideMenuBar);
    });

    ipcMain.on('wpLogin', function (event, url) {
      shell.openExternal(url);
    });

    mainWindowState.manage(mainWindow);

    mainWindow.webContents.on('new-window', function (event, linkUrl) {
      event.preventDefault();
      shell.openExternal(linkUrl);
    });

    // Disables navigation for app window drag and drop
    mainWindow.webContents.on('will-navigate', (event) =>
      event.preventDefault()
    );

    // Fullscreen should be disabled on launch
    if (platform.isOSX()) {
      mainWindow.on('close', () => {
        mainWindow.setFullScreen(false);
      });
    } else {
      mainWindow.setFullScreen(false);
    }

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null;
    });

    // wait until window is presentable
    mainWindow.once('ready-to-show', mainWindow.show);
  };

  const gotTheLock = app.requestSingleInstanceLock();

  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  if (!gotTheLock) {
    return app.quit();
  }

  if (!app.isDefaultProtocolClient('simplenote')) {
    // Define custom protocol handler. This allows for deeplinking into the app from simplenote://
    app.setAsDefaultProtocolClient('simplenote');
  }

  // Quit when all windows are closed.
  app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('browser-window-created', function (event, window) {
    window.webContents.on('did-finish-load', () => {
      // Disable drag and drop operations on the window
      window.webContents.executeJavaScript(
        "document.addEventListener('dragover', event => event.preventDefault());"
      );
      window.webContents.executeJavaScript(
        "document.addEventListener('drop', event => event.preventDefault());"
      );
    });
  });

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  app.on('ready', activateWindow);
  app.on('activate', activateWindow);
};
