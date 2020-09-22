// See for `acceptedTypes`:
// https://react-dropzone.netlify.com/#accepting-specific-file-types

const sources = [
  {
    name: 'Evernote',
    slug: 'evernote',
    acceptedTypes: '.enex',
    electronOnly: true,
    instructions: 'Choose an Evernote export file (.enex)',
    optionsHint: 'Images and other media will not be imported.',
  },
  {
    name: 'Simplenote',
    slug: 'simplenote',
    acceptedTypes: '.json',
    instructions: 'Choose a Simplenote export file (.json)',
  },
  {
    name: 'Plain text files',
    slug: 'plaintext',
    acceptedTypes: '.txt,.md',
    instructions: 'Choose one or more text files (.txt, .md)',
    multiple: true,
  },
];

export default sources;
