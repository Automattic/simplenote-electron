const { remote } = require('electron');
const { ContextMenuBuilder } = require('electron-spellchecker');

const { MenuItem } = remote;

class CustomContextMenuBuilder extends ContextMenuBuilder {
  constructor(spellcheckHandler) {
    super(spellcheckHandler);
  }

  addCut(menu, menuInfo) {
    // always add undo, redo & separator before cut menuItem
    this.addUndo(menu, menuInfo);
    this.addRedo(menu, menuInfo);
    this.addSeparator(menu);

    super.addCut(menu, menuInfo);
  }

  // Using role 'undo/redo' ignores/overrides enabled option
  addUndo(menu, menuInfo) {
    let target = this.getWebContents();

    const undoMenuItem = new MenuItem({
      label: 'Undo',
      enabled: menuInfo.editFlags.canUndo,
      click() {
        target.undo();
      },
    });

    menu.append(undoMenuItem);
  }

  addRedo(menu, menuInfo) {
    let target = this.getWebContents();

    const redoMenuItem = new MenuItem({
      label: 'Redo',
      enabled: menuInfo.editFlags.canRedo,
      click() {
        target.redo();
      },
    });

    menu.append(redoMenuItem);
  }
}

module.exports = CustomContextMenuBuilder;
