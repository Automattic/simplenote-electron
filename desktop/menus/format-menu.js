const { appCommandSender } = require('./utils');

const buildFormatMenu = (isAuthenticated) => {
  isAuthenticated = isAuthenticated || false;
  const submenu = [
    {
      label: 'Insert &Checklist',
      accelerator: 'CommandOrControl+Shift+C',
      click: appCommandSender({ action: 'insertChecklist' }),
    },
  ];

  const formatMenu = {
    label: 'F&ormat',
    submenu,
  };

  // we have nothing to show in this menu if not logged in
  return isAuthenticated ? formatMenu : null;
};

module.exports = buildFormatMenu;
