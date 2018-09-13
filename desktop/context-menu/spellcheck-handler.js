const { SpellCheckHandler } = require('electron-spellchecker');

class CustomSpellCheckHandler extends SpellCheckHandler {
  constructor(correctionsLimit) {
    super();

    this.correctionsLimit =
      !isNaN(parseFloat(correctionsLimit)) && isFinite(correctionsLimit)
        ? correctionsLimit
        : 5;
  }

  async getCorrectionsForMisspelling(text) {
    const corrections = await super.getCorrectionsForMisspelling(text);

    return corrections.slice(0, this.correctionsLimit);
  }
}

module.exports = CustomSpellCheckHandler;
