'use strict';

var app = require( 'app' );	 // Module to control application life.
var Menu = require( 'menu' );
var BrowserWindow = require( 'browser-window' );	// Module to create native browser window.
var path = require('path')

require( 'module' ).globalPaths.push( path.resolve( path.join( __dirname ) ) );

module.exports = function main() {
	var url = 'file://' + path.join( __dirname, '..', 'dist', 'index.html' );

	// Report crashes to our server.
	require( 'crash-reporter' ).start();
	require( './updater' )();

	// Keep a global reference of the window object, if you don't, the window will
	// be closed automatically when the JavaScript object is GCed.
	var mainWindow = null;

	const activateWindow = function() {

		// Only allow a single window
		// to be open at any given time
		if ( mainWindow ) {
			return;
		}

		// Configure and set the application menu
		var menuTemplate = createMenuTemplate();
		var menu = Menu.buildFromTemplate( menuTemplate );
		Menu.setApplicationMenu( menu );

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
		// mainWindow.openDevTools();

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

function createMenuTemplate() {
	const name = require( 'app' ).getName();

	const aboutMenuItem = {
		label: 'About ' + name,
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
		label: 'Preferences',
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
		label: 'Help',
		submenu: [ {
			label: 'Help && Support',
			click: function() {
				require( 'shell' ).openExternal( 'http://simplenote.com/help' )
			}
		} ]
	};

	var fileMenu = {
		label: 'File',
		submenu: [ {
				label: 'New Note',
				accelerator: 'CmdOrCtrl+N',
				click( item, focusedWindow ) {
					if ( focusedWindow ) {
						focusedWindow.webContents.send( 'appCommand', { action: 'newNote' } );
					}
				}
			},
		 	{
				label: 'Print',
				accelerator: 'CmdOrCtrl+P',
				click( item, focusedWindow ) {
					if ( focusedWindow ) {
						focusedWindow.webContents.send( 'appCommand', { action: 'setShouldPrintNote' } );
					}
				}
			}	]
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
			label: 'Exit',
			accelerator: 'Alt+F4',
			click: function() {
				app.quit();
			}
		} );
	}

	var menuTemplate = [ fileMenu, {
		label: 'Edit',
		submenu: [ {
			label: 'Undo',
			accelerator: 'CmdOrCtrl+Z',
			role: 'undo'
		}, {
			label: 'Redo',
			accelerator: 'Shift+CmdOrCtrl+Z',
			role: 'redo'
		}, {
			type: 'separator'
		}, {
			label: 'Cut',
			accelerator: 'CmdOrCtrl+X',
			role: 'cut'
		}, {
			label: 'Copy',
			accelerator: 'CmdOrCtrl+C',
			role: 'copy'
		}, {
			label: 'Paste',
			accelerator: 'CmdOrCtrl+V',
			role: 'paste'
		}, {
			label: 'Select All',
			accelerator: 'CmdOrCtrl+A',
			role: 'selectall'
		} ]
	}, {
		label: 'View',
		submenu: [ {
			label: 'Font Size',
			submenu: [ {
				label: 'Bigger',
				accelerator: 'CommandOrControl+=', // doh: https://github.com/atom/electron/issues/1507
				click: function( item, focusedWindow ) {
					if ( focusedWindow ) {
						focusedWindow.webContents.send( 'appCommand', { action: 'fontSizeBigger' } );
					}
				}
			}, {
				label: 'Smaller',
				accelerator: 'CmdOrCtrl+-',
				click: function( item, focusedWindow ) {
					if ( focusedWindow ) {
						focusedWindow.webContents.send( 'appCommand', { action: 'fontSizeSmaller' } );
					}
				}
			}, {
				label: 'Reset',
				accelerator: 'CmdOrCtrl+0',
				click: function( item, focusedWindow ) {
					if ( focusedWindow ) {
						focusedWindow.webContents.send( 'appCommand', { action: 'fontSizeReset' } );
					}
				}
			} ]
		}, {
			label: 'Sort Order',
			submenu: [ {
				label: 'Date Updated'
			}, {
				label: 'Alphabetical'
			} ]
		}, {
			label: 'Theme',
			submenu: [ {
				label: 'Light',
				click: function( item, focusedWindow ) {
					if ( focusedWindow ) {
						focusedWindow.webContents.send( 'appCommand', { action: 'setLightThemeActive' } );
					}
				}
			}, {
				label: 'Dark',
				click: function( item, focusedWindow ) {
					if ( focusedWindow ) {
						focusedWindow.webContents.send( 'appCommand', { action: 'setDarkThemeActive' } );
					}
				}
			} ]
		}, {
			label: 'Toggle Full Screen',
			accelerator: ( function() {
				if ( process.platform === 'darwin' ) {
					return 'Ctrl+Command+F';
				}
				return 'F11';
			} )(),
			click( item, focusedWindow ) {
				if ( focusedWindow ) {
					focusedWindow.setFullScreen( !focusedWindow.isFullScreen() );
				}
			}
		} ]
	}, {
		label: 'Window',
		role: 'window',
		submenu: [ {
			label: 'Minimize',
			accelerator: 'CmdOrCtrl+M',
			role: 'minimize'
		}, {
			label: 'Close',
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
