const { app } = require("electron");

const menuItems = require("./menu-items");
const build = require("../detect/build");

const macAppMenu = {
  label: app.name,
  submenu: [
    menuItems.about,
    ...(build.isMAS() ? [] : [menuItems.checkForUpdates]),
    { type: "separator" },
    menuItems.preferences,
    { type: "separator" },
    {
      role: "services",
      submenu: [],
    },
    { type: "separator" },
    { role: "hide" },
    { role: "hideothers" },
    { role: "unhide" },
    { type: "separator" },
    { role: "quit" },
  ],
};

module.exports = macAppMenu;
