const { appCommandSender } = require('./utils');

const submenu = [
  {
    label: 'Insert &Checklist',
    click: appCommandSender({ action: 'insertChecklist' }),
  },
];

const formatMenu = {
  label: 'F&ormat',
  submenu,
};

module.exports = formatMenu;
