// "type" must match the name of the React element
// "title" is required for accessibility (Will be read to screen readers)

const DialogTypes = {
  ABOUT: {
    type: 'About',
    title: 'About',
  },
  IMPORT: {
    type: 'Import',
    title: 'Import Notes',
  },
  SETTINGS: {
    type: 'Settings',
    title: 'Settings',
  },
  SHARE: {
    type: 'Share',
    title: 'Share',
  },
};

// Needs to be Node export so Electron menus can `require` it
module.exports = DialogTypes;
