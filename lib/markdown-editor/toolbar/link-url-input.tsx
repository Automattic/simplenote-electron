import React, { useEffect, useId, useRef, useState } from 'react';

import CrossSmallIcon from '../../icons/cross-small';

type Props = {
  ariaLabel?: string;
  initialUrl: string;
  onCancel: () => void;
  onRemove?: () => void;
  onSubmit: (url: string) => void;
  placeholder?: string;
  validate?: (url: string) => boolean;
  validationMessage?: string;
};

// Inline URL editing avoids a blocking browser prompt and preserves the
// editor selection while the toolbar asks for the destination.
export function LinkUrlInput({
  ariaLabel = 'Link URL',
  initialUrl,
  onCancel,
  onRemove,
  onSubmit,
  placeholder = 'Paste or type a URL',
  validate,
  validationMessage = 'Enter a valid URL.',
}: Props) {
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showError, setShowError] = useState(false);
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = () => {
    const trimmed = url.trim();

    if (validate && !validate(trimmed)) {
      setShowError(true);
      return;
    }

    onSubmit(trimmed);
  };

  return (
    <div
      className={[
        'markdown-editor-link-input',
        onRemove ? 'markdown-editor-link-input--with-remove' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        aria-describedby={showError ? errorId : undefined}
        aria-label={ariaLabel}
        aria-invalid={showError || undefined}
        autoComplete="off"
        className="markdown-editor-link-input__field"
        onChange={(event) => {
          setUrl(event.target.value);
          setShowError(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
        placeholder={placeholder}
        ref={inputRef}
        spellCheck={false}
        type="text"
        value={url}
      />
      {onRemove && (
        <button
          className="markdown-editor-link-input__remove"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onRemove}
          type="button"
        >
          Remove link
        </button>
      )}
      <button
        className="markdown-editor-link-input__done"
        onMouseDown={(event) => event.preventDefault()}
        onClick={submit}
        type="button"
      >
        Done
      </button>
      <button
        aria-label="Cancel"
        className="markdown-editor-link-input__cancel"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onCancel}
        type="button"
      >
        <CrossSmallIcon />
      </button>
      {showError && (
        <span
          className="markdown-editor-link-input__error"
          id={errorId}
          role="alert"
        >
          {validationMessage}
        </span>
      )}
    </div>
  );
}
