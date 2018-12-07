import { get, has, noop } from 'lodash';
import exportNotes from './export-notes';
import exportToZip from './to-zip';

let fs = null;
const foundElectron = has(window, 'process.type');

if (foundElectron) {
  fs = __non_webpack_require__('fs'); // eslint-disable-line no-undef
}

const exportZipArchive = filename => {
  return exportNotes()
    .then(exportToZip)
    .then(zip =>
      zip.generateAsync({
        compression: 'DEFLATE',
        platform: get(window, 'process.platform', 'DOS'),
        type: 'base64',
      })
    )
    .then(blob => fs.writeFile(filename, blob, 'base64', noop))
    .catch(console.log); // eslint-disable-line no-console
};

export default exportZipArchive;
