import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export class Dialog extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    title: PropTypes.string,
    onDone: PropTypes.func.isRequired,
  };

  render() {
    const { className, title, children, onDone } = this.props;

    return (
      <div
        className={classNames(
          className,
          'dialog--box theme-color-bg theme-color-fg theme-color-border'
        )}
      >
        {title &&
          onDone && (
            <div className="dialog-title-bar theme-color-border">
              <div className="dialog-title-side" />
              <h2 className="dialog-title-text">{title}</h2>
              <div className="dialog-title-side">
                {!!onDone && (
                  <button
                    type="button"
                    className="button button-borderless"
                    onClick={onDone}
                  >
                    Done
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
