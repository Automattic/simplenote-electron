import JSZip from 'jszip';

export const noteExportToZip = notes => {
	const zip = new JSZip();

	notes
		.activeNotes
		.forEach(
			( { id, content } ) => zip.file( `${ id }.txt`, content )
		);

	notes
		.trashedNotes
		.forEach(
			( { id, content } ) => zip.file( `trash-${ id }.txt`, content )
		);

	return zip.generateAsync( { type: 'base64' } );
};

export default noteExportToZip;
