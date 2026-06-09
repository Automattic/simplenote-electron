import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalIsTextContentEmpty } from '@lexical/react/useLexicalIsTextContentEmpty';

type Props = {
  text: string;
};

export default function EditorPlaceholder({ text }: Props) {
  const [editor] = useLexicalComposerContext();
  const isEmpty = useLexicalIsTextContentEmpty(editor);

  if (!isEmpty) {
    return null;
  }

  return <div className="lexical-md-editor__placeholder">{text}</div>;
}
