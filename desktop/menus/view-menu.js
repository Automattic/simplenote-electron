var buildRadioGroup = function( activePredicate ) {
	return function( item ) {
		var label  = item[ 0 ],
			prop   = item[ 1 ],
			action = item[ 2 ];

		return {
			label: label,
			type: 'radio',
			checked: activePredicate( prop ),
			click: function( item, focusedWindow ) {
				if ( ! focusedWindow ) { return; }

				focusedWindow.webContents.send( 'appCommand', action );
			}
		};
	};
};

var buildFontGroup = function( item ) {
	var label       = item[0],
		accelerator = item[1],
		action      = item[2];

	return {
		label: label,
		accelerator: accelerator,
		click: function( item, focusedWindow ) {
			if ( ! focusedWindow ) { return; }

			focusedWindow.webContents.send( 'appCommand', { action: action } );
		}
	};
};

var equalTo = function( a ) {
	return function( b ) {
		return a === b;
	};
};

var buildViewMenu = function( settings ) {
	settings = settings || {};

	return {
		label: '&View',
		submenu: [ {
			label: '&Font Size',
			submenu: [
				// For the oddity with "Command" vs "Cmd"
				// Cite: https://github.com/atom/electron/issues/1507
				[ '&Bigger', 'CommandOrControl+=', 'increaseFontSize' ],
				[ '&Smaller', 'CommandOrControl+-', 'decreaseFontSize' ],
				[ '&Reset', 'CommandOrControl+0', 'resetFontSize' ]
			].map( buildFontGroup )
		}, {
			label: '&Sort Type',
			submenu: [
				[ 'Last &modified', 'modificationDate', { action: 'setSortType', sortType: 'modificationDate' } ],
				[ 'Last &created', 'creationDate', { action: 'setSortType', sortType: 'creationDate' } ],
				[ '&Alphabetical', 'alphabetical', { action: 'setSortType', sortType: 'alphabetical' } ]
			].map( buildRadioGroup( equalTo( settings.sortType ) ) ).concat( [ {
				type: 'separator'
			}, {
				label: '&Reversed',
				type: 'checkbox',
				checked: settings.sortReversed,
				click: function( item, focusedWindow ) {
					if ( ! focusedWindow ) { return; }

					focusedWindow.webContents.send( 'appCommand', {
						action: 'toggleSortOrder'
					} );
				}
			} ] )
		}, {
			label: '&Note Display',
			submenu: [
				[ '&Comfy', 'comfy', { action: 'setNoteDisplay', noteDisplay: 'comfy' } ],
				[ 'C&ondensed', 'condensed', { action: 'setNoteDisplay', noteDisplay: 'condensed' } ],
				[ '&Expanded', 'expanded', { action: 'setNoteDisplay', noteDisplay: 'expanded' } ]
			].map( buildRadioGroup( equalTo( settings.noteDisplay ) ) )
		}, {
			label: '&Theme',
			submenu: [
				[ '&Light', 'light', { action: 'activateTheme', theme: 'light' } ],
				[ '&Dark', 'dark', { action: 'activateTheme', theme: 'dark' } ]
			].map( buildRadioGroup( equalTo( settings.theme ) ) )
		}, {
			label: 'T&oggle Full Screen',
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
