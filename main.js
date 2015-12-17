var app = require( 'app' );	 // Module to control application life.
var Menu = require( 'menu' );
var BrowserWindow = require( 'browser-window' );	// Module to create native browser window.

module.exports = function main( url ) {
	// Report crashes to our server.
	require( 'crash-reporter' ).start();

	// Keep a global reference of the window object, if you don't, the window will
	// be closed automatically when the JavaScript object is GCed.
	var mainWindow = null;

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
	app.on( 'ready', function() {
		// Configure and set the application menu
		var menuTemplate = createMenuTemplate();
		var menu = Menu.buildFromTemplate( menuTemplate );
		Menu.setApplicationMenu( menu );

		// Create the browser window.
		mainWindow = new BrowserWindow( { width: 800, height: 600 } );

		// and load the index.html of the app.
		if ( typeof mainWindow.loadURL === 'function' ) {
			mainWindow.loadURL( url );
		} else {
			mainWindow.loadUrl( url );
		}

		// Open the devtools.
		mainWindow.openDevTools();

		// Emitted when the window is closed.
		mainWindow.on( 'closed', function() {
			// Dereference the window object, usually you would store windows
			// in an array if your app supports multi windows, this is the time
			// when you should delete the corresponding element.
			mainWindow = null;
		} );
	} );
};

function createMenuTemplate() {
	var menuTemplate = [ {
		label: 'Note',
		submenu: [ {
			label: 'New',
			accelerator: 'CmdOrCtrl+N'
		}, {
			label: 'Move to Trash',
			accelerator: 'CmdOrCtrl+Backspace'
		}, {
			label: 'Show Properties',
			accelerator: 'CmdOrCtrl+Alt+P'
		}, {
			type: 'separator'
		}, {
			label: 'Print',
			accelerator: 'CmdOrCtrl+P',
			click( item, focusedWindow ) {
				if ( focusedWindow ) {
					focusedWindow.print();
				}
			}
		} ]
	}, {
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
				label: 'Larger',
				accelerator: 'CommandOrControl+=', // doh: https://github.com/atom/electron/issues/1507
				click: function( /* item, focusedWindow */ ) {
					debugger;
					// TODO increase size of editor font-size
				}
			}, {
				label: 'Smaller',
				accelerator: 'CmdOrCtrl+-'
			}, {
				label: 'Reset',
				accelerator: 'CmdOrCtrl+0'
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
				label: 'Light'
			}, {
				label: 'Dark'
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
		}, {
			label: 'Toggle Developer Tools',
			accelerator: ( function() {
				if ( process.platform === 'darwin' ) {
					return 'Alt+Command+I';
				}
				return 'Ctrl+Shift+I';
			} )(),
			click( item, focusedWindow ) {
				if ( focusedWindow ) {
					focusedWindow.toggleDevTools();
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
	}, {
		label: 'Help',
		role: 'help',
		submenu: [ {
			label: 'Learn More',
			click: function() {
				require( 'shell' ).openExternal( 'http://simplenote.com/help' )
			}
		} ]
	} ];

	if ( process.platform === 'darwin' ) {
		var name = require( 'app' ).getName();

		menuTemplate.unshift( {
			label: name,
			submenu: [ {
				label: 'About ' + name,
				role: 'about'
			}, {
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
