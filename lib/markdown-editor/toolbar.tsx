import React, { ElementType, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { CAN_REDO_COMMAND, CAN_UNDO_COMMAND } from 'lexical';
import { Tooltip } from '@mui/material';

import ChecklistIcon from '../icons/check-list';
import { CmdOrCtrl } from '../utils/platform';
import {
  deleteTableColumn,
  deleteTableRow,
  dispatchFormatText,
  dispatchToolbarTab,
  getLinkHrefFromSelection,
  insertImage,
  insertHorizontalRule,
  insertTable,
  insertTableColumnAfter,
  insertTableColumnBefore,
  insertTableRowAbove,
  insertTableRowBelow,
  redo,
  setLink,
  toggleBlockquote,
  toggleCodeBlock,
  toggleHeading,
  undo,
  normalizeImageSourceInput,
} from './editor-commands';
import { LinkUrlInput } from './link-url-input';
import { toggleListAtSelection } from './list-toggle';
import { ToolbarOverflowGroup } from './toolbar-overflow-group';
import { useCompactToolbar } from './toolbar-hooks';
import { useToolbarState } from './toolbar-state';

import {
  BlockquoteIcon,
  BoldIcon,
  BulletListIcon,
  CodeBlockIcon,
  CodeIcon,
  HeadingIcon,
  DeleteTableColumnIcon,
  DeleteTableRowIcon,
  HorizontalRuleIcon,
  ImageIcon,
  InsertTableColumnAfterIcon,
  InsertTableColumnBeforeIcon,
  InsertTableRowAboveIcon,
  InsertTableRowBelowIcon,
  ItalicIcon,
  LinkIcon,
  OrderedListIcon,
  RedoIcon,
  StrikeIcon,
  TabIndentIcon,
  TabOutdentIcon,
  TableIcon,
  UndoIcon,
} from './toolbar-icons';

type ToolbarButtonProps = {
  active?: boolean;
  disabled?: boolean;
  icon: ElementType;
  onClick: () => void;
  title: string;
};

const ToolbarButton = ({
  active,
  disabled,
  icon: Icon,
  onClick,
  title,
}: ToolbarButtonProps) => (
  <Tooltip
    classes={{ tooltip: 'icon-button__tooltip' }}
    enterDelay={200}
    title={title}
  >
    <span>
      <button
        aria-label={title}
        aria-pressed={active}
        className={`markdown-editor-button${active ? ' is-active' : ''}`}
        data-active-state={active ? 'on' : 'off'}
        data-size="small"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
        type="button"
      >
        <span className="markdown-editor-button-icon">
          <Icon />
        </span>
      </button>
    </span>
  </Tooltip>
);

type ToolbarMenuButtonProps = ToolbarButtonProps & {
  onMenuClose: () => void;
};

const ToolbarMenuButton = ({
  onMenuClose,
  onClick,
  ...props
}: ToolbarMenuButtonProps) => (
  <ToolbarButton
    {...props}
    onClick={() => {
      onClick();
      onMenuClose();
    }}
  />
);

const ToolbarSeparator = () => (
  <div className="markdown-editor-separator" role="separator" />
);

const ToolbarGroup = ({ children }: { children: React.ReactNode }) => (
  <div className="markdown-editor-toolbar-group">{children}</div>
);

type Props = {
  disabled?: boolean;
};

export const MarkdownEditorToolbar: React.FunctionComponent<Props> = ({
  disabled = false,
}) => {
  const [editor] = useLexicalComposerContext();
  const { canRedo, canUndo, state } = useToolbarState(editor);
  const [toolbarEl, setToolbarEl] = useState<HTMLElement | null>(null);
  const compact = useCompactToolbar(toolbarEl);
  const [linkInputUrl, setLinkInputUrl] = useState<string | null>(null);
  const [imageInputUrl, setImageInputUrl] = useState<string | null>(null);

  const blockDisabled = state.inTitle || state.inTable;
  const urlInputOpen = linkInputUrl !== null || imageInputUrl !== null;
  const showUrlPanel = compact && urlInputOpen;

  const openLinkInput = () => {
    setImageInputUrl(null);
    setLinkInputUrl(getLinkHrefFromSelection(editor) ?? 'https://');
  };

  const closeLinkInput = () => {
    setLinkInputUrl(null);
  };

  const openImageInput = () => {
    setLinkInputUrl(null);
    setImageInputUrl('https://');
  };

  const closeImageInput = () => {
    setImageInputUrl(null);
  };

  const applyLink = (url: string) => {
    setLink(editor, url);
    closeLinkInput();
  };

  const applyImage = (url: string) => {
    if (insertImage(editor, url)) {
      closeImageInput();
    }
  };

  const renderLinkInput = () => {
    if (linkInputUrl === null) {
      return null;
    }

    return (
      <LinkUrlInput
        initialUrl={linkInputUrl}
        onCancel={closeLinkInput}
        onSubmit={applyLink}
      />
    );
  };

  const renderImageInput = () => {
    if (imageInputUrl === null) {
      return null;
    }

    return (
      <LinkUrlInput
        ariaLabel="Image URL"
        initialUrl={imageInputUrl}
        onCancel={closeImageInput}
        onSubmit={applyImage}
        placeholder="Paste or type an image URL"
        validate={(url) => normalizeImageSourceInput(url) !== null}
        validationMessage="Use a public HTTPS image URL."
      />
    );
  };

  const renderHistoryButtons = () => (
    <ToolbarGroup>
      <ToolbarButton
        disabled={!canUndo}
        icon={UndoIcon}
        onClick={() => undo(editor)}
        title="Undo"
      />
      <ToolbarButton
        disabled={!canRedo}
        icon={RedoIcon}
        onClick={() => redo(editor)}
        title="Redo"
      />
    </ToolbarGroup>
  );

  const renderCoreFormatButtons = () => (
    <ToolbarGroup>
      <ToolbarButton
        active={state.bold}
        icon={BoldIcon}
        onClick={() => dispatchFormatText(editor, 'bold')}
        title="Bold"
      />
      <ToolbarButton
        active={state.italic}
        icon={ItalicIcon}
        onClick={() => dispatchFormatText(editor, 'italic')}
        title="Italic"
      />
      {!compact && (
        <>
          <ToolbarButton
            active={state.strike}
            icon={StrikeIcon}
            onClick={() => dispatchFormatText(editor, 'strikethrough')}
            title="Strikethrough"
          />
          <ToolbarButton
            active={state.code}
            icon={CodeIcon}
            onClick={() => dispatchFormatText(editor, 'code')}
            title="Inline code"
          />
        </>
      )}
      <ToolbarButton
        active={state.link || linkInputUrl !== null}
        icon={LinkIcon}
        onClick={openLinkInput}
        title="Link"
      />
      <ToolbarButton
        active={imageInputUrl !== null}
        icon={ImageIcon}
        onClick={openImageInput}
        title="Image"
      />
      {!compact && renderLinkInput()}
      {!compact && renderImageInput()}
    </ToolbarGroup>
  );

  const renderTouchTabButtons = () => {
    if (!compact) {
      return null;
    }

    return (
      <>
        <ToolbarSeparator />
        <ToolbarGroup>
          <ToolbarButton
            icon={TabIndentIcon}
            onClick={() => dispatchToolbarTab(editor, false)}
            title="Indent"
          />
          <ToolbarButton
            icon={TabOutdentIcon}
            onClick={() => dispatchToolbarTab(editor, true)}
            title="Outdent"
          />
        </ToolbarGroup>
      </>
    );
  };

  const renderHeadingButtons = () => (
    <>
      <ToolbarButton
        active={state.h1}
        disabled={blockDisabled}
        icon={() => <HeadingIcon level={1} />}
        onClick={() => toggleHeading(editor, 1)}
        title="Heading 1"
      />
      <ToolbarButton
        active={state.h2}
        disabled={blockDisabled}
        icon={() => <HeadingIcon level={2} />}
        onClick={() => toggleHeading(editor, 2)}
        title="Heading 2"
      />
      <ToolbarButton
        active={state.h3}
        disabled={blockDisabled}
        icon={() => <HeadingIcon level={3} />}
        onClick={() => toggleHeading(editor, 3)}
        title="Heading 3"
      />
      <ToolbarButton
        active={state.h4}
        disabled={blockDisabled}
        icon={() => <HeadingIcon level={4} />}
        onClick={() => toggleHeading(editor, 4)}
        title="Heading 4"
      />
    </>
  );

  const renderHeadingMenuButtons = (close: () => void) => (
    <>
      <ToolbarMenuButton
        active={state.h1}
        disabled={blockDisabled}
        icon={() => <HeadingIcon level={1} />}
        onClick={() => toggleHeading(editor, 1)}
        onMenuClose={close}
        title="Heading 1"
      />
      <ToolbarMenuButton
        active={state.h2}
        disabled={blockDisabled}
        icon={() => <HeadingIcon level={2} />}
        onClick={() => toggleHeading(editor, 2)}
        onMenuClose={close}
        title="Heading 2"
      />
      <ToolbarMenuButton
        active={state.h3}
        disabled={blockDisabled}
        icon={() => <HeadingIcon level={3} />}
        onClick={() => toggleHeading(editor, 3)}
        onMenuClose={close}
        title="Heading 3"
      />
      <ToolbarMenuButton
        active={state.h4}
        disabled={blockDisabled}
        icon={() => <HeadingIcon level={4} />}
        onClick={() => toggleHeading(editor, 4)}
        onMenuClose={close}
        title="Heading 4"
      />
    </>
  );

  const renderListButtons = () => (
    <>
      <ToolbarButton
        active={state.activeList === 'bulletList'}
        disabled={blockDisabled}
        icon={BulletListIcon}
        onClick={() => toggleListAtSelection(editor, 'bulletList')}
        title="Bullet list"
      />
      <ToolbarButton
        active={state.activeList === 'orderedList'}
        disabled={blockDisabled}
        icon={OrderedListIcon}
        onClick={() => toggleListAtSelection(editor, 'orderedList')}
        title="Numbered list"
      />
      <ToolbarButton
        active={state.activeList === 'taskList'}
        disabled={blockDisabled}
        icon={ChecklistIcon}
        onClick={() => toggleListAtSelection(editor, 'taskList')}
        title={`Insert Checklist • ${CmdOrCtrl}+Shift+C`}
      />
    </>
  );

  const renderListMenuButtons = (close: () => void) => (
    <>
      <ToolbarMenuButton
        active={state.activeList === 'bulletList'}
        disabled={blockDisabled}
        icon={BulletListIcon}
        onClick={() => toggleListAtSelection(editor, 'bulletList')}
        onMenuClose={close}
        title="Bullet list"
      />
      <ToolbarMenuButton
        active={state.activeList === 'orderedList'}
        disabled={blockDisabled}
        icon={OrderedListIcon}
        onClick={() => toggleListAtSelection(editor, 'orderedList')}
        onMenuClose={close}
        title="Numbered list"
      />
      <ToolbarMenuButton
        active={state.activeList === 'taskList'}
        disabled={blockDisabled}
        icon={ChecklistIcon}
        onClick={() => toggleListAtSelection(editor, 'taskList')}
        onMenuClose={close}
        title={`Insert Checklist • ${CmdOrCtrl}+Shift+C`}
      />
    </>
  );

  const renderBlockButtons = () => (
    <>
      <ToolbarButton
        active={state.blockquote}
        disabled={blockDisabled}
        icon={BlockquoteIcon}
        onClick={() => toggleBlockquote(editor)}
        title="Blockquote"
      />
      <ToolbarButton
        active={state.codeBlock}
        disabled={blockDisabled}
        icon={CodeBlockIcon}
        onClick={() => toggleCodeBlock(editor)}
        title="Code block"
      />
      <ToolbarButton
        disabled={blockDisabled}
        icon={HorizontalRuleIcon}
        onClick={() => insertHorizontalRule(editor)}
        title="Horizontal rule"
      />
      <ToolbarButton
        active={state.inTable}
        disabled={blockDisabled}
        icon={TableIcon}
        onClick={() => insertTable(editor)}
        title="Insert table"
      />
    </>
  );

  const renderBlockMenuButtons = (close: () => void) => (
    <>
      <ToolbarMenuButton
        active={state.blockquote}
        disabled={blockDisabled}
        icon={BlockquoteIcon}
        onClick={() => toggleBlockquote(editor)}
        onMenuClose={close}
        title="Blockquote"
      />
      <ToolbarMenuButton
        active={state.codeBlock}
        disabled={blockDisabled}
        icon={CodeBlockIcon}
        onClick={() => toggleCodeBlock(editor)}
        onMenuClose={close}
        title="Code block"
      />
      <ToolbarMenuButton
        disabled={blockDisabled}
        icon={HorizontalRuleIcon}
        onClick={() => insertHorizontalRule(editor)}
        onMenuClose={close}
        title="Horizontal rule"
      />
      <ToolbarMenuButton
        active={state.inTable}
        disabled={blockDisabled}
        icon={TableIcon}
        onClick={() => insertTable(editor)}
        onMenuClose={close}
        title="Insert table"
      />
    </>
  );

  const renderTableButtons = () => (
    <>
      <ToolbarButton
        icon={InsertTableRowAboveIcon}
        onClick={() => insertTableRowAbove(editor)}
        title="Insert row above"
      />
      <ToolbarButton
        icon={InsertTableRowBelowIcon}
        onClick={() => insertTableRowBelow(editor)}
        title="Insert row below"
      />
      <ToolbarButton
        icon={DeleteTableRowIcon}
        onClick={() => deleteTableRow(editor)}
        title="Delete row"
      />
      <ToolbarButton
        icon={InsertTableColumnBeforeIcon}
        onClick={() => insertTableColumnBefore(editor)}
        title="Insert column before"
      />
      <ToolbarButton
        icon={InsertTableColumnAfterIcon}
        onClick={() => insertTableColumnAfter(editor)}
        title="Insert column after"
      />
      <ToolbarButton
        icon={DeleteTableColumnIcon}
        onClick={() => deleteTableColumn(editor)}
        title="Delete column"
      />
    </>
  );

  const renderTableMenuButtons = (close: () => void) => (
    <>
      <ToolbarMenuButton
        icon={InsertTableRowAboveIcon}
        onClick={() => insertTableRowAbove(editor)}
        onMenuClose={close}
        title="Insert row above"
      />
      <ToolbarMenuButton
        icon={InsertTableRowBelowIcon}
        onClick={() => insertTableRowBelow(editor)}
        onMenuClose={close}
        title="Insert row below"
      />
      <ToolbarMenuButton
        icon={DeleteTableRowIcon}
        onClick={() => deleteTableRow(editor)}
        onMenuClose={close}
        title="Delete row"
      />
      <ToolbarMenuButton
        icon={InsertTableColumnBeforeIcon}
        onClick={() => insertTableColumnBefore(editor)}
        onMenuClose={close}
        title="Insert column before"
      />
      <ToolbarMenuButton
        icon={InsertTableColumnAfterIcon}
        onClick={() => insertTableColumnAfter(editor)}
        onMenuClose={close}
        title="Insert column after"
      />
      <ToolbarMenuButton
        icon={DeleteTableColumnIcon}
        onClick={() => deleteTableColumn(editor)}
        onMenuClose={close}
        title="Delete column"
      />
    </>
  );

  const renderCompactToolbar = () => (
    <div className="markdown-editor-toolbar__main">
      {renderHistoryButtons()}
      <ToolbarSeparator />
      {renderCoreFormatButtons()}
      {renderTouchTabButtons()}
      <ToolbarSeparator />
      <ToolbarOverflowGroup active={state.strike || state.code} label="Style">
        {(close) => (
          <>
            <ToolbarMenuButton
              active={state.strike}
              icon={StrikeIcon}
              onClick={() => dispatchFormatText(editor, 'strikethrough')}
              onMenuClose={close}
              title="Strikethrough"
            />
            <ToolbarMenuButton
              active={state.code}
              icon={CodeIcon}
              onClick={() => dispatchFormatText(editor, 'code')}
              onMenuClose={close}
              title="Inline code"
            />
          </>
        )}
      </ToolbarOverflowGroup>
      <ToolbarOverflowGroup
        active={state.h1 || state.h2 || state.h3 || state.h4}
        label="Heading"
      >
        {(close) => renderHeadingMenuButtons(close)}
      </ToolbarOverflowGroup>
      <ToolbarOverflowGroup active={state.activeList !== null} label="List">
        {(close) => renderListMenuButtons(close)}
      </ToolbarOverflowGroup>
      <ToolbarOverflowGroup
        active={state.blockquote || state.codeBlock || state.inTable}
        label="Block"
      >
        {(close) => renderBlockMenuButtons(close)}
      </ToolbarOverflowGroup>
      {state.inTable && (
        <ToolbarOverflowGroup active label="Table">
          {(close) => renderTableMenuButtons(close)}
        </ToolbarOverflowGroup>
      )}
    </div>
  );

  const renderFullToolbar = () => (
    <div className="markdown-editor-toolbar__main">
      {renderHistoryButtons()}
      <ToolbarSeparator />
      {renderCoreFormatButtons()}
      {renderTouchTabButtons()}
      <ToolbarSeparator />
      <ToolbarGroup>{renderHeadingButtons()}</ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>{renderListButtons()}</ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>{renderBlockButtons()}</ToolbarGroup>
      {state.inTable && (
        <>
          <ToolbarSeparator />
          <ToolbarGroup>{renderTableButtons()}</ToolbarGroup>
        </>
      )}
    </div>
  );

  return (
    <div
      ref={setToolbarEl}
      aria-disabled={disabled || undefined}
      aria-label="Markdown formatting"
      className={[
        'markdown-editor-toolbar',
        compact ? 'is-compact' : '',
        showUrlPanel ? 'is-url-input-open' : '',
        disabled ? 'is-disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-variant="fixed"
      role="toolbar"
    >
      {compact ? renderCompactToolbar() : renderFullToolbar()}
      {showUrlPanel && (
        <div className="markdown-editor-toolbar__url-input">
          {renderLinkInput()}
          {renderImageInput()}
        </div>
      )}
    </div>
  );
};
