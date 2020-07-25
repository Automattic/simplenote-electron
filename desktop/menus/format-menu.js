const { appCommandSender } = require('./utils');

const buildFormatMenu = (isAuthenticated) => {
  isAuthenticated = isAuthenticated || false;
  const submenu = [
    {
      label: 'Insert &Checklist',
      click: appCommandSender({ action: 'insertChecklist' }),
    },
  ];

  const formatMenu = {
    label: 'F&ormat',
    submenu,
    visible: isAuthenticated,
  };

  return formatMenu;
};

module.exports = buildFormatMenu;
