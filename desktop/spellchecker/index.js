const SpellChecker = require('spellchecker');

const { ipcMain } = require('electron');

const startSpellchecker = (mainWindow) => {
  ipcMain.on('spellcheck', function (event, args) {
    mainWindow.webContents.send('spellcheckerChannel', {
      result: SpellChecker.checkSpellingAsync(args.note),
    });
  });
};

module.exports = startSpellchecker;
