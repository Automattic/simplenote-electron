'use strict';

/**
 * External Dependencies
 */
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const electron = require( 'electron' );
const https = require( 'https' );

const dialog = electron.dialog;
const shell = electron.shell;

function ManualUpdater( url ) {
	this.hasPrompted = false;
	this.url = url;
}

util.inherits( ManualUpdater, EventEmitter );

ManualUpdater.prototype.ping = function() {
	https.get( this.url, response => {
		let body = '';

		if ( response.statusCode !== 200 ) {
			this.emit( 'end' );
		}

		response.on( 'data', chunk => body += chunk );
		response.on( 'end', () => {
			if ( body ) {
				try {
					let update = JSON.parse( body );
					this.onAvailable( update );
				} catch ( e ) {
					this.emit( 'end' );
					console.log( e.message );
				}
			}
		} );
	} ).on( 'error', error => {
		this.emit( 'end' );
		console.log( error.message );
	} );
};

ManualUpdater.prototype.onAvailable = function( update ) {
	const updateDialogOptions = {
		buttons: [ 'Download', 'Cancel' ],
		title: 'Update Available',
		message: update.name,
		detail: update.notes + '\n\nYou will need to download and install the new version manually.'
	};

	if ( ! this.hasPrompted ) {
		this.hasPrompted = true;

		dialog.showMessageBox( updateDialogOptions, button => {
			this.hasPrompted = false;

			if ( button === 0 ) {
				shell.openExternal( update.url );
			}

			this.emit( 'end' );
		} );
	}
};

module.exports = ManualUpdater;
