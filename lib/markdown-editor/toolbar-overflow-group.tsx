import React, { useEffect, useId, useRef, useState } from 'react';

type Props = {
  active?: boolean;
  children: (close: () => void) => React.ReactNode;
  label: string;
};

export function ToolbarOverflowGroup({ active, children, label }: Props) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="markdown-editor-toolbar-overflow" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className={[
          'markdown-editor-button',
          'markdown-editor-toolbar-overflow__trigger',
          active ? 'is-active' : '',
          open ? 'is-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-active-state={active ? 'on' : 'off'}
        data-size="small"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="markdown-editor-toolbar-overflow__label">{label}</span>
      </button>
      {open && (
        <div
          className="markdown-editor-toolbar-overflow__menu"
          id={menuId}
          role="menu"
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}
