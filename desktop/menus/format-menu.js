const { editorCommandSender } = require('./utils');

const buildFormatMenu = (isAuthenticated, editMode) => {
  isAuthenticated = isAuthenticated || false;
  editMode = editMode || false;
  const submenu = [
    {
      label: 'Insert &Checklist',
      accelerator: 'CommandOrControl+Shift+C',
      click: editorCommandSender({ action: 'insertChecklist' }),
      enabled: editMode,
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
