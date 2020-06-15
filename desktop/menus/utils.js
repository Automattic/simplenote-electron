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
  return (item, focusedWindow) => {
    if (focusedWindow) {
      focusedWindow.webContents.send('appCommand', arg);
    }
  };
};

module.exports = {
  buildRadioGroup,
  appCommandSender,
};
