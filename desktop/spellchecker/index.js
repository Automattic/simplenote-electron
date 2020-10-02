const SpellChecker = require('spellchecker');

const { ipcMain } = require('electron');

const startSpellchecker = (mainWindow) => {
  ipcMain.on('spellcheck', function (content) {
    mainWindow.webContents.send('spellcheckerChannel', {
      result: SpellChecker.checkSpellingAsync(content),
    });
  });
};

module.exports = startSpellchecker;
