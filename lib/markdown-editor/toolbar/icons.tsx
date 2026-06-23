import React from 'react';
import Gridicon from 'gridicons';

type IconProps = { className?: string };

// The toolbar CSS (`.markdown-editor-button-icon svg`) sizes every glyph to
// 1.125rem and applies `fill: currentColor`, so the `size` here only sets the
// SVG's intrinsic 24×24 viewBox; the rendered size is driven by CSS.
const ICON_SIZE = 24;

const makeTablerStrokeIcon = (paths: string[], displayName: string) => {
  const Icon = ({ className }: IconProps) => (
    <svg
      className={['toolbar-icon-stroke', className].filter(Boolean).join(' ')}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={ICON_SIZE}
      height={ICON_SIZE}
      aria-hidden
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
};

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
export const ImageIcon = makeIcon('image');
export const BulletListIcon = makeIcon('list-unordered');
export const OrderedListIcon = makeIcon('list-ordered');
export const BlockquoteIcon = makeIcon('quote');
export const HorizontalRuleIcon = makeIcon('minus');

export const TextFormatIcon = makeTablerStrokeIcon(
  ['M4 6l16 0', 'M4 12l10 0', 'M4 18l16 0'],
  'TextFormatIcon'
);

export const ChevronDownIcon = makeTablerStrokeIcon(
  ['M6 9l6 6l6 -6'],
  'ChevronDownIcon'
);

export const HeadingIcon = ({
  className,
  level,
}: IconProps & { level: 1 | 2 | 3 | 4 }) => (
  <Gridicon icon={`heading-h${level}`} size={ICON_SIZE} className={className} />
);

// Tabler Icons (MIT): https://tabler.io/icons
export const TableIcon = makeTablerStrokeIcon(
  [
    'M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14',
    'M3 10h18',
    'M10 3v18',
  ],
  'TableIcon'
);

export const InsertTableRowAboveIcon = makeTablerStrokeIcon(
  [
    'M4 18v-4a1 1 0 0 1 1 -1h14a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-14a1 1 0 0 1 -1 -1',
    'M12 9v-4',
    'M10 7h4',
  ],
  'InsertTableRowAboveIcon'
);

export const InsertTableRowBelowIcon = makeTablerStrokeIcon(
  [
    'M20 6v4a1 1 0 0 1 -1 1h-14a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h14a1 1 0 0 1 1 1',
    'M12 15v4',
    'M14 17h-4',
  ],
  'InsertTableRowBelowIcon'
);

export const DeleteTableRowIcon = makeTablerStrokeIcon(
  [
    'M20 6v4a1 1 0 0 1 -1 1h-14a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h14a1 1 0 0 1 1 1',
    'M10 16l4 4',
    'M10 20l4 -4',
  ],
  'DeleteTableRowIcon'
);

export const InsertTableColumnBeforeIcon = makeTablerStrokeIcon(
  [
    'M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-14a1 1 0 0 1 1 -1',
    'M5 12h4',
    'M7 10v4',
  ],
  'InsertTableColumnBeforeIcon'
);

export const InsertTableColumnAfterIcon = makeTablerStrokeIcon(
  [
    'M6 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-14a1 1 0 0 1 1 -1',
    'M15 12h4',
    'M17 10v4',
  ],
  'InsertTableColumnAfterIcon'
);

export const DeleteTableColumnIcon = makeTablerStrokeIcon(
  [
    'M6 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-14a1 1 0 0 1 1 -1',
    'M16 10l4 4',
    'M16 14l4 -4',
  ],
  'DeleteTableColumnIcon'
);

// Gridicons has no dedicated code-block glyph, so we draw one in the same visual
// language: the `</>` chevrons inside a rounded container to distinguish it from
// the inline-code button.
export const TabIndentIcon = makeTablerStrokeIcon(
  ['M11 6h10', 'M11 12h10', 'M11 18h10', 'M3 8l4 4', 'M7 12l-4 4'],
  'TabIndentIcon'
);

export const TabOutdentIcon = makeTablerStrokeIcon(
  ['M11 6h10', 'M11 12h10', 'M11 18h10', 'M7 8l-4 4', 'M3 12l4 4'],
  'TabOutdentIcon'
);

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
