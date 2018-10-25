// See for `acceptedTypes`:
// https://react-dropzone.netlify.com/#accepting-specific-file-types

const sources = [
  {
    name: 'Evernote',
    slug: 'evernote',
    instructions: 'Choose an Evernote export file (.enex)',
    acceptedTypes: '.enex',
  },
  {
    name: 'Simplenote',
    slug: 'simplenote',
    acceptedTypes: '.json',
  },
  {
    name: 'Plain text files',
    slug: 'plaintext',
    instructions:
      'Choose a .zip file containing plain text files. To add tags, lorem ipsum',
  },
];

export default sources;
