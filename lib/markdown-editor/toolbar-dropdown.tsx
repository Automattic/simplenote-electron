import React, {
  ElementType,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { ChevronDownIcon } from './toolbar-icons';

type ToolbarDropdownItemProps = {
  active?: boolean;
  disabled?: boolean;
  icon: ElementType;
  label: string;
  onClick: () => void;
};

export const ToolbarDropdownItem = ({
  active,
  disabled,
  icon: Icon,
  label,
  onClick,
}: ToolbarDropdownItemProps) => (
  <button
    aria-label={label}
    className={[
      'markdown-editor-toolbar-dropdown__item',
      active ? 'is-active' : '',
    ]
      .filter(Boolean)
      .join(' ')}
    disabled={disabled}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    role="menuitem"
    type="button"
  >
    <span className="markdown-editor-toolbar-dropdown__item-icon">
      <Icon />
    </span>
    <span className="markdown-editor-toolbar-dropdown__item-label">
      {label}
    </span>
  </button>
);

type ToolbarDropdownProps = {
  active?: boolean;
  disabled?: boolean;
  icon: ElementType;
  label: string;
  title?: string;
  children: (close: () => void) => React.ReactNode;
};

type MenuPosition = {
  left: number;
  top: number;
};

export function ToolbarDropdown({
  active,
  disabled,
  icon: Icon,
  label,
  title = label,
  children,
}: ToolbarDropdownProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) {
        return;
      }

      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({
        left: rect.left,
        top: rect.bottom + 4,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="markdown-editor-toolbar-dropdown">
      <button
        ref={triggerRef}
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className={[
          'markdown-editor-button',
          'markdown-editor-toolbar-dropdown__trigger',
          active ? 'is-active' : '',
          open ? 'is-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-active-state={active ? 'on' : 'off'}
        data-size="small"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
        title={title}
        type="button"
      >
        <span className="markdown-editor-button-icon">
          <Icon />
        </span>
        <span className="markdown-editor-button-icon">
          <ChevronDownIcon className="markdown-editor-toolbar-dropdown__chevron" />
        </span>
      </button>
      {open &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className="markdown-editor-toolbar-dropdown__menu"
            id={menuId}
            role="menu"
            style={{ left: menuPosition.left, top: menuPosition.top }}
          >
            {children(close)}
          </div>,
          document.body
        )}
    </div>
  );
}
