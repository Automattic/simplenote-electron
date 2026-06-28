import React from 'react';
import Gridicon from 'gridicons';

type IconProps = { className?: string };

// The toolbar CSS (`.markdown-editor-button-icon svg`) sizes every glyph to
// 1.25rem and applies `fill: currentColor`, so the `size` here only sets the
// SVG's intrinsic 24×24 viewBox; the rendered size is driven by CSS.
const ICON_SIZE = 24;

const makeGridicon = (icon: string, displayName: string) => {
  const Icon = ({ className }: IconProps) => (
    <Gridicon icon={icon} size={ICON_SIZE} className={className} />
  );
  Icon.displayName = displayName;
  return Icon;
};

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

export const UndoIcon = makeGridicon('undo', 'UndoIcon');
export const RedoIcon = makeGridicon('redo', 'RedoIcon');
export const BoldIcon = makeGridicon('bold', 'BoldIcon');
export const ItalicIcon = makeGridicon('italic', 'ItalicIcon');
export const StrikeIcon = makeGridicon('strikethrough', 'StrikeIcon');
export const CodeIcon = makeGridicon('code', 'CodeIcon');
export const LinkIcon = makeGridicon('link', 'LinkIcon');
export const ImageIcon = makeGridicon('image', 'ImageIcon');
export const BulletListIcon = makeGridicon('list-unordered', 'BulletListIcon');
export const OrderedListIcon = makeGridicon('list-ordered', 'OrderedListIcon');
export const ChecklistIcon = makeGridicon('list-checkmark', 'ChecklistIcon');
export const BlockquoteIcon = makeGridicon('quote', 'BlockquoteIcon');
export const HorizontalRuleIcon = makeGridicon('minus', 'HorizontalRuleIcon');
export const TextFormatIcon = makeGridicon('types', 'TextFormatIcon');
export const ChevronDownIcon = makeGridicon('chevron-down', 'ChevronDownIcon');
export const TabIndentIcon = makeGridicon('indent-right', 'TabIndentIcon');
export const TabOutdentIcon = makeGridicon('indent-left', 'TabOutdentIcon');

export const HeadingIcon = ({
  className,
  level,
}: IconProps & { level: 1 | 2 | 3 | 4 }) => (
  <Gridicon icon={`heading-h${level}`} size={ICON_SIZE} className={className} />
);

// Tabler Icons (MIT): https://tabler.io/icons
// Gridicons has no table, code-block, or row/column manipulation glyphs.
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
    'M10 7l4 0',
  ],
  'InsertTableRowAboveIcon'
);

export const InsertTableRowBelowIcon = makeTablerStrokeIcon(
  [
    'M20 6v4a1 1 0 0 1 -1 1h-14a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h14a1 1 0 0 1 1 1',
    'M12 15l0 4',
    'M14 17l-4 0',
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
    'M5 12l4 0',
    'M7 10l0 4',
  ],
  'InsertTableColumnBeforeIcon'
);

export const InsertTableColumnAfterIcon = makeTablerStrokeIcon(
  [
    'M6 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-14a1 1 0 0 1 1 -1',
    'M15 12l4 0',
    'M17 10l0 4',
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

export const CodeBlockIcon = makeTablerStrokeIcon(
  [
    'M10 14l-2 -2l2 -2',
    'M14 10l2 2l-2 2',
    'M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
  ],
  'CodeBlockIcon'
);
