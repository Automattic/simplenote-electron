import saveAs from 'file-saver';
import { get } from 'lodash';

import exportNotes from './export-notes';
import exportToZip from './to-zip';

const filename = 'notes.zip';

const exportZipArchive = () => {
  return exportNotes()
    .then(exportToZip)
    .then(zip =>
      zip.generateAsync({
        compression: 'DEFLATE',
        platform: get(window, 'process.platform', 'DOS'),
        type: 'blob',
      })
    )
    .then(blob => saveAs(blob, filename))
    .catch(console.log); // eslint-disable-line no-console
};

export default exportZipArchive;
