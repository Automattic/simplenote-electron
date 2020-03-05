import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import {
  BlockEditorKeyboardShortcuts,
  BlockEditorProvider,
  BlockList,
  ObserveTyping,
  WritingFlow,
} from '@wordpress/block-editor';
import {
  getBlockTypes,
  parse,
  rawHandler,
  serialize,
  unregisterBlockType,
} from '@wordpress/blocks';
import {
  DropZoneProvider,
  Popover,
  SlotFillProvider,
} from '@wordpress/components';
import '@wordpress/editor';
import { useState } from '@wordpress/element';
import { registerCoreBlocks } from '@wordpress/block-library';
import '@wordpress/format-library';

import * as S from '../state';

type StateProps = {
  content: string;
};

type Props = StateProps;

registerCoreBlocks();
import './formulas';

const allowedBlockTypes = new Set([
  'core/paragraph',
  'core/heading',
  'core/quote',
  'core/list',
  'core/code',
  'core/preformatted',
  'core/separator',
  'dmsnell/formula',
]);

getBlockTypes()
  .filter(({ name }) => !allowedBlockTypes.has(name))
  .forEach(({ name }) => unregisterBlockType(name));

export const GutenbergEditor: FunctionComponent<Props> = ({
  content,
  noteId,
  saveNote,
}) => {
  const [oldId, setOldId] = useState(noteId);
  const [blocks, setBlocks] = useState(parse(content));

  if (oldId !== noteId) {
    setOldId(noteId);
    setBlocks(parse(content));
  }

  if (content.length > 0 && blocks.length === 0) {
    setBlocks(
      content
        .split('\n\n')
        .reduce((bs, s) => bs.concat(rawHandler({ HTML: s })), [])
    );
  }

  return (
    <SlotFillProvider>
      <DropZoneProvider>
        <BlockEditorProvider
          value={blocks}
          onInput={setBlocks}
          onChange={blocks => saveNote(serialize(blocks))}
          settings={{}}
        >
          <div className="editor-styles-wrapper">
            <Popover.Slot name="block-toolbar" />
            <BlockEditorKeyboardShortcuts />
            <WritingFlow>
              <ObserveTyping>
                <BlockList />
              </ObserveTyping>
            </WritingFlow>
          </div>
          <Popover.Slot />
        </BlockEditorProvider>
      </DropZoneProvider>
    </SlotFillProvider>
  );
};

const mapStateToProps: S.MapState<StateProps> = state => ({
  content: state.ui.note?.data?.content || '',
  noteId: state.ui.note?.id,
});

export default connect(mapStateToProps)(GutenbergEditor);
