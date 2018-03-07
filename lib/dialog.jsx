import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export class Dialog extends Component {
  static propTypes = {
    title: PropTypes.string,
    onDone: PropTypes.func,
  };

  componentDidMount() {
    this.previouslyActiveElement = document.activeElement;
    this.focusFirstInput(this.content);
    this.startListening();
  }

  componentWillUnmount() {
    this.stopListening();
    if (this.previouslyActiveElement) {
      this.previouslyActiveElement.focus();
      this.previouslyActiveElement = null;
    }
  }

  focusFirstInput = parent => {
    const input = this.queryAllEnabledControls(parent)[0];

    if (input) {
      input.focus();
    }
  };

  focusFirstInputEvent = () => this.focusFirstInput;

  focusLastInput = parent => {
    const inputs = this.queryAllEnabledControls(parent);
    const input = inputs[inputs.length - 1];

    if (input) {
      input.focus();
    }
  };

  focusLastInputEvent = () => this.focusLastInput();

  interceptClick = event => {
    if ('dialog' !== event.srcElement.getAttribute('role')) {
      return;
    }

    event.preventDefault();
    this.props.onDone();
  };

  queryAllEnabledControls = parent =>
    (parent || this.box).querySelectorAll(
      'button:enabled, input:enabled, textarea:enabled'
    );

  startListening = () => window.addEventListener('click', this.interceptClick);

  stopListening = () =>
    window.removeEventListener('click', this.interceptClick);

  storeBox = ref => (this.box = ref);

  storeContent = ref => (this.content = ref);

  render() {
    const { className, title, children, onDone } = this.props;
    const titleElementId = `dialog-title-${title}`;

    return (
      <div
        className={classNames('dialog', className)}
        role="dialog"
        aria-labelledby={titleElementId}
      >
        <input
          type="text"
          className="focus-guard"
          onFocus={this.focusLastInput}
        />

        <div
          ref={this.storeBox}
          className="dialog-box theme-color-bg theme-color-fg theme-color-border"
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

        <input
          type="text"
          className="focus-guard"
          onFocus={this.focusFirstInputEvent}
        />
      </div>
    );
  }
}

export default Dialog;
