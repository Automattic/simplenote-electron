jest.mock(
  'monaco-editor',
  () => {
    // note-content-editor reads monaco enums (OverviewRulerLane.Full, etc.) at
    // module load. A recursive proxy resolves any nested enum access to a stub
    // so the module imports without a real Monaco.
    const stub: any = new Proxy(function () {} as any, {
      get: (_t, prop) =>
        prop === Symbol.toPrimitive || prop === 'toString' ? () => '' : stub,
      apply: () => stub,
      construct: () => ({}),
    });
    return new Proxy({}, { get: () => stub });
  },
  // virtual: monaco-editor is installed but its package entry isn't resolvable
  // by jest, so without this the mock registration throws "Cannot find module".
  { virtual: true }
);

jest.mock('react-monaco-editor', () => ({
  __esModule: true,
  default: () => null,
}));

import { NoteContentEditor } from './note-content-editor';

// The regression in #3379 lives in componentDidUpdate: toggling markdown on an
// open note changes systemTags but neither remounts the editor nor edits
// content, so the decorators have to be recomputed from the update handler.
// These tests drive that handler directly, without standing up Monaco.
const makeInstance = (systemTags: string[]) => {
  const instance = Object.create(NoteContentEditor.prototype);
  instance.props = {
    noteId: 'note-1',
    note: { systemTags, content: '' },
    editorSelection: [0, 0, 'LTR'],
    searchQuery: '',
    selectedSearchMatchIndex: null,
    lineLength: 'narrow',
    isFocusMode: false,
  };
  instance.state = { editor: 'full' };
  instance.editor = null;
  instance.setDecorators = jest.fn();
  instance.warmMarkdownRendererIfNeeded = jest.fn();
  instance.setSearchSelection = jest.fn();
  return instance;
};

const prevPropsWith = (instance: any, systemTags: string[]) => ({
  ...instance.props,
  note: { ...instance.props.note, systemTags },
});

describe('NoteContentEditor markdown decoration refresh', () => {
  it('re-decorates when markdown is turned on for an open note', () => {
    const instance = makeInstance(['markdown']);
    instance.componentDidUpdate(prevPropsWith(instance, []));
    expect(instance.setDecorators).toHaveBeenCalledTimes(1);
  });

  it('re-decorates when markdown is turned off for an open note', () => {
    const instance = makeInstance([]);
    instance.componentDidUpdate(prevPropsWith(instance, ['markdown']));
    expect(instance.setDecorators).toHaveBeenCalledTimes(1);
  });

  it('does not re-decorate when systemTags and note are unchanged', () => {
    const instance = makeInstance(['markdown']);
    // Same prop references, as React passes when nothing relevant changed:
    // the systemTags array identity is what the update guard compares.
    instance.componentDidUpdate({ ...instance.props });
    expect(instance.setDecorators).not.toHaveBeenCalled();
  });
});
