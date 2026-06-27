import {
  clearNotePositions,
  getNotePosition,
  getNoteViewState,
  setNotePosition,
  setNoteViewState,
} from './note-scroll-position';

beforeEach(() => {
  sessionStorage.clear();
});

describe('note-scroll-position', () => {
  it('reads legacy numeric entries through getNotePosition', () => {
    setNotePosition('note-1', 240);

    expect(getNotePosition('note-1')).toBe(240);
    expect(getNoteViewState('note-1')).toEqual({ scrollTop: 240 });
  });

  it('reads scroll and structured selection from object entries', () => {
    setNoteViewState('note-1', {
      scrollTop: 300,
      structuredSelection: {
        anchor: { rootIndex: 0, path: [], textOffset: 2 },
        focus: { rootIndex: 0, path: [], textOffset: 2 },
        direction: 'LTR',
      },
      localMarkdown: 'hello',
    });

    expect(getNotePosition('note-1')).toBe(300);
    expect(getNoteViewState('note-1')).toEqual({
      scrollTop: 300,
      structuredSelection: {
        anchor: { rootIndex: 0, path: [], textOffset: 2 },
        focus: { rootIndex: 0, path: [], textOffset: 2 },
        direction: 'LTR',
      },
      localMarkdown: 'hello',
    });
  });

  it('merges scrollTop into an existing object without touching selection', () => {
    setNoteViewState('note-1', {
      scrollTop: 100,
      structuredSelection: {
        anchor: { rootIndex: 0, path: [], textOffset: 1 },
        focus: { rootIndex: 0, path: [], textOffset: 1 },
        direction: 'LTR',
      },
      localMarkdown: 'hello',
      localTexts: { anchor: 'hello', focus: 'hello' },
    });

    setNotePosition('note-1', 200);

    expect(getNotePosition('note-1')).toBe(200);
    expect(getNoteViewState('note-1')).toEqual({
      scrollTop: 200,
      structuredSelection: {
        anchor: { rootIndex: 0, path: [], textOffset: 1 },
        focus: { rootIndex: 0, path: [], textOffset: 1 },
        direction: 'LTR',
      },
      localMarkdown: 'hello',
      localTexts: { anchor: 'hello', focus: 'hello' },
    });
  });

  it('writes a plain number when Monaco updates a note without prior object state', () => {
    setNotePosition('note-1', 500);

    expect(sessionStorage.getItem('note_positions')).toBe(
      JSON.stringify({ 'note-1': 500 })
    );
  });

  it('returns zero for missing notes', () => {
    expect(getNotePosition('missing')).toBe(0);
    expect(getNoteViewState('missing')).toBeNull();
  });

  it('clears all saved positions', () => {
    setNoteViewState('note-1', { scrollTop: 100 });
    setNotePosition('note-2', 200);

    clearNotePositions();

    expect(getNotePosition('note-1')).toBe(0);
    expect(getNotePosition('note-2')).toBe(0);
  });
});
