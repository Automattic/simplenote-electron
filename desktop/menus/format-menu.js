const { appCommandSender } = require('./utils');

const submenu = [
  {
    label: 'Insert &Checklist',
    accelerator: 'CommandOrControl+Option+C',
    click: appCommandSender({ action: 'insertChecklist' }),
  },
];

const formatMenu = {
  label: 'F&ormat',
  submenu,
};

module.exports = formatMenu;
