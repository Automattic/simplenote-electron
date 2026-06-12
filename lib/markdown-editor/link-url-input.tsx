import React, { useEffect, useRef, useState } from 'react';

import CrossSmallIcon from '../icons/cross-small';

type Props = {
  initialUrl: string;
  onCancel: () => void;
  onSubmit: (url: string) => void;
};

export function LinkUrlInput({ initialUrl, onCancel, onSubmit }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = () => {
    onSubmit(url.trim());
  };

  return (
    <div className="markdown-editor-link-input">
      <input
        aria-label="Link URL"
        className="markdown-editor-link-input__field"
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
        placeholder="Paste or type a URL"
        ref={inputRef}
        spellCheck={false}
        type="text"
        value={url}
      />
      <button
        aria-label="Cancel"
        className="markdown-editor-link-input__cancel"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onCancel}
        type="button"
      >
        <CrossSmallIcon />
      </button>
    </div>
  );
}
