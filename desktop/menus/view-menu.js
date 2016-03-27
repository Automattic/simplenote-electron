var buildViewMenu = function( settings ) {
	settings = settings || {};

	return {
		label: 'View',
			submenu: [ {
			label: 'Font Size',
			submenu: [ {
				label: 'Bigger',
				accelerator: 'CommandOrControl+=', // doh: https://github.com/atom/electron/issues/1507
				click: function( item, focusedWindow ) {
					if ( focusedWindow ) {
						focusedWindow.webContents.send( 'appCommand', { action: 'increaseFontSize' } );
					}
				}
			}, {
				label: 'Smaller',
				accelerator: 'CmdOrCtrl+-',
				click: function( item, focusedWindow ) {
					if ( focusedWindow ) {
						focusedWindow.webContents.send( 'appCommand', { action: 'decreaseFontSize' } );
					}
				}
			}, {
				label: 'Reset',
				accelerator: 'CmdOrCtrl+0',
				click: function( item, focusedWindow ) {
					if ( focusedWindow ) {
						focusedWindow.webContents.send( 'appCommand', { action: 'resetFontSize' } );
					}
				}
			} ]
		}, {
			label: 'Theme',
			submenu: [ {
				label: 'Light',
				type: 'radio',
				checked: settings.theme === 'light',
				click: function( item, focusedWindow ) {
					if ( focusedWindow ) {
						focusedWindow.webContents.send( 'appCommand', {
							action: 'activateTheme',
							theme: 'light'
						} );
					}
				}
			}, {
				label: 'Dark',
				type: 'radio',
				checked: settings.theme === 'dark',
				click: function( item, focusedWindow ) {
					if ( focusedWindow ) {
						focusedWindow.webContents.send( 'appCommand', {
							action: 'activateTheme',
							theme: 'dark'
						} );
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
	};
};

module.exports = buildViewMenu;
