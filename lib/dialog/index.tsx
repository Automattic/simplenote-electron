import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

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
            <div className="dialog-title-side" />
            <h2 className="dialog-title-text">{title}</h2>
            <div className="dialog-title-side">
              {!!onDone && (
                <button
                  type="button"
                  aria-label="Close dialog"
                  className="button button-borderless"
                  onClick={onDone}
                >
                  {closeBtnLabel}
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
