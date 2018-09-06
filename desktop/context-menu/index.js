const { ContextMenuListener } = require('electron-spellchecker');

// We are using a custom ContextMenuBuilder and SpellcheckHandler to become more flexible
const ContextMenuBuilder = require('./context-menu-builder');
const SpellCheckHandler = require('./spellcheck-handler');

window.spellCheckHandler = new SpellCheckHandler(5);

// Avoid an error on Windows and Linx when body is not yet available
window.onload = () => {
  window.spellCheckHandler.attachToInput();
};
window.spellCheckHandler.switchLanguage(navigator.language);

let contextMenuBuilder = new ContextMenuBuilder(window.spellCheckHandler);
// eslint-disable-next-line no-unused-vars
let contextMenuListener = new ContextMenuListener(info => {
  if (info.inputFieldType === 'none' && !info.isEditable) return;

  contextMenuBuilder.showPopupMenu(info);
});
