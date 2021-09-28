import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import CrossIconSmall from '../icons/cross-small';

export class Dialog extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    closeBtnLabel: PropTypes.string,
    hideTitleBar: PropTypes.bool,
    title: PropTypes.string,
    onDone: PropTypes.func,
  };

  render() {
    const {
      className,
      closeBtnLabel = 'Done',
      hideTitleBar,
      title,
      children,
      onDone,
    } = this.props;

    return (
      <div
        className={classNames(
          className,
          'dialog theme-color-bg theme-color-fg theme-color-border'
        )}
      >
        {!hideTitleBar && (
          <div className="dialog-title-bar theme-color-border">
            <h2 className="dialog-title-text">{title}</h2>
            <div className="dialog-title-side">
              {!!onDone && (
                <button
                  type="button"
                  aria-label="Close dialog"
                  className="button"
                  onClick={onDone}
                >
                  <CrossIconSmall />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="dialog-content">{children}</div>
      </div>
    );
  }
}

export default Dialog;
