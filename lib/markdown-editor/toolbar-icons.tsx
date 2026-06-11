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
