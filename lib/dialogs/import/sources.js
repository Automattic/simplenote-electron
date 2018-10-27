// See for `acceptedTypes`:
// https://react-dropzone.netlify.com/#accepting-specific-file-types

const sources = [
  {
    name: 'Evernote',
    slug: 'evernote',
    acceptedTypes: '.enex',
    electronOnly: true,
    instructions: 'Choose an Evernote export file (.enex).',
    optionsHint: 'Images and other media will not be imported.',
  },
  {
    name: 'Plain text files',
    slug: 'plaintext',
    acceptedTypes: '.txt',
    instructions: 'Choose one or more plain text files (.txt)',
    multiple: true,
  },
];

export default sources;
