import { has } from 'lodash';

let state = {
	isRunningElectron: null
};
init();

function init() {
	const getBoundElectronOpener = () => {
		const shell = window.require( 'electron' ).shell;
		return shell.openExternal.bind( shell );
	}

	const isRunningElectron = window && has( window, 'process.versions.electron' );
	const openExternalUrl = isRunningElectron
		? getBoundElectronOpener()
		: window.open.bind( window );

	state = { ...state, isRunningElectron, openExternalUrl };
}

export const viewExternalUrl = url => state.openExternalUrl( url );
