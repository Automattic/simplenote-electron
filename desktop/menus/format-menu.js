const { editorCommandSender } = require('./utils');

const buildFormatMenu = (isAuthenticated) => {
  isAuthenticated = isAuthenticated || false;
  const submenu = [
    {
      label: 'Insert &Checklist',
      accelerator: 'CommandOrControl+Shift+C',
      click: editorCommandSender({ action: 'insertChecklist' }),
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
