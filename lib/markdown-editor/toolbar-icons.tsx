import React from 'react';
import Gridicon from 'gridicons';

type IconProps = { className?: string };

// The toolbar CSS (`.markdown-editor-button-icon svg`) sizes every glyph to
// 1.125rem and applies `fill: currentColor`, so the `size` here only sets the
// SVG's intrinsic 24×24 viewBox; the rendered size is driven by CSS.
const ICON_SIZE = 24;

const makeIcon = (icon: string) => {
  const Icon = ({ className }: IconProps) => (
    <Gridicon icon={icon} size={ICON_SIZE} className={className} />
  );
  Icon.displayName = `ToolbarIcon(${icon})`;
  return Icon;
};

export const UndoIcon = makeIcon('undo');
export const RedoIcon = makeIcon('redo');
export const BoldIcon = makeIcon('bold');
export const ItalicIcon = makeIcon('italic');
export const StrikeIcon = makeIcon('strikethrough');
export const CodeIcon = makeIcon('code');
export const LinkIcon = makeIcon('link');
export const BulletListIcon = makeIcon('list-unordered');
export const OrderedListIcon = makeIcon('list-ordered');
export const BlockquoteIcon = makeIcon('quote');
export const HorizontalRuleIcon = makeIcon('minus');

export const HeadingIcon = ({
  className,
  level,
}: IconProps & { level: 2 | 3 | 4 }) => (
  <Gridicon icon={`heading-h${level}`} size={ICON_SIZE} className={className} />
);

// TODO: Find prettier table icons
export const TableIcon = ({ className }: IconProps) => (
  <svg
    className={['toolbar-icon-stroke', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={ICON_SIZE}
    height={ICON_SIZE}
    aria-hidden
  >
    <path d="M5 6h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 6" />
    <path d="M5 10.5h14" />
    <path d="M5 14.5h14" />
    <path d="M11.5 6v12" />
  </svg>
);

export const InsertTableRowAboveIcon = ({ className }: IconProps) => (
  <svg
    className={['toolbar-icon-stroke', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={ICON_SIZE}
    height={ICON_SIZE}
    aria-hidden
  >
    <path d="M5 14h14a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1" />
    <path d="M12 4v4" />
    <path d="M10 6h4" />
  </svg>
);

export const InsertTableRowBelowIcon = ({ className }: IconProps) => (
  <svg
    className={['toolbar-icon-stroke', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={ICON_SIZE}
    height={ICON_SIZE}
    aria-hidden
  >
    <path d="M5 6h14a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1" />
    <path d="M12 16v4" />
    <path d="M10 18h4" />
  </svg>
);

export const DeleteTableRowIcon = ({ className }: IconProps) => (
  <svg
    className={['toolbar-icon-stroke', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={ICON_SIZE}
    height={ICON_SIZE}
    aria-hidden
  >
    <path
      className="toolbar-icon-delete-shape"
      d="M3 8h4M17 8h4M3 16h4M17 16h4M3 8v8M21 8v8"
    />
    <rect
      className="toolbar-icon-delete-ring"
      height="10"
      rx="2"
      width="10"
      x="7"
      y="7"
    />
    <path className="toolbar-icon-delete-mark" d="M9.75 9.75 14.25 14.25" />
    <path className="toolbar-icon-delete-mark" d="M14.25 9.75 9.75 14.25" />
  </svg>
);

export const InsertTableColumnBeforeIcon = ({ className }: IconProps) => (
  <svg
    className={['toolbar-icon-stroke', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={ICON_SIZE}
    height={ICON_SIZE}
    aria-hidden
  >
    <path d="M14 5h5a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1" />
    <path d="M4 12h4" />
    <path d="M6 10v4" />
  </svg>
);

export const InsertTableColumnAfterIcon = ({ className }: IconProps) => (
  <svg
    className={['toolbar-icon-stroke', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={ICON_SIZE}
    height={ICON_SIZE}
    aria-hidden
  >
    <path d="M5 5h5a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1" />
    <path d="M16 12h4" />
    <path d="M18 10v4" />
  </svg>
);

export const DeleteTableColumnIcon = ({ className }: IconProps) => (
  <svg
    className={['toolbar-icon-stroke', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={ICON_SIZE}
    height={ICON_SIZE}
    aria-hidden
  >
    <path
      className="toolbar-icon-delete-shape"
      d="M8 3v4M8 17v4M16 3v4M16 17v4M8 3h8M8 21h8"
    />
    <rect
      className="toolbar-icon-delete-ring"
      height="10"
      rx="2"
      width="10"
      x="7"
      y="7"
    />
    <path className="toolbar-icon-delete-mark" d="M9.75 9.75 14.25 14.25" />
    <path className="toolbar-icon-delete-mark" d="M14.25 9.75 9.75 14.25" />
  </svg>
);

// Gridicons has no dedicated code-block glyph, so we draw one in the same visual
// language: the `</>` chevrons inside a rounded container to distinguish it from
// the inline-code button.
export const CodeBlockIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={ICON_SIZE}
    height={ICON_SIZE}
    fill="currentColor"
    aria-hidden
  >
    <path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v14h16V5H4z" />
    <path d="M10.6 8.5l-3.1 3.5 3.1 3.5-1.2 1-4-4.5 4-4.5 1.2 1zm2.8 0l1.2-1 4 4.5-4 4.5-1.2-1 3.1-3.5-3.1-3.5z" />
  </svg>
);
