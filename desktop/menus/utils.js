const buildRadioGroup = ({ action, propName, settings }) => {
  return (item) => {
    const { id, ...props } = item;

    return {
      type: 'radio',
      checked: id === settings[propName],
      click: appCommandSender('appCommnad', {
        action,
        [propName]: id,
      }),
      ...props,
    };
  };
};

const appCommandSender = (commandName = 'appCommand', arg) => {
  return (item, focusedWindow) => {
    if (focusedWindow) {
      focusedWindow.webContents.send(commandName, arg);
    }
  };
};

module.exports = {
  buildRadioGroup,
  appCommandSender,
};
