import React, { ElementType, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { SKIP_DOM_SELECTION_TAG, type LexicalEditor } from 'lexical';
import { Tooltip } from '@mui/material';

import ChecklistIcon from '../../icons/check-list';
import { CmdOrCtrl } from '../../utils/platform';
import {
  deleteTableColumn,
  deleteTableRow,
  dispatchFormatText,
  dispatchToolbarTab,
  getLinkHrefFromSelection,
  getImageSrcFromSelection,
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
} from './commands';
import { LinkUrlInput } from './link-url-input';
import { toggleListAtSelection } from '../list-toggle';
import { ToolbarDropdown, ToolbarDropdownItem } from './dropdown';
import { useCompactToolbar } from './hooks';
import { readToolbarState, useToolbarState } from './state';
import { bindToolbarUrlPanel } from './register';
import {
  $restoreSelectionSnapshot,
  snapshotSelection,
  type UrlPanelSelectionSnapshot,
} from './url-panel-selection';

export {
  $restoreSelectionSnapshot,
  snapshotSelection,
} from './url-panel-selection';

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
  TextFormatIcon,
  UndoIcon,
} from './icons';

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
  const urlPanelSelectionRef = useRef<UrlPanelSelectionSnapshot | null>(null);
  const linkInputEditingRef = useRef(false);

  const blockDisabled = state.inTitle || state.inTable;
  const urlInputOpen = linkInputUrl !== null || imageInputUrl !== null;

  const clearUrlPanelSelection = () => {
    urlPanelSelectionRef.current = null;
  };

  const restoreUrlPanelSelection = ({
    skipDomSelection = true,
  }: {
    skipDomSelection?: boolean;
  } = {}) => {
    const snapshot = urlPanelSelectionRef.current;
    if (!snapshot) {
      return true;
    }

    let restored = false;
    editor.update(
      () => {
        restored = $restoreSelectionSnapshot(snapshot);
      },
      skipDomSelection
        ? { discrete: true, tag: SKIP_DOM_SELECTION_TAG }
        : { discrete: true }
    );
    return restored;
  };

  const openLinkInput = () => {
    urlPanelSelectionRef.current = snapshotSelection(editor);
    setImageInputUrl(null);
    linkInputEditingRef.current = readToolbarState(editor).link;
    setLinkInputUrl(getLinkHrefFromSelection(editor) ?? 'https://');
  };

  const closeLinkInput = () => {
    linkInputEditingRef.current = false;
    setLinkInputUrl(null);
    clearUrlPanelSelection();
  };

  const cancelLinkInput = () => {
    restoreUrlPanelSelection({ skipDomSelection: false });
    closeLinkInput();
  };

  const openImageInput = () => {
    urlPanelSelectionRef.current = snapshotSelection(editor);
    setLinkInputUrl(null);
    setImageInputUrl(getImageSrcFromSelection(editor) ?? 'https://');
  };

  const closeImageInput = () => {
    setImageInputUrl(null);
    clearUrlPanelSelection();
  };

  const cancelImageInput = () => {
    restoreUrlPanelSelection({ skipDomSelection: false });
    closeImageInput();
  };

  useEffect(() => {
    return bindToolbarUrlPanel(editor, {
      getSnapshot: () => urlPanelSelectionRef.current,
      onSelectionChanged: () => {
        setLinkInputUrl(null);
        setImageInputUrl(null);
        clearUrlPanelSelection();
      },
    });
  }, [editor]);

  const applyLink = (url: string) => {
    if (!restoreUrlPanelSelection()) {
      closeLinkInput();
      return;
    }

    setLink(editor, url);
    closeLinkInput();
  };

  const removeLink = () => {
    if (!restoreUrlPanelSelection()) {
      closeLinkInput();
      return;
    }

    setLink(editor, '');
    closeLinkInput();
  };

  const applyImage = (url: string) => {
    if (!restoreUrlPanelSelection()) {
      closeImageInput();
      return;
    }

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
        onCancel={cancelLinkInput}
        onRemove={linkInputEditingRef.current ? removeLink : undefined}
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
        onCancel={cancelImageInput}
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

  const renderInlineFormatButtons = () => (
    <>
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
    </>
  );

  const renderCoreFormatButtons = () => (
    <ToolbarGroup>
      {renderInlineFormatButtons()}
      {!compact && (
        <ToolbarButton
          active={state.code}
          icon={CodeIcon}
          onClick={() => dispatchFormatText(editor, 'code')}
          title="Inline code"
        />
      )}
      <ToolbarButton
        active={state.link || linkInputUrl !== null}
        icon={LinkIcon}
        onClick={openLinkInput}
        title="Link"
      />
      <ToolbarButton
        active={state.inImage || imageInputUrl !== null}
        icon={ImageIcon}
        onClick={openImageInput}
        title="Image"
      />
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

  const renderTableDropdownItems = (close: () => void) => (
    <>
      <ToolbarDropdownItem
        icon={InsertTableRowAboveIcon}
        label="Insert row above"
        onClick={() => {
          insertTableRowAbove(editor);
          close();
        }}
      />
      <ToolbarDropdownItem
        icon={InsertTableRowBelowIcon}
        label="Insert row below"
        onClick={() => {
          insertTableRowBelow(editor);
          close();
        }}
      />
      <ToolbarDropdownItem
        icon={DeleteTableRowIcon}
        label="Delete row"
        onClick={() => {
          deleteTableRow(editor);
          close();
        }}
      />
      <ToolbarDropdownItem
        icon={InsertTableColumnBeforeIcon}
        label="Insert column before"
        onClick={() => {
          insertTableColumnBefore(editor);
          close();
        }}
      />
      <ToolbarDropdownItem
        icon={InsertTableColumnAfterIcon}
        label="Insert column after"
        onClick={() => {
          insertTableColumnAfter(editor);
          close();
        }}
      />
      <ToolbarDropdownItem
        icon={DeleteTableColumnIcon}
        label="Delete column"
        onClick={() => {
          deleteTableColumn(editor);
          close();
        }}
      />
    </>
  );

  const formatDropdownActive =
    state.h1 ||
    state.h2 ||
    state.h3 ||
    state.h4 ||
    state.code ||
    state.blockquote;

  const listDropdownIcon =
    state.activeList === 'orderedList'
      ? OrderedListIcon
      : state.activeList === 'taskList'
        ? ChecklistIcon
        : BulletListIcon;

  const renderCompactToolbar = () => (
    <div className="markdown-editor-toolbar__main">
      {renderHistoryButtons()}
      <ToolbarSeparator />
      <ToolbarGroup>{renderInlineFormatButtons()}</ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarDropdown
        active={formatDropdownActive}
        disabled={blockDisabled}
        icon={TextFormatIcon}
        label="Formatting"
        title="Block formatting"
      >
        {(close) => (
          <>
            <ToolbarDropdownItem
              active={state.h1}
              disabled={blockDisabled}
              icon={() => <HeadingIcon level={1} />}
              label="Heading 1"
              onClick={() => {
                toggleHeading(editor, 1);
                close();
              }}
            />
            <ToolbarDropdownItem
              active={state.h2}
              disabled={blockDisabled}
              icon={() => <HeadingIcon level={2} />}
              label="Heading 2"
              onClick={() => {
                toggleHeading(editor, 2);
                close();
              }}
            />
            <ToolbarDropdownItem
              active={state.h3}
              disabled={blockDisabled}
              icon={() => <HeadingIcon level={3} />}
              label="Heading 3"
              onClick={() => {
                toggleHeading(editor, 3);
                close();
              }}
            />
            <ToolbarDropdownItem
              active={state.h4}
              disabled={blockDisabled}
              icon={() => <HeadingIcon level={4} />}
              label="Heading 4"
              onClick={() => {
                toggleHeading(editor, 4);
                close();
              }}
            />
            <ToolbarDropdownItem
              active={state.code}
              icon={CodeIcon}
              label="Inline code"
              onClick={() => {
                dispatchFormatText(editor, 'code');
                close();
              }}
            />
            <ToolbarDropdownItem
              active={state.blockquote}
              disabled={blockDisabled}
              icon={BlockquoteIcon}
              label="Quote"
              onClick={() => {
                toggleBlockquote(editor);
                close();
              }}
            />
            <ToolbarDropdownItem
              active={state.inHorizontalRule}
              disabled={blockDisabled}
              icon={HorizontalRuleIcon}
              label="Horizontal rule"
              onClick={() => {
                insertHorizontalRule(editor);
                close();
              }}
            />
          </>
        )}
      </ToolbarDropdown>
      <ToolbarSeparator />
      <ToolbarGroup>
        <ToolbarButton
          active={state.link || linkInputUrl !== null}
          icon={LinkIcon}
          onClick={openLinkInput}
          title="Link"
        />
        <ToolbarButton
          active={state.inImage || imageInputUrl !== null}
          icon={ImageIcon}
          onClick={openImageInput}
          title="Image"
        />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarDropdown
        active={state.activeList !== null}
        disabled={blockDisabled}
        icon={listDropdownIcon}
        label="Lists"
        title="List formatting"
      >
        {(close) => (
          <>
            <ToolbarDropdownItem
              active={state.activeList === 'bulletList'}
              disabled={blockDisabled}
              icon={BulletListIcon}
              label="Bullet list"
              onClick={() => {
                toggleListAtSelection(editor, 'bulletList');
                close();
              }}
            />
            <ToolbarDropdownItem
              active={state.activeList === 'orderedList'}
              disabled={blockDisabled}
              icon={OrderedListIcon}
              label="Numbered list"
              onClick={() => {
                toggleListAtSelection(editor, 'orderedList');
                close();
              }}
            />
            <ToolbarDropdownItem
              active={state.activeList === 'taskList'}
              disabled={blockDisabled}
              icon={ChecklistIcon}
              label="Task list"
              onClick={() => {
                toggleListAtSelection(editor, 'taskList');
                close();
              }}
            />
          </>
        )}
      </ToolbarDropdown>
      <ToolbarSeparator />
      <ToolbarButton
        active={state.codeBlock}
        disabled={blockDisabled}
        icon={CodeBlockIcon}
        onClick={() => toggleCodeBlock(editor)}
        title="Code block"
      />
      {state.inTable ? (
        <ToolbarDropdown active icon={TableIcon} label="Table" title="Table">
          {(close) => renderTableDropdownItems(close)}
        </ToolbarDropdown>
      ) : (
        <ToolbarButton
          disabled={blockDisabled}
          icon={TableIcon}
          onClick={() => insertTable(editor)}
          title="Insert table"
        />
      )}
      {renderTouchTabButtons()}
    </div>
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
        active={state.inHorizontalRule}
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
    <>
      <div
        ref={setToolbarEl}
        aria-disabled={disabled || undefined}
        aria-label="Markdown formatting"
        className={[
          'markdown-editor-toolbar',
          compact ? 'is-compact' : '',
          disabled ? 'is-disabled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-variant="fixed"
        role="toolbar"
      >
        {compact ? renderCompactToolbar() : renderFullToolbar()}
        {urlInputOpen && (
          <div className="markdown-editor-toolbar__url-input">
            {linkInputUrl !== null ? renderLinkInput() : renderImageInput()}
          </div>
        )}
      </div>
    </>
  );
};
