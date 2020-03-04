import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import {
  BlockEditorKeyboardShortcuts,
  BlockEditorProvider,
  BlockList,
  WritingFlow,
} from '@wordpress/block-editor';
import {
  getBlockTypes,
  parse,
  rawHandler,
  serialize,
  unregisterBlockType,
} from '@wordpress/blocks';
import { SlotFillProvider } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { registerCoreBlocks } from '@wordpress/block-library';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  content: string;
};

type Props = StateProps;

registerCoreBlocks();

const allowedBlockTypes = new Set([
  'core/paragraph',
  'core/heading',
  'core/quote',
  'core/list',
  'core/code',
  'core/preformatted',
  'core/separator',
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

  if (blocks.length === 0) {
    setBlocks(
      content
        .split('\n\n')
        .reduce((bs, s) => bs.concat(rawHandler({ HTML: s })), [])
    );
  }

  return (
    <div className="editor-styles-wrapper">
      <SlotFillProvider>
        <BlockEditorProvider
          value={blocks}
          onInput={setBlocks}
          onChange={blocks => saveNote(serialize(blocks))}
          settings={{}}
        >
          <BlockEditorKeyboardShortcuts />
          <WritingFlow>
            <BlockList />
          </WritingFlow>
        </BlockEditorProvider>
      </SlotFillProvider>
    </div>
  );
};

const mapStateToProps: S.MapState<StateProps> = state => ({
  content: state.ui.note?.data?.content || '',
  noteId: state.ui.note?.id,
});

export default connect(mapStateToProps)(GutenbergEditor);
