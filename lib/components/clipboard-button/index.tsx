import React, { useEffect, useRef, useState } from 'react';
import Clipboard from 'clipboard';

type Props = {
  container?: React.RefObject<HTMLElement>;
  linkText: string;
  text: string;
};

function ClipboardButton({ container, linkText, text }: Props) {
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
      container: container?.current || undefined,
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

export default ClipboardButton;
