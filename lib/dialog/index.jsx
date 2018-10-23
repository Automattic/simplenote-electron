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

  storeBox = ref => (this.box = ref);

  storeContent = ref => (this.content = ref);

  render() {
    const { className, title, children, onDone } = this.props;
    const titleElementId = `dialog-title-${title}`;

    return (
      <div
        ref={this.storeBox}
        className={classNames(
          className,
          'dialog--box theme-color-bg theme-color-fg theme-color-border'
        )}
      >
        {title &&
          onDone && (
            <div className="dialog-title-bar theme-color-border">
              <div className="dialog-title-side" />
              <h2 id={titleElementId} className="dialog-title-text">
                {title}
              </h2>
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

        <div ref={this.storeContent} className="dialog-content">
          {children}
        </div>
      </div>
    );
  }
}

export default Dialog;
