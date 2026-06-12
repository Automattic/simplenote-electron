import React, { ElementType, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { CAN_REDO_COMMAND, CAN_UNDO_COMMAND } from 'lexical';
import { Tooltip } from '@mui/material';

import ChecklistIcon from '../icons/check-list';
import {
  deleteTableColumn,
  deleteTableRow,
  dispatchFormatText,
  getLinkHrefFromSelection,
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
} from './editor-commands';
import { LinkUrlInput } from './link-url-input';
import { toggleListAtSelection } from './list-toggle';
import { readToolbarState, toolbarStateEqual } from './toolbar-state';

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
  InsertTableColumnAfterIcon,
  InsertTableColumnBeforeIcon,
  InsertTableRowAboveIcon,
  InsertTableRowBelowIcon,
  ItalicIcon,
  LinkIcon,
  OrderedListIcon,
  RedoIcon,
  StrikeIcon,
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
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [state, setState] = useState(() => readToolbarState(editor));
  const [linkInputUrl, setLinkInputUrl] = useState<string | null>(null);

  useEffect(() => {
    let rafId: number | null = null;

    const updateToolbar = () => {
      const nextState = readToolbarState(editor);

      setState((current) =>
        toolbarStateEqual(current, nextState) ? current : nextState
      );
    };

    const scheduleToolbarUpdate = () => {
      if (rafId !== null) {
        return;
      }

      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateToolbar();
      });
    };

    const unregisterUpdate = editor.registerUpdateListener(() => {
      scheduleToolbarUpdate();
    });

    const unregisterCanUndo = editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      1
    );

    const unregisterCanRedo = editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      1
    );

    updateToolbar();

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      unregisterUpdate();
      unregisterCanUndo();
      unregisterCanRedo();
    };
  }, [editor]);

  const blockDisabled = state.inTitle;

  const openLinkInput = () => {
    setLinkInputUrl(getLinkHrefFromSelection(editor) ?? 'https://');
  };

  const closeLinkInput = () => {
    setLinkInputUrl(null);
  };

  const applyLink = (url: string) => {
    setLink(editor, url);
    closeLinkInput();
  };

  return (
    <div
      aria-disabled={disabled || undefined}
      aria-label="Markdown formatting"
      className={`markdown-editor-toolbar${disabled ? ' is-disabled' : ''}`}
      data-variant="fixed"
      role="toolbar"
    >
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

      <ToolbarSeparator />

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
        <ToolbarButton
          active={state.link || linkInputUrl !== null}
          icon={LinkIcon}
          onClick={openLinkInput}
          title="Link"
        />
        {linkInputUrl !== null && (
          <LinkUrlInput
            initialUrl={linkInputUrl}
            onCancel={closeLinkInput}
            onSubmit={applyLink}
          />
        )}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
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
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
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
          title="Task list"
        />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
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
          disabled={blockDisabled || state.inTable}
          icon={TableIcon}
          onClick={() => insertTable(editor)}
          title="Insert table"
        />
      </ToolbarGroup>

      {state.inTable && (
        <>
          <ToolbarSeparator />
          <ToolbarGroup>
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
          </ToolbarGroup>
        </>
      )}
    </div>
  );
};
