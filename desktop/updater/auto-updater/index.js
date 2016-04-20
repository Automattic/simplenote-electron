'use strict';

/**
 * External Dependencies
 */
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const electron = require( 'electron' );
const autoUpdater = electron.autoUpdater;
const dialog = electron.dialog;

/**
 * Internal dependencies
 */
const AppQuit = require( '../..//app-quit' );

function AutoUpdater( url ) {
	this.hasPrompted = false;
	this.url = url;

	autoUpdater.on( 'error', () => this.emit( 'end' ) );
	autoUpdater.on( 'update-not-available', () => this.emit( 'end' ) );
	autoUpdater.on( 'update-downloaded', this.onDownloaded.bind( this ) );

	try {
		autoUpdater.setFeedURL( url );
	} catch (e) {
		console.log( e.message );
	}
}

util.inherits(AutoUpdater, EventEmitter);

AutoUpdater.prototype.ping = function() {
	autoUpdater.checkForUpdates();
};

AutoUpdater.prototype.onDownloaded = function( event, releaseNotes, releaseName, releaseDate, updateUrl, quitAndUpdate ) {
	const updateDialogOptions = {
		buttons: [ 'Update & Restart', 'Cancel' ],
		title: 'Update Available',
		message: releaseName,
		detail: releaseNotes
	};

	if ( this.hasPrompted === false ) {
		this.hasPrompted = true;

		dialog.showMessageBox( updateDialogOptions, button => {
			this.hasPrompted = false;

			if ( button === 0 ) {
				AppQuit.allowQuit();
				quitAndUpdate();
			} else {
				this.emit( 'end' );
			}
		} );
	}
};

module.exports = AutoUpdater;
