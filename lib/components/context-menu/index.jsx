import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { isObject, pick } from 'lodash';

const toTemplateItem = ({ type: { displayName }, props }) => {
  switch (displayName) {
    case 'MenuItem':
      return pick(props, ['label', 'type', 'role']);

    case 'MenuSeparator':
      return { type: 'separator' };

    default:
      return null;
  }
};

export default ContextMenu = ({ children, currentWindow, Menu }) => {
  const [menu, setMenu] = useState(buildMenu(children));

  useEffect(() => {
    window.addEventListener('contextmenu', triggerMenu);
    return () => window.removeEventListener('contextmenu', triggerMenu);
  }, []);

  useEffect(() => {
    setMenu(buildMenu(children));
  }, [children]);

  const buildMenu = children => {
    const menuItems = React.Children.toArray(children);
    const template = menuItems.map(toTemplateItem).filter(isObject);
    return Menu.buildFromTemplate(template);
  };

  const triggerMenu = event => {
    event.preventDefault();

    if (
      !event.target.closest(
        'textarea, input, [contenteditable="true"], div.note-detail-markdown'
      )
    ) {
      return;
    }

    menu.popup({ window: currentWindow });
  };

  return null;
};

ContextMenu.propTypes = {
  children: PropTypes.node.isRequired,
  currentWindow: PropTypes.object.isRequired,
  Menu: PropTypes.object.isRequired,
};
