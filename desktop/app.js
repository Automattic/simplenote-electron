'use strict';

const {
	app,
	BrowserWindow,
	ipcMain,
	shell,
	Menu
} = require( 'electron' );

const path = require( 'path' );
const buildViewMenu = require( './menus/view-menu' );

require( 'module' ).globalPaths.push( path.resolve( path.join( __dirname ) ) );

module.exports = function main() {
	require( './updater' )();
	const url = 'file://' + path.join( __dirname, '..', 'dist', 'index.html' );

	// Keep a global reference of the window object, if you don't, the window will
	// be closed automatically when the JavaScript object is GCed.
	var mainWindow = null;

	const activateWindow = function() {

		// Only allow a single window
		// to be open at any given time
		if ( mainWindow ) {
			return;
		}

		// Create the browser window.
		var iconPath = path.join( __dirname, '/lib/icons/app-icon/icon_256x256.png' );
		mainWindow = new BrowserWindow( {
			width: 1024,
			height: 768,
			minWidth: 370,
			minHeight: 520,
			icon: iconPath
		} );

		// and load the index of the app.
		if ( typeof mainWindow.loadURL === 'function' ) {
			mainWindow.loadURL( url );
		} else {
			mainWindow.loadUrl( url );
		}

		// Uncomment me to debug in the electron window
		//mainWindow.openDevTools();

		// Configure and set the application menu
		const menuTemplate = createMenuTemplate();
		const appMenu = Menu.buildFromTemplate( menuTemplate );
		Menu.setApplicationMenu( appMenu );

		ipcMain.on( 'settingsUpdate', function( event, settings ) {
			Menu.setApplicationMenu( Menu.buildFromTemplate( createMenuTemplate( settings ) ) );
		} );

		// Emitted when the window is closed.
		mainWindow.on( 'closed', function() {
			// Dereference the window object, usually you would store windows
			// in an array if your app supports multi windows, this is the time
			// when you should delete the corresponding element.
			mainWindow = null;
		} );
	};

	// Quit when all windows are closed.
	app.on( 'window-all-closed', function() {
		// On OS X it is common for applications and their menu bar
		// to stay active until the user quits explicitly with Cmd + Q
		if ( process.platform !== 'darwin' ) {
			app.quit();
		}
	} );

	// This method will be called when Electron has finished
	// initialization and is ready to create browser windows.
	app.on( 'ready', activateWindow );
	app.on( 'activate', activateWindow );
};

function createMenuTemplate( settings ) {
	const name = app.getName();

	const aboutMenuItem = {
		label: '&About ' + name,
		click: function( item, focusedWindow ) {
			if ( focusedWindow ) {
				focusedWindow.webContents.send( 'appCommand', { action: 'showDialog', dialog: {
					type: 'About',
					modal: true,
					single: true
				} } );
			}
		}
	};

	const settingsMenuItem = {
		label: 'P&references',
		accelerator: 'Command+,',
		click: function( item, focusedWindow ) {
			if ( focusedWindow ) {
				focusedWindow.webContents.send( 'appCommand', { action: 'showDialog', dialog: {
					type: 'Settings',
					modal: true,
					single: true
				} } );
			}
		}
	};

	var helpMenu = {
		label: '&Help',
		submenu: [ {
			label: 'Help && &Support',
			click: function() {
				shell.openExternal( 'http://simplenote.com/help' )
			}
		} ]
	};

	var fileMenu = {
		label: '&File',
		submenu: [ {
				label: '&New Note',
				accelerator: 'CmdOrCtrl+N',
				click( item, focusedWindow ) {
					if ( focusedWindow ) {
						focusedWindow.webContents.send( 'appCommand', { action: 'newNote' } );
					}
				}
			}, {
				type: 'separator'
			}, {
				label: '&Print',
				accelerator: 'CmdOrCtrl+P',
				click( item, focusedWindow ) {
					if ( focusedWindow ) {
						focusedWindow.webContents.send( 'appCommand', { action: 'setShouldPrintNote' } );
					}
				}
		} ]
	};

	// non-osx menu item adjustments
	if ( process.platform !== 'darwin' ) {
		// add about menu item to Help
		helpMenu[ 'submenu' ].push( {
			type: 'separator'
		} );
		helpMenu[ 'submenu' ].push( aboutMenuItem );

		// add exit and settings items to File
		fileMenu[ 'submenu' ].push( {
			type: 'separator'
		} );
		fileMenu[ 'submenu' ].push( settingsMenuItem );
		fileMenu[ 'submenu' ].push( {
			type: 'separator'
		} );
		fileMenu[ 'submenu' ].push( {
			label: 'E&xit',
			accelerator: 'Alt+F4',
			click: function() {
				app.quit();
			}
		} );
	}

	var menuTemplate = [ fileMenu, {
		label: '&Edit',
		submenu: [ {
			label: '&Undo',
			accelerator: 'CmdOrCtrl+Z',
			role: 'undo'
		}, {
			label: '&Redo',
			accelerator: 'Shift+CmdOrCtrl+Z',
			role: 'redo'
		}, {
			type: 'separator'
		}, {
			label: '&Cut',
			accelerator: 'CmdOrCtrl+X',
			role: 'cut'
		}, {
			label: 'C&opy',
			accelerator: 'CmdOrCtrl+C',
			role: 'copy'
		}, {
			label: '&Paste',
			accelerator: 'CmdOrCtrl+V',
			role: 'paste'
		}, {
			label: '&Select All',
			accelerator: 'CmdOrCtrl+A',
			role: 'selectall'
		}, {
			type: 'separator'
		}, {
			label: 'Search &Notes',
			accelerator: 'CmdOrCtrl+F',
			click( item, focusedWindow ) {
				if ( focusedWindow ) {
					focusedWindow.webContents.send( 'appCommand', { action: 'setSearchFocus' } );
				}
			}
		} ]
	}, buildViewMenu( settings ), {
		label: '&Window',
		role: 'window',
		submenu: [ {
			label: '&Minimize',
			accelerator: 'CmdOrCtrl+M',
			role: 'minimize'
		}, {
			label: '&Close',
			accelerator: 'CmdOrCtrl+W',
			role: 'close'
		} ]
	}, helpMenu ];

	if ( process.platform === 'darwin' ) {
		// Add the 'Simplenote' menu for os x
		menuTemplate.unshift( {
			label: name,
			submenu: [ aboutMenuItem, {
				type: 'separator'
			}, settingsMenuItem, {
				type: 'separator'
			}, {
				label: 'Services',
				role: 'services',
				submenu: []
			}, {
				type: 'separator'
			}, {
				label: 'Hide ' + name,
				accelerator: 'Command+H',
				role: 'hide'
			}, {
				label: 'Hide Others',
				accelerator: 'Command+Shift+H',
				role: 'hideothers'
			}, {
				label: 'Show All',
				role: 'unhide'
			}, {
				type: 'separator'
			}, {
				label: 'Quit',
				accelerator: 'Command+Q',
				click: function() {
					app.quit();
				}
			} ]
		} );

		// Window menu.
		menuTemplate[3].submenu.push( {
			type: 'separator'
		}, {
			label: 'Bring All to Front',
			role: 'front'
		} );
	}

	return menuTemplate;
}
