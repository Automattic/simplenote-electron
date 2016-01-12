import has from 'lodash/object/has';

// Opens a url in a new window. If on electron, it will launch the browser
module.exports.viewExternalUrl = function( url ) {
	if ( ! window || ! url ) {
        return;
    }

    if ( has( window, 'process.versions.electron' ) ) {
        return window.require( 'shell' ).openExternal( url );
    }

    window.open( url );
}