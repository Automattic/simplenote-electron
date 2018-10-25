// See for `acceptedTypes`:
// https://react-dropzone.netlify.com/#accepting-specific-file-types

const sources = [
  {
    name: 'Evernote',
    slug: 'evernote',
    acceptedTypes: '.enex',
    electronOnly: true,
    instructions: 'Choose an Evernote export file (.enex)',
  },
  {
    name: 'Simplenote',
    slug: 'simplenote',
    acceptedTypes: '.json',
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
