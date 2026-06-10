import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
} from 'lexical';

import { registerMarkdownOnChange, REMOTE_CONTENT_TAG } from './extensions';

function appendParagraph(
  editor: ReturnType<typeof createEditor>,
  text: string
) {
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(text));
      $getRoot().append(paragraph);
    },
    { discrete: true }
  );
}

describe('registerMarkdownOnChange', () => {
  let editor: ReturnType<typeof createEditor>;
  let onChange: jest.Mock;

  beforeEach(() => {
    editor = createEditor({
      onError: (error) => {
        throw error;
      },
    });
    onChange = jest.fn();
    registerMarkdownOnChange(editor, onChange);
  });

  it('serializes the document on content updates', () => {
    appendParagraph(editor, 'hello');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('hello');

    appendParagraph(editor, 'world');
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith('hello\n\nworld');
  });

  it('ignores remote-tagged updates', () => {
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('remote'));
        $getRoot().append(paragraph);
      },
      { discrete: true, tag: REMOTE_CONTENT_TAG }
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores updates without content changes', () => {
    appendParagraph(editor, 'hello');
    onChange.mockClear();

    // A selection-only update marks no nodes dirty.
    editor.update(
      () => {
        $getRoot().selectEnd();
      },
      { discrete: true }
    );

    expect(onChange).not.toHaveBeenCalled();
  });
});
