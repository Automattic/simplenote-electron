import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { isObject, pick } from 'lodash';
import { remote } from 'electron';
import spellchecker from 'spellchecker';

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
    const webContents = remote.getCurrentWebContents();
    webContents.on('context-menu', (event, params) => {
      this.updateMenu(this.props.children, params.misspelledWord);
      this.triggerMenu(event);
    });
  }

  componentWillReceiveProps(nextProps) {
    this.updateMenu(nextProps.children);
  }

  componentWillUnmount() {
    this.stopListening();
  }

  startListening = () =>
    window.addEventListener('contextmenu', this.verifyMenuShouldShow);

  stopListening = () =>
    window.removeEventListener('contextmenu', this.verifyMenuShouldShow);

  verifyMenuShouldShow = event => {
    if (
      !event.target.closest(
        'textarea, input, [contenteditable="true"], div.note-detail-markdown'
      )
    ) {
      // Prevent the`context-menu` webContents callback from firing
      event.preventDefault();
      return;
    }
  };

  triggerMenu = () => {
    const { currentWindow } = this.props;
    const { menu } = this.state;

    menu.popup(currentWindow, { async: true });
  };

  buildMenu = (children, misspelledWord = '') => {
    const { Menu } = this.props;
    const webContents = remote.getCurrentWebContents();

    const menuItems = React.Children.toArray(children);
    const template = menuItems.map(toTemplateItem).filter(isObject);

    // Add spelling suggestions to the menu
    const suggestions = spellchecker.getCorrectionsForMisspelling(
      misspelledWord
    );

    if (suggestions && suggestions.length) {
      // Add a separator!
      template.unshift({ type: 'separator' });

      // Sort the suggestions and limit to 5 max
      const sortedSuggestions = suggestions.reverse().slice(0, 5);
      sortedSuggestions.forEach(suggestion => {
        let item = {
          label: suggestion,
          click: () => webContents.replaceMisspelling(suggestion),
        };

        template.unshift(item);
      });
    }

    return Menu.buildFromTemplate(template);
  };

  updateMenu = (children, misspelledWord) => {
    this.setState({
      menu: this.buildMenu(children, misspelledWord),
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
