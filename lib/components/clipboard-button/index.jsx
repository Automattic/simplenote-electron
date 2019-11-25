import React from 'react';
import PropTypes from 'prop-types';
import ReactDom from 'react-dom';
import Clipboard from 'clipboard';

function ClipboardButton({ text, disabled }) {
  const buttonRef = React.useRef();

  const textCallback = React.useRef();
  const successCallback = React.useRef();

  const onCopy = () => {
    setCopied(true);
  };

  const [isCopied, setCopied] = React.useState(false);

  // toggle the `isCopied` flag back to `false` after 4 seconds
  React.useEffect(() => {
    if (isCopied) {
      const confirmationTimeout = setTimeout(() => setCopied(false), 4000);
      return () => clearTimeout(confirmationTimeout);
    }
  }, [isCopied]);

  // update the callbacks on rerenders that change `text` or `onCopy`
  React.useEffect(() => {
    textCallback.current = () => text;
    successCallback.current = onCopy;
  }, [text, onCopy]);

  // create the `Clipboard` object on mount and destroy on unmount
  React.useEffect(() => {
    const buttonEl = ReactDom.findDOMNode(buttonRef.current);
    const clipboard = new Clipboard(buttonEl, {
      text: () => textCallback.current(),
    });
    clipboard.on('success', () => successCallback.current());

    return () => clipboard.destroy();
  }, []);

  return (
    <button
      ref={buttonRef}
      disabled={disabled}
      type="button"
      className="button button-borderless"
    >
      {isCopied ? 'Copied!' : 'Copy'}
    </button>
  );
}

ClipboardButton.propTypes = {
  disbaled: PropTypes.bool,
  text: PropTypes.string,
};

export default ClipboardButton;
