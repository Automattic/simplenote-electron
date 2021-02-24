import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Clipboard from 'clipboard';

function ClipboardButton({ linkText, text }) {
  const buttonRef = useRef();
  const textCallback = useRef();
  const successCallback = useRef();

  const onCopy = () => {
    setCopied(true);
  };

  const [isCopied, setCopied] = useState(false);

  // toggle the `isCopied` flag back to `false` after 4 seconds
  useEffect(() => {
    if (isCopied) {
      const confirmationTimeout = setTimeout(() => setCopied(false), 4000);
      return () => clearTimeout(confirmationTimeout);
    }
  }, [isCopied]);

  // update the callbacks on rerenders that change `text` or `onCopy`
  useEffect(() => {
    textCallback.current = () => text;
    successCallback.current = onCopy;
  }, [text, onCopy]);

  // create the `Clipboard` object on mount and destroy on unmount
  useEffect(() => {
    const clipboard = new Clipboard(buttonRef.current, {
      text: () => textCallback.current(),
    });
    clipboard.on('success', () => successCallback.current());

    return () => clipboard.destroy();
  }, []);

  return (
    <button ref={buttonRef} type="button" className="button button-borderless">
      {isCopied ? 'Copied!' : linkText}
    </button>
  );
}

ClipboardButton.propTypes = {
  disabled: PropTypes.bool,
  linkText: PropTypes.string,
  text: PropTypes.string,
};

export default ClipboardButton;
