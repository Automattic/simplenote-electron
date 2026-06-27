import { $getSelection, $isRangeSelection } from 'lexical';

import { makeGfmTestEditor } from './markdown/gfm-test-helpers';
import { selectAll } from './toolbar/commands';

describe('selectAll', () => {
  it('selects the full note content', () => {
    const editor = makeGfmTestEditor('Hello\n\nWorld');

    selectAll(editor);

    editor.read(() => {
      const selection = $getSelection();

      expect($isRangeSelection(selection)).toBe(true);
      expect(selection?.isCollapsed()).toBe(false);
      expect(selection?.getTextContent()).toContain('Hello');
      expect(selection?.getTextContent()).toContain('World');
    });
  });
});
