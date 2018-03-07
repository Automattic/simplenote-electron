import React, { Component } from 'react';
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

export class ContextMenu extends Component {
  constructor(...args) {
    super(...args);

    this.state = {
      menu: this.buildMenu(this.props.children),
    };
  }

  componentDidMount() {
    this.startListening();
  }

  componentWillReceiveProps(nextProps) {
    this.updateMenu(nextProps);
  }

  componentWillUnmount() {
    this.stopListening();
  }

  startListening = () =>
    window.addEventListener('contextmenu', this.triggerMenu);

  stopListening = () =>
    window.removeEventListener('contextmenu', this.triggerMenu);

  triggerMenu = event => {
    const { currentWindow } = this.props;
    const { menu } = this.state;

    event.preventDefault();

    if (
      !event.target.closest(
        'textarea, input, [contenteditable="true"], div.note-detail-markdown'
      )
    ) {
      return;
    }

    menu.popup(currentWindow);
  };

  buildMenu = children => {
    const { Menu } = this.props;
    const menuItems = React.Children.toArray(children);
    const template = menuItems.map(toTemplateItem).filter(isObject);

    return Menu.buildFromTemplate(template);
  };

  updateMenu = ({ children }) => {
    this.setState({
      menu: this.buildMenu(children),
    });
  };

  render() {
    return null;
  }
}

export const MenuItem = () => null;
MenuItem.displayName = 'MenuItem';

MenuItem.propTypes = {
  label: PropTypes.string,
  role: PropTypes.string,
  type: PropTypes.oneOf([
    'normal',
    'separator',
    'submenu',
    'checkbox',
    'radio',
  ]),
};

export const Separator = () => null;
Separator.displayName = 'MenuSeparator';
