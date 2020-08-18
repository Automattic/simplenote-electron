const buildRadioGroup = ({ action, propName, settings }) => {
  return (item) => {
    const { id, ...props } = item;

    return {
      type: 'radio',
      checked: id === settings[propName],
      click: appCommandSender({
        action,
        [propName]: id,
      }),
      ...props,
    };
  };
};

const appCommandSender = (arg) => {
  return commandSender('appCommand', arg);
};

const editorCommandSender = (arg) => {
  return commandSender('editorCommand', arg);
};

const commandSender = (commandName, arg) => {
  return (item, focusedWindow) => {
    if (focusedWindow) {
      focusedWindow.webContents.send(commandName, arg);
    }
  };
};

module.exports = {
  buildRadioGroup,
  appCommandSender,
  editorCommandSender,
};
